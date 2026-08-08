const mongoose = require('mongoose');

const volunteerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  geoLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [77.2090, 28.6139]
    }
  },
  idProofUrl: {
    type: String,
    default: ''
  },
  verified: {
    type: Boolean,
    default: false
  },
  assignedElders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ElderProfile'
  }],
  availabilityStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

volunteerSchema.index({ geoLocation: '2dsphere' });

module.exports = mongoose.model('Volunteer', volunteerSchema);
