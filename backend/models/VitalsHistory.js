const mongoose = require('mongoose');

const vitalsHistorySchema = new mongoose.Schema({
  elderProfileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElderProfile',
    required: true,
    index: true
  },
  heartRate: {
    type: Number,
    required: true
  },
  steps: {
    type: Number,
    default: 0
  },
  source: {
    type: String,
    enum: ['google_fit', 'apple_health', 'mock_simulator'],
    default: 'mock_simulator'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('VitalsHistory', vitalsHistorySchema);
