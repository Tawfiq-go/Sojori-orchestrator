// ════════════════════════════════════════════════════════════════════
// TasksPlanningPageV2.tsx — Vue Séjour redesignée par Claude Design
// Remplace TasksPlanningPage.tsx avec le nouveau StayView
// Intègre: sidebar, filtres actifs, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { format, addDays, subDays } from 'date-fns';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow, TimelineItem } from '../components/calendar-views/_shared';
import { resolveTasksUserScope } from '../services/fulltaskTasksService';
import { fetchTaskNewPlanning } from '../services/planningFulltaskMerge';
import listingsService from '../services/listingsService';
import cleanlinessService from '../services/cleanlinessService';
import type { DisplayCleanliness } from '../utils/cleanlinessDisplay';
import {
  getCachedPlanningListings,
  setCachedPlanningListings,
  invalidatePlanningListingsCache,
} from '../utils/planningListingsCache';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ListingSummary } from '../types/listings.types';

/**
 * TaskNew planning :
 * - listingsService.getListings() — listings actifs (srv-listing), cache partagé avec /reservations/planning
 * - fetchTaskNewPlanning() — réservations srv-reservations + tâches srv-fulltask (admin BFF)
 * Pas d’appel srv-task / reservation/planning legacy.
 */

/** Jours passés / futurs visibles (aligné /reservations/planning) */
const PLANNING_LOOKBACK_DAYS = 30;
const PLANNING_FORWARD_DAYS = 45;
/** Décalage initial du curseur : on cadre J-2 → J+11 (14j visibles dont aujourd'hui en 3e position),
 *  l'utilisateur peut ensuite naviguer dans la fenêtre 75j. */
const PLANNING_INITIAL_BACK_DAYS = 2;

export default function TasksPlanningPageV2() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);
  const listingsCacheKey = scope.ownerId || (scope.canAccessAllOwners ? 'admin' : 'unknown');

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [calendarReady, setCalendarReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const windowRequestIdRef = useRef(0);
  const skipNextWindowOnlyFetchRef = useRef(false);
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
  const [rawData, setRawData] = useState<{
    listings?: Array<Record<string, unknown>>;
  } | null>(null);
  const [adminOwnerId, setAdminOwnerId] = useState('');
  const listingsHydratedRef = useRef(activeListings.length > 0);

  const planningOwnerId = useMemo(() => {
    if (scope.canAccessAllOwners) {
      return adminOwnerId.trim() === '' ? undefined : adminOwnerId;
    }
    return scope.ownerId;
  }, [scope.canAccessAllOwners, scope.ownerId, adminOwnerId]);

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
    const listingsResponse = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      compact: true,
      forListingsOverview: false,
      limit: 500,
    });
    setActiveListings(listingsResponse.data.items);
    setCachedPlanningListings(listingsCacheKey, listingsResponse.data.items);
    listingsHydratedRef.current = true;
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
        ownerId: planningOwnerId,
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
  }, [windowRange, planningOwnerId, scope.canAccessAllOwners, scope.ownerId]);

  /** Bootstrap : listings (cache) + planning en parallèle */
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
  }, [authLoading]);

  /** Navigation dates / filtre owner admin : planning uniquement (listings inchangés) */
  useEffect(() => {
    if (authLoading || !calendarReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData();
  }, [startDate, authLoading, calendarReady, fetchWindowData, planningOwnerId]);

  const listings: ListingRow[] = useMemo(() => {
    if (activeListings.length === 0) return [];

    const reservationsByListing = new Map<string, Array<Record<string, unknown>>>();
    const operationalByListing = new Map<string, Record<string, unknown>>();
    if (rawData?.listings) {
      rawData.listings.forEach((l) => {
        const listingId = String(l.listingId || l._id || '');
        if (!listingId) return;
        if (Array.isArray(l.reservations)) reservationsByListing.set(listingId, l.reservations);
        operationalByListing.set(listingId, l);
      });
    }

    return activeListings.map((listing) => {
      const listingId = String(listing.id || '');
      const resas = reservationsByListing.get(listingId) || [];
      const op = operationalByListing.get(listingId);

      return {
        listingId,
        listingName: listing.name || String(op?.listingName || 'Sans nom'),
        city: listing.city || String(op?.city || 'Sans ville'),
        cleanlinessStatus_v2: String(
          op?.cleanlinessStatus_v2 || listing.cleanlinessStatus || 'clean',
        ),
        cleanlinessStatus: (op?.cleanlinessStatus || listing.cleanlinessStatus) as string | undefined,
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
  }, [activeListings, rawData]);

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
    const d = subDays(new Date(), PLANNING_INITIAL_BACK_DAYS);
    d.setHours(0, 0, 0, 0);
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

  const handleCleanlinessChange = useCallback(
    async (listingId: string, status: DisplayCleanliness) => {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      invalidatePlanningListingsCache(listingsCacheKey);
      setRawData((prev) => {
        if (!prev?.listings) return prev;
        return {
          ...prev,
          listings: prev.listings.map((l) => {
            const id = String(l.listingId || l._id || '');
            if (id !== listingId) return l;
            const row = { ...l };
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
            return row;
          }),
        };
      });
    },
    [listingsCacheKey],
  );

  return (
    <DashboardWrapper breadcrumb={[]}>
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
              startDate={startDate}
              daysCount={daysCount}
              listings={listings}
              onTaskClick={handleTaskClick}
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
