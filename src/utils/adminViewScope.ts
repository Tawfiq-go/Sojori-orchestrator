import { getPmSimulationOwnerId } from './pmSimulationSession';

/**
 * Scope automatique des appels API en vue owner (2026-09-03).
 *
 * Le backend borne un Owner à ses données d'après le JWT, mais laisse passer
 * n'importe quel `ownerId` venant d'un admin — et sans `ownerId`, il renvoie
 * la plateforme entière. Jusqu'ici chaque page devait penser à l'ajouter ;
 * les commits « même bug, 7e endroit » montrent que c'est intenable.
 *
 * Ici, quand un owner est sélectionné dans la vue, tout GET vers une API de
 * données reçoit `ownerId=<owner>` s'il n'en porte pas déjà. Les routes qui
 * lisent `filterOwnerId` le reçoivent aussi. Une page qui a déjà posé son
 * scope n'est pas touchée. Un paramètre de requête ne déclenche pas de
 * preflight CORS, contrairement à l'en-tête qui avait été tenté.
 */

/** Familles d'API qui servent des données owner. `/user/` (comptes, auth) exclu. */
const SCOPED_API_PREFIXES = [
  '/api/v1/reservations',
  '/api/v1/listing',
  '/api/v1/calendar',
  '/api/v1/admin',
  '/api/v1/ai',
  '/api/v1/fulltask',
  '/api/v1/pricing',
  '/api/v1/channels',
  '/api/v1/crm',
  '/api/v1/orchestrator',
];

const OWNER_PARAM_KEYS = ['ownerId', 'owner_id', 'filterOwnerId', 'filterOwnerId[]'];

function pathnameOf(url: string): string {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname;
  } catch {
    return url.split('?')[0];
  }
}

export function isScopedApiPath(url: string | undefined): boolean {
  if (!url) return false;
  const path = pathnameOf(url);
  return SCOPED_API_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`));
}

function hasOwnerParam(url: string, params: unknown): boolean {
  if (params && typeof params === 'object') {
    for (const k of OWNER_PARAM_KEYS) {
      const v = (params as Record<string, unknown>)[k];
      if (v != null && String(v) !== '') return true;
    }
  }
  const q = url.includes('?') ? url.slice(url.indexOf('?') + 1) : '';
  if (!q) return false;
  const sp = new URLSearchParams(q);
  return OWNER_PARAM_KEYS.some((k) => (sp.get(k) || '').trim() !== '');
}

export type ScopableRequest = {
  method?: string;
  url?: string;
  params?: unknown;
  /** Opt-out explicite : les appels qui listent les owners eux-mêmes, etc. */
  skipViewScope?: boolean;
};

/**
 * Ajoute le scope de la vue à une config axios (GET uniquement). Retourne la
 * config, modifiée en place. Sans vue active, ne fait rien.
 */
export function applyAdminViewScope<T extends ScopableRequest>(config: T): T {
  const viewOwnerId = getPmSimulationOwnerId();
  if (!viewOwnerId) return config;
  if (config.skipViewScope) return config;
  if (String(config.method || 'get').toLowerCase() !== 'get') return config;
  const url = String(config.url || '');
  if (!isScopedApiPath(url)) return config;
  if (hasOwnerParam(url, config.params)) return config;

  if (config.params && typeof config.params === 'object' && !(config.params instanceof URLSearchParams)) {
    (config.params as Record<string, unknown>).ownerId = viewOwnerId;
    (config.params as Record<string, unknown>).filterOwnerId = viewOwnerId;
    return config;
  }
  const sep = url.includes('?') ? '&' : '?';
  config.url = `${url}${sep}ownerId=${encodeURIComponent(viewOwnerId)}&filterOwnerId=${encodeURIComponent(viewOwnerId)}`;
  return config;
}
