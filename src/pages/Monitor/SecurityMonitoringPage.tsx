/**
 * Onglet Sécurité — alertes et signaux d'intrusion.
 *
 * Créé le 2026-09-02, après l'incident de phishing du 01/09. Un onglet
 * « Security » existait mais avait été retiré (LEGACY_TAB) : il interrogeait
 * auth_failures_total / rate_limit_exceeded_total / http_requests_total,
 * trois métriques absentes de ce cluster — la page était donc vide.
 *
 * Depuis l'ajout du ServiceMonitor nginx, nginx_ingress_controller_requests
 * est disponible : ce sont les vraies métriques d'entrée de la production.
 */
import { useState, useEffect, useCallback } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import {
  Badge,
  MonitorEmpty,
  MonitorError,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageFrame,
  MonitorSection,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

interface PromAlert {
  labels?: { alertname?: string; severity?: string; category?: string };
  annotations?: { summary?: string; description?: string };
  state?: string;
  activeAt?: string;
}

interface SessionRow {
  jti: string;
  accountId: string;
  ip?: string;
  country?: string;
  lastSeenAt?: string;
}

interface SuspiciousRow {
  jti: string;
  accountId: string;
  reason: string;
  detail: string;
  ip?: string;
  country?: string;
}

interface SecurityMetrics {
  auth_failures?: number;
  forbidden?: number;
  total_requests?: number;
  client_errors?: Array<{ host?: string; value?: number }>;
  server_errors?: Array<{ host?: string; value?: number }>;
}

function toneForSeverity(sev?: string): 'error' | 'warning' | 'neutral' {
  if (sev === 'critical') return 'error';
  if (sev === 'warning') return 'warning';
  return 'neutral';
}

export default function SecurityMonitoringPage() {
  const [alerts, setAlerts] = useState<PromAlert[]>([]);
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [suspicious, setSuspicious] = useState<SuspiciousRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, metricsRes, sessionsRes, suspiciousRes] = await Promise.allSettled([
        apiClient.get('/logs/api/prometheus-proxy/alerts'),
        apiClient.get('/logs/api/prometheus-proxy/security-metrics'),
        apiClient.get('/user/user/sessions?limit=50'),
        apiClient.get('/user/user/sessions/suspicious?hours=24'),
      ]);

      if (sessionsRes.status === 'fulfilled') {
        setSessions(sessionsRes.value?.data?.data?.sessions ?? []);
      }
      if (suspiciousRes.status === 'fulfilled') {
        setSuspicious(suspiciousRes.value?.data?.data?.suspicious ?? []);
      }

      if (alertsRes.status === 'fulfilled') {
        const raw = alertsRes.value?.data?.data?.alerts ?? alertsRes.value?.data?.alerts ?? [];
        setAlerts(Array.isArray(raw) ? raw : []);
      }
      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value?.data?.data ?? metricsRes.value?.data ?? null);
      }
      if (alertsRes.status === 'rejected' && metricsRes.status === 'rejected') {
        setError("Impossible de joindre Prometheus — vérifier srv-logs-proxy.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !metrics && alerts.length === 0) return <MonitorLoading />;
  if (error) return <MonitorError message={error} onRetry={() => void load()} />;

  // Les alertes de sécurité portent category=security (PrometheusRule
  // sojori-security-rules) ; les autres viennent des règles d'infra.
  const securityAlerts = alerts.filter((a) => a.labels?.category === 'security');
  const firing = securityAlerts.filter((a) => a.state === 'firing');

  return (
    <MonitorPageFrame>
      <MonitorKpiStrip
        items={[
          {
            label: 'Alertes sécurité actives',
            value: firing.length,
            tone: firing.length > 0 ? 'error' : 'success',
          },
          {
            label: 'Auth refusées (1 h)',
            value: Math.round(metrics?.auth_failures ?? 0),
            tone: (metrics?.auth_failures ?? 0) > 50 ? 'warning' : 'neutral',
          },
          {
            label: 'Accès interdits (1 h)',
            value: Math.round(metrics?.forbidden ?? 0),
            tone: (metrics?.forbidden ?? 0) > 50 ? 'warning' : 'neutral',
          },
          {
            label: 'Requêtes/s',
            value: (metrics?.total_requests ?? 0).toFixed(1),
            tone: 'info',
          },
          {
            label: 'Sessions actives',
            value: sessions.length,
            tone: 'neutral',
          },
          {
            label: 'Sessions suspectes',
            value: suspicious.length,
            tone: suspicious.length > 0 ? 'error' : 'success',
          },
        ]}
      />

      <MonitorSection title="Alertes actives">
        {firing.length === 0 ? (
          <MonitorEmpty message="Aucune alerte de sécurité active." />
        ) : (
          <Stack spacing={1}>
            {firing.map((a, i) => (
              <Box
                key={`${a.labels?.alertname}-${i}`}
                sx={{
                  p: 1.5,
                  borderRadius: 1,
                  border: `1px solid ${t.border}`,
                  bgcolor: t.surface,
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Badge tone={toneForSeverity(a.labels?.severity)}>
                    {a.labels?.severity ?? 'info'}
                  </Badge>
                  <Typography sx={{ fontWeight: 600, color: t.ink }}>
                    {a.labels?.alertname ?? 'Alerte'}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 13, color: t.inkSoft }}>
                  {a.annotations?.description ?? a.annotations?.summary ?? ''}
                </Typography>
              </Box>
            ))}
          </Stack>
        )}
      </MonitorSection>

      <MonitorSection title="Sessions suspectes">
        {suspicious.length === 0 ? (
          <MonitorEmpty message="Aucune session suspecte sur 24 h." />
        ) : (
          <Stack spacing={1}>
            {suspicious.map((s2) => (
              <Box
                key={s2.jti}
                sx={{ p: 1.5, borderRadius: 1, border: `1px solid ${t.border}`, bgcolor: t.surface }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <Badge tone="error">
                    {s2.reason === 'multi_country' ? 'multi-pays' : 'multi-IP'}
                  </Badge>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink }}>
                    compte {s2.accountId?.slice(-8)}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 13, color: t.inkSoft }}>{s2.detail}</Typography>
              </Box>
            ))}
          </Stack>
        )}
      </MonitorSection>

      <MonitorSection title="Sessions actives">
        {sessions.length === 0 ? (
          <MonitorEmpty message="Aucune session enregistrée." />
        ) : (
          <Stack spacing={0.5}>
            {sessions.slice(0, 20).map((s2) => (
              <Typography key={s2.jti} sx={{ fontSize: 13, color: t.inkSoft }}>
                {s2.country ? `[${s2.country}] ` : ''}
                {s2.ip || '—'} · compte {s2.accountId?.slice(-8)} ·{' '}
                {s2.lastSeenAt ? new Date(s2.lastSeenAt).toLocaleString('fr-FR') : '—'}
              </Typography>
            ))}
          </Stack>
        )}
      </MonitorSection>

      <MonitorSection title="Erreurs par hôte">
        {!metrics?.client_errors?.length && !metrics?.server_errors?.length ? (
          <MonitorEmpty message="Aucune erreur sur la période." />
        ) : (
          <Stack spacing={0.5}>
            {(metrics?.server_errors ?? []).map((e, i) => (
              <Typography key={`s${i}`} sx={{ fontSize: 13, color: t.ink }}>
                <Badge tone="error">5xx</Badge> {e.host ?? '—'} : {(e.value ?? 0).toFixed(2)}/s
              </Typography>
            ))}
            {(metrics?.client_errors ?? []).map((e, i) => (
              <Typography key={`c${i}`} sx={{ fontSize: 13, color: t.inkSoft }}>
                <Badge tone="warning">4xx</Badge> {e.host ?? '—'} : {(e.value ?? 0).toFixed(2)}/s
              </Typography>
            ))}
          </Stack>
        )}
      </MonitorSection>
    </MonitorPageFrame>
  );
}
