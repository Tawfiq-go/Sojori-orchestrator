import { useEffect } from 'react';
import axios from 'axios';
import { isRefreshTokenRoute } from '../services/apiClient';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import store, { setLegacyAuthUser } from '../redux/store';
import { useAuth } from '../hooks/useAuth';
import { resolveLegacyAuthUser } from '../utils/legacyAuthUser';
import { getToken, getRefreshToken, setTokens } from '../utils/authUtils';

function SyncAuthToRedux() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      setLegacyAuthUser({
        user: resolveLegacyAuthUser(user, null),
        token: getToken(),
      }),
    );
  }, [user, dispatch]);
  return null;
}

export function LegacyReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <SyncAuthToRedux />
      <ToastContainer position="top-right" autoClose={3000} />
      {children}
    </Provider>
  );
}

/** Configure axios global (legacy staff APIs) — aligné apiClient (Bearer + x-refresh-token). */
export function setupLegacyAxiosAuth() {
  axios.interceptors.request.use((config) => {
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
  axios.interceptors.response.use(
    (response) => {
      if (response.data?.newToken) {
        setTokens(response.data.newToken, getRefreshToken() || '');
      }
      void import('../utils/networkError').then(({ reportNetworkSuccess }) =>
        reportNetworkSuccess(),
      );
      return response;
    },
    (error) => {
      void import('../utils/networkError').then(({ classifyNetworkError, reportNetworkFailure, toastNetworkError, isTransientNetworkError }) => {
        if (isTransientNetworkError(error)) {
          reportNetworkFailure(classifyNetworkError(error) || 'network');
          toastNetworkError(error);
        }
      });
      return Promise.reject(error);
    },
  );
}
