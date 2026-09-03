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

interface AuthEventRow {
  _id: string;
  event: string;
  email?: string;
  role?: string;
  ip?: string;
  country?: string;
  reason?: string;
  actorEmail?: string;
  createdAt: string;
}

interface AdminAccessRow {
  adminId: string;
  adminEmail: string;
  adminRole: string;
  ownerId: string;
  ownerEmail: string;
  service: string;
  requests: number;
  firstAt: string;
  lastAt: string;
  ips: string[];
  paths: string[];
}

interface AdminActivityRow {
  sessionId: string;
  adminEmail: string;
  ownerLabel: string;
  ownerEmail: string;
  ip?: string;
  startedAt: string;
  lastSeenAt: string;
  ended: boolean;
  pageViews: number;
  paths: string[];
}

/** Libellés lisibles du journal d'authentification (srv-user AuthEvent). */
const AUTH_EVENT_LABEL: Record<string, { label: string; tone: 'success' | 'error' | 'warning' | 'neutral' | 'info' }> = {
  login_ok: { label: 'Connexion', tone: 'success' },
  mfa_ok: { label: 'Connexion 2FA', tone: 'success' },
  mfa_enrolled: { label: '2FA activée', tone: 'success' },
  mfa_challenge: { label: 'Code 2FA demandé', tone: 'info' },
  mfa_enroll_required: { label: 'Enrôlement 2FA requis', tone: 'info' },
  logout: { label: 'Déconnexion', tone: 'neutral' },
  session_revoked: { label: 'Session révoquée', tone: 'warning' },
  login_failed: { label: 'Mot de passe refusé', tone: 'error' },
  mfa_failed: { label: 'Code 2FA refusé', tone: 'error' },
  mfa_too_many_attempts: { label: '2FA : trop d’essais', tone: 'error' },
  login_rate_limited: { label: 'IP bloquée (brute force)', tone: 'error' },
  login_origin_refused: { label: 'Origine refusée', tone: 'error' },
  login_admin_email_refused: { label: 'Admin hors @sojori.com', tone: 'error' },
};

const FAILURE_EVENTS = new Set([
  'login_failed',
  'mfa_failed',
  'mfa_too_many_attempts',
  'login_rate_limited',
  'login_origin_refused',
  'login_admin_email_refused',
]);

function fmtDate(iso?: string): string {
  return iso ? new Date(iso).toLocaleString('fr-FR') : '—';
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
  const [authEvents, setAuthEvents] = useState<AuthEventRow[]>([]);
  const [adminActivity, setAdminActivity] = useState<AdminActivityRow[]>([]);
  const [adminAccess, setAdminAccess] = useState<AdminAccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [alertsRes, metricsRes, sessionsRes, suspiciousRes, eventsRes, activityRes, accessRes] =
        await Promise.allSettled([
          apiClient.get('/logs/api/prometheus-proxy/alerts'),
          apiClient.get('/logs/api/prometheus-proxy/security-metrics'),
          apiClient.get('/user/user/sessions?limit=50'),
          apiClient.get('/user/user/sessions/suspicious?hours=24'),
          apiClient.get('/user/user/security/auth-events?hours=168&limit=100'),
          apiClient.get('/user/user/security/admin-activity?hours=720&limit=50'),
          apiClient.get('/user/user/security/admin-access?hours=720&limit=100'),
        ]);

      if (accessRes.status === 'fulfilled') {
        setAdminAccess(accessRes.value?.data?.data?.access ?? []);
      }

      if (eventsRes.status === 'fulfilled') {
        setAuthEvents(eventsRes.value?.data?.data?.events ?? []);
      }
      if (activityRes.status === 'fulfilled') {
        setAdminActivity(activityRes.value?.data?.data?.sessions ?? []);
      }

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
  const authFailures = authEvents.filter((e) => FAILURE_EVENTS.has(e.event));

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
          {
            label: 'Connexions refusées (7 j)',
            value: authFailures.length,
            tone: authFailures.length > 10 ? 'warning' : 'neutral',
          },
          {
            label: 'Séances admin → owner (30 j)',
            value: adminActivity.length,
            tone: 'info',
          },
        ]}
      />

      <MonitorSection title="Qui a regardé quoi — séances admin sur un compte owner (30 j)">
        {adminActivity.length === 0 ? (
          <MonitorEmpty message="Aucune consultation admin d’un compte owner sur 30 jours." />
        ) : (
          <Stack spacing={0.75}>
            {adminActivity.map((s2) => (
              <Box
                key={s2.sessionId}
                sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${t.border}`, bgcolor: t.surface }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.25 }}>
                  <Badge variant={s2.ended ? 'neutral' : 'warning'}>
                    {s2.ended ? 'terminée' : 'en cours'}
                  </Badge>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink }}>
                    {s2.adminEmail || 'admin inconnu'}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.inkSoft }}>→</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink }}>
                    {s2.ownerLabel || s2.ownerEmail || 'owner inconnu'}
                  </Typography>
                  {s2.ownerEmail && s2.ownerLabel ? (
                    <Typography sx={{ fontSize: 12, color: t.inkSoft }}>{s2.ownerEmail}</Typography>
                  ) : null}
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: t.inkSoft }}>
                  {fmtDate(s2.startedAt)} → {fmtDate(s2.lastSeenAt)} · {s2.pageViews} page
                  {s2.pageViews > 1 ? 's' : ''} · {s2.ip || 'IP —'}
                </Typography>
                {s2.paths.length > 0 ? (
                  <Typography
                    sx={{ fontSize: 12, color: t.inkSoft, fontFamily: 'monospace', mt: 0.25 }}
                    noWrap
                    title={s2.paths.join('  ')}
                  >
                    {s2.paths.slice(0, 8).join('  ')}
                    {s2.paths.length > 8 ? `  … +${s2.paths.length - 8}` : ''}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        )}
      </MonitorSection>

      <MonitorSection title="Lectures admin vues par les services (30 j) — trace serveur">
        {adminAccess.length === 0 ? (
          <MonitorEmpty message="Aucune lecture admin d’un compte owner enregistrée par les services." />
        ) : (
          <Stack spacing={0.5}>
            {adminAccess.map((r) => (
              <Box
                key={`${r.adminId}-${r.ownerId}-${r.service}`}
                sx={{ p: 1.25, borderRadius: 1, border: `1px solid ${t.border}`, bgcolor: t.surface }}
              >
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.25 }}>
                  <Badge variant="info">{r.service}</Badge>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink }}>
                    {r.adminEmail || r.adminId.slice(-8)}
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: t.inkSoft }}>→</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.ink }}>
                    {r.ownerEmail || r.ownerId.slice(-8)}
                  </Typography>
                  <Typography sx={{ fontSize: 12.5, color: t.inkSoft }}>
                    {r.requests} requête{r.requests > 1 ? 's' : ''}
                  </Typography>
                </Stack>
                <Typography sx={{ fontSize: 12.5, color: t.inkSoft }}>
                  {fmtDate(r.firstAt)} → {fmtDate(r.lastAt)}
                  {r.ips.length ? ` · ${r.ips.join(', ')}` : ''}
                </Typography>
                {r.paths.length > 0 ? (
                  <Typography
                    sx={{ fontSize: 12, color: t.inkSoft, fontFamily: 'monospace', mt: 0.25 }}
                    noWrap
                    title={r.paths.join('  ')}
                  >
                    {r.paths.slice(0, 6).join('  ')}
                    {r.paths.length > 6 ? `  … +${r.paths.length - 6}` : ''}
                  </Typography>
                ) : null}
              </Box>
            ))}
          </Stack>
        )}
      </MonitorSection>

      <MonitorSection title="Journal des connexions (7 j)">
        {authEvents.length === 0 ? (
          <MonitorEmpty message="Aucun événement d’authentification enregistré." />
        ) : (
          <Stack spacing={0.4}>
            {authEvents.map((e) => {
              const meta = AUTH_EVENT_LABEL[e.event] ?? { label: e.event, tone: 'neutral' as const };
              return (
                <Stack key={e._id} direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Badge variant={meta.tone}>{meta.label}</Badge>
                  <Typography sx={{ fontSize: 13, color: t.ink, fontWeight: 600 }}>
                    {e.email || '—'}
                  </Typography>
                  {e.role ? (
                    <Typography sx={{ fontSize: 12, color: t.inkSoft }}>{e.role}</Typography>
                  ) : null}
                  <Typography sx={{ fontSize: 12.5, color: t.inkSoft }}>
                    {e.country ? `[${e.country}] ` : ''}
                    {e.ip || '—'} · {fmtDate(e.createdAt)}
                    {e.reason ? ` · ${e.reason}` : ''}
                    {e.actorEmail ? ` · par ${e.actorEmail}` : ''}
                  </Typography>
                </Stack>
              );
            })}
          </Stack>
        )}
      </MonitorSection>

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
                  <Badge variant={toneForSeverity(a.labels?.severity)}>
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
                  <Badge variant="error">
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
                <Badge variant="error">5xx</Badge> {e.host ?? '—'} : {(e.value ?? 0).toFixed(2)}/s
              </Typography>
            ))}
            {(metrics?.client_errors ?? []).map((e, i) => (
              <Typography key={`c${i}`} sx={{ fontSize: 13, color: t.inkSoft }}>
                <Badge variant="warning">4xx</Badge> {e.host ?? '—'} : {(e.value ?? 0).toFixed(2)}/s
              </Typography>
            ))}
          </Stack>
        )}
      </MonitorSection>
    </MonitorPageFrame>
  );
}
