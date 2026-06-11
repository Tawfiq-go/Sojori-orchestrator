/**
 * Navigation Business Channels — sens métier (entrant / sortant / brut / synthèse) puis domaine.
 * Les paramètres URL legacy (`biz`, `api`, `hook`) restent la source de vérité pour compat bookmarks.
 */

export type BusinessFlow =
  | 'out'
  | 'in-hook'
  | 'in-http'
  | 'stats-owner'
  | 'stats-listing';

const BIZ_TO_FLOW: Record<string, BusinessFlow> = {
  api: 'out',
  hooks: 'in-hook',
  logapi: 'in-http',
  owner: 'stats-owner',
  listing: 'stats-listing',
};

const FLOW_TO_BIZ: Record<BusinessFlow, string> = {
  out: 'api',
  'in-hook': 'hooks',
  'in-http': 'logapi',
  'stats-owner': 'owner',
  'stats-listing': 'listing',
};

export function businessFlowFromBiz(biz: string | null | undefined): BusinessFlow {
  return BIZ_TO_FLOW[(biz || 'api').toLowerCase()] ?? 'out';
}

export function bizFromBusinessFlow(flow: BusinessFlow): string {
  return FLOW_TO_BIZ[flow];
}

/** Niveau 2 — sens du flux */
export const BUSINESS_FLOW_NAV = [
  {
    flow: 'out' as const,
    label: 'Sortant → RU',
    hint: 'Appels API Sojori vers Rental United (ChannelRuApiCall)',
  },
  {
    flow: 'in-hook' as const,
    label: 'Entrant · webhooks',
    hint: 'Webhooks RU reçus, parsés (ingress)',
  },
  {
    flow: 'in-http' as const,
    label: 'Entrant · HTTP brut',
    hint: 'Journal HTTP brut Mongo logapis (avant analyse métier)',
  },
] as const;

/** Stats agrégées — séparées des flux bruts */
export const BUSINESS_STATS_NAV = [
  {
    flow: 'stats-owner' as const,
    label: 'Synthèse · Owner',
    hint: 'Volumes agrégés par propriétaire PM',
  },
  {
    flow: 'stats-listing' as const,
    label: 'Synthèse · Annonces',
    hint: 'Volumes agrégés par annonce (listing)',
  },
] as const;

/** Niveau 3 — domaines sortants (param `api`) */
export const OUTBOUND_DOMAIN_NAV = [
  { seg: 'm', label: 'Messages', hint: 'Messagerie REST RU (cron owner)' },
  { seg: 'r', label: 'Réservations', hint: 'Push/pull réservations vers RU' },
  { seg: 'c', label: 'Calendrier', hint: 'Prix, dispo, restrictions' },
  { seg: 'l', label: 'Annonces RU', hint: 'Push/Pull propriété, sync OTA, import — pas les stats' },
  { seg: 'rev', label: 'Reviews', hint: 'Avis invités' },
  { seg: 'lead', label: 'Leads', hint: 'Pull_GetLeads, LNM sortant' },
  { seg: 'o', label: 'OAuth', hint: 'Tokens PMS white-label (srv-user)' },
  { seg: 'u', label: 'User', hint: 'Utilisateurs RU (Pull_ListMyUsers…)' },
  { seg: 'd', label: 'Distribution', hint: 'Canaux OTA, statut propriétés CM' },
] as const;

/** Niveau 3 — domaines webhooks entrants (param `hook`) */
export const INBOUND_HOOK_DOMAIN_NAV = [
  { seg: 'm', label: 'Messages', hint: 'Threads / messages RU entrants' },
  { seg: 'r', label: 'Réservations', hint: 'Réservations webhook RU' },
  { seg: 'lead', label: 'Leads', hint: 'LNM leads entrants' },
] as const;

export type OutboundSeg = (typeof OUTBOUND_DOMAIN_NAV)[number]['seg'];
export type InboundHookSeg = (typeof INBOUND_HOOK_DOMAIN_NAV)[number]['seg'];
