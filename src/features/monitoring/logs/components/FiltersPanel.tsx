import { useEffect, useState } from 'react';
import { Button, Stack, TextField, Typography } from '@mui/material';
import {
  FilterBar,
  FilterChip,
  btnGhostSx,
  monitorTokens as t,
} from '../../shared/MonitorDesign';
import type { LogsFilters } from '../hooks/useFilters';
import type { LogsStats } from '../hooks/useLogs';

const TIME_RANGES = [
  { value: '1h', label: '1 h' },
  { value: '6h', label: '6 h' },
  { value: '24h', label: '24 h' },
  { value: '7d', label: '7 j' },
  { value: 'custom', label: 'Période…' },
] as const;

const SEVERITIES = [
  { value: 'all', label: 'Alertes' },
  { value: 'critical', label: 'Critical' },
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
  { value: 'everything', label: 'Tout (+info)' },
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
  onPatchFilters?: (patch: Partial<LogsFilters>) => void;
  onClear: () => void;
  stats?: LogsStats;
}

export function FiltersPanel({
  filters,
  onFilterChange,
  onPatchFilters,
  onClear,
  stats,
}: FiltersPanelProps) {
  const services = Array.from(new Set([...DEFAULT_SERVICES, ...(stats?.services || [])]));
  const infoHeavy = filters.severity === 'info' || filters.severity === 'everything';
  const isCustom = filters.timeRange === 'custom';

  // Draft dates — only commit on "Appliquer" so we don't flood Loki on every click.
  const [draftStart, setDraftStart] = useState(filters.startAt);
  const [draftEnd, setDraftEnd] = useState(filters.endAt);

  useEffect(() => {
    setDraftStart(filters.startAt);
    setDraftEnd(filters.endAt);
  }, [filters.startAt, filters.endAt]);

  const applyCustomRange = () => {
    if (onPatchFilters) {
      onPatchFilters({ timeRange: 'custom', startAt: draftStart, endAt: draftEnd });
      return;
    }
    onFilterChange('startAt', draftStart);
    onFilterChange('endAt', draftEnd);
    if (filters.timeRange !== 'custom') {
      onFilterChange('timeRange', 'custom');
    }
  };

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

      {isCustom ? (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.25}
          sx={{ alignItems: { sm: 'center' }, flexWrap: 'wrap' }}
        >
          <TextField
            size="small"
            label="Du"
            type="datetime-local"
            value={draftStart}
            onChange={(e) => setDraftStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ maxWidth: 240 }}
          />
          <TextField
            size="small"
            label="Au"
            type="datetime-local"
            value={draftEnd}
            onChange={(e) => setDraftEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ maxWidth: 240 }}
          />
          <Button
            sx={{ ...btnGhostSx, minHeight: 36 }}
            onClick={applyCustomRange}
            disabled={
              draftStart === filters.startAt &&
              draftEnd === filters.endAt &&
              filters.timeRange === 'custom'
            }
          >
            Appliquer
          </Button>
          <Typography sx={{ fontSize: 11, color: t.text3 }}>Max 7 jours</Typography>
        </Stack>
      ) : null}

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
          {stats.partial ? ' · compteurs partiels' : ''}
        </Typography>
      )}

      {infoHeavy ? (
        <Typography sx={{ fontSize: 11, color: '#b45309' }}>
          Info / Tout charge beaucoup plus de lignes Loki — préfère une période courte (1 h) et la
          pagination.
        </Typography>
      ) : null}

      <FilterChip label="Réinitialiser" onClick={onClear} />
    </Stack>
  );
}
