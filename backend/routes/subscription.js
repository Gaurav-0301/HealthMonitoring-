const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const { authMiddleware } = require('../middleware/auth');

let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'rzp_test_circleback123') {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch (err) {
    console.warn('[Razorpay] Initialization skipped or mock mode enabled:', err.message);
  }
}

const TIER_PRICES = {
  free: 0,
  family_care: 499, // ₹499/month
  complete_care: 999 // ₹999/month
};

// GET /api/subscription/current
router.get('/current', authMiddleware, async (req, res) => {
  try {
    const sub = await Subscription.findOne({ userId: req.user.id });
    res.json(sub || { tier: req.user.subscriptionTier || 'free', paymentStatus: 'active' });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching subscription', error: error.message });
  }
});

// POST /api/subscription/create-order
router.post('/create-order', authMiddleware, async (req, res) => {
  try {
    const { tier } = req.body;
    if (!['family_care', 'complete_care'].includes(tier)) {
      return res.status(400).json({ message: 'Invalid subscription tier selected' });
    }

    const amountInINR = TIER_PRICES[tier];
    const amountInPaisa = amountInINR * 100;

    if (razorpayInstance) {
      const order = await razorpayInstance.orders.create({
        amount: amountInPaisa,
        currency: 'INR',
        receipt: `receipt_sub_${Date.now()}`,
        notes: { userId: req.user.id, tier }
      });
      return res.json({ orderId: order.id, amount: order.amount, currency: order.currency, key: process.env.RAZORPAY_KEY_ID, tier });
    }

    // Mock Razorpay Order for testing
    const mockOrderId = `order_mock_${Date.now()}`;
    res.json({
      orderId: mockOrderId,
      amount: amountInPaisa,
      currency: 'INR',
      key: 'rzp_test_circleback123',
      tier,
      simulated: true,
      note: 'Razorpay order created in mock simulation mode'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
  }
});

// POST /api/subscription/verify-payment
router.post('/verify-payment', authMiddleware, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, tier } = req.body;

    let isValid = true;
    if (razorpayInstance && razorpay_signature) {
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');
      isValid = expectedSignature === razorpay_signature;
    }

    if (!isValid) {
      return res.status(400).json({ message: 'Invalid Razorpay signature. Payment verification failed.' });
    }

    const newTier = ['family_care', 'complete_care'].includes(tier) ? tier : 'family_care';
    const amountPaid = TIER_PRICES[newTier];
    const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 days

    // Update User model
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionTier: newTier,
      subscriptionStatus: 'active',
      subscriptionExpiry: expiryDate
    });

    // Update Subscription model
    let sub = await Subscription.findOne({ userId: req.user.id });
    if (!sub) {
      sub = new Subscription({ userId: req.user.id });
    }
    sub.tier = newTier;
    sub.paymentStatus = 'active';
    sub.endDate = expiryDate;
    sub.paymentHistory.push({
      amount: amountPaid,
      date: new Date(),
      transactionId: razorpay_payment_id || `txn_mock_${Date.now()}`
    });
    await sub.save();

    res.json({
      message: `Subscription successfully upgraded to ${newTier.toUpperCase()}!`,
      user: {
        id: req.user.id,
        subscriptionTier: newTier,
        subscriptionExpiry: expiryDate
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying payment', error: error.message });
  }
});

module.exports = router;
