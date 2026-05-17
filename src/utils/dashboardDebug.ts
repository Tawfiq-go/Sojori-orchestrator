/** Logs dashboard / auth en dev (console navigateur). */
import { runtimeLog } from './runtimeLog';

const PREFIX = '[Sojori Orchestrator]';

/** `vite preview` (ex. :4174) = build prod → `import.meta.env.DEV` est false ; on garde les logs en local. */
function isBrowserLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === '127.0.0.1' || host === 'localhost' || host === '[::1]';
}

export const dashboardDebugEnabled =
  import.meta.env.DEV ||
  import.meta.env.VITE_DASHBOARD_DEBUG === 'true' ||
  isBrowserLocalhost();

export function logDashboard(message: string, data?: unknown): void {
  if (!dashboardDebugEnabled) return;
  if (data !== undefined) {
    console.log(`${PREFIX} ${message}`, data);
  } else {
    console.log(`${PREFIX} ${message}`);
  }
}

/** Toujours actif (diagnostic page blanche / 401). Filtrer la console sur « Sojori ». */
export function logAuth(message: string, data?: unknown): void {
  runtimeLog('info', 'Auth', message, data);
}

export function logAuthWarn(message: string, data?: unknown): void {
  runtimeLog('warn', 'Auth', message, data ?? '');
}

export function logAuthError(message: string, data?: unknown): void {
  runtimeLog('error', 'Auth', message, data ?? '');
}

export function logApiOutcome(label: string, outcome: PromiseSettledResult<unknown>): void {
  if (!dashboardDebugEnabled) return;
  if (outcome.status === 'fulfilled') {
    const value = outcome.value as { status?: number; data?: unknown };
    const status = value?.status ?? 200;
    const data = value?.data;
    const preview =
      data && typeof data === 'object'
        ? {
            success: (data as Record<string, unknown>).success,
            keys: Object.keys(data as object).slice(0, 12),
          }
        : data;
    console.log(`${PREFIX} [API] ✓ ${label}`, { status, preview });
  } else {
    const reason = outcome.reason as {
      code?: string
      name?: string
      response?: { status?: number; data?: unknown }
      message?: string
    }
    if (reason?.code === 'ERR_CANCELED' || reason?.name === 'CanceledError') return
    console.warn(`${PREFIX} [API] ✗ ${label}`, {
      status: reason?.response?.status,
      message: reason?.message,
      body: reason?.response?.data,
    })
  }
}

export function maskToken(token: string | null | undefined): string {
  if (!token) return '(aucun)';
  if (token.length <= 12) return '***';
  return `${token.slice(0, 6)}…${token.slice(-4)}`;
}
