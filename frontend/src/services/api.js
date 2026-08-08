import axios from 'axios';

const getApiBaseUrl = () => {
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
    return process.env.REACT_APP_API_URL.trim();
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://healthmonitoring-3cs6.onrender.com/api';
  }
  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('circleback_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor for handling global auth failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token on 401 unauth
      localStorage.removeItem('circleback_token');
      localStorage.removeItem('circleback_user');
    }
    return Promise.reject(error);
  }
);

export default api;
