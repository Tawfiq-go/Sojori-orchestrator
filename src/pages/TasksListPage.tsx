// ════════════════════════════════════════════════════════════════════
// Sojori — Tasks List · design « Atelier 2026 » (aligné ReservationsPage)
// Route: /tasks — toolbar, pills échéances, KPI compacts, tableau premium.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState } from 'react';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import FilterListIcon from '@mui/icons-material/FilterList';
import InboxIcon from '@mui/icons-material/Inbox';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Paper,
  Select,
  Stack,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import 'moment/locale/fr';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  DataTable,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

moment.locale('fr');
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { useAuth } from '../hooks/useAuth';
import tasksService, { resolveTasksUserScope } from '../services/tasksService';
import type {
  TaskEmergency,
  TaskListItem,
  TaskListingOption,
  TaskStatus,
  TasksStaffMember,
} from '../types/tasks.types';
import {
  TASK_STATUS_LABELS,
  TASK_STATUS_VARIANTS,
  getNextTaskStatus,
  normalizeTaskStatus,
} from '../types/tasks.types';

/** Largeur totale optimisée ~1750px pour éviter scroll horizontal sur écrans 1920px */
const TASK_TABLE_MIN_WIDTH = 1750;

const COLUMN_WIDTHS = {
  name: '100px',       // Réduit de 120 → 100
  /** Icône + libellé sur une ligne (ex. « 🛎️ Conciergerie », « 🧹 Ménage Gratuit »). */
  category: '145px',   // Réduit de 175 → 145
  itemNumber: '90px',  // Réduit de 110 → 90
  createdAt: '85px',   // Réduit de 90 → 85
  executionDate: '105px', // Réduit de 120 → 105
  timeslotClient: '100px', // Réduit de 120 → 100
  heureTask: '115px',  // Réduit de 140 → 115
  timeslot: '95px',    // Réduit de 110 → 95
  source: '60px',      // Réduit de 70 → 60
  voyageur: '125px',   // Réduit de 150 → 125
  listing: '90px',     // Réduit de 100 → 90
  reservation: '95px', // Réduit de 110 → 95
  details: '120px',    // Réduit de 150 → 120
  status: '90px',      // Réduit de 100 → 90
  assignedStaff: '110px', // Réduit de 130 → 110
  payment: '85px',     // Réduit de 100 → 85
  price: '70px',       // Réduit de 80 → 70
  urgence: '80px',     // Réduit de 90 → 80
} as const;

/** Palette alignée ReservationsPage (« Atelier 2026 ») — chrome compact */
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

type QuickFilterKey = 'none' | 'dueToday' | 'dueTomorrow' | 'due7d' | 'urgent';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: T.bg1,
    borderRadius: 1,
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.borderStrong },
    '&.Mui-focused fieldset': { borderColor: T.primary },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: T.primaryDeep },
};

function Pill({
  label,
  count,
  active,
  onClick,
  color,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <Button
      size="small"
      onClick={onClick}
      sx={{
        textTransform: 'none',
        fontSize: 12,
        fontWeight: 600,
        px: 1.25,
        py: 0.5,
        minHeight: 28,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? color : T.border,
        bgcolor: active ? `${color}18` : T.bg1,
        color: active ? color : T.text2,
        '&:hover': {
          bgcolor: active ? `${color}22` : T.bg2,
          borderColor: active ? color : T.borderStrong,
        },
      }}
    >
      {label}
      <Box
        component="span"
        sx={{
          ml: 0.75,
          fontSize: 10.5,
          fontWeight: 700,
          lineHeight: 1,
          bgcolor: active ? `${color}28` : T.bg3,
          color: active ? color : T.text3,
          borderRadius: 999,
          px: 0.75,
          py: 0.25,
        }}
      >
        {count}
      </Box>
    </Button>
  );
}

function KpiCompact({
  label,
  value,
  accent,
  onClick,
}: {
  label: string;
  value: number;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        px: 1.25,
        py: 0.75,
        border: `1px solid ${T.border}`,
        borderRadius: 1,
        bgcolor: T.bg1,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 100ms',
        '&:hover': onClick
          ? { bgcolor: T.bg2, borderColor: accent, transform: 'translateY(-1px)' }
          : {},
        minWidth: 72,
      }}
    >
      <Typography
        sx={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: T.text3,
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: accent, lineHeight: 1 }}>
        {value}
      </Typography>
    </Paper>
  );
}

/**
 * Badge OTA circulaire avec initiale (comme ReservationsPage)
 */
function OTABadge({ source }: { source?: string | null }) {
  const c = (source || '').toLowerCase();
  const meta =
    c.includes('airbnb')  ? { label: 'Airbnb',  bg: '#FF5A5F', initial: 'A' } :
    c.includes('booking') ? { label: 'Booking', bg: '#003580', initial: 'B' } :
    c.includes('vrbo')    ? { label: 'Vrbo',    bg: '#0e7490', initial: 'V' } :
    c.includes('expedia') ? { label: 'Expedia', bg: '#FFCB08', initial: 'E' } :
                            { label: 'Direct',  bg: T.primary, initial: 'S' };

  return (
    <Tooltip title={meta.label} arrow>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: meta.bg,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {meta.initial}
      </Box>
    </Tooltip>
  );
}

/**
 * Convertit un code pays ISO 3166-1 alpha-2 ou nom de pays en emoji drapeau
 * Ex: "FR" → 🇫🇷, "france" → 🇫🇷, "US" → 🇺🇸, "morocco" → 🇲🇦
 * (Copié depuis ReservationsPage.tsx pour cohérence)
 */
function flagFor(country?: string | null): string {
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
}

function formatTimeValue(timeInput: string | number | null | undefined): string {
  if (timeInput === undefined || timeInput === null || timeInput === '') return '';
  try {
    if (typeof timeInput === 'string') {
      if (timeInput.includes('T')) {
        const timeMatch = timeInput.match(/T(\d{2}):(\d{2})/);
        if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
      }
      if (/^\d{1,2}:\d{2}$/.test(timeInput)) {
        const [hours, minutes] = timeInput.split(':');
        return `${hours.padStart(2, '0')}:${minutes}`;
      }
    }
    if (typeof timeInput === 'number') {
      if (timeInput < 24 && timeInput % 1 !== 0) {
        const hours = Math.floor(timeInput);
        const minutes = Math.round((timeInput - hours) * 60);
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
      if (timeInput < 100) {
        return `${String(Math.floor(timeInput)).padStart(2, '0')}:00`;
      }
      const hours = Math.floor(timeInput / 100);
      const minutes = timeInput % 100;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
  } catch {
    return '';
  }
  return '';
}

function firstDescriptionLine(task: TaskListItem): string {
  const descriptions = task.descriptions || [];
  const first = descriptions[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'description' in first && first.description) {
    return String(first.description);
  }
  return task.type || 'Sans description';
}

function categoryLabel(task: TaskListItem): string {
  const groupingKeyMap: Record<string, string> = {
    TRANSPORT: '🚗 Transport',
    GROCERIES: '🛒 Courses',
    CUSTOM: '✨ Personnalisé',
    SUPPORT: '🆘 Support',
  };
  const k = task.conciergeGroupingKey;
  if (k && groupingKeyMap[k]) return groupingKeyMap[k];

  const categoryMap: Record<string, string> = {
    arrival: '🛬 Arrivée',
    departure: '🛫 Départ',
    cleaning: '🧹 Ménage',
    'Free Cleaning': '🧹 Ménage Gratuit',
    'Paid Cleaning': '🧹 Ménage Payant',
    registration: '📝 Enregistrement',
    Enregistrement: '📝 Enregistrement',
    Checkin: '🛬 Arrivée',
    Checkout: '🛫 Départ',
    Ménage: '🧹 Ménage',
    concierge: '🛎️ Conciergerie',
    support: '🆘 Support',
    maintenance: '🔧 Maintenance',
    Transport: '🚗 Transport',
    Grocery: '🛒 Épicerie',
    Cleaning: '🧹 Ménage',
    Concierge: '🛎️ Conciergerie',
    Support: '🆘 Support',
  };

  const n = task.name || '';
  const st = task.subType || '';
  const typ = task.type || '';
  return (
    categoryMap[n] ||
    categoryMap[st] ||
    categoryMap[typ] ||
    n ||
    st ||
    typ ||
    '—'
  );
}

function formatCreatedAtParts(value?: string | null): { date: string; time: string } | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return {
    date: d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function paymentChipMeta(status?: string): { bg: string; color: string } {
  const s = status || 'NOT_PAID';
  if (s === 'PAID') return { bg: 'rgba(10,143,94,0.14)', color: T.success };
  if (s === 'PENDING') return { bg: 'rgba(196,101,6,0.14)', color: T.warning };
  if (s === 'CANCELLED') return { bg: 'rgba(200,30,30,0.12)', color: T.error };
  if (s === 'NOT_REQUIRED') return { bg: 'rgba(20,17,10,0.06)', color: T.text3 };
  return { bg: 'rgba(20,17,10,0.06)', color: T.text2 };
}

function emergencyChipMeta(em: string | undefined): { bg: string; color: string } {
  if (em === 'Critical') return { bg: 'rgba(200,30,30,0.12)', color: T.error };
  if (em === 'Urgent') return { bg: 'rgba(196,101,6,0.14)', color: T.warning };
  return { bg: 'rgba(10,143,94,0.10)', color: T.success };
}

/** Aligné `TasksNew.jsx` — statuts par défaut de la liste admin. */
const DEFAULT_TASK_STATUSES: string[] = ['CREATED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_MULTI_OPTIONS: { id: string; label: string }[] = [
  { id: 'CREATED', label: 'Créé' },
  { id: 'ASSIGNED', label: 'Assigné' },
  { id: 'IN_PROGRESS', label: 'En cours' },
  { id: 'COMPLETED', label: 'Terminé' },
  { id: 'CANCELLED_ADMIN', label: 'Annulé' },
  { id: 'ARCHIVED', label: 'Archivé' },
];

const CATEGORY_MULTI_OPTIONS: { id: string; label: string }[] = [
  { id: 'arrival', label: '🛬 Arrivée' },
  { id: 'departure', label: '🛫 Départ' },
  { id: 'cleaning', label: '🧹 Ménage' },
  { id: 'registration', label: '📋 Enregistrement' },
  { id: 'transport', label: '🚗 Transport' },
  { id: 'grocery', label: '🛒 Courses' },
  { id: 'custom', label: '✨ Demande personnalisée' },
  { id: 'support', label: '🆘 Support' },
  { id: 'maintenance', label: '🔧 Maintenance' },
];

const SOURCE_MULTI_OPTIONS: { id: string; label: string }[] = [
  { id: 'MANUAL', label: 'Manuel' },
  { id: 'TIMESLOT', label: 'Timeslot' },
  { id: 'SUPPORT_REQUEST', label: 'Support' },
  { id: 'CONCIERGE_FLOW', label: 'Concierge' },
  { id: 'ORCHESTRATION', label: 'Orchestration' },
];

function detailsTimeslotSummary(task: TaskListItem): string {
  const ts = task.timeslot;
  if (ts && ts.start !== undefined && ts.end !== undefined) {
    return `Prév: ${formatTimeValue(ts.start)}-${formatTimeValue(ts.end)}`;
  }
  const src = String(task.source || '');
  const isNewType =
    src === 'CONCIERGE_FLOW' ||
    src === 'SUPPORT_REQUEST' ||
    src === 'ORCHESTRATION' ||
    ['Cleaning', 'Concierge', 'Support'].includes(task.name);
  if (isNewType && task.startDate) {
    const d = new Date(task.startDate);
    if (!Number.isNaN(d.getTime())) {
      const h = d.getHours();
      const m = d.getMinutes();
      return `🕐 ${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
    }
  }
  return '—';
}

export function TasksListPage() {
  console.log('🎯 [TasksListPage] VERSION OPTIMISÉE CHARGÉE');

  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 0,
    limit: 100,
    total: 0,
    totalPages: 0,
  });
  const [staff, setStaff] = useState<TasksStaffMember[]>([]);
  const [listings, setListings] = useState<TaskListingOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);
  const [actionsMenu, setActionsMenu] = useState<null | { anchor: HTMLElement; task: TaskListItem }>(
    null,
  );
  const closeActionsMenu = useCallback(() => setActionsMenu(null), []);
  const [addTaskOpen, setAddTaskOpen] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<'startDate' | 'createdAt' | 'itemType' | 'name' | 'source'>(
    'startDate',
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [listFilters, setListFilters] = useState({
    origin: 'all' as 'all' | 'task' | 'client',
    subTypes: [] as string[],
    statuses: [...DEFAULT_TASK_STATUSES],
    listingIds: [] as string[],
    staffCodes: [] as string[],
    paymentStatus: 'all',
    hasAssociation: 'all' as 'all' | 'with' | 'without',
    sources: [] as string[],
  });

  const [advancedFilters, setAdvancedFilters] = useState({
    dateType: '' as '' | 'startDate' | 'createdAt',
    startDate: null as string | null,
    endDate: null as string | null,
    emergency: 'all' as 'all' | TaskEmergency,
  });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [quickFilterKey, setQuickFilterKey] = useState<QuickFilterKey>('none');
  const [tempAdvanced, setTempAdvanced] = useState(advancedFilters);
  const [tempPayment, setTempPayment] = useState('all');
  const [tempHasAssociation, setTempHasAssociation] = useState<'all' | 'with' | 'without'>('all');
  const [tempSources, setTempSources] = useState<string[]>([]);

  // Column visibility toggles
  const [showCreatedAt, setShowCreatedAt] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showTimeslotClient, setShowTimeslotClient] = useState(false);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  const loadStaffAndListings = useCallback(async () => {
    if (!scope.canAccessAllOwners && !scope.ownerId) return;
    try {
      const [staffResult, listingResult] = await Promise.all([
        tasksService.getStaff({ ownerId: scope.ownerId, limit: 200 }),
        tasksService.getListings(),
      ]);
      setStaff(staffResult.staff);
      setListings(listingResult);
    } catch {
      /* staff / listings : chargement best-effort */
    }
  }, [scope.ownerId, scope.canAccessAllOwners]);

  useEffect(() => {
    void loadStaffAndListings();
  }, [loadStaffAndListings]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }

      const hasArchived = listFilters.statuses.includes('ARCHIVED');
      const realStatuses = listFilters.statuses.filter((s) => s !== 'ARCHIVED');
      let isArchived: boolean | 'all';
      if (hasArchived && realStatuses.length === 0) isArchived = true;
      else if (hasArchived && realStatuses.length > 0) isArchived = 'all';
      else isArchived = false;

      const today = moment();
      const fmt = (d: moment.Moment) => d.format('YYYY-MM-DD');
      let dateType = advancedFilters.dateType || undefined;
      let dateStart = advancedFilters.startDate || undefined;
      let dateEnd = advancedFilters.endDate || undefined;
      let emergency =
        advancedFilters.emergency === 'all' ? undefined : advancedFilters.emergency;

      if (quickFilterKey === 'dueToday') {
        dateType = 'startDate';
        dateStart = fmt(today);
        dateEnd = fmt(today);
      } else if (quickFilterKey === 'dueTomorrow') {
        const tm = today.clone().add(1, 'day');
        dateType = 'startDate';
        dateStart = fmt(tm);
        dateEnd = fmt(tm);
      } else if (quickFilterKey === 'due7d') {
        dateType = 'startDate';
        dateStart = fmt(today);
        dateEnd = fmt(today.clone().add(7, 'days'));
      } else if (quickFilterKey === 'urgent') {
        emergency = 'Urgent';
      }

      const tasksResult = await tasksService.getTasks({
        ownerId: scope.ownerId,
        page,
        limit: rowsPerPage,
        listingIds: listFilters.listingIds.length ? listFilters.listingIds : undefined,
        subTypes: listFilters.subTypes.length ? listFilters.subTypes : undefined,
        statuses: realStatuses.length ? realStatuses : undefined,
        sources: listFilters.sources.length ? listFilters.sources : undefined,
        staffCodes: listFilters.staffCodes.length ? listFilters.staffCodes : undefined,
        paymentStatus:
          listFilters.paymentStatus === 'all' ? undefined : listFilters.paymentStatus,
        hasAssociation:
          listFilters.hasAssociation === 'all' ? undefined : listFilters.hasAssociation,
        emergency,
        dateType,
        dateStart,
        dateEnd,
        searchTerm: activeSearchTerm.trim() || undefined,
        sortField,
        sortDirection,
        isArchived,
      });

      setTasks(tasksResult.tasks);
      setPagination(tasksResult.pagination);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erreur inconnue');
      setTasks([]);
      setPagination({ page: 0, limit: rowsPerPage, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [
    scope.canAccessAllOwners,
    scope.ownerId,
    page,
    rowsPerPage,
    activeSearchTerm,
    sortField,
    sortDirection,
    listFilters.subTypes,
    listFilters.statuses,
    listFilters.listingIds,
    listFilters.staffCodes,
    listFilters.paymentStatus,
    listFilters.hasAssociation,
    listFilters.sources,
    advancedFilters.dateType,
    advancedFilters.startDate,
    advancedFilters.endDate,
    advancedFilters.emergency,
    quickFilterKey,
  ]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const displayTasks = useMemo(() => {
    let list = tasks;
    if (listFilters.origin === 'task') {
      list = list.filter((task) => task.itemType === 'Task' && !task.isClientRequest);
    } else if (listFilters.origin === 'client') {
      list = list.filter((task) => task.itemType !== 'Task' || task.isClientRequest === true);
    }
    if (quickFilterKey === 'urgent') {
      list = list.filter((task) => {
        const em = String(task.emergency || '');
        return em === 'Urgent' || em === 'Critical';
      });
    }
    return list;
  }, [tasks, listFilters.origin, quickFilterKey]);

  const filterCounts = useMemo(() => {
    const today = moment();
    const tomorrow = moment().add(1, 'day');
    const next7 = moment().add(7, 'days');
    const terminal = new Set(['COMPLETED', 'CANCELLED_ADMIN', 'CANCELLED_CUSTOMER', 'ARCHIVED']);
    const isOpen = (task: TaskListItem) => !terminal.has(normalizeTaskStatus(task.taskStatus));

    return {
      dueToday: tasks.filter(
        (task) =>
          isOpen(task) &&
          task.startDate &&
          moment(task.startDate).isSame(today, 'day'),
      ).length,
      dueTomorrow: tasks.filter(
        (task) =>
          isOpen(task) &&
          task.startDate &&
          moment(task.startDate).isSame(tomorrow, 'day'),
      ).length,
      due7d: tasks.filter(
        (task) =>
          isOpen(task) &&
          task.startDate &&
          moment(task.startDate).isBetween(today, next7, 'day', '[]'),
      ).length,
      urgent: tasks.filter((task) => {
        if (!isOpen(task)) return false;
        const em = String(task.emergency || '');
        return em === 'Urgent' || em === 'Critical';
      }).length,
    };
  }, [tasks]);

  const kpis = useMemo(() => {
    const st = (task: TaskListItem) => normalizeTaskStatus(task.taskStatus);
    return {
      created: tasks.filter((task) => st(task) === 'CREATED').length,
      inProgress: tasks.filter((task) =>
        ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'].includes(st(task)),
      ).length,
      completed: tasks.filter((task) => st(task) === 'COMPLETED').length,
      total: pagination.total,
    };
  }, [tasks, pagination.total]);

  const toggleQuickFilter = (key: Exclude<QuickFilterKey, 'none'>) => {
    setQuickFilterKey((prev) => (prev === key ? 'none' : key));
    setPage(0);
  };

  const handleSubmitSearch = useCallback(() => {
    setActiveSearchTerm(searchInput);
    setPage(0);
  }, [searchInput]);

  const openAdvancedDialog = () => {
    setTempAdvanced(advancedFilters);
    setTempPayment(listFilters.paymentStatus);
    setTempHasAssociation(listFilters.hasAssociation);
    setTempSources(listFilters.sources);
    setAdvancedOpen(true);
  };

  const confirmAdvancedDialog = () => {
    setAdvancedFilters(tempAdvanced);
    setListFilters((prev) => ({
      ...prev,
      paymentStatus: tempPayment,
      hasAssociation: tempHasAssociation,
      sources: tempSources,
    }));
    setPage(0);
    setAdvancedOpen(false);
  };

  const resetAdvancedTemp = () => {
    setTempAdvanced({
      dateType: '',
      startDate: null,
      endDate: null,
      emergency: 'all',
    });
    setTempPayment('all');
    setTempHasAssociation('all');
    setTempSources([]);
  };

  const resetAllListFilters = () => {
    setSearchInput('');
    setActiveSearchTerm('');
    setQuickFilterKey('none');
    setListFilters({
      origin: 'all',
      subTypes: [],
      statuses: [...DEFAULT_TASK_STATUSES],
      listingIds: [],
      staffCodes: [],
      paymentStatus: 'all',
      hasAssociation: 'all',
      sources: [],
    });
    setAdvancedFilters({
      dateType: '',
      startDate: null,
      endDate: null,
      emergency: 'all',
    });
    setPage(0);
  };

  const handleDeleteTask = async (task: TaskListItem) => {
    const confirmed = window.confirm(`Supprimer ${task.itemNumber} ?`);
    if (!confirmed) return;

    try {
      setStatusUpdating(task._id);
      await tasksService.deleteTask(task.itemNumber);
      toast.success('Tâche supprimée');
      closeActionsMenu();
      await fetchTasks();
    } catch (deleteError) {
      toast.error(
        deleteError instanceof Error
          ? deleteError.message
          : 'Erreur lors de la suppression',
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  const handleStatusChange = async (task: TaskListItem, status: TaskStatus) => {
    try {
      setStatusUpdating(task._id);
      await tasksService.updateTaskStatus(task.itemNumber, status);
      toast.success(`Statut mis à jour: ${TASK_STATUS_LABELS[status]}`);
      closeActionsMenu();
      await fetchTasks();
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : 'Erreur lors du changement de statut',
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  type TaskRow = TaskListItem & { id: string };

  const columns = [
    {
      key: 'name',
      label: 'Tâche',
      width: COLUMN_WIDTHS.name,
      render: (row: TaskRow) => (
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 12,
            fontWeight: 700,
            color: T.primaryDeep,
          }}
        >
          {row.itemNumber || '—'}
        </Typography>
      ),
    },
    {
      key: 'category',
      label: 'Catégorie',
      width: COLUMN_WIDTHS.category,
      render: (row: TaskRow) => {
        const label = categoryLabel(row);
        return (
          <Tooltip title={label} arrow placement="top">
            <Typography
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: 12,
                fontWeight: 700,
                color: T.text,
                whiteSpace: 'nowrap',
                lineHeight: 1.25,
                maxWidth: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {label}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Créé le',
      width: COLUMN_WIDTHS.createdAt,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const parts = formatCreatedAtParts(row.createdAt);
        if (!parts) {
          return (
            <Typography sx={{ fontSize: 12, color: T.text3, textAlign: 'center' }}>—</Typography>
          );
        }
        return (
          <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 12, color: T.text2 }}>{parts.date}</Typography>
            <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 600 }}>{parts.time}</Typography>
          </Stack>
        );
      },
    },
    {
      key: 'executionDate',
      label: 'Date Prévue',
      width: COLUMN_WIDTHS.executionDate,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Stack spacing={0.35} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            {row.startDate
              ? new Date(row.startDate).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: 'short',
                  year: '2-digit',
                })
              : '—'}
          </Typography>
          {row.execution_hours?.start !== undefined &&
            row.execution_hours?.end !== undefined && (
              <Typography sx={{ fontSize: 11, color: T.text3 }}>
                {formatTimeValue(row.execution_hours.start)}–
                {formatTimeValue(row.execution_hours.end)}
              </Typography>
            )}
        </Stack>
      ),
    },
    {
      key: 'timeslotClient',
      label: 'Timeslot Client',
      width: COLUMN_WIDTHS.timeslotClient,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const sel = row.timeslot_selected;
        if (!sel || sel.start == null || sel.end == null) {
          return (
            <Typography sx={{ textAlign: 'center', color: T.text3, fontSize: 12 }}>En attente</Typography>
          );
        }
        return (
          <Typography sx={{ textAlign: 'center', fontWeight: 600, fontSize: 12 }}>
            {sel.start}h-{sel.end}h
          </Typography>
        );
      },
    },
    {
      key: 'heureTask',
      label: 'Heure Tâche',
      width: COLUMN_WIDTHS.heureTask,
      align: 'center' as const,
      render: (row: TaskRow) => {
        if (!row.startDate || !row.endDate) {
          return (
            <Typography sx={{ fontSize: 11, color: T.text3, textAlign: 'center' }}>—</Typography>
          );
        }
        const startDate = new Date(row.startDate);
        const endDate = new Date(row.endDate);
        const startHour = startDate.getUTCHours();
        const endHour = endDate.getUTCHours();
        const hourSource = row.hourSource || 'default';
        const icon = hourSource === 'client' ? '✅' : hourSource === 'admin' ? '👤' : '📅';
        const label = hourSource === 'client' ? 'Client' : hourSource === 'admin' ? 'Admin' : 'Défaut';
        const color = hourSource === 'client' ? '#4CAF50' : hourSource === 'admin' ? '#FF9800' : '#2196F3';
        return (
          <Tooltip title={`Heure définie par: ${label}`}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{
                justifyContent: 'center',
                alignItems: 'center',
                fontWeight: 600,
                color,
                fontSize: 12,
              }}
            >
              <span>
                {startHour}h-{endHour}h
              </span>
              <span>{icon}</span>
            </Stack>
          </Tooltip>
        );
      },
    },
    {
      key: 'timeslotDetails',
      label: 'Détails',
      width: COLUMN_WIDTHS.timeslot,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Typography sx={{ fontSize: 11, color: T.text2, textAlign: 'center' }}>
          {detailsTimeslotSummary(row)}
        </Typography>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      width: COLUMN_WIDTHS.source,
      align: 'center' as const,
      render: (row: TaskRow) => <OTABadge source={row.source} />,
    },
    {
      key: 'voyageur',
      label: 'Voyageur',
      width: COLUMN_WIDTHS.voyageur,
      align: 'left' as const,
      render: (row: TaskRow) => {
        if (!row.guestName) {
          return (
            <Typography sx={{ fontSize: 11, color: T.text4, textAlign: 'center' }}>—</Typography>
          );
        }
        return (
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <span style={{ fontSize: 18 }}>{flagFor(row.guestCountry)}</span>
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 500,
                color: T.text2,
                maxWidth: 120,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {row.guestName}
            </Typography>
          </Stack>
        );
      },
    },
    {
      key: 'listingName',
      label: 'Listing',
      width: COLUMN_WIDTHS.listing,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Typography sx={{ fontSize: 12 }} noWrap title={row.listingName || ''}>
          {row.listingName || '—'}
        </Typography>
      ),
    },
    {
      key: 'reservation',
      label: 'Réservation',
      width: COLUMN_WIDTHS.reservation,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Typography
          sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 700, color: T.primaryDeep }}
          noWrap
        >
          {row.reservationNumber || '—'}
        </Typography>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      width: COLUMN_WIDTHS.details,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Tooltip title={firstDescriptionLine(row)}>
          <Typography sx={{ fontSize: 12, maxWidth: 150 }} noWrap>
            {firstDescriptionLine(row)}
          </Typography>
        </Tooltip>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      width: COLUMN_WIDTHS.status,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const status = normalizeTaskStatus(row.taskStatus);
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Badge variant={TASK_STATUS_VARIANTS[status]}>{TASK_STATUS_LABELS[status]}</Badge>
            {status === 'CREATED' && row.isClientConfirmed === false && (
              <Typography component="span" sx={{ fontSize: 14 }} title="En attente de sélection client">
                ⏳
              </Typography>
            )}
            <IconButton
              size="small"
              disabled={statusUpdating === row._id}
              aria-label="Actions tâche"
              onClick={(event) => {
                event.stopPropagation();
                setActionsMenu({ anchor: event.currentTarget, task: row });
              }}
            >
              <MoreHorizIcon fontSize="small" />
            </IconButton>
          </Stack>
        );
      },
    },
    {
      key: 'staffName',
      label: 'Staff',
      width: COLUMN_WIDTHS.assignedStaff,
      render: (row: TaskRow) => (
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.primaryDeep }}>
            {row.staffName || row.staffCode || '—'}
          </Typography>
          {row.staffPhone ? (
            <Typography sx={{ fontSize: 10, color: T.text3 }}>{row.staffPhone}</Typography>
          ) : null}
        </Stack>
      ),
    },
    {
      key: 'payment',
      label: 'Paiement',
      width: COLUMN_WIDTHS.payment,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const ps = row.paymentStatus || 'NOT_PAID';
        const meta = paymentChipMeta(ps);
        return (
          <Chip
            label={ps.replace(/_/g, ' ')}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.color}33`,
            }}
          />
        );
      },
    },
    {
      key: 'price',
      label: 'Prix',
      width: COLUMN_WIDTHS.price,
      align: 'center' as const,
      render: (row: TaskRow) =>
        row.price != null && row.price > 0 ? (
          <Typography
            sx={{
              fontSize: 13,
              fontWeight: 700,
              color: row.paid ? T.success : T.warning,
            }}
          >
            {row.price} MAD
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 12, color: T.text3 }}>—</Typography>
        ),
    },
    {
      key: 'urgence',
      label: 'Urgence',
      width: COLUMN_WIDTHS.urgence,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const em = String(row.emergency || 'Normal');
        const meta = emergencyChipMeta(em);
        return (
          <Chip
            label={em}
            size="small"
            sx={{
              height: 22,
              fontSize: 11,
              fontWeight: 600,
              bgcolor: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.color}33`,
            }}
          />
        );
      },
    },
  ];

  // Filter columns based on visibility toggles
  const visibleColumns = columns.filter((col) => {
    if (col.key === 'createdAt' && !showCreatedAt) return false;
    if (col.key === 'timeslotDetails' && !showDetails) return false;
    if (col.key === 'timeslotClient' && !showTimeslotClient) return false;
    return true;
  });

  console.log('🔧 [TasksListPage] Colonnes:', {
    total: columns.length,
    visible: visibleColumns.length,
    hidden: columns.length - visibleColumns.length,
    toggles: { showCreatedAt, showDetails, showTimeslotClient }
  });

  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Liste']}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Rechercher réservation, propriété, n° tâche…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmitSearch();
              }}
              sx={{ flex: 1, minWidth: 240, ...fieldSx }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <FormControl size="small" sx={{ minWidth: 130, ...fieldSx }}>
              <InputLabel>Origine</InputLabel>
              <Select
                label="Origine"
                value={listFilters.origin}
                onChange={(e) => {
                  setListFilters((p) => ({
                    ...p,
                    origin: e.target.value as typeof listFilters.origin,
                  }));
                  setPage(0);
                }}
              >
                <MenuItem value="all">Toutes</MenuItem>
                <MenuItem value="task">Internes</MenuItem>
                <MenuItem value="client">Client</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140, ...fieldSx }}>
              <InputLabel>Trier</InputLabel>
              <Select
                label="Trier"
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as typeof sortField);
                  setPage(0);
                }}
              >
                <MenuItem value="startDate">Date exécution</MenuItem>
                <MenuItem value="createdAt">Création</MenuItem>
                <MenuItem value="name">Nom</MenuItem>
                <MenuItem value="itemType">Type</MenuItem>
                <MenuItem value="source">Source</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 108, ...fieldSx }}>
              <InputLabel>Ordre</InputLabel>
              <Select
                label="Ordre"
                value={sortDirection}
                onChange={(e) => {
                  setSortDirection(e.target.value as 'asc' | 'desc');
                  setPage(0);
                }}
              >
                <MenuItem value="asc">↑</MenuItem>
                <MenuItem value="desc">↓</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Filtres avancés (dates, urgence, paiement, sources…)">
              <IconButton
                size="small"
                onClick={openAdvancedDialog}
                sx={{
                  border: `1px solid ${T.border}`,
                  borderRadius: 1,
                  bgcolor:
                    advancedFilters.dateType ||
                    advancedFilters.emergency !== 'all' ||
                    listFilters.paymentStatus !== 'all' ||
                    listFilters.hasAssociation !== 'all' ||
                    listFilters.sources.length > 0
                      ? T.primaryTint
                      : T.bg1,
                }}
              >
                <FilterListIcon sx={{ fontSize: 18, color: T.primaryDeep }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Réinitialiser tous les filtres">
              <IconButton size="small" onClick={resetAllListFilters} sx={{ border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
                <ClearAllIcon sx={{ fontSize: 18, color: T.text3 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Recharger les données">
              <IconButton size="small" onClick={() => void fetchTasks()} sx={{ border: `1px solid ${T.border}`, bgcolor: T.bg1 }}>
                <RefreshIcon sx={{ fontSize: 18, color: T.primaryDeep }} />
              </IconButton>
            </Tooltip>
            <Button
              size="small"
              sx={{
                minHeight: 32,
                py: 0.5,
                px: 1.5,
                flexShrink: 0,
                borderRadius: 1,
                border: `1px solid ${T.border}`,
                bgcolor: (showCreatedAt || showDetails || showTimeslotClient) ? T.primaryTint : T.bg1,
                color: (showCreatedAt || showDetails || showTimeslotClient) ? T.primary : T.text3,
                fontWeight: 600,
                fontSize: 12,
                textTransform: 'none',
                '&:hover': {
                  bgcolor: T.primaryTint,
                  color: T.primary,
                  borderColor: T.primary,
                },
              }}
              onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
            >
              ⚙️ Colonnes
              {(showCreatedAt || showDetails || showTimeslotClient) && (
                <Chip
                  label={(showCreatedAt ? 1 : 0) + (showDetails ? 1 : 0) + (showTimeslotClient ? 1 : 0)}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: 10,
                    bgcolor: T.primary,
                    color: '#fff',
                    ml: 0.5,
                  }}
                />
              )}
            </Button>
            <Button
              size="small"
              sx={{ ...btnPrimarySx, minHeight: 32, py: 0.5, flexShrink: 0 }}
              onClick={() => setAddTaskOpen(true)}
            >
              + Nouvelle tâche
            </Button>
          </Stack>

          <Stack direction="row" sx={{ mt: 1.25, flexWrap: 'wrap', gap: 1, alignItems: 'stretch' }}>
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 180, flex: '1 1 160px', ...fieldSx }}
              options={listings}
              getOptionLabel={(o) => o.name}
              value={listings.filter((l) => listFilters.listingIds.includes(l._id))}
              onChange={(_, v) => {
                setListFilters((p) => ({ ...p, listingIds: v.map((x) => x._id) }));
                setPage(0);
              }}
              renderInput={(params) => <TextField {...params} label="Propriété(s)" placeholder="Toutes" />}
              isOptionEqualToValue={(a, b) => a._id === b._id}
            />
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 200, flex: '1 1 180px', ...fieldSx }}
              options={CATEGORY_MULTI_OPTIONS}
              getOptionLabel={(o) => o.label}
              disableCloseOnSelect
              value={CATEGORY_MULTI_OPTIONS.filter((c) => listFilters.subTypes.includes(c.id))}
              onChange={(_, v) => {
                setListFilters((p) => ({ ...p, subTypes: v.map((x) => x.id) }));
                setPage(0);
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} size="small" />
                  {option.label}
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Catégorie(s)" placeholder="Toutes" />}
            />
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 180, flex: '1 1 160px', ...fieldSx }}
              options={STATUS_MULTI_OPTIONS}
              getOptionLabel={(o) => o.label}
              disableCloseOnSelect
              value={STATUS_MULTI_OPTIONS.filter((s) => listFilters.statuses.includes(s.id))}
              onChange={(_, v) => {
                setListFilters((p) => ({
                  ...p,
                  statuses: v.length ? v.map((x) => x.id) : [],
                }));
                setPage(0);
              }}
              renderOption={(props, option, { selected }) => (
                <li {...props}>
                  <Checkbox checked={selected} sx={{ mr: 1 }} size="small" />
                  {option.label}
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Statut(s)" placeholder="Tous" />}
            />
            <Autocomplete
              multiple
              size="small"
              sx={{ minWidth: 180, flex: '1 1 160px', ...fieldSx }}
              options={staff}
              getOptionLabel={(o) => o.username}
              value={staff.filter((s) => listFilters.staffCodes.includes(s.staffCode))}
              onChange={(_, v) => {
                setListFilters((p) => ({
                  ...p,
                  staffCodes: v.map((x) => x.staffCode),
                }));
                setPage(0);
              }}
              isOptionEqualToValue={(a, b) => a.staffCode === b.staffCode}
              renderInput={(params) => <TextField {...params} label="Staff" placeholder="Tous" />}
            />
          </Stack>

          <Stack
            direction="row"
            sx={{
              mt: 1.5,
              gap: 0.75,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <Pill
                label="Éch. auj."
                count={filterCounts.dueToday}
                active={quickFilterKey === 'dueToday'}
                onClick={() => toggleQuickFilter('dueToday')}
                color={T.info}
              />
              <Pill
                label="Demain"
                count={filterCounts.dueTomorrow}
                active={quickFilterKey === 'dueTomorrow'}
                onClick={() => toggleQuickFilter('dueTomorrow')}
                color={T.warning}
              />
              <Pill
                label="7 jours"
                count={filterCounts.due7d}
                active={quickFilterKey === 'due7d'}
                onClick={() => toggleQuickFilter('due7d')}
                color={T.primary}
              />
              <Pill
                label="Urgent+"
                count={filterCounts.urgent}
                active={quickFilterKey === 'urgent'}
                onClick={() => toggleQuickFilter('urgent')}
                color={T.error}
              />
            </Stack>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <KpiCompact
                label="À traiter"
                value={kpis.created}
                accent={T.info}
                onClick={() => {
                  setListFilters((p) => ({ ...p, statuses: ['CREATED'] }));
                  setQuickFilterKey('none');
                  setPage(0);
                }}
              />
              <KpiCompact
                label="En cours"
                value={kpis.inProgress}
                accent={T.warning}
                onClick={() => {
                  setListFilters((p) => ({
                    ...p,
                    statuses: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'],
                  }));
                  setQuickFilterKey('none');
                  setPage(0);
                }}
              />
              <KpiCompact
                label="Terminées"
                value={kpis.completed}
                accent={T.success}
                onClick={() => {
                  setListFilters((p) => ({ ...p, statuses: ['COMPLETED'] }));
                  setQuickFilterKey('none');
                  setPage(0);
                }}
              />
              <KpiCompact label="Total" value={kpis.total} accent={T.primaryDeep} />
            </Stack>
          </Stack>
        </Paper>

        {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress size={48} sx={{ color: T.primary }} />
          </Box>
        ) : displayTasks.length === 0 ? (
          <Paper sx={{ textAlign: 'center', py: 8, mt: 2, border: `1px solid ${T.border}`, bgcolor: T.bg1, borderRadius: 1.5 }}>
            <InboxIcon sx={{ fontSize: 64, color: T.text4, mb: 2 }} />
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: T.text2 }}>Aucune tâche trouvée</Typography>
            <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.5 }}>
              Essayez de modifier vos filtres ou réinitialisez-les.
            </Typography>
            <Button
              onClick={resetAllListFilters}
              variant="text"
              sx={{ mt: 2, textTransform: 'none', color: T.primaryDeep }}
            >
              ↻ Réinitialiser
            </Button>
          </Paper>
        ) : (
          <Stack spacing={1.5} sx={{ mt: 0.5 }}>
            <DataTable
              columns={visibleColumns}
              rows={displayTasks.map((task) => ({ ...task, id: task._id }))}
              hideRowActions
              tableMinWidth={TASK_TABLE_MIN_WIDTH}
              headerTextTransform="none"
            />
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
              <Typography sx={{ fontSize: 12.5, color: T.text3 }}>
                {pagination.total > 0
                  ? `${page * rowsPerPage + 1}–${Math.min((page + 1) * rowsPerPage, pagination.total)} sur ${pagination.total}`
                  : '0 tâche'}
              </Typography>
              <TablePagination
                component="div"
                count={pagination.total}
                page={page}
                onPageChange={(_, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(0);
                }}
                rowsPerPageOptions={[50, 100, 200, 500]}
                labelRowsPerPage="Par page"
                labelDisplayedRows={() => ''}
                sx={{
                  border: 'none',
                  '& .MuiTablePagination-toolbar': { minHeight: 36, px: 0 },
                  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                    fontSize: 12.5,
                    color: T.text3,
                  },
                }}
              />
            </Stack>
          </Stack>
        )}

          <Dialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Filtres avancés</DialogTitle>
            <DialogContent>
              <Stack spacing={2} sx={{ pt: 1 }}>
                <TextField
                  select
                  label="Type de date"
                  value={tempAdvanced.dateType}
                  onChange={(e) =>
                    setTempAdvanced((a) => ({
                      ...a,
                      dateType: e.target.value as typeof tempAdvanced.dateType,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="">Aucun</MenuItem>
                  <MenuItem value="startDate">Date d&apos;exécution</MenuItem>
                  <MenuItem value="createdAt">Date de création</MenuItem>
                </TextField>
                {tempAdvanced.dateType ? (
                  <>
                    <TextField
                      type="date"
                      label="Date début"
                      value={tempAdvanced.startDate || ''}
                      onChange={(e) =>
                        setTempAdvanced((a) => ({ ...a, startDate: e.target.value || null }))
                      }
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <TextField
                      type="date"
                      label="Date fin"
                      value={tempAdvanced.endDate || ''}
                      onChange={(e) =>
                        setTempAdvanced((a) => ({ ...a, endDate: e.target.value || null }))
                      }
                      fullWidth
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                  </>
                ) : null}
                <TextField
                  select
                  label="Urgence"
                  value={tempAdvanced.emergency}
                  onChange={(e) =>
                    setTempAdvanced((a) => ({
                      ...a,
                      emergency: e.target.value as 'all' | TaskEmergency,
                    }))
                  }
                  fullWidth
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="Normal">Normal</MenuItem>
                  <MenuItem value="Urgent">Urgent</MenuItem>
                  <MenuItem value="Critical">Critique</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Statut de paiement"
                  value={tempPayment}
                  onChange={(e) => setTempPayment(e.target.value)}
                  fullWidth
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="NOT_REQUIRED">Non requis</MenuItem>
                  <MenuItem value="PENDING">En attente</MenuItem>
                  <MenuItem value="PAID">Payé</MenuItem>
                  <MenuItem value="CANCELLED">Annulé</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Association"
                  value={tempHasAssociation}
                  onChange={(e) =>
                    setTempHasAssociation(e.target.value as 'all' | 'with' | 'without')
                  }
                  fullWidth
                >
                  <MenuItem value="all">Toutes</MenuItem>
                  <MenuItem value="with">Avec association</MenuItem>
                  <MenuItem value="without">Sans association</MenuItem>
                </TextField>
                <Autocomplete
                  multiple
                  options={SOURCE_MULTI_OPTIONS}
                  getOptionLabel={(o) => o.label}
                  value={SOURCE_MULTI_OPTIONS.filter((s) => tempSources.includes(s.id))}
                  onChange={(_, v) => setTempSources(v.map((x) => x.id))}
                  renderInput={(params) => (
                    <TextField {...params} label="Sources" placeholder="Toutes" />
                  )}
                  disableCloseOnSelect
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox checked={selected} sx={{ mr: 1 }} size="small" />
                      {option.label}
                    </li>
                  )}
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setAdvancedOpen(false)}>Fermer</Button>
              <Button onClick={resetAdvancedTemp}>Réinitialiser</Button>
              <Button sx={btnPrimarySx} onClick={confirmAdvancedDialog}>
                Confirmer
              </Button>
            </DialogActions>
          </Dialog>

      </Box>

      <AddTaskModal
        open={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        ownerId={scope.ownerId}
        isAdminUser={scope.canAccessAllOwners}
        onSuccess={() => {
          toast.success('Tâche créée');
          void fetchTasks();
        }}
      />

      <Menu
        anchorEl={actionsMenu?.anchor ?? null}
        open={Boolean(actionsMenu)}
        onClose={closeActionsMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {actionsMenu &&
          Object.entries(TASK_STATUS_LABELS).map(([value, label]) => (
            <MenuItem
              key={value}
              disabled={statusUpdating === actionsMenu.task._id}
              onClick={() => void handleStatusChange(actionsMenu.task, value as TaskStatus)}
            >
              {label}
            </MenuItem>
          ))}
        {actionsMenu && getNextTaskStatus(actionsMenu.task.taskStatus) ? (
          <MenuItem
            disabled={statusUpdating === actionsMenu.task._id}
            onClick={() =>
              void handleStatusChange(
                actionsMenu.task,
                getNextTaskStatus(actionsMenu.task.taskStatus)!,
              )
            }
          >
            Étape suivante
          </MenuItem>
        ) : null}
        {actionsMenu ? <Divider /> : null}
        {actionsMenu ? (
          <MenuItem
            disabled={statusUpdating === actionsMenu.task._id}
            onClick={() => void handleDeleteTask(actionsMenu.task)}
            sx={{ color: 'error.main' }}
          >
            Supprimer
          </MenuItem>
        ) : null}
      </Menu>

      {/* Column Visibility Menu */}
      <Menu
        anchorEl={columnMenuAnchor}
        open={Boolean(columnMenuAnchor)}
        onClose={() => setColumnMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          sx: {
            mt: 0.5,
            border: `1px solid ${T.border}`,
            boxShadow: '0 4px 12px rgba(20,17,10,0.08)',
            minWidth: 220,
          }
        }}
      >
        <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
            Colonnes optionnelles
          </Typography>
        </Box>
        <MenuItem
          onClick={() => setShowCreatedAt(!showCreatedAt)}
          sx={{ fontSize: 13, py: 1.25 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              border: `2px solid ${showCreatedAt ? T.primary : T.border}`,
              bgcolor: showCreatedAt ? T.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>
              {showCreatedAt && '✓'}
            </Box>
            <Typography sx={{ fontSize: 13, color: T.text2 }}>
              Créé le
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => setShowDetails(!showDetails)}
          sx={{ fontSize: 13, py: 1.25 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              border: `2px solid ${showDetails ? T.primary : T.border}`,
              bgcolor: showDetails ? T.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>
              {showDetails && '✓'}
            </Box>
            <Typography sx={{ fontSize: 13, color: T.text2 }}>
              Détails
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem
          onClick={() => setShowTimeslotClient(!showTimeslotClient)}
          sx={{ fontSize: 13, py: 1.25 }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              border: `2px solid ${showTimeslotClient ? T.primary : T.border}`,
              bgcolor: showTimeslotClient ? T.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>
              {showTimeslotClient && '✓'}
            </Box>
            <Typography sx={{ fontSize: 13, color: T.text2 }}>
              Timeslot Client
            </Typography>
          </Box>
        </MenuItem>
        <Box sx={{ px: 2, py: 1.5, borderTop: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 11, color: T.text3, fontStyle: 'italic' }}>
            💡 {visibleColumns.length} colonnes visibles sur {columns.length}
          </Typography>
        </Box>
      </Menu>
    </DashboardWrapper>
  );
}
