// ════════════════════════════════════════════════════════════════════
// PropertyList.tsx — Phase B : sélection annonces Airbnb
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Skeleton } from '@mui/material';
import { T } from './_tokens';
import type { RuProperty } from './_tokens';

export interface PropertyListProps {
  properties: RuProperty[];
  selectedIds: string[];
  onToggle: (ruPropertyId: string) => void;
  onSelectAll: () => void;
  loading?: boolean;
}

const GRADIENTS = [
  'linear-gradient(135deg, #fde68a, #d97706)',
  'linear-gradient(135deg, #a5f3fc, #0e7490)',
  'linear-gradient(135deg, #86efac, #16a34a)',
  'linear-gradient(135deg, #fda4af, #ec4899)',
  'linear-gradient(135deg, #ddd6fe, #7c3aed)',
];

export default function PropertyList({ properties, selectedIds, onToggle, onSelectAll, loading }: PropertyListProps) {
  const importable = properties.filter(p => p.importable && !p.alreadyImported);
  const allSelected = importable.length > 0 && selectedIds.length === importable.length;

  if (loading) {
    return (
      <Stack gap={0.875}>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ bgcolor: T.bg2, borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Box sx={{ fontSize: 48, mb: 1.75, opacity: 0.5 }}>📭</Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.625 }}>Aucune annonce trouvée</Typography>
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Ce compte Airbnb ne contient aucune annonce disponible pour l'import.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" gap={1.25} sx={{ mb: 1.25 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em' }}>Annonces disponibles</Typography>
        <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>
          {importable.length} importable{importable.length > 1 ? 's' : ''}
          {properties.length - importable.length > 0 && ` · ${properties.length - importable.length} déjà importée${properties.length - importable.length > 1 ? 's' : ''}`}
        </Typography>
        {importable.length > 0 && (
          <Box component="button" onClick={onSelectAll}
            sx={{
              all: 'unset', cursor: 'pointer', ml: 'auto',
              fontSize: 11.5, fontWeight: 700, color: T.primaryDeep,
              '&:hover': { textDecoration: 'underline' },
            }}>
            {allSelected ? `Tout désélectionner` : `Tout sélectionner (${importable.length})`}
          </Box>
        )}
      </Stack>

      <Stack gap={0.875}>
        {properties.map((p, idx) => {
          const isSelected = selectedIds.includes(p.ruPropertyId);
          const disabled = p.alreadyImported || !p.importable;
          return (
            <Box key={p.ruPropertyId}
              onClick={() => !disabled && onToggle(p.ruPropertyId)}
              sx={{
                p: '12px 14px', border: '1px solid',
                borderColor: isSelected ? T.primary : T.border,
                borderRadius: 1.4,
                bgcolor: disabled ? T.bg2 : (isSelected ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1),
                background: disabled ? T.bg2 : (isSelected ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1),
                display: 'flex', alignItems: 'center', gap: 1.5,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: p.alreadyImported ? 0.55 : 1,
                transition: 'all 0.15s',
                boxShadow: isSelected ? `inset 3px 0 0 ${T.primary}, 0 2px 8px -4px rgba(184,133,26,0.20)` : 'none',
                animation: `sj-slideUp 0.25s ${idx * 0.05}s both`,
                '&:hover': disabled ? {} : {
                  borderColor: isSelected ? T.primary : T.borderStrong,
                },
              }}
            >
              <Checkbox checked={isSelected} disabled={disabled} />
              <Box sx={{
                width: 48, height: 48, borderRadius: 1,
                background: p.photoUrl ? `url(${p.photoUrl}) center/cover` : GRADIENTS[(p.photoGradient || (idx % 5 + 1)) - 1 as 0|1|2|3|4],
                flexShrink: 0,
              }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{
                  fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.005em',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{p.name}</Typography>
                <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.375, fontSize: 11, color: T.text3 }}>
                  <Box component="span" sx={{ fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em' }}>
                    #{p.ruPropertyId}
                  </Box>
                  {p.city && <><Box component="span" sx={{ color: T.text4 }}>·</Box>{p.city}</>}
                  {p.guests != null && <><Box component="span" sx={{ color: T.text4 }}>·</Box>👥 {p.guests} voyageurs</>}
                </Stack>
              </Box>
              <Box sx={{
                px: 1.125, py: 0.375, borderRadius: '99px', fontSize: 9.5,
                fontFamily: '"Geist Mono", monospace', fontWeight: 700,
                letterSpacing: '0.04em', flexShrink: 0,
                ...(p.alreadyImported
                  ? { color: T.success, border: `1px solid rgba(34,197,94,0.30)`, bgcolor: 'transparent' }
                  : { color: T.info, bgcolor: T.infoTint, border: `1px solid rgba(6,115,179,0.20)` }
                ),
              }}>{p.alreadyImported ? '✓ DÉJÀ IMPORTÉE' : 'PRÊTE'}</Box>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function Checkbox({ checked, disabled }: { checked: boolean; disabled?: boolean }) {
  return (
    <Box sx={{
      width: 20, height: 20, borderRadius: 0.75,
      border: '1.5px solid',
      borderColor: disabled ? T.border : (checked ? T.primaryDeep : T.borderStrong),
      bgcolor: disabled ? T.bg2 : (checked ? T.primary : T.bg1),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: checked && !disabled ? `0 0 0 3px ${T.primaryTint}` : 'none',
      animation: checked ? 'sj-scale-in 0.2s' : undefined,
      transition: 'all 0.15s',
    }}>
      {checked && (
        <Box sx={{
          width: 6, height: 11,
          borderRight: '2px solid #fff', borderBottom: '2px solid #fff',
          transform: 'rotate(45deg) translate(-1px, -1px)', mt: '-2px',
        }} />
      )}
    </Box>
  );
}
