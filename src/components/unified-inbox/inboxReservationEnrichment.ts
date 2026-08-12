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
import { resolveChannelStayFinance } from '../../utils/reservationChannelFinance';
import { getCachedEurMadAdminRate, loadEurMadAdminRate } from '../../utils/eurMadAdminRate';

// Warm taux admin dès le chargement du module inbox
void loadEurMadAdminRate();

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

/** Compact comme colonne Voyageurs planning : 2A · 1E · 1B */
function formatGuestsCompact(r: Reservation): string | undefined {
  const adults = Number(r.adults ?? r.numberOfGuests ?? 0) || 0;
  const children = Number(r.children ?? 0) || 0;
  const infants = Number(r.infants ?? 0) || 0;
  if (!adults && !children && !infants) return undefined;
  const parts: string[] = [];
  if (adults) parts.push(`${adults}A`);
  if (children) parts.push(`${children}E`);
  if (infants) parts.push(`${infants}B`);
  return parts.join(' · ');
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Badge séjour inbox — aligné liste /reservations : Started → Séjour (pas d’heuristique présence). */
function presenceLabelFromReservation(r: Reservation): string {
  const status = String(r.status || '').toLowerCase();
  if (status.includes('cancel')) return 'Annulé';
  if (status === 'completed') return 'Complété';
  if (status === 'started') return 'Séjour';
  if (status === 'pending') return 'En attente';
  if (status === 'confirmed') return 'Confirmé';
  return status ? String(r.status) : '—';
}

function formatHourLabel(time?: string | boolean | null): string | undefined {
  if (time == null || time === false || time === true) return undefined;
  const t = String(time).trim();
  if (!t || t === 'null') return undefined;
  return t.replace(':00', 'h').replace(':', 'h');
}

function stayOpsFromReservation(r: Reservation): Pick<
  InboxReservationData,
  | 'guestsCompact'
  | 'presenceLabel'
  | 'registrationRegistered'
  | 'registrationTotal'
  | 'arrivalTimeChosen'
  | 'arrivalTimeLabel'
  | 'departureTimeChosen'
  | 'departureTimeLabel'
  | 'arrivalDeclared'
  | 'departureDeclared'
> {
  const reg = r.guestRegistration || r.police_registration;
  const toRegisterFromReg = Number(reg?.nbre_guest_to_register || 0);
  const toRegister =
    toRegisterFromReg > 0
      ? toRegisterFromReg
      : reg
        ? 0
        : Number(r.adults || r.numberOfGuests || 0) || 0;
  const registered = Number(reg?.nbre_guest_complete ?? reg?.nbre_guest_registered ?? 0);
  const arrivalChosen = Boolean(r.arrival_time_chosen || r.confirmedCheckInTime);
  const departureChosen = Boolean(r.departure_time_chosen || r.confirmedCheckOutTime);
  const arrivalTimeLabel =
    formatHourLabel(r.arrival_time) ||
    formatHourLabel(r.checkInTime) ||
    (arrivalChosen ? '15h' : undefined);
  const departureTimeLabel =
    formatHourLabel((r as { departure_time?: string | null }).departure_time) ||
    formatHourLabel(r.checkOutTime) ||
    (departureChosen ? '11h' : undefined);

  return {
    guestsCompact: formatGuestsCompact(r),
    presenceLabel: presenceLabelFromReservation(r),
    registrationRegistered: toRegister > 0 || registered > 0 ? registered : undefined,
    registrationTotal: toRegister > 0 ? toRegister : undefined,
    arrivalTimeChosen: arrivalChosen,
    arrivalTimeLabel,
    departureTimeChosen: departureChosen,
    departureTimeLabel,
    arrivalDeclared: Boolean(r.actualArrivalTime),
    departureDeclared: Boolean(r.actualDepartureTime),
  };
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
  if (s.includes('cancel') || s.includes('annul')) return 'Annulée';
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
  // Aligné Airbnb/Booking — MAD via taux admin pour Booking EUR.
  const finance = resolveChannelStayFinance(r as unknown as Record<string, unknown>, {
    eurMadRate: getCachedEurMadAdminRate(),
  });
  const total = finance.guestPaidMad > 0 ? finance.guestPaidMad : undefined;
  const commission = finance.commissionMad > 0 ? finance.commissionMad : undefined;
  const netHost = finance.netHostMad > 0 ? finance.netHostMad : undefined;
  const source = normalizeBookingSource(r.channelName || conv?.channel_name);
  const isAirbnb = /airbnb/i.test(String(r.channelName || source || ''));
  const createdRaw = r.createdAt ?? r.reservationDate;
  const stayOps = stayOpsFromReservation(r);

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
    guestPhone: String(r.phone || '').trim() || undefined,
    totalPrice: total,
    currency: 'MAD',
    paymentStatus: mapPaymentStatus(r.paymentStatus, r.alreadyPaid, total),
    stayAmount: finance.stayMad > 0 ? finance.stayMad : undefined,
    // Afficher ménage seulement si > 0 (0 fees Comments ≠ inventer une taxe)
    cleaningAmount: finance.feesMad > 0 ? finance.feesMad : undefined,
    touristTaxAmount: finance.touristTaxMad > 0 ? finance.touristTaxMad : undefined,
    netHost,
    commission,
    commissionLabel: isAirbnb
      ? 'Host service fee'
      : /booking/i.test(String(r.channelName || source || ''))
        ? 'Commission Booking (15 %)'
        : 'Commission OTA',
    hostFeeAmount: finance.hostFeeMad != null && finance.hostFeeMad > 0 ? finance.hostFeeMad : undefined,
    hostFeeVatAmount:
      finance.hostFeeVatMad != null && finance.hostFeeVatMad > 0 ? finance.hostFeeVatMad : undefined,
    hostFeeLabel: finance.hostFeeLabel,
    hostFeeVatLabel: finance.hostFeeVatLabel,
    guestServiceFeeAmount:
      finance.guestServiceFeeMad != null && finance.guestServiceFeeMad > 0
        ? finance.guestServiceFeeMad
        : undefined,
    guestVatAmount:
      finance.guestVatMad != null && finance.guestVatMad > 0 ? finance.guestVatMad : undefined,
    airbnbFeeModel: finance.feeModel,
    otaPlatform: source,
    otaCode: String(r.otaCode || '').trim() || undefined,
    ...stayOps,
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
  const ops = r ? stayOpsFromReservation(r) : null;

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
    guestsCompact: ops?.guestsCompact || reservation?.guestsCompact || thread.guestsCompact,
    phone: reservation?.guestPhone || thread.phone || conv.phone,
    guestFlag: flag || thread.guestFlag,
    isVip: (r?.totalPrice ?? 0) >= 1500 || (r?.nights ?? 0) >= 7,
    nightsCount: reservation?.nightsCount ?? nightsBetween(checkIn, checkOut),
    presenceLabel: ops?.presenceLabel || reservation?.presenceLabel || thread.presenceLabel,
    registrationRegistered:
      ops?.registrationRegistered ?? reservation?.registrationRegistered ?? thread.registrationRegistered,
    registrationTotal: ops?.registrationTotal ?? reservation?.registrationTotal ?? thread.registrationTotal,
    arrivalTimeChosen: ops?.arrivalTimeChosen ?? reservation?.arrivalTimeChosen ?? thread.arrivalTimeChosen,
    arrivalTimeLabel: ops?.arrivalTimeLabel || reservation?.arrivalTimeLabel || thread.arrivalTimeLabel,
    departureTimeChosen:
      ops?.departureTimeChosen ?? reservation?.departureTimeChosen ?? thread.departureTimeChosen,
    departureTimeLabel:
      ops?.departureTimeLabel || reservation?.departureTimeLabel || thread.departureTimeLabel,
    arrivalDeclared: ops?.arrivalDeclared ?? reservation?.arrivalDeclared ?? thread.arrivalDeclared,
    departureDeclared: ops?.departureDeclared ?? reservation?.departureDeclared ?? thread.departureDeclared,
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
