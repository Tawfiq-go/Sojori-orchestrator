/**
 * API Health Monitoring — appels HTTP lents / 4xx / 5xx indexés par les microservices.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient from '../../services/apiClient';
import { getOwnersAllPages } from '../../services/teamDashboardApi';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  apiLogContextLine,
  apiLogTitle,
  apiProblemLabel,
  failureClassLabel,
  type ApiLogEntry,
} from '../../features/monitoring/api/apiLogFormat';
import {
  Badge,
  MonitorEmpty,
  MonitorErrorList,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  MonitorSubTabs,
  MonitorTimeRange,
  StatCard,
  StatsRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

type SubTab = 'summary' | 'byOwner' | 'byRoute' | 'errors';

interface OwnerImpact {
  ownerId: string;
  count: number;
  lastSeen?: string;
  routes?: string[];
  problemTypes?: string[];
  avgMs?: number;
}

interface RouteImpact {
  service?: string;
  httpMethod?: string;
  httpPath?: string;
  count: number;
  lastSeen?: string;
  avgMs?: number;
  maxMs?: number;
  problemTypes?: string[];
}

interface ProblemTypeRow {
  problemType: string;
  count: number;
  lastSeen?: string;
}

interface SummaryData {
  total?: number;
  apiSlow?: number;
  apiError?: number;
  apiClientError?: number;
  byOwner?: OwnerImpact[];
  byRoute?: RouteImpact[];
  byProblemType?: ProblemTypeRow[];
  recentErrors?: ApiLogEntry[];
}

interface OwnerOption {
  _id: string;
  firstName?: string;
  lastName?: string;
}

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'summary', label: 'Synthèse' },
  { value: 'byOwner', label: 'Par PM' },
  { value: 'byRoute', label: 'Routes' },
  { value: 'errors', label: 'Journal' },
];

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
];

function renderLogMeta(e: ApiLogEntry, ownerLabel: (id: string) => string): ReactNode {
  const ctx = apiLogContextLine(e);
  return (
    <>
      <Badge variant={e.failureClass === 'persistent' ? 'error' : 'gold'}>
        {apiProblemLabel(e.problemType)} · {failureClassLabel(e.failureClass)}
      </Badge>
      {e.ownerId ? ` · PM ${ownerLabel(e.ownerId)}` : ''}
      {ctx ? ` · ${ctx}` : ''}
      {' · '}
      {formatCasablancaDate(e.timestamp ?? new Date())}
    </>
  );
}

export default function APIMonitoringPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [owners, setOwners] = useState<OwnerOption[]>([]);

  useEffect(() => {
    getOwnersAllPages({ search_text: '' })
      .then((rows) => setOwners(Array.isArray(rows) ? (rows as OwnerOption[]) : []))
      .catch(() => setOwners([]));
  }, []);

  const ownerLabel = useCallback(
    (ownerId: string) => {
      const owner = owners.find((o) => o._id === ownerId);
      if (!owner) return ownerId.slice(-6);
      const name = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim();
      return name || ownerId.slice(-6);
    },
    [owners],
  );

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/monitoring/api/stats', {
        params: { timeRange },
      });
      setSummaryData(response.data.data);
    } catch (err) {
      console.warn('[APIMonitoring] fetchSummary failed', err);
      setSummaryData(null);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    void fetchSummary();
    if (!live) return;
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, [fetchSummary, live]);

  const recentErrors = summaryData?.recentErrors ?? [];
  const byOwner = summaryData?.byOwner ?? [];
  const byRoute = summaryData?.byRoute ?? [];
  const byProblemType = summaryData?.byProblemType ?? [];
  const problemCount = summaryData?.total ?? 0;

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="whatsapp"
        title="API"
        subtitle="Appels HTTP lents ou en erreur — URL exacte, PM, temporaire vs permanent"
        count={timeRange}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        onRefresh={() => void fetchSummary()}
        loading={loading}
      />

      <MonitorSubTabs options={SUB_TABS} value={activeTab} onChange={setActiveTab} />

      {activeTab === 'summary' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              <StatsRow>
                <StatCard
                  icon="🚨"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(problemCount)}
                  label="Problèmes API"
                  trend={timeRange}
                />
                <StatCard
                  icon="🐢"
                  iconBg={t.warningTint}
                  iconColor={t.warning}
                  value={String(summaryData.apiSlow ?? 0)}
                  label="Lents (>2s)"
                />
                <StatCard
                  icon="💥"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(summaryData.apiError ?? 0)}
                  label="Erreurs 5xx"
                />
                <StatCard
                  icon="⚠️"
                  iconBg={t.warningTint}
                  iconColor={t.warning}
                  value={String(summaryData.apiClientError ?? 0)}
                  label="Erreurs 4xx"
                />
              </StatsRow>

              {byProblemType.length > 0 && (
                <MonitorSection title="Par type" desc="Répartition sur la période">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {byProblemType.map((row) => (
                      <Badge key={row.problemType} variant="error">
                        {apiProblemLabel(row.problemType)} · {row.count}
                      </Badge>
                    ))}
                  </div>
                </MonitorSection>
              )}

              {byRoute.length > 0 && (
                <MonitorSection title="Top routes lentes" desc="5 routes les plus impactées">
                  <MonitorErrorList
                    items={byRoute.slice(0, 5).map((row) => ({
                      httpMethod: row.httpMethod,
                      httpPath: row.httpPath,
                      service: row.service,
                      durationMs: row.maxMs,
                      problemType: row.problemTypes?.[0],
                      message: `${row.count} incidents · avg ${row.avgMs ?? '—'}ms`,
                    }))}
                    renderTitle={(e) => apiLogTitle(e as ApiLogEntry)}
                    renderMeta={(item) => {
                      const e = item as ApiLogEntry;
                      return (
                        <>
                          <Badge variant="error">{e.service}</Badge>
                          {' · '}
                          {e.message}
                        </>
                      );
                    }}
                  />
                </MonitorSection>
              )}

              {recentErrors.length > 0 && (
                <MonitorSection title="Derniers appels problématiques" desc="10 plus récents">
                  <MonitorErrorList
                    items={recentErrors.slice(0, 10)}
                    renderTitle={(e) => apiLogTitle(e as ApiLogEntry)}
                    renderMeta={(item) => renderLogMeta(item as ApiLogEntry, ownerLabel)}
                  />
                </MonitorSection>
              )}

              {problemCount === 0 && (
                <MonitorEmpty message="Aucun appel API lent ou en erreur sur cette période (>2s ou HTTP ≥400)." />
              )}
            </>
          ) : (
            <MonitorEmpty message="Impossible de charger les stats API (srv-event-store)." />
          )}
        </>
      )}

      {activeTab === 'byOwner' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && byOwner.length === 0 ? (
            <MonitorLoading />
          ) : byOwner.length === 0 ? (
            <MonitorEmpty message="Aucun PM impacté par un problème API sur cette période." />
          ) : (
            <MonitorSection title="PM impactés" desc="Owners avec appels lents ou en erreur">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Property manager
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Incidents
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Types
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Routes
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Dernière
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byOwner.map((row) => (
                    <tr key={row.ownerId} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '8px 4px', fontSize: 13, fontWeight: 600, color: t.text }}>
                        {ownerLabel(row.ownerId)}
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 11, color: t.text2 }}>
                        {(row.problemTypes || []).map((pt) => apiProblemLabel(String(pt))).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 11, color: t.text2, maxWidth: 280 }}>
                        {(row.routes || []).slice(0, 2).join(', ') || '—'}
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 12, color: t.text2 }}>
                        {row.lastSeen ? formatCasablancaDate(row.lastSeen) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MonitorSection>
          )}
        </>
      )}

      {activeTab === 'byRoute' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && byRoute.length === 0 ? (
            <MonitorLoading />
          ) : byRoute.length === 0 ? (
            <MonitorEmpty message="Aucune route API problématique sur cette période." />
          ) : (
            <MonitorSection title="Routes impactées" desc="Service · méthode · chemin · latence">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Route
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Count
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Avg ms
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Max ms
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byRoute.map((row) => (
                    <tr
                      key={`${row.service}-${row.httpMethod}-${row.httpPath}`}
                      style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                      <td style={{ padding: '8px 4px', fontSize: 12, color: t.text }}>
                        <div style={{ fontWeight: 600 }}>
                          {row.httpMethod} {row.httpPath}
                        </div>
                        <div style={{ fontSize: 11, color: t.text3 }}>{row.service}</div>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontSize: 12 }}>{row.avgMs ?? '—'}</td>
                      <td style={{ padding: '8px 4px', textAlign: 'right', fontSize: 12 }}>{row.maxMs ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </MonitorSection>
          )}
        </>
      )}

      {activeTab === 'errors' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && recentErrors.length === 0 ? (
            <MonitorLoading />
          ) : recentErrors.length === 0 ? (
            <MonitorEmpty message="Aucun appel API problématique sur cette période." />
          ) : (
            <MonitorSection title="Journal complet" desc="URL exacte, durée, status, classification">
              <MonitorErrorList
                items={recentErrors}
                renderTitle={(e) => apiLogTitle(e as ApiLogEntry)}
                renderMeta={(item) => {
                  const e = item as ApiLogEntry;
                  return (
                    <>
                      {renderLogMeta(e, ownerLabel)}
                      {e.httpUrl ? (
                        <div style={{ fontSize: 11, color: t.text3, marginTop: 4, wordBreak: 'break-all' }}>
                          {e.httpUrl}
                        </div>
                      ) : null}
                    </>
                  );
                }}
              />
            </MonitorSection>
          )}
        </>
      )}
    </MonitorPageFrame>
  );
}
