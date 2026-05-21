/**
 * Badges origine des données — PROD · VIDE (+ date snapshot marché).
 */
import React from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { T } from './_tokens';

export type DataSourceKind = 'prod' | 'calc' | 'empty' | 'mix';

export type DataSourceItem = {
  kind: DataSourceKind;
  label: string;
  tooltip?: string;
};

const KIND_STYLE: Record<
  DataSourceKind,
  { bg: string; color: string; border: string; short: string }
> = {
  prod: {
    short: 'PROD',
    bg: T.successTint,
    color: T.success,
    border: 'rgba(10,143,94,0.35)',
  },
  calc: {
    short: 'CALCULÉ',
    bg: T.infoTint,
    color: T.info,
    border: 'rgba(6,115,179,0.35)',
  },
  empty: {
    short: 'VIDE',
    bg: T.bg3,
    color: T.text4,
    border: T.borderStrong,
  },
  mix: {
    short: 'MIXTE',
    bg: T.goldTint,
    color: T.goldDeep,
    border: 'rgba(199,155,34,0.4)',
  },
};

export function formatSnapshotLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function DataSourceBadge({
  kind,
  label,
  tooltip,
}: {
  kind: DataSourceKind;
  label?: string;
  tooltip?: string;
}) {
  const s = KIND_STYLE[kind];
  const text = label ?? s.short;
  const chip = (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.375,
        fontSize: 9.5,
        fontWeight: 800,
        fontFamily: '"Geist Mono", monospace',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        px: 0.75,
        py: 0.25,
        borderRadius: 0.5,
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          bgcolor: s.color,
          flexShrink: 0,
        }}
      />
      {text}
    </Box>
  );
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow placement="top">
        {chip}
      </Tooltip>
    );
  }
  return chip;
}

/** Barre sous-titre de section : badges + date snapshot optionnelle */
export function SectionSourceBar({
  items,
  snapshotAt,
  snapshotLabel = 'Dernier refresh marché',
  note,
  compact,
}: {
  items: DataSourceItem[];
  snapshotAt?: string | null;
  snapshotLabel?: string;
  note?: string;
  compact?: boolean;
}) {
  const snap = formatSnapshotLabel(snapshotAt);
  return (
    <Stack
      direction="row"
      gap={compact ? 0.5 : 0.75}
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        mb: compact ? 1 : 1.5,
        maxWidth: 1380,
        mx: 'auto',
        px: compact ? 0 : undefined,
      }}
    >
      {items.map((it) => (
        <DataSourceBadge key={`${it.kind}-${it.label}`} kind={it.kind} label={it.label} tooltip={it.tooltip} />
      ))}
      {snap && (
        <Typography
          component="span"
          sx={{
            fontSize: 10,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            flexBasis: { xs: '100%', sm: 'auto' },
            mt: { xs: 0.25, sm: 0 },
          }}
        >
          · {snapshotLabel} : <b style={{ color: T.success }}>{snap}</b>
        </Typography>
      )}
      {note && (
        <Typography
          sx={{
            fontSize: 10,
            color: T.text4,
            fontStyle: 'italic',
            flexBasis: '100%',
            lineHeight: 1.4,
            mt: 0.25,
          }}
        >
          {note}
        </Typography>
      )}
    </Stack>
  );
}

/** Légende globale (une fois en haut de page) */
export function DataSourceLegend({ sx }: { sx?: object }) {
  return (
    <Stack
      direction="row"
      gap={1}
      sx={{
        flexWrap: 'wrap',
        alignItems: 'center',
        p: 1,
        mb: 1.5,
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        bgcolor: T.bg2,
        fontSize: 10,
        color: T.text3,
        ...sx,
      }}
    >
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text2, mr: 0.5 }}>Légende :</Typography>
      <DataSourceBadge kind="prod" tooltip="Données API / Mongo en production (Sojori, marché snapshot, cache)" />
      <DataSourceBadge kind="calc" tooltip="Dérivé côté front ou agrégat à partir de données prod" />
      <DataSourceBadge kind="empty" tooltip="Pas de donnée en base — affiché comme —" />
      <DataSourceBadge kind="mix" tooltip="Prod + champs vides ou calculés" />
    </Stack>
  );
}
