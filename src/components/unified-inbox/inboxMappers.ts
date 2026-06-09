import type { Conversation } from '../../types/messages.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import type { Thread } from '../../types/unifiedInbox.types';
import { getConversationReservationNumber } from './inboxReservationEnrichment';
import {
  checkInDaysLabel,
  flagFromPhone,
  formatStayDateShort,
  nightsBetween,
  normalizeBookingSource,
  stayStatusLabel,
} from './inboxFormat';

export function mapConversationToReservation(conv: Conversation): InboxReservationData {
  const nights = nightsBetween(conv.checkin_date, conv.checkout_date);
  const source = normalizeBookingSource(conv.channel_name);
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
  const preview =
    conv.recent_exchanges[0]?.user_message ||
    conv.recent_exchanges[0]?.ai_response ||
    'Aucun message';
  const isAuto = preview.startsWith('[Auto]');
  return {
    id: conv.phone,
    name: conv.name || conv.phone,
    phone: conv.phone,
    channel: opts.channel,
    channelColor: opts.channelColor,
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
