/**
 * Ops Board live — Multi (Nommos rooms, prioritaire) ou Single (listings individuels).
 * Conflit Nommos / Single → priorité Multi.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchMewsPocStatus } from '../../services/channelsDashboardApi';
import { listingsService } from '../../services/listingsService';
import { reservationsService } from '../../services/reservationsService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import type { Reservation } from '../../types/reservations.types';
import type { ListingSummary } from '../../types/listings.types';
import {
  buildOpsBoardModel,
  buildOpsBoardSingleModel,
  extractOpsRoomsFromListing,
  isNommosListingName,
  isoDay,
  type OpsAlert,
  type OpsArrival,
  type OpsListingInput,
  type OpsRoomInput,
  type OpsUnit,
  type OpsBoardMode,
} from './opsBoardMap';

export type { OpsBoardMode };

export type OpsBoardLiveState = {
  loading: boolean;
  error: string | null;
  hotelName: string;
  listingId: string | null;
  mode: OpsBoardMode;
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
  refreshedAt: Date | null;
  refresh: () => void;
};

const EMPTY_STATS = {
  deps: 0,
  recs: 0,
  arrs: 0,
  hs: 0,
  menDone: 0,
  menTot: 1,
  inspDone: 0,
  inspTot: 1,
  packDone: 0,
};

async function fetchDayReservations(ownerOpt: string | undefined, today: string) {
  const status = 'Confirmed,Pending,Started,Inside';
  const [arrRes, depRes, stayRes] = await Promise.all([
    reservationsService.getList({
      filter: 'CHECKIN_TODAY',
      limit: 500,
      status,
      filterOwnerId: ownerOpt,
    }),
    reservationsService.getList({
      filter: 'CHECKOUT_TODAY',
      limit: 500,
      status,
      filterOwnerId: ownerOpt,
    }),
    reservationsService.getList({
      dateType: 'overlap',
      startDate: today,
      endDate: today,
      limit: 500,
      status,
      filterOwnerId: ownerOpt,
      sortField: 'checkin',
      sortOrder: 'asc',
    }),
  ]);
  return {
    arrivals: (arrRes.data || []) as Reservation[],
    departures: (depRes.data || []) as Reservation[],
    stays: (stayRes.data || []) as Reservation[],
  };
}

function pickNommosMulti(items: ListingSummary[]): ListingSummary | undefined {
  return (
    items.find(
      (l) => String(l.propertyUnit || '') === 'Multi' && isNommosListingName(l.name),
    ) ||
    items.find((l) => isNommosListingName(l.name) && String(l.propertyUnit || '') === 'Multi') ||
    items.find((l) => isNommosListingName(l.name))
  );
}

function pickMultiEstablishment(items: ListingSummary[]): ListingSummary | undefined {
  return (
    pickNommosMulti(items) ||
    items.find((l) => String(l.propertyUnit || '') === 'Multi')
  );
}

function roomsFromCalendarRow(hit: Record<string, unknown>): OpsRoomInput[] {
  const roomTypes = Array.isArray(hit.roomTypes) ? hit.roomTypes : [];
  return extractOpsRoomsFromListing({
    roomTypes: roomTypes.map((rt) => {
      const row = (rt || {}) as Record<string, unknown>;
      const rooms = Array.isArray(row.rooms) ? row.rooms : [];
      return {
        name: String(row.otaDisplayName || row.roomTypeName || row.name || ''),
        rooms: rooms.map((rm) => {
          const r = (rm || {}) as Record<string, unknown>;
          return {
            id: String(r._id || r.id || ''),
            name: String(r.roomName || r.name || ''),
            roomNumber: typeof r.roomNumber === 'number' ? r.roomNumber : undefined,
            housekeepingState: (r.housekeepingState as string) || null,
          };
        }),
      };
    }),
  });
}

async function loadMultiRooms(
  resolvedId: string,
  items: ListingSummary[],
  ownerOpt: string | undefined,
  depth = 0,
): Promise<{ rooms: OpsRoomInput[]; listingName?: string; listingId: string }> {
  let listing = items.find((l) => l.id === resolvedId);
  let rooms = extractOpsRoomsFromListing(listing);
  let listingId = resolvedId;
  const searchName = listing?.name?.trim() || 'Nommos';

  if (rooms.length === 0) {
    const byName = await listingsService.getListings({
      page: 0,
      limit: 50,
      compact: true,
      name: searchName.slice(0, 40),
      filterOwnerId: ownerOpt,
    });
    const hit =
      byName.data.items.find((l) => l.id === resolvedId) ||
      pickMultiEstablishment(byName.data.items) ||
      listing;
    if (hit) {
      listing = hit;
      listingId = hit.id;
      rooms = extractOpsRoomsFromListing(hit);
    }
  }

  if (rooms.length === 0) {
    const cal = await listingsService.getListingsForCalendar(0, 120, {
      active: true,
      filterOwnerId: ownerOpt,
      name: isNommosListingName(searchName) ? 'Nommos' : undefined,
    });
    const hit =
      cal.data.find((row: Record<string, unknown>) =>
        String(row._id || row.id) === listingId,
      ) ||
      cal.data.find(
        (row: Record<string, unknown>) =>
          String(row.propertyUnit || '') === 'Multi' &&
          String(row._id || row.id) === resolvedId,
      ) ||
      cal.data.find(
        (row: Record<string, unknown>) =>
          isNommosListingName(String(row.name || '')) &&
          String(row.propertyUnit || '') === 'Multi',
      );

    if (hit) {
      rooms = roomsFromCalendarRow(hit as Record<string, unknown>);
      listingId = String(hit._id || hit.id || listingId);
      return {
        rooms,
        listingName: String(hit.name || listing?.name || ''),
        listingId,
      };
    }
  }

  if (rooms.length === 0 && ownerOpt && depth === 0) {
    return loadMultiRooms(resolvedId, items, undefined, 1);
  }

  return { rooms, listingName: listing?.name, listingId };
}

export function useOpsBoardLive(
  mode: OpsBoardMode,
  pollMs = 0,
  enabled = true,
): OpsBoardLiveState {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotelName, setHotelName] = useState(
    mode === 'multi' ? 'Nommos Beach Resort' : 'Listings Single',
  );
  const [listingId, setListingId] = useState<string | null>(null);
  const [units, setUnits] = useState<OpsUnit[]>([]);
  const [arrivals, setArrivals] = useState<OpsArrival[]>([]);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [tick, setTick] = useState(0);
  const hasLoadedRef = useRef(false);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    hasLoadedRef.current = false;
    setUnits([]);
    setArrivals([]);
    setAlerts([]);
    setStats(EMPTY_STATS);
    setError(null);
    setLoading(true);
  }, [mode]);

  useEffect(() => {
    if (!scopeFetchReady || !enabled) return;
    let cancelled = false;

    (async () => {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);
      try {
        const ownerOpt = requestOwnerId || undefined;
        const today = isoDay();

        const listRes = await listingsService.getListings({
          page: 0,
          limit: 500,
          compact: true,
          useActiveFilter: true,
          active: true,
          filterOwnerId: ownerOpt,
        });
        const items = listRes.data.items || [];
        const resas = await fetchDayReservations(ownerOpt, today);

        if (mode === 'single') {
          const singles = items.filter((l) => {
            if (String(l.propertyUnit || '') === 'Multi') return false;
            if (isNommosListingName(l.name)) return false;
            return true;
          });

          if (singles.length === 0) {
            throw new Error('Aucun listing Single actif dans le scope owner.');
          }

          const listings: OpsListingInput[] = singles.map((l) => ({
            id: l.id,
            name: l.name,
            city: l.city,
            occupancyStatus: l.occupancyStatus || null,
            cleanlinessStatus_v2: l.cleanlinessStatus_v2 || null,
          }));

          const model = buildOpsBoardSingleModel({
            listings,
            arrivals: resas.arrivals,
            departures: resas.departures,
            stays: resas.stays,
            today,
          });

          if (cancelled) return;
          hasLoadedRef.current = true;
          setListingId(null);
          setHotelName(`Single · ${singles.length} listings`);
          setUnits(model.units);
          setArrivals(model.arrivals);
          setAlerts(model.alerts);
          setStats(model.stats);
          setRefreshedAt(new Date());
          return;
        }

        // Multi — Nommos prioritaire
        let resolvedId: string | null = null;
        let resolvedName = 'Nommos Beach Resort';
        try {
          const st = await fetchMewsPocStatus();
          const body = st.data as {
            data?: {
              hotelListingId?: string;
              enterpriseName?: string;
              hotelName?: string;
            };
            hotelListingId?: string;
          };
          const data = body?.data || body;
          const hid = String(data?.hotelListingId || '').trim();
          if (hid) {
            resolvedId = hid;
            const en =
              (data as { enterpriseName?: string; hotelName?: string }).enterpriseName ||
              (data as { hotelName?: string }).hotelName;
            if (en) resolvedName = String(en);
          }
        } catch {
          /* listings fallback */
        }

        const multiHit = pickMultiEstablishment(items);
        if (!resolvedId && multiHit) {
          resolvedId = multiHit.id;
          resolvedName = multiHit.name;
        } else if (resolvedId) {
          const hit = items.find((l) => l.id === resolvedId) || multiHit;
          if (hit?.name) resolvedName = hit.name;
          if (multiHit && multiHit.id !== resolvedId) {
            const pocRooms = extractOpsRoomsFromListing(
              items.find((l) => l.id === resolvedId),
            );
            const multiRooms = extractOpsRoomsFromListing(multiHit);
            if (pocRooms.length === 0 && multiRooms.length > 0) {
              resolvedId = multiHit.id;
              resolvedName = multiHit.name;
            }
          }
        }

        if (!resolvedId) {
          throw new Error('Aucun établissement Multi dans le scope PM.');
        }

        const loaded = await loadMultiRooms(resolvedId, items, ownerOpt);
        if (loaded.listingName) resolvedName = loaded.listingName;
        resolvedId = loaded.listingId;

        if (loaded.rooms.length === 0) {
          throw new Error(
            'Aucune room Nommos trouvée — vérifier roomTypes / pull listings Multi.',
          );
        }

        const model = buildOpsBoardModel({
          rooms: loaded.rooms,
          arrivals: resas.arrivals,
          departures: resas.departures,
          stays: resas.stays,
          listingId: resolvedId,
          today,
        });

        if (cancelled) return;
        hasLoadedRef.current = true;
        setListingId(resolvedId);
        setHotelName(resolvedName);
        setUnits(model.units);
        setArrivals(model.arrivals);
        setAlerts(model.alerts);
        setStats(model.stats);
        setRefreshedAt(new Date());
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeFetchReady, requestOwnerId, tick, mode, enabled]);

  useEffect(() => {
    if (pollMs <= 0 || !enabled) return;
    const id = window.setInterval(() => setTick((t) => t + 1), pollMs);
    return () => window.clearInterval(id);
  }, [pollMs]);

  return {
    loading,
    error,
    hotelName,
    listingId,
    mode,
    units,
    arrivals,
    alerts,
    stats,
    refreshedAt,
    refresh,
  };
}
