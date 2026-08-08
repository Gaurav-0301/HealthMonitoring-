const mongoose = require('mongoose');

const elderProfileSchema = new mongoose.Schema({
  linkedFamilyUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: String,
  age: Number,
  gender: String,
  photoUrl: String,
  address: String,
  landmark: String,
  geoLocation: {
    lat: Number,
    lng: Number
  },
  emergencyContacts: [
    {
      name: String,
      relation: String,
      phone: String
    }
  ],
  googleFitAuthToken: String,
  appleHealthAuthToken: String,
  baselineHeartRateMin: Number,
  baselineHeartRateMax: Number,
  calibrationComplete: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'alert_triggered', 'resolved'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ElderProfile', elderProfileSchema);
