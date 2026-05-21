import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  fetchDynamicPricingPortfolio,
  refreshMarketDynamicPricing,
  refreshListingPerformanceAirroi,
  recomputeAllDynamicPricing,
} from '../../../services/dynamicPricingApi';
import type { PortfolioMockData } from './usePortfolioMock';
import { mapPortfolioApiToView } from './mapPortfolioApi';
import { runtimeLog } from '../../../utils/runtimeLog';

const EMPTY_PORTFOLIO: PortfolioMockData = {
  macro: {
    totalPotentialMad: 0,
    realizedTtmMad: 0,
    realizedPctOfPotential: 0,
    avgPacingPct: 0,
    pacingTrendPts: 0,
    aiEnabledCount: 0,
    totalListings: 0,
    aiOpportunityMad: 0,
  },
  cityKpis: {
    cityName: 'Marrakech',
    occupancyAvg24m: 0,
    adrMedianCity: 0,
    pacingCurrent: { monthLabel: '—', fillRate: 0 },
    pacingNext: { monthLabel: '—', fillRate: 0 },
    supplyGrowthPct: 0,
    supplyGrowthMonths: 0,
  },
  zoneStats: {},
  mapPins: [],
  rows: [],
};

export function usePortfolio(
  ownerId?: string,
  cityScope?: string | null,
): PortfolioMockData & {
  loading: boolean;
  error: string | null;
  /** true = échec HTTP / API (pas de données fictives) */
  fetchFailed: boolean;
  refetch: () => void;
  refreshMarket: (city: string) => Promise<void>;
  /** marché par bien (ID Airbnb) — payant, snapshot Mongo */
  refreshListingPerformance: (city?: string | null) => Promise<{
    refreshed: number;
    failed: number;
    totalCostUsd: number;
  } | void>;
  recomputeAll: () => Promise<void>;
  withAirbnbCount: number;
  withAirroiSnapshotCount: number;
  marketCache?: { hasCity: boolean; fetchedAt: string | null; zoneCount: number };
} {
  const [data, setData] = useState<PortfolioMockData>(EMPTY_PORTFOLIO);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [withAirbnbCount, setWithAirbnbCount] = useState(0);
  const [withAirroiSnapshotCount, setWithAirroiSnapshotCount] = useState(0);
  const [marketCache, setMarketCache] = useState<{
    hasCity: boolean;
    fetchedAt: string | null;
    zoneCount: number;
  }>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFetchFailed(false);
    try {
      const res = await fetchDynamicPricingPortfolio({ ownerId, city: cityScope ?? undefined });
      if (!res.data?.success) {
        throw new Error(
          typeof res.data === 'object' && res.data && 'error' in res.data
            ? String((res.data as { error?: string }).error)
            : 'Portfolio API error',
        );
      }
      const mapped = mapPortfolioApiToView(res.data);
      setData(mapped);
      setWithAirbnbCount(res.data.meta?.withAirbnbConnected ?? 0);
      setWithAirroiSnapshotCount(res.data.meta?.withAirroiSnapshot ?? 0);
      setMarketCache(res.data.marketCache);
      if (mapped.rows.length === 0) {
        setError('Aucune annonce active Sojori (active=true, hors staging).');
      }
      runtimeLog('info', 'DynamicPricing', 'portfolio OK', {
        count: mapped.rows.length,
        year: res.data.year,
      });
    } catch (e) {
      const msg = isAxiosError(e)
        ? `HTTP ${e.response?.status ?? '—'} — ${
            typeof e.response?.data === 'object' && e.response?.data && 'error' in e.response.data
              ? String((e.response.data as { error?: string }).error)
              : e.message
          }`
        : e instanceof Error
          ? e.message
          : String(e);
      setError(msg);
      setFetchFailed(true);
      setData(EMPTY_PORTFOLIO);
      runtimeLog('error', 'DynamicPricing', 'portfolio failed', { msg });
    } finally {
      setLoading(false);
    }
  }, [ownerId, cityScope]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshMarket = useCallback(
    async (city: string) => {
      await refreshMarketDynamicPricing(city);
      await load();
    },
    [load],
  );

  const recomputeAll = useCallback(async () => {
    await recomputeAllDynamicPricing();
    await load();
  }, [load]);

  const refreshListingPerformance = useCallback(async (city?: string | null) => {
    const targetCity = city !== undefined ? city : cityScope;
    const r = await refreshListingPerformanceAirroi(ownerId, targetCity);
    const d = r.data;
    runtimeLog('info', 'DynamicPricing', 'listing performance refresh', {
      refreshed: d?.refreshed,
      failed: d?.failed,
      totalCostUsd: d?.totalCostUsd,
    });
    await load();
    if (d) {
      return {
        refreshed: d.refreshed,
        failed: d.failed,
        totalCostUsd: d.totalCostUsd,
      };
    }
  }, [load, ownerId, cityScope]);

  return {
    ...data,
    loading,
    error,
    fetchFailed,
    refetch: load,
    refreshMarket,
    refreshListingPerformance,
    recomputeAll,
    withAirbnbCount,
    withAirroiSnapshotCount,
    marketCache,
  };
}
