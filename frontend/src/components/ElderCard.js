import React from 'react';
import { Heart, Activity, AlertTriangle, ShieldCheck, MapPin, Watch, FileText, Edit3, Phone, Trash2 } from 'lucide-react';

const ElderCard = ({ elder, onSelect, onTriggerSOS, onEdit, onDelete }) => {
  const getStatusBadge = (status) => {
    switch (status) {
      case 'alert_triggered':
        return <span className="status-badge alert_triggered"><AlertTriangle size={14} /> Alert Active</span>;
      case 'resolved':
        return <span className="status-badge resolved"><ShieldCheck size={14} /> Resolved</span>;
      case 'active':
      default:
        return <span className="status-badge active"><Activity size={14} /> Normal / Active</span>;
    }
  };

  return (
    <div className={`glass-card elder-card ${elder.status === 'alert_triggered' ? 'alert-border' : ''}`}>
      <div className="elder-card-header">
        <img
          src={elder.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(elder.name)}`}
          alt={elder.name}
          className="elder-avatar"
        />
        <div className="elder-info">
          <h3>{elder.name}</h3>
          <p>{elder.age} yrs • {elder.gender} • <MapPin size={12} style={{ display: 'inline' }} /> {elder.landmark || 'Home'}</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        {getStatusBadge(elder.status)}
        <span style={{ fontSize: '0.8rem', color: elder.googleFitAuthToken ? '#10b981' : '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Watch size={14} /> {elder.googleFitAuthToken ? 'Band Synced' : 'Manual Mode'}
        </span>
      </div>

      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '10px', marginBottom: '1rem', fontSize: '0.85rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Heart size={14} color="#f43f5e" /> HR Baseline:
          </span>
          <strong>{elder.baselineHeartRateMin} - {elder.baselineHeartRateMax} bpm</strong>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Phone size={14} color="#34d399" /> Contacts:
          </span>
          <span>
            {elder.emergencyContacts?.length || 0} Registered Contacts
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.82rem' }} onClick={() => onSelect(elder)}>
          <FileText size={14} /> Vitals
        </button>
        <button className="btn btn-secondary" style={{ fontSize: '0.82rem', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }} onClick={() => onEdit(elder)}>
          <Edit3 size={14} /> Edit
        </button>
        <button className="btn btn-danger" style={{ fontSize: '0.82rem' }} onClick={() => onTriggerSOS(elder._id)}>
          <AlertTriangle size={14} /> SOS
        </button>
        {onDelete && (
          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', borderColor: '#ef4444', color: '#ef4444', padding: '0.35rem 0.5rem' }}
            title="Remove Elder Profile"
            onClick={() => onDelete(elder)}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ElderCard;
