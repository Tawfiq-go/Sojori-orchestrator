import { useCallback, useEffect, useState } from 'react';
import { logsProxyGet } from '../../../../utils/monitoringApi';
import type { LogsFilters } from './useFilters';

export interface LogEntry {
  logId?: string;
  timestamp: string | Date;
  service?: string;
  level?: string;
  severity?: string;
  message?: string;
  component?: string;
  correlationId?: string;
  traceId?: string;
  namespace?: string;
  podName?: string;
  ownerId?: string;
  reservationNumber?: string;
  listingId?: string;
  stream?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface LogsStats {
  critical?: number;
  error?: number;
  warning?: number;
  info?: number;
  totalLogs?: number;
  topServices?: { service: string; errorCount: number }[];
  services?: string[];
}

interface LogsQueryResponse {
  logs?: LogEntry[];
  count?: number;
}

interface LogsStatsResponse {
  stats?: LogsStats;
  totalLogs?: number;
  topServices?: LogsStats['topServices'];
  services?: string[];
}

function toQueryParams(filters: LogsFilters): Record<string, string | undefined> {
  return {
    timeRange: filters.timeRange,
    service: filters.service !== 'all' ? filters.service : undefined,
    severity: filters.severity !== 'all' ? filters.severity : undefined,
    search: filters.search.trim() || undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    limit: '500',
    sortTime: 'desc',
  };
}

export function useLogs(filters: LogsFilters) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogsStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = toQueryParams(filters);
      const [logsRes, statsRes] = await Promise.all([
        logsProxyGet<LogsQueryResponse>('/query', params),
        logsProxyGet<LogsStatsResponse>('/stats', {
          timeRange: filters.timeRange,
          service: filters.service !== 'all' ? filters.service : undefined,
          search: filters.search.trim() || undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
        }),
      ]);

      const rows = logsRes.data?.logs ?? [];
      setLogs(
        rows.map((row, idx) => ({
          ...row,
          logId: row.logId || `${row.service || 'log'}-${idx}-${String(row.timestamp)}`,
        })),
      );

      const s = statsRes.data?.stats ?? {};
      setStats({
        ...s,
        totalLogs: statsRes.data?.totalLogs ?? s.totalLogs,
        topServices: statsRes.data?.topServices ?? s.topServices,
        services: statsRes.data?.services ?? s.services,
      });
    } catch (err) {
      console.error('[Logs] fetch failed:', err);
      const apiError = err as { response?: { data?: { error?: string; details?: string } }; message?: string };
      setError(
        apiError.response?.data?.details ||
          apiError.response?.data?.error ||
          apiError.message ||
          'Impossible de charger les logs.',
      );
      setLogs([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { logs, stats, loading, error, refetch };
}
