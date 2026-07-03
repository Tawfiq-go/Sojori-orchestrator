// ════════════════════════════════════════════════════════════════════
// StayView.tsx — Vue Séjour redesignée (Gantt + tasks chips)
// • Ligne fixe 76px (plus de hauteur dynamique)
// • Max 2 chips visibles + badge "+N" popover inline
// • Couleur barre par canal (Airbnb/Booking/Vrbo/Direct)
// • Mini-map 30j au-dessus
// • Groupement par ville
// ════════════════════════════════════════════════════════════════════
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, Popover, Dialog, DialogTitle, DialogContent, DialogActions, Button, useMediaQuery, useTheme } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarDatePicker from '../calendar-v3/CalendarDatePicker';
import {
  T, STAY, stayMetrics, type StayMetrics, type ListingRow, type TimelineItem, channelFromName, genDays,
  KpiPill, DayHeader, TaskChip, GanttBar, SOJORI_KEYFRAMES, computeReservationBarLayout,
  planningDaySurfaceSx,
} from './_shared';
import { CleanlinessBadgeInteractive } from './CleanlinessBadgeInteractive';
import {
  deriveDisplayCleanliness,
  displayCleanlinessLabel,
  matchesCleanlinessFilter,
  type CleanlinessFilter,
  type DisplayCleanliness,
} from '../../utils/cleanlinessDisplay';
import { PLANNING_VISIBLE_DAYS, getPlanningGridScrollLeft } from '../../utils/planningViewDates';
import { DASHBOARD_PAGE, DASHBOARD_PAGE_FILL_SX } from '../../constants/dashboardLayout';

export type StayViewVariant = 'tasks' | 'reservations';

export interface StayViewProps {
  startDate: Date;
  daysCount?: number;           // défaut 30 (mini-map) — vue 14j visible
  listings: ListingRow[];
  /** tasks = chips tâches + KPI ops ; reservations = barres séjour uniquement + filtres statut */
  variant?: StayViewVariant;
  onTaskClick?: (item: TimelineItem) => void;
  onReservationClick?: (resId: string) => void;
  onCellClick?: (listingId: string, iso: string) => void;
  onGoToday?: () => void;
  onPrevDay?: () => void;
  onNextDay?: () => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
  onDateChange?: (date: Date) => void;
  /** Colonnes passées avant aujourd'hui au chargement (défaut 2 = J-2). */
  todayBackDays?: number;
  /** Manual cleanliness change from planning grid */
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
  /** Toolbar compacte (planning résa / calendrier) */
  compactLayout?: boolean;
  /** Toolbar 1–2 lignes sur desktop (grille taille normale) */
  denseToolbar?: boolean;
  /** Grille seule — plein écran */
  gridOnly?: boolean;
  /** Occupe toute la hauteur du parent */
  fillViewport?: boolean;
  /** Affiche le bouton ⛶ dans la toolbar */
  showFullscreenEnter?: boolean;
  onEnterFullscreen?: () => void;
}

const VISIBLE_DAYS = PLANNING_VISIBLE_DAYS;

function toLocalDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function PlanningNavBtn({
  children,
  onClick,
  title,
  disabled = false,
  dense = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
  dense?: boolean;
}) {
  return (
    <Box
      component="button"
      type="button"
      title={title}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      sx={{
        all: 'unset',
        boxSizing: 'border-box',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: dense ? 22 : 28,
        height: dense ? 22 : 28,
        borderRadius: dense ? '5px' : '7px',
        color: disabled ? T.text4 : T.text2,
        fontSize: dense ? 11 : 13,
        fontWeight: 700,
        bgcolor: 'transparent',
        border: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        px: dense ? 0.25 : 0.5,
        opacity: disabled ? 0.45 : 1,
        '&:hover': disabled ? {} : { bgcolor: T.bg2 },
      }}
    >
      {children}
    </Box>
  );
}

export default function StayView({
  startDate, daysCount = 30, listings, variant = 'tasks', onTaskClick, onReservationClick,
  onGoToday, onPrevDay, onNextDay, onPrevWeek, onNextWeek, onDateChange, onCleanlinessChange,
  todayBackDays = 2,
  compactLayout = false,
  denseToolbar = false,
  gridOnly = false,
  fillViewport = false,
  showFullscreenEnter = false,
  onEnterFullscreen,
}: StayViewProps) {
  const isReservations = variant === 'reservations';
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const useDenseChrome = compactLayout || denseToolbar;
  const m = useMemo(() => stayMetrics(compactLayout, isNarrow), [compactLayout, isNarrow]);
  const minimapDays = useMemo(() => genDays(startDate, daysCount), [startDate, daysCount]);
  const days = useMemo(() => genDays(startDate, VISIBLE_DAYS), [startDate]);
  const gridScrollRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = gridScrollRef.current;
    if (!el) return;
    const todayIdx = days.findIndex((d) => d.isToday);
    if (todayIdx < 0) return;
    const isDefaultFrame = todayIdx === todayBackDays;
    if (!isDefaultFrame) return;
    const targetLeft = getPlanningGridScrollLeft(todayIdx, m.CELL_W);
    if (Math.abs(el.scrollLeft - targetLeft) > 2) {
      el.scrollLeft = targetLeft;
    }
  }, [days, startDate, todayBackDays, m.CELL_W]);

  const cleanlinessShort: Record<CleanlinessFilter, string> = {
    clean: 'C',
    dirty: 'D',
    in_progress: 'E',
    occupied: 'O',
    emergency: '!',
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerAnchor, setPickerAnchor] = useState<HTMLElement | null>(null);
  const pickerValue = useMemo(() => toLocalDate(startDate), [startDate]);

  const shiftMonth = (delta: number) => {
    onDateChange?.(
      new Date(startDate.getFullYear(), startDate.getMonth() + delta, startDate.getDate()),
    );
  };
  const [statusFilters, setStatusFilters] = useState<Set<'confirmed' | 'pending'>>(
    () => new Set(['confirmed', 'pending']),
  );
  const [cleanlinessFilters, setCleanlinessFilters] = useState<Set<CleanlinessFilter>>(new Set());
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [tempCleanlinessFilters, setTempCleanlinessFilters] = useState<Set<CleanlinessFilter>>(new Set());
  const [tempStatusFilters, setTempStatusFilters] = useState<Set<'confirmed' | 'pending'>>(
    () => new Set(['confirmed', 'pending']),
  );

  const toggleCleanlinessFilter = (f: CleanlinessFilter) => {
    setCleanlinessFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const toggleStatus = (s: 'confirmed' | 'pending') => {
    setStatusFilters(prev => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size <= 1) return prev;
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const displayListings = useMemo(() => {
    let rows = listings;
    if (isReservations) {
      rows = rows.map((l) => ({
        ...l,
        reservations: l.reservations.filter((r) => statusFilters.has(r.status)),
      }));
    }
    if (cleanlinessFilters.size === 0) return rows;
    return rows.filter((l) =>
      matchesCleanlinessFilter(
        { ...l, reservations: l.reservations },
        cleanlinessFilters,
      ),
    );
  }, [listings, isReservations, statusFilters, cleanlinessFilters]);

  // KPI "aujourd'hui"
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    if (isReservations) {
      let arr = 0, dep = 0, confirmed = 0, pending = 0;
      displayListings.forEach(l => l.reservations.forEach(r => {
        const arrIso = (r.arrivalDate || '').slice(0, 10);
        const depIso = (r.departureDate || '').slice(0, 10);
        if (arrIso === today) arr++;
        if (depIso === today) dep++;
        if (r.status === 'confirmed') confirmed++;
        else pending++;
      }));
      return { arr, dep, confirmed, pending };
    }
    let arr = 0, dep = 0, cln = 0, na = 0;
    listings.forEach(l => l.reservations.forEach(r => r.timeline?.forEach(t => {
      if ((t.scheduledFor || '').slice(0, 10) !== today) return;
      if (t.type === 'arrival')   arr++;
      if (t.type === 'departure') dep++;
      if (t.type === 'cleaning')  cln++;
      if (!t.staffId && t.status !== 'COMPLETED') na++;
    })));
    return { arr, dep, cln, na };
  }, [listings, displayListings, isReservations]);

  // Group by city
  const byCity = useMemo(() => {
    const map = new Map<string, ListingRow[]>();
    displayListings.forEach(l => {
      const c = l.city || 'Sans ville';
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(l);
    });
    return Array.from(map.entries());
  }, [displayListings]);

  const showChrome = !gridOnly;
  const showMinimap = showChrome && !compactLayout && !denseToolbar;
  const flexFill = fillViewport || compactLayout;

  const activePlanningFiltersCount = useMemo(() => {
    let n = cleanlinessFilters.size;
    if (isReservations) {
      if (!statusFilters.has('confirmed') || !statusFilters.has('pending')) n += 1;
    }
    return n;
  }, [cleanlinessFilters, statusFilters, isReservations]);

  const openPlanningFiltersModal = () => {
    setTempCleanlinessFilters(new Set(cleanlinessFilters));
    setTempStatusFilters(new Set(statusFilters));
    setFiltersModalOpen(true);
  };

  const confirmPlanningFiltersModal = () => {
    setCleanlinessFilters(new Set(tempCleanlinessFilters));
    setStatusFilters(new Set(tempStatusFilters));
    setFiltersModalOpen(false);
  };

  const resetPlanningFiltersModal = () => {
    setTempCleanlinessFilters(new Set());
    setTempStatusFilters(new Set(['confirmed', 'pending']));
  };

  const toggleTempCleanliness = (f: CleanlinessFilter) => {
    setTempCleanlinessFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const toggleTempStatus = (s: 'confirmed' | 'pending') => {
    setTempStatusFilters((prev) => {
      const next = new Set(prev);
      if (next.has(s)) {
        if (next.size <= 1) return prev;
        next.delete(s);
      } else {
        next.add(s);
      }
      return next;
    });
  };

  const kpiRow = (
    <Stack sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: compactLayout ? 0.5 : 1.25 }}>
      <KpiPill icon="🏠" count={kpis.arr} label={compactLayout ? 'Arr.aj' : 'Arrivées auj.'} tone="success" />
      <KpiPill icon="🚪" count={kpis.dep} label={compactLayout ? 'Dép.aj' : 'Départs auj.'} tone="warning" />
      {isReservations ? (
        <>
          <KpiPill icon="✓" count={kpis.confirmed} label={compactLayout ? 'Conf.' : 'Confirmées'} tone="primary" />
          <KpiPill icon="⏳" count={kpis.pending} label={compactLayout ? 'Att.' : 'En attente'} tone="warning" />
        </>
      ) : (
        <>
          <KpiPill icon="🧹" count={kpis.cln} label="Ménages" tone="primary" />
          <KpiPill icon="⚠" count={kpis.na} label="Non assigné" tone="error" alert={kpis.na > 0} />
        </>
      )}
    </Stack>
  );

  return (
    <Box sx={{
      ...DASHBOARD_PAGE_FILL_SX,
      p: fillViewport
        ? 0
        : compactLayout
          ? { xs: '2px 0 4px', md: '4px 0 6px' }
          : denseToolbar
            ? { xs: DASHBOARD_PAGE.padY.xs, md: '8px 0 16px' }
            : { xs: DASHBOARD_PAGE.padY.xs, md: '20px 0 50px' },
      height: flexFill ? '100%' : undefined,
      minHeight: flexFill ? 0 : undefined,
      display: flexFill ? 'flex' : 'block',
      flexDirection: 'column',
      boxSizing: 'border-box',
    }}>
      <style>{SOJORI_KEYFRAMES}</style>

      {showChrome && !useDenseChrome && (
        <Stack sx={{ flexDirection: 'row', alignItems: 'baseline', gap: 1.75, mb: 1.75 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.025em' }}>
            {isReservations ? 'Planning Réservations' : 'Vue Séjour'}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
            {displayListings.length} propriétés · {daysCount}j (mini) · {VISIBLE_DAYS}j visibles
          </Typography>
        </Stack>
      )}

      {showChrome && !useDenseChrome && (
        <Box sx={{ mb: 1.5 }}>{kpiRow}</Box>
      )}

      {/* Toolbar dense — mobile compact ou desktop 1–2 lignes */}
      {showChrome && useDenseChrome && (
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.25,
        p: '4px 6px', mb: 0.5, boxShadow: '0 1px 2px rgba(20,17,10,0.04)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 0.5,
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{
            alignItems: 'center', gap: 0.5, flexWrap: 'nowrap',
            overflowX: 'auto', WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
          }}>
            {denseToolbar ? (
              <>
                <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {isReservations ? 'Planning Réservations' : 'Planning Tâches'}
                </Typography>
                <Typography sx={{ fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {displayListings.length} prop. · {daysCount}j · {VISIBLE_DAYS}j vis.
                </Typography>
                <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
                <MiniKpi count={kpis.arr} label="Arr" tone={T.success} />
                <MiniKpi count={kpis.dep} label="Dép" tone={T.warning} />
                {isReservations ? (
                  <>
                    <MiniKpi count={kpis.confirmed} label="Conf" tone={T.primaryDeep} />
                    <MiniKpi count={kpis.pending} label="Att" tone={T.warning} />
                  </>
                ) : (
                  <>
                    <MiniKpi count={kpis.cln} label="Mén" tone={T.primaryDeep} />
                    <MiniKpi count={kpis.na} label="NA" tone={T.error} />
                  </>
                )}
                <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
              </>
            ) : null}
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: '1px',
              bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: '7px', p: '2px', flexShrink: 0,
            }}>
              <PlanningNavBtn dense title="−1 semaine" onClick={onPrevWeek}>&lt;&lt;</PlanningNavBtn>
              <PlanningNavBtn dense title="−1 jour" onClick={onPrevDay}>&lt;</PlanningNavBtn>
              <Box
                component="button"
                type="button"
                onClick={(e) => { setPickerAnchor(e.currentTarget); setPickerOpen(true); }}
                title="Choisir la date"
                sx={{
                  all: 'unset', boxSizing: 'border-box', display: 'inline-flex', alignItems: 'center',
                  justifyContent: 'center', gap: 0.35, px: 0.75, minWidth: isNarrow ? 88 : 104, height: 22,
                  fontSize: 10, fontWeight: 700, color: T.text, fontFamily: '"Geist Mono", monospace',
                  bgcolor: pickerOpen ? T.primaryTint : T.bg2,
                  border: `1px solid ${pickerOpen ? T.primary : T.border}`, borderRadius: '5px', cursor: 'pointer',
                }}
              >
                {days[0]?.frShort || ''}
                <Box component="span" sx={{ color: T.text4, fontSize: 9 }}>→</Box>
                {days[days.length - 1]?.frShort || ''}
              </Box>
              <PlanningNavBtn dense title="+1 jour" onClick={onNextDay}>&gt;</PlanningNavBtn>
              <PlanningNavBtn dense title="+1 semaine" onClick={onNextWeek}>&gt;&gt;</PlanningNavBtn>
              <PlanningNavBtn dense title="Aujourd'hui" onClick={onGoToday}>⊙</PlanningNavBtn>
            </Box>
            {denseToolbar ? (
              <>
                <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
                {(['clean', 'dirty', 'in_progress', 'occupied', 'emergency'] as CleanlinessFilter[]).map((f) => (
                  <FilterTogglePill
                    key={f}
                    dense
                    label={f === 'emergency' ? '⚠ Urg' : displayCleanlinessLabel(f as DisplayCleanliness).toUpperCase()}
                    active={cleanlinessFilters.has(f)}
                    onClick={() => toggleCleanlinessFilter(f)}
                    color={
                      f === 'clean' ? T.success : f === 'dirty' ? T.error
                        : f === 'in_progress' ? T.warning : f === 'occupied' ? T.info : T.error
                    }
                  />
                ))}
                {cleanlinessFilters.size > 0 ? (
                  <Box
                    component="button"
                    onClick={() => setCleanlinessFilters(new Set())}
                    sx={{ all: 'unset', cursor: 'pointer', fontSize: 9, fontWeight: 700, color: T.text3, px: 0.5, flexShrink: 0 }}
                  >
                    ✕
                  </Box>
                ) : null}
                <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
                <Box component="span" sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 22, px: 0.75, borderRadius: 1,
                  bgcolor: T.bg2, border: `1px solid ${T.border}`, fontSize: 10, fontWeight: 600, color: T.text2, flexShrink: 0,
                }}>
                  🏘 {byCity.length}
                </Box>
                <Box component="span" sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 22, px: 0.75, borderRadius: 1,
                  bgcolor: T.bg2, border: `1px solid ${T.border}`, fontSize: 10, fontWeight: 600, color: T.text2, flexShrink: 0,
                }}>
                  🏠 {listings.length}
                </Box>
                {isReservations ? (
                  <>
                    <FilterTogglePill dense label="Conf." active={statusFilters.has('confirmed')} onClick={() => toggleStatus('confirmed')} color={T.success} />
                    <FilterTogglePill dense label="Att." active={statusFilters.has('pending')} onClick={() => toggleStatus('pending')} color={T.warning} />
                    <ChannelLegendPill dense label="Ab" color={T.airbnb} />
                    <ChannelLegendPill dense label="Bk" color={T.booking} />
                    <ChannelLegendPill dense label="Vr" color={T.vrbo} />
                    <ChannelLegendPill dense label="Di" color={T.primary} />
                  </>
                ) : (
                  <>
                    <LegendPill icon="🏠" label="Arr." dense />
                    <LegendPill icon="🚪" label="Dép." dense />
                    <LegendPill icon="🧹" label="Mén." dense />
                  </>
                )}
                <PastDayLegendPill dense kind="past" label="Passé" />
                <PastDayLegendPill dense kind="yesterday" label="Hier" />
                <PastDayLegendPill dense kind="today" label="Auj." />
                <Box component="span" sx={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 9, fontWeight: 700, color: T.text3,
                  px: 0.625, py: '2px', borderRadius: 999, bgcolor: T.bg3, flexShrink: 0,
                }}>
                  {daysCount}j
                </Box>
              </>
            ) : null}
            {!denseToolbar ? (
            <Button
              variant="outlined"
              size="small"
              onClick={openPlanningFiltersModal}
              startIcon={<FilterListIcon sx={{ fontSize: 15 }} />}
              sx={{
                textTransform: 'none',
                minHeight: 24,
                fontSize: 10.5,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                borderColor: activePlanningFiltersCount > 0 ? T.primary : T.border,
                bgcolor: activePlanningFiltersCount > 0 ? T.primaryTint : T.bg1,
                color: T.primaryDeep,
                px: 0.75,
                '&:hover': { borderColor: T.primary, bgcolor: T.primaryTint },
              }}
            >
              Filtres{activePlanningFiltersCount > 0 ? ` · ${activePlanningFiltersCount}` : ''}
            </Button>
            ) : null}
          </Stack>

          {!denseToolbar ? (
          <Stack
            direction="row"
            sx={{
              mt: 0.35,
              gap: 0.35,
              flexWrap: 'nowrap',
              alignItems: 'center',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
                <MiniKpi count={kpis.arr} label="Arr" tone={T.success} />
                <MiniKpi count={kpis.dep} label="Dép" tone={T.warning} />
                {isReservations ? (
                  <>
                    <MiniKpi count={kpis.confirmed} label="Conf" tone={T.primaryDeep} />
                    <MiniKpi count={kpis.pending} label="Att" tone={T.warning} />
                  </>
                ) : (
                  <>
                    <MiniKpi count={kpis.cln} label="Mén" tone={T.primaryDeep} />
                    <MiniKpi count={kpis.na} label="NA" tone={T.error} />
                  </>
                )}
                <Box sx={{ width: '1px', height: 14, bgcolor: T.border, flexShrink: 0, mx: 0.1 }} />
            <PastDayLegendPill dense kind="past" label="Passé" />
            <PastDayLegendPill dense kind="yesterday" label="Hier" />
            <PastDayLegendPill dense kind="today" label="Auj." />
            {isReservations ? (
              <>
                <ChannelLegendPill dense label="Ab" color={T.airbnb} />
                <ChannelLegendPill dense label="Bk" color={T.booking} />
                <ChannelLegendPill dense label="Vr" color={T.vrbo} />
                <ChannelLegendPill dense label="Di" color={T.primary} />
              </>
            ) : null}
          </Stack>
          ) : null}
        </Box>

        {showFullscreenEnter && onEnterFullscreen ? (
          <Box sx={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            pl: 0.35,
            borderLeft: `1px solid ${T.border}`,
          }}>
            <Box
              component="button"
              type="button"
              title="Planning plein écran"
              aria-label="Planning plein écran"
              onClick={onEnterFullscreen}
              sx={{
                all: 'unset',
                boxSizing: 'border-box',
                flexShrink: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 30,
                height: 28,
                borderRadius: '6px',
                border: `1px solid ${T.borderStrong}`,
                bgcolor: T.bg1,
                color: T.text2,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                lineHeight: 1,
                boxShadow: '0 1px 2px rgba(20,17,10,0.06)',
                '&:hover': { bgcolor: T.bg2, borderColor: T.primary, color: T.primaryDeep },
              }}
            >
              ⛶
            </Box>
          </Box>
        ) : null}

        <CalendarDatePicker
          anchorEl={pickerAnchor}
          open={pickerOpen}
          onClose={() => { setPickerOpen(false); setPickerAnchor(null); }}
          value={pickerValue}
          showHorizonHint={false}
          onTodaySelect={onGoToday}
          onSelect={(d) => {
            onDateChange?.(toLocalDate(d));
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
        />

        <Dialog open={filtersModalOpen} onClose={() => setFiltersModalOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ pb: 1 }}>Filtres planning</DialogTitle>
          <DialogContent dividers>
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
              Propreté
            </Typography>
            <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap',  mb: 2 }}>
              {(['clean', 'dirty', 'in_progress', 'occupied', 'emergency'] as CleanlinessFilter[]).map((f) => (
                <FilterTogglePill
                  key={f}
                  dense
                  label={f === 'emergency' ? '!' : cleanlinessShort[f]}
                  title={f === 'emergency' ? 'Urgent' : displayCleanlinessLabel(f as DisplayCleanliness)}
                  active={tempCleanlinessFilters.has(f)}
                  onClick={() => toggleTempCleanliness(f)}
                  color={
                    f === 'clean' ? T.success : f === 'dirty' ? T.error
                      : f === 'in_progress' ? T.warning : f === 'occupied' ? T.info : T.error
                  }
                />
              ))}
            </Stack>
            {isReservations ? (
              <>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', mb: 1 }}>
                  Réservations
                </Typography>
                <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
                  <FilterTogglePill dense label="✓ Confirmées" active={tempStatusFilters.has('confirmed')} onClick={() => toggleTempStatus('confirmed')} color={T.success} />
                  <FilterTogglePill dense label="⏳ En attente" active={tempStatusFilters.has('pending')} onClick={() => toggleTempStatus('pending')} color={T.warning} />
                </Stack>
              </>
            ) : null}
          </DialogContent>
          <DialogActions sx={{ px: 2, py: 1.25 }}>
            <Button onClick={() => setFiltersModalOpen(false)}>Fermer</Button>
            <Button onClick={resetPlanningFiltersModal}>Réinitialiser</Button>
            <Button variant="contained" onClick={confirmPlanningFiltersModal} sx={{ bgcolor: T.primary, '&:hover': { bgcolor: T.primaryDeep } }}>
              Appliquer
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
      )}

      {/* Toolbar complète (legacy — désactivée si denseToolbar) */}
      {showChrome && !compactLayout && !denseToolbar && (
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
        p: '10px 14px', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap',
        mb: 1.25, boxShadow: '0 1px 2px rgba(20,17,10,0.04)', flexShrink: 0,
      }}>
        {/* Date navigation — style unifié aligné /calendar */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: '9px',
            p: '3px',
          }}
        >
          <PlanningNavBtn title="−1 mois" onClick={() => shiftMonth(-1)}>
            &lt;&lt;&lt;
          </PlanningNavBtn>
          <PlanningNavBtn title="−1 semaine" onClick={onPrevWeek}>
            &lt;&lt;
          </PlanningNavBtn>
          <PlanningNavBtn title="−1 jour" onClick={onPrevDay}>
            &lt;
          </PlanningNavBtn>

          <Box
            component="button"
            type="button"
            onClick={(e) => {
              setPickerAnchor(e.currentTarget);
              setPickerOpen(true);
            }}
            title="Choisir la date de début (14 jours visibles)"
            sx={{
              all: 'unset',
              boxSizing: 'border-box',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.5,
              px: 1.5,
              minWidth: 148,
              height: 28,
              fontSize: 12.5,
              fontWeight: 700,
              color: T.text,
              fontFamily: '"Geist Mono", monospace',
              textAlign: 'center',
              bgcolor: pickerOpen ? T.primaryTint : T.bg2,
              border: `1px solid ${pickerOpen ? T.primary : T.border}`,
              borderRadius: '7px',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {days[0]?.frShort || ''}
            <Box component="span" sx={{ color: T.text4, mx: 0.75 }}>→</Box>
            {days[days.length - 1]?.frShort || ''}
          </Box>

          <PlanningNavBtn title="+1 jour" onClick={onNextDay}>
            &gt;
          </PlanningNavBtn>
          <PlanningNavBtn title="+1 semaine" onClick={onNextWeek}>
            &gt;&gt;
          </PlanningNavBtn>
          <PlanningNavBtn title="+1 mois" onClick={() => shiftMonth(1)}>
            &gt;&gt;&gt;
          </PlanningNavBtn>
          <PlanningNavBtn title="Aujourd'hui" onClick={onGoToday}>
            ⊙
          </PlanningNavBtn>
        </Box>

        {showFullscreenEnter && onEnterFullscreen ? (
          <PlanningNavBtn title="Planning plein écran" onClick={onEnterFullscreen}>
            ⛶
          </PlanningNavBtn>
        ) : null}

        <CalendarDatePicker
          anchorEl={pickerAnchor}
          open={pickerOpen}
          onClose={() => {
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
          value={pickerValue}
          showHorizonHint={false}
          onTodaySelect={onGoToday}
          onSelect={(d) => {
            onDateChange?.(toLocalDate(d));
            setPickerOpen(false);
            setPickerAnchor(null);
          }}
        />

        {/* Filtres propreté */}
        <Stack direction="row" gap={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {(['clean', 'dirty', 'in_progress', 'occupied', 'emergency'] as CleanlinessFilter[]).map((f) => (
            <FilterTogglePill
              key={f}
              label={f === 'emergency' ? '⚠ Urgent' : displayCleanlinessLabel(f as DisplayCleanliness)}
              active={cleanlinessFilters.has(f)}
              onClick={() => toggleCleanlinessFilter(f)}
              color={
                f === 'clean' ? T.success
                  : f === 'dirty' ? T.error
                    : f === 'in_progress' ? T.warning
                      : f === 'occupied' ? T.info
                        : T.error
              }
            />
          ))}
          {cleanlinessFilters.size > 0 && (
            <Box
              component="button"
              onClick={() => setCleanlinessFilters(new Set())}
              sx={{
                all: 'unset', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                color: T.text3, px: 0.75, '&:hover': { color: T.text },
              }}
            >
              Effacer filtres
            </Box>
          )}
        </Stack>

        {/* Filtres Villes + Toutes */}
        <Box component="button" sx={{
          all: 'unset', cursor: 'pointer', height: 30, px: 1.375, borderRadius: 1,
          bgcolor: T.bg1, border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600,
          color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 0.75,
          '&:hover': { borderColor: T.borderStrong },
        }}>
          🏘 Villes <Box component="span" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 9.5, bgcolor: T.bg3, color: T.text3,
            px: 0.625, borderRadius: 999, fontWeight: 700,
          }}>{byCity.length}</Box> ▾
        </Box>

        <Box component="button" sx={{
          all: 'unset', cursor: 'pointer', height: 30, px: 1.375, borderRadius: 1,
          bgcolor: T.bg1, border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600,
          color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 0.75,
          '&:hover': { borderColor: T.borderStrong },
        }}>
          🏠 Toutes <Box component="span" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 9.5, bgcolor: T.bg3, color: T.text3,
            px: 0.625, borderRadius: 999, fontWeight: 700,
          }}>{listings.length}</Box> ▾
        </Box>

        {isReservations ? (
          <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap',  ml: 'auto' }}>
            <FilterTogglePill
              label="Confirmées"
              active={statusFilters.has('confirmed')}
              onClick={() => toggleStatus('confirmed')}
              color={T.success}
            />
            <FilterTogglePill
              label="En attente"
              active={statusFilters.has('pending')}
              onClick={() => toggleStatus('pending')}
              color={T.warning}
            />
            <ChannelLegendPill label="Airbnb" color={T.airbnb} />
            <ChannelLegendPill label="Booking" color={T.booking} />
            <ChannelLegendPill label="Vrbo" color={T.vrbo} />
            <ChannelLegendPill label="Direct" color={T.primary} />
          </Stack>
        ) : (
          <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap',  ml: 'auto' }}>
            <LegendPill icon="🏠" label="Arrivée" />
            <LegendPill icon="🚪" label="Départ" />
            <LegendPill icon="🧹" label="Ménage" />
            <LegendPill icon="📝" label="Enreg." />
            <LegendPill icon="🛎" label="Concierge" />
          </Stack>
        )}

        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap',  width: '100%', mt: 0.25 }}>
          <PastDayLegendPill kind="past" label="Passé (aperçu)" />
          <PastDayLegendPill kind="yesterday" label="Hier" />
          <PastDayLegendPill kind="today" label="Aujourd'hui" />
        </Stack>
      </Box>
      )}

      {/* Mini-map */}
      {showMinimap && (
      <MiniMap
        days={minimapDays}
        listings={displayListings}
        visibleStart={0}
        visibleEnd={VISIBLE_DAYS}
        mode={isReservations ? 'reservations' : 'tasks'}
      />
      )}

      {/* Grid */}
      <Box
        ref={gridScrollRef}
        sx={{
          overflowX: 'auto',
          overflowY: flexFill ? 'auto' : undefined,
          flex: flexFill ? 1 : undefined,
          minHeight: flexFill ? 0 : undefined,
          borderRadius: 1.75,
          WebkitOverflowScrolling: 'touch',
        }}
      >
      <Box sx={{
        bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.75,
        overflow: 'hidden', boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        minWidth: m.STICKY_W + VISIBLE_DAYS * m.CELL_W,
      }}>
        {/* Header */}
        <Box sx={{
          display: 'grid', gridTemplateColumns: `${m.STICKY_W}px repeat(${VISIBLE_DAYS}, ${m.CELL_W}px)`,
          bgcolor: T.bg2, borderBottom: `1px solid ${T.borderStrong}`,
          position: 'sticky', top: 0, zIndex: 5,
        }}>
          <Box sx={{
            p: compactLayout ? '4px 6px' : '12px 14px', fontSize: compactLayout ? 9 : 10.5, fontWeight: 700, color: T.text3,
            letterSpacing: '0.08em', textTransform: 'uppercase', borderRight: `1px solid ${T.border}`,
          }}>Prop.</Box>
          {days.map(d => <DayHeader key={d.iso} day={d} width={m.CELL_W} compact={compactLayout} />)}
        </Box>

        {/* Rows par ville */}
        {byCity.map(([city, lists]) => (
          <React.Fragment key={city}>
            <Box sx={{
              p: compactLayout ? '1px 6px' : '8px 14px', minHeight: compactLayout ? 16 : undefined,
              display: 'flex', alignItems: 'center', gap: 0.5,
              background: `linear-gradient(90deg, ${T.bg3}, ${T.bg1})`,
              borderBottom: `1px solid ${T.border}`,
              fontSize: compactLayout ? 8 : 10.5, fontWeight: 700, color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {!compactLayout && <Box component="span" sx={{ fontSize: 13 }}>📍</Box>}
              {city}
              <Box component="span" sx={{
                ml: 'auto', bgcolor: T.bg2, color: T.text2,
                px: 0.625, borderRadius: 999, fontSize: compactLayout ? 8 : 9.5, letterSpacing: '0.04em',
              }}>{lists.length}</Box>
            </Box>
            {lists.map(l => (
              <ListingRowComp key={l.listingId} listing={l} days={days} metrics={m}
                compactListing={compactLayout}
                showTaskChips={!isReservations}
                onTaskClick={onTaskClick} onReservationClick={onReservationClick}
                onCleanlinessChange={onCleanlinessChange} />
            ))}
          </React.Fragment>
        ))}
      </Box>
      </Box>
    </Box>
  );
}

/* ─── Listing row ─── */
function ListingRowComp({
  listing, days, metrics, compactListing = false, showTaskChips = true, onTaskClick, onReservationClick, onCleanlinessChange,
}: {
  listing: ListingRow; days: ReturnType<typeof genDays>; metrics: StayMetrics;
  compactListing?: boolean;
  showTaskChips?: boolean;
  onTaskClick?: (i: TimelineItem) => void;
  onReservationClick?: (id: string) => void;
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
}) {
  const numTasks = listing.reservations.reduce((n, r) => n + (r.timeline?.length || 0), 0);
  const displayStatus = deriveDisplayCleanliness(listing, listing.reservations);
  const rowHeight = showTaskChips ? metrics.TASK_ROW_H : metrics.ROW_H;

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: `${metrics.STICKY_W}px repeat(${days.length}, ${metrics.CELL_W}px)`,
      borderBottom: `1px solid ${T.border}`, height: rowHeight, position: 'relative',
    }}>
      {/* Sticky left — bloc nom/badge */}
      <Stack
        sx={{
          px: compactListing ? '4px 5px' : '14px',
          py: compactListing ? '3px' : '11px',
          borderRight: `1px solid ${T.border}`,
          bgcolor: T.bg1,
          minWidth: 0,
          height: '100%',
          gap: compactListing ? 0.25 : 0.75,
          justifyContent: 'center',
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: compactListing
              ? 'minmax(0, 1fr)'
              : `${metrics.LISTING_ICON_SIZE}px minmax(0, 1fr)`,
            columnGap: compactListing ? 0 : `${metrics.LISTING_ICON_GAP}px`,
            alignItems: 'center',
            width: '100%',
          }}
        >
          {!compactListing && (
          <Box
            sx={{
              width: metrics.LISTING_ICON_SIZE,
              height: metrics.LISTING_ICON_SIZE,
              borderRadius: '7px',
              background: 'linear-gradient(135deg,#fde68a,#d97706)',
              flexShrink: 0,
            }}
          />
          )}
          <Stack sx={{ minWidth: 0, gap: compactListing ? 0 : 0.5, pt: 0 }}>
            <Typography
              sx={{
                fontSize: compactListing ? 10 : 12.5,
                fontWeight: 700,
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
              title={listing.listingName}
            >
              {listing.listingName}
            </Typography>
            {!compactListing && (
            <CleanlinessBadgeInteractive
              status={displayStatus}
              displayStatus={displayStatus}
              emergency={listing.cleanlinessEmergency}
              onChange={
                onCleanlinessChange
                  ? (next) => onCleanlinessChange(listing.listingId, next)
                  : undefined
              }
            />
            )}
          </Stack>
        </Box>

        {!compactListing && (
        <Typography
          sx={{
            fontSize: 10,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            letterSpacing: '0.02em',
            lineHeight: 1.35,
            width: '100%',
          }}
        >
          {days.length}j · <b style={{ color: T.text2, fontWeight: 700 }}>{listing.reservations.length} séj.</b>
          {showTaskChips && (
            <> · <b style={{ color: T.text2, fontWeight: 700 }}>{numTasks} tâch.</b></>
          )}
        </Typography>
        )}
      </Stack>

      {/* Day cells */}
      {days.map(d => {
        const tasks = showTaskChips
          ? (listing.reservations || []).flatMap(r =>
              (r.timeline || []).filter(t => (t.scheduledFor || '').slice(0, 10) === d.iso)
            )
          : [];
        return (
          <DayCell
            key={d.iso}
            day={d}
            tasks={tasks}
            onTaskClick={onTaskClick}
            reserveTaskLane={showTaskChips}
          />
        );
      })}

      {/* Gantt bars overlay */}
      <Box sx={{
        position: 'absolute', top: 0, left: metrics.STICKY_W,
        width: days.length * metrics.CELL_W, height: rowHeight, pointerEvents: 'none', zIndex: 3,
      }}>
        {(() => {
          const arrivalSlotCount = new Map<number, number>();
          const visibleReservations = listing.reservations
            .map(r => {
              const arr = new Date(r.arrivalDate);
              const dep = new Date(r.departureDate);
              const firstDay = days[0].date;
              const arrIdx = Math.floor((+arr - +firstDay) / 86400000);
              const depIdx = Math.floor((+dep - +firstDay) / 86400000);
              if (depIdx < 0 || arrIdx > days.length - 1) return null;
              const startIdx = Math.max(0, arrIdx);
              const slot = arrivalSlotCount.get(startIdx) ?? 0;
              arrivalSlotCount.set(startIdx, slot + 1);
              return { r, startIdx, endIdx: Math.min(days.length - 1, depIdx), sameDaySlot: slot };
            })
            .filter(Boolean) as Array<{
              r: (typeof listing.reservations)[0];
              startIdx: number;
              endIdx: number;
              sameDaySlot: number;
            }>;

          return visibleReservations.map(({ r, startIdx, endIdx, sameDaySlot }) => {
          const { leftPct, widthPct } = computeReservationBarLayout(
            startIdx,
            endIdx,
            days.length,
            sameDaySlot,
          );
          const channel = channelFromName(r.channelName);
          return (
            <Box key={r.reservationId} onClick={() => onReservationClick?.(r.reservationNumber || r.reservationId)}
              sx={{ pointerEvents: 'auto' }}>
              <GanttBar
                channel={channel}
                guestName={r.guestName}
                reservationNumber={r.reservationNumber}
                confirmed={r.status === 'confirmed'}
                leftPct={leftPct}
                widthPct={widthPct}
                compact={compactListing}
              />
            </Box>
          );
          });
        })()}
      </Box>
    </Box>
  );
}

/* ─── Day cell with chip overflow popover ─── */
function DayCell({ day, tasks, onTaskClick, reserveTaskLane = false }: {
  day: ReturnType<typeof genDays>[0];
  tasks: TimelineItem[];
  onTaskClick?: (i: TimelineItem) => void;
  reserveTaskLane?: boolean;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const visible = tasks.slice(0, STAY.MAX_CHIPS);
  const overflow = tasks.length - STAY.MAX_CHIPS;
  const taskLaneTop = STAY.RES_BAR_TOP + STAY.RES_BAR_HEIGHT + STAY.RES_TASK_GAP;

  return (
    <Box sx={{
      borderRight: `1px solid ${T.border}`, position: 'relative',
      ...planningDaySurfaceSx(day),
    }}>
      {tasks.length > 0 && (
        <Stack sx={{
          position: 'absolute',
          left: 3,
          right: 3,
          flexDirection: 'column',
          gap: 0.25,
          zIndex: 4,
          ...(reserveTaskLane
            ? { top: taskLaneTop, bottom: 4 }
            : { bottom: 5 }),
        }}>
          {visible.map((t, i) => (
            <Box key={i} onClick={() => onTaskClick?.(t)} sx={{ cursor: 'pointer' }}>
              <TaskChip item={t} />
            </Box>
          ))}
          {overflow > 0 && (
            <>
              <Box
                onClick={(e) => setAnchor(e.currentTarget)}
                sx={{
                  bgcolor: T.bg3, color: T.text2, fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace', fontSize: 9,
                  textAlign: 'center', py: '2px', borderRadius: 0.75, cursor: 'pointer',
                  letterSpacing: '0.04em', border: `1px solid ${T.border}`,
                  '&:hover': { bgcolor: T.primaryTint, color: T.primaryDeep, borderColor: T.primary },
                }}>+{overflow} autres</Box>
              <Popover
                open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                PaperProps={{ sx: { p: 1.25, borderRadius: 1.5, minWidth: 220, boxShadow: '0 12px 32px rgba(20,17,10,0.18)' } }}
              >
                <Typography sx={{
                  fontSize: 10, fontWeight: 700, color: T.text3, fontFamily: '"Geist Mono", monospace',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                  pb: 0.75, mb: 1, borderBottom: `1px solid ${T.border}`,
                }}>{tasks.length} tâches · {day.iso}</Typography>
                <Stack gap={0.5}>
                  {tasks.map((t, i) => (
                    <Box key={i} onClick={() => { onTaskClick?.(t); setAnchor(null); }} sx={{ cursor: 'pointer' }}>
                      <TaskChip item={t} />
                    </Box>
                  ))}
                </Stack>
              </Popover>
            </>
          )}
        </Stack>
      )}
    </Box>
  );
}

/* ─── MiniMap 30j ─── */
function MiniMap({ days, listings, visibleStart, visibleEnd, mode = 'tasks' }: {
  days: ReturnType<typeof genDays>; listings: ListingRow[];
  visibleStart: number; visibleEnd: number;
  mode?: 'tasks' | 'reservations';
}) {
  const load = useMemo(() => {
    const map = new Map<string, number>();
    if (mode === 'reservations') {
      listings.forEach(l => l.reservations.forEach(r => {
        const arr = (r.arrivalDate || '').slice(0, 10);
        const dep = (r.departureDate || '').slice(0, 10);
        days.forEach(d => {
          if (d.iso >= arr && d.iso < dep) {
            map.set(d.iso, (map.get(d.iso) || 0) + 1);
          }
        });
      }));
      return map;
    }
    listings.forEach(l => l.reservations.forEach(r => r.timeline?.forEach(t => {
      const iso = (t.scheduledFor || '').slice(0, 10);
      map.set(iso, (map.get(iso) || 0) + 1);
    })));
    return map;
  }, [listings, days, mode]);

  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5,
      p: '10px 14px', mb: 1.25, display: 'flex', alignItems: 'center', gap: 1.75,
      fontSize: 11, color: T.text3, boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
    }}>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 10, flexShrink: 0,
      }}>{days.length}j</Typography>
      <Box sx={{
        flex: 1, display: 'grid', gridTemplateColumns: `repeat(${days.length}, 1fr)`,
        gap: '1.5px', height: 18, position: 'relative',
      }}>
        {days.map(d => {
          const n = load.get(d.iso) || 0;
          const cls = n >= 3 ? 'busy' : n > 0 ? 'has-task' : 'empty';
          let bg = cls === 'busy' ? T.primary : cls === 'has-task' ? 'rgba(184,133,26,0.30)' : T.bg3;
          if (d.isToday) {
            bg = T.error;
          } else if (d.isYesterday) {
            bg = 'rgba(100,116,139,0.55)';
          } else if (d.isPast) {
            bg = 'rgba(100,116,139,0.28)';
          }
          return (
            <Box key={d.iso} sx={{
              bgcolor: bg, borderRadius: '2px', height: '100%',
              ...(d.isToday ? { boxShadow: `0 0 0 1.5px ${T.bg1}, 0 0 0 2.5px ${T.error}` } : {}),
              ...(d.isYesterday ? { boxShadow: `0 0 0 1px rgba(100,116,139,0.35)` } : {}),
            }} />
          );
        })}
        <Box sx={{
          position: 'absolute', top: -2, bottom: -2,
          left: `${(visibleStart / days.length) * 100}%`,
          width: `${((visibleEnd - visibleStart) / days.length) * 100}%`,
          bgcolor: 'rgba(184,133,26,0.15)',
          border: `1.5px solid ${T.primary}`, borderRadius: '3px', pointerEvents: 'none',
        }} />
      </Box>
    </Box>
  );
}

/* ─── Legend Pill ─── */
function PastDayLegendPill({ kind, label, dense = false }: { kind: 'past' | 'yesterday' | 'today'; label: string; dense?: boolean }) {
  const swatch =
    kind === 'today'
      ? { bgcolor: T.primaryTint, border: `2px solid ${T.primary}` }
      : kind === 'yesterday'
        ? { bgcolor: 'rgba(100,116,139,0.14)', border: '2px solid rgba(100,116,139,0.38)' }
        : {
            bgcolor: 'rgba(100,116,139,0.07)',
            border: '1px solid rgba(100,116,139,0.2)',
            backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 2px, rgba(100,116,139,0.12) 2px, rgba(100,116,139,0.12) 4px)`,
          };
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: dense ? 0.35 : 0.5,
      px: dense ? 0.5 : 1, py: dense ? '1px' : '3px', borderRadius: 999,
      fontSize: dense ? 8.5 : 10, fontWeight: 600,
      color: T.text3, bgcolor: T.bg2,
    }}>
      <Box sx={{ width: dense ? 7 : 10, height: dense ? 7 : 10, borderRadius: '2px', flexShrink: 0, ...swatch }} />
      {label}
    </Box>
  );
}

function LegendPill({ icon, label, dense = false }: { icon: string; label: string; dense?: boolean }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: dense ? 0.35 : 0.625,
      px: dense ? 0.5 : 1, py: dense ? '1px' : '3px', borderRadius: 999,
      fontSize: dense ? 9 : 10.5, fontWeight: 600, flexShrink: 0,
      color: T.text2, bgcolor: T.bg2,
    }}>
      <span style={{ fontSize: dense ? 9 : 11 }}>{icon}</span>{label}
    </Box>
  );
}

function FilterTogglePill({ label, active, onClick, color, dense = false, title }: {
  label: string; active: boolean; onClick: () => void; color: string; dense?: boolean; title?: string;
}) {
  return (
    <Box component="button" title={title} onClick={onClick} sx={{
      all: 'unset', cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: dense ? 20 : undefined,
      gap: 0.625,
      px: dense ? 0.5 : 1, py: dense ? '2px' : '3px', borderRadius: 999,
      fontSize: dense ? 9 : 10.5, fontWeight: 700,
      color: active ? color : T.text3,
      bgcolor: active ? `${color}18` : T.bg2,
      border: `1px solid ${active ? color : T.border}`,
      flexShrink: 0,
    }}>
      {label}
    </Box>
  );
}

function ChannelLegendPill({ label, color, dense = false }: { label: string; color: string; dense?: boolean }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: dense ? 0.3 : 0.5,
      px: dense ? 0.5 : 1, py: dense ? '1px' : '3px', borderRadius: 999,
      fontSize: dense ? 8.5 : 10.5, fontWeight: 600,
      color: T.text2, bgcolor: T.bg2,
    }}>
      <Box sx={{ width: dense ? 6 : 8, height: dense ? 6 : 8, borderRadius: '50%', bgcolor: color }} />
      {label}
    </Box>
  );
}

function MiniKpi({ count, label, tone }: { count: number; label: string; tone: string }) {
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.35,
      px: 0.6, py: '1px', borderRadius: 99,
      border: `1px solid ${T.border}`, bgcolor: T.bg1, lineHeight: 1,
    }}>
      <Box component="span" sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 10, fontWeight: 700, color: tone,
      }}>{count}</Box>
      <Box component="span" sx={{ fontSize: 8.5, fontWeight: 700, color: T.text3, textTransform: 'uppercase' }}>
        {label}
      </Box>
    </Box>
  );
}
