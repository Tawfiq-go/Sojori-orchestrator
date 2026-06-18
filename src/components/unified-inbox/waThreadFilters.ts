import type { Conversation } from '../../types/messages.types';
import {
  applyStayQuickFilter,
  countStayQuickFilters,
  type StayQuickFilter,
  type StayQuickFilterCounts,
} from './inboxStayFilters';
import { resolveWaBookingPlatform } from './inboxReservationSource';

export type { StayQuickFilter as WaStayQuickFilter, StayQuickFilterCounts as WaStayQuickFilterCounts };

/** Canal résa (WhatsApp guest — pas de fil OTA messaging). */
export type WaChannelFilter = 'all' | 'ab' | 'bk' | 'no_resa';

export interface WaFilterCounts {
  all: number;
  ab: number;
  bk: number;
  no_resa: number;
  unreplied: number;
}

function stayDates(conv: Conversation) {
  return { checkInDate: conv.checkin_date, checkOutDate: conv.checkout_date };
}

export function isWaWithoutReservation(conv: Conversation): boolean {
  const num = conv.reservation_number || conv.reservation_id;
  if (!num || String(num).trim() === '' || String(num).trim() === 'N/A') return true;
  return false;
}

export { resolveWaBookingPlatform };

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

export function applyWaInboxFilters(
  rows: Conversation[],
  channelFilter: WaChannelFilter,
  unreadOnly: boolean,
  stayQuickFilter: StayQuickFilter = 'none',
): Conversation[] {
  let list = applyWaChannelFilter(rows, channelFilter);
  if (unreadOnly) {
    list = list.filter((c) => (c.unread_count || 0) > 0);
  }
  return applyStayQuickFilter(list, stayQuickFilter, stayDates);
}

export function countWaFilters(rows: Conversation[]): WaFilterCounts {
  return {
    all: rows.length,
    ab: rows.filter((r) => resolveWaBookingPlatform(r) === 'ab').length,
    bk: rows.filter((r) => resolveWaBookingPlatform(r) === 'bk').length,
    no_resa: rows.filter(isWaWithoutReservation).length,
    unreplied: rows.filter((c) => (c.unread_count || 0) > 0).length,
  };
}

export function countWaStayQuickFilters(rows: Conversation[]): StayQuickFilterCounts {
  return countStayQuickFilters(rows, stayDates);
}
