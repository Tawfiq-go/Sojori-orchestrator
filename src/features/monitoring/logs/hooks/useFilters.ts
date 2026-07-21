import { useCallback, useState } from 'react';

export type LogsTimeRange = '1h' | '6h' | '24h' | '7d' | 'custom';

/** `all` = alert levels only (no info). `everything` = all levels including info. */
export type LogsSeverity =
  | 'all'
  | 'everything'
  | 'critical'
  | 'error'
  | 'warning'
  | 'info';

export interface LogsFilters {
  timeRange: LogsTimeRange;
  /** ISO local datetime (`YYYY-MM-DDTHH:mm`) when timeRange === 'custom' */
  startAt: string;
  endAt: string;
  service: string;
  severity: LogsSeverity;
  search: string;
  category: string;
}

/** datetime-local value helpers (local timezone). */
export function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultCustomRange(): { startAt: string; endAt: string } {
  const end = new Date();
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  return { startAt: toDatetimeLocalValue(start), endAt: toDatetimeLocalValue(end) };
}

const customDefaults = defaultCustomRange();

const DEFAULT_FILTERS: LogsFilters = {
  timeRange: '1h',
  startAt: customDefaults.startAt,
  endAt: customDefaults.endAt,
  service: 'all',
  // Default excludes info — volume of info lines is what made Loki time out.
  severity: 'all',
  search: '',
  category: 'all',
};

export function useFilters() {
  const [filters, setFilters] = useState<LogsFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof LogsFilters>(key: K, value: LogsFilters[K]) => {
    setFilters((prev) => {
      if (key === 'timeRange' && value === 'custom' && prev.timeRange !== 'custom') {
        const range = defaultCustomRange();
        return { ...prev, timeRange: 'custom', startAt: range.startAt, endAt: range.endAt };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const patchFilters = useCallback((patch: Partial<LogsFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearFilters = useCallback(() => {
    const range = defaultCustomRange();
    setFilters({ ...DEFAULT_FILTERS, startAt: range.startAt, endAt: range.endAt });
  }, []);

  return { filters, updateFilter, patchFilters, clearFilters };
}
