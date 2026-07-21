import { useCallback, useEffect, useRef, useState } from 'react';
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

function entryTimeMs(entry: LogEntry): number {
  const ts = entry.timestamp;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  const parsed = Date.parse(String(ts));
  return Number.isNaN(parsed) ? NaN : parsed;
}

/** Keep only rows inside the requested custom window (guards undeployed API). */
function clampLogsToCustomRange(rows: LogEntry[], filters: LogsFilters): {
  rows: LogEntry[];
  clamped: boolean;
} {
  if (filters.timeRange !== 'custom' || !filters.startAt || !filters.endAt) {
    return { rows, clamped: false };
  }
  const startMs = Date.parse(filters.startAt);
  const endMs = Date.parse(filters.endAt);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return { rows, clamped: false };

  const filtered = rows.filter((row) => {
    const t = entryTimeMs(row);
    if (Number.isNaN(t)) return true;
    return t >= startMs && t <= endMs;
  });
  return { rows: filtered, clamped: filtered.length < rows.length };
}

function friendlyError(err: unknown): string {
  const apiError = err as {
    response?: { data?: { error?: string; details?: string }; status?: number };
    message?: string;
  };
  const details =
    apiError.response?.data?.details ||
    apiError.response?.data?.error ||
    apiError.message ||
    '';
  const text = String(details);
  if (/too many outstanding requests/i.test(text)) {
    return 'Loki est saturé (trop de requêtes en parallèle). Attends quelques secondes, utilise 1 h, ou applique la période une seule fois.';
  }
  if (/timeout of \d+ms exceeded/i.test(text)) {
    return 'Loki a mis trop longtemps à répondre. Raccourcis la période ou filtre un service.';
  }
  if (/Invalid timeRange|Custom range requires/i.test(text)) {
    return 'La période personnalisée n’est pas encore supportée par l’API déployée (srv-logs-proxy). Utilise 1 h / 6 h / 24 h en attendant le déploiement.';
  }
  return text || 'Impossible de charger les logs.';
}

function toQueryParams(
  filters: LogsFilters,
  before?: number | null,
): Record<string, string | undefined> {
  const isCustom = filters.timeRange === 'custom';
  const startIso =
    isCustom && filters.startAt ? new Date(filters.startAt).toISOString() : undefined;
  const endIso =
    isCustom && filters.endAt ? new Date(filters.endAt).toISOString() : undefined;

  return {
    timeRange: isCustom ? 'custom' : filters.timeRange,
    start: startIso,
    end: endIso,
    service: filters.service !== 'all' ? filters.service : undefined,
    severity: filters.severity === 'all' ? undefined : filters.severity,
    search: filters.search.trim() || undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    limit: String(LOGS_PAGE_SIZE),
    before: before != null ? String(before) : undefined,
    sortTime: 'desc',
  };
}

function toStatsParams(filters: LogsFilters): Record<string, string | undefined> {
  const isCustom = filters.timeRange === 'custom';
  return {
    timeRange: isCustom ? 'custom' : filters.timeRange,
    start:
      isCustom && filters.startAt ? new Date(filters.startAt).toISOString() : undefined,
    end: isCustom && filters.endAt ? new Date(filters.endAt).toISOString() : undefined,
    service: filters.service !== 'all' ? filters.service : undefined,
    search: filters.search.trim() || undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    includeInfo: wantsInfoVolume(filters.severity) ? '1' : undefined,
  };
}

function shouldFetchStats(filters: LogsFilters): boolean {
  // Stats = 3 Loki metric queries. Skip on long custom windows to avoid overload.
  if (filters.timeRange === 'custom') {
    const startMs = Date.parse(filters.startAt);
    const endMs = Date.parse(filters.endAt);
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
    return endMs - startMs <= 6 * 60 * 60 * 1000;
  }
  return filters.timeRange === '1h' || filters.timeRange === '6h';
}

export function useLogs(filters: LogsFilters, page: number, before: number | null) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogsStats>({});
  const [hasMore, setHasMore] = useState(false);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const refetch = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setRangeWarning(null);

    try {
      if (filters.timeRange === 'custom') {
        const startMs = Date.parse(filters.startAt);
        const endMs = Date.parse(filters.endAt);
        if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
          throw new Error('Période personnalisée invalide.');
        }
        if (endMs <= startMs) {
          throw new Error('La date de fin doit être après la date de début.');
        }
        if (endMs - startMs > 7 * 24 * 60 * 60 * 1000) {
          throw new Error('La période personnalisée est limitée à 7 jours.');
        }
      }

      const params = toQueryParams(filters, page > 1 ? before : null);

      // Journal first — never compete with 3 stats metric queries on the same tick.
      const logsRes = await logsProxyGet<LogsQueryResponse>('/query', params, {
        signal: controller.signal,
      });
      if (requestId !== requestIdRef.current) return;

      const rawRows = logsRes.data?.logs ?? [];
      const { rows, clamped } = clampLogsToCustomRange(rawRows, filters);
      if (clamped) {
        setRangeWarning(
          'L’API a renvoyé des logs hors période (srv-logs-proxy pas à jour ou Loki saturé). Affichage filtré côté client.',
        );
      }

      setLogs(
        rows.map((row, idx) => ({
          ...row,
          logId: row.logId || `${row.service || 'log'}-${idx}-${String(row.timestamp)}`,
        })),
      );
      setHasMore(Boolean(logsRes.data?.hasMore) && !clamped);
      setNextBefore(
        typeof logsRes.data?.nextBefore === 'number' ? logsRes.data.nextBefore : null,
      );

      if (!shouldFetchStats(filters)) {
        setStats((prev) => ({
          ...prev,
          partial: true,
          totalLogs: prev.totalLogs ?? null,
        }));
        return;
      }

      try {
        const statsRes = await logsProxyGet<LogsStatsResponse>('/stats', toStatsParams(filters), {
          signal: controller.signal,
        });
        if (requestId !== requestIdRef.current) return;
        const s = statsRes.data?.stats ?? {};
        setStats({
          ...s,
          totalLogs: statsRes.data?.totalLogs ?? s.totalLogs,
          topServices: statsRes.data?.topServices ?? s.topServices,
          services: statsRes.data?.services ?? s.services,
        });
      } catch (statsErr) {
        if (controller.signal.aborted) return;
        console.warn('[Logs] stats fetch failed (journal still shown):', statsErr);
        setStats((prev) => ({ ...prev, partial: true }));
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      if (requestId !== requestIdRef.current) return;
      console.error('[Logs] fetch failed:', err);
      setError(friendlyError(err));
      setLogs([]);
      setHasMore(false);
      setNextBefore(null);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, page, before]);

  useEffect(() => {
    void refetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [refetch]);

  return { logs, stats, hasMore, nextBefore, loading, error, rangeWarning, refetch };
}
