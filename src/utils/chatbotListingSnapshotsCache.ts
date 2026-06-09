export type ChatbotListingSnapshotRow = {
  listingId: string;
  name?: string;
  city?: string;
  country?: string;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  active?: boolean;
  snapshotUpdatedAt?: string;
};

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  rows: ChatbotListingSnapshotRow[];
  fetchedAt: number;
};

let cache: CacheEntry | null = null;

export function getCachedChatbotListingSnapshots(): ChatbotListingSnapshotRow[] | null {
  if (!cache) return null;
  if (Date.now() - cache.fetchedAt > TTL_MS) {
    cache = null;
    return null;
  }
  return cache.rows;
}

export function setCachedChatbotListingSnapshots(rows: ChatbotListingSnapshotRow[]): void {
  cache = { rows, fetchedAt: Date.now() };
}

export function invalidateChatbotListingSnapshotsCache(): void {
  cache = null;
}
