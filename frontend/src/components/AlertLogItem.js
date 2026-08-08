import React from 'react';
import { AlertCircle, PhoneCall, Users, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';

const AlertLogItem = ({ alertLog, onResolve }) => {
  const getStepIcon = (stepNumber) => {
    switch (stepNumber) {
      case 1: return <PhoneCall size={16} color="#3b82f6" />;
      case 2: return <Users size={16} color="#8b5cf6" />;
      case 3: return <ShieldAlert size={16} color="#ef4444" />;
      default: return <CheckCircle2 size={16} color="#10b981" />;
    }
  };

  return (
    <div className={`glass-card ${alertLog.finalStatus === 'pending' ? 'alert-banner-emergency' : ''}`} style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <AlertCircle size={20} color={alertLog.finalStatus === 'pending' ? '#ef4444' : '#f59e0b'} />
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              Trigger: <span style={{ textTransform: 'capitalize' }}>{alertLog.triggerType?.replace('_', ' ')}</span>
            </h4>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Value: <strong>{alertLog.triggerValue}</strong> • Logged: {new Date(alertLog.createdAt).toLocaleString()}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <span className={`status-badge ${alertLog.finalStatus === 'pending' ? 'alert_triggered' : 'resolved'}`}>
            {alertLog.finalStatus?.replace(/_/g, ' ')}
          </span>
          {alertLog.finalStatus === 'pending' && onResolve && (
            <div style={{ marginTop: '0.5rem' }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', borderColor: '#10b981', color: '#10b981' }}
                onClick={() => onResolve(alertLog._id)}
              >
                Mark Resolved
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="alert-timeline">
        {alertLog.escalationSteps?.map((step, idx) => (
          <div className="timeline-item" key={idx}>
            <div style={{ paddingTop: '2px' }}>{getStepIcon(step.step)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600, flexWrap: 'wrap', gap: '0.5rem' }}>
                <span>{step.title}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {new Date(step.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.83rem', marginTop: '2px' }}>
                {step.details}
              </p>
              {step.respondedBy && (
                <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, marginTop: '2px' }}>
                  Responder: {step.respondedBy}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertLogItem;
