import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import type { BienViewProps } from '../BienView';
import {
  DEFAULT_PRICING_MODES,
  type PricingMode,
  type PricingModeDef,
} from '../bien/PricingControls';
import type { MarketKpis } from '../bien/MarketCharts';
import type { MarketCityKpis } from '../PortfolioView';
import type { CalendarDay } from '../bien/YearlyCalendar';
import type { CompRow } from '../bien/CompsTable';
import type { BienDetailPerformance, PriceFactor, PortfolioRow } from '../_tokens';
import {
  fetchDynamicPricingPortfolio,
  fetchPilotConfig,
  refreshOneListingPerformanceAirroi,
  refreshListingAirroiPart,
  type AirroiListingRefreshPart,
  savePilotConfig,
  type PilotPricingEventDto,
} from '../../../services/dynamicPricingApi';
import type { PricingEvent } from '../bien/PricingControls';
import { usePilotPricing } from './usePilotPricing';
import { useApplyPreviewDiff } from './useApplyPreviewDiff';
import { mapPortfolioApiToView } from './mapPortfolioApi';
import { chartsFromApi } from '../utils/extractMarketChartsFromApi';
import type { CompMapPin } from '../bien/MarrakechMap';
import { haversineMeters } from '../utils/geoDistance';
import {
  compareSelfToCompsMedian,
  computeCompsMarketStats,
} from '../utils/computeCompsMarketStats';
import { normalizeCityKey } from '../cityScope';
import { overlayEventsOnCalendarDays } from '../utils/overlayEventsOnCalendar';

const USD_TO_MAD = 10;

function mapUiEventsToDto(events: PricingEvent[]): PilotPricingEventDto[] {
  return events.map((e) => {
    const parts = e.dateRange.split('→').map((s) => s.trim());
    const isPercent = e.kind === 'market_percent';
    return {
      _id: e.id,
      label: e.name,
      emoji: e.emoji,
      startDate: (parts[0] ?? '').slice(0, 10),
      endDate: (parts[1] ?? parts[0] ?? '').slice(0, 10),
      eventKind: e.kind,
      eventFloorMad: isPercent ? 0 : e.fixedPrice,
      eventMarketPercent: isPercent ? e.marketPercent : undefined,
      minNightsOverride: e.minNights > 0 ? e.minNights : undefined,
    };
  });
}

function mapAirroiCalendarDays(row: PortfolioRow): CalendarDay[] {
  return (row.airroiCalendarDays ?? []).map((d) => ({
    date: d.date,
    recommendedPrice: d.priceMad,
    status: d.status,
  }));
}

function medianPositive(values: number[]): number {
  const s = values.filter((n) => n > 0).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

function buildPerformanceFromAirroi(row: PortfolioRow): {
  performance: BienDetailPerformance;
  hasTtm: boolean;
  hasL90d: boolean;
} {
  const ar = row.airroiRaw;
  const hasTtm = Boolean(row.hasAirroiSnapshot && ar && ar.ttm_revenue != null);
  const hasL90d = Boolean(row.hasAirroiSnapshot && ar && ar.l90d_revenue != null);

  if (!hasTtm) {
    return {
      hasTtm: false,
      hasL90d: false,
      performance: {
        potentialAnnual: { p25: 0, p50: 0, p75: 0, currency: 'MAD' },
        potentialUsd: 0,
        ttm: { ttmRevenue: 0, ttmUsd: 0, occupancy: 0, adr: 0, nights: 0, quartile: 'P50' },
        pacing: {
          fillRate: 0,
          monthLabel: '—',
          trendPct: 0,
          compsCount: 0,
          avgAdr: 0,
          leadTimeDays: 0,
          avgStayNights: 0,
        },
      },
    };
  }

  const ttmUsd = ar!.ttm_revenue ?? 0;
  const ttmMad = Math.round(ttmUsd * USD_TO_MAD);
  const adrMad = Math.round((ar!.ttm_avg_rate ?? 0) * USD_TO_MAD);
  const occ = ar!.ttm_occupancy ?? 0;

  return {
    hasTtm: true,
    hasL90d,
    performance: {
      potentialAnnual: { p25: 0, p50: 0, p75: 0, currency: 'MAD' },
      potentialUsd: 0,
      ttm: {
        ttmRevenue: ttmMad,
        ttmUsd: Math.round(ttmUsd),
        occupancy: occ,
        adr: adrMad,
        nights: ar!.ttm_days_reserved ?? 0,
        quartile: occ >= 0.2 ? 'P75' : occ >= 0.12 ? 'P50' : 'P25',
      },
      pacing: {
        fillRate: hasL90d ? (ar!.l90d_occupancy ?? 0) : 0,
        monthLabel: row.perfMeta?.ttmPeriodLabel?.split('·')[0]?.trim() ?? 'L90D',
        trendPct: hasL90d ? (ar!.l90d_occupancy ?? 0) - occ : 0,
        compsCount: 0,
        avgAdr: hasL90d ? Math.round((ar!.l90d_avg_rate ?? 0) * USD_TO_MAD) : 0,
        leadTimeDays: 0,
        avgStayNights: ar!.ttm_avg_length_of_stay ?? 0,
      },
    },
  };
}

/** GPS affiché / distances comps : listing Mongo en priorité (règle #1). */
function resolveBienLatLng(row: PortfolioRow): { lat: number; lng: number } | null {
  const pos = row.listing.position;
  const lat = pos?.lat ?? row.airroiRaw?.latitude;
  const lng = pos?.lng ?? row.airroiRaw?.longitude;
  if (lat == null || lng == null || Number(lat) === 0 || Number(lng) === 0) {
    return null;
  }
  return { lat: Number(lat), lng: Number(lng) };
}

function buildCompRowFromAirroi(
  c: NonNullable<PortfolioRow['airroiComps']>[number],
  thumb: number,
  bienPos: { lat: number; lng: number } | null,
): CompRow {
  let distanceMeters: number | null = null;
  if (
    bienPos &&
    c.latitude != null &&
    c.longitude != null &&
    Number(c.latitude) !== 0 &&
    Number(c.longitude) !== 0
  ) {
    distanceMeters = haversineMeters(
      bienPos.lat,
      bienPos.lng,
      Number(c.latitude),
      Number(c.longitude),
    );
  }
  return {
    id: c.airbnbListingId ?? c.name,
    isSelf: false,
    name: c.name,
    airbnbListingId: c.airbnbListingId ?? null,
    photoGradient: (thumb % 6) + 1 as 1 | 2 | 3 | 4 | 5 | 6,
    distanceMeters,
    rating: c.rating,
    reviews: c.reviews,
    bedrooms: c.bedrooms,
    adrTtm: c.adrTtmMad,
    occupancyTtm: c.occupancyTtm,
    revenueTtm: c.revenueTtmMad,
  };
}

function buildSelfCompRow(row: PortfolioRow): CompRow | null {
  const ar = row.airroiRaw;
  if (!row.hasAirroiSnapshot || !ar) return null;
  return {
    id: row.listing._id,
    isSelf: true,
    name: row.listing.name,
    photoGradient: row.thumbColor ?? 1,
    distanceMeters: null,
    rating: ar.rating_overall ?? 0,
    reviews: ar.num_reviews ?? 0,
    bedrooms: ar.bedrooms ?? row.listing.bedrooms,
    adrTtm: Math.round((ar.ttm_avg_rate ?? 0) * USD_TO_MAD),
    occupancyTtm: ar.ttm_occupancy ?? 0,
    revenueTtm: Math.round((ar.ttm_revenue ?? 0) * USD_TO_MAD),
  };
}

export type BienDetailResult = {
  loading: boolean;
  error: string | null;
  row: PortfolioRow | null;
  listingHasAirbnb: boolean;
  hasMarketProd: boolean;
  marketFetchedAt: string | null;
  hasTtm: boolean;
  hasL90d: boolean;
  applyToOps: () => Promise<void>;
  runCalendarUpdate: () => Promise<import('../../../services/dynamicPricingApi').PilotApplyReportDto>;
  refetch: () => Promise<void>;
  refreshAirroi: () => Promise<{ costUsd?: number } | void>;
  refreshAirroiPart: (part: AirroiListingRefreshPart) => Promise<{ costUsd?: number } | void>;
  listingEstimateInputs: {
    listingId: string;
    name: string;
    lat: number | null;
    lng: number | null;
    addressLine: string | null;
    bedrooms: number;
    baths: number;
    guests: number;
    personCapacityPricing?: number | null;
    airbnbListingId: string | null;
    coordsSource?: string;
    airroiListingLat?: number | null;
    airroiListingLng?: number | null;
    gpsDeltaMeters?: number | null;
    lastAirroiGeoSource?: string | null;
    lastAirroiGeoSent?: string | null;
  } | null;
  view: BienViewProps | null;
};

export function useBienDetail(listingId: string | undefined): BienDetailResult | null {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [mode, setMode] = useState<PricingMode>('equilibre');
  const [activeModeId, setActiveModeId] = useState('equilibre');
  const [pricingModes, setPricingModes] = useState<PricingModeDef[]>(DEFAULT_PRICING_MODES);
  const [gapBlockEnabled, setGapBlockEnabled] = useState(true);
  const [gapBlockMinNights, setGapBlockMinNights] = useState(2);
  const [modeEnabled, setModeEnabled] = useState(true);
  const [applyPrice, setApplyPrice] = useState(true);
  const [applyMinStay, setApplyMinStay] = useState(true);
  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [scopeModalEdit, setScopeModalEdit] = useState(false);
  const [scopeSaving, setScopeSaving] = useState(false);
  const [scopeSaveError, setScopeSaveError] = useState<string | null>(null);
  const [configSaveStatus, setConfigSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const configSaveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const configHydratedRef = useRef(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getUTCFullYear());
  const [portfolioRow, setPortfolioRow] = useState<PortfolioRow | null>(null);
  const [hasMarketProd, setHasMarketProd] = useState(false);
  const [marketFetchedAt, setMarketFetchedAt] = useState<string | null>(null);
  const [cityKpisProd, setCityKpisProd] = useState<MarketCityKpis | null>(null);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [calendarFromCache, setCalendarFromCache] = useState(false);
  const [calendarFromAirroi, setCalendarFromAirroi] = useState(false);
  const [calendarAirroiError, setCalendarAirroiError] = useState<string | null>(null);
  const [events, setEvents] = useState<PricingEvent[]>([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [marketCharts, setMarketCharts] = useState<ReturnType<typeof chartsFromApi>>({
    seasonality: [],
    pacing: [],
    supplyGrowth: [],
    hasCharts: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pilot = usePilotPricing({
    listingId,
    hasAirroiSnapshot: Boolean(
      portfolioRow?.hasAirroiSnapshot || portfolioRow?.hasRevenueEstimate,
    ),
    activeModeId,
    pricingModes,
    legacyMode: mode,
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
  });
  const previewDiff = useApplyPreviewDiff({
    listingId,
    hasAirroiSnapshot: Boolean(
      portfolioRow?.hasAirroiSnapshot || portfolioRow?.hasRevenueEstimate,
    ),
    configPayload: pilot.buildConfigPayload,
    previewReady: pilot.hasSojoriPreview,
    previewLoading: pilot.previewLoading,
  });


  const persistPilotConfig = useCallback(
    async (eventsOverride?: PricingEvent[]) => {
      if (!listingId || floor == null || ceiling == null) return;
      const payload = pilot.buildConfigPayload();
      if (!payload) return;
      setConfigSaveStatus('saving');
      try {
        await savePilotConfig(listingId, {
          ...payload,
          enabled: aiEnabled,
          applyPrice,
          applyMinStay,
          ...(eventsOverride !== undefined
            ? { events: mapUiEventsToDto(eventsOverride) }
            : {}),
        });
        setConfigSaveStatus('saved');
      } catch (e) {
        setConfigSaveStatus('error');
        throw e;
      }
    },
    [listingId, floor, ceiling, pilot, aiEnabled, applyPrice, applyMinStay],
  );

  const scheduleConfigSave = useCallback(() => {
    if (!configHydratedRef.current || !listingId) return;
    if (configSaveDebounceRef.current) clearTimeout(configSaveDebounceRef.current);
    configSaveDebounceRef.current = setTimeout(() => {
      void persistPilotConfig().catch(() => undefined);
    }, 900);
  }, [listingId, persistPilotConfig]);

  const mapPilotEventsToUi = useCallback((evs: PilotPricingEventDto[]): PricingEvent[] => {
    return evs.map((e) => {
      const kind =
        e.eventKind === 'market_percent' || (e.eventMarketPercent != null && e.eventMarketPercent > 0)
          ? 'market_percent'
          : 'fixed';
      return {
        id: e._id,
        emoji: e.emoji ?? '📅',
        name: e.label,
        dateRange: `${e.startDate.slice(0, 10)} → ${e.endDate.slice(0, 10)}`,
        kind,
        fixedPrice: e.eventFloorMad,
        marketPercent: e.eventMarketPercent ?? 100,
        minNights: e.minNightsOverride ?? 0,
      };
    });
  }, []);

  const load = useCallback(async (opts?: { background?: boolean }) => {
    if (!listingId) return;
    if (!opts?.background) setLoading(true);
    setError(null);
    try {
      const portfolioRes = await fetchDynamicPricingPortfolio({ year: calendarYear });
      if (!portfolioRes.data?.success) {
        throw new Error('Portfolio indisponible');
      }
      const mappedAll = mapPortfolioApiToView(portfolioRes.data);
      const row = mappedAll.rows.find((r) => r.listing._id === listingId) ?? null;
      if (!row) {
        throw new Error('Bien introuvable dans le portefeuille Sojori');
      }
      setPortfolioRow(row);
      setAiEnabled(row.aiEnabled);

      const listingCityKey = normalizeCityKey(row.listing.city);
      let marketPayload = portfolioRes.data;
      if (listingCityKey && listingCityKey !== '—') {
        const cacheCity = marketPayload.marketCache?.city
          ? normalizeCityKey(marketPayload.marketCache.city)
          : null;
        if (cacheCity !== listingCityKey) {
          const scopedRes = await fetchDynamicPricingPortfolio({
            year: calendarYear,
            city: listingCityKey,
          });
          if (scopedRes.data?.success) marketPayload = scopedRes.data;
        }
      }

      const mappedMarket = mapPortfolioApiToView(marketPayload);
      const cacheCity = marketPayload.marketCache?.city
        ? normalizeCityKey(marketPayload.marketCache.city)
        : null;
      const marketOk =
        Boolean(marketPayload.marketCache?.hasCity) &&
        listingCityKey !== '—' &&
        cacheCity === listingCityKey;

      setHasMarketProd(marketOk);
      setMarketFetchedAt(marketPayload.marketCache?.fetchedAt ?? null);
      setCityKpisProd(marketOk ? mappedMarket.cityKpis : null);
      setMarketCharts(chartsFromApi(marketPayload.marketCharts));

      const futureErr =
        row.airroiRaw?.refreshErrors?.find((e) => e.includes('getListingFutureRates')) ?? null;
      setCalendarAirroiError(futureErr);

      const adrMad =
        row.airroiRaw?.ttm_avg_rate != null
          ? Math.round(row.airroiRaw.ttm_avg_rate * USD_TO_MAD)
          : row.estimateSummary?.adrP50Mad != null && row.estimateSummary.adrP50Mad > 0
            ? row.estimateSummary.adrP50Mad
            : null;
      setFloor(row.bounds?.floor ?? (adrMad != null ? Math.round(adrMad * 0.65) : null));
      setCeiling(row.bounds?.ceiling ?? (adrMad != null ? Math.round(adrMad * 1.35) : null));

      try {
        const cfgRes = await fetchPilotConfig(listingId);
        if (cfgRes.data?.success && cfgRes.data.config) {
          const c = cfgRes.data.config;
          setMode(c.mode);
          setActiveModeId(c.activeModeId ?? c.mode ?? 'equilibre');
          setPricingModes(
            c.modes?.length
              ? c.modes.map((m) => ({ ...m, kind: m.kind ?? 'preset' }))
              : DEFAULT_PRICING_MODES,
          );
          setFloor(c.floorNormal);
          setCeiling(c.ceiling);
          setAiEnabled(c.enabled);
          setGapBlockEnabled(c.gapBlockEnabled !== false);
          setGapBlockMinNights(Math.max(2, Math.min(14, c.gapBlockMinNights ?? 2)));
          setModeEnabled(c.modeEnabled !== false);
          setApplyPrice(c.applyPrice !== false);
          setApplyMinStay(c.applyMinStay !== false && c.applyPrice !== false);
          setEvents(mapPilotEventsToUi(c.events ?? []));
          configHydratedRef.current = true;
        }
      } catch {
        /* défauts locaux */
      }
      if (!configHydratedRef.current) configHydratedRef.current = true;

      let days: CalendarDay[] = [];
      let fromCache = false;
      let fromAirroi = false;
      if (!fromCache && row.hasAirroiSnapshot && !row.hasRevenueEstimate) {
        const allAirroi = mapAirroiCalendarDays(row);
        if (allAirroi.length > 0) {
          days = allAirroi;
          fromAirroi = true;
        }
      }
      setCalendarDays(days);
      setCalendarFromCache(fromCache);
      setCalendarFromAirroi(fromAirroi);
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
      setPortfolioRow(null);
      setCalendarDays([]);
      setHasMarketProd(false);
    } finally {
      setLoading(false);
    }
  }, [listingId, calendarYear]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyToOps = useCallback(async () => {
    if (!listingId) return;
    setApplyError(null);
    try {
      await pilot.applyToCalendar();
      await load({ background: true });
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
      throw e;
    }
  }, [listingId, pilot, load]);

  const runCalendarUpdate = useCallback(async () => {
    if (!listingId) throw new Error('Listing manquant');
    setApplyError(null);
    const data = await pilot.applyToCalendar();
    if (!data?.applyReport) {
      throw new Error('Rapport apply manquant dans la réponse API');
    }
    void load({ background: true });
    return data.applyReport;
  }, [listingId, pilot, load]);

  const refreshAirroi = useCallback(async () => {
    if (!listingId) return;
    const res = await refreshOneListingPerformanceAirroi(listingId);
    if (!res.data?.ok) {
      throw new Error(res.data?.error ?? 'Refresh marché échoué');
    }
    await load();
    return { costUsd: res.data.costUsd };
  }, [listingId, load]);

  const refreshAirroiPart = useCallback(
    async (part: AirroiListingRefreshPart) => {
      if (!listingId) return;
      const res = await refreshListingAirroiPart(listingId, part);
      if (!res.data?.ok) {
        throw new Error(res.data?.error ?? `Appel ${part} échoué`);
      }
      await load();
      if (part === 'estimate') {
        await pilot.runPreview().catch(() => undefined);
      }
      return { costUsd: res.data.costUsd };
    },
    [listingId, load, pilot],
  );

  const listingEstimateInputs = useMemo(() => {
    if (!listingId || !portfolioRow) return null;
    const l = portfolioRow.listing;
    const ar = portfolioRow.airroiRaw;
    const pos = l.position;
    const latListing =
      pos?.lat != null && Number.isFinite(pos.lat) && Number(pos.lat) !== 0
        ? Number(pos.lat)
        : null;
    const lngListing =
      pos?.lng != null && Number.isFinite(pos.lng) && Number(pos.lng) !== 0
        ? Number(pos.lng)
        : null;
    const airroiLat =
      ar?.latitude != null && ar.latitude !== 0 ? Number(ar.latitude) : null;
    const airroiLng =
      ar?.longitude != null && ar.longitude !== 0 ? Number(ar.longitude) : null;
    const gpsDeltaMeters =
      latListing != null &&
      lngListing != null &&
      airroiLat != null &&
      airroiLng != null
        ? Math.round(haversineMeters(latListing, lngListing, airroiLat, airroiLng))
        : null;
    const district =
      l.district && l.district !== '—' ? l.district : ar?.district ?? l.district;
    const parts = [l.name, district, l.city].filter(Boolean);
    const bedrooms = Math.max(0, Number(l.bedrooms ?? ar?.bedrooms ?? 0));
    const baths = Math.max(0, Number(l.bathrooms ?? portfolioRow.airroiGeoUsed?.baths ?? 0));
    const guestsMax = Math.max(0, Number(l.guests ?? 0));
    const geoUsed = portfolioRow.airroiGeoUsed;
    return {
      listingId,
      name: l.name ?? 'Bien',
      lat: latListing,
      lng: lngListing,
      airroiListingLat: airroiLat,
      airroiListingLng: airroiLng,
      gpsDeltaMeters,
      addressLine: parts.length ? parts.join(', ') : null,
      coordsSource: latListing != null ? 'listing Mongo (lat/lng)' : 'GPS manquant — renseigner sur la fiche listing',
      lastAirroiGeoSource: geoUsed?.source ?? null,
      lastAirroiGeoSent:
        geoUsed?.lat != null && geoUsed?.lng != null
          ? `${geoUsed.lat.toFixed(5)}, ${geoUsed.lng.toFixed(5)}`
          : null,
      bedrooms,
      baths,
      guests: guestsMax,
      personCapacityPricing: l.personCapacityPricing ?? null,
      airbnbListingId: l.airbnbListingId ?? null,
    };
  }, [listingId, portfolioRow]);

  const compRows = useMemo(() => {
    if (!portfolioRow) return [];
    const bienPos = resolveBienLatLng(portfolioRow);
    const self = buildSelfCompRow(portfolioRow);
    const others = (portfolioRow.airroiComps ?? [])
      .filter((c) => c.airbnbListingId !== portfolioRow.listing.airbnbListingId)
      .map((c, i) => buildCompRowFromAirroi(c, i + 2, bienPos));
    return self ? [self, ...others] : others;
  }, [portfolioRow]);

  const compsMarketStats = useMemo(
    () => computeCompsMarketStats(compRows),
    [compRows],
  );

  const selfVsComps = useMemo(() => {
    const self = compRows.find((r) => r.isSelf) ?? null;
    return compareSelfToCompsMedian(self, compsMarketStats);
  }, [compRows, compsMarketStats]);

  const { compMapPins, bienMapPosition } = useMemo(() => {
    if (!portfolioRow) {
      return {
        compMapPins: [] as CompMapPin[],
        bienMapPosition: null as { lat: number; lng: number } | null,
      };
    }
    const pos = resolveBienLatLng(portfolioRow);
    const bienMapPosition = pos;

    const pins: CompMapPin[] = (portfolioRow.airroiComps ?? [])
      .filter(
        (c) =>
          c.latitude != null &&
          c.longitude != null &&
          Number(c.latitude) !== 0 &&
          Number(c.longitude) !== 0,
      )
      .map((c) => ({
        id: c.airbnbListingId ?? c.name,
        name: c.name,
        adr: c.adrTtmMad,
        occupancy: c.occupancyTtm,
        rating: c.rating,
        lat: Number(c.latitude),
        lng: Number(c.longitude),
        ratingColor: c.rating >= 4.8 ? '#0a8f5e' : c.rating >= 4.5 ? '#c79b22' : '#a5d165',
      }));

    return { compMapPins: pins, bienMapPosition };
  }, [portfolioRow]);

  const hasRevenueEstimate = Boolean(portfolioRow?.hasRevenueEstimate);
  /** Snapshot future/rates (comparaison OTA — pas le moteur de prix) */
  const showAirroiOtaCalendar = calendarFromAirroi && calendarDays.length > 0;
  /** Preview pilote (estimate + bornes) — affiché avant envoi calendrier */
  const usesPilotPreview = pilot.hasSojoriPreview && pilot.previewDays.length > 0;
  const displayCalendarDays = usesPilotPreview
    ? pilot.previewDays
    : events.length > 0
      ? overlayEventsOnCalendarDays(calendarDays, events)
      : pilot.previewLoading
        ? pilot.previewDays
        : calendarDays;
  /** Courbe bleue = estimate marché brut (avant corrections Sojori) */
  const calendarMarketDays =
    usesPilotPreview && pilot.previewMarketDays.length > 0
      ? pilot.previewMarketDays
      : undefined;
  /** Courbe grise = calculatedPrice calendrier ops actuel */
  const calendarOpsDays =
    usesPilotPreview && pilot.previewCalendarDays.length > 0
      ? pilot.previewCalendarDays
      : undefined;
  const calendarHasEventOverlay = !usesPilotPreview && events.length > 0;
  const displayHasCalendarProd =
    usesPilotPreview ||
    pilot.previewLoading ||
    showAirroiOtaCalendar ||
    hasRevenueEstimate ||
    calendarFromCache;
  const displayCalendarFromAirroi =
    !usesPilotPreview && !calendarHasEventOverlay && showAirroiOtaCalendar;
  const displayCalendarFromCache =
    usesPilotPreview || (!showAirroiOtaCalendar && (pilot.hasSojoriPreview || calendarFromCache));
  const calendarWindowMode: 'rolling12m' | 'calendarYear' =
    calendarFromCache && !usesPilotPreview && !hasRevenueEstimate
      ? 'calendarYear'
      : 'rolling12m';
  const calendarPricingSource: 'estimate' | 'sojori' | 'airroi' = usesPilotPreview
    ? hasRevenueEstimate
      ? 'estimate'
      : 'sojori'
    : displayCalendarFromAirroi
      ? 'airroi'
      : 'sojori';

  const onExpandDay = pilot.expandDay;

  if (!listingId) return null;

  if (!portfolioRow) {
    return {
      loading,
      error,
      row: null,
      listingHasAirbnb: false,
      hasMarketProd: false,
      marketFetchedAt: null,
      hasTtm: false,
      hasL90d: false,
      applyToOps,
      runCalendarUpdate,
      refetch: load,
      refreshAirroi,
      refreshAirroiPart,
      listingEstimateInputs,
      view: null,
    };
  }

  const airroiCompsCount =
    portfolioRow.airroiCompsCount ?? portfolioRow.airroiComps?.length ?? 0;
  let { performance, hasTtm, hasL90d } = buildPerformanceFromAirroi(portfolioRow);
  performance.pacing.compsCount = airroiCompsCount;

  const est = portfolioRow.estimateSummary;
  const compRevenues = compRows.filter((r) => !r.isSelf).map((r) => r.revenueTtm);
  const p50Comps = medianPositive(compRevenues);
  let hasPotentialProd = false;
  let potentialHint: string | undefined;
  if (est && est.revenueP50Mad > 0) {
    hasPotentialProd = true;
    performance = {
      ...performance,
      potentialAnnual: {
        p25: est.revenueP25Mad,
        p50: est.revenueP50Mad,
        p75: est.revenueP75Mad,
        currency: 'MAD',
      },
      potentialUsd: Math.round(est.revenueP50Mad / USD_TO_MAD),
    };
    const snap = portfolioRow.airroiSnapshotAt
      ? new Date(portfolioRow.airroiSnapshotAt).toLocaleString('fr-FR', {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      : null;
    potentialHint = snap
      ? `GET /calculator/estimate · snapshot ${snap}`
      : 'GET /calculator/estimate (AirROI)';
  } else if (p50Comps > 0) {
    hasPotentialProd = true;
    performance = {
      ...performance,
      potentialAnnual: {
        p25: Math.round(p50Comps * 0.72),
        p50: p50Comps,
        p75: Math.round(p50Comps * 1.28),
        currency: 'MAD',
      },
      potentialUsd: Math.round(p50Comps / USD_TO_MAD),
    };
    potentialHint = `Médiane revenus TTM des ${compRevenues.length} comps marché`;
  }

  const estimatedRevenueMad =
    est?.revenueP50Mad && est.revenueP50Mad > 0 ? est.revenueP50Mad : undefined;

  const compsAdrValues = compRows.map((r) => r.adrTtm).filter((n) => n > 0);
  const compsMedianAdr = medianPositive(compsAdrValues);
  const selfCompAdr = compRows.find((r) => r.isSelf)?.adrTtm ?? 0;
  const boundsContextHint =
    compsMedianAdr > 0 || est?.adrP50Mad
      ? [
          compsMedianAdr > 0
            ? `Comps directs (§07) : ADR médiane ≈ ${compsMedianAdr.toLocaleString('fr-FR')} MAD/nuit`
            : null,
          selfCompAdr > 0
            ? `Votre annonce Airbnb (TTM snapshot) : ≈ ${selfCompAdr.toLocaleString('fr-FR')} MAD`
            : null,
          est?.adrP50Mad
            ? `Calculator/estimate (modèle AirROI) : ADR P50 ≈ ${est.adrP50Mad.toLocaleString('fr-FR')} MAD — peut être plus bas que les comps luxe`
            : null,
          'Les curseurs §03 (500 min) = bornes du slider UI, pas un prix imposé par AirROI.',
        ]
          .filter(Boolean)
          .join(' · ')
      : undefined;

  const airroiBedrooms = Math.max(0, Number(portfolioRow.listing.bedrooms ?? 0));
  const airroiBaths = Math.max(
    1,
    Number(portfolioRow.listing.bathrooms ?? portfolioRow.airroiGeoUsed?.baths ?? airroiBedrooms),
  );
  const airroiGuestsMax = Math.max(1, Number(portfolioRow.listing.guests ?? 0));
  const listing = {
    ...portfolioRow.listing,
    district: portfolioRow.airroiRaw?.district ?? portfolioRow.listing.district ?? '—',
    airroiZone: portfolioRow.airroiRaw?.district ?? undefined,
    maxGuests: airroiGuestsMax,
    airroiApiProfile: `API AirROI · ${airroiBedrooms} ch. · ${airroiBaths} sdb. · ${airroiGuestsMax} pers. max`,
    amenities: portfolioRow.listing.amenities ?? [],
    position: resolveBienLatLng(portfolioRow) ?? portfolioRow.listing.position,
  };

  const marketKpis: MarketKpis | undefined =
    hasMarketProd && cityKpisProd
      ? {
          occupancyAvg: cityKpisProd.occupancyAvg24m,
          adrMedianDistrict: 0,
          adrMedianCity: cityKpisProd.adrMedianCity,
          supplyGrowthPct: cityKpisProd.supplyGrowthPct,
          leadTimeDays: cityKpisProd.bookingLeadTimeDays ?? 0,
          avgStayNights:
            cityKpisProd.avgStayNightsCity ??
            portfolioRow.airroiRaw?.ttm_avg_length_of_stay ??
            0,
          activeListings: cityKpisProd.activeListingsCount ?? 0,
        }
      : undefined;

  const market = {
    district: {
      adrMedian:
        portfolioRow.airroiRaw?.ttm_avg_rate != null
          ? Math.round(portfolioRow.airroiRaw.ttm_avg_rate * USD_TO_MAD)
          : 0,
      occMedian: portfolioRow.airroiRaw?.ttm_occupancy ?? 0,
      growth: 0,
    },
    city: {
      adrMedian: cityKpisProd?.adrMedianCity ?? 0,
      occMedian: cityKpisProd?.occupancyAvg24m ?? 0,
      growth: 0,
    },
    pacingByMonth: [],
    seasonality: [],
    leadTimeDays: 0,
    avgStayNights: portfolioRow.airroiRaw?.ttm_avg_length_of_stay ?? 0,
    recoBounds: { floor: floor ?? 0, ceiling: ceiling ?? 0 },
    kpis: marketKpis,
  };

  return {
    loading,
    error,
    row: portfolioRow,
    listingHasAirbnb: Boolean(
      portfolioRow.listing.airbnbConnected && portfolioRow.listing.airbnbListingId,
    ),
    hasMarketProd,
    marketFetchedAt,
    hasTtm,
    hasL90d,
    applyToOps,
    runCalendarUpdate,
    refetch: load,
    refreshAirroi,
    refreshAirroiPart,
    listingEstimateInputs,
    view: {
      listing,
      provenance: {
        snapshotAt: portfolioRow.airroiSnapshotAt,
        ttmPeriodLabel: portfolioRow.perfMeta?.ttmPeriodLabel ?? null,
        calendarFromCache,
        hasAirroiSnapshot: Boolean(portfolioRow.hasAirroiSnapshot),
        hasRevenueEstimate,
        perfSource: portfolioRow.perfMeta?.source ?? null,
      },
      hasTtm,
      hasL90d,
      hasPotentialProd,
      hasMarketProd,
      hasCalendarProd: displayHasCalendarProd,
      calendarFromAirroi: displayCalendarFromAirroi,
      calendarFromCache: displayCalendarFromCache,
      calendarUsesPilotPreview: usesPilotPreview,
      calendarPricingSource,
      calendarHasEventOverlay,
      calendarWindowMode,
      eventsCount: events.length,
      pilotPreviewLoading: pilot.previewLoading,
      pilotApplyLoading: pilot.applyLoading,
      pilotApplySummary: pilot.lastApplySummary,
      previewDiffData: previewDiff.data,
      previewDiffLoading: previewDiff.loading,
      previewDiffError: previewDiff.error,
      previewDiffOnlyChanged: previewDiff.onlyChanged,
      onPreviewDiffOnlyChanged: previewDiff.setOnlyChanged,
      onPreviewDiffReload: previewDiff.reload,
      pilotApplyError: applyError,
      potentialHint,
      calendarPricingSource,
      hasCompsProd: compRows.length > 1 || airroiCompsCount > 0,
      performance,
      market,
      comps: [],
      aiEnabled,
      floor: floor ?? 0,
      ceiling: ceiling ?? 0,
      mode,
      activeModeId,
      pricingModes,
      gapBlockEnabled,
      gapBlockMinNights,
      modeEnabled,
      applyPrice: aiEnabled && applyPrice,
      applyMinStay: aiEnabled && applyMinStay,
      scopeModalOpen,
      scopeModalEdit,
      scopeSaving,
      scopeSaveError,
      configSaveStatus,
      events,
      eventModalOpen,
      editingEventId,
      suggestions: [],
      calendarYear,
      calendarDays: displayCalendarDays,
      calendarMarketDays,
      calendarOpsDays,
      calendarYearOptions: [calendarYear, calendarYear + 1],
      compsMarketStats,
      selfVsComps,
      hasCompsMarket: Boolean(compsMarketStats && compsMarketStats.count > 0),
      seasonality: marketCharts.seasonality,
      pacing: marketCharts.pacing,
      supplyGrowth: marketCharts.supplyGrowth,
      compMapPins,
      bienMapPosition,
      calendarAirroiError,
      airroiCalendarDaysCount: portfolioRow.airroiCalendarDaysCount ?? calendarDays.length,
      compRows,
      estimatedRevenueMad,
      estimatedRevenueLiftPct: undefined,
      boundsContextHint,
      compsMedianAdr: compsMedianAdr > 0 ? compsMedianAdr : undefined,
      estimateAdrMad: est?.adrP50Mad,
      onToggleAi: async (enabled: boolean) => {
        if (!listingId) return;
        if (enabled) {
          setScopeModalEdit(false);
          setScopeModalOpen(true);
          return;
        }
        setAiEnabled(false);
        try {
          await savePilotConfig(listingId, { enabled: false });
        } catch {
          /* garde état local */
        }
      },
      onScopeModalClose: () => {
        if (scopeSaving) return;
        setScopeModalOpen(false);
        setScopeSaveError(null);
      },
      onScopeModalConfirm: async (choice: { applyPrice: boolean; applyMinStay: boolean }) => {
        if (!listingId) return;
        setScopeSaving(true);
        setScopeSaveError(null);
        setApplyPrice(choice.applyPrice);
        setApplyMinStay(choice.applyMinStay);
        try {
          const payload = pilot.buildConfigPayload();
          await savePilotConfig(listingId, {
            ...(scopeModalEdit ? {} : { enabled: true }),
            applyPrice: choice.applyPrice,
            applyMinStay: choice.applyMinStay,
            ...(payload ?? {}),
          });
          if (!scopeModalEdit) setAiEnabled(true);
          setScopeModalOpen(false);
          setConfigSaveStatus('saved');
          await pilot.runPreview();
        } catch (e) {
          let msg = 'Enregistrement impossible';
          if (isAxiosError(e)) {
            const data = e.response?.data as { error?: string } | undefined;
            msg = data?.error ?? `HTTP ${e.response?.status ?? '—'} — ${e.message}`;
          } else if (e instanceof Error) {
            msg = e.message;
          }
          setScopeSaveError(msg);
        } finally {
          setScopeSaving(false);
        }
      },
      onEditSyncScope: () => {
        setScopeModalEdit(true);
        setScopeModalOpen(true);
      },
      onFloorChange: (v) => {
        setFloor(v);
        scheduleConfigSave();
      },
      onCeilingChange: (v) => {
        setCeiling(v);
        scheduleConfigSave();
      },
      onApplyRecoBounds: () => {
        const adrs = compRows.map((r) => r.adrTtm).filter((n) => n > 0);
        const compsMed = medianPositive(adrs);
        const selfAdr = compRows.find((r) => r.isSelf)?.adrTtm ?? 0;
        const estimateAdr = portfolioRow.estimateSummary?.adrP50Mad ?? 0;
        const ref =
          compsMed > 0
            ? compsMed
            : selfAdr > 0
              ? selfAdr
              : estimateAdr > 0
                ? estimateAdr
                : portfolioRow.airroiRaw?.ttm_avg_rate != null
                  ? Math.round(portfolioRow.airroiRaw.ttm_avg_rate * USD_TO_MAD)
                  : 0;
        if (ref <= 0) return;
        setFloor(Math.round(ref * 0.65));
        setCeiling(Math.round(ref * 1.35));
        scheduleConfigSave();
      },
      onActiveModeChange: (id: string) => {
        setActiveModeId(id);
        if (['prudent', 'equilibre', 'agressif'].includes(id)) {
          setMode(id as PricingMode);
        }
        scheduleConfigSave();
      },
      onModeToggle: (modeId: string, enabled: boolean) => {
        setPricingModes((prev) => {
          const next = prev.map((m) => (m.id === modeId ? { ...m, enabled } : m));
          if (!enabled && activeModeId === modeId) {
            const fallback = next.find((m) => m.enabled);
            if (fallback) {
              setActiveModeId(fallback.id);
              if (fallback.kind === 'preset') setMode(fallback.id as PricingMode);
            }
          }
          return next;
        });
        scheduleConfigSave();
      },
      onAddCustomMode: () => {
        const id = `custom_${Date.now()}`;
        setPricingModes((prev) => [
          ...prev,
          { id, label: 'Personnalisé', multiplier: 1.05, kind: 'custom', enabled: true },
        ]);
        setActiveModeId(id);
        scheduleConfigSave();
      },
      onUpdateCustomMode: (modeId: string, patch: Partial<Pick<PricingModeDef, 'label' | 'multiplier'>>) => {
        setPricingModes((prev) =>
          prev.map((m) => (m.id === modeId ? { ...m, ...patch } : m)),
        );
        scheduleConfigSave();
      },
      onDeleteCustomMode: (modeId: string) => {
        setPricingModes((prev) => {
          const next = prev.filter((m) => m.id !== modeId);
          if (activeModeId === modeId) {
            const fallback = next.find((m) => m.enabled) ?? next[0];
            if (fallback) {
              setActiveModeId(fallback.id);
              if (fallback.kind === 'preset') setMode(fallback.id as PricingMode);
            }
          }
          return next.length ? next : DEFAULT_PRICING_MODES;
        });
        scheduleConfigSave();
      },
      onGapBlockEnabledChange: (on) => {
        setGapBlockEnabled(on);
        scheduleConfigSave();
      },
      onGapBlockMinNightsChange: (v) => {
        setGapBlockMinNights(Math.max(2, Math.min(14, Math.round(v))));
        scheduleConfigSave();
      },
      onModeEnabledChange: (v) => {
        setModeEnabled(v);
        scheduleConfigSave();
      },
      onAddEvent: () => {
        setEditingEventId(null);
        setEventModalOpen(true);
      },
      onEditEvent: (id: string) => {
        setEditingEventId(id);
        setEventModalOpen(true);
      },
      onDeleteEvent: async (id: string) => {
        const next = events.filter((e) => e.id !== id);
        setEvents(next);
        try {
          await persistPilotConfig(next);
          await pilot.runPreview().catch(() => undefined);
        } catch {
          /* configSaveStatus = error */
        }
      },
      onEventModalClose: () => setEventModalOpen(false),
      onEventSave: async (ev: PricingEvent) => {
        const next = editingEventId
          ? events.map((e) => (e.id === editingEventId ? ev : e))
          : [...events, ev];
        setEvents(next);
        setEventModalOpen(false);
        try {
          await persistPilotConfig(next);
          await pilot.runPreview().catch(() => undefined);
        } catch {
          /* configSaveStatus = error */
        }
      },
      onAcceptSuggestion: () => {},
      onYearChange: setCalendarYear,
      onApplyToOps: applyToOps,
      onRunCalendarUpdate: runCalendarUpdate,
      activeModeLabel:
        pricingModes.find((m) => m.id === activeModeId)?.label ??
        (activeModeId === 'prudent'
          ? 'Prudent'
          : activeModeId === 'agressif'
            ? 'Agressif'
            : 'Équilibré'),
      onExpandDay,
    },
  };
}
