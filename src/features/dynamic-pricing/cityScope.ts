// Normalisation ville Sojori + filtrage portefeuille Dynamic Pricing
import type { PortfolioRow } from './_tokens';

/** Clé canonique pour regrouper Marrakech / Marrakesh / Marrackech */
export function normalizeCityKey(city: string | null | undefined): string {
  const raw = (city ?? '').trim();
  if (!raw) return '—';
  const lower = raw.toLowerCase();
  if (lower.includes('marrakech') || lower.includes('marrakesh') || lower === 'marrackech') {
    return 'Marrakech';
  }
  if (lower.includes('casablanca') || lower === 'cfc') return 'Casablanca';
  return raw;
}

export function listingMatchesCityScope(
  listingCity: string | null | undefined,
  scope: string | null,
): boolean {
  if (!scope) return true;
  return normalizeCityKey(listingCity) === scope;
}

export interface CityScopeOption {
  id: string;
  label: string;
  count: number;
  /** Libellés bruts en base (ex. Marrackech) */
  rawLabels: string[];
}

export function buildCityScopeOptions(rows: PortfolioRow[]): CityScopeOption[] {
  const byKey = new Map<string, { count: number; raw: Set<string> }>();
  for (const r of rows) {
    const raw = (r.listing.city ?? '').trim() || '—';
    const key = normalizeCityKey(raw);
    const cur = byKey.get(key) ?? { count: 0, raw: new Set<string>() };
    cur.count += 1;
    if (raw && raw !== '—') cur.raw.add(raw);
    byKey.set(key, cur);
  }
  const cities = Array.from(byKey.entries())
    .filter(([k]) => k !== '—')
    .sort((a, b) => b[1].count - a[1].count)
    .map(([id, { count, raw }]) => ({
      id,
      label: id,
      count,
      rawLabels: Array.from(raw).sort(),
    }));
  return [
    { id: '__all__', label: 'Tous les biens', count: rows.length, rawLabels: [] },
    ...cities,
  ];
}

/** Portefeuille : pas de ville par défaut — « Tous les biens » (null). */
export function pickDefaultCityScope(_rows: PortfolioRow[]): string | null {
  return null;
}

export interface CityScopeStats {
  total: number;
  withAirbnb: number;
  withSnapshot: number;
  withoutSnapshot: number;
  ttmRevenueUsd: number;
}

export function computeCityScopeStats(rows: PortfolioRow[]): CityScopeStats {
  let withAirbnb = 0;
  let withSnapshot = 0;
  let ttm = 0;
  for (const r of rows) {
    if (r.listing.airbnbConnected && r.listing.airbnbListingId) withAirbnb += 1;
    if (r.hasAirroiSnapshot) {
      withSnapshot += 1;
      const rev = r.airroiRaw?.ttm_revenue;
      if (typeof rev === 'number' && Number.isFinite(rev)) ttm += rev;
    }
  }
  return {
    total: rows.length,
    withAirbnb,
    withSnapshot,
    withoutSnapshot: rows.length - withSnapshot,
    ttmRevenueUsd: Math.round(ttm),
  };
}

/** Ville pilote avec cache marché (⟳ modal) */
export const MARKET_CACHE_CITIES = ['Marrakech', 'Casablanca'] as const;
export const MARKET_CACHE_CITY = 'Marrakech';

export function marketBandAppliesToCityScope(scope: string | null): boolean {
  if (!scope) return false;
  const key = normalizeCityKey(scope);
  return (MARKET_CACHE_CITIES as readonly string[]).includes(key);
}
