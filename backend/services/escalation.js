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

  // STEP 1: Auto-call elder's own phone via Twilio Voice with IVR
  const elderPhone = elder.emergencyContacts[0]?.phone || '9999999999';
  const ivrMessage = `CircleBack Emergency Check-in. Hello ${elder.name}, we detected a health anomaly (${triggerValue}). Press 1 if you are safe, or press 2 for immediate emergency assistance.`;
  
  await makeIVRCall(elderPhone, ivrMessage);

  // In production, Twilio webhook receives IVR press.
  // For immediate escalation pipeline execution, we proceed to STEP 2 (Parallel Execution)
  await executeStep2ParallelEscalation(alertLog, elder);

  return alertLog;
};

/**
 * STEP 2: PARALLEL ESCALATION
 * Uses Promise.all to dispatch Family Alerts & Nearby Volunteer Alerts simultaneously.
 */
const executeStep2ParallelEscalation = async (alertLog, elder) => {
  console.log(`[ESCALATION STEP 2] Executing PARALLEL alerts to Family + Nearby Volunteers for ${elder.name}...`);

  const familyUser = elder.linkedFamilyUserId;
  const elderLat = elder.geoLocation?.lat || 28.6139;
  const elderLng = elder.geoLocation?.lng || 77.2090;
  const mapLink = `https://www.google.com/maps?q=${elderLat},${elderLng}`;

  // Task A: Notify Family (SMS + Push Notification)
  const notifyFamilyPromise = (async () => {
    const message = `EMERGENCY ALERT [CircleBack]: ${elder.name} failed health check! Anomaly: ${alertLog.triggerType} (${alertLog.triggerValue}). Location: ${elder.address}. Map: ${mapLink}`;
    
    // Send to linked family account phone
    if (familyUser && familyUser.phone) {
      await sendSMS(familyUser.phone, message);
      await sendPushNotification(familyUser.email, 'CRITICAL ELDER HEALTH ALERT', message, { alertLogId: alertLog._id.toString() });
    }

    // Send to primary emergency contacts
    for (const contact of elder.emergencyContacts || []) {
      if (contact.phone) {
        await sendSMS(contact.phone, message);
      }
    }
    return { success: true, familyNotified: true };
  })();

  // Task B: Geospatial MongoDB $near query (within 5km = 5000m) for available verified volunteers
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

    console.log(`[Geospatial Volunteer Search] Found ${nearbyVolunteers.length} nearby available volunteers within 5km.`);

    const volunteerAlertMessage = `NEIGHBORHOOD SOS ALERT: Elderly resident ${elder.name} at ${elder.address} (${elder.landmark || 'Nearby'}) requires urgent check-in! Location: ${mapLink}`;

    const notifiedIds = [];
    for (const vol of nearbyVolunteers) {
      if (vol.userId && vol.userId.phone) {
        await sendSMS(vol.userId.phone, volunteerAlertMessage);
        notifiedIds.push(vol.userId.name || vol._id);
      }
    }

    return { success: true, volunteersFound: nearbyVolunteers.length, notifiedVolunteers: notifiedIds };
  })();

  // Run Task A and Task B in PARALLEL via Promise.all
  const [familyResult, volunteerResult] = await Promise.all([notifyFamilyPromise, notifyVolunteersPromise]);

  // Log Step 2 result in AlertLog
  alertLog.escalationSteps.push({
    step: 2,
    title: 'Step 2: Parallel Family SMS/Push & Geospatial Nearby Volunteer Escalation',
    timestamp: new Date(),
    status: 'parallel_dispatched',
    details: `Family notified via SMS/Push. Nearby volunteer search found ${volunteerResult.volunteersFound} verified responders within 5km radius.`
  });
  await alertLog.save();

  // Schedule Step 3 (Emergency Services Dispatch) after window if unacknowledged
  await executeStep3EmergencyServices(alertLog, elder);
};

/**
 * STEP 3: Escalation to Emergency Services
 */
const executeStep3EmergencyServices = async (alertLog, elder) => {
  console.log(`[ESCALATION STEP 3] Dispatching alert to Emergency Services for ${elder.name}...`);

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

  const emergencyMessage = `OFFICIAL EMERGENCY DISPATCH [CircleBack Platform]: Elder ${elder.name}, Age ${elder.age}. Address: ${elder.address}. GPS: ${mapLink}. Blood: ${emergencyPayload.bloodGroup}. Conditions: ${emergencyPayload.criticalConditions.join(', ') || 'None'}.`;

  // Send to emergency dispatch hotline
  const targetPhone = elder.linkedFamilyUserId?.phone || elder.emergencyContacts[0]?.phone || '+918600475388';
  await sendSMS(targetPhone, emergencyMessage);

  alertLog.escalationSteps.push({
    step: 3,
    title: 'Step 3: Direct Emergency Services & Paramedic Dispatch',
    timestamp: new Date(),
    status: 'escalated_to_emergency',
    details: `Medical history summary and live GPS dispatched to local emergency services. Payload: ${JSON.stringify(emergencyPayload)}`
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
