import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
  Badge,
  FilterBar,
  FilterChip,
  PageHeader,
  Panel,
  StableChart,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { dashboardPeriods } from '../data/mockDashboard';
import { ListingCheckboxFilter } from '../components/dashboard/ListingCheckboxFilter';
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


const chartColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'MAD',
  maximumFractionDigits: 0,
});

const SCROLL_LIST_MAX_HEIGHT = 320;
const VISIBLE_LIST_HINT = '4 visibles · scroll';

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
  const [properties, setProperties] = useState<DashboardPropertyOption[]>([]);
  const [listingFilterOptions, setListingFilterOptions] = useState<DashboardPropertyOption[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
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
        : readDashboardSnapshotCacheEntry(period, selectedPropertyIds, requestOwnerId, {
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
      });

      const cacheHasListings = (cached?.properties?.length ?? 0) > 0;

      if (cacheIsFresh && refreshKey === 0 && dashboardDataRevision === 0 && cacheHasListings && !showOwnerFilter) {
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
          writeDashboardSnapshotCache(period, selectedPropertyIds, loaded, requestOwnerId, false);

          logDashboard('DashboardPage — KPIs affichés (mode fast)', {
            listingIdsHintCount: listingIdsHint.length,
            ownerId: requestOwnerId ?? null,
            properties: loaded.properties.length,
            reservations: loaded.kpis.totalReservations.value,
          });

          const fastQuery = { ...fastQueryBase, listingIdsHint };

          if (listingIdsHint.length > 0) {
            void fetchDashboardV1Charts(fastQuery)
              .then(async (charts) => {
                if (cancelled || !charts) return null;
                return mergeChartsIntoSnapshot(loaded, charts);
              })
              .then((merged) => {
                if (cancelled || !merged) return;
                loaded = merged;
                setSnapshot(merged);
                writeDashboardSnapshotCache(period, selectedPropertyIds, merged, requestOwnerId);
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
        writeDashboardSnapshotCache(period, selectedPropertyIds, loaded, requestOwnerId);
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
  }, [period, refreshKey, dashboardDataRevision, selectedPropertyIds, authLoading, isAuthenticated, requestOwnerId, ownerScopeUnset, adminScopeMode]);

  const topLiveProperties = useMemo(
    () =>
      [...snapshot.occupancyByProperty]
        .sort((a, b) => (b.adr ?? 0) - (a.adr ?? 0) || b.occupancy - a.occupancy)
        .slice(0, 4),
    [snapshot.occupancyByProperty]
  );

  const occupancyPanelDesc = useMemo(() => {
    const scope =
      selectedPropertyIds.length > 0
        ? `${selectedPropertyIds.length} listing(s) actif(s) sélectionné(s)`
        : 'listings actifs';
    const detail =
      snapshot.occupancyByProperty.length <= 1 && snapshot.properties.length > 1
        ? ' · détail par listing en cours (directory timeout)'
        : '';
    return `Nuits réservées ÷ nuits disponibles · ${scope} · période du filtre · ${VISIBLE_LIST_HINT}${detail}`;
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

  const applyListingFilter = (ids: string[]) => {
    setSelectedPropertyIds(ids);
  };

  const ratingDisplay = formatDashboardRating(snapshot.kpis.averageRating.value);

  return (
    <DashboardWrapper hidePageHeader disableScopeGate>
      <PageHeader
        title="Dashboard principal"
        count={ownerScopeUnset ? '—' : dashboardReady ? period : 'Chargement…'}
      >
        <Button sx={btnGhostSx} disabled={ownerScopeUnset} onClick={() => setRefreshKey((value) => value + 1)}>
          Actualiser
        </Button>
        <Button sx={btnPrimarySx} disabled={ownerScopeUnset} onClick={() => setRefreshKey((value) => value + 1)}>
          Generer report
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
      <FilterBar>
        {dashboardPeriods.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={period === item}
            onClick={() => setPeriod(item)}
          />
        ))}
        <ListingCheckboxFilter
          listings={listingOptions}
          selectedIds={selectedPropertyIds}
          onApply={applyListingFilter}
          loading={listingsLoading}
          disabled={listingOptions.length === 0}
        />
        {selectedPropertyIds.length > 0 ? (
          <Button size="small" sx={btnGhostSx} onClick={() => setSelectedPropertyIds([])}>
            Réinitialiser listings
          </Button>
        ) : null}
      </FilterBar>

      <StatsRow>
        <StatCard
          icon="🎫"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={snapshot.kpis.totalReservations.value.toString()}
          label={`Reservations ${period.toLowerCase()}`}
          trend={snapshot.kpis.totalReservations.trend}
        />
        <StatCard
          icon="💶"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={currency.format(snapshot.kpis.monthlyRevenue.value)}
          label="Revenus du mois"
          trend={snapshot.kpis.monthlyRevenue.trend}
        />
        <StatCard
          icon="📈"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${snapshot.kpis.occupancyRate.value}%`}
          label="Taux d’occupation"
          trend={snapshot.kpis.occupancyRate.trend}
        />
        <StatCard
          icon="🛏️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={`${snapshot.kpis.adr.value} MAD`}
          label="ADR"
          trend={snapshot.kpis.adr.trend}
        />
      </StatsRow>

      <StatsRow>
        <StatCard
          icon="🏡"
          iconBg="rgba(245,158,11,0.12)"
          iconColor={t.warning}
          value={snapshot.kpis.activeProperties.value.toString()}
          label="Properties actives"
          trend={snapshot.kpis.activeProperties.trend}
        />
        <StatCard
          icon="⭐"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={ratingDisplay.display}
          label="Rating moyen"
          trend={ratingDisplay.trend}
        />
        <StatCard
          icon="👥"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={snapshot.kpis.guestsThisMonth.value.toString()}
          label="Guests ce mois"
          trend={snapshot.kpis.guestsThisMonth.trend}
        />
        <StatCard
          icon="📊"
          iconBg="rgba(239,68,68,0.12)"
          iconColor={t.error}
          value={`${snapshot.kpis.revpar.value} MAD`}
          label="RevPAR"
          trend={snapshot.kpis.revpar.trend}
        />
      </StatsRow>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1.2fr 0.8fr' },
          gap: 2,
          mb: 2,
          '& > *': { minWidth: 0 },
        }}
      >
        <Panel title="Revenus par jour / semaine / mois" desc="Timeline · revenu (MAD) à gauche · réservations à droite">
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <LineChart width={width} height={height} data={snapshot.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="date" />
                <YAxis
                  yAxisId="revenue"
                  name="Revenu (MAD)"
                  tickFormatter={(value) => (value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
                />
                <YAxis
                  yAxisId="bookings"
                  orientation="right"
                  name="Réservations"
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
                  stroke="#e6b022"
                  strokeWidth={3}
                  dot={false}
                />
                <Line
                  yAxisId="bookings"
                  type="monotone"
                  dataKey="bookings"
                  name="Réservations"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            )}
          </StableChart>
        </Panel>

        <Panel title="Reservations par source" desc="Airbnb, Booking, Direct, Vrbo">
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
        </Panel>
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
        <Panel
          title="Taux d’occupation par property"
          desc={occupancyPanelDesc}
          headRight={
            snapshot.kpis.occupancyRate.value > 0 ? (
              <Badge variant="success">{snapshot.kpis.occupancyRate.value}% global</Badge>
            ) : null
          }
        >
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <BarChart width={width} height={height} data={displayedOccupancyByProperty}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="property" hide />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            )}
          </StableChart>
          <ScrollableList>
            {displayedOccupancyByProperty.map((property, index) => (
              <Stack
                key={property.listingId ?? `${property.property}-${index}`}
                direction="row"
                sx={{ justifyContent: 'space-between' }}
              >
                <Typography variant="body2">{property.property}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {property.occupancy}%{property.adr ? ` · ADR ${property.adr} MAD` : ''}
                </Typography>
              </Stack>
            ))}
          </ScrollableList>
        </Panel>

        <Panel title="Check-ins / Check-outs" desc="Vue jour par jour">
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <BarChart width={width} height={height} data={snapshot.checkFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="checkIns" fill="#e6b022" radius={[8, 8, 0, 0]} />
                <Bar dataKey="checkOuts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
          </StableChart>
        </Panel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
          gap: 2,
          mb: 2,
        }}
      >
        <Panel title="Prochains check-ins" desc={`5 prochains · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {snapshot.upcomingCheckIns.map((item) => (
              <MiniRow
                key={item.id}
                title={item.guest}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </ScrollableList>
        </Panel>

        <Panel title="Prochains check-outs" desc={`5 prochains · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {snapshot.upcomingCheckOuts.map((item) => (
              <MiniRow
                key={item.id}
                title={item.guest}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </ScrollableList>
        </Panel>

        <Panel title="Reservations recentes" desc={`Derniers mouvements · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList>
            {snapshot.recentBookings.map((item) => (
              <MiniRow
                key={`${item.type || 'booking'}-${item.id}`}
                title={`${item.type || 'Réservation'} · ${item.guest}`}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </ScrollableList>
        </Panel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Panel title="Quick actions" desc={`Raccourcis de pilotage · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList spacing={0.75}>
            {['📤 Exporter les KPIs', '📅 Voir reservations', '🧩 Ouvrir les taches', '💬 Aller aux messages'].map((action) => (
              <Button
                key={action}
                sx={{
                  ...btnGhostSx,
                  justifyContent: 'flex-start',
                  color: t.text2,
                  fontWeight: 600,
                }}
              >
                {action}
              </Button>
            ))}
          </ScrollableList>
        </Panel>

        <Panel title="Taches urgentes" desc={`5 prioritaires · ${VISIBLE_LIST_HINT}`}>
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
        </Panel>

        <Panel title="Messages non lus" desc={`Guests + OTA + staff · ${VISIBLE_LIST_HINT}`}>
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
        </Panel>

        <Panel title="Avis recents & alertes" desc={`Reviews + notifications · ${VISIBLE_LIST_HINT}`}>
          <ScrollableList spacing={1.5}>
            {snapshot.recentReviews.map((review) => (
              <Box key={review.id}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 700 }}>{review.guest}</Typography>
                  <Badge variant="success">{review.rating}/5</Badge>
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
                  <Badge variant={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}>
                    {alert.severity}
                  </Badge>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {alert.detail}
                </Typography>
              </Box>
            ))}
          </ScrollableList>
        </Panel>
      </Box>

      {topLiveProperties.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Panel title="Top properties live" desc="Selectionnee depuis les donnees live">
            <Stack spacing={1.25}>
              {topLiveProperties.map((item, index) => (
                <MiniRow
                  key={item.listingId ?? `${item.property}-${index}`}
                  title={`${index + 1}. ${item.property}`}
                  subtitle={`OCC ${item.occupancy}%${item.adr ? ` · ADR ${item.adr} MAD` : ''}`}
                  badge="Live"
                />
              ))}
            </Stack>
          </Panel>
        </Box>
      ) : null}
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
          bgcolor: 'rgba(26,20,8,0.15)',
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
        border: '1px solid',
        borderColor: 'rgba(26,20,8,0.08)',
        borderRadius: 2,
        bgcolor: '#fff',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Badge variant="neutral">{badge}</Badge>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {subtitle}
      </Typography>
    </Box>
  );
}
