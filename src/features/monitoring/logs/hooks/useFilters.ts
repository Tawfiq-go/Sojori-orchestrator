import { useCallback, useState } from 'react';

export type LogsTimeRange = '1h' | '6h' | '24h' | '7d';

export type LogsSeverity = 'all' | 'critical' | 'error' | 'warning' | 'info';

export interface LogsFilters {
  timeRange: LogsTimeRange;
  service: string;
  severity: LogsSeverity;
  search: string;
  category: string;
}

const DEFAULT_FILTERS: LogsFilters = {
  timeRange: '1h',
  service: 'all',
  severity: 'all',
  search: '',
  category: 'all',
};

export function useFilters() {
  const [filters, setFilters] = useState<LogsFilters>(DEFAULT_FILTERS);

  const updateFilter = useCallback(<K extends keyof LogsFilters>(key: K, value: LogsFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  return { filters, updateFilter, clearFilters };
}
