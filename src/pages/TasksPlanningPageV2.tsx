// ════════════════════════════════════════════════════════════════════
// TasksPlanningPageV2.tsx — Vue Séjour redesignée par Claude Design
// Remplace TasksPlanningPage.tsx avec le nouveau StayView
// Intègre: sidebar, filtres actifs, scope user, owner selection
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, CircularProgress, Alert } from '@mui/material';
import { format, addDays } from 'date-fns';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow, TimelineItem } from '../components/calendar-views/_shared';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import listingsService from '../services/listingsService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getStoredOwners } from '../data/catalogueMock';

/**
 * ✅ IMPORTANT: Utilise la MÊME API que /reservations/planning
 * - listingsService.getListings() pour récupérer TOUS les listings actifs
 * - tasksService.getReservationPlanning() pour récupérer réservations + tâches
 * Pattern identique à ReservationsPlanningPage
 */

export default function TasksPlanningPageV2() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false); // Pour navigation sans bloquer l'UI
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount] = useState(30); // Mini-map 30 jours

  // ✅ CHANGEMENT: Stocker listings et rawData séparément (comme ReservationsPlanningPage)
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [rawData, setRawData] = useState<any>(null);
  const [adminOwnerId, setAdminOwnerId] = useState('');

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

  // ✅ CHANGEMENT: Fetch data from listingsService + tasksService (comme ReservationsPlanningPage)
  useEffect(() => {
    const fetchPlanning = async () => {
      // Premier chargement = loading complet, navigation = refreshing discret
      const isFirstLoad = activeListings.length === 0 && rawData === null;
      if (isFirstLoad) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        if (!scope.canAccessAllOwners && !scope.ownerId) {
          throw new Error('Impossible de déterminer le ownerId de la session.');
        }

        const endDateStr = format(addDays(startDate, daysCount), 'yyyy-MM-dd');
        const startDateStr = format(startDate, 'yyyy-MM-dd');

        // ✅ ÉTAPE 1: Récupérer TOUS les listings actifs depuis listingsService
        console.log('[TasksPlanningPageV2] 🔄 Fetching active listings from listingsService...');
        const listingsResponse = await listingsService.getListings({
          useActiveFilter: true,
          active: true,
          limit: 1000,
        });

        console.log('[TasksPlanningPageV2] ✅ Active listings:', listingsResponse.data.items.length);
        console.log('[TasksPlanningPageV2] ✅ Listings:', listingsResponse.data.items.map((l: any) => ({
          id: l.id,
          name: l.name,
          city: l.city
        })));
        setActiveListings(listingsResponse.data.items);

        // ✅ ÉTAPE 2: Récupérer réservations + tâches depuis tasksService
        console.log('[TasksPlanningPageV2] 🔄 Fetching reservations + tasks from tasksService...');
        const result = await tasksService.getReservationPlanning({
          startDate: startDateStr,
          endDate: endDateStr,
          ownerId: planningOwnerId,
        });

        if (result.success && result.data) {
          console.log('[TasksPlanningPageV2] ✅ Planning data received');
          setRawData(result.data);
        } else {
          setError(result.message || 'Erreur lors du chargement du planning');
        }
      } catch (err: any) {
        console.error('[TasksPlanningPageV2] Error fetching planning:', err);
        setError(err?.message || 'Erreur réseau');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    };

    fetchPlanning();
  }, [startDate, daysCount, planningOwnerId, scope.canAccessAllOwners, scope.ownerId]);

  // ✅ CHANGEMENT: Transform en itérant sur activeListings (comme ReservationsPlanningPage)
  // Afficher TOUS les listings actifs, même sans réservations
  const listings: ListingRow[] = useMemo(() => {
    if (activeListings.length === 0) return [];

    console.log('[TasksPlanningPageV2] 🔨 Building listing rows from', activeListings.length, 'active listings');

    // Map réservations par listingId pour lookup rapide
    const reservationsByListing = new Map<string, any[]>();
    if (rawData?.listings) {
      rawData.listings.forEach((l: any) => {
        const listingId = l.listingId || l._id;
        if (listingId && l.reservations) {
          reservationsByListing.set(listingId, l.reservations);
        }
      });
    }

    // ✅ ITÉRER SUR LES LISTINGS ACTIFS (pas sur rawData.listings)
    return activeListings.map((listing: any) => {
      const listingId = listing.id || listing._id;
      const resas = reservationsByListing.get(listingId) || [];

      console.log(`[TasksPlanningPageV2] 📊 Listing ${listing.name}: ${resas.length} reservations`);

      return {
        listingId,
        listingName: listing.name || 'Sans nom',
        city: listing.city || 'Sans ville',
        cleanlinessStatus_v2: listing.cleanlinessStatus_v2 || listing.cleanlinessStatus || 'clean',
        occupancyStatus: listing.occupancyStatus || 'available',
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

  const isPageLoading = isLoading;

  // Handlers
  const handleTaskClick = (item: TimelineItem) => {
    console.log('[TasksPlanningPageV2] Task clicked:', item);
    // TODO: Ouvrir drawer détail tâche
    // navigate(`/tasks/${item.data?.taskId}`);
  };

  const handleReservationClick = (resId: string) => {
    console.log('[TasksPlanningPageV2] Reservation clicked:', resId);
    navigate(`/reservations/${resId}`);
  };

  // Navigation temporelle
  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setStartDate(d);
  };

  const shiftDays = (delta: number) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + delta);
    setStartDate(d);
  };

  const handleDateChange = (newDate: Date) => {
    newDate.setHours(0, 0, 0, 0);
    setStartDate(newDate);
  };

  return (
    <DashboardWrapper breadcrumb={[]}>
      <Box sx={{ bgcolor: '#f6f5f1', minHeight: '100vh' }}>
        {isPageLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        )}

        {!isPageLoading && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {!isPageLoading && !error && (
          <Box sx={{ position: 'relative' }}>
            {/* Indicateur de chargement discret pendant navigation */}
            {isRefreshing && (
              <Box sx={{
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
              }}>
                <CircularProgress size={14} sx={{ color: '#fff' }} />
                Chargement...
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
            />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
