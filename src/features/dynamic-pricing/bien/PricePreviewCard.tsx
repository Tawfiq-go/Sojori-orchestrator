// ════════════════════════════════════════════════════════════════════
// PricePreviewCard — Aperçu des prix (« super vue » de confiance)
// Compare par jour : prix estimé (marché) → prix Sojori (après réglages)
// → prix calendrier actuel, avec statut réservé/bloqué en couleurs.
// Sélecteur 7 j → 12 mois · chips synthèse · strip visuel · tableau
// groupé par mois. Source : apply-preview-diff (aucun nouveau endpoint).
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Button, CircularProgress } from '@mui/material';
import { T } from '../_tokens';
import type { ApplyPreviewDiffDto, ApplyPreviewDiffRowDto } from '../../../services/dynamicPricingApi';
import type { PricingEvent } from './PricingControls';

const MONO = '"Geist Mono", monospace';
const fmt = (n: number) => Math.round(n).toLocaleString('fr-FR');

const PERIODS = [
  { key: '7', label: '7 j', days: 7 },
  { key: '15', label: '15 j', days: 15 },
  { key: '30', label: '30 j', days: 30 },
  { key: '90', label: '3 mois', days: 90 },
  { key: '180', label: '6 mois', days: 180 },
  { key: '365', label: '12 mois', days: 365 },
] as const;

type RowStatus = 'reserved' | 'blocked' | 'manual' | 'free';

function rowStatus(row: ApplyPreviewDiffRowDto): RowStatus {
  if (row.alert === 'reserved') return 'reserved';
  if (row.alert === 'blocked') return 'blocked';
  if (row.alert === 'manual') return 'manual';
  return 'free';
}

function monthLabelFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function dayLabelFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export interface PricePreviewCardProps {
  data: ApplyPreviewDiffDto | null;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  /** Règles actives → liseré orange sur le strip + chip 🗓 dans le tableau. */
  events?: PricingEvent[];
  onApply?: () => void;
  canApply?: boolean;
  applyLoading?: boolean;
}

export default function PricePreviewCard({
  data,
  loading = false,
  error = null,
  onReload,
  events = [],
  onApply,
  canApply = false,
  applyLoading = false,
}: PricePreviewCardProps) {
  const [periodKey, setPeriodKey] = React.useState<(typeof PERIODS)[number]['key']>('30');

  const period = PERIODS.find((p) => p.key === periodKey) ?? PERIODS[2];

  // Périodes des règles actives (bornes ISO) pour marquer les jours
  const ruleRanges = React.useMemo(
    () =>
      events
        .filter((e) => e.enabled !== false)
        .map((e) => {
          const [a, b] = e.dateRange.split('→').map((s) => s.trim().slice(0, 10));
          return { from: a, to: b || a, name: e.name, emoji: e.emoji };
        })
        .filter((r) => r.from),
    [events],
  );
  const ruleForDate = React.useCallback(
    (iso: string) => ruleRanges.find((r) => iso >= r.from && iso <= r.to),
    [ruleRanges],
  );

  const rows = React.useMemo(() => {
    if (!data?.rows?.length) return [];
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + period.days * 86_400_000).toISOString().slice(0, 10);
    return data.rows
      .filter((r) => r.date >= today && r.date <= horizon)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, period.days]);

  const stats = React.useMemo(() => {
    let reserved = 0;
    let blocked = 0;
    let free = 0;
    let sumSojori = 0;
    let nSojori = 0;
    let sumDeltaPct = 0;
    let nDelta = 0;
    for (const r of rows) {
      const st = rowStatus(r);
      if (st === 'reserved') reserved++;
      else if (st === 'blocked') blocked++;
      else free++;
      if (st === 'free' && r.g7ProposedMad != null) {
        sumSojori += r.g7ProposedMad;
        nSojori++;
        if (r.calendarCurrentMad != null && r.calendarCurrentMad > 0) {
          sumDeltaPct += (r.g7ProposedMad - r.calendarCurrentMad) / r.calendarCurrentMad;
          nDelta++;
        }
      }
    }
    return {
      total: rows.length,
      reserved,
      blocked,
      free,
      avgSojori: nSojori ? sumSojori / nSojori : null,
      avgDeltaPct: nDelta ? Math.round((sumDeltaPct / nDelta) * 100) : null,
    };
  }, [rows]);

  const maxPrice = React.useMemo(
    () =>
      rows.reduce(
        (m, r) => Math.max(m, r.g7ProposedMad ?? 0, r.calendarCurrentMad ?? 0),
        0,
      ) || 1,
    [rows],
  );

  // Strip : au-delà de ~90 jours les barres deviennent illisibles → 90 premiers jours
  const stripRows = rows.slice(0, 90);

  const chipSx = {
    display: 'flex', alignItems: 'baseline', gap: 0.75,
    bgcolor: T.bg2, border: `1px solid ${T.border}`, borderRadius: 1.25, px: 1.625, py: 0.875,
  } as const;

  return (
    <Box>
      {/* Sélecteur + horodatage */}
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.75, flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <Stack direction="row" sx={{ display: 'inline-flex', bgcolor: T.bg3, borderRadius: 1.25, p: 0.375, gap: 0.375 }}>
          {PERIODS.map((p) => (
            <Box
              key={p.key}
              component="button"
              type="button"
              onClick={() => setPeriodKey(p.key)}
              sx={{
                all: 'unset', cursor: 'pointer', px: 1.625, py: 0.75, borderRadius: 1,
                fontSize: 12, fontWeight: 700,
                color: periodKey === p.key ? T.text : T.text3,
                bgcolor: periodKey === p.key ? T.bg1 : 'transparent',
                boxShadow: periodKey === p.key ? '0 1px 3px rgba(0,0,0,0.10)' : 'none',
                '&:focus-visible': { outline: `2px solid ${T.goldDeep}`, outlineOffset: 1 },
              }}
            >
              {p.label}
            </Box>
          ))}
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          {data?.previewComputedAt ? (
            <Typography sx={{ fontSize: 10.5, color: T.text4, fontFamily: MONO }}>
              calculé {new Date(data.previewComputedAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          ) : null}
          {onReload ? (
            <Button size="small" onClick={onReload} disabled={loading} sx={{ fontSize: 11.5, textTransform: 'none', color: T.goldDeep, fontWeight: 700 }}>
              {loading ? 'Calcul…' : '↻ Recalculer'}
            </Button>
          ) : null}
        </Stack>
      </Stack>

      {error ? (
        <Typography sx={{ fontSize: 12, color: T.error, mt: 1.5 }}>{error}</Typography>
      ) : null}

      {loading && !rows.length ? (
        <Stack sx={{ alignItems: 'center', py: 5 }}>
          <CircularProgress size={22} sx={{ color: T.goldDeep }} />
          <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 1.25 }}>Calcul de l'aperçu…</Typography>
        </Stack>
      ) : null}

      {!loading && !rows.length && !error ? (
        <Typography sx={{ fontSize: 12.5, color: T.text3, fontStyle: 'italic', mt: 1.75 }}>
          Aucun jour à afficher — lancez « Recalculer » (nécessite un snapshot de prix).
        </Typography>
      ) : null}

      {rows.length ? (
        <>
          {/* Chips synthèse */}
          <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap', mt: 1.75 }}>
            <Box sx={chipSx}>
              <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800 }}>{stats.total}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3 }}>jours</Typography>
            </Box>
            <Box sx={chipSx}>
              <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: T.success }}>{stats.reserved}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3 }}>réservés 🟢</Typography>
            </Box>
            <Box sx={chipSx}>
              <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: stats.blocked > 0 ? T.warning : T.text3 }}>{stats.blocked}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3 }}>bloqués sans résa {stats.blocked > 0 ? '⚠' : ''}</Typography>
            </Box>
            <Box sx={chipSx}>
              <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800 }}>{stats.free}</Typography>
              <Typography sx={{ fontSize: 10.5, color: T.text3 }}>libres à vendre</Typography>
            </Box>
            {stats.avgDeltaPct != null ? (
              <Box sx={chipSx}>
                <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: T.goldDeep }}>
                  {stats.avgDeltaPct > 0 ? '+' : ''}{stats.avgDeltaPct} %
                </Typography>
                <Typography sx={{ fontSize: 10.5, color: T.text3 }}>Sojori vs calendrier</Typography>
              </Box>
            ) : null}
            {stats.avgSojori != null ? (
              <Box sx={chipSx}>
                <Typography sx={{ fontFamily: MONO, fontSize: 15, fontWeight: 800 }}>{fmt(stats.avgSojori)}</Typography>
                <Typography sx={{ fontSize: 10.5, color: T.text3 }}>MAD/nuit moyen Sojori</Typography>
              </Box>
            ) : null}
          </Stack>

          {/* Strip visuel */}
          <Stack direction="row" sx={{ gap: '2px', mt: 2, height: 54, alignItems: 'flex-end' }}>
            {stripRows.map((r) => {
              const st = rowStatus(r);
              const price = r.g7ProposedMad ?? r.calendarCurrentMad ?? 0;
              const h = Math.max(20, Math.round((price / maxPrice) * 100));
              const rule = ruleForDate(r.date);
              const title =
                `${dayLabelFr(r.date)} · ` +
                (st === 'reserved' ? 'réservé' : st === 'blocked' ? 'bloqué sans résa' : `${fmt(price)} MAD`) +
                (rule ? ` · ${rule.emoji ?? '🗓'} ${rule.name}` : '');
              return (
                <Box
                  key={r.date}
                  title={title}
                  sx={{
                    flex: 1, minWidth: 3, height: `${st === 'blocked' ? 32 : h}%`,
                    borderRadius: '3px 3px 0 0', position: 'relative',
                    bgcolor: st === 'reserved' ? T.success : st === 'blocked' ? T.bg3 : T.goldTint2,
                    opacity: st === 'reserved' ? 0.7 : 1,
                    border: st === 'blocked' ? `1px dashed ${T.borderStrong}` : 'none',
                    borderBottom: 'none',
                    ...(rule
                      ? {
                          '&::after': {
                            content: '""', position: 'absolute', left: 0, right: 0, bottom: -5,
                            height: 3, borderRadius: 2, bgcolor: T.warning,
                          },
                        }
                      : {}),
                  }}
                />
              );
            })}
          </Stack>
          <Stack direction="row" sx={{ gap: 2.25, mt: 1.375, flexWrap: 'wrap' }}>
            {(
              [
                [T.goldTint2, 'libre (hauteur = prix Sojori)', undefined],
                [T.success, 'réservé', 0.7],
                [T.bg3, 'bloqué sans résa', undefined],
                [T.warning, 'règle de période', undefined],
              ] as const
            ).map(([c, l, op]) => (
              <Typography key={l} sx={{ fontSize: 10.5, color: T.text3 }}>
                <Box component="span" sx={{ display: 'inline-block', width: 9, height: 9, borderRadius: '2px', bgcolor: c, opacity: op ?? 1, mr: 0.625, verticalAlign: '-1px' }} />
                {l}
              </Typography>
            ))}
            {rows.length > stripRows.length ? (
              <Typography sx={{ fontSize: 10.5, color: T.text4 }}>strip limité aux 90 premiers jours — le tableau couvre tout</Typography>
            ) : null}
          </Stack>

          {/* Tableau */}
          <Box sx={{ overflowX: 'auto', mt: 2, border: `1px solid ${T.border}`, borderRadius: 1.375, maxHeight: 460, overflowY: 'auto' }}>
            <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 780 }}>
              <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <Box component="tr">
                  {['Date', 'Statut', 'Prix estimé (marché)', 'Prix Sojori (après réglages)', 'Prix calendrier actuel', 'Δ Sojori vs cal.'].map((h, i) => (
                    <Box
                      key={h}
                      component="th"
                      sx={{
                        fontFamily: MONO, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase',
                        color: T.text3, textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                        p: '9px 12px', borderBottom: `1.5px solid ${T.borderStrong}`, bgcolor: T.bg2, whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box component="tbody">
                {rows.map((r, i) => {
                  const st = rowStatus(r);
                  const rule = ruleForDate(r.date);
                  const showMonth = i === 0 || r.date.slice(0, 7) !== rows[i - 1].date.slice(0, 7);
                  const delta = r.deltaMad;
                  const cellSx = {
                    p: '7px 12px', borderBottom: `1px solid ${T.border}`, textAlign: 'right' as const,
                    fontFamily: MONO, fontSize: 12, fontVariantNumeric: 'tabular-nums',
                    bgcolor: st === 'reserved' ? T.successTint : st === 'blocked' ? T.bg2 : undefined,
                    color: st === 'blocked' ? T.text4 : undefined,
                  };
                  return (
                    <React.Fragment key={r.date}>
                      {showMonth ? (
                        <Box component="tr">
                          <Box component="td" colSpan={6} sx={{ bgcolor: T.bg3, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text2, fontWeight: 800, p: '5px 12px' }}>
                            {monthLabelFr(r.date)}
                          </Box>
                        </Box>
                      ) : null}
                      <Box component="tr">
                        <Box component="td" sx={{ ...cellSx, textAlign: 'left', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {dayLabelFr(r.date)}
                          {rule ? (
                            <Box component="span" sx={{ fontSize: 9.5, borderRadius: 999, px: 0.875, py: 0.125, bgcolor: T.warningTint, color: T.warning, ml: 0.75, fontFamily: MONO, whiteSpace: 'nowrap' }}>
                              {rule.emoji ?? '🗓'} {rule.name}
                            </Box>
                          ) : null}
                        </Box>
                        <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>
                          <Box
                            component="span"
                            sx={{
                              fontSize: 10, fontWeight: 800, borderRadius: 999, px: 1.125, py: 0.25, fontFamily: MONO, whiteSpace: 'nowrap',
                              bgcolor:
                                st === 'reserved' ? T.success : st === 'blocked' ? T.bg3 : st === 'manual' ? T.infoTint : T.goldTint2,
                              color:
                                st === 'reserved' ? '#fff' : st === 'blocked' ? T.text3 : st === 'manual' ? T.info : T.goldDeep,
                            }}
                          >
                            {st === 'reserved' ? 'RÉSERVÉ' : st === 'blocked' ? 'BLOQUÉ ⚠' : st === 'manual' ? 'PRIX MANUEL' : 'LIBRE'}
                          </Box>
                        </Box>
                        <Box component="td" sx={cellSx}>{r.airroiMad != null ? fmt(r.airroiMad) : '—'}</Box>
                        <Box component="td" sx={{ ...cellSx, fontWeight: 800 }}>{r.g7ProposedMad != null ? fmt(r.g7ProposedMad) : '—'}</Box>
                        <Box component="td" sx={cellSx}>{r.calendarCurrentMad != null ? fmt(r.calendarCurrentMad) : '—'}</Box>
                        <Box
                          component="td"
                          sx={{
                            ...cellSx, fontWeight: 800,
                            color:
                              st !== 'free' || delta == null
                                ? T.text4
                                : delta > 0
                                  ? T.success
                                  : delta < 0
                                    ? T.error
                                    : T.text4,
                          }}
                        >
                          {st === 'reserved' ? 'figé' : st === 'blocked' ? 'non poussé' : st === 'manual' ? 'manuel' : delta == null ? '—' : `${delta > 0 ? '+' : ''}${fmt(delta)}`}
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Pied : action */}
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1.75, flexWrap: 'wrap', gap: 1.25 }}>
            <Typography sx={{ fontSize: 11, color: T.text3 }}>
              Les jours réservés sont figés · les jours bloqués ne sont jamais poussés.
            </Typography>
            {onApply ? (
              <Button
                disabled={!canApply || applyLoading}
                onClick={onApply}
                sx={{
                  bgcolor: T.goldDeep, color: '#fff', borderRadius: 1.125, px: 2.5, py: 1,
                  fontSize: 12.5, fontWeight: 700, textTransform: 'none',
                  '&:hover': { bgcolor: T.gold, color: T.text },
                  '&.Mui-disabled': { bgcolor: T.bg3, color: T.text4 },
                }}
              >
                {applyLoading ? 'Propagation…' : 'Propager ces prix vers le calendrier →'}
              </Button>
            ) : null}
          </Stack>
        </>
      ) : null}
    </Box>
  );
}
