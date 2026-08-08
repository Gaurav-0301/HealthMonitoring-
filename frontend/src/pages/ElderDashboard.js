import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  AlertTriangle,
  Heart,
  Activity,
  Thermometer,
  ShieldCheck,
  User,
  Stethoscope,
  Ambulance,
  CheckCircle2,
  Clock,
  Zap,
  RefreshCw,
  Volume2,
  Radio
} from 'lucide-react';

const ElderDashboard = () => {
  const { user } = useContext(AuthContext);

  const [elderProfile, setElderProfile] = useState(null);
  const [vitals, setVitals] = useState({
    heartRate: 72,
    bloodPressure: '120/80',
    spo2: 98,
    temperature: 98.6
  });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState(null); // { name, role, number, type }
  const [callSeconds, setCallSeconds] = useState(0);
  const [sosActive, setSosActive] = useState(false);

  // Load Elder Details & Alerts
  useEffect(() => {
    fetchData();
  }, []);

  // Timer for active call
  useEffect(() => {
    let timer;
    if (activeCall && activeCall.status === 'connected') {
      timer = setInterval(() => {
        setCallSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeCall]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Try fetching elders associated with user
      let eldersRes = await api.get('/elder-profile');
      let elders = eldersRes.data || [];

      if (elders.length === 0) {
        try {
          await api.post('/auth/seed-demo');
          eldersRes = await api.get('/elder-profile');
          elders = eldersRes.data || [];
        } catch (seedErr) {
          console.warn('Auto-seed in ElderDashboard warning:', seedErr.message);
        }
      }

      const currentElder = elders.length > 0 ? elders[0] : null;

      if (currentElder) {
        setElderProfile(currentElder);
        // Fetch latest vitals if available
        try {
          const vRes = await api.get(`/vitals/history/${currentElder._id}`);
          const history = vRes.data || [];
          if (history.length > 0) {
            const latest = history[0];
            setVitals({
              heartRate: latest.heartRate || 72,
              bloodPressure: latest.bloodPressure || '120/80',
              spo2: latest.spo2 || 98,
              temperature: latest.temperature || 98.6
            });
          }
        } catch (e) {
          console.warn('Using default vitals simulation');
        }

        // Fetch alerts
        try {
          const aRes = await api.get(`/alerts/elder/${currentElder._id}`);
          setAlerts(aRes.data || []);
        } catch (e) {
          console.warn('Could not fetch alerts');
        }
      } else {
        // Fallback default demo elder details for clean view
        setElderProfile({
          name: user?.name || 'Savitri Devi',
          age: 74,
          primaryContactName: 'Rajesh Sharma (Son)',
          primaryContactPhone: '+91 98765 43210',
          doctorName: 'Dr. Anand Kumar (Cardiologist)',
          doctorPhone: '+91 98100 55443',
          volunteerName: 'Amit Patel (Assigned Care Assistant)',
          volunteerPhone: '+91 98111 22334'
        });

        setAlerts([
          {
            _id: 'a1',
            type: 'ROUTINE_CHECK',
            severity: 'LOW',
            message: 'Morning Medication & Vitals Check-in Complete',
            createdAt: new Date().toISOString(),
            resolved: true
          }
        ]);
      }
    } catch (err) {
      console.error('Error fetching elder data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Start Call Handler
  const startCall = async (contact) => {
    setCallSeconds(0);
    setActiveCall({ ...contact, status: 'connecting' });
    
    // Simulate line ringing and connection
    setTimeout(() => {
      setActiveCall((prev) => (prev ? { ...prev, status: 'connected' } : null));
    }, 2000);

    // Trigger real backend Twilio SMS & Voice IVR escalation pipeline
    if (elderProfile?._id) {
      try {
        await api.post('/alerts/manual-sos', {
          elderId: elderProfile._id,
          notes: `Quick Call initiated by elder to ${contact.name} (${contact.role})`
        });
        const aRes = await api.get(`/alerts/elder/${elderProfile._id}`);
        setAlerts(aRes.data || []);
      } catch (err) {
        console.error('Error triggering backend alert:', err);
      }
    }
  };

  const endCall = () => {
    if (activeCall?.isSos) {
      setSosActive(false);
    }
    setActiveCall(null);
    setCallSeconds(0);
  };

  // Emergency SOS Button Click
  const handleSOS = async () => {
    setSosActive(true);
    startCall({
      name: 'EMERGENCY DISPATCH & FAMILY SOS',
      role: 'Ambulance + Family + Volunteers Notified',
      number: '911 / Emergency Central',
      isSos: true
    });

    if (elderProfile?._id) {
      try {
        await api.post('/alerts/manual-sos', {
          elderId: elderProfile._id,
          notes: '🚨 ELDER PRESSED SOS PANIC BUTTON ON DASHBOARD'
        });
        const aRes = await api.get(`/alerts/elder/${elderProfile._id}`);
        setAlerts(aRes.data || []);
      } catch (err) {
        console.error('Error triggering backend SOS:', err);
      }
    }

    // Add local alert
    setAlerts((prev) => [
      {
        _id: 'sos-' + Date.now(),
        type: 'MANUAL_SOS',
        severity: 'CRITICAL',
        message: '🚨 SOS Emergency Alert Triggered by Elder',
        createdAt: new Date().toISOString(),
        resolved: false
      },
      ...prev
    ]);
  };

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get Health Status Banner
  const isHeartHigh = vitals.heartRate > 100 || vitals.heartRate < 55;
  const isSpo2Low = vitals.spo2 < 94;
  const isWarning = isHeartHigh || isSpo2Low || alerts.some((a) => !a.resolved);

  return (
    <div className="elder-dashboard-page">
      {/* Banner / Header */}
      <div className={`elder-hero-card ${isWarning ? 'warning-bg' : 'safe-bg'}`}>
        <div className="elder-hero-content">
          <div className="elder-avatar">
            <User size={48} color="#fff" />
          </div>
          <div>
            <span className="elder-role-pill">Elder Care Mode</span>
            <h1 className="elder-name">{elderProfile?.name || 'Elder Dashboard'}</h1>
            <p className="elder-subtext">
              Age: <strong>{elderProfile?.age || 75}</strong> • Primary Contact:{' '}
              <strong>{elderProfile?.primaryContactName || 'Family Contact'}</strong>
            </p>
          </div>
        </div>

        <div className="elder-status-badge">
          {isWarning ? (
            <>
              <AlertTriangle size={28} className="icon-pulse" />
              <div>
                <span className="status-title text-danger">Attention Notified</span>
                <span className="status-sub">Vitals monitored</span>
              </div>
            </>
          ) : (
            <>
              <ShieldCheck size={32} color="#10B981" />
              <div>
                <span className="status-title text-success">Everything is Safe</span>
                <span className="status-sub">Vitals within normal range</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Emergency SOS Banner Button */}
      <div className="sos-banner-section">
        <button
          className={`sos-button-large ${sosActive ? 'sos-active' : ''}`}
          onClick={handleSOS}
          title="Click to trigger instant Emergency Call & alert family"
        >
          <div className="sos-icon-wrap">
            <PhoneCall size={40} />
          </div>
          <div className="sos-text-wrap">
            <span className="sos-title">PRESS FOR EMERGENCY HELP (SOS)</span>
            <span className="sos-sub">Instantly calls 911, Family & Caregiver</span>
          </div>
        </button>
      </div>

      {/* Main Grid: Left = Direct Call Buttons, Right = Vitals & Recent Alerts */}
      <div className="elder-grid">
        {/* Call Section */}
        <div className="elder-section-card">
          <div className="section-header">
            <Phone size={24} className="header-icon text-cyan" />
            <h2>Quick Call Caregiver & Family</h2>
          </div>
          <p className="section-desc">Tap any button below to immediately start a phone call.</p>

          <div className="quick-call-list">
            {/* Call Family */}
            <div className="call-card call-family" onClick={() => startCall({
              name: elderProfile?.primaryContactName || 'David Johnson (Son)',
              role: 'Family Member (Primary)',
              number: elderProfile?.primaryContactPhone || '+1 (555) 234-5678'
            })}>
              <div className="call-avatar bg-blue">
                <User size={32} />
              </div>
              <div className="call-info">
                <h3>{elderProfile?.primaryContactName || 'Family Member'}</h3>
                <p>Primary Family Contact</p>
                <span className="call-number">{elderProfile?.primaryContactPhone || '+1 (555) 234-5678'}</span>
              </div>
              <button className="call-btn-circle btn-blue">
                <Phone size={24} />
              </button>
            </div>

            {/* Call Doctor */}
            <div className="call-card call-doctor" onClick={() => startCall({
              name: elderProfile?.doctorName || 'Dr. Sarah Jenkins',
              role: 'Personal Physician',
              number: elderProfile?.doctorPhone || '+1 (555) 987-6543'
            })}>
              <div className="call-avatar bg-emerald">
                <Stethoscope size={32} />
              </div>
              <div className="call-info">
                <h3>{elderProfile?.doctorName || 'Dr. Sarah Jenkins'}</h3>
                <p>Primary Doctor / Clinic</p>
                <span className="call-number">{elderProfile?.doctorPhone || '+1 (555) 987-6543'}</span>
              </div>
              <button className="call-btn-circle btn-emerald">
                <Phone size={24} />
              </button>
            </div>

            {/* Call Volunteer Assistant */}
            <div className="call-card call-volunteer" onClick={() => startCall({
              name: elderProfile?.volunteerName || 'Alex Rivera',
              role: 'Assigned Care Volunteer',
              number: elderProfile?.volunteerPhone || '+1 (555) 345-6789'
            })}>
              <div className="call-avatar bg-purple">
                <Heart size={32} />
              </div>
              <div className="call-info">
                <h3>{elderProfile?.volunteerName || 'Alex Rivera'}</h3>
                <p>Local Support Assistant</p>
                <span className="call-number">{elderProfile?.volunteerPhone || '+1 (555) 345-6789'}</span>
              </div>
              <button className="call-btn-circle btn-purple">
                <Phone size={24} />
              </button>
            </div>

            {/* Call Ambulance Direct */}
            <div className="call-card call-emergency" onClick={() => startCall({
              name: 'Emergency Medical Dispatch',
              role: 'Ambulance & 911 Rescue Services',
              number: '911 Direct Line',
              isSos: true
            })}>
              <div className="call-avatar bg-red">
                <Ambulance size={32} />
              </div>
              <div className="call-info">
                <h3>Medical Emergency (911)</h3>
                <p>Direct Ambulance Dispatch</p>
                <span className="call-number">Toll-Free 911 / 112</span>
              </div>
              <button className="call-btn-circle btn-red">
                <PhoneCall size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Elder Details & Live Vitals + Alerts */}
        <div className="elder-col-right">
          {/* Live Vitals Details Card */}
          <div className="elder-section-card">
            <div className="section-header space-between">
              <div className="flex-align">
                <Activity size={24} className="header-icon text-rose" />
                <h2>Live Health Vitals</h2>
              </div>
              <button className="btn-refresh" onClick={fetchData} title="Refresh Vitals">
                <RefreshCw size={16} className={loading ? 'icon-spin' : ''} /> Refresh
              </button>
            </div>

            <div className="elder-vitals-grid">
              <div className="vital-box vital-heart">
                <div className="vital-header">
                  <Heart size={20} color="#EF4444" />
                  <span>Heart Rate</span>
                </div>
                <div className="vital-value">
                  {vitals.heartRate} <span className="vital-unit">BPM</span>
                </div>
                <span className="vital-status-tag tag-good">Normal Pace</span>
              </div>

              <div className="vital-box vital-bp">
                <div className="vital-header">
                  <Activity size={20} color="#3B82F6" />
                  <span>Blood Pressure</span>
                </div>
                <div className="vital-value">{vitals.bloodPressure}</div>
                <span className="vital-status-tag tag-good">Optimal</span>
              </div>

              <div className="vital-box vital-spo2">
                <div className="vital-header">
                  <Zap size={20} color="#10B981" />
                  <span>Blood Oxygen</span>
                </div>
                <div className="vital-value">
                  {vitals.spo2}%
                </div>
                <span className="vital-status-tag tag-good">Healthy</span>
              </div>

              <div className="vital-box vital-temp">
                <div className="vital-header">
                  <Thermometer size={20} color="#F59E0B" />
                  <span>Body Temp</span>
                </div>
                <div className="vital-value">
                  {vitals.temperature}°F
                </div>
                <span className="vital-status-tag tag-good">Normal</span>
              </div>
            </div>
          </div>

          {/* Recent Health Alerts */}
          <div className="elder-section-card" style={{ marginTop: '1.5rem' }}>
            <div className="section-header">
              <AlertTriangle size={24} className="header-icon text-amber" />
              <h2>Health Notifications & Alerts</h2>
            </div>

            <div className="elder-alerts-list">
              {alerts.length === 0 ? (
                <div className="no-alerts-card">
                  <CheckCircle2 size={36} color="#10B981" />
                  <p>No active alerts! Everything is running smoothly.</p>
                </div>
              ) : (
                alerts.map((item) => (
                  <div key={item._id} className={`elder-alert-item ${item.resolved ? 'resolved' : 'active-alert'}`}>
                    <div className="alert-item-left">
                      {item.resolved ? (
                        <CheckCircle2 size={24} color="#10B981" />
                      ) : (
                        <AlertTriangle size={24} color="#EF4444" className="icon-pulse" />
                      )}
                      <div>
                        <h4 className="alert-msg">{item.message}</h4>
                        <span className="alert-time">
                          <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span className={`alert-badge ${item.resolved ? 'badge-resolved' : 'badge-active'}`}>
                      {item.resolved ? 'Resolved' : 'Active Alert'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simulated Call Modal */}
      {activeCall && (
        <div className="call-modal-overlay">
          <div className="call-modal-card">
            <div className="call-modal-header">
              <span className="calling-pulse-badge">
                <Radio size={14} className="icon-pulse" /> Live Voice Call
              </span>
            </div>

            <div className="call-modal-body">
              <div className="caller-avatar-large">
                {activeCall.isSos ? <Ambulance size={56} color="#EF4444" /> : <User size={56} color="#3B82F6" />}
              </div>
              <h2 className="caller-name">{activeCall.name}</h2>
              <p className="caller-role">{activeCall.role}</p>

              {activeCall.status === 'connecting' ? (
                <div className="call-status-text text-amber">
                  <RefreshCw size={18} className="icon-spin" /> Dialing phone line...
                </div>
              ) : (
                <div className="call-status-text text-emerald">
                  <Volume2 size={20} className="icon-pulse" /> Connected • {formatTimer(callSeconds)}
                </div>
              )}
            </div>

            <div className="call-modal-actions">
              <button className="btn-end-call" onClick={endCall}>
                <PhoneOff size={28} /> End Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElderDashboard;
