/**
 * Vue Multi calendrier — résas comme /planning :
 * fetch srv-reservations + matching listing/roomType (indépendant du lookup inventaire).
 * Ne pas utiliser pour SimpleView.
 */

import {
  buildListingIdIndex,
  collectReservationListingIds,
  findListingForReservation,
} from '../../utils/planningListingMatch';
import {
  reservationMatchesRoom,
  reservationMatchesRoomType,
} from '../../utils/planningMultiExpand';
import { normalizeCalendarReservation } from './reservationCalendarUtils';

/** YYYY-MM-DD fiable (string ISO, Date, ou objet). */
export function toIsoDay(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const t = Date.parse(s);
    if (Number.isFinite(t)) return new Date(t).toISOString().slice(0, 10);
    return '';
  }
  if (v instanceof Date && Number.isFinite(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'object' && v.$date) return toIsoDay(v.$date);
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : '';
}

function mapListingSummaries(listings) {
  return (listings || []).map((l) => ({
    id: String(l._id || l.id || ''),
    name: l.name || '',
    city: l.city || '',
    propertyUnit: l.propertyUnit || 'Single',
    raw: l,
  }));
}

/** Normalise une résa API → forme overlay Multi (dates ISO, ids). */
export function normalizeMultiOverlayReservation(res) {
  const shell = normalizeCalendarReservation(res);
  if (!shell) return null;
  const arrivalDate = toIsoDay(shell.arrivalDate || res.arrivalDate);
  const departureDate = toIsoDay(shell.departureDate || res.departureDate);
  if (!arrivalDate || !departureDate) return null;
  const roomTypeId = String(
    res.roomTypeId || res.roomTypes?.roomTypeId || res.roomTypes?._id || '',
  ).trim();
  const roomTypeName = String(
    res.roomTypeName || res.roomTypes?.roomTypeName || res.roomTypes?.name || '',
  ).trim();
  return {
    ...shell,
    arrivalDate,
    departureDate,
    roomTypeId: roomTypeId || undefined,
    roomTypeName: roomTypeName || undefined,
    roomId: String(res.roomId || '').trim() || undefined,
    roomName: String(res.roomName || '').trim() || undefined,
    channelName: res.channelName || shell.channelName || 'direct',
    status: res.status || shell.status,
    guestName:
      shell.guestName ||
      `${res.guestFirstName || ''} ${res.guestLastName || ''}`.trim() ||
      'Réservation',
  };
}

/**
 * Groupe les résas API par listingId calendrier (_id).
 * @returns {Map<string, object[]>}
 */
export function groupMultiReservationsByListing(rawReservations, listings) {
  const byId = buildListingIdIndex(mapListingSummaries(listings));
  const out = new Map();
  for (const raw of rawReservations || []) {
    const matched = findListingForReservation(raw, byId);
    const listingId = matched?.id || collectReservationListingIds(raw)[0];
    if (!listingId) continue;
    const norm = normalizeMultiOverlayReservation(raw);
    if (!norm) continue;
    const bucket = out.get(listingId);
    if (bucket) bucket.push(norm);
    else out.set(listingId, [norm]);
  }
  return out;
}

/** Résas d’un roomType (id puis nom), sinon toutes si pas de filtre. */
export function filterReservationsForRoomType(reservations, roomTypeId, roomTypeName) {
  if (!roomTypeId && !roomTypeName) return reservations || [];
  const rt = { id: String(roomTypeId || ''), name: String(roomTypeName || '') };
  return (reservations || []).filter((r) => reservationMatchesRoomType(r, rt));
}

/** Résas d’une chambre physique (id puis nom). */
export function filterReservationsForRoom(reservations, roomId, roomName) {
  if (!roomId && !roomName) return [];
  const room = { id: String(roomId || ''), name: String(roomName || '') };
  return (reservations || []).filter((r) => reservationMatchesRoom(r, room));
}

/** Id Mongo fiable (string / ObjectId / { $oid }). */
export function mongoId(v) {
  if (v == null || v === '') return '';
  if (typeof v === 'string') {
    const s = v.trim();
    return s && s !== '[object Object]' ? s : '';
  }
  if (typeof v === 'object') {
    if (v.$oid) return String(v.$oid);
    if (v._id != null && v._id !== v) return mongoId(v._id);
    if (typeof v.toString === 'function') {
      const s = v.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  const s = String(v);
  return s && s !== '[object Object]' ? s : '';
}

/** Rooms physiques d’un roomType catalogue forCalendar. */
export function normalizeCatalogRooms(rt) {
  const roomsSrc = Array.isArray(rt?.rooms) ? rt.rooms : [];
  return roomsSrc
    .map((rm) => {
      const id = mongoId(rm?._id || rm?.id);
      const name =
        rm?.roomName ||
        rm?.name ||
        (rm?.roomNumber != null ? `Chambre ${rm.roomNumber}` : '');
      if (!id || !name) return null;
      return {
        id,
        name: String(name),
        number: rm?.roomNumber != null ? Number(rm.roomNumber) : undefined,
        housekeepingState: rm?.housekeepingState || null,
      };
    })
    .filter(Boolean);
}

/**
 * Rooms pour un roomType inventaire :
 * 1) catalogue (id puis nom)
 * 2) roomId/roomName des résas du type
 * 3) placeholders Chambre 1..N si roomNumber connu
 */
export function resolveRoomsForRoomType({
  catalogRt,
  roomTypeId,
  roomTypeName,
  roomNumber = 0,
  reservations = [],
}) {
  const fromCatalog = catalogRt ? normalizeCatalogRooms(catalogRt) : [];
  if (fromCatalog.length > 0) return fromCatalog;

  const rtResas = filterReservationsForRoomType(
    reservations,
    roomTypeId,
    roomTypeName,
  );
  const byKey = new Map();
  rtResas.forEach((r) => {
    const id = mongoId(r.roomId);
    const name = String(r.roomName || '').trim();
    if (id) {
      if (!byKey.has(id)) {
        byKey.set(id, { id, name: name || `Chambre ${id.slice(-4)}` });
      }
      return;
    }
    if (name) {
      const key = `name:${name.toLowerCase()}`;
      if (!byKey.has(key)) byKey.set(key, { id: key, name });
    }
  });
  if (byKey.size > 0) return [...byKey.values()];

  const n = Number(roomNumber) || 0;
  if (n > 0 && roomTypeId) {
    return Array.from({ length: Math.min(n, 40) }, (_, i) => ({
      id: `${roomTypeId}:unit:${i + 1}`,
      name: `Chambre ${i + 1}`,
      number: i + 1,
    }));
  }

  // Au moins une ligne « non assignée » s’il y a des résas du type sans room
  if (rtResas.length > 0) {
    return [{ id: `${roomTypeId || 'rt'}:unassigned`, name: 'Non assignée' }];
  }
  return [];
}

/**
 * Fusionne résas externes dans les jours d’inventaire (tooltip / pastilles fromInv).
 * Ne mute pas l’objet d’origine.
 */
export function mergeReservationsIntoDayInventories(inventories, reservations) {
  const base = inventories || {};
  if (!reservations?.length) return base;
  const out = { ...base };
  const dates = new Set([
    ...Object.keys(base),
    ...reservations.flatMap((r) => {
      const arr = toIsoDay(r.arrivalDate);
      const dep = toIsoDay(r.departureDate);
      if (!arr || !dep) return [];
      const days = [];
      let t = Date.parse(`${arr}T12:00:00`);
      const end = Date.parse(`${dep}T12:00:00`);
      while (Number.isFinite(t) && t < end) {
        days.push(new Date(t).toISOString().slice(0, 10));
        t += 86400000;
      }
      return days;
    }),
  ]);
  for (const iso of dates) {
    const dayResas = reservations.filter((r) => {
      const arr = toIsoDay(r.arrivalDate);
      const dep = toIsoDay(r.departureDate);
      return arr && dep && arr <= iso && iso < dep;
    });
    if (dayResas.length === 0) continue;
    const prev = out[iso] || {};
    const existing = Array.isArray(prev.reservations) ? prev.reservations : [];
    const seen = new Set(existing.map((r) => String(r._id || r.reservationId || '')));
    const merged = [...existing];
    dayResas.forEach((r) => {
      const id = String(r._id || r.reservationId || '');
      if (!id || seen.has(id)) return;
      seen.add(id);
      merged.push(r);
    });
    out[iso] = { ...prev, reservations: merged };
  }
  return out;
}
