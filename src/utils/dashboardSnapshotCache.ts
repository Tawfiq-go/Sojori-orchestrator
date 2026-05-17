import type { DashboardPeriod, DashboardSnapshot } from '../types/dashboard.types';

const PREFIX = 'sojori-dashboard-v1:';

function cacheKey(period: DashboardPeriod, listingIds: string[]) {
  const ids = [...listingIds].sort().join(',');
  return `${PREFIX}${period}:${ids}`;
}

export function readDashboardSnapshotCache(
  period: DashboardPeriod,
  listingIds: string[],
): DashboardSnapshot | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(period, listingIds));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as {
      savedAt: number;
      snapshot: DashboardSnapshot;
      /** true = core + extras déjà fusionnés (évite flash 0 puis données). */
      hydrated?: boolean;
    };
    if (Date.now() - parsed.savedAt > 5 * 60_000) {
      sessionStorage.removeItem(cacheKey(period, listingIds));
      return null;
    }
    if (!parsed.hydrated) {
      return null;
    }
    return parsed.snapshot;
  } catch {
    return null;
  }
}

export function writeDashboardSnapshotCache(
  period: DashboardPeriod,
  listingIds: string[],
  snapshot: DashboardSnapshot,
): void {
  try {
    sessionStorage.setItem(
      cacheKey(period, listingIds),
      JSON.stringify({ savedAt: Date.now(), snapshot, hydrated: true }),
    );
  } catch {
    // quota / private mode
  }
}
