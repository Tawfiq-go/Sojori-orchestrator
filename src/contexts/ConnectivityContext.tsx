import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getConsecutiveNetworkFailures,
  isBrowserOffline,
  subscribeConnectivity,
} from '../utils/networkError';

export type ConnectivityStatus = 'online' | 'degraded' | 'offline' | 'recovered';

type ConnectivityContextValue = {
  status: ConnectivityStatus;
  isOffline: boolean;
  isDegraded: boolean;
  browserOnline: boolean;
};

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null);

const DEGRADED_THRESHOLD = 2;
const RECOVERED_MS = 3200;

function computeStatus(browserOnline: boolean): ConnectivityStatus {
  if (!browserOnline) return 'offline';
  if (getConsecutiveNetworkFailures() >= DEGRADED_THRESHOLD) return 'degraded';
  return 'online';
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [browserOnline, setBrowserOnline] = useState(
    () => (typeof navigator === 'undefined' ? true : navigator.onLine),
  );
  const [status, setStatus] = useState<ConnectivityStatus>(() =>
    computeStatus(typeof navigator === 'undefined' ? true : navigator.onLine),
  );

  const refresh = useCallback(() => {
    const online = !isBrowserOffline();
    setBrowserOnline(online);
    setStatus((prev) => {
      const next = computeStatus(online);
      if (prev !== 'online' && next === 'online') return 'recovered';
      return next;
    });
  }, []);

  useEffect(() => {
    const onOnline = () => refresh();
    const onOffline = () => refresh();
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const unsub = subscribeConnectivity(refresh);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      unsub();
    };
  }, [refresh]);

  useEffect(() => {
    if (status !== 'recovered') return;
    const t = window.setTimeout(() => setStatus('online'), RECOVERED_MS);
    return () => window.clearTimeout(t);
  }, [status]);

  const value = useMemo<ConnectivityContextValue>(
    () => ({
      status,
      isOffline: status === 'offline',
      isDegraded: status === 'degraded',
      browserOnline,
    }),
    [status, browserOnline],
  );

  return (
    <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>
  );
}

export function useConnectivity(): ConnectivityContextValue {
  const ctx = useContext(ConnectivityContext);
  if (!ctx) {
    return {
      status: 'online',
      isOffline: false,
      isDegraded: false,
      browserOnline: true,
    };
  }
  return ctx;
}
