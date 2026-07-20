import { useCallback, useEffect, useState } from 'react';
import {
  fetchApplyPreviewDiff,
  type ApplyPreviewDiffDto,
  type PilotPricingConfigDto,
} from '../../../services/dynamicPricingApi';

export function useApplyPreviewDiff(options: {
  listingId: string | undefined;
  hasAirroiSnapshot: boolean;
  configPayload: (() => Partial<PilotPricingConfigDto> | null) | null;
  previewReady: boolean;
  previewLoading: boolean;
}) {
  const { listingId, hasAirroiSnapshot, configPayload, previewReady, previewLoading } = options;
  const [data, setData] = useState<ApplyPreviewDiffDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // false : l'Aperçu des prix (super vue) affiche TOUS les jours (résas/bloqués compris)
  const [onlyChanged, setOnlyChanged] = useState(false);

  const load = useCallback(async () => {
    const payload = configPayload?.() ?? null;
    if (!listingId || !hasAirroiSnapshot || !payload) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApplyPreviewDiff(listingId, {
        config: payload,
        onlyChanged,
        limit: 400,
      });
      if (res.data?.success) {
        setData(res.data);
      } else {
        setData(null);
        setError('Échec chargement écarts');
      }
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [listingId, hasAirroiSnapshot, configPayload, onlyChanged]);

  useEffect(() => {
    if (!previewReady || previewLoading) return;
    void load();
  }, [previewReady, previewLoading, load]);

  return {
    data,
    loading,
    error,
    onlyChanged,
    setOnlyChanged,
    reload: load,
  };
}
