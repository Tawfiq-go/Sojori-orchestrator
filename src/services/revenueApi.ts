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
  /** Taxes de séjour — hors chiffre d'affaires, reversées à l'État. */
  cityTaxTotal: number;
  cityTaxes: Array<{ name: string; gross: number; lines: number }>;
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

export type CustomerReportRow = {
  customerId: string;
  gross: number;
  items: number;
  bills: number;
  firstAt: string | null;
  lastAt: string | null;
  byDepartment: { fnb: number; other_operated: number; misc: number };
};

export type CustomersReport = {
  success: boolean;
  customers: number;
  totalGross: number;
  averageGross: number;
  data: CustomerReportRow[];
};

/** Classement des clients par consommation d'extras. */
export async function fetchCustomersReport(params: {
  from: string;
  to: string;
  limit?: number;
}): Promise<CustomersReport | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.limit) search.set('limit', String(params.limit));
    const res = await apiClient.get(`${REVENUE_BASE}/reports/customers?${search.toString()}`, {
      timeout: 20000,
    });
    return res?.data?.success ? (res.data as CustomersReport) : null;
  } catch {
    return null;
  }
}

export type NationalityReport = {
  success: boolean;
  countries: Array<{ code: string; customers: number; gross: number }>;
  customers: number;
  totalGross: number;
  /** Clients dont la nationalité n'est pas exploitable — à afficher. */
  unknownCustomers: number;
  /** Ce qu'ils pèsent : une saisie manquante, pas un montant perdu. */
  unknownGross: number;
};

/** Répartition géographique des clients ayant consommé sur la période. */
export async function fetchNationalityReport(params: {
  from: string;
  to: string;
}): Promise<NationalityReport | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/nationalities?${search.toString()}`,
      { timeout: 20000 },
    );
    return res?.data?.success ? (res.data as NationalityReport) : null;
  } catch {
    return null;
  }
}

export type CustomerDetail = {
  success: boolean;
  customerId: string;
  gross: number;
  items: number;
  bills: number;
  reservations: number;
  firstAt: string | null;
  lastAt: string | null;
  favourites: Array<{ name: string; times: number; gross: number }>;
  byDepartment: Array<{ department: string; label: string; gross: number; items: number }>;
  timeline: Array<{ day: string; gross: number; items: number }>;
};

/** Fiche d'un client — produits favoris, répartition, chronologie. */
export async function fetchCustomerDetail(
  customerId: string,
  params: { from: string; to: string },
): Promise<CustomerDetail | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/customer/${encodeURIComponent(customerId)}?${search.toString()}`,
      { timeout: 20000 },
    );
    return res?.data?.success ? (res.data as CustomerDetail) : null;
  } catch {
    return null;
  }
}

export type OperationsPeriod = {
  key: string;
  label: string;
  from: string;
  to: string;
  parcUnits: number;
  blockedUnits: number;
  availableUnits: number;
  soldUnits: number;
  unsoldUnits: number;
  outOfServiceUnits: number;
  houseGuestUnits: number;
  unclassifiedUnits: number;
  roomRevenue: number;
  revenue: { rooms: number; fnb: number; misc: number; total: number };
  occupancyPct: number | null;
  adr: number | null;
  revpar: number | null;
  trevpar: number | null;
};

export type OperationsReport = {
  success: boolean;
  asOf: string;
  periods: OperationsPeriod[];
  daily: Array<{
    day: string;
    availableUnits: number;
    soldUnits: number;
    blockedUnits: number;
    roomRevenue: number;
    occupancyPct: number | null;
    adr: number | null;
  }>;
  extras: Array<{
    category: string;
    monthGross: number;
    monthItems: number;
    yearGross: number;
    yearItems: number;
  }>;
  settlement: {
    billedGross: number;
    billedLines: number;
    taxes: number;
    taxLines: number;
    due: number;
    collected: number;
    gap: number;
    gapPct: number;
  };
  blockReasons: Array<{ category: string; rawName: string; nights: number }>;
};

/** Rapport d'exploitation — occupation, revenu, extras, encaissements. */
export async function fetchOperationsReport(params?: {
  asOf?: string;
}): Promise<OperationsReport | null> {
  try {
    const search = new URLSearchParams();
    if (params?.asOf) search.set('asOf', params.asOf);
    const qs = search.toString();
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/operations${qs ? `?${qs}` : ''}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as OperationsReport) : null;
  } catch {
    return null;
  }
}

export type OriginCountry = {
  code: string;
  customers: number;
  reservations: number;
  nights: number;
  accommodation: number;
  extras: number;
  total: number;
  perReservation: number | null;
};

export type BookingChannel = {
  channel: string;
  direct: boolean;
  reservations: number;
  nights: number;
  guests: number;
};

/** Concentration réelle du chiffre d'affaires — mesurée, pas supposée. */
export type Concentration = {
  customers: number;
  top10Pct: number;
  top20Pct: number;
  top50Pct: number;
  customersFor80Pct: number;
  customersFor80Share: number;
};

export type ClientOriginReport = {
  success: boolean;
  countries: OriginCountry[];
  channels: BookingChannel[];
  /** Part des réservations en direct, null si le canal est indisponible. */
  directPct: number | null;
  concentration: Concentration;
  totals: {
    customers: number;
    reservations: number;
    nights: number;
    accommodation: number;
    extras: number;
    total: number;
  };
  /** Clients sans nationalité exploitable — comptés, jamais écartés. */
  unplaced: {
    customers: number;
    reservations: number;
    nights: number;
    accommodation: number;
    extras: number;
    total: number;
  };
};

/** Origine des clients, pondérée par les réservations. */
export async function fetchClientOrigin(params: {
  from: string;
  to: string;
}): Promise<ClientOriginReport | null> {
  try {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/client-origin?${search.toString()}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as ClientOriginReport) : null;
  } catch {
    return null;
  }
}

export type DailyStats = {
  day: string;
  /** Vrai quand la recette vient du prix négocié, pas de la facturation. */
  isForecast?: boolean;
  parcUnits: number;
  blockedUnits: number;
  availableUnits: number;
  soldUnits: number;
  roomRevenue: number;
  occupancyPct: number | null;
  adr: number | null;
  revpar: number | null;
  blocks: Array<{ name: string; category: string; reason: string }>;
};

export type DailySummary = {
  success: boolean;
  asOf: string;
  parcUnits: number;
  days: { yesterday: DailyStats; today: DailyStats; tomorrow: DailyStats };
  week: DailyStats[];
  movement: Array<{ day: string; arrivals: number; departures: number; guestsIn: number }>;
  arrivals: Array<{
    guestName: string;
    unit: string | null;
    channel: string;
    guests: number;
    nights: number;
    departureDate: string | null;
  }>;
  pace: Array<{ day: string; reservations: number; nights: number }>;
  /** Ce qui a été pris ces 7 jours, ventilé par mois d'arrivée. */
  pickup: Array<{
    takenOn: string;
    stayMonth: string;
    reservations: number;
    nights: number;
    revenue: number;
  }>;
  revenuePerformance: {
    previous: { month: string; total: number; booked: boolean };
    current: { month: string; total: number; booked: boolean };
    next: { month: string; total: number; booked: boolean };
    variationPct: number | null;
  };
  paceTotal: number;
  paceNights: number;
  extras: {
    today: Array<{ category: string; gross: number; items: number }>;
    yesterdayTotal: number;
  };
  months: Array<{
    month: string;
    availableUnits: number;
    soldUnits: number;
    roomRevenue: number;
    occupancyPct: number | null;
    adr: number | null;
    revpar: number | null;
  }>;
  cumulative: Array<{ month: string; nights: number; cumulative: number }>;
};

/** Résumé quotidien — le rapport du matin. */
export async function fetchDailySummary(params?: {
  asOf?: string;
}): Promise<DailySummary | null> {
  try {
    const search = new URLSearchParams();
    if (params?.asOf) search.set('asOf', params.asOf);
    const qs = search.toString();
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/daily-summary${qs ? `?${qs}` : ''}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as DailySummary) : null;
  } catch {
    return null;
  }
}
