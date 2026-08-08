import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import ElderCard from '../components/ElderCard';
import AlertLogItem from '../components/AlertLogItem';
import VitalsSimulator from '../components/VitalsSimulator';
import MedicalHistoryForm from '../components/MedicalHistoryForm';
import EditElderModal from '../components/EditElderModal';
import api from '../services/api';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  ReferenceArea
} from 'recharts';
import { Plus, Activity, Heart, AlertTriangle, RefreshCw, FileText, Zap } from 'lucide-react';

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [elders, setElders] = useState([]);
  const [selectedElder, setSelectedElder] = useState(null);
  const [editingElder, setEditingElder] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('vitals'); // 'vitals' | 'medical' | 'alerts'

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/elder-profile');
      setElders(res.data);
      if (res.data.length > 0 && !selectedElder) {
        setSelectedElder(res.data[0]);
      }
    } catch (err) {
      console.error('Error fetching elders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchElderVitalsAndAlerts = async (elderId) => {
    try {
      const [vitalsRes, alertsRes] = await Promise.all([
        api.get(`/vitals/${elderId}/history?limit=25`),
        api.get(`/alerts/elder/${elderId}`)
      ]);
      
      // Format timestamp for chart
      const formattedVitals = vitalsRes.data.map(item => ({
        ...item,
        timeLabel: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setVitalsHistory(formattedVitals);
      setAlerts(alertsRes.data);
    } catch (err) {
      console.error('Error fetching elder vitals/alerts', err);
    }
  };

  useEffect(() => {
    if (selectedElder) {
      fetchElderVitalsAndAlerts(selectedElder._id);
      const interval = setInterval(() => fetchElderVitalsAndAlerts(selectedElder._id), 8000);
      return () => clearInterval(interval);
    }
  }, [selectedElder]);

  const handleSelectElder = (elder) => {
    setSelectedElder(elder);
  };

  const handleTriggerSOS = async (elderId) => {
    if (!window.confirm('Are you sure you want to activate EMERGENCY SOS? This will initiate parallel family + volunteer + paramedic escalation!')) {
      return;
    }
    try {
      await api.post('/alerts/manual-sos', { elderId, notes: 'Emergency SOS activated from family dashboard' });
      fetchDashboardData();
      if (selectedElder) fetchElderVitalsAndAlerts(selectedElder._id);
    } catch (err) {
      alert('Failed to trigger SOS: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await api.patch(`/alerts/${alertId}/resolve`, { note: 'Resolved via family dashboard' });
      fetchDashboardData();
      if (selectedElder) fetchElderVitalsAndAlerts(selectedElder._id);
    } catch (err) {
      alert('Error resolving alert');
    }
  };

  const activeAlertCount = elders.filter(e => e.status === 'alert_triggered').length;

  return (
    <div>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Family Health Dashboard</h1>
          <p className="page-subtitle">
            Welcome back, {user?.name} • Passive Fitness Band Monitoring & Emergency Escalation
          </p>
        </div>
        <Link to="/onboarding" className="btn btn-primary">
          <Plus size={18} /> Link New Elder Profile
        </Link>
      </div>

      {/* Subscription Warning / Upgrade Banner for Free Tier */}
      {user?.subscriptionTier === 'free' && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(180,83,9,0.15))',
          border: '1px solid #f59e0b',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <div>
            <h4 style={{ color: '#fbbf24', fontSize: '1rem', fontWeight: 700 }}>
              ⚠️ Free Subscription Tier Active (Manual SOS Only)
            </h4>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Automatic continuous 15-minute Google Fit / Apple HealthKit band sync & heart rate anomaly detection is disabled on Free plan. Upgrade to <strong>Family Care</strong> for automatic monitoring.
            </p>
          </div>
          <Link to="/billing" className="btn btn-primary" style={{ background: '#f59e0b', color: '#000', fontWeight: 700 }}>
            Upgrade Plan
          </Link>
        </div>
      )}

      {/* Emergency Active Alert Banner */}
      {activeAlertCount > 0 && (
        <div className="alert-banner-emergency">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} color="#ef4444" className="spin" />
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fca5a5' }}>
                CRITICAL HEALTH ALERT ACTIVATED ({activeAlertCount} Elder Profile)
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'white' }}>
                Parallel escalation pipeline active. Check alert logs below for live step-by-step progress.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Elders Cards List */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Heart size={20} color="var(--primary)" /> Monitored Elderly Relatives ({elders.length})
        </h3>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <RefreshCw className="spin" size={24} /> Loading profiles...
          </div>
        ) : elders.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h3>No Elder Profiles Linked Yet</h3>
            <p style={{ color: 'var(--text-secondary)', margin: '0.5rem 0 1.5rem' }}>
              Add your elderly parent or relative living alone to begin passive fitness band monitoring.
            </p>
            <Link to="/onboarding" className="btn btn-primary">
              <Plus size={18} /> Add Elder Profile
            </Link>
          </div>
        ) : (
          <div className="elder-grid">
            {elders.map(elder => (
              <ElderCard
                key={elder._id}
                elder={elder}
                onSelect={handleSelectElder}
                onTriggerSOS={handleTriggerSOS}
                onEdit={(elderToEdit) => setEditingElder(elderToEdit)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Edit Elder Profile & Categorized Contacts Modal */}
      {editingElder && (
        <EditElderModal
          elder={editingElder}
          onClose={() => setEditingElder(null)}
          onUpdated={(updatedElder) => {
            fetchDashboardData();
            if (selectedElder && selectedElder._id === updatedElder._id) {
              setSelectedElder(updatedElder);
            }
          }}
        />
      )}

      {/* Selected Elder Vitals & Analytics Section */}
      {selectedElder && (
        <div>
          {/* Simulator Toolbar Widget */}
          <VitalsSimulator
            selectedElderId={selectedElder._id}
            onSimulationComplete={() => {
              fetchDashboardData();
              fetchElderVitalsAndAlerts(selectedElder._id);
            }}
          />

          <div className="glass-card" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
                  Vitals & Monitoring Summary: {selectedElder.name}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Baseline HR Range: <strong>{selectedElder.baselineHeartRateMin} - {selectedElder.baselineHeartRateMax} bpm</strong> • Calibration: {selectedElder.calibrationComplete ? 'Complete (7-day SD calculated)' : 'Collecting initial dataset'}
                </p>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '10px', flexWrap: 'wrap' }}>
                <button
                  className={`btn ${activeTab === 'vitals' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  onClick={() => setActiveTab('vitals')}
                >
                  <Activity size={15} /> Vitals Graph
                </button>
                <button
                  className={`btn ${activeTab === 'control' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', color: activeTab === 'control' ? '#ffffff' : 'var(--accent-cyan)' }}
                  onClick={() => setActiveTab('control')}
                >
                  <Zap size={15} /> Vitals Control Room
                </button>
                <button
                  className={`btn ${activeTab === 'medical' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  onClick={() => setActiveTab('medical')}
                >
                  <FileText size={15} /> Medical History
                </button>
                <button
                  className={`btn ${activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
                  onClick={() => setActiveTab('alerts')}
                >
                  <AlertTriangle size={15} /> Alert History ({alerts.length})
                </button>
              </div>
            </div>

            {/* TAB: CONTROL ROOM */}
            {activeTab === 'control' && (
              <div style={{ padding: '1rem', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '12px', border: '1px solid var(--bg-card-border)' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--accent-cyan)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap size={20} /> Vitals Simulation & Live Anomaly Control Room
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                  Use the quick simulation buttons below to test real-time Google Fit / smartwatch vitals ingestion, simulate heart rate anomalies, trigger fall alerts, or force a sync cycle for <strong>{selectedElder.name}</strong>.
                </p>
                <VitalsSimulator
                  selectedElderId={selectedElder._id}
                  onSimulationComplete={() => {
                    fetchDashboardData();
                    fetchElderVitalsAndAlerts(selectedElder._id);
                  }}
                />
              </div>
            )}

            {/* TAB 1: VITALS CHARTS */}
            {activeTab === 'vitals' && (
              <div>
                {vitalsHistory.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No vitals history recorded yet. Use the Vitals Simulation Toolbar above to generate demo readings!
                  </div>
                ) : (
                  <div>
                    {/* ML Health Risk Screening & Smartwatch Vitals Panels */}
                    {vitalsHistory.length > 0 && (() => {
                      const latestReading = vitalsHistory[vitalsHistory.length - 1];
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                          {/* Risk Screening Card */}
                          <div className="glass-card" style={{ borderLeft: '5px solid var(--primary)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)' }}>
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                              🛡️ ML Health Risk Screening Report
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                              {[
                                { name: 'Cardiac Risk', val: latestReading.cardiacRisk, color: '#f43f5e' },
                                { name: 'Respiratory Risk', val: latestReading.respiratoryRisk, color: '#8b5cf6' },
                                { name: 'Fever / Infection Risk', val: latestReading.feverRisk, color: '#e11d48' },
                                { name: 'Stress / Fatigue Risk', val: latestReading.stressRisk, color: '#fbbf24' },
                                { name: 'Metabolic / Lifestyle Risk', val: latestReading.metabolicRisk, color: '#10b981' }
                              ].map((risk, index) => {
                                const percentage = Math.round((risk.val || 0) * 100);
                                let badgeText = 'Low Risk';
                                let badgeColor = '#10b981';
                                if ((risk.val || 0) >= 0.70) {
                                  badgeText = 'High Risk';
                                  badgeColor = '#ef4444';
                                } else if ((risk.val || 0) >= 0.40) {
                                  badgeText = 'Elevated Risk';
                                  badgeColor = '#f59e0b';
                                }

                                return (
                                  <div key={index}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{risk.name}</span>
                                      <span style={{ color: badgeColor, fontWeight: 800 }}>{percentage}% ({badgeText})</span>
                                    </div>
                                    <div style={{ width: '100%', height: '8px', background: '#cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${percentage}%`, height: '100%', background: risk.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '1.25rem', fontStyle: 'italic' }}>
                              Predictions calculated in real-time from active band telemetry via disease-predictor screening API.
                            </p>
                          </div>

                          {/* Latest Vitals Sensor Grid */}
                          <div className="glass-card">
                            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              ⌚ Smartwatch Sensor Data (Vitals)
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Heart Rate / Resting</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.heartRate} / {latestReading.restingHeartRate || '--'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>BPM</span>
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HR Variability (SD)</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.heartRateSd || '--'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>ms</span>
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SpO2 Avg / Min</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.spo2Avg || '--'}% / {latestReading.spo2Min || '--'}%
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Skin Temperature</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.skinTemp || '--'} <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>°C</span>
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Steps Today</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.stepsToday || latestReading.steps || 0}
                                </div>
                              </div>
                              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sleep Duration & Eff</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                                  {latestReading.sleepHours || '--'}h / {latestReading.sleepEfficiency || '--'}%
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Historical Trends Charts */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                      {/* Heart Rate BPM Chart */}
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Heart size={18} /> Heart Rate BPM Trend (Last Readings)
                        </h4>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <LineChart data={vitalsHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="timeLabel" stroke="#64748b" style={{ fontSize: '0.75rem' }} />
                              <YAxis domain={[40, 160]} stroke="#64748b" style={{ fontSize: '0.75rem' }} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                              <ReferenceArea y1={selectedElder.baselineHeartRateMin || 60} y2={selectedElder.baselineHeartRateMax || 100} fill="rgba(16, 185, 129, 0.08)" stroke="none" />
                              <Line type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e' }} activeDot={{ r: 7 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Step Movement Activity Chart */}
                      <div>
                        <h4 style={{ fontSize: '1rem', marginBottom: '1rem', color: '#06b6d4', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Activity size={18} /> Step Count Activity Movement
                        </h4>
                        <div style={{ width: '100%', height: 260 }}>
                          <ResponsiveContainer>
                            <BarChart data={vitalsHistory}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                              <XAxis dataKey="timeLabel" stroke="#64748b" style={{ fontSize: '0.75rem' }} />
                              <YAxis stroke="#64748b" style={{ fontSize: '0.75rem' }} />
                              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }} />
                              <Bar dataKey="steps" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: MEDICAL HISTORY FORM */}
            {activeTab === 'medical' && (
              <MedicalHistoryForm
                elderId={selectedElder._id}
                onSaved={() => fetchDashboardData()}
              />
            )}

            {/* TAB 3: ALERT LOGS */}
            {activeTab === 'alerts' && (
              <div>
                {alerts.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No safety alerts triggered for {selectedElder.name}. System operating normally.
                  </div>
                ) : (
                  <div>
                    {alerts.map(log => (
                      <AlertLogItem
                        key={log._id}
                        alertLog={log}
                        onResolve={handleResolveAlert}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
