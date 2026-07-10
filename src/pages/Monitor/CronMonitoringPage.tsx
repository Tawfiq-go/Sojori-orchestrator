/**
 * Cron Monitoring — agrège les cron jobs de tous les services backend (srv-cron,
 * srv-channels, srv-calendar, srv-dynamic-pricing, srv-fulltask, srv-logs-proxy).
 * Toggle/run-now réservés Admin/SuperAdmin (backend protège déjà, ceinture+bretelles côté UI).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Button, Stack, Switch, Typography } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import { monitoringGet } from '../../utils/monitoringApi';
import apiClient from '../../services/apiClient';
import {
  Badge,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  btnGhostSx,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

interface AggregatedCronJob {
  cronId: string;
  service: string;
  label: string;
  description: string;
  schedules: string[];
  enabled: boolean;
  readOnly: boolean;
  lastRun: string | null;
  lastDurationMs: number | null;
  lastError: string | null;
  toggleUrl?: string;
  runNowUrl?: string;
}

function CompactStat({ icon, iconColor, value, label }: { icon: string; iconColor: string; value: string; label: string }) {
  return (
    <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', py: 0.25 }}>
      <Box sx={{ fontSize: 14, color: iconColor, lineHeight: 1 }}>{icon}</Box>
      <Typography sx={{ fontSize: 15, fontWeight: 800, color: t.text, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: 11.5, color: t.text3, lineHeight: 1 }}>{label}</Typography>
    </Stack>
  );
}

function CompactStatsRow({ children }: { children: React.ReactNode }) {
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

function formatClock(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDurationMs(ms?: number | null): string {
  if (ms === undefined || ms === null) return '—';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const SERVICE_LABEL: Record<string, string> = {
  'srv-cron': 'srv-cron',
  'srv-channels': 'srv-channels',
  'srv-calendar': 'srv-calendar',
  'srv-dynamic-pricing': 'srv-dynamic-pricing',
  'srv-fulltask': 'srv-fulltask',
  'srv-logs-proxy': 'srv-logs-proxy',
};

export default function CronMonitoringPage() {
  const { user } = useAuth();
  const canManage = user?.role === Roles.Admin || user?.role === Roles.SuperAdmin;

  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<AggregatedCronJob[]>([]);
  const [serviceErrors, setServiceErrors] = useState<Record<string, string>>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<string>('all');

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await monitoringGet<{ success: boolean; data: { jobs: AggregatedCronJob[]; serviceErrors: Record<string, string> } }>('/cron');
      if (res.data.success) {
        setJobs(res.data.data.jobs || []);
        setServiceErrors(res.data.data.serviceErrors || {});
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [isLive, fetchJobs]);

  const services = useMemo(() => {
    const set = new Set(jobs.map((j) => j.service));
    return Array.from(set);
  }, [jobs]);

  const visibleJobs = useMemo(
    () => (serviceFilter === 'all' ? jobs : jobs.filter((j) => j.service === serviceFilter)),
    [jobs, serviceFilter],
  );

  const failing = jobs.filter((j) => j.lastError);
  const disabled = jobs.filter((j) => !j.enabled && !j.readOnly);

  const handleToggle = useCallback(
    async (job: AggregatedCronJob) => {
      const key = `${job.service}:${job.cronId}`;
      setPendingAction(key);
      try {
        await apiClient.post(`/api/monitoring/cron/${job.service}/${job.cronId}/toggle`, { enabled: !job.enabled });
        await fetchJobs();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau';
        setError(msg);
      } finally {
        setPendingAction(null);
      }
    },
    [fetchJobs],
  );

  const handleRunNow = useCallback(
    async (job: AggregatedCronJob) => {
      if (!job.runNowUrl) return;
      const key = `${job.service}:${job.cronId}:run`;
      setPendingAction(key);
      try {
        await apiClient.post(`/api/monitoring/cron/${job.service}/${job.cronId}/run-now`, { runNowUrl: job.runNowUrl });
        await fetchJobs();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Erreur réseau';
        setError(msg);
      } finally {
        setPendingAction(null);
      }
    },
    [fetchJobs],
  );

  if (loading && jobs.length === 0) {
    return (
      <MonitorPageFrame>
        <MonitorLoading label="Chargement des cron jobs…" />
      </MonitorPageFrame>
    );
  }

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="infra"
        title="Cron"
        subtitle="Cron jobs de tous les services backend — statut, dernière exécution, activation"
        live={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        onRefresh={() => void fetchJobs()}
        loading={loading}
      />

      {error ? <MonitorError message={error} onRetry={() => void fetchJobs()} /> : null}

      {Object.keys(serviceErrors).length > 0 && (
        <MonitorError
          message={`Services injoignables : ${Object.entries(serviceErrors)
            .map(([svc, e]) => `${svc} (${e})`)
            .join(', ')}`}
          onRetry={() => void fetchJobs()}
        />
      )}

      <CompactStatsRow>
        <CompactStat icon="⏱️" iconColor={t.text2} value={String(jobs.length)} label="Cron jobs" />
        <CompactStat icon="🧩" iconColor={t.text2} value={String(services.length)} label="Services" />
        <CompactStat icon="⛔" iconColor={t.warning} value={String(disabled.length)} label="Désactivés" />
        <CompactStat icon="🔴" iconColor={t.error} value={String(failing.length)} label="Dernière exécution en erreur" />
      </CompactStatsRow>

      <Stack direction="row" spacing={0.75} sx={{ mb: 2, flexWrap: 'wrap', rowGap: 0.75 }}>
        <Button sx={btnGhostSx} variant={serviceFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setServiceFilter('all')}>
          Tous
        </Button>
        {services.map((svc) => (
          <Button key={svc} sx={btnGhostSx} variant={serviceFilter === svc ? 'contained' : 'outlined'} onClick={() => setServiceFilter(svc)}>
            {SERVICE_LABEL[svc] || svc}
          </Button>
        ))}
      </Stack>

      <MonitorSection title="Cron jobs" desc={`${visibleJobs.length} job(s)`}>
        {visibleJobs.length === 0 ? (
          <MonitorEmpty message="Aucun cron job trouvé." />
        ) : (
          <Stack spacing={1}>
            {visibleJobs.map((job) => {
              const key = `${job.service}:${job.cronId}`;
              const toggling = pendingAction === key;
              const running = pendingAction === `${key}:run`;
              return (
                <Box
                  key={key}
                  sx={{
                    borderRadius: '10px',
                    border: `1px solid ${job.lastError ? t.error : t.border}`,
                    bgcolor: t.bg2,
                    p: 1.5,
                  }}
                >
                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.25, flexWrap: 'wrap' }}>
                        <Badge variant="neutral">{SERVICE_LABEL[job.service] || job.service}</Badge>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: t.text }}>{job.label}</Typography>
                        {job.readOnly && <Badge variant="neutral">lecture seule</Badge>}
                      </Stack>
                      <Typography sx={{ fontSize: 11.5, color: t.text3, mb: 0.5 }}>{job.description}</Typography>
                      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', rowGap: 0.25 }}>
                        <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'monospace' }}>
                          {job.schedules.join(' · ')}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: t.text3 }}>
                          Dernière exec: {formatClock(job.lastRun)}
                          {job.lastDurationMs != null ? ` · ${formatDurationMs(job.lastDurationMs)}` : ''}
                        </Typography>
                      </Stack>
                      {job.lastError && (
                        <Typography sx={{ fontSize: 11, color: t.error, fontFamily: 'monospace', mt: 0.5 }}>
                          {job.lastError}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexShrink: 0 }}>
                      <Badge variant={job.enabled ? 'success' : 'neutral'} dot>
                        {job.enabled ? 'actif' : 'désactivé'}
                      </Badge>
                      {job.runNowUrl && canManage && (
                        <Button sx={btnGhostSx} disabled={running} onClick={() => void handleRunNow(job)}>
                          {running ? '…' : 'Relancer'}
                        </Button>
                      )}
                      {job.toggleUrl && canManage && (
                        <Switch
                          checked={job.enabled}
                          disabled={toggling}
                          onChange={() => void handleToggle(job)}
                          size="small"
                        />
                      )}
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        )}
      </MonitorSection>
    </MonitorPageFrame>
  );
}
