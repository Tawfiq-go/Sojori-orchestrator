/**
 * Socket Health Monitoring — santé srv-sockets (auth, émission, RabbitMQ)
 * Logs intelligents : type de problème, PM (ownerId), résa, tel, thread.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
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

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="whatsapp"
        title="Sockets"
        subtitle="Problèmes temps réel srv-sockets — par PM, résa, thread, téléphone"
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
                  label="Problèmes"
                  trend={timeRange}
                />
                <StatCard
                  icon="🚫"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(summaryData.authRejected ?? 0)}
                  label="Auth refusée"
                />
                <StatCard
                  icon="⚠️"
                  iconBg={t.errorTint}
                  iconColor={t.error}
                  value={String(summaryData.emitCritical ?? 0)}
                  label="Non diffusé"
                />
                <StatCard
                  icon="📡"
                  iconBg={t.warningTint}
                  iconColor={t.warning}
                  value={String(summaryData.emitRoomFailed ?? 0)}
                  label="Échec room"
                />
                <StatCard
                  icon="🐰"
                  iconBg={t.aiTint}
                  iconColor={t.ai}
                  value={String(summaryData.rabbitmqDisconnects ?? 0)}
                  label="RabbitMQ"
                />
                <StatCard
                  icon="✅"
                  iconBg={t.successTint}
                  iconColor={t.success}
                  value={String(summaryData.emitOk ?? 0)}
                  label="Émissions OK"
                />
              </StatsRow>

              {byProblemType.length > 0 && (
                <MonitorSection title="Par type de problème" desc="Répartition sur la période">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {byProblemType
                      .filter((r) => r.problemType !== 'emit_ok')
                      .map((row) => (
                        <Badge key={row.problemType} variant="error">
                          {socketProblemLabel(row.problemType)} · {row.count}
                        </Badge>
                      ))}
                  </div>
                </MonitorSection>
              )}

              {recentErrors.length > 0 && (
                <MonitorSection title="Derniers problèmes" desc="30 plus récents">
                  <MonitorErrorList
                    items={recentErrors.slice(0, 10)}
                    renderTitle={(e) => socketLogTitle(e as SocketLogEntry)}
                    renderMeta={(item) => renderLogMeta(item as SocketLogEntry, ownerLabel)}
                  />
                </MonitorSection>
              )}

              {problemCount === 0 && (
                <MonitorEmpty message="Aucun problème socket sur cette période. Les émissions OK ne sont pas comptées comme incidents." />
              )}
            </>
          ) : (
            <MonitorEmpty message="Impossible de charger les stats socket (srv-event-store)." />
          )}
        </>
      )}

      {activeTab === 'byOwner' && (
        <>
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && byOwner.length === 0 ? (
            <MonitorLoading />
          ) : byOwner.length === 0 ? (
            <MonitorEmpty message="Aucun PM impacté par un problème socket sur cette période." />
          ) : (
            <MonitorSection
              title="PM impactés"
              desc="Property managers avec au moins un incident socket"
            >
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
                      Dernière
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 12, color: t.text3 }}>
                      Réservations
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byOwner.map((row) => (
                    <tr key={row.ownerId} style={{ borderBottom: `1px solid ${t.border}` }}>
                      <td style={{ padding: '8px 4px', fontSize: 13, fontWeight: 600, color: t.text }}>
                        {ownerLabel(row.ownerId)}
                        <div style={{ fontSize: 11, color: t.text3, fontWeight: 400 }}>{row.ownerId}</div>
                      </td>
                      <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                        <Badge variant="error">{row.count}</Badge>
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 11, color: t.text2 }}>
                        {(row.problemTypes || [])
                          .filter(Boolean)
                          .map((pt) => socketProblemLabel(String(pt)))
                          .join(', ') || '—'}
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 12, color: t.text2 }}>
                        {row.lastSeen ? formatCasablancaDate(row.lastSeen) : '—'}
                      </td>
                      <td style={{ padding: '8px 4px', fontSize: 12, color: t.text2 }}>
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
          <MonitorTimeRange ranges={TIME_RANGES} value={timeRange} onChange={setTimeRange} />
          {loading && recentErrors.length === 0 ? (
            <MonitorLoading />
          ) : recentErrors.length === 0 ? (
            <MonitorEmpty message="Aucun problème socket sur cette période." />
          ) : (
            <MonitorSection title="Journal des incidents" desc={`${recentErrors.length} entrée(s)`}>
              <MonitorErrorList
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
