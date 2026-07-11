/**
 * API Health Monitoring — appels HTTP lents / 4xx / 5xx indexés par les microservices.
 * Layout dense : KPIs + toolbar sur une ligne, filtres type/classe, contenu en colonnes.
 */

import { useState, useEffect, useCallback, useMemo, type ReactNode, type CSSProperties } from 'react';
import { Box, Button, Stack } from '@mui/material';
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
  FilterChip,
  MonitorEmpty,
  MonitorErrorList,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageFrame,
  MonitorSection,
  MonitorSubTabs,
  MonitorTimeRange,
  MonitorToolbarRow,
  btnGhostSx,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

type SubTab = 'summary' | 'byOwner' | 'byRoute' | 'errors';
type ProblemFilter = 'all' | 'api_slow' | 'api_error' | 'api_client_error';
type FailureFilter = 'all' | 'persistent' | 'transient';

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

const PROBLEM_FILTERS: { value: ProblemFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'api_slow', label: 'Lents' },
  { value: 'api_error', label: '5xx' },
  { value: 'api_client_error', label: '4xx' },
];

const FAILURE_FILTERS: { value: FailureFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'persistent', label: 'Permanent' },
  { value: 'transient', label: 'Temporaire' },
];

const th: CSSProperties = {
  textAlign: 'left',
  padding: '4px 6px',
  fontSize: 11,
  color: t.text3,
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const td: CSSProperties = {
  padding: '5px 6px',
  fontSize: 12,
  color: t.text,
  verticalAlign: 'top',
};

function matchesProblem(entry: ApiLogEntry, filter: ProblemFilter): boolean {
  if (filter === 'all') return true;
  return entry.problemType === filter;
}

function matchesFailure(entry: ApiLogEntry, filter: FailureFilter): boolean {
  if (filter === 'all') return true;
  return entry.failureClass === filter;
}

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

function ProblemFiltersBar({
  problemFilter,
  failureFilter,
  onProblemChange,
  onFailureChange,
}: {
  problemFilter: ProblemFilter;
  failureFilter: FailureFilter;
  onProblemChange: (v: ProblemFilter) => void;
  onFailureChange: (v: FailureFilter) => void;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 1 }}
    >
      <Box sx={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Type
      </Box>
      {PROBLEM_FILTERS.map((f) => (
        <FilterChip
          key={f.value}
          label={f.label}
          active={problemFilter === f.value}
          onClick={() => onProblemChange(f.value)}
        />
      ))}
      <Box sx={{ width: 1, height: 16, bgcolor: t.border, mx: 0.25 }} />
      <Box sx={{ fontSize: 10, fontWeight: 700, color: t.text3, textTransform: 'uppercase', letterSpacing: 0.4 }}>
        Classe
      </Box>
      {FAILURE_FILTERS.map((f) => (
        <FilterChip
          key={f.value}
          label={f.label}
          active={failureFilter === f.value}
          onClick={() => onFailureChange(f.value)}
        />
      ))}
    </Stack>
  );
}

export default function APIMonitoringPage() {
  const [activeTab, setActiveTab] = useState<SubTab>('summary');
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(true);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [problemFilter, setProblemFilter] = useState<ProblemFilter>('all');
  const [failureFilter, setFailureFilter] = useState<FailureFilter>('all');

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

  const filteredRecent = useMemo(
    () =>
      recentErrors.filter(
        (e) => matchesProblem(e, problemFilter) && matchesFailure(e, failureFilter),
      ),
    [recentErrors, problemFilter, failureFilter],
  );

  const filteredRoutes = useMemo(() => {
    if (problemFilter === 'all') return byRoute;
    return byRoute.filter((row) => (row.problemTypes || []).includes(problemFilter));
  }, [byRoute, problemFilter]);

  const filteredOwners = useMemo(() => {
    if (problemFilter === 'all') return byOwner;
    return byOwner.filter((row) => (row.problemTypes || []).includes(problemFilter));
  }, [byOwner, problemFilter]);

  const setProblemFromKpi = (next: ProblemFilter) => {
    setProblemFilter((prev) => (prev === next ? 'all' : next));
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
            <Button sx={btnGhostSx} onClick={() => void fetchSummary()} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      {summaryData || !loading ? (
        <MonitorKpiStrip
          items={[
            {
              label: 'Problèmes',
              value: problemCount,
              tone: problemCount > 0 ? 'error' : 'success',
              active: problemFilter === 'all' && failureFilter === 'all',
              onClick: () => {
                setProblemFilter('all');
                setFailureFilter('all');
              },
            },
            {
              label: 'Lents >2s',
              value: summaryData?.apiSlow ?? 0,
              tone: 'warning',
              active: problemFilter === 'api_slow',
              onClick: () => setProblemFromKpi('api_slow'),
            },
            {
              label: '5xx',
              value: summaryData?.apiError ?? 0,
              tone: 'error',
              active: problemFilter === 'api_error',
              onClick: () => setProblemFromKpi('api_error'),
            },
            {
              label: '4xx',
              value: summaryData?.apiClientError ?? 0,
              tone: 'warning',
              active: problemFilter === 'api_client_error',
              onClick: () => setProblemFromKpi('api_client_error'),
            },
          ]}
        />
      ) : null}

      <ProblemFiltersBar
        problemFilter={problemFilter}
        failureFilter={failureFilter}
        onProblemChange={setProblemFilter}
        onFailureChange={setFailureFilter}
      />

      {activeTab === 'summary' && (
        <>
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              {problemCount === 0 ? (
                <MonitorEmpty message="Aucun appel API lent ou en erreur sur cette période (>2s ou HTTP ≥400)." />
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.4fr)' },
                    gap: 1.25,
                    mb: 1.25,
                    alignItems: 'start',
                  }}
                >
                  <Stack spacing={1.25}>
                    {byProblemType.length > 0 && (
                      <MonitorSection dense title="Par type">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {byProblemType.map((row) => (
                            <Box
                              key={row.problemType}
                              component="button"
                              type="button"
                              onClick={() =>
                                setProblemFilter(
                                  row.problemType === problemFilter
                                    ? 'all'
                                    : (row.problemType as ProblemFilter),
                                )
                              }
                              sx={{
                                border: 'none',
                                bgcolor: 'transparent',
                                p: 0,
                                cursor: 'pointer',
                                opacity: problemFilter === 'all' || problemFilter === row.problemType ? 1 : 0.45,
                              }}
                            >
                              <Badge variant="error">
                                {apiProblemLabel(row.problemType)} · {row.count}
                              </Badge>
                            </Box>
                          ))}
                        </Box>
                      </MonitorSection>
                    )}

                    {filteredRoutes.length > 0 && (
                      <MonitorSection dense title="Top routes" desc={`${Math.min(filteredRoutes.length, 8)}`}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                              <th style={th}>Route</th>
                              <th style={{ ...th, textAlign: 'right' }}>n</th>
                              <th style={{ ...th, textAlign: 'right' }}>max</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredRoutes.slice(0, 8).map((row) => (
                              <tr
                                key={`${row.service}-${row.httpMethod}-${row.httpPath}`}
                                style={{ borderBottom: `1px solid ${t.border}` }}
                              >
                                <td style={td}>
                                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 320 }}>
                                    {row.httpMethod} {row.httpPath}
                                  </div>
                                  <div style={{ fontSize: 10, color: t.text3 }}>{row.service}</div>
                                </td>
                                <td style={{ ...td, textAlign: 'right' }}>
                                  <Badge variant="error">{row.count}</Badge>
                                </td>
                                <td style={{ ...td, textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
                                  {row.maxMs != null ? `${row.maxMs}ms` : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </MonitorSection>
                    )}
                  </Stack>

                  <MonitorSection
                    dense
                    title="Derniers appels"
                    desc={`${Math.min(filteredRecent.length, 12)}${filteredRecent.length !== recentErrors.length ? ` / ${recentErrors.length}` : ''}`}
                  >
                    {filteredRecent.length === 0 ? (
                      <MonitorEmpty message="Aucun appel pour ce filtre (lents / 5xx / 4xx · permanent / temporaire)." />
                    ) : (
                      <MonitorErrorList
                        dense
                        items={filteredRecent.slice(0, 12)}
                        renderTitle={(e) => apiLogTitle(e as ApiLogEntry)}
                        renderMeta={(item) => renderLogMeta(item as ApiLogEntry, ownerLabel)}
                      />
                    )}
                  </MonitorSection>
                </Box>
              )}
            </>
          ) : (
            <MonitorEmpty message="Impossible de charger les stats API (srv-event-store)." />
          )}
        </>
      )}

      {activeTab === 'byOwner' && (
        <>
          {loading && byOwner.length === 0 ? (
            <MonitorLoading />
          ) : filteredOwners.length === 0 ? (
            <MonitorEmpty message="Aucun PM impacté pour ce filtre." />
          ) : (
            <MonitorSection dense title="PM impactés" desc={`${filteredOwners.length}`}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={th}>Property manager</th>
                    <th style={{ ...th, textAlign: 'right' }}>Incidents</th>
                    <th style={th}>Types</th>
                    <th style={th}>Routes</th>
                    <th style={th}>Dernière</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map((row) => (
                    <tr key={row.ownerId} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ ...td, fontWeight: 600 }}>{ownerLabel(row.ownerId)}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2 }}>
                        {(row.problemTypes || []).map((pt) => apiProblemLabel(String(pt))).join(', ') || '—'}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2, maxWidth: 360 }}>
                        {(row.routes || []).slice(0, 3).join(', ') || '—'}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2, whiteSpace: 'nowrap' }}>
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
          {loading && byRoute.length === 0 ? (
            <MonitorLoading />
          ) : filteredRoutes.length === 0 ? (
            <MonitorEmpty message="Aucune route pour ce filtre." />
          ) : (
            <MonitorSection dense title="Routes impactées" desc={`${filteredRoutes.length}`}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={th}>Route</th>
                    <th style={th}>Service</th>
                    <th style={{ ...th, textAlign: 'right' }}>Count</th>
                    <th style={{ ...th, textAlign: 'right' }}>Avg</th>
                    <th style={{ ...th, textAlign: 'right' }}>Max</th>
                    <th style={th}>Types</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRoutes.map((row) => (
                    <tr
                      key={`${row.service}-${row.httpMethod}-${row.httpPath}`}
                      style={{ borderBottom: `1px solid ${t.border}` }}
                    >
                      <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {row.httpMethod} {row.httpPath}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text3 }}>{row.service}</td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
                        {row.avgMs ?? '—'}
                      </td>
                      <td style={{ ...td, textAlign: 'right', fontFamily: 'Geist Mono, monospace', fontSize: 11 }}>
                        {row.maxMs ?? '—'}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2 }}>
                        {(row.problemTypes || []).map((pt) => apiProblemLabel(String(pt))).join(', ') || '—'}
                      </td>
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
          {loading && recentErrors.length === 0 ? (
            <MonitorLoading />
          ) : filteredRecent.length === 0 ? (
            <MonitorEmpty message="Aucun appel pour ce filtre." />
          ) : (
            <MonitorSection
              dense
              title="Journal"
              desc={`${filteredRecent.length}${filteredRecent.length !== recentErrors.length ? ` / ${recentErrors.length}` : ''}`}
            >
              <MonitorErrorList
                dense
                items={filteredRecent}
                renderTitle={(e) => apiLogTitle(e as ApiLogEntry)}
                renderMeta={(item) => {
                  const e = item as ApiLogEntry;
                  return (
                    <>
                      {renderLogMeta(e, ownerLabel)}
                      {e.httpUrl ? (
                        <div style={{ fontSize: 10, color: t.text3, marginTop: 2, wordBreak: 'break-all' }}>
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
