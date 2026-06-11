import type { OtaThreadRow } from '../components/unified-inbox/inboxOtaMappers';

const TTL_MS = 3 * 60 * 1000;

type CacheEntry = {
  rows: OtaThreadRow[];
  fetchedAt: number;
};

let store: CacheEntry | null = null;

export function getCachedOtaInbox(): OtaThreadRow[] | null {
  if (!store) return null;
  if (Date.now() - store.fetchedAt > TTL_MS) {
    store = null;
    return null;
  }
  return store.rows;
}

export function setCachedOtaInbox(rows: OtaThreadRow[]): void {
  store = { rows, fetchedAt: Date.now() };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('sojori:ota-inbox-updated', { detail: { count: rows.length } }),
    );
  }
}

export function invalidateOtaInboxCache(): void {
  store = null;
}
