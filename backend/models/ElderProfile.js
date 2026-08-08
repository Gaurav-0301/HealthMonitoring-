const mongoose = require('mongoose');

const emergencyContactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  relation: { type: String, required: true },
  phone: { type: String, required: true }
});

const elderProfileSchema = new mongoose.Schema({
  linkedFamilyUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  photoUrl: {
    type: String,
    default: ''
  },
  address: {
    type: String,
    required: true
  },
  landmark: {
    type: String,
    default: ''
  },
  geoLocation: {
    lat: { type: Number, default: 28.6139 },
    lng: { type: Number, default: 77.2090 }
  },
  emergencyContacts: [emergencyContactSchema],
  googleFitAuthToken: {
    type: String,
    default: null
  },
  appleHealthAuthToken: {
    type: String,
    default: null
  },
  baselineHeartRateMin: {
    type: Number,
    default: 60
  },
  baselineHeartRateMax: {
    type: Number,
    default: 100
  },
  calibrationComplete: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'alert_triggered', 'resolved'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ElderProfile', elderProfileSchema);
