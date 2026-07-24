import axios, { isAxiosError } from 'axios';
import { toast } from 'react-toastify';

export type NetworkFailureKind = 'offline' | 'timeout' | 'network' | 'server' | 'unknown';

type ConnectivityListener = () => void;

let consecutiveNetworkFailures = 0;
let lastFailureAt = 0;
const listeners = new Set<ConnectivityListener>();

export function subscribeConnectivity(listener: ConnectivityListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitConnectivity() {
  listeners.forEach((l) => l());
}

export function getConsecutiveNetworkFailures(): number {
  return consecutiveNetworkFailures;
}

export function getLastNetworkFailureAt(): number {
  return lastFailureAt;
}

export function reportNetworkSuccess(): void {
  if (consecutiveNetworkFailures > 0) {
    consecutiveNetworkFailures = 0;
    emitConnectivity();
  }
}

export function reportNetworkFailure(kind: NetworkFailureKind = 'network'): void {
  if (kind === 'server' || kind === 'unknown') return;
  consecutiveNetworkFailures += 1;
  lastFailureAt = Date.now();
  emitConnectivity();
}

export function isBrowserOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export function classifyNetworkError(error: unknown): NetworkFailureKind | null {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline';
  if (!isAxiosError(error) && !(error instanceof Error)) return null;

  const ax = isAxiosError(error) ? error : null;
  if (ax) {
    if (axios.isCancel(error) || ax.code === 'ERR_CANCELED' || ax.name === 'CanceledError') {
      return null;
    }
    if (ax.code === 'ECONNABORTED' || /timeout/i.test(ax.message || '')) return 'timeout';
    if (!ax.response) {
      const msg = (ax.message || '').toLowerCase();
      if (
        ax.code === 'ERR_NETWORK' ||
        msg.includes('network error') ||
        msg.includes('failed to fetch') ||
        msg.includes('load failed')
      ) {
        return 'network';
      }
      return 'network';
    }
    if (ax.response.status >= 500) return 'server';
    return null;
  }

  const msg = (error as Error).message?.toLowerCase() || '';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'network';
  if (msg.includes('timeout')) return 'timeout';
  return null;
}

export function isTransientNetworkError(error: unknown): boolean {
  const kind = classifyNetworkError(error);
  return kind === 'offline' || kind === 'timeout' || kind === 'network';
}

/**
 * Toast réseau dédupliqué — évite le spam 4G (un seul toast par type).
 * Les pages peuvent appeler ça à la place de toast.error sur les loads.
 */
export function toastNetworkError(error: unknown, fallback = 'Connexion impossible'): void {
  const kind = classifyNetworkError(error);
  if (!kind || kind === 'server' || kind === 'unknown') {
    const msg =
      isAxiosError(error) && error.response?.data
        ? String(
            (error.response.data as { error?: string; message?: string }).error ||
              (error.response.data as { message?: string }).message ||
              fallback,
          )
        : error instanceof Error
          ? error.message
          : fallback;
    toast.error(msg, { toastId: `http-error-${msg.slice(0, 40)}` });
    return;
  }

  reportNetworkFailure(kind);

  if (kind === 'offline' || isBrowserOffline()) {
    toast.warn('Hors ligne — reconnectez-vous pour continuer.', {
      toastId: 'network-offline',
      autoClose: 8000,
    });
    return;
  }
  if (kind === 'timeout') {
    toast.warn('Réseau lent ou coupé — nouvelle tentative en cours…', {
      toastId: 'network-timeout',
      autoClose: 7000,
    });
    return;
  }
  toast.warn('Connexion instable (4G / Wi‑Fi) — on réessaie automatiquement.', {
    toastId: 'network-degraded',
    autoClose: 7000,
  });
}
