/**
 * Navigation Business Channels — 2 niveaux : API | Webhooks + domaines.
 * HTTP brut → Debug. Volumes → Summary.
 */

export type BusinessSection = 'api' | 'hooks';

/** @deprecated */
export type BusinessFlow = 'out' | 'in-hook' | 'in-http' | 'owner-ru' | 'stats-owner' | 'stats-listing';

export function businessSectionFromBiz(biz: string | null | undefined): BusinessSection {
  const b = (biz || 'api').toLowerCase();
  if (b === 'hooks') return 'hooks';
  return 'api';
}

/** @deprecated */
export function businessFlowFromBiz(biz: string | null | undefined): BusinessFlow {
  const b = (biz || 'api').toLowerCase();
  if (b === 'hooks') return 'in-hook';
  if (b === 'logapi') return 'in-http';
  if (b === 'owner-vol') return 'stats-owner';
  if (b === 'listing') return 'stats-listing';
  if (b === 'owner') return 'owner-ru';
  return 'out';
}

/** @deprecated */
export function bizFromBusinessFlow(flow: BusinessFlow): string {
  const map: Record<BusinessFlow, string> = {
    out: 'api',
    'in-hook': 'hooks',
    'in-http': 'logapi',
    'owner-ru': 'owner',
    'stats-owner': 'owner-vol',
    'stats-listing': 'listing',
  };
  return map[flow];
}

/** Niveau 1 Business */
export const BUSINESS_LEVEL1_NAV = [
  {
    section: 'api' as const,
    label: 'API',
    hint: 'Appels Sojori → Rental United (push, pull, REST cron)',
  },
  {
    section: 'hooks' as const,
    label: 'Webhooks',
    hint: 'Notifications RU reçues et parsées (ingress)',
  },
] as const;

/** Niveau 2 — domaines API (`api=`) */
export const API_DOMAIN_NAV = [
  { seg: 'r', label: 'Réservations', hint: 'Push/pull réservations vers RU' },
  { seg: 'c', label: 'Calendrier', hint: 'Prix, dispo, restrictions' },
  { seg: 'owner', label: 'Owner', hint: 'Création / archive compte RU' },
  { seg: 'm', label: 'Messages', hint: 'Pull REST messagerie (cron owner)' },
  { seg: 'lead', label: 'Leads', hint: 'Pull_GetLeads (cron owner)' },
  { seg: 'rev', label: 'Reviews', hint: 'Pull REST avis invités' },
  { seg: 'l', label: 'Propriétés', hint: 'Push/Pull annonces, sync OTA, import' },
  { seg: 'd', label: 'Distribution', hint: 'Canaux OTA, statut propriétés CM' },
  { seg: 'o', label: 'OAuth', hint: 'Tokens PMS white-label' },
] as const;

/** Niveau 2 — webhooks (`hook=`) */
export const WEBHOOK_DOMAIN_NAV = [
  { seg: 'm', label: 'Messages', hint: 'Threads / messages entrants' },
  { seg: 'rev', label: 'Reviews', hint: 'Avis invités (GuestReview / AirbnbGuestReview)' },
  { seg: 'r', label: 'Réservations', hint: 'Création / modification / annulation' },
  { seg: 'lead', label: 'Leads', hint: 'LNM leads entrants' },
] as const;

/** Niveau 2 — Summary volumes (`sumView=`) */
export const SUMMARY_VIEW_NAV = [
  { view: 'kpi', label: 'KPIs', hint: 'Vue d’ensemble agrégée (webhooks + API)' },
  { view: 'owner-vol', label: 'Par owner', hint: 'Tous appels agrégés par PM' },
  { view: 'listing', label: 'Par annonce', hint: 'Volumes par listing' },
] as const;

export type SummaryView = (typeof SUMMARY_VIEW_NAV)[number]['view'];

export function summaryViewFromParams(sp: { get: (k: string) => string | null }): SummaryView {
  const sv = (sp.get('sumView') || sp.get('biz') || 'kpi').toLowerCase();
  if (sv === 'owner-vol' || sv === 'owner') return 'owner-vol';
  if (sv === 'listing') return 'listing';
  return 'kpi';
}

/** @deprecated */
export const OUTBOUND_DOMAIN_NAV = API_DOMAIN_NAV;
/** @deprecated */
export const INBOUND_HOOK_DOMAIN_NAV = WEBHOOK_DOMAIN_NAV;
/** @deprecated */
export const BUSINESS_FLOW_NAV = BUSINESS_LEVEL1_NAV.map((x) => ({
  flow: (x.section === 'api' ? 'out' : 'in-hook') as BusinessFlow,
  label: x.label,
  hint: x.hint,
}));
/** @deprecated */
export const STATS_DOMAIN_NAV = SUMMARY_VIEW_NAV.filter((x) => x.view !== 'kpi');

export type ApiDomainSeg = (typeof API_DOMAIN_NAV)[number]['seg'];
export type WebhookDomainSeg = (typeof WEBHOOK_DOMAIN_NAV)[number]['seg'];
export type OutboundSeg = ApiDomainSeg;
export type InboundHookSeg = WebhookDomainSeg;

export function level1NavDefaults(
  section: BusinessSection,
  apiSeg: string,
  hookSeg: string,
): Record<string, string | undefined> {
  if (section === 'api') {
    const api = apiSeg === 'g' || !apiSeg ? 'r' : apiSeg;
    return { tab: 'Business', biz: 'api', api, hook: undefined, docId: undefined };
  }
  return { tab: 'Business', biz: 'hooks', hook: hookSeg || 'm', api: undefined, docId: undefined };
}
