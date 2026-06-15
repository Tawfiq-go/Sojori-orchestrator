/**
 * Interprétation métier des lignes ingress / overview (webhooks RU).
 */
import { prettyRuEventKey } from './channelsSharedUtils';

export type IngressOverviewRow = Record<string, unknown> & {
  id?: string;
  createdAt?: string;
  ruEventKey?: string;
  correlationId?: string;
  publishOk?: boolean | null;
  ruMessaging?: { eventType?: string; data?: Record<string, unknown> };
  canonicalRuBookingV2?: Record<string, unknown>;
  enrichment?: Record<string, unknown>;
  parsedData?: Record<string, unknown>;
};

export function ingressEventCategory(ruEventKey: string | undefined): string {
  const k = String(ruEventKey || '').trim();
  if (!k) return '—';
  if (k === 'LNM_PutLeadReservation_RQ' || k === 'NewLead') return 'Lead';
  if (/Message|Thread/i.test(k)) return 'Message';
  if (/Cancel/i.test(k)) return 'Annulation';
  if (/Modified/i.test(k)) return 'Modification';
  if (/NewReservation/i.test(k)) return 'Création';
  if (/Reservation/i.test(k)) return 'Réservation';
  return prettyRuEventKey(k);
}

export function extractSojoriReservationNumber(row: IngressOverviewRow): string {
  const enr = row.enrichment || {};
  const ack = (enr.ack || {}) as Record<string, unknown>;
  const canon = (row.canonicalRuBookingV2 || {}) as Record<string, Record<string, unknown>>;
  const sojori = (canon.sojori || {}) as Record<string, unknown>;
  const n =
    ack.sojoriReservationNumber ||
    sojori.sojoriReservationNumber ||
    ack.sojoriReservationId ||
    sojori.sojoriReservationId;
  return n != null && String(n).trim() !== '' ? String(n) : '—';
}

export function extractListingOwner(row: IngressOverviewRow): {
  listingName: string;
  listingId: string;
  ownerName: string;
  ownerId: string;
  mapped: boolean;
} {
  const enr = row.enrichment || {};
  const ack = (enr.ack || {}) as Record<string, unknown>;
  const canon = (row.canonicalRuBookingV2 || {}) as Record<string, Record<string, unknown>>;
  const sojori = (canon.sojori || enr) as Record<string, unknown>;
  const listingId = String(
    sojori.listingId || enr.listingId || ack.listingId || '',
  ).trim();
  const ownerId = String(sojori.ownerId || enr.ownerId || ack.ownerId || '').trim();
  const listingName = String(
    enr.listingName || ack.listingName || sojori.listingName || listingId || '',
  ).trim();
  const ownerName = String(
    enr.ownerDisplayName || ack.ownerDisplayName || sojori.ownerDisplayName || '',
  ).trim();
  const mapped = sojori.found === true || enr.found === true || !!ack.sojoriReservationId;
  return {
    listingName: listingName || '—',
    listingId: listingId ? listingId.slice(-8) : '—',
    ownerName: ownerName || (ownerId ? ownerId.slice(-8) : '—'),
    ownerId: ownerId ? ownerId.slice(-8) : '—',
    mapped,
  };
}

export function extractRuReservationId(row: IngressOverviewRow): string {
  const canon = (row.canonicalRuBookingV2 || {}) as Record<string, unknown>;
  const id = canon.ruReservationId ?? (row.parsedData as Record<string, unknown>)?.ruReservationId;
  return id != null && String(id).trim() !== '' ? String(id) : '—';
}

export function extractStayDates(row: IngressOverviewRow): { checkIn: string; checkOut: string } {
  const canon = (row.canonicalRuBookingV2 || row.parsedData || {}) as Record<string, Record<string, unknown>>;
  const stay = canon.stay || {};
  return {
    checkIn: stay.checkIn ? String(stay.checkIn).slice(0, 10) : '—',
    checkOut: stay.checkOut ? String(stay.checkOut).slice(0, 10) : '—',
  };
}

export function extractGuestLabel(row: IngressOverviewRow): string {
  const canon = (row.canonicalRuBookingV2 || row.parsedData || {}) as Record<string, Record<string, unknown>>;
  const guest = canon.guest || {};
  const name = [guest.firstName, guest.lastName].filter(Boolean).join(' ').trim();
  return name || '—';
}

export function publishOkLabel(publishOk: boolean | null | undefined): 'OK' | 'Fail' | '—' {
  if (publishOk === true) return 'OK';
  if (publishOk === false) return 'Fail';
  return '—';
}
