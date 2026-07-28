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
let notifyScheduled = false;

function flushListeners(): void {
  notifyScheduled = false;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Notifie les abonnés de façon asynchrone : évite de déclencher un setState
 * d'un abonné (ex. DevRuntimeLogPanel) pendant le render d'un autre composant
 * qui logge (ex. AuthProvider) → warning React "Cannot update while rendering".
 */
function notify(): void {
  if (notifyScheduled) return;
  notifyScheduled = true;
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(flushListeners);
  } else {
    Promise.resolve().then(flushListeners);
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

/** Hôtes de développement — seuls endroits où le panneau de logs peut s'afficher. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '::1', '0.0.0.0']);

/**
 * ⚠️ CRITICAL — la garde s'appuie sur le HOSTNAME RÉEL, jamais sur les seuls
 * flags de build.
 *
 * Incident 2026-07-28 : un déploiement produit sans `--prod` fige
 * `import.meta.env.DEV` à `true` ; la garde disparaît à la compilation et le
 * panneau « Runtime logs » (tokens, e-mails, ids) s'affiche chez les clients.
 * Un flag de build ne peut donc pas être la seule barrière.
 *
 * Règle : hors d'un hôte local, le panneau est TOUJOURS masqué — quel que soit
 * le mode de build. Sur un hôte local, DEV ou un flag explicite l'active.
 */
export function isRuntimeLogPanelEnabled(): boolean {
  if (typeof window === 'undefined') return false;

  const host = window.location.hostname;
  const isLocalHost = LOCAL_HOSTS.has(host) || host.endsWith('.localhost');
  // Verrou dur : aucun flag de build ne peut ouvrir le panneau en dehors du local.
  if (!isLocalHost) return false;

  if (import.meta.env.VITE_RUNTIME_LOG_UI === 'true') return true;
  if (import.meta.env.VITE_DASHBOARD_DEBUG === 'true') return true;
  return Boolean(import.meta.env.DEV);
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

  // Console : erreurs toujours ; HTTP/Comms warn (échecs API) ; Auth info/warn seulement si VITE_DASHBOARD_DEBUG.
  const verboseAuth =
    import.meta.env.VITE_DASHBOARD_DEBUG === 'true' ||
    import.meta.env.VITE_RUNTIME_LOG_UI === 'true';
  const printToConsole =
    level === 'error' ||
    ((tag === 'HTTP' || tag === 'Comms') && level === 'warn') ||
    (tag === 'Auth' && level === 'warn' && verboseAuth);

  if (printToConsole) {
    const prefix = `[Sojori][${entry.ts}][${tag}]`;
    if (level === 'error') {
      console.error(prefix, message, detail !== undefined ? detail : '');
    } else if (level === 'warn') {
      console.warn(prefix, message, detail !== undefined ? detail : '');
    } else {
      console.log(prefix, message, detail !== undefined ? detail : '');
    }
  }
}
