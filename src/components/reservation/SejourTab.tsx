/**
 * Onglet Séjour — Vue calendrier planning pour une réservation
 * Design aligné sur TasksPlanningPage (tokens Atelier 2026)
 * Affiche le calendrier de séjour avec les réservations sur la propriété
 */

import { useMemo } from 'react';
import { Box, Stack, Typography, Paper, Chip } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MultiPropertyInventory, type PropertyRow } from '../MultiPropertyInventory';

const T = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e',
  warning: '#c46506',
  error: '#c81e1e',
  info: '#0673b3',
};

interface SejourTabProps {
  reservationDetails: any;
}

export function SejourTab({ reservationDetails }: SejourTabProps) {
  // Extract data
  const listingName = reservationDetails?.listing?.name || reservationDetails?.listingName || 'Propriété';
  const arrivalDate = reservationDetails?.arrivalDate ? parseISO(reservationDetails.arrivalDate) : new Date();
  const departureDate = reservationDetails?.departureDate ? parseISO(reservationDetails.departureDate) : new Date();
  const nights = reservationDetails?.nights || 1;

  // Current day in stay
  const today = new Date();
  const currentDay = today >= arrivalDate && today <= departureDate
    ? Math.ceil((today.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  // Build calendar data for MultiPropertyInventory
  const propertyRows: PropertyRow[] = useMemo(() => {
    // Calculate day indices (0-based from arrival date)
    const daysDiff = Math.ceil((departureDate.getTime() - arrivalDate.getTime()) / (1000 * 60 * 60 * 24));

    return [
      {
        id: reservationDetails?._id || 'property-1',
        name: listingName,
        city: reservationDetails?.listing?.city || 'Casablanca',
        photoColor: 'gold' as const,
        occupancyPct: 87, // TODO: Fetch real data
        monthRevenue: `${reservationDetails?.totalPrice || 0}€`,
        bookedRanges: [[0, daysDiff]], // Réservation actuelle couvre tout le séjour
        closedDays: [],
        reservations: [
          {
            id: reservationDetails?.reservationNumber || 'res-1',
            guestName: reservationDetails?.guestName || 'Guest',
            guestFlag: '🌍', // TODO: Utiliser le vrai drapeau depuis guestCountryCode
            amount: `${reservationDetails?.totalPrice || 0}${reservationDetails?.currency || '€'}`,
            startDay: 0,
            endDay: daysDiff,
            status: reservationDetails?.status === 'confirmed' ? 'confirmed' : 'pending',
          },
        ],
      },
    ];
  }, [reservationDetails, listingName, arrivalDate, departureDate]);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: T.bg0 }}>
      <Stack spacing={2.5}>
        {/* Info Header */}
        <Paper
          sx={{
            p: 2.5,
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.5,
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}>
            <Box>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: T.text3,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  mb: 0.5,
                }}
              >
                Séjour en cours
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.text }}>
                {listingName}
              </Typography>
              <Typography sx={{ fontSize: 13, color: T.text2, mt: 0.5 }}>
                {format(arrivalDate, 'dd MMM yyyy', { locale: fr })} → {format(departureDate, 'dd MMM yyyy', { locale: fr })} · {nights} {nights > 1 ? 'nuits' : 'nuit'}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              {currentDay > 0 && currentDay <= nights && (
                <Chip
                  label={`Jour ${currentDay}/${nights}`}
                  sx={{
                    bgcolor: T.primaryTint,
                    color: T.primary,
                    fontWeight: 700,
                    fontSize: 13,
                    height: 32,
                  }}
                />
              )}
              <Chip
                label={`${reservationDetails?.adults || 0} adulte${(reservationDetails?.adults || 0) > 1 ? 's' : ''}`}
                sx={{
                  bgcolor: T.bg2,
                  color: T.text2,
                  fontWeight: 600,
                  fontSize: 12,
                  height: 28,
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {/* Calendar View */}
        <Paper
          sx={{
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.5,
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: T.bg2,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 700,
                color: T.text2,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Calendrier de séjour
            </Typography>
          </Box>

          <Box sx={{ p: 2 }}>
            <MultiPropertyInventory
              properties={propertyRows}
              startDate={arrivalDate}
              days={nights + 2}
              showPrices={false}
            />
          </Box>
        </Paper>

        {/* Placeholder pour features futures */}
        <Paper
          sx={{
            p: 3,
            bgcolor: T.bg1,
            border: `1px dashed ${T.borderStrong}`,
            borderRadius: 1.5,
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: 28, mb: 1 }}>🏠</Typography>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text2 }}>
            Historique des séjours
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.5 }}>
            À venir : statistiques, séjours précédents, préférences du voyageur
          </Typography>
        </Paper>
      </Stack>
    </Box>
  );
}
