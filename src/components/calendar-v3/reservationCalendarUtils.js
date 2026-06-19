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
  return (raw || []).map(normalizeCalendarReservation).filter(Boolean);
}

export function reservationRouteId(res) {
  if (!res) return '';
  return String(res.reservationNumber || res._id || res.id || res.reservationId || '');
}
