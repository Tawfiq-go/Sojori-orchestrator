/**
 * Vue équipe type admin Tasks ?tab=equipe (StaffViewPage) — grille staff × jours,
 * barre ops du jour, filtres propriété / type. Design tokens Dashboard V2.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import TodayIcon from '@mui/icons-material/Today';
import RefreshIcon from '@mui/icons-material/Refresh';
import { addDays, eachDayOfInterval, format, parseISO, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge, btnGhostSx, tokens as t } from '../dashboard/DashboardV2.components';
import { useAuth } from '../../hooks/useAuth';
import tasksService, { resolveTasksUserScope } from '../../services/tasksService';
import type { TaskListItem, TasksStaffMember } from '../../types/tasks.types';
import { TASK_STATUS_LABELS, normalizeTaskStatus } from '../../types/tasks.types';

const TASK_TYPE_FILTERS = [
  { key: 'arrival', label: 'Arrivée' },
  { key: 'departure', label: 'Départ' },
  { key: 'cleaning', label: 'Ménage' },
  { key: 'concierge', label: 'Concierge' },
  { key: 'support', label: 'Support' },
  { key: 'registration', label: 'Enreg.' },
] as const;

const CELL_W = 84;
const STICKY_W = 168;
const CELL_W_MOBILE = 44;
const STICKY_W_MOBILE = 72;
const CHIP_H = 18;
const CHIP_GAP = 4;
const TASK_Y = 8;
const CELL_PAD = 6;
const TODAY_STR = format(new Date(), 'yyyy-MM-dd');

export type StaffGridItem = TaskListItem & {
  scheduledFor?: string;
  /** Type normalisé pour couleur / filtre (minuscule). */
  viewType: string;
};

function normalizeTaskForStaffGrid(task: TaskListItem): StaffGridItem {
  const viewType = String(task.subType || task.type || task.itemType || '').toLowerCase();
  return {
    ...task,
    scheduledFor: task.startDate,
    viewType,
  };
}

function itemMatchesTypeKeys(item: StaffGridItem, keys: string[]): boolean {
  if (!keys.length) return true;
  const s = `${item.viewType} ${String(item.itemType || '').toLowerCase()} ${String(taskNameBlob(item)).toLowerCase()}`;
  return keys.some((key) => {
    switch (key) {
      case 'arrival':
        return s.includes('arrival') || s.includes('arriv');
      case 'departure':
        return s.includes('departure') || s.includes('départ') || s.includes('depart');
      case 'cleaning':
        return s.includes('cleaning') || s.includes('clean') || s.includes('menage') || s.includes('ménage');
      case 'concierge':
        return s.includes('concierge');
      case 'support':
        return s.includes('support');
      case 'registration':
        return (
          s.includes('registration') || s.includes('enregistrement') || s.includes('guest_reg')
        );
      default:
        return false;
    }
  });
}

function taskNameBlob(task: TaskListItem): string {
  return task.name || '';
}

const TASK_COLORS: Record<
  string,
  { bg: string; border: string; text: string; icon: string }
> = {
  arrival: { bg: t.successTint, border: 'rgba(10,143,94,0.35)', text: t.success, icon: '🏠' },
  departure: { bg: t.errorTint, border: 'rgba(200,30,30,0.35)', text: t.error, icon: '🚪' },
  cleaning: { bg: t.warningTint, border: 'rgba(196,101,6,0.35)', text: t.warning, icon: '🧹' },
  registration: { bg: t.infoTint, border: 'rgba(6,115,179,0.35)', text: t.info, icon: '📝' },
  transport: { bg: 'rgba(6,115,179,0.08)', border: 'rgba(6,115,179,0.25)', text: t.info, icon: '🚗' },
  grocery: { bg: t.successTint, border: 'rgba(10,143,94,0.25)', text: t.success, icon: '🛒' },
  groceries: { bg: t.successTint, border: 'rgba(10,143,94,0.25)', text: t.success, icon: '🛒' },
  concierge: { bg: t.aiTint, border: 'rgba(124,58,237,0.3)', text: t.ai, icon: '🛎️' },
  support: { bg: 'rgba(124,58,237,0.06)', border: 'rgba(124,58,237,0.22)', text: t.ai, icon: '🆘' },
  task: { bg: t.successTint, border: 'rgba(10,143,94,0.3)', text: t.success, icon: '✅' },
  default: { bg: t.bg2, border: t.borderStrong, text: t.text2, icon: '📋' },
};

function getTaskColorKey(item: StaffGridItem): string {
  const type = item.viewType;
  const sub = String(item.subType || '').toLowerCase();
  const grp = String((item as { conciergeGroupingKey?: string }).conciergeGroupingKey || '').toLowerCase();
  if (type === 'arrival') return 'arrival';
  if (type === 'departure') return 'departure';
  if (type === 'cleaning' || sub.includes('clean') || sub.includes('ménage')) return 'cleaning';
  if (type === 'registration') return 'registration';
  if (type === 'transport') return 'transport';
  if (type === 'groceries' || type === 'grocery') return 'grocery';
  if (grp === 'concierge' || type.includes('concierge')) return 'concierge';
  if (type.includes('support')) return 'support';
  if (String(item.itemType || '').toLowerCase() === 'task') return 'task';
  return 'default';
}

function taskColor(item: StaffGridItem) {
  return TASK_COLORS[getTaskColorKey(item)] || TASK_COLORS.default;
}

function taskLabel(item: StaffGridItem): string {
  const type = item.viewType;
  if (type === 'arrival') return 'Arrivée';
  if (type === 'departure') return 'Départ';
  if (type === 'cleaning') return 'Ménage';
  if (type === 'registration') return 'Enregistrement';
  if (item.name) return item.name.length > 22 ? `${item.name.slice(0, 20)}…` : item.name;
  return type || '…';
}

function isUnassignedItem(item: StaffGridItem): boolean {
  const hasStaff = !!(item.staffCode || item.staffId);
  const st = normalizeTaskStatus(item.taskStatus);
  return !hasStaff && st !== 'COMPLETED';
}

function dayKeyForItem(item: StaffGridItem): string | null {
  const d = item.scheduledFor || item.startDate;
  if (!d) return null;
  try {
    return format(new Date(d), 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

function itemsForStaffDay(items: StaffGridItem[], dayStr: string): StaffGridItem[] {
  return (items || []).filter((item) => dayKeyForItem(item) === dayStr);
}

function computeRowH(maxTasksPerDay: number): number {
  if (maxTasksPerDay === 0) return Math.round((TASK_Y + CELL_PAD) * 1.25);
  const visibleLines = Math.min(maxTasksPerDay, 2);
  const badgeLine = maxTasksPerDay > 2 ? CHIP_H + CHIP_GAP : 0;
  return TASK_Y + visibleLines * (CHIP_H + CHIP_GAP) + badgeLine + CELL_PAD;
}

interface StaffRowModel {
  id: string;
  name: string;
  code: string | null;
  memberRole: string | null;
  items: StaffGridItem[];
}

interface DayModel {
  date: Date;
  dateStr: string;
  label: string;
  month: string;
  weekday: string;
  isToday: boolean;
  isWeekend: boolean;
}

export function StaffTeamPlanningView() {
  const theme = useTheme();
  const isMdDown = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const scope = useMemo(() => resolveTasksUserScope(user), [user]);

  const [currentStartDate, setCurrentStartDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [staff, setStaff] = useState<TasksStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<StaffGridItem | null>(null);
  const [listingAnchor, setListingAnchor] = useState<HTMLElement | null>(null);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [selectedTaskTypeKeys, setSelectedTaskTypeKeys] = useState<string[]>([]);
  const [overflowState, setOverflowState] = useState<{
    tasks: StaffGridItem[];
    staffName: string;
    anchor: HTMLElement | null;
  } | null>(null);

  const startDate = format(currentStartDate, 'yyyy-MM-dd');
  const endDate = format(addDays(currentStartDate, 29), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!scope.canAccessAllOwners && !scope.ownerId) {
        throw new Error('Impossible de déterminer le ownerId de la session.');
      }
      const [tasksResult, staffResult] = await Promise.all([
        tasksService.getTasks({
          ownerId: scope.ownerId,
          limit: 500,
          page: 0,
          dateType: 'startDate',
          dateStart: startDate,
          dateEnd: endDate,
          sortField: 'startDate',
          sortDirection: 'asc',
        }),
        tasksService.getStaff({ ownerId: scope.ownerId, limit: 500 }),
      ]);
      setTasks(tasksResult.tasks);
      setStaff(staffResult.staff);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [scope.canAccessAllOwners, scope.ownerId, startDate, endDate]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const normalized = useMemo(() => tasks.map(normalizeTaskForStaffGrid), [tasks]);

  const listingOptions = useMemo(() => {
    const m = new Map<string, string>();
    normalized.forEach((i) => {
      const id = i.listingId;
      if (!id) return;
      const sid = String(id);
      if (!m.has(sid)) m.set(sid, i.listingName || 'Propriété');
    });
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  }, [normalized]);

  const filteredItems = useMemo(() => {
    let list = normalized;
    if (selectedListingIds.length > 0) {
      list = list.filter((i) => {
        const id = i.listingId ? String(i.listingId) : '';
        return id && selectedListingIds.includes(id);
      });
    }
    if (selectedTaskTypeKeys.length > 0) {
      list = list.filter((i) => itemMatchesTypeKeys(i, selectedTaskTypeKeys));
    }
    return list;
  }, [normalized, selectedListingIds, selectedTaskTypeKeys]);

  const activeStaffFiltersCount =
    (selectedListingIds.length > 0 ? 1 : 0) + (selectedTaskTypeKeys.length > 0 ? 1 : 0);

  const { rows, days, todayStats } = useMemo(() => {
    const staffCodeToName: Record<string, string> = {};
    const staffCodeToRole: Record<string, string> = {};
    staff.forEach((s) => {
      const nom = s.username || s.email || '';
      if (s.staffCode) {
        staffCodeToName[s.staffCode] = nom;
        staffCodeToRole[s.staffCode] = s.memberRole || 'Staff';
      }
      if (s._id) {
        staffCodeToName[String(s._id)] = nom || staffCodeToName[s.staffCode || ''] || '';
        staffCodeToRole[String(s._id)] = s.memberRole || 'Staff';
      }
    });

    const byStaff: Record<string, StaffRowModel> = {
      UNASSIGNED: {
        id: 'UNASSIGNED',
        name: 'Tâches non assignées',
        code: null,
        memberRole: null,
        items: [],
      },
    };

    staff.forEach((s) => {
      const code = s.staffCode || s._id;
      if (!code) return;
      const key = String(code);
      byStaff[key] = {
        id: key,
        name: s.username || s.email || 'Staff',
        code: s.staffCode || null,
        memberRole: s.memberRole || 'Staff',
        items: [],
      };
    });

    filteredItems.forEach((item) => {
      if (!item.staffCode && !item.staffId) {
        byStaff.UNASSIGNED.items.push(item);
      } else {
        const staffKey = String(item.staffCode || item.staffId);
        const nom = staffCodeToName[staffKey] || item.staffName || 'Staff';
        const role = staffCodeToRole[staffKey] || 'Staff';
        if (!byStaff[staffKey]) {
          byStaff[staffKey] = {
            id: staffKey,
            name: nom,
            code: item.staffCode || staffKey,
            memberRole: role,
            items: [],
          };
        }
        byStaff[staffKey].items.push(item);
      }
    });

    const rowList: StaffRowModel[] = [
      byStaff.UNASSIGNED,
      ...Object.values(byStaff)
        .filter((r) => r.id !== 'UNASSIGNED')
        .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')),
    ];

    const daysBuilt: DayModel[] = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).map((d) => ({
      date: d,
      dateStr: format(d, 'yyyy-MM-dd'),
      label: format(d, 'd'),
      month: format(d, 'MMM', { locale: fr }),
      weekday: format(d, 'EEE', { locale: fr }),
      isToday: format(d, 'yyyy-MM-dd') === TODAY_STR,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
    }));

    const todayStr = TODAY_STR;
    const allItemsForToday = normalized.filter((i) => dayKeyForItem(i) === todayStr);
    const todayStatsLocal = {
      arrivals: allItemsForToday.filter((i) => i.viewType === 'arrival'),
      departures: allItemsForToday.filter((i) => i.viewType === 'departure'),
      cleans: allItemsForToday.filter((i) => i.viewType === 'cleaning'),
      unassigned: allItemsForToday.filter((i) => isUnassignedItem(i)).length,
    };

    return { rows: rowList, days: daysBuilt, todayStats: todayStatsLocal };
  }, [filteredItems, normalized, staff, startDate, endDate]);

  const goToToday = () => setCurrentStartDate(new Date());
  const goToPreviousDay = () => setCurrentStartDate((d) => subDays(d, 1));
  const goToNextDay = () => setCurrentStartDate((d) => addDays(d, 1));
  const goToPreviousWeek = () => setCurrentStartDate((d) => subDays(d, 7));
  const goToNextWeek = () => setCurrentStartDate((d) => addDays(d, 7));

  const cellWidth = isMdDown ? CELL_W_MOBILE : CELL_W;
  const stickyWidth = isMdDown ? STICKY_W_MOBILE : STICKY_W;
  const gridW = stickyWidth + days.length * cellWidth;

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const syncing = useRef(false);

  useLayoutEffect(() => {
    const hdr = headerRef.current;
    const bdy = bodyRef.current;
    if (!hdr || !bdy) return;
    const fromBody = () => {
      if (syncing.current) return;
      syncing.current = true;
      hdr.scrollLeft = bdy.scrollLeft;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };
    const fromHeader = () => {
      if (syncing.current) return;
      syncing.current = true;
      bdy.scrollLeft = hdr.scrollLeft;
      requestAnimationFrame(() => {
        syncing.current = false;
      });
    };
    bdy.addEventListener('scroll', fromBody, { passive: true });
    hdr.addEventListener('scroll', fromHeader, { passive: true });
    return () => {
      bdy.removeEventListener('scroll', fromBody);
      hdr.removeEventListener('scroll', fromHeader);
    };
  }, [days.length, cellWidth, stickyWidth]);

  const scrollToToday = useCallback(() => {
    const idx = days.findIndex((d) => d.isToday);
    if (idx >= 0 && bodyRef.current) {
      const x = Math.max(0, idx * cellWidth - 160);
      bodyRef.current.scrollLeft = x;
      if (headerRef.current) headerRef.current.scrollLeft = x;
    }
  }, [days, cellWidth]);

  const handleTodayClick = () => {
    goToToday();
    requestAnimationFrame(scrollToToday);
  };

  const toggleListing = (id: string) => {
    setSelectedListingIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleTaskType = (key: string) => {
    setSelectedTaskTypeKeys((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    );
  };

  const resetStaffFilters = () => {
    setSelectedListingIds([]);
    setSelectedTaskTypeKeys([]);
  };

  const todayLabel = format(new Date(), 'EEE d MMMM', { locale: fr });

  if (loading && !tasks.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: 8, gap: 2 }}>
        <CircularProgress size={36} sx={{ color: t.primary }} />
        <Typography sx={{ fontSize: 13, color: t.text3 }}>Chargement du planning équipe…</Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={1.5}>
      {!loading && rows.length > 0 ? (
        <Box
          sx={{
            bgcolor: t.bg1,
            border: `1px solid ${t.border}`,
            borderRadius: 2,
            p: 1.25,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 1.5,
            flexWrap: 'wrap',
            boxShadow: '0 1px 4px rgba(20,17,10,0.06)',
          }}
        >
          <Box sx={{ flexShrink: 0 }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase' }}>
              Aujourd&apos;hui
            </Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text, textTransform: 'capitalize' }}>
              {todayLabel}
            </Typography>
          </Box>
          <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
          <Box sx={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
            <MiniKpi icon="🏠" label="Arrivées" value={todayStats.arrivals.length} tone="success" />
            <MiniKpi icon="🚪" label="Départs" value={todayStats.departures.length} tone="error" />
            <MiniKpi icon="🧹" label="Ménages" value={todayStats.cleans.length} tone="warning" />
            <MiniKpi
              icon="⚠️"
              label="Non assignés"
              value={todayStats.unassigned}
              tone={todayStats.unassigned > 0 ? 'alert' : 'neutral'}
            />
          </Box>
        </Box>
      ) : null}

      {error ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            border: `1px solid ${t.error}`,
            bgcolor: t.errorTint,
            color: t.error,
            fontSize: 13,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Typography sx={{ flex: 1 }}>{error}</Typography>
          <Button size="small" sx={btnGhostSx} onClick={() => void loadData()}>
            Réessayer
          </Button>
        </Box>
      ) : null}

      <Box
        sx={{
          bgcolor: t.bg1,
          border: `1px solid ${t.border}`,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 1px 6px rgba(20,17,10,0.06)',
        }}
      >
        <Box
          sx={{
            px: 1.25,
            py: 1,
            borderBottom: `1px solid ${t.border}`,
            bgcolor: t.bg2,
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text2, whiteSpace: 'nowrap' }}>
            {format(parseISO(startDate), 'd MMM', { locale: fr })} →{' '}
            {format(parseISO(endDate), 'd MMM yy', { locale: fr })}
          </Typography>
          <Divider orientation="vertical" flexItem sx={{ height: 22 }} />
          <IconButton size="small" onClick={goToPreviousWeek} title="−7 jours" sx={{ border: `1px solid ${t.border}` }}>
            <FirstPageIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" onClick={goToPreviousDay} title="−1 jour" sx={{ border: `1px solid ${t.border}` }}>
            <ChevronLeftIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Button
            size="small"
            variant="contained"
            onClick={handleTodayClick}
            startIcon={<TodayIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              fontSize: 11,
              bgcolor: t.primary,
              boxShadow: 'none',
              '&:hover': { bgcolor: t.primaryDeep, boxShadow: 'none' },
            }}
          >
            Auj.
          </Button>
          <IconButton size="small" onClick={goToNextDay} title="+1 jour" sx={{ border: `1px solid ${t.border}` }}>
            <ChevronRightIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton size="small" onClick={goToNextWeek} title="+7 jours" sx={{ border: `1px solid ${t.border}` }}>
            <LastPageIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <IconButton
            size="small"
            title="Recharger"
            onClick={() => void loadData()}
            sx={{ border: `1px solid ${t.border}`, bgcolor: t.bg1 }}
          >
            <RefreshIcon sx={{ fontSize: 18, color: t.primaryDeep }} />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ height: 22, display: { xs: 'none', sm: 'block' } }} />

          <Button
            size="small"
            onClick={(e) => setListingAnchor(e.currentTarget)}
            sx={{
              ...btnGhostSx,
              borderColor: selectedListingIds.length ? t.primary : t.border,
              color: selectedListingIds.length ? t.primaryDeep : t.text2,
              bgcolor: selectedListingIds.length ? t.primaryTint : t.bg1,
            }}
          >
            🏠 {selectedListingIds.length ? `${selectedListingIds.length} prop.` : 'Propriétés'} ▾
          </Button>
          <Popover
            open={Boolean(listingAnchor)}
            anchorEl={listingAnchor}
            onClose={() => setListingAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          >
            <Box sx={{ p: 1.5, minWidth: 240, maxHeight: 280, overflowY: 'auto' }}>
              {listingOptions.length === 0 ? (
                <Typography sx={{ fontSize: 12, color: t.text3 }}>Aucune propriété sur cette période</Typography>
              ) : (
                listingOptions.map(({ id, name }) => (
                  <FormControlLabel
                    key={id}
                    sx={{ display: 'flex', ml: 0, py: 0.25 }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selectedListingIds.includes(id)}
                        onChange={() => toggleListing(id)}
                      />
                    }
                    label={<Typography sx={{ fontSize: 12 }}>🏠 {name}</Typography>}
                  />
                ))
              )}
              <Box sx={{ display: 'flex', flexDirection: 'row', gap: 1, mt: 1 }}>
                <Button size="small" fullWidth sx={btnGhostSx} onClick={() => setSelectedListingIds([])}>
                  Tout
                </Button>
                <Button size="small" fullWidth variant="contained" onClick={() => setListingAnchor(null)}>
                  OK
                </Button>
              </Box>
            </Box>
          </Popover>

          {TASK_TYPE_FILTERS.map(({ key, label }) => {
            const sel = selectedTaskTypeKeys.includes(key);
            return (
              <Chip
                key={key}
                label={label}
                size="small"
                onClick={() => toggleTaskType(key)}
                sx={{
                  height: 24,
                  fontWeight: 700,
                  fontSize: 10,
                  bgcolor: sel ? t.primaryTint : t.bg1,
                  border: `1px solid ${sel ? t.primary : t.border}`,
                  color: sel ? t.primaryDeep : t.text2,
                }}
              />
            );
          })}
          {activeStaffFiltersCount > 0 ? (
            <Button size="small" sx={{ ...btnGhostSx, fontSize: 10 }} onClick={resetStaffFilters}>
              Réinit. filtres
            </Button>
          ) : null}
          {activeStaffFiltersCount > 0 ? (
            <Chip size="small" label={`${activeStaffFiltersCount} filtre(s)`} sx={{ height: 22, fontSize: 10 }} />
          ) : null}
        </Box>

        <Box ref={headerRef} sx={{ overflow: 'hidden', borderBottom: `2px solid ${t.borderStrong}` }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `${stickyWidth}px repeat(${days.length}, ${cellWidth}px)`,
              minWidth: gridW,
              bgcolor: t.bg0,
            }}
          >
            <Box
              sx={{
                height: 44,
                position: 'sticky',
                left: 0,
                zIndex: 5,
                px: 1,
                display: 'flex',
                alignItems: 'center',
                fontWeight: 800,
                fontSize: 11,
                color: '#fff',
                background: `linear-gradient(135deg, ${t.primary} 0%, ${t.primaryDeep} 100%)`,
                borderRight: `2px solid ${t.borderStrong}`,
              }}
            >
              Staff
            </Box>
            {days.map((day) => (
              <Box
                key={day.dateStr}
                sx={{
                  height: 44,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 0.25,
                  px: 0.5,
                  bgcolor: day.isToday ? t.infoTint : day.isWeekend ? t.warningTint : t.bg0,
                  borderRight: `1px solid ${t.border}`,
                  borderBottom: day.isToday ? `3px solid ${t.primary}` : '3px solid transparent',
                }}
              >
                <Typography
                  sx={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: day.isToday ? t.info : day.isWeekend ? t.warning : t.text3,
                    textAlign: 'center',
                    lineHeight: 1.15,
                    textTransform: 'capitalize',
                  }}
                >
                  {day.weekday} {day.label} {day.month}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        <Box
          ref={bodyRef}
          sx={{
            overflowX: 'auto',
            scrollbarWidth: 'thin',
          }}
        >
          <Box sx={{ minWidth: gridW }}>
            {rows.length === 0 ? (
              <Typography sx={{ p: 4, textAlign: 'center', color: t.text3 }}>
                Aucun staff ou tâche pour cette période
              </Typography>
            ) : (
              rows.map((row) => (
                <StaffGridRow
                  key={row.id}
                  row={row}
                  days={days}
                  cellWidth={cellWidth}
                  stickyWidth={stickyWidth}
                  onTaskClick={setSelectedTask}
                  onOverflow={(tasksOverflow, staffName, anchor) =>
                    setOverflowState({ tasks: tasksOverflow, staffName, anchor })
                  }
                />
              ))
            )}
          </Box>
        </Box>
      </Box>

      <Popover
        open={Boolean(overflowState?.anchor)}
        anchorEl={overflowState?.anchor}
        onClose={() => setOverflowState(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 320, maxHeight: 320, overflowY: 'auto' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text3, mb: 1 }}>
            {overflowState?.staffName} — {overflowState?.tasks.length} tâche(s)
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {overflowState?.tasks.map((item) => (
              <TaskChip
                key={item._id}
                item={item}
                cellWidth={220}
                onClick={() => {
                  setSelectedTask(item);
                  setOverflowState(null);
                }}
              />
            ))}
          </Box>
        </Box>
      </Popover>

      <Drawer anchor="right" open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)}>
        {selectedTask ? (
          <Box sx={{ width: 320, maxWidth: '100vw', p: 2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, mb: 1 }}>{selectedTask.name}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                {selectedTask.listingName || '—'} · {selectedTask.itemNumber}
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                Exécution : {selectedTask.startDate ? format(new Date(selectedTask.startDate), 'PPP', { locale: fr }) : '—'}
              </Typography>
              <Box>
                <Badge variant="neutral">
                  {TASK_STATUS_LABELS[normalizeTaskStatus(selectedTask.taskStatus)]}
                </Badge>
              </Box>
              {selectedTask.staffName || selectedTask.staffCode ? (
                <Typography sx={{ fontSize: 12 }}>
                  Staff : {selectedTask.staffName || selectedTask.staffCode}
                </Typography>
              ) : null}
            </Box>
            <Button sx={{ ...btnGhostSx, mt: 3 }} fullWidth onClick={() => setSelectedTask(null)}>
              Fermer
            </Button>
          </Box>
        ) : null}
      </Drawer>
    </Stack>
  );
}

function MiniKpi({
  icon,
  label,
  value,
  tone,
}: {
  icon: string;
  label: string;
  value: number;
  tone: 'success' | 'error' | 'warning' | 'alert' | 'neutral';
}) {
  const border =
    tone === 'success'
      ? t.success
      : tone === 'error'
        ? t.error
        : tone === 'warning'
          ? t.warning
          : tone === 'alert'
            ? t.warning
            : t.border;
  const bg =
    tone === 'success'
      ? t.successTint
      : tone === 'error'
        ? t.errorTint
        : tone === 'warning'
          ? t.warningTint
          : tone === 'alert'
            ? t.warningTint
            : t.bg2;
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.5,
        borderRadius: 1.5,
        border: `1px solid ${border}`,
        bgcolor: bg,
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: 12 }}>{icon}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 800, color: t.text }}>{value}</Typography>
      <Typography sx={{ fontSize: 10, fontWeight: 600, color: t.text2 }}>{label}</Typography>
    </Box>
  );
}

function TaskChip({
  item,
  onClick,
  cellWidth,
}: {
  item: StaffGridItem;
  onClick?: (item: StaffGridItem) => void;
  cellWidth: number;
}) {
  const c = taskColor(item);
  const icon = c.icon;
  const lbl = taskLabel(item);
  const unassigned = isUnassignedItem(item);
  const chipW = Math.max(12, cellWidth - 8);

  return (
    <Box
      role="button"
      onClick={() => onClick?.(item)}
      title={`${lbl} — ${item.listingName || '?'}`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.75,
        py: 0.25,
        borderRadius: 1,
        bgcolor: c.bg,
        border: `1px solid ${unassigned ? t.warning : c.border}`,
        color: c.text,
        fontSize: 10,
        fontWeight: 600,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        width: chipW,
        height: CHIP_H,
        boxSizing: 'border-box',
        boxShadow: unassigned ? `0 0 0 1px ${t.warning}55` : 'none',
      }}
    >
      <span style={{ fontSize: 11, flexShrink: 0 }}>{icon}</span>
      <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, lineHeight: 1.2 }}>
        {lbl}
      </Box>
      {unassigned ? (
        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: t.error, flexShrink: 0 }} />
      ) : null}
    </Box>
  );
}

function DayCell({
  day,
  tasks,
  rowH,
  maxVisible,
  cellWidth,
  onTaskClick,
  onOverflowClick,
}: {
  day: DayModel;
  tasks: StaffGridItem[];
  rowH: number;
  maxVisible: number;
  cellWidth: number;
  onTaskClick: (item: StaffGridItem) => void;
  onOverflowClick: (tasksArg: StaffGridItem[], anchor: HTMLElement) => void;
}) {
  const isToday = day.dateStr === TODAY_STR;
  const visible = tasks.slice(0, maxVisible);
  const overflow = tasks.length - maxVisible;

  return (
    <Box
      sx={{
        height: rowH,
        bgcolor: isToday ? t.infoTint : day.isWeekend ? t.warningTint : t.bg1,
        borderRight: `1px solid ${t.border}`,
        borderBottom: `1px solid ${t.border}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {tasks.length > 0 ? (
        <Box
          sx={{
            position: 'absolute',
            top: TASK_Y,
            left: 4,
            right: 4,
            display: 'flex',
            flexDirection: 'column',
            gap: `${CHIP_GAP}px`,
          }}
        >
          {visible.map((item) => (
            <TaskChip key={item._id} item={item} onClick={onTaskClick} cellWidth={cellWidth} />
          ))}
          {overflow > 0 ? (
            <Button
              size="small"
              variant="text"
              onClick={(e) => {
                e.stopPropagation();
                onOverflowClick(tasks, e.currentTarget);
              }}
              sx={{
                minWidth: 0,
                width: Math.max(12, cellWidth - 8),
                height: CHIP_H,
                p: 0,
                fontSize: 10,
                fontWeight: 700,
                color: t.text3,
                border: `1px solid ${t.border}`,
                borderRadius: 1,
                bgcolor: t.bg2,
              }}
            >
              +{overflow}
            </Button>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}

function StaffGridRow({
  row,
  days,
  cellWidth,
  stickyWidth,
  onTaskClick,
  onOverflow,
}: {
  row: StaffRowModel;
  days: DayModel[];
  cellWidth: number;
  stickyWidth: number;
  onTaskClick: (item: StaffGridItem) => void;
  onOverflow: (tasks: StaffGridItem[], staffName: string, anchor: HTMLElement) => void;
}) {
  const items = row.items;
  const maxTasksPerDay = useMemo(() => {
    let max = 0;
    days.forEach((day) => {
      const n = itemsForStaffDay(items, day.dateStr).length;
      if (n > max) max = n;
    });
    return max;
  }, [items, days]);

  const rowH = computeRowH(maxTasksPerDay);
  const maxVisible = Math.min(maxTasksPerDay, 2);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `${stickyWidth}px repeat(${days.length}, ${cellWidth}px)`,
        minWidth: stickyWidth + days.length * cellWidth,
      }}
    >
      <Box
        title={
          row.id === 'UNASSIGNED'
            ? 'Tâches non assignées'
            : `${row.name}${row.memberRole ? ` · ${row.memberRole}` : ''}`
        }
        sx={{
          height: rowH,
          position: 'sticky',
          left: 0,
          zIndex: 2,
          bgcolor: row.id === 'UNASSIGNED' ? t.errorTint : t.bg1,
          borderRight: `2px solid ${t.border}`,
          borderBottom: `1px solid ${t.border}`,
          px: 0.75,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.25,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: stickyWidth < 90 ? 9 : 11,
            color: t.text,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {row.id === 'UNASSIGNED' ? '📋 Non assigné' : `${row.name}`}
        </Typography>
        {items.length > 0 && stickyWidth >= 72 ? (
          <Typography sx={{ fontSize: 9, color: t.text3 }}>
            {items.length} tâche{items.length !== 1 ? 's' : ''}
          </Typography>
        ) : null}
      </Box>
      {days.map((day) => {
        const cellTasks = itemsForStaffDay(items, day.dateStr);
        return (
          <DayCell
            key={day.dateStr}
            day={day}
            tasks={cellTasks}
            rowH={rowH}
            maxVisible={maxVisible}
            cellWidth={cellWidth}
            onTaskClick={onTaskClick}
            onOverflowClick={(tsk, anchor) => onOverflow(tsk, row.name, anchor)}
          />
        );
      })}
    </Box>
  );
}
