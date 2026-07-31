/**
 * LogApiMews — métadonnées UI (catégories, codes HTTP, libellés actions).
 */
import type { LogApiMewsCategory } from '../../services/logApiMewsApi';

export const MEWS_CATEGORIES: Record<
  LogApiMewsCategory,
  { label: string; color: string; tint: string; icon: string }
> = {
  configuration: { label: 'Config', color: '#0673b3', tint: 'rgba(6,115,179,0.12)', icon: '⚙️' },
  listing: { label: 'Resources', color: '#8B5CF6', tint: 'rgba(139,92,246,0.12)', icon: '🏨' },
  availability: { label: 'Dispo', color: '#B8881A', tint: 'rgba(184,136,26,0.12)', icon: '📅' },
  reservation: { label: 'Réservations', color: '#0a8f5e', tint: 'rgba(10,143,94,0.12)', icon: '🗓' },
  webhook: { label: 'Webhooks', color: '#06B6D4', tint: 'rgba(6,182,212,0.12)', icon: '⚡' },
  other: { label: 'Autres', color: '#a8a299', tint: 'rgba(168,162,153,0.12)', icon: '📦' },
};

/** Alias pour composants clonés qui importent encore RU_CATEGORIES */
export const RU_CATEGORIES = MEWS_CATEGORIES;

export const CATEGORY_ORDER: LogApiMewsCategory[] = [
  'configuration',
  'listing',
  'availability',
  'reservation',
  'webhook',
  'other',
];

export const MEWS_CODES: Record<
  string,
  { label: string; tone: 'success' | 'warning' | 'error'; hint?: string }
> = {
  '200': { label: 'OK', tone: 'success' },
  '201': { label: 'Créé', tone: 'success' },
  '202': { label: 'Accepté', tone: 'success', hint: 'Webhook ACK, traitement asynchrone' },
  '208': { label: 'Déjà traité', tone: 'success', hint: 'Retry webhook idempotent' },
  '400': { label: 'Bad request', tone: 'error', hint: 'Payload / TimeUnit / filtre invalide' },
  '401': { label: 'Unauthorized', tone: 'error', hint: 'Tokens Mews' },
  '403': { label: 'Forbidden', tone: 'error', hint: 'Scope Connector' },
  '404': { label: 'Not found', tone: 'error' },
  '429': {
    label: 'Rate limit',
    tone: 'warning',
    hint: 'Retry-After — le client Mews retry automatiquement',
  },
  '500': { label: 'Erreur Mews', tone: 'error' },
  ERROR: { label: 'Erreur', tone: 'error' },
};

export const RU_CODES = MEWS_CODES;

export const ACTION_LABELS: Record<string, string> = {
  '/configuration/get': 'Configuration enterprise',
  '/resources/getAll': 'Resources / catégories / features',
  '/images/getUrls': 'URLs images CDN',
  '/services/getAll': 'Services bookables',
  '/services/getAvailability': 'Disponibilités',
  '/restrictions/getAll': 'Restrictions (min/max stay)',
  '/reservations/getAll': 'Pull réservations',
  '/reservations/getAll/2023-06-06': 'Hydratation réservation webhook',
  '/customers/getAll': 'Profils guests',
  '/reservations/add': 'Créer réservation',
  '/reservations/update': 'Modifier réservation',
  '/reservations/cancel': 'Annuler réservation',
  '/webhook/mews': 'Webhook entrant Mews',
  '/webhook/mews/general': 'General Webhook entrant',
  '/webhook/mews/integration': 'Integration Webhook entrant',
};

export const MEWS_PERIODS = [
  { id: '6h', hours: 6, label: '6 h' },
  { id: '24h', hours: 24, label: '24 h' },
  { id: '72h', hours: 72, label: '3 j' },
  { id: '7d', hours: 168, label: '7 j' },
  { id: '30d', hours: 720, label: '30 j' },
];

export const RU_PERIODS = MEWS_PERIODS;

export function clockTime(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function fmtN(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Math.round(Number(n)).toLocaleString('fr-FR');
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] || action;
}

export type UiStatus = 'success' | 'warning' | 'error';

/** Seuil « lent » Mews Connector (> 10s), identique au backend. */
export const MEWS_SLOW_MS = 10_000;
export const RU_SLOW_MS = MEWS_SLOW_MS;

export function uiStatus(
  status: string,
  statusCode: string,
  responseTime?: number | null,
): UiStatus {
  if (statusCode === '429') return 'warning';
  if (status === 'success') {
    if (typeof responseTime === 'number' && responseTime > MEWS_SLOW_MS) return 'warning';
    return 'success';
  }
  return 'error';
}

export function uiStatusLabel(status: UiStatus, statusCode?: string): string {
  if (status === 'success') return 'Succès';
  if (status === 'error') return 'Échec';
  if (statusCode === '429') return 'Rate limit';
  return 'Lent';
}

export function msClass(ms: number | null | undefined): string {
  if (ms == null) return '';
  if (ms > MEWS_SLOW_MS) return 'slow';
  if (ms > 2000) return 'warn';
  return '';
}

export type UiDir = 'push' | 'pull' | 'webhook';

export function actionDir(action: string): UiDir {
  const a = String(action || '').toLowerCase();
  if (a.includes('webhook')) return 'webhook';
  if (a.includes('/add') || a.includes('/update') || a.includes('/cancel') || a.includes('/price')) {
    return 'push';
  }
  return 'pull';
}

export function relTime(iso: string, now: Date = new Date()): string {
  const diff = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '—';
  if (diff < 60) return `il y a ${Math.max(1, Math.round(diff))} s`;
  if (diff < 3600) return `il y a ${Math.round(diff / 60)} min`;
  if (diff < 86400) return `il y a ${Math.round(diff / 3600)} h`;
  return `il y a ${Math.round(diff / 86400)} j`;
}

export function absTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

const ESC_MAP: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
export const escHtml = (s: string): string => String(s).replace(/[&<>"]/g, (c) => ESC_MAP[c]);

export function highlightXml(xml: string): string {
  let s = escHtml(xml);
  s = s.replace(/(&lt;\?[\s\S]*?\?&gt;)/g, '<span class="xdecl">$1</span>');
  s = s.replace(
    /(&lt;\/?)([\w:.-]+)((?:\s+[\w:.-]+=&quot;[^&]*&quot;)*)(\s*\/?&gt;)/g,
    (_m, o: string, tag: string, attrs: string, close: string) => {
      const a = attrs.replace(
        /([\w:.-]+)(=)(&quot;[^&]*&quot;)/g,
        '<span class="xattr">$1</span>$2<span class="xval">$3</span>',
      );
      return `<span class="xtag">${o}${tag}</span>${a}<span class="xtag">${close}</span>`;
    },
  );
  return s;
}

export function highlightJson(json: string): string {
  let s = escHtml(json);
  s = s.replace(/(&quot;[\w-]+&quot;)(\s*:)/g, '<span class="jkey">$1</span>$2');
  s = s.replace(/:(\s*)(&quot;[^&]*&quot;)/g, ':$1<span class="jstr">$2</span>');
  s = s.replace(/:(\s*)(-?\d+\.?\d*)/g, ':$1<span class="jnum">$2</span>');
  s = s.replace(/:(\s*)(true|false|null)/g, ':$1<span class="jbool">$2</span>');
  return s;
}
