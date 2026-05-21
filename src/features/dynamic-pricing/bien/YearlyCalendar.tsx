// ════════════════════════════════════════════════════════════════════
// YearlyCalendar.tsx — Section 4 : courbe 365j depuis aujourd'hui + heatmap
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Button, Tooltip, Chip } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { T } from '../_tokens';
import DataEmptyPlaceholder from '../DataEmptyPlaceholder';
import {
  addDaysIso,
  buildCalendarYearHeatmapMonths,
  buildRollingHeatmapMonths,
  filterCalendarYear,
  filterRolling365,
  formatFrShort,
  todayIsoLocal,
  type DayPhase,
  type HeatmapCell,
  type HeatmapMonth,
} from '../utils/calendarWindow';
import {
  countExpectedDaysInWindow,
  enrichDaysWithPriceTiers,
  type CalendarPricingSource,
  type PriceTier,
} from '../utils/priceTiers';

/** Coins des cases heatmap — % pour suivre la taille responsive des cellules */
const HEATMAP_CELL_RADIUS = '42%';

export type DayStatus = 'std' | 'prem' | 'clamp' | 'override' | 'anomaly' | 'blocked';

export interface CalendarDay {
  date: string;
  recommendedPrice: number;
  status: DayStatus;
  /** Tertile bas/moyen/haut (mode marché uniquement) */
  priceTier?: PriceTier;
}

export type CalendarWindowMode = 'rolling365' | 'calendarYear';

const TIER_BG: Record<PriceTier, string> = {
  low: '#9ec5e8',
  mid: '#6fbf63',
  high: '#2a6b2a',
};

export interface YearlyCalendarProps {
  days: CalendarDay[];
  /** Dans BienView : pas de titre dupliqué, en-tête compact */
  compactHeader?: boolean;
  /** airroi = suggestion marché (1 prix/jour) · sojori = moteur interne */
  pricingSource?: CalendarPricingSource;
  /** rolling365 = courbe + grille à partir d'aujourd'hui (défaut marché) */
  windowMode?: CalendarWindowMode;
  year?: number;
  yearOptions?: number[];
  sourceHint?: string;
  emptyHint?: string;
  onYearChange?: (year: number) => void;
  onDayClick: (day: CalendarDay) => void;
  onApplyToOps: () => void | Promise<void>;
  applyLoading?: boolean;
  /** Masquer le CTA ops quand lecture seule (ex. marché sans pilote actif) */
  showApplyButton?: boolean;
}

const STATUS_BG: Record<DayStatus, string> = {
  std: '#a8e0a3',
  prem: '#3a8a3a',
  clamp: '#7fc4f7',
  override: '#ff9c40',
  anomaly: '#dc2626',
  blocked: T.bg3,
};

const chartTooltipStyle = {
  background: T.bg1,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  fontSize: 12,
  fontFamily: '"Geist Mono", monospace',
};

export default function YearlyCalendar({
  days,
  compactHeader = false,
  pricingSource = 'sojori',
  windowMode = 'rolling365',
  year = new Date().getFullYear(),
  yearOptions = [year],
  sourceHint,
  emptyHint,
  onYearChange,
  onDayClick,
  onApplyToOps,
  applyLoading = false,
  showApplyButton = true,
}: YearlyCalendarProps) {
  const today = todayIsoLocal();
  const windowEnd = addDaysIso(today, 365);

  const visibleDays = useMemo(() => {
    let slice: CalendarDay[];
    if (windowMode === 'calendarYear') {
      slice = filterCalendarYear(days, year);
    } else {
      slice = filterRolling365(days, today);
    }
    return pricingSource === 'airroi' ? enrichDaysWithPriceTiers(slice) : slice;
  }, [days, windowMode, year, today, pricingSource]);

  const coverage = useMemo(() => {
    if (windowMode !== 'rolling365') return null;
    const expected = countExpectedDaysInWindow(today, windowEnd);
    const withPrice = visibleDays.filter(
      (d) => d.status !== 'blocked' && d.recommendedPrice > 0,
    ).length;
    const blocked = visibleDays.filter((d) => d.status === 'blocked').length;
    const missing = Math.max(0, expected - visibleDays.length);
    return { expected, withPrice, blocked, missing };
  }, [visibleDays, windowMode, today, windowEnd]);

  const chartData = useMemo(
    () =>
      visibleDays.map((d) => ({
        date: d.date,
        price: d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
        status: d.status,
        tierLabel:
          d.priceTier === 'low'
            ? 'Bas'
            : d.priceTier === 'high'
              ? 'Haut'
              : d.priceTier === 'mid'
                ? 'Moyen'
                : undefined,
      })),
    [visibleDays],
  );

  const priceExtent = useMemo(() => {
    const prices = visibleDays
      .map((d) => d.recommendedPrice)
      .filter((p) => p > 0);
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [visibleDays]);

  const monthGrids: HeatmapMonth[] = useMemo(() => {
    if (windowMode === 'calendarYear') {
      return buildCalendarYearHeatmapMonths(visibleDays, year, today);
    }
    return buildRollingHeatmapMonths(visibleDays, today);
  }, [visibleDays, windowMode, year, today]);

  const title =
    pricingSource === 'airroi'
      ? windowMode === 'rolling365'
        ? 'Suggestion de prix marché · 365 j à venir'
        : `Suggestion marché ${year}`
      : windowMode === 'rolling365'
        ? 'Prix recommandés Sojori · 365 j à venir'
        : `Prix recommandés Sojori ${year}`;

  const rangeLabel =
    windowMode === 'rolling365'
      ? `${formatFrShort(today)} → ${formatFrShort(addDaysIso(today, 364))}`
      : undefined;

  if (days.length === 0) {
    return (
      <DataEmptyPlaceholder
        title="Calendrier vide"
        hint={
          emptyHint ??
          'Relancez ⟳ Envoyer · récupérer (future/rates) ou Recalculer 365 j dans la modal données'
        }
      />
    );
  }

  if (visibleDays.length === 0) {
    return (
      <DataEmptyPlaceholder
        title="Aucun jour dans la fenêtre"
        hint={
          windowMode === 'rolling365'
            ? `Les tarifs en base commencent peut‑être avant aujourd’hui ou après le ${formatFrShort(windowEnd)}. Relancez ⟳ pour actualiser future/rates.`
            : `Aucune date en ${year} — essayez l’autre année.`
        }
      />
    );
  }

  return (
    <Box
      sx={{
        maxWidth: 1380,
        mx: 'auto',
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 2.25,
        p: 2.75,
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <Stack gap={1.25} sx={{ mb: 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          gap={1.25}
          sx={{ alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {!compactHeader ? (
              <Typography sx={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.015em' }}>
                {title}
              </Typography>
            ) : null}
            {rangeLabel ? (
              <Typography
                sx={{
                  fontSize: 12,
                  color: T.text2,
                  mt: compactHeader ? 0 : 0.25,
                  fontWeight: 600,
                  fontFamily: '"Geist Mono", monospace',
                }}
              >
                {rangeLabel}
              </Typography>
            ) : null}
            {sourceHint ? (
              <Stack direction="row" alignItems="center" gap={0.5} sx={{ mt: 0.5, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    color: T.text3,
                    lineHeight: 1.35,
                    display: compactHeader ? 'none' : 'block',
                  }}
                >
                  {sourceHint}
                </Typography>
                {compactHeader ? (
                  <Tooltip title={sourceHint} arrow placement="top">
                    <Typography
                      component="span"
                      sx={{
                        fontSize: 11,
                        color: T.text3,
                        cursor: 'help',
                        borderBottom: `1px dotted ${T.borderStrong}`,
                      }}
                    >
                      Source marché ⓘ
                    </Typography>
                  </Tooltip>
                ) : null}
              </Stack>
            ) : null}
          </Box>

          {windowMode === 'calendarYear' && yearOptions.length > 1 && onYearChange && (
            <Stack
              direction="row"
              sx={{
                bgcolor: T.bg2,
                border: `1px solid ${T.border}`,
                borderRadius: 1.125,
                p: 0.375,
                gap: 0.125,
              }}
            >
              {yearOptions.map((y) => (
                <Box
                  key={y}
                  component="button"
                  onClick={() => onYearChange(y)}
                  sx={{
                    all: 'unset',
                    cursor: 'pointer',
                    px: 1.375,
                    py: 0.625,
                    borderRadius: 0.75,
                    fontSize: 11.5,
                    fontWeight: 700,
                    fontFamily: '"Geist Mono", monospace',
                    letterSpacing: '0.04em',
                    color: y === year ? T.gold : T.text3,
                    bgcolor: y === year ? '#1a1408' : 'transparent',
                  }}
                >
                  {y}
                </Box>
              ))}
            </Stack>
          )}

          {showApplyButton ? (
            <Button
              onClick={() => void onApplyToOps()}
              disabled={applyLoading}
              sx={{
                alignSelf: { xs: 'stretch', sm: 'flex-start' },
                flexShrink: 0,
                px: 2,
                py: 1.125,
                borderRadius: 1.25,
                fontSize: 12,
                fontWeight: 800,
                background: `linear-gradient(180deg, #f9dc7a, ${T.gold})`,
                color: T.text,
                boxShadow: `0 2px 8px ${T.goldTint2}, inset 0 1px 0 rgba(255,255,255,0.40)`,
                textTransform: 'none',
                whiteSpace: 'nowrap',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: '0 4px 12px rgba(244,207,94,0.50)',
                },
              }}
            >
              {applyLoading
                ? 'Application…'
                : pricingSource === 'airroi'
                  ? 'Activer pilote §03 puis appliquer'
                  : '✨ Appliquer au calendrier ops + RU'}
            </Button>
          ) : null}
        </Stack>

        {coverage && pricingSource === 'airroi' ? (
          <Stack direction="row" gap={0.75} sx={{ flexWrap: 'wrap', width: '100%' }}>
            <Chip
              size="small"
              label={`${coverage.withPrice} j prix`}
              sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5, fontWeight: 700 }}
            />
            {coverage.missing > 0 ? (
              <Chip
                size="small"
                variant="outlined"
                label={`${coverage.missing} sans donnée`}
                sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}
              />
            ) : null}
            {coverage.blocked > 0 ? (
              <Chip
                size="small"
                variant="outlined"
                label={`${coverage.blocked} indispo.`}
                sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}
              />
            ) : null}
            <Chip
              size="small"
              variant="outlined"
              label="Couleurs : bas · moyen · haut"
              sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}
            />
          </Stack>
        ) : null}

        <Stack
          direction="row"
          alignItems="center"
          gap={0.75}
          flexWrap="wrap"
          sx={{
            p: '8px 12px',
            bgcolor: T.bg2,
            border: `1px solid ${T.border}`,
            borderRadius: 1.125,
            fontSize: 11.5,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 600,
            color: T.text2,
            width: '100%',
            rowGap: 0.75,
          }}
        >
          {pricingSource === 'airroi' ? (
            <>
              <LegendItem color={TIER_BG.low}>Bas</LegendItem>
              <Sep />
              <LegendItem color={TIER_BG.mid}>Moyen</LegendItem>
              <Sep />
              <LegendItem color={TIER_BG.high}>Haut</LegendItem>
              <Sep />
              <LegendItem color={T.bg3} bordered>
                Indisponible
              </LegendItem>
              <Sep />
              <LegendItem color="#f0ebe3" bordered>
                Sans donnée
              </LegendItem>
            </>
          ) : (
            <>
              <LegendItem color={STATUS_BG.std}>Standard</LegendItem>
              <Sep />
              <LegendItem color={STATUS_BG.prem}>Premium</LegendItem>
              <Sep />
              <LegendItem color={STATUS_BG.clamp}>Borne</LegendItem>
              <Sep />
              <LegendItem color={STATUS_BG.override}>Override</LegendItem>
              <Sep />
              <LegendItem color={STATUS_BG.anomaly}>Anomalie</LegendItem>
              <Sep />
              <LegendItem color={STATUS_BG.blocked} bordered>
                Bloqué
              </LegendItem>
            </>
          )}
          {windowMode === 'rolling365' && (
            <>
              <Sep />
              <LegendItem color={T.gold}>Aujourd’hui</LegendItem>
            </>
          )}
        </Stack>
      </Stack>

      {/* Courbe prix/jour — fenêtre glissante depuis aujourd'hui */}
      {windowMode === 'rolling365' && chartData.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text2 }}>
              Courbe des prix (MAD / nuit)
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: T.text4, fontFamily: '"Geist Mono", monospace' }}>
              {coverage
                ? `${coverage.withPrice}/${coverage.expected} j`
                : `${visibleDays.length} j`}{' '}
              · min {priceExtent.min} · max {priceExtent.max} MAD
            </Typography>
          </Stack>
          <Box sx={{ height: 168, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="dpPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.gold} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={T.gold} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={T.border} strokeDasharray="2 2" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 9, fill: T.text4, fontFamily: 'Geist Mono' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={48}
                  tickFormatter={(v: string) => {
                    const [, m, d] = v.split('-');
                    return `${d}/${m}`;
                  }}
                />
                <YAxis
                  tick={{ fontSize: 9, fill: T.text4, fontFamily: 'Geist Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v: number) => String(Math.round(v))}
                  domain={['auto', 'auto']}
                />
                <RechartsTooltip
                  contentStyle={chartTooltipStyle}
                  labelFormatter={(l) => formatFrShort(String(l))}
                  formatter={(v: number, _n, item) => {
                    const tier = (item?.payload as { tierLabel?: string })?.tierLabel;
                    return [`${v} MAD`, tier ? `marché · ${tier}` : 'Prix'];
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  connectNulls={false}
                  stroke={T.goldDeep}
                  strokeWidth={2}
                  fill="url(#dpPriceGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: T.goldDeep, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}

      {/* Heatmap — uniquement les mois couverts par la fenêtre */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(3, minmax(52px, 1fr))',
            sm: 'repeat(4, minmax(52px, 1fr))',
            md: `repeat(${Math.min(monthGrids.length, 12)}, minmax(52px, 1fr))`,
          },
          gap: 1.25,
        }}
      >
        {monthGrids.map((mg) => (
            <Box key={`${mg.sortKey}-${mg.label}`} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 10.5,
                  fontFamily: '"Geist Mono", monospace',
                  fontWeight: 800,
                  color: T.text2,
                  textAlign: 'center',
                  mb: 0.75,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {mg.label}
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px' }}>
                {mg.cells.map((cell, idx) => (
                  <HeatmapCellView
                    key={`${mg.label}-${idx}`}
                    cell={cell}
                    pricingSource={pricingSource}
                    onDayClick={onDayClick}
                  />
                ))}
              </Box>
            </Box>
        ))}
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        gap={1.125}
        sx={{
          mt: 1.75,
          p: '11px 14px',
          borderRadius: 1.125,
          background: `linear-gradient(90deg, ${T.goldTint}, transparent)`,
          fontSize: 12,
          color: T.text2,
        }}
      >
        <Box>💡</Box>
        <Box>
          {windowMode === 'rolling365' && pricingSource === 'airroi' ? (
            <>
              <b>Suggestion marché</b> (pas votre calendrier ops) : un seul prix/nuit par
              jour reçu. Cases pointillées = jour absent de l’API. Couleurs = bas / moyen / haut
              (tertiles). Clic jour = détail.
            </>
          ) : windowMode === 'rolling365' ? (
            <>
              Calendrier prospectif Sojori · <b>aujourd’hui</b> en or. Clic = justification.
            </>
          ) : (
            <>
              Survol = aperçu · clic = <b>Justification G7</b>. Calendrier opérationnel séparé — « Appliquer
              ces prix » pour exporter.
            </>
          )}
        </Box>
      </Stack>
    </Box>
  );
}

function HeatmapCellView({
  cell,
  pricingSource,
  onDayClick,
}: {
  cell: HeatmapCell;
  pricingSource: CalendarPricingSource;
  onDayClick: (day: CalendarDay) => void;
}) {
  if (cell.type === 'pad') {
    return (
      <Box
        sx={{ width: '100%', aspectRatio: '1', borderRadius: HEATMAP_CELL_RADIUS, bgcolor: 'transparent' }}
        aria-hidden
      />
    );
  }
  if (cell.type === 'missing') {
    return (
      <Box
        title={`${cell.date} · pas de tarif marché`}
        aria-hidden
        sx={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: HEATMAP_CELL_RADIUS,
          bgcolor: '#f0ebe3',
          border: `1px dashed ${T.borderStrong}`,
          opacity: 0.9,
        }}
      />
    );
  }
  if (cell.type === 'past') {
    return (
      <Box
        title={`${cell.date} · passé`}
        aria-hidden
        sx={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: HEATMAP_CELL_RADIUS,
          bgcolor: T.bg3,
          opacity: 0.55,
          border: `1px dashed ${T.border}`,
        }}
      />
    );
  }
  return (
    <DayCell
      day={cell.day}
      phase={cell.phase}
      pricingSource={pricingSource}
      onClick={() => onDayClick(cell.day)}
    />
  );
}

function DayCell({
  day,
  phase,
  pricingSource,
  onClick,
}: {
  day: CalendarDay;
  phase: DayPhase;
  pricingSource: CalendarPricingSource;
  onClick: () => void;
}) {
  const [hover, setHover] = useState(false);
  const isToday = phase === 'today';
  const isPast = phase === 'past';
  const priceLabel =
    day.recommendedPrice > 0 ? `${day.recommendedPrice} MAD` : '—';
  const tierLabel =
    day.priceTier === 'low'
      ? 'Bas'
      : day.priceTier === 'high'
        ? 'Haut'
        : day.priceTier === 'mid'
          ? 'Moyen'
          : '';
  const tierBg =
    pricingSource === 'airroi' && day.priceTier && day.status !== 'blocked'
      ? TIER_BG[day.priceTier]
      : null;

  return (
    <Box
      role={isPast ? undefined : 'button'}
      aria-label={`${day.date} · ${priceLabel}`}
      onClick={isPast ? undefined : onClick}
      onMouseEnter={() => !isPast && setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={`${day.date} · ${priceLabel}${tierLabel ? ` · ${tierLabel}` : ''}${isToday ? ' · aujourd’hui' : ''}`}
      sx={{
        width: '100%',
        aspectRatio: '1',
        borderRadius: HEATMAP_CELL_RADIUS,
        cursor: isPast ? 'default' : 'pointer',
        bgcolor: isToday
          ? T.gold
          : tierBg ?? (day.status === 'blocked' ? T.bg3 : STATUS_BG[day.status]),
        opacity: 1,
        border: isToday
          ? `2px solid ${T.goldDeep}`
          : isPast
            ? `1px dashed ${T.border}`
            : day.status === 'blocked'
              ? `1px solid ${T.borderStrong}`
              : 'none',
        boxShadow: isToday ? `0 0 0 2px ${T.goldTint2}` : undefined,
        transition: 'transform 0.12s',
        transform: hover && !isPast ? 'scale(1.35)' : undefined,
        zIndex: hover ? 5 : isToday ? 3 : 1,
        position: 'relative',
      }}
    />
  );
}

function LegendItem({
  color,
  bordered,
  children,
}: {
  color: string;
  bordered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" gap={0.625} sx={{ alignItems: 'center', px: 0.875 }}>
      <Box
        sx={{
          width: 13,
          height: 13,
          borderRadius: '5px',
          bgcolor: color,
          border: bordered ? `1px solid ${T.borderStrong}` : 'none',
        }}
      />
      {children}
    </Stack>
  );
}

function Sep() {
  return <Box sx={{ width: 1, height: 14, bgcolor: T.border }} />;
}
