import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('circleback_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('circleback_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('circleback_user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token: jwtToken, user: userData } = response.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('circleback_token', jwtToken);
    localStorage.setItem('circleback_user', JSON.stringify(userData));
    return userData;
  };

  const signup = async (formData) => {
    const response = await api.post('/auth/signup', formData);
    const { token: jwtToken, user: userData } = response.data;
    setToken(jwtToken);
    setUser(userData);
    localStorage.setItem('circleback_token', jwtToken);
    localStorage.setItem('circleback_user', JSON.stringify(userData));
    return userData;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('circleback_token');
    localStorage.removeItem('circleback_user');
  };

  const updateUserSubscription = (tier) => {
    if (user) {
      const updated = { ...user, subscriptionTier: tier };
      setUser(updated);
      localStorage.setItem('circleback_user', JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateUserSubscription }}>
      {children}
    </AuthContext.Provider>
  );
};
