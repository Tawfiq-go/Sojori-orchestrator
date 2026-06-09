import type { Conversation } from '../../types/messages.types';
import type { Reservation } from '../../types/reservations.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import {
  checkInDaysLabel,
  flagFromPhone,
  formatReservationCreatedDisplay,
  formatStayDateShort,
  nightsBetween,
  normalizeBookingSource,
  stayStatusLabel,
} from './inboxFormat';
import { resolveListingName } from './inboxListingName';

export function getConversationReservationNumber(conv: Conversation): string | undefined {
  const raw = conv.reservation_number || conv.reservation_id;
  if (!raw || raw === 'N/A') return undefined;
  return String(raw).trim();
}

function listingNameFromReservation(r: Reservation): string | undefined {
  return resolveListingName(r as unknown as Record<string, unknown>);
}

function formatGuestsLabel(r: Reservation): string | undefined {
  const parts: string[] = [];
  const adults = r.adults ?? r.numberOfGuests;
  if (adults) parts.push(`${adults} ad.`);
  if (r.children) parts.push(`${r.children} enf.`);
  if (r.infants) parts.push(`${r.infants} bébé`);
  return parts.length ? parts.join(' · ') : r.numberOfGuests ? `${r.numberOfGuests} voyageurs` : undefined;
}

function mapPaymentStatus(status?: string, alreadyPaid?: number, total?: number): string | undefined {
  const s = (status || '').toLowerCase();
  if (s.includes('paid') || s.includes('payé')) return '✅ Payé';
  if (alreadyPaid != null && total != null && alreadyPaid >= total) return '✅ Payé';
  if (s.includes('partial')) return 'Partiel';
  if (s.includes('unpaid') || s === 'unpaid') return 'En attente';
  return status ? status : undefined;
}

function mapReservationStatus(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('confirm')) return 'Confirmée';
  if (s.includes('cancel')) return 'Annulée';
  if (s.includes('pending')) return 'En attente';
  return status || 'Confirmée';
}

function formatCheckWithTime(date?: string | Date, time?: string | null): string | undefined {
  if (!date) return undefined;
  const base = formatStayDateShort(String(date));
  const t = time && time !== 'null' ? time.replace(':00', 'h').replace(':', 'h') : undefined;
  return t ? `${base} · ${t}` : base;
}

export function mapReservationToInboxData(
  r: Reservation,
  conv?: Conversation,
): InboxReservationData {
  const checkIn = r.arrivalDate ? String(r.arrivalDate) : conv?.checkin_date;
  const checkOut = r.departureDate ? String(r.departureDate) : conv?.checkout_date;
  const nights = r.nights ?? nightsBetween(checkIn, checkOut);
  const total = r.totalPrice ?? undefined;
  const commission =
    total != null ? Math.round(total * 0.1) : undefined;
  const netHost = total != null && commission != null ? total - commission : undefined;
  const source = normalizeBookingSource(r.channelName || conv?.channel_name);
  const createdRaw = r.createdAt ?? r.reservationDate;

  return {
    reservationNumber: r.reservationNumber || getConversationReservationNumber(conv!),
    listingName: listingNameFromReservation(r) || conv?.listing_name,
    bookingSource: source,
    messagingChannel: 'WhatsApp',
    reservationStatus: mapReservationStatus(r.status),
    guestRating: undefined,
    reservationCreatedAt: createdRaw ? String(createdRaw) : undefined,
    reservationCreatedDisplay: formatReservationCreatedDisplay(createdRaw),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    checkInDisplay: formatCheckWithTime(checkIn, r.checkInTime),
    checkOutDisplay: formatCheckWithTime(checkOut, r.checkOutTime),
    nightsCount: nights,
    guestsLabel: formatGuestsLabel(r),
    totalPrice: total,
    currency: r.currency || 'EUR',
    paymentStatus: mapPaymentStatus(r.paymentStatus, r.alreadyPaid, total),
    netHost,
    commission,
    otaPlatform: source,
  };
}

export function mapConversationOnlyToInboxData(conv: Conversation): InboxReservationData {
  const checkIn = conv.checkin_date;
  const checkOut = conv.checkout_date;
  const source = normalizeBookingSource(conv.channel_name);
  return {
    reservationNumber: getConversationReservationNumber(conv),
    listingName: conv.listing_name,
    bookingSource: source,
    messagingChannel: 'WhatsApp',
    reservationStatus: mapReservationStatus(conv.status),
    checkInDate: checkIn,
    checkOutDate: checkOut,
    checkInDisplay: formatStayDateShort(checkIn, '16h'),
    checkOutDisplay: formatStayDateShort(checkOut, '11h'),
    nightsCount: nightsBetween(checkIn, checkOut),
    otaPlatform: source,
  };
}

export function enrichThreadFromReservation(
  thread: import('../../types/unifiedInbox.types').Thread,
  conv: Conversation,
  reservation?: InboxReservationData | null,
  r?: Reservation | null,
): import('../../types/unifiedInbox.types').Thread {
  const checkIn = reservation?.checkInDate || conv.checkin_date;
  const checkOut = reservation?.checkOutDate || conv.checkout_date;
  const stay = stayStatusLabel(checkIn, checkOut, thread.channel === 'wa' ? 'whatsapp' : 'ota');
  const country = r?.guestCountry || r?.nationality;
  const flag = country ? countryFlag(country) : flagFromPhone(conv.phone);

  return {
    ...thread,
    reservationNumber:
      reservation?.reservationNumber || getConversationReservationNumber(conv) || thread.reservationNumber,
    listingName: reservation?.listingName || conv.listing_name || thread.listingName,
    checkInDate: checkIn,
    checkOutDate: checkOut,
    checkInBadge: checkInDaysLabel(checkIn),
    stayBadge: stay,
    guestsLabel: reservation?.guestsLabel || thread.guestsLabel,
    guestFlag: flag || thread.guestFlag,
    isVip: (r?.totalPrice ?? 0) >= 1500 || (r?.nights ?? 0) >= 7,
    nightsCount: reservation?.nightsCount ?? nightsBetween(checkIn, checkOut),
  };
}

function countryFlag(country?: string): string {
  if (!country) return '';
  const c = country.toLowerCase();
  if (c.includes('france') || c === 'fr') return '🇫🇷';
  if (c.includes('morocco') || c.includes('maroc') || c === 'ma') return '🇲🇦';
  if (c.includes('united states') || c === 'us' || c === 'usa') return '🇺🇸';
  if (c.includes('united kingdom') || c === 'uk' || c === 'gb') return '🇬🇧';
  if (c.includes('italy') || c === 'it') return '🇮🇹';
  if (c.includes('spain') || c === 'es') return '🇪🇸';
  return '';
}
