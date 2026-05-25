import type { CalendarDay } from '../bien/YearlyCalendar';

export type PriceTier = 'low' | 'mid' | 'high';

export type CalendarPricingSource = 'airroi' | 'sojori' | 'estimate';

/** Tiers relatifs sur la fenêtre affichée (tertiles des prix > 0). */
export function computePriceTierThresholds(prices: number[]): { lowMax: number; midMax: number } | null {
  const sorted = prices.filter((p) => p > 0).sort((a, b) => a - b);
  if (sorted.length < 3) return null;
  const q = (p: number) => {
    const idx = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)));
    return sorted[idx];
  };
  return { lowMax: q(0.33), midMax: q(0.66) };
}

export function priceToTier(
  priceMad: number,
  thresholds: { lowMax: number; midMax: number } | null,
): PriceTier {
  if (!thresholds || priceMad <= 0) return 'mid';
  if (priceMad <= thresholds.lowMax) return 'low';
  if (priceMad <= thresholds.midMax) return 'mid';
  return 'high';
}

export function enrichDaysWithPriceTiers(days: CalendarDay[]): CalendarDay[] {
  const thresholds = computePriceTierThresholds(days.map((d) => d.recommendedPrice));
  return days.map((d) => {
    if (d.status === 'blocked' || d.recommendedPrice <= 0) {
      return { ...d, priceTier: undefined };
    }
    return { ...d, priceTier: priceToTier(d.recommendedPrice, thresholds) };
  });
}

export function countExpectedDaysInWindow(startIso: string, endIsoExclusive: string): number {
  let n = 0;
  let cur = startIso;
  while (cur < endIsoExclusive) {
    n += 1;
    const [y, m, d] = cur.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + 1);
    cur = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  }
  return n;
}
