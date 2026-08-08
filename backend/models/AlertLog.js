const mongoose = require('mongoose');

const escalationStepSchema = new mongoose.Schema({
  step: { type: Number, required: true },
  title: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { type: String, required: true }, // e.g., 'triggered', 'no_answer', 'notified', 'acknowledged'
  respondedBy: { type: String, default: null },
  details: { type: String, default: '' }
});

const alertLogSchema = new mongoose.Schema({
  elderProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElderProfile',
    required: true,
    index: true
  },
  triggerType: {
    type: String,
    enum: ['heart_rate_anomaly', 'inactivity', 'manual_sos', 'disease_risk_spike'],
    required: true
  },
  triggerValue: {
    type: String,
    required: true
  },
  escalationSteps: [escalationStepSchema],
  finalStatus: {
    type: String,
    enum: ['pending', 'false_alarm', 'resolved_by_family', 'resolved_by_volunteer', 'escalated_to_emergency'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
});

module.exports = mongoose.model('AlertLog', alertLogSchema);
