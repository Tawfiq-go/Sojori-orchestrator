import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Alert, Autocomplete, Box, Button, Skeleton, Stack, TextField, Typography } from '@mui/material';
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
import { buildEmptyAnalyticsSnapshot } from '../services/analyticsSnapshotBuilder';
import { useAdminScopeFetchReady } from '../hooks/useAdminScopeFetchReady';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { analyticsPeriodOptions } from '../types/analytics.types';
import { runtimeLog } from '../utils/runtimeLog';
import { createCurrencyFormatter } from '../utils/analyticsCurrency';
import type {
  AnalyticsDistributionItem,
  AnalyticsPropertyPerformanceRow,
  AnalyticsQuery,
  AnalyticsSnapshot,
} from '../types/analytics.types';

const sourceOptions = ['Tous', 'Airbnb', 'Booking.com', 'Sojori', 'Vrbo'] as const;

function isRequestCanceled(err: unknown): boolean {
  if (axios.isCancel(err)) return true;
  const o = err as { code?: string; name?: string };
  return o?.code === 'ERR_CANCELED' || o?.name === 'CanceledError';
}

export function AnalyticsPage() {
  return <AnalyticsPageContent />;
}

function AnalyticsPageContent() {
  const { requestOwnerId, ownerScopeUnset } = useAdminOwnerFilter();
  const scopeFetchReady = useAdminScopeFetchReady();
  const [period, setPeriod] = useState<(typeof analyticsPeriodOptions)[number]['value']>('30d');
  const [comparison, setComparison] = useState<'vs-last-period' | 'vs-last-year'>('vs-last-period');
  const [source, setSource] = useState<(typeof sourceOptions)[number]>('Tous');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrichingLandR, setEnrichingLandR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const loadGenerationRef = useRef(0);

  useEffect(() => {
    setSelectedProperties([]);
  }, [requestOwnerId]);

  useEffect(() => {
    const loadId = ++loadGenerationRef.current;

    runtimeLog('info', 'AnalyticsPage', 'useEffect load cycle', {
      loadId,
      period,
      comparison,
      source,
      listingIds: selectedProperties,
      customStartDate: customStartDate || null,
      customEndDate: customEndDate || null,
      reloadAttempt,
    });

    if (period === 'custom' && (!customStartDate || !customEndDate)) {
      runtimeLog('warn', 'AnalyticsPage', 'Skip fetch: custom period sans dates completes', { loadId });
      if (loadId === loadGenerationRef.current) {
        setLoading(false);
      }
      return;
    }

    if (ownerScopeUnset) {
      runtimeLog('info', 'AnalyticsPage', 'Skip fetch: admin sans choix de scope', { loadId });
      if (loadId === loadGenerationRef.current) {
        setSnapshot(buildEmptyAnalyticsSnapshot());
        setLoading(false);
        setError(null);
      }
      return;
    }

    const controller = new AbortController();

    async function loadAnalytics() {
      if (loadId !== loadGenerationRef.current) {
        runtimeLog('info', 'AnalyticsPage', 'loadAnalytics abandon (stale loadId)', { loadId });
        return;
      }
      setLoading(true);
      setEnrichingLandR(false);
      runtimeLog('info', 'AnalyticsPage', 'loadAnalytics start', { loadId });
      try {
        const nextSnapshot = await analyticsService.getSnapshot(
          {
            period,
            comparison,
            source,
            listingIds: selectedProperties,
            customStartDate,
            customEndDate,
            ownerId: requestOwnerId,
          },
          { signal: controller.signal },
        );

        if (loadId !== loadGenerationRef.current) {
          runtimeLog('warn', 'AnalyticsPage', 'Snapshot recu mais loadId obsolete — ignore', { loadId });
          return;
        }
        setSnapshot(nextSnapshot);
        setError(null);
        setLoading(false);
        runtimeLog('info', 'AnalyticsPage', 'loadAnalytics success (fast path)', {
          loadId,
          periodLabel: nextSnapshot.periodLabel,
        });

        setEnrichingLandR(true);
        try {
          const enriched = await analyticsService.enrichWithLandR(
            {
              period,
              comparison,
              source,
              listingIds: selectedProperties,
              customStartDate,
              customEndDate,
              ownerId: requestOwnerId,
            },
            nextSnapshot,
            { signal: controller.signal },
          );
          if (loadId === loadGenerationRef.current) {
            setSnapshot(enriched);
            runtimeLog('info', 'AnalyticsPage', 'landR enrich OK', { loadId });
          }
        } catch (enrichErr) {
          if (!isRequestCanceled(enrichErr) && loadId === loadGenerationRef.current) {
            runtimeLog('warn', 'AnalyticsPage', 'landR enrich skipped', {
              loadId,
              message: enrichErr instanceof Error ? enrichErr.message : String(enrichErr),
            });
          }
        } finally {
          if (loadId === loadGenerationRef.current) {
            setEnrichingLandR(false);
          }
        }
      } catch (err) {
        if (loadId !== loadGenerationRef.current) {
          return;
        }
        if (isRequestCanceled(err)) {
          runtimeLog('warn', 'AnalyticsPage', 'Requete annulee (ignorer si navigation)', { loadId });
          return;
        }
        console.error('Failed to load analytics page:', err);
        const msg = formatAnalyticsLoadError(err);
        setSnapshot(null);
        setError(msg);
        runtimeLog('error', 'AnalyticsPage', 'loadAnalytics erreur', { loadId, msg, err });
      } finally {
        if (loadId === loadGenerationRef.current) {
          setLoading(false);
          setEnrichingLandR(false);
          runtimeLog('info', 'AnalyticsPage', 'loadAnalytics finally loading=false', { loadId });
        }
      }
    }

    void loadAnalytics();

    return () => {
      controller.abort();
    };
  }, [
    comparison,
    customEndDate,
    customStartDate,
    period,
    reloadAttempt,
    selectedProperties,
    source,
    requestOwnerId,
    ownerScopeUnset,
  ]);

  const activeProperties = useMemo(
    () => (snapshot?.properties ?? []).filter((property) => property.isActive !== false),
    [snapshot?.properties],
  );

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
      ownerId: requestOwnerId,
    }),
    [comparison, customEndDate, customStartDate, period, requestOwnerId, selectedProperties, source],
  );

  const money = useMemo(
    () => createCurrencyFormatter(snapshot?.displayCurrency ?? 'MAD'),
    [snapshot?.displayCurrency],
  );

  const performanceColumns = useMemo(
    () => [
      { key: 'property', label: 'Property', sortable: true },
      {
        key: 'revenue',
        label: 'Revenue',
        sortable: true,
        render: (row: AnalyticsPropertyPerformanceRow) => money.format(row.revenue),
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
        render: (row: AnalyticsPropertyPerformanceRow) => money.format(row.adr),
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
    ],
    [money],
  );

  const sourceColors = ['#e6b022', '#8b5cf6', '#10b981', '#06b6d4'];
  const selectedCount =
    selectedProperties.length > 0
      ? selectedProperties.length
      : activeProperties.length || snapshot?.propertyPerformance.length || 0;
  const isCustomDateIncomplete = period === 'custom' && (!customStartDate || !customEndDate);
  const exportDisabled =
    loading || !snapshot || isCustomDateIncomplete || exporting !== null || ownerScopeUnset;

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (exportDisabled) return;

    try {
      setExporting(format);
      if (format === 'pdf') {
        await analyticsService.downloadPerformancePdf(currentQuery);
      } else {
        await analyticsService.downloadPerformanceCsv(currentQuery);
      }
    } catch (err) {
      console.error(`Failed to export analytics ${format}:`, err);
      setError(
        format === 'pdf'
          ? 'Impossible de generer le PDF analytics.'
          : 'Impossible de generer le fichier analytics.',
      );
    } finally {
      setExporting(null);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Analytics']}>
      <PageHeader
        title="Analytics"
        count={
          ownerScopeUnset
            ? '—'
            : `${loading ? 'Actualisation' : snapshot?.periodLabel ?? 'Analytics'} · ${
                comparison === 'vs-last-period' ? 'vs periode precedente' : 'vs annee precedente'
              }${
                snapshot?.displayCurrency
                  ? ` · montants en ${snapshot.displayCurrency}${
                      snapshot.mixedListingCurrencies && snapshot.listingCurrencies.length > 0
                        ? ` (listings: ${snapshot.listingCurrencies.join(', ')})`
                        : snapshot.listingCurrencies.length === 1
                          ? ` (listings: ${snapshot.listingCurrencies[0]})`
                          : ''
                    }`
                  : ''
              }`
        }
      >
        <Button
          sx={btnGhostSx}
          disabled={exportDisabled}
          onClick={() => {
            void handleExport('pdf');
          }}
        >
          {exporting === 'pdf' ? 'Export PDF...' : 'Export PDF'}
        </Button>
        <Button
          sx={btnGhostSx}
          disabled={exportDisabled}
          onClick={() => {
            void handleExport('csv');
          }}
        >
          {exporting === 'csv' ? 'Export Excel...' : 'Export Excel'}
        </Button>
        <Button
          sx={btnPrimarySx}
          disabled={exportDisabled}
          onClick={() => {
            void handleExport('csv');
          }}
        >
          {exporting === 'csv' ? 'Export CSV...' : 'Export CSV'}
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

      {isCustomDateIncomplete && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Selectionne une date de debut et une date de fin pour charger et exporter la vue custom.
        </Alert>
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
        <Autocomplete
          multiple
          size="small"
          limitTags={1}
          options={activeProperties}
          getOptionLabel={(property) => property.label}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={activeProperties.filter((property) => selectedProperties.includes(property.id))}
          onChange={(_event, value) => setSelectedProperties(value.map((property) => property.id))}
          loading={loading && activeProperties.length === 0}
          noOptionsText={
            loading ? 'Chargement des listings actifs…' : 'Aucun listing actif'
          }
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={
                selectedProperties.length === 0
                  ? `Listings actifs (${activeProperties.length || '…'})`
                  : `${selectedProperties.length} listing(s)`
              }
            />
          )}
          sx={{ minWidth: 280, flex: '1 1 320px', maxWidth: 480 }}
        />
        {selectedProperties.length > 0 ? (
          <Button size="small" sx={btnGhostSx} onClick={() => setSelectedProperties([])}>
            Tous actifs
          </Button>
        ) : null}
      </FilterBar>

      {error && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading && !snapshot ? (
        <AnalyticsPageSkeleton />
      ) : snapshot ? (
        <>
      <StatsRow>
        <StatCard
          icon="💶"
          iconBg="rgba(16,185,129,0.12)"
          iconColor={t.success}
          value={money.format(snapshot.summary.revenue.value)}
          label="Revenus"
          trend={`${snapshot.summary.revenue.trend >= 0 ? '+' : ''}${snapshot.summary.revenue.trend.toFixed(1)}%`}
          trendUp={snapshot.summary.revenue.trend >= 0}
        />
        <StatCard
          icon="📈"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${snapshot.summary.occupancyRate.value.toFixed(1)}%`}
          label="Taux d'occupation"
          trend={`${snapshot.summary.occupancyRate.trend >= 0 ? '+' : ''}${snapshot.summary.occupancyRate.trend.toFixed(1)}%`}
          trendUp={snapshot.summary.occupancyRate.trend >= 0}
        />
        <StatCard
          icon="🛏️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={money.format(snapshot.summary.averageDailyRate.value)}
          label="ADR"
          trend={`${snapshot.summary.averageDailyRate.trend >= 0 ? '+' : ''}${snapshot.summary.averageDailyRate.trend.toFixed(1)}%`}
          trendUp={snapshot.summary.averageDailyRate.trend >= 0}
        />
        <StatCard
          icon="🌙"
          iconBg="rgba(245,158,11,0.12)"
          iconColor={t.warning}
          value={snapshot.summary.bookedNights.value.toString()}
          label="Nuits reservees"
          trend={`${snapshot.summary.bookedNights.trend >= 0 ? '+' : ''}${snapshot.summary.bookedNights.trend.toFixed(1)}%`}
          trendUp={snapshot.summary.bookedNights.trend >= 0}
        />
      </StatsRow>

      <StatsRow>
        <StatCard
          icon="🏆"
          iconBg="rgba(230,176,34,0.12)"
          iconColor={t.primaryDeep}
          value={`${snapshot.kpis.performanceScore}/100`}
          label="Performance score"
          trend={`${snapshot.kpis.performanceScoreTrend >= 0 ? '+' : ''}${snapshot.kpis.performanceScoreTrend.toFixed(1)} pts`}
          trendUp={snapshot.kpis.performanceScoreTrend >= 0}
        />
        <StatCard
          icon="🗓️"
          iconBg="rgba(6,182,212,0.12)"
          iconColor={t.info}
          value={`${snapshot.kpis.averageStay.toFixed(1)} nuits`}
          label="Duree moyenne sejour"
          trend={`${snapshot.kpis.averageStayTrend >= 0 ? '+' : ''}${snapshot.kpis.averageStayTrend.toFixed(1)}%`}
          trendUp={snapshot.kpis.averageStayTrend >= 0}
        />
        <StatCard
          icon="⏱️"
          iconBg="rgba(139,92,246,0.12)"
          iconColor={t.ai}
          value={`${snapshot.kpis.leadTime} j`}
          label="Lead time moyen"
          trend={`${snapshot.kpis.leadTimeTrend >= 0 ? '+' : ''}${snapshot.kpis.leadTimeTrend.toFixed(0)}%`}
          trendUp={snapshot.kpis.leadTimeTrend >= 0}
        />
        <StatCard
          icon="❌"
          iconBg="rgba(239,68,68,0.12)"
          iconColor={t.error}
          value={`${snapshot.kpis.cancellationRate.toFixed(1)}%`}
          label="Taux d'annulation"
          trend={`${snapshot.kpis.cancellationRateTrend >= 0 ? '+' : ''}${snapshot.kpis.cancellationRateTrend.toFixed(1)}%`}
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
          {snapshot.revenueEvolution.length > 0 ? (
            <StableChart height={320}>
              {({ width, height }: { width: number; height: number }) => (
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
          ) : (
            <EmptyPanelState message="Aucune serie de revenus disponible sur la periode selectionnee." />
          )}
        </Panel>

        <Panel title="Analyse sources reservations" desc={source === 'Tous' ? 'Toutes sources' : source}>
          {filteredSources.length > 0 ? (
            <StableChart height={320}>
              {({ width, height }: { width: number; height: number }) => (
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
          ) : (
            <EmptyPanelState message="Aucune reservation canal disponible avec le filtre courant." />
          )}
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
        <Panel title="Saisonnalite" desc="Intensite relative par mois (CA ou reservations)">
          {snapshot.seasonality.length > 0 ? (
            <StableChart height={320}>
              {({ width, height }: { width: number; height: number }) => (
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
          ) : (
            <EmptyPanelState message="Pas assez de donnees pour afficher la saisonnalite." />
          )}
        </Panel>

        <Panel title="Guest demographics" desc="Top pays d’origine">
          {snapshot.guestDemographics.length > 0 ? (
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
          ) : (
            <EmptyPanelState message="Aucune information de provenance voyageurs pour cette selection." />
          )}
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
          {snapshot.lengthOfStay.length > 0 ? (
            <MiniDistribution
              rows={toDistributionRows(snapshot.lengthOfStay)}
              color="#10b981"
            />
          ) : (
            <EmptyPanelState message="Aucune distribution de sejour disponible." />
          )}
        </Panel>

        <Panel title="Lead time moyen" desc="Avant check-in">
          {snapshot.leadTimeDistribution.length > 0 ? (
            <MiniDistribution
              rows={toDistributionRows(snapshot.leadTimeDistribution)}
              color="#e6b022"
            />
          ) : (
            <EmptyPanelState message="Aucune distribution de lead time disponible." />
          )}
        </Panel>
      </Box>

      <Panel
        title="Performance par property"
        desc={`${selectedCount} selection(s) · ${enrichingLandR ? 'affinage landR en cours…' : 'source revenue-per-l-and-r'}`}
      >
        {snapshot.propertyPerformance.length > 0 ? (
          <DataTable
            columns={performanceColumns}
            rows={snapshot.propertyPerformance.filter((row) => row.revenue > 0 || row.occupancy > 0)}
          />
        ) : (
          <EmptyPanelState message="Aucune performance property disponible pour les filtres actifs." />
        )}
      </Panel>
        </>
      ) : (
        <Panel title="Donnees analytics" desc="Aucun snapshot charge">
          <Stack spacing={2} sx={{ py: 1, maxWidth: 520 }}>
            {isCustomDateIncomplete ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Periode custom : choisis une date de debut et une date de fin. Les indicateurs se chargent
                automatiquement une fois les deux dates renseignees.
              </Typography>
            ) : error ? (
              <>
                <Typography variant="body2">{error}</Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setError(null);
                    setReloadAttempt((n) => n + 1);
                  }}
                >
                  Reessayer
                </Button>
              </>
            ) : (
              <>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Le chargement a ete interrompu avant reception des donnees (navigation rapide ou annulation).
                  Reessaie pour relancer la requete.
                </Typography>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setReloadAttempt((n) => n + 1);
                  }}
                >
                  Reessayer
                </Button>
              </>
            )}
          </Stack>
        </Panel>
      )}
    </DashboardWrapper>
  );
}

function formatAnalyticsLoadError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      | { error?: string; message?: string; errorMsg?: string }
      | undefined;
    const detail =
      data?.error || data?.message || data?.errorMsg || (err.response?.status ? `HTTP ${err.response.status}` : null);
    if (detail) {
      return `Impossible de charger les analytics : ${detail}`;
    }
    if (err.message) {
      return `Impossible de charger les analytics : ${err.message}`;
    }
  }
  if (err instanceof Error && err.message) {
    return `Impossible de charger les analytics : ${err.message}`;
  }
  return 'Impossible de charger les analytics en temps reel.';
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

function EmptyPanelState({ message }: { message: string }) {
  return (
    <Stack
      sx={{
        minHeight: 220,
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        px: 3,
      }}
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 360 }}>
        {message}
      </Typography>
    </Stack>
  );
}

function AnalyticsPageSkeleton() {
  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' },
          gap: 2,
          mb: 2,
        }}
      >
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" height={138} />
        ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', xl: '1fr 1fr' },
          gap: 2,
          mb: 2,
        }}
      >
        <Skeleton variant="rounded" height={360} />
        <Skeleton variant="rounded" height={360} />
      </Box>
      <Skeleton variant="rounded" height={360} />
    </>
  );
}
