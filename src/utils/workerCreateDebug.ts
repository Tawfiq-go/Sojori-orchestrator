/**
 * Logs diagnostic création worker — console + panneau runtime (dev / localhost).
 * Forcer en prod preview : localStorage.setItem('SOJORI_WORKER_CREATE_DEBUG', '1')
 */
import { runtimeLog } from './runtimeLog';

function enabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '[::1]') return true;
  try {
    return window.localStorage.getItem('SOJORI_WORKER_CREATE_DEBUG') === '1';
  } catch {
    return false;
  }
}

function redactPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!payload) return payload;
  const out = { ...payload };
  if (typeof out.password === 'string') out.password = '***';
  return out;
}

export function logWorkerCreate(step: string, detail?: unknown): void {
  if (!enabled()) return;
  const safe = detail && typeof detail === 'object' && !Array.isArray(detail)
    ? redactPayload(detail as Record<string, unknown>)
    : detail;
  console.log(`[worker-create] ${step}`, safe ?? '');
  runtimeLog('info', 'WorkerCreate', step, safe);
}

export function warnWorkerCreate(step: string, detail?: unknown): void {
  if (!enabled()) return;
  console.warn(`[worker-create] ${step}`, detail ?? '');
  runtimeLog('warn', 'WorkerCreate', step, detail);
}

export function errorWorkerCreate(step: string, detail?: unknown): void {
  if (!enabled()) return;
  console.error(`[worker-create] ${step}`, detail ?? '');
  runtimeLog('error', 'WorkerCreate', step, detail);
}
