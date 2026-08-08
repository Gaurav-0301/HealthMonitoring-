import React from 'react';
import { Check } from 'lucide-react';

const SubscriptionCard = ({ plan, currentTier, onSelectPlan, loading }) => {
  const isCurrent = currentTier === plan.id;

  return (
    <div className={`glass-card pricing-card ${plan.popular ? 'popular' : ''}`}>
      <div>
        {plan.popular && (
          <div style={{
            background: 'var(--primary)',
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            display: 'inline-block',
            marginBottom: '0.75rem',
            textTransform: 'uppercase'
          }}>
            Most Popular
          </div>
        )}

        <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{plan.name}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginTop: '0.25rem' }}>{plan.description}</p>

        <div className="pricing-price">
          ₹{plan.price} <span>/ month</span>
        </div>

        <ul style={{ listStyle: 'none', margin: '1.5rem 0' }}>
          {plan.features.map((feat, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.65rem', fontSize: '0.9rem' }}>
              <Check size={16} color="var(--primary)" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
        disabled={isCurrent || loading}
        onClick={() => onSelectPlan(plan.id)}
        style={{ width: '100%' }}
      >
        {isCurrent ? 'Current Plan' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
};

export default SubscriptionCard;
