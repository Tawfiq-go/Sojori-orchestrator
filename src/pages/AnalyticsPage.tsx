import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
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
  Panel,
  StableChart,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { ListingCheckboxFilter } from '../components/dashboard/ListingCheckboxFilter';
import {
  MonthPickerChip,
  stepMonthKey,
  useMonthPickerState,
} from '../components/dashboard/MonthPickerChip';
import { analyticsService } from '../services/analyticsService';
import {
  runAnalyticsDataAudit,
  type AnalyticsAuditSummary,
} from '../services/analyticsAuditService';
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
  const { requestOwnerId, ownerScopeUnset, showOwnerFilter } = useAdminOwnerFilter();
  const scopeFetchReady = useAdminScopeFetchReady();
  const [period, setPeriod] = useState<(typeof analyticsPeriodOptions)[number]['value']>('month');
  const [comparison, setComparison] = useState<'vs-last-period' | 'vs-last-year'>('vs-last-period');
  const [source, setSource] = useState<(typeof sourceOptions)[number]>('Tous');
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  /** Mois calendaire YYYY-MM — '' = mois en cours (quand period === month). */
  const [selectedMonth, setSelectedMonth] = useState('');
  const { options: monthOptions, labelByKey: monthLabelByKey } = useMonthPickerState();
  const stepMonth = useCallback(
    (delta: number) => {
      const next = stepMonthKey(selectedMonth, delta, monthOptions, monthLabelByKey);
      if (next === null) return;
      setSelectedMonth(next);
      setPeriod('month');
    },
    [selectedMonth, monthOptions, monthLabelByKey],
  );
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrichingLandR, setEnrichingLandR] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [reloadAttempt, setReloadAttempt] = useState(0);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [audit, setAudit] = useState<AnalyticsAuditSummary | null>(null);
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
      month: selectedMonth || (period === 'month' ? monthOptions.current.key : null),
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

    if (!scopeFetchReady) {
      runtimeLog('info', 'AnalyticsPage', 'Skip fetch: scope pas pret', { loadId });
      if (loadId === loadGenerationRef.current) {
        setLoading(true);
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
        const query: AnalyticsQuery = {
          period,
          comparison,
          source,
          listingIds: selectedProperties,
          customStartDate,
          customEndDate,
          month: selectedMonth || undefined,
          ownerId: requestOwnerId,
        };
        const nextSnapshot = await analyticsService.getSnapshot(query, {
          signal: controller.signal,
        });

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
          const enriched = await analyticsService.enrichWithLandR(query, nextSnapshot, {
            signal: controller.signal,
          });
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
    scopeFetchReady,
    selectedMonth,
    monthOptions.current.key,
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
      month: selectedMonth || undefined,
      ownerId: requestOwnerId,
    }),
    [
      comparison,
      customEndDate,
      customStartDate,
      period,
      requestOwnerId,
      selectedProperties,
      selectedMonth,
      source,
    ],
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

  const handleVerifyData = async () => {
    if (!showOwnerFilter || ownerScopeUnset || isCustomDateIncomplete) return;
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditError(null);
    try {
      const summary = await runAnalyticsDataAudit(currentQuery);
      const nameById = new Map(activeProperties.map((p) => [p.id, p.name || p.label]));
      summary.reservations = summary.reservations.map((r) => ({
        ...r,
        listingName:
          nameById.get(r.listingId) ||
          (r.listingName !== '—' && r.listingName !== r.listingId ? r.listingName : r.listingId || '—'),
      }));
      summary.scope.mode = 'admin';
      setAudit(summary);
    } catch (err) {
      setAudit(null);
      setAuditError(err instanceof Error ? err.message : 'Echec du recalcul audit');
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Analytics']}>
      <FilterBar>
        {analyticsPeriodOptions.map((item) => (
          <FilterChip
            key={item.value}
            label={item.label}
            active={period === item.value}
            onClick={() => {
              setPeriod(item.value);
              if (item.value !== 'month') setSelectedMonth('');
            }}
          />
        ))}
        <MonthPickerChip
          options={monthOptions}
          value={selectedMonth}
          onChange={(key) => {
            setSelectedMonth(key);
            setPeriod('month');
          }}
          onStep={stepMonth}
        />
        <FilterChip
          label={comparison === 'vs-last-period' ? 'Vs periode precedente' : 'Vs annee precedente'}
          active
          onClick={() =>
            setComparison((prev) =>
              prev === 'vs-last-period' ? 'vs-last-year' : 'vs-last-period'
            )
          }
        />
        <Button
          size="small"
          sx={btnGhostSx}
          disabled={exportDisabled}
          onClick={() => {
            void handleExport('csv');
          }}
        >
          {exporting === 'csv' ? 'Export…' : 'CSV'}
        </Button>
        <Button
          size="small"
          sx={btnGhostSx}
          disabled={exportDisabled}
          onClick={() => {
            void handleExport('pdf');
          }}
        >
          {exporting === 'pdf' ? 'PDF…' : 'PDF'}
        </Button>
        {showOwnerFilter ? (
          <Button
            size="small"
            sx={btnPrimarySx}
            disabled={ownerScopeUnset || isCustomDateIncomplete || auditLoading}
            onClick={() => {
              void handleVerifyData();
            }}
          >
            {auditLoading ? 'Vérif…' : 'Vérifier données'}
          </Button>
        ) : null}
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
        <ListingCheckboxFilter
          listings={activeProperties}
          selectedIds={selectedProperties}
          onApply={(ids) => {
            // Recalcule tout le snapshot (KPIs, charts, LandR) sur ce sous-ensemble.
            setSnapshot(null);
            setLoading(true);
            setSelectedProperties(ids);
          }}
          loading={loading && activeProperties.length === 0}
          disabled={ownerScopeUnset || activeProperties.length === 0}
        />
        {selectedProperties.length > 0 ? (
          <Button
            size="small"
            sx={btnGhostSx}
            onClick={() => {
              setSnapshot(null);
              setLoading(true);
              setSelectedProperties([]);
            }}
          >
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
        <Panel title="Saisonnalite" desc="Occupation réelle · 12 mois (calendrier)">
          {snapshot.seasonality.length > 0 ? (
            <StableChart height={320}>
              {({ width, height }: { width: number; height: number }) => (
                <BarChart width={width} height={height} data={snapshot.seasonality}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(26,20,8,0.08)" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip
                    formatter={(value: number) => [`${Number(value).toFixed(1)} %`, 'Occupation']}
                  />
                  <Bar dataKey="occupancy" name="Occupation %" radius={[8, 8, 0, 0]}>
                    {snapshot.seasonality.map((item, index) => (
                      <Cell
                        key={`${item.month}-${index}`}
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
      {showOwnerFilter ? (
        <Dialog
          open={auditOpen}
          onClose={() => {
            if (!auditLoading) setAuditOpen(false);
          }}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>Audit analytics (admin)</DialogTitle>
          <DialogContent dividers>
            {auditLoading ? (
              <Stack spacing={1} sx={{ py: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Recalcul manuel en cours (revenus, nuits, LandR, liste résas)…
                </Typography>
                <Skeleton height={28} />
                <Skeleton height={28} />
                <Skeleton height={120} />
              </Stack>
            ) : auditError ? (
              <Alert severity="error">{auditError}</Alert>
            ) : audit ? (
              <Stack spacing={2}>
                <Alert severity="info">
                  {audit.scope.periodLabel} · {audit.scope.startDate} → {audit.scope.endDate} ·{' '}
                  {audit.scope.listingCount} listing(s)
                  {audit.scope.ownerId ? ` · owner ${audit.scope.ownerId}` : ''} · source{' '}
                  {audit.scope.source}
                </Alert>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' },
                    gap: 1.5,
                  }}
                >
                  <AuditStat label="Revenus API" value={`${Math.round(audit.apis.revenueMad)} MAD`} />
                  <AuditStat label="Nuits API" value={String(audit.apis.bookedNights)} />
                  <AuditStat label="ADR recalculé" value={`${audit.apis.adrMad} MAD`} />
                  <AuditStat
                    label="Taux annulation"
                    value={`${audit.apis.cancelRateLandRPct ?? audit.apis.cancelRateListPct}%`}
                  />
                </Box>

                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  Annulations — {audit.cancelBreakdown.formula}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check-ins : {audit.cancelBreakdown.checkIns} · Annulations métier :{' '}
                  {audit.cancelBreakdown.softCancels} · Échecs paiement (exclus) :{' '}
                  {audit.cancelBreakdown.failedPayments}
                  {audit.apis.cancelRateLandRPct != null
                    ? ` · LandR : ${audit.apis.cancelRateLandRPct}%`
                    : ''}{' '}
                  · Liste : {audit.apis.cancelRateListPct}%
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  Statuts :{' '}
                  {Object.entries(audit.statusCounts)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(' · ') || '—'}
                </Typography>

                {audit.listTruncated ? (
                  <Alert severity="warning">
                    Liste plafonnée (total API {audit.listTotal}) — le détail peut être incomplet.
                  </Alert>
                ) : null}

                <Box sx={{ overflowX: 'auto', border: `1px solid ${t.border}`, borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Résa</TableCell>
                        <TableCell>Guest</TableCell>
                        <TableCell>Listing</TableCell>
                        <TableCell>Arrivée</TableCell>
                        <TableCell>Statut</TableCell>
                        <TableCell>Rôle taux</TableCell>
                        <TableCell align="right">Nuits</TableCell>
                        <TableCell align="right">Prix</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {audit.reservations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8}>
                            <Typography variant="body2" color="text.secondary">
                              Aucune réservation dans la fenêtre (arrivée).
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        audit.reservations.map((row) => (
                          <TableRow key={row.id || row.reservationNumber}>
                            <TableCell>{row.reservationNumber}</TableCell>
                            <TableCell>{row.guestName}</TableCell>
                            <TableCell>{row.listingName}</TableCell>
                            <TableCell>{row.arrivalDate}</TableCell>
                            <TableCell>{row.status}</TableCell>
                            <TableCell>{row.roleInCancelRate}</TableCell>
                            <TableCell align="right">{row.nights}</TableCell>
                            <TableCell align="right">{row.totalPrice}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </Box>

                <Stack spacing={0.5}>
                  {audit.notes.map((note) => (
                    <Typography key={note} variant="caption" color="text.secondary">
                      • {note}
                    </Typography>
                  ))}
                </Stack>
              </Stack>
            ) : null}
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                void handleVerifyData();
              }}
              disabled={auditLoading}
              sx={btnGhostSx}
            >
              Relancer
            </Button>
            <Button
              onClick={() => setAuditOpen(false)}
              disabled={auditLoading}
              sx={btnPrimarySx}
            >
              Fermer
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </DashboardWrapper>
  );
}

function AuditStat({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 2,
        border: `1px solid ${t.border}`,
        bgcolor: '#fff',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {value}
      </Typography>
    </Box>
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
