const axios = require('axios');
const VitalsHistory = require('../models/VitalsHistory');
const ElderProfile = require('../models/ElderProfile');
const { predictHealthRisks } = require('./diseasePredictor');

/**
 * Synchronize Google Fit dataset for a single elder profile.
 */
const syncElderGoogleFit = async (elderProfile) => {
  if (!elderProfile.googleFitAuthToken) {
    return { success: false, reason: 'No Google Fit token linked' };
  }

  try {
    const endTime = Date.now();
    const startTime = endTime - 15 * 60 * 1000; // last 15 minutes

    const requestBody = {
      aggregateBy: [
        { dataTypeName: 'com.google.heart_rate.bpm' },
        { dataTypeName: 'com.google.step_count.delta' }
      ],
      bucketByTime: { durationMillis: 10 * 60 * 1000 },
      startTimeMillis: startTime,
      endTimeMillis: endTime
    };

    // If using live token vs mock token
    if (elderProfile.googleFitAuthToken.startsWith('mock_')) {
      // Mock data generator for testing sync
      const mockHeartRate = Math.floor(Math.random() * (90 - 65 + 1)) + 65;
      const mockSteps = Math.floor(Math.random() * 150);

      const rhr = mockHeartRate - Math.floor(Math.random() * 6 + 4);
      const hrv = Math.floor(Math.random() * 4 + 4);
      const spo2a = Math.floor(Math.random() * 3) + 97;
      const spo2m = spo2a - Math.floor(Math.random() * 2);
      const temp = Number((Math.random() * (34.0 - 33.5) + 33.5).toFixed(1));
      const sleep = Number((Math.random() * (8.0 - 7.0) + 7.0).toFixed(1));
      const eff = Math.floor(Math.random() * 10) + 85;

      const predictions = await predictHealthRisks({
        heartRate: mockHeartRate,
        restingHeartRate: rhr,
        heartRateSd: hrv,
        spo2Avg: spo2a,
        spo2Min: spo2m,
        skinTemp: temp,
        stepsToday: mockSteps,
        sleepHours: sleep,
        sleepEfficiency: eff
      });
      
      const vitalRecord = await VitalsHistory.create({
        elderProfileId: elderProfile._id,
        heartRate: mockHeartRate,
        steps: mockSteps,
        restingHeartRate: rhr,
        heartRateSd: hrv,
        spo2Avg: spo2a,
        spo2Min: spo2m,
        skinTemp: temp,
        stepsToday: mockSteps,
        sleepHours: sleep,
        sleepEfficiency: eff,
        cardiacRisk: predictions.cardiac,
        respiratoryRisk: predictions.respiratory,
        feverRisk: predictions.fever,
        stressRisk: predictions.stress,
        metabolicRisk: predictions.metabolic,
        source: 'google_fit',
        timestamp: new Date()
      });

      return { success: true, vitalRecord, note: 'Mock Google Fit reading synced' };
    }

    const response = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${elderProfile.googleFitAuthToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let extractedHeartRate = null;
    let extractedSteps = 0;

    if (response.data && response.data.bucket) {
      for (const bucket of response.data.bucket) {
        for (const dataset of bucket.dataset || []) {
          for (const point of dataset.point || []) {
            if (dataset.dataSourceId && dataset.dataSourceId.includes('heart_rate')) {
              if (point.value && point.value[0]) {
                extractedHeartRate = Math.round(point.value[0].fpVal || point.value[0].intVal);
              }
            } else if (dataset.dataSourceId && dataset.dataSourceId.includes('step_count')) {
              if (point.value && point.value[0]) {
                extractedSteps += (point.value[0].intVal || point.value[0].fpVal || 0);
              }
            }
          }
        }
      }
    }

    if (extractedHeartRate !== null) {
      const rhr = extractedHeartRate - 6;
      const hrv = 6;
      const spo2a = 98;
      const spo2m = 96;
      const temp = 33.6;
      const sleep = 7.5;
      const eff = 88;

      const predictions = await predictHealthRisks({
        heartRate: extractedHeartRate,
        restingHeartRate: rhr,
        heartRateSd: hrv,
        spo2Avg: spo2a,
        spo2Min: spo2m,
        skinTemp: temp,
        stepsToday: extractedSteps,
        sleepHours: sleep,
        sleepEfficiency: eff
      });

      const vitalRecord = await VitalsHistory.create({
        elderProfileId: elderProfile._id,
        heartRate: extractedHeartRate,
        steps: extractedSteps,
        restingHeartRate: rhr,
        heartRateSd: hrv,
        spo2Avg: spo2a,
        spo2Min: spo2m,
        skinTemp: temp,
        stepsToday: extractedSteps,
        sleepHours: sleep,
        sleepEfficiency: eff,
        cardiacRisk: predictions.cardiac,
        respiratoryRisk: predictions.respiratory,
        feverRisk: predictions.fever,
        stressRisk: predictions.stress,
        metabolicRisk: predictions.metabolic,
        source: 'google_fit',
        timestamp: new Date()
      });
      return { success: true, vitalRecord };
    }

    return { success: true, note: 'No new vitals datapoints in bucket' };
  } catch (error) {
    console.error(`[GoogleFitSync Error] Elder ${elderProfile._id}:`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Bulk sync for all active elders with Google Fit linked
 */
const syncAllElders = async () => {
  try {
    const elders = await ElderProfile.find({
      googleFitAuthToken: { $ne: null },
      status: { $in: ['active', 'resolved'] }
    });

    console.log(`[GoogleFitSync] Starting sync cycle for ${elders.length} elder profiles...`);
    const results = [];
    for (const elder of elders) {
      const result = await syncElderGoogleFit(elder);
      results.push({ elderId: elder._id, name: elder.name, ...result });
    }
    return results;
  } catch (error) {
    console.error('[GoogleFitSync Bulk Error]', error.message);
    return [];
  }
};

module.exports = {
  syncElderGoogleFit,
  syncAllElders
};
