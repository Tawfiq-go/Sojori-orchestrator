import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

export type FinancialRange = {
  startDate: string;
  endDate: string;
};

export type FinancialQuery = FinancialRange & {
  listingIds?: string[];
  channelName?: string[];
  staging?: boolean;
  signal?: AbortSignal;
};

function buildUrlSearchParams(opts: FinancialQuery): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('startDate', opts.startDate);
  sp.set('endDate', opts.endDate);
  sp.set('staging', String(opts.staging ?? false));
  sp.set('useActiveFilter', 'true');
  sp.set('active', 'true');
  for (const id of opts.listingIds ?? []) {
    if (id) sp.append('listingIds', id);
  }
  for (const ch of opts.channelName ?? []) {
    if (ch) sp.append('channelName', ch);
  }
  return sp;
}

export function channelNamesForAnalyticsSource(source?: string): string[] {
  switch (source) {
    case 'Airbnb':
      return ['AirBNB', 'Airbnb'];
    case 'Booking.com':
      return ['BookingCom', 'Booking.com'];
    case 'Sojori':
      return ['sojori', 'Sojori'];
    case 'Vrbo':
      return ['Vrbo', 'VRBO'];
    default:
      return [];
  }
}

function parseNum(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export async function fetchRentalRevenue(q: FinancialQuery): Promise<number> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/rental-revenue?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  return parseNum((r.data as { totalRevenue?: unknown })?.totalRevenue);
}

export async function fetchBookedNights(q: FinancialQuery): Promise<number> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/booked-nights?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  return parseNum((r.data as { totalNights?: unknown })?.totalNights);
}

export async function fetchAverageDailyRate(q: FinancialQuery): Promise<number> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/average-daily-rate?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  return parseNum((r.data as { averageDailyRate?: unknown })?.averageDailyRate);
}

export async function fetchAverageRevenuePerStay(q: FinancialQuery): Promise<number> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/average-revenue-per-stay?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  return parseNum((r.data as { averageRevenuePerStay?: unknown })?.averageRevenuePerStay);
}

export async function fetchCalendarOccupancyRate(q: FinancialQuery): Promise<number> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(`${MICROSERVICE_BASE_URL.SRV_CALENDAR}/calendar/occupancy-rate`, {
    params: sp,
    signal: q.signal,
    timeout: 60_000,
  });
  const data = r.data as { occupancyRate?: unknown; data?: { occupancyRate?: unknown } };
  return parseNum(data?.occupancyRate ?? data?.data?.occupancyRate);
}

export type ChannelStatRow = { label: string; value: number };

export async function fetchChannelStats(q: FinancialQuery): Promise<ChannelStatRow[]> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/channel-stats?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  const raw = (r.data as { data?: Array<{ label?: string; value?: unknown }> })?.data ?? [];
  return raw.map((row) => ({
    label: String(row.label ?? '—'),
    value: parseNum(row.value),
  }));
}

export type ReservationStatPoint = {
  label: string;
  revenue: number;
  bookings: number;
};

export async function fetchReservationStatsTimeline(
  q: FinancialQuery & { period: 'day' | 'week' | 'month' },
): Promise<ReservationStatPoint[]> {
  const sp = buildUrlSearchParams(q);
  sp.set('period', q.period);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/reservation-stats?${sp}`,
    { signal: q.signal, timeout: 90_000 },
  );
  const rows = (r.data as { data?: Array<Record<string, unknown>> })?.data ?? [];
  return rows.map((row) => {
    const x = row.x as { year?: number; month?: number; date?: number; week?: number } | undefined;
    let label = '—';
    if (x?.year && x?.month && x?.date) {
      label = new Date(x.year, x.month - 1, x.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
      });
    } else if (x?.year && x?.week) {
      label = `S${x.week}`;
    } else if (x?.year && x?.month) {
      label = new Date(x.year, x.month - 1, 1).toLocaleDateString('fr-FR', { month: 'short' });
    } else if (typeof row.date === 'string') {
      label = new Date(row.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
    }
    return {
      label,
      revenue: parseNum(row.y ?? row.revenue),
      bookings: parseNum(row.count ?? row.checkIns),
    };
  });
}
