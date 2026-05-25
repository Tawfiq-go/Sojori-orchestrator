import { useEffect, useMemo, useState } from 'react';
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
import { EMPTY_DASHBOARD_SNAPSHOT, ensureDashboardSnapshot } from '../services/dashboardV1Service';
import { dashboardService } from '../services/dashboardService';
import {
  readDashboardSnapshotCache,
  writeDashboardSnapshotCache,
} from '../utils/dashboardSnapshotCache';
import { useAuth } from '../hooks/useAuth';
import { dashboardDebugEnabled, logDashboard } from '../utils/dashboardDebug';
import { getToken } from '../utils/authUtils';
import type {
  DashboardPeriod,
  DashboardPropertyOption,
  DashboardSnapshot,
} from '../types/dashboard.types';


const chartColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const { isAuthenticated, loading: authLoading, user, token, error: authError } = useAuth();
  const [period, setPeriod] = useState<DashboardPeriod>('Mois');
  const [properties, setProperties] = useState<DashboardPropertyOption[]>([]);
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_DASHBOARD_SNAPSHOT);
  /** false tant que l’agrégation multi-API n’est pas terminée (évite flash KPI à 0). */
  const [dashboardReady, setDashboardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /** Toujours visible (même `vite preview` / build prod sur :4174) pour confirmer que la page tourne. */
  useEffect(() => {
    console.info('[Sojori Orchestrator] DashboardPage montée', {
      href: typeof window !== 'undefined' ? window.location.href : '',
      dashboardDebugEnabled,
    });
  }, []);

  useEffect(() => {
    const abort = new AbortController();
    let cancelled = false;

    const loadDashboard = async () => {
      if (authLoading) {
        logDashboard('DashboardPage — attente session (checkAuth)', { isAuthenticated });
        return;
      }

      if (!getToken()) {
        logDashboard('⚠️ Pas de token JWT — les APIs renverront 401');
        setError('Aucun jeton de session — connectez-vous pour charger le dashboard.');
        setDashboardReady(false);
        return;
      }

      const cached = readDashboardSnapshotCache(period, selectedPropertyIds);
      if (cached && !cancelled) {
        setSnapshot(ensureDashboardSnapshot(cached));
        setProperties(cached.properties);
        setDashboardReady(true);
        setError(null);
        logDashboard('DashboardPage — cache session affiché', {
          properties: cached.properties.length,
        });
      } else if (!cancelled) {
        setDashboardReady(false);
      }

      logDashboard('DashboardPage load', {
        authLoading,
        isAuthenticated,
        hasJwt: !!getToken(),
        hasContextToken: !!token,
        userEmail: user?.email,
        authError,
        hadCache: !!cached,
      });

      try {
        const loaded = ensureDashboardSnapshot(
          await dashboardService.getSnapshot({
            period,
            listingIds: selectedPropertyIds,
            signal: abort.signal,
          }),
        );

        if (cancelled) {
          return;
        }

        setSnapshot(loaded);
        setProperties(loaded.properties);
        setError(null);
        setDashboardReady(true);
        writeDashboardSnapshotCache(period, selectedPropertyIds, loaded);
        logDashboard('DashboardPage données prêtes (agrégation multi-API)', {
          properties: loaded.properties.length,
          occupancyByProperty: loaded.occupancyByProperty.length,
          sourceDistribution: loaded.sourceDistribution.length,
          monthlyRevenue: loaded.kpis.monthlyRevenue.value,
        });
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
  }, [period, refreshKey, selectedPropertyIds, authLoading, isAuthenticated]);

  const topLiveProperties = useMemo(
    () =>
      [...snapshot.occupancyByProperty]
        .sort((a, b) => (b.adr ?? 0) - (a.adr ?? 0) || b.occupancy - a.occupancy)
        .slice(0, 4),
    [snapshot.occupancyByProperty]
  );

  const toggleProperty = (propertyId: string) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(propertyId)
        ? prev.filter((value) => value !== propertyId)
        : [...prev, propertyId]
    );
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Dashboard']}>
      <PageHeader
        title="Dashboard principal"
        count={dashboardReady ? period : 'Chargement…'}
      >
        <Button sx={btnGhostSx} onClick={() => setRefreshKey((value) => value + 1)}>
          Actualiser
        </Button>
        <Button sx={btnPrimarySx} onClick={() => setRefreshKey((value) => value + 1)}>
          Generer report
        </Button>
      </PageHeader>

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

      {!dashboardReady ? (
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
      ) : (
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
      </FilterBar>

      {properties.length > 0 ? (
        <FilterBar>
          {properties
            .filter((property) => property.isActive !== false)
            .map((property) => (
              <FilterChip
                key={property.id}
                label={property.label}
                active={selectedPropertyIds.includes(property.id)}
                onClick={() => toggleProperty(property.id)}
              />
            ))}
        </FilterBar>
      ) : null}

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
          value={`${snapshot.kpis.adr.value} EUR`}
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
          value={snapshot.kpis.averageRating.value.toString()}
          label="Rating moyen"
          trend={snapshot.kpis.averageRating.trend}
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
          value={`${snapshot.kpis.revpar.value} EUR`}
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
        <Panel title="Revenus par jour / semaine / mois" desc="Timeline réservations · période sélectionnée">
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <LineChart width={width} height={height} data={snapshot.revenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="revenue" />
                <YAxis yAxisId="bookings" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#e6b022" strokeWidth={3} />
                <Line yAxisId="bookings" type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} />
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
        <Panel title="Taux d’occupation par property" desc="Bar chart par actif">
          <StableChart height={320}>
            {({ width, height }: { width: number; height: number }) => (
              <BarChart width={width} height={height} data={snapshot.occupancyByProperty}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="property" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            )}
          </StableChart>
          <Stack spacing={1}>
            {snapshot.occupancyByProperty.map((property) => (
              <Stack
                key={property.property}
                direction="row"
                sx={{ justifyContent: 'space-between' }}
              >
                <Typography variant="body2">{property.property}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {property.occupancy}%{property.adr ? ` · ADR ${property.adr} EUR` : ''}
                </Typography>
              </Stack>
            ))}
          </Stack>
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
        <Panel title="Prochains check-ins" desc="5 prochains">
          <Stack spacing={1.25}>
            {snapshot.upcomingCheckIns.map((item) => (
              <MiniRow
                key={item.id}
                title={item.guest}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </Stack>
        </Panel>

        <Panel title="Prochains check-outs" desc="5 prochains">
          <Stack spacing={1.25}>
            {snapshot.upcomingCheckOuts.map((item) => (
              <MiniRow
                key={item.id}
                title={item.guest}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </Stack>
        </Panel>

        <Panel title="Reservations recentes" desc="Derniers mouvements">
          <Stack spacing={1.25}>
            {snapshot.recentBookings.map((item) => (
              <MiniRow
                key={`${item.type || 'booking'}-${item.id}`}
                title={`${item.type || 'Réservation'} · ${item.guest}`}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </Stack>
        </Panel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(4, 1fr)' },
          gap: 2,
        }}
      >
        <Panel title="Quick actions" desc="Raccourcis de pilotage">
          <Stack spacing={0.75}>
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
          </Stack>
        </Panel>

        <Panel title="Taches urgentes" desc="5 prioritaires">
          <Stack spacing={1.25}>
            {snapshot.urgentTasks.map((task) => (
              <MiniRow
                key={task.id}
                title={task.label}
                subtitle={`${task.owner} · ${task.due}`}
                badge={task.priority}
              />
            ))}
          </Stack>
        </Panel>

        <Panel title="Messages non lus" desc="Guests + OTA + staff">
          <Stack spacing={1.25}>
            {snapshot.unreadMessages.map((message) => (
              <MiniRow
                key={message.id}
                title={message.from}
                subtitle={message.preview}
                badge={message.channel}
              />
            ))}
          </Stack>
        </Panel>

        <Panel title="Avis recents & alertes" desc="Reviews + notifications">
          <Stack spacing={1.5}>
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
            <Divider />
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
          </Stack>
        </Panel>
      </Box>

      {topLiveProperties.length > 0 ? (
        <Box sx={{ mt: 2 }}>
          <Panel title="Top properties live" desc="Selectionnee depuis les donnees live">
            <Stack spacing={1.25}>
              {topLiveProperties.map((item, index) => (
                <MiniRow
                  key={item.property}
                  title={`${index + 1}. ${item.property}`}
                  subtitle={`OCC ${item.occupancy}%${item.adr ? ` · ADR ${item.adr} EUR` : ''}`}
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
