import { useEffect, useState } from 'react';
import { Autocomplete, Box, Chip, TextField, Typography } from '@mui/material';
import { listingsService } from '../../../../services/listingsService';
import { SOJORI_TOKENS as T } from './types';
import { TYPO } from './SHARED';

export type CityAssociation = 'all' | string[];

type CityOption = { _id: string; name: string };

export function isCityAssociationAll(value: CityAssociation | undefined): boolean {
  return value === 'all' || value === undefined || (Array.isArray(value) && value.length === 0);
}

export function formatCityAssociationSummary(
  value: CityAssociation | undefined,
  cities: CityOption[],
): string {
  if (isCityAssociationAll(value)) return 'Toutes les villes';
  const ids = value as string[];
  const names = cities.filter((c) => ids.includes(c._id)).map((c) => c.name);
  if (names.length) return names.join(', ');
  return `${ids.length} ville${ids.length > 1 ? 's' : ''}`;
}

interface Props {
  value: CityAssociation | undefined;
  onChange: (next: CityAssociation) => void;
  compact?: boolean;
}

export default function CityAssociationField({ value, onChange, compact = false }: Props) {
  const [cities, setCities] = useState<CityOption[]>([]);
  const isAll = isCityAssociationAll(value);
  const selectedIds = isAll ? [] : (value as string[]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await listingsService.getCities({ limit: 200 });
        const list = (res?.data?.cities ?? res?.data ?? res ?? []) as CityOption[];
        if (!cancelled && Array.isArray(list)) setCities(list.filter((c) => c._id && c.name));
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = cities.filter((c) => selectedIds.includes(c._id));

  return (
    <Box sx={{ mt: compact ? 0 : 1 }}>
      {!compact && (
        <Typography sx={{ ...TYPO.monoHelp, fontSize: 10.5, mb: 0.5 }}>
          Villes Sojori — vide = toutes les villes
        </Typography>
      )}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
        <Chip
          size="small"
          label="Toutes les villes"
          color={isAll ? 'primary' : 'default'}
          variant={isAll ? 'filled' : 'outlined'}
          onClick={() => onChange('all')}
          sx={{ fontSize: 11 }}
        />
      </Box>
      <Autocomplete
        multiple
        size="small"
        options={cities}
        value={selected}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a._id === b._id}
        onChange={(_, opts) => {
          if (!opts.length) onChange('all');
          else onChange(opts.map((o) => o._id));
        }}
        renderInput={(params) => (
          <TextField {...params} placeholder="Marrakech, Casablanca…" label="Villes ciblées" />
        )}
        sx={{
          '& .MuiOutlinedInput-root': { fontSize: 12, bgcolor: T.bg1 },
        }}
      />
    </Box>
  );
}
