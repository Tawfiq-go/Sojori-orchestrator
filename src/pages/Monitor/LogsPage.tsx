import React, { useState, useMemo, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { FiltersPanel } from '../../features/monitoring/logs/components/FiltersPanel';
import { LogsTable } from '../../features/monitoring/logs/components/LogsTable';
import { LogDetailModal } from '../../features/monitoring/logs/components/LogDetailModal';
import { useFilters } from '../../features/monitoring/logs/hooks/useFilters';
import { useLogs, type LogEntry } from '../../features/monitoring/logs/hooks/useLogs';
import {
  Badge,
  MonitorKpiStrip,
  MonitorPageFrame,
  MonitorSection,
  MonitorToolbarRow,
  btnGhostSx,
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
      <MonitorToolbarRow
        left={
          <Badge variant="neutral">{logs.length} ligne(s)</Badge>
        }
        right={
          <>
            <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
              <Badge variant={live ? 'success' : 'neutral'} dot>
                {live ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button sx={btnGhostSx} onClick={() => void refetch()} disabled={loading}>
              {loading ? '…' : 'Actualiser'}
            </Button>
          </>
        }
      />

      <MonitorKpiStrip
        items={[
          {
            label: 'Critical',
            value: severityCounts.critical,
            tone: severityCounts.critical > 0 ? 'error' : 'neutral',
          },
          {
            label: 'Error',
            value: severityCounts.error,
            tone: severityCounts.error > 0 ? 'error' : 'neutral',
          },
          {
            label: 'Warning',
            value: severityCounts.warning,
            tone: severityCounts.warning > 0 ? 'warning' : 'neutral',
          },
          {
            label: 'Info',
            value: severityCounts.info,
            tone: 'info',
          },
        ]}
      />

      <MonitorSection dense title="Filtres" desc="Service, niveau, recherche">
        <FiltersPanel
          filters={filters}
          onFilterChange={updateFilter}
          onClear={clearFilters}
          stats={stats}
        />
      </MonitorSection>

      <MonitorSection dense title="Journal" headRight={<Badge variant="neutral">{logs.length}</Badge>}>
        <Box sx={{ mx: -1.5, mb: -1.5 }}>
          <LogsTable logs={logs} loading={loading} onLogClick={setSelectedLog} />
        </Box>
      </MonitorSection>

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </MonitorPageFrame>
  );
}
