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

      <div className="simulator-buttons" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>🔘 Select Smartwatch Simulation Scenario (Radio Selectors):</span>
        <div className="radio-chip-group">
          {[
            { id: 'healthy', label: '🟢 Healthy Baseline' },
            { id: 'cardiac', label: '❤️ Cardiac Risk' },
            { id: 'respiratory', label: '🫁 Respiratory Risk' },
            { id: 'fever', label: '🌡️ Fever / Infection' },
            { id: 'stress', label: '🧠 Stress / Fatigue' },
            { id: 'metabolic', label: '🍏 Metabolic Risk' },
            { id: 'worst_case', label: '🚨 Multi-Risk Spike' },
            { id: 'spike_3_readings', label: '⚡ 3 HR Spikes' },
            { id: 'inactivity_4h', label: '📴 4h Inactivity' }
          ].map(p => (
            <label key={p.id} className="radio-chip">
              <input
                type="radio"
                name="simPresetRadio"
                value={p.id}
                onChange={() => handleSimulate(p.id)}
                disabled={loading}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>
        
        {loading && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 700 }}>
            <RefreshCw size={16} className="spin" /> Ingesting Live Telemetry & Evaluating ML Risks...
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
