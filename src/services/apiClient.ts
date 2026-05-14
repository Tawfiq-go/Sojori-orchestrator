import axios, { AxiosHeaders } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { getToken, getRefreshToken, setTokens, clearTokens, isAppEmbeddedInIframe } from '../utils/authUtils';
import { AUTH_CONFIG } from '../config/authConfig';

// Variable pour gérer la validation de token
let isValidatingToken = false;
let validationPromise: Promise<{ newToken?: string; user?: any }> | null = null;

// Créer l'instance axios
const apiClient: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  }
});

// Intercepteur de requête
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Ne pas ajouter de token pour les requêtes de login ou de validation
    if (config.url?.includes('/login') || config.url?.includes('/valid-token-check')) {
      return config;
    }

    // Gestion du FormData (préserver le Content-Type natif)
    if (config.data instanceof FormData) {
      const headers = AxiosHeaders.from(config.headers);
      headers.delete('Content-Type');
      headers.delete('content-type');
      config.headers = headers;
      config.transformRequest = [(data) => data];
    }

    // Attendre si une validation de token est en cours
    if (isValidatingToken && validationPromise) {
      await validationPromise;
    }

    // Ajouter les tokens aux headers
    const token = getToken();
    const refreshToken = getRefreshToken();

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (refreshToken && config.headers) {
      config.headers['x-refresh-token'] = refreshToken;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // Si un nouveau token est retourné dans la réponse, le mettre à jour
    if (response.data?.newToken) {
      const newToken = response.data.newToken;
      setTokens(newToken, getRefreshToken() || '');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Si un nouveau token est retourné dans l'erreur, le mettre à jour et réessayer
    if (error.response?.data?.newToken) {
      const newToken = error.response.data.newToken;
      setTokens(newToken, getRefreshToken() || '');
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
      return apiClient(originalRequest);
    }

    // Gestion du forceLogout ou session expirée
    if (
      error.response?.data?.forceLogout ||
      error.response?.data?.error === "Session expired, please login again" ||
      error.response?.data?.error === "Invalid token"
    ) {
      if (!isAppEmbeddedInIframe()) {
        clearTokens();
        // Rediriger vers la page de login
        window.location.href = AUTH_CONFIG.LOGOUT_REDIRECT;
      }
      return Promise.reject(error);
    }

    // Gestion du 401 (non autorisé) - tentative de refresh du token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Essayer de rafraîchir le token
        const token = getToken();
        const refreshToken = getRefreshToken();

        if (!token || !refreshToken) {
          throw new Error('No tokens available');
        }

        const response = await apiClient.get(`${AUTH_CONFIG.API_URL}/valid-token-check`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-refresh-token': refreshToken
          }
        });

        if (response.data.newToken) {
          setTokens(response.data.newToken, refreshToken);
          originalRequest.headers['Authorization'] = `Bearer ${response.data.newToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('No new token received');
        }
      } catch (refreshError) {
        // Si le refresh échoue, déconnecter l'utilisateur
        if (!isAppEmbeddedInIframe()) {
          clearTokens();
          window.location.href = AUTH_CONFIG.LOGOUT_REDIRECT;
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
