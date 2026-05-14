import { useMemo, useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
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
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  analyticsPeriods,
  analyticsSources,
  mockAnalyticsKPIs,
  mockGuestDemographics,
  mockLeadTimeDistribution,
  mockLengthOfStay,
  mockPropertyPerformance,
  mockRevenueEvolution,
  mockSeasonality,
  mockSourceBreakdown,
} from '../data/mockAnalytics';
import { dashboardProperties } from '../data/mockDashboard';

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function AnalyticsPage() {
  const [period, setPeriod] = useState<(typeof analyticsPeriods)[number]['value']>('this-month');
  const [comparison, setComparison] = useState<'vs-last-month' | 'vs-last-year'>('vs-last-month');
  const [source, setSource] = useState<(typeof analyticsSources)[number]>('Tous');
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    dashboardProperties.slice(0, 2)
  );

  const filteredSources = useMemo(
    () =>
      source === 'Tous'
        ? mockSourceBreakdown
        : mockSourceBreakdown.filter((item) => item.source === source),
    [source]
  );

  const performanceColumns = [
    { key: 'property', label: 'Property', sortable: true },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      render: (row: (typeof mockPropertyPerformance)[number]) => currency.format(row.revenue),
    },
    {
      key: 'occupancy',
      label: 'Occupancy',
      sortable: true,
      render: (row: (typeof mockPropertyPerformance)[number]) => `${row.occupancy}%`,
    },
    {
      key: 'adr',
      label: 'ADR',
      sortable: true,
      render: (row: (typeof mockPropertyPerformance)[number]) => `${row.adr} EUR`,
    },
    {
      key: 'leadTime',
      label: 'Lead time',
      sortable: true,
      render: (row: (typeof mockPropertyPerformance)[number]) => `${row.leadTime} jours`,
    },
    {
      key: 'cancellations',
      label: 'Cancellations',
      sortable: true,
      render: (row: (typeof mockPropertyPerformance)[number]) => (
        <Badge variant={row.cancellations > 2 ? 'warning' : 'success'}>
          {row.cancellations}
        </Badge>
      ),
    },
  ];

  const sourceColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Analytics']}>
      <PageHeader title="Analytics" count={comparison === 'vs-last-month' ? 'vs mois precedent' : 'vs annee precedente'}>
        <Button sx={btnGhostSx}>Export PDF</Button>
        <Button sx={btnGhostSx}>Export Excel</Button>
        <Button sx={btnPrimarySx}>Export CSV</Button>
      </PageHeader>

      <FilterBar>
        {analyticsPeriods.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            active={period === item.value}
            onClick={() => setPeriod(item.value)}
          />
        ))}
        <FilterChip
          label={comparison === 'vs-last-month' ? 'Vs mois precedent' : 'Vs annee precedente'}
          active
          onClick={() =>
            setComparison((prev) =>
              prev === 'vs-last-month' ? 'vs-last-year' : 'vs-last-month'
            )
          }
        />
      </FilterBar>

      <FilterBar>
        {analyticsSources.map((item) => (
          <FilterChip
            key={item}
            label={item}
            active={source === item}
            onClick={() => setSource(item)}
          />
        ))}
      </FilterBar>

      <FilterBar>
        {dashboardProperties.map((property) => (
          <FilterChip
            key={property}
            label={property}
            active={selectedProperties.includes(property)}
            onClick={() =>
              setSelectedProperties((prev) =>
                prev.includes(property)
                  ? prev.filter((value) => value !== property)
                  : [...prev, property]
              )
            }
          />
        ))}
      </FilterBar>

      <StatsRow>
        <StatCard
          icon="🏆"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={mockAnalyticsKPIs.performanceScore.toString()}
          label="Performance score"
          trend="+4 pts"
        />
        <StatCard
          icon="🗓️"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${mockAnalyticsKPIs.averageStay} nuits`}
          label="Duree moyenne sejour"
          trend="+0.3"
        />
        <StatCard
          icon="⏱️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={`${mockAnalyticsKPIs.leadTime} jours`}
          label="Lead time moyen"
          trend="+2"
        />
        <StatCard
          icon="❌"
          iconBg="rgba(239,68,68,0.12)"
          iconColor={t.error}
          value={`${mockAnalyticsKPIs.cancellationRate}%`}
          label="Taux d’annulation"
          trend="-1.1%"
          trendUp={false}
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
        <Panel title="Evolution revenus" desc="Periode comparee">
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={mockRevenueEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="current" stroke="#e6b022" strokeWidth={3} />
                <Line type="monotone" dataKey="previous" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        <Panel title="Analyse sources reservations" desc={source === 'Tous' ? 'Toutes OTA' : source}>
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={filteredSources}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="source" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookings" fill="#10b981" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#e6b022" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
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
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={mockSeasonality}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]}>
                  {mockSeasonality.map((item, index) => (
                    <Cell
                      key={item.month}
                      fill={sourceColors[index % sourceColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        <Panel title="Guest demographics" desc="Top pays d’origine">
          <Stack spacing={1.25}>
            {mockGuestDemographics.map((item) => (
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
                      width: `${(item.guests / mockGuestDemographics[0].guests) * 100}%`,
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
            rows={mockLengthOfStay.map((item) => ({
              label: item.bucket,
              value: `${item.count} bookings`,
              ratio: item.count / mockLengthOfStay[1].count,
            }))}
            color="#10b981"
          />
        </Panel>

        <Panel title="Lead time moyen" desc="Avant check-in">
          <MiniDistribution
            rows={mockLeadTimeDistribution.map((item) => ({
              label: item.bucket,
              value: `${item.count} bookings`,
              ratio: item.count / mockLeadTimeDistribution[3].count,
            }))}
            color="#e6b022"
          />
        </Panel>
      </Box>

      <Panel title="Performance par property" desc={`${selectedProperties.length} selection(s)`}>
        <DataTable columns={performanceColumns} rows={mockPropertyPerformance} />
      </Panel>
    </DashboardWrapper>
  );
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
