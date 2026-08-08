import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AlertLogItem from '../components/AlertLogItem';
import { UserCheck, Activity, Check, RefreshCw } from 'lucide-react';

const AdminPanel = () => {
  const [pendingVolunteers, setPendingVolunteers] = useState([]);
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAdminData = async () => {
    try {
      const [volRes, alertsRes] = await Promise.all([
        api.get('/volunteers/pending').catch(() => ({ data: [] })),
        api.get('/alerts/active').catch(() => ({ data: [] }))
      ]);

      setPendingVolunteers(volRes.data);
      setActiveAlerts(alertsRes.data);
    } catch (err) {
      console.error('Error fetching admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleApproveVolunteer = async (volunteerId) => {
    try {
      await api.patch(`/volunteers/${volunteerId}/verify`);
      fetchAdminData();
    } catch (err) {
      alert('Error approving volunteer: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}><RefreshCw className="spin" /> Loading Admin Operations Desk...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">CircleBack Platform Admin Control</h1>
          <p className="page-subtitle">System-Wide Health Monitoring Audit & Volunteer Verification Queue</p>
        </div>
      </div>

      {/* Volunteer Verification Approval Queue */}
      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <UserCheck color="var(--primary)" /> Volunteer Approval Queue ({pendingVolunteers.length})
        </h3>

        {pendingVolunteers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No unverified volunteer registrations pending review.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingVolunteers.map((vol) => (
              <div key={vol._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{vol.userId?.name || 'Applicant'}</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Email: {vol.userId?.email} • Phone: {vol.userId?.phone}
                  </p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Address: {vol.address}
                  </p>
                  {vol.idProofUrl && (
                    <a href={`http://localhost:5000${vol.idProofUrl}`} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>
                      📄 View Government ID Proof Document
                    </a>
                  )}
                </div>

                <button className="btn btn-primary" style={{ background: '#10b981' }} onClick={() => handleApproveVolunteer(vol._id)}>
                  <Check size={16} /> Approve & Verify
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* System Alert Audit Log */}
      <div className="glass-card">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity color="#ef4444" /> Live Active Alerts Audit ({activeAlerts.length})
        </h3>

        {activeAlerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No active emergency alerts in system currently.</p>
        ) : (
          <div>
            {activeAlerts.map((log) => (
              <AlertLogItem key={log._id} alertLog={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
