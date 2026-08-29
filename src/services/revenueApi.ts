import apiClient from './apiClient';

/**
 * Revenu ventilé USALI — lecture seule.
 *
 * `revenue_lines` regroupe le revenu de toutes provenances (PMS, OTA, direct,
 * minibar Sojori) classé selon la norme comptable hôtelière : Rooms, F&B,
 * Other Operated, Miscellaneous.
 */

const CHANNELS_DASHBOARD = '/api/v1/admin/channels-dashboard';

export type RevenueLine = {
  id: string;
  name: string;
  gross: number;
  net: number;
  tax: number;
  currency: string;
  consumedAt: string;
  isClosed: boolean;
  /** Provenance : `mews` pour le PMS, `minibar` pour une saisie Sojori… */
  source: string;
};

export type RevenueGroup = {
  department: string;
  label: string;
  total: number;
  lines: RevenueLine[];
};

export type ReservationRevenue = {
  success: boolean;
  reservationId: string;
  currency: string;
  /** Total des extras — hébergement exclu. */
  extrasTotal: number;
  /** Hébergement, renvoyé à part : déjà affiché ailleurs sur la réservation. */
  accommodationTotal: number;
  count: number;
  groups: RevenueGroup[];
};

/** Extras d'un séjour, groupés par département USALI. */
export async function fetchReservationRevenue(
  reservationId: string,
): Promise<ReservationRevenue | null> {
  try {
    const res = await apiClient.get(
      `${CHANNELS_DASHBOARD}/revenue/by-reservation/${encodeURIComponent(reservationId)}`,
      { timeout: 20000 },
    );
    const data = res?.data;
    if (!data?.success) return null;
    return data as ReservationRevenue;
  } catch {
    // Absence de données n'est pas une erreur à remonter : le bloc se masque.
    return null;
  }
}

export type RevenueSummary = {
  success: boolean;
  from: string;
  to: string;
  totalGross: number;
  totalNet: number;
  byDepartment: Record<
    string,
    { label: string; gross: number; net: number; tax: number; lines: number }
  >;
  order: string[];
};

/** Ventilation USALI sur une période. */
export async function fetchRevenueSummary(params: {
  from: string;
  to: string;
  listingId?: string;
}): Promise<RevenueSummary | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.listingId) search.set('listingId', params.listingId);
    const res = await apiClient.get(
      `${CHANNELS_DASHBOARD}/revenue/summary?${search.toString()}`,
      { timeout: 20000 },
    );
    const data = res?.data;
    if (!data?.success) return null;
    return data as RevenueSummary;
  } catch {
    return null;
  }
}
