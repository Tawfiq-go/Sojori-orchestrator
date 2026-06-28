import { useCallback, useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type { PricingEvent, PricingMode, PricingModeDef } from '../bien/PricingControls';
import type { CalendarDay } from '../bien/YearlyCalendar';
import type { PriceFactor } from '../_tokens';
import {
  applyPilotPricing,
  fetchDayBreakdown,
  fetchPilotConfig,
  previewPilotPricing,
  savePilotConfig,
  type PilotApplyReportDto,
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
  gapBlockEnabled: boolean,
  gapBlockMinNights: number,
  modeEnabled: boolean,
  applyPrice: boolean,
  applyMinStay: boolean,
): Partial<PilotPricingConfigDto> {
  return {
    enabled,
    applyPrice,
    applyMinStay,
    modeEnabled,
    mode: legacyModeFromActive(activeModeId, legacyMode),
    activeModeId,
    modes: pricingModes,
    floorNormal: floor,
    ceiling,
    floorAggressive: Math.round(floor * 0.7),
    lastMinuteEnabled: true,
    lastMinuteWindowDays: 7,
    minStayDelta: 0,
    minStayPlancher: 1,
    gapBlockEnabled,
    gapBlockMinNights,
    events: events.map((e) => {
      const parts = e.dateRange.split('→').map((s) => s.trim());
      const startDate = (parts[0] ?? e.dateRange).slice(0, 10);
      const endDate = (parts[1] ?? parts[0] ?? e.dateRange).slice(0, 10);
      const isPercent = e.kind === 'market_percent';
      return {
        _id: e.id,
        label: e.name,
        emoji: e.emoji,
        startDate,
        endDate,
        eventKind: e.kind,
        eventFloorMad: isPercent ? 0 : e.fixedPrice,
        eventMarketPercent: isPercent ? e.marketPercent : undefined,
        minNightsOverride: e.minNights > 0 ? e.minNights : undefined,
      };
    }),
  };
}

function marketMadFromPreviewDay(d: PilotPreviewDay): number {
  if ((d.marketPriceMad ?? 0) > 0) return d.marketPriceMad ?? 0;
  const base = d.breakdown?.factors?.find((f) => f.key === 'base')?.inputAfter;
  return typeof base === 'number' && base > 0 ? Math.round(base) : 0;
}

export function usePilotPricing(options: {
  listingId: string | undefined;
  /** Snapshot avec estimate et/ou listing AirROI — requis pour preview/apply */
  hasAirroiSnapshot: boolean;
  activeModeId: string;
  pricingModes: PricingModeDef[];
  legacyMode: PricingMode;
  floor: number | null;
  ceiling: number | null;
  aiEnabled: boolean;
  events: PricingEvent[];
  gapBlockEnabled: boolean;
  gapBlockMinNights: number;
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
    gapBlockEnabled,
    gapBlockMinNights,
    modeEnabled,
    applyPrice,
    applyMinStay,
    calendarYear,
  } = options;

  const [pilotReady, setPilotReady] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [previewDays, setPreviewDays] = useState<CalendarDay[]>([]);
  const [previewMarketDays, setPreviewMarketDays] = useState<CalendarDay[]>([]);
  const [previewCalendarDays, setPreviewCalendarDays] = useState<CalendarDay[]>([]);
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
      gapBlockEnabled,
      gapBlockMinNights,
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
    gapBlockEnabled,
    gapBlockMinNights,
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
    if (!listingId || !hasAirroiSnapshot || !payload) {
      setPreviewDays([]);
      setPreviewMarketDays([]);
      setPreviewCalendarDays([]);
      setHasSojoriPreview(false);
      return;
    }
    setPreviewLoading(true);
    try {
      const res = await previewPilotPricing(listingId, payload);
      if (res.data?.success && res.data.days?.length) {
        const raw = res.data.days as PilotPreviewDay[];
        const market = raw
          .filter((d) => marketMadFromPreviewDay(d) > 0)
          .map((d) => ({
            date: d.date,
            recommendedPrice: marketMadFromPreviewDay(d),
            status: 'std' as const,
          }));
        const opsCalendar = raw
          .filter((d) => (d.calendarPriceMad ?? 0) > 0)
          .map((d) => ({
            date: d.date,
            recommendedPrice: d.calendarPriceMad ?? 0,
            status: 'std' as const,
          }));
        const days = raw
          .filter((d) => d.finalPriceMad > 0 || d.status === 'blocked')
          .map((d) => mapPilotDayToCalendar(d));
        setPreviewMarketDays(market);
        setPreviewCalendarDays(opsCalendar);
        setPreviewDays(days);
        setHasSojoriPreview(true);
      } else {
        setPreviewMarketDays([]);
        setPreviewCalendarDays([]);
        setHasSojoriPreview(false);
      }
    } catch {
      setPreviewMarketDays([]);
      setPreviewCalendarDays([]);
      setHasSojoriPreview(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [listingId, hasAirroiSnapshot, configPayload]);

  useEffect(() => {
    if (!listingId) return;
    void loadConfig();
  }, [listingId, loadConfig]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!listingId || !hasAirroiSnapshot || floor == null || ceiling == null) {
      setPreviewDays([]);
      setPreviewMarketDays([]);
      setPreviewCalendarDays([]);
      setHasSojoriPreview(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      void runPreview();
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [listingId, hasAirroiSnapshot, configPayload, runPreview, floor, ceiling]);

  const applyToCalendar = useCallback(async () => {
    const payload = configPayload();
    if (!listingId || !payload) {
      throw new Error('Bornes prix requises');
    }
    if (!hasAirroiSnapshot) {
      throw new Error(
        'Estimation Sojori requise — lancez ⟳ « Estimation Sojori » puis vérifiez la courbe avant d’appliquer',
      );
    }
    setApplyLoading(true);
    try {
      await savePilotConfig(listingId, { ...payload, enabled: true });
      let res;
      try {
        res = await applyPilotPricing(listingId, {
          config: { ...payload, enabled: true },
          triggerSource: 'orchestrator-ui',
        });
      } catch (e) {
        if (isAxiosError(e)) {
          const data = e.response?.data as { error?: string } | undefined;
          throw new Error(data?.error ?? e.message);
        }
        throw e;
      }
      if (!res.data?.success) {
        const errBody = res.data as { error?: string };
        throw new Error(errBody?.error ?? 'Apply pilote échoué');
      }
      const r = res.data.applyReport;
      setLastApplySummary(
        `${res.data.daysChanged} j modifiés · prix ${r?.daysPricePushed ?? 0} · min stay trous ${r?.daysGapMinStayAdjusted ?? 0} · canaux ${res.data.ruPublishQueued ? 'OK' : '—'}`,
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
    previewMarketDays,
    previewCalendarDays,
    hasSojoriPreview,
    lastApplySummary,
    runPreview,
    applyToCalendar,
    expandDay,
    loadConfig,
    buildConfigPayload: configPayload,
  };
}
