import type { NotificationFacet } from './types';

/** Facettes agrégées par groupe sidebar (aligné design Claude / prototype). */
export const SIDEBAR_GROUP_FACETS: Record<string, NotificationFacet[]> = {
  Réservations: ['reservation'],
  Task: ['task', 'concierge'],
  Orchestration: ['orchestration', 'guest_journey'],
  'Inbox Guest': ['message', 'review', 'lead'],
  Finances: ['finance'],
};

/** Facettes par entrée de menu (sous-items avec facette dédiée). */
export const SIDEBAR_ITEM_FACETS: Record<string, NotificationFacet[]> = {
  reservations: ['reservation'],
  'reservations/planning': ['reservation'],
  payments: ['finance'],

  'tasks/list': ['task'],
  'tasks/planning': ['task'],
  'tasks/kanban': ['task'],

  // Orchestration : badge agrégé sur l'en-tête de groupe uniquement

  // message : badge sur le groupe Inbox Guest (WhatsApp + OTA partagent la facette)
  'comms/leads': ['lead'],
  'comms/reviews': ['review'],

  'finances/landlords': ['finance'],
  'finances/ledger': ['finance'],
  'finances/reports': ['finance'],
};

export function sumFacetCounts(
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
  facets: NotificationFacet[],
): number {
  if (!byFacet || !facets.length) return 0;
  return facets.reduce((sum, facet) => sum + (byFacet[facet] ?? 0), 0);
}

export function getSidebarGroupUnread(
  group: string,
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
): number {
  const facets = SIDEBAR_GROUP_FACETS[group];
  return facets ? sumFacetCounts(byFacet, facets) : 0;
}

export function getSidebarItemUnread(
  itemId: string,
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
): number {
  const facets = SIDEBAR_ITEM_FACETS[itemId];
  return facets ? sumFacetCounts(byFacet, facets) : 0;
}
