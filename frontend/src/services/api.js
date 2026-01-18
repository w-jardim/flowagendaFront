// src/services/api.js
import axios from 'axios';
import { normalizeClient, normalizeService, normalizeAppointment } from './normalize';

const api = axios.create({
  baseURL: 'http://localhost:3001', // confirme se backend está na porta 3001
  headers: {
    'Content-Type': 'application/json'
  }
});

// Decode JWT payload (no external deps)
function decodeToken(token) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded) return true;
  if (!decoded.exp) return false; // cannot determine
  const expMs = Number(decoded.exp) * 1000;
  return Date.now() >= expMs;
}

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('@FlowAgenda:token');
    if (token) {
      // If token has expired, clear auth and redirect to login
      if (isTokenExpired(token)) {
        try {
          localStorage.removeItem('@FlowAgenda:token');
          localStorage.removeItem('@FlowAgenda:user');
          delete api.defaults.headers.common.Authorization;
        } catch (e) {}
        // Redirect to login page
        if (typeof window !== 'undefined') window.location.href = '/';
        return config;
      }

      if (config.headers) config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    // ignore and continue without token
  }
  return config;
}, (error) => Promise.reject(error));

// Normalize responses centrally: map lists/objects returned by the backend
api.interceptors.response.use((response) => {
  try {
    const url = response.config?.url || '';
    const data = response.data;

    if (!data) return response;

    // Helper to normalize arrays or single objects
    const normalizePayload = (payload) => {
      if (Array.isArray(payload)) return payload;
      return payload;
    };

    if (url.includes('/clientes')) {
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      response.data = arr.map(normalizeClient);
      return response;
    }

    if (url.includes('/servicos')) {
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      response.data = arr.map(normalizeService);
      return response;
    }

    if (url.includes('/agendamentos')) {
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      response.data = arr.map(normalizeAppointment);
      return response;
    }

    return response;
  } catch (e) {
    return response;
  }
}, (error) => Promise.reject(error));

// Response error handler: handle 401 Unauthorized globally
api.interceptors.response.use(undefined, (error) => {
  try {
    const status = error.response?.status;
    if (status === 401) {
      try {
        localStorage.removeItem('@FlowAgenda:token');
        localStorage.removeItem('@FlowAgenda:user');
        delete api.defaults.headers.common.Authorization;
      } catch (e) {}
      if (typeof window !== 'undefined') window.location.href = '/';
    }
  } catch (e) {
    // swallow
  }
  return Promise.reject(error);
});

export default api;