/**
 * Socket Health Monitoring — layout dense (même pattern que l’onglet API).
 * Logs intelligents : type de problème, PM (ownerId), résa, tel, thread.
 */

import { useState, useEffect, useCallback, type ReactNode, type CSSProperties } from 'react';
import { Box, Button, Stack } from '@mui/material';
import apiClient from '../../services/apiClient';
import { getOwnersAllPages } from '../../services/teamDashboardApi';
import { formatCasablancaDate } from '../../utils/dateFormatting.js';
import {
  socketLogContextLine,
  socketLogTitle,
  socketProblemLabel,
  type SocketLogEntry,
} from '../../features/monitoring/socket/socketLogFormat';
import {
  Badge,
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

type SubTab = 'summary' | 'byOwner' | 'errors';

interface OwnerImpact {
  ownerId: string;
  count: number;
  lastSeen?: string;
  reservationNumbers?: string[];
  problemTypes?: string[];
}

interface ProblemTypeRow {
  problemType: string;
  count: number;
  lastSeen?: string;
}

interface SummaryData {
  total?: number;
  totalAll?: number;
  emitOk?: number;
  authRejected?: number;
  emitCritical?: number;
  emitRoomFailed?: number;
  rabbitmqDisconnects?: number;
  byOwner?: OwnerImpact[];
  byProblemType?: ProblemTypeRow[];
  recentErrors?: SocketLogEntry[];
}

interface OwnerOption {
  _id: string;
  firstName?: string;
  lastName?: string;
}

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'summary', label: 'Synthèse' },
  { value: 'byOwner', label: 'Par PM' },
  { value: 'errors', label: 'Journal' },
];

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
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

function renderLogMeta(
  e: SocketLogEntry,
  ownerLabel: (id: string) => string,
): ReactNode {
  const ctx = socketLogContextLine(e);
  return (
    <>
      <Badge variant={e.severity === 'critical' ? 'error' : 'gold'}>
        {e.problemType ? socketProblemLabel(e.problemType) : e.severity || 'info'}
      </Badge>
      {e.ownerId ? ` · PM ${ownerLabel(e.ownerId)}` : ''}
      {ctx ? ` · ${ctx}` : ''}
      {' · '}
      {formatCasablancaDate(e.timestamp ?? new Date())}
    </>
  );
}

export default function SocketMonitoringPage() {
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
      const response = await apiClient.get('/api/monitoring/sockets/stats', {
        params: { timeRange },
      });
      setSummaryData(response.data.data);
    } catch (err) {
      console.warn('[SocketMonitoring] fetchSummary failed', err);
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
  const byProblemType = summaryData?.byProblemType ?? [];
  const problemCount = summaryData?.total ?? 0;
  const problemTypesFiltered = byProblemType.filter((r) => r.problemType !== 'emit_ok');

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
            },
            {
              label: 'Auth refusée',
              value: summaryData?.authRejected ?? 0,
              tone: 'error',
            },
            {
              label: 'Non diffusé',
              value: summaryData?.emitCritical ?? 0,
              tone: 'error',
            },
            {
              label: 'Échec room',
              value: summaryData?.emitRoomFailed ?? 0,
              tone: 'warning',
            },
            {
              label: 'RabbitMQ',
              value: summaryData?.rabbitmqDisconnects ?? 0,
              tone: 'info',
            },
            {
              label: 'Émissions OK',
              value: summaryData?.emitOk ?? 0,
              tone: 'success',
            },
          ]}
        />
      ) : null}

      {activeTab === 'summary' && (
        <>
          {loading && !summaryData ? (
            <MonitorLoading />
          ) : summaryData ? (
            <>
              {problemCount === 0 ? (
                <MonitorEmpty message="Aucun problème socket sur cette période. Les émissions OK ne sont pas comptées comme incidents." />
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
                    {problemTypesFiltered.length > 0 && (
                      <MonitorSection dense title="Par type">
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                          {problemTypesFiltered.map((row) => (
                            <Badge key={row.problemType} variant="error">
                              {socketProblemLabel(row.problemType)} · {row.count}
                            </Badge>
                          ))}
                        </Box>
                      </MonitorSection>
                    )}
                  </Stack>

                  <MonitorSection
                    dense
                    title="Derniers problèmes"
                    desc={`${Math.min(recentErrors.length, 12)}`}
                  >
                    {recentErrors.length === 0 ? (
                      <MonitorEmpty message="Aucun incident récent." />
                    ) : (
                      <MonitorErrorList
                        dense
                        items={recentErrors.slice(0, 12)}
                        renderTitle={(e) => socketLogTitle(e as SocketLogEntry)}
                        renderMeta={(item) => renderLogMeta(item as SocketLogEntry, ownerLabel)}
                      />
                    )}
                  </MonitorSection>
                </Box>
              )}
            </>
          ) : (
            <MonitorEmpty message="Impossible de charger les stats socket (srv-event-store)." />
          )}
        </>
      )}

      {activeTab === 'byOwner' && (
        <>
          {loading && byOwner.length === 0 ? (
            <MonitorLoading />
          ) : byOwner.length === 0 ? (
            <MonitorEmpty message="Aucun PM impacté par un problème socket sur cette période." />
          ) : (
            <MonitorSection dense title="PM impactés" desc={`${byOwner.length}`}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${t.border}` }}>
                    <th style={th}>Property manager</th>
                    <th style={{ ...th, textAlign: 'right' }}>Incidents</th>
                    <th style={th}>Types</th>
                    <th style={th}>Dernière</th>
                    <th style={th}>Réservations</th>
                  </tr>
                </thead>
                <tbody>
                  {byOwner.map((row) => (
                    <tr key={row.ownerId} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {ownerLabel(row.ownerId)}
                        <div style={{ fontSize: 10, color: t.text3, fontWeight: 400 }}>{row.ownerId}</div>
                      </td>
                      <td style={{ ...td, textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2 }}>
                        {(row.problemTypes || [])
                          .filter(Boolean)
                          .map((pt) => socketProblemLabel(String(pt)))
                          .join(', ') || '—'}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2, whiteSpace: 'nowrap' }}>
                        {row.lastSeen ? formatCasablancaDate(row.lastSeen) : '—'}
                      </td>
                      <td style={{ ...td, fontSize: 11, color: t.text2 }}>
                        {(row.reservationNumbers || []).slice(0, 3).join(', ') || '—'}
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
          ) : recentErrors.length === 0 ? (
            <MonitorEmpty message="Aucun problème socket sur cette période." />
          ) : (
            <MonitorSection dense title="Journal" desc={`${recentErrors.length}`}>
              <MonitorErrorList
                dense
                items={recentErrors}
                renderTitle={(e) => socketLogTitle(e as SocketLogEntry)}
                renderMeta={(item) => renderLogMeta(item as SocketLogEntry, ownerLabel)}
              />
            </MonitorSection>
          )}
        </>
      )}
    </MonitorPageFrame>
  );
}
