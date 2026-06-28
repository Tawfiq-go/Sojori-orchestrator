import type { PortfolioRow } from './_tokens';
import { MARKET_CACHE_CITY, marketBandAppliesToCityScope } from './cityScope';

/** Annonce Sojori active (flag listing Mongo). */
export function isActiveListing(row: PortfolioRow): boolean {
  return row.listingActive !== false;
}

/** Biens utiles en ops (hors OLD, démos, tests évidents) */
export function isExploitableListing(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  if (/^OLD\b/i.test(n) || /\bOLD\s*-/i.test(n)) return false;
  if (/^OLD\s+\d/i.test(n)) return false;
  if (/ray\s*demo/i.test(n)) return false;
  if (/^x\s*test\b/i.test(n)) return false;
  if (/test\s*listing/i.test(n) || /listing\s*test/i.test(n)) return false;
  if (/^listing\s+test\b/i.test(n)) return false;
  return true;
}

export type DataGapReason = 'ok' | 'no_airbnb' | 'no_snapshot' | 'staging';

export function getDataGapReason(row: PortfolioRow): DataGapReason {
  if (!isExploitableListing(row.listing.name)) return 'staging';
  const hasAirbnb = Boolean(row.listing.airbnbConnected && row.listing.airbnbListingId);
  if (!hasAirbnb) return 'no_airbnb';
  if (!row.hasAirroiSnapshot) return 'no_snapshot';
  return 'ok';
}

export const DATA_GAP_LABELS: Record<DataGapReason, string> = {
  ok: 'Complet',
  no_airbnb: 'Annonce à connecter',
  no_snapshot: '⟳ snapshot requis',
  staging: 'Hors prod',
};

export interface DataMaturityGauge {
  id: string;
  label: string;
  num: number;
  den: number;
  hint: string;
}

export interface DataMaturitySummary {
  scorePct: number;
  gauges: DataMaturityGauge[];
  todoCount: number;
  exploitableCount: number;
  scopedTotal: number;
}

export function computeDataMaturity(
  scopedRows: PortfolioRow[],
  marketFromCache: boolean,
  cityScope: string | null,
): DataMaturitySummary {
  const scopedTotal = scopedRows.length;
  const exploitable = scopedRows.filter((r) => isExploitableListing(r.listing.name));
  const exploitableCount = exploitable.length;
  const withAirbnb = exploitable.filter(
    (r) => r.listing.airbnbConnected && r.listing.airbnbListingId,
  ).length;
  const withSnapshot = exploitable.filter((r) => r.hasAirroiSnapshot).length;
  const marketReady = marketBandAppliesToCityScope(cityScope) && marketFromCache ? 1 : 0;
  const marketDen = marketBandAppliesToCityScope(cityScope) ? 1 : 0;

  const gauges: DataMaturityGauge[] = [
    {
      id: 'exploitable',
      label: 'Exploitables',
      num: exploitableCount,
      den: scopedTotal,
      hint: 'Hors OLD · test · démo',
    },
    {
      id: 'airbnb',
      label: 'Canal',
      num: withAirbnb,
      den: exploitableCount,
      hint: 'ID connecté (legacy channels)',
    },
    {
      id: 'snapshot',
      label: 'Snapshots marché',
      num: withSnapshot,
      den: withAirbnb || exploitableCount,
      hint: withAirbnb > 0 ? 'Parmi les annonces connectées' : 'Aucune annonce connectée dans la ville',
    },
  ];

  if (marketDen > 0) {
    gauges.push({
      id: 'market',
      label: `Marché · ${cityScope ?? MARKET_CACHE_CITY}`,
      num: marketReady,
      den: marketDen,
      hint: 'Cache après ⟳ marché',
    });
  }

  const ratios = gauges
    .filter((g) => g.den > 0)
    .map((g) => g.num / g.den);
  const scorePct = ratios.length
    ? Math.round((ratios.reduce((a, b) => a + b, 0) / ratios.length) * 100)
    : 0;

  const todoCount = exploitable.filter((r) => {
    const g = getDataGapReason(r);
    return g === 'no_airbnb' || g === 'no_snapshot';
  }).length;

  return { scorePct, gauges, todoCount, exploitableCount, scopedTotal };
}

export function rowMatchesTableTab(
  row: PortfolioRow,
  tab: 'operational' | 'audit' | 'todo',
): boolean {
  if (tab === 'audit') return true;
  const gap = getDataGapReason(row);
  if (tab === 'todo') return gap === 'no_airbnb' || gap === 'no_snapshot';
  if (tab === 'operational') return gap !== 'staging' && isActiveListing(row);
  return gap !== 'staging';
}
