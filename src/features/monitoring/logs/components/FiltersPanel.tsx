import { Stack, TextField, Typography } from '@mui/material';
import {
  FilterBar,
  FilterChip,
  monitorTokens as t,
} from '../../shared/MonitorDesign';
import type { LogsFilters } from '../hooks/useFilters';
import type { LogsStats } from '../hooks/useLogs';

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
] as const;

const SEVERITIES = [
  { value: 'all', label: 'Tous niveaux' },
  { value: 'critical', label: 'Critical' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
] as const;

const DEFAULT_SERVICES = [
  'all',
  'srv-reservations',
  'srv-fullchatbot',
  'srv-fulltask',
  'srv-user',
  'srv-admin',
  'srv-calendar',
  'srv-sockets',
  'srv-orchestrator',
];

interface FiltersPanelProps {
  filters: LogsFilters;
  onFilterChange: <K extends keyof LogsFilters>(key: K, value: LogsFilters[K]) => void;
  onClear: () => void;
  stats?: LogsStats;
}

export function FiltersPanel({ filters, onFilterChange, onClear, stats }: FiltersPanelProps) {
  const services = Array.from(new Set([...DEFAULT_SERVICES, ...(stats?.services || [])]));
  return (
    <Stack spacing={1.5}>
      <FilterBar>
        {TIME_RANGES.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            active={filters.timeRange === opt.value}
            onClick={() => onFilterChange('timeRange', opt.value)}
          />
        ))}
      </FilterBar>

      <FilterBar>
        {SEVERITIES.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            active={filters.severity === opt.value}
            onClick={() => onFilterChange('severity', opt.value)}
          />
        ))}
      </FilterBar>

      <FilterBar>
        {services.map((svc) => (
          <FilterChip
            key={svc}
            label={svc === 'all' ? 'Tous services' : svc.replace('srv-', '')}
            active={filters.service === svc}
            onClick={() => onFilterChange('service', svc)}
          />
        ))}
      </FilterBar>

      <TextField
        size="small"
        placeholder="Recherche dans le message…"
        value={filters.search}
        onChange={(e) => onFilterChange('search', e.target.value)}
        sx={{ maxWidth: 420 }}
      />

      {stats?.totalLogs != null && (
        <Typography sx={{ fontSize: 11, color: t.text3 }}>
          {stats.totalLogs} log(s) indexés sur la période
        </Typography>
      )}

      <FilterChip label="Réinitialiser" onClick={onClear} />
    </Stack>
  );
}
