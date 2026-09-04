/** Shim legacy dashboard — axios avec JWT + X-Dev-Token (Vite). */
import axios from 'axios';
import { API_BASE_URL } from './backendServer.config';
import { getToken, getRefreshToken, setTokens } from '../utils/authUtils';
import { isRefreshTokenRoute } from '../services/apiClient';
import { applyAdminViewScope } from '../utils/adminViewScope';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  applyAdminViewScope(config);
  const token = getToken();
  const refreshToken = getRefreshToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Refresh token réservé à la route de rafraîchissement (voir apiClient.isRefreshTokenRoute).
  if (refreshToken && isRefreshTokenRoute(config.url)) {
    config.headers = config.headers ?? {};
    config.headers['x-refresh-token'] = refreshToken;
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

apiClient.interceptors.response.use(
  (response) => {
    if (response.data?.newToken) {
      setTokens(response.data.newToken, getRefreshToken() || '');
    }
    return response;
  },
  (error) => Promise.reject(error),
);

export default apiClient;
