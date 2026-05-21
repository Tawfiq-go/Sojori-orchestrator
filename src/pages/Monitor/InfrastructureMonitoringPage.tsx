/**
 * Infrastructure Monitoring — design Sojori V2 (MonitorDesign)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import apiClient from '../../services/apiClient';
import {
  Badge,
  DataTable,
  MonitorEmpty,
  MonitorError,
  MonitorLoading,
  MonitorPageFrame,
  MonitorPageHeader,
  MonitorSection,
  StatCard,
  StatsRow,
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
      <Box sx={{ minWidth: 100 }}>
        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{percent.toFixed(1)}%</Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, percent)}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: t.bg2,
            '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
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
      <MonitorSection title={title}>
        {items.length === 0 ? (
          <MonitorEmpty message="Aucune donnée." />
        ) : (
          <Stack spacing={1}>
            {items.slice(0, 8).map((c, idx) => (
              <Box
                key={`${c.pod}-${idx}`}
                sx={{
                  p: 1.25,
                  borderRadius: '8px',
                  border: `1px solid ${t.border}`,
                  bgcolor: t.bg2,
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.text }} noWrap>
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
      <MonitorPageHeader
        accent="infra"
        title="Infrastructure"
        subtitle="Volumes persistants, consommation CPU/RAM et santé des pods"
        live={isLive}
        onToggleLive={() => setIsLive((v) => !v)}
        onRefresh={() => void fetchInfrastructureData()}
        loading={loading}
      />

      {error ? <MonitorError message={error} onRetry={() => void fetchInfrastructureData()} /> : null}

      {storageData && (
        <>
          <StatsRow>
            <StatCard
              icon="💾"
              iconBg={t.infoTint}
              iconColor={t.info}
              value={String(storageData.summary.total)}
              label="Volumes"
            />
            <StatCard
              icon="✅"
              iconBg={t.successTint}
              iconColor={t.success}
              value={String(storageData.summary.ok)}
              label="OK"
            />
            <StatCard
              icon="⚠️"
              iconBg={t.warningTint}
              iconColor={t.warning}
              value={String(storageData.summary.warning)}
              label="Alerte"
            />
            <StatCard
              icon="🔴"
              iconBg={t.errorTint}
              iconColor={t.error}
              value={String(storageData.summary.critical)}
              label="Critique"
            />
          </StatsRow>

          <MonitorSection title="Stockage (PV)" desc={`${storageData.volumes.length} volume(s)`}>
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
                      <Typography sx={{ fontSize: 12 }}>
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
            gap: 2,
            mb: 2.5,
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

      {containersData?.summary && (
        <StatsRow>
          <StatCard
            icon="📦"
            iconBg={t.bg2}
            iconColor={t.text2}
            value={String(containersData.summary.total_containers ?? 0)}
            label="Conteneurs"
          />
          <StatCard
            icon="🔥"
            iconBg={t.errorTint}
            iconColor={t.error}
            value={String(containersData.summary.cpu_critical ?? 0)}
            label="CPU critique"
          />
          <StatCard
            icon="⚠️"
            iconBg={t.warningTint}
            iconColor={t.warning}
            value={String(containersData.summary.cpu_warning ?? 0)}
            label="CPU alerte"
          />
          <StatCard
            icon="🧠"
            iconBg={t.errorTint}
            iconColor={t.error}
            value={String(containersData.summary.memory_critical ?? 0)}
            label="RAM critique"
          />
        </StatsRow>
      )}

      {podsData && (
        <>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
              gap: 1.75,
              mb: 2.5,
            }}
          >
            {[
              { label: 'Pods', value: podsData.summary.total, icon: '📦' },
              { label: 'Running', value: podsData.summary.running, icon: '▶️', variant: 'success' as const },
              { label: 'Pending', value: podsData.summary.pending, icon: '⏳', variant: 'warning' as const },
              { label: 'Failed', value: podsData.summary.failed, icon: '❌', variant: 'error' as const },
              { label: 'Healthy', value: podsData.summary.healthy, icon: '💚', variant: 'success' as const },
              { label: 'Unhealthy', value: podsData.summary.unhealthy, icon: '💔', variant: 'error' as const },
            ].map((k) => (
              <StatCard
                key={k.label}
                icon={k.icon}
                iconBg={
                  k.variant === 'success'
                    ? t.successTint
                    : k.variant === 'warning'
                      ? t.warningTint
                      : k.variant === 'error'
                        ? t.errorTint
                        : t.bg2
                }
                iconColor={
                  k.variant === 'success'
                    ? t.success
                    : k.variant === 'warning'
                      ? t.warning
                      : k.variant === 'error'
                        ? t.error
                        : t.text2
                }
                value={String(k.value ?? 0)}
                label={k.label}
              />
            ))}
          </Box>

          {podsWithIssues.length > 0 ? (
            <MonitorSection
              title="Pods avec anomalies"
              desc={`${podsWithIssues.length} pod(s)`}
            >
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
                          fontSize: 12,
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
                      <Stack direction="row" flexWrap="wrap" gap={0.5}>
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
            <MonitorSection title="Santé des pods">
              <MonitorEmpty message="Aucun pod en anomalie détecté." />
            </MonitorSection>
          )}
        </>
      )}
    </MonitorPageFrame>
  );
}
