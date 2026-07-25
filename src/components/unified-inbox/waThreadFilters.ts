import type { Conversation } from '../../types/messages.types';
import {
  applyStayQuickFilter,
  countStayQuickFilters,
  isArrivalOn,
  isCreatedToday,
  isDepartureOn,
  type StayQuickFilter,
  type StayQuickFilterCounts,
} from './inboxStayFilters';
import { resolveWaBookingPlatform } from './inboxReservationSource';

export type { StayQuickFilter as WaStayQuickFilter, StayQuickFilterCounts as WaStayQuickFilterCounts };

/** Canal résa (WhatsApp guest — pas de fil OTA messaging). */
export type WaChannelFilter = 'all' | 'ab' | 'bk' | 'no_resa';

/**
 * Vues principales inbox WA (mutuellement exclusives).
 * Ligne 1 — activité : exchanges | unreplied | created_today | stay
 * Ligne 2 — calendrier : arr/dep auj & demain
 *
 * `stay` = regroupement par phase de séjour (En cours → À venir → Terminées récemment).
 */
export type WaInboxView =
  | 'exchanges'
  | 'unreplied'
  | 'created_today'
  | 'stay'
  | 'arr_today'
  | 'dep_today'
  | 'arr_tomorrow'
  | 'dep_tomorrow';

export interface WaFilterCounts {
  all: number;
  ab: number;
  bk: number;
  no_resa: number;
  unreplied: number;
  /** Fils avec au moins un message / activité. */
  exchanges: number;
  arr_today: number;
  arr_tomorrow: number;
  dep_today: number;
  dep_tomorrow: number;
  created_today: number;
  /** Fils rattaches a une phase de sejour (check-in/out connus). */
  stay: number;
}

function stayDates(conv: Conversation) {
  return {
    checkInDate: conv.checkin_date,
    checkOutDate: conv.checkout_date,
    reservationCreatedAt: conv.reservation_created_at,
  };
}

export function isWaWithoutReservation(conv: Conversation): boolean {
  const num = conv.reservation_number || conv.reservation_id;
  if (!num || String(num).trim() === '' || String(num).trim() === 'N/A') return true;
  return false;
}

export { resolveWaBookingPlatform };

/** Non répondu : unread OU dernier échange guest sans réponse. */
export function isWaUnreplied(conv: Conversation): boolean {
  if ((conv.unread_count || 0) > 0) return true;
  const ex = conv.recent_exchanges?.[0];
  if (!ex) return false;
  const hasGuest = Boolean(String(ex.user_message || '').trim());
  const hasReply = Boolean(String(ex.ai_response || '').trim());
  return hasGuest && !hasReply;
}

export function hasWaExchange(conv: Conversation): boolean {
  return (conv.messages_count || 0) > 0 || Boolean(conv.last_message_time);
}

function hasStayDates(conv: Conversation): boolean {
  return Boolean(conv.checkin_date || conv.checkout_date);
}

function activityTs(conv: Conversation): number {
  if (!conv.last_message_time) return 0;
  const t = new Date(conv.last_message_time).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function sortWaByRecentExchanges(rows: Conversation[]): Conversation[] {
  return [...rows].sort((a, b) => {
    const ta = activityTs(a);
    const tb = activityTs(b);
    if (tb !== ta) return tb - ta;
    return (b.messages_count || 0) - (a.messages_count || 0);
  });
}

export function applyWaChannelFilter(rows: Conversation[], filter: WaChannelFilter): Conversation[] {
  if (filter === 'all') return rows;
  if (filter === 'no_resa') return rows.filter(isWaWithoutReservation);
  return rows.filter((row) => {
    const platform = resolveWaBookingPlatform(row);
    if (filter === 'ab') return platform === 'ab';
    if (filter === 'bk') return platform === 'bk';
    return true;
  });
}

export function applyWaInboxView(
  rows: Conversation[],
  view: WaInboxView,
  channelFilter: WaChannelFilter = 'all',
): Conversation[] {
  let list = applyWaChannelFilter(rows, channelFilter);
  switch (view) {
    case 'unreplied':
      list = list.filter(isWaUnreplied);
      break;
    case 'created_today':
      list = list.filter((c) => isCreatedToday(stayDates(c)));
      break;
    case 'stay':
      list = list.filter(hasStayDates);
      break;
    case 'arr_today':
      list = list.filter((c) => isArrivalOn(stayDates(c), 0));
      break;
    case 'dep_today':
      list = list.filter((c) => isDepartureOn(stayDates(c), 0));
      break;
    case 'arr_tomorrow':
      list = list.filter((c) => isArrivalOn(stayDates(c), 1));
      break;
    case 'dep_tomorrow':
      list = list.filter((c) => isDepartureOn(stayDates(c), 1));
      break;
    case 'exchanges':
    default:
      // Échanges = activité réelle (pas coquille vide)
      list = list.filter(hasWaExchange);
      list = sortWaByRecentExchanges(list);
      return list;
  }
  return sortWaByRecentExchanges(list);
}

/** @deprecated — préférer applyWaInboxView */
export function applyWaInboxFilters(
  rows: Conversation[],
  channelFilter: WaChannelFilter,
  unreadOnly: boolean,
  stayQuickFilter: StayQuickFilter = 'none',
): Conversation[] {
  let list = applyWaChannelFilter(rows, channelFilter);
  if (unreadOnly) {
    list = list.filter(isWaUnreplied);
  }
  return applyStayQuickFilter(list, stayQuickFilter, stayDates);
}

export function countWaFilters(rows: Conversation[]): WaFilterCounts {
  const stay = countStayQuickFilters(rows, stayDates);
  return {
    all: rows.length,
    ab: rows.filter((r) => resolveWaBookingPlatform(r) === 'ab').length,
    bk: rows.filter((r) => resolveWaBookingPlatform(r) === 'bk').length,
    no_resa: rows.filter(isWaWithoutReservation).length,
    unreplied: rows.filter(isWaUnreplied).length,
    exchanges: rows.filter(hasWaExchange).length,
    arr_today: stay.arr_today,
    arr_tomorrow: stay.arr_tomorrow,
    dep_today: stay.dep_today,
    dep_tomorrow: stay.dep_tomorrow,
    created_today: stay.created_today,
    stay: rows.filter(hasStayDates).length,
  };
}

export function countWaStayQuickFilters(rows: Conversation[]): StayQuickFilterCounts {
  return countStayQuickFilters(rows, stayDates);
}

export function countWaActiveFilters(
  channelFilter: WaChannelFilter,
  stayQuickFilter: StayQuickFilter,
  unreadOnly: boolean,
  view?: WaInboxView,
): number {
  let n = 0;
  if (channelFilter !== 'all') n += 1;
  if (view && view !== 'exchanges') n += 1;
  else {
    if (stayQuickFilter !== 'none') n += 1;
    if (unreadOnly) n += 1;
  }
  return n;
}

/** Recherche avancée (panneau hub WA). */
export type WaStayPeriod = 'all' | 'future' | 'current' | 'past';
export type WaReplyStatus = '' | 'unreplied' | 'replied';

export interface WaAdvancedSearch {
  reservationNumber?: string;
  listingName?: string;
  guestName?: string;
  guestPhone?: string;
  /** Mot-clé → recherche serveur (corps messages). */
  messageText?: string;
  arrivalFrom?: string;
  arrivalTo?: string;
  stayPeriod?: WaStayPeriod;
  replyStatus?: WaReplyStatus;
}

export const EMPTY_WA_ADVANCED: WaAdvancedSearch = {};

export function hasActiveWaAdvancedSearch(advanced: WaAdvancedSearch): boolean {
  return !!(
    advanced.reservationNumber?.trim() ||
    advanced.listingName?.trim() ||
    advanced.guestName?.trim() ||
    advanced.guestPhone?.trim() ||
    advanced.messageText?.trim() ||
    advanced.arrivalFrom ||
    advanced.arrivalTo ||
    (advanced.stayPeriod && advanced.stayPeriod !== 'all') ||
    advanced.replyStatus
  );
}

function dayKey(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    const m = String(iso).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : null;
  }
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}

function matchesStayPeriod(conv: Conversation, period: WaStayPeriod): boolean {
  if (period === 'all') return true;
  const cin = dayKey(conv.checkin_date);
  const cout = dayKey(conv.checkout_date);
  const today = todayKey();
  if (period === 'future') return Boolean(cin && cin > today);
  if (period === 'past') return Boolean(cout && cout < today);
  if (period === 'current') {
    if (cin && cout) return cin <= today && today <= cout;
    if (cin && !cout) return cin <= today;
    return false;
  }
  return true;
}

function includesLoose(hay?: string | null, needle?: string): boolean {
  const n = needle?.trim().toLowerCase();
  if (!n) return true;
  return String(hay || '')
    .toLowerCase()
    .includes(n);
}

/** Filtre client sur les champs structurés (hors messageText déjà chargé côté serveur). */
export function applyWaAdvancedSearch(
  rows: Conversation[],
  advanced: WaAdvancedSearch,
): Conversation[] {
  if (!hasActiveWaAdvancedSearch(advanced)) return rows;
  return rows.filter((c) => {
    if (!includesLoose(c.reservation_number || c.reservation_id, advanced.reservationNumber)) {
      return false;
    }
    if (!includesLoose(c.listing_name, advanced.listingName)) return false;
    if (!includesLoose(c.name, advanced.guestName)) return false;
    if (!includesLoose(c.phone, advanced.guestPhone)) return false;

    const cin = dayKey(c.checkin_date);
    if (advanced.arrivalFrom && (!cin || cin < advanced.arrivalFrom)) return false;
    if (advanced.arrivalTo && (!cin || cin > advanced.arrivalTo)) return false;

    if (advanced.stayPeriod && advanced.stayPeriod !== 'all') {
      if (!matchesStayPeriod(c, advanced.stayPeriod)) return false;
    }

    if (advanced.replyStatus === 'unreplied' && !isWaUnreplied(c)) return false;
    if (advanced.replyStatus === 'replied' && isWaUnreplied(c)) return false;

    return true;
  });
}
