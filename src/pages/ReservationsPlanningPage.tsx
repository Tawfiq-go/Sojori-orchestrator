/**
 * Vue Planning Réservations — Calendrier Gantt type « Vue Séjour »
 * Inspiré de TasksPlanningPage mais affiche UNIQUEMENT les réservations
 * Design aligné sur tokens Atelier 2026
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
import type { Reservation } from '../types/reservations.types';
import { filterPlanningReservations } from '../utils/filterReservations';

export function ReservationsPlanningPage() {
  const { user } = useAuth();
  const [currentStart, setCurrentStart] = useState(() => new Date());
  const startDate = format(currentStart, 'yyyy-MM-dd');
  const endDate = format(addDays(currentStart, 30), 'yyyy-MM-dd');

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

  // Fetch reservations
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reservationsService.getList({ limit: 1000 });

      // Filtrer pour le planning: seulement Confirmed et Pending
      const planningReservations = filterPlanningReservations(response.data as any[]);

      setReservations(planningReservations);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement réservations');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Group reservations by listing
  const propertyRows: PropertyRow[] = useMemo(() => {
    // Group by listing
    const byListing = new Map<string, Reservation[]>();

    reservations.forEach((res) => {
      const listingId = res.listing?._id || 'unknown';
      if (!byListing.has(listingId)) {
        byListing.set(listingId, []);
      }
      byListing.get(listingId)!.push(res);
    });

    // Convert to PropertyRow format
    return Array.from(byListing.entries()).map(([listingId, resas]) => {
      const firstRes = resas[0];
      const listingName = firstRes.listing?.name || 'Propriété Inconnue';

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
        name: listingName,
        city: 'Casablanca', // TODO: Get from listing data
        photoColor: 'gold' as const,
        occupancyPct: 0, // Pas affiché dans la vue planning
        monthRevenue: '', // Pas de revenus affichés dans la vue planning
        bookedRanges,
        closedDays: [],
        reservations: blocks,
      };
    });
  }, [reservations, startDate, planningWindowDays]);

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
