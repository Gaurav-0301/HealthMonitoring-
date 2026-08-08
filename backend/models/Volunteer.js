const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  address: String,
  geoLocation: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [lng, lat]
  },
  idProofUrl: String,
  verified: { type: Boolean, default: false },
  assignedElders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ElderProfile' }],
  availabilityStatus: { type: String, enum: ['available', 'busy', 'offline'], default: 'offline' }
});

volunteerSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('Volunteer', volunteerSchema);
