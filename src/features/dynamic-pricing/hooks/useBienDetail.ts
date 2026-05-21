import { useCallback, useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import type { BienViewProps } from '../BienView';
import type { PricingMode } from '../bien/PricingControls';
import type { MarketKpis } from '../bien/MarketCharts';
import type { MarketCityKpis } from '../PortfolioView';
import type { CalendarDay } from '../bien/YearlyCalendar';
import type { CompRow } from '../bien/CompsTable';
import type { BienDetailPerformance, PriceFactor, PortfolioRow } from '../_tokens';
import {
  fetchDynamicPricingPortfolio,
  fetchPilotConfig,
  refreshOneListingPerformanceAirroi,
} from '../../../services/dynamicPricingApi';
import type { PricingEvent } from '../bien/PricingControls';
import { usePilotPricing } from './usePilotPricing';
import { mapPortfolioApiToView } from './mapPortfolioApi';
import { chartsFromApi } from '../utils/extractMarketChartsFromApi';
import type { CompMapPin } from '../bien/MarrakechMap';
import { haversineMeters } from '../utils/geoDistance';
import {
  compareSelfToCompsMedian,
  computeCompsMarketStats,
} from '../utils/computeCompsMarketStats';
import { normalizeCityKey } from '../cityScope';

const USD_TO_MAD = 10;

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

function resolveBienLatLng(row: PortfolioRow): { lat: number; lng: number } | null {
  const ar = row.airroiRaw;
  const lat = ar?.latitude ?? row.listing.position?.lat;
  const lng = ar?.longitude ?? row.listing.position?.lng;
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
  refetch: () => Promise<void>;
  refreshAirroi: () => Promise<{ costUsd?: number } | void>;
  view: BienViewProps | null;
};

export function useBienDetail(listingId: string | undefined): BienDetailResult | null {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [floor, setFloor] = useState<number | null>(null);
  const [ceiling, setCeiling] = useState<number | null>(null);
  const [mode, setMode] = useState<PricingMode>('equilibre');
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
    hasAirroiSnapshot: Boolean(portfolioRow?.hasAirroiSnapshot),
    mode,
    floor,
    ceiling,
    aiEnabled,
    events,
    calendarYear,
  });

  const load = useCallback(async () => {
    if (!listingId) return;
    setLoading(true);
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
          : null;
      setFloor(row.bounds?.floor ?? (adrMad != null ? Math.round(adrMad * 0.65) : null));
      setCeiling(row.bounds?.ceiling ?? (adrMad != null ? Math.round(adrMad * 1.35) : null));

      try {
        const cfgRes = await fetchPilotConfig(listingId);
        if (cfgRes.data?.success && cfgRes.data.config) {
          const c = cfgRes.data.config;
          setMode(c.mode);
          setFloor(c.floorNormal);
          setCeiling(c.ceiling);
          setAiEnabled(c.enabled);
        }
      } catch {
        /* défauts locaux */
      }

      let days: CalendarDay[] = [];
      let fromCache = false;
      let fromAirroi = false;
      if (!fromCache && row.hasAirroiSnapshot) {
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
      await load();
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : String(e));
      throw e;
    }
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
    const ar = portfolioRow.airroiRaw;
    const lat = ar?.latitude ?? portfolioRow.listing.position?.lat;
    const lng = ar?.longitude ?? portfolioRow.listing.position?.lng;
    const bienMapPosition =
      lat != null && lng != null && Number(lat) !== 0 && Number(lng) !== 0
        ? { lat: Number(lat), lng: Number(lng) }
        : null;

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

  /** Snapshot marché (future/rates) : prioritaire — courbe 365j + grille dès le mois courant */
  const showAirroiCalendar = calendarFromAirroi && calendarDays.length > 0;
  const displayCalendarDays = showAirroiCalendar
    ? calendarDays
    : pilot.hasSojoriPreview
      ? pilot.previewDays
      : calendarDays;
  const displayHasCalendarProd =
    showAirroiCalendar || pilot.hasSojoriPreview || calendarFromCache || calendarFromAirroi;
  const displayCalendarFromAirroi = showAirroiCalendar;
  const displayCalendarFromCache =
    !showAirroiCalendar && (pilot.hasSojoriPreview || calendarFromCache);

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
      refetch: load,
      refreshAirroi,
      view: null,
    };
  }

  const airroiCompsCount =
    portfolioRow.airroiCompsCount ?? portfolioRow.airroiComps?.length ?? 0;
  let { performance, hasTtm, hasL90d } = buildPerformanceFromAirroi(portfolioRow);
  performance.pacing.compsCount = airroiCompsCount;

  const compRevenues = compRows.filter((r) => !r.isSelf).map((r) => r.revenueTtm);
  const p50Comps = medianPositive(compRevenues);
  let hasPotentialProd = false;
  if (p50Comps > 0) {
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
  }

  const listing = {
    ...portfolioRow.listing,
    district: portfolioRow.airroiRaw?.district ?? portfolioRow.listing.district ?? '—',
    airroiZone: portfolioRow.airroiRaw?.district ?? undefined,
    maxGuests: portfolioRow.listing.guests,
    amenities: portfolioRow.listing.amenities ?? [],
    position:
      portfolioRow.airroiRaw?.latitude != null && portfolioRow.airroiRaw?.longitude != null
        ? {
            lat: portfolioRow.airroiRaw.latitude,
            lng: portfolioRow.airroiRaw.longitude,
          }
        : portfolioRow.listing.position,
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
    refetch: load,
    refreshAirroi,
    view: {
      listing,
      provenance: {
        snapshotAt: portfolioRow.airroiSnapshotAt,
        ttmPeriodLabel: portfolioRow.perfMeta?.ttmPeriodLabel ?? null,
        calendarFromCache,
        hasAirroiSnapshot: Boolean(portfolioRow.hasAirroiSnapshot),
      },
      hasTtm,
      hasL90d,
      hasPotentialProd,
      hasMarketProd,
      hasCalendarProd: displayHasCalendarProd,
      calendarFromAirroi: displayCalendarFromAirroi,
      calendarFromCache: displayCalendarFromCache,
      pilotPreviewLoading: pilot.previewLoading,
      pilotApplyLoading: pilot.applyLoading,
      pilotApplySummary: pilot.lastApplySummary,
      pilotApplyError: applyError,
      potentialHint:
        hasPotentialProd && p50Comps > 0
          ? `Estimation P50 · médiane revenus TTM des ${compRevenues.length} comps marché`
          : undefined,
      hasCompsProd: compRows.length > 1 || airroiCompsCount > 0,
      performance,
      market,
      comps: [],
      aiEnabled,
      floor: floor ?? 0,
      ceiling: ceiling ?? 0,
      mode,
      events,
      suggestions: [],
      calendarYear,
      calendarDays: displayCalendarDays,
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
      compRows,
      estimatedRevenueMad: undefined,
      estimatedRevenueLiftPct: undefined,
      onToggleAi: setAiEnabled,
      onFloorChange: (v) => setFloor(v),
      onCeilingChange: (v) => setCeiling(v),
      onApplyRecoBounds: () => {
        const adr = portfolioRow.airroiRaw?.ttm_avg_rate;
        if (adr == null) return;
        const m = Math.round(adr * USD_TO_MAD);
        setFloor(Math.round(m * 0.65));
        setCeiling(Math.round(m * 1.35));
      },
      onModeChange: setMode,
      onAddEvent: () => {},
      onEditEvent: () => {},
      onDeleteEvent: () => {},
      onAcceptSuggestion: () => {},
      onYearChange: setCalendarYear,
      onApplyToOps: applyToOps,
      onExpandDay,
    },
  };
}
