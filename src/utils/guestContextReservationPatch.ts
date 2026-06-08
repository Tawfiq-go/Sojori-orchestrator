import type { StayFieldPatch } from '../components/reservations/ReservationStayActions';
import type { RegistrationFieldPatch } from '../components/reservations/ReservationRegistrationActions';
import { guestContextStaySummary, logResaGuest } from './resaGuestActionDebug';

type GuestContextLike = {
  arrival?: {
    choose?: { chosen?: boolean; time?: string | null };
    declare?: { yes?: boolean; time?: string | null };
  };
  departure?: {
    choose?: { chosen?: boolean; time?: string | null };
    declare?: { yes?: boolean; time?: string | null };
  };
  registration?: {
    registered?: number;
    total?: number;
  };
};

/** Miroir srv-fulltask guestContextToReservationPatch — patch liste après action guest. */
export function stayPatchFromGuestContext(ctx: unknown): StayFieldPatch {
  const c = (ctx ?? {}) as GuestContextLike;
  const patch: StayFieldPatch = {};

  if (c.arrival?.choose?.chosen && c.arrival.choose.time) {
    patch.checkInTime = c.arrival.choose.time;
    patch.confirmedCheckInTime = true;
  }
  if (c.departure?.choose?.chosen && c.departure.choose.time) {
    patch.checkOutTime = c.departure.choose.time;
    patch.confirmedCheckOutTime = true;
  }
  if (c.arrival?.declare?.yes) {
    patch.actualArrivalTime = c.arrival.declare.time ?? c.arrival.choose?.time ?? null;
  }
  if (c.departure?.declare?.yes) {
    patch.actualDepartureTime = c.departure.declare.time ?? c.departure.choose?.time ?? null;
  }

  logResaGuest('patchFromGuestContext', {
    guestContext: guestContextStaySummary(c),
    stayPatch: patch,
  });

  return patch;
}

export function registrationPatchFromGuestContext(ctx: unknown): RegistrationFieldPatch {
  const c = (ctx ?? {}) as GuestContextLike;
  if (!c.registration) {
    logResaGuest('registrationPatchFromGuestContext', { guestContext: guestContextStaySummary(c), patch: {} });
    return {};
  }
  const patch = {
    guestRegistration: {
      nbre_guest_registered: c.registration.registered,
      nbre_guest_to_register: c.registration.total,
    },
  };
  logResaGuest('registrationPatchFromGuestContext', {
    guestContext: guestContextStaySummary(c),
    patch,
  });
  return patch;
}
