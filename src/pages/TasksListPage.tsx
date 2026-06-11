// ════════════════════════════════════════════════════════════════════
// Sojori — Tasks List · design « Atelier 2026 » (aligné ReservationsPage)
// Route: /tasks — toolbar, pills échéances, KPI compacts, tableau premium.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useMemo, useState, lazy, Suspense, memo, type ReactNode } from 'react';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import FilterListIcon from '@mui/icons-material/FilterList';
import InboxIcon from '@mui/icons-material/Inbox';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
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
  ListItemText,
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
// ⚡ PERFORMANCE: Lazy load des modals/drawers lourds (chargés uniquement quand ouverts)
const AddTaskModal = lazy(() => import('../components/tasks/AddTaskModal').then(m => ({ default: m.AddTaskModal })));
const AssignStaffDialog = lazy(() => import('../features/tasksNew/components/AssignStaffDialog.jsx'));
const TaskDetailDrawer = lazy(() => import('../features/tasksNew/components/TaskDetailDrawer'));
import { TaskPlannedCell } from '../components/tasks/TaskPlannedCell';
import type { RegistrationFieldPatch } from '../components/reservations/ReservationRegistrationActions';
import type { StayFieldPatch } from '../components/reservations/ReservationStayActions';
import { ModalPortal } from '../components/ModalPortal';
import { createFulltaskFromFormData } from '../services/createFulltaskFromModal';
import { useAuth } from '../hooks/useAuth';
import tasksService, { resolveTasksUserScope } from '../services/fulltaskTasksService';
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
import {
  FULLTASK_TASK_TYPES,
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from '../features/taskHub/staff-design/fulltaskTaskTypes';

/** Colonnes compactes — liste fulltask (optionnelles via menu colonnes) */
const COLUMN_WIDTHS = {
  itemNumber: '84px',
  category: '128px',
  reservation: '92px',
  listing: '112px',
  voyageur: '116px',
  executionDate: '96px',
  urgence: '58px',
  source: '56px',
  status: '96px',
  assignedStaff: '96px',
  description: '120px',
  createdAt: '92px',
} as const;

const toolbarSelectSx = { minWidth: 0, '& .MuiSelect-select': { py: 0.875 } } as const;

const SORT_FIELD_LABELS: Record<string, string> = {
  createdAt: 'Date création',
  startDate: 'Date prévue',
  reservationNumber: 'Réservation',
};

export type TaskListSortField = 'createdAt' | 'startDate' | 'reservationNumber';

function urgencyShortLabel(em: string): string {
  if (em === 'Critical') return 'Crit.';
  if (em === 'Urgent') return 'Urg.';
  return 'Norm.';
}

function StaffAssignCell({
  task,
  onAssign,
}: {
  task: TaskListItem;
  onAssign: (task: TaskListItem) => void;
}) {
  const hasStaff = Boolean(task.staffName || task.staffCode);
  const displayName = task.staffName || task.staffCode || '';

  const assignBtnSx = {
    textTransform: 'none' as const,
    fontSize: 11,
    px: 1.25,
    py: 0,
    minHeight: 22,
    minWidth: 0,
    lineHeight: '20px',
    borderColor: T.primary,
    color: T.primaryDeep,
    '&:hover': {
      borderColor: T.primaryDeep,
      bgcolor: T.primaryTint,
    },
  };

  if (!hasStaff) {
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={(e) => {
          e.stopPropagation();
          onAssign(task);
        }}
        sx={assignBtnSx}
      >
        Assigner
      </Button>
    );
  }

  return (
    <Stack spacing={0.25} sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: 600,
          color: T.primaryDeep,
          lineHeight: 1.15,
          cursor: 'pointer',
        }}
        noWrap
        title={displayName}
        onClick={(e) => {
          e.stopPropagation();
          onAssign(task);
        }}
      >
        {displayName}
      </Typography>
      {task.staffPhone ? (
        <Typography
          sx={{ fontSize: 10, color: T.text3, lineHeight: 1.1 }}
          noWrap
          title={task.staffPhone}
        >
          {task.staffPhone}
        </Typography>
      ) : null}
      <Button
        size="small"
        variant="text"
        onClick={(e) => {
          e.stopPropagation();
          onAssign(task);
        }}
        sx={{
          ...assignBtnSx,
          border: 'none',
          p: 0,
          minHeight: 18,
          fontSize: 10,
          fontWeight: 600,
          justifyContent: 'flex-start',
          color: T.primary,
        }}
      >
        Changer
      </Button>
    </Stack>
  );
}

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

/** Badge OTA circulaire — aligné sur ReservationsPage (channel = Airbnb, Booking…) */
function OTABadge({ channel }: { channel?: string | null }) {
  const c = (channel || '').toLowerCase();
  const meta =
    c.includes('airbnb')  ? { label: 'Airbnb',  bg: '#FF5A5F', initial: 'A' } :
    c.includes('booking') ? { label: 'Booking', bg: '#003580', initial: 'B' } :
    c.includes('vrbo')    ? { label: 'Vrbo',    bg: '#0E6CB0', initial: 'V' } :
    c.includes('expedia') ? { label: 'Expedia', bg: '#FECC00', initial: 'E' } :
                            { label: 'Direct',  bg: T.primary, initial: 'S' };

  return (
    <Tooltip title={meta.label} arrow>
      <Box
        sx={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          bgcolor: meta.bg,
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          fontFamily: '"Geist Mono", monospace',
          boxShadow: '0 1px 2px rgba(20,17,10,0.1)',
        }}
      >
        {meta.initial}
      </Box>
    </Tooltip>
  );
}

function otaChannelForRow(row: { channelName?: string | null; source?: string | null }): string {
  if (row.channelName) return row.channelName;
  const s = String(row.source || '').toLowerCase();
  if (['timeslot', 'manual', 'orchestration', 'concierge_flow', 'support_request'].includes(s)) {
    return 'direct';
  }
  if (s.includes('airbnb')) return 'airbnb';
  if (s.includes('booking')) return 'booking';
  if (s.includes('vrbo')) return 'vrbo';
  return row.source || 'direct';
}

/**
 * Convertit un code pays ISO 3166-1 alpha-2 ou nom de pays en emoji drapeau
 * Ex: "FR" → 🇫🇷, "france" → 🇫🇷, "US" → 🇺🇸, "morocco" → 🇲🇦
 * (Copié depuis ReservationsPage.tsx pour cohérence)
 */
function flagFor(country?: string | null): string {
  if (!country) return '🌐';

  const raw = country.trim();
  // Déjà un drapeau en tête (ex. "🇲🇦 Maroc" venant de certaines APIs)
  const leadingFlag = raw.match(/^(\p{Regional_Indicator}{2})/u);
  if (leadingFlag) return leadingFlag[1];

  const nameOnly = raw.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '').trim() || raw;

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
  let code =
    nameOnly.length === 2
      ? nameOnly.toUpperCase()
      : countryNameToCode[nameOnly.toLowerCase()] || countryNameToCode[raw.toLowerCase()];

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
  if (task.conciergeDetailLine?.trim()) return task.conciergeDetailLine.trim();
  if (task.comment?.trim()) return task.comment.trim();
  const descriptions = task.descriptions || [];
  const first = descriptions[0];
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object' && 'description' in first && first.description) {
    return String(first.description);
  }
  return '';
}

function hourSourceColor(source?: string | null): string {
  const s = String(source || 'default').toLowerCase();
  if (s === 'client' || s === 'guest' || s === 'whatsapp') return T.success;
  if (s === 'admin') return '#ca8a04';
  return T.text3;
}

function hourSourceLabel(source?: string | null): string {
  const s = String(source || 'default').toLowerCase();
  if (s === 'client' || s === 'guest' || s === 'whatsapp') return 'Client (WhatsApp)';
  if (s === 'admin') return 'Admin';
  return 'Par défaut (listing)';
}

function renderPlannedHourLine(task: TaskListItem): ReactNode {
  const typ = String(task.type || '').toLowerCase();
  const showsHour =
    typ === 'arrival_choose' ||
    typ === 'departure_choose' ||
    typ === 'arrival_declare' ||
    typ === 'departure_declare' ||
    typ === 'cleaning_free' ||
    typ === 'cleaning_paid';
  if (!showsHour) return null;
  const time = task.plannedTime;
  if (!time) return null;
  const src = task.hourSource || 'default';
  const color = hourSourceColor(src);
  return (
    <Tooltip title={hourSourceLabel(src)} arrow placement="top">
      <Typography sx={{ fontSize: 10, fontWeight: 700, color, lineHeight: 1.2 }}>
        {time}
      </Typography>
    </Tooltip>
  );
}

function formatPlannedParts(task: TaskListItem): { date: string; time?: string } | null {
  const dayOnlyTypes = new Set([
    'registration',
    'arrival_choose',
    'arrival_declare',
    'departure_choose',
    'departure_declare',
    'cleaning_free',
    'cleaning_paid',
  ]);
  const taskType = String(task.type || task.subType || '');

  let startIso = task.startDate;
  if (!startIso && dayOnlyTypes.has(taskType)) {
    if (
      taskType === 'departure_choose' ||
      taskType === 'departure_declare'
    ) {
      startIso = task.reservationCheckOut
        ? `${String(task.reservationCheckOut).slice(0, 10)}T00:00:00.000Z`
        : undefined;
    } else if (task.reservationCheckIn) {
      startIso = `${String(task.reservationCheckIn).slice(0, 10)}T00:00:00.000Z`;
    }
  }
  if (!startIso) return null;

  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return null;
  const date = start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

  if (dayOnlyTypes.has(taskType)) {
    if (
      (taskType === 'arrival_choose' ||
        taskType === 'departure_choose' ||
        taskType === 'arrival_declare' ||
        taskType === 'departure_declare') &&
      task.plannedTime
    ) {
      return { date };
    }
    return { date };
  }

  const tStart = start.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  if (task.endDate) {
    const end = new Date(task.endDate);
    if (!Number.isNaN(end.getTime()) && end.getTime() !== start.getTime()) {
      const tEnd = end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return { date, time: `${tStart} → ${tEnd}` };
    }
  }
  return { date, time: tStart };
}

function sourceChipMeta(source?: string | null): { label: string; bg: string; color: string } {
  const s = String(source || '').toLowerCase();
  if (s === 'orchestrator' || s === 'orchestration') {
    return { label: 'Orch.', bg: 'rgba(59,130,246,0.12)', color: '#1d4ed8' };
  }
  return { label: 'Manuel', bg: 'rgba(20,17,10,0.06)', color: T.text2 };
}

function reservationDisplayCode(task: TaskListItem): string {
  const n = String(task.reservationNumber || '').trim();
  if (n && !n.startsWith('…')) return n;
  const id = task.reservationId ? String(task.reservationId) : '';
  if (!id) return '—';
  return id.length > 10 ? `…${id.slice(-8)}` : id;
}

/** Nom pays sans répéter le drapeau (ex. « 🇲🇦 Maroc » → « Maroc »). */
function countryNameWithoutFlag(country?: string | null): string {
  if (!country) return '';
  return country.replace(/^[\u{1F1E6}-\u{1F1FF}]{2}\s*/u, '').trim() || country.trim();
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

  const ft = task.subType || task.type || '';
  if (ft === 'support' || String(task.type || '').toLowerCase() === 'support') {
    const icon = task.supportCategoryIcon?.trim() || '🆘';
    const lab = task.supportCategoryLabel?.trim();
    if (lab) return `${icon} ${lab}`;
  }
  if (ft && labelForTaskTypeId(ft) !== ft) {
    const em = FULLTASK_TASK_TYPE_EMOJI[ft as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '';
    return `${em ? `${em} ` : ''}${labelForTaskTypeId(ft)}`;
  }

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
const DEFAULT_TASK_STATUSES: string[] = ['CREATED', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

const STATUS_MULTI_OPTIONS: { id: string; label: string }[] = [
  { id: 'CREATED', label: 'Créé' },
  { id: 'ASSIGNED', label: 'Assigné' },
  { id: 'ACCEPTED', label: 'Acceptée' },
  { id: 'IN_PROGRESS', label: 'En cours' },
  { id: 'COMPLETED', label: 'Terminé' },
  { id: 'CANCELLED_ADMIN', label: 'Annulé' },
  { id: 'ARCHIVED', label: 'Archivé' },
];

const CATEGORY_MULTI_OPTIONS: { id: string; label: string }[] = FULLTASK_TASK_TYPES.map((id) => ({
  id,
  label: `${FULLTASK_TASK_TYPE_EMOJI[id] || '📋'} ${labelForTaskTypeId(id)}`,
}));

const SOURCE_MULTI_OPTIONS: { id: string; label: string }[] = [
  { id: 'manual', label: '✋ Manuel' },
  { id: 'orchestrator', label: '⚙️ Orchestration' },
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
  return '';
}

function renderHeureTaskTop(task: TaskListItem) {
  if (!task.startDate || !task.endDate) {
    return (
      <Typography sx={{ fontSize: 11, color: T.text3, textAlign: 'center', lineHeight: 1.2 }}>
        —
      </Typography>
    );
  }
  const startHour = new Date(task.startDate).getUTCHours();
  const endHour = new Date(task.endDate).getUTCHours();
  const hourSource = task.hourSource || 'default';
  const icon = hourSource === 'client' ? '✅' : hourSource === 'admin' ? '👤' : '📅';
  const label = hourSource === 'client' ? 'Client' : hourSource === 'admin' ? 'Admin' : 'Défaut';
  const color =
    hourSource === 'client' ? T.success : hourSource === 'admin' ? T.warning : T.info;
  return (
    <Tooltip title={`Heure définie par: ${label}`} arrow placement="top">
      <Stack
        direction="row"
        spacing={0.35}
        sx={{ justifyContent: 'center', alignItems: 'center', lineHeight: 1.2 }}
      >
        <Typography sx={{ fontSize: 11, fontWeight: 700, color, lineHeight: 1.2 }}>
          {startHour}h-{endHour}h
        </Typography>
        <Typography component="span" sx={{ fontSize: 10, lineHeight: 1 }}>
          {icon}
        </Typography>
      </Stack>
    </Tooltip>
  );
}

function renderTimeslotClientBottom(task: TaskListItem) {
  const sel = task.timeslot_selected;
  if (!sel || sel.start == null || sel.end == null) {
    return (
      <Typography sx={{ fontSize: 10, color: T.text3, textAlign: 'center', lineHeight: 1.15 }}>
        ⏳ En attente
      </Typography>
    );
  }
  return (
    <Typography sx={{ fontSize: 10, fontWeight: 600, color: T.text2, textAlign: 'center', lineHeight: 1.15 }}>
      Client {sel.start}h-{sel.end}h
    </Typography>
  );
}

function categorySubline(task: TaskListItem): ReactNode {
  const typ = String(task.type || task.name || '').toLowerCase();
  if (
    typ === 'registration' &&
    (task.adults != null || task.nbreGuestValidated != null)
  ) {
    const total = task.adults ?? 0;
    const done = task.nbreGuestValidated ?? 0;
    const tip = `${done}/${total} enregistrés · Brouillons: ${task.nbreGuestDraft ?? 0} · Reste: ${task.nbreGuestNotRegistered ?? 0}`;
    return (
      <Tooltip title={tip} arrow placement="top">
        <Typography
          component="span"
          sx={{ fontSize: 10, lineHeight: 1.2, display: 'block', mt: 0.25 }}
          noWrap
        >
          <Box component="span" sx={{ color: T.success, fontWeight: 700 }}>{done}</Box>
          <Box component="span" sx={{ color: T.text4 }}>/</Box>
          <Box component="span" sx={{ color: T.text2, fontWeight: 600 }}>{total}</Box>
          <Box component="span" sx={{ color: T.text3, ml: 0.5 }}> enreg.</Box>
        </Typography>
      </Tooltip>
    );
  }

  if (task.timeslot || task.actual_time) {
    const prev =
      task.timeslot?.start !== undefined && task.timeslot?.end !== undefined
        ? `Prév ${formatTimeValue(task.timeslot.start)}-${formatTimeValue(task.timeslot.end)}`
        : '';
    const actual = task.actual_time?.time
      ? `✓ ${formatTimeValue(task.actual_time.time)}`
      : typ === 'arrival'
        ? 'Pas arrivé'
        : typ === 'departure'
          ? 'Pas parti'
          : '';
    const line = [prev, actual].filter(Boolean).join(' · ');
    if (line) {
      return (
        <Typography sx={{ fontSize: 10, color: T.text3, lineHeight: 1.2, mt: 0.25 }} noWrap title={line}>
          {line}
        </Typography>
      );
    }
  }

  const summary = detailsTimeslotSummary(task);
  if (summary) {
    return (
      <Typography sx={{ fontSize: 10, color: T.text3, lineHeight: 1.2, mt: 0.25 }} noWrap title={summary}>
        {summary}
      </Typography>
    );
  }

  const desc = firstDescriptionLine(task);
  if (desc && desc !== 'Sans description' && desc !== task.type) {
    return (
      <Typography sx={{ fontSize: 10, color: T.text3, lineHeight: 1.2, mt: 0.25 }} noWrap title={desc}>
        {desc}
      </Typography>
    );
  }

  return null;
}

export function TasksListPage() {
  const { user, loading: authLoading } = useAuth();
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
  const [assignStaffOpen, setAssignStaffOpen] = useState(false);
  const [taskToAssign, setTaskToAssign] = useState<TaskListItem | null>(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<TaskListItem | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [sortField, setSortField] = useState<TaskListSortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

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

  const [showDescription, setShowDescription] = useState(false);
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  // ⚡ PERFORMANCE: Fusion du chargement staff/listings/tasks en parallèle
  const fetchTasks = useCallback(async (opts?: { silent?: boolean; loadMetadata?: boolean }) => {
    try {
      if (!opts?.silent) {
        setLoading(true);
      }
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

      // ⚡ PERFORMANCE: Chargement parallèle tasks + staff + listings
      const shouldLoadMetadata = opts?.loadMetadata !== false && (staff.length === 0 || listings.length === 0);

      const promises: [
        Promise<any>,
        Promise<any> | null,
        Promise<any> | null
      ] = [
        tasksService.getTasks({
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
        }),
        shouldLoadMetadata ? tasksService.getStaff({ ownerId: scope.ownerId, limit: 200 }) : null,
        shouldLoadMetadata ? tasksService.getListings() : null,
      ];

      const [tasksResult, staffResult, listingResult] = await Promise.all(promises);

      setTasks(tasksResult.tasks);
      setPagination(tasksResult.pagination);

      // Mettre à jour staff et listings si chargés
      if (staffResult) setStaff(staffResult.staff);
      if (listingResult) setListings(listingResult);

    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Erreur inconnue');
      setTasks([]);
      setPagination({ page: 0, limit: rowsPerPage, total: 0, totalPages: 0 });
    } finally {
      if (!opts?.silent) {
        setLoading(false);
      }
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
    if (authLoading) return;
    void fetchTasks();
  }, [fetchTasks, authLoading]);

  const listingById = useMemo(
    () => Object.fromEntries(listings.map((l) => [String(l._id), l.name])),
    [listings],
  );

  const staffById = useMemo(
    () =>
      Object.fromEntries(
        staff.map((s) => [
          String(s._id || s.staffCode),
          { _id: s._id, name: s.name, phone: s.phone },
        ]),
      ),
    [staff],
  );

  const taskMapCaches = useMemo(
    () => ({ staffById, listingById }),
    [staffById, listingById],
  );

  const applyTaskRowUpdate = useCallback((updated: TaskListItem) => {
    setTasks((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    setSelectedTaskDetail((prev) => (prev?._id === updated._id ? updated : prev));
  }, []);

  const refreshTaskRow = useCallback(
    async (taskId: string) => {
      try {
        const updated = await tasksService.fetchTaskListItem(String(taskId), taskMapCaches);
        applyTaskRowUpdate(updated);
        return updated;
      } catch {
        return null;
      }
    },
    [applyTaskRowUpdate, taskMapCaches],
  );

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

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setActiveSearchTerm(searchInput.trim());
      setPage(0);
    }, 400);
    return () => window.clearTimeout(timer);
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
      await tasksService.deleteTask(String(task._id));
      toast.success('Tâche supprimée');
      closeActionsMenu();
      setTasks((prev) => prev.filter((t) => t._id !== task._id));
      setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
      if (selectedTaskDetail?._id === task._id) {
        setSelectedTaskDetail(null);
      }
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
    const previousStatus = task.taskStatus;
    closeActionsMenu();
    setTasks((prev) =>
      prev.map((t) =>
        t._id === task._id ? { ...t, taskStatus: status, status } : t,
      ),
    );
    try {
      setStatusUpdating(task._id);
      const updated = await tasksService.updateTaskStatus(
        String(task._id),
        status,
        taskMapCaches,
      );
      if (updated) {
        applyTaskRowUpdate(updated);
      }
      toast.success(`Statut mis à jour: ${TASK_STATUS_LABELS[status]}`);
    } catch (updateError) {
      setTasks((prev) =>
        prev.map((t) =>
          t._id === task._id
            ? { ...t, taskStatus: previousStatus, status: previousStatus }
            : t,
        ),
      );
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : 'Erreur lors du changement de statut',
      );
    } finally {
      setStatusUpdating(null);
    }
  };

  const openAssignStaff = useCallback((task: TaskListItem) => {
    setTaskToAssign(task);
    setAssignStaffOpen(true);
  }, []);

  const openTaskDetail = useCallback((task: TaskListItem) => {
    setSelectedTaskDetail(task);
  }, []);

  const handleTaskStayUpdate = useCallback((reservationId: string, patch: StayFieldPatch) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (String(t.reservationId || '') !== reservationId) return t;
        const next: TaskListItem = { ...t, ...patch };
        if (patch.checkInTime != null) {
          const typ = String(t.subType || t.type || '').toLowerCase();
          if (typ === 'arrival_choose' || typ === 'arrival_declare') {
            const time =
              typeof patch.checkInTime === 'string'
                ? patch.checkInTime.slice(0, 5)
                : String(patch.checkInTime);
            next.plannedTime = time;
          }
        }
        if (patch.checkOutTime != null) {
          const typ = String(t.subType || t.type || '').toLowerCase();
          if (typ === 'departure_choose' || typ === 'departure_declare') {
            const time =
              typeof patch.checkOutTime === 'string'
                ? patch.checkOutTime.slice(0, 5)
                : String(patch.checkOutTime);
            next.plannedTime = time;
          }
        }
        return next;
      }),
    );
  }, []);

  const handleTaskRowUpdated = useCallback((updated: TaskListItem) => {
    setTasks((prev) =>
      prev.map((t) => (t._id === updated._id ? { ...t, ...updated } : t)),
    );
  }, []);

  const handleTaskRegistrationUpdate = useCallback(
    (reservationId: string, patch: RegistrationFieldPatch) => {
      setTasks((prev) =>
        prev.map((t) => {
          if (String(t.reservationId || '') !== reservationId) return t;
          const reg = patch.guestRegistration;
          if (!reg) return t;
          return {
            ...t,
            guestRegistration: {
              ...t.guestRegistration,
              ...reg,
              members: reg.members ?? t.guestRegistration?.members,
            },
            nbreGuestValidated: reg.nbre_guest_registered ?? t.nbreGuestValidated,
            adults: reg.nbre_guest_to_register ?? t.adults,
          };
        }),
      );
    },
    [],
  );

  const assignOwnerId = useMemo(() => {
    if (!taskToAssign) return scope.canAccessAllOwners ? undefined : scope.ownerId;
    if (scope.canAccessAllOwners) {
      return taskToAssign.ownerId || scope.ownerId;
    }
    return scope.ownerId;
  }, [taskToAssign, scope.canAccessAllOwners, scope.ownerId]);

  type TaskRow = TaskListItem & { id: string };

  const columns = [
    {
      key: 'name',
      label: 'Code',
      width: COLUMN_WIDTHS.itemNumber,
      render: (row: TaskRow) => (
        <Typography
          component="button"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openTaskDetail(row);
          }}
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            fontWeight: 700,
            color: T.primaryDeep,
            border: 'none',
            bgcolor: 'transparent',
            p: 0,
            cursor: 'pointer',
            textAlign: 'left',
            textDecoration: 'underline',
            textUnderlineOffset: 2,
            '&:hover': { color: T.primary },
          }}
          noWrap
          title={row.itemNumber || ''}
        >
          {row.itemNumber || '—'}
        </Typography>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date création',
      width: COLUMN_WIDTHS.createdAt,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const parts = formatCreatedAtParts(row.createdAt);
        if (!parts) {
          return <Typography sx={{ fontSize: 11, color: T.text3, textAlign: 'center' }}>—</Typography>;
        }
        const fullLabel = row.createdAt
          ? new Date(row.createdAt).toLocaleString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
        return (
          <Tooltip title={fullLabel ? `Créée le ${fullLabel}` : ''} arrow placement="top">
            <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{parts.date}</Typography>
              <Typography sx={{ fontSize: 10, color: T.text3 }}>{parts.time}</Typography>
            </Stack>
          </Tooltip>
        );
      },
    },
    {
      key: 'category',
      label: 'Type',
      width: COLUMN_WIDTHS.category,
      render: (row: TaskRow) => {
        const label = categoryLabel(row);
        return (
          <Box sx={{ minWidth: 0, maxWidth: '100%' }}>
            <Tooltip title={label} arrow placement="top">
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.text,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </Typography>
            </Tooltip>
            {categorySubline(row)}
          </Box>
        );
      },
    },
    {
      key: 'reservation',
      label: 'Résa',
      width: COLUMN_WIDTHS.reservation,
      align: 'left' as const,
      render: (row: TaskRow) => {
        const code = reservationDisplayCode(row);
        const tip = row.reservationId
          ? `${code} · ${row.reservationId}`
          : code;
        return (
          <Tooltip title={tip} arrow>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10.5,
                fontWeight: 700,
                color: T.primaryDeep,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              noWrap
            >
              {code}
            </Typography>
          </Tooltip>
        );
      },
    },
    {
      key: 'listingName',
      label: 'Logement',
      width: COLUMN_WIDTHS.listing,
      align: 'left' as const,
      render: (row: TaskRow) => (
        <Typography sx={{ fontSize: 12, fontWeight: 600 }} noWrap title={row.listingName || ''}>
          {row.listingName || '—'}
        </Typography>
      ),
    },
    {
      key: 'voyageur',
      label: 'Invité',
      width: COLUMN_WIDTHS.voyageur,
      align: 'left' as const,
      render: (row: TaskRow) => {
        if (!row.guestName && !row.channelName && !row.guestCountry) {
          return <Typography sx={{ fontSize: 11, color: T.text4 }}>—</Typography>;
        }
        const channel = otaChannelForRow(row);
        const countryLabel = countryNameWithoutFlag(row.guestCountry);
        const tip = [row.guestName, countryLabel, channel, row.guestPhone, row.reservationNumber]
          .filter(Boolean)
          .join(' · ');
        return (
          <Tooltip title={tip} arrow>
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: T.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {row.guestName || '—'}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <OTABadge channel={channel} />
                <Typography sx={{ fontSize: 14, lineHeight: 1 }} aria-label={countryLabel || 'Pays'}>
                  {flagFor(row.guestCountry)}
                </Typography>
              </Stack>
            </Stack>
          </Tooltip>
        );
      },
    },
    {
      key: 'executionDate',
      label: 'Prévu',
      width: COLUMN_WIDTHS.executionDate,
      align: 'center' as const,
      render: (row: TaskRow) => (
        <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', justifyContent: 'center' }}>
          <TaskPlannedCell
            task={row}
            renderPlannedHourLine={renderPlannedHourLine}
            formatPlannedParts={formatPlannedParts}
            onStayUpdated={handleTaskStayUpdate}
            onRegistrationUpdated={handleTaskRegistrationUpdate}
            onTaskUpdated={handleTaskRowUpdated}
          />
        </Box>
      ),
    },
    {
      key: 'urgence',
      label: 'Priorité',
      width: COLUMN_WIDTHS.urgence,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const em = String(row.emergency || 'Normal');
        const meta = emergencyChipMeta(em);
        return (
          <Chip
            label={urgencyShortLabel(em)}
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: meta.bg,
              color: meta.color,
              border: `1px solid ${meta.color}33`,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        );
      },
    },
    {
      key: 'source',
      label: 'Origine',
      width: COLUMN_WIDTHS.source,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const meta = sourceChipMeta(row.source);
        return (
          <Chip
            label={meta.label}
            size="small"
            sx={{
              height: 20,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: meta.bg,
              color: meta.color,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        );
      },
    },
    {
      key: 'status',
      label: 'Statut',
      width: COLUMN_WIDTHS.status,
      align: 'center' as const,
      render: (row: TaskRow) => {
        const status = normalizeTaskStatus(row.taskStatus);
        const waitingGuest = row.isClientRequest && status === 'CREATED';
        const statusLabel = waitingGuest ? 'Attente invité' : TASK_STATUS_LABELS[status];
        const statusVariant = waitingGuest ? 'warning' : TASK_STATUS_VARIANTS[status];
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
            <Badge variant={statusVariant}>{statusLabel}</Badge>
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
      render: (row: TaskRow) => <StaffAssignCell task={row} onAssign={openAssignStaff} />,
    },
    {
      key: 'description',
      label: 'Note',
      width: COLUMN_WIDTHS.description,
      align: 'left' as const,
      render: (row: TaskRow) => {
        const line = firstDescriptionLine(row);
        if (!line) {
          return <Typography sx={{ fontSize: 11, color: T.text4 }}>—</Typography>;
        }
        return (
          <Tooltip title={line} arrow>
            <Typography sx={{ fontSize: 11, color: T.text2, maxWidth: 160 }} noWrap>
              {line}
            </Typography>
          </Tooltip>
        );
      },
    },
  ];

  const visibleColumns = columns.filter((col) => {
    if (col.key === 'description' && !showDescription) return false;
    return true;
  });

  const optionalColumnsOn = showDescription ? 1 : 0;

  // ⚡ PERFORMANCE: Skeleton loading pour affichage immédiat
  if (loading && tasks.length === 0) {
    return (
      <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Liste']}>
        <Box sx={{ p: { xs: 2, md: 3 } }}>
          {/* Header skeleton */}
          <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Box sx={{ width: 320, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 100, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 180, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
              <Box sx={{ width: 180, height: 40, bgcolor: T.bg2, borderRadius: 1 }} />
            </Stack>
          </Paper>

          {/* Filters skeleton */}
          <Stack direction="row" gap={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
            {[1,2,3,4,5].map(i => (
              <Box key={i} sx={{ width: 100, height: 32, bgcolor: T.bg2, borderRadius: '16px' }} />
            ))}
          </Stack>

          {/* Table skeleton */}
          <Paper sx={{ border: `1px solid ${T.border}`, borderRadius: 1.5 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <Box
                key={i}
                sx={{
                  height: 56,
                  borderBottom: i < 10 ? `1px solid ${T.border}` : 'none',
                  p: 2,
                  display: 'flex',
                  gap: 2,
                }}
              >
                <Box sx={{ width: '10%', height: 20, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: '20%', height: 20, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: '15%', height: 20, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: '25%', height: 20, bgcolor: T.bg2, borderRadius: 0.5 }} />
                <Box sx={{ width: '10%', height: 20, bgcolor: T.bg2, borderRadius: 0.5 }} />
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
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Liste']}>
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Paper sx={{ p: 1.5, mb: 1.5, border: `1px solid ${T.border}`, borderRadius: 1.5, bgcolor: T.bg1 }}>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Code, invité, logement, type…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1, minWidth: 180, maxWidth: 320 }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={(e) => {
                (e.currentTarget as HTMLElement).blur();
                setAddTaskOpen(true);
              }}
              sx={{
                textTransform: 'none',
                bgcolor: T.primary,
                color: '#fff',
                fontWeight: 600,
                px: 2,
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: T.primaryDeep },
              }}
            >
              + Tâche
            </Button>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 168, flex: '1 1 140px', maxWidth: 220 }}>
              <Select
                multiple
                displayEmpty
                value={listFilters.listingIds}
                onChange={(e) => {
                  setListFilters((p) => ({ ...p, listingIds: e.target.value as string[] }));
                  setPage(0);
                }}
                renderValue={(s) => `Propriété · ${(s as string[]).length || 'toutes'}`}
              >
                {listings.map((lst) => (
                  <MenuItem key={lst._id} value={lst._id}>
                    <Checkbox checked={listFilters.listingIds.indexOf(lst._id) > -1} size="small" />
                    <ListItemText primary={lst.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 152, flex: '1 1 130px', maxWidth: 200 }}>
              <Select
                multiple
                displayEmpty
                value={listFilters.subTypes}
                onChange={(e) => {
                  setListFilters((p) => ({ ...p, subTypes: e.target.value as string[] }));
                  setPage(0);
                }}
                renderValue={(s) => `Type · ${(s as string[]).length || 'tous'}`}
              >
                {CATEGORY_MULTI_OPTIONS.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    <Checkbox checked={listFilters.subTypes.indexOf(c.id) > -1} size="small" />
                    <ListItemText primary={c.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 140, flex: '1 1 120px', maxWidth: 180 }}>
              <Select
                multiple
                displayEmpty
                value={listFilters.statuses}
                onChange={(e) => {
                  const v = e.target.value as string[];
                  setListFilters((p) => ({ ...p, statuses: v.length ? v : [...DEFAULT_TASK_STATUSES] }));
                  setPage(0);
                }}
                renderValue={(s) => `Statut · ${(s as string[]).length || 'tous'}`}
              >
                {STATUS_MULTI_OPTIONS.map((st) => (
                  <MenuItem key={st.id} value={st.id}>
                    <Checkbox checked={listFilters.statuses.indexOf(st.id) > -1} size="small" />
                    <ListItemText primary={st.label} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 128, flex: '1 1 110px', maxWidth: 160 }}>
              <Select
                multiple
                displayEmpty
                value={listFilters.staffCodes}
                onChange={(e) => {
                  setListFilters((p) => ({ ...p, staffCodes: e.target.value as string[] }));
                  setPage(0);
                }}
                renderValue={(s) => `Staff · ${(s as string[]).length || 'tous'}`}
              >
                {staff.map((m) => (
                  <MenuItem key={m.staffCode} value={m.staffCode}>
                    <Checkbox checked={listFilters.staffCodes.indexOf(m.staffCode) > -1} size="small" />
                    <ListItemText primary={m.username} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 118, flex: '0 1 118px' }}>
              <Select
                value={listFilters.origin}
                onChange={(e) => {
                  setListFilters((p) => ({
                    ...p,
                    origin: e.target.value as typeof listFilters.origin,
                  }));
                  setPage(0);
                }}
                renderValue={(v) =>
                  v === 'task' ? 'Origine · Internes' : v === 'client' ? 'Origine · Client' : 'Origine · toutes'
                }
              >
                <MenuItem value="all">Toutes</MenuItem>
                <MenuItem value="task">Internes</MenuItem>
                <MenuItem value="client">Client</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ ...toolbarSelectSx, minWidth: 132, flex: '0 1 132px' }}>
              <Select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as TaskListSortField);
                  setPage(0);
                }}
                renderValue={(v) => `Tri · ${SORT_FIELD_LABELS[String(v)] || 'Date prévue'}`}
              >
                <MenuItem value="createdAt">Date création</MenuItem>
                <MenuItem value="startDate">Date prévue</MenuItem>
                <MenuItem value="reservationNumber">Réservation</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title={sortDirection === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}>
              <IconButton
                size="small"
                onClick={() => {
                  setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                  setPage(0);
                }}
              >
                {sortDirection === 'asc' ? (
                  <ArrowUpwardIcon sx={{ fontSize: 18 }} />
                ) : (
                  <ArrowDownwardIcon sx={{ fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Filtres avancés">
              <IconButton
                size="small"
                onClick={openAdvancedDialog}
                sx={{
                  bgcolor:
                    advancedFilters.dateType ||
                    advancedFilters.emergency !== 'all' ||
                    listFilters.paymentStatus !== 'all' ||
                    listFilters.hasAssociation !== 'all' ||
                    listFilters.sources.length > 0
                      ? T.primaryTint
                      : undefined,
                }}
              >
                <FilterListIcon sx={{ fontSize: 18, color: T.primaryDeep }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Colonnes optionnelles">
              <IconButton
                size="small"
                onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                sx={{ bgcolor: optionalColumnsOn > 0 ? T.primaryTint : undefined }}
              >
                <ViewColumnIcon sx={{ fontSize: 18, color: optionalColumnsOn > 0 ? T.primary : T.text3 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Réinitialiser les filtres">
              <IconButton size="small" onClick={resetAllListFilters}>
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Stack>

          <Stack
            direction="row"
            sx={{ mt: 1.5, gap: 0.75, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <Pill label="Éch. auj." count={filterCounts.dueToday} active={quickFilterKey === 'dueToday'} onClick={() => toggleQuickFilter('dueToday')} color={T.info} />
              <Pill label="Demain" count={filterCounts.dueTomorrow} active={quickFilterKey === 'dueTomorrow'} onClick={() => toggleQuickFilter('dueTomorrow')} color={T.warning} />
              <Pill label="7 j" count={filterCounts.due7d} active={quickFilterKey === 'due7d'} onClick={() => toggleQuickFilter('due7d')} color={T.primary} />
              <Pill label="Urgent" count={filterCounts.urgent} active={quickFilterKey === 'urgent'} onClick={() => toggleQuickFilter('urgent')} color={T.error} />
            </Stack>
            <Stack direction="row" sx={{ gap: 0.75, flexWrap: 'wrap' }}>
              <KpiCompact label="À traiter" value={kpis.created} accent={T.info} onClick={() => { setListFilters((p) => ({ ...p, statuses: ['CREATED'] })); setQuickFilterKey('none'); setPage(0); }} />
              <KpiCompact label="En cours" value={kpis.inProgress} accent={T.warning} onClick={() => { setListFilters((p) => ({ ...p, statuses: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] })); setQuickFilterKey('none'); setPage(0); }} />
              <KpiCompact label="OK" value={kpis.completed} accent={T.success} onClick={() => { setListFilters((p) => ({ ...p, statuses: ['COMPLETED'] })); setQuickFilterKey('none'); setPage(0); }} />
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
              compact
              headerTextTransform="none"
              onRowClick={(row) => openTaskDetail(row as TaskListItem)}
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

      {selectedTaskDetail && (
        <Suspense fallback={<CircularProgress />}>
          <TaskDetailDrawer
            task={selectedTaskDetail}
            onClose={() => setSelectedTaskDetail(null)}
            onSuccess={() => {
              if (selectedTaskDetail) {
                void refreshTaskRow(String(selectedTaskDetail._id));
              }
            }}
            onAssignStaff={(t) => {
              setSelectedTaskDetail(null);
              openAssignStaff(t);
            }}
          />
        </Suspense>
      )}

      <ModalPortal>
          {assignStaffOpen && taskToAssign ? (
            <Suspense fallback={<CircularProgress />}>
              <AssignStaffDialog
              useFulltaskApi
              open={assignStaffOpen}
              onClose={() => {
                setAssignStaffOpen(false);
                setTaskToAssign(null);
              }}
              task={taskToAssign}
              ownerId={assignOwnerId}
              onSuccess={(assignedStaff: {
                _id?: string;
                staffCode?: string;
                staffName?: string;
                name?: string;
                staffPhone?: string;
                phone?: string;
              }) => {
                if (taskToAssign && assignedStaff) {
                  const staffId = String(assignedStaff._id || assignedStaff.staffCode || '');
                  setTasks((prev) =>
                    prev.map((t) => {
                      if (t._id !== taskToAssign._id) return t;
                      const nextStatus =
                        normalizeTaskStatus(t.taskStatus) === 'CREATED' ? 'ASSIGNED' : t.taskStatus;
                      return {
                        ...t,
                        staffId,
                        staffCode: staffId,
                        staffName:
                          assignedStaff.staffName || assignedStaff.name || t.staffName || null,
                        staffPhone:
                          assignedStaff.staffPhone || assignedStaff.phone || t.staffPhone || null,
                        taskStatus: nextStatus,
                        status: nextStatus,
                      };
                    }),
                  );
                  void refreshTaskRow(String(taskToAssign._id));
                }
                toast.success('Staff assigné');
              }}
              />
            </Suspense>
          ) : null}
        </ModalPortal>

      {addTaskOpen ? (
        <Suspense fallback={<CircularProgress />}>
          <AddTaskModal
          useFulltaskApi
          createTaskFn={createFulltaskFromFormData}
          open
          onClose={() => setAddTaskOpen(false)}
          ownerId={scope.ownerId}
          isAdminUser={scope.canAccessAllOwners}
          onSuccess={() => {
            toast.success('Tâche créée');
            void fetchTasks({ silent: true });
          }}
          />
        </Suspense>
      ) : null}

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
          <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.5 }}>
            Colonnes de base : code, date création, type, résa, logement, invité, prévu, priorité, origine, statut, staff
          </Typography>
        </Box>
        <MenuItem onClick={() => setShowDescription(!showDescription)} sx={{ fontSize: 13, py: 1.25 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
            <Box sx={{
              width: 18, height: 18, borderRadius: '4px',
              border: `2px solid ${showDescription ? T.primary : T.border}`,
              bgcolor: showDescription ? T.primary : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700,
            }}>
              {showDescription && '✓'}
            </Box>
            <Typography sx={{ fontSize: 13, color: T.text2 }}>Note / demande</Typography>
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
