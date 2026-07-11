import React, { useState, useEffect, useMemo } from 'react';
import {
  RefreshCw,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Activity,
  Trash2,
  RotateCcw,
  Eye,
  X
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import { getAdminRabbitmqDlqApiBase, RABBITMQ_HEALTH_PATH } from '../../utils/monitoringApi';
import DLQManagerModal from './DLQManagerModal';
import {
  Badge,
  btnGhostSx,
  MonitorKpiStrip,
  MonitorPageFrame,
  MonitorToolbarRow,
  monitorTokens as mt,
} from '../../features/monitoring/shared/MonitorDesign';
import { Button } from '@mui/material';

// Type definitions
interface QueueData {
  name: string;
  messages: number;
  consumers: number;
  status: 'healthy' | 'warning' | 'error';
  statusReason?: string;
  publishActive: boolean;
  idle_since?: string;
  firstMessageTimestamp?: string;
  service?: string;
}

interface ClusterInfo {
  status: 'healthy' | 'warning' | 'error';
  statusMessage: string;
  runningNodes: number;
  totalPods: number;
}

interface ConnectionsInfo {
  total: number;
  byService: Record<string, number>;
}

interface HealthData {
  queues: QueueData[];
  cluster: ClusterInfo;
  memory?: string;
  connections: ConnectionsInfo;
  alarms?: string[];
}

interface InspectedMessage {
  queueName: string;
  content: any;
  headers: Record<string, any>;
  properties: Record<string, any>;
}

function timeAgo(dateString: string | undefined): string | null {
  if (!dateString) return null;
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${diffDays}j`;
}

function queueNeedsAttention(q: QueueData): boolean {
  const msgs = q.messages ?? 0;
  const cons = q.consumers ?? 0;
  if (q.status === 'error' || q.status === 'warning') return true;
  if (msgs > 0 && cons === 0) return true;
  return false;
}

function rowDisplayStatus(q: QueueData): 'healthy' | 'warning' | 'error' {
  const msgs = q.messages ?? 0;
  const cons = q.consumers ?? 0;
  if (q.status === 'error' && msgs > 0 && cons === 0) return 'error';
  if (q.status === 'error') return 'warning';
  return q.status || 'healthy';
}

export default function RabbitMQPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showDLQModal, setShowDLQModal] = useState(false);
  const [dlqRetrying, setDlqRetrying] = useState<string | null>(null);
  const [inspectedMessage, setInspectedMessage] = useState<InspectedMessage | null>(null);
  const [inspectingQueue, setInspectingQueue] = useState<string | null>(null);

  const inspectDLQMessage = async (queueName: string) => {
    if (!queueName?.endsWith?.('.dlq')) return;
    try {
      setInspectingQueue(queueName);
      const base = getAdminRabbitmqDlqApiBase();
      const { data } = await apiClient.get(`${base}/${encodeURIComponent(queueName)}/messages?limit=1`);
      if (data.success && data.data.messages && data.data.messages.length > 0) {
        const msg = data.data.messages[0];
        let content: any = {};
        try {
          content = JSON.parse(msg.content);
        } catch (e) {
          content = { raw: msg.content };
        }
        setInspectedMessage({
          queueName,
          content,
          headers: msg.properties?.headers || {},
          properties: msg.properties || {}
        });
      } else {
        window.alert('Aucun message trouvé dans cette DLQ');
      }
    } catch (err: any) {
      window.alert(err.response?.data?.message || err.message || 'Erreur lors de la récupération du message');
    } finally {
      setInspectingQueue(null);
    }
  };

  const retryDlqFromRow = async (queueName: string) => {
    if (!queueName?.endsWith?.('.dlq')) return;
    if (!window.confirm(`Rejouer tous les messages de la DLQ « ${queueName} » vers la queue d'origine ?`)) {
      return;
    }
    try {
      setDlqRetrying(queueName);
      const base = getAdminRabbitmqDlqApiBase();
      const { data } = await apiClient.post(`${base}/${encodeURIComponent(queueName)}/retry`, { all: true });
      if (data.success) {
        window.alert(`Rejeu OK : ${data.data.retriedCount} message(s) → ${data.data.originalQueue}`);
        await fetchHealth();
      } else {
        window.alert(data.error || 'Échec du rejeu');
      }
    } catch (err: any) {
      window.alert(err.response?.data?.message || err.message || 'Erreur réseau');
    } finally {
      setDlqRetrying(null);
    }
  };

  // Filters - checkbox-based multi-select
  const [filterService, setFilterService] = useState<string>('all');
  const [filterConsumers, setFilterConsumers] = useState<string[]>(['zero', 'active']);
  const [filterMessages, setFilterMessages] = useState<string[]>(['empty', 'backlog']);
  const [filterPublisher, setFilterPublisher] = useState<string[]>(['active', 'inactive']);
  const [live, setLive] = useState(true);

  const fetchHealth = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      const response = await apiClient.get(RABBITMQ_HEALTH_PATH);
      if (response.data.success) {
        setHealth(response.data.data);
        setLastUpdate(new Date());
      } else {
        setError(response.data.error || 'Failed to fetch health data');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => fetchHealth({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [live]);

  const { attentionQueues, quietQueues, filteredQueues, allServices } = useMemo(() => {
    const list = health?.queues || [];
    const attention: QueueData[] = [];
    const quiet: QueueData[] = [];
    const servicesSet = new Set<string>();

    for (const q of list) {
      if (q.service) servicesSet.add(q.service);
      if (queueNeedsAttention(q)) attention.push(q);
      else quiet.push(q);
    }

    attention.sort((a, b) => (b.messages || 0) - (a.messages || 0));
    quiet.sort((a, b) => a.name.localeCompare(b.name));

    // Apply filters
    let filtered = [...attention, ...quiet];

    if (filterService !== 'all') {
      filtered = filtered.filter((q) => q.service === filterService);
    }

    // Consumers filter
    if (filterConsumers.length < 2) {
      filtered = filtered.filter((q) => {
        if (filterConsumers.includes('zero')) return q.consumers === 0;
        if (filterConsumers.includes('active')) return q.consumers > 0;
        return false;
      });
    }

    // Messages filter
    if (filterMessages.length < 2) {
      filtered = filtered.filter((q) => {
        if (filterMessages.includes('empty')) return q.messages === 0;
        if (filterMessages.includes('backlog')) return q.messages > 0;
        return false;
      });
    }

    // Publisher filter
    if (filterPublisher.length < 2) {
      filtered = filtered.filter((q) => {
        if (filterPublisher.includes('active')) return q.publishActive === true;
        if (filterPublisher.includes('inactive')) return q.publishActive === false;
        return false;
      });
    }

    return {
      attentionQueues: attention,
      quietQueues: quiet,
      filteredQueues: filtered,
      allServices: Array.from(servicesSet).sort()
    };
  }, [health?.queues, filterService, filterConsumers, filterMessages, filterPublisher]);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
        return 'text-green-700 bg-green-50/90 border-green-200/80';
      case 'warning':
        return 'text-amber-800 bg-amber-50/90 border-amber-200/80';
      case 'error':
        return 'text-red-700 bg-red-50/90 border-red-200/80';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status: string) => {
    const cls = 'h-3.5 w-3.5 shrink-0';
    switch (status) {
      case 'healthy':
        return <CheckCircle className={cls} />;
      case 'warning':
        return <AlertTriangle className={cls} />;
      case 'error':
        return <AlertCircle className={cls} />;
      default:
        return <Activity className={cls} />;
    }
  };

  if (loading && !health) {
    return (
      <div className="flex items-center justify-center min-h-[180px] py-6">
        <div className="flex items-center gap-2 text-slate-600">
          <RefreshCw className="h-5 w-5 animate-spin text-violet-600" />
          <span className="text-xs">Chargement RabbitMQ…</span>
        </div>
      </div>
    );
  }

  if (error && !health) {
    return (
      <div className="flex items-center justify-center min-h-[180px] px-3 py-6">
        <div className="flex flex-col items-center gap-2 max-w-md p-3 bg-red-50 border border-red-200 rounded-lg text-center">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <p className="text-xs text-red-700">{error}</p>
          <button
            type="button"
            onClick={() => fetchHealth()}
            className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const svcCount = health?.connections?.byService ? Object.keys(health.connections.byService).length : 0;
  const displayQueues = filteredQueues;
  const clusterStatus = health?.cluster?.status || 'healthy';
  const clusterTone =
    clusterStatus === 'error' ? 'error' : clusterStatus === 'warning' ? 'warning' : 'success';

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <>
            <Badge variant={clusterTone === 'success' ? 'success' : clusterTone === 'warning' ? 'warning' : 'error'} dot>
              {health?.cluster?.statusMessage || 'RabbitMQ'}
            </Badge>
            {lastUpdate ? (
              <Badge variant="neutral">{lastUpdate.toLocaleTimeString('fr-FR')}</Badge>
            ) : null}
          </>
        }
        right={
          <>
            <Button
              size="small"
              sx={{
                ...btnGhostSx,
                color: mt.error,
                borderColor: mt.error,
              }}
              onClick={() => setShowDLQModal(true)}
              startIcon={<Trash2 className="h-3.5 w-3.5" />}
            >
              DLQ
            </Button>
            <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
              <Badge variant={live ? 'success' : 'neutral'} dot>
                {live ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button sx={btnGhostSx} onClick={() => void fetchHealth()} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      <MonitorKpiStrip
        items={[
          {
            label: 'Cluster',
            value: `${health?.cluster?.runningNodes ?? 0}/${health?.cluster?.totalPods ?? 0}`,
            tone: clusterTone,
          },
          {
            label: 'Mémoire',
            value: health?.memory || 'N/A',
            tone: 'neutral',
          },
          {
            label: 'Connexions',
            value: health?.connections?.total ?? 0,
            tone: 'info',
          },
          {
            label: 'Services',
            value: svcCount,
            tone: 'neutral',
          },
          {
            label: 'Queues',
            value: displayQueues.length,
            tone: attentionQueues.length > 0 ? 'warning' : 'success',
          },
        ]}
      />

      <div className="p-2 space-y-2 w-full">
        {health?.cluster?.status === 'warning' && (
          <div className="px-2 py-1 text-[11px] bg-amber-50 border border-amber-200 rounded-md text-amber-900">
            <strong>Split-brain</strong> — nœuds séparés, risque pour les messages.
          </div>
        )}

        {health?.alarms && health.alarms.length > 0 && (
          <div className="px-2 py-1.5 bg-red-50 border border-red-200 rounded-md">
            <p className="text-[10px] font-bold text-red-800 mb-0.5">Alarmes</p>
            <ul className="list-disc list-inside text-[11px] text-red-700 space-y-0">
              {health.alarms.map((alarm, idx) => (
                <li key={idx}>{alarm}</li>
              ))}
            </ul>
          </div>
        )}

        {health?.connections?.byService && Object.keys(health.connections.byService).length > 0 && (
          <div className="rounded-lg border border-slate-200/90 bg-white px-2 py-1.5 shadow-sm">
            <span className="text-[10px] font-semibold text-slate-500 uppercase mr-2">Par service</span>
            <span className="inline-flex flex-wrap gap-1">
              {Object.entries(health.connections.byService).map(([service, count]) => (
                <span
                  key={service}
                  className="inline-flex items-baseline gap-0.5 px-1.5 py-0.5 rounded bg-violet-50 border border-violet-100 text-[10px]"
                >
                  <span className="font-medium text-violet-800 max-w-[120px] truncate">{service}</span>
                  <span className="font-bold text-violet-950">{count}</span>
                </span>
              ))}
            </span>
          </div>
        )}

        <div className="rounded-lg border border-slate-200/90 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-800">
              <Activity className="h-3.5 w-3.5 text-violet-600" />
              Files d&apos;attente
              <span className="font-normal text-slate-500">
                ({filteredQueues.length}/{health?.queues?.length || 0})
              </span>
            </div>
            {quietQueues.length > 0 && attentionQueues.length > 0 && (
              <span className="text-[10px] text-slate-500">{attentionQueues.length} à surveiller</span>
            )}
          </div>

          <div className="px-2 py-1.5 border-b border-slate-100 bg-white flex flex-wrap gap-3 items-start">
            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Consumers</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { value: 'zero', label: '0 cons.', icon: '🔴' },
                    { value: 'active', label: 'Actifs', icon: '✅' },
                  ] as const
                ).map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filterConsumers.includes(value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...filterConsumers, value]
                          : filterConsumers.filter((c) => c !== value);
                        setFilterConsumers(next);
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022]"
                    />
                    <span className="text-[10px] font-medium text-slate-700">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-300" />

            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Messages</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { value: 'empty', label: 'Vides', icon: '⚪' },
                    { value: 'backlog', label: 'Backlog', icon: '⚠️' },
                  ] as const
                ).map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filterMessages.includes(value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...filterMessages, value]
                          : filterMessages.filter((m) => m !== value);
                        setFilterMessages(next);
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022]"
                    />
                    <span className="text-[10px] font-medium text-slate-700">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="w-px h-4 bg-slate-300" />

            <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-bold text-slate-500 uppercase">Publisher</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { value: 'active', label: 'Actifs', icon: '✓' },
                    { value: 'inactive', label: 'Inactifs', icon: '—' },
                  ] as const
                ).map(({ value, label, icon }) => (
                  <label key={value} className="flex items-center gap-1 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filterPublisher.includes(value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...filterPublisher, value]
                          : filterPublisher.filter((p) => p !== value);
                        setFilterPublisher(next);
                      }}
                      className="w-3 h-3 rounded border-slate-300 text-[#E6B022]"
                    />
                    <span className="text-[10px] font-medium text-slate-700">
                      {icon} {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {allServices.length > 0 && (
              <>
                <div className="w-px h-4 bg-slate-300" />
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Service</span>
                  <select
                    value={filterService}
                    onChange={(e) => setFilterService(e.target.value)}
                    className={`text-[10px] font-semibold rounded-md px-2 py-1 border ${
                      filterService !== 'all'
                        ? 'bg-gradient-to-r from-[#E6B022] to-[#B8881A] text-white border-[#E6B022]'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    <option value="all">Tous services</option>
                    {allServices.map((svc) => (
                      <option key={svc} value={svc}>
                        {svc}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(filterService !== 'all' ||
              filterConsumers.length < 2 ||
              filterMessages.length < 2 ||
              filterPublisher.length < 2) && (
              <>
                <div className="w-px h-4 bg-slate-300" />
                <button
                  type="button"
                  onClick={() => {
                    setFilterService('all');
                    setFilterConsumers(['zero', 'active']);
                    setFilterMessages(['empty', 'backlog']);
                    setFilterPublisher(['active', 'inactive']);
                  }}
                  className="text-[10px] font-semibold px-2 py-1 rounded-md bg-red-100 text-red-700 hover:bg-red-200 self-end"
                >
                  ✕ Reset
                </button>
              </>
            )}
          </div>

          <div className="overflow-y-auto overscroll-contain" style={{ maxHeight: 'calc(100vh - 250px)' }}>
            {health?.queues && health.queues.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {displayQueues.map((queue) => {
                  const rowStatus = rowDisplayStatus(queue);
                  const hasDeadConsumer = queue.consumers === 0 && queue.messages > 0;
                  const rowBgClass = hasDeadConsumer
                    ? 'bg-red-100/90 border-red-200'
                    : getStatusColor(rowStatus);

                  return (
                    <div
                      key={queue.name}
                      className={`flex items-center gap-2 px-2 py-1 min-h-0 ${rowBgClass} border-b border-slate-100/50 last:border-b-0`}
                    >
                      <div className="shrink-0 text-slate-600">{getStatusIcon(rowStatus)}</div>
                      <div className="min-w-0 flex-1">
                        <p
                          className="font-mono text-[11px] font-medium text-slate-900 truncate leading-tight"
                          title={queue.name}
                        >
                          {queue.name}
                        </p>
                        {queue.statusReason && (
                          <p className="text-[10px] text-slate-600 leading-tight truncate" title={queue.statusReason}>
                            {queue.statusReason}
                          </p>
                        )}
                        {queue.consumers === 0 && queue.idle_since && (
                          <p
                            className="text-[10px] text-red-600 leading-tight truncate"
                            title={`Inactif depuis ${new Date(queue.idle_since).toLocaleString('fr-FR')}`}
                          >
                            ⏱ Inactif {timeAgo(queue.idle_since)}
                          </p>
                        )}
                        {queue.messages > 0 && queue.consumers === 0 && queue.firstMessageTimestamp && (
                          <p
                            className="text-[10px] text-amber-700 leading-tight truncate"
                            title={`Message créé le ${new Date(queue.firstMessageTimestamp).toLocaleString('fr-FR')}`}
                          >
                            📅 Message {timeAgo(new Date(queue.firstMessageTimestamp).toISOString())}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex shrink-0 gap-3 text-center text-[10px] tabular-nums">
                          <div className="flex flex-col items-center min-w-[40px]">
                            <span className="text-slate-500 block leading-none">Msg</span>
                            <span className="font-bold text-slate-900">{queue.messages}</span>
                          </div>
                          <div className="flex flex-col items-center min-w-[40px]">
                            <span className="text-slate-500 block leading-none">Cons.</span>
                            <span className="font-bold text-slate-900">{queue.consumers}</span>
                          </div>
                          <div className="flex flex-col items-center min-w-[40px]">
                            <span className="text-slate-500 block leading-none">Prod.</span>
                            <span
                              className={`font-bold ${queue.publishActive ? 'text-green-700' : 'text-slate-400'}`}
                            >
                              {queue.publishActive ? '✓' : '—'}
                            </span>
                          </div>
                        </div>
                        {queue.name.endsWith('.dlq') && queue.messages > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => inspectDLQMessage(queue.name)}
                              disabled={inspectingQueue === queue.name}
                              title="Voir le contenu du premier message"
                              className="shrink-0 flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                            >
                              <Eye className={`h-3 w-3 ${inspectingQueue === queue.name ? 'animate-spin' : ''}`} />
                              Info
                            </button>
                            <button
                              type="button"
                              onClick={() => retryDlqFromRow(queue.name)}
                              disabled={dlqRetrying === queue.name}
                              title="Rejouer tous les messages vers la queue d'origine"
                              className="shrink-0 flex items-center gap-0.5 px-1.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                            >
                              <RotateCcw
                                className={`h-3 w-3 ${dlqRetrying === queue.name ? 'animate-spin' : ''}`}
                              />
                              Rejouer
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 px-2 py-2">Aucune file.</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-2 py-1 rounded-md border border-slate-200/80 bg-white/90 text-[10px] text-slate-600">
          <span className="font-semibold text-slate-700">Légende</span>
          <span className="inline-flex items-center gap-0.5">
            <CheckCircle className="h-3 w-3 text-green-600" /> OK
          </span>
          <span className="inline-flex items-center gap-0.5">
            <AlertTriangle className="h-3 w-3 text-amber-600" /> Attention
          </span>
          <span className="inline-flex items-center gap-0.5">
            <AlertCircle className="h-3 w-3 text-red-600" /> Critique = messages &gt; 0 et 0 consumer
          </span>
        </div>
      </div>

      {inspectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Inspection Message DLQ</h3>
                  <p className="text-xs text-slate-500 truncate max-w-md" title={inspectedMessage.queueName}>
                    {inspectedMessage.queueName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInspectedMessage(null)}
                className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {inspectedMessage.headers && Object.keys(inspectedMessage.headers).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="text-xs font-semibold text-amber-900 mb-2">Informations</div>
                  <div className="space-y-1 text-xs">
                    {inspectedMessage.headers['x-failed-at'] && (
                      <div className="flex gap-2">
                        <span className="text-amber-700 font-medium">Échec:</span>
                        <span className="text-amber-900">
                          {new Date(String(inspectedMessage.headers['x-failed-at'])).toLocaleString('fr-FR')}
                        </span>
                      </div>
                    )}
                    {inspectedMessage.headers['x-original-queue'] && (
                      <div className="flex gap-2">
                        <span className="text-amber-700 font-medium">Queue origine:</span>
                        <span className="text-amber-900 font-mono">
                          {String(inspectedMessage.headers['x-original-queue'])}
                        </span>
                      </div>
                    )}
                    {inspectedMessage.headers['x-failure-reason'] && (
                      <div className="flex gap-2">
                        <span className="text-amber-700 font-medium">Raison:</span>
                        <span className="text-amber-900">{String(inspectedMessage.headers['x-failure-reason'])}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs font-semibold text-slate-600 uppercase mb-2">Payload (JSON)</div>
                <pre className="text-xs bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto font-mono">
                  {JSON.stringify(inspectedMessage.content, null, 2)}
                </pre>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(inspectedMessage.content, null, 2));
                  window.alert('Payload copié');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg"
              >
                Copier
              </button>
              <button
                type="button"
                onClick={() => setInspectedMessage(null)}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DLQ Manager Modal */}
      <DLQManagerModal isOpen={showDLQModal} onClose={() => setShowDLQModal(false)} />
    </MonitorPageFrame>
  );
}
