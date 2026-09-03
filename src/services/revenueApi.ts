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
  ownerId: string;
  from: string;
  to: string;
}): Promise<ClientOriginReport | null> {
  try {
    const search = new URLSearchParams({
      ownerId: params.ownerId,
      from: params.from,
      to: params.to,
    });
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

export type TrendMonth = {
  month: string;
  daysMeasured: number;
  parcUnits: number;
  availableUnits: number;
  soldUnits: number;
  blockedUnits: number;
  outOfServiceUnits: number;
  houseGuestUnits: number;
  unclassifiedUnits: number;
  roomRevenue: number;
  extrasRevenue: number;
  totalRevenue: number;
  occupancyPct: number | null;
  adr: number | null;
  revpar: number | null;
  trevpar: number | null;
  /** Ce que les nuitées bloquées auraient rapporté au prix du mois. */
  blockedValue: number;
  blockedValueByReason: {
    houseGuest: number;
    outOfService: number;
    unclassified: number;
  };
};

export type AnnualTrend = {
  success: boolean;
  year: number;
  months: TrendMonth[];
  totals: {
    availableUnits: number;
    soldUnits: number;
    blockedUnits: number;
    roomRevenue: number;
    extrasRevenue: number;
    totalRevenue: number;
    occupancyPct: number | null;
    adr: number | null;
    revpar: number | null;
    trevpar: number | null;
    blockedValue: number;
    blockedValuePctOfRoom: number | null;
    blockedByReason: { houseGuest: number; outOfService: number; unclassified: number };
    blockedValueByReason: { houseGuest: number; outOfService: number; unclassified: number };
  };
  best: { month: string; revpar: number | null } | null;
  worst: { month: string; revpar: number | null } | null;
};

/** Tendance annuelle — matrice mois × indicateur. */
export async function fetchAnnualTrend(params?: {
  year?: number;
}): Promise<AnnualTrend | null> {
  try {
    const search = new URLSearchParams();
    if (params?.year) search.set('year', String(params.year));
    const qs = search.toString();
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/annual-trend${qs ? `?${qs}` : ''}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as AnnualTrend) : null;
  } catch {
    return null;
  }
}

export type ProductRow = {
  name: string;
  lines: number;
  gross: number;
  averageLine: number;
  department: string;
  category: string | null;
  firstAt: string | null;
  lastAt: string | null;
  inCatalogue: boolean;
  cataloguePrice: number | null;
};

export type ProductsReport = {
  success: boolean;
  items: ProductRow[];
  dormant: Array<{
    name: string;
    price: number | null;
    isActive: boolean;
    isMinibar: boolean;
    service: string | null;
  }>;
  totals: {
    catalogueSize: number;
    soldDistinct: number;
    totalGross: number;
    totalLines: number;
    dormantCount: number;
    offCatalogueCount: number;
    offCatalogueGross: number;
    offCataloguePct: number;
  };
};

/** Rotation du catalogue — ce qui se vend, ce qui dort. */
export async function fetchProductsReport(params?: {
  from?: string;
  to?: string;
}): Promise<ProductsReport | null> {
  try {
    const search = new URLSearchParams();
    if (params?.from && params?.to) {
      search.set('from', params.from);
      search.set('to', params.to);
    }
    const qs = search.toString();
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/products${qs ? `?${qs}` : ''}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as ProductsReport) : null;
  } catch {
    return null;
  }
}

export type MovementEntry = {
  kind: 'arrival' | 'departure';
  guestName: string;
  unit: string | null;
  channel: string;
  guests: number;
  nights: number;
  arrivalDate: string | null;
  departureDate: string | null;
  time: string | null;
  amount: number;
  /** Fiche de police signée. */
  registrationDone: boolean;
  paid: boolean;
  notes: string | null;
};

export type ArrivalsReport = {
  success: boolean;
  asOf: string;
  days: Array<{
    day: string;
    arrivals: MovementEntry[];
    departures: MovementEntry[];
    guestsIn: number;
    guestsOut: number;
    pendingRegistration: number;
    unpaid: number;
  }>;
  totals: {
    arrivals: number;
    departures: number;
    pendingRegistration: number;
    unpaid: number;
  };
};

/** Arrivées et départs nominatifs — la liste de la réception. */
export async function fetchArrivalsReport(params?: {
  asOf?: string;
  days?: number;
}): Promise<ArrivalsReport | null> {
  try {
    const search = new URLSearchParams();
    if (params?.asOf) search.set('asOf', params.asOf);
    if (params?.days) search.set('days', String(params.days));
    const qs = search.toString();
    const res = await apiClient.get(
      `${REVENUE_BASE}/reports/arrivals-departures${qs ? `?${qs}` : ''}`,
      { timeout: 30000 },
    );
    return res?.data?.success ? (res.data as ArrivalsReport) : null;
  } catch {
    return null;
  }
}

export type RackStay = {
  id: string;
  guestName: string;
  guests: number;
  nights: number;
  arrivalDate: string | null;
  departureDate: string | null;
  roomId: string | null;
  roomName: string | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  channel: string;
  amount: number;
  registrationDone: boolean;
  paid: boolean;
  checkinStatus: string | null;
  status: string;
};

export type RackBlock = {
  from: string;
  to: string;
  /** `out_of_service` | `house_guest` | `unclassified` */
  category: string;
  /** Le libellé saisi au PMS — « MR ILYASS », « Pas prêt ». */
  reason: string;
};

export type RackRoom = {
  id: string;
  name: string;
  number: number | null;
  roomTypeId: string | null;
  roomTypeName: string | null;
  capacity: number | null;
  /** Une chambre désactivée reste affichée, signalée par un badge. */
  enabled: boolean;
  stays: RackStay[];
  blocks: RackBlock[];
};

export type ReceptionRack = {
  success: boolean;
  listing: {
    id: string;
    name: string;
    /** Le PMS décide : le rack propose au lieu d'écrire. */
    pmsIsMaster: boolean;
    writeEnabled: boolean;
  };
  from: string;
  to: string;
  days: number;
  rooms: RackRoom[];
  unassigned: RackStay[];
  totals: { rooms: number; stays: number; unassigned: number };
};

/** Rack d'affectation — chambres, séjours, créneaux libres. */
export async function fetchReceptionRack(params?: {
  listingId?: string;
  from?: string;
  days?: number;
}): Promise<ReceptionRack | null> {
  try {
    const search = new URLSearchParams();
    if (params?.listingId) search.set('listingId', params.listingId);
    if (params?.from) search.set('from', params.from);
    if (params?.days) search.set('days', String(params.days));
    const qs = search.toString();
    const res = await apiClient.get(`${REVENUE_BASE}/reception/rack${qs ? `?${qs}` : ''}`, {
      timeout: 30000,
    });
    return res?.data?.success ? (res.data as ReceptionRack) : null;
  } catch {
    return null;
  }
}

export type AssignResult =
  | { ok: true; roomId: string | null; roomName: string | null }
  | {
      ok: false;
      error: string;
      message?: string;
      conflicts?: Array<{ guestName: string; from: string | null; to: string | null }>;
      guests?: number;
      capacity?: number;
      forceable?: boolean;
    };

/**
 * Affecte une chambre à un séjour.
 *
 * Les refus métier remontent avec leur détail : l'interface doit pouvoir
 * expliquer *pourquoi* plutôt qu'échouer en silence.
 */
export async function assignRoom(params: {
  reservationId: string;
  roomId: string | null;
  force?: boolean;
}): Promise<AssignResult> {
  try {
    const res = await apiClient.post(
      `${REVENUE_BASE}/reception/assign-room`,
      {
        reservationId: params.reservationId,
        roomId: params.roomId,
        force: params.force === true,
      },
      { timeout: 30000, validateStatus: () => true },
    );
    const d = res?.data;
    if (d?.success) {
      return { ok: true, roomId: d.roomId ?? null, roomName: d.roomName ?? null };
    }
    return {
      ok: false,
      error: String(d?.error || 'unknown'),
      message: d?.message,
      conflicts: d?.conflicts,
      guests: d?.guests,
      capacity: d?.capacity,
      forceable: d?.forceable === true,
    };
  } catch (e) {
    return { ok: false, error: 'network', message: e instanceof Error ? e.message : String(e) };
  }
}
