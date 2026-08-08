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
  restingHeartRate: {
    type: Number,
    default: 70
  },
  heartRateSd: {
    type: Number,
    default: 6
  },
  spo2Avg: {
    type: Number,
    default: 98
  },
  spo2Min: {
    type: Number,
    default: 96
  },
  skinTemp: {
    type: Number,
    default: 33.6
  },
  stepsToday: {
    type: Number,
    default: 0
  },
  sleepHours: {
    type: Number,
    default: 7.5
  },
  sleepEfficiency: {
    type: Number,
    default: 88
  },
  cardiacRisk: {
    type: Number,
    default: 0.003
  },
  respiratoryRisk: {
    type: Number,
    default: 0.008
  },
  feverRisk: {
    type: Number,
    default: 0.017
  },
  stressRisk: {
    type: Number,
    default: 0.027
  },
  metabolicRisk: {
    type: Number,
    default: 0.000
  },
  flagged: [{
    type: String
  }],
  disclaimer: {
    type: String,
    default: 'This is a screening heuristic trained on synthetic data.'
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
