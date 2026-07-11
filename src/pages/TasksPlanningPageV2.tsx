// ════════════════════════════════════════════════════════════════════
// TasksPlanningPageV2.tsx — Vue Séjour redesignée par Claude Design
// Remplace TasksPlanningPage.tsx avec le nouveau StayView
// Intègre: sidebar, filtres actifs, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Box, CircularProgress, Alert, useMediaQuery, useTheme } from '@mui/material';
import { format, addDays, startOfDay } from 'date-fns';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow, TimelineItem } from '../components/calendar-views/_shared';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import { usePmTasksScope } from '../hooks/usePmTasksScope';
import { fetchTaskNewPlanning } from '../services/planningFulltaskMerge';
import listingsService from '../services/listingsService';
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
import {
  buildListingIdIndex,
  mergeActiveAndOrphanListings,
} from '../utils/planningListingMatch';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ListingSummary } from '../types/listings.types';
import { useSocketIO } from '../hooks/useSocketIO';
import { SOCKET_EVENTS, DEFAULT_ROOMS } from '../constants/socketEvents';

/**
 * TaskNew planning :
 * - listingsService.getListings() — listings actifs (srv-listing), cache partagé avec /reservations/planning
 * - fetchTaskNewPlanning() — réservations srv-reservations + tâches srv-fulltask (admin BFF)
 * Pas d’appel srv-task / reservation/planning legacy.
 */

import {
  getPlanningDefaultStartDate,
  PLANNING_FORWARD_DAYS,
  PLANNING_INITIAL_BACK_DAYS,
  PLANNING_LOOKBACK_DAYS,
} from '../utils/planningViewDates';

export default function TasksPlanningPageV2() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { loading: authLoading } = useAuth();
  const scope = usePmTasksScope();
  const listingsCacheKey = scope.scopeCacheKey;

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const windowRequestIdRef = useRef(0);
  const skipNextWindowOnlyFetchRef = useRef(false);
  const initialViewAlignedRef = useRef(false);
  const [startDate, setStartDate] = useState<Date>(() => getPlanningDefaultStartDate());
  const [daysCount] = useState(PLANNING_LOOKBACK_DAYS + PLANNING_FORWARD_DAYS);

  const [activeListings, setActiveListings] = useState<ListingSummary[]>(() => {
    return getCachedPlanningListings(listingsCacheKey) ?? [];
  });
  const [rawData, setRawData] = useState<{
    listings?: Array<Record<string, unknown>>;
  } | null>(null);
  const [opSyncTick, setOpSyncTick] = useState(0);
  const listingsHydratedRef = useRef(activeListings.length > 0);
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
    const startDateStr = format(startDate, 'yyyy-MM-dd');
    const endDateStr = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
    return { startDateStr, endDateStr };
  }, [startDate, daysCount]);

  const fetchActiveListings = useCallback(async () => {
    const cached = getCachedPlanningListings(listingsCacheKey);
    if (cached?.length) {
      setActiveListings(cached);
      listingsHydratedRef.current = true;
      return;
    }
    let items: ListingSummary[] = [];
    const listingsResponse = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      compact: true,
      forListingsOverview: false,
      limit: 500,
      filterOwnerId: scope.filterOwnerId,
    });
    items = listingsResponse.data.items;
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
        console.warn('[TasksPlanning] fallback listings sans filtre active', {
          count: items.length,
          filterOwnerId: scope.filterOwnerId,
        });
      }
    }
    setActiveListings(items);
    setCachedPlanningListings(listingsCacheKey, items);
    listingsHydratedRef.current = true;
  }, [listingsCacheKey, scope.filterOwnerId]);

  useEffect(() => {
    setActiveListings([]);
    setRawData(null);
    listingsHydratedRef.current = false;
    setCalendarReady(false);
    invalidatePlanningListingsCache();
  }, [listingsCacheKey]);

  const fetchWindowData = useCallback(async () => {
    const requestId = ++windowRequestIdRef.current;
    setIsRefreshing(true);
    setError(null);

    try {
      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }

      const { startDateStr, endDateStr } = windowRange();
      const result = await fetchTaskNewPlanning({
        startDate: startDateStr,
        endDate: endDateStr,
        ownerId: scope.filterOwnerId || scope.ownerId,
      });

      if (requestId !== windowRequestIdRef.current) return;

      if (result.success && result.data) {
        setRawData(result.data);
      } else {
        setError(result.message || 'Erreur lors du chargement du planning');
      }
    } catch (err: unknown) {
      if (requestId !== windowRequestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Erreur réseau');
    } finally {
      if (requestId === windowRequestIdRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [windowRange, scope.ownerId, scope.filterOwnerId, scope.canAccessAllOwners, scope.scopeFetchReady]);

  useEffect(() => {
    const onOperationalStatusChanged = () => setOpSyncTick((n) => n + 1);
    window.addEventListener(OPERATIONAL_STATUS_CHANGED, onOperationalStatusChanged);
    return () => window.removeEventListener(OPERATIONAL_STATUS_CHANGED, onOperationalStatusChanged);
  }, []);

  /** Bootstrap : listings (cache) + planning en parallèle */
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
        tasks.push(fetchWindowData().then(() => undefined));

        await Promise.all(tasks);
        if (cancelled) return;
        setCalendarReady(true);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Erreur réseau');
        if (isBootstrap) {
          setActiveListings([]);
          setRawData(null);
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

  useEffect(() => {
    if (!calendarReady || initialViewAlignedRef.current) return;
    initialViewAlignedRef.current = true;
    setStartDate((prev) => {
      const next = getPlanningDefaultStartDate();
      return startOfDay(prev).getTime() === next.getTime() ? prev : next;
    });
  }, [calendarReady]);

  /** Navigation dates / filtre owner admin : planning uniquement (listings inchangés) */
  useEffect(() => {
    if (authLoading || !calendarReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData();
  }, [startDate, authLoading, calendarReady, fetchWindowData, scope.ownerId, scope.scopeFetchReady]);

  // ─── Temps réel (socket.io) ───────────────────────────────────────
  // Timeline multi-propriétés : refetch simple de la fenêtre visible plutôt qu'un
  // patch fin (positionnement par date/listing trop complexe pour un event isolé).
  const socketRooms = useMemo(() => {
    if (!scope.ownerId) return [DEFAULT_ROOMS.TASK_ADMIN_ROOM];
    return [`room_task_${scope.ownerId}`];
  }, [scope.ownerId]);

  useSocketIO({
    rooms: socketRooms,
    enabled: scope.scopeFetchReady && !authLoading && calendarReady,
    onReconnect: () => { void fetchWindowData(); },
    handlers: {
      [SOCKET_EVENTS.NEW_TASK]: () => { void fetchWindowData(); },
      [SOCKET_EVENTS.UPDATE_TASK]: () => { void fetchWindowData(); },
    },
  });

  const listings: ListingRow[] = useMemo(() => {
    const ownerKey = scope.filterOwnerId || scope.ownerId ? String(scope.filterOwnerId || scope.ownerId) : '';
    const activeById = buildListingIdIndex(activeListings);
    const reservationsByListing = new Map<string, Array<Record<string, unknown>>>();
    const operationalByListing = new Map<string, Record<string, unknown>>();
    const orphanSeeds: Array<{ listingId: string; listingName: string; city: string }> = [];

    if (rawData?.listings) {
      rawData.listings.forEach((l) => {
        const listingId = String(l.listingId || l._id || '');
        if (!listingId) return;
        const matched = activeById.get(listingId);
        const hasResas = Array.isArray(l.reservations) && l.reservations.length > 0;

        if (matched) {
          if (hasResas) {
            reservationsByListing.set(matched.id, l.reservations as Array<Record<string, unknown>>);
          }
          operationalByListing.set(matched.id, l);
          return;
        }

        // Orpheline : seulement si un PM est sélectionné (résas déjà filtrées par owner).
        if (ownerKey && hasResas) {
          orphanSeeds.push({
            listingId,
            listingName: String(
              l.listingName || l.name || 'Listing (inactif / hors grille)',
            ),
            city: String(l.city || '—'),
          });
          reservationsByListing.set(listingId, l.reservations as Array<Record<string, unknown>>);
          operationalByListing.set(listingId, l);
        }
      });
    }

    const rowsSource = mergeActiveAndOrphanListings(activeListings, orphanSeeds);
    if (rowsSource.length === 0) return [];

    if (orphanSeeds.length > 0) {
      console.warn('[TasksPlanning] listings inactifs du PM (orphelines scopées)', {
        orphans: orphanSeeds.map((o) => o.listingName),
        ownerId: ownerKey,
      });
    }

    return rowsSource.map((listing) => {
      const listingId = String(listing.id || '');
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
          reservationId: String(r.reservationId || r._id || ''),
          guestName: String(r.guestName || 'Guest'),
          arrivalDate: String(r.arrivalDate || ''),
          departureDate: String(r.departureDate || ''),
          status: String(r.status || 'confirmed'),
          channelName: String(r.channelName || 'direct'),
          numberOfGuests: Number(r.numberOfGuests || 0),
          reservationNumber: String(r.reservationNumber || ''),
          timeline: (Array.isArray(r.timeline) ? r.timeline : []).map((t: Record<string, unknown>) => ({
            type: (t.type || 'task') as TimelineItem['type'],
            category: t.category as string | undefined,
            scheduledFor: String(t.scheduledFor || t.startDate || ''),
            isTask: (t.isTask as boolean) ?? true,
            staffId: (t.staffId as string | null) ?? null,
            staffName: (t.staffName as string | null) ?? null,
            status: String(t.status || t.taskStatus || 'CREATED'),
            cleaning_type: t.cleaning_type as string | undefined,
            data: (t.data as Record<string, unknown>) || {},
          })),
        })),
      };
    });
  }, [activeListings, rawData, opSyncTick, scope.ownerId, scope.filterOwnerId]);

  const handleTaskClick = (_item: TimelineItem) => {
    // TODO: Ouvrir drawer détail tâche
  };

  const handleReservationClick = useCallback(
    (routeId: string) => {
      if (!routeId) return;
      navigate(`/reservations/${encodeURIComponent(routeId)}`);
    },
    [navigate],
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

  const handleCleanlinessChange = useCallback(
    async (listingId: string, status: DisplayCleanliness) => {
      console.log('[TasksPlanning] handleCleanlinessChange', { listingId, status });
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
      setRawData((prev) => {
        if (!prev?.listings) return prev;
        return {
          ...prev,
          listings: prev.listings.map((l) => {
            const id = String(l.listingId || l._id || '');
            if (id !== listingId) return l;
            const row = { ...l };
            row.cleanlinessStatus_v2 =
              result.data?.cleanlinessStatus_v2 ?? row.cleanlinessStatus_v2;
            row.occupancyStatus = result.data?.occupancyStatus ?? row.occupancyStatus;
            if (result.data?.cleanlinessEmergency != null) {
              row.cleanlinessEmergency = result.data.cleanlinessEmergency;
            }
            return row;
          }),
        };
      });
    },
    [listingsCacheKey],
  );

  const stayViewProps = {
    startDate,
    daysCount,
    todayBackDays: PLANNING_INITIAL_BACK_DAYS,
    listings,
    onTaskClick: handleTaskClick,
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
            aria-label="Planning tâches plein écran"
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
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Planning']}>
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
