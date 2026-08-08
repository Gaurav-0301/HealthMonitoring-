const mongoose = require('mongoose');

const vitalsHistorySchema = new mongoose.Schema({
  elderProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'ElderProfile' },
  heartRate: Number,
  steps: Number,
  timestamp: { type: Date, default: Date.now },
  source: { type: String, enum: ['google_fit', 'apple_health'] }
});

module.exports = mongoose.model('VitalsHistory', vitalsHistorySchema);
