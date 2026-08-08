import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Zap, Heart, Activity, AlertTriangle, PhoneCall, MessageSquare, Send, CheckCircle, RefreshCw, UserCheck, Shield } from 'lucide-react';

const VitalsControlRoom = () => {
  const { user, login } = useContext(AuthContext);
  const [elders, setElders] = useState([]);
  const [selectedElderId, setSelectedElderId] = useState('');
  const [heartRate, setHeartRate] = useState(72);
  const [steps, setSteps] = useState(100);
  const [loading, setLoading] = useState(false);
  const [dispatchLog, setDispatchLog] = useState([]);
  const [activeCallModal, setActiveCallModal] = useState(null);

  const fetchElders = async () => {
    try {
      const res = await api.get('/elder-profile');
      setElders(res.data);
      if (res.data.length > 0 && !selectedElderId) {
        setSelectedElderId(res.data[0]._id);
      }
    } catch (err) {
      console.error('Error fetching elders for control room', err);
    }
  };

  useEffect(() => {
    fetchElders();
  }, []);

  const handleQuickLogin = async (email, roleLabel) => {
    try {
      await login(email, 'password123');
      alert(`Logged in successfully as ${roleLabel}!`);
      fetchElders();
    } catch (err) {
      alert('Quick login failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleSimulateVitals = async (preset = null) => {
    if (!selectedElderId) {
      alert('Please select an elder profile first or click "Seed Demo Account"!');
      return;
    }

    setLoading(true);
    try {
      const targetElder = elders.find(e => e._id === selectedElderId);
      const elderName = targetElder ? targetElder.name : 'Elder';

      const response = await api.post(`/vitals/${selectedElderId}/mock-simulate`, {
        simulatePreset: preset,
        heartRate: preset ? null : Number(heartRate),
        steps: preset ? null : Number(steps)
      });

      const { anomalyReport, escalationTriggered, escalationLog } = response.data;

      const newDispatches = [];
      const timestamp = new Date().toLocaleTimeString();

      if (escalationTriggered && escalationLog) {
        // Step 1: Twilio IVR Call
        newDispatches.push({
          id: Date.now() + 1,
          type: 'call',
          title: `☎️ OUTBOUND TWILIO IVR VOICE CALL TO ELDER (${elderName})`,
          recipient: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          script: `CarePulse Emergency Check-in. Hello ${elderName}, we detected a health anomaly (${anomalyReport.value}). Press 1 if safe, or press 2 for help.`,
          status: 'Ringing / Waiting for digit response',
          timestamp
        });

        // Step 2: Parallel SMS & Volunteer Search
        newDispatches.push({
          id: Date.now() + 2,
          type: 'sms',
          title: `📱 PARALLEL TWILIO SMS TO FAMILY (${user?.name || 'Family Member'})`,
          recipient: user?.phone || '+91 98765 43210',
          body: `EMERGENCY ALERT [CarePulse]: ${elderName} failed health check! Anomaly: ${anomalyReport.type} (${anomalyReport.value}). Address: ${targetElder?.address}. Map: https://maps.google.com/?q=${targetElder?.geoLocation?.lat || 28.6139},${targetElder?.geoLocation?.lng || 77.2090}`,
          status: 'Delivered (Twilio SMS Gateway)',
          timestamp
        });

        newDispatches.push({
          id: Date.now() + 3,
          type: 'volunteer',
          title: `🚑 GEOSPATIAL $near 5km VOLUNTEER DISPATCH ALERT`,
          recipient: 'Nearby Verified Volunteers (Within 5km radius)',
          body: `NEIGHBORHOOD SOS: ${elderName} at ${targetElder?.address} requires urgent check-in! Navigation Link: https://maps.google.com/?q=28.6139,77.2090`,
          status: 'Dispatched in Parallel (Promise.all)',
          timestamp
        });

        // Trigger visual simulated call popup
        setActiveCallModal({
          elderName,
          phone: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          triggerValue: anomalyReport.value
        });
      } else {
        newDispatches.push({
          id: Date.now(),
          type: 'normal',
          title: `📊 VITALS DATASTREAM UPDATE`,
          recipient: `Elder: ${elderName}`,
          body: `Vitals logged cleanly: Heart Rate = ${heartRate} BPM, Steps = ${steps}. Status: NORMAL (Within baseline range 65-95 BPM).`,
          status: 'Synced to Database VitalsHistory',
          timestamp
        });
      }

      setDispatchLog(prev => [...newDispatches, ...prev]);
    } catch (err) {
      alert('Error simulating vitals: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDemoData = async () => {
    try {
      const res = await api.post('/auth/seed-demo');
      alert('Demo Data & Savitri Devi profile seeded successfully! Auto-logging in as Demo Family...');
      await handleQuickLogin('demo@circleback.com', 'Demo Family');
    } catch (err) {
      alert('Seeding error: ' + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '1rem auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap color="var(--accent-cyan)" size={28} /> Vitals Control Room & Emergency Trigger Simulator
          </h1>
          <p className="page-subtitle">
            Manipulate live heart rate / step count vitals and simulate real-time Twilio Voice calls, SMS & parallel escalation.
          </p>
        </div>

        <button className="btn btn-secondary" onClick={handleSeedDemoData} style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
          🌱 Seed Demo Data (Savitri Devi)
        </button>
      </div>

      {/* Quick Account Switcher */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(135deg, #f1f5f9, #ffffff)' }}>
        <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <UserCheck size={16} /> 1-Click Quick Demo Account Switcher:
        </h4>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => handleQuickLogin('demo@carepulse.com', 'Demo Family')}>
            👨‍👩‍👧 Family Member (demo@carepulse.com)
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => handleQuickLogin('volunteer@carepulse.com', 'Demo Volunteer')}>
            🚑 Volunteer (volunteer@carepulse.com)
          </button>
          <button className="btn btn-secondary" style={{ fontSize: '0.85rem' }} onClick={() => handleQuickLogin('admin@carepulse.com', 'Demo Admin')}>
            🛡️ Admin (admin@carepulse.com)
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {/* LEFT COLUMN: Vitals Sliders & Controls */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--primary)" /> Vitals Manipulation Panel
          </h3>

          <div className="form-group">
            <label className="form-label">Select Monitored Elder Profile:</label>
            <select
              className="form-select"
              value={selectedElderId}
              onChange={(e) => setSelectedElderId(e.target.value)}
            >
              {elders.length === 0 && <option value="">No elders found. Click "Seed Demo Data" above!</option>}
              {elders.map(e => (
                <option key={e._id} value={e._id}>
                  {e.name} (Age {e.age}) — Baseline HR: {e.baselineHeartRateMin}-{e.baselineHeartRateMax} BPM
                </option>
              ))}
            </select>
          </div>

          {/* Heart Rate Slider */}
          <div className="form-group" style={{ background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Heart size={18} color="#f43f5e" /> Heart Rate Reading:
              </label>
              <span style={{
                fontSize: '1.4rem',
                fontWeight: 800,
                color: heartRate > 95 || heartRate < 60 ? '#ef4444' : '#10b981',
                fontFamily: 'var(--font-mono)'
              }}>
                {heartRate} BPM
              </span>
            </div>

            <input
              type="range"
              min="40"
              max="180"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              style={{ width: '100%', accentColor: heartRate > 95 ? '#ef4444' : '#10b981', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap', gap: '4px' }}>
              <span>40 BPM (Bradycardia)</span>
              <span>65-95 BPM (Normal Baseline)</span>
              <span>180 BPM (Critical Tachycardia)</span>
            </div>
          </div>

          {/* Step Count Slider */}
          <div className="form-group" style={{ background: 'rgba(0,0,0,0.25)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={18} color="#06b6d4" /> Step Movement Delta:
              </label>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                {steps} steps
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="500"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
            />
          </div>

          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => handleSimulateVitals(null)}
            style={{ width: '100%', marginBottom: '1.5rem', borderColor: 'var(--primary)' }}
          >
            <Send size={16} /> Send Custom Reading Stream ({heartRate} BPM, {steps} steps)
          </button>

          {/* Preset Instant Trigger Buttons */}
          <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
            Instant Emergency Escalation Scenarios:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn btn-danger"
              disabled={loading}
              onClick={() => handleSimulateVitals('spike_3_readings')}
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem' }}
            >
              <AlertTriangle size={20} />
              <div style={{ textAlign: 'left' }}>
                <div>Trigger 3-Spike Heart Rate Anomaly (145+ BPM)</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>Fires Twilio IVR Call + Parallel Family SMS + Nearby Volunteer Search</div>
              </div>
            </button>

            <button
              className="btn btn-secondary"
              disabled={loading}
              onClick={() => handleSimulateVitals('inactivity_4h')}
              style={{ justifyContent: 'flex-start', padding: '0.85rem 1rem', borderColor: '#f59e0b', color: '#f59e0b' }}
            >
              <Activity size={20} />
              <div style={{ textAlign: 'left' }}>
                <div>Trigger 4-Hour Inactivity Anomaly (0 steps)</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85 }}>Fires Daytime Inactivity Escalation Alert</div>
              </div>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Communication Dispatch Log */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare color="var(--accent-cyan)" /> Live Outbound Communication Dispatch Log
          </h3>

          {dispatchLog.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Send size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p>No outbound dispatches yet.</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Use the controls on the left to trigger normal vitals updates or emergency heart rate anomalies!
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '550px', overflowY: 'auto' }}>
              {dispatchLog.map((log) => (
                <div
                  key={log.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '10px',
                    background: log.type === 'call' ? 'rgba(59,130,246,0.15)' : log.type === 'sms' ? 'rgba(139,92,246,0.15)' : log.type === 'volunteer' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)',
                    border: `1px solid ${log.type === 'call' ? '#3b82f6' : log.type === 'sms' ? '#8b5cf6' : log.type === 'volunteer' ? '#ef4444' : '#10b981'}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 700, marginBottom: '0.35rem' }}>
                    <span>{log.title}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>{log.timestamp}</span>
                  </div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
                    Recipient: <strong>{log.recipient}</strong>
                  </p>
                  {log.script && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.85rem', color: '#60a5fa', fontStyle: 'italic' }}>
                      "{log.script}"
                    </div>
                  )}
                  {log.body && (
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.83rem', color: '#e2e8f0', fontFamily: 'var(--font-mono)' }}>
                      {log.body}
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: '#10b981', marginTop: '0.35rem', fontWeight: 600 }}>
                    Status: {log.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SIMULATED PHONE CALL IVR POPUP MODAL */}
      {activeCallModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ maxWidth: '420px', width: '90%', textAlign: 'center', border: '2px solid #ef4444', boxShadow: '0 0 40px rgba(239,68,68,0.5)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 1rem' }} className="spin">
              <PhoneCall size={32} style={{ margin: 'auto' }} />
            </div>

            <h3 style={{ fontSize: '1.4rem', color: '#ef4444' }}>STEP 1: TWILIO VOICE IVR CALL OUTBOUND</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 1.25rem' }}>
              Calling Elder: <strong>{activeCallModal.elderName}</strong> ({activeCallModal.phone})
            </p>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '1rem', borderRadius: '10px', fontSize: '0.9rem', color: '#fca5a5', marginBottom: '1.5rem', textAlign: 'left' }}>
              <p style={{ fontWeight: 600, marginBottom: '4px' }}>🔊 IVR Voice Script Playing:</p>
              <p style={{ fontStyle: 'italic' }}>
                "CircleBack Emergency Check-in. Hello {activeCallModal.elderName}, we detected an anomaly ({activeCallModal.triggerValue}). Press 1 if safe, press 2 for immediate emergency assistance."
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, borderColor: '#10b981', color: '#10b981' }}
                onClick={() => {
                  alert('Elder pressed 1 ("I am okay"). Alert marked safe.');
                  setActiveCallModal(null);
                }}
              >
                Press 1 (Elder Safe)
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={() => {
                  alert('Elder pressed 2 or did not answer. Step 2 Parallel Family + Volunteer Escalation dispatches live!');
                  setActiveCallModal(null);
                }}
              >
                No Answer / Press 2 (Escalate)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsControlRoom;
