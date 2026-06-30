import type { Conversation } from '../../types/messages.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import type { Thread } from '../../types/unifiedInbox.types';
import { getConversationReservationNumber } from './inboxReservationEnrichment';
import {
  conversationReservationSourceInput,
  resolveWaBookingPlatform,
  resolveWaBookingSourceKind,
} from './inboxReservationSource';
import {
  checkInDaysLabel,
  flagFromPhone,
  formatStayDateShort,
  nightsBetween,
  stayStatusLabel,
} from './inboxFormat';
import { resolveReservationSourceKind } from '../reservations/ReservationSourceIcon';

function bookingSourceLabel(conv: Conversation): string {
  const kind = resolveReservationSourceKind(conversationReservationSourceInput(conv));
  switch (kind) {
    case 'airbnb':
      return 'Airbnb';
    case 'booking':
      return 'Booking.com';
    case 'rentals':
      return 'Rentals United';
    case 'whatsapp':
      return 'WhatsApp Booking';
    case 'admin':
      return 'Admin';
    default:
      return 'Direct';
  }
}

export function mapConversationToReservation(conv: Conversation): InboxReservationData {
  const nights = nightsBetween(conv.checkin_date, conv.checkout_date);
  const source = bookingSourceLabel(conv);
  return {
    reservationNumber: getConversationReservationNumber(conv),
    listingName: conv.listing_name,
    bookingSource: source,
    messagingChannel: 'WhatsApp',
    reservationStatus: conv.status || 'Confirmée',
    otaPlatform: source,
    checkInDate: conv.checkin_date,
    checkOutDate: conv.checkout_date,
    checkInDisplay: formatStayDateShort(conv.checkin_date, '16h'),
    checkOutDisplay: formatStayDateShort(conv.checkout_date, '11h'),
    nightsCount: nights,
    guestsLabel: undefined,
  };
}

export function mapConversationToThread(
  conv: Conversation,
  opts: { channel: 'wa' | 'ab' | 'bk'; channelColor: string; isOta?: boolean; isStaff?: boolean },
): Thread {
  const checkInBadge = checkInDaysLabel(conv.checkin_date);
  const mode = opts.isOta ? 'ota' : 'whatsapp';
  const bookingPlatform = opts.isOta ? null : resolveWaBookingPlatform(conv);
  const bookingSourceKind = opts.isOta ? undefined : resolveWaBookingSourceKind(conv) ?? undefined;
  const displayChannel =
    opts.isOta
      ? opts.channel
      : bookingPlatform === 'ab'
        ? 'ab'
        : bookingPlatform === 'bk'
          ? 'bk'
          : 'wa';
  const displayColor =
    bookingPlatform === 'ab'
      ? '#FF5A5F'
      : bookingPlatform === 'bk'
        ? '#003580'
        : opts.channelColor;
  const preview =
    conv.recent_exchanges[conv.recent_exchanges.length - 1]?.user_message ||
    conv.recent_exchanges[conv.recent_exchanges.length - 1]?.ai_response ||
    conv.recent_exchanges[0]?.user_message ||
    conv.recent_exchanges[0]?.ai_response ||
    'Aucun message';
  const isAuto = preview.startsWith('[Auto]');
  return {
    id: conv.phone,
    name: conv.name || conv.phone,
    phone: conv.phone,
    channel: displayChannel,
    channelColor: displayColor,
    preview: isAuto ? preview : preview,
    time: '',
    unread: conv.unread_count,
    avatarColor: '',
    listingName: conv.listing_name,
    reservationNumber: getConversationReservationNumber(conv),
    checkInDate: conv.checkin_date,
    checkOutDate: conv.checkout_date,
    guestFlag: flagFromPhone(conv.phone),
    guestPresence: opts.isOta ? undefined : 'En ligne',
    isVip: false,
    isStaff: opts.isStaff ?? false,
    isAuto,
    nightsCount: nightsBetween(conv.checkin_date, conv.checkout_date),
    checkInBadge,
    stayBadge: stayStatusLabel(conv.checkin_date, conv.checkout_date, mode),
    taskCount: undefined,
    bookingSourceKind,
    bookingPlatform,
  };
}

export function otaChannelFromName(channelName?: string): 'ab' | 'bk' | 'vrbo' {
  const ch = (channelName || '').toLowerCase().trim();
  if (ch.includes('booking') || ch === 'bk' || ch.includes('book.com')) return 'bk';
  if (ch.includes('vrbo') || ch === 'ha') return 'vrbo';
  if (ch.includes('airbnb') || ch === 'ab') return 'ab';
  // Email / WhatsApp / Sojori direct — ne pas afficher comme Airbnb (filtrés côté OTA inbox)
  return 'ab';
}

export function otaChannelColor(channel: 'ab' | 'bk' | 'vrbo'): string {
  if (channel === 'bk') return '#003580';
  if (channel === 'vrbo') return '#1f4b99';
  return '#FF5A5F';
}
