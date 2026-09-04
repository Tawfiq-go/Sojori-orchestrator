import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { lazyWithReload } from '../utils/lazyWithReload';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  StableChart,
  btnGhostSx,
  btnPrimarySx,
} from '../components/dashboard/DashboardV2.components';
import { T } from '../features/dynamic-pricing/_tokens';
import { dashboardPeriods } from '../data/mockDashboard';

const OrchestrationOpsCards = lazyWithReload(() =>
  import('../features/dashboardOps/OrchestrationOpsCards').then((m) => ({ default: m.default }))
);
import { ListingCheckboxFilter } from '../components/dashboard/ListingCheckboxFilter';
import {
  MonthPickerChip,
  stepMonthKey,
  useMonthPickerState,
} from '../components/dashboard/MonthPickerChip';
import { withPropertyShortLabels } from '../utils/propertyShortLabel';
import {
  EMPTY_DASHBOARD_SNAPSHOT,
  applyDashboardExtrasProgressively,
  ensureDashboardSnapshot,
  fetchDashboardListingDirectory,
  fetchDashboardV1Charts,
  fetchDashboardV1Fast,
  finalizeDashboardSnapshot,
  formatDashboardRating,
  mergeDashboardSnapshots,
} from '../services/dashboardV1Service';
import { dashboardService } from '../services/dashboardService';
import {
  readDashboardSnapshotCacheEntry,
  writeDashboardListingIdsHint,
  writeDashboardSnapshotCache,
  clearAllDashboardSnapshotCaches,
} from '../utils/dashboardSnapshotCache';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { usePmSimulation } from '../context/PmSimulationContext';
import { useAuth } from '../hooks/useAuth';
import { dashboardDebugEnabled, logDashboard, logDashboardApiDetail, logDashboardKpisSummary } from '../utils/dashboardDebug';
import { canAccessProtectedRoutes } from '../utils/devApiAccess';
import { getToken } from '../utils/authUtils';
import type {
  DashboardPeriod,
  DashboardPropertyOption,
  DashboardSnapshot,
} from '../types/dashboard.types';


const MONO = 'ui-monospace, "SF Mono", "Cascadia Mono", Menlo, monospace';
/** Palette Atelier — alignée sur T.gold/T.ai/T.success/T.info (dynamic-pricing). */
const chartColors = [T.gold, T.ai, T.success, T.info];

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'MAD',
  maximumFractionDigits: 0,
});

const SCROLL_LIST_MAX_HEIGHT = 320;
const VISIBLE_LIST_HINT = '4 visibles · scroll';
/** Au-delà : pas de % sur les barres (illisibles) — hover = nom + %. */
const OCCUPANCY_BAR_LABEL_MAX = 12;
const OCCUPANCY_CHART_HINT = 'initiales · % sur barres si ≤12 · hover = nom + %';

/* ─── Présentation Atelier locale (reskin pur — même logique React) ─── */

function AtelierStatsRow({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.75, mb: 2.75 }}>
      {children}
    </Box>
  );
}

function AtelierStatCard({
  value,
  label,
  trend,
  trendUp,
  accent = T.gold,
}: {
  value: string;
  label: string;
  trend?: string;
  trendUp?: boolean;
  accent?: string;
}) {
  const trendStr = String(trend ?? '').trim();
  const hasDelta = /[-+−]?\d/.test(trendStr) && trendStr !== '—' && !/MAD$/.test(trendStr);
  const isNegative = /^[-−]/.test(trendStr);
  const isZero = /^[+-−]?0([.,]0+)?\s*%?$/.test(trendStr);
  const up = typeof trendUp === 'boolean' ? trendUp : !isNegative;
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderTop: `3px solid ${accent}`,
        borderRadius: '12px',
        p: 2.25,
        transition: 'box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1), transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)',
        '&:hover': {
          boxShadow: '0 10px 28px rgba(20,17,10,0.08)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
        <Typography sx={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text3 }}>
          {label}
        </Typography>
        {hasDelta ? (
          <Box
            component="span"
            sx={{
              fontFamily: MONO, fontSize: 10.5, fontWeight: 700, borderRadius: '99px', px: 1, py: 0.25,
              color: isZero ? T.text3 : up ? T.success : T.error,
              bgcolor: isZero ? T.bg3 : up ? T.successTint : T.errorTint,
            }}
          >
            {isZero ? '= stable' : up ? `▲ +${trendStr.replace(/^[+]/, '')}` : `▼ ${trendStr}`}
          </Box>
        ) : null}
      </Stack>
      <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
    </Box>
  );
}

function AtelierPanel({
  title,
  desc,
  headRight,
  children,
  sx,
}: {
  title?: string;
  desc?: string;
  headRight?: ReactNode;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: '16px',
        p: 2.25,
        ...sx,
      }}
    >
      {title ? (
        <Stack direction="row" spacing={1.25} sx={{ alignItems: 'baseline', mb: 2, pb: 1.5, borderBottom: `1px dashed ${T.border}` }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{title}</Typography>
          {desc ? (
            <Typography sx={{ ml: 'auto !important', fontFamily: MONO, fontSize: 11, color: T.text3 }}>{desc}</Typography>
          ) : null}
          {headRight}
        </Stack>
      ) : null}
      {children}
    </Box>
  );
}

function AtelierFilterBar({ children }: { children: ReactNode }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', flexWrap: 'wrap', mb: 1.75, rowGap: 1 }}>
      {children}
    </Stack>
  );
}

function AtelierFilterChip({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
        px: 1.5, py: 0.75, borderRadius: '99px',
        fontSize: 12, fontWeight: active ? 800 : 600,
        color: active ? T.goldDeep : T.text2,
        bgcolor: active ? T.goldTint2 : T.bg1,
        border: `1.5px solid ${active ? T.gold : T.border}`,
        transition: 'background-color 0.15s ease, border-color 0.15s ease',
        '&:hover': { borderColor: T.goldDeep },
      }}
    >
      {label}
    </Box>
  );
}

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'ai' | 'gold' | 'neutral';
const ATELIER_BADGE_COLORS: Record<BadgeVariant, { bg: string; color: string }> = {
  success: { bg: T.successTint, color: T.success },
  warning: { bg: T.warningTint, color: T.warning },
  error: { bg: T.errorTint, color: T.error },
  info: { bg: T.infoTint, color: T.info },
  ai: { bg: T.aiTint, color: T.ai },
  gold: { bg: T.goldTint, color: T.goldDeep },
  neutral: { bg: T.bg3, color: T.text3 },
};

function AtelierBadge({ variant = 'neutral', children }: { variant?: BadgeVariant; children: ReactNode }) {
  const c = ATELIER_BADGE_COLORS[variant];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.625,
        px: 1.125, py: 0.375, borderRadius: '99px',
        fontFamily: MONO, fontSize: 10.5, fontWeight: 700, letterSpacing: '0.02em',
        bgcolor: c.bg, color: c.color,
      }}
    >
      {children}
    </Box>
  );
}

export function DashboardPage() {
  return <DashboardPageContent />;
}

function DashboardPageContent() {
  const { isAuthenticated, loading: authLoading, user, token, error: authError } = useAuth();
  const { showOwnerFilter, requestOwnerId, simulatedOwnerId, ownerScopeUnset, ownerScopeAll, resetAdminScope, adminScopeMode } =
    useAdminOwnerFilter();
  const { dashboardDataRevision } = usePmSimulation();
  const prevSimulatedOwnerRef = useRef(simulatedOwnerId);

  useEffect(() => {
    if (prevSimulatedOwnerRef.current && !simulatedOwnerId && showOwnerFilter) {
      resetAdminScope();
    }
    prevSimulatedOwnerRef.current = simulatedOwnerId;
  }, [simulatedOwnerId, showOwnerFilter, resetAdminScope]);
  const [period, setPeriod] = useState<DashboardPeriod>('Mois');
  /** Mois calendaire choisi (YYYY-MM) — '' = mois en cours. */
  const [selectedMonth, setSelectedMonth] = useState('');
  const { options: monthOptions, labelByKey: monthLabelByKey } = useMonthPickerState();
  /** ‹ › : pas d'un mois depuis le mois affiché ('' = mois courant). */
  const stepMonth = useCallback(
    (delta: number) => {
      const next = stepMonthKey(selectedMonth, delta, monthOptions, monthLabelByKey);
      if (next === null) return;
      setSelectedMonth(next);
      setPeriod('Mois');
    },
    [selectedMonth, monthOptions, monthLabelByKey],
  );
  const cachePeriodKey = selectedMonth ? `${period}:${selectedMonth}` : period;
  const [properties, setProperties] = useState<DashboardPropertyOption[]>([]);
  const [listingFilterOptions, setListingFilterOptions] = useState<DashboardPropertyOption[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  /** Multi drill — filtre stays/arrivées seulement ; KPIs restent listingIds. */
  const [selectedRoomTypeIds, setSelectedRoomTypeIds] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_DASHBOARD_SNAPSHOT);
  /** false tant que l’agrégation multi-API n’est pas terminée (évite flash KPI à 0). */
  const [dashboardReady, setDashboardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevScopeRef = useRef<string>(`${adminScopeMode}:${requestOwnerId ?? ''}`);

  useEffect(() => {
    const scopeKey = `${adminScopeMode}:${requestOwnerId ?? ''}`;
    if (prevScopeRef.current !== scopeKey) {
      prevScopeRef.current = scopeKey;
      clearAllDashboardSnapshotCaches();
      setRefreshKey((k) => k + 1);
      setSelectedPropertyIds([]);
      setSelectedRoomTypeIds([]);
      setSnapshot(EMPTY_DASHBOARD_SNAPSHOT);
      setProperties([]);
      setListingFilterOptions([]);
      setDashboardReady(false);
    }
  }, [adminScopeMode, requestOwnerId]);

  /** Toujours visible (même `vite preview` / build prod sur :4174) pour confirmer que la page tourne. */
  useEffect(() => {
    console.info('[Sojori Orchestrator] DashboardPage montée', {
      href: typeof window !== 'undefined' ? window.location.href : '',
      dashboardDebugEnabled,
    });
  }, []);

  const listingOptions = useMemo(() => {
    if (listingFilterOptions.length > 0) {
      return listingFilterOptions;
    }
    return properties.filter((property) => property.isActive !== false);
  }, [listingFilterOptions, properties]);

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    const loadDashboard = async () => {
      if (authLoading) {
        logDashboard('DashboardPage — attente session (checkAuth)', { isAuthenticated });
        return;
      }

      if (!canAccessProtectedRoutes(isAuthenticated)) {
        logDashboard('⚠️ Pas de session — connectez-vous via /login');
        setError('Session requise — connectez-vous via /login avec votre compte Sojori.');
        setDashboardReady(false);
        return;
      }

      if (ownerScopeUnset) {
        if (!cancelled) {
          setSnapshot(EMPTY_DASHBOARD_SNAPSHOT);
          setProperties([]);
          setListingFilterOptions([]);
          setDashboardReady(false);
          setError(null);
        }
        return;
      }

      const skipSessionCache = refreshKey > 0 || dashboardDataRevision > 0;
      const cacheEntry = skipSessionCache
        ? null
        : readDashboardSnapshotCacheEntry(cachePeriodKey, selectedPropertyIds, requestOwnerId, {
            includePartial: true,
          });
      const cached = cacheEntry?.snapshot ?? null;
      if (cached && !cancelled) {
        setSnapshot(ensureDashboardSnapshot(cached));
        setProperties(cached.properties);
        setDashboardReady(true);
        setError(null);
        logDashboard('DashboardPage — cache session affiché', {
          properties: cached.properties.length,
          averageRating: cached.kpis.averageRating.value,
          occupancyRate: cached.kpis.occupancyRate.value,
          cacheAgeMs: cacheEntry?.ageMs,
          listingIdsHint: cached.listingIdsHint?.length ?? 0,
          hydrated: cacheEntry?.hydrated,
        });
      } else if (!cancelled) {
        setDashboardReady(false);
      }

      const CACHE_FRESH_MS = 180_000;
      const cacheIsFresh = cacheEntry != null && cacheEntry.ageMs < CACHE_FRESH_MS;
      /** Cache « mois à 0 » alors qu’il y a de l’occupation → stats ratées, forcer refetch. */
      const cacheBookingKpisEmpty =
        !!cached &&
        cached.kpis.totalReservations.value <= 0 &&
        cached.kpis.monthlyRevenue.value <= 0 &&
        (cached.kpis.occupancyRate.value > 0 || !!selectedMonth);

      logDashboard('DashboardPage load', {
        authLoading,
        isAuthenticated,
        hasJwt: !!getToken(),
        hasContextToken: !!token,
        userEmail: user?.email,
        authError,
        hadCache: !!cached,
        cacheAgeMs: cacheEntry?.ageMs,
        cacheIsFresh,
        cacheBookingKpisEmpty,
      });

      const cacheHasListings = (cached?.properties?.length ?? 0) > 0;

      if (
        cacheIsFresh &&
        !cacheBookingKpisEmpty &&
        refreshKey === 0 &&
        dashboardDataRevision === 0 &&
        cacheHasListings &&
        !showOwnerFilter
      ) {
        logDashboard('DashboardPage — cache frais (<3 min), skip refetch réseau', {
          cacheAgeMs: cacheEntry.ageMs,
        });
        void fetchDashboardListingDirectory(requestOwnerId)
          .then((listings) => {
            if (!cancelled) {
              setListingFilterOptions(listings);
            }
          })
          .catch(() => {
            if (!cancelled && cached?.properties?.length) {
              setListingFilterOptions(cached.properties);
            }
          });
        return;
      }

      try {
        let loaded = EMPTY_DASHBOARD_SNAPSHOT;

        setListingsLoading(true);
        const fastQueryBase = {
          period,
          month: selectedMonth || undefined,
          listingIds: selectedPropertyIds,
          ownerId: requestOwnerId,
          signal: abort.signal,
        };

        logDashboard('DashboardPage — directory puis snapshot (scope owner)', {
          ownerId: requestOwnerId ?? null,
          adminScopeMode,
        });

        let dirListings: Awaited<ReturnType<typeof fetchDashboardListingDirectory>> = [];
        try {
          dirListings = await fetchDashboardListingDirectory(requestOwnerId, abort.signal);
          if (!cancelled) {
            setListingFilterOptions(dirListings);
          }
          const ids = dirListings.map((property) => property.id).slice(0, 50);
          if (ids.length > 0) {
            writeDashboardListingIdsHint(requestOwnerId, ids);
          }
        } catch (directoryError) {
          if (!cancelled) {
            setListingFilterOptions([]);
          }
          if ((directoryError as { code?: string })?.code !== 'ERR_CANCELED') {
            logDashboard('DashboardPage — directory échoué', {
              message: (directoryError as Error)?.message,
            });
          }
        } finally {
          if (!cancelled) {
            setListingsLoading(false);
          }
        }

        if (cancelled) return;

        /** Hints uniquement depuis le directory du PM courant — jamais depuis un autre scope. */
        let listingIdsHint = dirListings.map((property) => property.id).slice(0, 50);

        const mergeChartsIntoSnapshot = async (
          base: DashboardSnapshot,
          charts: Awaited<ReturnType<typeof fetchDashboardV1Charts>>,
        ) =>
          applyDashboardExtrasProgressively(base, charts, (step) => {
            if (!cancelled) {
              setSnapshot(step);
            }
          });

        try {
          logDashboard('DashboardPage — snapshot fast (après directory)', {
            listingIdsHintCount: listingIdsHint.length,
            ownerId: requestOwnerId ?? null,
          });

          const fastResult = await fetchDashboardV1Fast({
            ...fastQueryBase,
            listingIdsHint,
          });
          if (cancelled) return;

          loaded = fastResult;
          if (listingIdsHint.length === 0 && loaded.listingIdsHint?.length) {
            listingIdsHint = loaded.listingIdsHint.filter(Boolean).slice(0, 50);
          }

          if (dirListings.length > 0 && loaded.properties.length === 0) {
            loaded = {
              ...loaded,
              properties: dirListings.map(({ id, name, city, label, isActive }) => ({
                id,
                name,
                city,
                label,
                isActive,
              })),
            };
          }

          setSnapshot(loaded);
          setProperties(loaded.properties.length > 0 ? loaded.properties : dirListings);
          setDashboardReady(true);
          setError(null);
          writeDashboardSnapshotCache(cachePeriodKey, selectedPropertyIds, loaded, requestOwnerId, false);

          logDashboard('DashboardPage — KPIs affichés (mode fast)', {
            listingIdsHintCount: listingIdsHint.length,
            ownerId: requestOwnerId ?? null,
            properties: loaded.properties.length,
            reservations: loaded.kpis.totalReservations.value,
          });

          const fastQuery = { ...fastQueryBase, listingIdsHint };

          // Charts même sans directory (ownerId suffit côté reservations après fix Admin).
          if (listingIdsHint.length > 0 || requestOwnerId) {
            void fetchDashboardV1Charts(fastQuery)
              .then(async (charts) => {
                if (cancelled || !charts) return null;
                return mergeChartsIntoSnapshot(loaded, charts);
              })
              .then((merged) => {
                if (cancelled || !merged) return;
                loaded = merged;
                setSnapshot(merged);
                writeDashboardSnapshotCache(cachePeriodKey, selectedPropertyIds, merged, requestOwnerId);
                logDashboard('DashboardPage — graphiques fusionnés', {
                  occupancyByProperty: merged.occupancyByProperty.length,
                  sourceDistribution: merged.sourceDistribution.length,
                });
              })
              .catch((chartsError) => {
                if (cancelled || (chartsError as { code?: string })?.code === 'ERR_CANCELED') return;
                logDashboard('DashboardPage — graphiques indisponibles, conservation fast', {
                  message: (chartsError as Error)?.message,
                });
              });
          }
        } catch (v1Error) {
          if (cancelled || (v1Error as { code?: string })?.code === 'ERR_CANCELED') {
            return;
          }
          logDashboard('DashboardPage — fallback dashboardService (core v1 indisponible)', {
            message: (v1Error as Error)?.message,
          });
          loaded = ensureDashboardSnapshot(
            await dashboardService.getSnapshot({
              period,
              listingIds: selectedPropertyIds,
              signal: abort.signal,
            }),
          );
        }

        if (cancelled) {
          return;
        }

        setSnapshot(loaded);
        setProperties(loaded.properties);
        setError(null);
        setDashboardReady(true);
        writeDashboardSnapshotCache(cachePeriodKey, selectedPropertyIds, loaded, requestOwnerId);
        logDashboard('DashboardPage données prêtes (snapshot full)', {
          properties: loaded.properties.length,
          occupancyByProperty: loaded.occupancyByProperty.length,
          sourceDistribution: loaded.sourceDistribution.length,
          monthlyRevenue: loaded.kpis.monthlyRevenue.value,
          occupancyRate: loaded.kpis.occupancyRate.value,
          activeProperties: loaded.kpis.activeProperties.value,
          averageRating: loaded.kpis.averageRating.value,
          revpar: loaded.kpis.revpar.value,
          recentReviews: loaded.recentReviews.length,
        });
        logDashboardApiDetail('merged', {
          url: 'snapshot/full',
          kpis: loaded.kpis as unknown as Record<string, unknown>,
          recentReviewsCount: loaded.recentReviews.length,
          recentReviewsPreview: loaded.recentReviews.slice(0, 3),
        });
        logDashboardKpisSummary(loaded.kpis as unknown as Record<string, { value?: number }>);
      } catch (fetchError) {
        if (cancelled || (fetchError as { code?: string })?.code === 'ERR_CANCELED') {
          return;
        }
        console.error('Error loading dashboard page:', fetchError);
        const axiosErr = fetchError as { response?: { data?: { error?: string; hint?: string } } };
        const serverMsg = axiosErr.response?.data?.error;
        const serverHint = axiosErr.response?.data?.hint;
        setError(
          serverMsg
            ? `Dashboard : ${serverMsg}${serverHint ? ` — ${serverHint}` : ''}`
            : 'Impossible de charger le dashboard.',
        );
        setDashboardReady(false);
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
      abort.abort();
    };
  }, [period, selectedMonth, refreshKey, dashboardDataRevision, selectedPropertyIds, authLoading, isAuthenticated, requestOwnerId, ownerScopeUnset, adminScopeMode]);

  /** Noms réels des biens — jamais d'ID tronqué (« Listing …d294ee ») face au client. */
  const listingNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of [...listingOptions, ...snapshot.properties]) {
      if (p.id && p.name && !p.name.startsWith('Listing …')) map.set(p.id, p.name);
    }
    return map;
  }, [listingOptions, snapshot.properties]);

  const withRealName = useCallback(
    <T extends { listingId?: string; property: string }>(row: T): T => ({
      ...row,
      property: (row.listingId && listingNameById.get(row.listingId)) || row.property,
    }),
    [listingNameById],
  );

  const topLiveProperties = useMemo(
    () =>
      [...snapshot.occupancyByProperty]
        .sort((a, b) => (b.adr ?? 0) - (a.adr ?? 0) || b.occupancy - a.occupancy)
        .slice(0, 4)
        .map(withRealName),
    [snapshot.occupancyByProperty, withRealName]
  );

  /** Arrivées & départs fusionnés (sans l'heure 00:00, triés par date). */
  const arrivalsDepartures = useMemo(() => {
    const strip = (w: string) => w.replace(/ ?00:00$/, '');
    const sortKey = (w: string) => {
      const m = w.match(/(\d{2})\/(\d{2})/);
      return m ? `${m[2]}${m[1]}` : '9999';
    };
    const selectedRtNames = new Set(
      listingOptions
        .flatMap((l) => l.roomTypes || [])
        .filter((rt) => selectedRoomTypeIds.includes(rt.id))
        .map((rt) => rt.name.trim().toLowerCase())
        .filter(Boolean),
    );
    return [
      ...snapshot.upcomingCheckIns.map((i) => ({ ...i, kind: '🛬 Arrivée' })),
      ...snapshot.upcomingCheckOuts.map((i) => ({ ...i, kind: '🛫 Départ' })),
    ]
      .filter((i) => {
        if (selectedRtNames.size === 0) return true;
        const rt = String(i.roomTypeName || '').trim().toLowerCase();
        // Single / sans type : on garde ; Multi avec type hors sélection : on exclut
        if (!rt) return true;
        return selectedRtNames.has(rt);
      })
      .map((i) => ({ ...i, when: strip(i.when) }))
      .sort((a, b) => sortKey(a.when).localeCompare(sortKey(b.when)));
  }, [
    snapshot.upcomingCheckIns,
    snapshot.upcomingCheckOuts,
    listingOptions,
    selectedRoomTypeIds,
  ]);

  const occupancyPanelDesc = useMemo(() => {
    const scope =
      selectedPropertyIds.length > 0
        ? `${selectedPropertyIds.length} listing(s) actif(s) sélectionné(s)`
        : 'listings actifs';
    const detail =
      snapshot.occupancyByProperty.length <= 1 && snapshot.properties.length > 1
        ? ' · détail par listing en cours (directory timeout)'
        : '';
    return `Nuits réservées ÷ nuits disponibles · ${scope} · période du filtre · ${OCCUPANCY_CHART_HINT}${detail}`;
  }, [
    snapshot.kpis.occupancyRate.value,
    snapshot.occupancyByProperty.length,
    snapshot.properties.length,
    selectedPropertyIds.length,
  ]);

  const displayedOccupancyByProperty = useMemo(() => {
    if (selectedPropertyIds.length === 0) {
      return snapshot.occupancyByProperty;
    }
    const selectedNames = new Set(
      listingOptions.filter((property) => selectedPropertyIds.includes(property.id)).map((property) => property.name),
    );
    const filtered = snapshot.occupancyByProperty.filter((row) => selectedNames.has(row.property));
    return filtered.length > 0 ? filtered : snapshot.occupancyByProperty;
  }, [snapshot.occupancyByProperty, selectedPropertyIds, listingOptions]);

  const namedOccupancyByProperty = useMemo(
    () => withPropertyShortLabels(displayedOccupancyByProperty.map(withRealName)),
    [displayedOccupancyByProperty, withRealName],
  );

  const applyListingFilter = (next: { listingIds: string[]; roomTypeIds: string[] }) => {
    setSelectedPropertyIds(next.listingIds);
    setSelectedRoomTypeIds(next.roomTypeIds);
  };

  const ratingDisplay = formatDashboardRating(snapshot.kpis.averageRating.value);

  return (
    <DashboardWrapper hidePageHeader disableScopeGate>
      <PageHeader
        title="Dashboard principal"
        count={ownerScopeUnset ? '—' : dashboardReady ? (selectedMonth ? (monthLabelByKey.get(selectedMonth) ?? selectedMonth) : period) : 'Chargement…'}
      >
        <Button sx={btnGhostSx} disabled={ownerScopeUnset} onClick={() => setRefreshKey((value) => value + 1)}>
          Actualiser
        </Button>
        <Button sx={btnPrimarySx} disabled={ownerScopeUnset} onClick={() => setRefreshKey((value) => value + 1)}>
          Générer le rapport
        </Button>
      </PageHeader>

      {ownerScopeUnset ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Choisissez <strong>Tous (plateforme)</strong> pour agréger tout le parc, ou sélectionnez un property
          manager pour son portefeuille.
        </Alert>
      ) : ownerScopeAll ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vue plateforme — indicateurs agrégés sur tous les PM (peut être lent ; certains KPIs sont moins
          pertinents qu’en vue par PM).
        </Alert>
      ) : null}

      {error ? (
        <Alert severity={!getToken() ? 'error' : 'warning'} sx={{ mb: 2 }}>
          <Stack spacing={1}>
            <Typography variant="body2">{error}</Typography>
            {!getToken() ? (
              <Typography variant="caption" color="text.secondary">
                Le jeton est lu depuis le cookie <code>sojori_token</code> ou, en secours,{' '}
                <code>localStorage.token</code> (écrans legacy).
              </Typography>
            ) : null}
            {!getToken() ? (
              <Button component={RouterLink} to="/login" variant="outlined" size="small" sx={{ alignSelf: 'flex-start' }}>
                Connexion
              </Button>
            ) : null}
          </Stack>
        </Alert>
      ) : null}

      {!dashboardReady && !ownerScopeUnset ? (
        <Box
          sx={{
            minHeight: 'min(70vh, 640px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <CircularProgress size={48} />
          <Typography variant="body2" color="text.secondary">
            Chargement des indicateurs et graphiques…
          </Typography>
        </Box>
      ) : ownerScopeUnset ? null : (
        <>
      <AtelierFilterBar>
        {dashboardPeriods.map((item) => (
          <AtelierFilterChip
            key={item}
            label={item}
            active={period === item}
            onClick={() => {
              setPeriod(item);
              setSelectedMonth('');
            }}
          />
        ))}
        <MonthPickerChip
          options={monthOptions}
          value={selectedMonth}
          onChange={(key) => {
            setSelectedMonth(key);
            if (key) setPeriod('Mois');
          }}
          onStep={stepMonth}
        />
        <ListingCheckboxFilter
          listings={listingOptions}
          selectedIds={selectedPropertyIds}
          selectedRoomTypeIds={selectedRoomTypeIds}
          onApply={applyListingFilter}
          loading={listingsLoading}
          disabled={listingOptions.length === 0}
        />
        {selectedPropertyIds.length > 0 || selectedRoomTypeIds.length > 0 ? (
          <Button
            size="small"
            sx={btnGhostSx}
            onClick={() => {
              setSelectedPropertyIds([]);
              setSelectedRoomTypeIds([]);
            }}
          >
            Réinitialiser listings
          </Button>
        ) : null}
      </AtelierFilterBar>

      <AtelierStatsRow>
        <AtelierStatCard
          accent={T.gold}
          value={snapshot.kpis.totalReservations.value.toString()}
          label={`Réservations · ${period.toLowerCase()}`}
          trend={snapshot.kpis.totalReservations.trend}
        />
        <AtelierStatCard
          accent={T.success}
          value={currency.format(snapshot.kpis.monthlyRevenue.value)}
          label="Revenus du mois"
          trend={snapshot.kpis.monthlyRevenue.trend}
        />
        <AtelierStatCard
          accent={T.info}
          value={`${snapshot.kpis.occupancyRate.value}%`}
          label="Taux d’occupation"
          trend={snapshot.kpis.occupancyRate.trend}
        />
        <AtelierStatCard
          accent={T.ai}
          value={`${snapshot.kpis.adr.value} MAD`}
          label="ADR"
          trend={snapshot.kpis.adr.trend}
        />
      </AtelierStatsRow>

      <AtelierStatsRow>
        <AtelierStatCard
          accent={T.warning}
          value={snapshot.kpis.activeProperties.value.toString()}
          label="Properties actives"
          trend={snapshot.kpis.activeProperties.trend}
        />
        <AtelierStatCard
          accent={T.goldDeep}
          value={`${ratingDisplay.display}/5`}
          label="Note moyenne voyageurs"
        />
        <AtelierStatCard
          accent={T.success}
          value={snapshot.kpis.guestsThisMonth.value.toString()}
          label="Voyageurs ce mois"
          trend={snapshot.kpis.guestsThisMonth.trend}
        />
        <AtelierStatCard
          accent={T.error}
          value={`${snapshot.kpis.revpar.value} MAD`}
          label="RevPAR"
          trend={snapshot.kpis.revpar.trend}
        />
      </AtelierStatsRow>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' },
          gap: 2,
          mb: 2,
          '& > *': { minWidth: 0 },
        }}
      >
        <AtelierPanel
          title="Revenus par jour / semaine / mois"
          desc="Timeline · revenu (MAD) à gauche · arrivées (check-in) à droite"
        >
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <LineChart width={width} height={height} data={snapshot.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,17,10,0.08)" />
                <XAxis dataKey="date" />
                <YAxis
                  yAxisId="revenue"
                  name="Revenu (MAD)"
                  tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                />
                <YAxis
                  yAxisId="bookings"
                  orientation="right"
                  name="Arrivées"
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'Revenu (MAD)' ? currency.format(value) : value
                  }
                />
                <Legend />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  name="Revenu (MAD)"
                  stroke={T.gold}
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  yAxisId="bookings"
                  type="monotone"
                  dataKey="bookings"
                  name="Arrivées"
                  stroke={T.ai}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </StableChart>
        </AtelierPanel>

        <AtelierPanel title="Réservations par source" desc="Airbnb, Booking, Direct, Vrbo">
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => {
              const outerRadius = Math.max(70, Math.min(110, Math.floor(Math.min(width, height) * 0.34)));
              const innerRadius = Math.max(40, outerRadius - 40);

              return (
                <PieChart width={width} height={height}>
                <Pie
                  data={snapshot.sourceDistribution}
                  dataKey="value"
                  nameKey="source"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={3}
                >
                  {snapshot.sourceDistribution.map((entry, index) => (
                    <Cell key={entry.source} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
                </PieChart>
              );
            }}
          </StableChart>
        </AtelierPanel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
          gap: 2,
          mb: 2,
          '& > *': { minWidth: 0 },
        }}
      >
        <AtelierPanel
          title="Taux d’occupation par property"
          desc={occupancyPanelDesc}
          headRight={
            snapshot.kpis.occupancyRate.value > 0 ? (
              <AtelierBadge variant="success">{snapshot.kpis.occupancyRate.value}% global</AtelierBadge>
            ) : null
          }
        >
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => {
              const showBarPct = namedOccupancyByProperty.length <= OCCUPANCY_BAR_LABEL_MAX;
              return (
              <BarChart
                width={width}
                height={height}
                data={namedOccupancyByProperty}
                margin={{ top: showBarPct ? 22 : 8, right: 8, left: 0, bottom: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,17,10,0.08)" />
                <XAxis
                  dataKey="shortLabel"
                  interval={0}
                  angle={0}
                  textAnchor="middle"
                  height={28}
                  tick={{ fontSize: 12, fill: T.text2 }}
                  minTickGap={4}
                />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  cursor={{ fill: T.goldTint }}
                  formatter={(value: number) => [`${Number(value).toFixed(1)} %`, 'Occupation']}
                  labelFormatter={(_label, payload) => {
                    const row = payload?.[0]?.payload as { property?: string } | undefined;
                    return row?.property || String(_label);
                  }}
                />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]} fill={T.gold}>
                  {showBarPct ? (
                    <LabelList
                      dataKey="occupancy"
                      position="top"
                      formatter={(v: number) => `${Number(v).toFixed(1)}%`}
                      style={{ fontSize: 11, fontWeight: 700, fill: T.text2 }}
                    />
                  ) : null}
                </Bar>
              </BarChart>
              );
            }}
          </StableChart>
        </AtelierPanel>

        <AtelierPanel title="Arrivées & départs" desc={`Prochains mouvements · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {arrivalsDepartures.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune arrivée ni départ à venir sur la période.
              </Typography>
            ) : (
              arrivalsDepartures.map((item) => (
                <MiniRow
                  key={`${item.kind}-${item.id}`}
                  title={`${item.kind} · ${item.guest}`}
                  subtitle={`${item.property} · ${item.when}`}
                  badge={item.source}
                />
              ))
            )}
          </ScrollableList>
        </AtelierPanel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <AtelierPanel title="Tâches urgentes" desc={`5 prioritaires · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {snapshot.urgentTasks.map((task) => (
              <MiniRow
                key={task.id}
                title={task.label}
                subtitle={`${task.owner} · ${task.due}`}
                badge={task.priority}
              />
            ))}
          </ScrollableList>
        </AtelierPanel>

        <AtelierPanel title="Messages non lus" desc={`Guests + OTA + staff · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {snapshot.unreadMessages.map((message) => (
              <MiniRow
                key={message.id}
                title={message.from}
                subtitle={message.preview}
                badge={message.channel}
              />
            ))}
          </ScrollableList>
        </AtelierPanel>

        <AtelierPanel title="Avis récents & alertes" desc={`Reviews + notifications · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList spacing={1.5}>
            {snapshot.recentReviews.map((review) => (
              <Box key={review.id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{review.guest}</Typography>
                  <AtelierBadge variant="success">{review.rating}{Number(review.rating) > 5 ? '/10' : '/5'}</AtelierBadge>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {review.property} · {review.comment}
                </Typography>
              </Box>
            ))}
            {snapshot.recentReviews.length > 0 && snapshot.alerts.length > 0 ? <Divider /> : null}
            {snapshot.alerts.map((alert) => (
              <Box key={alert.id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{alert.title}</Typography>
                  <AtelierBadge variant={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}>
                    {alert.severity}
                  </AtelierBadge>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {alert.detail}
                </Typography>
              </Box>
            ))}
          </ScrollableList>
        </AtelierPanel>
      </Box>

      {topLiveProperties.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <AtelierPanel title="Top biens" desc="Classés par ADR puis occupation · données live">
            <Stack spacing={1.25}>
              {topLiveProperties.map((item, index) => (
                <MiniRow
                  key={item.listingId ?? `${item.property}-${index}`}
                  title={`${index + 1}. ${item.property}`}
                  subtitle={`Occupation ${item.occupancy}%${item.adr ? ` · ADR ${item.adr} MAD` : ''}`}
                  badge="Live"
                />
              ))}
            </Stack>
          </AtelierPanel>
        </Box>
      ) : null}

      {/* ── Opérations (interne) — en bas, après la vue client ── */}
      <Divider sx={{ my: 3 }} />
      <Typography sx={{ fontFamily: MONO, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1.5, color: T.text3 }}>
        Opérations du jour
      </Typography>
      <Suspense fallback={null}>
        <OrchestrationOpsCards ownerId={requestOwnerId || undefined} />
      </Suspense>
        </>
      )}
    </DashboardWrapper>
  );
}

function ScrollableList({
  children,
  spacing = 1.25,
}: {
  children: ReactNode;
  spacing?: number;
}) {
  return (
    <Box
      sx={{
        maxHeight: SCROLL_LIST_MAX_HEIGHT,
        overflowY: 'auto',
        pr: 0.5,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: T.borderStrong,
          borderRadius: 3,
        },
      }}
    >
      <Stack spacing={spacing}>{children}</Stack>
    </Box>
  );
}

function MiniRow({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <Box
      sx={{
        p: 1.5,
        border: `1px solid ${T.border}`,
        borderRadius: '10px',
        bgcolor: T.bg1,
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <AtelierBadge variant="neutral">{badge}</AtelierBadge>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
