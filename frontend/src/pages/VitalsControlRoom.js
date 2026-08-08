import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Zap, Heart, Activity, AlertTriangle, PhoneCall, MessageSquare, Send, CheckCircle, RefreshCw, UserCheck, Shield } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';

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
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    let timer;
    if (activeCallModal) {
      setCountdown(10);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoEscalateAll();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCallModal]);

  const handleAutoEscalateAll = async () => {
    if (!activeCallModal) return;
    try {
      if (selectedElderId) {
        await api.post('/alerts/manual-sos', { elderId: selectedElderId, notes: 'IVR 10-Second Demo Check-in Expired - Outbound Emergency Calls & SMS Dispatched to All Persons' });
      }
    } catch (err) {
      console.warn('Auto escalation info:', err.message);
    }
    setDispatchLog(prev => [
      {
        id: Date.now() + 1,
        type: 'call',
        title: `☎️ OUTBOUND TWILIO VOICE CALL & SMS TO SON / FAMILY`,
        recipient: '+91 98765 43210',
        script: `Emergency SOS Alert! Hello Son, elder ${activeCallModal.elderName} failed 10s check-in. Anomaly: ${activeCallModal.triggerValue}`,
        body: `CRITICAL ALERT [CircleBack]: ${activeCallModal.elderName} failed health check! Son notified via Voice Call & Twilio SMS.`,
        status: 'Ringing & Delivered (Son)',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: Date.now() + 2,
        type: 'volunteer',
        title: `🚑 OUTBOUND TWILIO VOICE CALL & SMS TO NEIGHBOUR / VOLUNTEERS`,
        recipient: 'Nearby Verified Neighbours & Responders (Within 5km)',
        body: `NEIGHBORHOOD SOS: Immediate check-in required for ${activeCallModal.elderName}!`,
        status: 'Dispatched (MongoDB $near 5km)',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: Date.now() + 3,
        type: 'call',
        title: `🩺 OUTBOUND TWILIO EMERGENCY CALL & SMS TO PRIMARY DOCTOR`,
        recipient: 'Dr. Anand Kumar (Cardiologist)',
        script: `Medical Emergency Alert: Patient ${activeCallModal.elderName} triggered health anomaly. Medical history summary sent.`,
        body: `MEDICAL ALERT: Patient ${activeCallModal.elderName} (Age 74) triggered emergency anomaly: ${activeCallModal.triggerValue}`,
        status: 'Dispatched to Primary Physician',
        timestamp: new Date().toLocaleTimeString()
      },
      {
        id: Date.now() + 4,
        type: 'sms',
        title: `🏥 OFFICIAL PARAMEDIC & AMBULANCE DISPATCH HOTLINE`,
        recipient: 'Emergency Medical Services (+91 8600475388)',
        body: `AMBULANCE DISPATCH: Elder ${activeCallModal.elderName}. GPS: https://maps.google.com/?q=28.6139,77.2090. Blood Group: B+.`,
        status: 'Dispatched to Paramedic Hotline',
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ]);
    setActiveCallModal(null);
  };

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

  // Preset Sensor Value Preset Mapping
  const applyPresetValues = (presetId) => {
    setSelectedPreset(presetId);
    switch (presetId) {
      case 'healthy':
        setHeartRate(72); setRestingHeartRate(58); setHeartRateSd(6); setSpo2Avg(98); setSpo2Min(96); setSkinTemp(33.6); setSteps(9500); setSleepHours(7.5); setSleepEfficiency(88);
        break;
      case 'cardiac':
        setHeartRate(118); setRestingHeartRate(96); setHeartRateSd(16); setSpo2Avg(97); setSpo2Min(95); setSkinTemp(33.7); setSteps(6000); setSleepHours(7.0); setSleepEfficiency(85);
        break;
      case 'respiratory':
        setHeartRate(78); setRestingHeartRate(64); setHeartRateSd(6); setSpo2Avg(89); setSpo2Min(87); setSkinTemp(33.8); setSteps(4200); setSleepHours(6.5); setSleepEfficiency(85);
        break;
      case 'fever':
        setHeartRate(105); setRestingHeartRate(90); setHeartRateSd(8); setSpo2Avg(95); setSpo2Min(93); setSkinTemp(36.8); setSteps(1800); setSleepHours(5.0); setSleepEfficiency(70);
        break;
      case 'stress':
        setHeartRate(85); setRestingHeartRate(72); setHeartRateSd(3); setSpo2Avg(96); setSpo2Min(94); setSkinTemp(34.0); setSteps(2500); setSleepHours(4.5); setSleepEfficiency(65);
        break;
      case 'metabolic':
        setHeartRate(82); setRestingHeartRate(75); setHeartRateSd(7); setSpo2Avg(97); setSpo2Min(95); setSkinTemp(33.8); setSteps(1800); setSleepHours(5.5); setSleepEfficiency(75);
        break;
      case 'worst_case':
        setHeartRate(128); setRestingHeartRate(98); setHeartRateSd(17); setSpo2Avg(88); setSpo2Min(85); setSkinTemp(37.4); setSteps(800); setSleepHours(4.0); setSleepEfficiency(60);
        break;
      default:
        break;
    }
  };

  // Real-time Dynamic Risk Calculation for Live Graph Fluctuation
  const calculateLiveRisks = () => {
    let c = 0.003, r = 0.008, f = 0.017, s = 0.027, m = 0.000;

    const hr = Number(heartRate);
    const rhr = Number(restingHeartRate);
    const hrv = Number(heartRateSd);
    const spo2a = Number(spo2Avg);
    const spo2m = Number(spo2Min);
    const temp = Number(skinTemp);
    const st = Number(steps);
    const sleep = Number(sleepHours);
    const eff = Number(sleepEfficiency);

    if (rhr > 78) c += (rhr - 78) * 0.035;
    if (hrv > 10) c += (hrv - 10) * 0.045;
    if (hr > 100) c += (hr - 100) * 0.015;
    if (hr < 50) c += (50 - hr) * 0.025;
    c = Math.min(0.98, Math.max(0.003, c));

    if (spo2m < 94) r += (94 - spo2m) * 0.085;
    if (spo2a < 96) r += (96 - spo2a) * 0.055;
    r = Math.min(0.98, Math.max(0.008, r));

    if (temp > 34.0) f += (temp - 34.0) * 0.28;
    if (rhr > 80) f += (rhr - 80) * 0.012;
    f = Math.min(0.98, Math.max(0.017, f));

    if (hrv < 5) s += (5 - hrv) * 0.16;
    if (sleep < 6) s += (6 - sleep) * 0.12;
    if (eff < 75) s += (75 - eff) * 0.008;
    s = Math.min(0.98, Math.max(0.027, s));

    if (st < 3000) m += (3000 - st) * 0.00024;
    if (sleep < 6.5) m += (6.5 - sleep) * 0.095;
    if (rhr > 72) m += (rhr - 72) * 0.008;
    m = Math.min(0.98, Math.max(0.001, m));

    return [
      { name: 'Cardiac', risk: Math.round(c * 100), color: c >= 0.70 ? '#ef4444' : c >= 0.40 ? '#f59e0b' : '#10b981' },
      { name: 'Respiratory', risk: Math.round(r * 100), color: r >= 0.70 ? '#ef4444' : r >= 0.40 ? '#f59e0b' : '#8b5cf6' },
      { name: 'Fever', risk: Math.round(f * 100), color: f >= 0.70 ? '#ef4444' : f >= 0.40 ? '#f59e0b' : '#e11d48' },
      { name: 'Stress', risk: Math.round(s * 100), color: s >= 0.70 ? '#ef4444' : s >= 0.40 ? '#f59e0b' : '#3b82f6' },
      { name: 'Metabolic', risk: Math.round(m * 100), color: m >= 0.70 ? '#ef4444' : m >= 0.40 ? '#f59e0b' : '#06b6d4' }
    ];
  };

  const liveRiskData = calculateLiveRisks();

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
        // Step 1: Elder Call
        newDispatches.push({
          id: Date.now() + 1,
          type: 'call',
          title: `☎️ OUTBOUND TWILIO IVR VOICE CALL TO ELDER (${elderName})`,
          recipient: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          script: `CircleBack Emergency Check-in. Hello ${elderName}, we detected a health anomaly (${anomalyReport.value}). Press 1 if safe, or press 2 for help.`,
          status: 'Ringing (10s Demo Window)',
          timestamp
        });

        // Step 2: Son / Family Member
        newDispatches.push({
          id: Date.now() + 2,
          type: 'call',
          title: `☎️ OUTBOUND TWILIO IVR VOICE CALL & SMS TO SON / FAMILY (${targetElder?.emergencyContacts[0]?.name || 'Son'})`,
          recipient: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          body: `EMERGENCY ALERT [CircleBack]: ${elderName} failed health check! Anomaly: ${anomalyReport.type} (${anomalyReport.value}). Address: ${targetElder?.address}. GPS: https://maps.google.com/?q=28.6139,77.2090`,
          status: 'Dispatched to Son / Family Member',
          timestamp
        });

        // Step 3: Neighbour / Community Volunteer
        newDispatches.push({
          id: Date.now() + 3,
          type: 'volunteer',
          title: `🚑 OUTBOUND TWILIO IVR CALL & SMS TO NEIGHBOUR / VOLUNTEERS`,
          recipient: 'Nearby Verified Neighbours & Responders (Within 5km radius)',
          body: `NEIGHBORHOOD SOS: Elderly resident ${elderName} at ${targetElder?.address} requires urgent neighbour check-in! Map: https://maps.google.com/?q=28.6139,77.2090`,
          status: 'Dispatched (MongoDB $near 5km)',
          timestamp
        });

        // Step 4: Primary Doctor
        newDispatches.push({
          id: Date.now() + 4,
          type: 'call',
          title: `🩺 OUTBOUND TWILIO EMERGENCY CALL & SMS TO PRIMARY DOCTOR`,
          recipient: 'Dr. Physician (+91 98765 12345)',
          script: `Medical Emergency Alert for Primary Doctor. Patient ${elderName} triggered critical health anomaly (${anomalyReport.value}). Medical history dispatched.`,
          status: 'Dispatched to Primary Physician',
          timestamp
        });

        // Step 5: Paramedics & Ambulance Hotline
        newDispatches.push({
          id: Date.now() + 5,
          type: 'sms',
          title: `🏥 OFFICIAL PARAMEDIC & AMBULANCE DISPATCH HOTLINE`,
          recipient: 'Emergency Medical Services (+91 8600475388)',
          body: `PARAMEDIC DISPATCH: Elder ${elderName}, Age ${targetElder?.age || 74}. Address: ${targetElder?.address}. GPS: https://maps.google.com/?q=28.6139,77.2090. Blood Group: B+.`,
          status: 'Dispatched to Paramedic Hotline',
          timestamp
        });

        // Trigger visual simulated call popup
        setActiveCallModal({
          elderName,
          phone: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          triggerValue: anomalyReport?.value || 'Critical Risk Spike',
          alertLogId: escalationLog?._id
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
      await api.post('/auth/seed-demo');
      alert('Demo Data & Savitri Devi profile seeded successfully!');
      fetchElders();
    } catch (err) {
      alert('Seeding error: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleTriggerManualSOS = async () => {
    if (!selectedElderId) {
      alert('Please select an elder profile first!');
      return;
    }
    const targetElder = elders.find(e => e._id === selectedElderId);
    const elderName = targetElder ? targetElder.name : 'Elder';
    try {
      const response = await api.post('/alerts/manual-sos', { elderId: selectedElderId, notes: 'Emergency SOS button clicked in Vitals Control Room' });
      setActiveCallModal({
        elderName,
        phone: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
        triggerValue: 'Manual SOS Emergency Triggered',
        alertLogId: response.data?.alertLog?._id
      });
      setDispatchLog(prev => [
        {
          id: Date.now() + 1,
          type: 'call',
          title: `☎️ OUTBOUND TWILIO IVR VOICE CALL TO ELDER (${elderName})`,
          recipient: targetElder?.emergencyContacts[0]?.phone || '+91 98765 43210',
          script: `CarePulse Emergency Check-in. Hello ${elderName}, manual SOS activated! Press 1 if safe, press 2 for help.`,
          status: 'Ringing / Waiting for digit response',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
    } catch (err) {
      alert('Error triggering SOS: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStopEmergencyAlert = async () => {
    try {
      if (activeCallModal?.alertLogId) {
        await api.patch(`/alerts/${activeCallModal.alertLogId}/resolve`, { note: 'Emergency alert stopped and marked safe by user' });
      } else if (selectedElderId) {
        const activeAlertsRes = await api.get(`/alerts/elder/${selectedElderId}`);
        const pendingAlerts = (activeAlertsRes.data || []).filter(a => a.finalStatus === 'pending');
        for (const a of pendingAlerts) {
          await api.patch(`/alerts/${a._id}/resolve`, { note: 'Emergency alert manually stopped & cancelled' });
        }
      }
      setDispatchLog(prev => [
        {
          id: Date.now(),
          type: 'normal',
          title: `🛑 EMERGENCY ALERT MANUALLY STOPPED & CANCELLED`,
          recipient: 'All Emergency Stakeholders',
          body: `Emergency alert stopped by user. Outbound calls canceled & elder status set to safe.`,
          status: 'Alert Halted & Resolved',
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ]);
      alert('Emergency alert stopped and marked safe successfully!');
      setActiveCallModal(null);
    } catch (err) {
      alert('Alert stopped.');
      setActiveCallModal(null);
    }
  };

  return (
    <div style={{ maxWidth: '1250px', margin: '1rem auto' }}>
      {/* HEADER BAR */}
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Zap color="var(--accent-cyan)" size={28} /> Vitals Control Room & Active Emergency Trigger Simulator
          </h1>
          <p className="page-subtitle">
            Manipulate 9 live band sensor sliders in real-time. Watch the disease risk graph fluctuate live and trigger active Twilio SMS/IVR dispatches.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button className="btn btn-danger" onClick={handleTriggerManualSOS} style={{ fontWeight: 800 }}>
            🚨 Trigger Emergency Call & SOS Alert
          </button>
          <button className="btn btn-secondary" onClick={handleStopEmergencyAlert} style={{ borderColor: '#ef4444', color: '#ef4444', fontWeight: 800 }}>
            🛑 Stop Active Alert
          </button>
          <button className="btn btn-secondary" onClick={handleSeedDemoData} style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            🌱 Seed Demo Data (Savitri Devi)
          </button>
        </div>
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

      {/* ACTIVE SMS & EMERGENCY ESCALATION STATUS BANNER */}
      <div className="glass-card" style={{
        marginBottom: '1.5rem',
        background: liveRiskData.some(d => d.risk >= 70) ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
        border: `1.5px solid ${liveRiskData.some(d => d.risk >= 70) ? '#ef4444' : '#10b981'}`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.25rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {liveRiskData.some(d => d.risk >= 70) ? (
            <AlertTriangle size={24} color="#ef4444" className="spin" />
          ) : (
            <CheckCircle size={24} color="#10b981" />
          )}
          <div>
            <h4 style={{ margin: 0, fontWeight: 800, color: liveRiskData.some(d => d.risk >= 70) ? '#991b1b' : '#065f46', fontSize: '1rem' }}>
              {liveRiskData.some(d => d.risk >= 70) ? '🚨 CRITICAL RISK SPIKE DETECTED — TWILIO EMERGENCY SMS & IVR DISPATCH ACTIVE' : '🟢 ACTIVE SAFETY MONITORING STATUS: SMS & ESCALATION PIPELINE READY'}
            </h4>
            <p style={{ margin: '2px 0 0', fontSize: '0.83rem', color: liveRiskData.some(d => d.risk >= 70) ? '#b91c1c' : '#047857' }}>
              {liveRiskData.some(d => d.risk >= 70) ? 'Automatic 3-step parallel escalation (Twilio Voice IVR + Family SMS + $near 5km Volunteer Dispatch) active!' : 'Continuous 15-minute smartwatch telemetry sync and real-time disease risk screening active.'}
            </p>
          </div>
        </div>

        <button
          className="btn btn-secondary"
          onClick={handleStopEmergencyAlert}
          style={{ background: '#ef4444', color: '#ffffff', fontWeight: 800, padding: '0.5rem 1rem', borderColor: '#b91c1c' }}
        >
          🛑 Stop Emergency Alert & Mark Safe
        </button>
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
          🔘 Instant Smartwatch Simulation Scenarios (Radio Cards):
        </h3>
        <div className="radio-card-grid">
          {[
            { id: 'healthy', title: '🟢 Healthy Baseline', desc: 'All Low Risk (0.3% Cardiac, 98% SpO2)' },
            { id: 'cardiac', title: '❤️ Cardiac Risk Pattern', desc: '94.4% Cardiac Spike (118 BPM, 16ms SD)' },
            { id: 'respiratory', title: '🫁 Respiratory Risk', desc: '79% Respiratory Spike (SpO2 drop to 87%)' },
            { id: 'fever', title: '🌡️ Fever / Infection', desc: '82.2% Fever Spike (Temp 36.8°C, HR 105)' },
            { id: 'stress', title: '🧠 Stress / Fatigue', desc: '87.3% Stress Spike (HRV 3ms, 4.5h Sleep)' },
            { id: 'metabolic', title: '🍏 Metabolic / Lifestyle', desc: '73.8% Metabolic Spike (1800 Steps)' },
            { id: 'worst_case', title: '🚨 Worst-Case Multi-Risk', desc: 'Multi-organ risk spike (128 BPM, 37.4°C)' }
          ].map(p => (
            <label key={p.id} className={`radio-card ${selectedPreset === p.id ? 'selected' : ''}`}>
              <input
                type="radio"
                name="presetScenarioRadio"
                value={p.id}
                checked={selectedPreset === p.id}
                onChange={() => {
                  applyPresetValues(p.id);
                  handleSimulateVitals(p.id);
                }}
              />
              <div className="radio-card-title">{p.title}</div>
              <div className="radio-card-desc">{p.desc}</div>
            </label>
          ))}
        </div>
      </div>

      {/* LIVE FLUCTUATING RISK GRAPH CARD */}
      <div className="glass-card" style={{ marginBottom: '1.5rem', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)', border: '1px solid #cbd5e1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              📈 Live Fluctuating Risk Screening Graph (Responds in Real-Time to Range Sliders)
            </h3>
            <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Slide any of the 9 telemetry range controls below to see instant risk probability fluctuations!
            </p>
          </div>
          {liveRiskData.some(d => d.risk >= 70) && (
            <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.8rem', fontWeight: 800, padding: '4px 10px', borderRadius: '20px', animation: 'pulse 1.5s infinite' }}>
              🚨 SPIKE DETECTED (&gt; 70%)
            </span>
          )}
        </div>

        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <BarChart data={liveRiskData}>
              <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '0.85rem', fontWeight: 700 }} />
              <YAxis domain={[0, 100]} stroke="#64748b" style={{ fontSize: '0.75rem' }} unit="%" />
              <Tooltip formatter={(value) => [`${value}% Probability`, 'Risk Level']} contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
              <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                {liveRiskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: CENTRALIZED 9-SENSOR RANGE CONTROLS GRID */}
      <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', textAlign: 'center', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Activity color="var(--primary)" /> Centralized 9-Sensor Telemetry Controls (Fluctuating Range Sliders)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          {/* 1. Heart Rate Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={16} color="#f43f5e" /> 1. Heart Rate
              </label>
              <span style={{ fontWeight: 800, color: heartRate > 95 || heartRate < 60 ? '#ef4444' : '#10b981', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>40 BPM (Low)</span>
              <span>65-95 (Normal)</span>
              <span>200 (Critical)</span>
            </div>
          </div>

          {/* 2. Resting Heart Rate Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                ❤️ 2. Resting HR
              </label>
              <span style={{ fontWeight: 800, color: restingHeartRate > 85 ? '#f59e0b' : '#0f172a', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>40 BPM</span>
              <span>55-75 (Baseline)</span>
              <span>120 BPM</span>
            </div>
          </div>

          {/* 3. Heart Rate SD (HRV) Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                📈 3. HR SD (Variability)
              </label>
              <span style={{ fontWeight: 800, color: heartRateSd < 4 || heartRateSd > 12 ? '#f59e0b' : '#0f172a', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>1 ms (Stress)</span>
              <span>5-10 (Normal)</span>
              <span>40 ms</span>
            </div>
          </div>

          {/* 4. SpO2 Avg Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                🫁 4. SpO2 Average
              </label>
              <span style={{ fontWeight: 800, color: spo2Avg < 94 ? '#ef4444' : '#10b981', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>70% (Hypoxia)</span>
              <span>95-100% (Healthy)</span>
              <span>100%</span>
            </div>
          </div>

          {/* 5. SpO2 Min Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                🩸 5. SpO2 Minimum
              </label>
              <span style={{ fontWeight: 800, color: spo2Min < 92 ? '#ef4444' : '#10b981', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>60% (Severe)</span>
              <span>92-100% (Normal)</span>
              <span>100%</span>
            </div>
          </div>

          {/* 6. Skin Temperature Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                🌡️ 6. Skin Temperature
              </label>
              <span style={{ fontWeight: 800, color: skinTemp > 36.2 ? '#ef4444' : '#0f172a', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>32.0°C</span>
              <span>33.4-34.5 (Normal)</span>
              <span>41.0°C (Fever)</span>
            </div>
          </div>

          {/* 7. Steps Today Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                👟 7. Steps Today
              </label>
              <span style={{ fontWeight: 800, color: '#06b6d4', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0 (Sedentary)</span>
              <span>5,000+ (Active)</span>
              <span>20,000</span>
            </div>
          </div>

          {/* 8. Sleep Hours Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                🌙 8. Sleep Duration
              </label>
              <span style={{ fontWeight: 800, color: sleepHours < 5.5 ? '#f59e0b' : '#0f172a', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>0 hrs</span>
              <span>7-9 hrs (Healthy)</span>
              <span>14 hrs</span>
            </div>
          </div>

          {/* 9. Sleep Efficiency Slider */}
          <div className="sensor-slider-card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0f172a' }}>
                ⚡ 9. Sleep Efficiency
              </label>
              <span style={{ fontWeight: 800, color: sleepEfficiency < 70 ? '#f59e0b' : '#10b981', fontSize: '1.15rem', fontFamily: 'var(--font-mono)' }}>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span>30% (Restless)</span>
              <span>85%+ (Restful)</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        <button
          className="btn btn-primary"
          disabled={loading}
          onClick={() => handleSimulateVitals(null)}
          style={{ width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: 800 }}
        >
          <Send size={18} style={{ display: 'inline', marginRight: '6px' }} /> Ingest Live Telemetry Stream ({heartRate} BPM, {spo2Avg}% SpO2, {skinTemp}°C)
        </button>
      </div>

      {/* SECTION 4: ACTIVE OUTBOUND EMERGENCY SMS & IVR DISPATCH LOG */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare color="var(--accent-cyan)" /> Active Outbound Communication & Emergency Dispatch Log
        </h3>

        {dispatchLog.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Send size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p>No outbound emergency dispatches logged yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Use the centralized range sliders above or select a preset scenario to trigger real-time Twilio SMS & parallel escalation dispatches!
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
          <div className="glass-card" style={{ maxWidth: '480px', width: '92%', textAlign: 'center', border: '2px solid #ef4444', boxShadow: '0 0 50px rgba(239,68,68,0.6)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }} className="spin">
              <PhoneCall size={32} style={{ margin: 'auto' }} />
            </div>

            <div style={{ background: '#ef4444', color: 'white', padding: '0.4rem 1rem', borderRadius: '20px', display: 'inline-block', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
              ⏳ DEMO AUTO-ESCALATION COUNTDOWN: 00:{countdown < 10 ? '0' + countdown : countdown}s
            </div>

            <h3 style={{ fontSize: '1.3rem', color: '#ef4444', fontWeight: 800 }}>STEP 1: TWILIO VOICE IVR CALL OUTBOUND</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', margin: '0.35rem 0 1rem' }}>
              Calling Elder: <strong>{activeCallModal.elderName}</strong> ({activeCallModal.phone})
            </p>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.85rem', borderRadius: '10px', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1rem', textAlign: 'left' }}>
              <p style={{ fontWeight: 700, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <PhoneCall size={14} /> Outbound Calls & SMS Dispatched in 10s Window to All Persons:
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: 1.5, fontStyle: 'italic', fontSize: '0.82rem' }}>
                <li>👨‍👦 <strong>Son / Family Member</strong>: Voice Call & SMS (+91 98765 43210)</li>
                <li>🏘️ <strong>Neighbour / Volunteer</strong>: Geospatial Call & SMS (+91 86004 75388)</li>
                <li>🩺 <strong>Primary Doctor</strong>: Physician Medical Alert (+91 98100 55443)</li>
                <li>🚑 <strong>Ambulance / Paramedic Hotline</strong>: Paramedic Dispatch (+91 86004 75388)</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1, borderColor: '#10b981', color: '#10b981', fontWeight: 800, fontSize: '0.85rem' }}
                onClick={async () => {
                  try {
                    if (activeCallModal?.alertLogId) {
                      await api.patch(`/alerts/${activeCallModal.alertLogId}/resolve`, { note: 'Elder pressed 1 on IVR call confirming safety.' });
                    }
                  } catch (err) {
                    console.warn('Alert resolve info:', err.message);
                  }
                  setDispatchLog(prev => [
                    {
                      id: Date.now(),
                      type: 'normal',
                      title: `✅ TWILIO IVR CALL RESOLVED — ELDER CONFIRMED SAFE`,
                      recipient: activeCallModal.phone,
                      body: `Elder ${activeCallModal.elderName} pressed 1 ("I am safe"). Alert marked safe & parallel escalation canceled.`,
                      status: 'Resolved & Cleared (Elder Safe)',
                      timestamp: new Date().toLocaleTimeString()
                    },
                    ...prev
                  ]);
                  alert('Elder pressed 1 ("I am safe"). Alert marked safe!');
                  setActiveCallModal(null);
                }}
              >
                Press 1 (Elder Safe)
              </button>
              <button
                className="btn btn-danger"
                style={{ flex: 1, fontWeight: 800, fontSize: '0.85rem' }}
                onClick={handleAutoEscalateAll}
              >
                Press 2 / Escalate All Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VitalsControlRoom;
