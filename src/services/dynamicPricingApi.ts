/**
 * Dynamic Pricing — BFF srv-admin → srv-dynamic-pricing
 */
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type { AirroiRawFields } from '../features/dynamic-pricing/_tokens';

const BASE = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/dynamic-pricing`;

export type PortfolioListingDto = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  zoneId: string;
  lat?: number;
  lng?: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  /** personCapacityMax — envoyé à AirROI comme `guests` */
  guests?: number | null;
  /** personCapacity — tarif base (affichage uniquement) */
  personCapacityPricing?: number | null;
  useDynamicPrice: boolean;
  active?: boolean;
  ruPropertyKey?: string | null;
  airbnbConnected?: boolean;
  airbnbListingId?: string | null;
  airbnbPublicUrl?: string | null;
  airbnbStatus?: string | null;
  airbnbMarkup?: number | null;
  otaVerifiedAt?: string | null;
  otaChannelCount?: number;
  thumbColor: 1 | 2 | 3 | 4 | 5 | 6;
  hasAirroiSnapshot?: boolean;
  hasRevenueEstimate?: boolean;
  estimateSummary?: {
    revenueP25Mad: number;
    revenueP50Mad: number;
    revenueP75Mad: number;
    adrP50Mad: number;
    occupancyP50: number;
  } | null;
  /** Dernier refresh AirROI : coordonnées réellement envoyées (estimate / comparables) */
  airroiGeoUsed?: {
    source: 'sojori_listing_mongo' | 'airroi_listing_snapshot';
    lat: number;
    lng: number;
    bedrooms: number;
    baths: number;
    guests: number;
  } | null;
  airroiSnapshotAt?: string | null;
  /** Dernière application des prix au calendrier. */
  calendarAppliedAt?: string | null;
  /** Dernière publication calendrier → canaux réussie. */
  otaPushedAt?: string | null;
  /** Jours modifiés par le dernier apply (0 = rien à publier vers OTA). */
  lastApplyDaysChanged?: number | null;
  airroiSnapshotCostUsd?: number | null;
  airroiRaw?: AirroiRawFields | null;
  airroiComps?: Array<{
    airbnbListingId: string | null;
    name: string;
    rating: number;
    reviews: number;
    bedrooms: number;
    adrTtmMad: number;
    occupancyTtm: number;
    revenueTtmMad: number;
    locality: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  airroiCompsCount?: number;
  airroiCalendarDays?: Array<{
    date: string;
    priceMad: number;
    status: 'std' | 'prem' | 'blocked';
    available: boolean;
  }>;
  airroiCalendarDaysCount?: number;
  pilotConfig?: PilotPricingConfigDto | null;
  perfMeta?: {
    source: 'airroi_snapshot' | 'estimate';
    snapshotAt: string | null;
    ttmPeriodStart: string | null;
    ttmPeriodEnd: string | null;
    metricsHistoryStart: string | null;
    metricsHistoryEnd: string | null;
    ttmPeriodLabel: string;
    metricsPeriodLabel: string;
    metricsHistoryMonths: number;
  };
};

export type PortfolioApiResponse = {
  success: boolean;
  year: number;
  dataMode?: 'airroi_raw_test';
  macro: {
    totalPotentialMad: number;
    realizedTtmMad: number;
    realizedPctOfPotential: number;
    avgPacingPct: number;
    pacingTrendPts: number;
    aiEnabledCount: number;
    totalListings: number;
    aiOpportunityMad: number;
  };
  cityKpis: {
    cityName: string;
    occupancyAvg24m: number;
    adrMedianCity: number;
    pacingCurrent: { monthLabel: string; fillRate: number };
    pacingNext: { monthLabel: string; fillRate: number };
    supplyGrowthPct: number;
    supplyGrowthMonths: number;
    bookingLeadTimeDays?: number;
    avgStayNightsCity?: number;
    activeListingsCount?: number;
  };
  zoneStats: Record<
    string,
    {
      zoneId: string;
      zoneName: string;
      airroiListings: number;
      adrMedian: number;
      occupancyAvg: number;
      myListingsCount: number;
    }
  >;
  listings: PortfolioListingDto[];
  count: number;
  meta?: {
    totalSojoriListings: number;
    withDynamicPrice: number;
    withAirbnbConnected?: number;
    withAirroiSnapshot?: number;
    source: string;
  };
  marketCache?: {
    hasCity: boolean;
    fetchedAt: string | null;
    zoneCount: number;
    hasCharts?: boolean;
    city?: string;
  };
  marketCharts?: {
    seasonality: Array<{ month: string; occupancy: number; adr: number }>;
    pacing: Array<{ month: string; fillRate: number }>;
    supplyGrowth: Array<{ label: string; listingCount: number }>;
  };
  /** Payload brut cache marché (repli graphiques côté front) */
  market?: {
    cityKpisRaw?: Record<string, unknown> | null;
    zoneStatsRaw?: Record<string, unknown>;
  };
};

export type ListingDetailApiResponse = {
  success: boolean;
  listingId: string;
  year: number;
  listing: {
    _id: string;
    name: string;
    city?: string;
    district?: string;
    lat?: number;
    lng?: number;
    bedrooms?: number;
    guests?: number;
    useDynamicPrice: boolean;
  };
  currency: string;
  days: Array<{ date: string; price: number; status: string }>;
  computedAt: string;
  validUntil: string;
  mixVersion: string;
};

export async function fetchDynamicPricingPortfolio(params?: {
  year?: number;
  ownerId?: string;
  /** Ville active — charge cache marché `marrakech:*` ou `casablanca:*` */
  city?: string | null;
}) {
  const qs = new URLSearchParams();
  if (params?.year) qs.set('year', String(params.year));
  if (params?.ownerId) qs.set('ownerId', params.ownerId);
  if (params?.city) qs.set('city', params.city);
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiClient.get<PortfolioApiResponse>(`${BASE}/portfolio${suffix}`);
}

export async function fetchDynamicPricingListing(
  listingId: string,
  params?: { year?: number },
) {
  const qs = new URLSearchParams();
  if (params?.year) qs.set('year', String(params.year));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiClient.get<ListingDetailApiResponse>(
    `${BASE}/listings/${encodeURIComponent(listingId)}${suffix}`,
  );
}

export async function recomputeDynamicPricingListing(listingId: string) {
  return apiClient.post<{ success: boolean; listingId: string; days: number; applied: boolean }>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/recompute`,
    {},
  );
}

export async function recomputeAllDynamicPricing() {
  return apiClient.post(`${BASE}/internal/cron/recompute-all`, {});
}

export async function refreshMarketDynamicPricing(city?: string | null) {
  return apiClient.post(
    `${BASE}/internal/cron/market-refresh`,
    city ? { city } : {},
    { timeout: 300_000 },
  );
}

export type ListingPerformanceRefreshResult = {
  success: boolean;
  refreshed: number;
  skipped: number;
  failed: number;
  totalCostUsd: number;
  errors: string[];
  listingIds: string[];
};

export async function refreshListingPerformanceAirroi(
  ownerId?: string,
  city?: string | null,
) {
  const body: { ownerId?: string; city?: string } = {};
  if (ownerId) body.ownerId = ownerId;
  if (city) body.city = city;
  return apiClient.post<ListingPerformanceRefreshResult>(
    `${BASE}/internal/cron/listing-performance-refresh`,
    body,
    { timeout: 300_000 },
  );
}

export type OneListingPerformanceRefreshResult = {
  success: boolean;
  listingId: string;
  ok: boolean;
  costUsd?: number;
  error?: string;
};

export async function refreshOneListingPerformanceAirroi(listingId: string) {
  return apiClient.post<OneListingPerformanceRefreshResult>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/listing-performance-refresh`,
    {},
    { timeout: 120_000 },
  );
}

export type AirroiListingRefreshPart =
  | 'listing'
  | 'metrics'
  | 'future-rates'
  | 'comparables'
  | 'estimate';

export type OneListingAirroiPartResult = {
  success: boolean;
  listingId: string;
  part: string;
  ok: boolean;
  costUsd?: number;
  error?: string;
};

export async function refreshListingAirroiPart(
  listingId: string,
  part: AirroiListingRefreshPart,
) {
  return apiClient.post<OneListingAirroiPartResult>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/airroi/${encodeURIComponent(part)}`,
    {},
    { timeout: 120_000 },
  );
}

/* ─── Pilote auto v2 ─────────────────────────────────────────── */

export type PilotMode = 'prudent' | 'equilibre' | 'agressif';

export interface G7Factor {
  key: string;
  label: string;
  sub?: string;
  valueMad: number;
  kind: 'base' | 'plus' | 'minus' | 'clamp' | 'neutral';
  appliedAt: string;
  inputBefore: number;
  inputAfter: number;
}

export interface MinStayFactorDto {
  key: string;
  label: string;
  sub?: string;
  nightsBefore: number;
  nightsAfter: number;
  kind: 'base' | 'plus' | 'neutral' | 'clamp';
}

export interface G7Breakdown {
  airroiSnapshotId: string;
  airroiRateUsd: number;
  fxUsdMad: number;
  factors: G7Factor[];
  marketMinNights: number;
  minStayFactors: MinStayFactorDto[];
  finalPriceMad: number;
  finalMinStay: number;
  finalMinStaySource: string;
  computedAt: string;
  mixEngineVersion: string;
}

export type PilotEventKindDto = 'fixed' | 'market_percent';

export interface PilotPricingEventDto {
  _id: string;
  label: string;
  emoji?: string;
  startDate: string;
  endDate: string;
  eventKind?: PilotEventKindDto;
  eventFloorMad: number;
  eventMarketPercent?: number;
  minNightsOverride?: number;
  /** false = règle conservée mais ignorée au calcul. */
  enabled?: boolean;
}

export interface PricingModeDefinitionDto {
  id: string;
  label: string;
  multiplier: number;
  kind: 'preset' | 'custom';
  enabled: boolean;
}

export interface PilotPricingConfigDto {
  listingId: string;
  enabled: boolean;
  applyPrice?: boolean;
  applyMinStay?: boolean;
  modeEnabled?: boolean;
  mode: PilotMode;
  activeModeId?: string;
  modes?: PricingModeDefinitionDto[];
  floorNormal: number;
  ceiling: number;
  floorAggressive?: number;
  lastMinuteEnabled?: boolean;
  lastMinuteWindowDays?: number;
  /** Début fenêtre (A) — jours avant arrivée, inclus. */
  lastMinuteFromDays?: number;
  /** Fin fenêtre (B) — jours avant arrivée, inclus. */
  lastMinuteToDays?: number;
  /** % sur prix dynamique si dispo (ex. −15). */
  lastMinuteDiscountPct?: number;
  occupancyBandsEnabled?: boolean;
  occupancyBands?: Array<{
    min: number;
    max: number;
    adjustment: number;
    active?: boolean;
  }>;
  /** estimate = marché AirROI · manual_base = montant fixe MAD */
  pricingBaseSource?: 'estimate' | 'manual_base';
  /** Base fixe MAD si pricingBaseSource === 'manual_base' (ex. 1000). */
  manualBasePriceMad?: number;
  minStayDelta: number;
  minStayPlancher?: number;
  gapBlockEnabled?: boolean;
  gapBlockMinNights?: number;
  /** Si false, les events restent stockés mais ne s’appliquent pas. */
  eventsEnabled?: boolean;
  events: PilotPricingEventDto[];
  fxUsdMad?: number;
  /** Refresh auto estimation marché (lun + jeu). */
  autoSnapshotEnabled?: boolean;
  lastAutoSnapshotAt?: string;
  /** Refresh auto comparables (lundi 04:00 UTC). */
  autoCompsEnabled?: boolean;
  lastCompsAt?: string;
  lastAutoCompsAt?: string;
  lastAppliedAt?: string;
  lastPreviewAt?: string;
}

export interface PilotPreviewDay {
  date: string;
  price: number;
  marketPriceMad?: number;
  calendarPriceMad?: number;
  finalPriceMad: number;
  minStay: number;
  status: string;
  breakdown: G7Breakdown;
  pushToCalendar?: boolean;
  skipReason?: string;
}

export async function fetchPilotConfig(listingId: string) {
  return apiClient.get<{ success: boolean; config: PilotPricingConfigDto }>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/pilot-config`,
  );
}

export async function savePilotConfig(
  listingId: string,
  config: Partial<PilotPricingConfigDto>,
) {
  return apiClient.put<{ success: boolean; config: PilotPricingConfigDto }>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/pilot-config`,
    config,
  );
}

export async function previewPilotPricing(
  listingId: string,
  config?: Partial<PilotPricingConfigDto>,
) {
  return apiClient.post<{
    success: boolean;
    listingId: string;
    days: PilotPreviewDay[];
    summary: Record<string, number>;
    airroiSnapshotId: string;
  }>(`${BASE}/listings/${encodeURIComponent(listingId)}/preview`, config ? { config } : {});
}

export type ApplyNarrativeDto = {
  steps: Array<{ n: number; title: string; detail: string }>;
  base: {
    source: 'estimate' | 'manual_base';
    label: string;
    snapshotAt: string | null;
    manualBasePriceMad?: number;
  };
  mode: { label: string; multiplier: number };
  occupancyMonths: Array<{
    monthKey: string;
    monthLabel: string;
    occupancyPct: number;
    adjustmentPct: number | null;
    days: number;
  }>;
  lastMinute: {
    enabled: boolean;
    windowDays: number;
    fromDays?: number;
    toDays?: number;
    discountPct: number;
    daysHit: number;
    ranges: Array<{
      startDate: string;
      endDate: string;
      days: number;
      discountPct: number;
    }>;
  };
  bounds: { floor: number; ceiling: number };
  eventsCount: number;
};

export type PilotApplyReportDto = {
  mixEngineVersion: string;
  pricingSource: 'calculator_estimate' | 'manual_base';
  hasEstimate: boolean;
  estimateSnapshotAt: string | null;
  activeModeLabel: string;
  modeMultiplier: number;
  floorNormal: number;
  ceiling: number;
  gapBlockEnabled: boolean;
  gapBlockMinNights: number;
  eventsCount: number;
  applyPrice: boolean;
  applyMinStay: boolean;
  daysComputed: number;
  daysPricePushed: number;
  daysMinStayPushed: number;
  daysGapStopSell: number;
  daysGapMinStayAdjusted?: number;
  daysGapSignaled?: number;
  daysGapMinStayReleased?: number;
  gapsFilled: number;
  gapRanges: Array<{
    startDate: string;
    endDate: string;
    nights: number;
    minNightsRequired: number;
    suggestedMinStay?: number;
    signalOnly?: boolean;
  }>;
  gapSignalRanges?: Array<{
    startDate: string;
    endDate: string;
    nights: number;
    minNightsRequired: number;
    signalOnly?: boolean;
  }>;
  daysSkippedTotal: number;
  daysSkippedManual: number;
  daysSkippedReserved: number;
  daysSkippedUnavailable: number;
  daysSkippedOther: number;
  daysAtFloor: number;
  daysAtCeiling: number;
  daysWithEvent: number;
  daysLastMinute: number;
  avgPriceMad: number;
  minPriceMad: number;
  maxPriceMad: number;
  daysChanged: number;
  daysCalendarDatesUpdated?: number;
  daysPayloadPriceDays?: number;
  daysSkippedInCalendar?: number;
  daysPayloadMissingInventory?: number;
  roomTypesTouched?: number;
  ruPublishQueued: boolean;
  legacyEngineDisabled: boolean;
  /** Récit cascade réelle de cet apply (persisté aussi en audit). */
  narrative?: ApplyNarrativeDto;
};

export async function applyPilotPricing(
  listingId: string,
  body?: { config?: Partial<PilotPricingConfigDto>; triggerSource?: string },
) {
  return apiClient.post<{
    success: boolean;
    listingId: string;
    applyAuditId: string;
    daysChanged: number;
    daysSkipped: number;
    ruPublishQueued: boolean;
    recommendedPriceCacheId: string;
    applyReport: PilotApplyReportDto;
  }>(`${BASE}/listings/${encodeURIComponent(listingId)}/apply`, body ?? {}, {
    timeout: 180_000,
  });
}

export type ApplyReportSummaryDto = {
  mixEngineVersion: string;
  daysPayloadPriceDays: number;
  daysCalendarDatesUpdated: number;
  daysChanged: number;
  daysGapMinStayAdjusted: number;
  daysGapMinStayReleased: number;
  daysGapSignaled: number;
  daysSkippedReserved: number;
  daysSkippedManual?: number;
  daysSkippedUnavailable?: number;
  daysPayloadMissingInventory: number;
  ruPublishQueued: boolean;
  narrative?: ApplyNarrativeDto;
};

export type ListingApplySyncDto = {
  listingId: string;
  auditId: string;
  appliedAt: string;
  appliedBy: string;
  triggerSource: string;
  summary: ApplyReportSummaryDto | null;
  daysChanged: number;
};

export type PortfolioApplySyncSummaryDto = {
  success: boolean;
  fleetLast: ListingApplySyncDto | null;
  byListing: ListingApplySyncDto[];
  aggregates: {
    listingsWithApply: number;
    totalDaysCalendarUpdated: number;
    totalDaysPayloadPrice: number;
  };
};

export async function fetchApplySyncSummary(listingIds: string[]) {
  const qs =
    listingIds.length > 0
      ? `?listingIds=${listingIds.map((id) => encodeURIComponent(id)).join(',')}`
      : '';
  return apiClient.get<PortfolioApplySyncSummaryDto>(
    `${BASE}/portfolio/apply-sync-summary${qs}`,
  );
}

export type EstimateDayChangeDto = {
  date: string;
  previousMad: number | null;
  currentMad: number;
  deltaMad: number;
  marketPreviousMad?: number | null;
  marketCurrentMad?: number | null;
};

export type ListingEstimateDiffDto = {
  listingId: string;
  hasPrevious: boolean;
  currentComputedAt: string | null;
  previousComputedAt: string | null;
  changedDays: EstimateDayChangeDto[];
  totalChanged: number;
};

export type PortfolioEstimateDiffDto = {
  success: boolean;
  year: number;
  byListing: ListingEstimateDiffDto[];
};

export async function fetchPortfolioEstimateDiff(listingIds: string[]) {
  const qs =
    listingIds.length > 0
      ? `?listingIds=${listingIds.map((id) => encodeURIComponent(id)).join(',')}`
      : '';
  return apiClient.get<PortfolioEstimateDiffDto>(
    `${BASE}/portfolio/estimate-diff${qs}`,
  );
}

export type ApplyPreviewDiffAlertDto =
  | 'ok'
  | 'large_delta'
  | 'below_floor'
  | 'reserved'
  | 'manual'
  | 'blocked'
  | 'no_change';

/** Ajustements réellement appliqués sur le jour (chips aperçu). */
export type ApplyPreviewDiffAppliedDto = {
  occupancyPct?: number;
  lastMinutePct?: number;
  clamp?: 'floor' | 'ceiling';
  gapMinStay?: { from: number; to: number };
  gapSignaled?: boolean;
  /** Base fixe client utilisée (MAD) au lieu de l'estimation marché. */
  baseFixeMad?: number;
};

export type ApplyPreviewDiffRowDto = {
  date: string;
  airroiMad: number | null;
  g7ProposedMad: number | null;
  calendarCurrentMad: number | null;
  /** Prix Sojori figé à la réservation (priceBreakdown) — jours réservés. */
  bookedPriceMad?: number | null;
  baseImportMad: number | null;
  deltaMad: number | null;
  alert: ApplyPreviewDiffAlertDto;
  /** Prix calendrier manuel (applyManual), même si jour réservé ou bloqué. */
  applyManual?: boolean;
  pushToCalendar: boolean;
  skipReason?: string;
  applied?: ApplyPreviewDiffAppliedDto;
};

export type ApplyPreviewDiffDto = {
  success: boolean;
  listingId: string;
  /** estimate ou future/rates selon snapshot */
  marketSource?: 'airroi' | 'estimate';
  airroiSnapshotAt: string | null;
  previewComputedAt: string;
  rows: ApplyPreviewDiffRowDto[];
  summary: {
    totalDays: number;
    daysWithDiff: number;
    daysWithLargeDelta: number;
    daysBlocked: number;
    daysManual: number;
    daysReserved: number;
    daysPushable: number;
  };
};

export async function fetchApplyPreviewDiff(
  listingId: string,
  body?: {
    config?: Partial<PilotPricingConfigDto>;
    onlyChanged?: boolean;
    limit?: number;
  },
) {
  return apiClient.post<ApplyPreviewDiffDto>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/apply-preview-diff`,
    body ?? {},
    { timeout: 120_000 },
  );
}

export async function fetchListingEstimateDiff(listingId: string, year?: number) {
  const qs = year ? `?year=${year}` : '';
  return apiClient.get<{
    success: boolean;
    listingId: string;
    diff: ListingEstimateDiffDto | null;
  }>(`${BASE}/listings/${encodeURIComponent(listingId)}/estimate-diff${qs}`);
}

export type PricingAuditRowDto = {
  _id: string;
  listingId?: string;
  appliedAt: string;
  appliedBy: string;
  triggerSource: string;
  daysChanged: number;
  daysSkipped?: number;
  ruPublishStatus: string;
  ruPublishedAt?: string | null;
  airroiSnapshotId?: string;
  applyReportSummary?: ApplyReportSummaryDto;
  daysCalendarUpdated?: number;
  daysPayloadPrice?: number;
};

export async function fetchListingPricingAudits(listingId: string, limit = 15) {
  return apiClient.get<{
    success: boolean;
    listingId: string;
    audits: PricingAuditRowDto[];
  }>(`${BASE}/listings/${encodeURIComponent(listingId)}/audits?limit=${limit}`);
}

export type PortfolioAuditsDto = {
  success: boolean;
  audits: PricingAuditRowDto[];
  total: number;
  limit: number;
  skip: number;
};

export async function fetchPortfolioAudits(opts: {
  listingIds?: string[];
  limit?: number;
  skip?: number;
  appliedBy?: 'cron' | 'manual' | '';
}) {
  const params = new URLSearchParams();
  if (opts.listingIds?.length) {
    params.set('listingIds', opts.listingIds.join(','));
  }
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.skip != null) params.set('skip', String(opts.skip));
  if (opts.appliedBy === 'cron' || opts.appliedBy === 'manual') {
    params.set('appliedBy', opts.appliedBy);
  }
  const qs = params.toString() ? `?${params}` : '';
  return apiClient.get<PortfolioAuditsDto>(`${BASE}/portfolio/audits${qs}`);
}

export type PricingAuditDayDiffDto = {
  date: string;
  beforeCalculatedPrice: number | null;
  afterCalculatedPrice: number;
  deltaMad: number | null;
  beforeMinStay: number | null;
  afterMinStay: number;
  beforeBasePrice: number | null;
  afterBasePrice: number;
  useDynamicPrice: boolean;
  changed: boolean;
};

export type PricingAuditDetailDto = {
  _id: string;
  listingId: string;
  appliedAt: string;
  appliedBy: string;
  triggerSource: string;
  pilotPricingConfigId: string;
  recommendedPriceCacheId: string;
  airroiSnapshotId: string;
  daysChanged: number;
  daysSkipped: number;
  legacyEngineDisabled: boolean;
  ruPublishStatus: string;
  ruPublishedAt: string | null;
  ruErrors: Array<{ date: string; message: string }>;
  applyReportSummary: ApplyReportSummaryDto | null;
  dayDiffs: PricingAuditDayDiffDto[];
  changedDayDiffs: PricingAuditDayDiffDto[];
  stats: {
    daysInPayload: number;
    daysPriceDelta: number;
    avgAbsDeltaMad: number;
    maxAbsDeltaMad: number;
  };
};

export async function fetchPricingAuditDetail(auditId: string) {
  return apiClient.get<{ success: boolean; audit: PricingAuditDetailDto }>(
    `${BASE}/audits/${encodeURIComponent(auditId)}`,
  );
}

export type PricingAuditCompareDto = {
  success: boolean;
  sameListing: boolean;
  older: {
    _id: string;
    listingId: string;
    appliedAt: string;
    appliedBy: string;
    triggerSource: string;
    daysChanged: number;
  };
  newer: {
    _id: string;
    listingId: string;
    appliedAt: string;
    appliedBy: string;
    triggerSource: string;
    daysChanged: number;
  };
  changedDays: Array<{
    date: string;
    priceA: number | null;
    priceB: number | null;
    deltaMad: number | null;
    minStayA: number | null;
    minStayB: number | null;
  }>;
  summary: {
    totalDaysCompared: number;
    daysWithDelta: number;
    avgAbsDeltaMad: number;
  };
};

export async function fetchPricingAuditsCompare(auditIdA: string, auditIdB: string) {
  return apiClient.get<PricingAuditCompareDto>(
    `${BASE}/audits/compare?a=${encodeURIComponent(auditIdA)}&b=${encodeURIComponent(auditIdB)}`,
  );
}

export async function fetchDayBreakdown(
  listingId: string,
  date: string,
  year?: number,
) {
  const qs = year ? `?year=${year}` : '';
  return apiClient.get<{
    success: boolean;
    date: string;
    finalPriceMad: number;
    breakdown: G7Breakdown;
    computedAt: string;
  }>(
    `${BASE}/listings/${encodeURIComponent(listingId)}/days/${encodeURIComponent(date)}/breakdown${qs}`,
  );
}
