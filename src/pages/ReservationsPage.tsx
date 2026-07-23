// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Page · édition « Atelier 2026 »
// Route: /reservations
//
// Design moderne : header sticky, KPI strip, quick-filter pills,
// table dense premium, hover row, status pills sémantiques, mobile cards.
// Tous les champs / handlers / appels API du fichier original sont conservés.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState, startTransition, memo, useRef } from 'react';
import {
  Box, Stack, Typography, Paper, Chip, IconButton, Tooltip, Button,
  TextField, InputAdornment, FormControl, Select, MenuItem, Checkbox,
  ListItemText, CircularProgress, Alert, useMediaQuery, useTheme,
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
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/fr';
import reservationsService from '../services/reservationsService';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CreateReservationModal } from '../components/modals/CreateReservationModal';
import { ReservationSourceIcon } from '../components/reservations/ReservationSourceIcon';
import { blurActiveElement } from '../utils/domFocus';
import { logResaGuest, reservationStaySummary } from '../utils/resaGuestActionDebug';
import { formatGuestCountryDisplay } from '../utils/guestCountryDisplay';
import { ReservationStayActions, type StayFieldPatch } from '../components/reservations/ReservationStayActions';
import { useWriteAccess } from '../hooks/useWriteAccess';
import {
  ReservationRegistrationActions,
  type RegistrationFieldPatch,
} from '../components/reservations/ReservationRegistrationActions';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import { useSocketIO } from '../hooks/useSocketIO';
import { SOCKET_EVENTS, DEFAULT_ROOMS } from '../constants/socketEvents';
import { PostImportListingIndicator } from '../components/reservations/PostImportListingIndicator';

moment.locale('fr');

// ─── Types (inchangés) ──────────────────────────────────────────────
interface Reservation {
  _id: string;
  reservationNumber: string;
  rentalsReservationId?: string;
  channelName: string;
  source?: string;
  byRentals?: boolean;
  listing: {
    name: string;
    _id: string;
    importOnboarding?: { active?: boolean } | null;
  };
  orchestrationLaunch?: {
    status?: 'pending' | 'launched' | string | null;
    importListingId?: string | null;
  } | null;
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestCountry?: string;
  guestCountryCode?: string;
  guestLanguage?: string;
  phone?: string;
  nationality?: string;
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
  guestRegistration?: {
    nbre_guest_registered?: number;
    nbre_guest_to_register?: number;
    members?: Array<{
      first_name?: string;
      firstName?: string;
      last_name?: string;
      lastName?: string;
      nationality?: string;
      document_number?: string;
      passport?: string;
      gender?: string;
      status?: string;
    }>;
  };
}

import { dashboardTokens as T } from '../design/sojoriBrandTokens';
import { formatReservationPaid } from '../utils/reservationPaidDisplay';

const TOOLBAR_SELECT_SX = {
  minWidth: 0,
  '& .MuiOutlinedInput-root': { height: 30 },
  '& .MuiSelect-select': { py: 0.25, fontSize: 11.5, minHeight: 'unset !important' },
} as const;

const TOOLBAR_SEARCH_SX = {
  flex: 1,
  minWidth: 140,
  maxWidth: 280,
  '& .MuiOutlinedInput-root': { height: 30, fontSize: 12 },
} as const;

// ─── Helpers ───────────────────────────────────────────────────────
const isReservationCancelled = (status: string) => {
  const s = status?.toLowerCase() || '';
  return s.includes('cancel') || s === 'rejected';
};

const isCancelledStatusFilter = (statuses: string[]) =>
  statuses.some((s) => s.toLowerCase() === 'cancelled' || isReservationCancelled(s));

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

const GuestCountryCell = ({
  guestCountry,
  guestCountryCode,
  guestLanguage,
  phone,
  nationality,
}: {
  guestCountry?: string;
  guestCountryCode?: string;
  guestLanguage?: string;
  phone?: string;
  nationality?: string;
}) => {
  const { flag, label } = formatGuestCountryDisplay(guestCountry, guestCountryCode, {
    guestLanguage,
    phone,
    nationality,
  });
  return (
    <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        {flag ? <span style={{ fontSize: 18, lineHeight: 1 }}>{flag}</span> : null}
        <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: T.text2 }} title={label}>
          {label}
        </Typography>
      </Stack>
      {guestLanguage ? (
        <Typography sx={{ fontSize: 10.5, color: T.text4 }}>{guestLanguage}</Typography>
      ) : null}
    </Stack>
  );
};

// ─── Tri intelligent (comme legacy) ─────────────────────────────────
const sortReservationsList = (list: Reservation[]): Reservation[] => {
  return list.sort((a, b) => {
    // 1️⃣ Annulations non acquittées d'abord (priorité absolue)
    const aUnacked = isReservationCancelled(a.status) && a.cancellationAcknowledged !== true;
    const bUnacked = isReservationCancelled(b.status) && b.cancellationAcknowledged !== true;
    if (aUnacked && !bUnacked) return -1;
    if (!aUnacked && bUnacked) return 1;

    // 2️⃣ Puis autres annulés
    const aCancelled = isReservationCancelled(a.status);
    const bCancelled = isReservationCancelled(b.status);
    if (aCancelled && !bCancelled) return -1;
    if (!aCancelled && bCancelled) return 1;

    // 3️⃣ Enfin par date de création (plus récent d'abord)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

// ─── Composant ──────────────────────────────────────────────────────
export function ReservationsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { scopeFetchReady, requestOwnerId, ownerScopeAll } = useAdminOwnerApiScope();
  const { canWrite } = useWriteAccess('reservations');

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
  const [totalReservations, setTotalReservations] = useState(0);
  const limit = 100;

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  // ─── Helper for cancellation acknowledgement ──────────────────────
  const isCancellationUnacknowledged = (reservation: Reservation) => {
    if (!isReservationCancelled(reservation.status)) return false;
    return reservation.cancellationAcknowledged !== true;
  };

  // ─── Handler Acquitter ────────────────────────────────────────────
  const handleAcknowledgeCancellation = async (reservation: Reservation) => {
    const reservationId = reservation._id;
    if (!reservationId) return;

    // Optimistic update
    const prevAck = reservation.cancellationAcknowledged;
    setReservations(prev =>
      prev.map(r => (r._id === reservationId ? { ...r, cancellationAcknowledged: true } : r)),
    );

    try {
      const result = await reservationsService.updateReservationFields(reservationId, {
        cancellationAcknowledged: true,
      });

      if (result.success) {
        toast.success('Annulation acquittée');
        if (!isCancelledStatusFilter(selectedStatuses)) {
          setReservations(prev =>
            prev.filter(r => r._id !== reservationId || !isReservationCancelled(r.status)),
          );
          setTotalReservations(prev => Math.max(0, prev - 1));
        }
      } else {
        // Rollback on error
        setReservations(prev =>
          prev.map(r => (r._id === reservationId ? { ...r, cancellationAcknowledged: prevAck } : r)),
        );
        toast.error(result.message || 'Erreur lors de l\'acquittement');
      }
    } catch (error: any) {
      // Rollback on error
      setReservations(prev =>
        prev.map(r => (r._id === reservationId ? { ...r, cancellationAcknowledged: prevAck } : r)),
      );
      toast.error(error.message || 'Erreur lors de l\'acquittement');
    }
  };

  const handleStayFieldUpdate = useCallback((reservationId: string, patch: StayFieldPatch) => {
    logResaGuest('page:patchStay ligne', { reservationId, patch });
    setReservations(prev =>
      prev.map(r => (r._id === reservationId ? { ...r, ...patch } : r)),
    );
  }, []);

  const handleRegistrationUpdate = useCallback((reservationId: string, patch: RegistrationFieldPatch) => {
    logResaGuest('page:patchRegistration ligne', { reservationId, patch });
    setReservations(prev =>
      prev.map(r =>
        r._id === reservationId
          ? {
              ...r,
              guestRegistration: {
                ...r.guestRegistration,
                ...patch.guestRegistration,
                members: patch.guestRegistration?.members ?? r.guestRegistration?.members,
              },
            }
          : r,
      ),
    );
  }, []);

  // ─── Fetch (logique métier inchangée) ────────────────────────────
  const fetchReservations = useCallback(async () => {
    if (!scopeFetchReady) {
      setReservations([]);
      setTotalReservations(0);
      setIsLoading(false);
      setError(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const sjSearch = globalFilter.trim().match(/^SJ-/i) ? globalFilter.trim() : undefined;
      const response = await reservationsService.getList({
        page,
        limit,
        status: selectedStatuses.join(','),
        reservationNumber: sjSearch,
        sortField: 'createdAt',
        sortOrder: 'desc',
        filterOwnerId: requestOwnerId || undefined,
      });

      const sorted = sortReservationsList(response.data as Reservation[]);
      logResaGuest('page:fetchList ← srv-reservations', {
        count: sorted.length,
        total: response.total ?? sorted.length,
        rows: sorted.slice(0, 8).map(reservationStaySummary),
      });
      setReservations(sorted);
      setTotalReservations(response.total ?? sorted.length);
    } catch (err: any) {
      console.error('❌ [ReservationsPage] Error fetching:', err);
      logResaGuest('page:fetchList ERROR', { message: err?.message || String(err) });
      setError(err.message || 'Erreur');
      setReservations([]);
      setTotalReservations(0);
      toast.error('Erreur lors du chargement');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, selectedStatuses, globalFilter, scopeFetchReady, requestOwnerId]);

  useEffect(() => { setPage(0); }, [requestOwnerId]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // ─── Temps réel (socket.io) ───────────────────────────────────────
  const socketRooms = useMemo(() => {
    if (ownerScopeAll || !requestOwnerId) return [DEFAULT_ROOMS.RESERVATION_ADMIN_ROOM];
    return [`room_reservation_${requestOwnerId}`];
  }, [requestOwnerId, ownerScopeAll]);

  useSocketIO({
    rooms: socketRooms,
    enabled: scopeFetchReady,
    onReconnect: () => {
      if (isModalOpenRef.current) return;
      fetchReservations();
    },
    handlers: {
      [SOCKET_EVENTS.NEW_RESERVATION]: (reservation: Reservation) => {
        setReservations(prev => {
          if (prev.some(r => r._id === reservation._id)) return prev;
          return [reservation, ...prev];
        });
        setTotalReservations(prev => prev + 1);
      },
      [SOCKET_EVENTS.UPDATE_RESERVATION]: (reservation: Reservation) => {
        setReservations(prev =>
          prev.map(r => (r._id === reservation._id ? { ...r, ...reservation } : r)),
        );
      },
    },
  });

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
  }, [reservations, globalFilter, selectedChannels, selectedListings, quickFilters]);

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
  const openCreateModal = useCallback(() => {
    if (!canWrite) return;
    blurActiveElement();
    startTransition(() => setIsModalOpen(true));
  }, [canWrite]);

  // ?action=new (raccourci header) → ouvre la création — réactif au changement
  // d'URL (fonctionne aussi quand on est déjà sur /reservations)
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'new') {
      openCreateModal();
      params.delete('action');
      window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params}` : ''}`);
    }
  }, [location.search, openCreateModal]);

  const handleViewDetails = (r: Reservation) => navigate(`/reservations/${r._id}`);

  const visibleRows = filteredReservations;

  // Skeleton loading pendant le chargement initial
  if (isLoading && reservations.length === 0) {
    return (
      <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
        <Box sx={{ width: '100%' }}>
          {/* Header skeleton */}
          <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ width: 320, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 100, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 180, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 160, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 140, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 32, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
            </Stack>
            {/* Quick filters skeleton */}
            <Stack direction="row" sx={{ mt: 1.5, gap: 0.75, flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Box key={i} sx={{ width: 100, height: 28, bgcolor: T.bg2, borderRadius: 2 }} />
              ))}
            </Stack>
          </Paper>

          {/* Table skeleton */}
          <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
            {/* Table header skeleton */}
            <Box sx={{
              display: 'flex',
              gap: 2,
              p: 2,
              borderBottom: `2px solid ${T.border}`,
              bgcolor: T.bg2
            }}>
              <Box sx={{ width: 120, height: 20, bgcolor: T.bg3, borderRadius: 0.5 }} />
              <Box sx={{ flex: 1, height: 20, bgcolor: T.bg3, borderRadius: 0.5 }} />
              <Box sx={{ width: 120, height: 20, bgcolor: T.bg3, borderRadius: 0.5 }} />
              <Box sx={{ width: 100, height: 20, bgcolor: T.bg3, borderRadius: 0.5 }} />
              <Box sx={{ width: 80, height: 20, bgcolor: T.bg3, borderRadius: 0.5 }} />
            </Box>

            {/* Table rows skeleton */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  gap: 2,
                  p: 2,
                  borderBottom: i < 10 ? `1px solid ${T.border}` : 'none',
                  bgcolor: i % 2 === 0 ? T.bg1 : 'transparent'
                }}
              >
                <Box sx={{ width: 120, height: 16, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ flex: 1, height: 16, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: 120, height: 16, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: 100, height: 16, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: 80, height: 16, bgcolor: T.bg2, borderRadius: 0.5 }} />
              </Box>
            ))}
          </Paper>

          {/* Loading indicator */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress size={24} sx={{ color: T.primary }} />
          </Box>
        </Box>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
      <Box sx={{ width: '100%' }}>
        {/* Toolbar */}
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small" placeholder="Rechercher voyageur, propriété, n° de réservation…"
              value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: T.text3 }} /></InputAdornment>,
                },
              }}
              sx={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />
            {canWrite ? (
            <Button
              variant="contained"
              size="small"
              onClick={openCreateModal}
              sx={{
                textTransform: 'none',
                bgcolor: T.primary,
                color: T.primaryOnGold,
                fontWeight: 600,
                px: 2,
                '&:hover': { bgcolor: T.primaryDeep, color: '#fff' },
                whiteSpace: 'nowrap',
              }}
            >
              ➕ Ajouter
            </Button>
            ) : null}
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
                onChange={(e) => { setSelectedStatuses(e.target.value as string[]); setPage(0); }}
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
        {!isLoading && !isMobile && visibleRows.length > 0 && (
          <DesktopTable rows={visibleRows} onRowClick={handleViewDetails} onNavigate={navigate} onAcknowledge={handleAcknowledgeCancellation} onStayUpdate={handleStayFieldUpdate} onRegistrationUpdate={handleRegistrationUpdate} />
        )}
        {!isLoading && isMobile && visibleRows.length > 0 && (
          <Stack spacing={1.25}>
            {visibleRows.map((r) => (
              <MobileCard key={r._id} r={r} onClick={() => handleViewDetails(r)} onAcknowledge={handleAcknowledgeCancellation} onStayUpdate={handleStayFieldUpdate} onRegistrationUpdate={handleRegistrationUpdate} />
            ))}
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
        {!isLoading && totalReservations > 0 && (
          <Stack direction="row" sx={{ mt: 2, alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
              {page * limit + 1}–{Math.min((page + 1) * limit, totalReservations)} sur {totalReservations}
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" disabled={page === 0} onClick={() => setPage(page - 1)} sx={{ textTransform: 'none' }}>← Précédent</Button>
              <Button size="small" disabled={(page + 1) * limit >= totalReservations} onClick={() => setPage(page + 1)} sx={{ textTransform: 'none' }}>Suivant →</Button>
            </Stack>
          </Stack>
        )}
      </Box>

      {/* Modal d'ajout de réservation */}
      <CreateReservationModal
        open={isModalOpen}
        filterOwnerId={requestOwnerId || undefined}
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
function DesktopTable({ rows, onRowClick, onNavigate, onAcknowledge, onStayUpdate, onRegistrationUpdate }: {
  rows: Reservation[];
  onRowClick: (r: Reservation) => void;
  onNavigate: (path: string) => void;
  onAcknowledge?: (r: Reservation) => void;
  onStayUpdate?: (reservationId: string, patch: StayFieldPatch) => void;
  onRegistrationUpdate?: (reservationId: string, patch: RegistrationFieldPatch) => void;
}) {
  return (
    <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5, overflow: 'hidden' }}>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', minWidth: 1520, borderCollapse: 'collapse', fontSize: 12.5 }}>
          <Box component="thead">
            <Box component="tr" sx={{
              bgcolor: T.bg2,
              background: `linear-gradient(180deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
            }}>
              {['Réservation', 'Source', 'Propriété', 'Voyageur', 'Pays', 'Créé', 'Check-in', 'Check-out', 'Nuits', 'Présence', 'Statut', 'Payé', 'Voyageurs', 'Paiement', 'Actions'].map((h) => (
                <Box component="th" key={h} sx={{
                  textAlign: h === 'Nuits' || h === 'Présence' || h === 'Voyageurs' || h === 'Actions' ? 'center' : 'left',
                  px: 1.5, py: 1.25,
                  fontSize: 10.75, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: T.text2, borderBottom: `2px solid ${T.borderStrong}`, whiteSpace: 'nowrap',
                }}>{h}</Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {rows.map((r) => {
              const s = statusMeta(r.status);
              const p = presenceMeta(r);
              const isCancelled = isReservationCancelled(r.status);
              const unacknowledged = isCancelled && r.cancellationAcknowledged !== true;

              return (
                <Box component="tr" key={r._id}
                  sx={{
                    transition: 'background-color 100ms ease',
                    bgcolor: unacknowledged ? 'rgba(250, 204, 21, 0.08)' : 'transparent',
                    '&:hover': { bgcolor: unacknowledged ? 'rgba(250, 204, 21, 0.15)' : T.bg2 },
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
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <ReservationSourceIcon reservation={r} />
                  </Box>
                  <Box component="td">
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <PostImportListingIndicator reservation={r} />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, minWidth: 0 }}>
                        {r.listing?.name || '—'}
                      </Typography>
                    </Stack>
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{r.guestName || '—'}</Typography>
                  </Box>
                  <Box component="td">
                    <GuestCountryCell
                      guestCountry={r.guestCountry}
                      guestCountryCode={r.guestCountryCode}
                      guestLanguage={r.guestLanguage}
                      phone={r.phone}
                      nationality={r.nationality}
                    />
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 12, color: T.text2 }}>
                      {moment(r.createdAt).format('DD MMM YY')}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, color: T.text4 }}>{moment(r.createdAt).format('HH:mm')}</Typography>
                  </Box>
                  <Box component="td">
                    <ReservationStayActions
                      reservationId={r._id}
                      kind="arrival"
                      dateLabel={moment(r.arrivalDate).format('DD MMM YY')}
                      chosenTime={r.checkInTime}
                      chosenConfirmed={r.confirmedCheckInTime}
                      declaredTime={r.actualArrivalTime}
                      disabled={isCancelled}
                      onStayUpdated={(patch) => onStayUpdate?.(r._id, patch)}
                    />
                  </Box>
                  <Box component="td">
                    <ReservationStayActions
                      reservationId={r._id}
                      kind="departure"
                      dateLabel={moment(r.departureDate).format('DD MMM YY')}
                      chosenTime={r.checkOutTime}
                      chosenConfirmed={r.confirmedCheckOutTime}
                      declaredTime={r.actualDepartureTime}
                      disabled={isCancelled}
                      onStayUpdated={(patch) => onStayUpdate?.(r._id, patch)}
                    />
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
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                      <Chip label={s.label} size="small" sx={{
                        bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11, height: 22,
                      }} />
                      {unacknowledged && (
                        <Chip label="Non acquitté" size="small" sx={{
                          bgcolor: 'rgba(245, 158, 11, 0.12)',
                          color: T.warning,
                          fontWeight: 700,
                          fontSize: 10,
                          height: 20,
                          animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                          '@keyframes pulse': {
                            '0%, 100%': { opacity: 1 },
                            '50%': { opacity: 0.7 }
                          }
                        }} />
                      )}
                    </Stack>
                  </Box>
                  <Box component="td">
                    {(() => {
                      const paidLabel = formatReservationPaid(r);
                      return paidLabel ? (
                        <Typography
                          sx={{ fontSize: 12.5, fontWeight: 600, color: T.text, fontFamily: '"Geist Mono", monospace' }}
                          title="Total déjà payé (MAD, taux admin) — hors taxes non payées (ex. taxe de séjour)"
                        >
                          {paidLabel}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: T.text4 }}>—</Typography>
                      );
                    })()}
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <Typography sx={{ fontSize: 11, color: T.text2 }}>
                      {r.adults || 0}A
                      {r.children ? ` · ${r.children}E` : ''}
                      {r.infants ? ` · ${r.infants}B` : ''}
                    </Typography>
                    <ReservationRegistrationActions
                      reservationId={r._id}
                      registered={r.guestRegistration?.nbre_guest_registered}
                      total={r.guestRegistration?.nbre_guest_to_register ?? r.adults}
                      members={r.guestRegistration?.members}
                      disabled={isCancelled}
                      onRegistrationUpdated={(patch) => onRegistrationUpdate?.(r._id, patch)}
                    />
                  </Box>
                  <Box component="td">
                    <Typography sx={{ fontSize: 11, fontWeight: 500, color: T.text2 }}>{r.paymentStatus || '—'}</Typography>
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    {unacknowledged && onAcknowledge ? (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledge(r);
                        }}
                        sx={{
                          fontSize: 11,
                          minHeight: 28,
                          py: 0.5,
                          px: 1.5,
                          fontWeight: 700,
                          textTransform: 'none',
                          borderColor: T.warning,
                          color: T.warning,
                          '&:hover': { bgcolor: 'rgba(196,101,6,0.08)', borderColor: T.warning },
                        }}
                      >
                        Acquitter
                      </Button>
                    ) : (
                      <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'center' }}>
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
                    )}
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
function MobileCard({ r, onClick, onAcknowledge, onStayUpdate, onRegistrationUpdate }: { r: Reservation; onClick: () => void; onAcknowledge?: (r: Reservation) => void; onStayUpdate?: (reservationId: string, patch: StayFieldPatch) => void; onRegistrationUpdate?: (reservationId: string, patch: RegistrationFieldPatch) => void }) {
  const s = statusMeta(r.status);
  const p = presenceMeta(r);

  const isCancelled = isReservationCancelled(r.status);
  const unacknowledged = isCancelled && r.cancellationAcknowledged !== true;

  return (
    <Card onClick={onClick} sx={{
      border: `1px solid ${unacknowledged ? 'rgba(245, 158, 11, 0.28)' : T.border}`,
      bgcolor: unacknowledged ? 'rgba(250, 204, 21, 0.12)' : T.bg1,
      borderRadius: 1.5,
      cursor: 'pointer',
      transition: 'box-shadow 140ms ease, border-color 140ms ease',
      '&:hover': { borderColor: unacknowledged ? 'rgba(245, 158, 11, 0.5)' : T.borderStrong },
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1 }}>
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
            <ReservationSourceIcon reservation={r} size={20} />
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 700, color: T.primaryDeep }}>
              {r.reservationNumber}
            </Typography>
          </Stack>
          <Chip label={s.label} size="small" sx={{ bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
        </Stack>

        {/* Annulation info + bouton acquitter */}
        {isCancelled && r.cancellationDate && (
          <Box sx={{ mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.5)', borderRadius: 1 }}>
            <Typography sx={{ fontSize: 11, color: T.text3, mb: 0.5 }}>
              Annulée le {moment(r.cancellationDate).format('DD/MM/YYYY HH:mm')}
            </Typography>
            {unacknowledged && onAcknowledge && (
              <Button
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledge(r);
                }}
                sx={{
                  fontSize: 10,
                  minHeight: 22,
                  py: 0.25,
                  px: 1,
                  fontWeight: 700,
                  borderColor: T.warning,
                  color: T.warning,
                  '&:hover': { bgcolor: 'rgba(196,101,6,0.08)', borderColor: T.warning },
                }}
              >
                Acquitter
              </Button>
            )}
          </Box>
        )}

        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5, minWidth: 0 }}>
          <PostImportListingIndicator reservation={r} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text, minWidth: 0 }}>{r.listing?.name}</Typography>
        </Stack>
        <Typography sx={{ fontSize: 12.5, color: T.text2, mb: 1.25 }}>
          {(() => {
            const { flag, label } = formatGuestCountryDisplay(r.guestCountry, r.guestCountryCode, {
              guestLanguage: r.guestLanguage,
              phone: r.phone,
              nationality: r.nationality,
            });
            return `${flag ? `${flag} ` : ''}${r.guestName}${label && label !== '—' ? ` · ${label}` : ''}`;
          })()}
        </Typography>
        <Divider sx={{ my: 1.25 }} />
        <Stack direction="row" spacing={1.5} sx={{ mb: 1 }} onClick={(e) => e.stopPropagation()}>
          <ReservationStayActions
            reservationId={r._id}
            kind="arrival"
            dateLabel={moment(r.arrivalDate).format('DD MMM YY')}
            chosenTime={r.checkInTime}
            chosenConfirmed={r.confirmedCheckInTime}
            declaredTime={r.actualArrivalTime}
            disabled={isCancelled}
            onStayUpdated={(patch) => onStayUpdate?.(r._id, patch)}
          />
          <ReservationStayActions
            reservationId={r._id}
            kind="departure"
            dateLabel={moment(r.departureDate).format('DD MMM YY')}
            chosenTime={r.checkOutTime}
            chosenConfirmed={r.confirmedCheckOutTime}
            declaredTime={r.actualDepartureTime}
            disabled={isCancelled}
            onStayUpdated={(patch) => onStayUpdate?.(r._id, patch)}
          />
        </Stack>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
          <Box>
            <Typography sx={{ fontSize: 10.5, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nuits</Typography>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>{r.nights || 0}</Typography>
          </Box>
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mt: 1.25 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
            <Chip label={p.label} size="small" sx={{ bgcolor: p.bg, color: p.color, fontWeight: 600, fontSize: 10.5, height: 20 }} />
            <ReservationRegistrationActions
              reservationId={r._id}
              registered={r.guestRegistration?.nbre_guest_registered}
              total={r.guestRegistration?.nbre_guest_to_register ?? r.adults}
              members={r.guestRegistration?.members}
              disabled={isCancelled}
              onRegistrationUpdated={(patch) => onRegistrationUpdate?.(r._id, patch)}
            />
          </Stack>
          {formatReservationPaid(r) && (
            <Typography
              sx={{ fontSize: 13, fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}
              title="Total déjà payé (MAD, taux admin) — hors taxes non payées"
            >
              {formatReservationPaid(r)}
            </Typography>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export default ReservationsPage;
