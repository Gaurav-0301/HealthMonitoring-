import React, { useState } from 'react';
import { Activity, Zap, AlertTriangle, Clock, RefreshCw } from 'lucide-react';
import api from '../services/api';

const VitalsSimulator = ({ selectedElderId, onSimulationComplete }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSimulate = async (preset, customHR = null, customSteps = null) => {
    if (!selectedElderId) {
      alert('Please select or register an elder profile first to simulate vitals.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await api.post(`/vitals/${selectedElderId}/mock-simulate`, {
        simulatePreset: preset,
        heartRate: customHR,
        steps: customSteps
      });

      setMessage({
        type: response.data.escalationTriggered ? 'danger' : 'success',
        text: response.data.message,
        report: response.data.anomalyReport
      });

      if (onSimulationComplete) {
        onSimulationComplete(response.data);
      }
    } catch (error) {
      setMessage({
        type: 'danger',
        text: error.response?.data?.message || 'Simulation failed'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="simulator-bar">
      <div className="simulator-title">
        <Zap size={18} />
        <span>Vitals Simulation Engine (Demo & Testing Toolbar)</span>
      </div>

      <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Simulate fitness band vitals readings to test CircleBack's calibration, anomaly detection (3-consecutive-reading rule), and parallel escalation pipeline live.
      </p>

      <div className="simulator-buttons">
        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => handleSimulate('normal')}
        >
          <Activity size={16} color="#10b981" />
          Normal Reading (72 bpm, 50 steps)
        </button>

        <button
          className="btn btn-danger"
          disabled={loading}
          onClick={() => handleSimulate('spike_3_readings')}
        >
          <AlertTriangle size={16} />
          Simulate 3 HR Spikes (145 bpm) [Anomaly!]
        </button>

        <button
          className="btn btn-secondary"
          disabled={loading}
          onClick={() => handleSimulate('inactivity_4h')}
          style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
        >
          <Clock size={16} />
          Simulate 4h Inactivity (0 steps)
        </button>

        {loading && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={16} className="spin" /> Executing Pipeline...
          </span>
        )}
      </div>

      {message && (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: message.type === 'danger' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            border: `1px solid ${message.type === 'danger' ? '#ef4444' : '#10b981'}`,
            fontSize: '0.9rem'
          }}
        >
          <strong>{message.text}</strong>
          {message.report && (
            <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Status: <span style={{ textTransform: 'uppercase', fontWeight: 'bold' }}>{message.report.status}</span>
              {message.report.type && ` • Type: ${message.report.type}`}
              {message.report.value && ` • Value: ${message.report.value}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VitalsSimulator;
