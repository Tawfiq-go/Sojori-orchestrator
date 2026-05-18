import { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import store, { setLegacyAuthUser } from '../redux/store';
import { useAuth } from '../hooks/useAuth';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import { getToken } from '../utils/authUtils';

function SyncAuthToRedux() {
  const { user } = useAuth();
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(
      setLegacyAuthUser({
        user: toLegacyAuthUser(user),
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

/** Configure axios global (legacy staff APIs). */
export function setupLegacyAxiosAuth() {
  import('axios').then(({ default: axios }) => {
    axios.interceptors.request.use((config) => {
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
  });
}
