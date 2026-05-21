import type { CompRow } from '../bien/CompsTable';

function median(sorted: number[]): number {
  if (!sorted.length) return 0;
  const s = [...sorted].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export type CompsMarketStats = {
  count: number;
  nearbyCount: number;
  occupancyMedianPct: number;
  adrMedianMad: number;
  revenueMedianMad: number;
  ratingMedian: number;
  distanceMedianM: number | null;
};

/** Agrégats TTM des comps marché (excl. ligne « vous »). */
export function computeCompsMarketStats(
  rows: CompRow[],
  opts?: { nearbyMaxMeters?: number },
): CompsMarketStats | null {
  const comps = rows.filter((r) => !r.isSelf);
  if (!comps.length) return null;

  const nearbyMax = opts?.nearbyMaxMeters ?? 1500;
  const occ = comps.map((c) => c.occupancyTtm).filter((v) => v > 0);
  const adr = comps.map((c) => c.adrTtm).filter((v) => v > 0);
  const rev = comps.map((c) => c.revenueTtm).filter((v) => v > 0);
  const ratings = comps.map((c) => c.rating).filter((v) => v > 0);
  const distances = comps
    .map((c) => c.distanceMeters)
    .filter((d): d is number => d != null && d >= 0);

  const nearbyCount = distances.filter((d) => d <= nearbyMax).length;

  return {
    count: comps.length,
    nearbyCount: nearbyCount || comps.length,
    occupancyMedianPct: occ.length ? Math.round(median(occ) * 100) : 0,
    adrMedianMad: adr.length ? median(adr) : 0,
    revenueMedianMad: rev.length ? median(rev) : 0,
    ratingMedian: ratings.length ? Math.round(median(ratings) * 100) / 100 : 0,
    distanceMedianM: distances.length ? median(distances) : null,
  };
}

export type SelfVsComps = {
  adrDeltaPct: number | null;
  occDeltaPts: number | null;
  revenueDeltaPct: number | null;
};

export function compareSelfToCompsMedian(
  self: CompRow | null,
  stats: CompsMarketStats | null,
): SelfVsComps {
  if (!self || !stats || stats.adrMedianMad <= 0) {
    return { adrDeltaPct: null, occDeltaPts: null, revenueDeltaPct: null };
  }
  const adrDeltaPct =
    self.adrTtm > 0
      ? Math.round(((self.adrTtm - stats.adrMedianMad) / stats.adrMedianMad) * 100)
      : null;
  const occDeltaPts =
    stats.occupancyMedianPct > 0 && self.occupancyTtm > 0
      ? Math.round(self.occupancyTtm * 100) - stats.occupancyMedianPct
      : null;
  const revenueDeltaPct =
    self.revenueTtm > 0 && stats.revenueMedianMad > 0
      ? Math.round(((self.revenueTtm - stats.revenueMedianMad) / stats.revenueMedianMad) * 100)
      : null;
  return { adrDeltaPct, occDeltaPts, revenueDeltaPct };
}
