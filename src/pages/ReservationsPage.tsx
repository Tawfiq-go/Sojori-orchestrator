// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Page · édition « Atelier 2026 »
// Route: /reservations
//
// Design moderne : freeze panes (header hors scroll V, calendrier multi),
// KPI strip, quick-filter pills, table dense, mobile cards.
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
  PageFullscreenEnterBtn,
  PageFullscreenLayer,
  pageTreeFullscreenSx,
  usePageFullscreen,
} from '../components/page-fullscreen';
import { useArrowKeyScroll } from '../hooks/useArrowKeyScroll';
import { useSyncedHorizontalScroll } from '../hooks/useSyncedHorizontalScroll';
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
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import moment from 'moment';
import 'moment/locale/fr';
import reservationsService from '../services/reservationsService';
import type { ReservationFilter } from '../types/reservations.types';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CreateReservationModal } from '../components/modals/CreateReservationModal';
import {
  ReservationSourceIcon,
  resolveReservationSourceKind,
} from '../components/reservations/ReservationSourceIcon';
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
import {
  presenceMetaFromReservation,
  presenceStyles,
} from '../utils/reservationPresence';

moment.locale('fr');

// ─── Types (inchangés) ──────────────────────────────────────────────
interface Reservation {
  _id: string;
  reservationNumber: string;
  rentalsReservationId?: string;
  channelName: string;
  source?: string;
  byRentals?: boolean;
  notes?: string | null;
  listing: {
    name: string;
    _id: string;
    propertyUnit?: string;
    importOnboarding?: { active?: boolean } | null;
  };
  roomTypeName?: string | null;
  roomTypes?: { roomTypeName?: string } | null;
  roomId?: string;
  roomName?: string | null;
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
import { pickRoomTypeName, pickRoomUnitName } from '../utils/multiListingLabel';

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

const CANCELLED_STATUS_VALUES = [
  'Cancelled',
  'CancelledByHost',
  'CancelledByCustomer',
  'CancelledByAdmin',
  'CancelledByOTA',
  'CancelledPaymentFailed',
] as const;

type QuickFilterKey =
  | 'arrToday'
  | 'depToday'
  | 'arrTomorrow'
  | 'depTomorrow'
  | 'arr7days'
  | 'dep7days';

type QuickFiltersState = Record<QuickFilterKey, boolean>;

const EMPTY_QUICK_FILTERS: QuickFiltersState = {
  arrToday: false,
  depToday: false,
  arrTomorrow: false,
  depTomorrow: false,
  arr7days: false,
  dep7days: false,
};

const URL_FILTER_TO_QUICK: Partial<Record<ReservationFilter, QuickFilterKey>> = {
  CHECKIN_TODAY: 'arrToday',
  CHECKOUT_TODAY: 'depToday',
  CHECKIN_TOMORROW: 'arrTomorrow',
  CHECKOUT_TOMORROW: 'depTomorrow',
  CHECKIN_7DAYS: 'arr7days',
  CHECKOUT_7DAYS: 'dep7days',
};

const QUICK_TO_URL_FILTER: Record<QuickFilterKey, ReservationFilter> = {
  arrToday: 'CHECKIN_TODAY',
  depToday: 'CHECKOUT_TODAY',
  arrTomorrow: 'CHECKIN_TOMORROW',
  depTomorrow: 'CHECKOUT_TOMORROW',
  arr7days: 'CHECKIN_7DAYS',
  dep7days: 'CHECKOUT_7DAYS',
};

const VALID_URL_FILTERS = new Set<string>(Object.keys(URL_FILTER_TO_QUICK));

function parseUrlReservationFilter(raw: string | null): ReservationFilter | null {
  if (!raw || !VALID_URL_FILTERS.has(raw)) return null;
  return raw as ReservationFilter;
}

function quickFiltersFromUrlFilter(filter: ReservationFilter | null): QuickFiltersState {
  const next = { ...EMPTY_QUICK_FILTERS };
  const key = filter ? URL_FILTER_TO_QUICK[filter] : undefined;
  if (key) next[key] = true;
  return next;
}

function statusesFromUrl(statusParam: string | null): string[] {
  if (!statusParam) return ['Pending', 'Confirmed', 'Started'];
  const raw = statusParam.trim().toLowerCase();
  if (raw === 'cancelled' || raw.includes('cancel')) {
    return [...CANCELLED_STATUS_VALUES];
  }
  return statusParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function isoToday(): string {
  return moment().format('YYYY-MM-DD');
}

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
  if (n === 'started')      return { bg: 'rgba(31,112,194,0.12)', color: T.info,    label: 'Started' };
  if (n === 'pending')      return { bg: 'rgba(196,101,6,0.12)',  color: T.warning, label: 'En attente' };
  if (n.includes('cancel')) return { bg: 'rgba(200,30,30,0.10)',  color: T.error,   label: 'Annulé' };
  if (n === 'completed')    return { bg: 'rgba(6,115,179,0.10)',  color: T.info,    label: 'Terminé' };
  return { bg: 'rgba(20,17,10,0.05)', color: T.text3, label: status };
};

const presenceMeta = (r: Reservation): { label: string; bg: string; color: string } => {
  const meta = presenceMetaFromReservation(r as never);
  const styles = presenceStyles(meta.tone);
  return { label: meta.label, ...styles };
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

type ResaSortField = 'default' | 'createdAt' | 'checkin' | 'checkout';
type ResaSortOrder = 'asc' | 'desc';

const startOfLocalTodayMs = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const endOfLocalTodayMs = () => {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.getTime();
};

/**
 * Tri page courante — miroir du backend (pagination = tri serveur).
 * default : annulations → créées auj. → arrivées les plus proches.
 */
const sortReservationsList = (
  list: Reservation[],
  sortField: ResaSortField,
  sortOrder: ResaSortOrder,
): Reservation[] => {
  if (!Array.isArray(list) || list.length < 2) return list;
  const safeTs = (d?: string | null) => {
    const t = new Date(d || 0).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const t0 = startOfLocalTodayMs();
  const t1 = endOfLocalTodayMs();
  const arrivalTs = (r: Reservation) => safeTs(r.arrivalDate);
  const departureTs = (r: Reservation) => safeTs(r.departureDate);
  const createdTs = (r: Reservation) => safeTs(r.createdAt);
  const cancelTs = (r: Reservation) =>
    safeTs(
      (r as Reservation & { cancellationDate?: string }).cancellationDate ||
        r.createdAt,
    );
  const unacked = (r: Reservation) =>
    isReservationCancelled(r.status) && r.cancellationAcknowledged !== true;
  const cancelled = (r: Reservation) => isReservationCancelled(r.status);
  const createdToday = (r: Reservation) => {
    const t = createdTs(r);
    return t >= t0 && t <= t1;
  };
  const cmpUpcomingFirst = (ta: number, tb: number) => {
    const pa = ta < t0;
    const pb = tb < t0;
    if (!pa && pb) return -1;
    if (pa && !pb) return 1;
    if (!pa && !pb) return ta - tb;
    return tb - ta;
  };

  if (sortField === 'checkin') {
    return [...list].sort((a, b) =>
      sortOrder === 'asc'
        ? cmpUpcomingFirst(arrivalTs(a), arrivalTs(b))
        : arrivalTs(b) - arrivalTs(a),
    );
  }
  if (sortField === 'checkout') {
    return [...list].sort((a, b) =>
      sortOrder === 'asc'
        ? cmpUpcomingFirst(departureTs(a), departureTs(b))
        : departureTs(b) - departureTs(a),
    );
  }
  if (sortField === 'createdAt') {
    return [...list].sort((a, b) => {
      if (unacked(a) !== unacked(b)) return unacked(a) ? -1 : 1;
      if (cancelled(a) !== cancelled(b)) return cancelled(a) ? -1 : 1;
      return sortOrder === 'asc'
        ? createdTs(a) - createdTs(b)
        : createdTs(b) - createdTs(a);
    });
  }

  /* default */
  return [...list].sort((a, b) => {
    const prio = (r: Reservation) => {
      if (unacked(r)) return 0;
      if (cancelled(r)) return 1;
      if (createdToday(r)) return 2;
      return 3;
    };
    const pa = prio(a);
    const pb = prio(b);
    if (pa !== pb) return pa - pb;
    if (pa <= 1) return cancelTs(b) - cancelTs(a);
    if (pa === 2) return createdTs(b) - createdTs(a);
    return cmpUpcomingFirst(arrivalTs(a), arrivalTs(b));
  });
};

// ─── Composant ──────────────────────────────────────────────────────
export function ReservationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { scopeFetchReady, requestOwnerId, ownerScopeAll } = useAdminOwnerApiScope();
  const { canWrite } = useWriteAccess('reservations');

  const urlFilter = parseUrlReservationFilter(searchParams.get('filter'));
  const createdToday =
    searchParams.get('created') === 'today' || searchParams.get('dateType') === 'creation';
  const createdStart = searchParams.get('startDate') || isoToday();
  const createdEnd = searchParams.get('endDate') || createdStart;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(() =>
    statusesFromUrl(new URLSearchParams(window.location.search).get('status')),
  );
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedListings, setSelectedListings] = useState<string[]>([]);

  const [quickFilters, setQuickFilters] = useState<QuickFiltersState>(() =>
    quickFiltersFromUrlFilter(
      parseUrlReservationFilter(new URLSearchParams(window.location.search).get('filter')),
    ),
  );

  /** Totaux pills / KPI — source backend (`total`), jamais le length de la page. */
  const [backendCounts, setBackendCounts] = useState({
    arrToday: 0,
    depToday: 0,
    arrTomorrow: 0,
    depTomorrow: 0,
    arr7days: 0,
    dep7days: 0,
  });

  const PAGE_SIZE_OPTIONS = [100, 200, 300] as const;
  const [page, setPage] = useState(0);
  const [totalReservations, setTotalReservations] = useState(0);
  const [limit, setLimit] = useState<number>(100);
  const totalPages = Math.max(1, Math.ceil(totalReservations / limit));

  /** Mode normal = default (annulations + créées auj. + arrivées proches). */
  const [sortField, setSortField] = useState<ResaSortField>('default');
  const [sortOrder, setSortOrder] = useState<ResaSortOrder>('asc');

  const handleSortChange = (field: 'createdAt' | 'checkin' | 'checkout') => {
    setPage(0);
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortField(field);
    setSortOrder(field === 'checkin' || field === 'checkout' ? 'asc' : 'desc');
  };

  // Deep-link Ma journée / KPI → synchronise pills + statuts depuis l’URL
  useEffect(() => {
    setQuickFilters(quickFiltersFromUrlFilter(urlFilter));
    const statusParam = searchParams.get('status');
    if (statusParam != null) {
      setSelectedStatuses(statusesFromUrl(statusParam));
    }
    setPage(0);
  }, [urlFilter, searchParams]);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isModalOpenRef = useRef(false);
  useEffect(() => {
    isModalOpenRef.current = isModalOpen;
  }, [isModalOpen]);

  const listFs = usePageFullscreen();
  const listFullscreen = listFs.fullscreen;

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
        sortField,
        sortOrder: sortField === 'default' ? 'asc' : sortOrder,
        filterOwnerId: requestOwnerId || undefined,
        // Filtre date fort : pas d’élargissement via cancellationDate
        ...(urlFilter ? { filter: urlFilter, strictArrivalWindow: true } : {}),
        ...(createdToday && !urlFilter
          ? {
              dateType: 'creation' as const,
              startDate: createdStart,
              endDate: createdEnd,
              strictArrivalWindow: true,
            }
          : {}),
      });

      const sorted = sortReservationsList(
        response.data as Reservation[],
        sortField,
        sortField === 'default' ? 'asc' : sortOrder,
      );
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
  }, [
    page,
    limit,
    selectedStatuses,
    globalFilter,
    scopeFetchReady,
    requestOwnerId,
    urlFilter,
    createdToday,
    createdStart,
    createdEnd,
    sortField,
    sortOrder,
  ]);

  useEffect(() => { setPage(0); }, [requestOwnerId]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(totalReservations / limit) - 1);
    if (page > maxPage) setPage(maxPage);
  }, [totalReservations, limit, page]);

  useEffect(() => { fetchReservations(); }, [fetchReservations]);

  // Totaux Arr./Dép. — appels backend dédiés (indépendants de la pagination liste)
  const fetchBackendCounts = useCallback(async () => {
    if (!scopeFetchReady) {
      setBackendCounts({
        arrToday: 0,
        depToday: 0,
        arrTomorrow: 0,
        depTomorrow: 0,
        arr7days: 0,
        dep7days: 0,
      });
      return;
    }
    try {
      const c = await reservationsService.getCounts({
        status: selectedStatuses.join(','),
        filterOwnerId: requestOwnerId || undefined,
      });
      setBackendCounts({
        arrToday: c.CHECKIN_TODAY,
        depToday: c.CHECKOUT_TODAY,
        arrTomorrow: c.CHECKIN_TOMORROW,
        depTomorrow: c.CHECKOUT_TOMORROW,
        arr7days: c.CHECKIN_7DAYS,
        dep7days: c.CHECKOUT_7DAYS,
      });
    } catch (err) {
      console.error('[ReservationsPage] getCounts failed', err);
    }
  }, [scopeFetchReady, selectedStatuses, requestOwnerId]);

  useEffect(() => {
    void fetchBackendCounts();
  }, [fetchBackendCounts]);

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
      void fetchBackendCounts();
    },
    handlers: {
      [SOCKET_EVENTS.NEW_RESERVATION]: (reservation: Reservation) => {
        setReservations(prev => {
          if (prev.some(r => r._id === reservation._id)) return prev;
          return [reservation, ...prev];
        });
        setTotalReservations(prev => prev + 1);
        void fetchBackendCounts();
      },
      [SOCKET_EVENTS.UPDATE_RESERVATION]: (reservation: Reservation) => {
        setReservations(prev =>
          prev.map(r => (r._id === reservation._id ? { ...r, ...reservation } : r)),
        );
        void fetchBackendCounts();
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
        r.listing?.name?.toLowerCase().includes(s) ||
        pickRoomTypeName(r)?.toLowerCase().includes(s) ||
        pickRoomUnitName(r)?.toLowerCase().includes(s)
      );
    }
    if (selectedChannels.length > 0) {
      f = f.filter(r => {
        const kind = resolveReservationSourceKind({
          source: r.source,
          channelName: r.channelName,
          byRentals: r.byRentals,
          notes: r.notes,
          listingName: r.listing?.name,
        });
        return selectedChannels.some(ch => {
          if (ch === 'nommos') return kind === 'nommos';
          if (ch === 'AirBNB') return kind === 'airbnb';
          if (ch === 'BookingCom') return kind === 'booking';
          if (ch === 'sojori') return kind === 'vente' || kind === 'admin' || kind === 'whatsapp';
          return false;
        });
      });
    }
    if (selectedListings.length > 0) {
      f = f.filter(r => selectedListings.includes(r.listing?._id || ''));
    }
    // Si l’API a déjà filtré via ?filter=CHECKIN_*, ne pas re-filtrer côté client
    // (évite une liste vide quand le fetch est paginé hors fenêtre).
    if (!urlFilter) {
      const today = moment(), tomorrow = moment().add(1, 'd'), next7 = moment().add(7, 'd');
      if (quickFilters.arrToday)    f = f.filter(r => moment(r.arrivalDate).isSame(today, 'day'));
      if (quickFilters.depToday)    f = f.filter(r => moment(r.departureDate).isSame(today, 'day'));
      if (quickFilters.arrTomorrow) f = f.filter(r => moment(r.arrivalDate).isSame(tomorrow, 'day'));
      if (quickFilters.depTomorrow) f = f.filter(r => moment(r.departureDate).isSame(tomorrow, 'day'));
      if (quickFilters.arr7days)    f = f.filter(r => moment(r.arrivalDate).isBetween(today, next7, 'day', '[]'));
      if (quickFilters.dep7days)    f = f.filter(r => moment(r.departureDate).isBetween(today, next7, 'day', '[]'));
    }
    return f;
  }, [reservations, globalFilter, selectedChannels, selectedListings, quickFilters, urlFilter]);

  // ─── KPIs / pills — totaux backend ; Présents/Pending restent sur la page courante
  const kpis = useMemo(() => {
    const present = reservations.filter((r) => {
      const p = presenceMetaFromReservation(r as never);
      return p.label === 'Arrivé' || (p.label === 'Séjour' && p.declared);
    }).length;
    const pending = reservations.filter((r) => r.status === 'Pending').length;
    return {
      arrToday: backendCounts.arrToday,
      depToday: backendCounts.depToday,
      present,
      pending,
    };
  }, [reservations, backendCounts.arrToday, backendCounts.depToday]);

  const filterCounts = backendCounts;

  const toggleQuick = (k: QuickFilterKey) => {
    const isActive = quickFilters[k];
    const nextQuick: QuickFiltersState = isActive
      ? { ...EMPTY_QUICK_FILTERS }
      : {
          arrToday: k === 'arrToday',
          depToday: k === 'depToday',
          arrTomorrow: k === 'arrTomorrow',
          depTomorrow: k === 'depTomorrow',
          arr7days: k === 'arr7days',
          dep7days: k === 'dep7days',
        };
    setQuickFilters(nextQuick);
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('created');
      next.delete('dateType');
      next.delete('startDate');
      next.delete('endDate');
      if (isActive) {
        next.delete('filter');
      } else {
        next.set('filter', QUICK_TO_URL_FILTER[k]);
      }
      return next;
    }, { replace: true });
  };
  const handleReset = () => {
    setGlobalFilter('');
    setSelectedStatuses(['Pending', 'Confirmed', 'Started']);
    setSelectedChannels([]);
    setSelectedListings([]);
    setQuickFilters({ ...EMPTY_QUICK_FILTERS });
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('filter');
      next.delete('status');
      next.delete('created');
      next.delete('dateType');
      next.delete('startDate');
      next.delete('endDate');
      return next;
    }, { replace: true });
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

  const listContent =
    !isLoading && visibleRows.length > 0 ? (
      isMobile ? (
        <Stack spacing={1.25}>
          {visibleRows.map((r) => (
            <MobileCard
              key={r._id}
              r={r}
              onClick={() => handleViewDetails(r)}
              onAcknowledge={handleAcknowledgeCancellation}
              onStayUpdate={handleStayFieldUpdate}
              onRegistrationUpdate={handleRegistrationUpdate}
            />
          ))}
        </Stack>
      ) : (
        <DesktopTable
          rows={visibleRows}
          onRowClick={handleViewDetails}
          onNavigate={navigate}
          onAcknowledge={handleAcknowledgeCancellation}
          onStayUpdate={handleStayFieldUpdate}
          onRegistrationUpdate={handleRegistrationUpdate}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          fillViewport
        />
      )
    ) : null;

  // Skeleton loading pendant le chargement initial
  if (isLoading && reservations.length === 0) {
    return (
      <DashboardWrapper compactMain breadcrumb={['Activité', 'Réservations']}>
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

  // Même arbre JSX en page et en plein écran (comme calendar-v3) :
  // filtres + toolbar restent utilisables — ne pas portal-er seulement la liste.
  const reservationsPage = (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: listFullscreen ? '100%' : '100%',
        maxHeight: listFullscreen ? '100%' : undefined,
        overflow: 'hidden',
        boxSizing: 'border-box',
        ...pageTreeFullscreenSx(listFullscreen),
        ...(!listFullscreen
          ? {
              flex: 1,
              minHeight: 0,
            }
          : {}),
      }}
    >
      {/* Toolbar / filtres — restent visibles en fullscreen */}
      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          border: `1px solid ${T.border}`,
          borderRadius: 1.5,
          bgcolor: T.bg1,
          flexShrink: 0,
        }}
      >
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
                { val: 'Started', label: '🏠 En séjour (Started)' },
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
                { val: 'nommos', label: 'Nommos (direct)' },
                { val: 'AirBNB', label: 'Airbnb' },
                { val: 'BookingCom', label: 'Booking.com' },
                { val: 'sojori', label: 'Sojori' },
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
          {!listFullscreen && (
            <PageFullscreenEnterBtn
              onClick={listFs.enter}
              disabled={visibleRows.length === 0}
              label="Liste plein écran"
            />
          )}
        </Stack>

        {/* Quick filters pills + KPI cards on same row */}
        <Stack direction="row" sx={{ mt: 1.5, gap: 0.75, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
            <Pill label="Arr. auj." count={filterCounts.arrToday}    active={quickFilters.arrToday}    onClick={() => toggleQuick('arrToday')}    color={T.info} />
            <Pill label="Dép. auj." count={filterCounts.depToday}    active={quickFilters.depToday}    onClick={() => toggleQuick('depToday')}    color={T.warning} />
            <Pill label="Arr. demain" count={filterCounts.arrTomorrow} active={quickFilters.arrTomorrow} onClick={() => toggleQuick('arrTomorrow')} color={T.info} />
            <Pill label="Dép. demain" count={filterCounts.depTomorrow} active={quickFilters.depTomorrow} onClick={() => toggleQuick('depTomorrow')} color={T.warning} />
            <Pill label="Arr. 7 jours" count={filterCounts.arr7days}  active={quickFilters.arr7days}  onClick={() => toggleQuick('arr7days')}    color={T.primary} />
            <Pill label="Dép. 7 jours" count={filterCounts.dep7days}  active={quickFilters.dep7days}  onClick={() => toggleQuick('dep7days')}    color={T.error} />
          </Stack>

          <Stack direction="row" sx={{ gap: 0.75 }}>
            <KpiCompact
              label="Arr. auj."
              value={kpis.arrToday}
              accent={T.info}
              onClick={() => toggleQuick('arrToday')}
            />
            <KpiCompact
              label="Dép. auj."
              value={kpis.depToday}
              accent={T.warning}
              onClick={() => toggleQuick('depToday')}
            />
            <KpiCompact
              label="Présents"
              value={kpis.present}
              accent={T.success}
              onClick={() => {
                if (selectedStatuses.length === 2 && selectedStatuses.includes('Confirmed') && selectedStatuses.includes('Started')) {
                  setSelectedStatuses(['Pending', 'Confirmed', 'Started']);
                } else {
                  setSelectedStatuses(['Confirmed', 'Started']);
                }
                setQuickFilters({ ...EMPTY_QUICK_FILTERS });
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('filter');
                  return next;
                }, { replace: true });
              }}
            />
            <KpiCompact
              label="En attente"
              value={kpis.pending}
              accent={T.text2}
              onClick={() => {
                if (selectedStatuses.length === 1 && selectedStatuses[0] === 'Pending') {
                  setSelectedStatuses(['Pending', 'Confirmed', 'Started']);
                } else {
                  setSelectedStatuses(['Pending']);
                }
                setQuickFilters({ ...EMPTY_QUICK_FILTERS });
                setSearchParams((prev) => {
                  const next = new URLSearchParams(prev);
                  next.delete('filter');
                  return next;
                }, { replace: true });
              }}
            />
          </Stack>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>{error}</Alert>}

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8, flexShrink: 0 }}>
          <CircularProgress size={48} sx={{ color: T.primary }} />
        </Box>
      )}

      {/* Contenu liste — scroll interne (freeze panes) */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {listContent}

        {!isLoading && filteredReservations.length === 0 && (
          <Paper sx={{ textAlign: 'center', py: 8, mt: 2, border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
            <InboxIcon sx={{ fontSize: 64, color: T.text4, mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: T.text2 }}>Aucune réservation trouvée</Typography>
            <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>Essayez de modifier vos filtres ou réinitialisez-les.</Typography>
            <Button onClick={handleReset} variant="text" sx={{ mt: 2, textTransform: 'none', color: T.primaryDeep }}>↻ Réinitialiser</Button>
          </Paper>
        )}

        {/* Une seule pagination bas, ultra-compacte (plus de doublon haut) */}
        {!isLoading && totalReservations > 0 && (
          <Stack
            direction="row"
            sx={{
              mt: 0.5,
              py: 0,
              minHeight: 28,
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.75,
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.2 }}>
              {page * limit + 1}–{Math.min((page + 1) * limit, totalReservations)} / {totalReservations}
              {' · '}{page + 1}/{totalPages}
            </Typography>
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                size="small"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(0);
                }}
                sx={{
                  minWidth: 56,
                  fontSize: 11,
                  height: 24,
                  '& .MuiSelect-select': { py: 0, px: 1 },
                }}
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <MenuItem key={size} value={size}>{size}</MenuItem>
                ))}
              </Select>
              <Button
                size="small"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                sx={{ textTransform: 'none', minHeight: 24, py: 0, px: 0.75, fontSize: 11 }}
              >
                ‹
              </Button>
              <Button
                size="small"
                disabled={page + 1 >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
                sx={{ textTransform: 'none', minHeight: 24, py: 0, px: 0.75, fontSize: 11 }}
              >
                ›
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <DashboardWrapper compactMain breadcrumb={['Activité', 'Réservations']}>
      {!listFullscreen && reservationsPage}

      <CreateReservationModal
        open={isModalOpen}
        filterOwnerId={requestOwnerId || undefined}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchReservations();
        }}
      />
      <PageFullscreenLayer
        open={listFullscreen}
        onClose={listFs.exit}
        label="Liste des réservations plein écran"
      >
        {reservationsPage}
      </PageFullscreenLayer>
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

/** Largeurs fixes — header + body partagent le même colgroup (freeze panes). */
const RESA_HEADERS = [
  'Voyageur', 'Source', 'Propriété', 'Pays', 'Créé', 'Check-in', 'Check-out',
  'Nuits', 'Présence', 'Statut', 'Payé', 'Voyageurs', 'Paiement', 'Actions',
] as const;
const RESA_COL_WIDTHS = [185, 56, 200, 88, 96, 118, 118, 56, 168, 108, 72, 148, 96, 88] as const;
const RESA_TABLE_MIN_WIDTH = RESA_COL_WIDTHS.reduce((a, b) => a + b, 0);

const resaTableSx = {
  width: '100%',
  minWidth: RESA_TABLE_MIN_WIDTH,
  tableLayout: 'fixed' as const,
  borderCollapse: 'separate' as const,
  borderSpacing: 0,
  fontSize: 12.5,
};

function ResaColGroup() {
  return (
    <colgroup>
      {RESA_COL_WIDTHS.map((w, i) => (
        <col key={RESA_HEADERS[i]} style={{ width: w }} />
      ))}
    </colgroup>
  );
}

const SORTABLE_HEADERS: Record<string, 'createdAt' | 'checkin' | 'checkout'> = {
  Créé: 'createdAt',
  'Check-in': 'checkin',
  'Check-out': 'checkout',
};

// ─── Desktop table ─────────────────────────────────────────────────
function DesktopTable({
  rows,
  onRowClick,
  onNavigate,
  onAcknowledge,
  onStayUpdate,
  onRegistrationUpdate,
  sortField,
  sortOrder,
  onSortChange,
  fillViewport = false,
}: {
  rows: Reservation[];
  onRowClick: (r: Reservation) => void;
  onNavigate: (path: string) => void;
  onAcknowledge?: (r: Reservation) => void;
  onStayUpdate?: (reservationId: string, patch: StayFieldPatch) => void;
  onRegistrationUpdate?: (reservationId: string, patch: RegistrationFieldPatch) => void;
  sortField: ResaSortField;
  sortOrder: ResaSortOrder;
  onSortChange: (field: 'createdAt' | 'checkin' | 'checkout') => void;
  /** Remplit la hauteur parent — header fixe + scroll body (calendrier multi) */
  fillViewport?: boolean;
}) {
  /**
   * Freeze panes = calendrier multi : header dates hors scroll vertical,
   * sync scrollLeft header ↔ body. Sticky top CSS faisait remonter toute
   * la ligne header dans le flux ; ici le thead est un sibling fixe.
   */
  const [hScrolled, setHScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  useSyncedHorizontalScroll(headerRef, bodyRef);
  useArrowKeyScroll(bodyRef, {
    horizontal: true,
    vertical: true,
    hStep: 120,
    vStep: 44,
    syncHorizontalRef: headerRef,
  });
  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return undefined;
    const onScroll = () => {
      const scrolled = el.scrollLeft > 2;
      setHScrolled((prev) => (prev === scrolled ? prev : scrolled));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  // Élévation calquée sur la colonne Listing du calendrier multi :
  // liseré net + ombre permanente, approfondie pendant le scroll.
  const pinnedShadow = hScrolled
    ? `inset -1px 0 0 ${T.borderStrong}, 8px 0 16px -2px rgba(20,17,10,0.28)`
    : `inset -1px 0 0 ${T.borderStrong}, 3px 0 8px rgba(20,17,10,0.10)`;

  return (
    <Paper
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        flex: fillViewport ? 1 : undefined,
        minHeight: fillViewport ? 0 : undefined,
        height: fillViewport ? '100%' : undefined,
        maxHeight: fillViewport ? '100%' : 'calc(100dvh - 280px)',
      }}
    >
      {/* Header fixe (hors scroll body) — pattern MultiView */}
      <Box
        ref={headerRef}
        sx={{
          flexShrink: 0,
          overflowX: 'hidden',
          overflowY: 'hidden',
          minWidth: 0,
          width: '100%',
          bgcolor: T.bg2,
          background: `linear-gradient(180deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
          borderBottom: `2px solid ${T.borderStrong}`,
          zIndex: 5,
        }}
      >
        <Box component="table" sx={resaTableSx}>
          <ResaColGroup />
          <Box component="thead">
            <Box component="tr">
              {RESA_HEADERS.map((h) => {
                const sortKey = SORTABLE_HEADERS[h];
                const active =
                  !!sortKey &&
                  (sortField === sortKey ||
                    (sortField === 'default' && sortKey === 'checkin'));
                return (
                  <Box
                    component="th"
                    key={h}
                    onClick={sortKey ? () => onSortChange(sortKey) : undefined}
                    sx={{
                      textAlign: h === 'Nuits' || h === 'Présence' || h === 'Voyageurs' || h === 'Actions' ? 'center' : 'left',
                      px: 1.5, py: 1.25,
                      fontSize: 10.75, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: active ? T.primary : T.text2,
                      whiteSpace: 'nowrap',
                      bgcolor: T.bg2,
                      background: `linear-gradient(180deg, ${T.bg1} 0%, ${T.bg2} 100%)`,
                      cursor: sortKey ? 'pointer' : 'default',
                      userSelect: 'none',
                      ...(h === 'Voyageur' && {
                        position: 'sticky',
                        left: 0,
                        zIndex: 6,
                        boxShadow: pinnedShadow,
                        transition: 'box-shadow 0.15s ease',
                      }),
                      ...(sortKey && {
                        '&:hover': { color: T.primary },
                      }),
                    }}
                  >
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35 }}>
                      {h}
                      {sortKey ? (
                        active && sortField !== 'default' ? (
                          sortOrder === 'asc' ? (
                            <ArrowUpIcon sx={{ fontSize: 12 }} />
                          ) : (
                            <ArrowDownIcon sx={{ fontSize: 12 }} />
                          )
                        ) : (
                          <Box component="span" sx={{ opacity: active ? 0.7 : 0.35, fontSize: 10 }}>
                            {sortField === 'default' && sortKey === 'checkin' ? '↑' : '↕'}
                          </Box>
                        )
                      ) : null}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Body scrollable H+V — 1re colonne sticky left */}
      <Box
        ref={bodyRef}
        sx={{
          overflow: 'auto',
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: '100%',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-x pan-y',
        }}
      >
        <Box component="table" sx={resaTableSx}>
          <ResaColGroup />
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
                    // Cellule identité épinglée : fond OPAQUE obligatoire (sinon les
                    // colonnes défilent visibles dessous) + ombre comme le calendrier.
                    '& > td:first-of-type': {
                      position: 'sticky', left: 0, zIndex: 2,
                      bgcolor: unacknowledged ? '#fdf3d0' : T.bg1,
                      boxShadow: pinnedShadow,
                      transition: 'box-shadow 0.15s ease',
                    },
                    '&:hover > td:first-of-type': {
                      bgcolor: unacknowledged ? '#fbeeb9' : T.bg2,
                    },
                  }}
                >
                  <Box component="td">
                    <Box
                      onClick={() => onRowClick(r)}
                      sx={{
                        cursor: 'pointer', minWidth: 0,
                        '&:hover': {
                          '& .reservation-number': { textDecoration: 'underline' }
                        }
                      }}
                    >
                      <Typography sx={{
                        fontSize: 12.5, fontWeight: 700, color: T.text,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 175,
                      }} title={r.guestName || undefined}>
                        {r.guestName || '—'}
                      </Typography>
                      <Typography className="reservation-number" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 700, color: T.primaryDeep }}>
                        {r.reservationNumber || '—'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box component="td" sx={{ textAlign: 'center' }}>
                    <ReservationSourceIcon
                      reservation={{
                        source: r.source,
                        channelName: r.channelName,
                        byRentals: r.byRentals,
                        notes: r.notes,
                        listingName: r.listing?.name,
                      }}
                    />
                  </Box>
                  <Box component="td" sx={{ maxWidth: 220 }}>
                    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <PostImportListingIndicator reservation={r} />
                      <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: T.text,
                            minWidth: 0,
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={r.listing?.name || '—'}
                        >
                          {r.listing?.name || '—'}
                        </Typography>
                        {String(r.listing?.propertyUnit || '') === 'Multi' &&
                        (pickRoomTypeName(r) || pickRoomUnitName(r)) ? (
                          <Typography
                            sx={{
                              fontSize: 10.5,
                              color: T.text3,
                              fontWeight: 600,
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={[pickRoomTypeName(r), pickRoomUnitName(r)].filter(Boolean).join(' · ')}
                          >
                            {[pickRoomTypeName(r), pickRoomUnitName(r)].filter(Boolean).join(' · ')}
                          </Typography>
                        ) : null}
                      </Box>
                    </Stack>
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
                    <Chip
                      label={p.label}
                      size="small"
                      title={
                        p.label === 'Arrivé'
                          ? 'Arrivée déclarée (WhatsApp)'
                          : p.label === 'Parti'
                            ? 'Départ déclaré (WhatsApp)'
                            : p.label === 'Attendu'
                              ? 'Check-in aujourd’hui — pas encore déclaré'
                              : p.label === 'Départ'
                                ? 'Check-out aujourd’hui — avant 11h, pas encore déclaré'
                                : p.label === 'Retard'
                                  ? 'Check-out aujourd’hui — après 11h, départ non déclaré'
                                  : p.label === 'Séjour'
                                    ? 'Ni check-in ni check-out aujourd’hui'
                                    : undefined
                      }
                      sx={{
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
            <ReservationSourceIcon
              reservation={{
                source: r.source,
                channelName: r.channelName,
                byRentals: r.byRentals,
                notes: r.notes,
                listingName: r.listing?.name,
              }}
              size={20}
            />
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
          <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: T.text,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={r.listing?.name || '—'}
            >
              {r.listing?.name}
            </Typography>
            {String(r.listing?.propertyUnit || '') === 'Multi' &&
            (pickRoomTypeName(r) || pickRoomUnitName(r)) ? (
              <Typography
                sx={{
                  fontSize: 11.5,
                  color: T.text3,
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={[pickRoomTypeName(r), pickRoomUnitName(r)].filter(Boolean).join(' · ')}
              >
                {[pickRoomTypeName(r), pickRoomUnitName(r)].filter(Boolean).join(' · ')}
              </Typography>
            ) : null}
          </Box>
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
