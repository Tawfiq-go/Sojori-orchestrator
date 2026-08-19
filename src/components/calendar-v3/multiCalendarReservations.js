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
import {
  normalizeCalendarReservation,
  isReservationCancelledOnCalendar,
  isReservationVisibleOnCalendar,
} from './reservationCalendarUtils';

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
  // Seed inventaire encore Confirmed + live Cancelled → masquer (pas AND des deux visibles).
  if (isReservationCancelledOnCalendar(shell) || isReservationCancelledOnCalendar(res)) {
    return null;
  }
  if (!isReservationVisibleOnCalendar(shell) && !isReservationVisibleOnCalendar(res)) {
    return null;
  }
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
        enabled: typeof rm?.enabled === 'boolean' ? rm.enabled : undefined,
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
  const visible = (reservations || []).filter(isReservationVisibleOnCalendar);
  if (!visible.length) {
    // Même sans overlay : retirer les annulées déjà collées sur les jours inventaire.
    const scrubbed = {};
    for (const [iso, day] of Object.entries(base)) {
      const existing = Array.isArray(day?.reservations) ? day.reservations : [];
      const kept = existing.filter(isReservationVisibleOnCalendar);
      scrubbed[iso] =
        kept.length === existing.length ? day : { ...day, reservations: kept };
    }
    return scrubbed;
  }
  const out = { ...base };
  const dates = new Set([
    ...Object.keys(base),
    ...visible.flatMap((r) => {
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
    const dayResas = visible.filter((r) => {
      const arr = toIsoDay(r.arrivalDate);
      const dep = toIsoDay(r.departureDate);
      return arr && dep && arr <= iso && iso < dep;
    });
    const prev = out[iso] || {};
    const existing = Array.isArray(prev.reservations)
      ? prev.reservations.filter(isReservationVisibleOnCalendar)
      : [];
    if (dayResas.length === 0 && existing.length === (prev.reservations || []).length) {
      continue;
    }
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

function overlayResaId(r) {
  return String(r?._id || r?.reservationId || r?.id || '').trim();
}

/** Même séjour recopié N jours / seed+fetch avec ids différents. */
export function overlayStayKey(r, listingId = '') {
  if (!r || typeof r !== 'object') return '';
  const arr = toIsoDay(r.arrivalDate);
  const dep = toIsoDay(r.departureDate);
  if (!arr || !dep) return '';
  const room = String(r.roomId || r.roomName || '')
    .trim()
    .toLowerCase();
  const lid = String(r.listingId || r.sojoriId || listingId || '').trim();
  return `${lid}|${room}|${arr}|${dep}`;
}

export function dedupeOverlayReservations(rows, listingId = '') {
  const list = [];
  const idToIdx = new Map();
  const stayToIdx = new Map();
  for (const r of rows || []) {
    if (!r || typeof r !== 'object') continue;
    const id = overlayResaId(r);
    const stay = overlayStayKey(r, listingId);
    if (id && idToIdx.has(id)) {
      const i = idToIdx.get(id);
      list[i] = r;
      if (stay) stayToIdx.set(stay, i);
      continue;
    }
    if (stay && stayToIdx.has(stay)) {
      const i = stayToIdx.get(stay);
      list[i] = r;
      if (id) idToIdx.set(id, i);
      continue;
    }
    const i = list.length;
    list.push(r);
    if (id) idToIdx.set(id, i);
    if (stay) stayToIdx.set(stay, i);
  }
  return list;
}

/**
 * Résas déjà dans l’inventaire (get-inventory includeReservations).
 * Sert de 1er paint instantané — sans attendre GET /reservations.
 */
export function flattenInventoryReservationsForOverlay(inventoryData) {
  const byId = new Map();
  const staySeen = new Set();
  for (const [listingId, roomTypes] of Object.entries(inventoryData || {})) {
    if (!roomTypes || typeof roomTypes !== 'object') continue;
    for (const [rtId, rt] of Object.entries(roomTypes)) {
      const days = rt && typeof rt === 'object' ? rt.availability : null;
      if (!days || typeof days !== 'object') continue;
      for (const day of Object.values(days)) {
        const list = Array.isArray(day?.reservations) ? day.reservations : [];
        for (const raw of list) {
          if (!raw || typeof raw !== 'object') continue;
          const tagged = {
            ...raw,
            sojoriId: raw.sojoriId || listingId,
            listingId: raw.listingId || listingId,
            roomTypeId: raw.roomTypeId || rtId,
            roomTypeName: raw.roomTypeName || rt?.name,
          };
          if (isReservationCancelledOnCalendar(tagged)) continue;
          const id = overlayResaId(tagged);
          const stay = overlayStayKey(tagged, listingId);
          const key = id || stay || `tmp:${listingId}:${rtId}:${byId.size}`;
          if (byId.has(key) || (stay && staySeen.has(stay))) continue;
          if (stay) staySeen.add(stay);
          byId.set(key, tagged);
        }
      }
    }
  }
  return [...byId.values()];
}

/** Même séjour sans room — pour évincer un seed inventaire quand l’overlay live est Cancelled. */
function overlayGuestStayKey(r, listingId = '') {
  if (!r || typeof r !== 'object') return '';
  const arr = toIsoDay(r.arrivalDate);
  const dep = toIsoDay(r.departureDate);
  if (!arr || !dep) return '';
  const lid = String(r.listingId || r.sojoriId || listingId || '').trim();
  const guest = String(
    r.guestName || `${r.guestFirstName || ''} ${r.guestLastName || ''}`,
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!guest) return '';
  return `${lid}|${guest}|${arr}|${dep}`;
}

function keepOnCalendarOverlay(r) {
  if (!r || typeof r !== 'object') return false;
  if (isReservationCancelledOnCalendar(r)) return false;
  const status = String(r.status || '').trim();
  if (!status) return true;
  return isReservationVisibleOnCalendar(r);
}

/** Seed inventaire + fetch /reservations (le fetch gagne sur le même id). Jamais d’annulées. */
export function mergeOverlayReservationLists(seed, fetched) {
  const fetchedList = fetched || [];
  const cancelledIds = new Set();
  const cancelledNumbers = new Set();
  const cancelledGuestStays = new Set();
  for (const r of fetchedList) {
    if (!isReservationCancelledOnCalendar(r)) continue;
    const id = overlayResaId(r);
    if (id) cancelledIds.add(id);
    const num = String(r.reservationNumber || '').trim().toLowerCase();
    if (num) cancelledNumbers.add(num);
    const guestStay = overlayGuestStayKey(r);
    if (guestStay) cancelledGuestStays.add(guestStay);
  }
  const seedKept = (seed || []).filter((r) => {
    if (!keepOnCalendarOverlay(r)) return false;
    if (cancelledIds.has(overlayResaId(r))) return false;
    const num = String(r.reservationNumber || '').trim().toLowerCase();
    if (num && cancelledNumbers.has(num)) return false;
    const guestStay = overlayGuestStayKey(r);
    if (guestStay && cancelledGuestStays.has(guestStay)) return false;
    return true;
  });
  const fetchedKept = fetchedList.filter(keepOnCalendarOverlay);
  return dedupeOverlayReservations([...seedKept, ...fetchedKept]);
}

/**
 * Multi hôtel = propertyUnit Multi et plus d’un type (catalogue ou inventaire).
 * Le catalogue forCalendar évite de traiter un Multi comme un Single avant l’inventaire.
 */
export function isMultiHotelListing(listing, roomTypes = []) {
  if (String(listing?.propertyUnit || '') !== 'Multi') return false;
  const catalogN = Array.isArray(listing?.roomTypes) ? listing.roomTypes.length : 0;
  const treeN = Array.isArray(roomTypes) ? roomTypes.length : 0;
  return Math.max(catalogN, treeN) > 1;
}

function catalogRoomTypeIndex(listing) {
  const catalogRts = Array.isArray(listing?.roomTypes) ? listing.roomTypes : [];
  const catalogById = new Map();
  const catalogByName = new Map();
  catalogRts.forEach((rt) => {
    const id = mongoId(rt?._id || rt?.id);
    const name = String(rt?.roomTypeName || rt?.name || '')
      .trim()
      .toLowerCase();
    if (id) catalogById.set(id, rt);
    if (name) catalogByName.set(name, rt);
  });
  return { catalogRts, catalogById, catalogByName };
}

/**
 * Arbre types + rooms pour un listing Multi.
 * Catalogue d’abord (1er paint), inventaire ensuite pour dispo/tarif — même ids, pas de 2e layout.
 */
export function buildRoomTypesForListing({ listing, inventoryBlock = {} }) {
  const { catalogRts, catalogById, catalogByName } = catalogRoomTypeIndex(listing);
  const inv =
    inventoryBlock && typeof inventoryBlock === 'object' ? inventoryBlock : {};
  const invEntries = Object.entries(inv);
  const out = [];
  const usedCatalogIds = new Set();

  const pushRt = (rtId, rtName, availability, catalogRt, roomNumber) => {
    out.push({
      id: rtId,
      name: rtName,
      availability: availability || {},
      rooms: resolveRoomsForRoomType({
        catalogRt,
        roomTypeId: rtId,
        roomTypeName: rtName,
        roomNumber,
        reservations: [],
      }),
    });
  };

  const matchCatalog = (rtId, rtName) =>
    catalogById.get(rtId) ||
    catalogByName.get(String(rtName || '').trim().toLowerCase()) ||
    null;

  if (invEntries.length > 0) {
    invEntries.forEach(([id, v]) => {
      const rtId = mongoId(id) || String(id);
      const rtName = v?.name || `Type ${String(id).slice(-4)}`;
      const catalogRt = matchCatalog(rtId, rtName);
      const catalogId = mongoId(catalogRt?._id || catalogRt?.id);
      if (catalogId) usedCatalogIds.add(catalogId);
      pushRt(
        rtId,
        rtName,
        v?.availability,
        catalogRt,
        Number(v?.roomNumber) || Number(catalogRt?.roomNumber) || 0,
      );
    });
    catalogRts.forEach((rt) => {
      const rtId = mongoId(rt?._id || rt?.id);
      if (!rtId || usedCatalogIds.has(rtId) || out.some((x) => x.id === rtId)) return;
      const rtName = String(rt.roomTypeName || rt.name || `Type ${rtId.slice(-4)}`);
      pushRt(rtId, rtName, {}, rt, Number(rt.roomNumber) || 0);
    });
    return out;
  }

  catalogRts.forEach((rt) => {
    const rtId = mongoId(rt?._id || rt?.id);
    if (!rtId) return;
    const rtName = String(rt.roomTypeName || rt.name || `Type ${rtId.slice(-4)}`);
    pushRt(rtId, rtName, {}, rt, Number(rt.roomNumber) || 0);
  });
  return out;
}

/**
 * Single unit : une seule ligne « Resa » (pas de roomType / pas de chambres).
 */
export function buildSingleUnitResaRows({ listingId, listingResas = [] }) {
  const lid = String(listingId || 'listing');
  return [
    {
      room: { id: `${lid}:resa`, name: 'Resa' },
      roomResas: listingResas || [],
    },
  ];
}
