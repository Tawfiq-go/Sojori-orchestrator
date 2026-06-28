import { useEffect } from 'react';
import axios from 'axios';
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
    if (refreshToken) {
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
      return response;
    },
    (error) => Promise.reject(error),
  );
}
