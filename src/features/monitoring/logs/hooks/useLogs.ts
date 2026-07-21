import { useCallback, useEffect, useState } from 'react';
import { logsProxyGet } from '../../../../utils/monitoringApi';
import type { LogsFilters } from './useFilters';

export const LOGS_PAGE_SIZE = 50;

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
  info?: number | null;
  totalLogs?: number | null;
  topServices?: { service: string; errorCount: number }[];
  services?: string[];
  partial?: boolean;
}

interface LogsQueryResponse {
  logs?: LogEntry[];
  count?: number;
  hasMore?: boolean;
  nextBefore?: number | null;
  limit?: number;
}

interface LogsStatsResponse {
  stats?: LogsStats;
  totalLogs?: number | null;
  topServices?: LogsStats['topServices'];
  services?: string[];
}

function wantsInfoVolume(severity: LogsFilters['severity']): boolean {
  return severity === 'info' || severity === 'everything';
}

function toQueryParams(
  filters: LogsFilters,
  before?: number | null,
): Record<string, string | undefined> {
  return {
    timeRange: filters.timeRange,
    service: filters.service !== 'all' ? filters.service : undefined,
    // Backend: omitted/`all` = alerts only; `everything` = incl. info
    severity: filters.severity === 'all' ? undefined : filters.severity,
    search: filters.search.trim() || undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    limit: String(LOGS_PAGE_SIZE),
    before: before != null ? String(before) : undefined,
    sortTime: 'desc',
  };
}

export function useLogs(filters: LogsFilters, page: number, before: number | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogsStats>({});
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = toQueryParams(filters, page > 1 ? before : null);
      const includeInfo = wantsInfoVolume(filters.severity);

      // Stats must not block the journal: a Loki stats timeout used to wipe the whole page.
      const [logsSettled, statsSettled] = await Promise.allSettled([
        logsProxyGet<LogsQueryResponse>('/query', params),
        logsProxyGet<LogsStatsResponse>('/stats', {
          timeRange: filters.timeRange,
          service: filters.service !== 'all' ? filters.service : undefined,
          search: filters.search.trim() || undefined,
          category: filters.category !== 'all' ? filters.category : undefined,
          includeInfo: includeInfo ? '1' : undefined,
        }),
      ]);

      if (logsSettled.status === 'rejected') {
        const err = logsSettled.reason as {
          response?: { data?: { error?: string; details?: string } };
          message?: string;
        };
        throw err;
      }

      const logsRes = logsSettled.value;
      const rows = logsRes.data?.logs ?? [];
      setLogs(
        rows.map((row, idx) => ({
          ...row,
          logId: row.logId || `${row.service || 'log'}-${idx}-${String(row.timestamp)}`,
        })),
      );
      setHasMore(Boolean(logsRes.data?.hasMore));
      setNextBefore(
        typeof logsRes.data?.nextBefore === 'number' ? logsRes.data.nextBefore : null,
      );

      if (statsSettled.status === 'fulfilled') {
        const statsRes = statsSettled.value;
        const s = statsRes.data?.stats ?? {};
        setStats({
          ...s,
          totalLogs: statsRes.data?.totalLogs ?? s.totalLogs,
          topServices: statsRes.data?.topServices ?? s.topServices,
          services: statsRes.data?.services ?? s.services,
        });
      } else {
        console.warn('[Logs] stats fetch failed (journal still shown):', statsSettled.reason);
        setStats((prev) => ({ ...prev, partial: true }));
      }
    } catch (err) {
      console.error('[Logs] fetch failed:', err);
      const apiError = err as {
        response?: { data?: { error?: string; details?: string } };
        message?: string;
      };
      setError(
        apiError.response?.data?.details ||
          apiError.response?.data?.error ||
          apiError.message ||
          'Impossible de charger les logs.',
      );
      setLogs([]);
      setHasMore(false);
      setNextBefore(null);
    } finally {
      setLoading(false);
    }
  }, [filters, page, before]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { logs, stats, hasMore, nextBefore, loading, error, refetch };
}
