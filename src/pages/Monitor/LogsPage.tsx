import React, { useState, useMemo, useEffect } from 'react';
import { Box, Stack } from '@mui/material';
import { FiltersPanel } from '../../features/monitoring/logs/components/FiltersPanel';
import { LogsTable } from '../../features/monitoring/logs/components/LogsTable';
import { LogDetailModal } from '../../features/monitoring/logs/components/LogDetailModal';
import { useFilters } from '../../features/monitoring/logs/hooks/useFilters';
import { useLogs, type LogEntry } from '../../features/monitoring/logs/hooks/useLogs';
import {
  Badge,
  MonitorPageFrame,
  MonitorPageHeader,
  Panel,
  StatCard,
  StatsRow,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

export default function LogsPage() {
  const { filters, updateFilter, clearFilters } = useFilters();
  const { logs, stats, loading, refetch } = useLogs(filters);
  const [live, setLive] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [live, refetch]);

  const severityCounts = useMemo(() => {
    const counts = { critical: 0, error: 0, warning: 0, info: 0 };
    logs.forEach((log) => {
      const severity = (log.severity || log.level || '').toLowerCase();
      if (severity === 'critical') counts.critical++;
      else if (severity === 'error' || severity === 'fatal') counts.error++;
      else if (severity === 'warning' || severity === 'warn') counts.warning++;
      else counts.info++;
    });
    return counts;
  }, [logs]);

  return (
    <MonitorPageFrame>
      <MonitorPageHeader
        accent="logs"
        title="Logs applicatifs"
        subtitle="Filtrage par service, niveau et recherche full-text"
        count={`${logs.length} ligne(s)`}
        live={live}
        onToggleLive={() => setLive((v) => !v)}
        onRefresh={() => void refetch()}
        loading={loading}
      />

      <StatsRow>
        <StatCard
          icon="🔴"
          iconBg={t.errorTint}
          iconColor={t.error}
          value={String(severityCounts.critical)}
          label="Critical"
        />
        <StatCard
          icon="❌"
          iconBg={t.errorTint}
          iconColor={t.error}
          value={String(severityCounts.error)}
          label="Error"
        />
        <StatCard
          icon="⚠️"
          iconBg={t.warningTint}
          iconColor={t.warning}
          value={String(severityCounts.warning)}
          label="Warning"
        />
        <StatCard
          icon="ℹ️"
          iconBg={t.infoTint}
          iconColor={t.info}
          value={String(severityCounts.info)}
          label="Info"
        />
      </StatsRow>

      <Panel sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          spacing={2}
          sx={{ alignItems: { lg: 'flex-start' } }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <FiltersPanel
              filters={filters}
              onFilterChange={updateFilter}
              onClear={clearFilters}
              stats={stats}
            />
          </Box>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap',  flexShrink: 0 }}>
            <Badge variant="error" dot>
              Critical {severityCounts.critical}
            </Badge>
            <Badge variant="error">Error {severityCounts.error}</Badge>
            <Badge variant="warning">Warning {severityCounts.warning}</Badge>
            <Badge variant="info">Info {severityCounts.info}</Badge>
          </Stack>
        </Stack>
      </Panel>

      <Panel sx={{ p: 0, overflow: 'hidden' }}>
        <LogsTable logs={logs} loading={loading} onLogClick={setSelectedLog} />
      </Panel>

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </MonitorPageFrame>
  );
}
