/**
 * Vue Planning Réservations — même design que /tasks/planning (StayView)
 * • 30 jours mini-map, 14 jours visibles
 * • Filtres réservation (Confirmées / En attente) + légende canaux
 * • Barres Gantt : arrivée 40%, départ 40% (computeReservationBarLayout)
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, format } from 'date-fns';
import { Box, CircularProgress, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import StayView from '../components/calendar-views/StayView';
import type { ListingRow } from '../components/calendar-views/_shared';
import reservationsService from '../services/reservationsService';
import listingsService from '../services/listingsService';
import type { Reservation } from '../types/reservations.types';
import type { ListingSummary } from '../types/listings.types';

function resolveListingId(res: Reservation): string | undefined {
  const anyRes = res as Reservation & { listing?: { _id?: string }; listingId?: string; _id?: string };
  return anyRes.sojoriId || anyRes.listingMapId || anyRes.listingId || anyRes.listing?._id;
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
  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [daysCount] = useState(30);

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh = false) => {
    if (!refresh) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const listingsResponse = await listingsService.getListings({
        useActiveFilter: true,
        active: true,
        limit: 1000,
      });
      setListings(listingsResponse.data.items);

      const reservationsResponse = await reservationsService.getList({
        limit: 1000,
        status: 'Confirmed,Pending',
      });
      setReservations(reservationsResponse.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement données');
      setListings([]);
      setReservations([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

      return {
        listingId,
        listingName: listing.name || 'Sans nom',
        city: listing.city || 'Sans ville',
        cleanlinessStatus_v2: 'clean',
        occupancyStatus: 'available',
        reservations: resas.map((r) => ({
          reservationId: r.id || (r as { _id?: string })._id || '',
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
  }, [listings, reservations, startDate, daysCount]);

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

  const handleReservationClick = (routeId: string) => {
    if (!routeId) return;
    navigate(`/reservations/${encodeURIComponent(routeId)}`);
  };

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Planning']}>
      <Box sx={{ bgcolor: '#f6f5f1', minHeight: '100vh' }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress />
          </Box>
        )}

        {!isLoading && error && (
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Box>
        )}

        {!isLoading && !error && (
          <Box sx={{ position: 'relative' }}>
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
            />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
