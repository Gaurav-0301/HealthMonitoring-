import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  X,
  AlertTriangle,
  FileText,
  Heart,
  User,
  Stethoscope,
  Pill,
  Clock,
  Printer,
  Copy,
  CheckCircle,
  Zap,
  RefreshCw
} from 'lucide-react';

const CheckupSummaryModal = ({ elderId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/vitals/${elderId}/checkup-summary`);
      setData(res.data);
    } catch (err) {
      console.error('Error loading checkup summary:', err);
      setError('Failed to fetch health checkup summary. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [elderId]);

  useEffect(() => {
    if (elderId) {
      fetchSummary();
    }
  }, [elderId, fetchSummary]);

  const handleCopy = () => {
    if (!data) return;
    const { elderProfile, spikedRisks, medicalHistory, latestReading } = data;
    const text = `
=== MEDICAL CHECKUP SUMMARY REPORT ===
Patient: ${elderProfile?.name} (Age: ${elderProfile?.age || 'N/A'})
Report Date: ${new Date().toLocaleString()}

-- HIGH RISK SPIKES DETECTED (> 0.70) --
${spikedRisks.length > 0
  ? spikedRisks.map(r => `• ${r.category}: ${(r.value * 100).toFixed(1)}% [${r.severity}] - Rec: ${r.recommendation}`).join('\n')
  : 'None'}

-- PRE-EXISTING MEDICAL HISTORY --
Blood Group: ${medicalHistory?.bloodGroup || 'Unknown'}
Conditions: ${medicalHistory?.conditions?.join(', ') || 'None listed'}
Medications: ${medicalHistory?.medications?.map(m => `${m.name} (${m.dosage})`).join(', ') || 'None listed'}
Allergies: ${medicalHistory?.allergies?.join(', ') || 'None listed'}
Doctor: ${medicalHistory?.doctorName || elderProfile?.doctorName || 'Not specified'} (${medicalHistory?.doctorContact || elderProfile?.doctorContact || 'N/A'})

-- LATEST TELEMETRY SENSOR VITALS --
Heart Rate: ${latestReading?.heartRate || 'N/A'} bpm (Resting HR: ${latestReading?.restingHeartRate || 'N/A'} bpm, SD: ${latestReading?.heartRateSd || 'N/A'} ms)
SpO2 Avg / Min: ${latestReading?.spo2Avg || 'N/A'}% / ${latestReading?.spo2Min || 'N/A'}%
Skin Temp: ${latestReading?.skinTemp || 'N/A'} °C
Steps Today: ${latestReading?.stepsToday || latestReading?.steps || 0}
Sleep: ${latestReading?.sleepHours || 'N/A'} hrs (Efficiency: ${latestReading?.sleepEfficiency || 'N/A'}%)

Generated via HealthMonitoring AI Screening & Escalation System.
`.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem'
    }}>
      <div className="glass-card modal-content" style={{
        background: '#ffffff',
        color: '#0f172a',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '90vh',
        overflowY: 'auto',
        borderRadius: '16px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        padding: '2rem',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: '#64748b'
          }}
        >
          <X size={20} />
        </button>

        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}>
            <RefreshCw className="spin" size={32} style={{ marginBottom: '1rem' }} />
            <h3 style={{ color: '#0f172a', fontSize: '1.1rem' }}>Generating Comprehensive Clinical Health Report...</h3>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginTop: '4px' }}>
              Aggregating Medical History, Vital Histories, and Alert Logs...
            </p>
          </div>
        ) : error ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
            <AlertTriangle size={36} style={{ marginBottom: '0.5rem' }} />
            <p>{error}</p>
            <button className="btn btn-secondary" onClick={fetchSummary} style={{ marginTop: '1rem' }}>
              Retry
            </button>
          </div>
        ) : data ? (
          <div>
            {/* Header */}
            <div style={{ borderBottom: '2px solid #e2e8f0', pb: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ background: '#ef4444', color: '#ffffff', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
                  <Stethoscope size={26} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                    Medical Checkup Consultation Report
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Synthesized from Smartwatch Telemetry, Medical History, & Safety Alert Records
                  </p>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginTop: '1rem',
                background: '#f8fafc',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.88rem'
              }}>
                <div>
                  <User size={15} style={{ display: 'inline', marginRight: '4px', color: '#3b82f6' }} />
                  Patient: <strong>{data.elderProfile?.name}</strong> ({data.elderProfile?.age || 'N/A'} yrs)
                </div>
                <div>
                  <Clock size={15} style={{ display: 'inline', marginRight: '4px', color: '#64748b' }} />
                  Generated: <strong>{new Date().toLocaleString()}</strong>
                </div>
                <div>
                  <Stethoscope size={15} style={{ display: 'inline', marginRight: '4px', color: '#10b981' }} />
                  Primary Physician: <strong>{data.elderProfile?.doctorName || data.medicalHistory?.doctorName || 'Not Assigned'}</strong>
                </div>
              </div>
            </div>

            {/* High Risk Spikes Warning Banner */}
            {data.spikedRisks && data.spikedRisks.length > 0 ? (
              <div style={{
                background: '#fef2f2',
                border: '2px solid #ef4444',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <AlertTriangle size={24} color="#ef4444" />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#991b1b', margin: 0 }}>
                    🚨 Critical Health Risk Spikes Detected (&gt; 70% Threshold)
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {data.spikedRisks.map((risk, idx) => (
                    <div key={idx} style={{
                      background: '#ffffff',
                      borderLeft: '4px solid #ef4444',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                        <span>{risk.category}</span>
                        <span style={{ color: '#dc2626' }}>{(risk.value * 100).toFixed(1)}% Probability</span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: '#475569', marginTop: '4px', margin: '4px 0 0' }}>
                        📋 <strong>Clinical Action Suggested:</strong> {risk.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '10px',
                padding: '1rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#166534'
              }}>
                <CheckCircle size={20} color="#16a34a" />
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                  No single risk probability currently exceeds the 70% critical spike threshold. Routine checkup summary generated below.
                </span>
              </div>
            )}

            {/* Grid 1: Medical History & Doctor Notes */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Medical History */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={18} color="#3b82f6" /> Medical History & Conditions
                </h4>
                <div style={{ fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Blood Group:</span>{' '}
                    <strong style={{ color: '#dc2626' }}>{data.medicalHistory?.bloodGroup || 'Unknown'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Pre-existing Conditions:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                      {data.medicalHistory?.conditions && data.medicalHistory.conditions.length > 0 ? (
                        data.medicalHistory.conditions.map((c, i) => (
                          <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.8rem' }}>
                            {c}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None documented</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Active Medications:</span>
                    <div style={{ marginTop: '4px' }}>
                      {data.medicalHistory?.medications && data.medicalHistory.medications.length > 0 ? (
                        data.medicalHistory.medications.map((m, i) => (
                          <div key={i} style={{ background: '#ffffff', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#0f172a' }}><Pill size={13} style={{ display: 'inline', marginRight: '4px', color: '#8b5cf6' }} />{m.name}</span>
                            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>{m.dosage}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ color: '#94a3b8' }}>None documented</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: 600 }}>Known Allergies:</span>{' '}
                    <span>{data.medicalHistory?.allergies?.join(', ') || 'None known'}</span>
                  </div>
                </div>
              </div>

              {/* Vitals Telemetry History */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart size={18} color="#ef4444" /> Smartwatch Telemetry Vitals
                </h4>

                {data.latestReading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Current HR / Resting</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{data.latestReading.heartRate} / {data.latestReading.restingHeartRate || '--'} BPM</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>HR SD (Variability)</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{data.latestReading.heartRateSd || '--'} ms</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>SpO2 Avg / Min</div>
                      <div style={{ fontWeight: 800, color: data.latestReading.spo2Min < 94 ? '#ef4444' : '#0f172a' }}>
                        {data.latestReading.spo2Avg || '--'}% / {data.latestReading.spo2Min || '--'}%
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Skin Temperature</div>
                      <div style={{ fontWeight: 800, color: data.latestReading.skinTemp > 36.2 ? '#ef4444' : '#0f172a' }}>
                        {data.latestReading.skinTemp || '--'} °C
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Steps Movement</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{data.latestReading.stepsToday || data.latestReading.steps || 0}</div>
                    </div>
                    <div style={{ background: '#ffffff', padding: '0.6rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <div style={{ color: '#64748b', fontSize: '0.75rem' }}>Sleep Duration & Eff</div>
                      <div style={{ fontWeight: 800, color: '#0f172a' }}>{data.latestReading.sleepHours || '--'}h / {data.latestReading.sleepEfficiency || '--'}%</div>
                    </div>
                  </div>
                ) : (
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>No vital readings recorded yet.</p>
                )}
              </div>
            </div>

            {/* Alert Logs & Escalation History */}
            <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={18} color="#f59e0b" /> Safety Alert Logs & Escalation History ({data.alertLogs?.length || 0})
              </h4>
              {data.alertLogs && data.alertLogs.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {data.alertLogs.map((log) => (
                    <div key={log._id} style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '0.82rem'
                    }}>
                      <div>
                        <strong style={{ color: '#0f172a' }}>{log.triggerType?.replace('_', ' ').toUpperCase()}:</strong> {log.triggerValue}
                        <span style={{ color: '#64748b', marginLeft: '8px' }}>
                          ({new Date(log.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})
                        </span>
                      </div>
                      <span style={{
                        background: log.finalStatus?.includes('resolved') ? '#dcfce7' : '#fee2e2',
                        color: log.finalStatus?.includes('resolved') ? '#166534' : '#991b1b',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700
                      }}>
                        {log.finalStatus}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>No critical safety alerts triggered.</p>
              )}
            </div>

            {/* Footer Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              pt: '1rem',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>
                💡 Note: This report provides AI-assisted screening summaries for healthcare provider review.
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleCopy}
                  className="btn btn-secondary"
                  style={{
                    background: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {copied ? <CheckCircle size={16} color="#10b981" /> : <Copy size={16} />}
                  {copied ? 'Copied Summary!' : 'Copy Summary'}
                </button>

                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.5rem 1.25rem',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Printer size={16} /> Print / Export Report
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CheckupSummaryModal;
