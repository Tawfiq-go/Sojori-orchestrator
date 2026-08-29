import apiClient from './apiClient';
import { FULLTASK_ADMIN_BASE } from '../config/microserviceBases';

/**
 * Revenu ventilé USALI — lecture seule.
 *
 * `revenue_lines` regroupe le revenu de toutes provenances (PMS, OTA, direct,
 * minibar Sojori) classé selon la norme comptable hôtelière : Rooms, F&B,
 * Other Operated, Miscellaneous.
 */

/** `revenue_lines` appartient à srv-fulltask, aux côtés du grand livre et du catalogue. */
const REVENUE_BASE = FULLTASK_ADMIN_BASE;

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
      `${REVENUE_BASE}/revenue/by-reservation/${encodeURIComponent(reservationId)}`,
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
      `${REVENUE_BASE}/revenue/summary?${search.toString()}`,
      { timeout: 20000 },
    );
    const data = res?.data;
    if (!data?.success) return null;
    return data as RevenueSummary;
  } catch {
    return null;
  }
}

export type RevenueLineRow = {
  id: string;
  name: string;
  department: string | null;
  departmentLabel: string;
  gross: number;
  net: number;
  tax: number;
  currency: string;
  consumedAt: string | null;
  isClosed: boolean;
  source: string;
  reservationId: string | null;
  categoryName: string | null;
};

export type RevenueLinesPage = {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalGross: number;
  totalNet: number;
  data: RevenueLineRow[];
};

/** Détail ligne par ligne des ventes d'extras — filtrable par département. */
export async function fetchRevenueLines(params: {
  from: string;
  to: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RevenueLinesPage | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.department) search.set('department', params.department);
    if (params.search?.trim()) search.set('search', params.search.trim());
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const res = await apiClient.get(`${REVENUE_BASE}/revenue/lines?${search.toString()}`, {
      timeout: 20000,
    });
    const data = res?.data;
    if (!data?.success) return null;
    return data as RevenueLinesPage;
  } catch {
    return null;
  }
}

export type RevenueBillRow = {
  billRef: string | null;
  items: number;
  gross: number;
  net: number;
  tax: number;
  currency: string;
  lastAt: string | null;
  reservationId: string | null;
  listingId: string | null;
  isClosed: boolean;
  departments: string[];
  sources: string[];
  /** Renseignés dès que les notes du PMS sont importées. */
  billCode: string | null;
  billNumber: string | null;
  billType: 'receipt' | 'invoice' | null;
  paidAmount: number;
};

export type RevenueBillsPage = {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalGross: number;
  totalNet: number;
  data: RevenueBillRow[];
};

/** Ventes regroupées par note client — une ligne par facture. */
export async function fetchRevenueBills(params: {
  from: string;
  to: string;
  department?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<RevenueBillsPage | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.department) search.set('department', params.department);
    if (params.search?.trim()) search.set('search', params.search.trim());
    if (params.page) search.set('page', String(params.page));
    if (params.limit) search.set('limit', String(params.limit));
    const res = await apiClient.get(`${REVENUE_BASE}/revenue/bills?${search.toString()}`, {
      timeout: 20000,
    });
    const data = res?.data;
    if (!data?.success) return null;
    return data as RevenueBillsPage;
  } catch {
    return null;
  }
}

/** Articles d'une note — alimente le panneau de détail. */
export async function fetchBillLines(params: {
  from: string;
  to: string;
  billRef: string;
}): Promise<RevenueLineRow[]> {
  try {
    const search = new URLSearchParams({
      from: params.from,
      to: params.to,
      billRef: params.billRef,
      limit: '300',
    });
    const res = await apiClient.get(`${REVENUE_BASE}/revenue/lines?${search.toString()}`, {
      timeout: 20000,
    });
    return res?.data?.success ? ((res.data.data ?? []) as RevenueLineRow[]) : [];
  } catch {
    return [];
  }
}
