/** Shim legacy dashboard — axios avec JWT + X-Dev-Token (Vite). */
import axios from 'axios';
import { API_BASE_URL } from './backendServer.config';
import { getToken } from '../utils/authUtils';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (import.meta.env.VITE_DEV_TOKEN && typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      config.headers = config.headers ?? {};
      config.headers['X-Dev-Token'] = import.meta.env.VITE_DEV_TOKEN;
    }
  }
  return config;
});

export default apiClient;
