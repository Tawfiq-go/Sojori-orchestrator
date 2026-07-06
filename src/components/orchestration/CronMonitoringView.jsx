import React, { useState, useEffect, useMemo } from 'react';
import { format, subDays, addDays } from 'date-fns';
import { Box, Typography, Card, CardContent, CircularProgress, Alert, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TablePagination, Paper, Grid, IconButton, Tooltip, TextField, MenuItem, Button, Divider, ListSubheader, Stack } from '@mui/material';
import { AccessTime as ClockIcon, CheckCircle as CheckIcon, Error as ErrorIcon, Schedule as ScheduleIcon, Refresh as RefreshIcon, Warning as WarningIcon, ExpandMore as ExpandMoreIcon, FilterList as FilterIcon, Clear as ClearIcon, Send as SendIcon, Notifications as NotificationIcon, Assignment as TaskIcon, Timer as DeadlineIcon, PlayArrow as PlayIcon, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import {
  getCronNextExecution,
  getCronSchedule,
  getCronDayView,
  forceExecuteAllCron,
} from '../../services/cronService';
import { formatCasablancaDate } from '../../utils/dateFormatting';
import {
  isManualExecution,
  getExecutionSourceLabel,
} from '../../utils/cronExecutionSource';

// Couleurs Sojori - Aligné avec TasksNew et Reservations
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryLight: '#FF8F6B',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  purple: '#9C27B0',
  pink: '#E91E63',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};

// Column widths for sticky table (same pattern as TasksNew/Reservations)
const columnWidths = {
  reservation: '140px',
  action: '110px',
  intent: '168px',
  category: '140px',
  scheduled: '150px',
  status: '100px',
  relative: '120px'
};

/**
 * Préréglages alignés sur le cron plan-based (conditions + types d'actions).
 * Filtrent l'API `/cron/day-view` (audit MessageLog + projection Plan).
 */
const CRON_SCENARIO_PRESETS = [{
  id: '',
  label: '📋 Tous scénarios',
  category: '',
  action: ''
}, {
  id: 'registration',
  label: '📝 Relances enregistrement',
  category: 'DECLARATION_REGISTRATION',
  action: ''
}, {
  id: 'arrival_choice',
  label: '🛬 Relance choix arrivée',
  category: 'CHOICE_ARRIVAL',
  action: ''
}, {
  id: 'arrival_choice_legacy',
  label: '🛬 Choix arrivée (clé legacy)',
  category: 'arrival_choose',
  action: ''
}, {
  id: 'arrival_declaration',
  label: '📌 Déclaration arrivée',
  category: 'DECLARATION_ARRIVAL',
  action: ''
}, {
  id: 'departure_choice',
  label: '🚗 Relance choix départ',
  category: 'CHOICE_DEPARTURE',
  action: ''
}, {
  id: 'departure_declaration',
  label: '📌 Déclaration départ',
  category: 'DECLARATION_DEPARTURE',
  action: ''
}, {
  id: 'assign_staff',
  label: '👤 Assignation staff',
  category: '',
  action: 'assign_staff'
}, {
  id: 'deadline',
  label: '⏰ Deadline / escalade',
  category: '',
  action: 'execute_deadline'
}, {
  id: 'notifications',
  label: '📢 Notifications',
  category: '',
  action: 'send_notification'
}, {
  id: 'send_message',
  label: '💬 Messages (toutes cat.)',
  category: '',
  action: 'send_message'
}];

/** Presets / API vs `workflow.category` Mongo : même scénario, clés différentes. */
const CRON_CATEGORY_SYNONYMS = {
  CHOICE_ARRIVAL: new Set(['CHOICE_ARRIVAL', 'arrival_choose']),
  CHOICE_DEPARTURE: new Set(['CHOICE_DEPARTURE', 'departure_choose']),
  arrival_choose: new Set(['CHOICE_ARRIVAL', 'arrival_choose']),
  departure_choose: new Set(['CHOICE_DEPARTURE', 'departure_choose']),
  DECLARATION_ARRIVAL: new Set(['DECLARATION_ARRIVAL', 'arrival_declare']),
  DECLARATION_DEPARTURE: new Set(['DECLARATION_DEPARTURE', 'departure_declare']),
  arrival_declare: new Set(['DECLARATION_ARRIVAL', 'arrival_declare']),
  departure_declare: new Set(['DECLARATION_DEPARTURE', 'departure_declare']),
}

function cronCategoryFilterMatches(filterCategory, storedCategory) {
  if (!filterCategory) return true
  const s = String(storedCategory ?? '')
  if (!s) return false
  if (s === filterCategory) return true
  const syn = CRON_CATEGORY_SYNONYMS[filterCategory]
  return syn ? syn.has(s) : false
}

/** Filtres : largeur min + libellé vide lisible (évite champs plus petits que le placeholder) */
const FILTER_FIELD_SX = {
  minWidth: { xs: 148, sm: 172 },
  flex: { xs: '1 1 148px', sm: '0 0 auto' },
  '& .MuiOutlinedInput-root': {
    minHeight: 40,
    fontSize: '0.875rem',
    '&:hover fieldset': { borderColor: SOJORI_COLORS.primary },
    '&.Mui-focused fieldset': { borderColor: SOJORI_COLORS.primary },
  },
  '& .MuiInputLabel-root': {
    fontSize: '0.8125rem',
    backgroundColor: '#fff',
    px: 0.5,
  },
};

function renderEmptySelectValue(emptyLabel) {
  return (selected) => {
    if (selected === '' || selected == null) {
      return (
        <Typography component="span" sx={{ color: SOJORI_COLORS.gray[600], fontSize: '0.875rem' }}>
          {emptyLabel}
        </Typography>
      );
    }
    return selected;
  };
}

function matchesExecutionSourceFilter(event, executionSource) {
  if (!executionSource) return true;
  const manual = isManualExecution(event);
  if (executionSource === 'manual') return manual;
  if (executionSource === 'cron') return !manual;
  return true;
}

function ExecutionSourceChip({ event }) {
  const manual = isManualExecution(event);
  const label = getExecutionSourceLabel(event);
  return (
    <Chip
      size="small"
      label={manual ? `⚡ ${label}` : label}
      title={manual ? 'Exécuté manuellement ou forcé depuis le dashboard orchestration' : 'Exécution automatique (cron)'}
      sx={{
        height: 20,
        maxWidth: 160,
        fontSize: '0.65rem',
        bgcolor: manual ? SOJORI_COLORS.warning + '30' : SOJORI_COLORS.gray[200],
        color: manual ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.gray[700],
        fontWeight: manual ? 700 : 500,
        '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
      }}
    />
  );
}

const CronMonitoringView = () => {
  // State
  const [nextExecution, setNextExecution] = useState(null);
  const [events, setEvents] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoadingNext, setIsLoadingNext] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isExecutingAll, setIsExecutingAll] = useState(false);
  const [hasError, setHasError] = useState(false); // ✅ FIX: Bloquer auto-refresh si erreur

  // Filters
  /** Périodes `dayview-*` = vue Audit + Projection (API /cron/day-view) */
  const [period, setPeriod] = useState('dayview-today');
  const [dayViewData, setDayViewData] = useState(null);
  const [status, setStatus] = useState('');
  const [action, setAction] = useState('');
  const [category, setCategory] = useState('');
  /** Préréglage « type métier » — met à jour category + action */
  const [cronScenario, setCronScenario] = useState('');
  const [reservationNumber, setReservationNumber] = useState('');
  const [reservationStatus, setReservationStatus] = useState('all');
  /** '', 'manual' = dashboard forcé/manuel, 'cron' = automatique */
  const [executionSource, setExecutionSource] = useState('');
  const todayYmd = format(new Date(), 'yyyy-MM-dd');
  const [customSingleDate, setCustomSingleDate] = useState(todayYmd);
  const [customDateFrom, setCustomDateFrom] = useState(format(subDays(new Date(), 2), 'yyyy-MM-dd'));
  const [customDateTo, setCustomDateTo] = useState(todayYmd);

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(100);

  // Sorting
  const [orderBy, setOrderBy] = useState('scheduledFor');
  const [order, setOrder] = useState('asc'); // 'asc' = chronologique

  // Fetch next execution
  const fetchNextExecution = async () => {
    try {
      setIsLoadingNext(true);
      const data = await getCronNextExecution();
      setNextExecution(data);
      setHasError(false);
    } catch (error) {
      console.error('[CronMonitoring] fetchNextExecution error:', error);
      setHasError(true);
    } finally {
      setIsLoadingNext(false);
    }
  };
  const isDayViewPeriod = p =>
    p === 'dayview-today' ||
    p === 'dayview-today-audit' ||
    p === 'dayview-today-projection' ||
    p === 'dayview-tomorrow' ||
    p === 'dayview-after' ||
    p === 'dayview-yesterday' ||
    p === 'dayview-custom-day' ||
    p === 'dayview-custom-range' ||
    p === 'dayview-last' ||
    p === 'dayview-next';

  const mapDayViewQuery = p => {
    if (p === 'dayview-today' || p === 'dayview-today-audit' || p === 'dayview-today-projection') return 'today';
    if (p === 'dayview-tomorrow') return 'tomorrow';
    if (p === 'dayview-after') return 'day_after_tomorrow';
    if (p === 'dayview-yesterday') return 'yesterday';
    if (p === 'dayview-custom-day') return 'custom_day';
    if (p === 'dayview-custom-range') return 'custom_range';
    if (p === 'dayview-last') return 'last_run';
    if (p === 'dayview-next') return 'next_run';
    return 'today';
  };

  const fetchDayView = async () => {
    try {
      setIsLoadingEvents(true);
      const view = mapDayViewQuery(period);
      const params = {
        view,
        reservationStatus,
        reservationNumber: reservationNumber.trim() || undefined,
      };
      if (view === 'custom_day') params.date = customSingleDate;
      if (view === 'custom_range') {
        params.dateFrom = customDateFrom;
        params.dateTo = customDateTo;
      }
      const data = await getCronDayView(params);
      setDayViewData(data);
      setEvents([]);
      setStats(null);
      setHasError(false);
    } catch (error) {
      console.error('[CronMonitoring] fetchDayView error:', error);
      setDayViewData(null);
      setHasError(true);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  // Fetch events with filters
  const fetchEvents = async () => {
    try {
      setIsLoadingEvents(true);
      const data = await getCronSchedule({
        period,
        limit: 1000,
        reservationStatus,
        status: status || undefined,
        action: action || undefined,
        category: category || undefined,
        reservationNumber: reservationNumber.trim() || undefined,
      });
      setEvents(data.events);
      setStats(data.stats);
      setDayViewData(null);
      setHasError(false);
    } catch (error) {
      console.error('[CronMonitoring] fetchEvents error:', error);
      setHasError(true);
    } finally {
      setIsLoadingEvents(false);
    }
  };
  const refreshMainData = () => {
    if (isDayViewPeriod(period)) {
      fetchDayView();
    } else {
      fetchEvents();
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNextExecution();
    if (isDayViewPeriod(period)) {
      fetchDayView();
    } else {
      fetchEvents();
    }
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    if (isDayViewPeriod(period)) {
      fetchDayView();
    } else {
      fetchEvents();
    }
    setPage(0);
  }, [period, status, action, category, reservationNumber, reservationStatus, executionSource, customSingleDate, customDateFrom, customDateTo]);

  // Auto-refresh every 60 seconds (⚠️ DÉSACTIVÉ si erreur API)
  useEffect(() => {
    if (hasError) {
      console.warn('[CronMonitoring] Auto-refresh désactivé (erreur API détectée). Cliquer Refresh pour réessayer.');
      return; // ✅ FIX: Stopper auto-refresh si erreur
    }
    const interval = setInterval(() => {
      fetchNextExecution();
      if (isDayViewPeriod(period)) {
        fetchDayView();
      } else {
        fetchEvents();
      }
      setLastRefresh(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, [period, status, action, category, reservationNumber, reservationStatus, executionSource, customSingleDate, customDateFrom, customDateTo, hasError]);

  // Manual refresh (✅ FIX: Réinitialise hasError pour relancer auto-refresh)
  const handleRefresh = () => {
    setHasError(false); // ✅ FIX: Réinitialiser erreur
    fetchNextExecution();
    refreshMainData();
    setLastRefresh(new Date());
  };

  // 🧪 Force execute pending events (TEST MODE)
  const handleForceExecuteAll = async () => {
    const reservationNumber = window.prompt('🧪 MODE TEST: Forcer l\'exécution des événements pending\n\n' + '• Laisser vide = TOUS les événements pending\n' + '• Entrer SJ-XXX = uniquement cette réservation\n\n' + 'Numéro de réservation (optionnel):');

    // User cancelled
    if (reservationNumber === null) {
      return;
    }
    const scope = reservationNumber?.trim() || 'TOUS les événements pending';
    if (!window.confirm(`⚠️ Confirmer l'exécution forcée pour:\n${scope}\n\nCela va envoyer les notifications, assigner les staff, exécuter les deadlines, etc.`)) {
      return;
    }
    setIsExecutingAll(true);
    try {
      const response = await forceExecuteAllCron(reservationNumber?.trim() || undefined);
      const { summary } = response;
      const scopeText = summary.reservationNumber ? `pour ${summary.reservationNumber}` : '(tous)';
      alert(`✅ Exécution forcée terminée ${scopeText}:\n\n` + `📊 Total: ${summary.total}\n` + `✅ Exécutés: ${summary.executed}\n` + `❌ Échecs: ${summary.failed}` + (summary.errors?.length > 0 ? `\n\n⚠️ Erreurs:\n${summary.errors.map(e => `- ${e.eventId}: ${e.error}`).join('\n')}` : ''));
      refreshMainData();
      fetchNextExecution();
    } catch (error) {
      alert(`❌ Erreur: ${error.message}`);
    } finally {
      setIsExecutingAll(false);
    }
  };

  // Clear filters
  const handleClearFilters = () => {
    setPeriod('dayview-today');
    setStatus('');
    setAction('');
    setCategory('');
    setCronScenario('');
    setReservationNumber('');
    setReservationStatus('all');
    setExecutionSource('');
    setCustomSingleDate(todayYmd);
    setCustomDateFrom(format(subDays(new Date(), 2), 'yyyy-MM-dd'));
    setCustomDateTo(todayYmd);
    setPage(0);
  };

  const applyQuickDay = (offsetDays) => {
    const d = format(addDays(new Date(), offsetDays), 'yyyy-MM-dd');
    setCustomSingleDate(d);
    setCustomDateFrom(d);
    setCustomDateTo(d);
    if (offsetDays === -1) setPeriod('dayview-yesterday');
    else if (offsetDays === 0) setPeriod('dayview-today');
    else if (offsetDays === 1) setPeriod('dayview-tomorrow');
    else if (offsetDays === 2) setPeriod('dayview-after');
    else {
      setPeriod('dayview-custom-day');
    }
    setPage(0);
  };
  const handleCronScenarioChange = presetId => {
    setCronScenario(presetId);
    const preset = CRON_SCENARIO_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setCategory(preset.category);
      setAction(preset.action);
    }
  };

  // Sorting
  const handleRequestSort = property => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  // Pagination
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const filteredEvents = useMemo(() => {
    return events.filter(e => matchesExecutionSourceFilter(e, executionSource));
  }, [events, executionSource]);

  // Get sorted events
  const getSortedEvents = () => {
    const comparator = (a, b) => {
      let aValue, bValue;
      switch (orderBy) {
        case 'scheduledFor':
          aValue = new Date(a.scheduledFor).getTime();
          bValue = new Date(b.scheduledFor).getTime();
          break;
        case 'reservationNumber':
          aValue = a.reservationNumber || '';
          bValue = b.reservationNumber || '';
          break;
        case 'action':
          aValue = a.action || '';
          bValue = b.action || '';
          break;
        case 'category':
          aValue = a.category || '';
          bValue = b.category || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }
      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
      return 0;
    };
    return [...filteredEvents].sort(comparator);
  };

  // Get paginated events
  const getPaginatedEvents = () => {
    const sortedEvents = getSortedEvents();
    return sortedEvents.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  };

  const manualAuditCount = useMemo(
    () => (dayViewData?.audit || []).filter(isManualExecution).length,
    [dayViewData],
  );

  // Get action icon
  const getActionIcon = actionType => {
    switch (actionType) {
      case 'send_message':
        return <SendIcon fontSize="small" />;
      case 'send_notification':
        return <NotificationIcon fontSize="small" />;
      case 'assign_staff':
        return <TaskIcon fontSize="small" />;
      case 'execute_deadline':
        return <DeadlineIcon fontSize="small" />;
      case 'create_task':
        return <TaskIcon fontSize="small" />;
      default:
        return <ScheduleIcon fontSize="small" />;
    }
  };

  // Get action color
  const getActionColor = actionType => {
    switch (actionType) {
      case 'send_message':
        return 'primary';
      case 'send_notification':
        return 'secondary';
      case 'assign_staff':
        return 'warning';
      case 'execute_deadline':
        return 'error';
      case 'create_task':
        return 'success';
      default:
        return 'default';
    }
  };

  // Get status color
  const getStatusColor = statusType => {
    switch (statusType) {
      case 'pending':
        return 'warning';
      case 'executed':
        return 'success';
      case 'skipped':
        return 'default';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get category label
  const getCategoryLabel = cat => {
    const labels = {
      DECLARATION_REGISTRATION: 'Enregistrement',
      CHOICE_ARRIVAL: 'Choix arrivée',
      DECLARATION_ARRIVAL: 'Déclaration arrivée',
      CHOICE_DEPARTURE: 'Choix départ',
      DECLARATION_DEPARTURE: 'Déclaration départ',
      arrival_choose: 'Choix Arrivée',
      arrival_declare: 'Déclaration Arrivée',
      cleaning_free: 'Ménage Libre',
      departure_choose: 'Choix Départ',
      feedback_during_stay: 'Feedback Séjour',
      welcome: 'Bienvenue',
      checkout_info: 'Info Checkout',
      weather: 'Météo',
      thank_you: 'Merci',
      review_request: 'Demande Avis',
      registration: 'Enregistrement'
    };
    return labels[cat] || cat;
  };

  /** Libellé métier : ce que le cron traitera (action + catégorie), aligné condition checker */
  const describeCronIntent = ev => {
    const a = ev.action || '';
    const c = ev.category || '';
    if (a === 'assign_staff') {
      return 'Assigner staff (si IF_NO_STAFF / créneau tentatives)';
    }
    if (a === 'execute_deadline') {
      return 'Deadline / escalade (si date atteinte + IF_DEADLINE_REACHED)';
    }
    if (a === 'send_notification') {
      return `Notification · ${getCategoryLabel(c)}`;
    }
    if (a === 'send_message') {
      if (c.includes('REGISTRATION') || c === 'registration') {
        return 'Relance inscription (ex. IF_REGISTRATION_INCOMPLETE)';
      }
      if (c.includes('CHOICE_ARRIVAL') || c === 'arrival_choose') {
        return 'Relance choix arrivée (ex. IF_NO_TIMESLOT)';
      }
      if (c.includes('DECLARATION_ARRIVAL') || c === 'arrival_declare') {
        return 'Relance déclaration arrivée (ex. IF_ARRIVAL_NOT_DECLARED)';
      }
      if (c.includes('CHOICE_DEPARTURE') || c === 'departure_choose') {
        return 'Relance choix départ (ex. IF_NO_TIMESLOT)';
      }
      if (c.includes('DECLARATION_DEPARTURE') || c === 'departure_declare') {
        return 'Relance déclaration départ (ex. IF_DEPARTURE_NOT_DECLARED)';
      }
      return `Message planifié · ${getCategoryLabel(c)}`;
    }
    if (a === 'create_task') {
      return 'Création tâche';
    }
    return `${a || '?'} · ${getCategoryLabel(c)}`;
  };

  // Format time (Casablanca timezone - incl. Ramadan UTC+0)
  const formatTime = date => {
    if (!date) return '-';
    return formatCasablancaDate(date, 'dd/MM/yyyy HH:mm');
  };

  // Format relative time
  const formatRelativeTime = date => {
    const now = new Date();
    const target = new Date(date);
    const diffMs = target - now;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMs < 0) {
      const absMins = Math.abs(diffMins);
      if (absMins < 60) return `⚠️ ${absMins}m en retard`;
      const absHours = Math.floor(absMins / 60);
      return `⚠️ ${absHours}h en retard`;
    }
    if (diffMins < 60) return `dans ${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `dans ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `dans ${diffDays}j`;
  };
  const paginatedEvents = getPaginatedEvents();
  const inDayView = isDayViewPeriod(period);
  const mapProjectionKeyToAction = key => {
    if (key === 'sendNotification') return 'send_notification';
    if (key === 'assignStaff') return 'assign_staff';
    if (key === 'deadlineEscalation') return 'execute_deadline';
    if (key === 'requestTimeslot') return 'request_timeslot';
    return '';
  };
  const describeProjectionIntent = row => {
    const k = row.actionKey;
    const c = row.workflowCategory || '';
    if (k === 'assignStaff') return describeCronIntent({
      action: 'assign_staff',
      category: c
    });
    if (k === 'deadlineEscalation') return describeCronIntent({
      action: 'execute_deadline',
      category: c
    });
    if (k === 'sendNotification') return describeCronIntent({
      action: 'send_notification',
      category: c
    });
    if (k === 'requestTimeslot') return `Créneau / timeslot · ${getCategoryLabel(c)}`;
    return `${k || '?'} · ${getCategoryLabel(c)}`;
  };
  const dayViewAuditRows = useMemo(() => {
    if (!inDayView || !dayViewData?.audit) return [];
    return dayViewData.audit.filter(e => {
      if (status && e.status !== status) return false;
      if (action && e.action !== action) return false;
      if (category && !cronCategoryFilterMatches(category, e.category)) return false;
      if (!matchesExecutionSourceFilter(e, executionSource)) return false;
      return true;
    });
  }, [inDayView, dayViewData, status, action, category, executionSource]);
  const dayViewProjRows = useMemo(() => {
    if (!inDayView || !dayViewData?.projection) return [];
    return dayViewData.projection.filter(p => {
      const a = mapProjectionKeyToAction(p.actionKey);
      if (action && a !== action) return false;
      if (category && !cronCategoryFilterMatches(category, p.workflowCategory)) return false;
      return true;
    });
  }, [inDayView, dayViewData, action, category]);

  /** Masque le bloc inutile (ex. prochain run = projection seule). */
  const showDayViewAuditPanel =
    inDayView && period !== 'dayview-next' && period !== 'dayview-today-projection';
  const showDayViewProjectionPanel =
    inDayView && period !== 'dayview-last' && period !== 'dayview-today-audit';

  const dayViewFilteredSummary = (() => {
    if (!inDayView) return '';
    if (showDayViewAuditPanel && showDayViewProjectionPanel) {
      return `Audit ${dayViewAuditRows.length} · Plan ${dayViewProjRows.length}`;
    }
    if (showDayViewAuditPanel) return `Audit ${dayViewAuditRows.length}`;
    return `Plan ${dayViewProjRows.length}`;
  })();

  const dayViewFilteredChipLabel = (() => {
    if (!inDayView) return '';
    if (showDayViewAuditPanel && showDayViewProjectionPanel) {
      return `${dayViewAuditRows.length} + ${dayViewProjRows.length}`;
    }
    if (showDayViewAuditPanel) return `${dayViewAuditRows.length}`;
    return `${dayViewProjRows.length}`;
  })();

  return <Box sx={{
    p: { xs: 1, sm: 1.5 },
    bgcolor: SOJORI_COLORS.gray[50],
    minHeight: '100vh'
  }}>
      {/* Header Compact - Style Reservations */}
      <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 1,
      pb: 0.5,
      borderBottom: `2px solid ${SOJORI_COLORS.primary}`
    }}>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: { xs: 0.5, sm: 1 }
      }}>
          <Typography variant="h6" fontWeight="bold" sx={{
          color: SOJORI_COLORS.primaryDark,
          fontSize: { xs: '0.95rem', sm: '1.1rem' }
        }}>
            ⏰ Monitoring Cron
          </Typography>
          <Chip label={lastRefresh.toLocaleTimeString('fr-FR')} size="small" sx={{
          height: 22,
          fontSize: '0.7rem',
          bgcolor: SOJORI_COLORS.primaryPale,
          color: SOJORI_COLORS.primaryDark
        }} />
          {nextExecution && <Chip icon={<ScheduleIcon sx={{
          fontSize: 14
        }} />} label={`Prochain: ${formatRelativeTime(nextExecution.nextCronRun)} (${nextExecution.eventsDueNextRun.length})`} size="small" sx={{
          height: 22,
          fontSize: '0.7rem',
          bgcolor: SOJORI_COLORS.info + '20',
          color: SOJORI_COLORS.info,
          display: { xs: 'none', sm: 'flex' }
        }} />}
        </Box>
        <Box sx={{
        display: 'flex',
        gap: 0.5
      }}>
          <Button onClick={handleForceExecuteAll} disabled={isExecutingAll} startIcon={isExecutingAll ? <CircularProgress size={16} /> : <PlayIcon />} size="small" variant="contained" sx={{
          bgcolor: SOJORI_COLORS.warning,
          color: '#fff',
          fontSize: '0.7rem',
          textTransform: 'none',
          fontWeight: 600,
          px: { xs: 1, sm: 2 },
          height: 32,
          display: { xs: 'none', md: 'flex' },
          '&:hover': {
            bgcolor: '#E68900'
          },
          '&:disabled': {
            bgcolor: SOJORI_COLORS.gray[300]
          }
        }}>
            {isExecutingAll ? 'Exécution...' : '🧪 Force Execute'}
          </Button>
          <IconButton onClick={handleRefresh} size="small" sx={{
          color: SOJORI_COLORS.primary
        }}>
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Filtres Compact Sticky - Style Reservations */}
      <Box sx={{
      mb: 1,
      p: { xs: 0.75, sm: 1 },
      bgcolor: '#fff',
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      border: `1px solid ${SOJORI_COLORS.gray[200]}`,
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
        <Box sx={{
        display: 'flex',
        gap: { xs: 0.5, sm: 1 },
        alignItems: 'center',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
      }}>
          {/* Ligne 1 : Filtres principaux */}
          <Box sx={{
          display: 'flex',
          gap: { xs: 0.5, sm: 1 },
          alignItems: 'center',
          flexWrap: 'wrap',
          flex: 1
        }}>
            <TextField select label="Période" value={period} onChange={e => setPeriod(e.target.value)} size="small" sx={{
            ...FILTER_FIELD_SX,
            minWidth: { xs: 200, sm: 280 },
            maxWidth: { xs: '100%', sm: 320 },
          }}>
              <ListSubheader disableSticky sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: '28px', bgcolor: SOJORI_COLORS.gray[100] }}>
                Dernier / prochain run
              </ListSubheader>
              <MenuItem value="dayview-last">Last run (1h audit)</MenuItem>
              <MenuItem value="dayview-next">Next run (6h plan STALE)</MenuItem>
              <ListSubheader disableSticky sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: '28px', bgcolor: SOJORI_COLORS.gray[100] }}>
                Aujourd&apos;hui
              </ListSubheader>
              <MenuItem value="dayview-today-audit">Passé seul (audit)</MenuItem>
              <MenuItem value="dayview-today-projection">Reste seul (plan)</MenuItem>
              <MenuItem value="dayview-today">Passé + reste (audit + plan)</MenuItem>
              <ListSubheader disableSticky sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: '28px', bgcolor: SOJORI_COLORS.gray[100] }}>
                Autres jours
              </ListSubheader>
              <MenuItem value="dayview-tomorrow">Demain (audit + plan)</MenuItem>
              <MenuItem value="dayview-after">Après-demain (audit + plan)</MenuItem>
              <MenuItem value="dayview-yesterday">Hier (audit + plan)</MenuItem>
              <ListSubheader disableSticky sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: '28px', bgcolor: SOJORI_COLORS.gray[100] }}>
                Calendrier
              </ListSubheader>
              <MenuItem value="dayview-custom-day">Jour au choix</MenuItem>
              <MenuItem value="dayview-custom-range">Intervalle (du → au)</MenuItem>
              <ListSubheader disableSticky sx={{ fontSize: '0.7rem', fontWeight: 700, lineHeight: '28px', bgcolor: SOJORI_COLORS.gray[100] }}>
                Liste
              </ListSubheader>
              <MenuItem value="next-7-days">7 prochains jours</MenuItem>
            </TextField>

            {(period === 'dayview-custom-day' || period === 'dayview-custom-range') && (
              <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap',  width: '100%' }}>
                {period === 'dayview-custom-day' && (
                  <TextField
                    label="Date"
                    type="date"
                    size="small"
                    value={customSingleDate}
                    onChange={e => setCustomSingleDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ ...FILTER_FIELD_SX, minWidth: 160 }}
                  />
                )}
                {period === 'dayview-custom-range' && (
                  <>
                    <TextField
                      label="Du"
                      type="date"
                      size="small"
                      value={customDateFrom}
                      onChange={e => setCustomDateFrom(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...FILTER_FIELD_SX, minWidth: 150 }}
                    />
                    <TextField
                      label="Au"
                      type="date"
                      size="small"
                      value={customDateTo}
                      onChange={e => setCustomDateTo(e.target.value)}
                      slotProps={{ htmlInput: { min: customDateFrom } }}
                      InputLabelProps={{ shrink: true }}
                      sx={{ ...FILTER_FIELD_SX, minWidth: 150 }}
                    />
                  </>
                )}
              </Stack>
            )}

            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center',  display: { xs: 'none', md: 'flex' } }}>
              {[
                { label: 'Hier', offset: -1 },
                { label: "Aujourd'hui", offset: 0 },
                { label: 'Demain', offset: 1 },
              ].map(({ label, offset }) => (
                <Button
                  key={label}
                  size="small"
                  variant="outlined"
                  onClick={() => applyQuickDay(offset)}
                  sx={{
                    minWidth: 'auto',
                    px: 1.25,
                    height: 32,
                    fontSize: '0.7rem',
                    textTransform: 'none',
                    borderColor: SOJORI_COLORS.gray[300],
                    color: SOJORI_COLORS.gray[700],
                    '&:hover': { borderColor: SOJORI_COLORS.primary, color: SOJORI_COLORS.primary },
                  }}
                >
                  {label}
                </Button>
              ))}
            </Stack>

            <TextField
              select
              label="Scénario"
              value={cronScenario}
              onChange={e => handleCronScenarioChange(e.target.value)}
              size="small"
              sx={{ ...FILTER_FIELD_SX, display: { xs: 'none', sm: 'block' } }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (v) => {
                  if (!v) {
                    return (
                      <Typography component="span" sx={{ color: SOJORI_COLORS.gray[600], fontSize: '0.875rem' }}>
                        Tous scénarios
                      </Typography>
                    );
                  }
                  return CRON_SCENARIO_PRESETS.find(p => p.id === v)?.label || v;
                },
              }}
            >
              {CRON_SCENARIO_PRESETS.map(p => <MenuItem key={p.id || 'all'} value={p.id}>
                  {p.label}
                </MenuItem>)}
            </TextField>

            <TextField select label="Catégorie" value={category} onChange={e => {
            setCategory(e.target.value);
            setCronScenario('');
          }} size="small" sx={{ ...FILTER_FIELD_SX, display: { xs: 'none', md: 'block' } }}
          SelectProps={{
            displayEmpty: true,
            renderValue: renderEmptySelectValue('Toutes catégories'),
          }}>
              <MenuItem value="">Toutes catégories</MenuItem>
              <MenuItem value="DECLARATION_REGISTRATION">REGISTRATION</MenuItem>
              <MenuItem value="CHOICE_ARRIVAL">CHOICE_ARRIVAL</MenuItem>
              <MenuItem value="DECLARATION_ARRIVAL">DECL_ARRIVAL</MenuItem>
              <MenuItem value="CHOICE_DEPARTURE">CHOICE_DEPARTURE</MenuItem>
              <MenuItem value="DECLARATION_DEPARTURE">DECL_DEPARTURE</MenuItem>
              <MenuItem value="arrival_choose">arrival_choose</MenuItem>
              <MenuItem value="arrival_declare">arrival_declare</MenuItem>
              <MenuItem value="departure_choose">departure_choose</MenuItem>
              <MenuItem value="departure_declare">departure_declare</MenuItem>
            </TextField>

            <TextField select label="Statut" value={status} onChange={e => setStatus(e.target.value)} size="small" sx={FILTER_FIELD_SX}
          SelectProps={{
            displayEmpty: true,
            renderValue: renderEmptySelectValue('Tous statuts'),
          }}>
              <MenuItem value="">Tous statuts</MenuItem>
              <MenuItem value="pending">⏳ Pending</MenuItem>
              <MenuItem value="executed">✅ Executed</MenuItem>
              <MenuItem value="skipped">⏭️ Skipped</MenuItem>
              <MenuItem value="failed">❌ Failed</MenuItem>
            </TextField>

            <TextField select label="Source" value={executionSource} onChange={e => setExecutionSource(e.target.value)} size="small" sx={FILTER_FIELD_SX}
          SelectProps={{
            displayEmpty: true,
            renderValue: renderEmptySelectValue('Toutes sources'),
          }}>
              <MenuItem value="">Toutes sources</MenuItem>
              <MenuItem value="manual">⚡ Dashboard (manuel / forcé)</MenuItem>
              <MenuItem value="cron">⏰ Cron automatique</MenuItem>
            </TextField>

            <TextField select label="Action" value={action} onChange={e => {
            setAction(e.target.value);
            setCronScenario('');
          }} size="small" sx={{ ...FILTER_FIELD_SX, display: { xs: 'none', lg: 'block' } }}
          SelectProps={{
            displayEmpty: true,
            renderValue: renderEmptySelectValue('Toutes actions'),
          }}>
              <MenuItem value="">Toutes actions</MenuItem>
              <MenuItem value="send_message">💬 Message</MenuItem>
              <MenuItem value="send_notification">📢 Notif</MenuItem>
              <MenuItem value="assign_staff">👤 Staff</MenuItem>
              <MenuItem value="execute_deadline">⏰ Deadline</MenuItem>
            </TextField>

            <TextField label="Réservation" placeholder="SJ-XXX" value={reservationNumber} onChange={e => setReservationNumber(e.target.value)} size="small" sx={FILTER_FIELD_SX}
          InputLabelProps={{ shrink: true }} />

            <IconButton onClick={handleClearFilters} size="small" sx={{
            color: SOJORI_COLORS.error,
            border: `1px solid ${SOJORI_COLORS.error}`,
            borderRadius: 1
          }} title="Reset filtres">
              <ClearIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* KPI + Pagination */}
          <Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap'
        }}>
            {inDayView && dayViewData?.counts && <>
                {showDayViewAuditPanel && <Chip label={`Audit ${dayViewData.counts.audit}`} size="small" sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              bgcolor: SOJORI_COLORS.success + '18',
              color: SOJORI_COLORS.success
            }} />}
                {showDayViewProjectionPanel && <Chip label={`Plan ${dayViewData.counts.projection}`} size="small" sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              bgcolor: SOJORI_COLORS.purple + '18',
              color: SOJORI_COLORS.purple
            }} />}
                <Chip label={dayViewFilteredChipLabel} size="small" sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              bgcolor: SOJORI_COLORS.gray[200],
              color: SOJORI_COLORS.gray[700]
            }} />
                {manualAuditCount > 0 && <Chip label={`⚡ ${manualAuditCount} dashboard`} size="small" sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              bgcolor: SOJORI_COLORS.warning + '28',
              color: SOJORI_COLORS.primaryDark
            }} />}
              </>}
            {!inDayView && stats && <>
                <Chip icon={<SendIcon sx={{
              fontSize: 12
            }} />} label={stats.byAction.send_message} size="small" sx={{
              height: 24,
              bgcolor: SOJORI_COLORS.info + '20',
              color: SOJORI_COLORS.info,
              fontWeight: 'bold',
              fontSize: '0.7rem',
              display: { xs: 'none', md: 'flex' }
            }} />
                <Chip icon={<NotificationIcon sx={{
              fontSize: 12
            }} />} label={stats.byAction.send_notification} size="small" sx={{
              height: 24,
              bgcolor: SOJORI_COLORS.purple + '20',
              color: SOJORI_COLORS.purple,
              fontWeight: 'bold',
              fontSize: '0.7rem',
              display: { xs: 'none', md: 'flex' }
            }} />
                <Chip label={`${filteredEvents.length} résultats`} size="small" sx={{
              height: 24,
              fontSize: '0.7rem',
              fontWeight: 'bold',
              bgcolor: SOJORI_COLORS.gray[200],
              color: SOJORI_COLORS.gray[700]
            }} />
              </>}
            {!inDayView && <TablePagination component="div" count={filteredEvents.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[100, 200, 300]} labelRowsPerPage="" labelDisplayedRows={({
            from,
            to,
            count
          }) => `${from}-${to}/${count}`} sx={{
            '& .MuiTablePagination-toolbar': {
              minHeight: 28,
              padding: '0 4px'
            },
            '& .MuiTablePagination-displayedRows': {
              fontSize: 11,
              margin: 0,
              color: SOJORI_COLORS.primary,
              fontWeight: 'bold'
            },
            '& .MuiTablePagination-select': {
              fontSize: 11,
              color: SOJORI_COLORS.primary,
              fontWeight: 'bold'
            },
            '& .MuiIconButton-root': {
              padding: '4px',
              color: SOJORI_COLORS.primary
            }
          }} />}
          </Box>
        </Box>
      </Box>

      {/* Tableau avec Scroll Orange Sojori */}
      {isLoadingEvents ? <Box sx={{
      display: 'flex',
      justifyContent: 'center',
      p: 4,
      bgcolor: '#fff',
      borderRadius: 2
    }}>
          <CircularProgress sx={{
        color: SOJORI_COLORS.primary
      }} />
        </Box> : inDayView ? !dayViewData ? <Alert severity="warning" sx={{
      borderRadius: 2
    }}>
            Impossible de charger la vue jour. Vérifiez l&apos;API /cron/day-view.
          </Alert> : <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      gap: 2
    }}>
            {/* Panel Audit (Vert) */}
            {showDayViewAuditPanel && <Paper variant="outlined" sx={{
        borderRadius: 2,
        borderLeft: `4px solid ${SOJORI_COLORS.success}`,
        overflow: 'hidden'
      }}>
              <Box sx={{
          p: 1,
          bgcolor: SOJORI_COLORS.success + '08'
        }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{
            color: SOJORI_COLORS.success,
            mb: 0.25
          }}>
                  ✅ Réalisé (audit MessageLog)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {dayViewData.windows?.audit?.label}
                </Typography>
              </Box>
              {dayViewAuditRows.length === 0 ? <Box sx={{
          p: 2
        }}><Alert severity="info" sx={{
            py: 0.5
          }}>Aucune ligne audit pour cette fenêtre.</Alert></Box> : <TableContainer sx={{
          maxHeight: 'min(400px, 50vh)',
          // ✅ Scroll orange Sojori
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: SOJORI_COLORS.gray[100]
          },
          '&::-webkit-scrollbar-thumb': {
            background: SOJORI_COLORS.primary,
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: SOJORI_COLORS.primaryDark
          }
        }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Réservation</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Action</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Intention</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Cat.</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Programmé</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Statut</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.success,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Source</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dayViewAuditRows.map(event => <TableRow key={event._id} sx={{
                bgcolor: isManualExecution(event) ? SOJORI_COLORS.warning + '12' : undefined,
              }}>
                          <TableCell>
                            <Typography variant="caption" fontWeight="bold">{event.reservationNumber}</Typography>
                            {event.guestName && <Typography variant="caption" display="block" sx={{
                    color: SOJORI_COLORS.gray[600]
                  }}>{event.guestName}</Typography>}
                          </TableCell>
                          <TableCell>
                            <Chip icon={getActionIcon(event.action)} label={(event.action || '').replace(/_/g, ' ')} size="small" sx={{
                    height: 20,
                    fontSize: '0.65rem'
                  }} />
                          </TableCell>
                          <TableCell sx={{
                  maxWidth: 180
                }}>
                            <Typography variant="caption" sx={{
                    fontSize: '0.7rem'
                  }}>{describeCronIntent(event)}</Typography>
                          </TableCell>
                          <TableCell><Typography variant="caption" sx={{
                  fontSize: '0.7rem'
                }}>{getCategoryLabel(event.category)}</Typography></TableCell>
                          <TableCell><Typography variant="caption" sx={{
                  fontSize: '0.7rem'
                }}>{formatTime(event.scheduledFor)}</Typography></TableCell>
                          <TableCell>
                            <Chip label={event.status} size="small" sx={{
                    height: 20,
                    fontSize: '0.65rem'
                  }} />
                          </TableCell>
                          <TableCell>
                            <ExecutionSourceChip event={event} />
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </TableContainer>}
            </Paper>}

            {/* Panel Projection (Violet) */}
            {showDayViewProjectionPanel && <Paper variant="outlined" sx={{
        borderRadius: 2,
        borderLeft: `4px solid ${SOJORI_COLORS.purple}`,
        overflow: 'hidden'
      }}>
              <Box sx={{
          p: 1,
          bgcolor: SOJORI_COLORS.purple + '08'
        }}>
                <Typography variant="subtitle2" fontWeight="bold" sx={{
            color: SOJORI_COLORS.purple,
            mb: 0.25
          }}>
                  🔮 À venir (projection plan)
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{
            display: 'block'
          }}>
                  {dayViewData.windows?.projection?.label}
                </Typography>
                {period === 'dayview-next' && (
                  <Typography variant="caption" color="text.secondary" sx={{
                    display: 'block',
                    fontStyle: 'italic',
                    mt: 0.25
                  }}>
                    ⚠️ Fenêtre STALE 6h : seules les lignes dont l&apos;heure tombe dans les 6h avant le prochain cron
                  </Typography>
                )}
              </Box>
              {dayViewProjRows.length === 0 ? <Box sx={{
          p: 2
        }}><Alert severity="info" sx={{
            py: 0.5
          }}>
            Aucun créneau <strong>pending</strong> dans le plan pour cette journée (Casablanca).
            Les relances déjà exécutées sont dans l&apos;audit ; les prochaines dates peuvent être demain ou plus tard — essayez « Demain » ou « 7 prochains jours ».
          </Alert></Box> : <TableContainer sx={{
          maxHeight: 'min(400px, 50vh)',
          // ✅ Scroll orange Sojori
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px'
          },
          '&::-webkit-scrollbar-track': {
            background: SOJORI_COLORS.gray[100]
          },
          '&::-webkit-scrollbar-thumb': {
            background: SOJORI_COLORS.primary,
            borderRadius: '4px'
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: SOJORI_COLORS.primaryDark
          }
        }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Réservation</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Action</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Intention</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Cat.</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>Prévu</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem'
                }}>IF</TableCell>
                        <TableCell sx={{
                  bgcolor: SOJORI_COLORS.purple,
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '0.8rem',
                  maxWidth: 60
                }} title="Condition IF_* satisfaite maintenant ?">
                  IF ok
                </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dayViewProjRows.map(row => {
                const apiA = mapProjectionKeyToAction(row.actionKey);
                const lbl = row.actionKey === 'requestTimeslot' ? 'request timeslot' : (apiA || row.actionKey || '').replace(/_/g, ' ');
                return <TableRow key={`${row.reservationCode}-${row.actionId}-${row.scheduledAt}-${row.attemptNumber ?? 0}`} sx={{
                  bgcolor: row.isOverdue ? SOJORI_COLORS.warning + '14' : undefined,
                }}>
                            <TableCell>
                              <Typography variant="caption" fontWeight="bold">{row.reservationCode}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip icon={getActionIcon(apiA || 'send_notification')} label={lbl} size="small" sx={{
                      height: 20,
                      fontSize: '0.65rem'
                    }} />
                            </TableCell>
                            <TableCell sx={{
                    maxWidth: 180
                  }}>
                              <Typography variant="caption" sx={{
                      fontSize: '0.7rem'
                    }}>{describeProjectionIntent(row)}</Typography>
                            </TableCell>
                            <TableCell><Typography variant="caption" sx={{
                    fontSize: '0.7rem'
                  }}>{getCategoryLabel(row.workflowCategory)}</Typography></TableCell>
                            <TableCell>
                              <Typography variant="caption" sx={{ fontSize: '0.7rem', display: 'block' }}>
                                {formatTime(row.scheduledAt)}
                              </Typography>
                              {row.isOverdue && (
                                <Chip label="En retard" size="small" sx={{
                                  mt: 0.25,
                                  height: 18,
                                  fontSize: '0.6rem',
                                  bgcolor: SOJORI_COLORS.error + '18',
                                  color: SOJORI_COLORS.error,
                                  fontWeight: 700,
                                }} />
                              )}
                            </TableCell>
                            <TableCell sx={{
                    maxWidth: 120
                  }}>
                              <Typography variant="caption" sx={{
                      fontSize: '0.65rem',
                      wordBreak: 'break-word'
                    }}>{row.condition || '—'}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={row.conditionMet ? 'oui' : 'non'} size="small" sx={{
                      height: 20,
                      fontSize: '0.65rem',
                      bgcolor: row.conditionMet ? SOJORI_COLORS.success + '22' : SOJORI_COLORS.gray[200],
                      color: row.conditionMet ? SOJORI_COLORS.success : SOJORI_COLORS.gray[700]
                    }} />
                            </TableCell>
                          </TableRow>;
              })}
                    </TableBody>
                  </Table>
                </TableContainer>}
            </Paper>}
          </Box> : filteredEvents.length === 0 ? <Alert severity="info" sx={{
      borderRadius: 2
    }}>
          Aucun événement trouvé pour ces filtres
        </Alert> : <Box sx={{
      bgcolor: '#fff',
      borderRadius: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    }}>
          <TableContainer sx={{
        maxHeight: 'calc(100vh - 240px)',
        // ✅ Scroll orange Sojori
        '&::-webkit-scrollbar': {
          width: '10px',
          height: '10px'
        },
        '&::-webkit-scrollbar-track': {
          background: SOJORI_COLORS.gray[100]
        },
        '&::-webkit-scrollbar-thumb': {
          background: SOJORI_COLORS.primary,
          borderRadius: '5px'
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: SOJORI_COLORS.primaryDark
        }
      }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  {/* Sticky First Column - Réservation */}
                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.reservation,
                minWidth: columnWidths.reservation,
                padding: '4px 8px',
                fontSize: '0.85rem',
                position: 'sticky',
                left: 0,
                zIndex: 1100,
                boxShadow: '2px 0 4px rgba(0,0,0,0.1)',
                cursor: 'pointer'
              }} onClick={() => handleRequestSort('reservationNumber')}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                      Réservation
                      <TableSortLabel active={orderBy === 'reservationNumber'} direction={orderBy === 'reservationNumber' ? order : 'asc'} sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'white !important'
                    },
                    color: 'white'
                  }} />
                    </Box>
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.action,
                padding: '4px 8px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }} onClick={() => handleRequestSort('action')}>
                    Action
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.intent,
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Intention
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.category,
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Catégorie
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.scheduled,
                padding: '4px 8px',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }} onClick={() => handleRequestSort('scheduledFor')}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                      Programmé
                      <TableSortLabel active={orderBy === 'scheduledFor'} direction={orderBy === 'scheduledFor' ? order : 'asc'} sx={{
                    '& .MuiTableSortLabel-icon': {
                      color: 'white !important'
                    },
                    color: 'white'
                  }} />
                    </Box>
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.relative,
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Relatif
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: columnWidths.status,
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Statut
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: '130px',
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Source
                  </TableCell>

                  <TableCell sx={{
                backgroundColor: SOJORI_COLORS.primary,
                color: 'white',
                fontWeight: 'bold',
                width: '80px',
                padding: '4px 8px',
                fontSize: '0.85rem'
              }}>
                    Retry
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {paginatedEvents.map(event => {
              const manualRow = isManualExecution(event);
              const rowBg = event.status === 'failed'
                ? 'rgba(244, 67, 54, 0.04)'
                : manualRow
                  ? SOJORI_COLORS.warning + '18'
                  : 'rgba(255, 107, 53, 0.012)';
              return <TableRow key={event._id} sx={{
                backgroundColor: rowBg,
                '&:hover': {
                  bgcolor: event.status === 'failed' ? 'rgba(244, 67, 54, 0.08)' : manualRow ? SOJORI_COLORS.warning + '28' : 'rgba(255, 107, 53, 0.03)'
                }
              }}>
                      {/* Sticky First Column */}
                      <TableCell sx={{
                  width: columnWidths.reservation,
                  padding: '2px 6px',
                  position: 'sticky',
                  left: 0,
                  backgroundColor: rowBg,
                  zIndex: 100,
                  boxShadow: '2px 0 4px rgba(0,0,0,0.05)'
                }}>
                        <Typography variant="caption" fontWeight="bold" sx={{
                    color: SOJORI_COLORS.primaryDark
                  }}>
                          {event.reservationNumber}
                        </Typography>
                        {event.guestName && <Typography variant="caption" display="block" sx={{
                    color: SOJORI_COLORS.gray[600],
                    fontSize: '0.65rem'
                  }}>
                            {event.guestName}
                          </Typography>}
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Chip icon={getActionIcon(event.action)} label={event.action.replace('_', ' ')} size="small" sx={{
                    height: 20,
                    fontSize: '0.65rem'
                  }} />
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px',
                  maxWidth: columnWidths.intent
                }}>
                        <Typography variant="caption" sx={{
                    fontSize: '0.7rem',
                    lineHeight: 1.25
                  }}>
                          {describeCronIntent(event)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Typography variant="caption" sx={{
                    fontSize: '0.7rem'
                  }}>
                          {getCategoryLabel(event.category)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Typography variant="caption" sx={{
                    fontSize: '0.7rem'
                  }}>
                          {formatTime(event.scheduledFor)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Typography variant="caption" fontWeight="bold" sx={{
                    fontSize: '0.7rem',
                    color: formatRelativeTime(event.scheduledFor).includes('⚠️') ? SOJORI_COLORS.error : SOJORI_COLORS.success
                  }}>
                          {formatRelativeTime(event.scheduledFor)}
                        </Typography>
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Chip label={event.status} size="small" sx={{
                    height: 20,
                    fontSize: '0.65rem'
                  }} />
                      </TableCell>

                      <TableCell sx={{ padding: '2px 6px' }}>
                        <ExecutionSourceChip event={event} />
                      </TableCell>

                      <TableCell sx={{
                  padding: '2px 6px'
                }}>
                        <Typography variant="caption" sx={{
                    fontSize: '0.7rem'
                  }}>
                          {event.retryCount > 0 ? `${event.retryCount}x` : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>;
            })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Style Sojori */}
          <TablePagination component="div" count={filteredEvents.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[100, 200, 300]} labelRowsPerPage="Par page:" labelDisplayedRows={({
        from,
        to,
        count
      }) => `${from}-${to} sur ${count}`} sx={{
        borderTop: `1px solid ${SOJORI_COLORS.gray[200]}`,
        '.MuiTablePagination-toolbar': {
          minHeight: 40,
          padding: '0 12px'
        },
        '.MuiTablePagination-select': {
          color: SOJORI_COLORS.primary,
          fontWeight: 'bold'
        },
        '.MuiTablePagination-actions button': {
          color: SOJORI_COLORS.primary
        }
      }} />
        </Box>}

    </Box>;
};
export default CronMonitoringView;
