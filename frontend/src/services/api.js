// src/services/api.js
import axios from 'axios';
import { normalizeClient, normalizeService, normalizeAppointment } from './normalize';

const api = axios.create({
  baseURL: 'http://localhost:3001', // confirme se backend está na porta 3001
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('@FlowAgenda:token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
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

export default api;