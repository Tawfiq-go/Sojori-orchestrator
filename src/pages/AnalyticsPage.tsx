import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  Badge,
  DataTable,
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
import { analyticsService } from '../services/analyticsService';
import { analyticsPeriodOptions } from '../types/analytics.types';
import type {
  AnalyticsDistributionItem,
  AnalyticsPropertyPerformanceRow,
  AnalyticsQuery,
  AnalyticsSnapshot,
} from '../types/analytics.types';

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const sourceOptions = ['Tous', 'Airbnb', 'Booking.com', 'Sojori', 'Vrbo'] as const;

export function AnalyticsPage() {
  const [period, setPeriod] = useState<(typeof analyticsPeriodOptions)[number]['value']>('30d');
  const [comparison, setComparison] = useState<'vs-last-period' | 'vs-last-year'>('vs-last-period');
  const [source, setSource] = useState<(typeof sourceOptions)[number]>('Tous');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        const nextSnapshot = await analyticsService.getSnapshot({
          period,
          comparison,
          source,
          listingIds: selectedProperties,
          customStartDate,
          customEndDate,
        });

        if (!cancelled) {
          setSnapshot(nextSnapshot);
          setError(null);
        }
      } catch (err) {
        console.error('Failed to load analytics page:', err);
        if (!cancelled) {
          setError('Impossible de charger les analytics en temps reel.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (period === 'custom' && (!customStartDate || !customEndDate)) {
      setLoading(false);
      return;
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [comparison, customEndDate, customStartDate, period, selectedProperties, source]);

  const filteredSources = useMemo(() => {
    if (!snapshot) return [];
    return source === 'Tous'
      ? snapshot.channelShare
      : snapshot.channelShare.filter((item) => item.source === source);
  }, [snapshot, source]);

  const currentQuery = useMemo<AnalyticsQuery>(
    () => ({
      period,
      comparison,
      source,
      listingIds: selectedProperties,
      customStartDate,
      customEndDate,
    }),
    [comparison, customEndDate, customStartDate, period, selectedProperties, source]
  );

  const performanceColumns = [
    { key: 'property', label: 'Property', sortable: true },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (row: AnalyticsPropertyPerformanceRow) => currency.format(row.revenue),
    },
    {
      key: 'occupancy',
      label: 'Occupancy',
      sortable: true,
      render: (row: AnalyticsPropertyPerformanceRow) => `${row.occupancy.toFixed(1)}%`,
    },
    {
      key: 'adr',
      label: 'ADR',
      sortable: true,
      render: (row: AnalyticsPropertyPerformanceRow) => currency.format(row.adr),
    },
    {
      key: 'leadTime',
      label: 'Lead time',
      sortable: true,
      render: (row: AnalyticsPropertyPerformanceRow) => `${row.leadTime} jours`,
    },
    {
      key: 'cancellations',
      label: 'Cancellations',
      sortable: true,
      render: (row: AnalyticsPropertyPerformanceRow) => (
        <Badge variant={row.cancellations > 2 ? 'warning' : 'success'}>
          {row.cancellations}
        </Badge>
      ),
    },
  ];

  const sourceColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];
  const selectedCount =
    selectedProperties.length > 0 ? selectedProperties.length : snapshot?.propertyPerformance.length ?? 0;

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Analytics']}>
      <PageHeader
        title="Analytics"
        count={`${snapshot?.periodLabel ?? 'Chargement'} · ${
          comparison === 'vs-last-period' ? 'vs periode precedente' : 'vs annee precedente'
        }`}
      >
        <Button sx={btnGhostSx} onClick={() => window.print()}>
          Export PDF
        </Button>
        <Button
          sx={btnGhostSx}
          onClick={() => {
            void analyticsService.downloadPerformanceCsv(currentQuery);
          }}
        >
          Export Excel
        </Button>
        <Button
          sx={btnPrimarySx}
          onClick={() => {
            void analyticsService.downloadPerformanceCsv(currentQuery);
          }}
        >
          Export CSV
        </Button>
      </PageHeader>

      <FilterBar>
        {analyticsPeriodOptions.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            active={period === item.value}
            onClick={() => setPeriod(item.value)}
          />
        ))}
        <FilterChip
          label={comparison === 'vs-last-period' ? 'Vs periode precedente' : 'Vs annee precedente'}
          active
          onClick={() =>
            setComparison((prev) =>
              prev === 'vs-last-period' ? 'vs-last-year' : 'vs-last-period'
            )
          }
        />
      </FilterBar>

      {period === 'custom' && (
        <FilterBar>
          <TextField
            size="small"
            type="date"
            value={customStartDate}
            onChange={(event) => setCustomStartDate(event.target.value)}
          />
          <TextField
            size="small"
            type="date"
            value={customEndDate}
            onChange={(event) => setCustomEndDate(event.target.value)}
          />
        </FilterBar>
      )}

      <FilterBar>
        {sourceOptions.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={source === item}
            onClick={() => setSource(item)}
          />
        ))}
      </FilterBar>

      <FilterBar>
        {(snapshot?.properties ?? []).map((property) => (
          <FilterChip
            key={property.id}
            label={property.label}
            active={selectedProperties.includes(property.id)}
            onClick={() =>
              setSelectedProperties((prev) =>
                prev.includes(property.id)
                  ? prev.filter((value) => value !== property.id)
                  : [...prev, property.id]
              )
            }
          />
        ))}
      </FilterBar>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !snapshot ? (
        <Panel title="Chargement analytics" desc="Récupération des données backend">
          <Stack sx={{ alignItems: 'center', py: 6 }}>
            <CircularProgress />
          </Stack>
        </Panel>
      ) : snapshot ? (
        <>
      <StatsRow>
        <StatCard
          icon="🏆"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={snapshot.kpis.performanceScore.toString()}
          label="Performance score"
          trend={`${Math.abs(snapshot.kpis.performanceScoreTrend).toFixed(1)} pts`}
          trendUp={snapshot.kpis.performanceScoreTrend >= 0}
        />
        <StatCard
          icon="🗓️"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${snapshot.kpis.averageStay.toFixed(1)} nuits`}
          label="Duree moyenne sejour"
          trend={`${Math.abs(snapshot.kpis.averageStayTrend).toFixed(1)}`}
          trendUp={snapshot.kpis.averageStayTrend >= 0}
        />
        <StatCard
          icon="⏱️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={`${snapshot.kpis.leadTime} jours`}
          label="Lead time moyen"
          trend={`${Math.abs(snapshot.kpis.leadTimeTrend).toFixed(0)}`}
          trendUp={snapshot.kpis.leadTimeTrend >= 0}
        />
        <StatCard
          icon="❌"
          iconBg="rgba(239,68,68,0.12)"
          iconColor={t.error}
          value={`${snapshot.kpis.cancellationRate.toFixed(1)}%`}
          label="Taux d’annulation"
          trend={`${Math.abs(snapshot.kpis.cancellationRateTrend).toFixed(1)}%`}
          trendUp={snapshot.kpis.cancellationRateTrend <= 0}
        />
      </StatsRow>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
          gap: 2,
          mb: 2,
          '& > *': { minWidth: 0 },
        }}
      >
        <Panel title="Evolution revenus" desc={snapshot.periodLabel}>
          <StableChart height={320}>
            {({ width, height }) => (
              <LineChart width={width} height={height} data={snapshot.revenueEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#e6b022" strokeWidth={3} />
                <Line type="monotone" dataKey="previous" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            )}
          </StableChart>
        </Panel>

        <Panel title="Analyse sources reservations" desc={source === 'Tous' ? 'Toutes sources' : source}>
          <StableChart height={320}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={filteredSources}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#e6b022" radius={[8, 8, 0, 0]} />
              </BarChart>
            )}
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
        <Panel title="Saisonnalite" desc="Heatmap-like monthly bars">
          <StableChart height={320}>
            {({ width, height }) => (
              <BarChart width={width} height={height} data={snapshot.seasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]}>
                  {snapshot.seasonality.map((item, index) => (
                    <Cell
                      key={item.month}
                      fill={sourceColors[index % sourceColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </StableChart>
        </Panel>

        <Panel title="Guest demographics" desc="Top pays d’origine">
          <Stack spacing={1.25}>
            {snapshot.guestDemographics.map((item) => (
              <Box key={item.country}>
                <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
                  <Typography variant="body2">{item.country}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {item.guests} guests
                  </Typography>
                </Stack>
                <Box sx={{ height: 8, bgcolor: 'rgba(26,20,8,0.06)', borderRadius: 99 }}>
                  <Box
                    sx={{
                      height: '100%',
                      width: `${(item.guests / Math.max(1, snapshot.guestDemographics[0]?.guests ?? 1)) * 100}%`,
                      bgcolor: '#8b5cf6',
                      borderRadius: 99,
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Panel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Panel title="Duree moyenne sejour" desc="Buckets">
          <MiniDistribution
            rows={toDistributionRows(snapshot.lengthOfStay)}
            color="#10b981"
          />
        </Panel>

        <Panel title="Lead time moyen" desc="Avant check-in">
          <MiniDistribution
            rows={toDistributionRows(snapshot.leadTimeDistribution)}
            color="#e6b022"
          />
        </Panel>
      </Box>

      <Panel title="Performance par property" desc={`${selectedCount} selection(s)`}>
        <DataTable columns={performanceColumns} rows={snapshot.propertyPerformance} />
      </Panel>
        </>
      ) : null}
    </DashboardWrapper>
  );
}

function toDistributionRows(items: AnalyticsDistributionItem[]) {
  const maxCount = Math.max(1, ...items.map((item) => item.count));

  return items.map((item) => ({
    label: item.bucket,
    value: `${item.count} bookings`,
    ratio: item.count / maxCount,
  }));
}

function MiniDistribution({
  rows,
  color,
}: {
  rows: Array<{ label: string; value: string; ratio: number }>;
  color: string;
}) {
  return (
    <Stack spacing={1.25}>
      {rows.map((row) => (
        <Box key={row.label}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.4 }}>
            <Typography variant="body2">{row.label}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {row.value}
            </Typography>
          </Stack>
          <Box sx={{ height: 8, bgcolor: 'rgba(26,20,8,0.06)', borderRadius: 99 }}>
            <Box
              sx={{
                height: '100%',
                width: `${Math.max(20, Math.min(100, row.ratio * 100))}%`,
                bgcolor: color,
                borderRadius: 99,
              }}
            />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}
