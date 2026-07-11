/**
 * Infrastructure Monitoring — layout dense (même pattern que API / AI).
 */

import { useState, useEffect, useCallback } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorKpiStrip,
  MonitorLoading,
  MonitorPageFrame,
  MonitorSection,
  MonitorToolbarRow,
  btnGhostSx,
  monitorTokens as t,
  severityBadgeVariant,
} from '../../features/monitoring/shared/MonitorDesign';

interface Volume {
  name: string;
  namespace: string;
  usage_percent: number;
  capacity_gb?: number;
  formatted_capacity?: string;
  formatted_used?: string;
  inodes_percent: number;
  status: string;
}

interface ContainerRow {
  pod: string;
  container: string;
  cpu_percent_of_limit: number;
  memory_percent_of_limit: number;
  formatted_memory?: string;
  status: string;
}

interface PodRow {
  name: string;
  status: string;
  restarts: number;
  issues: string[];
  health_status: string;
}

export default function InfrastructureMonitoringPage() {
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storageData, setStorageData] = useState<{
    summary: { total: number; ok: number; warning: number; critical: number };
    volumes: Volume[];
  } | null>(null);
  const [containersData, setContainersData] = useState<{
    cpu_top: ContainerRow[];
    memory_top: ContainerRow[];
    summary?: Record<string, number>;
  } | null>(null);
  const [podsData, setPodsData] = useState<{
    summary: Record<string, number>;
    pods: PodRow[];
  } | null>(null);

  const fetchInfrastructureData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [storageRes, containersRes, podsRes] = await Promise.all([
        apiClient.get('/api/monitoring/infrastructure/storage'),
        apiClient.get('/api/monitoring/infrastructure/containers/top-consumers?limit=10'),
        apiClient.get('/api/monitoring/infrastructure/pods/health'),
      ]);
      if (storageRes.data.success) setStorageData(storageRes.data.data);
      if (containersRes.data.success) setContainersData(containersRes.data.data);
      if (podsRes.data.success) setPodsData(podsRes.data.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erreur réseau';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchInfrastructureData();
  }, [fetchInfrastructureData]);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(fetchInfrastructureData, 30000);
    return () => clearInterval(interval);
  }, [isLive, fetchInfrastructureData]);

  if (loading && !storageData) {
    return (
      <MonitorPageFrame>
        <MonitorLoading label="Chargement infrastructure…" />
      </MonitorPageFrame>
    );
  }

  const podsWithIssues = (podsData?.pods || []).filter((p) => p.issues?.length > 0);

  function UsageBar({ percent, status }: { percent: number; status?: string }) {
    const color =
      status === 'critical' || percent > 90
        ? t.error
        : status === 'warning' || percent > 80
          ? t.warning
          : t.success;
    return (
      <Box sx={{ minWidth: 80 }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 0.25 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>{percent.toFixed(1)}%</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, percent)}
          sx={{
            height: 4,
            borderRadius: 2,
            bgcolor: t.bg2,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 },
          }}
        />
      </Box>
    );
  }

  function ConsumerList({
    title,
    items,
    metricKey,
  }: {
    title: string;
    items: ContainerRow[];
    metricKey: 'cpu_percent_of_limit' | 'memory_percent_of_limit';
  }) {
    return (
      <MonitorSection dense title={title}>
        {items.length === 0 ? (
          <MonitorEmpty message="Aucune donnée." />
        ) : (
          <Stack spacing={0.5}>
            {items.slice(0, 8).map((c, idx) => (
              <Box
                key={`${c.pod}-${idx}`}
                sx={{
                  p: 0.75,
                  borderRadius: '6px',
                  border: `1px solid ${t.border}`,
                  bgcolor: t.bg2,
                }}
              >
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: t.text }} noWrap>
                      {c.container}
                    </Typography>
                    <Typography sx={{ fontSize: 10, color: t.text3 }} noWrap>
                      {c.pod}
                    </Typography>
                  </Box>
                  <Badge variant={severityBadgeVariant(c.status)}>
                    {c[metricKey].toFixed(1)}%
                  </Badge>
                </Stack>
                <UsageBar percent={c[metricKey]} status={c.status} />
              </Box>
            ))}
          </Stack>
        )}
      </MonitorSection>
    );
  }

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <Typography sx={{ fontSize: 12, color: t.text3 }}>
            Volumes, CPU/RAM, santé pods
          </Typography>
        }
        right={
          <>
            <Button sx={btnGhostSx} onClick={() => setIsLive((v) => !v)}>
              <Badge variant={isLive ? 'success' : 'neutral'} dot>
                {isLive ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button sx={btnGhostSx} onClick={() => void fetchInfrastructureData()} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      {error ? <MonitorError message={error} onRetry={() => void fetchInfrastructureData()} /> : null}

      {storageData && (
        <>
          <MonitorKpiStrip
            items={[
              { label: 'Volumes', value: storageData.summary.total, tone: 'neutral' },
              {
                label: 'OK',
                value: storageData.summary.ok,
                tone: 'success',
              },
              {
                label: 'Alerte',
                value: storageData.summary.warning,
                tone: storageData.summary.warning > 0 ? 'warning' : 'neutral',
              },
              {
                label: 'Critique',
                value: storageData.summary.critical,
                tone: storageData.summary.critical > 0 ? 'error' : 'neutral',
              },
              {
                label: 'Pods issues',
                value: podsWithIssues.length,
                tone: podsWithIssues.length > 0 ? 'error' : 'success',
              },
              ...(containersData?.summary
                ? [
                    {
                      label: 'Conteneurs',
                      value: containersData.summary.total_containers ?? 0,
                      tone: 'neutral' as const,
                    },
                    {
                      label: 'CPU critique',
                      value: containersData.summary.cpu_critical ?? 0,
                      tone: (containersData.summary.cpu_critical ?? 0) > 0 ? ('error' as const) : ('neutral' as const),
                    },
                    {
                      label: 'RAM critique',
                      value: containersData.summary.memory_critical ?? 0,
                      tone: (containersData.summary.memory_critical ?? 0) > 0 ? ('error' as const) : ('neutral' as const),
                    },
                  ]
                : []),
              ...(podsData
                ? [
                    { label: 'Pods', value: podsData.summary.total ?? 0, tone: 'neutral' as const },
                    {
                      label: 'Running',
                      value: podsData.summary.running ?? 0,
                      tone: 'success' as const,
                    },
                    {
                      label: 'Unhealthy',
                      value: podsData.summary.unhealthy ?? 0,
                      tone: (podsData.summary.unhealthy ?? 0) > 0 ? ('error' as const) : ('neutral' as const),
                    },
                  ]
                : []),
            ]}
          />

          <MonitorSection dense title="Stockage (PV)" desc={`${storageData.volumes.length} volume(s)`}>
            {storageData.volumes.length === 0 ? (
              <MonitorEmpty message="Aucun volume collecté." />
            ) : (
              <DataTable
                hideRowActions
                columns={[
                  { key: 'name', label: 'Volume', render: (r: Volume & { id: string }) => r.name },
                  { key: 'namespace', label: 'Namespace', render: (r: Volume & { id: string }) => r.namespace },
                  {
                    key: 'usage',
                    label: 'Usage',
                    align: 'right',
                    render: (r: Volume & { id: string }) => <UsageBar percent={r.usage_percent} status={r.status} />,
                  },
                  {
                    key: 'cap',
                    label: 'Capacité',
                    align: 'right',
                    render: (r: Volume & { id: string }) => (
                      <Typography sx={{ fontSize: 11.5 }}>
                        {r.formatted_used && r.formatted_capacity
                          ? `${r.formatted_used} / ${r.formatted_capacity}`
                          : r.formatted_capacity || '—'}
                      </Typography>
                    ),
                  },
                  {
                    key: 'inodes',
                    label: 'Inodes',
                    align: 'right',
                    render: (r: Volume & { id: string }) => `${r.inodes_percent.toFixed(1)}%`,
                  },
                  {
                    key: 'status',
                    label: 'Statut',
                    align: 'center',
                    render: (r: Volume & { id: string }) => (
                      <Badge variant={severityBadgeVariant(r.status)} dot>
                        {r.status}
                      </Badge>
                    ),
                  },
                ]}
                rows={storageData.volumes.map((v, i) => ({ id: v.name || `vol-${i}`, ...v }))}
              />
            )}
          </MonitorSection>
        </>
      )}

      {containersData && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' },
            gap: 1.25,
            mb: 1.25,
          }}
        >
          <ConsumerList
            title="Top CPU"
            items={containersData.cpu_top || []}
            metricKey="cpu_percent_of_limit"
          />
          <ConsumerList
            title="Top mémoire"
            items={containersData.memory_top || []}
            metricKey="memory_percent_of_limit"
          />
        </Box>
      )}

      {podsData && (
        podsWithIssues.length > 0 ? (
          <MonitorSection dense title="Pods avec anomalies" desc={`${podsWithIssues.length} pod(s)`}>
            <DataTable
              hideRowActions
              columns={[
                { key: 'name', label: 'Pod', render: (r: PodRow & { id: string }) => r.name },
                { key: 'status', label: 'Statut K8s', render: (r: PodRow & { id: string }) => r.status },
                {
                  key: 'restarts',
                  label: 'Restarts',
                  align: 'center',
                  render: (r: PodRow & { id: string }) => (
                    <Typography
                      sx={{
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: r.restarts > 0 ? t.warning : t.text3,
                      }}
                    >
                      {r.restarts}
                    </Typography>
                  ),
                },
                {
                  key: 'issues',
                  label: 'Problèmes',
                  render: (r: PodRow & { id: string }) => (
                    <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
                      {r.issues.map((issue, i) => (
                        <Badge key={i} variant="warning">
                          {issue.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </Stack>
                  ),
                },
                {
                  key: 'health',
                  label: 'Santé',
                  align: 'center',
                  render: (r: PodRow & { id: string }) => (
                    <Badge variant={severityBadgeVariant(r.health_status)} dot>
                      {r.health_status}
                    </Badge>
                  ),
                },
              ]}
              rows={podsWithIssues.slice(0, 20).map((p, i) => ({ id: p.name || `pod-${i}`, ...p }))}
            />
          </MonitorSection>
        ) : (
          <MonitorSection dense title="Santé des pods">
            <MonitorEmpty message="Aucun pod en anomalie détecté." />
          </MonitorSection>
        )
      )}
    </MonitorPageFrame>
  );
}
