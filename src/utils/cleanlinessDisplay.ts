/**
 * Display + filter helpers for listing cleanliness on planning views.
 */

export type DisplayCleanliness = 'clean' | 'dirty' | 'in_progress' | 'occupied';

export type CleanlinessFilter = DisplayCleanliness | 'emergency';

export interface CleanlinessListingFields {
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessStatus?: string;
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

/**
 * Derive what the user should see: occupied during an active stay (even before manual check-in).
 */
export function deriveDisplayCleanliness(
  listing: CleanlinessListingFields,
  reservations: StayReservationLike[] = [],
  today = new Date(),
): DisplayCleanliness {
  const todayStr = today.toISOString().slice(0, 10);

  const hasActiveStay = reservations.some((r) => {
    const arr = (r.arrivalDate || '').slice(0, 10);
    const dep = (r.departureDate || '').slice(0, 10);
    if (!arr || !dep) return false;
    const st = String(r.status || '').toLowerCase();
    if (st.includes('inside')) return true;
    return arr <= todayStr && todayStr < dep;
  });

  if (hasActiveStay || listing.occupancyStatus === 'occupied') {
    return 'occupied';
  }

  const v2 = String(listing.cleanlinessStatus_v2 || '').toLowerCase();
  if (v2 === 'in_progress') return 'in_progress';
  if (v2 === 'dirty') return 'dirty';
  // Explicit v2 "clean" wins over legacy "dirty" (avoid filter/badge drift during migration)
  if (v2 === 'clean') return 'clean';

  const legacy = String(listing.cleanlinessStatus || '').toLowerCase();
  if (legacy === 'dirty') return 'dirty';
  if (legacy === 'occupied') return 'occupied';

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

/** Map UI choice → API body for srv-task PATCH */
export function displayToUpdateBody(
  status: DisplayCleanliness,
): { cleanlinessStatus?: string; cleanlinessStatus_v2?: string; occupancyStatus?: string } {
  if (status === 'occupied') {
    return { cleanlinessStatus: 'occupied', occupancyStatus: 'occupied' };
  }
  if (status === 'dirty') {
    return { cleanlinessStatus: 'dirty', cleanlinessStatus_v2: 'dirty', occupancyStatus: 'vacant' };
  }
  if (status === 'in_progress') {
    return { cleanlinessStatus_v2: 'in_progress', occupancyStatus: 'vacant' };
  }
  return { cleanlinessStatus: 'clean', cleanlinessStatus_v2: 'clean', occupancyStatus: 'vacant' };
}
