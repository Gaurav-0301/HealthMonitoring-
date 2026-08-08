// pulls heart rate n steps from google fit for each elder
// most bands (noise, boat, mi band etc) already sync here so we dont
// need to build separate integration for every band brand

const axios = require('axios');
const ElderProfile = require('../models/ElderProfile');
const VitalsHistory = require('../models/VitalsHistory');

async function fetchGoogleFitData(elder) {
  if (!elder.googleFitAuthToken) return null;

  try {
    // this is simplified, real google fit api call needs the dataset
    // aggregate endpoint, keeping this basic for now
    const response = await axios.post(
      'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
      {
        aggregateBy: [{ dataTypeName: 'com.google.heart_rate.bpm' }],
        bucketByTime: { durationMillis: 600000 }, // 10 min buckets
        startTimeMillis: Date.now() - 15 * 60 * 1000,
        endTimeMillis: Date.now()
      },
      {
        headers: { Authorization: `Bearer ${elder.googleFitAuthToken}` }
      }
    );

    return response.data;
  } catch (err) {
    console.log('google fit fetch failed for elder', elder._id, err.message);
    return null;
  }
}

async function syncAllElders() {
  const elders = await ElderProfile.find({ googleFitAuthToken: { $exists: true, $ne: null } });

  for (const elder of elders) {
    const data = await fetchGoogleFitData(elder);
    if (!data) continue;

    // TODO parse actual response structure properly, google fit response
    // is nested and annoying, doing basic version for now
    const heartRate = extractHeartRate(data);
    const steps = extractSteps(data);

    if (heartRate) {
      await VitalsHistory.create({
        elderProfileId: elder._id,
        heartRate,
        steps,
        source: 'google_fit'
      });
    }
  }
}

function extractHeartRate(data) {
  // placeholder parsing logic, will fix once we test with real data
  try {
    return data.bucket[0].dataset[0].point[0].value[0].fpVal;
  } catch (e) {
    return null;
  }
}

function extractSteps(data) {
  return null; // todo
}

module.exports = { syncAllElders, fetchGoogleFitData };
