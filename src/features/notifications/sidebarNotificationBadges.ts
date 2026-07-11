import type { NotificationFacet } from './types';
import {
  WHATSAPP_GUEST_SIDEBAR_EVENT_KEYS,
} from './constants';
import type { NotificationItem } from './types';

/** Agrège les notifs « en cours » — 1 ligne panneau = 1 badge (pas le ×N agrégé). */
export function aggregateActiveNotificationCounts(
  items: Pick<NotificationItem, 'eventKey' | 'facet' | 'aggregatedCount'>[],
): {
  byFacet: Partial<Record<NotificationFacet, number>>;
  byEventKey: Partial<Record<string, number>>;
} {
  const byFacet: Partial<Record<NotificationFacet, number>> = {};
  const byEventKey: Partial<Record<string, number>> = {};
  for (const n of items) {
    const facet = n.facet as NotificationFacet;
    byFacet[facet] = (byFacet[facet] ?? 0) + 1;
    byEventKey[n.eventKey] = (byEventKey[n.eventKey] ?? 0) + 1;
  }
  return { byFacet, byEventKey };
}

/** Facettes agrégées par groupe sidebar. */
export const SIDEBAR_GROUP_FACETS: Record<string, NotificationFacet[]> = {
  Réservations: ['reservation'],
  Task: ['task', 'concierge'],
  Orchestration: ['orchestration'],
  'Inbox Guest': ['message', 'guest_journey', 'review', 'lead'],
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
  'comms/guests': [...WHATSAPP_GUEST_SIDEBAR_EVENT_KEYS],
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
    const waInbox = sumEventKeyCounts(byEventKey, [...WHATSAPP_GUEST_SIDEBAR_EVENT_KEYS]);
    const ota = sumEventKeyCounts(byEventKey, ['message:ota_received']);
    const reviewLead = sumFacetCounts(byFacet, ['review', 'lead']);
    if (waInbox + ota > 0) return waInbox + ota + reviewLead;
    return sumFacetCounts(byFacet, ['message', 'guest_journey', 'review', 'lead']);
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
    if (fromEvents > 0) return fromEvents;
    if (itemId === 'comms/guests') {
      return sumFacetCounts(byFacet, ['message', 'guest_journey']);
    }
    if (itemId === 'comms/ota') {
      return sumFacetCounts(byFacet, ['message']);
    }
    return 0;
  }
  const facets = SIDEBAR_ITEM_FACETS[itemId];
  return facets ? sumFacetCounts(byFacet, facets) : 0;
}
