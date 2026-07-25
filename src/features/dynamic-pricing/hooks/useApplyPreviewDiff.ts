import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchApplyPreviewDiff,
  type ApplyPreviewDiffDto,
  type PilotPricingConfigDto,
} from '../../../services/dynamicPricingApi';

/**
 * Aperçu prix (apply-preview-diff) — autonome : ne dépend PAS du preview pilote
 * (qui recalcule déjà côté API). Évite la cascade lente + flash « Aucun jour ».
 */
export function useApplyPreviewDiff(options: {
  listingId: string | undefined;
  hasAirroiSnapshot: boolean;
  configPayload: (() => Partial<PilotPricingConfigDto> | null) | null;
  /** Conservé pour compat — ignoré (plus de cascade preview → diff). */
  previewReady?: boolean;
  previewLoading?: boolean;
}) {
  const { listingId, hasAirroiSnapshot, configPayload } = options;
  const [data, setData] = useState<ApplyPreviewDiffDto | null>(null);
  const [loading, setLoading] = useState(Boolean(listingId));
  const [error, setError] = useState<string | null>(null);
  /** false : affiche tous les jours (résas/bloqués compris) */
  const [onlyChanged, setOnlyChanged] = useState(false);
  /** Premier fetch listing terminé (succès, erreur ou « pas de snapshot ») */
  const [settled, setSettled] = useState(false);
  const genRef = useRef(0);
  const settledRef = useRef(false);

  useEffect(() => {
    genRef.current += 1;
    setData(null);
    setError(null);
    setSettled(false);
    settledRef.current = false;
    setLoading(Boolean(listingId));
  }, [listingId]);

  const load = useCallback(async () => {
    const payload = configPayload?.() ?? null;
    if (!listingId) {
      setData(null);
      setLoading(false);
      setSettled(true);
      settledRef.current = true;
      return;
    }
    if (!hasAirroiSnapshot) {
      setData(null);
      setError(null);
      setLoading(false);
      setSettled(true);
      settledRef.current = true;
      return;
    }
    if (!payload) {
      // Config (floor/ceiling) pas encore hydratée — rester en chargement
      setLoading(true);
      return;
    }

    const gen = ++genRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApplyPreviewDiff(listingId, {
        config: payload,
        onlyChanged,
        limit: 400,
      });
      if (gen !== genRef.current) return;
      if (res.data?.success) {
        setData(res.data);
      } else {
        setData(null);
        setError('Échec chargement écarts');
      }
    } catch (e) {
      if (gen !== genRef.current) return;
      setData(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (gen === genRef.current) {
        setLoading(false);
        setSettled(true);
        settledRef.current = true;
      }
    }
  }, [listingId, hasAirroiSnapshot, configPayload, onlyChanged]);

  useEffect(() => {
    if (!listingId) return undefined;
    // Premier chargement : immédiat. Recalcul après tweak config : léger debounce.
    const delay = settledRef.current ? 350 : 0;
    const t = setTimeout(() => {
      void load();
    }, delay);
    return () => clearTimeout(t);
  }, [listingId, load]);

  /** Tant que le 1er chargement n’a pas abouti — évite le vide aléatoire en bas de page */
  const showLoading = Boolean(listingId) && (loading || !settled);

  return {
    data,
    loading: showLoading,
    error,
    onlyChanged,
    setOnlyChanged,
    reload: load,
  };
}
