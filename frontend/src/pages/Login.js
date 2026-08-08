import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'elder') {
        navigate('/elder-dashboard');
      } else if (user.role === 'volunteer') {
        navigate('/volunteer');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="glass-card">
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem', width: '54px', height: '54px' }}>
            <Shield size={28} />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Welcome to CarePulse</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Elderly Health Monitoring & Emergency Alert Platform
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.2)', border: '1px solid #ef4444', borderRadius: '8px', color: '#fca5a5', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                className="form-input"
                required
                placeholder="family@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Mail size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                className="form-input"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
              />
              <Lock size={18} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '0.5rem' }}>
            {loading ? 'Authenticating...' : 'Sign In to CarePulse'} <ArrowRight size={18} />
          </button>
        </form>

        {/* 1-Click Demo Logins */}
        <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid var(--bg-card-border)', textAlign: 'center' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            ⚡ 1-Click Quick Demo Accounts by Role:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem', borderColor: '#E11D48', color: '#E11D48' }}
              onClick={async () => {
                try {
                  setLoading(true);
                  await api.post('/auth/seed-demo');
                  await login('elder@carepulse.com', 'password123');
                  navigate('/elder-dashboard');
                } catch (e) {
                  setError('Demo login failed: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              👴 Elder Member Demo (elder@carepulse.com)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              onClick={async () => {
                try {
                  setLoading(true);
                  await api.post('/auth/seed-demo');
                  await login('demo@carepulse.com', 'password123');
                  navigate('/dashboard');
                } catch (e) {
                  setError('Demo login failed: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              👨‍👩‍👧 Family Caregiver Demo (demo@carepulse.com)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              onClick={async () => {
                try {
                  setLoading(true);
                  await api.post('/auth/seed-demo');
                  await login('volunteer@carepulse.com', 'password123');
                  navigate('/volunteer');
                } catch (e) {
                  setError('Demo login failed: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              🚑 Nearby Volunteer Demo (volunteer@carepulse.com)
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem', padding: '0.5rem' }}
              onClick={async () => {
                try {
                  setLoading(true);
                  await api.post('/auth/seed-demo');
                  await login('admin@carepulse.com', 'password123');
                  navigate('/admin');
                } catch (e) {
                  setError('Demo login failed: ' + e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              🛡️ System Admin Demo (admin@carepulse.com)
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 600 }}>Create Account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
