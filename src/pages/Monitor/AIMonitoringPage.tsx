/**
 * AI / LLM Monitoring — layout dense (même pattern que l’onglet API).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  Badge,
  DataTable,
  FilterChip,
  MonitorEmpty,
  MonitorError,
  MonitorErrorList,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageFrame,
  MonitorSection,
  MonitorSelectFilter,
  MonitorSubTabs,
  MonitorTimeRange,
  MonitorToolbarRow,
  TablePagination,
  btnGhostSx,
  monitorTokens as t,
  severityBadgeVariant,
} from '../../features/monitoring/shared/MonitorDesign';

type SubTab = 'summary' | 'calls' | 'errors';
type StatusFilter = 'all' | 'failed' | 'timeout' | 'fallback' | 'success';

interface AiCall {
  _id?: string;
  timestamp?: string;
  service?: string;
  severity?: string;
  data?: {
    llm_provider?: string;
    model?: string;
    tokens_used?: number;
    cost_usd?: number;
    latency_ms?: number;
    user_friendly_message?: string;
    error_message?: string;
    fallback_to?: string;
    ai_status?: string;
  };
}

interface ProviderStats {
  _id?: string;
  total?: number;
  failed?: number;
  fallbacks?: number;
  avgLatency?: number;
  totalTokens?: number;
  totalCost?: number;
}

/** Erreurs agrégées par /ai/stats (champs plats, pas `data`). */
interface StatsRecentError {
  _id?: string;
  timestamp?: string;
  service?: string;
  provider?: string;
  model?: string;
  status?: string;
  error?: string;
  latency?: number;
}

interface SummaryData {
  byProvider?: ProviderStats[];
  recentErrors?: StatsRecentError[];
}

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
];

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'summary', label: 'Synthèse' },
  { value: 'calls', label: 'Appels' },
  { value: 'errors', label: 'Erreurs' },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'failed', label: 'Échec' },
  { value: 'timeout', label: 'Timeout' },
  { value: 'fallback', label: 'Fallback' },
  { value: 'success', label: 'Lent OK' },
];

function formatModelDisplay(provider?: string, model?: string) {
  if (!model) return provider?.toUpperCase() || 'Inconnu';
  const names: Record<string, string> = {
    openai: 'OpenAI',
    claude: 'Claude',
    gemini: 'Gemini',
    rules: 'Rules',
  };
  const p = names[provider || ''] || provider?.toUpperCase();
  if (model.includes('gpt-4')) return `${p} GPT-4`;
  if (model.includes('gpt-3.5')) return `${p} GPT-3.5`;
  if (model.includes('claude')) return `${p} Claude`;
  if (model.includes('gemini')) return `${p} Gemini`;
  return `${p} ${model}`;
}

function providerBadgeVariant(p?: string): 'success' | 'ai' | 'info' | 'warning' | 'neutral' {
  if (p === 'openai') return 'success';
  if (p === 'claude') return 'ai';
  if (p === 'gemini') return 'info';
  if (p === 'rules') return 'warning';
  return 'neutral';
}

function extractApiError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const ax = err as { response?: { status?: number; data?: { error?: string } }; message?: string };
    const status = ax.response?.status;
    const msg = ax.response?.data?.error || ax.message;
    if (status === 401) return 'Non authentifié (401) — connectez-vous ou VITE_DEV_TOKEN.';
    return msg || `Erreur HTTP ${status ?? '?'}`;
  }
  return err instanceof Error ? err.message : 'Erreur réseau';
}

export default function AIMonitoringPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [live, setLive] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [callsData, setCallsData] = useState({
    calls: [] as AiCall[],
    total: 0,
    page: 1,
    totalPages: 1,
  });
  const [errorsData, setErrorsData] = useState<AiCall[]>([]);
  const [provider, setProvider] = useState('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [service, setService] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 50;

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await apiClient.get('/api/monitoring/ai/stats', { params: { timeRange } });
      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Stats IA indisponibles');
      }
      setSummaryData(response.data.data ?? null);
    } catch (err) {
      setSummaryData(null);
      setFetchError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const params: Record<string, string | number> = {
        page,
        limit,
        provider,
        status,
        timeRange,
      };
      if (service !== 'all') params.service = service;
      const response = await apiClient.get('/api/monitoring/ai/calls', { params });
      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Liste appels IA indisponible');
      }
      const payload = response.data.data ?? {};
      const pag = payload.pagination ?? {};
      setCallsData({
        calls: payload.calls ?? [],
        total: pag.total ?? payload.calls?.length ?? 0,
        page: pag.page ?? page,
        totalPages: pag.pages ?? pag.totalPages ?? 1,
      });
    } catch (err) {
      setCallsData({ calls: [], total: 0, page: 1, totalPages: 1 });
      setFetchError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [page, provider, status, service, timeRange]);

  const fetchErrors = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const response = await apiClient.get('/api/monitoring/ai/errors', {
        params: { limit: 100, timeRange },
      });
      if (response.data?.success === false) {
        throw new Error(response.data.error || 'Erreurs IA indisponibles');
      }
      setErrorsData(response.data.data?.errors || []);
    } catch (err) {
      setErrorsData([]);
      setFetchError(extractApiError(err));
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  const refresh = () => {
    if (activeTab === 'summary') void fetchSummary();
    else if (activeTab === 'calls') void fetchCalls();
    else void fetchErrors();
  };

  useEffect(() => {
    if (activeTab === 'summary') {
      void fetchSummary();
      if (!live) return;
      const interval = setInterval(fetchSummary, 30000);
      return () => clearInterval(interval);
    }
    if (activeTab === 'calls') void fetchCalls();
    else void fetchErrors();
  }, [activeTab, fetchSummary, fetchCalls, fetchErrors, live]);

  useEffect(() => {
    setPage(1);
  }, [provider, status, service]);

  const totalProblems =
    summaryData?.byProvider?.reduce((s, p) => s + (p.total || 0), 0) ?? 0;
  const totalFailed =
    summaryData?.byProvider?.reduce((s, p) => s + (p.failed || 0), 0) ?? 0;
  const totalFallbacks =
    summaryData?.byProvider?.reduce((s, p) => s + (p.fallbacks || 0), 0) ?? 0;
  const avgLatency =
    summaryData?.byProvider?.length
      ? Math.round(
          summaryData.byProvider.reduce((s, p) => s + (p.avgLatency || 0), 0) /
            summaryData.byProvider.length,
        )
      : 0;
  const totalTokens =
    summaryData?.byProvider?.reduce((s, p) => s + (p.totalTokens || 0), 0) ?? 0;
  const totalCost =
    summaryData?.byProvider?.reduce((s, p) => s + (p.totalCost || 0), 0) ?? 0;
  const hasSummaryEvents = totalProblems > 0;

  const callRows = useMemo(
    () => (callsData.calls || []).map((c, idx) => ({ id: c._id || `call-${idx}`, ...c })),
    [callsData.calls],
  );

  const setStatusFromKpi = (next: StatusFilter) => {
    setStatus((prev) => (prev === next ? 'all' : next));
    if (next !== 'all') setActiveTab('calls');
  };

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <>
            <MonitorSubTabs dense options={SUB_TABS} value={activeTab} onChange={setActiveTab} />
            <MonitorTimeRange dense ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          </>
        }
        right={
          <>
            <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
              <Badge variant={live ? 'success' : 'neutral'} dot>
                {live ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button sx={btnGhostSx} onClick={refresh} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      {(summaryData || !loading) && activeTab === 'summary' ? (
        <MonitorKpiStrip
          items={[
            {
              label: 'Problèmes',
              value: totalProblems,
              tone: totalProblems > 0 ? 'error' : 'success',
              active: status === 'all',
              onClick: () => setStatus('all'),
            },
            {
              label: 'Échecs',
              value: totalFailed,
              tone: 'error',
              active: status === 'failed',
              onClick: () => setStatusFromKpi('failed'),
            },
            {
              label: 'Fallbacks',
              value: totalFallbacks,
              tone: 'warning',
              active: status === 'fallback',
              onClick: () => setStatusFromKpi('fallback'),
            },
            {
              label: 'Latence moy.',
              value: avgLatency ? `${avgLatency}ms` : '—',
              tone: 'info',
            },
            {
              label: 'Tokens',
              value: totalTokens.toLocaleString('fr-FR'),
              tone: 'neutral',
            },
            {
              label: 'Coût',
              value: totalCost > 0 ? `$${totalCost.toFixed(3)}` : '—',
              tone: 'success',
            },
          ]}
        />
      ) : null}

      {fetchError ? <MonitorError message={fetchError} onRetry={refresh} /> : null}

      {activeTab === 'summary' && (
        <>
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData && hasSummaryEvents ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.4fr)' },
                gap: 1.25,
                alignItems: 'start',
              }}
            >
              <Stack spacing={1.25}>
                {(summaryData.byProvider?.length ?? 0) > 0 && (
                  <MonitorSection dense title="Par fournisseur" desc="clic → Appels">
                    <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap' }}>
                      {summaryData.byProvider!.map((ps) => (
                        <FilterChip
                          key={ps._id}
                          label={`${ps._id || '?'} · ${ps.total ?? 0}`}
                          active={provider === ps._id}
                          onClick={() => {
                            setProvider(ps._id || 'all');
                            setActiveTab('calls');
                          }}
                        />
                      ))}
                    </Stack>
                  </MonitorSection>
                )}
              </Stack>

              {(summaryData.recentErrors?.length ?? 0) > 0 ? (
                <MonitorSection
                  dense
                  title="Erreurs récentes"
                  desc={`${Math.min(summaryData.recentErrors!.length, 10)}`}
                >
                  <MonitorErrorList
                    dense
                    items={summaryData.recentErrors!.slice(0, 10).map((e) => ({
                      _id: e._id,
                      severity: 'error',
                      timestamp: e.timestamp,
                      service: e.service,
                      data: {
                        user_friendly_message: e.error || `${e.status} — ${e.provider}`,
                        llm_provider: e.provider,
                        model: e.model,
                        latency_ms: e.latency,
                      },
                    }))}
                    renderTitle={(e) =>
                      String(e.data?.user_friendly_message || e.service || 'Erreur IA')
                    }
                    renderMeta={(e) => (
                      <>
                        {formatModelDisplay(
                          e.data?.llm_provider as string | undefined,
                          e.data?.model as string | undefined,
                        )}
                        {e.data?.latency_ms != null ? ` · ${e.data.latency_ms} ms` : ''}
                        {' · '}
                        {e.service || '—'}
                        {' · '}
                        {formatCasablancaDate(e.timestamp)}
                      </>
                    )}
                  />
                </MonitorSection>
              ) : (
                <MonitorEmpty message="Aucune erreur récente sur la période." />
              )}
            </Box>
          ) : summaryData && !fetchError ? (
            <MonitorEmpty message={`Aucun événement IA « problème » sur ${timeRange}. Essayez 7 j.`} />
          ) : !fetchError ? (
            <MonitorEmpty message="Aucune donnée IA sur cette période." />
          ) : null}
        </>
      )}

      {activeTab === 'calls' && (
        <>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}
          >
            <MonitorSelectFilter
              label="Service"
              value={service}
              onChange={setService}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'srv-fullchatbot', label: 'fullchatbot' },
                { value: 'srv-fulltask', label: 'fulltask' },
                { value: 'srv-reservations', label: 'reservations' },
                { value: 'srv-chatbot', label: 'chatbot (legacy)' },
                { value: 'srv-task', label: 'task (legacy)' },
              ]}
            />
            <MonitorSelectFilter
              label="Fournisseur"
              value={provider}
              onChange={setProvider}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'openai', label: 'OpenAI' },
                { value: 'claude', label: 'Claude' },
                { value: 'gemini', label: 'Gemini' },
                { value: 'rules', label: 'Rules' },
              ]}
            />
            <Box sx={{ width: 1, height: 16, bgcolor: t.border }} />
            <Box sx={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase' }}>
              Statut
            </Box>
            {STATUS_FILTERS.map((f) => (
              <FilterChip
                key={f.value}
                label={f.label}
                active={status === f.value}
                onClick={() => setStatus(f.value)}
              />
            ))}
          </Stack>

          {loading && callRows.length === 0 ? (
            <MonitorLoading label="Chargement des appels…" />
          ) : callRows.length === 0 ? (
            <MonitorEmpty message="Aucun appel problématique sur ces filtres." />
          ) : (
            <DataTable
              hideRowActions
              compact
              columns={[
                {
                  key: 'timestamp',
                  label: 'Date',
                  width: '120px',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 11, color: t.text2, whiteSpace: 'nowrap' }}>
                      {formatCasablancaDate(row.timestamp)}
                    </Typography>
                  ),
                },
                {
                  key: 'service',
                  label: 'Service',
                  render: (row: AiCall & { id: string }) => (
                    <Badge variant="neutral">{row.service || '—'}</Badge>
                  ),
                },
                {
                  key: 'model',
                  label: 'Modèle',
                  render: (row: AiCall & { id: string }) => (
                    <Badge variant={providerBadgeVariant(row.data?.llm_provider)}>
                      {formatModelDisplay(row.data?.llm_provider, row.data?.model)}
                    </Badge>
                  ),
                },
                {
                  key: 'tokens',
                  label: 'Tok',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 11, fontWeight: 600, fontFamily: 'Geist Mono, monospace' }}>
                      {row.data?.tokens_used?.toLocaleString('fr-FR') ?? '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'cost',
                  label: 'Coût',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: t.success, fontFamily: 'Geist Mono, monospace' }}>
                      {row.data?.cost_usd != null ? `$${row.data.cost_usd.toFixed(4)}` : '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'latency',
                  label: 'ms',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => {
                    const ms = row.data?.latency_ms ?? 0;
                    return (
                      <Typography
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          fontFamily: 'Geist Mono, monospace',
                          color: ms > 5000 ? t.error : t.text2,
                        }}
                      >
                        {ms || '—'}
                      </Typography>
                    );
                  },
                },
                {
                  key: 'message',
                  label: 'Message',
                  render: (row: AiCall & { id: string }) => (
                    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Badge variant={severityBadgeVariant(row.severity)} dot>
                        {(row.severity || 'info').toUpperCase()}
                      </Badge>
                      <Typography
                        sx={{
                          fontSize: 11,
                          color: t.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {row.data?.user_friendly_message ||
                          row.data?.error_message ||
                          (row.data?.fallback_to ? `Fallback → ${row.data.fallback_to}` : '—')}
                      </Typography>
                    </Stack>
                  ),
                },
              ]}
              rows={callRows}
              footer={
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    {callsData.total} appel(s)
                  </Typography>
                  <TablePagination
                    page={callsData.page}
                    totalPages={Math.max(1, callsData.totalPages)}
                    onChange={setPage}
                  />
                </Stack>
              }
            />
          )}
        </>
      )}

      {activeTab === 'errors' && (
        <>
          {loading && errorsData.length === 0 ? (
            <MonitorLoading />
          ) : (
            <MonitorSection dense title="Journal erreurs" desc={`${errorsData.length}`}>
              <MonitorErrorList
                dense
                items={errorsData}
                renderTitle={(e) =>
                  String(
                    e.data?.user_friendly_message ||
                      e.data?.error_message ||
                      `${e.data?.ai_status} — ${e.data?.llm_provider}`,
                  )
                }
                renderMeta={(e) => (
                  <>
                    {formatModelDisplay(e.data?.llm_provider, e.data?.model)}
                    {e.data?.tokens_used ? ` · ${e.data.tokens_used} tokens` : ''}
                    {e.data?.cost_usd != null ? ` · $${e.data.cost_usd.toFixed(4)}` : ''}
                    {e.data?.latency_ms ? ` · ${e.data.latency_ms} ms` : ''}
                    {' · '}
                    {formatCasablancaDate(e.timestamp)}
                  </>
                )}
              />
            </MonitorSection>
          )}
        </>
      )}
    </MonitorPageFrame>
  );
}
