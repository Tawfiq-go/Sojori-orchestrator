import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import {
  mockGuests,
  mockListings,
  generateReservationNumber,
  calculateCommission,
  calculateNetOwner,
  type Reservation,
} from '../../data/mockReservations';

interface CreateReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (reservation: Partial<Reservation>) => void;
}

export function CreateReservationModal({ open, onClose, onSave }: CreateReservationModalProps) {
  // Form state
  const [guestId, setGuestId] = useState('');
  const [listingId, setListingId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkInTime, setCheckInTime] = useState('16:00');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [checkOutTime, setCheckOutTime] = useState('11:00');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [pricePerNight, setPricePerNight] = useState(200);
  const [totalPrice, setTotalPrice] = useState(0);
  const [currency, setCurrency] = useState('EUR');
  const [source, setSource] = useState<'airbnb' | 'booking' | 'vrbo' | 'direct'>('direct');
  const [commissionPercent, setCommissionPercent] = useState(0);
  const [otaCode, setOtaCode] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid' | 'partial'>('unpaid');
  const [sendEmail, setSendEmail] = useState(true);
  const [createTasks, setCreateTasks] = useState(true);

  // Derived values
  const selectedGuest = mockGuests.find(g => g.id === guestId);
  const selectedListing = mockListings.find(l => l.id === listingId);
  const nights = checkInDate && checkOutDate ?
    Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Auto-calculate total when nights or price changes
  useState(() => {
    if (nights > 0 && pricePerNight > 0) {
      setTotalPrice(nights * pricePerNight);
    }
  });

  // Auto-update commission when source changes
  useState(() => {
    const rates: Record<string, number> = {
      airbnb: 15,
      booking: 15,
      vrbo: 12,
      direct: 0,
    };
    setCommissionPercent(rates[source] || 0);
  });

  const commission = Math.round((totalPrice * commissionPercent) / 100);
  const netOwner = totalPrice - commission;

  const handleSubmit = () => {
    if (!guestId || !listingId || !checkInDate || !checkOutDate) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const guest = mockGuests.find(g => g.id === guestId);
    const listing = mockListings.find(l => l.id === listingId);

    const newReservation: Partial<Reservation> = {
      id: `r-${Date.now()}`,
      reservationNumber: generateReservationNumber(),
      guestName: guest?.name || '',
      guestInitials: guest?.name.split(' ').map(n => n[0]).join('') || '',
      guestMeta: guest?.country || '',
      guestColor: 'blue',
      guestEmail: guest?.email || '',
      guestPhone: guest?.phone || '',
      guestCountry: guest?.country || '',
      guestLanguage: 'EN',

      listing: `${listing?.name} · ${listing?.city}`,
      listingId: listing?.id || '',
      listingColor: listing?.color || 'blue',
      location: listing?.city || '',

      checkIn: new Date(checkInDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      checkInDate,
      checkInTime,
      checkOut: new Date(checkOutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      checkOutDate,
      checkOutTime,
      nights,
      daysToGo: `J+${Math.ceil((new Date(checkInDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}`,

      status: paymentStatus === 'paid' ? 'success' : 'warning',
      statusLabel: paymentStatus === 'paid' ? 'Confirmée' : 'En attente paiement',

      source,
      otaCode: otaCode || undefined,

      revenue: `€${totalPrice.toLocaleString('fr')}`,
      totalPrice,
      currency,
      pricePerNight,
      cleaningFee: 0,
      commission,
      commissionPercent,
      netOwner,

      paymentStatus,

      adults,
      children,
      infants,
      travelers: [],

      notes: notes || undefined,

      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(newReservation);
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setGuestId('');
    setListingId('');
    setCheckInDate('');
    setCheckOutDate('');
    setCheckInTime('16:00');
    setCheckOutTime('11:00');
    setAdults(2);
    setChildren(0);
    setInfants(0);
    setPricePerNight(200);
    setTotalPrice(0);
    setCurrency('EUR');
    setSource('direct');
    setCommissionPercent(0);
    setOtaCode('');
    setNotes('');
    setPaymentStatus('unpaid');
    setSendEmail(true);
    setCreateTasks(true);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: '16px',
            maxHeight: '90vh',
          },
        },
      }}
    >
      <DialogTitle sx={{
        pb: 2,
        borderBottom: `1px solid ${t.border}`,
        fontSize: 18,
        fontWeight: 700,
      }}>
        ➕ Créer une nouvelle réservation
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 340px' },
          gap: 3
        }}>
          {/* LEFT: Form fields */}
          <Stack spacing={3}>
            {/* Guest & Property */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Voyageur & Propriété
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth required>
                  <InputLabel>Voyageur</InputLabel>
                  <Select value={guestId} onChange={(e) => setGuestId(e.target.value)} label="Voyageur">
                    {mockGuests.map(guest => (
                      <MenuItem key={guest.id} value={guest.id}>
                        {guest.name} {guest.country}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl fullWidth required>
                  <InputLabel>Propriété</InputLabel>
                  <Select value={listingId} onChange={(e) => setListingId(e.target.value)} label="Propriété">
                    {mockListings.map(listing => (
                      <MenuItem key={listing.id} value={listing.id}>
                        {listing.name} · {listing.city}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Dates */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Dates de séjour
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Check-in"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    type="time"
                    label="Heure"
                    value={checkInTime}
                    onChange={(e) => setCheckInTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>

                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    required
                    type="date"
                    label="Check-out"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <TextField
                    fullWidth
                    type="time"
                    label="Heure"
                    value={checkOutTime}
                    onChange={(e) => setCheckOutTime(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                </Stack>

                {nights > 0 && (
                  <Box sx={{
                    p: 1.5,
                    bgcolor: t.bg2,
                    borderRadius: '8px',
                    border: `1px solid ${t.border}`
                  }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                      🌙 {nights} nuit{nights > 1 ? 's' : ''}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* Travelers */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Voyageurs
              </Typography>
              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Adultes"
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Enfants"
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
                <TextField
                  fullWidth
                  type="number"
                  label="Bébés"
                  value={infants}
                  onChange={(e) => setInfants(Number(e.target.value))}
                  slotProps={{ htmlInput: { min: 0 } }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Pricing */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Tarification
              </Typography>
              <Stack spacing={2}>
                <Stack direction="row" spacing={2}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Prix par nuit"
                    value={pricePerNight}
                    onChange={(e) => {
                      const ppn = Number(e.target.value);
                      setPricePerNight(ppn);
                      if (nights > 0) setTotalPrice(nights * ppn);
                    }}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">€</InputAdornment>,
                      },
                    }}
                  />
                  <TextField
                    fullWidth
                    type="number"
                    label="Prix total"
                    value={totalPrice}
                    onChange={(e) => setTotalPrice(Number(e.target.value))}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">€</InputAdornment>,
                      },
                    }}
                  />
                </Stack>

                <FormControl fullWidth>
                  <InputLabel>Devise</InputLabel>
                  <Select value={currency} onChange={(e) => setCurrency(e.target.value)} label="Devise">
                    <MenuItem value="EUR">EUR (€)</MenuItem>
                    <MenuItem value="USD">USD ($)</MenuItem>
                    <MenuItem value="GBP">GBP (£)</MenuItem>
                    <MenuItem value="MAD">MAD (MAD)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            </Box>

            <Divider />

            {/* Source & Commission */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Source & Commission
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Source / Canal</InputLabel>
                  <Select
                    value={source}
                    onChange={(e) => {
                      setSource(e.target.value as any);
                      const rates: Record<string, number> = { airbnb: 15, booking: 15, vrbo: 12, direct: 0 };
                      setCommissionPercent(rates[e.target.value] || 0);
                    }}
                    label="Source / Canal"
                  >
                    <MenuItem value="direct">🏠 Direct</MenuItem>
                    <MenuItem value="airbnb">🏡 Airbnb</MenuItem>
                    <MenuItem value="booking">🏨 Booking.com</MenuItem>
                    <MenuItem value="vrbo">🏘️ Vrbo</MenuItem>
                  </Select>
                </FormControl>

                {source !== 'direct' && (
                  <TextField
                    fullWidth
                    label="Code de confirmation OTA"
                    value={otaCode}
                    onChange={(e) => setOtaCode(e.target.value)}
                    placeholder="Ex: HMXY42TZ8K"
                  />
                )}

                <TextField
                  fullWidth
                  type="number"
                  label="Commission (%)"
                  value={commissionPercent}
                  onChange={(e) => setCommissionPercent(Number(e.target.value))}
                  slotProps={{
                    input: {
                      endAdornment: <InputAdornment position="end">%</InputAdornment>,
                    },
                  }}
                />
              </Stack>
            </Box>

            <Divider />

            {/* Payment & Options */}
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5, color: t.text2 }}>
                Paiement & Options
              </Typography>
              <Stack spacing={2}>
                <FormControl fullWidth>
                  <InputLabel>Statut paiement</InputLabel>
                  <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)} label="Statut paiement">
                    <MenuItem value="paid">✅ Payé</MenuItem>
                    <MenuItem value="partial">⏳ Partiel</MenuItem>
                    <MenuItem value="unpaid">❌ Non payé</MenuItem>
                  </Select>
                </FormControl>

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes internes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Demandes spéciales, préférences..."
                />

                <FormControlLabel
                  control={<Checkbox checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />}
                  label="Envoyer email de confirmation au voyageur"
                />

                <FormControlLabel
                  control={<Checkbox checked={createTasks} onChange={(e) => setCreateTasks(e.target.checked)} />}
                  label="Créer les tâches automatiquement"
                />
              </Stack>
            </Box>
          </Stack>

          {/* RIGHT: Summary panel */}
          <Box sx={{
            position: 'sticky',
            top: 0,
            height: 'fit-content',
            p: 2.5,
            bgcolor: t.bg2,
            borderRadius: '12px',
            border: `1px solid ${t.border}`,
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>
              📋 Résumé
            </Typography>

            <Stack spacing={1.5} sx={{ fontSize: 12.5 }}>
              <SummaryRow label="Voyageur" value={selectedGuest?.name || '-'} />
              <SummaryRow label="Propriété" value={selectedListing?.name || '-'} />
              <SummaryRow label="Check-in" value={checkInDate ? new Date(checkInDate).toLocaleDateString('fr') : '-'} mono />
              <SummaryRow label="Check-out" value={checkOutDate ? new Date(checkOutDate).toLocaleDateString('fr') : '-'} mono />
              <SummaryRow label="Nuits" value={nights > 0 ? `${nights}` : '-'} />
              <SummaryRow label="Voyageurs" value={`${adults}A · ${children}C · ${infants}I`} />

              <Divider sx={{ my: 1 }} />

              <SummaryRow label="Prix/nuit" value={`€${pricePerNight}`} />
              <SummaryRow label="Total" value={`€${totalPrice}`} bold />
              <SummaryRow label="Commission" value={`€${commission} (${commissionPercent}%)`} />
              <SummaryRow label="Net propriétaire" value={`€${netOwner}`} bold color={t.success} />

              <Divider sx={{ my: 1 }} />

              <SummaryRow label="Source" value={source === 'direct' ? '🏠 Direct' : source === 'airbnb' ? '🏡 Airbnb' : source === 'booking' ? '🏨 Booking' : '🏘️ Vrbo'} />
              <SummaryRow label="Paiement" value={paymentStatus === 'paid' ? '✅ Payé' : paymentStatus === 'partial' ? '⏳ Partiel' : '❌ Non payé'} />
            </Stack>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, borderTop: `1px solid ${t.border}`, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: t.text2,
            '&:hover': { bgcolor: t.bg2 }
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: t.primary,
            color: '#fff',
            fontWeight: 600,
            px: 3,
            '&:hover': { bgcolor: t.primaryDeep }
          }}
        >
          💾 Créer la réservation
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Helper component
function SummaryRow({ label, value, mono, bold, color }: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography sx={{ color: t.text3, fontSize: 12 }}>{label}</Typography>
      <Typography sx={{
        fontWeight: bold ? 700 : 600,
        fontSize: 12,
        fontFamily: mono ? 'Geist Mono' : 'inherit',
        color: color || t.text,
      }}>
        {value}
      </Typography>
    </Stack>
  );
}
