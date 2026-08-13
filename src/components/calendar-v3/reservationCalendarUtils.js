/** Statuts actifs affichés sur le calendrier (pas les listes /resa). */
const CALENDAR_VISIBLE_STATUSES = new Set([
  'confirmed',
  'started',
  'pending',
  'inside',
  'checkedin',
]);

/**
 * Calendrier : Confirmed / Started / Pending / Inside uniquement.
 * Jamais les annulées — même Cancelled* non acknowledged (cancellationAcknowledged=false).
 * Les pages résas gardent les annulées ; ce filtre est UI calendrier seulement.
 */
export function isReservationVisibleOnCalendar(res) {
  if (!res || typeof res === 'string') return false;
  const status = String(res.status || '').trim();
  if (!status) return false;
  if (/cancel/i.test(status)) return false;
  if (res.cancellationDate != null && String(res.cancellationDate).trim() !== '') {
    return false;
  }
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
