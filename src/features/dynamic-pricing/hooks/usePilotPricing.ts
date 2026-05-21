import { useCallback, useEffect, useRef, useState } from 'react';
import type { PricingEvent, PricingMode, PricingModeDef } from '../bien/PricingControls';
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
import {
  mapG7FactorsToPriceFactors,
  mapMinStayFactorsToView,
  mapPilotDayToCalendar,
  type MinStayFactorView,
} from '../utils/pilotPricingMappers';

const PRESET_MODES: PricingMode[] = ['prudent', 'equilibre', 'agressif'];

function legacyModeFromActive(activeModeId: string, fallback: PricingMode): PricingMode {
  return PRESET_MODES.includes(activeModeId as PricingMode)
    ? (activeModeId as PricingMode)
    : fallback;
}

function buildConfigPayload(
  activeModeId: string,
  pricingModes: PricingModeDef[],
  legacyMode: PricingMode,
  floor: number,
  ceiling: number,
  enabled: boolean,
  events: PricingEvent[],
  minStayDelta: number,
  minStayPlancher: number,
  modeEnabled: boolean,
  applyPrice: boolean,
  applyMinStay: boolean,
): Partial<PilotPricingConfigDto> {
  return {
    enabled,
    applyPrice,
    applyMinStay: applyPrice ? applyMinStay : false,
    modeEnabled,
    mode: legacyModeFromActive(activeModeId, legacyMode),
    activeModeId,
    modes: pricingModes,
    floorNormal: floor,
    ceiling,
    floorAggressive: Math.round(floor * 0.7),
    lastMinuteEnabled: true,
    lastMinuteWindowDays: 7,
    minStayDelta,
    minStayPlancher,
    events: events.map((e) => {
      const parts = e.dateRange.split('→').map((s) => s.trim());
      const startDate = (parts[0] ?? e.dateRange).slice(0, 10);
      const endDate = (parts[1] ?? parts[0] ?? e.dateRange).slice(0, 10);
      return {
        _id: e.id,
        label: e.name,
        emoji: e.emoji,
        startDate,
        endDate,
        eventFloorMad: e.fixedPrice,
        minNightsOverride: e.minNights > 0 ? e.minNights : undefined,
      };
    }),
  };
}

export function usePilotPricing(options: {
  listingId: string | undefined;
  hasAirroiSnapshot: boolean;
  activeModeId: string;
  pricingModes: PricingModeDef[];
  legacyMode: PricingMode;
  floor: number | null;
  ceiling: number | null;
  aiEnabled: boolean;
  events: PricingEvent[];
  minStayDelta: number;
  minStayPlancher: number;
  modeEnabled: boolean;
  applyPrice: boolean;
  applyMinStay: boolean;
  calendarYear: number;
}) {
  const {
    listingId,
    hasAirroiSnapshot,
    activeModeId,
    pricingModes,
    legacyMode,
    floor,
    ceiling,
    aiEnabled,
    events,
    minStayDelta,
    minStayPlancher,
    modeEnabled,
    applyPrice,
    applyMinStay,
    calendarYear,
  } = options;

  const [pilotReady, setPilotReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewDays, setPreviewDays] = useState<CalendarDay[]>([]);
  const [hasSojoriPreview, setHasSojoriPreview] = useState(false);
  const [lastApplySummary, setLastApplySummary] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const configPayload = useCallback(() => {
    if (floor == null || ceiling == null) return null;
    return buildConfigPayload(
      activeModeId,
      pricingModes,
      legacyMode,
      floor,
      ceiling,
      aiEnabled,
      events,
      minStayDelta,
      minStayPlancher,
      modeEnabled,
      applyPrice,
      applyMinStay,
    );
  }, [
    activeModeId,
    pricingModes,
    legacyMode,
    floor,
    ceiling,
    aiEnabled,
    events,
    minStayDelta,
    minStayPlancher,
    modeEnabled,
    applyPrice,
    applyMinStay,
  ]);

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
    const payload = configPayload();
    if (!listingId || !hasAirroiSnapshot || !aiEnabled || !payload) {
      setPreviewDays([]);
      setHasSojoriPreview(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewPilotPricing(listingId, payload);
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
  }, [listingId, hasAirroiSnapshot, aiEnabled, configPayload]);

  useEffect(() => {
    if (!listingId) return;
    void loadConfig();
  }, [listingId, loadConfig]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!aiEnabled || !listingId || !hasAirroiSnapshot || floor == null || ceiling == null) {
      setPreviewDays([]);
      setHasSojoriPreview(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runPreview();
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [aiEnabled, listingId, hasAirroiSnapshot, configPayload, runPreview]);

  const applyToCalendar = useCallback(async () => {
    const payload = configPayload();
    if (!listingId || !payload) {
      throw new Error('Bornes prix requises');
    }
    if (!hasAirroiSnapshot) {
      throw new Error('Snapshot marché requis — lancer ⟳ sur ce bien');
    }
    setApplyLoading(true);
    try {
      await savePilotConfig(listingId, { ...payload, enabled: true });
      const res = await applyPilotPricing(listingId, {
        config: { ...payload, enabled: true },
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
  }, [listingId, configPayload, hasAirroiSnapshot, runPreview]);

  const expandDay = useCallback(
    async (date: string): Promise<{
      factors: PriceFactor[];
      finalPrice: number;
      finalMinStay: number;
      marketMinNights: number;
      minStayFactors: MinStayFactorView[];
      competitorsDay: [];
    }> => {
      if (!listingId) {
        return {
          factors: [],
          finalPrice: 0,
          finalMinStay: 1,
          marketMinNights: 1,
          minStayFactors: [],
          competitorsDay: [],
        };
      }
      try {
        const res = await fetchDayBreakdown(listingId, date, calendarYear);
        if (res.data?.success && res.data.breakdown) {
          const b = res.data.breakdown;
          return {
            factors: mapG7FactorsToPriceFactors(b.factors),
            finalPrice: res.data.finalPriceMad,
            finalMinStay: b.finalMinStay ?? 1,
            marketMinNights: b.marketMinNights ?? 1,
            minStayFactors: mapMinStayFactorsToView(b.minStayFactors ?? []),
            competitorsDay: [],
          };
        }
      } catch {
        /* fallback preview */
      }
      const payload = configPayload();
      if (payload) {
        try {
          const preview = await previewPilotPricing(listingId, payload);
          const row = preview.data?.days?.find((d) => d.date === date);
          if (row?.breakdown) {
            const b = row.breakdown;
            return {
              factors: mapG7FactorsToPriceFactors(b.factors),
              finalPrice: row.finalPriceMad,
              finalMinStay: b.finalMinStay ?? row.minStay ?? 1,
              marketMinNights: b.marketMinNights ?? 1,
              minStayFactors: mapMinStayFactorsToView(b.minStayFactors ?? []),
              competitorsDay: [],
            };
          }
        } catch {
          /* ignore */
        }
      }
      const day = previewDays.find((d) => d.date === date);
      return {
        factors: day
          ? [
              {
                key: 'base',
                label: 'Prix pilote',
                sub: date,
                value: day.recommendedPrice,
                kind: 'base' as const,
              },
            ]
          : [],
        finalPrice: day?.recommendedPrice ?? 0,
        finalMinStay: 1,
        marketMinNights: 1,
        minStayFactors: [],
        competitorsDay: [],
      };
    },
    [listingId, calendarYear, previewDays, configPayload],
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
    buildConfigPayload: configPayload,
  };
}
