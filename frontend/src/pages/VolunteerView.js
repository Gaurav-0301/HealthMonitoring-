import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import AlertLogItem from '../components/AlertLogItem';
import api from '../services/api';
import { ShieldCheck, MapPin, AlertTriangle, CheckCircle2, RefreshCw, Power } from 'lucide-react';

const VolunteerView = () => {
  const { user } = useContext(AuthContext);
  const [volunteerProfile, setVolunteerProfile] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [connectedElders, setConnectedElders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');
  const [idFile, setIdFile] = useState(null);
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);

  const fetchVolunteerData = async () => {
    try {
      const [volRes, alertsRes, eldersRes] = await Promise.all([
        api.get('/volunteers/me').catch(() => null),
        api.get('/alerts/active'),
        api.get('/volunteers/my-connected-elders').catch(() => ({ data: [] }))
      ]);

      if (volRes && volRes.data) {
        setVolunteerProfile(volRes.data);
      }
      setActiveAlerts(alertsRes.data);
      setConnectedElders(eldersRes.data || []);
    } catch (err) {
      console.error('Error fetching volunteer data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVolunteerData();
    // Auto-poll active alerts and connected elders every 8 seconds
    const interval = setInterval(fetchVolunteerData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('address', address);
      formData.append('lat', '28.6139');
      formData.append('lng', '77.2090');
      if (idFile) formData.append('idProof', idFile);

      const res = await api.post('/volunteers/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setVolunteerProfile(res.data.volunteer);
      setRegistrationSubmitted(true);
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (newStatus) => {
    try {
      const res = await api.patch(`/volunteers/${volunteerProfile._id}/availability`, {
        availabilityStatus: newStatus
      });
      setVolunteerProfile(res.data.volunteer);
    } catch (err) {
      alert('Error updating status');
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/resolve`, { note: 'Resolved by nearby volunteer check-in.' });
      fetchVolunteerData();
    } catch (err) {
      alert('Error resolving alert');
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}><RefreshCw className="spin" /> Loading Volunteer Center...</div>;
  }

  // Not Registered as Volunteer yet
  if (!volunteerProfile) {
    return (
      <div style={{ maxWidth: '600px', margin: '2rem auto' }}>
        <div className="glass-card">
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <ShieldCheck size={40} color="var(--primary)" style={{ margin: '0 auto 0.5rem' }} />
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Join CircleBack Community Responders</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Receive nearby emergency notifications when elderly residents within 5km require urgent check-ins.
            </p>
          </div>

          <form onSubmit={handleRegister}>
            <div className="form-group">
              <label className="form-label">Your Base Address / Neighborhood</label>
              <textarea
                className="form-textarea"
                rows={2}
                required
                placeholder="e.g. Block C, Vasant Kunj, New Delhi"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Upload Government ID Proof (Aadhaar / Voter ID / Driving License)</label>
              <input
                type="file"
                className="form-input"
                required
                accept="image/*,.pdf"
                onChange={(e) => setIdFile(e.target.files[0])}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Submit Volunteer Application
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Volunteer Emergency Response Desk</h1>
          <p className="page-subtitle">Verified Local Volunteer • 5km Geospatial Emergency Coverage</p>
        </div>

        {/* Availability Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-card)', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid var(--bg-card-border)', flexWrap: 'wrap' }}>
          <Power size={18} color={volunteerProfile.availabilityStatus === 'available' ? '#10b981' : '#64748b'} />
          <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Status:</span>
          {['available', 'busy', 'offline'].map((st) => (
            <button
              key={st}
              className={`btn ${volunteerProfile.availabilityStatus === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.25rem 0.65rem', fontSize: '0.78rem', textTransform: 'capitalize' }}
              onClick={() => handleToggleAvailability(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Verification Warning */}
      {!volunteerProfile.verified && (
        <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', borderRadius: '10px', color: '#fbbf24', marginBottom: '2rem' }}>
          <strong>⏳ Verification Pending:</strong> Your ID proof is undergoing admin approval. Once verified by the platform admin, you will receive real-time geospatial alerts.
        </div>
      )}

      {/* Active Emergency Dispatch Desk */}
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertTriangle color="#ef4444" /> Nearby Active Emergency Alerts ({activeAlerts.length})
      </h3>

      {activeAlerts.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
          <h3>No Active Emergency Dispatches</h3>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            All elderly residents in your neighborhood are currently safe. Keep your status set to <strong>Available</strong> to receive instant alerts.
          </p>
        </div>
      ) : (
        <div>
          {activeAlerts.map((alertLog) => (
            <div key={alertLog._id} className="glass-card alert-banner-emergency" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ color: 'white', fontSize: '1.3rem' }}>
                    🚨 EMERGENCY CHECK-IN: {alertLog.elderProfileId?.name} (Age {alertLog.elderProfileId?.age})
                  </h3>
                  <p style={{ color: '#fca5a5', marginTop: '0.25rem' }}>
                    Address: <strong>{alertLog.elderProfileId?.address}</strong> ({alertLog.elderProfileId?.landmark || 'No landmark'})
                  </p>
                  <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginTop: '0.35rem' }}>
                    Anomaly: {alertLog.triggerType} ({alertLog.triggerValue})
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a
                    href={`https://www.google.com/maps?q=${alertLog.elderProfileId?.geoLocation?.lat || 28.6139},${alertLog.elderProfileId?.geoLocation?.lng || 77.2090}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary"
                  >
                    <MapPin size={16} /> Open GPS Navigation Map
                  </a>
                  <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={() => handleResolveAlert(alertLog._id)}>
                    I Am Responding / Mark Resolved
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                <AlertLogItem alertLog={alertLog} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connected Elderly Relatives & Neighbors Section */}
      <div style={{ marginTop: '2.5rem', borderTop: '1px solid var(--bg-card-border)', paddingTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-cyan)' }}>
          👵 Elderly Relatives & Neighbors Connected to Your Phone Number ({connectedElders.length})
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
          Residents who have registered your phone number as their trusted nearby neighbor, family contact, or emergency responder.
        </p>

        {connectedElders.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            No connected elders registered your phone number yet. When a family member or neighbor adds your phone number in their profile, they will appear here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {connectedElders.map((elder) => (
              <div key={elder._id} className="glass-card" style={{ border: elder.status === 'alert_triggered' ? '2px solid #ef4444' : '1px solid var(--bg-card-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800 }}>{elder.name}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {elder.age} yrs • {elder.gender} • {elder.landmark || elder.address}
                    </p>
                  </div>
                  <span className={`status-badge ${elder.status}`} style={{ fontSize: '0.75rem' }}>
                    {elder.status}
                  </span>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  <p style={{ color: '#0284c7', fontWeight: 700, marginBottom: '4px' }}>
                    🩺 Medical History & Conditions:
                  </p>
                  <p style={{ color: '#334155' }}>
                    <strong>Blood Group:</strong> {elder.medicalHistory?.bloodGroup || 'Unknown'}<br />
                    <strong>Conditions:</strong> {elder.medicalHistory?.conditions?.join(', ') || 'None listed'}<br />
                    <strong>Medications:</strong> {elder.medicalHistory?.medications?.map(m => `${m.name} (${m.dosage})`).join(', ') || 'None'}<br />
                    <strong>Doctor:</strong> {elder.medicalHistory?.doctorName ? `${elder.medicalHistory.doctorName} (${elder.medicalHistory.doctorContact})` : 'N/A'}
                  </p>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  <strong>Emergency Contacts:</strong> {elder.emergencyContacts?.map(c => `${c.name} (${c.relation}): ${c.phone}`).join(' • ')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerView;
