// cron job that runs every 15 min to pull latest vitals and check for anomalies

const cron = require('node-cron');
const ElderProfile = require('../models/ElderProfile');
const { syncAllElders } = require('../services/googleFitSync');
const { checkElderVitals } = require('../services/anomalyDetection');
const { triggerEscalation } = require('../services/escalation');

function startVitalsSyncJob() {
  cron.schedule('*/15 * * * *', async () => {
    console.log('running vitals sync job...', new Date().toISOString());

    await syncAllElders();

    const elders = await ElderProfile.find({ status: 'active' });
    for (const elder of elders) {
      const result = await checkElderVitals(elder._id);
      if (result && result.status === 'anomaly') {
        console.log('anomaly found for elder', elder.name, result);
        await triggerEscalation(elder._id, result.type, result.value);
      }
    }
  });

  console.log('vitals sync cron job scheduled, runs every 15 min');
}

module.exports = { startVitalsSyncJob };
