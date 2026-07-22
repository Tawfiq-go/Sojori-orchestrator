import type { AnalyticsQuery } from '../types/analytics.types';
import { resolveAnalyticsRanges } from './analyticsSnapshotBuilder';
import {
  cancelRateFromLandRTotals,
  channelNamesForAnalyticsSource,
  fetchBookedNights,
  fetchListingPerformanceLandR,
  fetchRentalRevenue,
  type LandRTotals,
} from './analyticsFinancialApi';
import { reservationsService } from './reservationsService';
import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const AUDIT_STATUSES = [
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

export type AnalyticsAuditReservation = {
  id: string;
  reservationNumber: string;
  guestName: string;
  listingId: string;
  listingName: string;
  channel: string;
  status: string;
  arrivalDate: string;
  nights: number;
  totalPrice: string;
  roleInCancelRate: 'check-in' | 'annulation' | 'exclu-echec-paiement' | 'autre';
};

export type AnalyticsAuditSummary = {
  computedAt: string;
  scope: {
    mode: 'admin' | 'owner';
    ownerId: string | null;
    listingIds: string[];
    listingCount: number;
    source: string;
    startDate: string;
    endDate: string;
    periodLabel: string;
  };
  apis: {
    revenueMad: number;
    bookedNights: number;
    adrMad: number;
    landR: LandRTotals;
    cancelRateLandRPct: number | null;
    cancelRateListPct: number;
  };
  cancelBreakdown: {
    checkIns: number;
    softCancels: number;
    failedPayments: number;
    other: number;
    formula: string;
  };
  statusCounts: Record<string, number>;
  reservations: AnalyticsAuditReservation[];
  listTruncated: boolean;
  listTotal: number;
  notes: string[];
};

function isSoftCancel(status: string): boolean {
  if (/^rejected$/i.test(status)) return true;
  return /cancel/i.test(status) && !/failed.?payment/i.test(status);
}

function isFailedPayment(status: string): boolean {
  return /failed.?payment/i.test(status);
}

function isCheckIn(status: string): boolean {
  return !/cancel/i.test(status) && !/^rejected$/i.test(status);
}

function roleForStatus(status: string): AnalyticsAuditReservation['roleInCancelRate'] {
  if (isFailedPayment(status)) return 'exclu-echec-paiement';
  if (isSoftCancel(status)) return 'annulation';
  if (isCheckIn(status)) return 'check-in';
  return 'autre';
}

function cancelRateFromAuditRows(rows: AnalyticsAuditReservation[]): number {
  const checkIns = rows.filter((r) => r.roleInCancelRate === 'check-in').length;
  const cancels = rows.filter((r) => r.roleInCancelRate === 'annulation').length;
  const denom = checkIns + cancels;
  if (denom === 0) return 0;
  return Math.round((cancels / denom) * 1000) / 10;
}

/**
 * Recalcule manuellement les agrégats analytics + liste des résas prises en compte
 * (taux d'annulation, revenus, nuits) pour audit admin / owner.
 */
export async function runAnalyticsDataAudit(
  query: AnalyticsQuery,
  options?: { signal?: AbortSignal },
): Promise<AnalyticsAuditSummary> {
  const signal = options?.signal;
  const { current, periodLabel } = resolveAnalyticsRanges(query);
  const channelName = channelNamesForAnalyticsSource(query.source);
  const selectedListingIds = (query.listingIds ?? []).filter(Boolean);

  let listingIds = selectedListingIds;
  if (listingIds.length === 0) {
    try {
      const params: Record<string, string | boolean> = { staging: false };
      if (query.ownerId) params.ownerId = query.ownerId;
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_LISTING}/listings/dashboard-directory`,
        { params, signal, timeout: 45_000 },
      );
      const listings =
        (response.data as { data?: Array<{ id?: string; _id?: string; isActive?: boolean }> })?.data ??
        [];
      listingIds = listings
        .filter((l) => l.isActive !== false)
        .map((l) => String(l.id ?? l._id ?? ''))
        .filter(Boolean);
    } catch {
      listingIds = [];
    }
  }

  const financialQ = {
    ...current,
    listingIds,
    channelName,
    staging: query.staging,
    ownerId: query.ownerId ?? null,
    signal,
  };

  const listingIdSet = new Set(listingIds);
  const ownerId = query.ownerId?.trim() || null;

  const [revenueMad, bookedNights, landR, listResult] = await Promise.all([
    fetchRentalRevenue(financialQ),
    fetchBookedNights(financialQ),
    fetchListingPerformanceLandR(financialQ, { timeoutMs: 60_000 }),
    reservationsService.getList({
      dateType: 'arrival',
      startDate: current.startDate,
      endDate: current.endDate,
      limit: 100,
      sortField: 'checkin',
      sortOrder: 'asc',
      status: AUDIT_STATUSES,
      ownerId,
      filterOwnerId: ownerId || undefined,
      strictArrivalWindow: true,
    }),
  ]);

  const filtered = listResult.data.filter((row) => {
    const arr = row.arrivalDate != null ? String(row.arrivalDate).slice(0, 10) : '';
    if (!arr || arr < current.startDate || arr > current.endDate) return false;
    if (listingIdSet.size === 0) return true;
    return listingIdSet.has(String(row.sojoriId ?? ''));
  });

  const reservations: AnalyticsAuditReservation[] = filtered.map((row) => {
    const status = String(row.status ?? '');
    return {
      id: String(row.id ?? ''),
      reservationNumber: String(row.reservationNumber ?? row.id ?? '—'),
      guestName: String(row.guestName ?? '—'),
      listingId: String(row.sojoriId ?? ''),
      listingName: String(
        (row as { listingName?: string }).listingName ??
          (row as { listing_name?: string }).listing_name ??
          row.sojoriId ??
          '—',
      ),
      channel: String(row.channelName ?? '—'),
      status,
      arrivalDate: row.arrivalDate
        ? new Date(row.arrivalDate).toLocaleDateString('fr-FR')
        : '—',
      nights: Number(row.nights) || 0,
      totalPrice:
        row.totalPrice != null ? `${row.totalPrice} ${row.currency ?? ''}`.trim() : '—',
      roleInCancelRate: roleForStatus(status),
    };
  });

  const statusCounts: Record<string, number> = {};
  for (const r of reservations) {
    statusCounts[r.status || '—'] = (statusCounts[r.status || '—'] ?? 0) + 1;
  }

  const checkIns = reservations.filter((r) => r.roleInCancelRate === 'check-in').length;
  const softCancels = reservations.filter((r) => r.roleInCancelRate === 'annulation').length;
  const failedPayments = reservations.filter(
    (r) => r.roleInCancelRate === 'exclu-echec-paiement',
  ).length;
  const other = reservations.filter((r) => r.roleInCancelRate === 'autre').length;

  const cancelRateListPct = cancelRateFromAuditRows(reservations);
  const cancelRateLandRPct = cancelRateFromLandRTotals(landR.totals);
  const adrMad = bookedNights > 0 ? Math.round((revenueMad / bookedNights) * 100) / 100 : 0;

  const notes: string[] = [
    'Hostaway Occupancy : fenêtre = check-in (arrivalDate) dans [start, end] — PAS cancellationDate.',
    'Exemple : check-in octobre annulé en juillet → compte en OCTOBRE, pas en juillet.',
    'Taux = annulations métier / (check-ins + annulations métier).',
    'CancelledAfterFailedPayment exclu du taux.',
    'Revenus / nuits = agrégats API (jours scalés MAD), pas la somme de la liste ci-dessous.',
  ];
  if (listResult.total > filtered.length || listResult.data.length >= 100) {
    notes.push(
      `Liste plafonnée à 100 résas API (total annoncé ${listResult.total}) — le détail peut être incomplet.`,
    );
  }
  if (selectedListingIds.length > 0) {
    notes.push(`Filtre listings actif : ${selectedListingIds.length} bien(s).`);
  }

  return {
    computedAt: new Date().toISOString(),
    scope: {
      mode: ownerId ? 'admin' : 'owner',
      ownerId,
      listingIds,
      listingCount: listingIds.length,
      source: query.source ?? 'Tous',
      startDate: current.startDate,
      endDate: current.endDate,
      periodLabel,
    },
    apis: {
      revenueMad,
      bookedNights,
      adrMad,
      landR: landR.totals,
      cancelRateLandRPct,
      cancelRateListPct,
    },
    cancelBreakdown: {
      checkIns,
      softCancels,
      failedPayments,
      other,
      formula: `${softCancels} / (${checkIns} + ${softCancels}) = ${cancelRateListPct}%`,
    },
    statusCounts,
    reservations,
    listTruncated: listResult.total > reservations.length || listResult.data.length >= 100,
    listTotal: listResult.total,
    notes,
  };
}
