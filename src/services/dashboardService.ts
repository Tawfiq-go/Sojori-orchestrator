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
  DashboardOccupancyByListingRaw,
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
import { logApiOutcome, logDashboard } from '../utils/dashboardDebug';
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

/** Plage mois calendrier (YYYY-MM) attendue par get-occupancy-stats-by-listing */
function rollingOccupancyMonthRangeYm(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date(end.getFullYear(), end.getMonth() - 2, 1);
  const pad = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { startDate: pad(start), endDate: pad(end) };
}

/** Au-delà, l’agrégation calendrier multi-listings explose en durée (timeouts client / ingress). */
const MAX_OCCUPANCY_BY_LISTING_IDS = 10;

async function fetchOccupancyByListingAxios(listingIds: string[], signal?: AbortSignal) {
  if (listingIds.length === 0) {
    return { data: { success: true, byItems: [] as DashboardOccupancyByListingRaw[] } };
  }
  const { startDate, endDate } = rollingOccupancyMonthRangeYm();
  const sp = new URLSearchParams();
  sp.set('startDate', startDate);
  sp.set('endDate', endDate);
  for (const id of listingIds) {
    sp.append('listingIds', id);
  }
  const url = `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/inventory/get-occupancy-stats-by-listing?${sp.toString()}`;
  return apiClient.get(url, { signal, timeout: 45_000 });
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
        .filter(Boolean) as DashboardPropertyOption[];
    } catch (error) {
      if (axios.isCancel(error)) return [];
      console.error('Error fetching dashboard property options:', error);
      return [];
    }
  }

  async getSnapshot(query: DashboardQuery): Promise<DashboardSnapshot> {
    const { period, listingIds = [], staging = false, signal } = query;
    const { startDate, endDate } = buildDateRange(period);

    logDashboard('getSnapshot start', {
      period,
      listingIds,
      staging,
      dateRange: { startDate, endDate },
      hasAuthToken: !!getToken(),
    });

    const propertyOptions = await this.getPropertyOptions(staging, signal);
    logDashboard('listings loaded', { count: propertyOptions.length });
    const idsForOccupancy = (
      listingIds.length > 0 ? listingIds : propertyOptions.map((property) => property.id).filter(Boolean)
    ).slice(0, MAX_OCCUPANCY_BY_LISTING_IDS);

    const [
      listingStatsResult,
      reservationStatsResult,
      messageStatsResult,
      occupancyRateResult,
      averageDailyRateResult,
      revenueByChannelResult,
      timelineResult,
      occupancyByListingResult,
      overviewResult,
    ] = await Promise.allSettled([
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/stats`, { params: { staging }, signal }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/stats`, { params: { staging }, signal }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION_MESSAGE}/get-message-kpis-live`, {
        params: { staging },
        signal,
        timeout: 45_000,
      }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_CALENDAR}/calendar/occupancy-rate`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging }, listingIds),
        signal,
        timeout: 45_000,
      }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/average-daily-rate`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging }, listingIds),
        signal,
        timeout: 45_000,
      }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/revenue-per-channel`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging }, listingIds),
        signal,
        timeout: 45_000,
      }),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/checkins-by-channel`, {
        params: urlSearchParamsWithListingIds({ startDate, endDate, staging, period: 'day' }, listingIds),
        signal,
        timeout: 45_000,
      }),
      fetchOccupancyByListingAxios(idsForOccupancy, signal),
      apiClient.get(`${MICROSERVICE_BASE_URL.SRV_ADMIN}/dashboard/overview`, {
        params: urlSearchParamsWithListingIds({}, listingIds),
        signal,
        /** Agrège plusieurs microservices ; le client axios par défaut est 30s — trop court si un amont est lent. */
        timeout: 75000,
      }),
    ]);

    logApiOutcome('listings/stats', listingStatsResult);
    logApiOutcome('reservations/stats', reservationStatsResult);
    logApiOutcome('message/get-message-kpis-live', messageStatsResult);
    logApiOutcome('calendar/occupancy-rate', occupancyRateResult);
    logApiOutcome('reservations/average-daily-rate', averageDailyRateResult);
    logApiOutcome('reservations/revenue-per-channel', revenueByChannelResult);
    logApiOutcome('reservations/checkins-by-channel', timelineResult);
    logApiOutcome('calendar/occupancy-by-listing', occupancyByListingResult);
    logApiOutcome('admin/dashboard/overview', overviewResult);

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

    const occupancyByListing =
      occupancyByListingResult.status === 'fulfilled'
        ? extractPayload<DashboardOccupancyByListingRaw[]>(occupancyByListingResult.value.data, [])
        : [];

    const overviewResponse = overviewResult.status === 'fulfilled' ? overviewResult.value.data : null;
    const overviewOk =
      overviewResult.status === 'fulfilled' &&
      overviewResponse != null &&
      typeof overviewResponse === 'object' &&
      (overviewResponse as Record<string, unknown>).success !== false;

    const overview = extractPayload<DashboardOverviewRaw>(overviewResponse, {});

    const totalRevenue = parseNumber(reservationStats.totalRevenueLast30Days);
    const occupancyValue = parseNumber(occupancyRate.occupancyRate);
    const adrValue = parseNumber(averageDailyRate.averageDailyRate);
    const activeProperties = parseNumber(listingStats.totalActive);
    const revparValue =
      adrValue > 0 && occupancyValue > 0 ? Math.round((adrValue * occupancyValue) / 100) : 0;

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
        value: occupancyValue,
        trend: occupancyValue ? `${occupancyValue.toFixed(1)}%` : '—',
      },
      adr: {
        value: adrValue,
        trend: adrValue ? `${adrValue.toFixed(0)} EUR` : '—',
      },
      revpar: {
        value: revparValue,
        trend: revparValue ? `${revparValue} EUR` : '—',
      },
      guestsThisMonth: {
        value: parseNumber(reservationStats.checkInsLast30Days || reservationStats.stayingGuests),
        trend: formatTrend(reservationStats.checkInsPercentageChange),
      },
      activeProperties: {
        value: activeProperties,
        trend: '—',
      },
      averageRating: {
        value: overviewOk ? parseNumber(overview.averageRating) : 0,
        trend: overviewOk && overview.averageRating != null ? `${parseNumber(overview.averageRating).toFixed(2)}` : '—',
      },
    };

    const revenueChart: DashboardRevenuePoint[] =
      timeline.length > 0
        ? timeline
            .map((item) => ({
              date: formatTimelineDate(item),
              revenue: parseNumber(item.revenue || item.y),
              bookings: parseNumber(item.count || item.checkIns),
            }))
            .slice(-14)
        : [];

    const totalChannelRevenue = revenueByChannel.reduce(
      (sum, channel) => sum + parseNumber(channel.totalRevenue || channel.revenue),
      0,
    );

    const sourceDistribution: DashboardSourceDistributionItem[] =
      revenueByChannel.length > 0 && totalChannelRevenue > 0
        ? revenueByChannel.map((channel) => {
            const revenue = parseNumber(channel.totalRevenue || channel.revenue);
            return {
              source: channel.channelName || channel.channel || 'Canal',
              revenue,
              value: Number(((revenue / totalChannelRevenue) * 100).toFixed(1)),
            };
          })
        : [];

    const occupancyMap = new Map(
      occupancyByListing.map((item) => [
        String(item.listingId || ''),
        Array.isArray(item.listingMonth) && item.listingMonth.length > 0
          ? item.listingMonth.reduce((sum, month) => sum + parseNumber(month.occupancy), 0) / item.listingMonth.length
          : 0,
      ]),
    );

    const selectedOrTopProperties = properties
      .filter((property) => listingIds.length === 0 || listingIds.includes(property.id))
      .slice(0, 5);

    const liveOccupancyByProperty = selectedOrTopProperties
      .map((property) => ({
        property: property.name,
        occupancy: Number((occupancyMap.get(property.id) || 0).toFixed(1)),
        ...(adrValue > 0 ? { adr: Math.round(adrValue) } : {}),
      }))
      .filter((item) => item.occupancy > 0);

    const overviewOccupancy =
      overviewOk &&
      Array.isArray(overview.occupancyByProperty) &&
      overview.occupancyByProperty.length > 0
        ? overview.occupancyByProperty
        : null;

    const occupancyByProperty =
      overviewOccupancy ?? (liveOccupancyByProperty.length > 0 ? liveOccupancyByProperty : []);

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
      monthlyRevenue: kpis.monthlyRevenue.value,
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
