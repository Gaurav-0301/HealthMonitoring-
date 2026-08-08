// this is the important part!! handles what happens when anomaly is found
// step 1: call elder phone first (avoid false alarms)
// step 2: if no response -> family AND volunteer at same time (parallel not sequential,
//   sequential wastes time in real emergency)
// step 3: if still nothing -> emergency services

const ElderProfile = require('../models/ElderProfile');
const Volunteer = require('../models/Volunteer');
const AlertLog = require('../models/AlertLog');
// const twilio = require('twilio'); // uncomment when we have real api keys

async function triggerEscalation(elderId, triggerType, triggerValue) {
  const elder = await ElderProfile.findById(elderId);

  const alertLog = new AlertLog({
    elderProfileId: elderId,
    triggerType,
    triggerValue,
    escalationSteps: []
  });

  elder.status = 'alert_triggered';
  await elder.save();

  // step 1 - call elder
  alertLog.escalationSteps.push({
    step: 'call_elder',
    timestamp: new Date(),
    status: 'initiated'
  });
  await alertLog.save();

  const elderResponded = await callElderAndWait(elder); // waits ~90 sec

  if (elderResponded) {
    alertLog.finalStatus = 'false_alarm';
    alertLog.resolvedAt = new Date();
    await alertLog.save();
    elder.status = 'active';
    await elder.save();
    return { resolved: true, reason: 'elder responded' };
  }

  // step 2 - parallel alert to family + nearby volunteer
  alertLog.escalationSteps.push({
    step: 'family_and_volunteer_alert',
    timestamp: new Date(),
    status: 'initiated'
  });
  await alertLog.save();

  const [familyNotified, volunteer] = await Promise.all([
    notifyFamily(elder),
    findAndNotifyVolunteer(elder)
  ]);

  // wait for response window (in real system this would be event based,
  // not a hard sleep, keeping simple for now)
  const responded = await waitForResponse(elder, 5 * 60 * 1000);

  if (responded) {
    alertLog.finalStatus = volunteer ? 'resolved_by_volunteer' : 'resolved_by_family';
    alertLog.resolvedAt = new Date();
    await alertLog.save();
    elder.status = 'resolved';
    await elder.save();
    return { resolved: true };
  }

  // step 3 - emergency services, last resort
  alertLog.escalationSteps.push({
    step: 'emergency_services_alert',
    timestamp: new Date(),
    status: 'initiated'
  });
  alertLog.finalStatus = 'escalated_to_emergency';
  await alertLog.save();

  await alertEmergencyServices(elder);

  return { resolved: false, escalatedToEmergency: true };
}

async function callElderAndWait(elder) {
  // TODO integrate twilio voice call with IVR "press 1 if ok"
  console.log('calling elder', elder.name);
  return false; // placeholder, assume no response for now
}

async function notifyFamily(elder) {
  console.log('notifying family for', elder.name);
  // TODO firebase push notification + sms
  return true;
}

async function findAndNotifyVolunteer(elder) {
  if (!elder.geoLocation) return null;

  const nearby = await Volunteer.findOne({
    verified: true,
    availabilityStatus: 'available',
    geoLocation: {
      $near: {
        $geometry: { type: 'Point', coordinates: [elder.geoLocation.lng, elder.geoLocation.lat] },
        $maxDistance: 5000 // 5km
      }
    }
  });

  if (nearby) {
    console.log('notifying volunteer', nearby._id);
    // TODO push notification to volunteer
  }

  return nearby;
}

async function waitForResponse(elder, ms) {
  // placeholder, real implementation should be event driven
  // (volunteer/family clicks "resolved" in app, not a timer)
  return false;
}

async function alertEmergencyServices(elder) {
  console.log('EMERGENCY - alerting services for', elder.name, elder.address);
  // TODO real integration with local emergency number / hospital partner
}

module.exports = { triggerEscalation };
