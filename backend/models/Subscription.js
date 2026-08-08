const mongoose = require('mongoose');

const paymentRecordSchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  transactionId: { type: String, required: true }
});

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['free', 'family_care', 'complete_care'],
    default: 'free'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  paymentStatus: {
    type: String,
    enum: ['active', 'pending', 'expired', 'failed'],
    default: 'active'
  },
  paymentHistory: [paymentRecordSchema]
});

module.exports = mongoose.model('Subscription', subscriptionSchema);
