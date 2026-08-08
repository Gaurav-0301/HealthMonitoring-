const express = require('express');
const router = express.Router();
const VitalsHistory = require('../models/VitalsHistory');
const ElderProfile = require('../models/ElderProfile');
const { detectVitalsAnomaly } = require('../services/anomalyDetection');
const { triggerEscalation } = require('../services/escalation');
const { authMiddleware } = require('../middleware/auth');
const { predictHealthRisks } = require('../services/diseasePredictor');

// GET /api/vitals/:elderId/history - Get vitals history for chart rendering
router.get('/:elderId/history', authMiddleware, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30;
    const history = await VitalsHistory.find({ elderProfileId: req.params.elderId })
      .sort({ timestamp: -1 })
      .limit(limit);
    
    // Return in chronological order for graphs
    res.json(history.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Error fetching vitals history', error: error.message });
  }
});

// POST /api/vitals/:elderId/mock-simulate - Interactive Simulator Endpoint
router.post('/:elderId/mock-simulate', authMiddleware, async (req, res) => {
  try {
    const { elderId } = req.params;
    const { heartRate, steps, simulatePreset } = req.body;

    const elder = await ElderProfile.findById(elderId);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    let readingsToInsert = [];
    const baseTime = Date.now();

    // 1. Check Presets
    if (simulatePreset === 'healthy') {
      readingsToInsert = [{
        heartRate: 72, restingHeartRate: 58, heartRateSd: 6,
        spo2Avg: 98, spo2Min: 96, skinTemp: 33.6,
        stepsToday: 9500, steps: 9500, sleepHours: 7.8, sleepEfficiency: 92,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'cardiac') {
      readingsToInsert = [{
        heartRate: 118, restingHeartRate: 96, heartRateSd: 16,
        spo2Avg: 97, spo2Min: 95, skinTemp: 33.7,
        stepsToday: 6000, steps: 6000, sleepHours: 7, sleepEfficiency: 85,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'respiratory') {
      readingsToInsert = [{
        heartRate: 80, restingHeartRate: 68, heartRateSd: 7,
        spo2Avg: 94, spo2Min: 87, skinTemp: 33.5,
        stepsToday: 5500, steps: 5500, sleepHours: 6.5, sleepEfficiency: 78,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'fever') {
      readingsToInsert = [{
        heartRate: 105, restingHeartRate: 90, heartRateSd: 8,
        spo2Avg: 96, spo2Min: 94, skinTemp: 36.8,
        stepsToday: 2000, steps: 2000, sleepHours: 8, sleepEfficiency: 80,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'stress') {
      readingsToInsert = [{
        heartRate: 88, restingHeartRate: 75, heartRateSd: 3,
        spo2Avg: 97, spo2Min: 95, skinTemp: 33.6,
        stepsToday: 4000, steps: 4000, sleepHours: 4.5, sleepEfficiency: 62,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'metabolic') {
      readingsToInsert = [{
        heartRate: 82, restingHeartRate: 78, heartRateSd: 6,
        spo2Avg: 97, spo2Min: 96, skinTemp: 33.6,
        stepsToday: 1800, steps: 1800, sleepHours: 5.5, sleepEfficiency: 70,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'worst_case') {
      readingsToInsert = [{
        heartRate: 128, restingHeartRate: 98, heartRateSd: 17,
        spo2Avg: 91, spo2Min: 85, skinTemp: 37.4,
        stepsToday: 800, steps: 800, sleepHours: 3.5, sleepEfficiency: 55,
        timestamp: new Date(baseTime)
      }];
    } else if (simulatePreset === 'spike_3_readings') {
      // Create 3 consecutive high readings (e.g., 145 bpm) to trigger heart rate anomaly
      readingsToInsert = [
        { heartRate: 142, steps: 5, restingHeartRate: 70, heartRateSd: 6, spo2Avg: 98, spo2Min: 96, skinTemp: 33.6, stepsToday: 5, sleepHours: 7.5, sleepEfficiency: 88, timestamp: new Date(baseTime - 10 * 60000) },
        { heartRate: 148, steps: 2, restingHeartRate: 70, heartRateSd: 6, spo2Avg: 98, spo2Min: 96, skinTemp: 33.6, stepsToday: 7, sleepHours: 7.5, sleepEfficiency: 88, timestamp: new Date(baseTime - 5 * 60000) },
        { heartRate: 145, steps: 0, restingHeartRate: 70, heartRateSd: 6, spo2Avg: 98, spo2Min: 96, skinTemp: 33.6, stepsToday: 7, sleepHours: 7.5, sleepEfficiency: 88, timestamp: new Date(baseTime) }
      ];
    } else if (simulatePreset === 'inactivity_4h') {
      // Create 0-step readings spanning 4+ continuous hours
      for (let i = 0; i < 5; i++) {
        readingsToInsert.push({
          heartRate: 72, restingHeartRate: 70, heartRateSd: 6,
          spo2Avg: 98, spo2Min: 96, skinTemp: 33.6,
          stepsToday: 0, steps: 0, sleepHours: 7.5, sleepEfficiency: 88,
          timestamp: new Date(baseTime - i * 60 * 60000) // 1 hr increments
        });
      }
    } else {
      // Single custom or normal reading
      const hr = Number(heartRate) || Math.floor(Math.random() * (85 - 68 + 1)) + 68;
      const st = steps !== undefined ? Number(steps) : Math.floor(Math.random() * 80);
      
      const rhr = Number(req.body.restingHeartRate || req.body.resting_hr) || (hr - Math.floor(Math.random() * 8 + 4));
      const hrv = Number(req.body.heartRateSd || req.body.hr_std) || Math.floor(Math.random() * 5 + 4);
      const spo2a = Number(req.body.spo2Avg || req.body.spo2_avg) || Math.floor(Math.random() * (99 - 96 + 1)) + 96;
      const spo2m = Number(req.body.spo2Min || req.body.spo2_min) || (spo2a - Math.floor(Math.random() * 3));
      const temp = Number(req.body.skinTemp || req.body.skin_temp_c) || Number((Math.random() * (34.2 - 33.4) + 33.4).toFixed(1));
      const stepsTodayVal = Number(req.body.stepsToday || req.body.steps_today) || st;
      const hoursSleep = Number(req.body.sleepHours || req.body.sleep_hours) || Number((Math.random() * (8.5 - 6.5) + 6.5).toFixed(1));
      const sleepEff = Number(req.body.sleepEfficiency || req.body.sleep_efficiency) || Math.floor(Math.random() * (95 - 80 + 1)) + 80;

      readingsToInsert.push({
        heartRate: hr,
        steps: st,
        restingHeartRate: rhr,
        heartRateSd: hrv,
        spo2Avg: spo2a,
        spo2Min: spo2m,
        skinTemp: temp,
        stepsToday: stepsTodayVal,
        sleepHours: hoursSleep,
        sleepEfficiency: sleepEff,
        timestamp: new Date()
      });
    }

    // 2. Attach predictions to all records before database insert
    const processedReadings = [];
    for (const r of readingsToInsert) {
      const pred = await predictHealthRisks(r);
      processedReadings.push({
        ...r,
        elderProfileId: elderId,
        source: 'mock_simulator',
        cardiacRisk: pred.cardiac,
        respiratoryRisk: pred.respiratory,
        feverRisk: pred.fever,
        stressRisk: pred.stress,
        metabolicRisk: pred.metabolic
      });
    }

    const inserted = await VitalsHistory.insertMany(processedReadings);

    // 3. Immediately run anomaly detection
    const anomalyReport = await detectVitalsAnomaly(elderId);

    let escalationResult = null;
    if (anomalyReport.status === 'anomaly') {
      escalationResult = await triggerEscalation(elderId, anomalyReport.type, anomalyReport.value);
    }

    res.json({
      message: `Simulated ${inserted.length} reading(s) successfully!`,
      insertedReadings: inserted,
      anomalyReport,
      escalationTriggered: anomalyReport.status === 'anomaly',
      escalationLog: escalationResult
    });
  } catch (error) {
    res.status(500).json({ message: 'Error simulating vitals', error: error.message });
  }
});

module.exports = router;
