import type { OtaThreadRow } from './inboxOtaMappers';
import { isOtaDirectChannel, resolveOtaPlatformChannel } from './inboxOtaMappers';
import {
  applyStayQuickFilter,
  countStayQuickFilters,
  isArrivalOn,
  isCreatedToday,
  isDepartureOn,
  type StayQuickFilter,
  type StayQuickFilterCounts,
} from './inboxStayFilters';
import { hasOtaRealExchange } from './otaExchangePresence';

export { hasOtaRealExchange } from './otaExchangePresence';

export type OtaStayQuickFilter = StayQuickFilter;
export type OtaStayQuickFilterCounts = StayQuickFilterCounts;

/**
 * Vues principales inbox OTA — alignées WhatsApp (chips hub).
 * exchanges | unreplied | created_today | stay | arr/dep auj & dem
 */
export type OtaInboxView =
  | 'exchanges'
  | 'unreplied'
  | 'created_today'
  | 'stay'
  | 'arr_today'
  | 'dep_today'
  | 'arr_tomorrow'
  | 'dep_tomorrow';

/** Filtre canal (ligne 2) — mêmes chips WA (Airbnb / Booking) + Direct */
export type OtaChannelFilter = 'all' | 'ota' | 'ab' | 'bk' | 'direct';

/** @deprecated — utiliser OtaChannelFilter + unrepliedOnly */
export type OtaQuickFilter = OtaChannelFilter | 'unreplied';

export type OtaMessageLifecycleStatus = 'created' | 'received' | 'responded' | 'ignored';

export type OtaStayPeriod = 'all' | 'past' | 'future' | 'current';

/** Filtre avancé : statut réservation (Completed / Cancelled). */
export type OtaReservationStatusFilter = 'completed' | 'cancelled' | '';

export interface OtaAdvancedSearch {
  reservationNumber?: string;
  listingName?: string;
  guestName?: string;
  guestPhone?: string;
  messageText?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  stayPeriod?: OtaStayPeriod;
  messageStatus?: OtaMessageLifecycleStatus | '';
  /** Completed / Annulées — recherche serveur dédiée. */
  reservationStatus?: OtaReservationStatusFilter;
}

export interface OtaFilterCounts {
  all: number;
  ota: number;
  ab: number;
  bk: number;
  direct: number;
  unreplied: number;
  /** Aligné WA hub chips */
  exchanges: number;
  arr_today: number;
  arr_tomorrow: number;
  dep_today: number;
  dep_tomorrow: number;
  created_today: number;
  stay: number;
}

/** @deprecated — alias StayQuickFilter */
export type { StayQuickFilter };

const otaStayDates = (row: OtaThreadRow) => ({
  checkInDate: row.checkInDate,
  checkOutDate: row.checkOutDate,
  reservationCreatedAt: row.reservationCreatedAt,
});

const LEGACY_STATUS: Record<string, OtaMessageLifecycleStatus> = {
  pending: 'received',
  replied: 'responded',
};

export function normalizeOtaMessageStatus(raw?: string | null): OtaMessageLifecycleStatus | string {
  if (!raw) return 'created';
  const key = String(raw).toLowerCase().trim();
  if (key in LEGACY_STATUS) return LEGACY_STATUS[key];
  if (key === 'created' || key === 'received' || key === 'responded' || key === 'ignored') {
    return key;
  }
  return key;
}

export function hasActiveOtaAdvancedSearch(advanced: OtaAdvancedSearch): boolean {
  return !!(
    advanced.messageText?.trim() ||
    advanced.arrivalFrom ||
    advanced.arrivalTo ||
    (advanced.stayPeriod && advanced.stayPeriod !== 'all') ||
    advanced.messageStatus ||
    advanced.reservationStatus
  );
}

/** Recherche globale visible (barre 🔍) → GET …/get-thread?q=… */
export function buildOtaGlobalSearchParams(
  q: string,
  opts?: { channelFilter?: OtaChannelFilter; ownerId?: string },
): Record<string, string | boolean | undefined> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return {};
  const channel = opts?.channelFilter ?? 'all';
  return {
    otaSearch: true,
    q: trimmed,
    ...(opts?.ownerId ? { ownerId: opts.ownerId } : {}),
    otaChannel: channel === 'ab' ? 'ab' : channel === 'bk' ? 'bk' : undefined,
  };
}

/** Paramètres API GET /rentals/get-thread (recherche BD complète). */
export function buildOtaAdvancedApiParams(
  advanced: OtaAdvancedSearch,
  opts?: { channelFilter?: OtaChannelFilter; unrepliedOnly?: boolean },
): Record<string, string | boolean | undefined> {
  const channel = opts?.channelFilter ?? 'all';
  const unreplied = opts?.unrepliedOnly ?? false;

  if (!hasActiveOtaAdvancedSearch(advanced) && !unreplied) {
    return {};
  }

  return {
    otaSearch: true,
    reservationNumber: advanced.reservationNumber?.trim() || undefined,
    guestName: advanced.guestName?.trim() || undefined,
    guestPhone: advanced.guestPhone?.trim() || undefined,
    listingName: advanced.listingName?.trim() || undefined,
    messageText: advanced.messageText?.trim() || undefined,
    arrivalFrom: advanced.arrivalFrom || undefined,
    arrivalTo: advanced.arrivalTo || undefined,
    stayPeriod:
      advanced.stayPeriod && advanced.stayPeriod !== 'all' ? advanced.stayPeriod : undefined,
    messageStatus: advanced.messageStatus || undefined,
    reservationStatus: advanced.reservationStatus || undefined,
    unreplied: unreplied || undefined,
    otaChannel: channel === 'ab' ? 'ab' : channel === 'bk' ? 'bk' : undefined,
  };
}

/** Date d'activité du fil : dernier message, sinon MAJ thread, sinon création. */
export function threadActivityTimestamp(row: OtaThreadRow): number {
  const candidates = [row.lastMessageTime, row.threadUpdatedAt, row.threadCreatedAt];
  for (const c of candidates) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

export function sortOtaThreadsByActivity(rows: OtaThreadRow[]): OtaThreadRow[] {
  return [...rows].sort((a, b) => threadActivityTimestamp(b) - threadActivityTimestamp(a));
}

/** Non répondu : messageStatus received (ou legacy pending), ou dernier message entrant. */
export function isOtaUnreplied(row: OtaThreadRow): boolean {
  const status = normalizeOtaMessageStatus(row.messageStatus);
  if (status === 'received') return true;
  if (status === 'responded' || status === 'ignored') return false;
  if (row.lastMessageIsIncoming === true) return true;
  return false;
}

export function applyOtaChannelFilter(
  rows: OtaThreadRow[],
  filter: OtaChannelFilter,
): OtaThreadRow[] {
  if (filter === 'all') return rows;
  if (filter === 'ota') {
    return rows.filter((row) => resolveOtaPlatformChannel(row) != null);
  }
  if (filter === 'direct') {
    return rows.filter(isOtaDirectChannel);
  }
  return rows.filter((row) => {
    const platform = resolveOtaPlatformChannel(row);
    if (filter === 'ab') return platform === 'ab';
    if (filter === 'bk') return platform === 'bk';
    return true;
  });
}

export function applyOtaInboxFilters(
  rows: OtaThreadRow[],
  channelFilter: OtaChannelFilter,
  unrepliedOnly: boolean,
  stayQuickFilter: OtaStayQuickFilter = 'none',
): OtaThreadRow[] {
  let list = applyOtaChannelFilter(rows, channelFilter);
  if (unrepliedOnly) {
    list = list.filter(isOtaUnreplied);
  }
  return applyStayQuickFilter(list, stayQuickFilter, otaStayDates);
}

function hasStayDates(row: OtaThreadRow): boolean {
  return Boolean(row.checkInDate || row.checkOutDate);
}

/** Même logique que applyWaInboxView — vues mutuellement exclusives. */
export function applyOtaInboxView(
  rows: OtaThreadRow[],
  view: OtaInboxView,
  channelFilter: OtaChannelFilter = 'all',
): OtaThreadRow[] {
  let list = applyOtaChannelFilter(rows, channelFilter);
  switch (view) {
    case 'unreplied':
      // Non répondu = vrai message voyageur en attente (pas les coquilles vides)
      list = list.filter((r) => hasOtaRealExchange(r) && isOtaUnreplied(r));
      break;
    case 'created_today':
      list = list.filter((r) => isCreatedToday(otaStayDates(r)));
      break;
    case 'stay':
      list = list.filter(hasStayDates);
      break;
    case 'arr_today':
      list = list.filter((r) => isArrivalOn(otaStayDates(r), 0));
      break;
    case 'dep_today':
      list = list.filter((r) => isDepartureOn(otaStayDates(r), 0));
      break;
    case 'arr_tomorrow':
      list = list.filter((r) => isArrivalOn(otaStayDates(r), 1));
      break;
    case 'dep_tomorrow':
      list = list.filter((r) => isDepartureOn(otaStayDates(r), 1));
      break;
    case 'exchanges':
    default:
      // Échanges = uniquement fils avec au moins un vrai message
      list = list.filter(hasOtaRealExchange);
      break;
  }
  return sortOtaThreadsByActivity(list);
}

export function isOtaArrivalOn(row: OtaThreadRow, offsetDays: 0 | 1): boolean {
  return isArrivalOn(otaStayDates(row), offsetDays);
}

export function isOtaDepartureOn(row: OtaThreadRow, offsetDays: 0 | 1): boolean {
  return isDepartureOn(otaStayDates(row), offsetDays);
}

export function applyOtaStayQuickFilter(
  rows: OtaThreadRow[],
  filter: OtaStayQuickFilter,
): OtaThreadRow[] {
  return applyStayQuickFilter(rows, filter, otaStayDates);
}

export function countOtaStayQuickFilters(rows: OtaThreadRow[]): OtaStayQuickFilterCounts {
  return countStayQuickFilters(rows, otaStayDates);
}

export function countOtaFilters(rows: OtaThreadRow[]): OtaFilterCounts {
  const stay = countStayQuickFilters(rows, otaStayDates);
  return {
    all: rows.length,
    ota: rows.filter((r) => resolveOtaPlatformChannel(r) != null).length,
    ab: rows.filter((r) => resolveOtaPlatformChannel(r) === 'ab').length,
    bk: rows.filter((r) => resolveOtaPlatformChannel(r) === 'bk').length,
    direct: rows.filter(isOtaDirectChannel).length,
    unreplied: rows.filter((r) => hasOtaRealExchange(r) && isOtaUnreplied(r)).length,
    exchanges: rows.filter(hasOtaRealExchange).length,
    arr_today: stay.arr_today,
    arr_tomorrow: stay.arr_tomorrow,
    dep_today: stay.dep_today,
    dep_tomorrow: stay.dep_tomorrow,
    created_today: stay.created_today,
    stay: rows.filter(hasStayDates).length,
  };
}

/** @deprecated */
export function applyOtaQuickFilter(rows: OtaThreadRow[], filter: OtaQuickFilter): OtaThreadRow[] {
  if (filter === 'unreplied') return rows.filter(isOtaUnreplied);
  return applyOtaChannelFilter(rows, filter);
}

/** @deprecated */
export function countOtaQuickFilter(rows: OtaThreadRow[]): Record<OtaQuickFilter, number> {
  const c = countOtaFilters(rows);
  return { all: c.all, ota: c.ota, ab: c.ab, bk: c.bk, direct: c.direct, unreplied: c.unreplied };
}
