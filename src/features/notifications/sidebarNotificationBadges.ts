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

  'comms/leads': ['lead'],
  'comms/reviews': ['review'],

  'finances/landlords': ['finance'],
  'finances/ledger': ['finance'],
  'finances/reports': ['finance'],
};

/** Compteurs par eventKey (WhatsApp vs OTA dans Inbox Guest). */
export const SIDEBAR_ITEM_EVENT_KEYS: Record<string, string[]> = {
  'comms/guests': ['message:whatsapp_received'],
  'comms/ota': ['message:ota_received'],
};

export function sumFacetCounts(
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
  facets: NotificationFacet[],
): number {
  if (!byFacet || !facets.length) return 0;
  return facets.reduce((sum, facet) => sum + (byFacet[facet] ?? 0), 0);
}

export function sumEventKeyCounts(
  byEventKey: Partial<Record<string, number>> | undefined,
  eventKeys: string[],
): number {
  if (!byEventKey || !eventKeys.length) return 0;
  return eventKeys.reduce((sum, key) => sum + (byEventKey[key] ?? 0), 0);
}

export function getSidebarGroupUnread(
  group: string,
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
  byEventKey?: Partial<Record<string, number>> | undefined,
): number {
  const facets = SIDEBAR_GROUP_FACETS[group];
  if (!facets) return 0;

  if (group === 'Inbox Guest') {
    const ota = sumEventKeyCounts(byEventKey, ['message:ota_received']);
    const wa = sumEventKeyCounts(byEventKey, ['message:whatsapp_received']);
    const other = sumFacetCounts(byFacet, ['review', 'lead']);
    const fromEvents = ota + wa;
    if (fromEvents > 0 || (byEventKey && Object.keys(byEventKey).length > 0)) {
      return fromEvents + other;
    }
    return sumFacetCounts(byFacet, ['message', 'review', 'lead']);
  }

  return sumFacetCounts(byFacet, facets);
}

export function getSidebarItemUnread(
  itemId: string,
  byFacet: Partial<Record<NotificationFacet, number>> | undefined,
  byEventKey?: Partial<Record<string, number>> | undefined,
): number {
  const eventKeys = SIDEBAR_ITEM_EVENT_KEYS[itemId];
  if (eventKeys?.length) {
    const fromEvents = sumEventKeyCounts(byEventKey, eventKeys);
    if (fromEvents > 0 || (byEventKey && Object.keys(byEventKey).length > 0)) {
      return fromEvents;
    }
    return 0;
  }
  const facets = SIDEBAR_ITEM_FACETS[itemId];
  return facets ? sumFacetCounts(byFacet, facets) : 0;
}
