const express = require('express');
const router = express.Router();
const VitalsHistory = require('../models/VitalsHistory');
const ElderProfile = require('../models/ElderProfile');
const { detectVitalsAnomaly } = require('../services/anomalyDetection');
const { triggerEscalation } = require('../services/escalation');
const { authMiddleware } = require('../middleware/auth');

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

    if (simulatePreset === 'spike_3_readings') {
      // Create 3 consecutive high readings (e.g., 145 bpm) to trigger heart rate anomaly
      const baseTime = Date.now();
      readingsToInsert = [
        { elderProfileId: elderId, heartRate: 142, steps: 5, source: 'mock_simulator', timestamp: new Date(baseTime - 10 * 60000) },
        { elderProfileId: elderId, heartRate: 148, steps: 2, source: 'mock_simulator', timestamp: new Date(baseTime - 5 * 60000) },
        { elderProfileId: elderId, heartRate: 145, steps: 0, source: 'mock_simulator', timestamp: new Date(baseTime) }
      ];
    } else if (simulatePreset === 'inactivity_4h') {
      // Create 0-step readings spanning 4+ continuous hours
      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        readingsToInsert.push({
          elderProfileId: elderId,
          heartRate: 72,
          steps: 0,
          source: 'mock_simulator',
          timestamp: new Date(baseTime - i * 60 * 60000) // 1 hr increments
        });
      }
    } else {
      // Single custom or normal reading
      const hr = Number(heartRate) || Math.floor(Math.random() * (85 - 68 + 1)) + 68;
      const st = steps !== undefined ? Number(steps) : Math.floor(Math.random() * 80);
      readingsToInsert.push({
        elderProfileId: elderId,
        heartRate: hr,
        steps: st,
        source: 'mock_simulator',
        timestamp: new Date()
      });
    }

    const inserted = await VitalsHistory.insertMany(readingsToInsert);

    // Immediately run anomaly detection
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
