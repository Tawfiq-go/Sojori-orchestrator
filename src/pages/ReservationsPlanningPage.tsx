/**
 * Vue Planning Réservations — même design que /tasks/planning (StayView)
 * • 30 jours mini-map, 14 jours visibles
 * • Filtres réservation (Confirmées / En attente) + légende canaux
 * • Barres Gantt : arrivée 40%, départ 40% (computeReservationBarLayout)
 * • Navigation flèches : rechargement données uniquement (pas de spinner pleine page)
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
import { useAuth } from '../hooks/useAuth';
import type { Reservation } from '../types/reservations.types';
import type { ListingSummary } from '../types/listings.types';

/** Jours passés / futurs visibles dans le planning (évite de masquer les séjours récents) */
const PLANNING_LOOKBACK_DAYS = 30;
const PLANNING_FORWARD_DAYS = 45;
/** Décalage initial du curseur : on cadre J-2 → J+11 (14j visibles dont aujourd'hui en 3e position),
 *  l'utilisateur peut ensuite naviguer dans la fenêtre 75j. */
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
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - PLANNING_INITIAL_BACK_DAYS);
    return d;
  });
  const [daysCount] = useState(PLANNING_LOOKBACK_DAYS + PLANNING_FORWARD_DAYS);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationalByListing, setOperationalByListing] = useState<Map<string, any>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);

  const windowRequestIdRef = useRef(0);
  /** Évite un double fetch fenêtre juste après le chargement initial / refreshKey */
  const skipNextWindowOnlyFetchRef = useRef(false);

  const fetchListings = useCallback(async () => {
    const listingsResponse = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      limit: 1000,
    });
    setListings(listingsResponse.data.items);
  }, []);

  const fetchWindowData = useCallback(async () => {
    const requestId = ++windowRequestIdRef.current;
    setIsRefreshing(true);
    setError(null);

    try {
      const apiStart = format(startDate, 'yyyy-MM-dd');
      const apiEnd = format(addDays(startDate, daysCount), 'yyyy-MM-dd');

      const reservationsResponse = await reservationsService.getList({
        limit: 1000,
        status: 'Confirmed,Pending,Inside',
        dateType: 'arrival_or_departure',
        startDate: apiStart,
        endDate: apiEnd,
      });

      if (requestId !== windowRequestIdRef.current) return;
      setReservations(reservationsResponse.data);

      const ownerId = scope.canAccessAllOwners ? undefined : scope.ownerId;
      if (ownerId || scope.canAccessAllOwners) {
        const planning = await tasksService.getReservationPlanning({
          startDate: apiStart,
          endDate: apiEnd,
          ownerId,
        });
        if (requestId !== windowRequestIdRef.current) return;
        const map = new Map<string, any>();
        planning.data?.listings?.forEach((l: any) => {
          const id = String(l.listingId || l._id || '');
          if (id) map.set(id, l);
        });
        setOperationalByListing(map);
      }
    } catch (e) {
      if (requestId !== windowRequestIdRef.current) return;
      setError(e instanceof Error ? e.message : 'Erreur chargement données');
    } finally {
      if (requestId === windowRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [startDate, daysCount, scope.canAccessAllOwners, scope.ownerId]);

  /** Premier chargement ou refresh propreté : listings + fenêtre */
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const isBootstrap = !calendarReady;

    void (async () => {
      if (isBootstrap) setIsLoading(true);
      setError(null);
      try {
        await fetchListings();
        if (cancelled) return;
        skipNextWindowOnlyFetchRef.current = true;
        await fetchWindowData();
        if (cancelled) return;
        setCalendarReady(true);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement données');
        if (isBootstrap) {
          setListings([]);
          setReservations([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calendarReady lu une fois au mount du cycle
  }, [authLoading, refreshKey, fetchListings, fetchWindowData]);

  /** Flèches / date picker : réservations + statuts opérationnels uniquement */
  useEffect(() => {
    if (authLoading || !calendarReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData();
  }, [startDate, authLoading, calendarReady, fetchWindowData]);

  const listingRows: ListingRow[] = useMemo(() => {
    if (listings.length === 0) return [];

    const windowStart = startDate;
    const windowEnd = addDays(startDate, daysCount);

    const reservationsByListing = new Map<string, Reservation[]>();
    reservations.forEach((res) => {
      const listingId = resolveListingId(res);
      if (!listingId) return;

      const arrival = toIsoDate(res.arrivalDate);
      const departure = toIsoDate(res.departureDate);
      if (!arrival || !departure) return;

      const arr = new Date(arrival);
      const dep = new Date(departure);
      if (dep < windowStart || arr > windowEnd) return;

      if (!reservationsByListing.has(listingId)) {
        reservationsByListing.set(listingId, []);
      }
      reservationsByListing.get(listingId)!.push(res);
    });

    return listings.map((listing) => {
      const listingId = listing.id;
      const resas = reservationsByListing.get(listingId) || [];
      const op = operationalByListing.get(listingId);
      const raw = listing.raw as Record<string, unknown> | undefined;

      return {
        listingId,
        listingName: listing.name || 'Sans nom',
        city: listing.city || 'Sans ville',
        cleanlinessStatus_v2:
          op?.cleanlinessStatus_v2 ||
          (raw?.cleanlinessStatus_v2 as string) ||
          (raw?.cleanlinessStatus as string) ||
          'clean',
        cleanlinessStatus: op?.cleanlinessStatus || (raw?.cleanlinessStatus as string),
        occupancyStatus: op?.occupancyStatus || (raw?.occupancyStatus as string) || 'vacant',
        cleanlinessEmergency: Boolean(op?.cleanlinessEmergency || raw?.cleanlinessEmergency),
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
  }, [listings, reservations, startDate, daysCount, operationalByListing]);

  const handleCleanlinessChange = useCallback(async (listingId: string, status: DisplayCleanliness) => {
    const result = await cleanlinessService.updateListingStatus(listingId, status);
    if (!result.success) {
      throw new Error(result.message || 'Échec mise à jour propreté');
    }
    setRefreshKey((k) => k + 1);
  }, []);

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
              opacity: isRefreshing ? 0.72 : 1,
              transition: 'opacity 0.2s ease',
              pointerEvents: isRefreshing ? 'none' : 'auto',
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
