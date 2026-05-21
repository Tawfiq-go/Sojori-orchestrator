import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import {
  fetchDynamicPricingPortfolio,
  refreshOneListingPerformanceAirroi,
} from '../../../services/dynamicPricingApi';
import { mapPortfolioApiToView } from './mapPortfolioApi';
import type { PortfolioRow } from '../_tokens';

export type BienAirroiDetailResult = {
  loading: boolean;
  error: string | null;
  row: PortfolioRow | null;
  refetch: () => Promise<void>;
  refreshThisListingAirroi: () => Promise<{ costUsd?: number } | void>;
};

/** Détail bien — lecture snapshot uniquement (GET portfolio), jamais marché au chargement. */
export function useBienAirroiDetail(listingId: string | undefined): BienAirroiDetailResult {
  const [row, setRow] = useState<PortfolioRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchDynamicPricingPortfolio();
      if (!res.data?.success) {
        throw new Error('Portfolio indisponible');
      }
      const mapped = mapPortfolioApiToView(res.data);
      const found = mapped.rows.find((r) => r.listing._id === listingId) ?? null;
      if (!found) {
        throw new Error('Bien introuvable dans le portefeuille Sojori');
      }
      setRow(found);
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
      setRow(null);
    } finally {
      setLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const refreshThisListingAirroi = useCallback(async () => {
    if (!listingId) return;
    const res = await refreshOneListingPerformanceAirroi(listingId);
    if (!res.data?.ok) {
      throw new Error(res.data?.error ?? 'Refresh marché échoué');
    }
    await load();
    return { costUsd: res.data.costUsd };
  }, [listingId, load]);

  return useMemo(
    () => ({
      loading,
      error,
      row,
      refetch: load,
      refreshThisListingAirroi,
    }),
    [loading, error, row, load, refreshThisListingAirroi],
  );
}
