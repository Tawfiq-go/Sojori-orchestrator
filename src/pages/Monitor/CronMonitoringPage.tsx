/**
 * Cron Monitoring — agrège les cron jobs de tous les services backend (srv-cron,
 * srv-channels, srv-calendar, srv-dynamic-pricing, srv-fulltask, srv-logs-proxy).
 * Toggle/run-now/schedule réservés Admin/SuperAdmin (backend protège déjà, ceinture+bretelles côté UI).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, Button, MenuItem, Select, Stack, Switch, TextField, Typography } from '@mui/material';
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
  btnPrimarySx,
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
  scheduleUrl?: string;
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

/** Traduit une expression cron 6 ou 5 champs `... M H * * *` / `M H * * *` en "à HH:MM" quand c'est un horaire fixe simple. Sinon renvoie l'expression brute. */
function describeSchedule(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  // 6 champs (node-cron): sec min hour dom month dow — 5 champs (cron standard): min hour dom month dow
  const isSixField = parts.length === 6;
  const min = isSixField ? parts[1] : parts[0];
  const hour = isSixField ? parts[2] : parts[1];
  const dom = isSixField ? parts[3] : parts[2];
  const month = isSixField ? parts[4] : parts[3];
  const dow = isSixField ? parts[5] : parts[4];

  const WEEKDAY_NAMES: Record<string, string> = { '0': 'dim', '1': 'lun', '2': 'mar', '3': 'mer', '4': 'jeu', '5': 'ven', '6': 'sam' };

  // Toutes les X secondes (6 champs uniquement, ex: "*/30 * * * * *")
  if (isSixField && /^\*\/\d+$/.test(parts[0]) && min === '*' && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `toutes les ${parts[0].replace('*/', '')}s`;
  }
  // Toutes les X minutes ("*/15 * * * *")
  const everyMinMatch = min.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `toutes les ${everyMinMatch[1]} min`;
  }
  // Toutes les X heures, à la minute M fixe ("0 */2 * * *")
  const everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (/^\d+$/.test(min) && everyHourMatch && dom === '*' && month === '*' && dow === '*') {
    return `toutes les ${everyHourMatch[1]}h à :${min.padStart(2, '0')}`;
  }
  // Toutes les heures, à la minute M fixe ("0 * * * *")
  if (/^\d+$/.test(min) && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return `toutes les heures à :${min.padStart(2, '0')}`;
  }
  // Jour(s) de semaine fixe(s), heure fixe ("0 9 * * 1,3,5")
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow !== '*') {
    const days = dow.split(',').map((d) => WEEKDAY_NAMES[d] ?? d).join(', ');
    return `${days} à ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  // Tous les jours, heure fixe ("0 5 * * *")
  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && month === '*' && dow === '*') {
    return `tous les jours à ${hour.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  return expr;
}

const SERVICE_LABEL: Record<string, string> = {
  'srv-cron': 'srv-cron',
  'srv-channels': 'srv-channels',
  'srv-calendar': 'srv-calendar',
  'srv-dynamic-pricing': 'srv-dynamic-pricing',
  'srv-fulltask': 'srv-fulltask',
  'srv-logs-proxy': 'srv-logs-proxy',
};

type FreqMode = 'daily' | 'weekly' | 'interval' | 'custom';

interface FreqState {
  mode: FreqMode;
  hour: number;
  minute: number;
  daysOfWeek: number[]; // 0=dimanche … 6=samedi (JS convention)
  intervalMinutes: number;
  custom: string;
}

const WEEKDAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 0, label: 'Dim' },
];

/** Analyse une expression cron (5 ou 6 champs) en état d'éditeur visuel. Retombe sur "custom" si non reconnu. */
function parseScheduleToFreq(expr: string): FreqState {
  const fallback: FreqState = { mode: 'custom', hour: 5, minute: 0, daysOfWeek: [], intervalMinutes: 15, custom: expr };
  const parts = expr.trim().split(/\s+/);
  const isSixField = parts.length === 6;
  const min = isSixField ? parts[1] : parts[0];
  const hour = isSixField ? parts[2] : parts[1];
  const dom = isSixField ? parts[3] : parts[2];
  const month = isSixField ? parts[4] : parts[3];
  const dow = isSixField ? parts[5] : parts[4];
  if (parts.length !== 5 && parts.length !== 6) return fallback;

  // Toutes les X minutes : */X * * * *
  const everyMinMatch = min.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === '*' && dom === '*' && month === '*' && dow === '*') {
    return { ...fallback, mode: 'interval', intervalMinutes: Number(everyMinMatch[1]) };
  }

  if (/^\d+$/.test(min) && /^\d+$/.test(hour) && dom === '*' && month === '*') {
    if (dow === '*') {
      return { ...fallback, mode: 'daily', hour: Number(hour), minute: Number(min) };
    }
    const days = dow.split(',').map(Number).filter((d) => !Number.isNaN(d));
    if (days.length > 0) {
      return { ...fallback, mode: 'weekly', hour: Number(hour), minute: Number(min), daysOfWeek: days };
    }
  }

  return fallback;
}

/** Construit une expression cron 5 champs (min hour dom month dow) à partir de l'état visuel. */
function buildScheduleFromFreq(f: FreqState): string {
  if (f.mode === 'custom') return f.custom.trim();
  if (f.mode === 'interval') return `*/${f.intervalMinutes} * * * *`;
  if (f.mode === 'weekly') return `${f.minute} ${f.hour} * * ${f.daysOfWeek.length ? f.daysOfWeek.join(',') : '*'}`;
  return `${f.minute} ${f.hour} * * *`;
}

function describeFreq(f: FreqState): string {
  const hh = String(f.hour).padStart(2, '0');
  const mm = String(f.minute).padStart(2, '0');
  if (f.mode === 'interval') return `toutes les ${f.intervalMinutes} min`;
  if (f.mode === 'daily') return `tous les jours à ${hh}:${mm}`;
  if (f.mode === 'weekly') {
    const names = WEEKDAYS.filter((w) => f.daysOfWeek.includes(w.value)).map((w) => w.label);
    return `${names.length ? names.join(', ') : 'chaque semaine'} à ${hh}:${mm}`;
  }
  return f.custom;
}

function ScheduleEditor({
  job,
  saving,
  onCancel,
  onSave,
}: {
  job: AggregatedCronJob;
  saving: boolean;
  onCancel: () => void;
  onSave: (expressions: string[]) => void;
}) {
  const [freq, setFreq] = useState<FreqState>(() => parseScheduleToFreq(job.schedules[0] || '0 5 * * *'));

  const previewExpr = buildScheduleFromFreq(freq);
  const isValid = freq.mode === 'custom' ? freq.custom.trim().split(/\s+/).length >= 5 : true;

  return (
    <Box
      sx={{
        mt: 1,
        p: 1.5,
        borderRadius: '10px',
        border: `1px solid ${t.border}`,
        bgcolor: t.bg1,
        minWidth: 320,
      }}
    >
      <Stack direction="row" spacing={0.75} sx={{ mb: 1.25, flexWrap: 'wrap', rowGap: 0.5 }}>
        {(
          [
            ['daily', 'Quotidien'],
            ['weekly', 'Hebdomadaire'],
            ['interval', 'Toutes les X min'],
            ['custom', 'Expression cron'],
          ] as [FreqMode, string][]
        ).map(([mode, label]) => (
          <Button
            key={mode}
            sx={{ ...btnGhostSx, minHeight: 26, px: 1, py: 0.25, fontSize: 11 }}
            variant={freq.mode === mode ? 'contained' : 'outlined'}
            onClick={() => setFreq((f) => ({ ...f, mode }))}
          >
            {label}
          </Button>
        ))}
      </Stack>

      {(freq.mode === 'daily' || freq.mode === 'weekly') && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: freq.mode === 'weekly' ? 1 : 0 }}>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>Heure</Typography>
          <Select
            size="small"
            value={freq.hour}
            onChange={(e) => setFreq((f) => ({ ...f, hour: Number(e.target.value) }))}
            sx={{ fontSize: 12, minWidth: 70 }}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <MenuItem key={h} value={h} sx={{ fontSize: 12 }}>
                {String(h).padStart(2, '0')}h
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={freq.minute}
            onChange={(e) => setFreq((f) => ({ ...f, minute: Number(e.target.value) }))}
            sx={{ fontSize: 12, minWidth: 70 }}
          >
            {[0, 15, 30, 45].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>
                :{String(m).padStart(2, '0')}
              </MenuItem>
            ))}
          </Select>
        </Stack>
      )}

      {freq.mode === 'weekly' && (
        <Stack direction="row" spacing={0.5} sx={{ mb: 0, flexWrap: 'wrap', rowGap: 0.5 }}>
          {WEEKDAYS.map((d) => {
            const active = freq.daysOfWeek.includes(d.value);
            return (
              <Button
                key={d.value}
                sx={{ ...btnGhostSx, minHeight: 24, minWidth: 40, px: 0.5, py: 0.25, fontSize: 10.5 }}
                variant={active ? 'contained' : 'outlined'}
                onClick={() =>
                  setFreq((f) => ({
                    ...f,
                    daysOfWeek: active ? f.daysOfWeek.filter((x) => x !== d.value) : [...f.daysOfWeek, d.value],
                  }))
                }
              >
                {d.label}
              </Button>
            );
          })}
        </Stack>
      )}

      {freq.mode === 'interval' && (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 11.5, color: t.text3 }}>Toutes les</Typography>
          <Select
            size="small"
            value={freq.intervalMinutes}
            onChange={(e) => setFreq((f) => ({ ...f, intervalMinutes: Number(e.target.value) }))}
            sx={{ fontSize: 12, minWidth: 90 }}
          >
            {[5, 10, 15, 30, 45, 60].map((m) => (
              <MenuItem key={m} value={m} sx={{ fontSize: 12 }}>
                {m} min
              </MenuItem>
            ))}
          </Select>
        </Stack>
      )}

      {freq.mode === 'custom' && (
        <TextField
          size="small"
          value={freq.custom}
          onChange={(e) => setFreq((f) => ({ ...f, custom: e.target.value }))}
          placeholder="0 5 * * * (5h chaque jour)"
          sx={{ minWidth: 260, '& input': { fontFamily: 'monospace', fontSize: 12 } }}
        />
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mt: 1.25, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'monospace' }}>
          → {describeFreq(freq)} ({previewExpr})
        </Typography>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button
          sx={btnPrimarySx}
          disabled={saving || !isValid || (freq.mode === 'weekly' && freq.daysOfWeek.length === 0)}
          onClick={() => onSave([previewExpr])}
        >
          {saving ? 'Relance en cours…' : 'Enregistrer et relancer le cron'}
        </Button>
        <Button sx={btnGhostSx} disabled={saving} onClick={onCancel}>
          Annuler
        </Button>
      </Stack>
    </Box>
  );
}

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
  const [editingKey, setEditingKey] = useState<string | null>(null);

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
    if (!isLive || editingKey) return;
    const interval = setInterval(fetchJobs, 30000);
    return () => clearInterval(interval);
  }, [isLive, fetchJobs, editingKey]);

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

  const handleSaveSchedule = useCallback(
    async (job: AggregatedCronJob, expressions: string[]) => {
      const key = `${job.service}:${job.cronId}:schedule`;
      setPendingAction(key);
      try {
        await apiClient.post(`/api/monitoring/cron/${job.service}/${job.cronId}/schedule`, { expressions });
        setEditingKey(null);
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
        subtitle="Cron jobs de tous les services backend — à quoi ils servent, quand ils tournent, activer/désactiver/relancer/reprogrammer"
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
          <Box sx={{ overflowX: 'auto' }}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
              <Box component="thead">
                <Box component="tr">
                  {['Service', 'Job', 'À quoi ça sert', 'Fréquence', 'Statut', 'Dernière exécution', 'Actions'].map((h) => (
                    <Box
                      component="th"
                      key={h}
                      sx={{
                        textAlign: 'left',
                        fontSize: 10.5,
                        fontWeight: 700,
                        color: t.text3,
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em',
                        py: 1,
                        px: 1,
                        borderBottom: `1px solid ${t.border}`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {visibleJobs.map((job) => {
                  const key = `${job.service}:${job.cronId}`;
                  const toggling = pendingAction === key;
                  const running = pendingAction === `${key}:run`;
                  const savingSchedule = pendingAction === `${key}:schedule`;
                  const isEditing = editingKey === key;

                  return (
                    <Box
                      component="tr"
                      key={key}
                      sx={{
                        '&:hover': { bgcolor: t.bg2 },
                        borderBottom: `1px solid ${t.border}`,
                      }}
                    >
                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top' }}>
                        <Badge variant="neutral">{SERVICE_LABEL[job.service] || job.service}</Badge>
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top', minWidth: 160 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{job.label}</Typography>
                        {job.readOnly && (
                          <Badge variant="neutral">lecture seule</Badge>
                        )}
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top', minWidth: 280, maxWidth: 420 }}>
                        <Typography sx={{ fontSize: 11.5, color: t.text2, lineHeight: 1.4 }}>{job.description}</Typography>
                        {job.lastError && (
                          <Typography sx={{ fontSize: 10.5, color: t.error, fontFamily: 'monospace', mt: 0.5 }}>
                            {job.lastError}
                          </Typography>
                        )}
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top', minWidth: 220 }}>
                        {isEditing ? (
                          <ScheduleEditor
                            job={job}
                            saving={savingSchedule}
                            onCancel={() => setEditingKey(null)}
                            onSave={(expressions) => void handleSaveSchedule(job, expressions)}
                          />
                        ) : (
                          <Stack spacing={0.25}>
                            <Typography sx={{ fontSize: 12, color: t.text, fontWeight: 600 }}>
                              {job.schedules.map(describeSchedule).join(' · ')}
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: t.text3, fontFamily: 'monospace' }}>
                              {job.schedules.join(' · ')}
                            </Typography>
                            {job.scheduleUrl && canManage && (
                              <Button
                                sx={{ ...btnGhostSx, minHeight: 24, px: 1, py: 0.25, fontSize: 11, alignSelf: 'flex-start', mt: 0.25 }}
                                onClick={() => setEditingKey(key)}
                              >
                                Modifier la fréquence
                              </Button>
                            )}
                          </Stack>
                        )}
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top' }}>
                        <Badge variant={job.enabled ? 'success' : 'neutral'} dot>
                          {job.enabled ? 'actif' : 'désactivé'}
                        </Badge>
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                        <Typography sx={{ fontSize: 11.5, color: t.text2 }}>{formatClock(job.lastRun)}</Typography>
                        {job.lastDurationMs != null && (
                          <Typography sx={{ fontSize: 10.5, color: t.text3 }}>{formatDurationMs(job.lastDurationMs)}</Typography>
                        )}
                      </Box>

                      <Box component="td" sx={{ py: 1.25, px: 1, verticalAlign: 'top' }}>
                        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                          {job.runNowUrl && canManage && (
                            <Button sx={{ ...btnGhostSx, minHeight: 28, px: 1.25, fontSize: 11.5 }} disabled={running} onClick={() => void handleRunNow(job)}>
                              {running ? '…' : 'Relancer'}
                            </Button>
                          )}
                          {job.toggleUrl && canManage && (
                            <Switch checked={job.enabled} disabled={toggling} onChange={() => void handleToggle(job)} size="small" />
                          )}
                        </Stack>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        )}
      </MonitorSection>
    </MonitorPageFrame>
  );
}
