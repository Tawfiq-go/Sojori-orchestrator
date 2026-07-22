import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { reservationsService } from './reservationsService';
import { runtimeLog } from '../utils/runtimeLog';

export type FinancialRange = {
  startDate: string;
  endDate: string;
};

export type FinancialQuery = FinancialRange & {
  listingIds?: string[];
  channelName?: string[];
  staging?: boolean;
  /** Admin PM scope — transmis aux endpoints qui supportent ownerId / filterOwnerId. */
  ownerId?: string | null;
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
  const ownerId = opts.ownerId?.trim();
  if (ownerId) {
    sp.set('ownerId', ownerId);
    sp.append('filterOwnerId', ownerId);
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
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_CALENDAR}/calendar/occupancy-rate?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  const data = r.data as { occupancyRate?: unknown; data?: { occupancyRate?: unknown } };
  return parseNum(data?.occupancyRate ?? data?.data?.occupancyRate);
}

/**
 * Occupation réelle mois par mois sur les 12 mois se terminant à endDate
 * (pas une intensité relative normalisée à 100).
 */
export async function fetchSeasonalityOccupancy(
  q: FinancialQuery,
): Promise<Array<{ month: string; occupancy: number }>> {
  const end = new Date(`${q.endDate}T12:00:00`);
  if (Number.isNaN(end.getTime())) return [];

  const months = Array.from({ length: 12 }, (_, index) => {
    const d = new Date(end.getFullYear(), end.getMonth() - (11 - index), 1);
    const startDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const endDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;
    const label = d
      .toLocaleDateString('fr-FR', { month: 'short' })
      .replace(/\.$/, '')
      .trim();
    return { startDate, endDate, label };
  });

  const CONCURRENCY = 4;
  const out: Array<{ month: string; occupancy: number }> = [];
  for (let i = 0; i < months.length; i += CONCURRENCY) {
    const chunk = months.slice(i, i + CONCURRENCY);
    const part = await Promise.all(
      chunk.map(async (m) => {
        try {
          const occupancy = await fetchCalendarOccupancyRate({
            ...q,
            startDate: m.startDate,
            endDate: m.endDate,
          });
          return { month: m.label, occupancy: Math.round(Math.max(0, occupancy) * 10) / 10 };
        } catch {
          return { month: m.label, occupancy: 0 };
        }
      }),
    );
    out.push(...part);
  }
  return out;
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

export type LandRPerformanceItem = {
  itemId: string;
  itemName: string;
  totalRevenue: number;
  nightsBooked: number;
  totalCheckIns: number;
  cancelations: number;
  occupancyRate: number;
  averageNightlyRate: number;
  averageRevenuePerStay: number;
  cancelationsPercentage: number;
  avgStay: number;
};

export type LandRTotals = {
  totalRevenue: number;
  totalNightsBooked: number;
  totalCheckIns: number;
  totalCancelations: number;
  averageOccupancyRate: number;
  averageNightlyRate: number;
  averageRevenuePerStay: number;
  totalCancelationsPercentage: number;
};

const MAX_LANDR_LISTING_IDS = 30;

const DEFAULT_LANDR_TIMEOUT_MS = 25_000;

const EMPTY_LANDR: { items: LandRPerformanceItem[]; totals: LandRTotals } = {
  items: [],
  totals: {
    totalRevenue: 0,
    totalNightsBooked: 0,
    totalCheckIns: 0,
    totalCancelations: 0,
    averageOccupancyRate: 0,
    averageNightlyRate: 0,
    averageRevenuePerStay: 0,
    totalCancelationsPercentage: 0,
  },
};

function chunkIds(ids: string[], size: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < ids.length; i += size) out.push(ids.slice(i, i + size));
  return out;
}

function mergeLandRResults(
  parts: Array<{ items: LandRPerformanceItem[]; totals: LandRTotals }>,
): { items: LandRPerformanceItem[]; totals: LandRTotals } {
  const items = parts.flatMap((p) => p.items);
  let totalRevenue = 0;
  let totalNightsBooked = 0;
  let totalCheckIns = 0;
  let totalCancelations = 0;
  let occWeighted = 0;
  let occWeight = 0;
  for (const p of parts) {
    totalRevenue += p.totals.totalRevenue;
    totalNightsBooked += p.totals.totalNightsBooked;
    totalCheckIns += p.totals.totalCheckIns;
    totalCancelations += p.totals.totalCancelations;
    const w = p.totals.totalNightsBooked || p.items.length;
    if (w > 0 && p.totals.averageOccupancyRate > 0) {
      occWeighted += p.totals.averageOccupancyRate * w;
      occWeight += w;
    }
  }
  const denom = totalCheckIns + totalCancelations;
  return {
    items,
    totals: {
      totalRevenue,
      totalNightsBooked,
      totalCheckIns,
      totalCancelations,
      averageOccupancyRate: occWeight > 0 ? Math.round((occWeighted / occWeight) * 10) / 10 : 0,
      averageNightlyRate:
        totalNightsBooked > 0 ? Math.round((totalRevenue / totalNightsBooked) * 100) / 100 : 0,
      averageRevenuePerStay:
        totalCheckIns > 0 ? Math.round((totalRevenue / totalCheckIns) * 100) / 100 : 0,
      totalCancelationsPercentage:
        denom > 0 ? Math.round((totalCancelations / denom) * 1000) / 10 : 0,
    },
  };
}

async function fetchLandRChunk(
  q: FinancialQuery,
  listingIds: string[],
  timeoutMs: number,
): Promise<{ items: LandRPerformanceItem[]; totals: LandRTotals }> {
  const sp = new URLSearchParams();
  sp.set('startDate', q.startDate);
  sp.set('endDate', q.endDate);
  sp.set('type', 'listing');
  sp.set('itemIds', listingIds.join(','));
  sp.set('staging', String(q.staging ?? false));
  sp.set('active', 'true');
  for (const ch of q.channelName ?? []) {
    if (ch) sp.append('channelName', ch);
  }

  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/revenue-per-l-and-r?${sp.toString()}`,
    { signal: q.signal, timeout: timeoutMs },
  );

  const body = r.data as {
    byItems?: Array<Record<string, unknown>>;
    totals?: Record<string, unknown>;
  };

  const items = (body.byItems ?? []).map((row) => ({
    itemId: String(row.itemId ?? ''),
    itemName: String(row.itemName || '—').trim() || '—',
    totalRevenue: parseNum(row.totalRevenue),
    nightsBooked: parseNum(row.nightsBooked),
    totalCheckIns: parseNum(row.totalCheckIns),
    cancelations: parseNum(row.cancelations),
    occupancyRate: parseNum(row.occupancyRate),
    averageNightlyRate: parseNum(row.averageNightlyRate ?? row.revenuePerNightBooked),
    averageRevenuePerStay: parseNum(row.averageRevenuePerStay),
    cancelationsPercentage: parseNum(row.cancelationsPercentage),
    avgStay: parseNum(row.avgStay),
  }));

  const t = body.totals ?? {};
  const totals: LandRTotals = {
    totalRevenue: parseNum(t.totalRevenue),
    totalNightsBooked: parseNum(t.totalNightsBooked),
    totalCheckIns: parseNum(t.totalCheckIns),
    totalCancelations: parseNum(t.totalCancelations),
    averageOccupancyRate: parseNum(t.averageOccupancyRate),
    averageNightlyRate: parseNum(t.averageNightlyRate),
    averageRevenuePerStay: parseNum(t.averageRevenuePerStay),
    totalCancelationsPercentage: parseNum(t.totalCancelationsPercentage),
  };

  return { items, totals };
}

/** Performance par listing — même source que le dashboard (revenue-per-l-and-r). */
export async function fetchListingPerformanceLandR(
  q: FinancialQuery,
  options?: { timeoutMs?: number },
): Promise<{ items: LandRPerformanceItem[]; totals: LandRTotals }> {
  const listingIds = (q.listingIds ?? []).filter(Boolean);
  if (listingIds.length === 0) return { ...EMPTY_LANDR, totals: { ...EMPTY_LANDR.totals } };

  const timeoutMs = options?.timeoutMs ?? DEFAULT_LANDR_TIMEOUT_MS;
  const chunks = chunkIds(listingIds, MAX_LANDR_LISTING_IDS);

  try {
    const parts = await Promise.all(chunks.map((ids) => fetchLandRChunk(q, ids, timeoutMs)));
    return mergeLandRResults(parts);
  } catch (err) {
    if ((err as { code?: string }).code !== 'ERR_CANCELED') {
      runtimeLog('warn', 'AnalyticsAPI', 'revenue-per-l-and-r failed', {
        message: err instanceof Error ? err.message : String(err),
        listingCount: listingIds.length,
        chunks: chunks.length,
      });
    }
    return { ...EMPTY_LANDR, totals: { ...EMPTY_LANDR.totals } };
  }
}

/** Taux d'annulation LandR : cancelled / (checkIns + cancelled). Inclut 0 %. */
export function cancelRateFromLandRTotals(totals: LandRTotals): number | null {
  const denom = totals.totalCheckIns + totals.totalCancelations;
  if (denom <= 0) return null;
  return Math.round((totals.totalCancelations / denom) * 1000) / 10;
}

export type ChannelBookingRow = { source: string; bookings: number; share: number };

/** Réservations par canal (pour compléter channel-stats revenue-only). */
export async function fetchChannelBookingCounts(q: FinancialQuery): Promise<ChannelBookingRow[]> {
  const sp = buildUrlSearchParams(q);
  const r = await apiClient.get(
    `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/reservations/reservation-percentage-per-channel?${sp}`,
    { signal: q.signal, timeout: 60_000 },
  );
  const data = (r.data as { data?: { reservationTotal?: unknown; graphData?: Array<Record<string, unknown>> } })
    ?.data;
  const total = parseNum(data?.reservationTotal);
  const graph = data?.graphData ?? [];
  if (total <= 0 || graph.length === 0) return [];

  return graph.map((row) => {
    const source = String((row.x as { month?: string })?.month ?? row.color ?? '—');
    const pct = parseNum(row.y);
    const bookings = Math.max(0, Math.round((pct / 100) * total));
    return { source, bookings, share: pct };
  });
}

export type AnalyticsReservationRow = {
  id: string;
  sojoriId?: string;
  nights?: number;
  guestCountry?: string;
  createdAt?: string;
  arrivalDate?: string;
  status?: string;
};

/** Statuts pour taux d'annulation + démographie (check-in dans la fenêtre — Hostaway). */
const ANALYTICS_RESERVATION_STATUSES = [
  'Pending',
  'Confirmed',
  'Completed',
  'CancelledByAdmin',
  'CancelledByCustomer',
  'CancelledByOta',
  'CancelledAfterFailedPayment',
  'OtherCancellation',
  'Rejected',
  'cancelled',
  'CancelledByHost',
].join(',');

function arrivalInRange(arrivalIso: string | undefined, startDate: string, endDate: string): boolean {
  if (!arrivalIso) return false;
  const day = arrivalIso.slice(0, 10);
  return day >= startDate && day <= endDate;
}

/** Réservations sur la période — démographie, lead time, durée séjour, annulations (check-in). */
export async function fetchReservationsForAnalytics(
  q: FinancialQuery,
): Promise<AnalyticsReservationRow[]> {
  const listingIds = new Set((q.listingIds ?? []).filter(Boolean));
  const ownerId = q.ownerId?.trim() || null;
  try {
    const result = await reservationsService.getList({
      dateType: 'arrival',
      startDate: q.startDate,
      endDate: q.endDate,
      limit: 100,
      sortField: 'checkin',
      sortOrder: 'asc',
      status: ANALYTICS_RESERVATION_STATUSES,
      ownerId,
      filterOwnerId: ownerId || undefined,
      strictArrivalWindow: true,
    });
    return result.data
      .filter((row) => {
        if (!arrivalInRange(row.arrivalDate != null ? String(row.arrivalDate) : undefined, q.startDate, q.endDate)) {
          return false;
        }
        if (listingIds.size === 0) return true;
        const lid = String(row.sojoriId ?? '');
        return listingIds.has(lid);
      })
      .map((row) => ({
        id: String(row.id ?? ''),
        sojoriId: row.sojoriId != null ? String(row.sojoriId) : undefined,
        nights: parseNum(row.nights),
        guestCountry: row.guestCountry != null ? String(row.guestCountry).trim() : undefined,
        createdAt:
          row.createdAt != null
            ? String(row.createdAt)
            : row.reservationDate != null
              ? String(row.reservationDate)
              : undefined,
        arrivalDate: row.arrivalDate != null ? String(row.arrivalDate) : undefined,
        status: row.status != null ? String(row.status) : undefined,
      }));
  } catch (err) {
    console.warn('[analytics] reservations list failed', err);
    return [];
  }
}
