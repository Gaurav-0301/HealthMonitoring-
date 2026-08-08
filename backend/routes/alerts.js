const express = require('express');
const router = express.Router();
const AlertLog = require('../models/AlertLog');
const ElderProfile = require('../models/ElderProfile');
const { triggerEscalation, resolveAlert } = require('../services/escalation');
const { authMiddleware } = require('../middleware/auth');

// GET /api/alerts/elder/:elderId - Get alert history for an elder
router.get('/elder/:elderId', authMiddleware, async (req, res) => {
  try {
    const alerts = await AlertLog.find({ elderProfileId: req.params.elderId })
      .sort({ createdAt: -1 })
      .populate('elderProfileId');
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching alert logs', error: error.message });
  }
});

// GET /api/alerts/active - List active/pending alerts (for volunteers & admin)
router.get('/active', authMiddleware, async (req, res) => {
  try {
    const activeAlerts = await AlertLog.find({ finalStatus: 'pending' })
      .sort({ createdAt: -1 })
      .populate({
        path: 'elderProfileId',
        populate: { path: 'linkedFamilyUserId', select: 'name email phone' }
      });
    res.json(activeAlerts);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching active alerts', error: error.message });
  }
});

// POST /api/alerts/manual-sos - Trigger manual SOS button (Works on all tiers including Free Tier)
router.post('/manual-sos', authMiddleware, async (req, res) => {
  try {
    const { elderId, notes } = req.body;
    const elder = await ElderProfile.findById(elderId);
    if (!elder) return res.status(404).json({ message: 'Elder profile not found' });

    console.log(`[MANUAL SOS BUTTON PRESSED] Elder: ${elder.name} (${elderId})`);
    const alertLog = await triggerEscalation(elder._id, 'manual_sos', `Manual Emergency SOS Triggered by user/elder (${notes || 'Immediate assistance requested'})`);

    res.status(201).json({
      message: 'EMERGENCY SOS ALERT ACTIVATED! Parallel escalation initiated.',
      alertLog
    });
  } catch (error) {
    res.status(500).json({ message: 'Error triggering manual SOS', error: error.message });
  }
});

// POST /api/alerts/twilio-ivr-callback - Twilio Voice Call IVR Callback Webhook
router.post('/twilio-ivr-callback', async (req, res) => {
  try {
    const { Digits, alertId, elderId } = req.body;
    console.log(`[TWILIO IVR CALLBACK RECEIVED] Digits Pressed: "${Digits}" | Alert ID: ${alertId} | Elder ID: ${elderId}`);

    let twimlResponse = '';
    if (Digits === '1') {
      // Elder pressed 1 -> Safe
      twimlResponse = `<Response><Say voice="alice">Thank you! Your safe status has been recorded. CircleBack alert cleared.</Say></Response>`;
      if (alertId) {
        await resolveAlert(alertId, 'elder', 'Elder Phone Check-in', 'Elder pressed 1 on phone dialpad confirming safety.');
      }
    } else {
      // Elder pressed 2 or digit invalid -> Emergency Escalation
      twimlResponse = `<Response><Say voice="alice">Emergency assistance requested. Dispatching family members, nearby community volunteers, and emergency services immediately.</Say></Response>`;
      if (elderId) {
        const elder = await ElderProfile.findById(elderId);
        if (elder) {
          const alertLog = await AlertLog.findOne({ elderProfileId: elder._id, finalStatus: 'pending' });
          if (alertLog) {
            const { executeStep2ParallelEscalation } = require('../services/escalation');
            await executeStep2ParallelEscalation(alertLog, elder);
          }
        }
      }
    }

    res.type('text/xml');
    res.send(twimlResponse);
  } catch (error) {
    console.error('[TWILIO IVR CALLBACK ERROR]', error.message);
    res.type('text/xml');
    res.send(`<Response><Say>An error occurred processing emergency check-in.</Say></Response>`);
  }
});

// PATCH /api/alerts/:alertId/resolve - Resolve an active alert
router.patch('/:alertId/resolve', authMiddleware, async (req, res) => {
  try {
    const { alertId } = req.params;
    const { note } = req.body;
    const responderRole = req.user.role || 'family';
    const responderName = req.user.name || 'User';

    const updatedLog = await resolveAlert(alertId, responderRole, responderName, note);
    res.json({ message: 'Alert resolved successfully', alertLog: updatedLog });
  } catch (error) {
    res.status(500).json({ message: 'Error resolving alert', error: error.message });
  }
});

module.exports = router;
