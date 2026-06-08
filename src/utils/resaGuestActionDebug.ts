/** Logs debug actions guest depuis /reservations — filtre console : ResaGuest */

const PREFIX = '[ResaGuest]';

export function isResaGuestDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  if (typeof window !== 'undefined') {
    return window.localStorage?.getItem('resaGuestDebug') === '1';
  }
  return false;
}

export function logResaGuest(phase: string, payload?: Record<string, unknown>): void {
  if (!isResaGuestDebugEnabled()) return;
  if (payload) {
    console.log(PREFIX, phase, payload);
  } else {
    console.log(PREFIX, phase);
  }
}

export function guestContextStaySummary(ctx: unknown): Record<string, unknown> {
  const c = (ctx ?? {}) as {
    arrival?: { choose?: unknown; declare?: unknown };
    departure?: { choose?: unknown; declare?: unknown };
    registration?: unknown;
  };
  return {
    arrivalChoose: c.arrival?.choose ?? null,
    arrivalDeclare: c.arrival?.declare ?? null,
    departureChoose: c.departure?.choose ?? null,
    departureDeclare: c.departure?.declare ?? null,
    registration: c.registration ?? null,
  };
}

export function reservationStaySummary(r: {
  _id?: string;
  reservationNumber?: string;
  checkInTime?: unknown;
  checkOutTime?: unknown;
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
  actualArrivalTime?: unknown;
  actualDepartureTime?: unknown;
  guestRegistration?: { nbre_guest_registered?: number; nbre_guest_to_register?: number };
}): Record<string, unknown> {
  return {
    id: r._id,
    reservationNumber: r.reservationNumber,
    checkInTime: r.checkInTime,
    confirmedCheckInTime: r.confirmedCheckInTime,
    actualArrivalTime: r.actualArrivalTime,
    checkOutTime: r.checkOutTime,
    confirmedCheckOutTime: r.confirmedCheckOutTime,
    actualDepartureTime: r.actualDepartureTime,
    registration: r.guestRegistration
      ? `${r.guestRegistration.nbre_guest_registered ?? '?'}/${r.guestRegistration.nbre_guest_to_register ?? '?'}`
      : null,
  };
}
