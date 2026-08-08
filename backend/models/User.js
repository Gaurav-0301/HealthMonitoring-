const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  role: { type: String, enum: ['family', 'volunteer', 'admin'], default: 'family' },
  name: String,
  email: { type: String, unique: true },
  phone: String,
  passwordHash: String,
  subscriptionTier: { type: String, enum: ['free', 'family_care', 'complete_care'], default: 'free' },
  subscriptionStatus: { type: String, default: 'inactive' },
  subscriptionExpiry: Date,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
