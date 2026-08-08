const cron = require('node-cron');
const ElderProfile = require('../models/ElderProfile');
const { syncAllElders } = require('../services/googleFitSync');
const { detectVitalsAnomaly } = require('../services/anomalyDetection');
const { triggerEscalation } = require('../services/escalation');

const runSyncAndMonitoringCycle = async () => {
  console.log(`\n==================================================`);
  console.log(`[CRON JOB] Starting 15-Minute Vitals Sync & Anomaly Check Cycle [${new Date().toISOString()}]`);
  console.log(`==================================================`);

  try {
    // 1. Sync vitals for all connected elders
    const syncResults = await syncAllElders();
    console.log(`[CRON JOB] Synced data for ${syncResults.length} elders.`);

    // 2. Query all active elders (with active monitoring)
    const activeElders = await ElderProfile.find({ status: { $ne: 'alert_triggered' } }).populate('linkedFamilyUserId');

    for (const elder of activeElders) {
      // Check tier authorization: free tier elders only get manual SOS/check-ins
      const familyTier = elder.linkedFamilyUserId?.subscriptionTier || 'free';
      if (familyTier === 'free') {
        console.log(`[CRON JOB] Skipping automatic anomaly check for elder ${elder.name} (Free Tier - manual SOS only).`);
        continue;
      }

      // Detect anomalies
      const anomalyReport = await detectVitalsAnomaly(elder._id);
      console.log(`[CRON JOB] Elder ${elder.name}: Status = ${anomalyReport.status}`);

      if (anomalyReport.status === 'anomaly') {
        console.warn(`[CRON JOB] ANOMALY DETECTED for ${elder.name}! Triggering escalation pipeline...`);
        await triggerEscalation(elder._id, anomalyReport.type, anomalyReport.value);
      }
    }
  } catch (error) {
    console.error('[CRON JOB ERROR]', error.message);
  }
};

// Initialize node-cron schedule (Every 15 minutes: '*/15 * * * *')
const initVitalsSyncCron = () => {
  console.log('[CRON JOB] Initializing Node-Cron schedule for vitals sync (every 15 minutes)...');
  cron.schedule('*/15 * * * *', runSyncAndMonitoringCycle);
};

module.exports = {
  initVitalsSyncCron,
  runSyncAndMonitoringCycle
};
