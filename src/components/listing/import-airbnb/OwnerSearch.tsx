// ════════════════════════════════════════════════════════════════════
// OwnerSearch.tsx — Phase A (admin) : autocomplete propriétaire
// ════════════════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from 'react';
import { Box, Stack, Typography, TextField, InputAdornment, CircularProgress } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { T, initials } from './_tokens';
import type { Owner } from './_tokens';

export interface OwnerSearchProps {
  /** Branchez ici votre `getOwners()` — debounced côté hook si besoin */
  searchOwners: (query: string) => Promise<Owner[]>;
  selectedOwner: Owner | null;
  onSelect: (owner: Owner) => void;
}

const AVATAR_COLORS = [
  'linear-gradient(135deg, #fcd34d, #d97706)',
  'linear-gradient(135deg, #86efac, #16a34a)',
  'linear-gradient(135deg, #a5f3fc, #0e7490)',
  'linear-gradient(135deg, #ddd6fe, #7c3aed)',
  'linear-gradient(135deg, #fda4af, #ec4899)',
];

export default function OwnerSearch({ searchOwners, selectedOwner, onSelect }: OwnerSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (query.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const r = await searchOwners(query);
        if (!cancelled) setResults(r);
      } finally { if (!cancelled) setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, searchOwners]);

  return (
    <Box>
      <TextField
        fullWidth autoFocus value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Rechercher un propriétaire (nom, email)…"
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ ml: 0.5 }}>
                <SearchIcon sx={{ fontSize: 18, color: T.text3 }} />
              </InputAdornment>
            ),
            endAdornment: loading && (
              <InputAdornment position="end">
                <CircularProgress size={16} sx={{ color: T.primary }} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          mb: 2.25,
          '& .MuiOutlinedInput-root': {
            borderRadius: 1.25, bgcolor: T.bg1,
            '& fieldset': { borderColor: T.border },
            '&:hover fieldset': { borderColor: T.borderStrong },
            '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 1.5, boxShadow: `0 0 0 3px ${T.primaryTint}` },
          },
        }}
      />

      {results.length > 0 && (
        <Typography sx={{
          fontSize: 10.5, fontWeight: 700, color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.75,
        }}>{results.length} résultat{results.length > 1 ? 's' : ''}</Typography>
      )}

      <Stack gap={0.875}>
        {results.map((owner, i) => {
          const active = selectedOwner?._id === owner._id;
          const fullName = `${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.email;
          return (
            <Box key={owner._id} onClick={() => onSelect(owner)}
              sx={{
                p: '11px 14px', border: '1px solid', borderColor: active ? T.primary : T.border,
                borderRadius: 1.25, bgcolor: active ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
                background: active ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5,
                transition: 'all 0.15s',
                boxShadow: active ? `0 0 0 3px ${T.primaryTint}` : 'none',
                '&:hover': {
                  borderColor: active ? T.primary : T.borderStrong,
                  transform: 'translateY(-1px)',
                  boxShadow: active ? `0 0 0 3px ${T.primaryTint}` : '0 4px 12px -4px rgba(20,17,10,0.08)',
                },
              }}
            >
              <Box sx={{
                width: 34, height: 34, borderRadius: '50%',
                background: AVATAR_COLORS[i % AVATAR_COLORS.length], color: '#fff',
                fontFamily: '"Geist Mono", monospace', fontSize: 12, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, letterSpacing: '-0.005em',
              }}>{initials(fullName)}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{fullName}</Typography>
                <Typography sx={{ fontSize: 11.5, color: T.text3, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                  {owner.email}
                </Typography>
              </Box>
              {owner.airbnbPropertiesCount != null && (
                <Box sx={{
                  fontFamily: '"Geist Mono", monospace', fontSize: 9.5, fontWeight: 700,
                  bgcolor: T.bg2, color: T.text3,
                  px: 0.875, py: '1px', borderRadius: '99px', letterSpacing: '0.04em',
                  flexShrink: 0,
                }}>AIRBNB · {owner.airbnbPropertiesCount} annonce{owner.airbnbPropertiesCount > 1 ? 's' : ''}</Box>
              )}
            </Box>
          );
        })}
      </Stack>

      {!loading && query.length > 0 && results.length === 0 && (
        <Typography sx={{ p: 3, textAlign: 'center', color: T.text3, fontSize: 12 }}>
          Aucun propriétaire trouvé.
        </Typography>
      )}
    </Box>
  );
}
