/**
 * AI / LLM Monitoring — design Sojori V2 (MonitorDesign)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  Badge,
  DataTable,
  FilterChip,
  MonitorEmpty,
  MonitorError,
  MonitorErrorList,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  MonitorSelectFilter,
  MonitorSubTabs,
  MonitorTimeRange,
  MonitorToolbar,
  Panel,
  StatCard,
  StatsRow,
  TablePagination,
  monitorTokens as t,
  severityBadgeVariant,
} from '../../features/monitoring/shared/MonitorDesign';

type SubTab = 'summary' | 'calls' | 'errors';

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
  const [status, setStatus] = useState('all');
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

  const callRows = (callsData.calls || []).map((c, idx) => ({
    id: c._id || `call-${idx}`,
    ...c,
  }));

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="ai"
        title="Intelligence artificielle"
        subtitle="Appels problématiques uniquement (échec, timeout, fallback, latence &gt; 5 s) — Mongo unified_monitoring"
        count={timeRange}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        onRefresh={refresh}
        loading={loading}
      />

      <MonitorSubTabs options={SUB_TABS} value={activeTab} onChange={setActiveTab} />

      {fetchError ? <MonitorError message={fetchError} onRetry={refresh} /> : null}

      <Panel sx={{ mb: 2, py: 1.5, px: 2, bgcolor: t.aiTint, border: `1px solid ${t.border}` }}>
        <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.5 }}>
          Les services (srv-task, srv-chatbot, orchestrator) n&apos;écrivent dans{' '}
          <strong>unified_monitoring</strong> que les appels à problème — pas tous les appels OpenAI réussis.
          Pour voir des lignes : élargir la période (7 j) ou onglet Appels / Erreurs.
        </Typography>
      </Panel>

      {activeTab === 'summary' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData && hasSummaryEvents ? (
            <>
              <StatsRow>
                <StatCard
                  icon="🤖"
                  iconBg={t.aiTint}
                  iconColor={t.ai}
                  value={String(totalProblems)}
                  label="Problèmes"
                  trend={timeRange}
                />
                <StatCard
                  icon="❌"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(totalFailed)}
                  label="Appels en échec"
                />
                <StatCard
                  icon="↩️"
                  iconBg={t.warningTint}
                  iconColor={t.warning}
                  value={String(totalFallbacks)}
                  label="Fallbacks"
                />
                <StatCard
                  icon="🪙"
                  iconBg={t.primaryTint}
                  iconColor={t.primaryDeep}
                  value={totalTokens.toLocaleString('fr-FR')}
                  label="Tokens (période)"
                />
              </StatsRow>
              <StatsRow>
                <StatCard
                  icon="⏱"
                  iconBg={t.infoTint}
                  iconColor={t.info}
                  value={avgLatency ? `${avgLatency} ms` : '—'}
                  label="Latence moyenne"
                />
                <StatCard
                  icon="💵"
                  iconBg={t.successTint}
                  iconColor={t.success}
                  value={totalCost > 0 ? `$${totalCost.toFixed(3)}` : '—'}
                  label="Coût estimé"
                />
              </StatsRow>

              {(summaryData.byProvider?.length ?? 0) > 0 && (
                <MonitorSection title="Par fournisseur" desc="Cliquer pour filtrer les appels">
                  <Stack direction="row" flexWrap="wrap" gap={1}>
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

              {(summaryData.recentErrors?.length ?? 0) > 0 && (
                <MonitorSection title="Erreurs récentes">
                  <Stack spacing={1.25}>
                    {summaryData.recentErrors!.slice(0, 8).map((e, idx) => (
                      <Box
                        key={e._id || idx}
                        sx={{
                          p: 1.75,
                          borderRadius: '10px',
                          border: `1px solid ${t.border}`,
                          bgcolor: t.errorTint,
                        }}
                      >
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.text }}>
                          {e.error || `${e.status} — ${e.provider}`}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.5 }}>
                          {formatModelDisplay(e.provider, e.model)}
                          {e.latency != null ? ` · ${e.latency} ms` : ''}
                          {' · '}
                          {e.service || '—'}
                          {' · '}
                          {formatCasablancaDate(e.timestamp)}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </MonitorSection>
              )}
            </>
          ) : summaryData && !fetchError ? (
            <MonitorEmpty message={`Aucun événement IA « problème » sur ${timeRange}. Essayez 7 j ou vérifiez que srv-task/chatbot ont LOGS_PROXY_MONGODB_URI.`} />
          ) : !fetchError ? (
            <MonitorEmpty message="Aucune donnée IA sur cette période." />
          ) : null}
        </>
      )}

      {activeTab === 'calls' && (
        <>
          <MonitorToolbar>
            <MonitorSelectFilter
              label="Service"
              value={service}
              onChange={setService}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'srv-chatbot', label: 'srv-chatbot' },
                { value: 'srv-task', label: 'srv-task' },
                { value: 'srv-orchestrator', label: 'srv-orchestrator' },
                { value: 'srv-reservations', label: 'srv-reservations' },
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
            <MonitorSelectFilter
              label="Statut"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'all', label: 'Tous' },
                { value: 'failed', label: 'Échec' },
                { value: 'timeout', label: 'Timeout' },
                { value: 'fallback', label: 'Fallback' },
                { value: 'success', label: 'Lent (OK)' },
              ]}
            />
          </MonitorToolbar>

          {loading && callRows.length === 0 ? (
            <MonitorLoading label="Chargement des appels…" />
          ) : callRows.length === 0 ? (
            <MonitorEmpty message="Aucun appel problématique sur ces filtres." />
          ) : (
            <DataTable
              hideRowActions
              columns={[
                {
                  key: 'timestamp',
                  label: 'Date',
                  width: '130px',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 12, color: t.text2 }}>
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
                  label: 'Tokens',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                      {row.data?.tokens_used?.toLocaleString('fr-FR') ?? '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'cost',
                  label: 'Coût',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => (
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.success }}>
                      {row.data?.cost_usd != null ? `$${row.data.cost_usd.toFixed(4)}` : '—'}
                    </Typography>
                  ),
                },
                {
                  key: 'latency',
                  label: 'Latence',
                  align: 'right',
                  render: (row: AiCall & { id: string }) => {
                    const ms = row.data?.latency_ms ?? 0;
                    return (
                      <Typography
                        sx={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: ms > 5000 ? t.error : t.text2,
                        }}
                      >
                        {ms ? `${ms} ms` : '—'}
                      </Typography>
                    );
                  },
                },
                {
                  key: 'message',
                  label: 'Message',
                  render: (row: AiCall & { id: string }) => (
                    <Stack direction="row" spacing={0.75} alignItems="flex-start">
                      <Badge variant={severityBadgeVariant(row.severity)} dot>
                        {(row.severity || 'info').toUpperCase()}
                      </Badge>
                      <Typography sx={{ fontSize: 12, color: t.text, flex: 1 }}>
                        {row.data?.user_friendly_message ||
                          row.data?.error_message ||
                          (row.data?.fallback_to
                            ? `Fallback → ${row.data.fallback_to}`
                            : '—')}
                      </Typography>
                    </Stack>
                  ),
                },
              ]}
              rows={callRows}
              footer={
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <Typography sx={{ fontSize: 12, color: t.text3 }}>
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
            <MonitorSection title="Journal d'erreurs IA">
              <MonitorErrorList
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
