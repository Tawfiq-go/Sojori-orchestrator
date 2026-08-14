/** Statuts actifs affichés sur le calendrier (pas les listes /resa). */
const CALENDAR_VISIBLE_STATUSES = new Set([
  'confirmed',
  'started',
  'pending',
  'inside',
  'checkedin',
]);

/** Mews : Optional / Requested / Canceled / Processed n’occupent pas la chambre. */
const MEWS_NON_OCCUPYING = new Set([
  'optional',
  'inquired',
  'enquired',
  'requested',
  'canceled',
  'cancelled',
  'processed',
]);

function isMewsOccupyingOnCalendar(res) {
  const mews = String(res?.mewsState || '')
    .trim()
    .toLowerCase();
  if (!mews) return true;
  if (mews.includes('cancel')) return false;
  return !MEWS_NON_OCCUPYING.has(mews);
}

/**
 * Calendrier : Confirmed / Started / Pending / Inside uniquement.
 * Jamais les annulées — même Cancelled* non acknowledged (cancellationAcknowledged=false).
 * Mews Optional / waitlist / no-show (Canceled+NoShow) / Processed : pas de barre.
 */
export function isReservationVisibleOnCalendar(res) {
  if (!res || typeof res === 'string') return false;
  const status = String(res.status || '').trim();
  if (!status) return false;
  if (/cancel/i.test(status)) return false;
  if (res.cancellationDate != null && String(res.cancellationDate).trim() !== '') {
    return false;
  }
  if (!isMewsOccupyingOnCalendar(res)) return false;
  return CALENDAR_VISIBLE_STATUSES.has(status.toLowerCase());
}

/** Normalise une résa inventaire (lookup srv-calendar) pour l’UI calendrier. */
export function normalizeCalendarReservation(res) {
  if (!res) return null;
  if (typeof res === 'string') {
    return { _id: res, reservationId: res, id: res };
  }
  const id = res._id || res.reservationId || res.id;
  return {
    ...res,
    _id: id,
    reservationId: id,
    guestName:
      res.guestName ||
      `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() ||
      undefined,
  };
}

export function normalizeCalendarReservations(raw) {
  return (raw || [])
    .map(normalizeCalendarReservation)
    .filter(Boolean)
    .filter(isReservationVisibleOnCalendar);
}

export function reservationRouteId(res) {
  if (!res) return '';
  return String(res.reservationNumber || res._id || res.id || res.reservationId || '');
}
