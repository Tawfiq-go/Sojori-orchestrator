import { differenceInCalendarDays, format, subDays } from 'date-fns';
import type {
  AnalyticsChannelShareItem,
  AnalyticsKpiCards,
  AnalyticsPropertyOption,
  AnalyticsPropertyPerformanceRow,
  AnalyticsQuery,
  AnalyticsRevenuePoint,
  AnalyticsSnapshot,
  AnalyticsSummary,
} from '../types/analytics.types';
import {
  channelNamesForAnalyticsSource,
  fetchAverageDailyRate,
  fetchAverageRevenuePerStay,
  fetchBookedNights,
  fetchCalendarOccupancyRate,
  fetchChannelStats,
  fetchRentalRevenue,
  fetchReservationStatsTimeline,
  type FinancialRange,
} from './analyticsFinancialApi';
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

function trendPct(current: number, previous: number): number {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function metric(current: number, previous: number) {
  return { value: current, trend: trendPct(current, previous) };
}

export function resolveAnalyticsRanges(query: AnalyticsQuery): {
  current: FinancialRange;
  previous: FinancialRange;
  periodLabel: string;
  statsPeriod: 'day' | 'week' | 'month';
} {
  const today = new Date();
  let start: Date;
  let end: Date = today;
  let label = '30 jours';

  if (query.period === 'custom' && query.customStartDate && query.customEndDate) {
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

  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days - 1);

  const statsPeriod: 'day' | 'week' | 'month' =
    days <= 14 ? 'day' : days <= 120 ? 'week' : 'month';

  return {
    current: {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    },
    previous: {
      startDate: format(prevStart, 'yyyy-MM-dd'),
      endDate: format(prevEnd, 'yyyy-MM-dd'),
    },
    periodLabel:
      query.comparison === 'vs-last-year'
        ? `${label} (vs N-1 approx.)`
        : `${label} (vs période préc.)`,
    statsPeriod,
  };
}

async function fetchListingProperties(signal?: AbortSignal): Promise<AnalyticsPropertyOption[]> {
  const response = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings`, {
    params: { staging: false },
    signal,
    timeout: 45_000,
  });
  const listings =
    (response.data as { data?: unknown[] })?.data ??
    (Array.isArray(response.data) ? response.data : []);

  return (listings as Array<Record<string, unknown>>)
    .map((listing) => {
      const id = String(listing._id || listing.id || '');
      const name = String(listing.name || '').trim();
      const city = String(
        (listing.city as { name?: string })?.name || listing.cityName || listing.city || '',
      ).trim();
      if (!id || !name) return null;
      return {
        id,
        name,
        label: city ? `${name} - ${city}` : name,
        city: city || undefined,
        isActive: (listing.active ?? listing.isActive ?? true) as boolean,
      } satisfies AnalyticsPropertyOption;
    })
    .filter(Boolean) as AnalyticsPropertyOption[];
}

async function fetchOccupancyByListing(
  listingIds: string[],
  range: FinancialRange,
  signal?: AbortSignal,
): Promise<Array<{ property: string; occupancy: number; adr: number }>> {
  if (!listingIds.length) return [];
  const start = new Date(range.startDate);
  const end = new Date(range.endDate);
  const sp = new URLSearchParams();
  sp.set('startDate', `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`);
  sp.set('endDate', `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}`);
  for (const id of listingIds.slice(0, 10)) sp.append('listingIds', id);

  try {
    const r = await apiClient.get(
      `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/inventory/get-occupancy-stats-by-listing?${sp}`,
      { signal, timeout: 45_000 },
    );
    const byItems = (r.data as { byItems?: Array<Record<string, unknown>> })?.byItems ?? [];
    return byItems.map((item) => {
      const months = (item.listingMonth as Array<{ occupancy?: number }>) ?? [];
      const occ =
        months.length > 0
          ? months.reduce((s, m) => s + Number(m.occupancy ?? 0), 0) / months.length
          : 0;
      return {
        property: String(item.listingName || item.name || '—'),
        occupancy: Math.round(occ * 10) / 10,
        adr: 0,
      };
    });
  } catch {
    return [];
  }
}

function buildChannelShare(rows: { label: string; value: number }[]): AnalyticsChannelShareItem[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows.map((row) => ({
    source: row.label,
    revenue: row.value,
    bookings: 0,
    share: total > 0 ? Math.round((row.value / total) * 1000) / 10 : 0,
  }));
}

function buildPropertyPerformance(
  occupancyRows: Array<{ property: string; occupancy: number; adr: number }>,
  totalRevenue: number,
  properties: AnalyticsPropertyOption[],
): AnalyticsPropertyPerformanceRow[] {
  if (occupancyRows.length) {
    const weightSum = occupancyRows.reduce((s, r) => s + Math.max(r.occupancy, 1), 0);
    return occupancyRows.map((row, index) => {
      const prop = properties.find((p) => p.name === row.property || p.label === row.property);
      const weight = Math.max(row.occupancy, 1) / weightSum;
      return {
        id: prop?.id ?? `occ-${index}`,
        property: row.property,
        revenue: Math.round(totalRevenue * weight),
        occupancy: row.occupancy,
        adr: row.adr,
        leadTime: 0,
        cancellations: 0,
      };
    });
  }
  return properties.slice(0, 12).map((p) => ({
    id: p.id,
    property: p.name,
    revenue: 0,
    occupancy: 0,
    adr: 0,
    leadTime: 0,
    cancellations: 0,
  }));
}

/** Agrégation multi-API (srv-reservations + srv-calendar) — remplace /admin/analytics/snapshot absent. */
export async function buildAnalyticsSnapshotClient(
  query: AnalyticsQuery,
  options?: { signal?: AbortSignal },
): Promise<AnalyticsSnapshot> {
  const signal = options?.signal;
  const { current, previous, periodLabel, statsPeriod } = resolveAnalyticsRanges(query);
  const channelName = channelNamesForAnalyticsSource(query.source);
  const listingIds = query.listingIds ?? [];

  const base = { listingIds, channelName, staging: query.staging, signal };
  const currentQ = { ...base, ...current };
  const previousQ = { ...base, ...previous };

  const [
    properties,
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
    timelineCur,
    timelinePrev,
  ] = await Promise.all([
    fetchListingProperties(signal),
    fetchRentalRevenue(currentQ),
    fetchRentalRevenue(previousQ),
    fetchBookedNights(currentQ),
    fetchBookedNights(previousQ),
    fetchCalendarOccupancyRate(currentQ),
    fetchCalendarOccupancyRate(previousQ),
    fetchAverageDailyRate(currentQ),
    fetchAverageDailyRate(previousQ),
    fetchAverageRevenuePerStay(currentQ),
    fetchAverageRevenuePerStay(previousQ),
    fetchChannelStats(currentQ),
    fetchReservationStatsTimeline({ ...currentQ, period: statsPeriod }),
    fetchReservationStatsTimeline({ ...previousQ, period: statsPeriod }),
  ]);

  const idsForOcc =
    listingIds.length > 0 ? listingIds : properties.map((p) => p.id).filter(Boolean);
  const occupancyRows = await fetchOccupancyByListing(idsForOcc, current, signal);

  const summary: AnalyticsSummary = {
    revenue: metric(revenueCur, revenuePrev),
    bookedNights: metric(nightsCur, nightsPrev),
    occupancyRate: metric(occCur, occPrev),
    averageDailyRate: metric(adrCur, adrPrev),
    averageRevenuePerStay: metric(arpsCur, arpsPrev),
  };

  const kpis: AnalyticsKpiCards = {
    performanceScore: Math.min(100, Math.round(occCur)),
    performanceScoreTrend: trendPct(occCur, occPrev),
    averageStay: nightsCur > 0 ? Math.round((nightsCur / Math.max(1, properties.length)) * 10) / 10 : 0,
    averageStayTrend: trendPct(nightsCur, nightsPrev),
    leadTime: 0,
    leadTimeTrend: 0,
    cancellationRate: 0,
    cancellationRateTrend: 0,
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

  const channelShare = buildChannelShare(channelRows);
  const availableSources = ['Tous', 'Airbnb', 'Booking.com', 'Sojori', 'Vrbo'];

  return {
    periodLabel,
    availableSources,
    properties,
    kpis,
    summary,
    revenueEvolution,
    channelShare,
    seasonality: [],
    occupancyByProperty: occupancyRows.map((r) => ({
      property: r.property,
      occupancy: r.occupancy,
    })),
    guestDemographics: [],
    lengthOfStay: [],
    leadTimeDistribution: [],
    propertyPerformance: buildPropertyPerformance(occupancyRows, revenueCur, properties),
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
