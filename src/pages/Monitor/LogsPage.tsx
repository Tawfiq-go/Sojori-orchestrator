import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import { FiltersPanel } from '../../features/monitoring/logs/components/FiltersPanel';
import { LogsTable } from '../../features/monitoring/logs/components/LogsTable';
import { LogDetailModal } from '../../features/monitoring/logs/components/LogDetailModal';
import { useFilters } from '../../features/monitoring/logs/hooks/useFilters';
import {
  useLogs,
  LOGS_PAGE_SIZE,
  type LogEntry,
} from '../../features/monitoring/logs/hooks/useLogs';
import {
  Badge,
  MonitorKpiStrip,
  MonitorPageFrame,
  MonitorSection,
  MonitorToolbarRow,
  TablePagination,
  btnGhostSx,
  monitorTokens as t,
} from '../../features/monitoring/shared/MonitorDesign';

export default function LogsPage() {
  const { filters, updateFilter, patchFilters, clearFilters } = useFilters();
  const [page, setPage] = useState(1);
  // Cursor stack: index 0 unused; page N uses cursors[N] as `before` (page 1 = null).
  const [cursors, setCursors] = useState<(number | null)[]>([null]);
  const before = page > 1 ? cursors[page] ?? null : null;
  const { logs, stats, hasMore, nextBefore, loading, error, rangeWarning, refetch } = useLogs(
    filters,
    page,
    before,
  );
  const [live, setLive] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  // Reset pagination whenever filters change.
  useEffect(() => {
    setPage(1);
    setCursors([null]);
  }, [filters]);

  // Remember the next-page cursor when Loki returns one.
  useEffect(() => {
    if (nextBefore == null) return;
    setCursors((prev) => {
      const next = [...prev];
      next[page + 1] = nextBefore;
      return next;
    });
  }, [nextBefore, page]);

  useEffect(() => {
    if (!live) return;
    const interval = setInterval(() => void refetch(), 30000);
    return () => clearInterval(interval);
  }, [live, refetch]);

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1 || nextPage === page) return;
      if (nextPage < page) {
        setPage(nextPage);
        return;
      }
      // Moving forward requires a cursor from the current page.
      const cursor = cursors[nextPage] ?? nextBefore;
      if (!hasMore || cursor == null) return;
      setCursors((prev) => {
        const copy = [...prev];
        copy[nextPage] = cursor;
        return copy;
      });
      setPage(nextPage);
    },
    [page, hasMore, cursors, nextBefore],
  );

  const totalPages = Math.max(page + (hasMore ? 1 : 0), page);

  const visibleSeverityCounts = useMemo(() => {
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

  const severityCounts = {
    critical: stats.critical ?? visibleSeverityCounts.critical,
    error: stats.error ?? visibleSeverityCounts.error,
    warning: stats.warning ?? visibleSeverityCounts.warning,
    // Info KPI only when explicitly requested (avoid implying a full-stream count).
    info:
      filters.severity === 'info' || filters.severity === 'everything'
        ? (stats.info ?? visibleSeverityCounts.info)
        : visibleSeverityCounts.info,
  };

  return (
    <MonitorPageFrame>
      <MonitorToolbarRow
        left={
          <Badge variant="neutral">
            {logs.length} ligne(s) · p.{page}
          </Badge>
        }
        right={
          <>
            <Button sx={btnGhostSx} onClick={() => setLive((v) => !v)}>
              <Badge variant={live ? 'success' : 'neutral'} dot>
                {live ? 'Live' : 'Pause'}
              </Badge>
            </Button>
            <Button
              sx={btnGhostSx}
              onClick={() => {
                setPage(1);
                setCursors([null]);
                void refetch();
              }}
              disabled={loading}
            >
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
            label:
              filters.severity === 'info' || filters.severity === 'everything'
                ? 'Info'
                : 'Info (page)',
            value: severityCounts.info,
            tone: 'info',
          },
        ]}
      />

      <MonitorSection dense title="Filtres" desc="Service, niveau, recherche">
        <FiltersPanel
          filters={filters}
          onFilterChange={updateFilter}
          onPatchFilters={patchFilters}
          onClear={clearFilters}
          stats={stats}
        />
      </MonitorSection>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {rangeWarning ? <Alert severity="warning">{rangeWarning}</Alert> : null}

      <MonitorSection
        dense
        title="Journal"
        headRight={<Badge variant="neutral">{logs.length}</Badge>}
      >
        <Box sx={{ mx: -1.5, mb: -1.5 }}>
          <LogsTable
            logs={logs}
            loading={loading}
            onLogClick={setSelectedLog}
            footer={
              <Stack
                direction="row"
                sx={{ alignItems: 'center', justifyContent: 'space-between', width: '100%' }}
              >
                <Typography sx={{ fontSize: 12, color: t.text3 }}>
                  {LOGS_PAGE_SIZE}/page · page {page}
                  {hasMore ? '+' : ''}
                </Typography>
                <TablePagination
                  page={page}
                  totalPages={totalPages}
                  onChange={handlePageChange}
                />
              </Stack>
            }
          />
        </Box>
      </MonitorSection>

      <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
    </MonitorPageFrame>
  );
}
