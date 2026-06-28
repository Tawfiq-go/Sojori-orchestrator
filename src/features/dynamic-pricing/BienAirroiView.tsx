/**
 * Vue détail bien — mode test marché brut (snapshot Mongo, pas d’appel API au chargement).
 */
import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';
import type { PortfolioRow } from './_tokens';
import {
  AIRROI_RAW_COLUMNS,
  AIRROI_RAW_TABLE_INTRO,
  formatAirroiRawValue,
} from './airroiRawColumns';

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' },
        gap: 1,
        py: 1,
        borderBottom: `1px solid ${T.border}`,
        alignItems: 'baseline',
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          fontWeight: 800,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13, fontWeight: 600, color: T.text }}>{value}</Typography>
    </Box>
  );
}

export default function BienAirroiView({ row }: { row: PortfolioRow }) {
  const snapLabel = row.airroiSnapshotAt
    ? new Date(row.airroiSnapshotAt).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '—';

  const airroiCols = AIRROI_RAW_COLUMNS.filter((c) => c.field);

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, md: 3.5 }, pb: 4 }}>
      <Box
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 1.75,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg1,
        }}
      >
        <Typography sx={{ fontSize: 20, fontWeight: 900, mb: 0.5 }}>{row.listing.name}</Typography>
        <Stack direction="row" sx={{ gap: 2,  flexWrap: 'wrap', fontSize: 12, color: T.text2 }}>
          <span>
            Snapshot marché :{' '}
            <b style={{ color: row.hasAirroiSnapshot ? T.success : T.text4 }}>{snapLabel}</b>
          </span>
          {row.airroiSnapshotCostUsd != null && (
            <span>
              Coût refresh : <b>${row.airroiSnapshotCostUsd.toFixed(3)} USD</b>
            </span>
          )}
          {row.perfMeta?.ttmPeriodLabel && (
            <span title={row.perfMeta.metricsPeriodLabel ?? ''}>TTM : {row.perfMeta.ttmPeriodLabel}</span>
          )}
        </Stack>
      </Box>

      <Typography sx={{ fontSize: 12, color: T.text2, lineHeight: 1.5, mb: 2 }}>
        {AIRROI_RAW_TABLE_INTRO}
      </Typography>

      {!row.hasAirroiSnapshot ? (
        <Box
          sx={{
            p: 2,
            borderRadius: 1.5,
            border: `1px dashed ${T.borderStrong}`,
            bgcolor: T.bg2,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 700, color: T.text }}>
            Aucun snapshot marché pour ce bien.
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text2, mt: 0.5 }}>
            Utilisez « Données marché » en haut à droite → « Récupérer les performances de ce bien » (appels
            payants via srv-channels).
          </Typography>
        </Box>
      ) : (
        <Box
          sx={{
            borderRadius: 1.75,
            border: `1px solid ${T.border}`,
            bgcolor: T.bg1,
            overflow: 'hidden',
          }}
        >
          {airroiCols.map((col) => (
            <FieldRow
              key={col.id}
              label={col.label}
              value={formatAirroiRawValue(col.field!, row.airroiRaw)}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
