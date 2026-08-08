import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import SubscriptionCard from '../components/SubscriptionCard';
import api from '../services/api';

const PLANS = [
  {
    id: 'free',
    name: 'Free Tier',
    price: 0,
    description: 'Basic safety layer with manual emergency SOS trigger',
    features: [
      'Manual SOS Panic Button',
      'Daily Manual Check-in Reminders',
      'Medical History & Document Storage',
      'Single Emergency Contact SMS'
    ]
  },
  {
    id: 'family_care',
    name: 'Family Care',
    price: 499,
    popular: true,
    description: 'Complete continuous passive monitoring & parallel emergency escalation',
    features: [
      'Automatic Fitness Band Vitals Sync (15 min polling)',
      '7-Day Baseline Calibration Engine',
      'Heart Rate Anomaly & 4h Inactivity Detection',
      'Step 1 Twilio Voice IVR Auto-Call to Elder',
      'Step 2 Parallel Family SMS/Push + $near Volunteer Search (5km)',
      'Step 3 Paramedic & Emergency Dispatch Link',
      'Unlimited Emergency Contacts'
    ]
  },
  {
    id: 'complete_care',
    name: 'Complete Care',
    price: 999,
    description: 'Adds 24/7 human call-center backup and monthly health reports',
    features: [
      'Everything in Family Care',
      '24/7 Human Emergency Call-Center Backup Flag',
      'Monthly Health Trend & Heart Rate Analytics PDF Report',
      'Priority Paramedic Escalation Hotline',
      'Dedicated Care Specialist Assigned'
    ]
  }
];

const Billing = () => {
  const { user, updateUserSubscription } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSelectPlan = async (tierId) => {
    if (tierId === 'free') {
      alert('You are already on the Free Plan.');
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await api.post('/subscription/create-order', { tier: tierId });
      const { orderId } = orderRes.data;

      // 2. Open Razorpay modal or execute simulation verification
      const verifyRes = await api.post('/subscription/verify-payment', {
        razorpay_order_id: orderId,
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_signature: `sig_mock_${Date.now()}`,
        tier: tierId
      });

      updateUserSubscription(tierId);
      setMessage(`🎉 ${verifyRes.data.message}`);
    } catch (err) {
      setMessage('Payment failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '2rem auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 className="page-title">Subscription Plans & Billing</h1>
        <p className="page-subtitle">Choose the level of safety & automated health monitoring for your family</p>
      </div>

      {message && (
        <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '10px', color: '#6ee7b7', textAlign: 'center', marginBottom: '2rem', fontSize: '1rem' }}>
          {message}
        </div>
      )}

      <div className="pricing-grid">
        {PLANS.map((plan) => (
          <SubscriptionCard
            key={plan.id}
            plan={plan}
            currentTier={user?.subscriptionTier || 'free'}
            onSelectPlan={handleSelectPlan}
            loading={loading}
          />
        ))}
      </div>
    </div>
  );
};

export default Billing;
