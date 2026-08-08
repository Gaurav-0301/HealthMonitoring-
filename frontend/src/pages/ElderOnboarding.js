import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MedicalHistoryForm from '../components/MedicalHistoryForm';
import api from '../services/api';
import { User, MapPin, Watch, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

const ElderOnboarding = () => {
  const [step, setStep] = useState(1);
  const [createdElder, setCreatedElder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  // Step 1 & 2 Form State
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('female');
  const [photoUrl, setPhotoUrl] = useState('');
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');

  // Categorized Contacts State
  const [sonName, setSonName] = useState('');
  const [sonPhone, setSonPhone] = useState('');
  const [neighborName, setNeighborName] = useState('');
  const [neighborPhone, setNeighborPhone] = useState('');
  const [ambulancePhone, setAmbulancePhone] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  const handleStep1And2Submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const contacts = [
      { name: sonName || 'Son / Daughter', relation: 'Son / Family', phone: sonPhone },
      { name: neighborName || 'Nearby Neighbor', relation: 'Neighbor', phone: neighborPhone },
      { name: 'Local Ambulance Service', relation: 'Ambulance', phone: ambulancePhone },
      { name: doctorName || 'Family Doctor', relation: 'Family Doctor', phone: doctorPhone }
    ].filter(c => c.phone && c.phone.trim() !== '');

    try {
      const response = await api.post('/elder-profile', {
        name,
        age: Number(age),
        gender,
        photoUrl,
        address,
        landmark,
        emergencyContacts: contacts
      });

      setCreatedElder(response.data.elder);
      setStep(3); // Move to Medical History step
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating elder profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectBand = async () => {
    if (!createdElder) return;
    setLoading(true);
    try {
      await api.post(`/elder-profile/${createdElder._id}/connect-google-fit`, {
        mockToken: `mock_google_fit_token_${Date.now()}`
      });
      alert('Fitness band (Google Fit / Apple HealthKit) linked successfully!');
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to connect band: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px', margin: '2rem auto' }}>
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h1 className="page-title">Elderly Parent Onboarding Wizard</h1>
        <p className="page-subtitle">Set up passive fitness band monitoring & emergency escalation profile</p>
        
        {/* Step Indicator */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem' }}>
          {[
            { num: 1, label: '1. Profile Info' },
            { num: 2, label: '2. Contacts & GPS' },
            { num: 3, label: '3. Medical History' },
            { num: 4, label: '4. Band Connect' }
          ].map((s) => (
            <div
              key={s.num}
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: step === s.num ? 'var(--primary)' : step > s.num ? '#10b981' : 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              {step > s.num ? <CheckCircle2 size={16} /> : null} {s.label}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          {error}
        </div>
      )}

      {/* STEP 1 & STEP 2 COMBINED FORM */}
      {step <= 2 && (
        <form onSubmit={handleStep1And2Submit} className="glass-card">
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User color="var(--primary)" /> Step 1: Elder Profile Details
              </h3>

              <div className="form-group">
                <label className="form-label">Full Name of Elder</label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="e.g. Ramesh Chandra / Sunita Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Age (Years)</label>
                  <input
                    type="number"
                    className="form-input"
                    required
                    placeholder="72"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
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
                <label className="form-label">Photo Avatar URL (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Leave blank for automatic avatar"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                />
              </div>

              <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep(2)}>
                Next: Address & Emergency Contacts <ArrowRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin color="var(--primary)" /> Step 2: Residence Address & Emergency Contacts
              </h3>

              <div className="form-group">
                <label className="form-label">Residence Address (For Emergency Paramedic Dispatch)</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  required
                  placeholder="House No, Street, Colony, City, Pincode"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Landmark (Helps Nearby Volunteers Locate Fast)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Near Community Park / Behind City Hospital"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--accent-cyan)', fontWeight: 700, margin: '1.25rem 0 0.75rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📞 Categorized Emergency Contacts Desk
                </label>

                {/* Son / Daughter Contact */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ color: '#60a5fa', fontSize: '0.88rem' }}>
                    👨‍👦 Son / Daughter (Primary Family Contact)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input type="text" className="form-input" placeholder="Son Name" value={sonName} onChange={(e) => setSonName(e.target.value)} />
                    <input type="tel" className="form-input" placeholder="Phone (+91...)" value={sonPhone} onChange={(e) => setSonPhone(e.target.value)} />
                  </div>
                </div>

                {/* Neighbor Contact */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ color: '#f59e0b', fontSize: '0.88rem' }}>
                    🏡 Nearby Neighbor (Fast Physical Check-in)
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input type="text" className="form-input" placeholder="Neighbor Name" value={neighborName} onChange={(e) => setNeighborName(e.target.value)} />
                    <input type="tel" className="form-input" placeholder="Phone (+91...)" value={neighborPhone} onChange={(e) => setNeighborPhone(e.target.value)} />
                  </div>
                </div>

                {/* Ambulance Contact */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ color: '#f43f5e', fontSize: '0.88rem' }}>
                    🚑 Local Ambulance Service / Paramedic Hotline
                  </label>
                  <input type="tel" className="form-input" placeholder="Ambulance Hotline (+91...)" value={ambulancePhone} onChange={(e) => setAmbulancePhone(e.target.value)} />
                </div>

                {/* Family Doctor Contact */}
                <div style={{ background: 'rgba(0,0,0,0.25)', padding: '0.85rem', borderRadius: '10px', marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ color: '#c084fc', fontSize: '0.88rem' }}>
                    👨‍⚕️ Family Doctor / Physician
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <input type="text" className="form-input" placeholder="Doctor Name" value={doctorName} onChange={(e) => setDoctorName(e.target.value)} />
                    <input type="tel" className="form-input" placeholder="Doctor Contact" value={doctorPhone} onChange={(e) => setDoctorPhone(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
                  <ArrowLeft size={18} /> Back
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
                  {loading ? 'Creating Profile...' : 'Save & Proceed to Medical History'} <ArrowRight size={18} />
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* STEP 3: MEDICAL HISTORY */}
      {step === 3 && createdElder && (
        <div>
          <MedicalHistoryForm
            elderId={createdElder._id}
            onSaved={() => setStep(4)}
          />
          <div style={{ textAlign: 'right', marginTop: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setStep(4)}>
              Skip / Proceed to Band Connect <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: FITNESS BAND CONNECT (GOOGLE FIT / HEALTHKIT) */}
      {step === 4 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem', width: '60px', height: '60px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Watch size={32} />
          </div>

          <h3 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Connect Fitness Band / Smartwatch</h3>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 1.75rem' }}>
            CircleBack syncs vitals passively using fitness bands your elder already owns (Noise, boAt, Mi Band, Fire-Boltt, Amazfit, Apple Watch) via Google Fit or Apple HealthKit APIs.
          </p>

          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '10px', maxWidth: '400px', margin: '0 auto 1.5rem', fontSize: '0.88rem', textAlign: 'left' }}>
            <p>✓ 15-minute passive background polling</p>
            <p>✓ No custom hardware required</p>
            <p>✓ Initial 7-day baseline calibration</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '350px', margin: '0 auto' }}>
            <button className="btn btn-primary" disabled={loading} onClick={handleConnectBand} style={{ background: '#4285F4' }}>
              Connect Google Fit Account
            </button>
            <button className="btn btn-secondary" disabled={loading} onClick={handleConnectBand}>
              Connect Apple HealthKit Account
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
              Complete Later (Use Manual SOS Mode)
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElderOnboarding;
