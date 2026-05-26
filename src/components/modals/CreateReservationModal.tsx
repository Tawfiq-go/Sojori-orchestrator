// ════════════════════════════════════════════════════════════════════
// CreateReservationModal.tsx — Version Hybride
// Design Claude V2 (Grid, scrollbar 8px) + Logique métier Sojori
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  MenuItem,
  Select,
  FormControl,
  InputAdornment,
  CircularProgress,
  Alert,
  Autocomplete,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { tokens as t } from '../dashboard/DashboardV2.components';
import { toast } from 'react-toastify';
import { reservationsService } from '../../services/reservationsService';
import { listingsService } from '../../services/listingsService';
import { ReservationAvailabilityCalendar } from './ReservationAvailabilityCalendar';
import { ModalScrollColumn } from '../common/ModalScrollColumn';
import { blurActiveElement } from '../../utils/domFocus';

// Liste complète des pays avec drapeaux
const COUNTRIES = [
  '🇲🇦 Maroc', '🇫🇷 France', '🇪🇸 Espagne', '🇩🇪 Allemagne', '🇬🇧 Royaume-Uni',
  '🇮🇹 Italie', '🇧🇪 Belgique', '🇳🇱 Pays-Bas', '🇺🇸 États-Unis', '🇨🇦 Canada',
  '🇨🇭 Suisse', '🇸🇦 Arabie Saoudite', '🇦🇪 Émirats Arabes Unis', '🇵🇹 Portugal',
  '🇩🇿 Algérie', '🇹🇳 Tunisie', '🇸🇳 Sénégal', '🇨🇮 Côte d\'Ivoire', '🇵🇱 Pologne',
  '🇷🇺 Russie', '🇹🇷 Turquie', '🇯🇵 Japon', '🇨🇳 Chine',
];

/** Zone scroll imbriquée (grille prix/jour) */
const modalScrollNestedSx = {
  overflowY: 'scroll' as const,
  overflowX: 'hidden' as const,
  maxHeight: 240,
  minHeight: 0,
  overscrollBehavior: 'contain' as const,
};

interface CreateReservationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface Listing {
  id: string;
  name: string;
  propertyUnit?: string;
  roomTypes: Array<{
    _id: string;
    roomTypeName: string;
    personCapacityMax?: number;
  }>;
}

export function CreateReservationModal({ open, onClose, onSuccess }: CreateReservationModalProps) {
  // ─── State ───────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listings, setListings] = useState<Listing[]>([]);
  const [roomTypes, setRoomTypes] = useState<Array<{ _id: string; roomTypeName: string; personCapacityMax?: number }>>([]);

  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guestCountry, setGuestCountry] = useState('');
  const [guestLanguage, setGuestLanguage] = useState('fr');

  const [listingId, setListingId] = useState('');
  const [roomTypeId, setRoomTypeId] = useState('');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);

  const [currency, setCurrency] = useState('EUR');
  const [pricingMode, setPricingMode] = useState<'calendar' | 'perDay' | 'total'>('calendar');
  const [uniformPrice, setUniformPrice] = useState('');
  const [dailyPrices, setDailyPrices] = useState<Record<string, number>>({});
  const [totalPrice, setTotalPrice] = useState(0);
  const [calendarPriceEstimate, setCalendarPriceEstimate] = useState<number | null>(null);

  const [status, setStatus] = useState<'Pending' | 'Confirmed'>('Confirmed');
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'UnPaid'>('UnPaid');
  const [paymentType, setPaymentType] = useState<'cash' | 'bank_card'>('cash');

  // ─── Derived ─────────────────────────────────────────
  const selectedListing = listings.find(l => l.id === listingId);
  const isSingleProperty = selectedListing?.propertyUnit === 'Single' || (selectedListing && roomTypes.length === 1);
  const showRoomType = listingId && !isSingleProperty;

  const nights = useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    return Math.ceil((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24));
  }, [checkInDate, checkOutDate]);

  const numberOfGuests = adults + children + infants;

  // Daily dates for perDay mode
  const dailyDates: string[] = [];
  if (checkInDate && checkOutDate && nights > 0) {
    const start = new Date(checkInDate);
    for (let i = 0; i < nights; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dailyDates.push(date.toISOString().split('T')[0]);
    }
  }

  const perDayTotal = Object.values(dailyPrices).reduce((sum, price) => sum + (price || 0), 0);

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'EUR': return '€';
      case 'USD': return '$';
      case 'MAD': return 'MAD';
      default: return curr;
    }
  };

  // ─── Effects ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      fetchListings();
    }
  }, [open]);

  useEffect(() => {
    if (listingId) {
      const listing = listings.find(l => l.id === listingId);
      if (listing) {
        setRoomTypes(listing.roomTypes || []);
        const isSingle = listing.propertyUnit === 'Single' || listing.roomTypes?.length === 1;
        if (isSingle && listing.roomTypes?.[0]) {
          setRoomTypeId(listing.roomTypes[0]._id);
        } else {
          setRoomTypeId('');
        }
      }
    } else {
      setRoomTypes([]);
      setRoomTypeId('');
    }
  }, [listingId, listings]);

  // ─── Handlers ────────────────────────────────────────
  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listingsService.getListingsWithRoomTypes({
        staging: false,
        compact: false,
        active: true, // ✅ Filtrer uniquement les listings actifs
      });

      if (result.success) {
        setListings(result.data);
      } else {
        setError('Erreur lors du chargement des propriétés');
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Erreur lors du chargement des propriétés');
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = (mode: 'calendar' | 'perDay' | 'total') => {
    if ((mode === 'perDay' || mode === 'total') && (!checkInDate || !checkOutDate)) {
      toast.error('⚠️ Veuillez d\'abord sélectionner les dates de séjour');
      return;
    }
    setPricingMode(mode);
    if (mode !== 'perDay') setDailyPrices({});
    if (mode !== 'total') setTotalPrice(0);
  };

  const handleUniformPriceFill = () => {
    if (!uniformPrice || dailyDates.length === 0) return;

    const price = parseFloat(uniformPrice);
    if (isNaN(price) || price < 0) {
      toast.error('Prix uniforme invalide');
      return;
    }

    const newDailyPrices: Record<string, number> = {};
    dailyDates.forEach(date => {
      newDailyPrices[date] = price;
    });
    setDailyPrices(newDailyPrices);
    toast.success(`✅ Prix de ${price} ${getCurrencySymbol(currency)} appliqué à ${nights} nuit${nights > 1 ? 's' : ''}`);
  };

  const handleSubmit = async () => {
    // Validation
    if (!guestFirstName || !guestLastName) {
      toast.error('Prénom et nom du voyageur requis');
      return;
    }
    if (!guestEmail || !phone) {
      toast.error('Email et téléphone requis');
      return;
    }
    if (!listingId) {
      toast.error('Propriété requise');
      return;
    }
    if (!checkInDate || !checkOutDate) {
      toast.error('Dates d\'arrivée et de départ requises');
      return;
    }
    if (new Date(checkOutDate) <= new Date(checkInDate)) {
      toast.error('La date de départ doit être après l\'arrivée');
      return;
    }

    if (pricingMode === 'total' && (!totalPrice || totalPrice <= 0)) {
      toast.error('Prix total requis en mode tarification totale');
      return;
    }

    if (pricingMode === 'perDay') {
      const hasPrices = Object.keys(dailyPrices).some(key => dailyPrices[key] > 0);
      if (!hasPrices) {
        toast.error('Veuillez saisir au moins un prix par jour');
        return;
      }
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const data: any = {
        guestFirstName: guestFirstName.trim(),
        guestLastName: guestLastName.trim(),
        guestEmail: guestEmail.trim(),
        phone: phone.trim(),
        guestCountry: guestCountry.trim() || undefined,
        guestLanguage,
        sojoriId: listingId,
        roomTypeId,
        arrivalDate: checkInDate,
        departureDate: checkOutDate,
        numberOfGuests,
        adults,
        children: children || undefined,
        infants: infants || undefined,
        pricingMode,
        currency,
        status,
        paymentStatus,
        paymentType,
        atSojori: true,
      };

      // Handle 3 pricing modes
      if (pricingMode === 'perDay') {
        const days: Record<string, string> = {};
        let total = 0;

        dailyDates.forEach(dateKey => {
          const price = dailyPrices[dateKey] || 0;
          days[dateKey] = price.toFixed(2);
          total += price;
        });

        data.manualPricing = true;
        data.manualTotalPrice = total;
        data.manualDays = days;
      } else if (pricingMode === 'total') {
        const pricePerDay = totalPrice / nights;
        const days: Record<string, string> = {};

        dailyDates.forEach(dateKey => {
          days[dateKey] = pricePerDay.toFixed(2);
        });

        data.manualPricing = true;
        data.manualTotalPrice = totalPrice;
        data.manualDays = days;
      }

      const result = await reservationsService.create(data);

      if (result.success) {
        toast.success('✅ Réservation créée avec succès');
        onClose();
        resetForm();
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMsg = humanizeReservationError(result.error || 'Erreur lors de la création de la réservation');
        setError(errorMsg);
        toast.error(errorMsg, { autoClose: 8000 });
      }
    } catch (err: any) {
      console.error('Error creating reservation:', err);
      const rawMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Erreur lors de la création';
      const errorMsg = humanizeReservationError(rawMsg);
      setError(errorMsg);
      toast.error(errorMsg, { autoClose: 8000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setGuestFirstName('');
    setGuestLastName('');
    setGuestEmail('');
    setPhone('');
    setGuestCountry('');
    setGuestLanguage('fr');
    setListingId('');
    setRoomTypeId('');
    setCheckInDate('');
    setCheckOutDate('');
    setAdults(1);
    setChildren(0);
    setInfants(0);
    setPricingMode('calendar');
    setTotalPrice(0);
    setCalendarPriceEstimate(null);
    setCurrency('EUR');
    setDailyPrices({});
    setUniformPrice('');
    setStatus('Confirmed');
    setPaymentStatus('UnPaid');
    setPaymentType('cash');
    setError(null);
  };

  const handleClose = () => {
    blurActiveElement();
    onClose();
  };

  // ─── Render ──────────────────────────────────────────
  const modalWidth = 1220;
  const modalHeight = 'min(84vh, 740px)';
  const summaryColWidth = 420;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      disableScrollLock
      disableRestoreFocus
      slotProps={{
        backdrop: { sx: { backgroundColor: 'rgba(20,17,10,0.42)' } },
        paper: {
          sx: {
            width: modalWidth,
            maxWidth: '96vw',
            height: modalHeight,
            maxHeight: 'calc(100vh - 32px) !important',
            borderRadius: '20px',
            overflow: 'hidden !important',
            overflowY: 'hidden !important',
            display: 'flex !important',
            flexDirection: 'column !important',
            p: 0,
            m: '16px auto',
            boxShadow: '0 32px 80px rgba(20,17,10,0.18)',
            boxSizing: 'border-box',
          },
        },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateRows: 'auto 1fr auto',
          height: '100%',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
      {/* ─── Header ─── */}
      <Box
        sx={{
          flexShrink: 0,
          p: '20px 24px',
          borderBottom: `1px solid ${t.border}`,
          background: `linear-gradient(180deg, #fff, ${t.bg2})`,
          display: 'flex',
          alignItems: 'center',
          gap: 1.75,
        }}
      >
        <Box
          sx={{
            width: 42,
            height: 42,
            borderRadius: 1.375,
            background: `linear-gradient(135deg, ${t.primarySoft}, ${t.primaryDeep})`,
            color: '#1a1408',
            fontSize: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(184,133,26,0.35), inset 0 1px 0 rgba(255,255,255,0.30)',
          }}
        >
          🎫
        </Box>
        <Box>
          <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Nouvelle réservation
          </Typography>
          <Typography
            sx={{
              fontSize: 11.5,
              color: t.text3,
              fontFamily: '"Geist Mono", monospace',
              mt: 0.375,
            }}
          >
            création manuelle
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ ml: 'auto' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Sticky error banner — always visible above the scrollable form so a backend error
          (e.g. "Minimum stay is 5") is never hidden when the user is at the bottom of the form. */}
      {error && (
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setError(null)}
          sx={{
            mx: 3,
            mt: 1.5,
            mb: 0,
            borderRadius: 1.25,
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(211,47,47,0.25)',
          }}
        >
          {error}
        </Alert>
      )}

      {/* ─── Body : 2 colonnes scrollables ─── */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <ModalScrollColumn
          active={open}
          className="create-reservation-form-scroll"
          wrapperSx={{ flex: { xs: '1 1 55%', md: '1 1 0' } }}
          innerSx={{ p: '22px 26px' }}
        >
          {/* Section 1: Voyageur */}
          <Section num="1" title="👤 Voyageur" badge="Requis">
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <Field label="Prénom" required>
                <TextField
                  fullWidth
                  size="small"
                  value={guestFirstName}
                  onChange={e => setGuestFirstName(e.target.value)}
                  placeholder="Sarah"
                />
              </Field>
              <Field label="Nom" required>
                <TextField
                  fullWidth
                  size="small"
                  value={guestLastName}
                  onChange={e => setGuestLastName(e.target.value)}
                  placeholder="Johnson"
                />
              </Field>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 1.5 }}>
              <Field label="Email" required>
                <TextField
                  fullWidth
                  size="small"
                  type="email"
                  value={guestEmail}
                  onChange={e => setGuestEmail(e.target.value)}
                  placeholder="sarah@example.com"
                />
              </Field>
              <Field label="Téléphone" required>
                <TextField
                  fullWidth
                  size="small"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+212 6 12 34 56 78"
                />
              </Field>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
              <Field label="Pays">
                <Autocomplete
                  freeSolo
                  options={COUNTRIES}
                  value={guestCountry}
                  onChange={(_, newValue) => setGuestCountry(newValue || '')}
                  renderInput={params => (
                    <TextField {...params} size="small" placeholder="Rechercher..." />
                  )}
                  size="small"
                />
              </Field>
              <Field label="Langue">
                <Select size="small" value={guestLanguage} onChange={e => setGuestLanguage(e.target.value)}>
                  <MenuItem value="fr">🇫🇷 Français</MenuItem>
                  <MenuItem value="en">🇬🇧 English</MenuItem>
                  <MenuItem value="es">🇪🇸 Español</MenuItem>
                  <MenuItem value="de">🇩🇪 Deutsch</MenuItem>
                  <MenuItem value="it">🇮🇹 Italiano</MenuItem>
                  <MenuItem value="pt">🇵🇹 Português</MenuItem>
                  <MenuItem value="ar">🇲🇦 العربية</MenuItem>
                </Select>
              </Field>
            </Box>
          </Section>

          {/* Section 2: Propriété */}
          <Section num="2" title="🏠 Propriété">
            <Field label="Propriété" required>
              <Select
                size="small"
                value={listingId}
                onChange={e => {
                  setListingId(e.target.value);
                  setRoomTypeId('');
                }}
                disabled={isLoading}
              >
                {isLoading && <MenuItem value="">Chargement...</MenuItem>}
                {listings.map(listing => (
                  <MenuItem key={listing.id} value={listing.id}>
                    {listing.name}
                  </MenuItem>
                ))}
              </Select>
            </Field>
            {showRoomType && (
              <Box sx={{ mt: 1.5 }}>
                <Field label="Type de chambre" required>
                  <Select size="small" value={roomTypeId} onChange={e => setRoomTypeId(e.target.value)}>
                    {roomTypes.map(rt => (
                      <MenuItem key={rt._id} value={rt._id}>
                        {rt.roomTypeName} {rt.personCapacityMax ? `(max ${rt.personCapacityMax} pers.)` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </Field>
              </Box>
            )}
          </Section>

          {/* Section 3: Dates + disponibilités API calendrier */}
          <Section num="3" title="📅 Dates de séjour" critical badge="Critique">
            <ReservationAvailabilityCalendar
              listingId={listingId}
              roomTypeId={roomTypeId || undefined}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              onDatesChange={(inDate, outDate) => {
                setCheckInDate(inDate);
                setCheckOutDate(outDate);
                if (!outDate) setCalendarPriceEstimate(null);
              }}
              onCalendarPriceHint={(total, n) => {
                if (pricingMode === 'calendar' && n > 0) setCalendarPriceEstimate(total);
              }}
            />
            {nights > 0 && (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.5,
                  bgcolor: t.bg2,
                  border: `1px solid ${t.border}`,
                  borderRadius: 1.375,
                }}
              >
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: t.text3,
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Arrivée
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    {new Date(checkInDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', color: t.primary }}>
                  <Typography sx={{ fontSize: 18, fontWeight: 700 }}>→</Typography>
                  <Box
                    sx={{
                      fontSize: 9.5,
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 800,
                      background: `linear-gradient(135deg, #cb9b2c, ${t.primary})`,
                      color: '#1a1408',
                      px: 1,
                      py: 0.25,
                      borderRadius: '99px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {nights} NUIT{nights > 1 ? 'S' : ''}
                  </Box>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      color: t.text3,
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Départ
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                    {new Date(checkOutDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </Typography>
                </Box>
              </Box>
            )}
          </Section>

          {/* Section 4: Composition */}
          <Section num="4" title="👥 Composition">
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              <Field label="Adultes" required>
                <Counter value={adults} onChange={setAdults} min={1} />
              </Field>
              <Field label="Enfants">
                <Counter value={children} onChange={setChildren} />
              </Field>
              <Field label="Bébés">
                <Counter value={infants} onChange={setInfants} />
              </Field>
            </Box>
          </Section>

          {/* Section 5: Tarification */}
          <Section num="5" title="💰 Tarification" critical badge="⭐ Critique">
            {/* Devise pills */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                p: 1.25,
                bgcolor: t.bg2,
                border: `1px solid ${t.border}`,
                borderRadius: 1.125,
                mb: 1.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10.5,
                  color: t.text3,
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Devise
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.625, ml: 'auto' }}>
                {['EUR', 'MAD', 'USD'].map(c => (
                  <Box
                    key={c}
                    component="button"
                    onClick={() => setCurrency(c)}
                    sx={{
                      all: 'unset',
                      cursor: 'pointer',
                      px: 1.375,
                      py: 0.625,
                      borderRadius: 0.875,
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: currency === c ? '#1a1408' : t.text3,
                      bgcolor: currency === c ? t.primary : t.bg1,
                      border: `1px solid ${currency === c ? t.primaryDeep : t.border}`,
                    }}
                  >
                    {c} {c === 'EUR' ? '€' : c === 'MAD' ? 'DH' : '$'}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Mode tabs */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
              {[
                { id: 'calendar', icon: '📅', title: 'Prix Calendrier', desc: 'auto · le plus simple' },
                { id: 'perDay', icon: '💵', title: 'Prix par Jour', desc: 'manuel · granulaire' },
                { id: 'total', icon: '💰', title: 'Prix Total', desc: 'forfaitaire' },
              ].map(opt => {
                const active = pricingMode === opt.id;
                return (
                  <Box
                    key={opt.id}
                    onClick={() => handleModeChange(opt.id as any)}
                    sx={{
                      p: '14px 12px',
                      border: `2px solid ${active ? t.primary : t.border}`,
                      borderRadius: 1.5,
                      background: active ? `linear-gradient(180deg, ${t.primaryTint}, ${t.bg1})` : t.bg1,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      boxShadow: active ? '0 4px 12px rgba(184,133,26,0.15)' : 'none',
                    }}
                  >
                    <Typography sx={{ fontSize: 24, mb: 0.75 }}>{opt.icon}</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: active ? t.primaryDeep : t.text }}>
                      {opt.title}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.375, fontFamily: '"Geist Mono", monospace' }}>
                      {opt.desc}
                    </Typography>
                  </Box>
                );
              })}
            </Box>

            {/* Mode panels */}
            {pricingMode === 'calendar' && (
              <Box
                sx={{
                  p: 2.25,
                  background: `linear-gradient(135deg, rgba(6,115,179,0.05), ${t.bg1} 60%)`,
                  border: `1px solid rgba(6,115,179,0.20)`,
                  borderRadius: 1.375,
                  display: 'flex',
                  gap: 1.75,
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1.125,
                    background: `linear-gradient(135deg, #67e8f9, #0673b3)`,
                    color: '#fff',
                    fontSize: 18,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  ⚡
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.375 }}>Récupération automatique</Typography>
                  <Typography sx={{ fontSize: 12.5, color: t.text2 }}>
                    Le prix sera calculé depuis le calendrier d&apos;inventaire selon les dates sélectionnées (incluant les prix
                    dynamiques et overrides manuels).
                  </Typography>
                  {nights > 0 && calendarPriceEstimate != null && calendarPriceEstimate > 0 && (
                    <Typography
                      sx={{
                        mt: 1,
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: '"Geist Mono", monospace',
                        color: t.primaryDeep,
                      }}
                    >
                      Estimation : {calendarPriceEstimate.toFixed(0)} {currency} · {nights} nuit{nights > 1 ? 's' : ''}
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {pricingMode === 'perDay' && dailyDates.length > 0 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: 1,
                    p: 1.5,
                    background: `linear-gradient(135deg, ${t.primaryTint}, ${t.bg1} 60%)`,
                    border: `1px solid rgba(184,133,26,0.20)`,
                    borderRadius: 1.375,
                    mb: 1.75,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: t.primaryDeep,
                        fontFamily: '"Geist Mono", monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        mb: 0.625,
                      }}
                    >
                      Appliquer prix uniforme
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      placeholder="Ex: 220"
                      value={uniformPrice}
                      onChange={e => setUniformPrice(e.target.value)}
                    />
                  </Box>
                  <Button
                    onClick={handleUniformPriceFill}
                    sx={{
                      height: 42,
                      px: 2,
                      textTransform: 'none',
                      fontWeight: 700,
                      background: `linear-gradient(180deg, #cb9b2c, ${t.primary})`,
                      color: '#1a1408',
                      boxShadow: '0 2px 6px rgba(184,133,26,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
                    }}
                  >
                    ⚡ Appliquer aux {nights} jours
                  </Button>
                </Box>

                <Typography sx={{ fontSize: 12, fontWeight: 700, mb: 1.25 }}>
                  Prix par nuit · {nights} nuit(s)
                </Typography>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 1,
                    maxWidth: '100%',
                    ...modalScrollNestedSx,
                  }}
                >
                  {dailyDates.map(date => {
                    const value = dailyPrices[date] ?? '';
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
                    const dayNum = dateObj.getDate();

                    return (
                      <Box
                        key={date}
                        sx={{
                          p: '9px 11px',
                          border: `1.5px solid ${t.primary}`,
                          borderRadius: 1.25,
                          background: value ? `linear-gradient(135deg, ${t.primaryTint}, ${t.bg1} 70%)` : t.bg1,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <Box sx={{ flexShrink: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 9.5,
                              color: t.text3,
                              fontFamily: '"Geist Mono", monospace',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.06em',
                            }}
                          >
                            {dayName}.
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 13,
                              fontWeight: 700,
                              color: t.primaryDeep,
                              fontFamily: '"Geist Mono", monospace',
                            }}
                          >
                            {dayNum}
                          </Typography>
                        </Box>
                        <TextField
                          size="small"
                          type="number"
                          value={value}
                          onChange={e => setDailyPrices(p => ({ ...p, [date]: e.target.value === '' ? 0 : Number(e.target.value) }))}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start" sx={{ '& p': { fontSize: 11, color: t.text3 } }}>
                                {getCurrencySymbol(currency)}
                              </InputAdornment>
                            ),
                          }}
                          sx={{ flex: 1, '& input': { fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 13 } }}
                        />
                      </Box>
                    );
                  })}
                </Box>

                <Box
                  sx={{
                    mt: 1.5,
                    p: '14px 18px',
                    background: `linear-gradient(135deg, ${t.primaryTint}, rgba(184,133,26,0.04))`,
                    border: `1.5px solid ${t.primary}`,
                    borderRadius: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.75,
                  }}
                >
                  <Typography sx={{ fontSize: 22 }}>💎</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      sx={{
                        fontSize: 10.5,
                        color: t.primaryDeep,
                        fontFamily: '"Geist Mono", monospace',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}
                    >
                      Total séjour
                    </Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 800, fontFamily: '"Geist Mono", monospace', letterSpacing: '-0.02em' }}>
                      {perDayTotal.toFixed(0)}{' '}
                      <Box component="span" sx={{ fontSize: 13, color: t.text3, ml: 0.625, fontWeight: 600 }}>
                        {currency}
                      </Box>
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 10.5, color: t.text3, textAlign: 'right', fontFamily: '"Geist Mono", monospace' }}>
                    moyenne
                    <br />
                    <Box component="b" sx={{ color: t.primaryDeep, fontSize: 13 }}>
                      {nights > 0 ? (perDayTotal / nights).toFixed(2) : 0} {currency}/nuit
                    </Box>
                  </Typography>
                </Box>
              </>
            )}

            {pricingMode === 'total' && (
              <Box sx={{ p: 1.75, bgcolor: t.bg2, borderRadius: 1.375, border: `1px solid ${t.border}` }}>
                <Typography
                  sx={{
                    fontSize: 10.5,
                    color: t.text3,
                    fontFamily: '"Geist Mono", monospace',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    mb: 0.75,
                  }}
                >
                  Prix total séjour <Box component="span" sx={{ color: t.error }}>*</Box>
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: '12px 14px',
                    bgcolor: t.bg1,
                    border: `1.5px solid ${t.primary}`,
                    borderRadius: 1.25,
                  }}
                >
                  <Typography sx={{ fontSize: 18, color: t.primary, fontFamily: '"Geist Mono", monospace', fontWeight: 700 }}>
                    {getCurrencySymbol(currency)}
                  </Typography>
                  <TextField
                    fullWidth
                    variant="standard"
                    type="number"
                    placeholder="Ex: 1500"
                    value={totalPrice || ''}
                    onChange={e => setTotalPrice(e.target.value === '' ? 0 : Number(e.target.value))}
                    InputProps={{
                      disableUnderline: true,
                      sx: { fontSize: 22, fontWeight: 800, fontFamily: '"Geist Mono", monospace', letterSpacing: '-0.02em' },
                    }}
                  />
                  <Box
                    sx={{
                      fontSize: 11,
                      color: t.text3,
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 600,
                      bgcolor: t.bg2,
                      px: 1.125,
                      py: 0.5,
                      borderRadius: 0.75,
                    }}
                  >
                    {currency}
                  </Box>
                </Box>
                {nights > 0 && totalPrice > 0 && (
                  <Box
                    sx={{
                      mt: 1.25,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: '8px 12px',
                      bgcolor: t.bg1,
                      borderRadius: 1,
                      fontSize: 11.5,
                      color: t.text2,
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    <Box sx={{ color: '#7c3aed', fontSize: 13 }}>⚡</Box>
                    Prix par nuit calculé :{' '}
                    <Box component="b" sx={{ color: t.primary, fontWeight: 700 }}>
                      {(totalPrice / nights).toFixed(2)} {currency}/nuit
                    </Box>{' '}
                    · répartition uniforme sur {nights} nuits
                  </Box>
                )}
              </Box>
            )}
          </Section>

          {/* Section 6: Statut & paiement */}
          <Section num="6" title="🎫 Statut & paiement">
            <Field label="Statut réservation">
              <RadioRow
                value={status}
                onChange={setStatus}
                options={[
                  { value: 'Confirmed', label: '✅ Confirmée', tone: 'success' },
                  { value: 'Pending', label: '⏳ En attente', tone: 'warning' },
                ]}
              />
            </Field>
            <Box sx={{ mt: 1.5 }}>
              <Field label="Statut paiement">
                <RadioRow
                  value={paymentStatus}
                  onChange={setPaymentStatus}
                  options={[
                    { value: 'Paid', label: '💳 Payé', tone: 'success' },
                    { value: 'UnPaid', label: '⌛ Non payé', tone: 'warning' },
                  ]}
                />
              </Field>
            </Box>
            <Box sx={{ mt: 1.5 }}>
              <Field label="Mode de paiement">
                <RadioRow
                  value={paymentType}
                  onChange={setPaymentType}
                  options={[
                    { value: 'cash', label: '💵 Espèces' },
                    { value: 'bank_card', label: '💳 Carte bancaire' },
                  ]}
                />
              </Field>
            </Box>
            {paymentType === 'bank_card' && paymentStatus === 'UnPaid' && (
              <Box
                sx={{
                  mt: 1.25,
                  p: '11px 14px',
                  background: `linear-gradient(135deg, rgba(6,115,179,0.05), ${t.bg1})`,
                  border: `1px solid rgba(6,115,179,0.20)`,
                  borderRadius: 1.125,
                  fontSize: 11.5,
                  color: t.text2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.125,
                }}
              >
                <Box sx={{ color: '#0673b3', fontSize: 14 }}>ℹ️</Box>
                Un <b>lien de paiement sécurisé</b> sera envoyé au voyageur par WhatsApp + Email après création.
              </Box>
            )}
          </Section>
        </ModalScrollColumn>

        <ModalScrollColumn
          active={open}
          className="create-reservation-summary-scroll"
          wrapperSx={{
            flex: { xs: '1 1 45%', md: `0 0 ${summaryColWidth}px` },
            width: { xs: '100%', md: summaryColWidth },
            minWidth: { md: summaryColWidth },
          }}
          innerSx={{
            p: '22px 24px',
            background: `linear-gradient(180deg, ${t.bg2}, ${t.bg0})`,
            borderLeft: { xs: 'none', md: `1px solid ${t.border}` },
            borderTop: { xs: `1px solid ${t.border}`, md: 'none' },
          }}
        >
          <Typography
            sx={{
              fontSize: 11,
              color: t.text3,
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
              mb: 1.75,
            }}
          >
            📋 Récapitulatif
          </Typography>

          <SumCard>
            <SumRow label="Voyageur">
              <b>{guestFirstName || guestLastName ? `${guestFirstName} ${guestLastName}` : '—'}</b>
              <br />
              <Box component="span" sx={{ color: t.text3, fontSize: 10.5, fontFamily: '"Geist Mono", monospace' }}>
                {guestEmail || '—'}
              </Box>
            </SumRow>
            <SumRow label="Composition">
              <b>
                {adults}A · {children}E · {infants}B
              </b>
            </SumRow>
          </SumCard>

          {nights > 0 && (
            <SumCard>
              <SumRow label="Propriété">
                <b>{selectedListing?.name || '—'}</b>
              </SumRow>
              <SumRow label="Arrivée">
                <b>
                  {new Date(checkInDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </b>
              </SumRow>
              <SumRow label="Départ">
                <b>
                  {new Date(checkOutDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </b>
              </SumRow>
              <SumRow label="Nuits">
                <b>{nights} nuits</b>
              </SumRow>
            </SumCard>
          )}

          <SumCard>
            <SumRow label="Mode">
              <b>{pricingMode === 'calendar' ? '📅 Calendrier' : pricingMode === 'perDay' ? '💵 Par jour' : '💰 Total'}</b>
            </SumRow>
            <SumRow label="Paiement">
              <Box component="b" sx={{ color: paymentStatus === 'Paid' ? t.success : t.warning }}>
                {paymentStatus === 'Paid' ? 'Payé' : 'Non payé'}
              </Box>{' '}
              · {paymentType === 'bank_card' ? 'CB' : 'Cash'}
            </SumRow>
          </SumCard>

          {pricingMode === 'calendar' && nights > 0 && calendarPriceEstimate != null && calendarPriceEstimate > 0 && (
            <Box
              sx={{
                background: 'linear-gradient(135deg, #14110a, #332b1c)',
                color: '#fff',
                borderRadius: 1.625,
                p: 2.25,
                mt: 1.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  mb: 0.75,
                }}
              >
                Total estimé (calendrier)
              </Typography>
              <Typography sx={{ fontSize: 30, fontWeight: 800, fontFamily: '"Geist Mono", monospace' }}>
                {calendarPriceEstimate.toFixed(0)}{' '}
                <Box component="span" sx={{ fontSize: 14, color: t.primarySoft, fontWeight: 600 }}>
                  {currency}
                </Box>
              </Typography>
            </Box>
          )}

          {((pricingMode === 'perDay' && perDayTotal > 0) || (pricingMode === 'total' && totalPrice > 0)) && (
            <Box
              sx={{
                background: 'linear-gradient(135deg, #14110a, #332b1c)',
                color: '#fff',
                borderRadius: 1.625,
                p: 2.25,
                mt: 1.75,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: '-50%',
                  right: '-30%',
                  width: 200,
                  height: 200,
                  background: 'radial-gradient(circle, rgba(184,133,26,0.30), transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontFamily: '"Geist Mono", monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.55)',
                  mb: 0.625,
                  position: 'relative',
                }}
              >
                Total réservation
              </Typography>
              <Typography
                sx={{ fontSize: 30, fontWeight: 800, fontFamily: '"Geist Mono", monospace', letterSpacing: '-0.03em', position: 'relative' }}
              >
                {(pricingMode === 'perDay' ? perDayTotal : totalPrice).toFixed(0)}{' '}
                <Box component="span" sx={{ fontSize: 14, color: t.primarySoft, ml: 0.625, fontWeight: 600 }}>
                  {currency}
                </Box>
              </Typography>
            </Box>
          )}
        </ModalScrollColumn>
      </Box>

      {/* ─── Footer (toujours visible, boutons remontés) ─── */}
      <Box
        sx={{
          flexShrink: 0,
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${t.border}`,
          bgcolor: t.bg2,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          justifyContent: 'flex-end',
          gap: 1.25,
          boxShadow: '0 -4px 12px rgba(20,17,10,0.06)',
        }}
      >
        <Typography
          sx={{
            fontSize: 11,
            color: t.text3,
            fontFamily: '"Geist Mono", monospace',
            mr: { sm: 'auto' },
            display: { xs: 'none', sm: 'block' },
          }}
        >
          ⌘+Enter · Esc
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.25, justifyContent: 'flex-end', flexShrink: 0 }}>
          <Button
            onClick={handleClose}
            disabled={isSubmitting}
            sx={{
              textTransform: 'none',
              color: t.text2,
              fontWeight: 700,
              minWidth: 100,
              py: 1,
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              minWidth: 200,
              py: 1,
              px: 2.5,
              whiteSpace: 'nowrap',
              background: `linear-gradient(180deg, #cb9b2c, ${t.primary})`,
              color: '#1a1408',
              boxShadow: '0 2px 8px rgba(184,133,26,0.25), inset 0 1px 0 rgba(255,255,255,0.30)',
              '&:hover': { filter: 'brightness(1.05)' },
              '&:disabled': { opacity: 0.5 },
            }}
          >
            {isSubmitting ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1, color: '#1a1408' }} />
                Création...
              </>
            ) : (
              '✨ Créer la réservation →'
            )}
          </Button>
        </Box>
      </Box>
      </Box>
    </Dialog>
  );
}

/* ─── Helpers ───────────────────────────────────────────────── */

/**
 * Translates backend reservation errors into user-friendly French messages
 * with actionable hints. Falls back to the original message if no rule matches.
 *
 * Common backend errors observed:
 * - "Minimum stay is N" → too few nights for that listing's restriction
 * - "no inventory found" / "inventory not found" → no calendar inventory for these dates
 * - "Room not available" / "Not available" → dates conflict with existing booking
 */
function humanizeReservationError(raw: string): string {
  if (!raw) return 'Erreur lors de la création de la réservation';
  const msg = String(raw);

  const minStay = msg.match(/minimum\s*stay\s*(?:is|:)?\s*(\d+)/i);
  if (minStay) {
    const n = Number(minStay[1]);
    return `⚠️ Séjour minimum requis : ${n} nuit${n > 1 ? 's' : ''}. Augmentez la durée du séjour ou choisissez une autre propriété.`;
  }

  if (/no\s+inventory|inventory\s+(not\s+)?found/i.test(msg)) {
    return `${msg} — Utilisez le mode « Prix par jour » ou « Prix total » si le calendrier n'a pas d'inventaire.`;
  }

  if (/room\s+not\s+available|not\s+available|already\s+(booked|reserved)|date.*conflict/i.test(msg)) {
    return `⚠️ Ces dates ne sont pas disponibles (réservation existante ou bloquées). Choisissez d'autres dates ou un autre type de chambre.`;
  }

  if (/max(imum)?\s*stay\s*(?:is|:)?\s*(\d+)/i.test(msg)) {
    const m = msg.match(/max(?:imum)?\s*stay\s*(?:is|:)?\s*(\d+)/i);
    const n = m ? Number(m[1]) : null;
    return n
      ? `⚠️ Séjour maximum autorisé : ${n} nuit${n > 1 ? 's' : ''}. Réduisez la durée du séjour.`
      : msg;
  }

  if (/closed\s+(to\s+)?arrival|no\s+arrival/i.test(msg)) {
    return `⚠️ Arrivée non autorisée à cette date par la propriété. Choisissez un autre jour d'arrivée.`;
  }

  if (/closed\s+(to\s+)?departure|no\s+departure/i.test(msg)) {
    return `⚠️ Départ non autorisé à cette date par la propriété. Choisissez un autre jour de départ.`;
  }

  return msg;
}

/* ─── Helper Components ─────────────────────────────────────── */
function Section({ num, title, badge, critical, children }: { num: string; title: string; badge?: string; critical?: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        bgcolor: t.bg1,
        border: `1px solid ${critical ? 'rgba(184,133,26,0.25)' : t.border}`,
        borderRadius: 1.75,
        p: 2.25,
        mb: 1.75,
        background: critical ? `linear-gradient(180deg, ${t.bg1}, rgba(184,133,26,0.02))` : t.bg1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.75 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: 0.875,
            bgcolor: critical ? t.primaryTint : t.bg2,
            color: critical ? t.primaryDeep : t.text2,
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11.5,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {num}
        </Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em', flex: 1 }}>{title}</Typography>
        {badge && (
          <Box
            sx={{
              fontSize: 10,
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: critical ? t.primaryDeep : t.text3,
              bgcolor: critical ? t.primaryTint : t.bg2,
              px: 1,
              py: 0.25,
              borderRadius: '99px',
            }}
          >
            {badge}
          </Box>
        )}
      </Box>
      {children}
    </Box>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625 }}>
      <Typography
        component="label"
        sx={{
          fontSize: 10.5,
          color: t.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 700,
        }}
      >
        {label}
        {required && (
          <Box component="span" sx={{ color: t.error, ml: 0.25 }}>
            *
          </Box>
        )}
      </Typography>
      <FormControl size="small" fullWidth>
        {children}
      </FormControl>
    </Box>
  );
}

function Counter({ value, onChange, min = 0, max = 20 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${t.border}`, borderRadius: 1, bgcolor: t.bg1, width: 'fit-content' }}>
      <IconButton size="small" onClick={() => onChange(Math.max(min, value - 1))} sx={{ width: 32, height: 32 }}>
        −
      </IconButton>
      <Box sx={{ px: 1.75, fontFamily: '"Geist Mono", monospace', fontWeight: 700, fontSize: 13, minWidth: 50, textAlign: 'center' }}>{value}</Box>
      <IconButton size="small" onClick={() => onChange(Math.min(max, value + 1))} sx={{ width: 32, height: 32 }}>
        +
      </IconButton>
    </Box>
  );
}

function RadioRow<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; tone?: 'success' | 'warning' }[];
}) {
  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      {options.map(opt => {
        const active = value === opt.value;
        const tone = opt.tone === 'success' ? t.success : opt.tone === 'warning' ? t.warning : t.primary;
        const tint = opt.tone === 'success' ? 'rgba(10,143,94,0.10)' : opt.tone === 'warning' ? 'rgba(196,101,6,0.10)' : t.primaryTint;
        return (
          <Box
            key={opt.value}
            component="button"
            onClick={() => onChange(opt.value)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              flex: 1,
              p: '10px 14px',
              border: `1px solid ${active ? tone : t.border}`,
              bgcolor: active ? tint : t.bg1,
              color: active ? tone : t.text2,
              borderRadius: 1.125,
              textAlign: 'center',
              fontSize: 12.5,
              fontWeight: active ? 700 : 600,
            }}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}

function SumCard({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ bgcolor: t.bg1, border: `1px solid ${t.border}`, borderRadius: 1.5, p: 1.75, mb: 1.25 }}>{children}</Box>
  );
}

function SumRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25, py: 0.75, fontSize: 12 }}>
      <Typography
        sx={{
          fontSize: 10.5,
          color: t.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
          width: 78,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ flex: 1, color: t.text, fontWeight: 500 }}>{children}</Box>
    </Box>
  );
}
