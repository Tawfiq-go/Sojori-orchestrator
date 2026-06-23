/**
 * Display + filter helpers for listing operational status on planning views.
 */

export type DisplayCleanliness = 'clean' | 'dirty' | 'in_progress' | 'occupied';

export type CleanlinessFilter = DisplayCleanliness | 'emergency';

export interface CleanlinessListingFields {
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessEmergency?: boolean;
}

export interface StayReservationLike {
  arrivalDate?: string;
  departureDate?: string;
  status?: string;
}

/** Badge label shown in UI (matches CleanlinessBadge). */
export function displayCleanlinessLabel(s: DisplayCleanliness): string {
  if (s === 'clean') return 'CLEAN';
  if (s === 'dirty') return 'DIRTY';
  if (s === 'in_progress') return 'EN COURS';
  return 'OCCUPÉ';
}

/** True when a reservation covers `today` (arrival ≤ today < departure, or status Inside). */
export function hasActiveStayToday(
  reservations: StayReservationLike[],
  today = new Date(),
): boolean {
  const todayStr = today.toISOString().slice(0, 10);
  return reservations.some((r) => {
    const arr = (r.arrivalDate || '').slice(0, 10);
    const dep = (r.departureDate || '').slice(0, 10);
    if (!arr || !dep) return false;
    const st = String(r.status || '').toLowerCase();
    if (st.includes('inside')) return true;
    return arr <= todayStr && todayStr < dep;
  });
}

/**
 * Derive badge label: occupied (DB or active stay) wins, then vacant cleanliness v2.
 */
export function deriveDisplayCleanliness(
  listing: CleanlinessListingFields,
  reservations: StayReservationLike[] = [],
  today = new Date(),
): DisplayCleanliness {
  const occ = String(listing.occupancyStatus || '').toLowerCase();
  const v2 = String(listing.cleanlinessStatus_v2 || 'clean').toLowerCase();

  if (occ === 'occupied') return 'occupied';

  if (hasActiveStayToday(reservations, today)) return 'occupied';

  if (occ === 'vacant') {
    if (v2 === 'in_progress') return 'in_progress';
    if (v2 === 'dirty') return 'dirty';
    return 'clean';
  }

  if (v2 === 'in_progress') return 'in_progress';
  if (v2 === 'dirty') return 'dirty';
  return 'clean';
}

export function matchesCleanlinessFilter(
  listing: CleanlinessListingFields & { reservations?: StayReservationLike[] },
  filters: Set<CleanlinessFilter>,
): boolean {
  if (filters.size === 0) return true;

  const display = deriveDisplayCleanliness(listing, listing.reservations);

  if (filters.has('emergency') && listing.cleanlinessEmergency) return true;
  if (filters.has(display)) return true;

  return false;
}

/** Map UI choice → srv-listing PATCH body (V2 only). */
export function displayToUpdateBody(
  status: DisplayCleanliness,
): { cleanlinessStatus_v2?: string; occupancyStatus?: string; trigger?: string } {
  if (status === 'occupied') {
    return { occupancyStatus: 'occupied', trigger: 'manual_override' };
  }
  if (status === 'dirty') {
    return { cleanlinessStatus_v2: 'dirty', occupancyStatus: 'vacant', trigger: 'manual_override' };
  }
  if (status === 'in_progress') {
    return { cleanlinessStatus_v2: 'in_progress', occupancyStatus: 'vacant', trigger: 'manual_override' };
  }
  return { cleanlinessStatus_v2: 'clean', occupancyStatus: 'vacant', trigger: 'manual_override' };
}

/** Map operational fields → planning badge category. */
export function derivePlanningCleanliness(
  listing: CleanlinessListingFields,
  reservations: StayReservationLike[] = [],
): DisplayCleanliness {
  return deriveDisplayCleanliness(listing, reservations);
}
