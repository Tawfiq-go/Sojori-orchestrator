/**
 * Mapping Ops Board — rooms Mews HK + résas Sojori → colonnes design Claude.
 * Pas d’assignation FdM (doing) pour l’instant.
 */
import type { Reservation } from '../../types/reservations.types';
import { normalizeMewsHousekeepingState } from '../../utils/mewsHousekeeping';

export type OpsCat = 's' | 'vs' | 'vc';
export type OpsUnitSt = 'occ' | 'dirty' | 'doing' | 'cleaned' | 'insp' | 'ready';
export type OpsBoardMode = 'multi' | 'single';

export type OpsUnit = {
  id: string;
  n: string;
  cat: OpsCat;
  /** Badge sous le nom (room type Multi / ville Single). */
  badge?: string;
  st?: OpsUnitSt;
  hs?: 'OutOfOrder' | 'OutOfService';
  why?: string;
  dep?: string;
  dep2?: string;
  assign?: string | null;
  who?: string;
  since?: number;
  guest?: string;
  rec?: string;
  arr?: string;
  pack?: string;
  packdone?: boolean;
  /** Housekeeping brut room (Multi). */
  hk?: string | null;
};

export type OpsListingInput = {
  id: string;
  name: string;
  city?: string;
  occupancyStatus?: string | null;
  cleanlinessStatus_v2?: string | null;
};

export type OpsArrival = {
  id: string;
  h: string;
  g: string;
  room: string;
  pack: 'prep' | 'done' | 'todo';
  here: boolean;
  note?: string;
};

export type OpsAlert = { k: 'crit' | 'warn' | 'photo'; t: string; s: string };

export type OpsRoomInput = {
  id: string;
  name: string;
  roomTypeName?: string;
  housekeepingState?: string | null;
};

function listingIdOf(r: Reservation): string {
  return String(r.sojoriId || r.listingMapId || r.listing?._id || '').trim();
}

function sameId(a?: string | null, b?: string | null): boolean {
  return Boolean(a && b && String(a) === String(b));
}

function isoDay(d: Date = new Date()): string {
  const z = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
}

function dayKey(raw?: Date | string | null): string {
  if (!raw) return '';
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return isoDay(d);
}

function fmtHm(raw?: string | Date | null): string {
  if (!raw) return '';
  if (typeof raw === 'string') {
    const m = raw.match(/(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}h${m[2]}`;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}h${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return raw;
  }
  return `${String(raw.getHours()).padStart(2, '0')}h${String(raw.getMinutes()).padStart(2, '0')}`;
}

export function opsCatFromRoomType(name?: string | null): OpsCat {
  const s = String(name || '').toLowerCase();
  if (s.includes('suite')) return 's';
  if (s.includes('signature')) return 'vs';
  if (s.includes('confort') || s.includes('comfort')) return 'vc';
  if (s.includes('villa')) return 'vs';
  return 'vc';
}

function isCancelled(r: Reservation): boolean {
  const st = String(r.status || '').toLowerCase();
  return st.includes('cancel');
}

function isDepartedGuest(r: Reservation, today: string): boolean {
  const cs = String(r.customerStatus || '').toLowerCase();
  if (cs === 'departed') return true;
  const mews = String(r.mewsState || '').toLowerCase();
  if (mews === 'processed') return true;
  const dep = dayKey(r.departureDate);
  if (dep && dep < today) return true;
  return false;
}

function isInHouse(r: Reservation, today: string): boolean {
  if (isCancelled(r) || isDepartedGuest(r, today)) return false;
  const arr = dayKey(r.arrivalDate);
  const dep = dayKey(r.departureDate);
  if (!arr || !dep) return false;
  if (arr > today || dep < today) return false;
  // Jour de départ : encore sur place seulement si pas departed / Processed
  if (dep === today) {
    const cs = String(r.customerStatus || '').toLowerCase();
    const mews = String(r.mewsState || '').toLowerCase();
    if (cs === 'expected') return false;
    if (mews === 'confirmed' && cs !== 'arrived' && cs !== 'on_site') return false;
  }
  const mews = String(r.mewsState || '').toLowerCase();
  if (mews === 'started') return true;
  const st = String(r.status || '');
  if (st === 'Inside') return true;
  const cs = String(r.customerStatus || '').toLowerCase();
  if (cs === 'arrived' || cs === 'on_site') return true;
  // Séjour qui chevauche aujourd’hui, statut actif
  if (arr <= today && dep >= today && ['Confirmed', 'Pending', 'Started', 'Inside'].includes(st)) {
    if (arr === today && cs === 'expected' && mews !== 'started') return false;
    return dep > today || cs === 'arrived' || cs === 'on_site' || mews === 'started';
  }
  return false;
}

export function buildOpsBoardModel(input: {
  rooms: OpsRoomInput[];
  arrivals: Reservation[];
  departures: Reservation[];
  stays: Reservation[];
  listingId: string;
  today?: string;
}): {
  units: OpsUnit[];
  arrivals: OpsArrival[];
  alerts: OpsAlert[];
  stats: { deps: number; recs: number; arrs: number; hs: number; menDone: number; menTot: number; inspDone: number; inspTot: number; packDone: number };
} {
  const today = input.today || isoDay();
  const lid = input.listingId;

  const stays = input.stays.filter((r) => sameId(listingIdOf(r), lid) && !isCancelled(r));
  const arrivalsRes = input.arrivals.filter((r) => sameId(listingIdOf(r), lid) && !isCancelled(r));
  const depsRes = input.departures.filter((r) => sameId(listingIdOf(r), lid) && !isCancelled(r));

  const byRoom = new Map<string, Reservation>();
  for (const r of stays) {
    if (!r.roomId) continue;
    if (!isInHouse(r, today)) continue;
    const prev = byRoom.get(r.roomId);
    if (!prev) byRoom.set(r.roomId, r);
  }

  const depByRoom = new Map<string, Reservation>();
  for (const r of depsRes) {
    if (r.roomId) depByRoom.set(String(r.roomId), r);
  }

  const arrByRoom = new Map<string, Reservation>();
  for (const r of arrivalsRes) {
    if (r.roomId) arrByRoom.set(String(r.roomId), r);
  }

  const units: OpsUnit[] = input.rooms.map((room) => {
    const hk = normalizeMewsHousekeepingState(room.housekeepingState);
    const cat = opsCatFromRoomType(room.roomTypeName);
    const base: OpsUnit = { id: room.id, n: room.name, cat, hk };

    if (hk === 'OutOfOrder' || hk === 'OutOfService') {
      return {
        ...base,
        hs: hk,
        why: hk === 'OutOfOrder' ? 'Hors service' : 'Hors service',
      };
    }

    const guest = byRoom.get(room.id);
    if (guest) {
      const depHm = fmtHm(guest.checkOutTime || guest.actualDepartureTime);
      const depDay = dayKey(guest.departureDate);
      return {
        ...base,
        st: 'occ',
        guest: guest.guestName || 'Guest',
        dep2: depDay === today ? `Départ prévu ${depHm || '—'}` : undefined,
      };
    }

    const dep = depByRoom.get(room.id);
    const arr = arrByRoom.get(room.id);

    if (hk === 'Dirty' || (!hk && dep)) {
      return {
        ...base,
        st: 'dirty',
        dep: dep ? fmtHm(dep.actualDepartureTime || dep.checkOutTime) || '—' : undefined,
        assign: null,
      };
    }

    if (hk === 'Clean') {
      return {
        ...base,
        st: 'cleaned',
      };
    }

    // Inspected (ou Clean déjà gouvernée) → prête
    if (hk === 'Inspected' || !hk) {
      const packLabel = arr
        ? 'pack à préparer'
        : 'aucune arrivée aujourd’hui';
      return {
        ...base,
        st: 'ready',
        arr: arr
          ? `${arr.guestName || 'Guest'} · ${fmtHm(arr.checkInTime || arr.arrival_time) || '—'}`
          : '—',
        pack: packLabel,
        packdone: !arr,
      };
    }

    return { ...base, st: 'dirty', assign: null };
  });

  const arrivals: OpsArrival[] = arrivalsRes
    .slice()
    .sort((a, b) => String(a.checkInTime || '').localeCompare(String(b.checkInTime || '')))
    .map((r) => {
      const cs = String(r.customerStatus || '').toLowerCase();
      const mews = String(r.mewsState || '').toLowerCase();
      const here = cs === 'arrived' || cs === 'on_site' || mews === 'started';
      const roomLabel = r.roomName || (r.roomId ? units.find((u) => u.id === r.roomId)?.n : '') || '—';
      const note =
        r.roomName && r.roomTypeName
          ? undefined
          : undefined;
      return {
        id: r.id,
        h: fmtHm(r.checkInTime || r.arrival_time) || '—',
        g: r.guestName || 'Guest',
        room: roomLabel,
        pack: here ? 'done' : 'todo',
        here,
        note,
      };
    });

  const alerts: OpsAlert[] = [];
  for (const u of units) {
    if (u.st === 'dirty' && !u.assign) {
      alerts.push({
        k: 'crit',
        t: `${u.n} — ménage non assigné`,
        s: u.dep
          ? `Départ déclaré à ${u.dep} · aucun staff assigné`
          : 'À nettoyer · pas encore d’assignation',
      });
    }
  }
  for (const a of arrivals) {
    if (!a.here && a.pack === 'todo') {
      alerts.push({
        k: 'warn',
        t: `${a.room} — arrivée à ${a.h}`,
        s: `Pack bienvenue à préparer pour ${a.g}`,
      });
    }
  }

  const active = units.filter((u) => !u.hs);
  const dirtyOrDoing = active.filter((u) => u.st === 'dirty' || u.st === 'doing' || u.st === 'cleaned' || u.st === 'insp');
  const menTot = Math.max(dirtyOrDoing.length + active.filter((u) => u.st === 'ready' && depByRoom.has(u.id)).length, depsRes.length) || depsRes.length;
  const menDone = active.filter((u) => u.st === 'ready' || u.st === 'cleaned' || u.st === 'insp').length;
  const inspTot = active.filter((u) => u.st === 'cleaned' || u.st === 'insp' || u.st === 'ready').length || 1;
  const inspDone = active.filter((u) => u.st === 'ready').length;

  return {
    units,
    arrivals,
    alerts,
    stats: {
      deps: depsRes.length,
      recs: 0,
      arrs: arrivals.length,
      hs: units.filter((u) => u.hs).length,
      menDone,
      menTot: Math.max(menTot, 1),
      inspDone,
      inspTot: Math.max(inspTot, 1),
      packDone: arrivals.filter((a) => a.pack === 'done' || a.here).length,
    },
  };
}

export function isNommosListingName(name?: string | null): boolean {
  return /nommos/i.test(String(name || ''));
}

/** Extrait rooms Multi depuis listing compact / forCalendar / raw. */
export function extractOpsRoomsFromListing(listing: {
  roomTypes?: Array<{
    name?: string;
    roomTypeName?: string;
    otaDisplayName?: string;
    rooms?: Array<{
      id?: string;
      _id?: string;
      name?: string;
      roomName?: string;
      roomNumber?: number;
      housekeepingState?: string | null;
    }>;
  }>;
  raw?: Record<string, unknown>;
} | null | undefined): OpsRoomInput[] {
  if (!listing) return [];
  const rawRt = Array.isArray(listing.raw?.roomTypes)
    ? (listing.raw?.roomTypes as unknown[])
    : [];
  const rts =
    (listing.roomTypes && listing.roomTypes.length > 0
      ? listing.roomTypes
      : rawRt.map((rt) => {
          const row = (rt || {}) as Record<string, unknown>;
          return {
            name:
              String(row.otaDisplayName || row.roomTypeName || row.name || '') ||
              undefined,
            rooms: Array.isArray(row.rooms)
              ? (row.rooms as Array<Record<string, unknown>>).map((rm) => ({
                  id: String(rm._id || rm.id || ''),
                  name: String(rm.roomName || rm.name || '') || undefined,
                  roomNumber:
                    typeof rm.roomNumber === 'number' ? rm.roomNumber : undefined,
                  housekeepingState: (rm.housekeepingState as string) || null,
                }))
              : [],
          };
        })) || [];

  const rooms: OpsRoomInput[] = [];
  for (const rt of rts) {
    const rtName = rt.name || rt.roomTypeName || rt.otaDisplayName || '';
    for (const rm of rt.rooms || []) {
      const id = String(rm.id || rm._id || '').trim();
      const name =
        String(rm.name || rm.roomName || '').trim() ||
        (rm.roomNumber != null ? `Chambre ${rm.roomNumber}` : '');
      if (!id || !name) continue;
      rooms.push({
        id,
        name,
        roomTypeName: rtName,
        housekeepingState: rm.housekeepingState || null,
      });
    }
  }
  return rooms;
}

/**
 * Single — 1 carte = 1 listing owner.
 * Statuts : occupancyStatus + cleanlinessStatus_v2 (+ résas jour).
 * dirty / in_progress = ménage pas (encore) fait.
 */
export function buildOpsBoardSingleModel(input: {
  listings: OpsListingInput[];
  arrivals: Reservation[];
  departures: Reservation[];
  stays: Reservation[];
  today?: string;
}): {
  units: OpsUnit[];
  arrivals: OpsArrival[];
  alerts: OpsAlert[];
  stats: {
    deps: number;
    recs: number;
    arrs: number;
    hs: number;
    menDone: number;
    menTot: number;
    inspDone: number;
    inspTot: number;
    packDone: number;
  };
} {
  const today = input.today || isoDay();
  const listingIds = new Set(input.listings.map((l) => l.id));

  const inScope = (r: Reservation) =>
    listingIds.has(listingIdOf(r)) && !isCancelled(r);

  const stays = input.stays.filter(inScope);
  const arrivalsRes = input.arrivals.filter(inScope);
  const depsRes = input.departures.filter(inScope);

  const stayByListing = new Map<string, Reservation>();
  for (const r of stays) {
    const lid = listingIdOf(r);
    if (!isInHouse(r, today)) continue;
    if (!stayByListing.has(lid)) stayByListing.set(lid, r);
  }

  const depByListing = new Map<string, Reservation>();
  for (const r of depsRes) {
    const lid = listingIdOf(r);
    if (lid) depByListing.set(lid, r);
  }

  const arrByListing = new Map<string, Reservation>();
  for (const r of arrivalsRes) {
    const lid = listingIdOf(r);
    if (lid) arrByListing.set(lid, r);
  }

  const nameById = new Map(input.listings.map((l) => [l.id, l.name]));

  const units: OpsUnit[] = input.listings.map((listing) => {
    const base: OpsUnit = {
      id: listing.id,
      n: listing.name,
      cat: 'vc',
      badge: listing.city || 'Single',
    };

    const guest = stayByListing.get(listing.id);
    const occDb = String(listing.occupancyStatus || '').toLowerCase() === 'occupied';
    if (guest || occDb) {
      const g = guest;
      const depHm = g ? fmtHm(g.checkOutTime || g.actualDepartureTime) : '';
      const depDay = g ? dayKey(g.departureDate) : '';
      return {
        ...base,
        st: 'occ' as const,
        guest: g?.guestName || 'Occupé',
        dep2: depDay === today ? `Départ prévu ${depHm || '—'}` : undefined,
      };
    }

    const dep = depByListing.get(listing.id);
    const arr = arrByListing.get(listing.id);
    const v2 = String(listing.cleanlinessStatus_v2 || 'clean').toLowerCase();

    if (v2 === 'dirty') {
      return {
        ...base,
        st: 'dirty' as const,
        dep: dep ? fmtHm(dep.actualDepartureTime || dep.checkOutTime) || '—' : undefined,
        assign: null,
      };
    }

    if (v2 === 'in_progress') {
      return {
        ...base,
        st: 'doing' as const,
        assign: null,
      };
    }

    // Départ du jour + pas encore clean → dirty (tâche ménage)
    if (dep && v2 !== 'clean') {
      return {
        ...base,
        st: 'dirty' as const,
        dep: fmtHm(dep.actualDepartureTime || dep.checkOutTime) || '—',
        assign: null,
      };
    }

    // clean (tâche faite) → prête
    if (arr) {
      return {
        ...base,
        st: 'ready' as const,
        arr: `${arr.guestName || 'Guest'} · ${fmtHm(arr.checkInTime || arr.arrival_time) || '—'}`,
        pack: 'pack à préparer',
        packdone: false,
      };
    }

    return {
      ...base,
      st: 'ready' as const,
      arr: '—',
      pack: 'aucune arrivée aujourd’hui',
      packdone: true,
    };
  });

  const arrivals: OpsArrival[] = arrivalsRes
    .slice()
    .sort((a, b) => String(a.checkInTime || '').localeCompare(String(b.checkInTime || '')))
    .map((r) => {
      const cs = String(r.customerStatus || '').toLowerCase();
      const mews = String(r.mewsState || '').toLowerCase();
      const here = cs === 'arrived' || cs === 'on_site' || mews === 'started' || String(r.status || '') === 'Inside';
      const lid = listingIdOf(r);
      return {
        id: r.id,
        h: fmtHm(r.checkInTime || r.arrival_time) || '—',
        g: r.guestName || 'Guest',
        room: nameById.get(lid) || '—',
        pack: here ? ('done' as const) : ('todo' as const),
        here,
      };
    });

  const alerts: OpsAlert[] = [];
  for (const u of units) {
    if (u.st === 'dirty' && !u.assign) {
      alerts.push({
        k: 'crit',
        t: `${u.n} — ménage à faire`,
        s: u.dep
          ? `Départ déclaré à ${u.dep} · pas encore nettoyé`
          : 'Status dirty · tâche ménage pas terminée',
      });
    }
    if (u.st === 'doing') {
      alerts.push({
        k: 'warn',
        t: `${u.n} — ménage en cours`,
        s: 'Status in_progress · tâche pas encore terminée',
      });
    }
  }
  for (const a of arrivals) {
    if (!a.here && a.pack === 'todo') {
      alerts.push({
        k: 'warn',
        t: `${a.room} — arrivée à ${a.h}`,
        s: `Arrivée prévue · ${a.g}`,
      });
    }
  }

  const active = units.filter((u) => !u.hs);
  const dirtyOrDoing = active.filter((u) => u.st === 'dirty' || u.st === 'doing');
  const menTot = Math.max(dirtyOrDoing.length + depsRes.length, 1);
  const menDone = active.filter((u) => u.st === 'ready' || u.st === 'cleaned' || u.st === 'insp').length;
  const inspTot = Math.max(active.filter((u) => u.st === 'cleaned' || u.st === 'insp' || u.st === 'ready').length, 1);
  const inspDone = active.filter((u) => u.st === 'ready').length;

  return {
    units,
    arrivals,
    alerts,
    stats: {
      deps: depsRes.length,
      recs: 0,
      arrs: arrivals.length,
      hs: 0,
      menDone,
      menTot,
      inspDone,
      inspTot,
      packDone: arrivals.filter((a) => a.pack === 'done' || a.here).length,
    },
  };
}

export { isoDay, dayKey, fmtHm, listingIdOf };
