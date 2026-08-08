const AlertLog = require('../models/AlertLog');
const ElderProfile = require('../models/ElderProfile');
const User = require('../models/User');
const Volunteer = require('../models/Volunteer');
const MedicalHistory = require('../models/MedicalHistory');
const { sendSMS, makeIVRCall, sendPushNotification } = require('./notification');

/**
 * Trigger the emergency escalation workflow for an elder.
 */
const triggerEscalation = async (elderProfileId, triggerType, triggerValue) => {
  const elder = await ElderProfile.findById(elderProfileId).populate('linkedFamilyUserId');
  if (!elder) {
    throw new Error('Elder profile not found');
  }

  // Set elder status to alert_triggered
  elder.status = 'alert_triggered';
  await elder.save();

  // Create initial AlertLog
  const alertLog = await AlertLog.create({
    elderProfileId: elder._id,
    triggerType: triggerType,
    triggerValue: triggerValue,
    escalationSteps: [
      {
        step: 1,
        title: "Step 1: Automated IVR Call to Elder's Phone",
        timestamp: new Date(),
        status: 'triggered',
        details: `Initiated emergency check-in call to elder ${elder.name} (${elder.emergencyContacts[0]?.phone || 'phone'}).`
      }
    ],
    finalStatus: 'pending'
  });

  console.log(`[ESCALATION INITIATED] Elder: ${elder.name} | Type: ${triggerType} | Value: ${triggerValue} | AlertLog ID: ${alertLog._id}`);

  // STEP 1: Auto-call elder's phone via Twilio Voice IVR (10-second demo check-in window)
  const elderPhone = elder.emergencyContacts[0]?.phone || '9999999999';
  const ivrMessage = `CircleBack Emergency Check-in. Hello ${elder.name}, we detected a health anomaly (${triggerValue}). Press 1 if you are safe, or press 2 for immediate emergency assistance.`;
  
  await makeIVRCall(elderPhone, ivrMessage);

  // In production, Twilio webhook receives IVR press.
  // For immediate escalation pipeline execution, we proceed to STEP 2 (Parallel Escalation to Son, Neighbour, Doctor, Ambulance)
  await executeStep2ParallelEscalation(alertLog, elder);

  return alertLog;
};

/**
 * STEP 2: PARALLEL MULTI-STAKEHOLDER ESCALATION
 * Dispatches IVR Voice Calls & SMS to Son (Family), Neighbour (Volunteers), Doctor, and Ambulance simultaneously.
 */
const executeStep2ParallelEscalation = async (alertLog, elder) => {
  console.log(`[ESCALATION STEP 2] Executing PARALLEL Voice Calls & SMS to Son, Neighbour, Doctor & Ambulance for ${elder.name}...`);

  const familyUser = elder.linkedFamilyUserId;
  const elderLat = elder.geoLocation?.lat || elder.geoLocation?.coordinates?.[1] || 28.6139;
  const elderLng = elder.geoLocation?.lng || elder.geoLocation?.coordinates?.[0] || 77.2090;
  const mapLink = `https://www.google.com/maps?q=${elderLat},${elderLng}`;

  const medicalHistory = await MedicalHistory.findOne({ elderProfileId: elder._id });
  const doctorContact = medicalHistory?.doctorContact || '+91 98765 12345';
  const ambulanceHotline = '+91 8600475388';

  const alertMessage = `EMERGENCY SOS ALERT [CircleBack]: Elder ${elder.name} failed health check! Anomaly: ${alertLog.triggerType} (${alertLog.triggerValue}). Location: ${elder.address}. GPS: ${mapLink}`;
  const ivrCallScript = `Emergency SOS Alert! Hello, elder ${elder.name} at ${elder.address} requires immediate emergency check-in. Anomaly: ${alertLog.triggerValue}.`;

  // Task A: Notify Son / Family Member (Voice Call + SMS + Push)
  const notifyFamilyPromise = (async () => {
    const sonPhone = familyUser?.phone || elder.emergencyContacts[0]?.phone || '+919876543210';
    console.log(`[ESCALATION -> SON/FAMILY] Calling & SMSing Son at ${sonPhone}`);
    await makeIVRCall(sonPhone, ivrCallScript);
    await sendSMS(sonPhone, alertMessage);
    if (familyUser?.email) {
      await sendPushNotification(familyUser.email, 'CRITICAL ELDER HEALTH ALERT', alertMessage, { alertLogId: alertLog._id.toString() });
    }
    return { success: true, sonNotified: true };
  })();

  // Task B: Geospatial MongoDB $near query (within 5km) for Neighbour / Volunteers (Voice Call + SMS)
  const notifyVolunteersPromise = (async () => {
    let nearbyVolunteers = [];
    try {
      nearbyVolunteers = await Volunteer.find({
        verified: true,
        availabilityStatus: 'available',
        geoLocation: {
          $near: {
            $geometry: { type: 'Point', coordinates: [elderLng, elderLat] },
            $maxDistance: 5000 // 5 kilometers
          }
        }
      }).populate('userId');
    } catch (geoErr) {
      console.warn('[Geospatial $near Query Warning]', geoErr.message, '- Falling back to available verified volunteers list');
      nearbyVolunteers = await Volunteer.find({ verified: true, availabilityStatus: 'available' }).populate('userId');
    }

    console.log(`[Geospatial Volunteer Search] Found ${nearbyVolunteers.length} nearby available volunteers/neighbours within 5km.`);
    const volunteerScript = `Neighborhood SOS Alert! Elderly resident ${elder.name} at ${elder.address} requires urgent neighbour check-in!`;

    const notifiedIds = [];
    for (const vol of nearbyVolunteers) {
      if (vol.userId && vol.userId.phone) {
        console.log(`[ESCALATION -> NEIGHBOUR/VOLUNTEER] Calling & SMSing Neighbour at ${vol.userId.phone}`);
        await makeIVRCall(vol.userId.phone, volunteerScript);
        await sendSMS(vol.userId.phone, alertMessage);
        notifiedIds.push(vol.userId.name || vol._id);
      }
    }
    return { success: true, volunteersFound: nearbyVolunteers.length, notifiedVolunteers: notifiedIds };
  })();

  // Task C: Notify Doctor / Primary Physician (Voice Call + SMS)
  const notifyDoctorPromise = (async () => {
    console.log(`[ESCALATION -> DOCTOR] Calling & SMSing Primary Doctor (${medicalHistory?.doctorName || 'Physician'}) at ${doctorContact}`);
    const doctorMsg = `MEDICAL ALERT FOR DR. ${medicalHistory?.doctorName || 'Physician'}: Patient ${elder.name} (Age ${elder.age}) triggered emergency anomaly: ${alertLog.triggerValue}. Conditions: ${(medicalHistory?.conditions || []).join(', ') || 'Hypertension'}.`;
    await makeIVRCall(doctorContact, `Medical Emergency Alert for Dr. ${medicalHistory?.doctorName || 'Physician'}. Patient ${elder.name} requires medical check-in.`);
    await sendSMS(doctorContact, doctorMsg);
    return { success: true, doctorNotified: true };
  })();

  // Task D: Notify Ambulance & Emergency Services Hotline (Voice Call + SMS)
  const notifyAmbulancePromise = (async () => {
    console.log(`[ESCALATION -> AMBULANCE] Calling & SMSing Emergency Paramedic Hotline at ${ambulanceHotline}`);
    const ambulanceMsg = `AMBULANCE DISPATCH ALERT: Urgent paramedic response requested for ${elder.name}, Age ${elder.age}. Address: ${elder.address}. GPS: ${mapLink}. Blood Group: ${medicalHistory?.bloodGroup || 'B+'}.`;
    await makeIVRCall(ambulanceHotline, `Official Emergency Dispatch. Ambulance required for elder ${elder.name} at ${elder.address}.`);
    await sendSMS(ambulanceHotline, ambulanceMsg);
    return { success: true, ambulanceNotified: true };
  })();

  // Task E: Notify ALL Registered Emergency Contacts on Elder Profile (Voice Calls + SMS)
  const notifyAllContactsPromise = (async () => {
    const contacts = elder.emergencyContacts || [];
    for (const c of contacts) {
      if (c.phone) {
        console.log(`[ESCALATION -> REGISTERED CONTACT: ${c.name} (${c.relation})] Calling & SMSing at ${c.phone}`);
        await makeIVRCall(c.phone, `Emergency SOS Alert! Hello ${c.name}, elder ${elder.name} requires immediate emergency check-in!`);
        await sendSMS(c.phone, `EMERGENCY SOS ALERT [CircleBack]: Elder ${elder.name} (${c.relation}) requires immediate assistance! Location: ${elder.address}. GPS: ${mapLink}`);
      }
    }
    return { success: true, contactsNotified: contacts.length };
  })();

  // Execute ALL tasks in PARALLEL via Promise.all
  await Promise.all([notifyFamilyPromise, notifyVolunteersPromise, notifyDoctorPromise, notifyAmbulancePromise, notifyAllContactsPromise]);

  // Log Step 2 result in AlertLog
  alertLog.escalationSteps.push({
    step: 2,
    title: 'Step 2: Multi-Stakeholder Emergency Calls & SMS (Son, Neighbour, Doctor & Ambulance)',
    timestamp: new Date(),
    status: 'parallel_dispatched',
    details: `Parallel IVR Calls & SMS sent to Son/Family, Nearby Neighbours/Volunteers, Primary Doctor, and Paramedic Ambulance Hotline.`
  });
  await alertLog.save();

  await executeStep3EmergencyServices(alertLog, elder);
};

/**
 * STEP 3: Escalation to Emergency Medical Services
 */
const executeStep3EmergencyServices = async (alertLog, elder) => {
  console.log(`[ESCALATION STEP 3] Dispatching final emergency summary to Paramedics for ${elder.name}...`);

  const medicalHistory = await MedicalHistory.findOne({ elderProfileId: elder._id });
  const elderLat = elder.geoLocation?.lat || elder.geoLocation?.coordinates?.[1] || 28.6139;
  const elderLng = elder.geoLocation?.lng || elder.geoLocation?.coordinates?.[0] || 77.2090;
  const mapLink = `https://www.google.com/maps?q=${elderLat},${elderLng}`;
  
  const emergencyPayload = {
    elderName: elder.name,
    age: elder.age,
    gender: elder.gender,
    address: elder.address,
    gpsLocation: { lat: elderLat, lng: elderLng },
    mapLink,
    bloodGroup: medicalHistory?.bloodGroup || 'Unknown',
    criticalConditions: medicalHistory?.conditions || [],
    allergies: medicalHistory?.allergies || [],
    emergencyDoctor: medicalHistory?.doctorName ? `${medicalHistory.doctorName} (${medicalHistory.doctorContact})` : 'N/A'
  };

  const emergencyMessage = `OFFICIAL PARAMEDIC DISPATCH [CircleBack]: Elder ${elder.name}, Age ${elder.age}. Address: ${elder.address}. GPS: ${mapLink}. Blood: ${emergencyPayload.bloodGroup}. Doctor: ${emergencyPayload.emergencyDoctor}.`;
  await sendSMS('+918600475388', emergencyMessage);

  alertLog.escalationSteps.push({
    step: 3,
    title: 'Step 3: Paramedic & Emergency Medical Services Hotline Active Dispatch',
    timestamp: new Date(),
    status: 'escalated_to_emergency',
    details: `Medical history summary & live GPS location dispatched to emergency services.`
  });

  alertLog.finalStatus = 'escalated_to_emergency';
  await alertLog.save();
};

/**
 * Resolve an alert
 */
const resolveAlert = async (alertLogId, resolvedByRole, resolvedByName, note = '') => {
  const alertLog = await AlertLog.findById(alertLogId);
  if (!alertLog) throw new Error('Alert log not found');

  alertLog.finalStatus = resolvedByRole === 'volunteer' ? 'resolved_by_volunteer' : 'resolved_by_family';
  alertLog.resolvedAt = new Date();
  alertLog.escalationSteps.push({
    step: 4,
    title: `Resolved by ${resolvedByRole.toUpperCase()}`,
    timestamp: new Date(),
    status: 'resolved',
    respondedBy: `${resolvedByName} (${resolvedByRole})`,
    details: note || 'Alert marked resolved after responder verification.'
  });
  await alertLog.save();

  // Reset elder status to active
  await ElderProfile.findByIdAndUpdate(alertLog.elderProfileId, { status: 'resolved' });

  return alertLog;
};

module.exports = {
  triggerEscalation,
  executeStep2ParallelEscalation,
  executeStep3EmergencyServices,
  resolveAlert
};
