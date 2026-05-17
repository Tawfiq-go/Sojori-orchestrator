/**
 * Logs runtime : buffer en mémoire + console, pour diagnostiquer écran gris / chargements.
 * Panneau UI : voir `DevRuntimeLogPanel` (activé en dev / localhost / VITE_RUNTIME_LOG_UI).
 */

export type RuntimeLogLevel = 'info' | 'warn' | 'error';

export type RuntimeLogEntry = {
  id: number;
  ts: string;
  level: RuntimeLogLevel;
  tag: string;
  message: string;
  detail?: unknown;
};

const MAX_ENTRIES = 200;
let seq = 0;
const entries: RuntimeLogEntry[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

function compactDetail(detail: unknown): unknown {
  if (detail === undefined) return undefined;
  if (typeof detail === 'string') {
    return detail.length > 900 ? `${detail.slice(0, 900)}…` : detail;
  }
  try {
    const s = JSON.stringify(detail);
    if (s.length > 900) {
      return `${s.slice(0, 900)}…`;
    }
    return JSON.parse(s) as unknown;
  } catch {
    return String(detail);
  }
}

export function isRuntimeLogPanelEnabled(): boolean {
  if (import.meta.env.VITE_RUNTIME_LOG_UI === 'true') return true;
  if (import.meta.env.VITE_DASHBOARD_DEBUG === 'true') return true;
  if (import.meta.env.DEV) return true;
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
}

export function subscribeRuntimeLogs(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRuntimeLogs(): readonly RuntimeLogEntry[] {
  return entries;
}

export function clearRuntimeLogs(): void {
  entries.length = 0;
  notify();
}

/**
 * Enregistre une ligne (buffer + console selon le niveau).
 */
export function runtimeLog(
  level: RuntimeLogLevel,
  tag: string,
  message: string,
  detail?: unknown,
): void {
  const entry: RuntimeLogEntry = {
    id: ++seq,
    ts: new Date().toISOString().slice(11, 23),
    level,
    tag,
    message,
    detail: compactDetail(detail),
  };
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  notify();

  const prefix = `[Sojori][${entry.ts}][${tag}]`;
  if (level === 'error') {
    console.error(prefix, message, detail !== undefined ? detail : '');
  } else if (level === 'warn') {
    console.warn(prefix, message, detail !== undefined ? detail : '');
  } else {
    console.log(prefix, message, detail !== undefined ? detail : '');
  }
}
