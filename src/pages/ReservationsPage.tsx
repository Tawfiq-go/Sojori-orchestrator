// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Page · édition « Atelier 2026 »
// Route: /reservations
//
// Design moderne : header sticky, KPI strip, quick-filter pills,
// table dense premium, hover row, status pills sémantiques, mobile cards.
// Tous les champs / handlers / appels API du fichier original sont conservés.
// ════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState } from 'react';
import {
  Box, Stack, Typography, Paper, Chip, IconButton, Tooltip, Button,
  TextField, InputAdornment, FormControl, Select, MenuItem, Checkbox,
  ListItemText, CircularProgress, Alert, Avatar, useMediaQuery, useTheme,
  Card, CardContent, Divider,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  CalendarToday as CalendarIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Inbox as InboxIcon,
  AccessTime as ClockIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/fr';
import reservationsService from '../services/reservationsService';
import { filterActiveReservations } from '../utils/filterReservations';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CreateReservationModal } from '../components/modals/CreateReservationModal';

moment.locale('fr');

// ─── Types (inchangés) ──────────────────────────────────────────────
interface Reservation {
  _id: string;
  reservationNumber: string;
  rentalsReservationId?: string;
  channelName: string;
  listing: { name: string; _id: string };
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestCountry?: string;
  guestLanguage?: string;
  createdAt: string;
  arrivalDate: string;
  departureDate: string;
  checkInTime?: number | string;
  checkOutTime?: number | string;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
  nights: number;
  status: string;
  totalPrice?: number;
  currency?: string;
  adults?: number;
  children?: number;
  infants?: number;
  paymentStatus?: string;
  alreadyPaid?: number;
  cancellationDate?: string | null;
  cancellationAcknowledged?: boolean;
}

// ─── Palette « Atelier 2026 » ───────────────────────────────────────
const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1', bg1: '#ffffff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e', warning: '#c46506', error: '#c81e1e', info: '#0673b3',
};

// ─── Helpers ───────────────────────────────────────────────────────
const formatTime = (timeInput: any): string | null => {
  if (timeInput === undefined || timeInput === null || timeInput === '') return null;
  try {
    if (typeof timeInput === 'string' && timeInput.includes('T')) {
      const m = timeInput.match(/T(\d{2}):(\d{2})/);
      if (m) return `${m[1]}:${m[2]}`;
    }
    if (typeof timeInput === 'string' && /^\d{1,2}:\d{2}$/.test(timeInput)) {
      const [h, mn] = timeInput.split(':');
      return `${h.padStart(2, '0')}:${mn}`;
    }
    if (typeof timeInput === 'number') {
      if (timeInput < 100) return `${timeInput.toString().padStart(2, '0')}:00`;
      const h = Math.floor(timeInput / 100);
      const mn = timeInput % 100;
      return `${h.toString().padStart(2, '0')}:${mn.toString().padStart(2, '0')}`;
    }
    return null;
  } catch { return null; }
};

const statusMeta = (status: string): { bg: string; color: string; label: string } => {
  const n = status.toLowerCase();
  if (n === 'confirmed')    return { bg: 'rgba(10,143,94,0.12)',  color: T.success, label: 'Confirmé' };
  if (n === 'pending')      return { bg: 'rgba(196,101,6,0.12)',  color: T.warning, label: 'En attente' };
  if (n.includes('cancel')) return { bg: 'rgba(200,30,30,0.10)',  color: T.error,   label: 'Annulé' };
  if (n === 'completed')    return { bg: 'rgba(6,115,179,0.10)',  color: T.info,    label: 'Terminé' };
  return { bg: 'rgba(20,17,10,0.05)', color: T.text3, label: status };
};

const presenceMeta = (r: Reservation): { label: string; bg: string; color: string } => {
  const now = moment();
  const arr = moment(r.arrivalDate);
  const dep = moment(r.departureDate);
  if (r.status.toLowerCase().includes('cancel')) return { label: 'Annulé', bg: 'rgba(20,17,10,0.05)', color: T.text3 };
  if (r.status.toLowerCase() === 'completed')   return { label: 'Complété', bg: 'rgba(10,143,94,0.10)', color: T.success };
  if (now.isBefore(arr, 'day'))                  return { label: 'Attendu', bg: 'rgba(6,115,179,0.10)', color: T.info };
  if (now.isSame(arr, 'day') && !r.actualArrivalTime) return { label: "Aujourd'hui", bg: 'rgba(196,101,6,0.12)', color: T.warning };
  if (r.actualArrivalTime && !r.actualDepartureTime && now.isBefore(dep, 'day')) return { label: 'Présent', bg: 'rgba(10,143,94,0.10)', color: T.success };
  if (r.actualArrivalTime && now.isSame(dep, 'day') && !r.actualDepartureTime) return { label: 'Départ Auj.', bg: 'rgba(196,101,6,0.12)', color: T.warning };
  if (r.actualDepartureTime) return { label: 'Parti', bg: 'rgba(20,17,10,0.05)', color: T.text3 };
  return { label: 'En cours', bg: 'rgba(6,115,179,0.10)', color: T.info };
};

const OTABadge = ({ channel }: { channel: string }) => {
  const c = (channel || '').toLowerCase();
  const meta =
    c.includes('airbnb')  ? { label: 'Airbnb',  bg: '#FF5A5F', initial: 'A' } :
    c.includes('booking') ? { label: 'Booking', bg: '#003580', initial: 'B' } :
    c.includes('expedia') ? { label: 'Expedia', bg: '#FECC00', initial: 'E' } :
    c.includes('vrbo')    ? { label: 'Vrbo',    bg: '#0E6CB0', initial: 'V' } :
                            { label: 'Direct',  bg: T.primary, initial: 'S' };
  return (
    <Tooltip title={meta.label} arrow>
      <Avatar sx={{
        width: 26, height: 26, bgcolor: meta.bg, color: '#fff',
        fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
      }}>{meta.initial}</Avatar>
    </Tooltip>
  );
};

const flagFor = (country?: string): string => {
  if (!country) return '🌐';

  // Map exhaustif de noms de pays vers codes ISO
  const countryNameToCode: Record<string, string> = {
    // Europe
    'france': 'FR', 'germany': 'DE', 'spain': 'ES', 'italy': 'IT',
    'united kingdom': 'GB', 'belgium': 'BE', 'netherlands': 'NL',
    'switzerland': 'CH', 'portugal': 'PT', 'austria': 'AT', 'sweden': 'SE',
    'norway': 'NO', 'denmark': 'DK', 'finland': 'FI', 'ireland': 'IE',
    'poland': 'PL', 'greece': 'GR', 'czech republic': 'CZ', 'hungary': 'HU',
    'romania': 'RO', 'bulgaria': 'BG', 'croatia': 'HR', 'slovakia': 'SK',
    'slovenia': 'SI', 'lithuania': 'LT', 'latvia': 'LV', 'estonia': 'EE',
    'luxembourg': 'LU', 'malta': 'MT', 'cyprus': 'CY', 'iceland': 'IS',

    // Amériques
    'united states': 'US', 'canada': 'CA', 'mexico': 'MX', 'brazil': 'BR',
    'argentina': 'AR', 'chile': 'CL', 'colombia': 'CO', 'peru': 'PE',
    'venezuela': 'VE', 'ecuador': 'EC', 'bolivia': 'BO', 'paraguay': 'PY',
    'uruguay': 'UY', 'costa rica': 'CR', 'panama': 'PA', 'jamaica': 'JM',

    // Moyen-Orient & Afrique du Nord
    'morocco': 'MA', 'saudi arabia': 'SA', 'united arab emirates': 'AE',
    'algeria': 'DZ', 'tunisia': 'TN', 'egypt': 'EG', 'qatar': 'QA',
    'kuwait': 'KW', 'bahrain': 'BH', 'oman': 'OM', 'jordan': 'JO',
    'lebanon': 'LB', 'israel': 'IL', 'palestine': 'PS', 'syria': 'SY',
    'iraq': 'IQ', 'iran': 'IR', 'yemen': 'YE', 'libya': 'LY',

    // Asie
    'china': 'CN', 'japan': 'JP', 'india': 'IN', 'south korea': 'KR',
    'singapore': 'SG', 'malaysia': 'MY', 'thailand': 'TH', 'vietnam': 'VN',
    'indonesia': 'ID', 'philippines': 'PH', 'pakistan': 'PK', 'bangladesh': 'BD',
    'hong kong': 'HK', 'taiwan': 'TW', 'myanmar': 'MM', 'cambodia': 'KH',
    'laos': 'LA', 'nepal': 'NP', 'sri lanka': 'LK', 'maldives': 'MV',
    'brunei': 'BN', 'mongolia': 'MN', 'kazakhstan': 'KZ', 'uzbekistan': 'UZ',

    // Afrique
    'south africa': 'ZA', 'nigeria': 'NG', 'kenya': 'KE', 'ethiopia': 'ET',
    'ghana': 'GH', 'tanzania': 'TZ', 'uganda': 'UG', 'senegal': 'SN',
    'ivory coast': 'CI', 'cameroon': 'CM', 'mali': 'ML', 'rwanda': 'RW',

    // Océanie
    'australia': 'AU', 'new zealand': 'NZ', 'fiji': 'FJ', 'papua new guinea': 'PG',

    // Autres
    'russia': 'RU', 'turkey': 'TR', 'ukraine': 'UA', 'belarus': 'BY',
  };

  // Si c'est déjà un code ISO à 2 lettres, l'utiliser directement
  let code = country.length === 2 ? country.toUpperCase() : countryNameToCode[country.toLowerCase()];

  // Support pour UK -> GB
  if (code === 'UK') code = 'GB';

  // Si pas de code trouvé, retourner globe
  if (!code) return '🌐';

  // Convertir le code ISO en drapeau emoji (Regional Indicator Symbols)
  const codePoints = code.split('').map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

// ─── Composant ──────────────────────────────────────────────────────
export function ReservationsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Pending', 'Confirmed']);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  const [quickFilters, setQuickFilters] = useState({
    arrToday: false, depToday: false,
    arrTomorrow: false, depTomorrow: false,
    arr7days: false, dep7days: false,
  });

  const [page, setPage] = useState(0);
  const limit = 50;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ─── Fetch (logique métier inchangée) ────────────────────────────
  const fetchReservations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await reservationsService.getList({ limit: 1000 });
      const activeReservations = filterActiveReservations(response.data as any[]);
      setReservations(activeReservations);
      toast.success(`${activeReservations.length} réservation(s) active(s) chargée(s)`);
    } catch (err: any) {
      setError(err.message || 'Erreur');
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => { fetchReservations(); }, []);

  // ─── Liste listings disponibles ────────────────────────────────────
  const availableListings = useMemo(() => {
    const unique = new Map();
    reservations.forEach(r => {
      if (r.listing?._id && r.listing?.name) {
        unique.set(r.listing._id, r.listing.name);
      }
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reservations]);

  // ─── Filtrage (étendu avec listing + email + tel) ──────────────────────
  const filteredReservations = useMemo(() => {
    let f = [...reservations];
    if (globalFilter.trim()) {
      const s = globalFilter.toLowerCase();
      f = f.filter(r =>
        r.reservationNumber?.toLowerCase().includes(s) ||
        r.guestName?.toLowerCase().includes(s) ||
        r.guestEmail?.toLowerCase().includes(s) ||
        r.phone?.includes(s) ||
        r.listing?.name?.toLowerCase().includes(s)
      );
    }
    if (selectedStatuses.length > 0) f = f.filter(r => selectedStatuses.includes(r.status));
    if (selectedChannels.length > 0) {
      f = f.filter(r => {
        const c = r.channelName?.toLowerCase() || '';
        return selectedChannels.some(ch => {
          if (ch === 'sojori') return !c.includes('airbnb') && !c.includes('booking');
          return c.includes(ch.toLowerCase());
        });
      });
    }
    if (selectedListings.length > 0) {
      f = f.filter(r => selectedListings.includes(r.listing?._id || ''));
    }
    const today = moment(), tomorrow = moment().add(1, 'd'), next7 = moment().add(7, 'd');
    if (quickFilters.arrToday)    f = f.filter(r => moment(r.arrivalDate).isSame(today, 'day'));
    if (quickFilters.depToday)    f = f.filter(r => moment(r.departureDate).isSame(today, 'day'));
    if (quickFilters.arrTomorrow) f = f.filter(r => moment(r.arrivalDate).isSame(tomorrow, 'day'));
    if (quickFilters.depTomorrow) f = f.filter(r => moment(r.departureDate).isSame(tomorrow, 'day'));
    if (quickFilters.arr7days)    f = f.filter(r => moment(r.arrivalDate).isBetween(today, next7, 'day', '[]'));
    if (quickFilters.dep7days)    f = f.filter(r => moment(r.departureDate).isBetween(today, next7, 'day', '[]'));
    return f;
  }, [reservations, globalFilter, selectedStatuses, selectedChannels, selectedListings, quickFilters]);

  // ─── KPIs ──────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const t = moment();
    const arrToday = reservations.filter(r => moment(r.arrivalDate).isSame(t, 'day')).length;
    const depToday = reservations.filter(r => moment(r.departureDate).isSame(t, 'day')).length;
    const present  = reservations.filter(r => r.actualArrivalTime && !r.actualDepartureTime).length;
    const pending  = reservations.filter(r => r.status === 'Pending').length;
    return { arrToday, depToday, present, pending };
  }, [reservations]);

  // ─── Quick filter counts (label live) ───────────────────────────
  const filterCounts = useMemo(() => {
    const t = moment(), tm = moment().add(1, 'd'), n7 = moment().add(7, 'd');
    return {
      arrToday:    reservations.filter(r => moment(r.arrivalDate).isSame(t, 'day')).length,
      depToday:    reservations.filter(r => moment(r.departureDate).isSame(t, 'day')).length,
      arrTomorrow: reservations.filter(r => moment(r.arrivalDate).isSame(tm, 'day')).length,
      depTomorrow: reservations.filter(r => moment(r.departureDate).isSame(tm, 'day')).length,
      arr7days:    reservations.filter(r => moment(r.arrivalDate).isBetween(t, n7, 'day', '[]')).length,
      dep7days:    reservations.filter(r => moment(r.departureDate).isBetween(t, n7, 'day', '[]')).length,
    };
  }, [reservations]);

  const toggleQuick = (k: keyof typeof quickFilters) => {
    setQuickFilters(prev => {
      const isActive = prev[k];
      // Si déjà actif, on désactive. Sinon on active et désactive les autres
      if (isActive) {
        return { ...prev, [k]: false };
      } else {
        return {
          arrToday: k === 'arrToday',
          depToday: k === 'depToday',
          arrTomorrow: k === 'arrTomorrow',
          depTomorrow: k === 'depTomorrow',
          arr7days: k === 'arr7days',
          dep7days: k === 'dep7days',
        };
      }
    });
    setPage(0);
  };
  const handleReset = () => {
    setGlobalFilter('');
    setSelectedStatuses(['Pending', 'Confirmed']);
    setSelectedChannels([]);
    setSelectedListings([]);
    setQuickFilters({ arrToday: false, depToday: false, arrTomorrow: false, depTomorrow: false, arr7days: false, dep7days: false });
    setPage(0);
  };
  const handleViewDetails = (r: Reservation) => navigate(`/reservations/${r._id}`);

  const paged = filteredReservations.slice(page * limit, (page + 1) * limit);

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        {/* Toolbar */}
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Rechercher voyageur, propriété, n° de réservation…"
              value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: T.text3 }} /></InputAdornment>,
              }}
              sx={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={() => setIsModalOpen(true)}
              sx={{
                textTransform: 'none',
                bgcolor: T.primary,
                color: '#fff',
                fontWeight: 600,
                px: 2,
                '&:hover': { bgcolor: T.primaryDeep },
                whiteSpace: 'nowrap',
              }}
            >
              ➕ Ajouter
            </Button>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <Select multiple displayEmpty value={selectedListings}
                onChange={(e) => setSelectedListings(e.target.value as string[])}
                renderValue={(s) => `Propriété · ${(s as string[]).length || 'toutes'}`}>
                {availableListings.map((lst) => (
                  <MenuItem key={lst.id} value={lst.id}>
                    <Checkbox checked={selectedListings.indexOf(lst.id) > -1} size="small" />
                    <ListItemText primary={lst.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select multiple displayEmpty value={selectedStatuses}
                onChange={(e) => setSelectedStatuses(e.target.value as string[])}
                renderValue={(s) => `État · ${(s as string[]).length || 'tous'}`}>
                {[
                  { val: 'Pending', label: '📋 En attente' },
                  { val: 'Confirmed', label: '✅ Confirmé' },
                  { val: 'Completed', label: '🎉 Complété' },
                  { val: 'Rejected', label: '❌ Rejeté' },
                  { val: 'Cancelled', label: '📵 Annulé (RU / canal)' },
                  { val: 'CancelledByHost', label: '🏠 Annulé par hôte' },
                  { val: 'CancelledByCustomer', label: '🚫 Annulé par client' },
                  { val: 'CancelledByAdmin', label: '⛔ Annulé par admin' },
                  { val: 'CancelledByOTA', label: '🔴 Annulé par OTA' },
                  { val: 'CancelledPaymentFailed', label: '💳 Annulé - paiement échoué' },
                  { val: 'OtherCancellation', label: '⭕ Autre annulation' },
                ].map((st) => (
                  <MenuItem key={st.val} value={st.val}>
                    <Checkbox checked={selectedStatuses.indexOf(st.val) > -1} size="small" />
                    <ListItemText primary={st.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select multiple displayEmpty value={selectedChannels}
                onChange={(e) => setSelectedChannels(e.target.value as string[])}
                renderValue={(s) => `Source · ${(s as string[]).length || 'toutes'}`}>
                {[
                  { val: 'sojori', label: 'Direct / Sojori', icon: 'Direct / Sojori' },
                  { val: 'AirBNB', label: 'Airbnb', icon: 'Airbnb' },
                  { val: 'BookingCom', label: 'Booking.com', icon: 'Booking.com' },
                ].map((ch) => (
                  <MenuItem key={ch.val} value={ch.val}>
                    <Checkbox checked={selectedChannels.indexOf(ch.val) > -1} size="small" />
                    <ListItemText primary={ch.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Tooltip title="Réinitialiser tous les filtres">
              <IconButton size="small" onClick={handleReset}><RefreshIcon sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </Stack>

          {/* Quick filters pills + KPI cards on same row */}
          <Stack direction="row" sx={{ mt: 1.5, gap: 0.75, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Pills à gauche */}
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <Pill label="Arr. auj." count={filterCounts.arrToday}    active={quickFilters.arrToday}    onClick={() => toggleQuick('arrToday')}    color={T.info} />
              <Pill label="Dép. auj." count={filterCounts.depToday}    active={quickFilters.depToday}    onClick={() => toggleQuick('depToday')}    color={T.warning} />
              <Pill label="Arr. demain" count={filterCounts.arrTomorrow} active={quickFilters.arrTomorrow} onClick={() => toggleQuick('arrTomorrow')} color={T.info} />
              <Pill label="Dép. demain" count={filterCounts.depTomorrow} active={quickFilters.depTomorrow} onClick={() => toggleQuick('depTomorrow')} color={T.warning} />
              <Pill label="Arr. 7 jours" count={filterCounts.arr7days}  active={quickFilters.arr7days}  onClick={() => toggleQuick('arr7days')}    color={T.primary} />
              <Pill label="Dép. 7 jours" count={filterCounts.dep7days}  active={quickFilters.dep7days}  onClick={() => toggleQuick('dep7days')}    color={T.error} />
            </Stack>

            {/* KPI cards compacts à droite */}
            <Stack direction="row" sx={{ gap: 0.75 }}>
              <KpiCompact
                label="Arr. auj."
                value={kpis.arrToday}
                accent={T.info}
                onClick={() => {
                  const isActive = quickFilters.arrToday;
                  setQuickFilters({
                    arrToday: !isActive,
                    depToday: false,
                    arrTomorrow: false,
                    depTomorrow: false,
                    arr7days: false,
                    dep7days: false,
                  });
                }}
              />
              <KpiCompact
                label="Dép. auj."
                value={kpis.depToday}
                accent={T.warning}
                onClick={() => {
                  const isActive = quickFilters.depToday;
                  setQuickFilters({
                    arrToday: false,
                    depToday: !isActive,
                    arrTomorrow: false,
                    depTomorrow: false,
                    arr7days: false,
                    dep7days: false,
                  });
                }}
              />
              <KpiCompact
                label="Présents"
                value={kpis.present}
                accent={T.success}
                onClick={() => {
                  if (selectedStatuses.length === 1 && selectedStatuses[0] === 'Confirmed') {
                    setSelectedStatuses(['Pending', 'Confirmed']);
                  } else {
                    setSelectedStatuses(['Confirmed']);
                  }
                  setQuickFilters({ arrToday: false, depToday: false, arrTomorrow: false, depTomorrow: false, arr7days: false, dep7days: false });
                }}
              />
              <KpiCompact
                label="En attente"
                value={kpis.pending}
                accent={T.text2}
                onClick={() => {
                  if (selectedStatuses.length === 1 && selectedStatuses[0] === 'Pending') {
                    setSelectedStatuses(['Pending', 'Confirmed']);
                  } else {
                    setSelectedStatuses(['Pending']);
                  }
                  setQuickFilters({ arrToday: false, depToday: false, arrTomorrow: false, depTomorrow: false, arr7days: false, dep7days: false });
                }}
              />
            </Stack>
          </Stack>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={48} sx={{ color: T.primary }} />
          </Box>
        )}

        {/* MOBILE : cards · DESKTOP : table */}
        {!isLoading && !isMobile && paged.length > 0 && (
          <DesktopTable rows={paged} onRowClick={handleViewDetails} onNavigate={navigate} />
        )}
        {!isLoading && isMobile && paged.length > 0 && (
          <Stack spacing={1.25}>
            {paged.map((r) => <MobileCard key={r._id} r={r} onClick={() => handleViewDetails(r)} />)}
          </Stack>
        )}

        {!isLoading && filteredReservations.length === 0 && (
          <Paper sx={{ textAlign: 'center', py: 8, mt: 2, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
            <InboxIcon sx={{ fontSize: 64, color: T.text4, mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: T.text2 }}>Aucune réservation trouvée</Typography>
            <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>Essayez de modifier vos filtres ou réinitialisez-les.</Typography>
            <Button onClick={handleReset} variant="text" sx={{ mt: 2, textTransform: 'none', color: T.primaryDeep }}>↻ Réinitialiser</Button>
          </Paper>
        )}

        {/* Pagination */}
        {!isLoading && filteredReservations.length > 0 && (
          <Stack direction="row" sx={{ mt: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
              {page * limit + 1}–{Math.min((page + 1) * limit, filteredReservations.length)} sur {filteredReservations.length}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)} sx={{ textTransform: 'none' }}>← Précédent</Button>
              <Button size="small" disabled={(page + 1) * limit >= filteredReservations.length} onClick={() => setPage(page + 1)} sx={{ textTransform: 'none' }}>Suivant →</Button>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* Modal d'ajout de réservation */}
      <CreateReservationModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchReservations(); // Recharger la liste après création
        }}
      />
    </DashboardWrapper>
  );
}

// ─── Sub-composants ────────────────────────────────────────────────
const Kpi = ({ label, value, icon, accent, onClick }: { label: string; value: number; icon: React.ReactNode; accent: string; onClick?: () => void }) => (
  <Paper
    sx={{
      p: 1.75,
      border: `1px solid ${T.border}`,
      borderRadius: 1.5,
      bgcolor: T.bg1,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 100ms',
      '&:hover': onClick ? { bgcolor: T.bg2, borderColor: accent, transform: 'translateY(-1px)' } : {},
    }}
    onClick={onClick}
  >
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 0.5 }}>
      <Box sx={{ width: 24, height: 24, borderRadius: 0.5, bgcolor: `${accent}15`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3 }}>{label}</Typography>
    </Stack>
    <Typography sx={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', color: T.text, lineHeight: 1 }}>{value}</Typography>
  </Paper>
);

const KpiCompact = ({ label, value, accent, onClick }: { label: string; value: number; accent: string; onClick?: () => void }) => (
  <Paper
    sx={{
      px: 1.25,
      py: 0.75,
      border: `1px solid ${T.border}`,
      borderRadius: 1,
      bgcolor: T.bg1,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 100ms',
      '&:hover': onClick ? { bgcolor: T.bg2, borderColor: accent, transform: 'translateY(-1px)' } : {},
      minWidth: 70,
    }}
    onClick={onClick}
  >
    <Typography sx={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.text3, mb: 0.25 }}>
      {label}
    </Typography>
    <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
      {value}
    </Typography>
  </Paper>
);

const Pill = ({ label, count, active, onClick, color }: { label: string; count: number; active: boolean; onClick: () => void; color: string }) => (
  <Button
    size="small" onClick={onClick}
    sx={{
      textTransform: 'none', fontSize: 12, fontWeight: 600,
      px: 1.25, py: 0.5, minHeight: 28, borderRadius: 999,
      border: '1px solid', borderColor: active ? color : T.border,
      bgcolor: active ? `${color}18` : T.bg1, color: active ? color : T.text2,
      '&:hover': { bgcolor: active ? `${color}22` : T.bg2, borderColor: active ? color : T.borderStrong },
    }}
  >
    {label}
    <Box component="span" sx={{
      ml: 0.75, fontSize: 10.5, fontWeight: 700, lineHeight: 1,
      bgcolor: active ? `${color}28` : T.bg3, color: active ? color : T.text3,
      borderRadius: 999, px: 0.75, py: 0.25,
    }}>{count}</Box>
  </Button>
);

// ─── Desktop table ─────────────────────────────────────────────────
function DesktopTable({ rows, onRowClick, onNavigate }: {
  rows: Reservation[];
  onRowClick: (r: Reservation) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 1400, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: T.bg2 }}>
              {['Réservation', 'Source', 'Propriété', 'Voyageur', 'Pays', 'Créé', 'Check-in', 'Check-out', 'Nuits', 'Présence', 'Statut', 'Prix', 'Voyageurs', 'Paiement', ''].map((h) => (
                <Box component="th" key={h} sx={{
                  textAlign: h === 'Nuits' || h === 'Présence' || h === 'Voyageurs' || h === '' ? 'center' : 'left',
                  px: 1.5, py: 1.25,
                  fontSize: 10.75, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: T.text3, borderBottom: `1px solid ${T.border}`, whiteSpace: 'nowrap',
                }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((r) => {
              const s = statusMeta(r.status);
              const p = presenceMeta(r);
              return (
                <Box component="tr" key={r._id}
                  sx={{
                    transition: 'background-color 100ms ease',
                    '&:hover': { bgcolor: T.bg2 },
                    '& > td': { borderBottom: `1px solid ${T.border}`, px: 1.5, py: 1.25, verticalAlign: 'middle' },
                  }}
                >
                  <Box component="td">
                    <Box
                      onClick={() => onRowClick(r)}
                      sx={{
                        cursor: 'pointer',
                        '&:hover': {
                          '& .reservation-number': { textDecoration: 'underline' }
                        }
                      }}
                    >
                      <Typography className="reservation-number" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 700, color: T.primaryDeep }}>
                        {r.reservationNumber || '—'}
                      </Typography>
                      {r.rentalsReservationId && (
                        <Typography sx={{ fontSize: 10, color: T.text4, mt: 0.25 }}>RU·{r.rentalsReservationId}</Typography>
                      )}
                    </Box>
                  </Box>
                  <Box component="td"><OTABadge channel={r.channelName} /></Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>
                      {r.listing?.name || '—'}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{r.guestName || '—'}</Typography>
                  </Box>
                  <Box component="td">
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                      <span style={{ fontSize: 18 }}>{flagFor(r.guestCountry)}</span>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: T.text2 }}>
                        {r.guestCountry || '—'}
                      </Typography>
                    </Stack>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12, color: T.text2 }}>
                      {moment(r.createdAt).format('DD MMM YY')}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: T.text4 }}>{moment(r.createdAt).format('HH:mm')}</Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12, color: T.text }}>{moment(r.arrivalDate).format('DD MMM YY')}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: r.confirmedCheckInTime ? T.success : T.text4 }}>
                      {formatTime(r.checkInTime) || '15:00'}
                    </Typography>
                    {r.actualArrivalTime && (
                      <Typography sx={{ fontSize: 10.5, color: T.success, fontWeight: 600 }}>✓ {formatTime(r.actualArrivalTime)}</Typography>
                    )}
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12, color: T.text }}>{moment(r.departureDate).format('DD MMM YY')}</Typography>
                    <Typography sx={{ fontSize: 10.5, color: r.confirmedCheckOutTime ? T.success : T.text4 }}>
                      {formatTime(r.checkOutTime) || '11:00'}
                    </Typography>
                    {r.actualDepartureTime && (
                      <Typography sx={{ fontSize: 10.5, color: T.warning, fontWeight: 600 }}>✓ {formatTime(r.actualDepartureTime)}</Typography>
                    )}
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <Box sx={{
                      display: 'inline-block', minWidth: 26, py: 0.25,
                      bgcolor: T.bg3, color: T.text, borderRadius: 0.75,
                      fontSize: 11.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace',
                    }}>{r.nights || 0}</Box>
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <Chip label={p.label} size="small" sx={{
                      bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: 11, height: 22,
                    }} />
                  </Box>
                  <Box component="td">
                    <Chip label={s.label} size="small" sx={{
                      bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, height: 22,
                    }} />
                  </Box>
                  <Box component="td">
                    {r.totalPrice != null ? (
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, fontFamily: '"Geist Mono", monospace' }}>
                        {r.totalPrice.toFixed(0)} {r.currency || 'EUR'}
                      </Typography>
                    ) : <Typography sx={{ fontSize: 12, color: T.text4 }}>—</Typography>}
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 11, color: T.text2 }}>
                      {r.adults || 0}A
                      {r.children ? ` · ${r.children}E` : ''}
                      {r.infants ? ` · ${r.infants}B` : ''}
                    </Typography>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 11, fontWeight: 500, color: T.text2 }}>{r.paymentStatus || '—'}</Typography>
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.25} justifyContent="center">
                      <Tooltip title="Voir détails">
                        <IconButton size="small" onClick={() => onRowClick(r)}>
                          <VisibilityIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Voir dans le calendrier">
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(`/calendar?listing=${r.listing._id}&startDate=${r.arrivalDate}&endDate=${r.departureDate}`);
                        }}>
                          <CalendarIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

// ─── Mobile card ───────────────────────────────────────────────────
function MobileCard({ r, onClick }: { r: Reservation; onClick: () => void }) {
  const s = statusMeta(r.status);
  const p = presenceMeta(r);
  return (
    <Card onClick={onClick} sx={{
      border: `1px solid ${T.border}`, borderRadius: 1.5, cursor: 'pointer',
      transition: 'box-shadow 140ms ease, border-color 140ms ease',
      '&:hover': { borderColor: T.borderStrong },
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <OTABadge channel={r.channelName} />
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 700, color: T.primaryDeep }}>
              {r.reservationNumber}
            </Typography>
          </Stack>
          <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
        </Stack>
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text, mb: 0.5 }}>{r.listing?.name}</Typography>
        <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1.25 }}>
          {flagFor(r.guestCountry)} {r.guestName}
        </Typography>
        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check-in</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{moment(r.arrivalDate).format('DD MMM')}</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10.5, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nuits</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>{r.nights || 0}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: 10.5, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Check-out</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{moment(r.departureDate).format('DD MMM')}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1.25 }}>
          <Chip label={p.label} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
          {r.totalPrice != null && (
            <Typography sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
              {r.totalPrice.toFixed(0)} {r.currency || 'EUR'}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ReservationsPage;
