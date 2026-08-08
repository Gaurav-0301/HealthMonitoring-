const mongoose = require('mongoose');

const alertLogSchema = new mongoose.Schema({
  elderProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElderProfile' },
  triggerType: { type: String, enum: ['heart_rate_anomaly', 'inactivity', 'manual_sos'] },
  triggerValue: String,
  escalationSteps: [
    {
      step: String,
      timestamp: Date,
      status: String,
      respondedBy: String
    }
  ],
  finalStatus: {
    type: String,
    enum: ['false_alarm', 'resolved_by_family', 'resolved_by_volunteer', 'escalated_to_emergency'],
    default: 'false_alarm'
  },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: Date
});

module.exports = mongoose.model('AlertLog', alertLogSchema);
