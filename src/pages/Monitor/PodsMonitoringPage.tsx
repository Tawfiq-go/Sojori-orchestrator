/**
 * Pods Monitoring — détail par pod (démarrage, crash, événements K8s, RabbitMQ)
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import {
  Badge,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  StatCard,
  StatsRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

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
}

interface PodRabbitmq {
  status: 'connected' | 'disconnected' | 'unknown';
  lastLine?: string;
  connectionsForService?: number;
}

interface PodDetail {
  name: string;
  app: string;
  phase?: string;
  ready: boolean;
  restartCount: number;
  image?: string;
  startedAt?: string | null;
  crash: PodCrash | null;
  events: PodEvent[];
  rabbitmq: PodRabbitmq;
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

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="infra"
        title="Pods"
        subtitle="Démarrage, crash, événements K8s et connexion RabbitMQ par pod"
        live={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        onRefresh={() => void fetchPods()}
        loading={loading}
      />

      {error ? <MonitorError message={error} onRetry={() => void fetchPods()} /> : null}

      <StatsRow>
        <StatCard icon="📦" iconBg={t.bg2} iconColor={t.text2} value={String(pods.length)} label="Pods" />
        <StatCard
          icon="🔴"
          iconBg={t.errorTint}
          iconColor={t.error}
          value={String(crashing.length)}
          label="En crash"
        />
        <StatCard
          icon="🐰"
          iconBg={t.successTint}
          iconColor={t.success}
          value={String(pods.filter((p) => p.rabbitmq?.status === 'connected').length)}
          label="RabbitMQ OK"
        />
        <StatCard
          icon="⚠️"
          iconBg={t.warningTint}
          iconColor={t.warning}
          value={String(rabbitDisconnected.length)}
          label="RabbitMQ déconnecté"
        />
      </StatsRow>

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
                      <Stack spacing={1.25} sx={{ mt: 1.25 }}>
                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            Démarrage
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: t.text3 }}>
                            {p.startedAt ? new Date(p.startedAt).toLocaleString('fr-FR') : 'Non démarré / inconnu'}
                            {' · '}Ready: {p.ready ? 'oui' : 'non'}
                          </Typography>
                        </Box>

                        {p.crash && (
                          <Box>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.error, mb: 0.5 }}>
                              Dernier crash — {p.crash.reason}
                              {p.crash.exitCode !== undefined ? ` (exit ${p.crash.exitCode})` : ''}
                            </Typography>
                            {p.crash.message && (
                              <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'monospace' }}>
                                {p.crash.message}
                              </Typography>
                            )}
                          </Box>
                        )}

                        <Box>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.text2, mb: 0.5 }}>
                            RabbitMQ
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: t.text3 }}>
                            {p.rabbitmq?.connectionsForService !== undefined
                              ? `${p.rabbitmq.connectionsForService} connexion(s) actives pour ${p.app}`
                              : 'Aucune connexion active détectée'}
                          </Typography>
                          {p.rabbitmq?.lastLine && (
                            <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace', mt: 0.5 }}>
                              {p.rabbitmq.lastLine}
                            </Typography>
                          )}
                        </Box>

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
