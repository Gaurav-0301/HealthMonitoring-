// checks if latest vitals reading is weird compared to elders normal baseline
// first 7 days = just collect data, dont alert (calibration period)

const ElderProfile = require('../models/ElderProfile');
const VitalsHistory = require('../models/VitalsHistory');

const CALIBRATION_DAYS = 7;

async function checkElderVitals(elderId) {
  const elder = await ElderProfile.findById(elderId);
  if (!elder) return;

  const recentReadings = await VitalsHistory.find({ elderProfileId: elderId })
    .sort({ timestamp: -1 })
    .limit(20);

  if (recentReadings.length === 0) return;

  const daysSinceStart = (Date.now() - elder.createdAt) / (1000 * 60 * 60 * 24);

  if (daysSinceStart < CALIBRATION_DAYS || !elder.calibrationComplete) {
    // still calibrating, calculate baseline once we hit 7 days
    if (daysSinceStart >= CALIBRATION_DAYS) {
      await calculateBaseline(elder, recentReadings);
    }
    return { status: 'calibrating' };
  }

  const latest = recentReadings[0];

  // check heart rate anomaly
  if (
    latest.heartRate > elder.baselineHeartRateMax ||
    latest.heartRate < elder.baselineHeartRateMin
  ) {
    // check if sustained for last 3 readings not just one spike
    const lastThree = recentReadings.slice(0, 3);
    const allAbnormal = lastThree.every(
      r => r.heartRate > elder.baselineHeartRateMax || r.heartRate < elder.baselineHeartRateMin
    );

    if (allAbnormal) {
      return { status: 'anomaly', type: 'heart_rate_anomaly', value: latest.heartRate };
    }
  }

  // check inactivity - no step change for 4+ hours
  const fourHoursAgo = Date.now() - 4 * 60 * 60 * 1000;
  const recentActivity = recentReadings.filter(
    r => r.timestamp > fourHoursAgo && r.steps > 0
  );
  if (recentActivity.length === 0 && recentReadings.length > 5) {
    return { status: 'anomaly', type: 'inactivity', value: 'no movement 4hrs+' };
  }

  return { status: 'normal' };
}

async function calculateBaseline(elder, readings) {
  const heartRates = readings.map(r => r.heartRate).filter(Boolean);
  if (heartRates.length < 5) return; // not enough data yet

  const mean = heartRates.reduce((a, b) => a + b, 0) / heartRates.length;
  const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - mean, 2), 0) / heartRates.length;
  const stdDev = Math.sqrt(variance);

  elder.baselineHeartRateMin = Math.round(mean - 2 * stdDev);
  elder.baselineHeartRateMax = Math.round(mean + 2 * stdDev);
  elder.calibrationComplete = true;
  await elder.save();
}

module.exports = { checkElderVitals };
