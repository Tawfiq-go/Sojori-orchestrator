/**
 * Vue Planning Réservations — même design que /tasks/planning (StayView)
 * • Grille stable : listings actifs (compact) puis match réservations fenêtre
 * • Propreté (srv-task planning) chargée en arrière-plan — n bloque pas l'affichage
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { addDays, format, startOfDay } from 'date-fns';
import { Box, CircularProgress, Alert, useMediaQuery, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow } from '../components/calendar-views/_shared';
import reservationsService from '../services/reservationsService';
import listingsService from '../services/listingsService';
import { usePmTasksScope } from '../hooks/usePmTasksScope';
import cleanlinessService from '../services/cleanlinessService';
import type { DisplayCleanliness } from '../utils/cleanlinessDisplay';
import {
  OPERATIONAL_STATUS_CHANGED,
  mergeListingOperationalRow,
} from '../utils/operationalStatusStore';
import {
  getCachedPlanningListings,
  setCachedPlanningListings,
  invalidatePlanningListingsCache,
} from '../utils/planningListingsCache';
import { useAuth } from '../hooks/useAuth';
import type { Reservation } from '../types/reservations.types';
import type { ListingSummary } from '../types/listings.types';

import {
  getPlanningDefaultStartDate,
  PLANNING_FORWARD_DAYS,
  PLANNING_INITIAL_BACK_DAYS,
  PLANNING_LOOKBACK_DAYS,
} from '../utils/planningViewDates';

import {
  findListingForReservation,
  buildListingIdIndex,
  collectOrphanListingSeedsForOwner,
  mergeActiveAndOrphanListings,
  reservationOwnerId,
  resolveReservationListingId,
} from '../utils/planningListingMatch';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { loading: authLoading } = useAuth();
  const scope = usePmTasksScope();
  const listingsCacheKey = scope.scopeCacheKey;

  const [startDate, setStartDate] = useState<Date>(() => getPlanningDefaultStartDate());
  const [daysCount] = useState(PLANNING_LOOKBACK_DAYS + PLANNING_FORWARD_DAYS);
  const initialViewAlignedRef = useRef(false);

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
  const skipNextWindowOnlyFetchRef = useRef(false);
  const listingsHydratedRef = useRef(activeListings.length > 0);
  const [opSyncTick, setOpSyncTick] = useState(0);
  const [listFullscreen, setListFullscreen] = useState(false);

  useEffect(() => {
    if (!listFullscreen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setListFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [listFullscreen]);

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
    let items: ListingSummary[] = [];
    const res = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      compact: true,
      forListingsOverview: false,
      limit: 500,
      filterOwnerId: scope.filterOwnerId,
    });
    items = res.data.items;
    // Après migration owner/host : listings parfois non « active » → grille vide.
    if (items.length === 0 && scope.filterOwnerId) {
      const fallback = await listingsService.getListings({
        useActiveFilter: false,
        compact: true,
        forListingsOverview: false,
        limit: 500,
        filterOwnerId: scope.filterOwnerId,
      });
      items = fallback.data.items;
      if (items.length > 0) {
        console.warn('[ReservationsPlanning] fallback listings sans filtre active', {
          count: items.length,
          filterOwnerId: scope.filterOwnerId,
        });
      }
    }
    console.log('[ReservationsPlanning] fetchActiveListings', {
      count: items.length,
      sample: items.slice(0, 3).map((l) => ({
        id: l.id,
        name: l.name,
        occupancyStatus: l.occupancyStatus,
        cleanlinessStatus_v2: l.cleanlinessStatus_v2,
      })),
    });
    setActiveListings(items);
    setCachedPlanningListings(listingsCacheKey, items);
    listingsHydratedRef.current = true;
  }, [listingsCacheKey, scope.filterOwnerId]);

  useEffect(() => {
    setActiveListings([]);
    setReservations([]);
    listingsHydratedRef.current = false;
    setCalendarReady(false);
    invalidatePlanningListingsCache();
  }, [listingsCacheKey]);

  const fetchReservationsWindow = useCallback(async (): Promise<Reservation[]> => {
    const { apiStart, apiEnd } = windowRange();
    const reservationsResponse = await reservationsService.getList({
      limit: 100,
      status: 'Confirmed,Pending,Inside',
      dateType: 'arrival_or_departure',
      startDate: apiStart,
      endDate: apiEnd,
      filterOwnerId: scope.filterOwnerId,
    });
    return reservationsResponse.data;
  }, [windowRange, scope.filterOwnerId]);

  // Note : les badges propreté (occupancyStatus/cleanlinessStatus_v2) viennent déjà de
  // fetchActiveListings() (source srv-listing). L'ancien enrichissement via
  // tasksService.getReservationPlanning() (backend srv-task, supprimé) est retiré —
  // route inexistante côté serveur, opérationalByListing reste vide (fallback géré par
  // mergeListingOperationalRow via les champs déjà présents sur activeListings).
  const fetchWindowData = useCallback(
    async () => {
      const requestId = ++windowRequestIdRef.current;
      setIsRefreshing(true);
      setError(null);

      try {
        const data = await fetchReservationsWindow();
        if (requestId !== windowRequestIdRef.current) return;
        setReservations(data);
      } catch (e) {
        if (requestId !== windowRequestIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement données');
      } finally {
        if (requestId === windowRequestIdRef.current) {
          setIsRefreshing(false);
        }
      }
    },
    [fetchReservationsWindow],
  );

  /** Bootstrap : listings (cache) + résas en parallèle → affichage ; propreté en async */
  useEffect(() => {
    if (authLoading || !scope.scopeFetchReady) return;

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
        tasks.push(fetchWindowData());

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
  }, [authLoading, scope.scopeFetchReady, listingsCacheKey]);

  /** Premier rendu grille : recaler J-2 (évite dérive fuseau / HMR). */
  useEffect(() => {
    if (!calendarReady || initialViewAlignedRef.current) return;
    initialViewAlignedRef.current = true;
    setStartDate((prev) => {
      const next = getPlanningDefaultStartDate();
      return startOfDay(prev).getTime() === next.getTime() ? prev : next;
    });
  }, [calendarReady]);

  /** Navigation dates : réservations + propreté (listings inchangés) */
  useEffect(() => {
    if (authLoading || !calendarReady || !scope.scopeFetchReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData();
  }, [startDate, authLoading, calendarReady, fetchWindowData, scope.scopeFetchReady, scope.ownerId]);

  useEffect(() => {
    const onOperationalStatusChanged = () => setOpSyncTick((n) => n + 1);
    window.addEventListener(OPERATIONAL_STATUS_CHANGED, onOperationalStatusChanged);
    return () => window.removeEventListener(OPERATIONAL_STATUS_CHANGED, onOperationalStatusChanged);
  }, []);

  const listingRows: ListingRow[] = useMemo(() => {
    const ownerKey = scope.filterOwnerId ? String(scope.filterOwnerId) : '';
    // Orphelines seulement en scope PM unique (ex. listing inactif « Sojori CFC fibre »).
    const orphans = collectOrphanListingSeedsForOwner(reservations, activeListings, ownerKey || undefined);
    const rowsSource = mergeActiveAndOrphanListings(activeListings, orphans);
    if (rowsSource.length === 0) return [];

    const byId = buildListingIdIndex(activeListings);
    const windowStart = startDate;
    const windowEnd = addDays(startDate, daysCount);
    let unmatchedForeign = 0;

    const reservationsByListing = new Map<string, Reservation[]>();
    for (const res of reservations) {
      if (ownerKey) {
        const resOwner = reservationOwnerId(res);
        if (resOwner && resOwner !== ownerKey) {
          unmatchedForeign += 1;
          continue;
        }
      }

      const matched = findListingForReservation(res, byId);
      const listingId = matched?.id || (ownerKey ? resolveReservationListingId(res) : undefined);
      if (!listingId) continue;
      // Sans matched : seulement si orpheline autorisée (owner scopé).
      if (!matched && !ownerKey) continue;
      if (!matched && !orphans.some((o) => o.listingId === listingId)) continue;

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

    if (orphans.length > 0 || unmatchedForeign > 0) {
      console.warn('[ReservationsPlanning] match listings', {
        orphans: orphans.map((o) => o.listingName),
        unmatchedForeign,
        activeListings: activeListings.length,
        filterOwnerId: ownerKey || null,
      });
    }

    return rowsSource.map((listing) => {
      const listingId = String(listing.id);
      const resas = reservationsByListing.get(listingId) || [];
      const op = mergeListingOperationalRow(listingId, {
        occupancyStatus: listing.occupancyStatus,
        cleanlinessStatus_v2: listing.cleanlinessStatus_v2,
        cleanlinessEmergency: listing.cleanlinessEmergency,
      }, operationalByListing.get(listingId));

      return {
        listingId,
        listingName: listing.name || String(op?.listingName || 'Sans nom'),
        city: listing.city || String(op?.city || 'Sans ville'),
        cleanlinessStatus_v2: String(op?.cleanlinessStatus_v2 || 'clean'),
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
  }, [activeListings, reservations, startDate, daysCount, operationalByListing, opSyncTick, scope.filterOwnerId]);

  const handleCleanlinessChange = useCallback(
    async (listingId: string, status: DisplayCleanliness) => {
      console.log('[ReservationsPlanning] handleCleanlinessChange', { listingId, status });
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      invalidatePlanningListingsCache(listingsCacheKey);
      setActiveListings((prev) => {
        const next = prev.map((l) =>
          l.id === listingId
            ? {
                ...l,
                occupancyStatus: result.data?.occupancyStatus ?? l.occupancyStatus,
                cleanlinessStatus_v2: result.data?.cleanlinessStatus_v2 ?? l.cleanlinessStatus_v2,
                cleanlinessEmergency:
                  result.data?.cleanlinessEmergency ?? l.cleanlinessEmergency,
              }
            : l,
        );
        setCachedPlanningListings(listingsCacheKey, next);
        return next;
      });
      setOperationalByListing((prev) => {
        const next = new Map(prev);
        const row = { ...(next.get(listingId) || {}), listingId };
        row.cleanlinessStatus_v2 =
          result.data?.cleanlinessStatus_v2 ?? row.cleanlinessStatus_v2;
        row.occupancyStatus = result.data?.occupancyStatus ?? row.occupancyStatus;
        if (result.data?.cleanlinessEmergency != null) {
          row.cleanlinessEmergency = result.data.cleanlinessEmergency;
        }
        next.set(listingId, row);
        console.log('[ReservationsPlanning] operational state after PATCH', {
          listingId,
          row,
        });
        return next;
      });
    },
    [listingsCacheKey],
  );

  const goToday = useCallback(() => {
    setStartDate(getPlanningDefaultStartDate());
  }, []);

  const shiftDays = useCallback((delta: number) => {
    setStartDate((prev) => startOfDay(addDays(prev, delta)));
  }, []);

  const handleDateChange = useCallback((newDate: Date) => {
    setStartDate(startOfDay(newDate));
  }, []);

  const handleReservationClick = useCallback(
    (routeId: string) => {
      if (!routeId) return;
      navigate(`/reservations/${encodeURIComponent(routeId)}`);
    },
    [navigate],
  );

  const stayViewProps = {
    variant: 'reservations' as const,
    startDate,
    daysCount,
    todayBackDays: PLANNING_INITIAL_BACK_DAYS,
    listings: listingRows,
    onReservationClick: handleReservationClick,
    onGoToday: goToday,
    onPrevDay: () => shiftDays(-1),
    onNextDay: () => shiftDays(1),
    onPrevWeek: () => shiftDays(-7),
    onNextWeek: () => shiftDays(7),
    onDateChange: handleDateChange,
    onCleanlinessChange: handleCleanlinessChange,
  };

  const planningGrid =
    calendarReady ? (
      <StayView
        {...stayViewProps}
        compactLayout={isMobile}
        denseToolbar={!isMobile}
        gridOnly={listFullscreen}
        fillViewport={isMobile || listFullscreen}
        showFullscreenEnter={!listFullscreen}
        onEnterFullscreen={() => setListFullscreen(true)}
      />
    ) : null;

  const listFullscreenLayer =
    listFullscreen && planningGrid && typeof document !== 'undefined'
      ? createPortal(
          <Box
            role="dialog"
            aria-modal="true"
            aria-label="Planning réservations plein écran"
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              bgcolor: '#f6f5f1',
              display: 'flex',
              flexDirection: 'column',
              p: { xs: 0.5, md: 0.75 },
              boxSizing: 'border-box',
            }}
          >
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {planningGrid}
            </Box>
            <Box
              component="button"
              type="button"
              onClick={() => setListFullscreen(false)}
              title="Quitter le plein écran (Échap)"
              aria-label="Quitter le plein écran"
              sx={{
                position: 'fixed',
                right: { xs: 10, md: 14 },
                bottom: { xs: 10, md: 14 },
                zIndex: 10000,
                width: 36,
                height: 36,
                borderRadius: '99px',
                border: '1px solid rgba(20,17,10,0.12)',
                bgcolor: 'rgba(255,255,255,0.94)',
                boxShadow: '0 4px 16px rgba(20,17,10,0.14)',
                color: '#7a756c',
                fontSize: 22,
                fontWeight: 300,
                lineHeight: 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
                p: 0,
              }}
            >
              ×
            </Box>
          </Box>,
          document.body,
        )
      : null;

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Planning']}>
      <Box sx={{ bgcolor: '#f6f5f1', minHeight: listFullscreen ? 0 : '100vh' }}>
        {isLoading && !calendarReady && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
            <CircularProgress />
          </Box>
        )}

        {calendarReady && error && !listFullscreen && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 1, px: 1 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {calendarReady && !listFullscreen && (
          <Box
            sx={{
              position: 'relative',
              opacity: isRefreshing ? 0.92 : 1,
              transition: 'opacity 0.15s ease',
              ...(isMobile
                ? {
                    minHeight: { xs: 'calc(100dvh - 80px)', md: 'calc(100dvh - 88px)' },
                    maxHeight: { xs: 'calc(100dvh - 80px)', md: 'calc(100dvh - 88px)' },
                    display: 'flex',
                    flexDirection: 'column',
                  }
                : {
                    minHeight: 'auto',
                  }),
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

            <Box sx={{
              flex: isMobile ? 1 : undefined,
              minHeight: isMobile ? 0 : undefined,
              display: isMobile ? 'flex' : 'block',
              flexDirection: 'column',
            }}>
              {planningGrid}
            </Box>
          </Box>
        )}

        {listFullscreenLayer}

        {!isLoading && !calendarReady && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
