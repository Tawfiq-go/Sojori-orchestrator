/**
 * Vue Planning Réservations — Calendrier Gantt type « Vue Séjour »
 * Inspiré de TasksPlanningPage mais affiche UNIQUEMENT les réservations
 * Design aligné sur tokens Atelier 2026
 *
 * ✅ IMPORTANT: Affiche TOUTES les propriétés actives, même sans réservations
 * Basé sur specs user: "recupere les lisutng active (seuelelent active) on les affiche"
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Alert, Box, CircularProgress, Paper, Stack, Typography, Button, IconButton, Tooltip } from '@mui/material';
import { ChevronLeft, ChevronRight, Today } from '@mui/icons-material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import { MultiPropertyInventory, type PropertyRow, type ReservationBlock } from '../components/MultiPropertyInventory';
import { useAuth } from '../hooks/useAuth';
import reservationsService from '../services/reservationsService';
import listingsService from '../services/listingsService';
import type { Reservation } from '../types/reservations.types';
import type { ListingSummary } from '../types/listings.types';

export function ReservationsPlanningPage() {
  const { user } = useAuth();
  const [currentStart, setCurrentStart] = useState(() => new Date());
  const startDate = format(currentStart, 'yyyy-MM-dd');
  const endDate = format(addDays(currentStart, 30), 'yyyy-MM-dd');

  const [listings, setListings] = useState<ListingSummary[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const planningWindowDays = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(endDate), parseISO(startDate)) + 1;
    } catch {
      return 31;
    }
  }, [startDate, endDate]);

  // Fetch active listings + reservations (Confirmed/Pending)
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // ✅ ÉTAPE 1: Récupérer TOUTES les propriétés actives
      console.log('[ReservationsPlanningPage] 🔄 Fetching active listings...');
      const listingsResponse = await listingsService.getListings({
        useActiveFilter: true,
        active: true,
        limit: 1000,
      });

      console.log('[ReservationsPlanningPage] ✅ Active listings:', listingsResponse.data.items.length);
      setListings(listingsResponse.data.items);

      // ✅ ÉTAPE 2: Récupérer les réservations Confirmed/Pending
      console.log('[ReservationsPlanningPage] 🔄 Fetching reservations (Confirmed/Pending)...');
      const reservationsResponse = await reservationsService.getList({
        limit: 1000,
        status: 'Confirmed,Pending',
      });

      console.log('[ReservationsPlanningPage] ✅ Reservations:', reservationsResponse.data.length);
      setReservations(reservationsResponse.data as any[]);
    } catch (e) {
      console.error('[ReservationsPlanningPage] ❌ Error:', e);
      setError(e instanceof Error ? e.message : 'Erreur chargement données');
      setListings([]);
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ✅ CHANGEMENT MAJEUR: Itérer sur les LISTINGS (pas les réservations)
  // Afficher TOUTES les propriétés actives, même sans réservations
  const propertyRows: PropertyRow[] = useMemo(() => {
    console.log('[ReservationsPlanningPage] 🔨 Building property rows from', listings.length, 'listings');

    // Map reservations by listingId for quick lookup
    const reservationsByListing = new Map<string, Reservation[]>();
    reservations.forEach((res) => {
      const listingId = res.listing?._id || res.listingId || res.sojoriId;
      if (listingId) {
        if (!reservationsByListing.has(listingId)) {
          reservationsByListing.set(listingId, []);
        }
        reservationsByListing.get(listingId)!.push(res);
      }
    });

    // ✅ ITÉRER SUR LES LISTINGS (pas les réservations groupées)
    return listings.map((listing) => {
      const listingId = listing.id;
      const resas = reservationsByListing.get(listingId) || [];

      console.log(`[ReservationsPlanningPage] 📊 Listing ${listing.name}: ${resas.length} reservations`);

      // Calculate reservation blocks
      const blocks: ReservationBlock[] = resas
        .filter((r) => r.arrivalDate && r.departureDate)
        .map((r) => {
          const arrival = parseISO(r.arrivalDate);
          const departure = parseISO(r.departureDate);
          const windowStart = parseISO(startDate);

          // Calculate day indices relative to window start
          const startDay = Math.max(0, differenceInCalendarDays(arrival, windowStart));
          const endDay = differenceInCalendarDays(departure, windowStart);

          return {
            id: r.reservationNumber || r._id,
            guestName: r.guestName || 'Guest',
            guestFlag: '🌍', // TODO: Use real country flag
            amount: '', // Pas de prix dans la vue planning
            startDay,
            endDay,
            status: r.status?.toLowerCase() === 'confirmed' ? 'confirmed' : 'pending',
          } as ReservationBlock;
        })
        .filter((block) => block.endDay >= 0 && block.startDay < planningWindowDays);

      // Calculate booked ranges
      const bookedRanges: [number, number][] = blocks.map((b) => [b.startDay, b.endDay]);

      return {
        id: listingId,
        name: listing.name,
        city: listing.city || 'N/A',
        photoColor: 'gold' as const,
        occupancyPct: 0, // Pas affiché dans la vue planning
        monthRevenue: '', // Pas de revenus affichés dans la vue planning
        bookedRanges,
        closedDays: [],
        reservations: blocks,
      };
    });
    // ✅ IMPORTANT: Ne PAS filtrer les listings sans réservations
    // User spec: "on les affiche" (afficher TOUTES les propriétés actives)
  }, [listings, reservations, startDate, planningWindowDays]);

  const goToToday = () => setCurrentStart(new Date());
  const goPrevWeek = () => setCurrentStart((d) => addDays(d, -7));
  const goNextWeek = () => setCurrentStart((d) => addDays(d, 7));

  return (
    <DashboardWrapper breadcrumb={['Réservations', 'Planning']}>
      <Box sx={{ p: { xs: 1.5, md: 2.5 }, pb: 3, bgcolor: t.bg0 }}>
        {/* Header avec navigation */}
        <Paper
          sx={{
            p: 2,
            mb: 2,
            border: `1px solid ${t.border}`,
            bgcolor: t.bg1,
            borderRadius: 1.5,
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          }}
        >
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: t.text3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                Planning Réservations
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: t.text }}>
                {format(parseISO(startDate), 'dd MMM yyyy')} → {format(parseISO(endDate), 'dd MMM yyyy')}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Tooltip title="Semaine précédente">
                <IconButton size="small" onClick={goPrevWeek} sx={{ color: t.text2 }}>
                  <ChevronLeft />
                </IconButton>
              </Tooltip>
              <Button
                size="small"
                startIcon={<Today sx={{ fontSize: 16 }} />}
                onClick={goToToday}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  color: t.text2,
                  border: `1px solid ${t.border}`,
                  '&:hover': { bgcolor: t.bg2 },
                }}
              >
                Aujourd'hui
              </Button>
              <Tooltip title="Semaine suivante">
                <IconButton size="small" onClick={goNextWeek} sx={{ color: t.text2 }}>
                  <ChevronRight />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>

        {loading && (
          <Paper sx={{ p: 3, border: `1px solid ${t.border}`, bgcolor: t.bg1, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', color: t.text3 }}>
              <CircularProgress size={18} sx={{ color: t.primary }} />
              <Typography sx={{ fontSize: 13 }}>Chargement du planning…</Typography>
            </Stack>
          </Paper>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: 13 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && (
          <Box
            sx={{
              bgcolor: t.bg1,
              borderRadius: 1.5,
              border: `1px solid ${t.border}`,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
              width: '100%',
              minWidth: 0,
            }}
          >
            <MultiPropertyInventory
              properties={propertyRows}
              startDate={parseISO(startDate)}
              days={planningWindowDays}
              showPrices={false}
            />
          </Box>
        )}
      </Box>
    </DashboardWrapper>
  );
}
