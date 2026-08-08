import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Zap, Heart, Activity, AlertTriangle, PhoneCall, MessageSquare, Send, CheckCircle, RefreshCw, UserCheck, Shield } from 'lucide-react';

const VitalsControlRoom = () => {
  const { user, login } = useContext(AuthContext);
  const [elders, setElders] = useState([]);
  const [selectedElderId, setSelectedElderId] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  
  // 9 Canonical Band Sensors State
  const [heartRate, setHeartRate] = useState(78);
  const [restingHeartRate, setRestingHeartRate] = useState(62);
  const [heartRateSd, setHeartRateSd] = useState(7);
  const [spo2Avg, setSpo2Avg] = useState(97);
  const [spo2Min, setSpo2Min] = useState(95);
  const [skinTemp, setSkinTemp] = useState(33.8);
  const [steps, setSteps] = useState(4200);
  const [sleepHours, setSleepHours] = useState(6.5);
  const [sleepEfficiency, setSleepEfficiency] = useState(85);

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
        restingHeartRate: preset ? null : Number(restingHeartRate),
        heartRateSd: preset ? null : Number(heartRateSd),
        spo2Avg: preset ? null : Number(spo2Avg),
        spo2Min: preset ? null : Number(spo2Min),
        skinTemp: preset ? null : Number(skinTemp),
        stepsToday: preset ? null : Number(steps),
        steps: preset ? null : Number(steps),
        sleepHours: preset ? null : Number(sleepHours),
        sleepEfficiency: preset ? null : Number(sleepEfficiency)
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
          body: `Vitals logged cleanly: HR=${preset ? 'Preset' : heartRate} BPM, SpO2=${preset ? 'Preset' : spo2Avg}%, Temp=${preset ? 'Preset' : skinTemp}°C. ML Model Status: Synced.`,
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
    <div style={{ maxWidth: '1200px', margin: '1rem auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap color="var(--accent-cyan)" size={28} /> Vitals Control Room & Emergency Trigger Simulator
          </h1>
          <p className="page-subtitle">
            Manipulate 9 live band sensor sliders, select preset radio scenarios, and test real-time ML risk screening & parallel escalation.
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

      {/* SECTION 1: RADIO BUTTON ELDER SELECTION */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          👵 Select Monitored Elder Profile (Radio Selection):
        </h3>
        <div className="radio-chip-group">
          {elders.length === 0 && <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>No elders found. Click "Seed Demo Data" above!</span>}
          {elders.map(e => (
            <label key={e._id} className={`radio-chip ${selectedElderId === e._id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="selectedElderRadio"
                value={e._id}
                checked={selectedElderId === e._id}
                onChange={() => setSelectedElderId(e._id)}
              />
              <span>👵 <strong>{e.name}</strong> ({e.age} yrs) • Baseline HR: {e.baselineHeartRateMin}-{e.baselineHeartRateMax} BPM</span>
            </label>
          ))}
        </div>
      </div>

      {/* SECTION 2: RADIO BUTTON PRESET SCENARIOS */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🔘 Instant Smartwatch Simulation Scenarios (Radio Button Cards):
        </h3>
        <div className="radio-card-grid">
          {[
            { id: 'healthy', title: '🟢 Healthy Baseline', desc: 'All Low Risk (0.3% Cardiac, 98% SpO2)' },
            { id: 'cardiac', title: '❤️ Cardiac Risk Pattern', desc: '94.4% Cardiac Spike (118 BPM, 16ms SD)' },
            { id: 'respiratory', title: '🫁 Respiratory Risk', desc: '79% Respiratory Spike (SpO2 drop to 87%)' },
            { id: 'fever', title: '🌡️ Fever / Infection', desc: '82.2% Fever Spike (Temp 36.8°C, HR 105)' },
            { id: 'stress', title: '🧠 Stress / Fatigue', desc: '87.3% Stress Spike (HRV 3ms, 4.5h Sleep)' },
            { id: 'metabolic', title: '🍏 Metabolic / Lifestyle', desc: '73.8% Metabolic Spike (1800 Steps)' },
            { id: 'worst_case', title: '🚨 Worst-Case Multi-Risk', desc: 'Multi-organ risk spike (128 BPM, 37.4°C)' },
            { id: 'spike_3_readings', title: '⚡ Anomaly Escalation', desc: '3 Consecutive Heart Rate Spikes' },
            { id: 'inactivity_4h', title: '📴 Daytime Inactivity', desc: '4-Hour Continuous Zero Movement' }
          ].map(p => (
            <label key={p.id} className={`radio-card ${selectedPreset === p.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="presetScenarioRadio"
                value={p.id}
                checked={selectedPreset === p.id}
                onChange={() => {
                  setSelectedPreset(p.id);
                  handleSimulateVitals(p.id);
                }}
              />
              <div className="radio-card-title">{p.title}</div>
              <div className="radio-card-desc">{p.desc}</div>
            </label>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* LEFT COLUMN: All 9 Band Sensor Range Sliders */}
        <div className="glass-card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity color="var(--primary)" /> Smartwatch 9-Sensor Telemetry Controls (Demo Range Buttons)
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
            {/* 1. Heart Rate Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={16} color="#f43f5e" /> 1. Heart Rate (Instant)
                </label>
                <span style={{ fontWeight: 800, color: heartRate > 95 || heartRate < 60 ? '#ef4444' : '#10b981', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {heartRate} BPM
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="200"
                value={heartRate}
                onChange={(e) => { setSelectedPreset(''); setHeartRate(e.target.value); }}
                style={{ width: '100%', accentColor: heartRate > 95 ? '#ef4444' : '#10b981', cursor: 'pointer' }}
              />
            </div>

            {/* 2. Resting Heart Rate Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  ❤️ 2. Resting Heart Rate
                </label>
                <span style={{ fontWeight: 800, color: restingHeartRate > 85 ? '#f59e0b' : '#0f172a', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {restingHeartRate} BPM
                </span>
              </div>
              <input
                type="range"
                min="40"
                max="120"
                value={restingHeartRate}
                onChange={(e) => { setSelectedPreset(''); setRestingHeartRate(e.target.value); }}
                style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }}
              />
            </div>

            {/* 3. Heart Rate SD (HRV) Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  📈 3. HR SD (Variability)
                </label>
                <span style={{ fontWeight: 800, color: heartRateSd < 4 || heartRateSd > 12 ? '#f59e0b' : '#0f172a', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {heartRateSd} ms
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                value={heartRateSd}
                onChange={(e) => { setSelectedPreset(''); setHeartRateSd(e.target.value); }}
                style={{ width: '100%', accentColor: '#8b5cf6', cursor: 'pointer' }}
              />
            </div>

            {/* 4. SpO2 Avg Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  🫁 4. SpO2 Average
                </label>
                <span style={{ fontWeight: 800, color: spo2Avg < 94 ? '#ef4444' : '#10b981', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {spo2Avg}%
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="100"
                value={spo2Avg}
                onChange={(e) => { setSelectedPreset(''); setSpo2Avg(e.target.value); }}
                style={{ width: '100%', accentColor: spo2Avg < 94 ? '#ef4444' : '#10b981', cursor: 'pointer' }}
              />
            </div>

            {/* 5. SpO2 Min Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  🩸 5. SpO2 Minimum Drop
                </label>
                <span style={{ fontWeight: 800, color: spo2Min < 92 ? '#ef4444' : '#10b981', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {spo2Min}%
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="100"
                value={spo2Min}
                onChange={(e) => { setSelectedPreset(''); setSpo2Min(e.target.value); }}
                style={{ width: '100%', accentColor: spo2Min < 92 ? '#ef4444' : '#0284c7', cursor: 'pointer' }}
              />
            </div>

            {/* 6. Skin Temperature Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  🌡️ 6. Skin Temperature
                </label>
                <span style={{ fontWeight: 800, color: skinTemp > 36.2 ? '#ef4444' : '#0f172a', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {skinTemp} °C
                </span>
              </div>
              <input
                type="range"
                min="32.0"
                max="41.0"
                step="0.1"
                value={skinTemp}
                onChange={(e) => { setSelectedPreset(''); setSkinTemp(e.target.value); }}
                style={{ width: '100%', accentColor: skinTemp > 36.2 ? '#ef4444' : '#e11d48', cursor: 'pointer' }}
              />
            </div>

            {/* 7. Steps Today Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  👟 7. Steps Today
                </label>
                <span style={{ fontWeight: 800, color: '#06b6d4', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {steps} steps
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="20000"
                step="100"
                value={steps}
                onChange={(e) => { setSelectedPreset(''); setSteps(e.target.value); }}
                style={{ width: '100%', accentColor: '#06b6d4', cursor: 'pointer' }}
              />
            </div>

            {/* 8. Sleep Hours Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  🌙 8. Sleep Duration
                </label>
                <span style={{ fontWeight: 800, color: sleepHours < 5.5 ? '#f59e0b' : '#0f172a', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {sleepHours} hrs
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="14.0"
                step="0.5"
                value={sleepHours}
                onChange={(e) => { setSelectedPreset(''); setSleepHours(e.target.value); }}
                style={{ width: '100%', accentColor: '#7e22ce', cursor: 'pointer' }}
              />
            </div>

            {/* 9. Sleep Efficiency Slider */}
            <div className="sensor-slider-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                  ⚡ 9. Sleep Efficiency
                </label>
                <span style={{ fontWeight: 800, color: sleepEfficiency < 70 ? '#f59e0b' : '#10b981', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}>
                  {sleepEfficiency}%
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="100"
                value={sleepEfficiency}
                onChange={(e) => { setSelectedPreset(''); setSleepEfficiency(e.target.value); }}
                style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => handleSimulateVitals(null)}
            style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 800 }}
          >
            <Send size={18} style={{ display: 'inline', marginRight: '6px' }} /> Ingest Live Telemetry Stream ({heartRate} BPM, {spo2Avg}% SpO2, {skinTemp}°C)
          </button>
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
