/**
 * Vue Planning Réservations — même design que /tasks/planning (StayView)
 * • Grille stable : listings actifs (compact) puis match réservations fenêtre
 * • Propreté (srv-task planning) chargée en arrière-plan — n bloque pas l'affichage
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow } from '../components/calendar-views/_shared';
import reservationsService from '../services/reservationsService';
import listingsService from '../services/listingsService';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import cleanlinessService from '../services/cleanlinessService';
import type { DisplayCleanliness } from '../utils/cleanlinessDisplay';
import {
  getCachedPlanningListings,
  setCachedPlanningListings,
  invalidatePlanningListingsCache,
} from '../utils/planningListingsCache';
import { useAuth } from '../hooks/useAuth';
import type { Reservation } from '../types/reservations.types';
import type { ListingSummary } from '../types/listings.types';

const PLANNING_LOOKBACK_DAYS = 30;
const PLANNING_FORWARD_DAYS = 45;
const PLANNING_INITIAL_BACK_DAYS = 2;

function normalizeMongoId(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as { _id?: unknown; toString?: () => string };
    if (o._id != null) return String(o._id);
    if (typeof o.toString === 'function') {
      const s = o.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  const s = String(value);
  return s && s !== '[object Object]' ? s : undefined;
}

function resolveListingId(res: Reservation): string | undefined {
  const anyRes = res as Reservation & {
    listing?: { _id?: unknown };
    listingId?: unknown;
  };
  return (
    normalizeMongoId(anyRes.sojoriId) ||
    normalizeMongoId(anyRes.listingMapId) ||
    normalizeMongoId(anyRes.listingId) ||
    normalizeMongoId(anyRes.listing?._id)
  );
}

function mapReservationStatus(status?: string): 'confirmed' | 'pending' {
  const s = (status || '').toLowerCase();
  if (s.includes('confirm')) return 'confirmed';
  return 'pending';
}

function toIsoDate(d: Date | string | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

export function ReservationsPlanningPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const listingsCacheKey = scope.ownerId || (scope.canAccessAllOwners ? 'admin' : 'unknown');

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - PLANNING_INITIAL_BACK_DAYS);
    return d;
  });
  const [daysCount] = useState(PLANNING_LOOKBACK_DAYS + PLANNING_FORWARD_DAYS);

  const [activeListings, setActiveListings] = useState<ListingSummary[]>(() => {
    return getCachedPlanningListings(listingsCacheKey) ?? [];
  });
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationalByListing, setOperationalByListing] = useState<Map<string, Record<string, unknown>>>(
    new Map(),
  );
  const windowRequestIdRef = useRef(0);
  const operationalRequestIdRef = useRef(0);
  const skipNextWindowOnlyFetchRef = useRef(false);
  const listingsHydratedRef = useRef(activeListings.length > 0);

  const windowRange = useCallback(() => {
    const apiStart = format(startDate, 'yyyy-MM-dd');
    const apiEnd = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
    return { apiStart, apiEnd };
  }, [startDate, daysCount]);

  const fetchActiveListings = useCallback(async () => {
    const cached = getCachedPlanningListings(listingsCacheKey);
    if (cached?.length) {
      setActiveListings(cached);
      listingsHydratedRef.current = true;
      return;
    }
    const res = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      compact: true,
      forListingsOverview: false,
      limit: 500,
    });
    setActiveListings(res.data.items);
    setCachedPlanningListings(listingsCacheKey, res.data.items);
    listingsHydratedRef.current = true;
  }, [listingsCacheKey]);

  const fetchReservationsWindow = useCallback(async (): Promise<Reservation[]> => {
    const { apiStart, apiEnd } = windowRange();
    const reservationsResponse = await reservationsService.getList({
      limit: 100,
      status: 'Confirmed,Pending,Inside',
      dateType: 'arrival_or_departure',
      startDate: apiStart,
      endDate: apiEnd,
    });
    return reservationsResponse.data;
  }, [windowRange]);

  /** srv-task planning — lent : badges propreté uniquement, non bloquant. */
  const fetchOperationalStatus = useCallback(async () => {
    const ownerId = scope.canAccessAllOwners ? undefined : scope.ownerId;
    if (!ownerId && !scope.canAccessAllOwners) return;

    const requestId = ++operationalRequestIdRef.current;
    const { apiStart, apiEnd } = windowRange();

    try {
      const planning = await tasksService.getReservationPlanning({
        startDate: apiStart,
        endDate: apiEnd,
        ownerId,
      });
      if (requestId !== operationalRequestIdRef.current) return;
      if (!planning?.data?.listings) return;

      const map = new Map<string, Record<string, unknown>>();
      planning.data.listings.forEach((l: Record<string, unknown>) => {
        const id = String(l.listingId || l._id || '');
        if (id) map.set(id, l);
      });
      setOperationalByListing(map);
    } catch {
      // Grille + résas restent utilisables sans badges opérationnels
    }
  }, [windowRange, scope.canAccessAllOwners, scope.ownerId]);

  const fetchWindowData = useCallback(
    async (opts?: { includeOperational?: boolean }) => {
      const requestId = ++windowRequestIdRef.current;
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchReservationsWindow();
        if (requestId !== windowRequestIdRef.current) return;
        setReservations(data);

        if (opts?.includeOperational !== false) {
          void fetchOperationalStatus();
        }
      } catch (e) {
        if (requestId !== windowRequestIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement données');
      } finally {
        if (requestId === windowRequestIdRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [fetchReservationsWindow, fetchOperationalStatus],
  );

  /** Bootstrap : listings (cache) + résas en parallèle → affichage ; propreté en async */
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const isBootstrap = !calendarReady;
    const skipListings = listingsHydratedRef.current && activeListings.length > 0;

    void (async () => {
      if (isBootstrap) setIsLoading(true);
      setError(null);
      try {
        skipNextWindowOnlyFetchRef.current = true;

        const tasks: Promise<void>[] = [];
        if (!skipListings) tasks.push(fetchActiveListings());
        tasks.push(
          fetchWindowData({ includeOperational: true }).then(() => undefined),
        );

        await Promise.all(tasks);
        if (cancelled) return;
        setCalendarReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement données');
        if (isBootstrap) {
          setActiveListings([]);
          setReservations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading]);

  /** Navigation dates : réservations + propreté (listings inchangés) */
  useEffect(() => {
    if (authLoading || !calendarReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData({ includeOperational: true });
  }, [startDate, authLoading, calendarReady, fetchWindowData]);

  const listingRows: ListingRow[] = useMemo(() => {
    if (activeListings.length === 0) return [];

    const windowStart = startDate;
    const windowEnd = addDays(startDate, daysCount);

    const reservationsByListing = new Map<string, Reservation[]>();
    for (const res of reservations) {
      const listingId = resolveListingId(res);
      if (!listingId) continue;

      const arrival = toIsoDate(res.arrivalDate);
      const departure = toIsoDate(res.departureDate);
      if (!arrival || !departure) continue;

      const arr = new Date(arrival);
      const dep = new Date(departure);
      if (dep < windowStart || arr > windowEnd) continue;

      const bucket = reservationsByListing.get(listingId);
      if (bucket) bucket.push(res);
      else reservationsByListing.set(listingId, [res]);
    }

    return activeListings.map((listing) => {
      const listingId = listing.id;
      const resas = reservationsByListing.get(listingId) || [];
      const op = operationalByListing.get(listingId);

      return {
        listingId,
        listingName: listing.name || String(op?.listingName || 'Sans nom'),
        city: listing.city || String(op?.city || 'Sans ville'),
        cleanlinessStatus_v2: String(op?.cleanlinessStatus_v2 || op?.cleanlinessStatus || 'clean'),
        cleanlinessStatus: op?.cleanlinessStatus as string | undefined,
        occupancyStatus: String(op?.occupancyStatus || 'vacant'),
        cleanlinessEmergency: Boolean(op?.cleanlinessEmergency),
        reservations: resas.map((r) => ({
          reservationId: String(r.id || (r as { _id?: string })._id || r.reservationNumber || ''),
          guestName: r.guestName || 'Guest',
          arrivalDate: toIsoDate(r.arrivalDate),
          departureDate: toIsoDate(r.departureDate),
          status: mapReservationStatus(r.status),
          channelName: r.channelName || 'direct',
          numberOfGuests: r.numberOfGuests || 0,
          reservationNumber: r.reservationNumber || '',
          timeline: [],
        })),
      };
    });
  }, [activeListings, reservations, startDate, daysCount, operationalByListing]);

  const handleCleanlinessChange = useCallback(
    async (listingId: string, status: DisplayCleanliness) => {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      invalidatePlanningListingsCache(listingsCacheKey);
      setOperationalByListing((prev) => {
        const next = new Map(prev);
        const row = { ...(next.get(listingId) || {}), listingId };
        if (result.data?.cleanlinessStatus_v2) {
          row.cleanlinessStatus_v2 = result.data.cleanlinessStatus_v2;
        }
        if (result.data?.cleanlinessStatus) {
          row.cleanlinessStatus = result.data.cleanlinessStatus;
        }
        if (result.data?.occupancyStatus) {
          row.occupancyStatus = result.data.occupancyStatus;
        }
        if (result.data?.cleanlinessEmergency != null) {
          row.cleanlinessEmergency = result.data.cleanlinessEmergency;
        }
        next.set(listingId, row);
        return next;
      });
    },
    [listingsCacheKey],
  );

  const goToday = useCallback(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - PLANNING_INITIAL_BACK_DAYS);
    setStartDate(d);
  }, []);

  const shiftDays = useCallback((delta: number) => {
    setStartDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + delta);
      return d;
    });
  }, []);

  const handleDateChange = useCallback((newDate: Date) => {
    const d = new Date(newDate);
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  }, []);

  const handleReservationClick = useCallback(
    (routeId: string) => {
      if (!routeId) return;
      navigate(`/reservations/${encodeURIComponent(routeId)}`);
    },
    [navigate],
  );

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Planning']}>
      <Box sx={{ bgcolor: '#f6f5f1', minHeight: '100vh' }}>
        {isLoading && !calendarReady && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        )}

        {calendarReady && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 2, px: 2 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {calendarReady && (
          <Box
            sx={{
              position: 'relative',
              opacity: isRefreshing ? 0.92 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            {isRefreshing && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 10,
                  right: 10,
                  zIndex: 100,
                  bgcolor: 'rgba(184,133,26,0.9)',
                  color: '#fff',
                  px: 2,
                  py: 1,
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  boxShadow: '0 4px 12px rgba(20,17,10,0.15)',
                  pointerEvents: 'none',
                }}
              >
                <CircularProgress size={14} sx={{ color: '#fff' }} />
                Mise à jour…
              </Box>
            )}

            <StayView
              variant="reservations"
              startDate={startDate}
              daysCount={daysCount}
              listings={listingRows}
              onReservationClick={handleReservationClick}
              onGoToday={goToday}
              onPrevDay={() => shiftDays(-1)}
              onNextDay={() => shiftDays(1)}
              onPrevWeek={() => shiftDays(-7)}
              onNextWeek={() => shiftDays(7)}
              onDateChange={handleDateChange}
              onCleanlinessChange={handleCleanlinessChange}
            />
          </Box>
        )}

        {!isLoading && !calendarReady && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
