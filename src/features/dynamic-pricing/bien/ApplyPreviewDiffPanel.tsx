import React from 'react';
import { Box, Button, Stack, Typography, Chip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { T } from '../_tokens';
import { DP, marketColumnLabel, marketColumnTooltip } from '../clientLabels';
import type { ApplyPreviewDiffDto, ApplyPreviewDiffRowDto } from '../../../services/dynamicPricingApi';

const ALERT_LABEL: Record<ApplyPreviewDiffRowDto['alert'], { label: string; color: string; bg: string }> = {
  ok: { label: 'OK', color: T.success, bg: T.successTint },
  large_delta: { label: 'Écart fort', color: T.warning, bg: T.warningTint },
  below_floor: { label: 'Sous plancher', color: T.error, bg: T.errorTint },
  reserved: { label: 'Réservé', color: T.text3, bg: T.bg2 },
  manual: { label: 'Manuel', color: T.info, bg: T.infoTint },
  blocked: { label: 'Bloqué', color: T.text3, bg: T.bg2 },
  no_change: { label: 'Identique', color: T.text4, bg: T.bg2 },
};

function fmtMad(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  return `${Math.round(n)}`;
}

function fmtDelta(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—';
  const v = Math.round(n);
  if (v === 0) return '0';
  return v > 0 ? `+${v}` : String(v);
}

function fmtSnapshotShort(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

type Props = {
  data: ApplyPreviewDiffDto | null;
  loading?: boolean;
  error?: string | null;
  onlyChanged: boolean;
  onOnlyChangedChange: (v: boolean) => void;
  onReload: () => void;
  onApply?: () => void;
  applyLoading?: boolean;
  canApply?: boolean;
  /** Fallback libellé colonne marché avant chargement API */
  marketSource?: 'estimate' | 'airroi';
};

export default function ApplyPreviewDiffPanel({
  data,
  loading = false,
  error = null,
  onlyChanged,
  onOnlyChangedChange,
  onReload,
  onApply,
  applyLoading = false,
  canApply = false,
  marketSource: marketSourceProp,
}: Props) {
  const rows = data?.rows ?? [];
  const summary = data?.summary;
  const airroiSnapshotLabel = fmtSnapshotShort(data?.airroiSnapshotAt);
  const marketSource = data?.marketSource ?? marketSourceProp ?? 'airroi';
  const marketColLabel = marketColumnLabel(marketSource);
  const marketColTitle = marketColumnTooltip(marketSource);

  return (
    <Box
      sx={{
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        bgcolor: T.bg1,
        overflow: 'hidden',
      }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        sx={{
          alignItems: { sm: 'center' },
          gap: 1,
          px: 2,
          py: 1.25,
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.aiTint,
        }}
      >
        <Typography sx={{ fontWeight: 800, fontSize: 13, color: T.ai, flex: 1 }}>
          Vérifier les écarts (estimation Sojori → prix Sojori → calendrier)
        </Typography>
        {summary ? (
          <Typography sx={{ fontSize: 11, color: T.text2, fontFamily: '"Geist Mono", monospace' }}>
            {summary.daysWithDiff} écart(s) · {summary.daysPushable} applicables ·{' '}
            {summary.daysWithLargeDelta} fort(s)
          </Typography>
        ) : null}
        <Chip
          size="small"
          label={onlyChanged ? 'Écarts seulement' : 'Tous les jours'}
          onClick={() => onOnlyChangedChange(!onlyChanged)}
          sx={{ fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}
        />
        <Button
          size="small"
          startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
          onClick={() => void onReload()}
          disabled={loading}
          sx={{ textTransform: 'none', fontWeight: 700, fontSize: 11 }}
        >
          Actualiser
        </Button>
        {onApply ? (
          <Button
            size="small"
            variant="contained"
            disabled={!canApply || applyLoading || loading}
            onClick={() => void onApply()}
            sx={{
              textTransform: 'none',
              fontWeight: 800,
              fontSize: 11,
              bgcolor: T.gold,
              color: T.text,
              '&:hover': { bgcolor: T.goldDeep },
            }}
          >
            {applyLoading ? 'Application…' : 'Appliquer les jours validés'}
          </Button>
        ) : null}
      </Stack>

      {error ? (
        <Typography sx={{ fontSize: 12, color: T.error, fontWeight: 600, px: 2, py: 1.5 }}>
          {error}
        </Typography>
      ) : null}

      {loading && !rows.length ? (
        <Typography sx={{ fontSize: 12, color: T.text3, px: 2, py: 2 }}>
          Calcul des écarts estimation · G7 · calendrier…
        </Typography>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <Typography sx={{ fontSize: 12, color: T.text3, px: 2, py: 2 }}>
          Aucun écart détecté entre le prix G7 proposé et le calendrier actuel.
        </Typography>
      ) : null}

      {rows.length > 0 ? (
        <Box sx={{ overflowX: 'auto', maxHeight: 320 }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 11,
              '& th': {
                position: 'sticky',
                top: 0,
                bgcolor: T.bg2,
                fontWeight: 800,
                color: T.text3,
                textAlign: 'left',
                px: 1.25,
                py: 0.75,
                borderBottom: `1px solid ${T.border}`,
                whiteSpace: 'nowrap',
              },
              '& td': {
                px: 1.25,
                py: 0.6,
                borderBottom: `1px solid ${T.border}`,
                fontFamily: '"Geist Mono", monospace',
                color: T.text2,
              },
            }}
          >
            <thead>
              <tr>
                <th title="Jour concerné (à partir d'aujourd'hui)">Date</th>
                <th title={marketColTitle}>
                  <Box component="span" sx={{ display: 'block', lineHeight: 1.25 }}>
                    {marketColLabel}
                    {airroiSnapshotLabel ? (
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          fontSize: 9,
                          fontWeight: 600,
                          color: T.text4,
                          fontFamily: 'inherit',
                          mt: 0.25,
                        }}
                      >
                        snap. {airroiSnapshotLabel}
                      </Box>
                    ) : (
                      <Box
                        component="span"
                        sx={{
                          display: 'block',
                          fontSize: 9,
                          fontWeight: 600,
                          color: T.text4,
                          fontFamily: 'inherit',
                          mt: 0.25,
                        }}
                      >
                        snap. —
                      </Box>
                    )}
                  </Box>
                </th>
                <th title="Prix dynamique après bornes min/max, mode et events">
                  Dynamique
                </th>
                <th title="Prix affiché dans le calendrier Sojori (manuel ou dynamique)">
                  {DP.calendrierActuel}
                </th>
                <th title="Prix catalogue de référence (secondaire)">{DP.prixDeBase}</th>
                <th title="Sojori proposé − calendrier actuel">Δ apply</th>
                <th title="Statut apply : OK, écart, réservé, manuel, bloqué…">Alerte</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const alert = ALERT_LABEL[row.alert] ?? ALERT_LABEL.ok;
                return (
                  <tr key={row.date}>
                    <td style={{ fontWeight: 700, color: T.text }}>{row.date}</td>
                    <td>{fmtMad(row.airroiMad)}</td>
                    <td style={{ fontWeight: 700, color: T.ai }}>{fmtMad(row.g7ProposedMad)}</td>
                    <td>{fmtMad(row.calendarCurrentMad)}</td>
                    <td>{fmtMad(row.baseImportMad)}</td>
                    <td
                      style={{
                        fontWeight: 700,
                        color:
                          row.deltaMad != null && Math.abs(row.deltaMad) >= 100
                            ? T.warning
                            : T.text,
                      }}
                    >
                      {fmtDelta(row.deltaMad)}
                    </td>
                    <td>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 10,
                          fontWeight: 800,
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 99,
                          color: alert.color,
                          bgcolor: alert.bg,
                        }}
                      >
                        {alert.label}
                      </Box>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Box>
        </Box>
      ) : null}

      {data?.previewComputedAt ? (
        <Typography sx={{ fontSize: 10, color: T.text4, px: 2, py: 0.75 }}>
          Preview{' '}
          {new Date(data.previewComputedAt).toLocaleString('fr-FR', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </Typography>
      ) : null}
    </Box>
  );
}
