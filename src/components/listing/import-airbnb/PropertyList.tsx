// ════════════════════════════════════════════════════════════════════
// PropertyList.tsx — Phase B : importables + visibilité déjà importées / inactives
// ════════════════════════════════════════════════════════════════════
import React, { useMemo } from 'react';
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

function PropertyRow({
  p,
  idx,
  isSelected,
  onToggle,
  selectable,
  badge,
  badgeColor,
  subtitle,
}: {
  p: RuProperty;
  idx: number;
  isSelected?: boolean;
  onToggle?: () => void;
  selectable: boolean;
  badge: string;
  badgeColor: { color: string; bg: string; border: string };
  subtitle?: string;
}) {
  return (
    <Box
      onClick={selectable ? onToggle : undefined}
      sx={{
        p: '12px 14px',
        border: '1px solid',
        borderColor: isSelected ? T.primary : T.border,
        borderRadius: 1.4,
        bgcolor: isSelected ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
        background: isSelected ? 'linear-gradient(180deg,#fff7ed,#fff)' : T.bg1,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        cursor: selectable ? 'pointer' : 'default',
        opacity: selectable ? 1 : 0.72,
        transition: 'all 0.15s',
        boxShadow: isSelected
          ? `inset 3px 0 0 ${T.primary}, 0 2px 8px -4px rgba(184,133,26,0.20)`
          : 'none',
        animation: selectable ? `sj-slideUp 0.25s ${idx * 0.05}s both` : undefined,
        '&:hover': selectable
          ? { borderColor: isSelected ? T.primary : T.borderStrong }
          : undefined,
      }}
    >
      {selectable ? <Checkbox checked={!!isSelected} /> : <Box sx={{ width: 20, flexShrink: 0 }} />}
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1,
          background: p.photoUrl
            ? `url(${p.photoUrl}) center/cover`
            : GRADIENTS[((p.photoGradient || (idx % 5) + 1) - 1) as 0 | 1 | 2 | 3 | 4],
          flexShrink: 0,
        }}
      />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 13.5,
            fontWeight: 700,
            letterSpacing: '-0.005em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {p.name}
        </Typography>
        <Stack direction="row" alignItems="center" gap={1} sx={{ mt: 0.375, fontSize: 11, color: T.text3, flexWrap: 'wrap' }}>
          <Box component="span" sx={{ fontFamily: '"Geist Mono", monospace', letterSpacing: '0.02em' }}>
            RU #{p.ruPropertyId}
          </Box>
          {(p.city || p.suggestedCityName) && (
            <>
              <Box component="span" sx={{ opacity: 0.45 }}>
                ·
              </Box>
              {p.city && <Box component="span">{p.city}</Box>}
              {p.suggestedCityName && (
                <Box
                  component="span"
                  sx={{
                    color: T.primaryDeep,
                    fontWeight: 600,
                    ...(p.city ? { ml: 0.25 } : {}),
                  }}
                >
                  {p.city ? '→ ' : ''}
                  Sojori {p.suggestedCityName}
                </Box>
              )}
            </>
          )}
        </Stack>
        {subtitle && (
          <Typography sx={{ fontSize: 10.5, color: T.error, mt: 0.25, lineHeight: 1.35 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box
        sx={{
          px: 1.125,
          py: 0.375,
          borderRadius: '99px',
          fontSize: 9.5,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 700,
          letterSpacing: '0.04em',
          flexShrink: 0,
          color: badgeColor.color,
          bgcolor: badgeColor.bg,
          border: `1px solid ${badgeColor.border}`,
        }}
      >
        {badge}
      </Box>
    </Box>
  );
}

export default function PropertyList({ properties, selectedIds, onToggle, onSelectAll, loading }: PropertyListProps) {
  const importable = useMemo(() => properties.filter((p) => p.importable), [properties]);
  const alreadyImported = useMemo(
    () => properties.filter((p) => p.alreadyImported && !p.importable),
    [properties],
  );
  const nameDuplicates = useMemo(
    () => properties.filter((p) => p.nameDuplicateBlocked),
    [properties],
  );
  const inactive = useMemo(
    () => properties.filter((p) => !p.importable && !p.alreadyImported && !p.nameDuplicateBlocked),
    [properties],
  );
  const allSelected = importable.length > 0 && selectedIds.length === importable.length;

  if (loading) {
    return (
      <Stack gap={0.875}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ bgcolor: T.bg2, borderRadius: 1.5 }} />
        ))}
      </Stack>
    );
  }

  if (properties.length === 0) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <Box sx={{ fontSize: 48, mb: 1.75, opacity: 0.5 }}>📭</Box>
        <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.625 }}>
          Aucune annonce Rentals United
        </Typography>
        <Typography sx={{ fontSize: 12, color: T.text3 }}>
          Vérifiez que le compte propriétaire a des credentials RU et des annonces sur Rentals United.
        </Typography>
      </Box>
    );
  }

  if (importable.length === 0) {
    return (
      <Stack gap={2}>
        <Box sx={{ p: 3, textAlign: 'center', bgcolor: T.bg2, borderRadius: 1.5, border: `1px solid ${T.border}` }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.625 }}>
            Aucune annonce à importer
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            {alreadyImported.length > 0 && inactive.length > 0
              ? `${alreadyImported.length} déjà importée(s) · ${inactive.length} inactive(s) ou archivée(s) sur RU`
              : alreadyImported.length > 0
                ? `${alreadyImported.length} annonce(s) déjà présente(s) dans Sojori`
                : inactive.length > 0
                  ? `${inactive.length} annonce(s) inactive(s) ou archivée(s) sur Rentals United`
                  : 'Seules les annonces actives et non importées peuvent être importées.'}
          </Typography>
        </Box>
        {alreadyImported.length > 0 && (
          <Section title="Déjà importées dans Sojori" count={alreadyImported.length}>
            {alreadyImported.map((p, idx) => (
              <PropertyRow
                key={p.ruPropertyId}
                p={p}
                idx={idx}
                selectable={false}
                badge="IMPORTÉE"
                badgeColor={{ color: T.text3, bg: T.bg2, border: T.border }}
              />
            ))}
          </Section>
        )}
      </Stack>
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="baseline" gap={1.25} sx={{ mb: 1.25, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.015em' }}>
          Annonces à importer
        </Typography>
        <Typography sx={{ fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>
          {importable.length} prête{importable.length > 1 ? 's' : ''}
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={onSelectAll}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            ml: 'auto',
            fontSize: 11.5,
            fontWeight: 700,
            color: T.primaryDeep,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          {allSelected ? 'Tout désélectionner' : `Tout sélectionner (${importable.length})`}
        </Box>
      </Stack>

      <Stack gap={0.875}>
        {importable.map((p, idx) => (
          <PropertyRow
            key={p.ruPropertyId}
            p={p}
            idx={idx}
            isSelected={selectedIds.includes(p.ruPropertyId)}
            onToggle={() => onToggle(p.ruPropertyId)}
            selectable
            badge="PRÊTE"
            badgeColor={{ color: T.info, bg: T.infoTint, border: 'rgba(6,115,179,0.20)' }}
          />
        ))}
      </Stack>

      {(alreadyImported.length > 0 || nameDuplicates.length > 0) && (
        <Stack gap={1.5} sx={{ mt: 2 }}>
          {nameDuplicates.length > 0 && (
            <Section title="Doublon RU — ne pas importer" count={nameDuplicates.length}>
              <Typography sx={{ fontSize: 11.5, color: T.text3, mb: 0.5, lineHeight: 1.45 }}>
                Même annonce déjà présente dans Sojori sous un autre ID Rentals United.
              </Typography>
              {nameDuplicates.map((p, idx) => (
                <PropertyRow
                  key={p.ruPropertyId}
                  p={p}
                  idx={idx}
                  selectable={false}
                  badge="DOUBLON RU"
                  badgeColor={{ color: T.error, bg: T.errorTint, border: 'rgba(220,38,38,0.20)' }}
                  subtitle={
                    p.nameDuplicateOfRuId
                      ? `Déjà importée sous RU #${p.nameDuplicateOfRuId}`
                      : p.blockReason
                  }
                />
              ))}
            </Section>
          )}
          {alreadyImported.length > 0 && (
            <Section title="Déjà importées" count={alreadyImported.length}>
              {alreadyImported.map((p, idx) => (
                <PropertyRow
                  key={p.ruPropertyId}
                  p={p}
                  idx={idx}
                  selectable={false}
                  badge="IMPORTÉE"
                  badgeColor={{ color: T.text3, bg: T.bg2, border: T.border }}
                />
              ))}
            </Section>
          )}
        </Stack>
      )}
    </Box>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2, mb: 0.75 }}>
        {title}{' '}
        <Box component="span" sx={{ color: T.text3, fontWeight: 600 }}>
          ({count})
        </Box>
      </Typography>
      <Stack gap={0.875}>{children}</Stack>
    </Box>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <Box
      sx={{
        width: 20,
        height: 20,
        borderRadius: 0.75,
        border: '1.5px solid',
        borderColor: checked ? T.primaryDeep : T.borderStrong,
        bgcolor: checked ? T.primary : T.bg1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: checked ? `0 0 0 3px ${T.primaryTint}` : 'none',
        animation: checked ? 'sj-scale-in 0.2s' : undefined,
        transition: 'all 0.15s',
      }}
    >
      {checked && (
        <Box
          sx={{
            width: 6,
            height: 11,
            borderRight: '2px solid #fff',
            borderBottom: '2px solid #fff',
            transform: 'rotate(45deg) translate(-1px, -1px)',
            mt: '-2px',
          }}
        />
      )}
    </Box>
  );
}
