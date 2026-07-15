import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { Box, Button, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import { getAdminRabbitmqDlqApiBase, RABBITMQ_HEALTH_PATH } from '../../utils/monitoringApi';
import DLQManagerModal from './DLQManagerModal';
import {
  Badge,
  btnGhostSx,
  btnPrimarySx,
  FilterChip,
  MonitorKpiStrip,
  MonitorPageFrame,
  MonitorToolbarRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

type QueueStatus = 'healthy' | 'warning' | 'error';

interface QueueData {
  name: string;
  messages: number;
  messages_ready?: number;
  messages_unacknowledged?: number;
  consumers: number;
  status: QueueStatus;
  statusReason?: string;
  publishActive: boolean;
  idle_since?: string;
  firstMessageTimestamp?: string | number | null;
  service?: string;
}

interface Incident {
  severity: 'critical' | 'warning';
  type: string;
  message: string;
  queueName?: string;
  service?: string;
  hints?: string[];
  counts?: {
    messages_total: number;
    messages_ready: number;
    messages_unacknowledged: number;
    consumers?: number;
  };
}

interface HealthData {
  queues: QueueData[];
  cluster: {
    status: QueueStatus;
    statusMessage: string;
    runningNodes: number;
    totalPods: number;
  };
  memory?: string;
  connections: {
    total: number;
    blocked?: number;
    blocking?: number;
    byService: Record<string, number>;
  };
  incidents?: Incident[];
  alarms?: string[];
}

interface InspectedMessage {
  queueName: string;
  content: unknown;
  headers: Record<string, unknown>;
  properties: Record<string, unknown>;
}

type ViewMode = 'attention' | 'active' | 'all' | 'dlq';
type StuckMap = Record<string, { ready: number; stagnantPolls: number }>;

function timeAgo(dateString: string | undefined | null): string | null {
  if (!dateString) return null;
  const past = new Date(dateString);
  if (Number.isNaN(past.getTime())) return null;
  const diffMin = Math.floor((Date.now() - past.getTime()) / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `il y a ${diffHours}h`;
  return `il y a ${Math.floor(diffHours / 24)}j`;
}

function readyOf(q: QueueData): number {
  if (typeof q.messages_ready === 'number') return q.messages_ready;
  return q.messages ?? 0;
}

function unackedOf(q: QueueData): number {
  if (typeof q.messages_unacknowledged === 'number') return q.messages_unacknowledged;
  return Math.max(0, (q.messages ?? 0) - readyOf(q));
}

function isDeadConsumer(q: QueueData): boolean {
  return (q.consumers ?? 0) === 0 && (q.messages ?? 0) > 0;
}

function isInFlightStuck(q: QueueData): boolean {
  return unackedOf(q) > 0 && (q.consumers ?? 0) > 0 && readyOf(q) === 0 && unackedOf(q) >= 5;
}

function isIdleNoise(q: QueueData): boolean {
  return (q.messages ?? 0) === 0 && (q.consumers ?? 0) === 0;
}

function isBenignIdleReason(reason?: string): boolean {
  if (!reason) return false;
  return /^Idle\b/i.test(reason) || /0 message.*pas de consumer/i.test(reason);
}

function needsAttention(q: QueueData, stuck: boolean): boolean {
  // Idle legacy (0/0) must never look like an incident
  if (isIdleNoise(q) && q.status !== 'error') return false;
  if (q.status === 'error') return true;
  if (q.status === 'warning' && !isBenignIdleReason(q.statusReason)) return true;
  if (isDeadConsumer(q) || isInFlightStuck(q) || stuck) return true;
  if (unackedOf(q) > 0 && readyOf(q) === 0) return true; // in-flight visible in "À surveiller"
  return false;
}

function rowTone(q: QueueData, stuck: boolean): 'error' | 'warning' | 'success' | 'neutral' | 'info' {
  if (isDeadConsumer(q) || q.status === 'error') return 'error';
  if (stuck || isInFlightStuck(q)) return 'warning';
  if (q.status === 'warning' && !isBenignIdleReason(q.statusReason)) return 'warning';
  if (unackedOf(q) > 0 && (q.consumers ?? 0) > 0) return 'info';
  if (isIdleNoise(q) || (q.messages ?? 0) === 0) return 'neutral';
  return 'success';
}

function toneColors(tone: 'error' | 'warning' | 'success' | 'neutral' | 'info') {
  switch (tone) {
    case 'error':
      return { bg: t.errorTint, fg: t.error, border: 'rgba(200,30,30,0.22)' };
    case 'warning':
      return { bg: t.warningTint, fg: t.warning, border: 'rgba(196,101,6,0.22)' };
    case 'success':
      return { bg: t.successTint, fg: t.success, border: 'rgba(10,143,94,0.22)' };
    case 'info':
      return { bg: t.infoTint, fg: t.info, border: 'rgba(6,115,179,0.22)' };
    default:
      return { bg: t.bg2, fg: t.text2, border: t.border };
  }
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
  const [live, setLive] = useState(true);
  const [view, setView] = useState<ViewMode>('attention');
  const [filterService, setFilterService] = useState<string>('all');
  const [stuckMap, setStuckMap] = useState<StuckMap>({});
  const prevReadyRef = useRef<Record<string, number>>({});

  const inspectDLQMessage = async (queueName: string) => {
    if (!queueName?.endsWith?.('.dlq')) return;
    try {
      setInspectingQueue(queueName);
      const base = getAdminRabbitmqDlqApiBase();
      const { data } = await apiClient.get(
        `${base}/${encodeURIComponent(queueName)}/messages?limit=1`,
      );
      if (data.success && data.data.messages?.length > 0) {
        const msg = data.data.messages[0];
        let content: unknown = {};
        try {
          content = JSON.parse(msg.content);
        } catch {
          content = { raw: msg.content };
        }
        setInspectedMessage({
          queueName,
          content,
          headers: msg.properties?.headers || {},
          properties: msg.properties || {},
        });
      } else {
        window.alert('Aucun message trouvé dans cette DLQ');
      }
    } catch (err: any) {
      window.alert(err.response?.data?.message || err.message || 'Erreur inspection DLQ');
    } finally {
      setInspectingQueue(null);
    }
  };

  const retryDlqFromRow = async (queueName: string) => {
    if (!queueName?.endsWith?.('.dlq')) return;
    if (!window.confirm(`Rejouer tous les messages de « ${queueName} » vers la queue d'origine ?`)) {
      return;
    }
    try {
      setDlqRetrying(queueName);
      const base = getAdminRabbitmqDlqApiBase();
      const { data } = await apiClient.post(`${base}/${encodeURIComponent(queueName)}/retry`, {
        all: true,
      });
      if (data.success) {
        window.alert(`Rejeu OK : ${data.data.retriedCount} → ${data.data.originalQueue}`);
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

  const updateStuckFromQueues = useCallback((queues: QueueData[]) => {
    const prev = prevReadyRef.current;
    const nextPrev: Record<string, number> = {};

    setStuckMap((prevStuck) => {
      const nextStuck: StuckMap = {};
      for (const q of queues) {
        const ready = readyOf(q);
        nextPrev[q.name] = ready;
        const previous = prev[q.name];
        if (ready <= 0) continue;
        if (previous !== undefined && ready >= previous) {
          const stagnant = (prevStuck[q.name]?.stagnantPolls ?? 0) + 1;
          nextStuck[q.name] = { ready, stagnantPolls: stagnant };
        } else if (isDeadConsumer(q)) {
          nextStuck[q.name] = { ready, stagnantPolls: prevStuck[q.name]?.stagnantPolls ?? 1 };
        }
      }
      return nextStuck;
    });

    prevReadyRef.current = nextPrev;
  }, []);

  const fetchHealth = async (opts?: { silent?: boolean }) => {
    try {
      if (!opts?.silent) setLoading(true);
      setError(null);
      const response = await apiClient.get(RABBITMQ_HEALTH_PATH);
      if (response.data.success) {
        const data = response.data.data as HealthData;
        setHealth(data);
        setLastUpdate(new Date());
        updateStuckFromQueues(data.queues || []);
      } else {
        setError(response.data.error || 'Échec santé RabbitMQ');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchHealth();
  }, []);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => void fetchHealth({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [live]);

  const allServices = useMemo(() => {
    const set = new Set<string>();
    for (const q of health?.queues || []) {
      if (q.service) set.add(q.service);
    }
    return Array.from(set).sort();
  }, [health?.queues]);

  const totals = useMemo(() => {
    const queues = health?.queues || [];
    let ready = 0;
    let unacked = 0;
    let dead = 0;
    let stuck = 0;
    let active = 0;
    let attention = 0;
    for (const q of queues) {
      ready += readyOf(q);
      unacked += unackedOf(q);
      const isStuck = (stuckMap[q.name]?.stagnantPolls ?? 0) >= 2;
      if (isDeadConsumer(q)) dead += 1;
      if (isStuck) stuck += 1;
      if (!isIdleNoise(q)) active += 1;
      if (needsAttention(q, isStuck)) attention += 1;
    }
    return { ready, unacked, dead, stuck, total: queues.length, active, attention };
  }, [health?.queues, stuckMap]);

  const displayQueues = useMemo(() => {
    let list = [...(health?.queues || [])];
    if (filterService !== 'all') {
      list = list.filter((q) => q.service === filterService);
    }
    if (view === 'dlq') {
      list = list.filter((q) => q.name.endsWith('.dlq'));
    } else if (view === 'attention') {
      list = list.filter((q) =>
        needsAttention(q, (stuckMap[q.name]?.stagnantPolls ?? 0) >= 2),
      );
    } else if (view === 'active') {
      list = list.filter((q) => !isIdleNoise(q));
    }
    list.sort((a, b) => {
      const sa = needsAttention(a, (stuckMap[a.name]?.stagnantPolls ?? 0) >= 2) ? 0 : 1;
      const sb = needsAttention(b, (stuckMap[b.name]?.stagnantPolls ?? 0) >= 2) ? 0 : 1;
      if (sa !== sb) return sa - sb;
      return (b.messages || 0) - (a.messages || 0) || a.name.localeCompare(b.name);
    });
    return list;
  }, [health?.queues, filterService, view, stuckMap]);

  const incidents = useMemo(() => {
    const fromApi = [...(health?.incidents || [])];
    // Client-side stuck incidents (backlog not draining across polls)
    for (const [name, info] of Object.entries(stuckMap)) {
      if (info.stagnantPolls < 2) continue;
      if (fromApi.some((i) => i.queueName === name && i.type === 'stuck_backlog')) continue;
      fromApi.push({
        severity: 'warning',
        type: 'stuck_backlog',
        message: `Backlog ready stagnant sur « ${name} » (${info.ready} ready, ${info.stagnantPolls} polls)`,
        queueName: name,
      });
    }
    return fromApi.sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'critical' ? -1 : 1;
    });
  }, [health?.incidents, stuckMap]);

  if (loading && !health) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 6, gap: 1.5 }}>
        <RefreshCw size={18} style={{ color: t.primaryDeep, animation: 'spin 1s linear infinite' }} />
        <Typography sx={{ fontSize: 13, color: t.text2 }}>Chargement RabbitMQ…</Typography>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Box>
    );
  }

  if (error && !health) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6, px: 2 }}>
        <Box
          sx={{
            maxWidth: 420,
            p: 2.5,
            borderRadius: '12px',
            border: `1px solid ${t.error}`,
            bgcolor: t.errorTint,
            textAlign: 'center',
          }}
        >
          <AlertCircle size={22} style={{ color: t.error, marginBottom: 8 }} />
          <Typography sx={{ fontSize: 13, color: t.error, mb: 1.5 }}>{error}</Typography>
          <Button sx={btnPrimarySx} onClick={() => void fetchHealth()}>
            Réessayer
          </Button>
        </Box>
      </Box>
    );
  }

  const clusterStatus = health?.cluster?.status || 'healthy';
  const clusterTone =
    clusterStatus === 'error' ? 'error' : clusterStatus === 'warning' ? 'warning' : 'success';
  const blocked = health?.connections?.blocked ?? 0;
  const blocking = health?.connections?.blocking ?? 0;

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <>
            <Badge
              variant={clusterTone === 'success' ? 'success' : clusterTone === 'warning' ? 'warning' : 'error'}
              dot
            >
              {health?.cluster?.statusMessage || 'RabbitMQ'}
            </Badge>
            {lastUpdate ? (
              <Badge variant="neutral">{lastUpdate.toLocaleTimeString('fr-FR')}</Badge>
            ) : null}
            {blocked > 0 || blocking > 0 ? (
              <Badge variant="error" dot>
                {blocked} blocked · {blocking} blocking
              </Badge>
            ) : null}
          </>
        }
        right={
          <>
            <Button
              size="small"
              sx={{ ...btnGhostSx, color: t.error, borderColor: 'rgba(200,30,30,0.35)' }}
              onClick={() => setShowDLQModal(true)}
              startIcon={<Trash2 size={14} />}
            >
              DLQ
            </Button>
            <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
              <Badge variant={live ? 'success' : 'neutral'} dot>
                {live ? 'Live 30s' : 'Pause'}
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
          { label: 'Mémoire', value: health?.memory || '—', tone: 'neutral' },
          {
            label: 'Connexions',
            value: health?.connections?.total ?? 0,
            tone: blocked > 0 ? 'error' : 'info',
          },
          {
            label: 'Ready',
            value: totals.ready,
            tone: totals.ready > 0 ? 'warning' : 'success',
            active: view === 'attention' && totals.ready > 0,
            onClick: () => setView('attention'),
          },
          {
            label: 'Unacked',
            value: totals.unacked,
            tone: totals.unacked > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Sans consumer',
            value: totals.dead,
            tone: totals.dead > 0 ? 'error' : 'success',
            active: view === 'attention',
            onClick: () => setView('attention'),
          },
          {
            label: 'Stagnants',
            value: totals.stuck,
            tone: totals.stuck > 0 ? 'warning' : 'neutral',
          },
        ]}
      />

      <Stack spacing={1.25}>
        {health?.alarms && health.alarms.length > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: '10px',
              border: `1px solid rgba(200,30,30,0.25)`,
              bgcolor: t.errorTint,
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.error, mb: 0.5 }}>
              Alarmes cluster
            </Typography>
            {health.alarms.map((a) => (
              <Typography key={a} sx={{ fontSize: 12, color: t.error }}>
                {a}
              </Typography>
            ))}
          </Box>
        )}

        {incidents.length > 0 && (
          <Box
            sx={{
              borderRadius: '12px',
              border: `1px solid ${t.borderStrong}`,
              bgcolor: t.bg1,
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderBottom: `1px solid ${t.border}`,
                bgcolor: t.bg2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text }}>
                Incidents ({incidents.length})
              </Typography>
              <Typography sx={{ fontSize: 11, color: t.text3 }}>
                dead consumer · backlog · unacked · connexions
              </Typography>
            </Box>
            <Stack sx={{ maxHeight: 180, overflow: 'auto' }}>
              {incidents.slice(0, 12).map((inc, idx) => {
                const c = toneColors(inc.severity === 'critical' ? 'error' : 'warning');
                return (
                  <Box
                    key={`${inc.type}-${inc.queueName || idx}`}
                    sx={{
                      px: 1.5,
                      py: 1,
                      borderBottom: `1px solid ${t.border}`,
                      display: 'flex',
                      gap: 1.25,
                      alignItems: 'flex-start',
                      bgcolor: idx % 2 ? t.bg0 : t.bg1,
                    }}
                  >
                    <Box
                      sx={{
                        mt: 0.25,
                        px: 0.75,
                        py: 0.15,
                        borderRadius: '6px',
                        bgcolor: c.bg,
                        color: c.fg,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.04,
                        flexShrink: 0,
                      }}
                    >
                      {inc.severity === 'critical' ? 'Critique' : 'Attention'}
                    </Box>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 12, color: t.text, lineHeight: 1.35 }}>
                        {inc.message}
                      </Typography>
                      {inc.counts && (
                        <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.25 }}>
                          ready {inc.counts.messages_ready} · unacked{' '}
                          {inc.counts.messages_unacknowledged}
                          {typeof inc.counts.consumers === 'number'
                            ? ` · cons. ${inc.counts.consumers}`
                            : ''}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {health?.connections?.byService && Object.keys(health.connections.byService).length > 0 && (
          <Box
            sx={{
              px: 1.5,
              py: 1.1,
              borderRadius: '12px',
              border: `1px solid ${t.border}`,
              bgcolor: t.bg1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 0.75,
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                fontSize: 10,
                fontWeight: 700,
                color: t.text3,
                textTransform: 'uppercase',
                letterSpacing: 0.06,
                mr: 0.5,
              }}
            >
              Connexions
            </Typography>
            {Object.entries(health.connections.byService)
              .sort((a, b) => b[1] - a[1])
              .map(([service, count]) => (
                <Box
                  key={service}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'baseline',
                    gap: 0.5,
                    px: 1,
                    py: 0.35,
                    borderRadius: '8px',
                    bgcolor: t.bg2,
                    border: `1px solid ${t.border}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: t.text2,
                      maxWidth: 140,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {service}
                  </Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text }}>{count}</Typography>
                </Box>
              ))}
          </Box>
        )}

        <Box
          sx={{
            borderRadius: '12px',
            border: `1px solid ${t.borderStrong}`,
            bgcolor: t.bg1,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderBottom: `1px solid ${t.border}`,
              bgcolor: t.bg2,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text, mr: 0.5 }}>
                Files
              </Typography>
              {(
                [
                  { id: 'attention' as const, label: `À surveiller (${totals.attention})` },
                  { id: 'active' as const, label: `Actives (${totals.active})` },
                  { id: 'all' as const, label: `Toutes (${totals.total})` },
                  { id: 'dlq' as const, label: 'DLQ' },
                ]
              ).map((opt) => (
                <FilterChip
                  key={opt.id}
                  label={opt.label}
                  active={view === opt.id}
                  onClick={() => setView(opt.id)}
                />
              ))}
            </Stack>
            {allServices.length > 0 && (
              <Box
                component="select"
                value={filterService}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setFilterService(e.target.value)
                }
                sx={{
                  fontSize: 11,
                  fontWeight: 600,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '8px',
                  border: `1px solid ${filterService !== 'all' ? t.primary : t.border}`,
                  bgcolor: filterService !== 'all' ? t.primaryTint : t.bg1,
                  color: t.text,
                  outline: 'none',
                }}
              >
                <option value="all">Tous services</option>
                {allServices.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </Box>
            )}
          </Box>

          {/* Table header */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'minmax(180px, 1.6fr) 64px 64px 56px 56px 72px 120px',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderBottom: `1px solid ${t.border}`,
              bgcolor: t.bg0,
            }}
          >
            {['Queue', 'Ready', 'Unacked', 'Cons.', 'Prod.', 'État', ''].map((h) => (
              <Typography
                key={h || 'actions'}
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.text3,
                  textTransform: 'uppercase',
                  letterSpacing: 0.05,
                }}
              >
                {h}
              </Typography>
            ))}
          </Box>

          <Box sx={{ maxHeight: 'calc(100vh - 320px)', overflow: 'auto' }}>
            {displayQueues.length === 0 ? (
              <Typography sx={{ fontSize: 13, color: t.text3, px: 2, py: 3, textAlign: 'center' }}>
                {view === 'attention'
                  ? 'Aucune file à surveiller — backlog drainé et consumers présents.'
                  : 'Aucune file.'}
              </Typography>
            ) : (
              displayQueues.map((queue) => {
                const stagnant = stuckMap[queue.name]?.stagnantPolls ?? 0;
                const stuck = stagnant >= 2;
                const tone = rowTone(queue, stuck);
                const colors = toneColors(tone);
                const ready = readyOf(queue);
                const unacked = unackedOf(queue);
                const dead = isDeadConsumer(queue);
                const inFlight = isInFlightStuck(queue);

                let etatLabel = 'OK';
                let etatTone: 'error' | 'warning' | 'success' | 'neutral' | 'info' = 'success';
                if (dead) {
                  etatLabel = 'Sans consumer';
                  etatTone = 'error';
                } else if (stuck) {
                  etatLabel = 'Stagnant';
                  etatTone = 'warning';
                } else if (inFlight) {
                  etatLabel = 'Unacked';
                  etatTone = 'warning';
                } else if (unacked > 0 && queue.consumers > 0) {
                  etatLabel = 'En cours';
                  etatTone = 'info';
                } else if (queue.status === 'warning' && !isBenignIdleReason(queue.statusReason)) {
                  etatLabel = 'Attention';
                  etatTone = 'warning';
                } else if (ready > 0) {
                  etatLabel = 'Backlog';
                  etatTone = 'warning';
                } else if (isIdleNoise(queue)) {
                  etatLabel = 'Idle';
                  etatTone = 'neutral';
                }
                const etatC = toneColors(etatTone);
                const showReason =
                  queue.statusReason &&
                  !isBenignIdleReason(queue.statusReason) &&
                  (dead || stuck || inFlight || queue.status === 'warning' || ready > 0);

                return (
                  <Box
                    key={queue.name}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(180px, 1.6fr) 64px 64px 56px 56px 72px 120px',
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      alignItems: 'center',
                      borderBottom: `1px solid ${t.border}`,
                      borderLeft: `3px solid ${colors.fg}`,
                      bgcolor: tone === 'error' || tone === 'warning' ? colors.bg : t.bg1,
                      '&:hover': { bgcolor: t.bg2 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: 'Geist Mono, ui-monospace, monospace',
                          fontSize: 12,
                          fontWeight: 600,
                          color: t.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                        title={queue.name}
                      >
                        {queue.name}
                      </Typography>
                      {showReason && (
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: t.text3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={queue.statusReason}
                        >
                          {queue.statusReason}
                        </Typography>
                      )}
                    </Box>

                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: ready > 0 ? t.warning : t.text3,
                      }}
                    >
                      {ready}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: unacked > 0 ? t.info : t.text3,
                      }}
                    >
                      {unacked}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        fontVariantNumeric: 'tabular-nums',
                        color: queue.consumers === 0 ? t.error : t.text,
                      }}
                    >
                      {queue.consumers}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: queue.publishActive ? t.success : t.text4,
                      }}
                    >
                      {queue.publishActive ? 'oui' : '—'}
                    </Typography>
                    <Box
                      sx={{
                        justifySelf: 'start',
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '6px',
                        bgcolor: etatC.bg,
                        color: etatC.fg,
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {etatLabel}
                    </Box>
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      {queue.name.endsWith('.dlq') && queue.messages > 0 && (
                        <>
                          <Button
                            size="small"
                            sx={{
                              ...btnGhostSx,
                              minWidth: 0,
                              px: 0.75,
                              py: 0.25,
                              fontSize: 10,
                            }}
                            onClick={() => void inspectDLQMessage(queue.name)}
                            disabled={inspectingQueue === queue.name}
                            startIcon={<Eye size={12} />}
                          >
                            Info
                          </Button>
                          <Button
                            size="small"
                            sx={{
                              ...btnPrimarySx,
                              minWidth: 0,
                              px: 0.75,
                              py: 0.25,
                              fontSize: 10,
                            }}
                            onClick={() => void retryDlqFromRow(queue.name)}
                            disabled={dlqRetrying === queue.name}
                            startIcon={<RotateCcw size={12} />}
                          >
                            Rejouer
                          </Button>
                        </>
                      )}
                    </Stack>
                  </Box>
                );
              })
            )}
          </Box>
        </Box>

        <Stack
          direction="row"
          spacing={2}
          sx={{
            flexWrap: 'wrap',
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: '10px',
            border: `1px solid ${t.border}`,
            bgcolor: t.bg1,
            alignItems: 'center',
          }}
        >
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2 }}>Légende</Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <CheckCircle size={12} style={{ color: t.success }} />
            <Typography sx={{ fontSize: 11, color: t.text3 }}>OK</Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AlertTriangle size={12} style={{ color: t.warning }} />
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Backlog / unacked / stagnant
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AlertCircle size={12} style={{ color: t.error }} />
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Messages présents + 0 consumer
            </Typography>
          </Stack>
          <Typography sx={{ fontSize: 11, color: t.text4, ml: 'auto' }}>
            Ready = en attente · Unacked = livrés non acquittés
          </Typography>
        </Stack>
      </Stack>

      {inspectedMessage && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(20,17,10,0.45)',
            p: 2,
          }}
        >
          <Box
            sx={{
              bgcolor: t.bg1,
              borderRadius: '14px',
              border: `1px solid ${t.borderStrong}`,
              width: '100%',
              maxWidth: 720,
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${t.border}`,
                bgcolor: t.bg2,
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.text }}>
                  Message DLQ
                </Typography>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: t.text3,
                    fontFamily: 'Geist Mono, monospace',
                    maxWidth: 480,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inspectedMessage.queueName}
                </Typography>
              </Box>
              <Button sx={btnGhostSx} onClick={() => setInspectedMessage(null)}>
                <X size={16} />
              </Button>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {inspectedMessage.headers && Object.keys(inspectedMessage.headers).length > 0 && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: '10px',
                    bgcolor: t.primaryTint,
                    border: `1px solid rgba(230,176,34,0.28)`,
                  }}
                >
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.primaryDeep, mb: 0.75 }}>
                    Métadonnées
                  </Typography>
                  {Object.entries(inspectedMessage.headers).map(([k, v]) => (
                    <Typography key={k} sx={{ fontSize: 12, color: t.text2 }}>
                      <Box component="span" sx={{ fontWeight: 600, color: t.text3, mr: 1 }}>
                        {k}
                      </Box>
                      {String(v)}
                    </Typography>
                  ))}
                </Box>
              )}
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: t.text3,
                  textTransform: 'uppercase',
                  mb: 0.75,
                }}
              >
                Payload
              </Typography>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 1.5,
                  borderRadius: '10px',
                  bgcolor: '#14110a',
                  color: t.primarySoft,
                  fontSize: 12,
                  fontFamily: 'Geist Mono, monospace',
                  overflow: 'auto',
                }}
              >
                {JSON.stringify(inspectedMessage.content, null, 2)}
              </Box>
            </Box>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 1,
                px: 2,
                py: 1.5,
                borderTop: `1px solid ${t.border}`,
                bgcolor: t.bg2,
              }}
            >
              <Button
                sx={btnGhostSx}
                onClick={() => {
                  void navigator.clipboard.writeText(
                    JSON.stringify(inspectedMessage.content, null, 2),
                  );
                }}
              >
                Copier
              </Button>
              <Button sx={btnPrimarySx} onClick={() => setInspectedMessage(null)}>
                Fermer
              </Button>
            </Box>
          </Box>
        </Box>
      )}

      <DLQManagerModal isOpen={showDLQModal} onClose={() => setShowDLQModal(false)} />
    </MonitorPageFrame>
  );
}
