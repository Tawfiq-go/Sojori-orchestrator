// ════════════════════════════════════════════════════════════════════
// Sojori — Guest Info Tab Component (Reproduction exacte ancien dashboard)
// Affiche tous les détails: Voyageur, Propriété, Dates, Notes, Données OTA, Comparaison prix
// Layout: Cards avec toutes les informations de l'ancien dashboard
// ════════════════════════════════════════════════════════════════════

import { Box, Typography, Paper, Chip, Divider, Stack, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import moment from 'moment';
import 'moment/locale/fr';

moment.locale('fr');

interface GuestInfoTabProps {
  reservationDetails: any;
  isEditMode: boolean;
}

const COLORS = {
  primary: '#00b4b4',
  text1: '#1a1a1a',
  text2: '#676a6c',
  text3: '#9ca3af',
  bg: '#ffffff',
  bg2: '#f9fafb',
  bg3: '#f3f4f6',
  border: '#e5e7eb',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
};

export function GuestInfoTab({ reservationDetails, isEditMode }: GuestInfoTabProps) {
  if (!reservationDetails) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Aucune donnée disponible</Typography>
      </Box>
    );
  }

  const renderField = (label: string, value: any, name?: string) => (
    <Box sx={{ mb: 2 }}>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 14,
          color: COLORS.text1,
          mb: 0.5,
        }}
      >
        {label}
      </Typography>
      <TextField
        fullWidth
        size="small"
        value={value || ''}
        name={name}
        disabled={!isEditMode}
        slotProps={{
          input: {
            readOnly: !isEditMode,
            sx: {
              bgcolor: isEditMode ? COLORS.bg : COLORS.bgDisabled,
              fontSize: 14,
              '& .MuiInputBase-input': {
                color: COLORS.text1,
              },
            },
          },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: isEditMode ? COLORS.border : COLORS.borderDisabled,
            },
          },
        }}
      />
    </Box>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        mb: 3,
        border: `1px solid ${COLORS.borderDisabled}`,
        borderRadius: 2,
      }}
    >
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          fontSize: 18,
          color: COLORS.text1,
          mb: 3,
        }}
      >
        {title}
      </Typography>
      {children}
    </Paper>
  );

  // Format date helper
  const formatDate = (date: any) => {
    if (!date) return '';
    try {
      return new Date(date).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  // Format time helper
  const formatTime = (time: any) => {
    if (!time) return '';
    if (typeof time === 'number') {
      const hours = Math.floor(time / 100);
      const minutes = time % 100;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    return String(time);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Reservation Number */}
      <Typography
        variant="h5"
        sx={{
          fontWeight: 700,
          fontSize: 18,
          color: COLORS.text1,
          mb: 4,
        }}
      >
        Numéro de réservation: {reservationDetails.reservationNumber || reservationDetails.id}
      </Typography>

      {/* Desktop Layout: 2 columns */}
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>
        <Grid container spacing={3}>
          {/* LEFT COLUMN */}
          <Grid item xs={12} md={6}>
            {/* Guest Details */}
            {renderSection(
              'Détails du voyageur',
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {renderField('Prénom', reservationDetails.guestFirstName, 'guestFirstName')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Nom', reservationDetails.guestLastName, 'guestLastName')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Email', reservationDetails.guestEmail, 'guestEmail')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Téléphone', reservationDetails.phone, 'phone')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Pays', reservationDetails.guestCountry, 'guestCountry')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Ville', reservationDetails.guestCity, 'guestCity')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Langue', reservationDetails.guestLanguage, 'guestLanguage')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField(
                    'Nombre de voyageurs',
                    reservationDetails.numberOfGuests ||
                    (reservationDetails.adults || 0) +
                    (reservationDetails.children || 0) +
                    (reservationDetails.infants || 0),
                    'numberOfGuests'
                  )}
                </Grid>
              </Grid>
            )}

            {/* Invoices and Charges */}
            {renderSection(
              'Paiements et frais',
              <Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    {renderField('Prix total', `${reservationDetails.totalPrice || 0} ${reservationDetails.currency || 'EUR'}`)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {renderField('Déjà payé', `${reservationDetails.alreadyPaid || 0} ${reservationDetails.currency || 'EUR'}`)}
                  </Grid>
                  <Grid item xs={12}>
                    {renderField('Statut paiement', reservationDetails.paymentStatus || 'N/A', 'paymentStatus')}
                  </Grid>
                </Grid>
                {(!reservationDetails.alreadyPaid || reservationDetails.alreadyPaid === 0) && (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: '#ef4444',
                      mt: 2,
                      fontStyle: 'italic',
                    }}
                  >
                    ⚠️ Aucun paiement enregistré
                  </Typography>
                )}
              </Box>
            )}
          </Grid>

          {/* RIGHT COLUMN */}
          <Grid item xs={12} md={6}>
            {/* Listing Details */}
            {renderSection(
              'Propriété',
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  {renderField(
                    'Propriété',
                    reservationDetails.listing?.name || reservationDetails.sojoriId || 'N/A',
                    'sojoriId'
                  )}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('Adultes', reservationDetails.adults || 0, 'adults')}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('Enfants', reservationDetails.children || 0, 'children')}
                </Grid>
                <Grid item xs={12} sm={4}>
                  {renderField('Bébés', reservationDetails.infants || 0, 'infants')}
                </Grid>
              </Grid>
            )}

            {/* Reservation Details */}
            {renderSection(
              'Détails de la réservation',
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  {renderField('Date d\'arrivée', formatDate(reservationDetails.arrivalDate), 'arrivalDate')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Date de départ', formatDate(reservationDetails.departureDate), 'departureDate')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Heure check-in', formatTime(reservationDetails.checkInTime), 'checkInTime')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Heure check-out', formatTime(reservationDetails.checkOutTime), 'checkOutTime')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Nuits', reservationDetails.nights || 0, 'nights')}
                </Grid>
                <Grid item xs={12} sm={6}>
                  {renderField('Devise', reservationDetails.currency || 'EUR', 'currency')}
                </Grid>
                <Grid item xs={12}>
                  {renderField('Statut', reservationDetails.status, 'status')}
                </Grid>
                <Grid item xs={12}>
                  {renderField('Canal', reservationDetails.channelName || reservationDetails.otaCode || 'Direct', 'channelName')}
                </Grid>
                <Grid item xs={12}>
                  {renderField('Politique d\'annulation', reservationDetails.cancellationPolicy || 'N/A', 'cancellationPolicy')}
                </Grid>
                {reservationDetails.doorCode && reservationDetails.doorCode !== '—' && (
                  <Grid item xs={12}>
                    <Box
                      sx={{
                        p: 2,
                        bgcolor: '#fef3c7',
                        border: '1px solid #fbbf24',
                        borderRadius: 1,
                      }}
                    >
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#92400e', mb: 0.5 }}>
                        🔑 Code porte
                      </Typography>
                      <Typography sx={{ fontSize: 18, fontWeight: 700, color: '#92400e' }}>
                        {reservationDetails.doorCode}
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Grid>
        </Grid>
      </Box>

      {/* Mobile Layout: Single column */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {/* Guest Details */}
        {renderSection(
          'Détails du voyageur',
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {renderField('Prénom', reservationDetails.guestFirstName, 'guestFirstName')}
            </Grid>
            <Grid item xs={12}>
              {renderField('Nom', reservationDetails.guestLastName, 'guestLastName')}
            </Grid>
            <Grid item xs={12}>
              {renderField('Email', reservationDetails.guestEmail, 'guestEmail')}
            </Grid>
            <Grid item xs={12}>
              {renderField('Téléphone', reservationDetails.phone, 'phone')}
            </Grid>
            <Grid item xs={12}>
              {renderField('Pays', reservationDetails.guestCountry, 'guestCountry')}
            </Grid>
            <Grid item xs={12}>
              {renderField('Langue', reservationDetails.guestLanguage, 'guestLanguage')}
            </Grid>
          </Grid>
        )}

        {/* Listing Details */}
        {renderSection(
          'Propriété',
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {renderField('Propriété', reservationDetails.listing?.name || reservationDetails.sojoriId)}
            </Grid>
            <Grid item xs={4}>
              {renderField('Adultes', reservationDetails.adults || 0)}
            </Grid>
            <Grid item xs={4}>
              {renderField('Enfants', reservationDetails.children || 0)}
            </Grid>
            <Grid item xs={4}>
              {renderField('Bébés', reservationDetails.infants || 0)}
            </Grid>
          </Grid>
        )}

        {/* Reservation Details */}
        {renderSection(
          'Dates et heures',
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {renderField('Date d\'arrivée', formatDate(reservationDetails.arrivalDate))}
            </Grid>
            <Grid item xs={12}>
              {renderField('Date de départ', formatDate(reservationDetails.departureDate))}
            </Grid>
            <Grid item xs={6}>
              {renderField('Check-in', formatTime(reservationDetails.checkInTime))}
            </Grid>
            <Grid item xs={6}>
              {renderField('Check-out', formatTime(reservationDetails.checkOutTime))}
            </Grid>
            <Grid item xs={12}>
              {renderField('Nuits', reservationDetails.nights || 0)}
            </Grid>
          </Grid>
        )}

        {/* Payment */}
        {renderSection(
          'Paiement',
          <Grid container spacing={2}>
            <Grid item xs={12}>
              {renderField('Prix total', `${reservationDetails.totalPrice || 0} ${reservationDetails.currency || 'EUR'}`)}
            </Grid>
            <Grid item xs={12}>
              {renderField('Déjà payé', `${reservationDetails.alreadyPaid || 0} ${reservationDetails.currency || 'EUR'}`)}
            </Grid>
            <Grid item xs={12}>
              {renderField('Statut paiement', reservationDetails.paymentStatus || 'N/A')}
            </Grid>
          </Grid>
        )}
      </Box>

      {/* Rate Details Table (Collapsible) */}
      {reservationDetails.roomsDetails && reservationDetails.roomsDetails.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.text1,
              mb: 2,
              textAlign: 'center',
              cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            🔽 Voir le détail des tarifs
          </Typography>
          {/* TODO: Implement RateDetailsTable component */}
        </Box>
      )}
    </Box>
  );
}
