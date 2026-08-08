import React, { useState, useEffect } from 'react';
import { User, Phone, Home, HeartHandshake, Stethoscope, Ambulance, Save, X } from 'lucide-react';
import api from '../services/api';

const EditElderModal = ({ elder, onClose, onUpdated }) => {
  const [name, setName] = useState(elder.name || '');
  const [age, setAge] = useState(elder.age || '');
  const [gender, setGender] = useState(elder.gender || 'female');
  const [photoUrl, setPhotoUrl] = useState(elder.photoUrl || '');
  const [address, setAddress] = useState(elder.address || '');
  const [landmark, setLandmark] = useState(elder.landmark || '');

  // Categorized Contact Fields
  const [sonName, setSonName] = useState('');
  const [sonPhone, setSonPhone] = useState('');

  const [neighborName, setNeighborName] = useState('');
  const [neighborPhone, setNeighborPhone] = useState('');

  const [ambulancePhone, setAmbulancePhone] = useState('');

  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (elder && elder.emergencyContacts) {
      // Parse categorized contacts from existing contacts array
      const sonContact = elder.emergencyContacts.find(c => c.relation?.toLowerCase().includes('son') || c.relation?.toLowerCase().includes('daughter') || c.relation?.toLowerCase().includes('family'));
      if (sonContact) {
        setSonName(sonContact.name || '');
        setSonPhone(sonContact.phone || '');
      }

      const neighborContact = elder.emergencyContacts.find(c => c.relation?.toLowerCase().includes('neighbor'));
      if (neighborContact) {
        setNeighborName(neighborContact.name || '');
        setNeighborPhone(neighborContact.phone || '');
      }

      const ambulanceContact = elder.emergencyContacts.find(c => c.relation?.toLowerCase().includes('ambulance'));
      if (ambulanceContact) {
        setAmbulancePhone(ambulanceContact.phone || '');
      }

      const doctorContact = elder.emergencyContacts.find(c => c.relation?.toLowerCase().includes('doctor'));
      if (doctorContact) {
        setDoctorName(doctorContact.name || '');
        setDoctorPhone(doctorContact.phone || '');
      }
    }
  }, [elder]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Build structured emergency contacts array
    const contacts = [
      { name: sonName || 'Son / Daughter', relation: 'Son / Family', phone: sonPhone },
      { name: neighborName || 'Nearby Neighbor', relation: 'Neighbor', phone: neighborPhone },
      { name: 'Local Ambulance Service', relation: 'Ambulance', phone: ambulancePhone },
      { name: doctorName || 'Family Doctor', relation: 'Family Doctor', phone: doctorPhone }
    ].filter(c => c.phone && c.phone.trim() !== '');

    try {
      const res = await api.put(`/elder-profile/${elder._id}`, {
        name,
        age: Number(age),
        gender,
        photoUrl,
        address,
        landmark,
        emergencyContacts: contacts
      });

      if (onUpdated) onUpdated(res.data.elder);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem'
    }}>
      <div className="glass-card" style={{ maxWidth: '680px', width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--bg-card-border)', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--bg-card-border)', paddingBottom: '0.75rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User color="var(--primary)" /> Edit Elder Profile & Categorized Contacts
          </h2>
          <button className="btn btn-secondary" style={{ padding: '0.35rem 0.65rem' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#dc2626', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 1: ELDER BASIC DETAILS */}
          <h4 style={{ fontSize: '1rem', color: 'var(--accent-cyan)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={18} /> 1. Elder Basic Information
          </h4>

          <div className="form-group">
            <label className="form-label">Full Name of Elder</label>
            <input type="text" className="form-input" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="responsive-two-col-grid">
            <div className="form-group">
              <label className="form-label">Age (Years)</label>
              <input type="number" className="form-input" required value={age} onChange={(e) => setAge(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Residence Address</label>
            <textarea className="form-textarea" rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Landmark</label>
            <input type="text" className="form-input" value={landmark} onChange={(e) => setLandmark(e.target.value)} />
          </div>

          {/* SECTION 2: CATEGORIZED EMERGENCY CONTACTS */}
          <h4 style={{ fontSize: '1rem', color: '#0d9488', margin: '1.75rem 0 1rem', display: 'flex', alignItems: 'center', gap: '6px', borderTop: '1px solid var(--bg-card-border)', paddingTop: '1.25rem' }}>
            <Phone size={18} /> 2. Categorized Emergency Contacts Desk
          </h4>

          {/* Contact 1: Son / Daughter / Family */}
          <div className="form-group" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px' }}>
            <label className="form-label" style={{ color: '#0284c7', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👨‍👦 Son / Daughter (Primary Family Contact)
            </label>
            <div className="responsive-two-col-grid" style={{ gap: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Son Name (e.g. Rajesh Sharma)" value={sonName} onChange={(e) => setSonName(e.target.value)} />
              <input type="tel" className="form-input" placeholder="Phone (+91...)" value={sonPhone} onChange={(e) => setSonPhone(e.target.value)} />
            </div>
          </div>

          {/* Contact 2: Neighbor */}
          <div className="form-group" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px' }}>
            <label className="form-label" style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🏡 Nearby Neighbor (Fast Physical Check-in)
            </label>
            <div className="responsive-two-col-grid" style={{ gap: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Neighbor Name (e.g. Verma Ji)" value={neighborName} onChange={(e) => setNeighborName(e.target.value)} />
              <input type="tel" className="form-input" placeholder="Phone (+91...)" value={neighborPhone} onChange={(e) => setNeighborPhone(e.target.value)} />
            </div>
          </div>

          {/* Contact 3: Ambulance */}
          <div className="form-group" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px' }}>
            <label className="form-label" style={{ color: '#e11d48', display: 'flex', alignItems: 'center', gap: '6px' }}>
              🚑 Local Ambulance Service / Paramedic Hotline
            </label>
            <input type="tel" className="form-input" placeholder="Ambulance Phone Number (+91...)" value={ambulancePhone} onChange={(e) => setAmbulancePhone(e.target.value)} />
          </div>

          {/* Contact 4: Family Doctor */}
          <div className="form-group" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '10px' }}>
            <label className="form-label" style={{ color: '#7e22ce', display: 'flex', alignItems: 'center', gap: '6px' }}>
              👨‍⚕️ Family Doctor / Physician
            </label>
            <div className="responsive-two-col-grid" style={{ gap: '0.75rem' }}>
              <input type="text" className="form-input" placeholder="Doctor Name (e.g. Dr. Anand Kumar)" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
              <input type="tel" className="form-input" placeholder="Doctor Contact Phone" value={doctorPhone} onChange={(e) => setDoctorPhone(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 2 }}>
              <Save size={18} /> {loading ? 'Saving Changes...' : 'Save Profile & Contacts'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditElderModal;
