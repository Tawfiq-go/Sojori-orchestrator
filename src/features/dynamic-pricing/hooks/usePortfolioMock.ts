import { useMemo } from 'react';
import type { MarketCityKpis, PortfolioZoneStats } from '../PortfolioView';
import type { PortfolioMapPin } from '../PortfolioMap';
import type { PortfolioMacro, PortfolioRow } from '../_tokens';
import type { SeasonalityPoint, PacingPoint, SupplyGrowthPoint } from '../bien/MarketCharts';
import {
  buildCityKpis,
  buildMapPins,
  buildPortfolioMacro,
  buildPortfolioRows,
  buildZoneStats,
} from './mockData';

export interface PortfolioMockData {
  macro: PortfolioMacro;
  cityKpis: MarketCityKpis;
  zoneStats: Record<string, PortfolioZoneStats>;
  mapPins: PortfolioMapPin[];
  rows: PortfolioRow[];
  marketCharts?: {
    seasonality: SeasonalityPoint[];
    pacing: PacingPoint[];
    supplyGrowth: SupplyGrowthPoint[];
    hasCharts: boolean;
  };
}

export function usePortfolioMock(): PortfolioMockData {
  return useMemo(() => {
    const rows = buildPortfolioRows();
    return {
      macro: buildPortfolioMacro(),
      cityKpis: buildCityKpis(),
      zoneStats: buildZoneStats(),
      mapPins: buildMapPins(rows),
      rows,
    };
  }, []);
}
