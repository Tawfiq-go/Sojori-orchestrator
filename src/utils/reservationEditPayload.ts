/** Payload PUT /api/v1/reservations/update/:id (aligné legacy dashboard). */

function formatDateForApi(date: unknown): string {
  if (!date) return '';
  if (date instanceof Date) return date.toISOString().slice(0, 10);
  const s = String(date);
  if (s.includes('T')) return new Date(s).toISOString().slice(0, 10);
  return s.slice(0, 10);
}

function pickRoomTypeId(r: Record<string, unknown>): string {
  if (r.roomTypeId) return String(r.roomTypeId);
  const rt = r.roomTypes as Record<string, unknown> | undefined;
  if (rt?._id) return String(rt._id);
  if (rt?.roomTypeId) return String(rt.roomTypeId);
  return '';
}

function pickSojoriId(r: Record<string, unknown>): string {
  if (r.sojoriId) return String(r.sojoriId);
  const listing = r.listing as Record<string, unknown> | undefined;
  if (listing?._id) return String(listing._id);
  if (listing?.id) return String(listing.id);
  return '';
}

export function buildReservationUpdatePayload(
  reservation: Record<string, unknown>,
  editedData: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...reservation, ...editedData };
  const adults = Number(merged.adults ?? 0);
  const children = Number(merged.children ?? 0);
  const infants = Number(merged.infants ?? 0);

  return {
    guestName: merged.guestName,
    guestFirstName: merged.guestFirstName,
    guestLastName: merged.guestLastName,
    guestEmail: merged.guestEmail,
    phone: merged.phone,
    guestCountry: merged.guestCountry,
    guestLanguage: merged.guestLanguage,
    adults,
    children,
    infants,
    numberOfGuests: Number(merged.numberOfGuests ?? adults + children + infants),
    atSojori: merged.atSojori !== false,
    sojoriId: pickSojoriId(merged),
    roomTypeId: pickRoomTypeId(merged),
    arrivalDate: formatDateForApi(merged.arrivalDate),
    departureDate: formatDateForApi(merged.departureDate),
    checkInTime: merged.checkInTime ?? null,
    checkOutTime: merged.checkOutTime ?? null,
    actualCheckInTime: merged.actualCheckInTime ?? merged.actualArrivalTime ?? null,
    actualCheckOutTime: merged.actualCheckOutTime ?? merged.actualDepartureTime ?? null,
    confirmedCheckInTime: Boolean(merged.confirmedCheckInTime),
    confirmedCheckOutTime: Boolean(merged.confirmedCheckOutTime),
    status: merged.status,
    paymentStatus: merged.paymentStatus,
    totalPrice: merged.totalPrice,
    nights: merged.nights,
    notes: merged.notes,
    comments: merged.comments,
    CreatedTasks: Array.isArray(merged.CreatedTasks) ? merged.CreatedTasks : [],
  };
}

export function formatDateInputValue(date: unknown): string {
  if (!date) return '';
  try {
    const d = date instanceof Date ? date : new Date(String(date));
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
}
