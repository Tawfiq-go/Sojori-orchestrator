// ════════════════════════════════════════════════════════════════════
// StayView.tsx — Vue Séjour / cockpit ops
// • Messages GLOBAUX sous barre résa (WA + OTA)
// • Arr/Enreg sur jour d’arrivée · Dép sur jour de départ (colonnes)
// • Tâches PAR JOUR dans les colonnes (2–6 lignes selon charge)
// • Couleur barre par canal (Airbnb/Booking/Vrbo/Direct)
// ════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Stack, Typography, Popover, Dialog, DialogTitle, DialogContent, DialogActions, Button, useMediaQuery, useTheme } from '@mui/material';
import FilterListIcon from '@mui/icons-material/FilterList';
import CalendarDatePicker from '../calendar-v3/CalendarDatePicker';
import {
  T, STAY, STAY_COMPACT, COCKPIT_META, stayMetrics, type StayMetrics, type ListingRow, type TimelineItem,
  type TaskUrgency, type PlanningCreateContext,
  channelFromName, genDays, listingCockpitRowHeight, dayTaskLaneTop, taskLaneHeightForLines,
  commsMetaLineCount,
  KpiPill, DayHeader, TaskChip, StayOpsDayLane, CockpitCommsDualRow, GanttBar, SOJORI_KEYFRAMES,
  computeReservationBarLayout, computeReservationMessagesLayout, planningDaySurfaceSx,
  stayOpsDayPillCount, resolveTaskUrgency,
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
import ListingGroupMultiFilter from './ListingGroupMultiFilter';
import {
  expandPlanningListingRows,
  isPlanningMultiHotel,
} from '../../utils/planningMultiExpand';

export type StayViewVariant = 'tasks' | 'reservations';

/** Couches cockpit planning : vue globale filtrable. */
export type StayCockpitLayer = 'all' | 'resas' | 'tasks' | 'messages';

export interface StayViewProps {
  startDate: Date;
  daysCount?: number;           // défaut 30 (mini-map) — vue 14j visible
  listings: ListingRow[];
  /** tasks = chips tâches + KPI ops ; reservations = barres séjour uniquement + filtres statut */
  variant?: StayViewVariant;
  /** Filtre couche cockpit (défaut all). */
  cockpitLayer?: StayCockpitLayer;
  onCockpitLayerChange?: (layer: StayCockpitLayer) => void;
  onTaskClick?: (item: TimelineItem) => void;
  /** Clic barre résa → drawer (pas de navigation). */
  onReservationClick?: (
    reservation: ListingRow['reservations'][0],
    listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>,
  ) => void;
  /** Clic carte WA / OTA → drawer résa (focus canal). */
  onCommsClick?: (
    kind: 'wa' | 'ota',
    reservation: ListingRow['reservations'][0],
    listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>,
  ) => void;
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
  /** Clic droit sur une cellule → créer une tâche : le contexte (logement, jour, résa) est déduit. */
  onCreateTaskAt?: (ctx: PlanningCreateContext, anchor: { x: number; y: number }) => void;
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
  /**
   * Cockpit Communications (onglet Résas) :
   * tâches par jour + filtres Tout/Résas/Tâches.
   * Pas de cartes WA/OTA sous la barre (ça masque le nom / bloque les clics) —
   * la comm se fait via le panneau au clic résa.
   * Le planning /tasks reste classique si false.
   */
  enableCommsCockpit?: boolean;
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
  onCommsClick,
  onGoToday, onPrevDay, onNextDay, onPrevWeek, onNextWeek, onDateChange, onCleanlinessChange,
  onCreateTaskAt,
  todayBackDays = 2,
  compactLayout = false,
  denseToolbar = false,
  gridOnly = false,
  fillViewport = false,
  showFullscreenEnter = false,
  onEnterFullscreen,
  cockpitLayer: cockpitLayerProp,
  onCockpitLayerChange,
  enableCommsCockpit = false,
}: StayViewProps) {
  const isReservations = variant === 'reservations';
  const [internalCockpitLayer, setInternalCockpitLayer] = useState<StayCockpitLayer>('all');
  /** Multi MEWS : ▶ ouvre les roomTypes (collapsed par défaut). */
  const [multiExpanded, setMultiExpanded] = useState<Record<string, boolean>>({});
  const cockpitLayer = cockpitLayerProp ?? internalCockpitLayer;
  const setCockpitLayer = onCockpitLayerChange ?? setInternalCockpitLayer;
  /** Planning classique : tâches seulement. Cockpit Résas : tâches + msgs. */
  const showTaskChips = enableCommsCockpit
    ? cockpitLayer === 'all' || cockpitLayer === 'tasks'
    : !isReservations && cockpitLayer !== 'resas';
  const showMessageSnippets = enableCommsCockpit
    && (cockpitLayer === 'all' || cockpitLayer === 'messages');
  const showCockpitFilters = enableCommsCockpit;
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const useDenseChrome = compactLayout || denseToolbar;
  /** Planning / cockpit : colonnes plus larges pour chips tâches lisibles. */
  const m = useMemo(() => {
    const base = stayMetrics(compactLayout, isNarrow);
    if (!enableCommsCockpit) return base;
    return { ...base, CELL_W: Math.round(base.CELL_W * 1.5) };
  }, [compactLayout, isNarrow, enableCommsCockpit]);
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
  /** Groupes (villes) sélectionnés — vide = tous. */
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  /** Listings multi — vide = tous. */
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  /** Recherche globale (listing, ville, guest, n° résa, téléphone). */
  const [searchQuery, setSearchQuery] = useState('');
  /** Filtre priorité 3 couleurs — « rouge j'agis, orange je regarde, vert je continue ». */
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | TaskUrgency>('all');
  const [filtersModalOpen, setFiltersModalOpen] = useState(false);
  const [tempCleanlinessFilters, setTempCleanlinessFilters] = useState<Set<CleanlinessFilter>>(new Set());
  const [tempStatusFilters, setTempStatusFilters] = useState<Set<'confirmed' | 'pending'>>(
    () => new Set(['confirmed', 'pending']),
  );
  /** Cockpit ops : les barres résa ne sont jamais filtrées (statut / tâches). */
  const keepAllReservations = enableCommsCockpit;

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
    // Planning classique résas : filtre statut. Cockpit ops : résas toujours visibles.
    if (isReservations && !keepAllReservations) {
      rows = rows.map((l) => ({
        ...l,
        reservations: l.reservations.filter((r) => statusFilters.has(r.status)),
      }));
    }

    // Couche « Résas » : masquer les chips tâches (timeline vide), pas les barres.
    if (enableCommsCockpit && cockpitLayer === 'resas') {
      rows = rows.map((l) => ({
        ...l,
        reservations: l.reservations.map((r) => ({ ...r, timeline: [] })),
      }));
    }

    if (urgencyFilter !== 'all') {
      rows = rows.map((l) => ({
        ...l,
        reservations: l.reservations.map((r) => ({
          ...r,
          timeline: (r.timeline || []).filter((t) => {
            const st = String(t.status || '');
            if (st === 'COMPLETED' || st === 'CANCELLED') return urgencyFilter === 'green';
            return resolveTaskUrgency(t) === urgencyFilter;
          }),
        })),
      }));
    }

    if (cleanlinessFilters.size === 0) return rows;
    return rows.filter((l) =>
      matchesCleanlinessFilter(
        { ...l, reservations: l.reservations },
        cleanlinessFilters,
      ),
    );
  }, [
    listings,
    isReservations,
    statusFilters,
    cleanlinessFilters,
    cockpitLayer,
    enableCommsCockpit,
    keepAllReservations,
    urgencyFilter,
  ]);

  const listingGroupOptions = useMemo(() => {
    const map = new Map<string, number>();
    listings.forEach((l) => {
      const c = l.city || 'Sans ville';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, label: id, count }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
  }, [listings]);

  const listingPickOptions = useMemo(
    () =>
      [...listings]
        .map((l) => ({
          id: l.listingId,
          label: l.listingName || l.listingId,
          count: l.reservations?.length || 0,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    [listings],
  );

  // Écarte les groupes / listings disparus du portefeuille courant.
  useEffect(() => {
    if (selectedCities.length === 0) return;
    const allowed = new Set(listingGroupOptions.map((o) => o.id));
    const next = selectedCities.filter((c) => allowed.has(c));
    if (next.length !== selectedCities.length) setSelectedCities(next);
  }, [listingGroupOptions, selectedCities]);

  useEffect(() => {
    if (selectedListingIds.length === 0) return;
    const allowed = new Set(listingPickOptions.map((o) => o.id));
    const next = selectedListingIds.filter((id) => allowed.has(id));
    if (next.length !== selectedListingIds.length) setSelectedListingIds(next);
  }, [listingPickOptions, selectedListingIds]);

  const filteredByGroup = useMemo(() => {
    let rows = displayListings;
    if (selectedCities.length > 0) {
      const set = new Set(selectedCities);
      rows = rows.filter((l) => set.has(l.city || 'Sans ville'));
    }
    if (selectedListingIds.length > 0) {
      const set = new Set(selectedListingIds);
      rows = rows.filter((l) => set.has(l.listingId));
    }
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    const digits = q.replace(/\D/g, '');
    return rows.filter((l) => {
      if ((l.listingName || '').toLowerCase().includes(q)) return true;
      if ((l.city || '').toLowerCase().includes(q)) return true;
      if ((l.listingId || '').toLowerCase().includes(q)) return true;
      return (l.reservations || []).some((r) => {
        if ((r.guestName || '').toLowerCase().includes(q)) return true;
        if ((r.reservationNumber || '').toLowerCase().includes(q)) return true;
        if ((r.reservationId || '').toLowerCase().includes(q)) return true;
        const phone = String(r.lastWa?.phone || '').replace(/\D/g, '');
        if (digits.length >= 4 && phone.includes(digits)) return true;
        return false;
      });
    });
  }, [displayListings, selectedCities, selectedListingIds, searchQuery]);

  // Compteurs priorité — listings bruts (hors filtre couleur) pour ne pas s'auto-cacher.
  const urgencyCounts = useMemo(() => {
    const counts = { red: 0, orange: 0, green: 0 };
    let rows = listings;
    if (selectedCities.length > 0) {
      const set = new Set(selectedCities);
      rows = rows.filter((l) => set.has(l.city || 'Sans ville'));
    }
    if (selectedListingIds.length > 0) {
      const set = new Set(selectedListingIds);
      rows = rows.filter((l) => set.has(l.listingId));
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      const digits = q.replace(/\D/g, '');
      rows = rows.filter((l) => {
        if ((l.listingName || '').toLowerCase().includes(q)) return true;
        if ((l.city || '').toLowerCase().includes(q)) return true;
        return (l.reservations || []).some((r) => {
          if ((r.guestName || '').toLowerCase().includes(q)) return true;
          if ((r.reservationNumber || '').toLowerCase().includes(q)) return true;
          const phone = String(r.lastWa?.phone || '').replace(/\D/g, '');
          return digits.length >= 4 && phone.includes(digits);
        });
      });
    }
    rows.forEach((l) =>
      l.reservations?.forEach((r) =>
        r.timeline?.forEach((t) => {
          const st = String(t.status || '');
          if (st === 'COMPLETED' || st === 'CANCELLED') return;
          counts[resolveTaskUrgency(t)] += 1;
        }),
      ),
    );
    return counts;
  }, [listings, selectedCities, selectedListingIds, searchQuery]);

  // KPI "aujourd'hui"
  const kpis = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let arr = 0;
    let dep = 0;
    let confirmed = 0;
    let pending = 0;
    let cln = 0;
    let na = 0;
    if (isReservations) {
      filteredByGroup.forEach((l) =>
        l.reservations.forEach((r) => {
          const arrIso = (r.arrivalDate || '').slice(0, 10);
          const depIso = (r.departureDate || '').slice(0, 10);
          if (arrIso === today) arr++;
          if (depIso === today) dep++;
          if (r.status === 'confirmed') confirmed++;
          else pending++;
        }),
      );
    } else {
      filteredByGroup.forEach((l) =>
        l.reservations.forEach((r) =>
          r.timeline?.forEach((t) => {
            if ((t.scheduledFor || '').slice(0, 10) !== today) return;
            if (t.type === 'arrival') arr++;
            if (t.type === 'departure') dep++;
            if (t.type === 'cleaning') cln++;
            if (!t.staffId && t.status !== 'COMPLETED') na++;
          }),
        ),
      );
    }
    return { arr, dep, confirmed, pending, cln, na };
  }, [filteredByGroup, isReservations]);

  // Group by city — Multi expand ▶ roomTypes (comme MultiView MEWS)
  const byCity = useMemo(() => {
    const map = new Map<string, ListingRow[]>();
    filteredByGroup.forEach((l) => {
      const c = l.city || 'Sans ville';
      const rows = expandPlanningListingRows(l, Boolean(multiExpanded[l.listingId]));
      if (!map.has(c)) map.set(c, []);
      map.get(c)!.push(...rows);
    });
    return Array.from(map.entries());
  }, [filteredByGroup, multiExpanded]);

  const toggleMultiHotel = useCallback((listingId: string) => {
    setMultiExpanded((prev) => ({ ...prev, [listingId]: !prev[listingId] }));
  }, []);

  const showChrome = !gridOnly;
  const showMinimap = showChrome && !compactLayout && !denseToolbar;
  const flexFill = fillViewport || compactLayout;

  const activePlanningFiltersCount = useMemo(() => {
    let n = cleanlinessFilters.size;
    if (selectedCities.length > 0) n += 1;
    if (selectedListingIds.length > 0) n += 1;
    if (searchQuery.trim()) n += 1;
    if (isReservations && !keepAllReservations) {
      if (!statusFilters.has('confirmed') || !statusFilters.has('pending')) n += 1;
    }
    return n;
  }, [
    cleanlinessFilters,
    statusFilters,
    isReservations,
    selectedCities,
    selectedListingIds,
    searchQuery,
    keepAllReservations,
  ]);

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
    setSelectedCities([]);
    setSelectedListingIds([]);
    setSearchQuery('');
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

  const toggleUrgency = (u: TaskUrgency) => {
    setUrgencyFilter((prev) => (prev === u ? 'all' : u));
  };

  const urgencyBanner = !isReservations ? (
    <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center', flexShrink: 0 }}>
      {(
        [
          { id: 'red' as const, label: '🔴', count: urgencyCounts.red, color: T.error },
          { id: 'orange' as const, label: '🟠', count: urgencyCounts.orange, color: T.warning },
          { id: 'green' as const, label: '🟢', count: urgencyCounts.green, color: T.success },
        ] as const
      ).map((p) => {
        const active = urgencyFilter === p.id;
        return (
          <Box
            key={p.id}
            component="button"
            type="button"
            title={
              p.id === 'red'
                ? 'Agir maintenant'
                : p.id === 'orange'
                  ? 'À surveiller'
                  : 'OK — à l’heure'
            }
            onClick={() => toggleUrgency(p.id)}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              fontWeight: 750,
              px: '8px',
              py: '3px',
              borderRadius: '7px',
              border: `1px solid ${active ? p.color : T.border}`,
              bgcolor: active ? `${p.color}18` : T.bg1,
              color: active ? p.color : T.text2,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {p.label} {p.count}
          </Box>
        );
      })}
    </Stack>
  ) : null;

  const kpiRow = (
    <Stack sx={{ flexDirection: 'row', flexWrap: 'wrap', gap: compactLayout ? 0.5 : 1.25, alignItems: 'center' }}>
      {urgencyBanner}
      {urgencyBanner ? <Box sx={{ width: '1px', height: 18, bgcolor: T.border, flexShrink: 0 }} /> : null}
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
      {showCockpitFilters && (
        <Stack direction="row" sx={{ gap: 0.75, ml: { xs: 0, md: 0.5 }, flexWrap: 'wrap', alignItems: 'center' }}>
          {(
            [
              { id: 'all' as const, label: 'Tout', hint: 'résas + tâches + messages' },
              { id: 'resas' as const, label: 'Résas', hint: 'barres seules (toujours visibles)' },
              { id: 'tasks' as const, label: 'Tâches', hint: 'chips tâches (résas restent)' },
              { id: 'messages' as const, label: 'Msgs', hint: 'aperçus WA / OTA' },
            ] as const
          ).map((tab) => {
            const active = cockpitLayer === tab.id;
            return (
              <Box
                key={tab.id}
                component="button"
                type="button"
                onClick={() => setCockpitLayer(tab.id)}
                sx={{
                  all: 'unset',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: compactLayout ? 11 : 12.5,
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '-0.01em',
                  px: compactLayout ? '10px' : '13px',
                  py: compactLayout ? '5px' : '6px',
                  borderRadius: '7px',
                  border: `1px solid ${active ? T.ink : T.borderStrong}`,
                  bgcolor: active ? T.ink : T.bg1,
                  color: active ? T.cream : T.text2,
                  transition: 'background 0.16s, color 0.16s, border-color 0.16s',
                }}
              >
                {tab.label}
              </Box>
            );
          })}
          {!compactLayout && (
            <Box
              component="span"
              sx={{
                ml: 0.5,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10.5,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: T.text4,
              }}
            >
              {cockpitLayer === 'all'
                ? 'tout visible · hover = détail'
                : cockpitLayer === 'resas'
                  ? 'barres seules · hover = détail'
                  : 'résas avec tâches · hover = détail'}
            </Box>
          )}
        </Stack>
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
                  {enableCommsCockpit ? 'Planning' : isReservations ? 'Planning Réservations' : 'Planning Tâches'}
                </Typography>
                <Typography sx={{ fontSize: 10, color: T.text3, fontFamily: '"Geist Mono", monospace', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {displayListings.length} prop. · {daysCount}j · {VISIBLE_DAYS}j vis.
                </Typography>
                <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
                {urgencyBanner}
                {urgencyBanner ? <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} /> : null}
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
                {showCockpitFilters && (
                  <>
                    {(
                      [
                        { id: 'all' as const, label: 'Tout' },
                        { id: 'resas' as const, label: 'Résas' },
                        { id: 'tasks' as const, label: 'Tâches' },
                        { id: 'messages' as const, label: 'Msgs' },
                      ] as const
                    ).map((tab) => {
                      const active = cockpitLayer === tab.id;
                      return (
                        <Box
                          key={tab.id}
                          component="button"
                          type="button"
                          onClick={() => setCockpitLayer(tab.id)}
                          sx={{
                            all: 'unset',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: 11,
                            fontWeight: active ? 700 : 500,
                            px: '10px',
                            py: '4px',
                            borderRadius: '7px',
                            border: `1px solid ${active ? T.ink : T.borderStrong}`,
                            bgcolor: active ? T.ink : T.bg1,
                            color: active ? T.cream : T.text2,
                            flexShrink: 0,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {tab.label}
                        </Box>
                      );
                    })}
                    <Box sx={{ width: '1px', height: 16, bgcolor: T.border, flexShrink: 0 }} />
                  </>
                )}
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
                <Box
                  component="input"
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  placeholder="🔍 Listing, guest, n°…"
                  sx={{
                    all: 'unset',
                    boxSizing: 'border-box',
                    height: 22,
                    width: 150,
                    maxWidth: '28vw',
                    px: 1,
                    borderRadius: '6px',
                    border: `1px solid ${searchQuery.trim() ? T.primary : T.border}`,
                    bgcolor: searchQuery.trim() ? T.primaryTint : T.bg1,
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.text,
                    flexShrink: 0,
                    '&::placeholder': { color: T.text3, fontWeight: 500 },
                  }}
                />
                <ListingGroupMultiFilter
                  dense
                  buttonLabel="🏘 Villes"
                  allLabel="Toutes les villes"
                  searchPlaceholder="🔍 Ville…"
                  options={listingGroupOptions}
                  selected={selectedCities}
                  onChange={setSelectedCities}
                />
                <ListingGroupMultiFilter
                  dense
                  buttonLabel="🏠 Listings"
                  allLabel="Tous les listings"
                  searchPlaceholder="🔍 Listing…"
                  emptyLabel="Aucun listing"
                  options={listingPickOptions}
                  selected={selectedListingIds}
                  onChange={setSelectedListingIds}
                />
                <Box component="span" sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.5, height: 22, px: 0.75, borderRadius: 1,
                  bgcolor: T.bg2, border: `1px solid ${T.border}`, fontSize: 10, fontWeight: 600, color: T.text2, flexShrink: 0,
                }}>
                  🏠 {filteredByGroup.length}
                </Box>
                {isReservations && !keepAllReservations ? (
                  <>
                    <FilterTogglePill dense label="Conf." active={statusFilters.has('confirmed')} onClick={() => toggleStatus('confirmed')} color={T.success} />
                    <FilterTogglePill dense label="Att." active={statusFilters.has('pending')} onClick={() => toggleStatus('pending')} color={T.warning} />
                    <ChannelLegendPill dense label="Ab" color={T.airbnb} />
                    <ChannelLegendPill dense label="Bk" color={T.booking} />
                    <ChannelLegendPill dense label="Vr" color={T.vrbo} />
                    <ChannelLegendPill dense label="Di" color={T.primary} />
                  </>
                ) : isReservations ? (
                  <>
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
            {isReservations && !keepAllReservations ? (
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

        <Box
          component="input"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="🔍 Listing, ville, guest, n° résa, téléphone…"
          sx={{
            all: 'unset',
            boxSizing: 'border-box',
            height: 30,
            width: 220,
            maxWidth: '36vw',
            px: 1.25,
            borderRadius: '8px',
            border: `1px solid ${searchQuery.trim() ? T.primary : T.border}`,
            bgcolor: searchQuery.trim() ? T.primaryTint : T.bg1,
            fontSize: 12,
            fontWeight: 600,
            color: T.text,
            flexShrink: 0,
            '&::placeholder': { color: T.text3, fontWeight: 500 },
          }}
        />

        <ListingGroupMultiFilter
          buttonLabel="🏘 Villes"
          allLabel="Toutes les villes"
          searchPlaceholder="🔍 Ville…"
          options={listingGroupOptions}
          selected={selectedCities}
          onChange={setSelectedCities}
        />
        <ListingGroupMultiFilter
          buttonLabel="🏠 Listings"
          allLabel="Tous les listings"
          searchPlaceholder="🔍 Listing…"
          emptyLabel="Aucun listing"
          options={listingPickOptions}
          selected={selectedListingIds}
          onChange={setSelectedListingIds}
        />

        <Box component="span" sx={{
          height: 30, px: 1.375, borderRadius: 1,
          bgcolor: T.bg1, border: `1px solid ${T.border}`, fontSize: 11.5, fontWeight: 600,
          color: T.text2, display: 'inline-flex', alignItems: 'center', gap: 0.75,
        }}>
          🏠 Listings <Box component="span" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 9.5, bgcolor: T.bg3, color: T.text3,
            px: 0.625, borderRadius: 999, fontWeight: 700,
          }}>{filteredByGroup.length}</Box>
        </Box>

        {isReservations && !keepAllReservations ? (
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
        ) : isReservations ? (
          <Stack direction="row" gap={0.625} sx={{ flexWrap: 'wrap',  ml: 'auto' }}>
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
        listings={filteredByGroup}
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
              }}>{lists.filter((x) => !x.isRoomTypeRow).length}</Box>
            </Box>
            {lists.map(l => (
              <ListingRowComp
                key={l.listingId}
                listing={l}
                days={days}
                metrics={m}
                compactListing={compactLayout}
                showTaskChips={showTaskChips}
                showMessageSnippets={showMessageSnippets}
                richTaskChips={enableCommsCockpit || showTaskChips}
                multiExpanded={Boolean(
                  multiExpanded[l.parentListingId || l.listingId],
                )}
                onToggleMulti={
                  isPlanningMultiHotel(l) && !l.isRoomTypeRow
                    ? () => toggleMultiHotel(l.listingId)
                    : undefined
                }
                onTaskClick={onTaskClick}
                onReservationClick={onReservationClick}
                onCommsClick={onCommsClick}
                onCleanlinessChange={onCleanlinessChange}
                onCreateTaskAt={onCreateTaskAt}
              />
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
  listing, days, metrics, compactListing = false, showTaskChips = true, showMessageSnippets = false,
  richTaskChips = false,
  multiExpanded = false,
  onToggleMulti,
  onTaskClick, onReservationClick, onCommsClick, onCleanlinessChange, onCreateTaskAt,
}: {
  listing: ListingRow; days: ReturnType<typeof genDays>; metrics: StayMetrics;
  compactListing?: boolean;
  showTaskChips?: boolean;
  showMessageSnippets?: boolean;
  /** Colonnes élargies Résas : label + heure + staff sur le chip. */
  richTaskChips?: boolean;
  multiExpanded?: boolean;
  onToggleMulti?: () => void;
  onTaskClick?: (i: TimelineItem) => void;
  onReservationClick?: (
    reservation: ListingRow['reservations'][0],
    listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>,
  ) => void;
  onCommsClick?: (
    kind: 'wa' | 'ota',
    reservation: ListingRow['reservations'][0],
    listing: Pick<ListingRow, 'listingId' | 'listingName' | 'city'>,
  ) => void;
  onCleanlinessChange?: (listingId: string, status: DisplayCleanliness) => void | Promise<void>;
  /** Clic droit sur une cellule → créer une tâche (contexte déduit : logement + jour + résa). */
  onCreateTaskAt?: (ctx: PlanningCreateContext, anchor: { x: number; y: number }) => void;
}) {
  const isRoomTypeRow = Boolean(listing.isRoomTypeRow);
  const isMultiHotel = isPlanningMultiHotel(listing) && !isRoomTypeRow;
  const realListingId = listing.parentListingId || listing.listingId;
  const listingCtx = {
    listingId: realListingId,
    listingName: listing.parentListingName
      ? `${listing.parentListingName} · ${listing.listingName}`
      : listing.listingName,
    city: listing.city,
  };
  const numTasks = listing.reservations.reduce((n, r) => n + (r.timeline?.length || 0), 0);
  const displayStatus = deriveDisplayCleanliness(listing, listing.reservations);

  const barTop = compactListing ? STAY_COMPACT.RES_BAR_TOP : metrics.RES_BAR_TOP;
  const barH = compactListing ? STAY_COMPACT.RES_BAR_HEIGHT : metrics.RES_BAR_HEIGHT;

  /** Max lignes jour (tâches + 1 lane StayOps) pour hauteur cockpit. */
  const maxTasksOnDay = useMemo(() => {
    if (!showTaskChips && !showMessageSnippets) return 0;
    let max = 0;
    for (const d of days) {
      let n = 0;
      let hasStayOps = false;
      for (const r of listing.reservations) {
        for (const t of r.timeline || []) {
          if ((t.scheduledFor || '').slice(0, 10) !== d.iso) continue;
          if (showMessageSnippets) {
            const ty = String(t.type || '');
            if (ty === 'arrival' || ty === 'departure' || ty === 'registration') continue;
          }
          n += 1;
        }
        if (showMessageSnippets && stayOpsDayPillCount(r.stayOps, d.iso) > 0) hasStayOps = true;
      }
      if (hasStayOps) n += 1; // une seule ligne horizontale Dép | Arr
      if (n > max) max = n;
    }
    return max;
  }, [days, listing.reservations, showTaskChips, showMessageSnippets]);

  const taskLines = showTaskChips
    ? Math.max(
        COCKPIT_META.TASK_LANE_MIN_LINES,
        Math.min(COCKPIT_META.TASK_LANE_MAX_LINES, maxTasksOnDay || COCKPIT_META.TASK_LANE_MIN_LINES),
      )
    : 2;

  /** Résa courte sur la ligne → messages empilés (hauteur +), sans déborder. */
  const narrowMessages = useMemo(() => {
    if (!showMessageSnippets || !days.length) return false;
    const firstDay = days[0].date;
    const cellPct = 100 / days.length;
    for (const r of listing.reservations) {
      const arr = new Date(r.arrivalDate);
      const dep = new Date(r.departureDate);
      const arrIdx = Math.floor((+arr - +firstDay) / 86400000);
      const depIdx = Math.floor((+dep - +firstDay) / 86400000);
      if (depIdx < 0 || arrIdx > days.length - 1) continue;
      const startIdx = Math.max(0, arrIdx);
      const endIdx = Math.min(days.length - 1, depIdx);
      const { widthPct } = computeReservationBarLayout(startIdx, endIdx, days.length, {
        clippedStart: arrIdx < 0,
        clippedEnd: depIdx > days.length - 1,
      });
      if (widthPct < cellPct * 1.25) return true;
    }
    return false;
  }, [days, listing.reservations, showMessageSnippets]);

  /** Q/R + A sur une cellule → hauteur msg + (comme onglet OTA). */
  const dualMsgLines = useMemo(() => {
    if (!showMessageSnippets) return 1;
    let max = 1;
    for (const r of listing.reservations) {
      max = Math.max(max, commsMetaLineCount(r.lastWa), commsMetaLineCount(r.lastOta));
    }
    return max;
  }, [listing.reservations, showMessageSnippets]);

  // Planning classique = TASK_ROW_H. Cockpit Résas = barre + msgs + lane tâches.
  const rowHeight = compactListing
    ? (showTaskChips ? metrics.TASK_ROW_H : metrics.ROW_H)
    : showMessageSnippets
      ? listingCockpitRowHeight({
          barTop,
          barH,
          showMessages: true,
          showTasks: showTaskChips,
          taskLines,
          fallback: metrics.ROW_H,
          narrowMessages,
          dualMsgLines,
        })
      : (showTaskChips ? metrics.TASK_ROW_H : metrics.ROW_H);

  const taskLaneTopPx = compactListing
    ? STAY_COMPACT.RES_BAR_TOP + STAY_COMPACT.RES_BAR_HEIGHT + STAY_COMPACT.RES_TASK_GAP
    : showMessageSnippets
      ? dayTaskLaneTop({ barTop, barH, showMessages: true, narrowMessages, dualMsgLines })
      : metrics.RES_BAR_TOP + metrics.RES_BAR_HEIGHT + metrics.RES_TASK_GAP;

  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: `${metrics.STICKY_W}px repeat(${days.length}, ${metrics.CELL_W}px)`,
      borderBottom: `1px solid ${T.border}`, height: rowHeight, position: 'relative',
    }}>
      {/* Sticky left — Multi : ▶ + indent roomType (comme MultiView MEWS) */}
      <Stack
        onClick={onToggleMulti}
        sx={{
          px: isRoomTypeRow
            ? (compactListing ? '4px 5px 4px 14px' : '10px 14px 10px 28px')
            : (compactListing ? '4px 5px' : '14px'),
          py: compactListing ? '3px' : '11px',
          borderRight: `1px solid ${T.border}`,
          bgcolor: isRoomTypeRow ? T.bg2 : T.bg1,
          minWidth: 0,
          height: '100%',
          gap: compactListing ? 0.25 : 0.75,
          justifyContent: 'center',
          cursor: onToggleMulti ? 'pointer' : 'default',
          '&:hover': onToggleMulti ? { bgcolor: T.bg2 } : undefined,
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: compactListing
              ? (isMultiHotel ? '14px minmax(0, 1fr)' : 'minmax(0, 1fr)')
              : isRoomTypeRow
                ? 'minmax(0, 1fr)'
                : isMultiHotel
                  ? `14px ${metrics.LISTING_ICON_SIZE}px minmax(0, 1fr)`
                  : `${metrics.LISTING_ICON_SIZE}px minmax(0, 1fr)`,
            columnGap: compactListing ? 0.35 : `${metrics.LISTING_ICON_GAP}px`,
            alignItems: 'center',
            width: '100%',
          }}
        >
          {isMultiHotel && (
            <Box
              component="span"
              sx={{
                fontSize: 10,
                color: multiExpanded ? T.primary : T.text3,
                width: 14,
                textAlign: 'center',
                transform: multiExpanded ? 'rotate(90deg)' : 'none',
                transition: 'transform 0.2s',
                lineHeight: 1,
              }}
            >
              ▶
            </Box>
          )}
          {!compactListing && !isRoomTypeRow && (
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
                fontSize: isRoomTypeRow
                  ? (compactListing ? 9.5 : 11.5)
                  : (compactListing ? 10 : 12.5),
                fontWeight: isRoomTypeRow ? 600 : 700,
                lineHeight: 1.15,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                display: 'block',
              }}
              title={
                listing.parentListingName
                  ? `${listing.parentListingName} · ${listing.listingName}`
                  : listing.listingName
              }
            >
              {listing.listingName}
            </Typography>
            {!compactListing && !isRoomTypeRow && (
            <CleanlinessBadgeInteractive
              status={displayStatus}
              displayStatus={displayStatus}
              emergency={listing.cleanlinessEmergency}
              onChange={
                onCleanlinessChange
                  ? (next) => onCleanlinessChange(realListingId, next)
                  : undefined
              }
            />
            )}
            {!compactListing && isMultiHotel && (listing.roomTypeCount || 0) > 1 ? (
              <Typography
                sx={{
                  fontSize: 9.5,
                  color: T.text3,
                  fontFamily: '"Geist Mono", monospace',
                  letterSpacing: '0.02em',
                }}
              >
                {listing.roomTypeCount} types
              </Typography>
            ) : null}
          </Stack>
        </Box>

        {!compactListing && !isRoomTypeRow && (
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
        {!compactListing && isRoomTypeRow && (
        <Typography
          sx={{
            fontSize: 9.5,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
          }}
        >
          {listing.reservations.length} séj.
        </Typography>
        )}
      </Stack>

      {/* Day cells : StayOps (Arr/Enreg → arrivée, Dép → départ) + tâches */}
      {days.map(d => {
        const tasks = showTaskChips
          ? (listing.reservations || []).flatMap((r) =>
              (r.timeline || [])
                .filter((t) => {
                  if ((t.scheduledFor || '').slice(0, 10) !== d.iso) return false;
                  // Cockpit Résas : pas les workflows guest (Arr/Dép/Enreg = pastilles StayOps)
                  if (showMessageSnippets) {
                    const ty = String(t.type || '');
                    if (ty === 'arrival' || ty === 'departure' || ty === 'registration') return false;
                  }
                  return true;
                })
                .map((t) => ({
                  ...t,
                  data: {
                    ...(t.data || {}),
                    reservationNumber: r.reservationNumber || (t.data as { reservationNumber?: string } | undefined)?.reservationNumber,
                    reservationId: r.reservationId,
                  },
                })),
            )
          : [];
        const dayStayOps = showMessageSnippets
          ? (listing.reservations || [])
              .map((r) => r.stayOps)
              .filter((ops): ops is NonNullable<typeof ops> => Boolean(ops && stayOpsDayPillCount(ops, d.iso) > 0))
          : [];
        return (
          <DayCell
            key={d.iso}
            day={d}
            tasks={tasks}
            stayOpsList={dayStayOps}
            onTaskClick={onTaskClick}
            onCellContextMenu={
              onCreateTaskAt
                ? (e, dayIso) => {
                    e.preventDefault();
                    e.stopPropagation();
                    /* La position dit tout : logement + jour, et la résa en cours ce jour-là. */
                    const stay = (listing.reservations || []).find(
                      (r) =>
                        (r.arrivalDate || '').slice(0, 10) <= dayIso &&
                        dayIso <= (r.departureDate || '').slice(0, 10),
                    );
                    onCreateTaskAt(
                      {
                        listingId: realListingId,
                        listingName: listing.parentListingName
                          ? `${listing.parentListingName} · ${listing.listingName}`
                          : listing.listingName,
                        dayIso,
                        reservationId: stay?.reservationId,
                        reservationNumber: stay?.reservationNumber,
                        guestName: stay?.guestName,
                        isArrivalDay: (stay?.arrivalDate || '').slice(0, 10) === dayIso,
                        isDepartureDay: (stay?.departureDate || '').slice(0, 10) === dayIso,
                      },
                      { x: e.clientX, y: e.clientY },
                    );
                  }
                : undefined
            }
            reserveTaskLane={showTaskChips || dayStayOps.length > 0}
            taskLaneTop={taskLaneTopPx}
            maxVisible={showMessageSnippets ? Math.max(COCKPIT_META.TASK_LANE_MIN_LINES, taskLines) : 2}
            richChips={richTaskChips}
          />
        );
      })}

      {/* Gantt + MESSAGES GLOBAUX (par résa, sous la barre — pas par jour) */}
      <Box sx={{
        position: 'absolute', top: 0, left: metrics.STICKY_W,
        width: days.length * metrics.CELL_W, height: rowHeight, pointerEvents: 'none', zIndex: 3,
      }}>
        {(() => {
          const visibleReservations = listing.reservations
            .map(r => {
              const arr = new Date(r.arrivalDate);
              const dep = new Date(r.departureDate);
              const firstDay = days[0].date;
              const arrIdx = Math.floor((+arr - +firstDay) / 86400000);
              const depIdx = Math.floor((+dep - +firstDay) / 86400000);
              if (depIdx < 0 || arrIdx > days.length - 1) return null;
              const startIdx = Math.max(0, arrIdx);
              const endIdx = Math.min(days.length - 1, depIdx);
              return {
                r,
                startIdx,
                endIdx,
                clippedStart: arrIdx < 0,
                clippedEnd: depIdx > days.length - 1,
              };
            })
            .filter(Boolean) as Array<{
              r: (typeof listing.reservations)[0];
              startIdx: number;
              endIdx: number;
              clippedStart: boolean;
              clippedEnd: boolean;
            }>;

          return visibleReservations.map(({ r, startIdx, endIdx, clippedStart, clippedEnd }) => {
          const clip = { clippedStart, clippedEnd };
          const { leftPct, widthPct } = computeReservationBarLayout(
            startIdx,
            endIdx,
            days.length,
            clip,
          );
          // Messages = strictement la barre (matin = départ hier, après-midi = arrivée)
          const msgLayout = computeReservationMessagesLayout(
            startIdx,
            endIdx,
            days.length,
            clip,
          );
          const channel = channelFromName(r.channelName);
          const metaTop = barTop + barH + COCKPIT_META.BAR_GAP;
          // Stub checkout seul (résa d’hier qui part aujourd’hui) : trop étroit pour WA/OTA
          const checkoutStubOnly = clippedStart && startIdx >= endIdx;
          const hasWa = Boolean(
            r.lastWa?.exists ||
              r.lastWa?.lastMessageKind ||
              r.lastWa?.text ||
              (r.lastWa?.count || 0) > 0,
          );
          const hasOta = Boolean(
            r.lastOta?.exists ||
              r.lastOta?.lastMessageKind ||
              r.lastOta?.text ||
              (r.lastOta?.count || 0) > 0,
          );
          const isBlockRow = r.kind === 'block';
          return (
            <Box
              key={r.reservationId}
              onClick={
                onReservationClick && !isBlockRow
                  ? () => onReservationClick(r, listingCtx)
                  : undefined
              }
              sx={{ pointerEvents: 'auto', cursor: onReservationClick && !isBlockRow ? 'pointer' : 'default' }}
            >
              <GanttBar
                channel={channel}
                guestName={r.guestName}
                reservationNumber={r.reservationNumber}
                confirmed={r.status === 'confirmed'}
                leftPct={leftPct}
                widthPct={widthPct}
                compact={compactListing || checkoutStubOnly}
                hasOtaMsg={hasOta}
                hasWaMsg={hasWa}
                numberOfGuests={checkoutStubOnly ? undefined : r.numberOfGuests}
                arrivalDate={r.arrivalDate}
                departureDate={r.departureDate}
                lastWa={r.lastWa}
                lastOta={r.lastOta}
                roomTypeName={isRoomTypeRow ? undefined : r.roomTypeName}
                roomName={r.roomName}
                listingName={
                  listing.parentListingName || listing.listingName
                }
                isBlock={isBlockRow}
                blockNote={r.blockNote}
                blockAuthor={r.blockAuthor}
              />
              {showMessageSnippets && !checkoutStubOnly && !isBlockRow && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: metaTop,
                    left: `${msgLayout.leftPct}%`,
                    width: `${msgLayout.widthPct}%`,
                    maxWidth: `${msgLayout.widthPct}%`,
                    boxSizing: 'border-box',
                    px: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: `${COCKPIT_META.CARD_GAP}px`,
                    zIndex: 5,
                    pointerEvents: 'auto',
                    overflow: 'hidden',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <CockpitCommsDualRow
                    wa={r.lastWa}
                    ota={r.lastOta}
                    otaChannel={channel}
                    narrow={msgLayout.narrow}
                    onWaClick={onCommsClick ? () => onCommsClick('wa', r, listingCtx) : undefined}
                    onOtaClick={onCommsClick ? () => onCommsClick('ota', r, listingCtx) : undefined}
                  />
                </Box>
              )}
            </Box>
          );
          });
        })()}
      </Box>
    </Box>
  );
}

/* ─── Day cell with chip overflow popover ─── */
function DayCell({
  day,
  tasks,
  stayOpsList = [],
  onTaskClick,
  reserveTaskLane = false,
  taskLaneTop,
  maxVisible,
  richChips = false,
  onCellContextMenu,
}: {
  day: ReturnType<typeof genDays>[0];
  tasks: TimelineItem[];
  stayOpsList?: NonNullable<ListingRow['reservations'][0]['stayOps']>[];
  onTaskClick?: (i: TimelineItem) => void;
  reserveTaskLane?: boolean;
  taskLaneTop?: number;
  /** Nombre de chips empilés visibles (2 lignes min → jusqu’à 6). */
  maxVisible?: number;
  richChips?: boolean;
  /** Clic droit sur la cellule → création de tâche (contexte déduit de la position). */
  onCellContextMenu?: (e: React.MouseEvent, dayIso: string) => void;
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const cleaningTasks = tasks.filter((t) => String(t.type || '') === 'cleaning');
  const otherTasks = tasks.filter((t) => String(t.type || '') !== 'cleaning');
  // Ménage toujours sur sa ligne (pas à côté Arr/Dép), pleine largeur dès la ligne jour.
  const restTasks = otherTasks;
  const limit = maxVisible ?? STAY.MAX_CHIPS;
  const visible = restTasks.slice(0, limit);
  const overflow = restTasks.length - limit;
  const laneTop = taskLaneTop ?? (STAY.RES_BAR_TOP + STAY.RES_BAR_HEIGHT + STAY.RES_TASK_GAP);
  const hasLaneContent = tasks.length > 0 || stayOpsList.length > 0;

  return (
    <Box
      onContextMenu={onCellContextMenu ? (e) => onCellContextMenu(e, day.iso) : undefined}
      sx={{
        borderRight: `1px solid ${T.border}`, position: 'relative',
        ...planningDaySurfaceSx(day),
      }}
    >
      {hasLaneContent && (
        <Stack sx={{
          position: 'absolute',
          // Coller à la ligne verticale du jour → max largeur pour le texte tâche
          left: 0,
          right: 1,
          flexDirection: 'column',
          gap: richChips ? 0.4 : 0.3,
          zIndex: 6,
          overflow: 'visible',
          ...(reserveTaskLane
            ? { top: laneTop, bottom: 4 }
            : { bottom: 5 }),
        }}>
          {stayOpsList.length > 0 && (
            <StayOpsDayLane opsList={stayOpsList} dayIso={day.iso} />
          )}
          {cleaningTasks.map((t, i) => (
            <Box
              key={`cl-${i}`}
              sx={{
                display: 'flex',
                justifyContent: richChips ? 'stretch' : 'center',
                width: '100%',
              }}
            >
              <TaskChip
                item={t}
                rich={richChips}
                fitContent={!richChips}
                onClick={() => onTaskClick?.(t)}
              />
            </Box>
          ))}
          {visible.map((t, i) => (
            <TaskChip key={i} item={t} rich={richChips} onClick={() => onTaskClick?.(t)} />
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
                      <TaskChip item={t} rich={richChips} />
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
