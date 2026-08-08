const VitalsHistory = require('../models/VitalsHistory');
const ElderProfile = require('../models/ElderProfile');

/**
 * Recalculate baseline for elder if 7 days have passed OR calibration is triggered manually.
 * Baseline = Mean ± 2 * Standard Deviation
 */
const checkAndCalibrateBaseline = async (elderProfile) => {
  const now = new Date();
  const daysSinceCreation = (now - new Date(elderProfile.createdAt)) / (1000 * 60 * 60 * 24);

  // If already calibrated, skip auto calibration check (unless forced)
  if (elderProfile.calibrationComplete) {
    return { calibrated: true, baselineMin: elderProfile.baselineHeartRateMin, baselineMax: elderProfile.baselineHeartRateMax };
  }

  // Fetch all vitals history for calibration
  const vitals = await VitalsHistory.find({ elderProfileId: elderProfile._id }).sort({ timestamp: 1 });

  // Require either 7 days or at least 15 sample readings for initial calibration
  if (daysSinceCreation < 7 && vitals.length < 15) {
    return {
      calibrated: false,
      reason: 'Calibrating baseline (insufficient time/samples)',
      daysRemaining: Math.max(0, (7 - daysSinceCreation).toFixed(1)),
      sampleCount: vitals.length
    };
  }

  // Calculate Mean and Standard Deviation
  const hrValues = vitals.map(v => v.heartRate).filter(hr => typeof hr === 'number' && hr > 0);
  if (hrValues.length === 0) {
    return { calibrated: false, reason: 'No valid heart rate data recorded yet.' };
  }

  const mean = hrValues.reduce((sum, val) => sum + val, 0) / hrValues.length;
  const variance = hrValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / hrValues.length;
  const stdDev = Math.sqrt(variance);

  // Mean ± 2 StdDev (bounded between standard min 50 and max 150)
  const calculatedMin = Math.max(50, Math.round(mean - 2 * stdDev));
  const calculatedMax = Math.min(150, Math.round(mean + 2 * stdDev));

  elderProfile.baselineHeartRateMin = calculatedMin;
  elderProfile.baselineHeartRateMax = calculatedMax;
  elderProfile.calibrationComplete = true;
  await elderProfile.save();

  console.log(`[Calibration Complete] Elder ${elderProfile.name} (${elderProfile._id}): Baseline HR range set to ${calculatedMin}-${calculatedMax} bpm (Mean: ${mean.toFixed(1)}, StdDev: ${stdDev.toFixed(1)})`);

  return {
    calibrated: true,
    baselineMin: calculatedMin,
    baselineMax: calculatedMax,
    mean: Math.round(mean),
    stdDev: Math.round(stdDev)
  };
};

/**
 * Evaluates vitals history for an elder to detect anomalies.
 */
const detectVitalsAnomaly = async (elderProfileId) => {
  const elder = await ElderProfile.findById(elderProfileId);
  if (!elder) {
    throw new Error('Elder profile not found');
  }

  // 1. Check/perform baseline calibration
  const calibrationStatus = await checkAndCalibrateBaseline(elder);
  if (!calibrationStatus.calibrated) {
    return {
      status: 'calibrating',
      message: 'System is currently collecting baseline data (7-day calibration phase).',
      calibrationProgress: calibrationStatus
    };
  }

  // 2. Fetch last 5 vitals history records
  const recentVitals = await VitalsHistory.find({ elderProfileId: elder._id })
    .sort({ timestamp: -1 })
    .limit(5);

  if (recentVitals.length === 0) {
    return { status: 'normal', message: 'No vitals recorded yet.' };
  }

  // --- CHECK A: HEART RATE ANOMALY ---
  // Requires 3 consecutive readings outside baseline range to eliminate single spikes
  if (recentVitals.length >= 3) {
    const last3 = recentVitals.slice(0, 3);
    const minBaseline = elder.baselineHeartRateMin || 60;
    const maxBaseline = elder.baselineHeartRateMax || 100;

    const all3High = last3.every(v => v.heartRate > maxBaseline);
    const all3Low = last3.every(v => v.heartRate < minBaseline);

    if (all3High || all3Low) {
      const avgHR = Math.round(last3.reduce((sum, v) => sum + v.heartRate, 0) / 3);
      const anomalyType = all3High ? 'abnormally high' : 'abnormally low';
      return {
        status: 'anomaly',
        type: 'heart_rate_anomaly',
        value: `${avgHR} bpm (${anomalyType}, baseline: ${minBaseline}-${maxBaseline} bpm)`,
        details: `Last 3 consecutive readings (${last3.map(v => v.heartRate).join(', ')} bpm) exceeded safety limits.`
      };
    }
  }

  // --- CHECK B: PROLONGED INACTIVITY ANOMALY ---
  // Check step count over the last 4 continuous hours
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
  const currentHour = new Date().getHours();

  // Typical active window: 7 AM (7) to 9 PM (21)
  const isActiveWindow = currentHour >= 7 && currentHour <= 21;

  if (isActiveWindow) {
    const windowVitals = await VitalsHistory.find({
      elderProfileId: elder._id,
      timestamp: { $gte: fourHoursAgo }
    }).sort({ timestamp: 1 });

    if (windowVitals.length >= 2) {
      const totalStepMovement = windowVitals.reduce((sum, v) => sum + (v.steps || 0), 0);
      if (totalStepMovement < 5) {
        return {
          status: 'anomaly',
          type: 'inactivity',
          value: `0 movement (${totalStepMovement} steps) over last 4 active hours`,
          details: 'No step activity recorded during daytime active window.'
        };
      }
    }
  }

  return {
    status: 'normal',
    latestHeartRate: recentVitals[0].heartRate,
    latestSteps: recentVitals[0].steps,
    baselineRange: `${elder.baselineHeartRateMin}-${elder.baselineHeartRateMax} bpm`
  };
};

module.exports = {
  checkAndCalibrateBaseline,
  detectVitalsAnomaly
};
