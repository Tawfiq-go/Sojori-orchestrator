/**
 * Planning Multi — même gate que MultiView MEWS :
 * propertyUnit === 'Multi' && roomTypes.length > 1
 *
 * Ops (ménage) : 3 niveaux listing → roomType → room physique.
 * Single / monotype : inchangé (1 ligne).
 *
 * Multi :
 * - building ▶ : affiche / cache les roomTypes
 * - roomType ▶ : affiche / cache les rooms
 * - building + roomType : pastilles nb résas / jour (occupancyDayCounts)
 * - rooms : barres Gantt des résas
 * - roomType / room vides sur la période → cachés
 */

import type {
  ListingRow,
  PlanningRoomRef,
  PlanningRoomTypeRef,
  ReservationRow,
} from '../components/calendar-views/_shared';

export function isPlanningMultiHotel(
  listing: Pick<ListingRow, 'propertyUnit' | 'roomTypes'>,
): boolean {
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

/** Match résa → chambre physique (id, sinon nom). */
export function reservationMatchesRoom(
  r: ReservationRow,
  room: PlanningRoomRef,
): boolean {
  if (r.roomId && String(r.roomId) === String(room.id)) return true;
  const name = String(r.roomName || '').trim().toLowerCase();
  if (name && name === String(room.name || '').trim().toLowerCase()) return true;
  return false;
}

export function roomTypeExpandKey(listingId: string, roomTypeId: string): string {
  return `${listingId}:${roomTypeId}`;
}

/** Résa active ce jour (arrivée ≤ jour < départ). */
export function reservationOccupiesDay(r: ReservationRow, dayIso: string): boolean {
  const arr = String(r.arrivalDate || '').slice(0, 10);
  const dep = String(r.departureDate || '').slice(0, 10);
  if (!arr || !dep || !dayIso) return false;
  return arr <= dayIso && dayIso < dep;
}

export function countReservationsOnDay(
  reservations: ReservationRow[],
  dayIso: string,
): number {
  return reservations.reduce(
    (n, r) => n + (reservationOccupiesDay(r, dayIso) ? 1 : 0),
    0,
  );
}

/**
 * Aplatit un listing Multi en lignes affichées :
 * - building : compteurs / jour (toujours) ; ▶ montre/cache roomTypes
 * - roomType : compteurs / jour ; ▶ montre/cache rooms
 * - rooms : barres résa
 */
export function expandPlanningListingRows(
  listing: ListingRow,
  hotelExpanded: boolean,
  roomTypeExpanded: Record<string, boolean> = {},
): ListingRow[] {
  if (!isPlanningMultiHotel(listing)) return [listing];

  const roomTypes = listing.roomTypes || [];

  // Compte les roomTypes qui ont au moins 1 résa (badge parent).
  let occupiedRoomTypeCount = 0;
  for (const rt of roomTypes) {
    if (listing.reservations.some((r) => reservationMatchesRoomType(r, rt))) {
      occupiedRoomTypeCount += 1;
    }
  }

  // Building : toutes les résas pour pastilles / jour — jamais de barres.
  const parent: ListingRow = {
    ...listing,
    reservations: listing.reservations,
    roomTypeCount: occupiedRoomTypeCount,
    isRoomTypeRow: false,
    isRoomRow: false,
    occupancyDayCounts: true,
    roomTypeCollapsedSummary: true,
  };

  // Building replié → hôtel seul (compteurs + ▶ roomTypes).
  if (!hotelExpanded) {
    return [parent];
  }

  const claimed = new Set<string>();
  const rows: ListingRow[] = [];

  for (const rt of roomTypes) {
    const rtResas = listing.reservations.filter((r) => reservationMatchesRoomType(r, rt));
    for (const r of rtResas) claimed.add(r.reservationId);

    if (rtResas.length === 0) continue;

    const rooms = Array.isArray(rt.rooms) ? rt.rooms : [];
    const rtKey = roomTypeExpandKey(listing.listingId, rt.id);
    const rtOpen = Boolean(roomTypeExpanded[rtKey]) && rooms.length > 0;

    const roomRows: ListingRow[] = [];
    if (rtOpen) {
      for (const room of rooms) {
        const roomResas = rtResas.filter((r) => reservationMatchesRoom(r, room));
        // Inclure toutes les rooms (ops ménage), même sans résa sur la période
        roomRows.push({
          listingId: `${listing.listingId}:${rt.id}:room:${room.id}`,
          listingName: room.name,
          city: listing.city,
          propertyUnit: 'Single',
          isRoomTypeRow: false,
          isRoomRow: true,
          occupancyDayCounts: false,
          roomTypeCollapsedSummary: false,
          parentListingId: listing.listingId,
          parentListingName: listing.listingName,
          parentRoomTypeId: rt.id,
          parentRoomTypeName: rt.name,
          roomTypeId: rt.id,
          roomId: room.id,
          housekeepingState: room.housekeepingState || null,
          roomTypeCount: 0,
          reservations: roomResas,
        });
      }
    }

    const occupiedRoomCount = rooms.filter((room) =>
      rtResas.some((r) => reservationMatchesRoom(r, room)),
    ).length;

    // RoomType : toujours pastilles (toutes les résas du type) ; rooms portent les barres.
    rows.push({
      listingId: `${listing.listingId}:${rt.id}`,
      listingName: rt.name,
      city: listing.city,
      cleanlinessStatus_v2: listing.cleanlinessStatus_v2,
      occupancyStatus: listing.occupancyStatus,
      cleanlinessEmergency: listing.cleanlinessEmergency,
      propertyUnit: 'Single',
      isRoomTypeRow: true,
      isRoomRow: false,
      occupancyDayCounts: true,
      roomTypeCollapsedSummary: true,
      parentListingId: listing.listingId,
      parentListingName: listing.listingName,
      roomTypeId: rt.id,
      roomTypeCount: occupiedRoomCount,
      rooms,
      reservations: rtResas,
    });
    rows.push(...roomRows);
  }

  const leftover = listing.reservations.filter((r) => !claimed.has(r.reservationId));
  const unassigned: ReservationRow[] = [];
  const orphanByKey = new Map<
    string,
    { id: string; name: string; reservations: ReservationRow[] }
  >();

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
    isRoomRow: false,
    occupancyDayCounts: true,
    roomTypeCollapsedSummary: true,
    parentListingId: listing.listingId,
    parentListingName: listing.listingName,
    roomTypeId: o.id,
    reservations: o.reservations,
  }));

  const unassignedRow: ListingRow[] =
    unassigned.length > 0
      ? [
          {
            listingId: `${listing.listingId}:unassigned`,
            listingName: 'Non assigné',
            city: listing.city,
            propertyUnit: 'Single',
            isRoomTypeRow: true,
            isRoomRow: false,
            occupancyDayCounts: true,
            roomTypeCollapsedSummary: true,
            parentListingId: listing.listingId,
            parentListingName: listing.listingName,
            roomTypeId: '__unassigned__',
            reservations: unassigned,
          },
        ]
      : [];

  return [parent, ...rows, ...orphanChildren, ...unassignedRow];
}
