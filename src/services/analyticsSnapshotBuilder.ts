import { differenceInCalendarDays, format, subDays } from 'date-fns';
import type {
  AnalyticsChannelShareItem,
  AnalyticsDistributionItem,
  AnalyticsGuestDemographicsItem,
  AnalyticsKpiCards,
  AnalyticsPropertyOption,
  AnalyticsPropertyPerformanceRow,
  AnalyticsQuery,
  AnalyticsRevenuePoint,
  AnalyticsSeasonalityItem,
  AnalyticsSnapshot,
  AnalyticsSummary,
} from '../types/analytics.types';
import {
  cancelRateFromLandRTotals,
  channelNamesForAnalyticsSource,
  fetchAverageDailyRate,
  fetchAverageRevenuePerStay,
  fetchBookedNights,
  fetchCalendarOccupancyRate,
  fetchChannelBookingCounts,
  fetchChannelStats,
  fetchListingPerformanceLandR,
  fetchRentalRevenue,
  fetchReservationStatsTimeline,
  fetchReservationsForAnalytics,
  fetchSeasonalityOccupancy,
  type AnalyticsReservationRow,
  type LandRPerformanceItem,
  type LandRTotals,
} from './analyticsFinancialApi';
import apiClient from './apiClient';
import { runtimeLog } from '../utils/runtimeLog';
import {
  normalizeCurrencyCode,
  resolveAnalyticsCurrencyContext,
} from '../utils/analyticsCurrency';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

function trendPct(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function metric(current: number, previous: number) {
  return { value: current, trend: trendPct(current, previous) };
}

function isCancelledStatus(status?: string): boolean {
  const s = status ?? '';
  return /cancel/i.test(s) || /^rejected$/i.test(s);
}

/** Annulation « métier » (hors échec de paiement) pour le taux d'annulation. */
function isSoftCancelForRate(status?: string): boolean {
  return isCancelledStatus(status) && !/failed.?payment/i.test(status ?? '');
}

function computePerformanceScore(
  occupancy: number,
  revenueTrend: number,
  adrTrend: number,
  cancellationRate: number,
): number {
  const occPart = Math.min(40, Math.max(0, occupancy * 0.4));
  const revPart = Math.min(25, Math.max(0, 12.5 + revenueTrend * 0.25));
  const adrPart = Math.min(20, Math.max(0, 10 + adrTrend * 0.2));
  const cancelPart = Math.min(15, Math.max(0, 15 - cancellationRate * 0.5));
  return Math.round(occPart + revPart + adrPart + cancelPart);
}

function bucketCount(
  value: number,
  buckets: Array<{ label: string; min: number; max: number }>,
): string {
  const hit = buckets.find((b) => value >= b.min && value <= b.max);
  return hit?.label ?? buckets[buckets.length - 1]?.label ?? '—';
}

const STAY_BUCKETS = [
  { label: '1-2 nuits', min: 1, max: 2 },
  { label: '3-4 nuits', min: 3, max: 4 },
  { label: '5-7 nuits', min: 5, max: 7 },
  { label: '8-14 nuits', min: 8, max: 14 },
  { label: '15+ nuits', min: 15, max: 999 },
];

const LEAD_BUCKETS = [
  { label: '0-7 j', min: 0, max: 7 },
  { label: '8-14 j', min: 8, max: 14 },
  { label: '15-30 j', min: 15, max: 30 },
  { label: '31-60 j', min: 31, max: 60 },
  { label: '60+ j', min: 61, max: 9999 },
];

function buildDistribution(
  reservations: AnalyticsReservationRow[],
  pickValue: (r: AnalyticsReservationRow) => number | null,
  buckets: Array<{ label: string; min: number; max: number }>,
): AnalyticsDistributionItem[] {
  const counts = new Map<string, number>();
  for (const b of buckets) counts.set(b.label, 0);

  for (const r of reservations) {
    if (isCancelledStatus(r.status)) continue;
    const v = pickValue(r);
    if (v == null || v < 0) continue;
    const label = bucketCount(v, buckets);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return buckets
    .map((b) => ({ bucket: b.label, count: counts.get(b.label) ?? 0 }))
    .filter((row) => row.count > 0);
}

function buildGuestDemographics(
  reservations: AnalyticsReservationRow[],
): AnalyticsGuestDemographicsItem[] {
  const counts = new Map<string, number>();
  for (const r of reservations) {
    if (isCancelledStatus(r.status)) continue;
    const country = (r.guestCountry || '').trim();
    if (!country) continue;
    counts.set(country, (counts.get(country) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([country, guests]) => ({ country, guests }))
    .sort((a, b) => b.guests - a.guests)
    .slice(0, 8);
}

function computeAverageLeadTime(reservations: AnalyticsReservationRow[]): number {
  const days: number[] = [];
  for (const r of reservations) {
    if (isCancelledStatus(r.status)) continue;
    if (!r.createdAt || !r.arrivalDate) continue;
    const created = new Date(r.createdAt);
    const arrival = new Date(r.arrivalDate);
    if (Number.isNaN(created.getTime()) || Number.isNaN(arrival.getTime())) continue;
    const diff = differenceInCalendarDays(arrival, created);
    if (diff >= 0) days.push(diff);
  }
  if (days.length === 0) return 0;
  return Math.round((days.reduce((s, d) => s + d, 0) / days.length) * 10) / 10;
}

/** Fallback : intensité relative des arrivées (si calendar occ. indisponible). */
function buildSeasonalityFallback(
  reservations: AnalyticsReservationRow[] = [],
): AnalyticsSeasonalityItem[] {
  const byMonth = new Map<string, { label: string; count: number }>();
  for (const r of reservations) {
    if (isCancelledStatus(r.status)) continue;
    if (!r.arrivalDate) continue;
    const arrival = new Date(r.arrivalDate);
    if (Number.isNaN(arrival.getTime())) continue;
    const sortKey = format(arrival, 'yyyy-MM');
    const label = format(arrival, 'MMM');
    const row = byMonth.get(sortKey);
    if (row) row.count += 1;
    else byMonth.set(sortKey, { label, count: 1 });
  }

  const fromReservations = [...byMonth.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, value]) => ({ month: value.label, intensity: value.count }));

  if (fromReservations.length === 0) return [];

  const max = Math.max(...fromReservations.map((p) => p.intensity));
  return fromReservations.map((p) => ({
    month: p.month,
    occupancy: Math.round((p.intensity / max) * 1000) / 10,
  }));
}

function buildChannelShare(
  revenueRows: { label: string; value: number }[],
  bookingRows: { source: string; bookings: number }[],
): AnalyticsChannelShareItem[] {
  const bookingsBySource = new Map(bookingRows.map((r) => [r.source, r.bookings]));
  const totalRevenue = revenueRows.reduce((s, r) => s + r.value, 0);
  const totalBookings = bookingRows.reduce((s, r) => s + r.bookings, 0);

  if (revenueRows.length === 0 && bookingRows.length === 0) return [];

  const sources = new Set([
    ...revenueRows.map((r) => r.label),
    ...bookingRows.map((r) => r.source),
  ]);

  return [...sources].map((source) => {
    const revenue = revenueRows.find((r) => r.label === source)?.value ?? 0;
    const bookings =
      bookingsBySource.get(source) ??
      (totalBookings > 0 && totalRevenue > 0
        ? Math.round((revenue / totalRevenue) * totalBookings)
        : 0);
    return {
      source,
      revenue,
      bookings,
      share: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.revenue - a.revenue);
}

function buildPropertyPerformanceFallback(
  properties: AnalyticsPropertyOption[],
  reservations: AnalyticsReservationRow[],
  totalRevenue: number,
  portfolioOcc: number,
  portfolioAdr: number,
): AnalyticsPropertyPerformanceRow[] {
  const stats = new Map<
    string,
    { nights: number; cancellations: number; leadDays: number[] }
  >();

  for (const r of reservations) {
    const lid = r.sojoriId;
    if (!lid) continue;
    const cur = stats.get(lid) ?? { nights: 0, cancellations: 0, leadDays: [] };
    if (isCancelledStatus(r.status)) {
      cur.cancellations++;
    } else {
      cur.nights += r.nights ?? 0;
      if (r.createdAt && r.arrivalDate) {
        const created = new Date(r.createdAt);
        const arrival = new Date(r.arrivalDate);
        if (!Number.isNaN(created.getTime()) && !Number.isNaN(arrival.getTime())) {
          const diff = differenceInCalendarDays(arrival, created);
          if (diff >= 0) cur.leadDays.push(diff);
        }
      }
    }
    stats.set(lid, cur);
  }

  const totalNights = [...stats.values()].reduce((sum, row) => sum + row.nights, 0);

  return properties
    .map((property) => {
      const row = stats.get(property.id);
      const nights = row?.nights ?? 0;
      const revenue =
        totalNights > 0 && totalRevenue > 0
          ? Math.round((nights / totalNights) * totalRevenue)
          : 0;
      const leadTime =
        row && row.leadDays.length > 0
          ? Math.round((row.leadDays.reduce((s, d) => s + d, 0) / row.leadDays.length) * 10) / 10
          : 0;
      return {
        id: property.id,
        property: property.name,
        revenue,
        occupancy: Math.round(portfolioOcc * 10) / 10,
        adr: Math.round(portfolioAdr),
        leadTime,
        cancellations: row?.cancellations ?? 0,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function buildPropertyPerformance(
  items: LandRPerformanceItem[],
  properties: AnalyticsPropertyOption[],
  reservations: AnalyticsReservationRow[],
  fallback: {
    totalRevenue: number;
    portfolioOcc: number;
    portfolioAdr: number;
  },
): AnalyticsPropertyPerformanceRow[] {
  if (items.length === 0) {
    return buildPropertyPerformanceFallback(
      properties,
      reservations,
      fallback.totalRevenue,
      fallback.portfolioOcc,
      fallback.portfolioAdr,
    );
  }

  const leadByListing = new Map<string, number[]>();
  for (const r of reservations) {
    if (isCancelledStatus(r.status) || !r.sojoriId || !r.createdAt || !r.arrivalDate) continue;
    const created = new Date(r.createdAt);
    const arrival = new Date(r.arrivalDate);
    if (Number.isNaN(created.getTime()) || Number.isNaN(arrival.getTime())) continue;
    const diff = differenceInCalendarDays(arrival, created);
    if (diff < 0) continue;
    const arr = leadByListing.get(r.sojoriId) ?? [];
    arr.push(diff);
    leadByListing.set(r.sojoriId, arr);
  }

  return items
    .map((item) => {
      const prop = properties.find((p) => p.id === String(item.itemId));
      const name =
        item.itemName && item.itemName !== '—'
          ? item.itemName
          : prop?.name || prop?.label || item.itemName;
      const leads = leadByListing.get(String(item.itemId)) ?? [];
      const leadTime =
        leads.length > 0
          ? Math.round((leads.reduce((s, d) => s + d, 0) / leads.length) * 10) / 10
          : 0;
      return {
        id: String(item.itemId),
        property: name,
        revenue: Math.round(item.totalRevenue),
        occupancy: Math.round(item.occupancyRate * 10) / 10,
        adr: Math.round(item.averageNightlyRate),
        leadTime,
        cancellations: item.cancelations,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

function averageStayFromTotals(totals: LandRTotals, nightsBooked: number): number {
  if (totals.totalCheckIns > 0 && totals.totalNightsBooked > 0) {
    return Math.round((totals.totalNightsBooked / totals.totalCheckIns) * 10) / 10;
  }
  if (nightsBooked > 0 && totals.totalCheckIns > 0) {
    return Math.round((nightsBooked / totals.totalCheckIns) * 10) / 10;
  }
  return 0;
}

const EMPTY_LANDR_TOTALS: LandRTotals = {
  totalRevenue: 0,
  totalNightsBooked: 0,
  totalCheckIns: 0,
  totalCancelations: 0,
  averageOccupancyRate: 0,
  averageNightlyRate: 0,
  averageRevenuePerStay: 0,
  totalCancelationsPercentage: 0,
};

function averageStayFromReservations(
  reservations: AnalyticsReservationRow[],
  nightsBooked: number,
): number {
  const active = reservations.filter((r) => !isCancelledStatus(r.status));
  if (active.length > 0 && nightsBooked > 0) {
    return Math.round((nightsBooked / active.length) * 10) / 10;
  }
  const withNights = active.filter((r) => (r.nights ?? 0) > 0);
  if (withNights.length > 0) {
    const sum = withNights.reduce((s, r) => s + (r.nights ?? 0), 0);
    return Math.round((sum / withNights.length) * 10) / 10;
  }
  return 0;
}

function cancelRateFromReservations(reservations: AnalyticsReservationRow[]): number {
  const cancelled = reservations.filter((r) => isSoftCancelForRate(r.status)).length;
  const confirmed = reservations.filter((r) => !isCancelledStatus(r.status)).length;
  const total = cancelled + confirmed;
  if (total === 0) return 0;
  return Math.round((cancelled / total) * 1000) / 10;
}

async function withFallback<T>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if ((err as { code?: string }).code !== 'ERR_CANCELED') {
      runtimeLog('warn', 'AnalyticsSnapshot', `${label} failed`, {
        message: err instanceof Error ? err.message : String(err),
      });
    }
    return fallback;
  }
}

export function resolveAnalyticsRanges(query: AnalyticsQuery): {
  current: { startDate: string; endDate: string };
  previous: { startDate: string; endDate: string };
  periodLabel: string;
  statsPeriod: 'day' | 'week' | 'month';
} {
  const today = new Date();
  const iso = (d: Date) => format(d, 'yyyy-MM-dd');
  let start: Date;
  let end: Date = today;
  let label = '30 jours';

  const monthKey =
    (query.month && /^\d{4}-\d{2}$/.test(query.month) ? query.month : null) ||
    (query.period === 'month'
      ? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      : null);

  if (monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    start = new Date(y, m - 1, 1);
    end = new Date(y, m, 0);
    const monthLabel = start.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    label = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  } else if (query.period === 'custom' && query.customStartDate && query.customEndDate) {
    start = new Date(query.customStartDate);
    end = new Date(query.customEndDate);
    label = `${query.customStartDate} → ${query.customEndDate}`;
  } else if (query.period === '7d') {
    start = subDays(today, 6);
    label = '7 jours';
  } else if (query.period === '3m') {
    start = subDays(today, 89);
    label = '3 mois';
  } else if (query.period === '1y') {
    start = subDays(today, 364);
    label = '1 an';
  } else {
    start = subDays(today, 29);
    label = '30 jours';
  }

  let prevStart: Date;
  let prevEnd: Date;
  if (monthKey && query.comparison === 'vs-last-year') {
    const [y, m] = monthKey.split('-').map(Number);
    prevStart = new Date(y - 1, m - 1, 1);
    prevEnd = new Date(y - 1, m, 0);
  } else if (monthKey) {
    const [y, m] = monthKey.split('-').map(Number);
    prevStart = new Date(y, m - 2, 1);
    prevEnd = new Date(y, m - 1, 0);
  } else if (query.comparison === 'vs-last-year') {
    prevStart = new Date(start);
    prevEnd = new Date(end);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    prevEnd.setFullYear(prevEnd.getFullYear() - 1);
  } else {
    const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
    prevEnd = subDays(start, 1);
    prevStart = subDays(prevEnd, days - 1);
  }

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const statsPeriod: 'day' | 'week' | 'month' =
    days <= 45 ? 'day' : days <= 120 ? 'week' : 'month';

  return {
    current: {
      startDate: iso(start),
      endDate: iso(end),
    },
    previous: {
      startDate: iso(prevStart),
      endDate: iso(prevEnd),
    },
    periodLabel:
      query.comparison === 'vs-last-year'
        ? `${label} (vs N-1)`
        : `${label} (vs période préc.)`,
    statsPeriod,
  };
}

async function fetchListingProperties(
  signal?: AbortSignal,
  ownerId?: string | null,
): Promise<AnalyticsPropertyOption[]> {
  const params: Record<string, string | boolean> = { staging: false };
  if (ownerId) {
    params.ownerId = ownerId;
  }
  const response = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/dashboard-directory`,
    { params, signal, timeout: 45_000 },
  );
  const listings =
    (response.data as { data?: unknown[] })?.data ??
    (Array.isArray(response.data) ? response.data : []);

  return (listings as Array<Record<string, unknown>>)
    .map((listing) => {
      const id = String(listing.id ?? listing._id ?? '');
      const name = String(listing.name || '').trim();
      const city = String(
        (listing.city as { name?: string })?.name || listing.cityName || listing.city || '',
      ).trim();
      if (!id || !name) return null;
      const currency = normalizeCurrencyCode(
        String(listing.currency ?? listing.currencyCode ?? 'MAD'),
      );
      return {
        id,
        name,
        label: String(listing.label || (city ? `${name} - ${city}` : name)),
        city: city || undefined,
        isActive: (listing.active ?? listing.isActive ?? true) as boolean,
        currency,
      } satisfies AnalyticsPropertyOption;
    })
    .filter(Boolean)
    .filter((listing) => listing.isActive !== false) as AnalyticsPropertyOption[];
}

/** Snapshot vide — admin sans propriétaire sélectionné. */
export function buildEmptyAnalyticsSnapshot(): AnalyticsSnapshot {
  return {
    periodLabel: '—',
    displayCurrency: 'MAD',
    listingCurrencies: [],
    mixedListingCurrencies: false,
    availableSources: ['Tous', 'Airbnb', 'Booking.com', 'Sojori', 'Vrbo'],
    properties: [],
    kpis: {
      performanceScore: 0,
      performanceScoreTrend: 0,
      averageStay: 0,
      averageStayTrend: 0,
      leadTime: 0,
      leadTimeTrend: 0,
      cancellationRate: 0,
      cancellationRateTrend: 0,
    },
    summary: {
      revenue: { value: 0, trend: 0 },
      bookedNights: { value: 0, trend: 0 },
      occupancyRate: { value: 0, trend: 0 },
      averageDailyRate: { value: 0, trend: 0 },
      averageRevenuePerStay: { value: 0, trend: 0 },
    },
    revenueEvolution: [],
    channelShare: [],
    seasonality: [],
    occupancyByProperty: [],
    guestDemographics: [],
    lengthOfStay: [],
    leadTimeDistribution: [],
    propertyPerformance: [],
  };
}

/** Agrégation multi-API (srv-reservations + srv-calendar) — alignée dashboard. */
export async function buildAnalyticsSnapshotClient(
  query: AnalyticsQuery,
  options?: { signal?: AbortSignal; includeLandR?: boolean; landRTimeoutMs?: number },
): Promise<AnalyticsSnapshot> {
  const signal = options?.signal;
  const { current, previous, periodLabel, statsPeriod } = resolveAnalyticsRanges(query);
  const channelName = channelNamesForAnalyticsSource(query.source);
  const selectedListingIds = (query.listingIds ?? []).filter(Boolean);

  const properties = await fetchListingProperties(signal, query.ownerId);
  const activeIds = properties.map((property) => property.id).filter(Boolean);
  // Si l'utilisateur a coché des listings : ne garder QUE ceux-là (recalcul complet scoped).
  // Ne pas retomber sur tout le portefeuille si un id n'est pas encore dans le directory.
  const effectiveListingIds =
    selectedListingIds.length > 0
      ? selectedListingIds.filter((id) => !activeIds.length || activeIds.includes(id))
      : activeIds;

  // Scope owner (réel ou simulé PM) : si aucun listing n'est résolu pour ce propriétaire,
  // NE PAS interroger les endpoints financiers sans listingIds — ils agrègent alors sur TOUT
  // le portefeuille (fuite de données plateforme). On renvoie un snapshot vide, comme le dashboard
  // qui scope côté serveur via ownerId. Sans ownerId (admin « Tous »), on laisse l'agrégation globale.
  if (query.ownerId && effectiveListingIds.length === 0) {
    return { ...buildEmptyAnalyticsSnapshot(), periodLabel, properties };
  }

  const base = {
    listingIds: effectiveListingIds,
    channelName,
    staging: query.staging,
    ownerId: query.ownerId ?? null,
    signal,
  };
  const currentQ = { ...base, ...current };
  const previousQ = { ...base, ...previous };

  const [
    revenueCur,
    revenuePrev,
    nightsCur,
    nightsPrev,
    occCur,
    occPrev,
    adrCur,
    adrPrev,
    arpsCur,
    arpsPrev,
    channelRows,
    channelBookings,
    timelineCur,
    timelinePrev,
    seasonalityRaw,
    reservationsCur,
    reservationsPrev,
  ] = await Promise.all([
    withFallback('rental-revenue', () => fetchRentalRevenue(currentQ), 0),
    withFallback('rental-revenue-prev', () => fetchRentalRevenue(previousQ), 0),
    withFallback('booked-nights', () => fetchBookedNights(currentQ), 0),
    withFallback('booked-nights-prev', () => fetchBookedNights(previousQ), 0),
    withFallback('occupancy', () => fetchCalendarOccupancyRate(currentQ), 0),
    withFallback('occupancy-prev', () => fetchCalendarOccupancyRate(previousQ), 0),
    withFallback('adr', () => fetchAverageDailyRate(currentQ), 0),
    withFallback('adr-prev', () => fetchAverageDailyRate(previousQ), 0),
    withFallback('arps', () => fetchAverageRevenuePerStay(currentQ), 0),
    withFallback('arps-prev', () => fetchAverageRevenuePerStay(previousQ), 0),
    withFallback('channel-stats', () => fetchChannelStats(currentQ), []),
    withFallback('channel-bookings', () => fetchChannelBookingCounts(currentQ), []),
    withFallback(
      'timeline',
      () => fetchReservationStatsTimeline({ ...currentQ, period: statsPeriod }),
      [],
    ),
    withFallback(
      'timeline-prev',
      () => fetchReservationStatsTimeline({ ...previousQ, period: statsPeriod }),
      [],
    ),
    withFallback('seasonality-12m', () => fetchSeasonalityOccupancy(currentQ), []),
    withFallback('reservations', () => fetchReservationsForAnalytics(currentQ), []),
    withFallback('reservations-prev', () => fetchReservationsForAnalytics(previousQ), []),
  ]);

  let landRCur: { items: LandRPerformanceItem[]; totals: LandRTotals } = {
    items: [],
    totals: { ...EMPTY_LANDR_TOTALS },
  };
  let landRPrev: { items: LandRPerformanceItem[]; totals: LandRTotals } = {
    items: [],
    totals: { ...EMPTY_LANDR_TOTALS },
  };

  if (options?.includeLandR) {
    const landRTimeout = options.landRTimeoutMs ?? 90_000;
    const [cur, prev] = await Promise.all([
      fetchListingPerformanceLandR(currentQ, { timeoutMs: landRTimeout }),
      fetchListingPerformanceLandR(previousQ, { timeoutMs: landRTimeout }),
    ]);
    landRCur = cur;
    landRPrev = prev;
  }

  const portfolioOcc =
    landRCur.totals.averageOccupancyRate > 0 ? landRCur.totals.averageOccupancyRate : occCur;
  const portfolioOccPrev =
    landRPrev.totals.averageOccupancyRate > 0 ? landRPrev.totals.averageOccupancyRate : occPrev;

  // Hostaway Occupancy : taux d'annulation = check-in dans la fenêtre (pas cancellationDate).
  // Priorité à la liste arrival-scoped ; LandR en secours (peut différer si stay-overlap).
  const cancelFromList = cancelRateFromReservations(reservationsCur);
  const cancelFromListPrev = cancelRateFromReservations(reservationsPrev);
  const cancelRate =
    reservationsCur.length > 0
      ? cancelFromList
      : cancelRateFromLandRTotals(landRCur.totals) ?? cancelFromList;

  const cancelRatePrev =
    reservationsPrev.length > 0
      ? cancelFromListPrev
      : cancelRateFromLandRTotals(landRPrev.totals) ?? cancelFromListPrev;

  const avgStayCur =
    landRCur.totals.totalCheckIns > 0
      ? averageStayFromTotals(landRCur.totals, nightsCur)
      : averageStayFromReservations(reservationsCur, nightsCur);
  const avgStayPrev =
    landRPrev.totals.totalCheckIns > 0
      ? averageStayFromTotals(landRPrev.totals, nightsPrev)
      : averageStayFromReservations(reservationsPrev, nightsPrev);

  const leadTimeCur = computeAverageLeadTime(reservationsCur);
  const leadTimePrev = computeAverageLeadTime(reservationsPrev);

  const summary: AnalyticsSummary = {
    revenue: metric(revenueCur, revenuePrev),
    bookedNights: metric(nightsCur, nightsPrev),
    occupancyRate: metric(portfolioOcc, portfolioOccPrev),
    averageDailyRate: metric(
      adrCur > 0 ? adrCur : landRCur.totals.averageNightlyRate,
      adrPrev > 0 ? adrPrev : landRPrev.totals.averageNightlyRate,
    ),
    averageRevenuePerStay: metric(
      arpsCur > 0 ? arpsCur : landRCur.totals.averageRevenuePerStay,
      arpsPrev > 0 ? arpsPrev : landRPrev.totals.averageRevenuePerStay,
    ),
  };

  const revenueTrend = summary.revenue.trend;
  const adrTrend = summary.averageDailyRate.trend;

  const kpis: AnalyticsKpiCards = {
    performanceScore: computePerformanceScore(
      portfolioOcc,
      revenueTrend,
      adrTrend,
      cancelRate,
    ),
    performanceScoreTrend: trendPct(
      computePerformanceScore(portfolioOcc, revenueTrend, adrTrend, cancelRate),
      computePerformanceScore(portfolioOccPrev, summary.revenue.trend, adrTrend, cancelRatePrev),
    ),
    averageStay: avgStayCur,
    averageStayTrend: trendPct(avgStayCur, avgStayPrev),
    leadTime: leadTimeCur,
    leadTimeTrend: trendPct(leadTimeCur, leadTimePrev),
    cancellationRate: cancelRate,
    cancellationRateTrend: trendPct(cancelRate, cancelRatePrev),
  };

  const len = Math.max(timelineCur.length, timelinePrev.length);
  const revenueEvolution: AnalyticsRevenuePoint[] = [];
  for (let i = 0; i < len; i++) {
    revenueEvolution.push({
      label: timelineCur[i]?.label ?? timelinePrev[i]?.label ?? `P${i + 1}`,
      current: timelineCur[i]?.revenue ?? 0,
      previous: timelinePrev[i]?.revenue ?? 0,
    });
  }

  const channelShare = buildChannelShare(channelRows, channelBookings);
  const seasonality =
    seasonalityRaw.some((row) => row.occupancy > 0)
      ? seasonalityRaw
      : buildSeasonalityFallback(reservationsCur);
  const guestDemographics = buildGuestDemographics(reservationsCur);
  const lengthOfStay = buildDistribution(
    reservationsCur,
    (r) => (r.nights && r.nights > 0 ? r.nights : null),
    STAY_BUCKETS,
  );
  const leadTimeDistribution = buildDistribution(
    reservationsCur,
    (r) => {
      if (!r.createdAt || !r.arrivalDate) return null;
      const created = new Date(r.createdAt);
      const arrival = new Date(r.arrivalDate);
      if (Number.isNaN(created.getTime()) || Number.isNaN(arrival.getTime())) return null;
      const diff = differenceInCalendarDays(arrival, created);
      return diff >= 0 ? diff : null;
    },
    LEAD_BUCKETS,
  );

  const scopedProperties =
    selectedListingIds.length > 0
      ? properties.filter((property) => selectedListingIds.includes(property.id))
      : properties;

  const propertyPerformance = buildPropertyPerformance(
    landRCur.items,
    scopedProperties,
    reservationsCur,
    {
      totalRevenue: revenueCur,
      portfolioOcc,
      portfolioAdr: adrCur > 0 ? adrCur : landRCur.totals.averageNightlyRate,
    },
  );

  const occupancyByProperty =
    landRCur.items.length > 0
      ? landRCur.items
          .filter(
            (item) =>
              selectedListingIds.length === 0 ||
              selectedListingIds.includes(String(item.itemId)),
          )
          .map((item) => {
            const prop = properties.find((p) => p.id === String(item.itemId));
            return {
              property: item.itemName !== '—' ? item.itemName : prop?.name ?? '—',
              occupancy: Math.round(item.occupancyRate * 10) / 10,
            };
          })
      : propertyPerformance.slice(0, 12).map((row) => ({
          property: row.property,
          occupancy: row.occupancy,
        }));

  const currencyContext = resolveAnalyticsCurrencyContext(scopedProperties);

  const scopeSuffix =
    selectedListingIds.length > 0
      ? ` · ${selectedListingIds.length} listing${selectedListingIds.length > 1 ? 's' : ''}`
      : '';

  return {
    periodLabel: `${periodLabel}${scopeSuffix}`,
    displayCurrency: currencyContext.displayCurrency,
    listingCurrencies: currencyContext.listingCurrencies,
    mixedListingCurrencies: currencyContext.mixedListingCurrencies,
    availableSources: ['Tous', 'Airbnb', 'Booking.com', 'Sojori', 'Vrbo'],
    properties,
    kpis,
    summary,
    revenueEvolution,
    channelShare,
    seasonality,
    occupancyByProperty,
    guestDemographics,
    lengthOfStay,
    leadTimeDistribution,
    propertyPerformance,
  };
}

/** Enrichit le tableau propriétés / occ. par listing via revenue-per-l-and-r (appel lent, hors chemin critique). */
export async function enrichAnalyticsSnapshotWithLandR(
  query: AnalyticsQuery,
  base: AnalyticsSnapshot,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<AnalyticsSnapshot> {
  const signal = options?.signal;
  const { current } = resolveAnalyticsRanges(query);
  const channelName = channelNamesForAnalyticsSource(query.source);
  const selectedListingIds = (query.listingIds ?? []).filter(Boolean);
  const properties =
    base.properties.length > 0
      ? base.properties
      : await fetchListingProperties(signal, query.ownerId);
  const activeIds = properties.map((property) => property.id).filter(Boolean);
  // Si l'utilisateur a coché des listings : ne garder QUE ceux-là (recalcul complet scoped).
  // Ne pas retomber sur tout le portefeuille si un id n'est pas encore dans le directory.
  const effectiveListingIds =
    selectedListingIds.length > 0
      ? selectedListingIds.filter((id) => !activeIds.length || activeIds.includes(id))
      : activeIds;

  if (effectiveListingIds.length === 0) return base;

  const currentQ = {
    ...current,
    listingIds: effectiveListingIds,
    channelName,
    staging: query.staging,
    ownerId: query.ownerId ?? null,
    signal,
  };

  const [landRCur, reservationsCur] = await Promise.all([
    fetchListingPerformanceLandR(currentQ, { timeoutMs: options?.timeoutMs ?? 25_000 }),
    withFallback('reservations-enrich', () => fetchReservationsForAnalytics(currentQ), []),
  ]);

  if (landRCur.items.length === 0) return base;

  const revenueCur = base.summary.revenue.value;
  const nightsCur = base.summary.bookedNights.value;
  const adrCur = base.summary.averageDailyRate.value;
  const occCur = base.summary.occupancyRate.value;

  const portfolioOcc =
    landRCur.totals.averageOccupancyRate > 0 ? landRCur.totals.averageOccupancyRate : occCur;

  const cancelRate = base.kpis.cancellationRate;

  const avgStayCur =
    landRCur.totals.totalCheckIns > 0
      ? averageStayFromTotals(landRCur.totals, nightsCur)
      : base.kpis.averageStay;

  const scopedProperties =
    selectedListingIds.length > 0
      ? properties.filter((property) => selectedListingIds.includes(property.id))
      : properties;

  const propertyPerformance = buildPropertyPerformance(landRCur.items, scopedProperties, reservationsCur, {
    totalRevenue: revenueCur,
    portfolioOcc,
    portfolioAdr: adrCur,
  });

  const occupancyByProperty = landRCur.items
    .filter(
      (item) =>
        selectedListingIds.length === 0 || selectedListingIds.includes(String(item.itemId)),
    )
    .map((item) => {
      const prop = properties.find((p) => p.id === String(item.itemId));
      return {
        property: item.itemName !== '—' ? item.itemName : prop?.name ?? '—',
        occupancy: Math.round(item.occupancyRate * 10) / 10,
      };
    });

  const revenueTrend = base.summary.revenue.trend;
  const adrTrend = base.summary.averageDailyRate.trend;

  const scopeSuffix =
    selectedListingIds.length > 0
      ? ` · ${selectedListingIds.length} listing${selectedListingIds.length > 1 ? 's' : ''}`
      : '';
  const periodLabel = base.periodLabel.includes(' listing')
    ? base.periodLabel
    : `${base.periodLabel}${scopeSuffix}`;

  return {
    ...base,
    periodLabel,
    kpis: {
      ...base.kpis,
      performanceScore: computePerformanceScore(portfolioOcc, revenueTrend, adrTrend, cancelRate),
      averageStay: avgStayCur,
      cancellationRate: cancelRate,
    },
    summary: {
      ...base.summary,
      occupancyRate: {
        value: portfolioOcc,
        trend: base.summary.occupancyRate.trend,
      },
      averageDailyRate: {
        value: adrCur > 0 ? adrCur : landRCur.totals.averageNightlyRate,
        trend: base.summary.averageDailyRate.trend,
      },
      averageRevenuePerStay: {
        value:
          base.summary.averageRevenuePerStay.value > 0
            ? base.summary.averageRevenuePerStay.value
            : landRCur.totals.averageRevenuePerStay,
        trend: base.summary.averageRevenuePerStay.trend,
      },
    },
    propertyPerformance,
    occupancyByProperty,
  };
}

export function snapshotToCsv(snapshot: AnalyticsSnapshot): string {
  const header = 'property,revenue,occupancy,adr,leadTime,cancellations';
  const lines = snapshot.propertyPerformance.map((row) =>
    [
      `"${row.property.replace(/"/g, '""')}"`,
      row.revenue,
      row.occupancy,
      row.adr,
      row.leadTime,
      row.cancellations,
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
