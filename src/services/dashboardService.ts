import apiClient from './apiClient';
import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import type {
  DashboardAlertItem,
  DashboardCheckFlowItem,
  DashboardCheckinsByChannelRaw,
  DashboardAverageDailyRateRaw,
  DashboardBookingItem,
  DashboardKpis,
  DashboardListingStatsRaw,
  DashboardMessageStatsRaw,
  DashboardOccupancyRateRaw,
  DashboardOverviewRaw,
  DashboardPeriod,
  DashboardPropertyOption,
  DashboardQuery,
  DashboardReservationStatsRaw,
  DashboardRevenueByChannelRaw,
  DashboardSnapshot,
  DashboardRevenuePoint,
  DashboardSourceDistributionItem,
} from '../types/dashboard.types';
import { logApiOutcome, logApiStart, logDashboard } from '../utils/dashboardDebug';
import { getToken } from '../utils/authUtils';

const DEFAULT_CHECK_FLOW: DashboardCheckFlowItem[] = [
  { label: "Aujourd'hui", checkIns: 0, checkOuts: 0 },
  { label: 'Demain', checkIns: 0, checkOuts: 0 },
  { label: 'J+2', checkIns: 0, checkOuts: 0 },
  { label: 'J+3', checkIns: 0, checkOuts: 0 },
];

const parseNumber = (value: number | string | undefined | null): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const normalized = Number.parseFloat(value);
    return Number.isFinite(normalized) ? normalized : 0;
  }
  return 0;
};

const formatTrend = (value: number | string | undefined, suffix = '%'): string => {
  const parsed = parseNumber(value);
  const sign = parsed > 0 ? '+' : '';
  return `${sign}${parsed.toFixed(1)}${suffix}`;
};

const buildDateRange = (period: DashboardPeriod): { startDate: string; endDate: string } => {
  const end = new Date();
  const start = new Date(end);

  if (period === 'Aujourd’hui') {
    // same day
  } else if (period === 'Semaine') {
    start.setDate(end.getDate() - 6);
  } else if (period === 'Année') {
    start.setFullYear(end.getFullYear() - 1);
  } else {
    start.setDate(end.getDate() - 30);
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
};

function timelineApiPeriod(period: DashboardPeriod): 'day' | 'week' | 'month' {
  if (period === 'Année') return 'month';
  return 'day';
}

function timelineSliceCount(period: DashboardPeriod): number {
  if (period === 'Année') return 12;
  if (period === 'Mois') return 30;
  if (period === 'Semaine') return 7;
  return 1;
}

const extractPayload = <T>(payload: unknown, fallback: T): T => {
  if (payload == null) return fallback;
  if (typeof payload !== 'object') {
    return payload as T;
  }

  const record = payload as Record<string, unknown>;
  if ('data' in record && record.data !== undefined) {
    return record.data as T;
  }
  if ('byItems' in record && record.byItems !== undefined) {
    return record.byItems as T;
  }
  return payload as T;
};

function channelLabelFromRow(channel: DashboardRevenueByChannelRaw): string {
  if (channel.channelName) return channel.channelName;
  if (channel.channel) return channel.channel;
  if (channel.color) return channel.color;
  if (channel.x?.month) return channel.x.month;
  if (channel._id) return String(channel._id);
  return 'Canal';
}

function revenueFromChannelRow(channel: DashboardRevenueByChannelRaw): number {
  return parseNumber(channel.totalRevenue ?? channel.revenue ?? channel.y);
}

function buildSourceDistribution(
  revenueByChannel: DashboardRevenueByChannelRaw[],
): DashboardSourceDistributionItem[] {
  const rows = revenueByChannel
    .map((channel) => ({
      source: channelLabelFromRow(channel),
      revenue: revenueFromChannelRow(channel),
    }))
    .filter((row) => row.revenue > 0);

  const totalChannelRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  if (totalChannelRevenue <= 0) {
    return [];
  }

  return rows.map((row) => ({
    source: row.source,
    revenue: row.revenue,
    value: Number(((row.revenue / totalChannelRevenue) * 100).toFixed(1)),
  }));
}

function timelineBucketKey(
  x: { year?: number; month?: number; date?: number; week?: number } | undefined,
  period: 'day' | 'week' | 'month',
): string {
  if (!x?.year) return '';
  if (period === 'week') return `${x.year}-${x.week ?? 0}`;
  if (period === 'month') return `${x.year}-${x.month ?? 0}`;
  return `${x.year}-${x.month ?? 0}-${x.date ?? 0}`;
}

function mergeRevenueAndBookingsTimeline(
  revenueTimeline: DashboardCheckinsByChannelRaw[],
  bookingsTimeline: DashboardCheckinsByChannelRaw[],
  period: DashboardPeriod,
): DashboardRevenuePoint[] {
  const apiPeriod = timelineApiPeriod(period);
  const bookingsByKey = new Map<string, number>();
  for (const item of bookingsTimeline) {
    const key = timelineBucketKey(item.x, apiPeriod);
    if (key) bookingsByKey.set(key, parseNumber(item.y));
  }

  return revenueTimeline
    .filter((item) => item.x != null)
    .map((item) => {
      const key = timelineBucketKey(item.x, apiPeriod);
      return {
        date: formatTimelineDate(item),
        revenue: parseNumber(item.y),
        bookings: key ? (bookingsByKey.get(key) ?? 0) : 0,
      };
    })
    .slice(-timelineSliceCount(period));
}

const formatTimelineDate = (item: DashboardCheckinsByChannelRaw): string => {
  if (item.date) {
    return new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
  if (item.x?.year && item.x?.month && item.x?.date) {
    return new Date(item.x.year, item.x.month - 1, item.x.date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  }
  if (item.x?.year && item.x?.month && !item.x?.date) {
    return new Date(item.x.year, item.x.month - 1, 1).toLocaleDateString('fr-FR', {
      month: 'short',
      year: '2-digit',
    });
  }
  if (typeof item._id === 'string') {
    const parsed = new Date(item._id);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
  }
  return 'N/A';
};

/** Plusieurs `listingIds=` pour Express (évite `listingIds=id1,id2` → ObjectId invalide). */
function urlSearchParamsWithListingIds(
  base: Record<string, string | boolean>,
  listingIds: string[],
): URLSearchParams | Record<string, string | boolean> {
  if (listingIds.length === 0) {
    return base;
  }
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(base)) {
    sp.set(key, String(value));
  }
  for (const id of listingIds) {
    if (id) sp.append('listingIds', id);
  }
  return sp;
}

/** Listings actifs envoyés à revenue-per-l-and-r (occupation depuis réservations). */
const MAX_OCCUPANCY_LISTING_IDS = 30;

type LandRItem = {
  itemId?: string;
  itemName?: string;
  occupancyRate?: number | string;
  averageNightlyRate?: number | string;
  nightsBooked?: number | string;
  nightsAvailable?: number | string;
};

function resolvePortfolioOccupancyFromLandR(
  items: LandRItem[],
  totals: { averageOccupancyRate?: number | string; totalNightsBooked?: number | string; totalNightsAvailable?: number | string },
  opts: { listingCount: number; startDate: string; endDate: string },
): number {
  const fromTotals = parseNumber(totals.averageOccupancyRate);
  if (fromTotals > 0) return fromTotals;

  let totalBooked = parseNumber(totals.totalNightsBooked);
  let totalAvailable = parseNumber(totals.totalNightsAvailable);
  if (totalBooked <= 0) {
    totalBooked = items.reduce((sum, item) => sum + parseNumber(item.nightsBooked), 0);
  }
  if (totalAvailable <= 0) {
    totalAvailable = items.reduce((sum, item) => sum + parseNumber(item.nightsAvailable), 0);
  }
  if (totalAvailable > 0 && totalBooked > 0) {
    return Math.round((totalBooked / totalAvailable) * 1000) / 10;
  }

  const rates = items.map((item) => parseNumber(item.occupancyRate)).filter((rate) => rate > 0);
  if (rates.length > 0) {
    return Math.round((rates.reduce((sum, rate) => sum + rate, 0) / rates.length) * 10) / 10;
  }

  if (totalBooked > 0 && opts.listingCount > 0) {
    const start = new Date(opts.startDate);
    const end = new Date(opts.endDate);
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
      const estimatedAvailable = days * opts.listingCount;
      if (estimatedAvailable > 0) {
        return Math.round((totalBooked / estimatedAvailable) * 1000) / 10;
      }
    }
  }

  return 0;
}

async function fetchOccupancyByPropertyFromReservations(
  listingIds: string[],
  startDate: string,
  endDate: string,
  signal?: AbortSignal,
): Promise<{ items: LandRItem[]; portfolioOccupancy: number }> {
  if (listingIds.length === 0) {
    return { items: [], portfolioOccupancy: 0 };
  }

  const sp = new URLSearchParams();
  sp.set('startDate', startDate);
  sp.set('endDate', endDate);
  sp.set('type', 'listing');
  sp.set('itemIds', listingIds.slice(0, MAX_OCCUPANCY_LISTING_IDS).join(','));
  sp.set('staging', 'false');
  sp.set('active', 'true');

  const response = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/revenue-per-l-and-r?${sp.toString()}`,
    { signal, timeout: 45_000 },
  );

  const body = response.data as {
    byItems?: LandRItem[];
    totals?: {
      averageOccupancyRate?: number | string;
      totalNightsBooked?: number | string;
      totalNightsAvailable?: number | string;
      revenuePerNightAvailable?: number | string;
    };
  };

  const items = Array.isArray(body.byItems) ? body.byItems : [];
  const totals = body.totals ?? {};
  const portfolioOccupancy = resolvePortfolioOccupancyFromLandR(items, totals, {
    listingCount: listingIds.length,
    startDate,
    endDate,
  });

  return {
    items,
    portfolioOccupancy,
    totals,
  };
}

async function timedGet<T>(
  label: string,
  url: string,
  options?: { params?: URLSearchParams | Record<string, string | boolean>; signal?: AbortSignal; timeout?: number },
): Promise<T> {
  logApiStart(label);
  try {
    const response = await apiClient.get(url, options);
    logApiOutcome(label, { status: 'fulfilled', value: response });
    return response as T;
  } catch (reason) {
    logApiOutcome(label, { status: 'rejected', reason });
    throw reason;
  }
}

class DashboardService {
  async getPropertyOptions(staging = false, signal?: AbortSignal): Promise<DashboardPropertyOption[]> {
    try {
      const response = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings`, {
        params: { staging },
        signal,
      });
      const listings = extractPayload<any[]>(response.data, []);

      return listings
        .map((listing) => {
          const id = String(listing._id || listing.id || listing.listingId || '');
          const name = String(listing.name || listing.listingName || '').trim();
          const city = String(listing.city?.name || listing.cityName || listing.city || '').trim();

          if (!id || !name) return null;

          return {
            id,
            name,
            city: city || undefined,
            label: city ? `${name} - ${city}` : name,
            isActive: listing.active ?? listing.isActive ?? true,
          } satisfies DashboardPropertyOption;
        })
        .filter((listing) => listing.isActive !== false) as DashboardPropertyOption[];
    } catch (error) {
      if (axios.isCancel(error)) return [];
      console.error('Error fetching dashboard property options:', error);
      return [];
    }
  }

  async getSnapshot(query: DashboardQuery): Promise<DashboardSnapshot> {
    const { period, listingIds = [], staging = false, signal } = query;
    const { startDate, endDate } = buildDateRange(period);
    const timelinePeriod = timelineApiPeriod(period);

    logDashboard('getSnapshot start', {
      period,
      listingIds,
      staging,
      dateRange: { startDate, endDate },
      timelinePeriod,
      hasAuthToken: !!getToken(),
    });

    const propertyOptions = await this.getPropertyOptions(staging, signal);
    logDashboard('listings loaded', { count: propertyOptions.length });
    const activeProperties = propertyOptions.filter((property) => property.isActive !== false);
    const idsForOccupancy = (
      listingIds.length > 0
        ? listingIds.filter((id) => activeProperties.some((property) => property.id === id))
        : activeProperties.map((property) => property.id)
    ).slice(0, MAX_OCCUPANCY_LISTING_IDS);

    const listingParams = urlSearchParamsWithListingIds({ startDate, endDate, staging }, listingIds);

    const [
      listingStatsResult,
      reservationStatsResult,
      messageStatsResult,
      occupancyRateResult,
      averageDailyRateResult,
      revenueByChannelResult,
      timelineResult,
      checkinsTimelineResult,
      occupancyLandRResult,
      overviewResult,
    ] = await Promise.allSettled([
      timedGet('listings/stats', `${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/stats`, {
        params: { staging },
        signal,
      }),
      timedGet('reservations/stats', `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/stats`, {
        params: { staging },
        signal,
      }),
      timedGet('message/get-message-kpis-live', `${MICROSERVICE_BASE_URL.SRV_RESERVATION_MESSAGE}/get-message-kpis-live`, {
        params: { staging },
        signal,
        timeout: 45_000,
      }),
      timedGet('calendar/occupancy-rate', `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/calendar/occupancy-rate`, {
        params: listingParams,
        signal,
        timeout: 45_000,
      }),
      timedGet('reservations/average-daily-rate', `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/average-daily-rate`, {
        params: listingParams,
        signal,
        timeout: 45_000,
      }),
      timedGet('reservations/revenue-per-channel', `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/revenue-per-channel`, {
        params: listingParams,
        signal,
        timeout: 45_000,
      }),
      timedGet('reservations/reservation-stats', `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/reservation-stats`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging, period: timelinePeriod }, listingIds),
        signal,
        timeout: 45_000,
      }),
      timedGet('reservations/checkins-by-channel', `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/checkins-by-channel`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging, period: timelinePeriod }, listingIds),
        signal,
        timeout: 45_000,
      }),
      fetchOccupancyByPropertyFromReservations(idsForOccupancy, startDate, endDate, signal).then((result) => {
        logApiStart('reservations/revenue-per-l-and-r');
        logApiOutcome('reservations/revenue-per-l-and-r', {
          status: 'fulfilled',
          value: { data: result, status: 200 },
        });
        return result;
      }).catch((reason) => {
        logApiStart('reservations/revenue-per-l-and-r');
        logApiOutcome('reservations/revenue-per-l-and-r', { status: 'rejected', reason });
        throw reason;
      }),
      timedGet('admin/dashboard/overview', `${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/overview`, {
        params: urlSearchParamsWithListingIds({}, listingIds),
        signal,
        timeout: 75_000,
      }),
    ]);

    const properties = propertyOptions;

    const listingStats =
      listingStatsResult.status === 'fulfilled'
        ? extractPayload<DashboardListingStatsRaw>(listingStatsResult.value.data, {})
        : {};

    const reservationStats =
      reservationStatsResult.status === 'fulfilled'
        ? extractPayload<DashboardReservationStatsRaw>(reservationStatsResult.value.data, {})
        : {};

    const messageStats =
      messageStatsResult.status === 'fulfilled'
        ? extractPayload<DashboardMessageStatsRaw>(messageStatsResult.value.data, {})
        : {};

    const occupancyRate =
      occupancyRateResult.status === 'fulfilled'
        ? extractPayload<DashboardOccupancyRateRaw>(occupancyRateResult.value.data, {})
        : {};

    const averageDailyRate =
      averageDailyRateResult.status === 'fulfilled'
        ? extractPayload<DashboardAverageDailyRateRaw>(averageDailyRateResult.value.data, {})
        : {};

    const revenueByChannel =
      revenueByChannelResult.status === 'fulfilled'
        ? extractPayload<DashboardRevenueByChannelRaw[]>(revenueByChannelResult.value.data, [])
        : [];

    const timeline =
      timelineResult.status === 'fulfilled'
        ? extractPayload<DashboardCheckinsByChannelRaw[]>(timelineResult.value.data, [])
        : [];

    const checkinsTimeline =
      checkinsTimelineResult.status === 'fulfilled'
        ? extractPayload<DashboardCheckinsByChannelRaw[]>(checkinsTimelineResult.value.data, [])
        : [];

    const occupancyLandR =
      occupancyLandRResult.status === 'fulfilled'
        ? occupancyLandRResult.value
        : { items: [] as LandRItem[], portfolioOccupancy: 0, totals: {} };

    const overviewResponse = overviewResult.status === 'fulfilled' ? overviewResult.value.data : null;
    const overviewOk =
      overviewResult.status === 'fulfilled' &&
      overviewResponse != null &&
      typeof overviewResponse === 'object' &&
      (overviewResponse as Record<string, unknown>).success !== false;

    const overview = extractPayload<DashboardOverviewRaw>(overviewResponse, {});

    const totalRevenue = parseNumber(reservationStats.totalRevenueLast30Days);
    let occupancyValue = parseNumber(occupancyRate.occupancyRate);
    if (occupancyValue <= 0) {
      occupancyValue = occupancyLandR.portfolioOccupancy;
    }
    const adrValue = parseNumber(averageDailyRate.averageDailyRate);
    const activePropertiesCount =
      parseNumber(listingStats.totalActive) || activeProperties.length;

    const kpis: DashboardKpis = {
      totalReservations: {
        value: parseNumber(reservationStats.reservationLast30Days),
        trend: formatTrend(reservationStats.reservationPercentageChange),
      },
      monthlyRevenue: {
        value: totalRevenue,
        trend: formatTrend(reservationStats.totalRevenuePercentageChange),
      },
      occupancyRate: {
        value: Number(occupancyValue.toFixed(1)),
        trend: occupancyValue > 0 ? `${occupancyValue.toFixed(1)}%` : '—',
      },
      adr: {
        value: adrValue,
        trend: adrValue ? `${adrValue.toFixed(0)} MAD` : '—',
      },
      revpar: {
        value: 0,
        trend: '—',
      },
      guestsThisMonth: {
        value: parseNumber(reservationStats.checkInsLast30Days || reservationStats.stayingGuests),
        trend: formatTrend(reservationStats.checkInsPercentageChange),
      },
      activeProperties: {
        value: activePropertiesCount,
        trend: '—',
      },
      averageRating: {
        value: overviewOk ? parseNumber(overview.averageRating) : 0,
        trend: overviewOk && overview.averageRating != null ? `${parseNumber(overview.averageRating).toFixed(2)}` : '—',
      },
    };

    const revenueChart: DashboardRevenuePoint[] =
      timeline.length > 0
        ? mergeRevenueAndBookingsTimeline(timeline, checkinsTimeline, period)
        : [];

    const sourceDistribution = buildSourceDistribution(revenueByChannel);

    const occupancyByProperty =
      occupancyLandR.items.length > 0
        ? occupancyLandR.items
            .map((item) => {
              const adr = parseNumber(item.averageNightlyRate);
              return {
                property: String(item.itemName || '—'),
                occupancy: Number(parseNumber(item.occupancyRate).toFixed(1)),
                ...(adr > 0 ? { adr: Math.round(adr) } : {}),
              };
            })
            .sort((left, right) => right.occupancy - left.occupancy)
        : overviewOk &&
            Array.isArray(overview.occupancyByProperty) &&
            overview.occupancyByProperty.length > 0
          ? overview.occupancyByProperty.filter(
              (row) =>
                listingIds.length === 0 ||
                activeProperties.some(
                  (property) =>
                    listingIds.includes(property.id) &&
                    (property.name === row.property || property.label === row.property),
                ),
            )
          : [];

    const revparFromTotals = parseNumber(occupancyLandR.totals?.revenuePerNightAvailable);
    const revparValue =
      adrValue > 0 && occupancyValue > 0
        ? Math.round((adrValue * occupancyValue) / 100)
        : revparFromTotals > 0
          ? Math.round(revparFromTotals)
          : 0;
    kpis.revpar = {
      value: revparValue,
      trend: revparValue ? `${revparValue} MAD` : '—',
    };

    const unreadThreads = messageStats.unreadThreads || [];
    const liveAlerts: DashboardAlertItem[] = [];

    if (parseNumber(reservationStats.pendingReservations) > 5) {
      liveAlerts.push({
        id: 'pending-reservations',
        severity: 'warning',
        title: 'Réservations en attente',
        detail: `${reservationStats.pendingReservations} réservations nécessitent votre validation.`,
      });
    }

    if (unreadThreads.length > 10) {
      liveAlerts.push({
        id: 'messages-backlog',
        severity: 'critical',
        title: 'Messages non lus',
        detail: `${unreadThreads.length} conversations attendent une réponse.`,
      });
    }

    if (occupancyValue > 0 && occupancyValue < 60) {
      liveAlerts.push({
        id: 'occupancy-drop',
        severity: 'warning',
        title: 'Occupation faible',
        detail: `Le taux d’occupation est à ${occupancyValue.toFixed(1)}% sur la période sélectionnée.`,
      });
    }

    if (parseNumber(reservationStats.totalRevenuePercentageChange) < -10) {
      liveAlerts.push({
        id: 'revenue-drop',
        severity: 'critical',
        title: 'Alerte revenus',
        detail: `Les revenus reculent de ${Math.abs(parseNumber(reservationStats.totalRevenuePercentageChange)).toFixed(1)}% vs période précédente.`,
      });
    }

    const checkFlow: DashboardCheckFlowItem[] =
      overviewOk && Array.isArray(overview.checkFlow) ? overview.checkFlow : DEFAULT_CHECK_FLOW;

    const upcomingCheckIns: DashboardBookingItem[] =
      overviewOk && Array.isArray(overview.upcomingCheckIns) ? overview.upcomingCheckIns : [];

    const upcomingCheckOuts: DashboardBookingItem[] =
      overviewOk && Array.isArray(overview.upcomingCheckOuts) ? overview.upcomingCheckOuts : [];

    const recentBookings: DashboardBookingItem[] =
      overviewOk && Array.isArray(overview.recentBookings) ? overview.recentBookings : [];

    const urgentTasks =
      overviewOk && Array.isArray(overview.urgentTasks) ? overview.urgentTasks : [];

    const unreadMessages =
      overviewOk && Array.isArray(overview.unreadMessages) ? overview.unreadMessages : [];

    const recentReviews = overviewOk && Array.isArray(overview.recentReviews) ? overview.recentReviews : [];

    logDashboard('getSnapshot done', {
      overviewOk,
      properties: properties.length,
      upcomingCheckIns: upcomingCheckIns.length,
      upcomingCheckOuts: upcomingCheckOuts.length,
      occupancyByProperty: occupancyByProperty.length,
      revenueChartPoints: revenueChart.length,
      sourceDistribution: sourceDistribution.length,
      monthlyRevenue: kpis.monthlyRevenue.value,
      occupancyRate: kpis.occupancyRate.value,
    });

    return {
      properties,
      kpis,
      revenueChart,
      sourceDistribution,
      occupancyByProperty,
      alerts: liveAlerts,
      checkFlow,
      upcomingCheckIns,
      upcomingCheckOuts,
      recentBookings,
      urgentTasks,
      unreadMessages,
      recentReviews,
    };
  }
}

export const dashboardService = new DashboardService();
