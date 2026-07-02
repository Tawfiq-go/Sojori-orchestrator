/**
 * Pods Monitoring — détail par pod (démarrage, probes, crash, ressources, RabbitMQ)
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Box, Collapse, LinearProgress, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import {
  Badge,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

function CompactStat({ icon, iconColor, value, label }: { icon: string; iconColor: string; value: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ py: 0.25 }}>
      <Box sx={{ fontSize: 14, color: iconColor, lineHeight: 1 }}>{icon}</Box>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: t.text, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, color: t.text3, lineHeight: 1 }}>{label}</Typography>
    </Stack>
  );
}

function CompactStatsRow({ children }: { children: ReactNode }) {
  return (
    <Stack
      direction="row"
      divider={<Box sx={{ width: '1px', alignSelf: 'stretch', bgcolor: t.border }} />}
      spacing={2}
      sx={{
        px: 1.75,
        py: 1,
        mb: 2,
        borderRadius: '10px',
        border: `1px solid ${t.border}`,
        bgcolor: t.bg1,
        flexWrap: 'wrap',
        rowGap: 0.5,
      }}
    >
      {children}
    </Stack>
  );
}

interface PodEvent {
  type?: string;
  reason?: string;
  message?: string;
  count?: number;
  lastSeen?: string;
}

interface PodCrash {
  reason: string;
  message?: string;
  exitCode?: number;
  startedAt?: string;
  finishedAt?: string;
  errorContext?: string[];
}

interface PodRabbitmqConnection {
  connectedAt?: string;
  peerHost?: string;
  state?: string;
  clientProvidedName?: string;
}

interface PodRabbitmq {
  status: 'connected' | 'disconnected' | 'unknown';
  lastLine?: string;
  connectedAt?: string;
  connectionsForService?: number;
  connections?: PodRabbitmqConnection[];
}

interface ReadinessCondition {
  type: string;
  status: string;
  lastTransitionTime?: string;
  reason?: string;
}

interface PodStartup {
  scheduledAt?: string;
  readyAt?: string;
  containerStartedAt?: string | null;
  durationSeconds?: number | null;
  anchorStale?: boolean;
  timeline: ReadinessCondition[];
}

interface ProbeConfig {
  path?: string;
  initialDelaySeconds?: number;
  periodSeconds?: number;
  timeoutSeconds?: number;
  failureThreshold?: number;
}

interface PodProbes {
  liveness: ProbeConfig | null;
  readiness: ProbeConfig | null;
}

interface ResourceMetric {
  usageCores?: number | null;
  requestCores?: number | null;
  limitCores?: number | null;
  percentOfLimit?: number | null;
  usageBytes?: number | null;
  requestBytes?: number | null;
  limitBytes?: number | null;
}

interface PodResources {
  cpu: ResourceMetric;
  memory: ResourceMetric;
}

interface RestartCycle {
  startedAt?: string;
  dbConnectedAt?: string;
  rabbitmqConnectedAt?: string;
  readyAt?: string;
  timeToDbSeconds?: number | null;
  timeToRabbitmqSeconds?: number | null;
  timeToReadySeconds?: number | null;
  errorLines: string[];
}

interface PodDetail {
  name: string;
  app: string;
  phase?: string;
  ready: boolean;
  restartCount: number;
  image?: string;
  startedAt?: string | null;
  startup: PodStartup;
  probes: PodProbes | null;
  resources: PodResources;
  crash: PodCrash | null;
  events: PodEvent[];
  rabbitmq: PodRabbitmq;
  restartHistory: RestartCycle[];
}

function phaseBadgeVariant(phase?: string): 'success' | 'warning' | 'error' | 'neutral' {
  if (phase === 'Running') return 'success';
  if (phase === 'Pending') return 'warning';
  if (phase === 'Failed' || phase === 'Unknown') return 'error';
  return 'neutral';
}

function rabbitmqBadgeVariant(status: PodRabbitmq['status']): 'success' | 'error' | 'neutral' {
  if (status === 'connected') return 'success';
  if (status === 'disconnected') return 'error';
  return 'neutral';
}

function conditionLabel(type: string): string {
  switch (type) {
    case 'PodScheduled':
      return 'Ordonnancé';
    case 'Initialized':
      return 'Initialisé';
    case 'ContainersReady':
      return 'Conteneurs prêts';
    case 'Ready':
      return 'Prêt (healthy)';
    default:
      return type;
  }
}

function formatBytes(bytes?: number | null): string {
  if (bytes === undefined || bytes === null) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb > 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatCores(cores?: number | null): string {
  if (cores === undefined || cores === null) return '—';
  return `${Math.round(cores * 1000)}m`;
}

function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null) return '—';
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function formatClock(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

interface TimelineStep {
  key: string;
  label: string;
  at?: string;
  elapsedSeconds?: number | null;
  reached: boolean;
  isFailurePoint?: boolean;
}

function StepSegmentTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Stack direction="row" alignItems="stretch" sx={{ minWidth: 'fit-content' }}>
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          const color = step.isFailurePoint ? t.error : step.reached ? t.success : t.text3;
          return (
            <Stack key={step.key} direction="row" alignItems="center">
              <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 84, px: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    bgcolor: step.reached || step.isFailurePoint ? color : t.bg2,
                    border: `2px solid ${color}`,
                  }}
                />
                <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: step.reached || step.isFailurePoint ? t.text : t.text3, textAlign: 'center' }}>
                  {step.label}
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: t.text3, fontFamily: 'monospace', textAlign: 'center' }}>
                  {step.at ? formatClock(step.at) : '—'}
                </Typography>
              </Stack>
              {!isLast && (
                <Stack alignItems="center" sx={{ minWidth: 56, px: 0.25 }}>
                  <Box sx={{ width: '100%', height: 2, bgcolor: steps[i + 1]?.reached || steps[i + 1]?.isFailurePoint ? t.success : t.border }} />
                  <Typography sx={{ fontSize: 9.5, color: t.text3, fontFamily: 'monospace', mt: 0.25 }}>
                    {steps[i + 1]?.elapsedSeconds != null ? `+${formatDuration(steps[i + 1].elapsedSeconds)}` : '—'}
                  </Typography>
                </Stack>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}

function buildCycleSteps(cycle: RestartCycle, previousCycleError: boolean): TimelineStep[] {
  const steps: TimelineStep[] = [];
  if (previousCycleError) {
    steps.push({ key: 'crash', label: 'Crash', reached: false, isFailurePoint: true });
  }
  steps.push({ key: 'start', label: 'Start', at: cycle.startedAt, reached: !!cycle.startedAt, elapsedSeconds: 0 });
  steps.push({
    key: 'db',
    label: 'MongoDB',
    at: cycle.dbConnectedAt,
    reached: !!cycle.dbConnectedAt,
    elapsedSeconds: cycle.timeToDbSeconds,
  });
  steps.push({
    key: 'rabbitmq',
    label: 'RabbitMQ',
    at: cycle.rabbitmqConnectedAt,
    reached: !!cycle.rabbitmqConnectedAt,
    elapsedSeconds: cycle.timeToRabbitmqSeconds,
  });
  steps.push({
    key: 'ready',
    label: 'Ready',
    at: cycle.readyAt,
    reached: !!cycle.readyAt,
    elapsedSeconds: cycle.timeToReadySeconds,
  });
  return steps;
}

function RestartHistoryTabs({ history }: { history: RestartCycle[] }) {
  const [activeIdx, setActiveIdx] = useState(history.length - 1);
  const active = history[activeIdx];

  if (history.length === 0) return <Typography sx={{ fontSize: 12, color: t.text3 }}>Aucun historique de démarrage disponible.</Typography>;

  const previousCycleError = activeIdx > 0 && history[activeIdx - 1].errorLines.length > 0;

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.5 }}>
        {history.map((c, i) => {
          const isActive = i === activeIdx;
          const hasError = c.errorLines.length > 0;
          const isLast = i === history.length - 1;
          return (
            <Box
              key={i}
              onClick={() => setActiveIdx(i)}
              sx={{
                px: 1,
                py: 0.375,
                borderRadius: '6px',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                border: `1px solid ${isActive ? t.primaryDeep : t.border}`,
                bgcolor: isActive ? t.primaryTint : hasError ? t.errorTint : t.bg2,
                color: isActive ? t.primaryDeep : hasError ? t.error : t.text3,
              }}
            >
              #{i + 1}{isLast ? ' (actuel)' : ''}{hasError ? ' ⚠' : ''}
            </Box>
          );
        })}
      </Stack>

      {active && (
        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: '8px', p: 1.25, bgcolor: t.bg1 }}>
          <StepSegmentTimeline steps={buildCycleSteps(active, previousCycleError)} />

          {active.errorLines.length > 0 && (
            <Box sx={{ mt: 1.25, pt: 1, borderTop: `1px solid ${t.border}` }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.error, mb: 0.5 }}>Erreurs de ce cycle</Typography>
              <Box sx={{ bgcolor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', p: 1, maxHeight: 180, overflowY: 'auto' }}>
                {active.errorLines.map((line, i) => (
                  <Typography key={i} sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                    {line}
                  </Typography>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}

function ResourceBar({ label, metric, formatter }: { label: string; metric: ResourceMetric; formatter: (v?: number | null) => string }) {
  const usage = 'usageCores' in metric ? metric.usageCores : metric.usageBytes;
  const limit = 'limitCores' in metric ? metric.limitCores : metric.limitBytes;
  const request = 'requestCores' in metric ? metric.requestCores : metric.requestBytes;
  const percent = metric.percentOfLimit;
  const color = percent === null || percent === undefined ? t.text3 : percent > 90 ? t.error : percent > 75 ? t.warning : t.success;

  return (
    <Box sx={{ minWidth: 140 }}>
      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2 }}>{label}</Typography>
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          {formatter(usage)} / {formatter(limit)}
          {percent !== null && percent !== undefined ? ` (${percent}%)` : ''}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, percent ?? 0)}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: t.bg2,
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
      {request !== undefined && request !== null && (
        <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.25 }}>request: {formatter(request)}</Typography>
      )}
    </Box>
  );
}

export default function PodsMonitoringPage() {
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pods, setPods] = useState<PodDetail[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchPods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/monitoring/infrastructure/pods/detail');
      if (res.data.success) setPods(res.data.data.pods || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPods();
  }, [fetchPods]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchPods, 30000);
    return () => clearInterval(interval);
  }, [isLive, fetchPods]);

  if (loading && pods.length === 0) {
    return (
      <MonitorPageFrame>
        <MonitorLoading label="Chargement des pods…" />
      </MonitorPageFrame>
    );
  }

  const crashing = pods.filter((p) => p.crash);
  const rabbitDisconnected = pods.filter((p) => p.rabbitmq?.status === 'disconnected');
  const highResourceUsage = pods.filter(
    (p) => (p.resources?.cpu?.percentOfLimit ?? 0) > 90 || (p.resources?.memory?.percentOfLimit ?? 0) > 90,
  );

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="infra"
        title="Pods"
        subtitle="Démarrage, probes, crash, ressources et connexion RabbitMQ par pod"
        live={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        onRefresh={() => void fetchPods()}
        loading={loading}
      />

      {error ? <MonitorError message={error} onRetry={() => void fetchPods()} /> : null}

      <CompactStatsRow>
        <CompactStat icon="📦" iconColor={t.text2} value={String(pods.length)} label="Pods" />
        <CompactStat icon="🔴" iconColor={t.error} value={String(crashing.length)} label="En crash" />
        <CompactStat icon="🧠" iconColor={t.warning} value={String(highResourceUsage.length)} label="CPU/RAM > 90%" />
        <CompactStat
          icon="🐰"
          iconColor={t.success}
          value={String(pods.filter((p) => p.rabbitmq?.status === 'connected').length)}
          label="RabbitMQ OK"
        />
        <CompactStat icon="⚠️" iconColor={t.warning} value={String(rabbitDisconnected.length)} label="RabbitMQ déconnecté" />
      </CompactStatsRow>

      <MonitorSection title="Détail des pods" desc={`${pods.length} pod(s)`}>
        {pods.length === 0 ? (
          <MonitorEmpty message="Aucun pod trouvé." />
        ) : (
          <Stack spacing={1}>
            {pods.map((p) => {
              const isOpen = expanded === p.name;
              return (
                <Box
                  key={p.name}
                  sx={{
                    borderRadius: '10px',
                    border: `1px solid ${p.crash ? t.error : t.border}`,
                    bgcolor: t.bg2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    onClick={() => setExpanded(isOpen ? null : p.name)}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      flexWrap: 'wrap',
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }} noWrap>
                        {p.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: t.text3 }} noWrap>
                        {p.app} · {p.image || 'image inconnue'}
                      </Typography>
                    </Box>

                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                      <Badge variant={phaseBadgeVariant(p.phase)} dot>
                        {p.phase || 'Unknown'}
                      </Badge>
                      <Badge variant={p.restartCount > 3 ? 'error' : p.restartCount > 0 ? 'warning' : 'neutral'}>
                        {p.restartCount} restart{p.restartCount > 1 ? 's' : ''}
                      </Badge>
                      {p.resources?.cpu?.percentOfLimit !== null && p.resources?.cpu?.percentOfLimit !== undefined && p.resources.cpu.percentOfLimit > 90 && (
                        <Badge variant="error">CPU {p.resources.cpu.percentOfLimit}%</Badge>
                      )}
                      {p.resources?.memory?.percentOfLimit !== null && p.resources?.memory?.percentOfLimit !== undefined && p.resources.memory.percentOfLimit > 90 && (
                        <Badge variant="error">RAM {p.resources.memory.percentOfLimit}%</Badge>
                      )}
                      {p.crash && <Badge variant="error">{p.crash.reason}</Badge>}
                      <Badge variant={rabbitmqBadgeVariant(p.rabbitmq?.status)}>
                        🐰 {p.rabbitmq?.status === 'connected'
                          ? 'connecté'
                          : p.rabbitmq?.status === 'disconnected'
                            ? 'déconnecté'
                            : 'inconnu'}
                      </Badge>
                    </Stack>
                  </Box>

                  <Collapse in={isOpen}>
                    <Box sx={{ p: 1.5, pt: 0, borderTop: `1px solid ${t.border}` }}>
                      <Stack spacing={1.5} sx={{ mt: 1.25 }}>
                        {/* Timeline de démarrage */}
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            Démarrage
                            {p.startup?.anchorStale
                              ? ' — délai non fiable (pod resynchronisé sans redémarrage réel, voir historique des cycles ci-dessous)'
                              : p.startup?.durationSeconds != null
                                ? ` — ${formatDuration(p.startup.durationSeconds)} jusqu'à healthy`
                                : ''}
                          </Typography>
                          {p.startup?.timeline?.length > 0 ? (
                            <Stack spacing={0.4}>
                              {p.startup.timeline.map((c, i) => (
                                <Stack key={i} direction="row" spacing={1} alignItems="center">
                                  <Badge variant={c.status === 'True' ? 'success' : 'error'} dot>
                                    {conditionLabel(c.type)}
                                  </Badge>
                                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                                    {c.lastTransitionTime ? new Date(c.lastTransitionTime).toLocaleTimeString('fr-FR') : '—'}
                                    {c.reason ? ` · ${c.reason}` : ''}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          ) : (
                            <Typography sx={{ fontSize: 12, color: t.text3 }}>Aucune donnée de démarrage.</Typography>
                          )}
                        </Box>

                        {/* Historique des cycles de démarrage (restarts) */}
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            Historique des cycles {p.restartHistory?.length > 1 ? `(${p.restartHistory.length})` : ''}
                          </Typography>
                          <RestartHistoryTabs history={p.restartHistory || []} />
                        </Box>

                        {/* Probes configurées */}
                        {p.probes && (p.probes.liveness || p.probes.readiness) && (
                          <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                              Probes (seuils healthy/unhealthy)
                            </Typography>
                            <Stack spacing={0.4}>
                              {p.probes.readiness && (
                                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                                  Readiness: {p.probes.readiness.path || 'exec/tcp'} · délai initial{' '}
                                  {p.probes.readiness.initialDelaySeconds ?? 0}s · toutes les {p.probes.readiness.periodSeconds ?? 0}s · échec
                                  après {p.probes.readiness.failureThreshold ?? 0} tentative(s)
                                </Typography>
                              )}
                              {p.probes.liveness && (
                                <Typography sx={{ fontSize: 11, color: t.text3 }}>
                                  Liveness: {p.probes.liveness.path || 'exec/tcp'} · délai initial{' '}
                                  {p.probes.liveness.initialDelaySeconds ?? 0}s · toutes les {p.probes.liveness.periodSeconds ?? 0}s · échec
                                  après {p.probes.liveness.failureThreshold ?? 0} tentative(s)
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        )}

                        {/* Ressources CPU / RAM */}
                        {p.resources && (
                          <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.75 }}>
                              Ressources
                            </Typography>
                            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                              <ResourceBar label="CPU" metric={p.resources.cpu} formatter={formatCores} />
                              <ResourceBar label="Mémoire" metric={p.resources.memory} formatter={formatBytes} />
                            </Stack>
                          </Box>
                        )}

                        {/* Crash + contexte d'erreur */}
                        {p.crash && (
                          <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.error, mb: 0.5 }}>
                              Dernier crash — {p.crash.reason}
                              {p.crash.exitCode !== undefined ? ` (exit ${p.crash.exitCode})` : ''}
                              {p.crash.finishedAt ? ` · ${new Date(p.crash.finishedAt).toLocaleString('fr-FR')}` : ''}
                            </Typography>
                            {p.crash.message && (
                              <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace', mb: 0.5 }}>
                                {p.crash.message}
                              </Typography>
                            )}
                            {p.crash.errorContext && p.crash.errorContext.length > 0 && (
                              <Box
                                sx={{
                                  bgcolor: t.bg,
                                  border: `1px solid ${t.border}`,
                                  borderRadius: '6px',
                                  p: 1,
                                  maxHeight: 220,
                                  overflowY: 'auto',
                                }}
                              >
                                {p.crash.errorContext.map((line, i) => (
                                  <Typography
                                    key={i}
                                    sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                                  >
                                    {line}
                                  </Typography>
                                ))}
                              </Box>
                            )}
                          </Box>
                        )}

                        {/* RabbitMQ */}
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            RabbitMQ
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: t.text3 }}>
                            {p.rabbitmq?.connectionsForService !== undefined
                              ? `${p.rabbitmq.connectionsForService} connexion(s) actives pour ${p.app}`
                              : 'Aucune connexion active détectée'}
                            {p.rabbitmq?.connectedAt ? ` · connecté depuis ${new Date(p.rabbitmq.connectedAt).toLocaleString('fr-FR')}` : ''}
                          </Typography>
                          {p.rabbitmq?.lastLine && (
                            <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace', mt: 0.5 }}>
                              {p.rabbitmq.lastLine}
                            </Typography>
                          )}
                          {p.rabbitmq?.connections && p.rabbitmq.connections.length > 0 && (
                            <Stack spacing={0.3} sx={{ mt: 0.5 }}>
                              {p.rabbitmq.connections.map((c, i) => (
                                <Typography key={i} sx={{ fontSize: 10.5, color: t.text3 }}>
                                  {c.clientProvidedName || c.peerHost || 'connexion'} · {c.state || '?'}
                                  {c.connectedAt ? ` · depuis ${new Date(c.connectedAt).toLocaleTimeString('fr-FR')}` : ''}
                                </Typography>
                              ))}
                            </Stack>
                          )}
                        </Box>

                        {/* Événements K8s */}
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            Événements récents
                          </Typography>
                          {p.events.length === 0 ? (
                            <Typography sx={{ fontSize: 12, color: t.text3 }}>Aucun événement récent.</Typography>
                          ) : (
                            <Stack spacing={0.5}>
                              {p.events.map((ev, i) => (
                                <Stack key={i} direction="row" spacing={1} alignItems="baseline">
                                  <Badge variant={ev.type === 'Warning' ? 'warning' : 'neutral'}>
                                    {ev.reason || ev.type}
                                  </Badge>
                                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                                    {ev.message}
                                    {ev.count && ev.count > 1 ? ` (×${ev.count})` : ''}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          )}
                        </Box>
                      </Stack>
                    </Box>
                  </Collapse>
                </Box>
              );
            })}
          </Stack>
        )}
      </MonitorSection>
    </MonitorPageFrame>
  );
}
