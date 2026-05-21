import { useCallback, useEffect, useRef, useState } from 'react';
import type { PricingMode } from '../bien/PricingControls';
import type { PricingEvent } from '../bien/PricingControls';
import type { CalendarDay } from '../bien/YearlyCalendar';
import type { PriceFactor } from '../_tokens';
import {
  applyPilotPricing,
  fetchDayBreakdown,
  fetchPilotConfig,
  previewPilotPricing,
  savePilotConfig,
  type PilotPricingConfigDto,
  type PilotPreviewDay,
} from '../../../services/dynamicPricingApi';
import { mapG7FactorsToPriceFactors, mapPilotDayToCalendar } from '../utils/pilotPricingMappers';

function buildConfigPayload(
  mode: PricingMode,
  floor: number,
  ceiling: number,
  enabled: boolean,
  events: PricingEvent[],
): Partial<PilotPricingConfigDto> {
  return {
    enabled,
    mode,
    floorNormal: floor,
    ceiling,
    floorAggressive: Math.round(floor * 0.7),
    lastMinuteEnabled: true,
    lastMinuteWindowDays: 7,
    minStayDelta: 0,
    minStayPlancher: 1,
    events: events.map((e) => ({
      _id: e.id,
      label: e.name,
      emoji: e.emoji,
      startDate: e.dateRange.slice(0, 10),
      endDate: e.dateRange.slice(0, 10),
      eventFloorMad: e.fixedPrice,
      minNightsOverride: e.minNights > 0 ? e.minNights : undefined,
    })),
  };
}

export function usePilotPricing(options: {
  listingId: string | undefined;
  hasAirroiSnapshot: boolean;
  mode: PricingMode;
  floor: number | null;
  ceiling: number | null;
  aiEnabled: boolean;
  events: PricingEvent[];
  calendarYear: number;
}) {
  const { listingId, hasAirroiSnapshot, mode, floor, ceiling, aiEnabled, events, calendarYear } =
    options;

  const [pilotReady, setPilotReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewDays, setPreviewDays] = useState<CalendarDay[]>([]);
  const [hasSojoriPreview, setHasSojoriPreview] = useState(false);
  const [lastApplySummary, setLastApplySummary] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadConfig = useCallback(async () => {
    if (!listingId) return;
    try {
      const res = await fetchPilotConfig(listingId);
      if (res.data?.success && res.data.config) {
        setPilotReady(true);
        return res.data.config;
      }
    } catch {
      setPilotReady(false);
    }
    return null;
  }, [listingId]);

  const runPreview = useCallback(async () => {
    if (!listingId || !hasAirroiSnapshot || floor == null || ceiling == null) {
      setPreviewDays([]);
      setHasSojoriPreview(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewPilotPricing(
        listingId,
        buildConfigPayload(mode, floor, ceiling, aiEnabled, events),
      );
      if (res.data?.success && res.data.days?.length) {
        const days = res.data.days
          .filter((d) => d.finalPriceMad > 0 || d.status === 'blocked')
          .map((d) => mapPilotDayToCalendar(d as PilotPreviewDay));
        setPreviewDays(days);
        setHasSojoriPreview(true);
      } else {
        setHasSojoriPreview(false);
      }
    } catch {
      setHasSojoriPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [listingId, hasAirroiSnapshot, mode, floor, ceiling, aiEnabled, events]);

  useEffect(() => {
    if (!listingId) return;
    void loadConfig();
  }, [listingId, loadConfig]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!listingId || !hasAirroiSnapshot || floor == null || ceiling == null) return;
    debounceRef.current = setTimeout(() => {
      void runPreview();
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [listingId, hasAirroiSnapshot, mode, floor, ceiling, aiEnabled, events, runPreview]);

  const applyToCalendar = useCallback(async () => {
    if (!listingId || floor == null || ceiling == null) {
      throw new Error('Bornes prix requises');
    }
    if (!hasAirroiSnapshot) {
      throw new Error('Snapshot marché requis — lancer ⟳ sur ce bien');
    }
    setApplyLoading(true);
    try {
      await savePilotConfig(
        listingId,
        buildConfigPayload(mode, floor, ceiling, true, events),
      );
      const res = await applyPilotPricing(listingId, {
        config: buildConfigPayload(mode, floor, ceiling, true, events),
        triggerSource: 'orchestrator-ui',
      });
      if (!res.data?.success) {
        throw new Error('Apply pilote échoué');
      }
      setLastApplySummary(
        `${res.data.daysChanged} jours modifiés · ${res.data.daysSkipped} ignorés · RU ${res.data.ruPublishQueued ? 'OK' : '—'}`,
      );
      await runPreview();
      return res.data;
    } finally {
      setApplyLoading(false);
    }
  }, [listingId, floor, ceiling, mode, aiEnabled, events, hasAirroiSnapshot, runPreview]);

  const expandDay = useCallback(
    async (date: string): Promise<{
      factors: PriceFactor[];
      finalPrice: number;
      competitorsDay: [];
    }> => {
      if (!listingId) {
        return { factors: [], finalPrice: 0, competitorsDay: [] };
      }
      try {
        const res = await fetchDayBreakdown(listingId, date, calendarYear);
        if (res.data?.success && res.data.breakdown) {
          return {
            factors: mapG7FactorsToPriceFactors(res.data.breakdown.factors),
            finalPrice: res.data.finalPriceMad,
            competitorsDay: [],
          };
        }
      } catch {
        /* fallback preview day */
      }
      const day = previewDays.find((d) => d.date === date);
      return {
        factors: day
          ? [
              {
                key: 'base',
                label: 'Prix Sojori pilote',
                sub: date,
                value: day.recommendedPrice,
                kind: 'base' as const,
              },
            ]
          : [],
        finalPrice: day?.recommendedPrice ?? 0,
        competitorsDay: [],
      };
    },
    [listingId, calendarYear, previewDays],
  );

  return {
    pilotReady,
    previewLoading,
    applyLoading,
    previewDays,
    hasSojoriPreview,
    lastApplySummary,
    runPreview,
    applyToCalendar,
    expandDay,
    loadConfig,
  };
}
