import type { Reservation } from '../types/reservations.types';

const TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  data: Reservation;
  fetchedAt: number;
};

const store = new Map<string, CacheEntry>();

export function getCachedReservationDetail(id: string): Reservation | null {
  const hit = store.get(id);
  if (!hit) return null;
  if (Date.now() - hit.fetchedAt > TTL_MS) {
    store.delete(id);
    return null;
  }
  return hit.data;
}

export function setCachedReservationDetail(id: string, data: Reservation): void {
  store.set(id, { data, fetchedAt: Date.now() });
}

export function invalidateReservationDetailCache(id?: string): void {
  if (id) store.delete(id);
  else store.clear();
}
