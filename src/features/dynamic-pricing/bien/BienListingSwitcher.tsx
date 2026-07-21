import { useMemo } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import type { PortfolioRow } from '../_tokens';
import { T } from '../_tokens';
import { listingMatchesCityScope, normalizeCityKey } from '../cityScope';

export type BienListingOption = {
  id: string;
  name: string;
  city: string;
  district: string | null;
  bedrooms: number;
};

export function buildBienListingOptions(
  rows: PortfolioRow[],
  cityScope: string | null,
): BienListingOption[] {
  return rows
    .filter((r) => r.listingActive !== false)
    .filter((r) => listingMatchesCityScope(r.listing.city, cityScope))
    .map((r) => ({
      id: r.listing._id,
      name: r.listing.name,
      city: normalizeCityKey(r.listing.city),
      district: r.listing.district?.trim() || null,
      bedrooms: r.listing.bedrooms ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

function optionSearchText(o: BienListingOption): string {
  return [o.name, o.city, o.district ?? '', o.id, o.bedrooms ? `${o.bedrooms} ch` : '']
    .join(' ')
    .toLowerCase();
}

export interface BienListingSwitcherProps {
  rows: PortfolioRow[];
  currentListingId: string;
  cityScope: string | null;
  loading?: boolean;
  onSelect: (listingId: string, cityKey: string | null) => void;
}

export default function BienListingSwitcher({
  rows,
  currentListingId,
  cityScope,
  loading = false,
  onSelect,
}: BienListingSwitcherProps) {
  const options = useMemo(
    () => buildBienListingOptions(rows, cityScope),
    [rows, cityScope],
  );

  const selected = useMemo(() => {
    const found = options.find((o) => o.id === currentListingId);
    if (found) return found;
    const row = rows.find((r) => r.listing._id === currentListingId);
    if (!row) return null;
    return {
      id: row.listing._id,
      name: row.listing.name,
      city: normalizeCityKey(row.listing.city),
      district: row.listing.district?.trim() || null,
      bedrooms: row.listing.bedrooms ?? 0,
    } satisfies BienListingOption;
  }, [options, currentListingId, rows]);

  const displayOptions = useMemo(() => {
    if (!selected || options.some((o) => o.id === selected.id)) return options;
    return [selected, ...options];
  }, [options, selected]);

  const scopeHint =
    cityScope != null
      ? `${options.length} bien${options.length > 1 ? 's' : ''} · ${cityScope}`
      : `${options.length} biens · toutes villes`;

  return (
    <Box sx={{ minWidth: { xs: '100%', sm: 240 }, maxWidth: { xs: '100%', md: 420 }, flex: '1 1 240px' }}>
      <Autocomplete
        size="small"
        loading={loading}
        options={displayOptions}
        value={selected}
        disabled={loading || options.length === 0}
        onChange={(_, v) => {
          if (!v || v.id === currentListingId) return;
          onSelect(v.id, v.city !== '—' ? v.city : cityScope);
        }}
        getOptionLabel={(o) => o.name}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        filterOptions={(opts, state) => {
          const q = state.inputValue.trim().toLowerCase();
          if (!q) return opts;
          return opts.filter((o) => optionSearchText(o).includes(q));
        }}
        slotProps={{
          popper: { sx: { zIndex: 1400 } },
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: T.bg1,
            fontSize: 13,
            fontWeight: 700,
            '& fieldset': { borderColor: T.borderStrong },
            '&:hover fieldset': { borderColor: T.gold },
            '&.Mui-focused fieldset': { borderColor: T.goldDeep },
          },
        }}
        renderOption={(props, option) => {
          const { key, ...rest } = props as typeof props & { key: string };
          const meta = [
            option.city !== '—' && !cityScope ? option.city : null,
            option.district,
            option.bedrooms ? `${option.bedrooms} ch.` : null,
          ]
            .filter(Boolean)
            .join(' · ');
          return (
            <Box component="li" key={key} {...rest}>
              <Box sx={{ minWidth: 0, width: '100%' }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.25 }} noWrap>
                  {option.name}
                </Typography>
                {meta ? (
                  <Typography sx={{ fontSize: 10.5, color: T.text3, lineHeight: 1.2 }} noWrap>
                    {meta}
                  </Typography>
                ) : null}
              </Box>
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Changer de bien"
            placeholder="Rechercher…"
            helperText={scopeHint}
            FormHelperTextProps={{
              sx: { mx: 0, mt: 0.35, fontSize: 10, color: T.text3 },
            }}
            InputLabelProps={{ sx: { fontSize: 12 } }}
          />
        )}
      />
    </Box>
  );
}
