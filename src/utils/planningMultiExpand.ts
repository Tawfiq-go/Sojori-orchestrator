/**
 * Planning Multi — même gate que MultiView MEWS :
 * propertyUnit === 'Multi' && roomTypes.length > 1
 */

import type { ListingRow, PlanningRoomTypeRef, ReservationRow } from '../components/calendar-views/_shared';

export function isPlanningMultiHotel(listing: Pick<ListingRow, 'propertyUnit' | 'roomTypes'>): boolean {
  return (
    String(listing.propertyUnit || '') === 'Multi' &&
    Array.isArray(listing.roomTypes) &&
    listing.roomTypes.length > 1
  );
}

/** Match résa → roomType (id, sinon nom). */
export function reservationMatchesRoomType(
  r: ReservationRow,
  rt: PlanningRoomTypeRef,
): boolean {
  if (r.roomTypeId && String(r.roomTypeId) === String(rt.id)) return true;
  const name = String(r.roomTypeName || '').trim().toLowerCase();
  if (name && name === String(rt.name || '').trim().toLowerCase()) return true;
  return false;
}

/**
 * Aplatit un listing Multi en lignes affichées (style MultiView) :
 * - collapsed : hôtel seul (toutes les résas)
 * - expanded : hôtel (résas sans roomType) + 1 ligne / roomType (+ orphelins)
 */
export function expandPlanningListingRows(
  listing: ListingRow,
  expanded: boolean,
): ListingRow[] {
  if (!isPlanningMultiHotel(listing)) return [listing];

  const roomTypes = listing.roomTypes || [];
  const roomTypeCount = roomTypes.length;

  if (!expanded) {
    return [{ ...listing, roomTypeCount, isRoomTypeRow: false }];
  }

  const claimed = new Set<string>();
  const children: ListingRow[] = roomTypes.map((rt) => {
    const reservations = listing.reservations.filter((r) => reservationMatchesRoomType(r, rt));
    for (const r of reservations) claimed.add(r.reservationId);
    return {
      listingId: `${listing.listingId}:${rt.id}`,
      listingName: rt.name,
      city: listing.city,
      cleanlinessStatus_v2: listing.cleanlinessStatus_v2,
      occupancyStatus: listing.occupancyStatus,
      cleanlinessEmergency: listing.cleanlinessEmergency,
      propertyUnit: 'Single',
      isRoomTypeRow: true,
      parentListingId: listing.listingId,
      parentListingName: listing.listingName,
      roomTypeId: rt.id,
      roomTypeCount: 0,
      reservations,
    };
  });

  const leftover = listing.reservations.filter((r) => !claimed.has(r.reservationId));
  const unassigned: ReservationRow[] = [];
  const orphanByKey = new Map<string, { id: string; name: string; reservations: ReservationRow[] }>();

  for (const r of leftover) {
    const id = String(r.roomTypeId || '').trim();
    const name = String(r.roomTypeName || '').trim();
    if (!id && !name) {
      unassigned.push(r);
      continue;
    }
    const key = id || `name:${name.toLowerCase()}`;
    const prev = orphanByKey.get(key);
    if (prev) prev.reservations.push(r);
    else orphanByKey.set(key, { id: id || key, name: name || id, reservations: [r] });
  }

  const orphanChildren: ListingRow[] = [...orphanByKey.values()].map((o) => ({
    listingId: `${listing.listingId}:orphan:${o.id}`,
    listingName: o.name,
    city: listing.city,
    propertyUnit: 'Single',
    isRoomTypeRow: true,
    parentListingId: listing.listingId,
    parentListingName: listing.listingName,
    roomTypeId: o.id,
    reservations: o.reservations,
  }));

  const parent: ListingRow = {
    ...listing,
    reservations: unassigned,
    roomTypeCount,
    isRoomTypeRow: false,
  };

  return [parent, ...children, ...orphanChildren];
}
