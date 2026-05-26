// ════════════════════════════════════════════════════════════════════
// TasksPlanningPageV2.tsx — Vue Séjour redesignée par Claude Design
// Remplace TasksPlanningPage.tsx avec le nouveau StayView
// Intègre: sidebar, filtres actifs, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStoredOwners } from '../data/catalogueMock';

/**
 * TaskNew planning :
 * - listingsService.getListings() — listings actifs (srv-listing)
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

  // ✅ CHANGEMENT: Stocker listings et rawData séparément (comme ReservationsPlanningPage)
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [adminOwnerId, setAdminOwnerId] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Owner options pour le filtre admin
  const ownerOptions = useMemo(
    () =>
      getStoredOwners()
        .filter((o) => o.role === 'owner')
        .map((o) => ({ id: o.id, name: o.name })),
    [],
  );

  const planningOwnerId = useMemo(() => {
    if (scope.canAccessAllOwners) {
      return adminOwnerId.trim() === '' ? undefined : adminOwnerId;
    }
    return scope.ownerId;
  }, [scope.canAccessAllOwners, scope.ownerId, adminOwnerId]);

  const fetchListings = useCallback(async () => {
    const listingsResponse = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      limit: 1000,
    });
    setActiveListings(listingsResponse.data.items);
  }, []);

  const fetchWindowData = useCallback(async () => {
    const requestId = ++windowRequestIdRef.current;
    setIsRefreshing(true);
    setError(null);

    try {
      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }

      const endDateStr = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
      const startDateStr = format(startDate, 'yyyy-MM-dd');

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
  }, [startDate, daysCount, planningOwnerId, scope.canAccessAllOwners, scope.ownerId]);

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
  }, [authLoading, refreshKey, fetchListings, fetchWindowData]);

  useEffect(() => {
    if (authLoading || !calendarReady) return;
    if (skipNextWindowOnlyFetchRef.current) {
      skipNextWindowOnlyFetchRef.current = false;
      return;
    }
    void fetchWindowData();
  }, [startDate, authLoading, calendarReady, fetchWindowData, planningOwnerId]);

  // ✅ CHANGEMENT: Transform en itérant sur activeListings (comme ReservationsPlanningPage)
  // Afficher TOUS les listings actifs, même sans réservations
  const listings: ListingRow[] = useMemo(() => {
    if (activeListings.length === 0) return [];

    // Map réservations + statuts opérationnels (srv-task planning = source of truth propreté)
    const reservationsByListing = new Map<string, any[]>();
    const operationalByListing = new Map<string, any>();
    if (rawData?.listings) {
      rawData.listings.forEach((l: any) => {
        const listingId = String(l.listingId || l._id || '');
        if (!listingId) return;
        if (l.reservations) reservationsByListing.set(listingId, l.reservations);
        operationalByListing.set(listingId, l);
      });
    }

    // ✅ ITÉRER SUR LES LISTINGS ACTIFS (pas sur rawData.listings)
    return activeListings.map((listing: any) => {
      const listingId = String(listing.id || listing._id || '');
      const resas = reservationsByListing.get(listingId) || [];
      const op = operationalByListing.get(listingId);

      console.log(`[TasksPlanningPageV2] 📊 Listing ${listing.name}: ${resas.length} reservations`);

      return {
        listingId,
        listingName: listing.name || op?.listingName || 'Sans nom',
        city: listing.city || op?.city || 'Sans ville',
        cleanlinessStatus_v2:
          op?.cleanlinessStatus_v2 || listing.cleanlinessStatus_v2 || listing.cleanlinessStatus || 'clean',
        cleanlinessStatus: op?.cleanlinessStatus || listing.cleanlinessStatus,
        occupancyStatus: op?.occupancyStatus || listing.occupancyStatus || 'vacant',
        cleanlinessEmergency: Boolean(op?.cleanlinessEmergency || listing.cleanlinessEmergency),
        reservations: resas.map((r: any) => ({
          reservationId: r.reservationId || r._id || '',
          guestName: r.guestName || 'Guest',
          arrivalDate: r.arrivalDate || '',
          departureDate: r.departureDate || '',
          status: r.status || 'confirmed',
          channelName: r.channelName || 'direct',
          numberOfGuests: r.numberOfGuests || 0,
          reservationNumber: r.reservationNumber || '',
          timeline: (r.timeline || []).map((t: any) => ({
            type: t.type || 'task',
            category: t.category,
            scheduledFor: t.scheduledFor || t.startDate || '',
            isTask: t.isTask ?? true,
            staffId: t.staffId || null,
            staffName: t.staffName || null,
            status: t.status || t.taskStatus || 'CREATED',
            cleaning_type: t.cleaning_type,
            data: t.data || {},
          })),
        })),
      };
    });
    // ✅ IMPORTANT: Afficher TOUS les listings actifs, même sans réservations
  }, [activeListings, rawData]);

  const handleTaskClick = (_item: TimelineItem) => {
    // TODO: Ouvrir drawer détail tâche
  };

  const handleReservationClick = (routeId: string) => {
    if (!routeId) return;
    navigate(`/reservations/${encodeURIComponent(routeId)}`);
  };

  // Navigation temporelle
  const goToday = () => {
    const d = subDays(new Date(), PLANNING_INITIAL_BACK_DAYS);
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

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

  const handleCleanlinessChange = useCallback(async (listingId: string, status: DisplayCleanliness) => {
    try {
      const result = await cleanlinessService.updateListingStatus(listingId, status);
      if (!result.success) {
        throw new Error(result.message || 'Échec mise à jour propreté');
      }
      setRefreshKey((k) => k + 1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur mise à jour propreté';
      setError(msg);
      throw err;
    }
  }, []);

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

            {/* StayView component - Design Claude (inclut déjà header + mini-map + navigation) */}
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
