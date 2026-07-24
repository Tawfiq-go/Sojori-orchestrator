// ════════════════════════════════════════════════════════════════════
// PricePreviewCard — Aperçu des prix (« super vue » de confiance)
// Compare par jour : prix dynamique (après réglages) ↔ calendrier,
// avec statut réservé/bloqué. Hover = détail du calcul (estimé → mode → …).
// Sélecteur 7 j → 12 mois · chips synthèse · strip visuel · tableau
// groupé par mois. Source : apply-preview-diff (aucun nouveau endpoint).
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Button, CircularProgress, Tooltip, Checkbox, Switch, FormControlLabel } from '@mui/material';
import { T } from '../_tokens';
import type { ApplyPreviewDiffDto, ApplyPreviewDiffRowDto } from '../../../services/dynamicPricingApi';
import type { PricingEvent } from './PricingControls';
import { usePricePreviewSelectionOptional } from './pricePreviewSelectionContext';

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

type RowStatus = 'reserved' | 'blocked' | 'free';
type CalendarPriceMode = 'manual' | 'dynamic';
type DayRule = { name: string; emoji?: string };

function rowStatus(row: ApplyPreviewDiffRowDto): RowStatus {
  if (row.skipReason === 'has_reservation' || row.alert === 'reserved') return 'reserved';
  if (row.skipReason === 'not_available' || row.alert === 'blocked') return 'blocked';
  return 'free';
}

function calendarPriceMode(row: ApplyPreviewDiffRowDto): CalendarPriceMode {
  if (typeof row.applyManual === 'boolean') return row.applyManual ? 'manual' : 'dynamic';
  if (row.skipReason === 'apply_manual' || row.alert === 'manual') return 'manual';
  return 'dynamic';
}

function priceModeLabel(mode: CalendarPriceMode): string {
  return mode === 'manual' ? 'Prix manuel calendrier' : 'Prix dynamique';
}

function statusWord(st: RowStatus): string {
  if (st === 'reserved') return 'RÉSERVÉ';
  if (st === 'blocked') return 'BLOQUÉ';
  return 'LIBRE';
}

/** Badge statut : Manu si manuel · nom d’event si règle · rien si dynamique pur. */
function DayStatusBadge({
  row,
  st,
  rule,
}: {
  row: ApplyPreviewDiffRowDto;
  st: RowStatus;
  rule?: DayRule;
}) {
  const mode = calendarPriceMode(row);
  const tag = rule
    ? `${rule.emoji ? `${rule.emoji} ` : ''}${rule.name}`
    : mode === 'manual'
      ? 'Manu'
      : null;
  const title = rule
    ? `Event « ${rule.name} » (remplace le dynamique) · ${statusWord(st)}`
    : `${priceModeLabel(mode)} · ${statusWord(st)}`;
  return (
    <Box
      component="span"
      title={title}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 10,
        fontWeight: 800,
        borderRadius: 999,
        pl: tag ? 0.5 : 1,
        pr: 1.125,
        py: 0.25,
        fontFamily: MONO,
        whiteSpace: 'nowrap',
        maxWidth: 220,
        bgcolor: st === 'reserved' ? T.success : st === 'blocked' ? T.bg3 : T.goldTint2,
        color: st === 'reserved' ? '#fff' : st === 'blocked' ? T.text3 : T.goldDeep,
      }}
    >
      {tag ? (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: 110,
            height: 16,
            px: 0.5,
            borderRadius: '4px',
            fontSize: 9,
            fontWeight: 900,
            lineHeight: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            bgcolor: rule ? T.warningTint : 'rgba(255,255,255,0.92)',
            color: rule ? T.warning : T.info,
            border: rule ? `1px solid ${T.warning}` : `1px solid ${T.info}`,
          }}
        >
          {tag}
        </Box>
      ) : null}
      {statusWord(st)}
      {st === 'blocked' ? ' ⚠' : ''}
    </Box>
  );
}

/** Hover sur le prix dynamique : chaîne de calcul lisible. */
function DynamicPriceHover({
  row,
  rule,
}: {
  row: ApplyPreviewDiffRowDto;
  rule?: DayRule;
}) {
  const lineSx = { fontSize: 10.5, fontFamily: MONO, lineHeight: 1.45, fontVariantNumeric: 'tabular-nums' };
  const base =
    row.applied?.baseFixeMad != null
      ? { label: 'Prix de base (fixe)', value: row.applied.baseFixeMad }
      : row.airroiMad != null
        ? { label: 'Prix estimé (marché)', value: row.airroiMad }
        : null;
  const steps: string[] = [];
  if (base) steps.push(`${base.label} : ${fmt(base.value)} MAD`);
  if (rule) steps.push(`Event « ${rule.name} » (remplace le dynamique)`);
  if (row.applied?.occupancyPct != null) {
    steps.push(`Occupation : ${row.applied.occupancyPct > 0 ? '+' : ''}${row.applied.occupancyPct} %`);
  }
  if (row.applied?.lastMinutePct != null) {
    steps.push(`Dernière minute : ${row.applied.lastMinutePct > 0 ? '+' : ''}${row.applied.lastMinutePct} %`);
  }
  if (row.applied?.clamp === 'floor') steps.push('Plancher appliqué');
  if (row.applied?.clamp === 'ceiling') steps.push('Plafond appliqué');
  if (row.applied?.gapMinStay) {
    steps.push(`Trou : min stay ${row.applied.gapMinStay.from}→${row.applied.gapMinStay.to} n`);
  }

  return (
    <Stack spacing={0.35} sx={{ py: 0.25, maxWidth: 260 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 800 }}>Prix dynamique</Typography>
      {steps.length ? (
        steps.map((s) => (
          <Typography key={s} sx={{ ...lineSx, color: T.text2 }}>
            · {s}
          </Typography>
        ))
      ) : (
        <Typography sx={{ ...lineSx, color: T.text3 }}>Calcul standard (estimé → bornes)</Typography>
      )}
      <Typography sx={{ ...lineSx, fontWeight: 800, color: T.goldDeep, pt: 0.25 }}>
        = {row.g7ProposedMad != null ? `${fmt(row.g7ProposedMad)} MAD` : '—'}
      </Typography>
    </Stack>
  );
}

function monthLabelFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

function dayLabelFr(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

const CHART_PLOT_H = 82;
const CHART_LABEL_HEADROOM = 16;

function shouldShowEstimateLabel(
  rowCount: number,
  compact: boolean,
  isMonthStart: boolean,
  dayOfWeek: number,
): boolean {
  if (!compact) return true;
  if (rowCount > 180) return isMonthStart;
  return isMonthStart || dayOfWeek === 1;
}

function priceHeightPct(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  return Math.max(3, (value / max) * 100);
}

function buildLinePoints(
  rows: ApplyPreviewDiffRowDto[],
  getValue: (r: ApplyPreviewDiffRowDto) => number,
  max: number,
): string {
  return rows
    .map((r, i) => {
      const v = getValue(r);
      const y = 100 - (v > 0 ? priceHeightPct(v, max) : 0);
      return `${i + 0.5},${y}`;
    })
    .join(' ');
}

function fmtMad(v: number | null | undefined): string {
  return v != null ? `${fmt(v)} MAD` : '—';
}

function priceDelta(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null || b == null) return null;
  return a - b;
}

function fmtSignedDelta(d: number | null): string {
  if (d == null) return '—';
  return `${d > 0 ? '+' : ''}${fmt(d)} MAD`;
}

function deltaTone(d: number | null): string {
  if (d == null) return T.text4;
  if (d > 0) return T.success;
  if (d < 0) return T.error;
  return T.text3;
}

const STATUS_LABEL: Record<RowStatus, string> = {
  reserved: 'Réservé',
  blocked: 'Bloqué sans résa',
  free: 'Libre',
};

function ChartDayTooltipContent({
  row,
  status,
  rule,
}: {
  row: ApplyPreviewDiffRowDto;
  status: RowStatus;
  rule?: DayRule;
}) {
  const marche = row.airroiMad;
  const dynamique = row.g7ProposedMad;
  const cal = row.calendarCurrentMad;
  const booked = row.bookedPriceMad ?? null;
  const mode = calendarPriceMode(row);
  const deltaDynCal = priceDelta(dynamique, cal);
  const deltaBookedMarche = priceDelta(booked, marche);
  const lineSx = { fontSize: 10.5, fontFamily: MONO, lineHeight: 1.5, fontVariantNumeric: 'tabular-nums' };
  const modeBit = rule
    ? `event « ${rule.name} »`
    : mode === 'manual'
      ? 'Manu'
      : 'dynamique';

  return (
    <Stack spacing={0.375} sx={{ py: 0.125 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1.3 }}>{dayLabelFr(row.date)}</Typography>
      <Typography sx={{ fontSize: 10, color: T.text3 }}>
        {STATUS_LABEL[status]} · {modeBit}
      </Typography>
      <Box sx={{ height: 4 }} />
      <Typography sx={lineSx}>Prix estimé (marché) : {fmtMad(marche)}</Typography>
      <Typography sx={{ ...lineSx, fontWeight: 800, color: T.goldDeep }}>Prix dynamique : {fmtMad(dynamique)}</Typography>
      {status === 'reserved' ? (
        <>
          <Typography sx={{ ...lineSx, fontWeight: 800, color: T.info }}>
            Prix à la réservation : {fmtMad(booked)}
          </Typography>
          {cal != null && booked != null && cal !== booked ? (
            <Typography sx={{ ...lineSx, color: T.text3 }}>Prix calendrier actuel : {fmtMad(cal)}</Typography>
          ) : null}
        </>
      ) : (
        <Typography sx={lineSx}>Prix calendrier : {fmtMad(cal)}</Typography>
      )}
      <Box sx={{ height: 4 }} />
      {status === 'reserved' ? (
        <Typography sx={{ ...lineSx, color: deltaTone(deltaBookedMarche), fontWeight: 700 }}>
          Δ résa − estimation : {fmtSignedDelta(deltaBookedMarche)}
        </Typography>
      ) : (
        <Typography sx={{ ...lineSx, color: deltaTone(deltaDynCal), fontWeight: 700 }}>
          Δ dynamique − cal. : {fmtSignedDelta(deltaDynCal)}
        </Typography>
      )}
      {rule ? (
        <Typography sx={{ fontSize: 10, color: T.warning, mt: 0.25 }}>
          {rule.emoji ?? '🗓'} {rule.name}
        </Typography>
      ) : null}
    </Stack>
  );
}

export interface PricePreviewCardProps {
  data: ApplyPreviewDiffDto | null;
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  /** Règles actives → liseré orange sur le strip + chip 🗓 dans le tableau. */
  events?: PricingEvent[];
}

export default function PricePreviewCard({
  data,
  loading = false,
  error = null,
  onReload,
  events = [],
}: PricePreviewCardProps) {
  const selection = usePricePreviewSelectionOptional();
  const [periodKey, setPeriodKey] = React.useState<(typeof PERIODS)[number]['key']>('30');
  /** Prix figés à la résa (colonne cal.) — masqués par défaut. */
  const [showBookedCalPrices, setShowBookedCalPrices] = React.useState(false);

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

  React.useEffect(() => {
    selection?.setPreviewRows(rows);
  }, [rows, selection]);

  const selectedDates = selection?.selectedDates ?? new Set<string>();
  const canSelect = Boolean(selection);

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

  const freeRowDates = React.useMemo(
    () => rows.filter((r) => rowStatus(r) === 'free').map((r) => r.date),
    [rows],
  );

  const allFreeSelected =
    freeRowDates.length > 0 && freeRowDates.every((d) => selectedDates.has(d));

  const someFreeSelected = freeRowDates.some((d) => selectedDates.has(d));

  const toggleDate = (date: string, st: RowStatus) => {
    selection?.toggleDate(date, st === 'free');
  };

  const toggleAllFree = () => {
    selection?.toggleAllFree(freeRowDates);
  };

  const canEditInventory = canSelect;

  /** ≤ 31 j : tout le tableau visible · > 31 j : scroll vertical dans le cadre du tableau */
  const tableFitsWithoutInnerScroll = period.days <= 31;

  const maxPrice = React.useMemo(
    () =>
      rows.reduce(
        (m, r) =>
          Math.max(
            m,
            r.g7ProposedMad ?? 0,
            r.calendarCurrentMad ?? 0,
            r.airroiMad ?? 0,
            r.bookedPriceMad ?? 0,
          ),
        0,
      ) || 1,
    [rows],
  );

  // ≤ 31 jours : les barres remplissent la largeur · au-delà : largeur fixe + scroll horizontal
  const compactBars = rows.length > 31;

  const sojoriLinePoints = React.useMemo(
    () => buildLinePoints(rows, (r) => r.g7ProposedMad ?? 0, maxPrice),
    [rows, maxPrice],
  );
  const calendarLinePoints = React.useMemo(
    () => buildLinePoints(rows, (r) => r.calendarCurrentMad ?? 0, maxPrice),
    [rows, maxPrice],
  );

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

          {/* Graphe : barres marché + lignes Sojori & calendrier */}
          <Box sx={{ mt: 2, pt: 1.75, pb: 0.75, borderRadius: 1.25, bgcolor: T.bg2, border: `1px solid ${T.border}`, px: 1, overflowX: 'auto' }}>
            <Box
              sx={{
                position: 'relative',
                minWidth: compactBars ? `${rows.length * 18}px` : undefined,
                overflow: 'visible',
              }}
            >
              <Stack
                direction="row"
                sx={{
                  gap: '3px',
                  alignItems: 'stretch',
                  height: CHART_PLOT_H,
                  position: 'relative',
                  zIndex: 0,
                  overflow: 'visible',
                  pt: `${CHART_LABEL_HEADROOM}px`,
                  boxSizing: 'content-box',
                }}
              >
                {rows.map((r, i) => {
                  const st = rowStatus(r);
                  const cal = r.calendarCurrentMad ?? 0;
                  const marche = r.airroiMad ?? 0;
                  const hMarche = priceHeightPct(marche, maxPrice);
                  const rule = ruleForDate(r.date);
                  const d = new Date(r.date);
                  const dayNum = d.getDate();
                  const isMonthStart = dayNum === 1 || i === 0;
                  const showDayLabel = !compactBars || isMonthStart || d.getDay() === 1;
                  const showEstimateLabel =
                    marche > 0 && shouldShowEstimateLabel(rows.length, compactBars, isMonthStart, d.getDay());
                  const dayLabel = isMonthStart
                    ? `${dayNum} ${d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')}`
                    : String(dayNum);

                  return (
                    <Tooltip
                      key={r.date}
                      arrow
                      placement="top"
                      enterDelay={120}
                      slotProps={{
                        tooltip: {
                          sx: {
                            bgcolor: T.bg1,
                            color: T.text,
                            border: `1px solid ${T.borderStrong}`,
                            boxShadow: '0 8px 24px rgba(15,23,42,0.14)',
                            maxWidth: 300,
                            p: 1.25,
                          },
                        },
                        arrow: { sx: { color: T.bg1, '&::before': { border: `1px solid ${T.borderStrong}` } } },
                      }}
                      title={<ChartDayTooltipContent row={r} status={st} rule={rule} />}
                    >
                      <Box
                        sx={{
                          flex: compactBars ? '0 0 15px' : 1,
                          minWidth: compactBars ? 15 : 8,
                          display: 'flex',
                          flexDirection: 'column',
                          position: 'relative',
                          cursor: 'crosshair',
                        }}
                      >
                      <Box
                        sx={{
                          flex: 1,
                          position: 'relative',
                          borderLeft: isMonthStart && i > 0 ? `1.5px solid ${T.borderStrong}` : 'none',
                          overflow: 'visible',
                        }}
                      >
                        {showEstimateLabel ? (
                          <Typography
                            sx={{
                              position: 'absolute',
                              left: '50%',
                              bottom: marche > 0 ? `${hMarche}%` : '100%',
                              transform: 'translate(-50%, -4px)',
                              fontFamily: MONO,
                              fontSize: compactBars ? 7 : 8,
                              fontWeight: 800,
                              color: T.info,
                              lineHeight: 1,
                              whiteSpace: 'nowrap',
                              zIndex: 4,
                              pointerEvents: 'none',
                              letterSpacing: '-0.02em',
                            }}
                          >
                            {fmt(marche)}
                          </Typography>
                        ) : null}
                        {st === 'reserved' ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: '8%',
                              right: '8%',
                              bottom: 0,
                              height: cal > 0 ? `${priceHeightPct(cal, maxPrice)}%` : '28%',
                              borderRadius: '3px 3px 0 0',
                              bgcolor: T.success,
                              opacity: 0.55,
                            }}
                          />
                        ) : st === 'blocked' ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: '8%',
                              right: '8%',
                              bottom: 0,
                              height: `${Math.max(22, hMarche || 18)}%`,
                              borderRadius: '3px 3px 0 0',
                              border: `1.5px dashed ${T.borderStrong}`,
                              bgcolor: T.bg1,
                            }}
                          />
                        ) : hMarche > 0 ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: '12%',
                              right: '12%',
                              bottom: 0,
                              height: `${hMarche}%`,
                              borderRadius: '3px 3px 0 0',
                              bgcolor: T.infoTint,
                              border: '1px solid rgba(6,115,179,0.35)',
                              borderBottom: 'none',
                            }}
                          />
                        ) : null}
                        {rule ? (
                          <Box
                            sx={{
                              position: 'absolute',
                              left: 0,
                              right: 0,
                              bottom: -1,
                              height: 3,
                              borderRadius: 2,
                              bgcolor: T.warning,
                              zIndex: 2,
                            }}
                          />
                        ) : null}
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: MONO,
                          fontSize: 8.5,
                          textAlign: 'center',
                          mt: '4px',
                          color: isMonthStart ? T.text2 : T.text4,
                          fontWeight: isMonthStart ? 800 : 400,
                          whiteSpace: 'nowrap',
                          lineHeight: 1,
                          minHeight: 10,
                          userSelect: 'none',
                        }}
                      >
                        {showDayLabel ? dayLabel : ' '}
                      </Typography>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>

              {rows.length > 1 ? (
                <Box
                  component="svg"
                  viewBox={`0 0 ${rows.length} 100`}
                  preserveAspectRatio="none"
                  sx={{
                    position: 'absolute',
                    top: CHART_LABEL_HEADROOM,
                    left: 0,
                    width: '100%',
                    height: CHART_PLOT_H,
                    pointerEvents: 'none',
                    zIndex: 2,
                    overflow: 'visible',
                  }}
                >
                  <polyline
                    points={calendarLinePoints}
                    fill="none"
                    stroke={T.text}
                    strokeWidth={0.45}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <polyline
                    points={sojoriLinePoints}
                    fill="none"
                    stroke={T.goldDeep}
                    strokeWidth={0.55}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {rows.map((r, i) => {
                    const st = rowStatus(r);
                    const cal = r.calendarCurrentMad ?? 0;
                    const soj = r.g7ProposedMad ?? 0;
                    return (
                      <React.Fragment key={`pt-${r.date}`}>
                        {cal > 0 ? (
                          <circle
                            cx={i + 0.5}
                            cy={100 - priceHeightPct(cal, maxPrice)}
                            r={0.42}
                            fill={T.text}
                          />
                        ) : null}
                        {soj > 0 && st !== 'blocked' ? (
                          <circle
                            cx={i + 0.5}
                            cy={100 - priceHeightPct(soj, maxPrice)}
                            r={0.48}
                            fill={T.gold}
                            stroke={T.goldDeep}
                            strokeWidth={0.12}
                          />
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </Box>
              ) : null}
            </Box>
          </Box>
          <Stack direction="row" sx={{ gap: 2.25, mt: 1.25, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 9, height: 12, borderRadius: '2px', bgcolor: T.infoTint, border: '1px solid rgba(6,115,179,0.35)', mr: 0.625, verticalAlign: '-2px' }} />
              barre bleue = prix marché
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 14, height: 0, borderTop: `2.5px solid ${T.goldDeep}`, mr: 0.625, verticalAlign: 'middle' }} />
              <Box component="span" sx={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', bgcolor: T.gold, border: `1px solid ${T.goldDeep}`, mr: 0.5, verticalAlign: '0px' }} />
              ligne or = prix Sojori
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 14, height: 0, borderTop: `2px solid ${T.text}`, mr: 0.625, verticalAlign: 'middle' }} />
              trait = calendrier actuel
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 9, height: 9, borderRadius: '2px', bgcolor: T.success, opacity: 0.65, mr: 0.625, verticalAlign: '-1px' }} />
              réservé
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 9, height: 9, borderRadius: '2px', border: `1.5px dashed ${T.borderStrong}`, mr: 0.625, verticalAlign: '-1px' }} />
              bloqué sans résa
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', width: 12, height: 3, borderRadius: 2, bgcolor: T.warning, mr: 0.625, verticalAlign: '1px' }} />
              règle de période
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>
              <Box component="span" sx={{ display: 'inline-block', fontFamily: MONO, fontWeight: 900, fontSize: 9, minWidth: 14, textAlign: 'center', borderRadius: '3px', bgcolor: T.infoTint, color: T.info, border: `1px solid ${T.info}`, mr: 0.5, px: 0.375 }}>M</Box>
              manuel
              <Box component="span" sx={{ mx: 0.75, color: T.text4 }}>·</Box>
              <Box component="span" sx={{ display: 'inline-block', fontFamily: MONO, fontWeight: 900, fontSize: 9, minWidth: 14, textAlign: 'center', borderRadius: '3px', bgcolor: T.bg3, color: T.text2, mr: 0.5, px: 0.375 }}>D</Box>
              dynamique
            </Typography>
            {compactBars ? (
              <Typography sx={{ fontSize: 10.5, color: T.text4 }}>
                montants estimés : 1er du mois{rows.length > 180 ? '' : ' + lundis'} · faites défiler →
              </Typography>
            ) : null}
          </Stack>

          {/* Tableau — détail jour par jour · scroll interne si > 31 j */}
          <Box
            sx={{
              overflowX: 'auto',
              mt: 2,
              border: `1px solid ${T.border}`,
              borderRadius: 1.375,
              ...(tableFitsWithoutInnerScroll
                ? { overflowY: 'visible' }
                : { maxHeight: 460, overflowY: 'auto' }),
            }}
          >
            <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%', minWidth: 780 }}>
              <Box component="thead" sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                <Box component="tr">
                  {canEditInventory ? (
                    <Box
                      component="th"
                      sx={{
                        width: 40,
                        p: '9px 8px',
                        borderBottom: `1.5px solid ${T.borderStrong}`,
                        bgcolor: T.bg2,
                        textAlign: 'center',
                      }}
                    >
                      <Checkbox
                        size="small"
                        checked={allFreeSelected}
                        indeterminate={someFreeSelected && !allFreeSelected}
                        disabled={freeRowDates.length === 0}
                        onChange={toggleAllFree}
                        sx={{ p: 0, color: T.text3, '&.Mui-checked': { color: T.goldDeep } }}
                        inputProps={{ 'aria-label': 'Sélectionner tous les jours libres' }}
                      />
                    </Box>
                  ) : null}
                  {['Date', 'Statut (M/D)', 'Prix estimé (marché)', 'Prix Sojori (après réglages)', 'Prix cal. / réservé', 'Δ (résa−estim. / Sojori−cal.)'].map((h, i) => (
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
                    p: '7px 12px',
                    borderBottom: `1px solid ${T.border}`,
                    textAlign: 'right' as const,
                    fontFamily: MONO,
                    fontSize: 12,
                    fontVariantNumeric: 'tabular-nums',
                    bgcolor: st === 'reserved' ? T.successTint : st === 'blocked' ? T.bg2 : undefined,
                    color: st === 'blocked' ? T.text4 : undefined,
                  };
                  return (
                    <React.Fragment key={r.date}>
                      {showMonth ? (
                        <Box component="tr">
                          <Box
                            component="td"
                            colSpan={canEditInventory ? 7 : 6}
                            sx={{ bgcolor: T.bg3, fontFamily: MONO, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.text2, fontWeight: 800, p: '5px 12px' }}
                          >
                            {monthLabelFr(r.date)}
                          </Box>
                        </Box>
                      ) : null}
                      <Box
                        component="tr"
                        onClick={st === 'free' ? () => toggleDate(r.date, st) : undefined}
                        sx={{
                          bgcolor: selectedDates.has(r.date) ? T.goldTint2 : undefined,
                          cursor: st === 'free' ? 'pointer' : 'default',
                          '&:hover': st === 'free' ? { bgcolor: selectedDates.has(r.date) ? T.goldTint : T.bg2 } : undefined,
                        }}
                      >
                        {canEditInventory ? (
                          <Box
                            component="td"
                            sx={{ ...cellSx, textAlign: 'center', width: 40, p: '7px 8px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Checkbox
                              size="small"
                              checked={selectedDates.has(r.date)}
                              disabled={st !== 'free'}
                              onChange={() => toggleDate(r.date, st)}
                              sx={{ p: 0, color: T.text3, '&.Mui-checked': { color: T.goldDeep } }}
                              inputProps={{ 'aria-label': `Sélectionner ${r.date}` }}
                            />
                          </Box>
                        ) : null}
                        <Box component="td" sx={{ ...cellSx, textAlign: 'left', fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {dayLabelFr(r.date)}
                          {rule ? (
                            <Box component="span" sx={{ fontSize: 9.5, borderRadius: 999, px: 0.875, py: 0.125, bgcolor: T.warningTint, color: T.warning, ml: 0.75, fontFamily: MONO, whiteSpace: 'nowrap' }}>
                              {rule.emoji ?? '🗓'} {rule.name}
                            </Box>
                          ) : null}
                          {r.applied?.baseFixeMad != null ? (
                            <Box component="span" title={`Base du calcul : votre prix fixe ${fmt(r.applied.baseFixeMad)} MAD (pas l'estimation marché)`} sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: T.bg3, color: T.text2 }}>
                              🎯 base {fmt(r.applied.baseFixeMad)}
                            </Box>
                          ) : null}
                          {r.applied?.occupancyPct != null ? (
                            <Box component="span" title={`Ajustement occupation appliqué : ${r.applied.occupancyPct > 0 ? '+' : ''}${r.applied.occupancyPct} %`} sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: r.applied.occupancyPct < 0 ? T.errorTint : T.successTint, color: r.applied.occupancyPct < 0 ? T.error : T.success }}>
                              📉 {r.applied.occupancyPct > 0 ? '+' : ''}{r.applied.occupancyPct} %
                            </Box>
                          ) : null}
                          {r.applied?.lastMinutePct != null ? (
                            <Box component="span" title={`Dernière minute appliquée : ${r.applied.lastMinutePct} %`} sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: T.infoTint, color: T.info }}>
                              ⏰ {r.applied.lastMinutePct > 0 ? '+' : ''}{r.applied.lastMinutePct} %
                            </Box>
                          ) : null}
                          {r.applied?.gapMinStay ? (
                            <Box component="span" title={`Comble trous : min stay ${r.applied.gapMinStay.from} → ${r.applied.gapMinStay.to} nuits`} sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: T.goldTint, color: T.goldDeep }}>
                              🧩 {r.applied.gapMinStay.from}→{r.applied.gapMinStay.to} n
                            </Box>
                          ) : null}
                          {r.applied?.gapSignaled ? (
                            <Box component="span" title="Trou d'une nuit signalé (pas de modification automatique)" sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: T.bg3, color: T.text3 }}>
                              🧩 trou 1 n
                            </Box>
                          ) : null}
                          {r.applied?.clamp ? (
                            <Box component="span" title={r.applied.clamp === 'ceiling' ? 'Prix ramené au plafond' : 'Prix remonté au plancher'} sx={{ fontSize: 9.5, borderRadius: 999, px: 0.75, py: 0.125, ml: 0.625, fontFamily: MONO, whiteSpace: 'nowrap', bgcolor: T.bg3, color: T.text2 }}>
                              {r.applied.clamp === 'ceiling' ? '⤒ plafond' : '⤓ plancher'}
                            </Box>
                          ) : null}
                        </Box>
                        <Box component="td" sx={{ ...cellSx, textAlign: 'center' }}>
                          <DayStatusBadge row={r} st={st} />
                        </Box>
                        <Box component="td" sx={cellSx}>{r.airroiMad != null ? fmt(r.airroiMad) : '—'}</Box>
                        <Box component="td" sx={{ ...cellSx, fontWeight: 800 }}>{r.g7ProposedMad != null ? fmt(r.g7ProposedMad) : '—'}</Box>
                        <Box
                          component="td"
                          sx={{
                            ...cellSx,
                            fontWeight: st === 'reserved' ? 800 : 400,
                            color: st === 'reserved' ? T.info : cellSx.color,
                            bgcolor:
                              st === 'reserved'
                                ? T.infoTint
                                : cellSx.bgcolor,
                          }}
                          title={
                            st === 'reserved'
                              ? r.bookedPriceMad != null
                                ? 'Prix Sojori figé à la réservation (priceBreakdown)'
                                : 'Réservé — prix à la réservation indisponible'
                              : undefined
                          }
                        >
                          {st === 'reserved'
                            ? r.bookedPriceMad != null
                              ? fmt(r.bookedPriceMad)
                              : '—'
                            : r.calendarCurrentMad != null
                              ? fmt(r.calendarCurrentMad)
                              : '—'}
                        </Box>
                        <Box
                          component="td"
                          sx={{
                            ...cellSx, fontWeight: 800,
                            color:
                              delta == null
                                ? T.text4
                                : delta > 0
                                  ? T.success
                                  : delta < 0
                                    ? T.error
                                    : T.text4,
                            opacity: st === 'free' ? 1 : 0.75,
                          }}
                        >
                          {delta == null ? '—' : `${delta > 0 ? '+' : ''}${fmt(delta)}`}
                          {st === 'reserved' ? (
                            <Box component="span" sx={{ fontSize: 9.5, color: T.info, fontWeight: 400, ml: 0.625 }}>
                              {r.bookedPriceMad != null ? 'vs estim.' : 'figé'}
                            </Box>
                          ) : st === 'blocked' ? (
                            <Box component="span" sx={{ fontSize: 9.5, color: T.text4, fontWeight: 400, ml: 0.625 }}>non poussé</Box>
                          ) : calendarPriceMode(r) === 'manual' ? (
                            <Box component="span" sx={{ fontSize: 9.5, color: T.info, fontWeight: 400, ml: 0.625 }}>M</Box>
                          ) : null}
                        </Box>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Pied : aide */}
          <Typography sx={{ fontSize: 11, color: T.text3, mt: 1.75 }}>
            Cochez des jours libres → « Modifier » dans le bandeau en haut.
            Les jours réservés affichent le prix figé à la réservation (bleu) · les bloqués ne sont jamais poussés.
          </Typography>
        </>
      ) : null}
    </Box>
  );
}
