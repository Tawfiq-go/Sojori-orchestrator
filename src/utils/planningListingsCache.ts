import type { ListingSummary } from '../types/listings.types';

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  items: ListingSummary[];
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

export function getCachedPlanningListings(ownerKey: string): ListingSummary[] | null {
  const hit = store.get(ownerKey);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL_MS) {
    store.delete(ownerKey);
    return null;
  }
  return hit.items;
}

export function setCachedPlanningListings(ownerKey: string, items: ListingSummary[]): void {
  store.set(ownerKey, { items, fetchedAt: Date.now() });
}

export function invalidatePlanningListingsCache(ownerKey?: string): void {
  if (ownerKey) store.delete(ownerKey);
  else store.clear();
}
