/**
 * Appels monitoring / logs-proxy / prometheus via proxy Vite + apiClient (JWT + X-Dev-Token).
 */
import type { AxiosRequestConfig } from 'axios';
import apiClient from '../services/apiClient';

const MONITORING_TIMEOUT_MS = 120_000;
const PROMETHEUS_TIMEOUT_MS = 90_000;

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== '') qs.append(k, String(v));
    }
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  if (path.startsWith('/api/')) return `${path}${suffix}`;
  return `/api/monitoring${path.startsWith('/') ? path : `/${path}`}${suffix}`;
}

export function monitoringGet<T = unknown>(
  path: string,
  query?: Record<string, string | number | undefined>,
  config?: AxiosRequestConfig,
) {
  return apiClient.get<T>(buildUrl(path, query), {
    timeout: MONITORING_TIMEOUT_MS,
    ...config,
  });
}

export function monitoringDelete<T = unknown>(path: string, config?: AxiosRequestConfig) {
  return apiClient.delete<T>(buildUrl(path), { timeout: MONITORING_TIMEOUT_MS, ...config });
}

export function prometheusGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>,
  config?: AxiosRequestConfig,
) {
  const url = path.startsWith('/api/prometheus-proxy')
    ? path
    : `/api/prometheus-proxy${path.startsWith('/') ? path : `/${path}`}`;
  return apiClient.get<T>(url, { timeout: PROMETHEUS_TIMEOUT_MS, params, ...config });
}

export function logsProxyGet<T = unknown>(
  path: string,
  params?: Record<string, string | string[] | undefined>,
  config?: AxiosRequestConfig,
) {
  const url = path.startsWith('/api/logs-proxy') ? path : `/api/logs-proxy${path.startsWith('/') ? path : `/${path}`}`;
  return apiClient.get<T>(url, { timeout: MONITORING_TIMEOUT_MS, params, ...config });
}

/** Base DLQ admin — chemin relatif pour le proxy Vite (comme legacy setupProxy). */
export function getAdminRabbitmqDlqApiBase(): string {
  return '/api/v1/admin/rabbitmq/dlq';
}

export const RABBITMQ_HEALTH_PATH = '/api/rabbitmq/health';
