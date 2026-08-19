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

/** Annulée pour l’occupation (acquittée ou non, payée ou non). */
export function isReservationCancelledOnCalendar(res) {
  if (!res || typeof res !== 'object') return false;
  if (/cancel/i.test(String(res.status || ''))) return true;
  if (res.cancellationDate != null && String(res.cancellationDate).trim() !== '') {
    return true;
  }
  const mews = String(res.mewsState || '')
    .trim()
    .toLowerCase();
  return mews.includes('cancel');
}

/**
 * Calendrier : Confirmed / Started / Pending / Inside uniquement.
 * Jamais les annulées — même Cancelled* non acknowledged (cancellationAcknowledged=false)
 * et même impayées (paymentStatus UnPaid). L’acquittement se fait sur /reservations.
 * Mews Optional / waitlist / no-show (Canceled+NoShow) / Processed : pas de barre.
 */
export function isReservationVisibleOnCalendar(res) {
  if (!res || typeof res === 'string') return false;
  if (isReservationCancelledOnCalendar(res)) return false;
  const status = String(res.status || '').trim();
  if (!status) return false;
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

/** Fetch détail : ObjectId d’abord (cache getById), pas le numéro SJ-… plus lent. */
export function reservationDetailFetchId(res) {
  if (!res) return '';
  for (const v of [res._id, res.id, res.reservationId]) {
    const s = String(v || '').trim();
    if (/^[a-f0-9]{24}$/i.test(s)) return s;
  }
  return reservationRouteId(res);
}
