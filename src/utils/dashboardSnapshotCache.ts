import { ensureDashboardSnapshot, finalizeDashboardSnapshot } from '../services/dashboardV1Service';
import type { DashboardPeriod, DashboardSnapshot } from '../types/dashboard.types';

/** v11 : fast partial cache + listingIdsHint persistés par owner. */
const PREFIX = 'sojori-dashboard-v11:';
const HINTS_PREFIX = 'sojori-dashboard-hints-v1:';

const SNAPSHOT_TTL_MS = 5 * 60_000;
const HINTS_TTL_MS = 30 * 60_000;

function cacheKey(period: DashboardPeriod, listingIds: string[], ownerId?: string | null) {
  const ids = [...listingIds].sort().join(',');
  const owner = ownerId ? String(ownerId) : 'scoped';
  return `${PREFIX}${owner}:${period}:${ids}`;
}

function hintsCacheKey(ownerId?: string | null) {
  const owner = ownerId ? String(ownerId) : 'scoped';
  return `${HINTS_PREFIX}${owner}`;
}

export function readDashboardListingIdsHint(ownerId?: string | null): string[] {
  try {
    const raw = sessionStorage.getItem(hintsCacheKey(ownerId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { savedAt: number; ids: string[] };
    if (Date.now() - parsed.savedAt > HINTS_TTL_MS) {
      sessionStorage.removeItem(hintsCacheKey(ownerId));
      return [];
    }
    return Array.isArray(parsed.ids) ? parsed.ids.filter(Boolean).slice(0, 50) : [];
  } catch {
    return [];
  }
}

export function writeDashboardListingIdsHint(ownerId: string | null | undefined, ids: string[]): void {
  try {
    const unique = [...new Set(ids.filter(Boolean))].slice(0, 50);
    if (unique.length === 0) return;
    sessionStorage.setItem(
      hintsCacheKey(ownerId),
      JSON.stringify({ savedAt: Date.now(), ids: unique }),
    );
  } catch {
    // quota / private mode
  }
}

export function readDashboardSnapshotCache(
  period: DashboardPeriod,
  listingIds: string[],
  ownerId?: string | null,
): DashboardSnapshot | null {
  return readDashboardSnapshotCacheEntry(period, listingIds, ownerId)?.snapshot ?? null;
}

export type DashboardSnapshotCacheEntry = {
  snapshot: DashboardSnapshot;
  savedAt: number;
  ageMs: number;
  hydrated: boolean;
};

export function readDashboardSnapshotCacheEntry(
  period: DashboardPeriod,
  listingIds: string[],
  ownerId?: string | null,
  options?: { includePartial?: boolean },
): DashboardSnapshotCacheEntry | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(period, listingIds, ownerId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      snapshot: DashboardSnapshot;
      hydrated?: boolean;
    };
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > SNAPSHOT_TTL_MS) {
      sessionStorage.removeItem(cacheKey(period, listingIds, ownerId));
      return null;
    }
    const hydrated = parsed.hydrated !== false;
    if (!hydrated && !options?.includePartial) {
      return null;
    }
    return {
      snapshot: finalizeDashboardSnapshot(ensureDashboardSnapshot(parsed.snapshot)),
      savedAt: parsed.savedAt,
      ageMs,
      hydrated,
    };
  } catch {
    return null;
  }
}

/** `hydrated: false` = core seul (ne pas réutiliser au prochain chargement). */
export function writeDashboardSnapshotCache(
  period: DashboardPeriod,
  listingIds: string[],
  snapshot: DashboardSnapshot,
  ownerId?: string | null,
  hydrated = true,
): void {
  try {
    sessionStorage.setItem(
      cacheKey(period, listingIds, ownerId),
      JSON.stringify({
        savedAt: Date.now(),
        snapshot: ensureDashboardSnapshot(snapshot),
        hydrated,
      }),
    );
  } catch {
    // quota / private mode
  }
}

/** Invalide les snapshots dashboard pour un owner (ex. démarrage simulation PM). */
export function clearDashboardSnapshotCacheForOwner(ownerId?: string | null): void {
  const owner = ownerId ? String(ownerId) : 'scoped';
  const prefix = `${PREFIX}${owner}:`;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => sessionStorage.removeItem(key));
    sessionStorage.removeItem(hintsCacheKey(ownerId));
  } catch {
    // quota / private mode
  }
}
