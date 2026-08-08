import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, FileCheck } from 'lucide-react';
import api from '../services/api';

const COMMON_CONDITIONS = [
  'Hypertension (High BP)',
  'Diabetes Mellitus (Type 2)',
  'Coronary Artery Disease',
  'Asthma / COPD',
  'Arthritis',
  'Dementia / Alzheimer’s',
  'Osteoporosis',
  'Thyroid Disorder'
];

const COMMON_ALLERGIES = [
  'Penicillin / Amoxicillin',
  'Sulfa Drugs',
  'Aspirin / NSAIDs',
  'Latex',
  'Peanuts',
  'Dust / Mold'
];

const MedicalHistoryForm = ({ elderId, onSaved }) => {
  const [conditions, setConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [doctorName, setDoctorName] = useState('');
  const [doctorContact, setDoctorContact] = useState('');
  const [medications, setMedications] = useState([{ name: '', dosage: '' }]);
  const [files, setFiles] = useState([]);
  const [existingDocs, setExistingDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (elderId) {
      api.get(`/elder-profile/${elderId}/medical-history`)
        .then((res) => {
          const data = res.data;
          if (data) {
            setConditions(data.conditions || []);
            setAllergies(data.allergies || []);
            setBloodGroup(data.bloodGroup || 'O+');
            setDoctorName(data.doctorName || '');
            setDoctorContact(data.doctorContact || '');
            setMedications(data.medications?.length ? data.medications : [{ name: '', dosage: '' }]);
            setExistingDocs(data.documentsUploaded || []);
          }
        })
        .catch((err) => console.error('Error loading history', err));
    }
  }, [elderId]);

  const toggleCondition = (cond) => {
    setConditions((prev) =>
      prev.includes(cond) ? prev.filter((c) => c !== cond) : [...prev, cond]
    );
  };

  const toggleAllergy = (alg) => {
    setAllergies((prev) =>
      prev.includes(alg) ? prev.filter((a) => a !== alg) : [...prev, alg]
    );
  };

  const handleMedChange = (index, field, value) => {
    const updated = [...medications];
    updated[index][field] = value;
    setMedications(updated);
  };

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '' }]);
  };

  const removeMedication = (index) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('conditions', JSON.stringify(conditions));
      formData.append('allergies', JSON.stringify(allergies));
      formData.append('bloodGroup', bloodGroup);
      formData.append('doctorName', doctorName);
      formData.append('doctorContact', doctorContact);
      
      const filteredMeds = medications.filter(m => m.name.trim() !== '');
      formData.append('medications', JSON.stringify(filteredMeds));

      files.forEach(file => {
        formData.append('documents', file);
      });

      const response = await api.post(`/elder-profile/${elderId}/medical-history`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage('Medical history and documents saved successfully!');
      if (response.data.history?.documentsUploaded) {
        setExistingDocs(response.data.history.documentsUploaded);
      }
      if (onSaved) onSaved(response.data.history);
    } catch (error) {
      setMessage('Failed to save medical history: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass-card" style={{ marginTop: '1rem' }}>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <FileCheck color="var(--primary)" /> Medical History & Emergency Summary
      </h3>

      {/* Conditions Checklist */}
      <div className="form-group">
        <label className="form-label">Pre-existing Health Conditions (Checklist)</label>
        <div className="checklist-grid">
          {COMMON_CONDITIONS.map((cond) => (
            <label key={cond} className="checkbox-card">
              <input
                type="checkbox"
                checked={conditions.includes(cond)}
                onChange={() => toggleCondition(cond)}
              />
              <span>{cond}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Blood Group & Primary Doctor */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Blood Group</label>
          <select className="form-select" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Primary Physician / Doctor</label>
          <input
            type="text"
            className="form-input"
            placeholder="Dr. Rajesh Sharma"
            value={doctorName}
            onChange={(e) => setDoctorName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Doctor Phone Contact</label>
          <input
            type="text"
            className="form-input"
            placeholder="+91 98765 43210"
            value={doctorContact}
            onChange={(e) => setDoctorContact(e.target.value)}
          />
        </div>
      </div>

      {/* Allergies Checklist */}
      <div className="form-group">
        <label className="form-label">Known Drug/Food Allergies</label>
        <div className="checklist-grid">
          {COMMON_ALLERGIES.map((alg) => (
            <label key={alg} className="checkbox-card">
              <input
                type="checkbox"
                checked={allergies.includes(alg)}
                onChange={() => toggleAllergy(alg)}
              />
              <span>{alg}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Daily Medications List */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="form-label" style={{ margin: 0 }}>Active Medications & Dosages</label>
          <button type="button" className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.25rem 0.6rem' }} onClick={addMedication}>
            <Plus size={14} /> Add Medication
          </button>
        </div>

        {medications.map((med, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Medication Name (e.g. Amlodipine)"
              value={med.name}
              onChange={(e) => handleMedChange(idx, 'name', e.target.value)}
            />
            <input
              type="text"
              className="form-input"
              placeholder="Dosage (e.g. 5mg daily morning)"
              value={med.dosage}
              onChange={(e) => handleMedChange(idx, 'dosage', e.target.value)}
            />
            {medications.length > 1 && (
              <button type="button" className="btn btn-secondary" style={{ color: '#ef4444' }} onClick={() => removeMedication(idx)}>
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Prescription / Report Upload (Multer) */}
      <div className="form-group">
        <label className="form-label">Upload Prescriptions / Medical Reports (Max 5 files)</label>
        <input
          type="file"
          className="form-input"
          multiple
          accept="image/*,.pdf"
          onChange={handleFileChange}
        />
        {files.length > 0 && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Selected {files.length} file(s): {files.map(f => f.name).join(', ')}
          </p>
        )}
      </div>

      {/* Existing Uploaded Files */}
      {existingDocs.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Uploaded Documents on File:</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {existingDocs.map((docUrl, idx) => (
              <a
                key={idx}
                href={`http://localhost:5000${docUrl}`}
                target="_blank"
                rel="noreferrer"
                style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', background: 'rgba(59,130,246,0.1)', padding: '0.35rem 0.75rem', borderRadius: '6px' }}
              >
                📄 Document {idx + 1}
              </a>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '8px', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%' }}>
        <Save size={18} /> {loading ? 'Saving Medical Profile...' : 'Save Medical History & Prescriptions'}
      </button>
    </form>
  );
};

export default MedicalHistoryForm;
