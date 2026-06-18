import { ensureDashboardSnapshot, finalizeDashboardSnapshot } from '../services/dashboardV1Service';
import type { DashboardPeriod, DashboardSnapshot } from '../types/dashboard.types';

/** v9 : chargement fast + charts progressif. */
const PREFIX = 'sojori-dashboard-v10:';

function cacheKey(period: DashboardPeriod, listingIds: string[], ownerId?: string | null) {
  const ids = [...listingIds].sort().join(',');
  const owner = ownerId ? String(ownerId) : 'scoped';
  return `${PREFIX}${owner}:${period}:${ids}`;
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
    if (ageMs > 5 * 60_000) {
      sessionStorage.removeItem(cacheKey(period, listingIds, ownerId));
      return null;
    }
    if (!parsed.hydrated) {
      return null;
    }
    return {
      snapshot: finalizeDashboardSnapshot(ensureDashboardSnapshot(parsed.snapshot)),
      savedAt: parsed.savedAt,
      ageMs,
      hydrated: true,
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
