import { useMemo, useState } from 'react';
import { Box, Button, Divider, Stack, Typography } from '@mui/material';
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
  ResponsiveContainer,
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
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  dashboardPeriods,
  dashboardProperties,
  mockAlerts,
  mockCheckFlow,
  mockDashboardKPIs,
  mockOccupancyByProperty,
  mockRecentReviews,
  mockRevenueChart,
  mockSourceDistribution,
  mockTopProperties,
  mockUnreadMessages,
  mockUpcomingCheckIns,
  mockUpcomingCheckOuts,
  mockUrgentTasks,
} from '../data/mockDashboard';

const chartColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];

const currency = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function DashboardPage() {
  const [period, setPeriod] = useState<(typeof dashboardPeriods)[number]>('Mois');
  const [selectedProperties, setSelectedProperties] = useState<string[]>(
    dashboardProperties.slice(0, 3)
  );

  const visibleCheckIns = useMemo(
    () =>
      mockUpcomingCheckIns.filter((item) =>
        selectedProperties.some((property) => item.property.includes(property.split(' - ')[0]))
      ),
    [selectedProperties]
  );

  const visibleCheckOuts = useMemo(
    () =>
      mockUpcomingCheckOuts.filter((item) =>
        selectedProperties.some((property) => item.property.includes(property.split(' - ')[0]))
      ),
    [selectedProperties]
  );

  const toggleProperty = (property: string) => {
    setSelectedProperties((prev) =>
      prev.includes(property)
        ? prev.filter((value) => value !== property)
        : [...prev, property]
    );
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Dashboard']}>
      <PageHeader title="Dashboard principal" count={period}>
        <Button sx={btnGhostSx}>Exporter CSV</Button>
        <Button sx={btnPrimarySx}>Generer report</Button>
      </PageHeader>

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

      <FilterBar>
        {dashboardProperties.map((property) => (
          <FilterChip
            key={property}
            label={property}
            active={selectedProperties.includes(property)}
            onClick={() => toggleProperty(property)}
          />
        ))}
      </FilterBar>

      <StatsRow>
        <StatCard
          icon="🎫"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={mockDashboardKPIs.totalReservations.value.toString()}
          label={`Reservations ${period.toLowerCase()}`}
          trend={mockDashboardKPIs.totalReservations.trend}
        />
        <StatCard
          icon="💶"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={currency.format(mockDashboardKPIs.monthlyRevenue.value)}
          label="Revenus du mois"
          trend={mockDashboardKPIs.monthlyRevenue.trend}
        />
        <StatCard
          icon="📈"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${mockDashboardKPIs.occupancyRate.value}%`}
          label="Taux d’occupation"
          trend={mockDashboardKPIs.occupancyRate.trend}
        />
        <StatCard
          icon="🛏️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={`${mockDashboardKPIs.adr.value} EUR`}
          label="ADR"
          trend={mockDashboardKPIs.adr.trend}
        />
      </StatsRow>

      <StatsRow>
        <StatCard
          icon="🏡"
          iconBg="rgba(245,158,11,0.12)"
          iconColor={t.warning}
          value={mockDashboardKPIs.activeProperties.value.toString()}
          label="Properties actives"
          trend={mockDashboardKPIs.activeProperties.trend}
        />
        <StatCard
          icon="⭐"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={mockDashboardKPIs.averageRating.value.toString()}
          label="Rating moyen"
          trend={mockDashboardKPIs.averageRating.trend}
        />
        <StatCard
          icon="👥"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={mockDashboardKPIs.guestsThisMonth.value.toString()}
          label="Guests ce mois"
          trend={mockDashboardKPIs.guestsThisMonth.trend}
        />
        <StatCard
          icon="📊"
          iconBg="rgba(239,68,68,0.12)"
          iconColor={t.error}
          value={`${mockDashboardKPIs.revpar.value} EUR`}
          label="RevPAR"
          trend={mockDashboardKPIs.revpar.trend}
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
        <Panel title="Revenus par jour / semaine / mois" desc="Revenue trend + bookings">
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={mockRevenueChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="revenue" />
                <YAxis yAxisId="bookings" orientation="right" />
                <Tooltip />
                <Legend />
                <Line yAxisId="revenue" type="monotone" dataKey="revenue" stroke="#e6b022" strokeWidth={3} />
                <Line yAxisId="bookings" type="monotone" dataKey="bookings" stroke="#8b5cf6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Panel>

        <Panel title="Reservations par source" desc="Airbnb, Booking, Direct, Vrbo">
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={mockSourceDistribution}
                  dataKey="value"
                  nameKey="source"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                >
                  {mockSourceDistribution.map((entry, index) => (
                    <Cell key={entry.source} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
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
        <Panel title="Taux d’occupation par property" desc="Bar chart par actif">
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={mockOccupancyByProperty}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="property" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupancy" radius={[8, 8, 0, 0]} fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <Stack spacing={1}>
            {mockOccupancyByProperty.map((property) => (
              <Stack
                key={property.property}
                direction="row"
                sx={{ justifyContent: 'space-between' }}
              >
                <Typography variant="body2">{property.property}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {property.occupancy}% · ADR {property.adr} EUR
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Panel>

        <Panel title="Check-ins / Check-outs" desc="Vue jour par jour">
          <Box sx={{ width: '100%', height: 320, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={mockCheckFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="checkIns" fill="#e6b022" radius={[8, 8, 0, 0]} />
                <Bar dataKey="checkOuts" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
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
            {visibleCheckIns.map((item) => (
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
            {visibleCheckOuts.map((item) => (
              <MiniRow
                key={item.id}
                title={item.guest}
                subtitle={`${item.property} · ${item.when}`}
                badge={item.source}
              />
            ))}
          </Stack>
        </Panel>

        <Panel title="Top properties par revenus" desc="Ranking mensuel">
          <Stack spacing={1.25}>
            {mockTopProperties.map((item, index) => (
              <MiniRow
                key={item.property}
                title={`${index + 1}. ${item.property}`}
                subtitle={`${currency.format(item.revenue)} · OCC ${item.occupancy}%`}
                badge={item.source}
              />
            ))}
          </Stack>
        </Panel>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: 'repeat(3, 1fr)' },
          gap: 2,
        }}
      >
        <Panel title="Taches urgentes" desc="5 prioritaires">
          <Stack spacing={1.25}>
            {mockUrgentTasks.map((task) => (
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
            {mockUnreadMessages.map((message) => (
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
            {mockRecentReviews.map((review) => (
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
            {mockAlerts.map((alert) => (
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
