/** Logs debug config orchestration / template — filtre console : OrchConfig */

const PREFIX = '[OrchConfig]';

export function isOrchConfigDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window !== 'undefined') {
    return window.localStorage?.getItem('orchConfigDebug') === '1';
  }
  return false;
}

export function logOrchConfig(phase: string, payload?: Record<string, unknown>): void {
  if (!isOrchConfigDebugEnabled()) return;
  if (payload) {
    console.log(PREFIX, phase, payload);
  } else {
    console.log(PREFIX, phase);
  }
}

export function orchConfigError(phase: string, error: unknown, extra?: Record<string, unknown>): void {
  if (!isOrchConfigDebugEnabled()) return;
  const err =
    error instanceof Error
      ? { message: error.message, name: error.name }
      : { message: String(error) };
  const axios = error as { response?: { status?: number; data?: unknown } };
  console.error(PREFIX, phase, {
    ...extra,
    err,
    status: axios.response?.status,
    body: axios.response?.data,
  });
}
