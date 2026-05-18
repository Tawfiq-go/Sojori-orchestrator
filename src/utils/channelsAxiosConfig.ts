import { MICROSERVICE_BASE_URL } from '../config/authConfig';

/**
 * En dev Vite (:4174), requêtes relatives → proxy local → dev.sojori.com (JWT + X-Dev-Token).
 * Aligné sur sojori-dashboard/monitoringAxiosDevProxy.js.
 */
export function monitoringAxiosConfig() {
  const timeout = 120_000;
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return { timeout, baseURL: window.location.origin };
  }
  return { timeout, baseURL: MICROSERVICE_BASE_URL.API_BASE_URL };
}

export function channelsDashboardAxiosConfig() {
  return monitoringAxiosConfig();
}

/** Retry sans enrich si timeout / 502–504 (enrich = POST lourd côté réservations). */
export function shouldRetryMonitoringRuApisWithoutEnrich(err: unknown): boolean {
  const ax = err as { response?: { status?: number }; code?: string; message?: string };
  const status = ax.response?.status;
  if (ax.code === 'ECONNABORTED' || /timeout/i.test(String(ax.message || ''))) return true;
  if (status === 500) return true;
  if (status != null && status >= 502 && status <= 504) return true;
  return false;
}
