import type {
  PacingPoint,
  SeasonalityPoint,
  SupplyGrowthPoint,
} from '../bien/MarketCharts';

export type MarketChartsApi = {
  seasonality?: Array<{ month: string; occupancy: number; adr: number }>;
  pacing?: Array<{ month: string; fillRate: number }>;
  supplyGrowth?: Array<{ label: string; listingCount: number }>;
};

export function chartsFromApi(raw: MarketChartsApi | null | undefined): {
  seasonality: SeasonalityPoint[];
  pacing: PacingPoint[];
  supplyGrowth: SupplyGrowthPoint[];
  hasCharts: boolean;
} {
  const seasonality = (raw?.seasonality ?? []).map((p) => ({
    month: p.month,
    occupancy: p.occupancy,
    adr: p.adr,
  }));
  const pacing = (raw?.pacing ?? []).map((p) => ({
    month: p.month,
    fillRate: p.fillRate,
  }));
  const supplyGrowth = (raw?.supplyGrowth ?? []).map((p) => ({
    label: p.label,
    listingCount: p.listingCount,
  }));
  return {
    seasonality,
    pacing,
    supplyGrowth,
    hasCharts: seasonality.length > 0 || pacing.length > 0 || supplyGrowth.length > 0,
  };
}
