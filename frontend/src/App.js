import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ElderOnboarding from './pages/ElderOnboarding';
import Billing from './pages/Billing';
import VolunteerView from './pages/VolunteerView';
import AdminPanel from './pages/AdminPanel';
import VitalsControlRoom from './pages/VitalsControlRoom';
import ElderDashboard from './pages/ElderDashboard';

import { Shield, Heart, PlusCircle, CreditCard, Users, LogOut, UserCheck, Zap, PhoneCall } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center' }}>Loading CircleBack Platform...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRedirects = {
      elder: '/elder-dashboard',
      volunteer: '/volunteer',
      admin: '/admin',
      family: '/dashboard'
    };
    return <Navigate to={roleRedirects[user.role] || '/dashboard'} replace />;
  }

  return children;
};

const NavigationBar = () => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const getTierClass = (tier) => {
    return `badge-tier badge-${tier || 'free'}`;
  };

  const getHomePath = () => {
    switch (user.role) {
      case 'elder':
        return '/elder-dashboard';
      case 'volunteer':
        return '/volunteer';
      case 'admin':
        return '/admin';
      default:
        return '/dashboard';
    }
  };

  return (
    <nav className="navbar">
      <Link to={getHomePath()} className="brand-logo">
        <div className="brand-icon">
          <Shield size={22} />
        </div>
        <span>CarePulse</span>
      </Link>

      <div className="nav-links">
        {user.role === 'elder' && (
          <Link to="/elder-dashboard" className={`nav-link ${location.pathname === '/elder-dashboard' ? 'active' : ''}`} style={{ color: '#E11D48', fontWeight: 700 }}>
            <PhoneCall size={16} style={{ display: 'inline', marginRight: '4px' }} /> Elder Care Mode
          </Link>
        )}

        {user.role === 'family' && (
          <>
            <Link to="/dashboard" className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}>
              <Heart size={16} style={{ display: 'inline', marginRight: '4px' }} /> Dashboard & Control Room
            </Link>
            <Link to="/onboarding" className={`nav-link ${location.pathname === '/onboarding' ? 'active' : ''}`}>
              <PlusCircle size={16} style={{ display: 'inline', marginRight: '4px' }} /> Add Elder
            </Link>
            <Link to="/billing" className={`nav-link ${location.pathname === '/billing' ? 'active' : ''}`}>
              <CreditCard size={16} style={{ display: 'inline', marginRight: '4px' }} /> Subscription
            </Link>
          </>
        )}

        {user.role === 'volunteer' && (
          <Link to="/volunteer" className={`nav-link ${location.pathname === '/volunteer' ? 'active' : ''}`}>
            <Users size={16} style={{ display: 'inline', marginRight: '4px' }} /> Volunteer Desk
          </Link>
        )}

        {user.role === 'admin' && (
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}>
            <UserCheck size={16} style={{ display: 'inline', marginRight: '4px' }} /> Admin Operations
          </Link>
        )}

        {/* Tier Badge */}
        <span className={getTierClass(user.subscriptionTier)}>
          {user.subscriptionTier?.replace('_', ' ') || 'Free'} Plan
        </span>

        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {user.name} ({user.role})
        </span>

        <button className="btn btn-secondary" onClick={logout} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
          <LogOut size={14} /> Exit
        </button>
      </div>
    </nav>
  );
};

const AppRoutes = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="app-container">
      <NavigationBar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/elder-dashboard"
            element={
              <ProtectedRoute allowedRoles={['elder', 'family', 'admin']}>
                <ElderDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRoles={['family', 'admin']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/control-room"
            element={
              <ProtectedRoute allowedRoles={['family', 'admin']}>
                <VitalsControlRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute allowedRoles={['family', 'admin']}>
                <ElderOnboarding />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing"
            element={
              <ProtectedRoute allowedRoles={['family', 'admin']}>
                <Billing />
              </ProtectedRoute>
            }
          />
          <Route
            path="/volunteer"
            element={
              <ProtectedRoute allowedRoles={['volunteer', 'admin']}>
                <VolunteerView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to={
            user?.role === 'elder' ? '/elder-dashboard' :
            user?.role === 'volunteer' ? '/volunteer' :
            user?.role === 'admin' ? '/admin' : '/dashboard'
          } replace />} />
        </Routes>
      </main>
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
