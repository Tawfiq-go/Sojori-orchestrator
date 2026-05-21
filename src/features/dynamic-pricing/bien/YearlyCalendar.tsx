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
  /** Snapshot AirROI brut (future/rates) — 2ᵉ courbe quand pilote actif */
  compareMarketDays?: CalendarDay[];
  /** Dans BienView : pas de titre dupliqué, en-tête compact */
  compactHeader?: boolean;
  /** airroi = suggestion marché (1 prix/jour) · sojori = moteur interne */
  pricingSource?: CalendarPricingSource;
  /** rolling365 = courbe + grille à partir d'aujourd'hui (défaut marché) */
  windowMode?: CalendarWindowMode;
  year?: number;
  yearOptions?: number[];
  sourceHint?: string;
  /** Libellé du lien d’aide (défaut selon pricingSource) */
  sourceLinkLabel?: string;
  emptyHint?: string;
  onYearChange?: (year: number) => void;
  onDayClick: (day: CalendarDay) => void;
  onApplyToOps: () => void | Promise<void>;
  applyLoading?: boolean;
  /** Masquer le CTA ops quand lecture seule (ex. marché sans pilote actif) */
  showApplyButton?: boolean;
  /** Vue prix : sync pilote active */
  priceSyncActive?: boolean;
  /** Min stay non sync → bandeau rouge */
  minStaySyncActive?: boolean;
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

function sliceVisibleDays(
  source: CalendarDay[],
  windowMode: CalendarWindowMode,
  year: number,
  today: string,
  enrichTiers: boolean,
): CalendarDay[] {
  const slice =
    windowMode === 'calendarYear'
      ? filterCalendarYear(source, year)
      : filterRolling365(source, today);
  return enrichTiers ? enrichDaysWithPriceTiers(slice) : slice;
}

export default function YearlyCalendar({
  days,
  compareMarketDays,
  compactHeader = false,
  pricingSource = 'sojori',
  windowMode = 'rolling365',
  year = new Date().getFullYear(),
  yearOptions = [year],
  sourceHint,
  sourceLinkLabel,
  emptyHint,
  onYearChange,
  onDayClick,
  onApplyToOps,
  applyLoading = false,
  showApplyButton = true,
  priceSyncActive = true,
  minStaySyncActive = true,
}: YearlyCalendarProps) {
  const today = todayIsoLocal();
  const windowEnd = addDaysIso(today, 365);
  const helpLinkLabel =
    sourceLinkLabel ??
    (pricingSource === 'airroi' ? 'Source marché (AirROI) ⓘ' : 'Source pilote Sojori ⓘ');

  const dualCurve = Boolean(compareMarketDays?.length && windowMode === 'rolling365');

  const visibleDays = useMemo(
    () => sliceVisibleDays(days, windowMode, year, today, pricingSource === 'airroi' && !dualCurve),
    [days, windowMode, year, today, pricingSource, dualCurve],
  );

  const visibleMarketDays = useMemo(() => {
    if (!compareMarketDays?.length) return [];
    return sliceVisibleDays(compareMarketDays, windowMode, year, today, true);
  }, [compareMarketDays, windowMode, year, today]);

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

  const eventDayCount = useMemo(
    () => visibleDays.filter((d) => d.status === 'override').length,
    [visibleDays],
  );

  const chartData = useMemo(() => {
    if (!dualCurve) {
      return visibleDays.map((d) => ({
        date: d.date,
        marketPrice: null as number | null,
        pilotPrice:
          d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
        price:
          d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
        status: d.status,
        tierLabel:
          d.status === 'override'
            ? 'Event'
            : d.priceTier === 'low'
              ? 'Bas'
              : d.priceTier === 'high'
                ? 'Haut'
                : d.priceTier === 'mid'
                  ? 'Moyen'
                  : undefined,
      }));
    }
    const marketByDate = new Map(
      visibleMarketDays.map((d) => [
        d.date,
        {
          price:
            d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
          tierLabel:
            d.priceTier === 'low'
              ? 'Bas'
              : d.priceTier === 'high'
                ? 'Haut'
                : d.priceTier === 'mid'
                  ? 'Moyen'
                  : undefined,
        },
      ]),
    );
    const pilotByDate = new Map(
      visibleDays.map((d) => [
        d.date,
        {
          price:
            d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
          status: d.status,
        },
      ]),
    );
    const dates = new Set([...marketByDate.keys(), ...pilotByDate.keys()]);
    return [...dates]
      .sort()
      .map((date) => {
        const pilot = pilotByDate.get(date);
        const market = marketByDate.get(date);
        return {
          date,
          marketPrice: market?.price ?? null,
          pilotPrice: pilot?.price ?? null,
          price: pilot?.price ?? market?.price ?? null,
          status: pilot?.status,
          tierLabel: market?.tierLabel,
        };
      });
  }, [dualCurve, visibleDays, visibleMarketDays]);

  const priceExtent = useMemo(() => {
    const prices: number[] = [];
    for (const row of chartData) {
      if (row.marketPrice != null && row.marketPrice > 0) prices.push(row.marketPrice);
      if (row.pilotPrice != null && row.pilotPrice > 0) prices.push(row.pilotPrice);
      if (!dualCurve && row.price != null && row.price > 0) prices.push(row.price);
    }
    if (!prices.length) return { min: 0, max: 0, marketMin: 0, marketMax: 0, pilotMin: 0, pilotMax: 0 };
    const marketPrices = chartData
      .map((r) => r.marketPrice)
      .filter((p): p is number => p != null && p > 0);
    const pilotPrices = chartData
      .map((r) => r.pilotPrice)
      .filter((p): p is number => p != null && p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      marketMin: marketPrices.length ? Math.min(...marketPrices) : 0,
      marketMax: marketPrices.length ? Math.max(...marketPrices) : 0,
      pilotMin: pilotPrices.length ? Math.min(...pilotPrices) : 0,
      pilotMax: pilotPrices.length ? Math.max(...pilotPrices) : 0,
    };
  }, [chartData, dualCurve]);

  const dualCoverage = useMemo(() => {
    if (!dualCurve || windowMode !== 'rolling365') return null;
    const expected = countExpectedDaysInWindow(today, windowEnd);
    const marketWith = visibleMarketDays.filter(
      (d) => d.status !== 'blocked' && d.recommendedPrice > 0,
    ).length;
    const pilotWith = visibleDays.filter(
      (d) => d.status !== 'blocked' && d.recommendedPrice > 0,
    ).length;
    return { expected, marketWith, pilotWith };
  }, [dualCurve, windowMode, today, windowEnd, visibleMarketDays, visibleDays]);

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

  const syncBanner =
    priceSyncActive === false ? (
      <Typography sx={{ fontSize: 11, color: '#c62828', fontWeight: 700, mb: 1 }}>
        Vue prix : non synchronisée vers le calendrier (activez « Prix » dans Sojori AI).
      </Typography>
    ) : minStaySyncActive === false ? (
      <Typography sx={{ fontSize: 11, color: '#c62828', fontWeight: 700, mb: 1 }}>
        Vue prix uniquement — le séjour minimum n’est pas poussé au calendrier (min stay sync OFF).
      </Typography>
    ) : null;

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
      <Stack sx={{ gap: 1.25,  mb: 2 }}>
        {syncBanner}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          sx={{ gap: 1.25,  alignItems: { xs: 'stretch', sm: 'flex-start' }, justifyContent: 'space-between' }}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            {!compactHeader ? (
              <Typography sx={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.015em' }}>
                {title}
              </Typography>
            ) : null}
            {compactHeader ? (
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                sx={{ gap: 1, alignItems: { xs: 'stretch', md: 'center' }, minWidth: 0 }}
              >
                <Box sx={{ minWidth: 0, flex: '1 1 auto' }}>
                  {rangeLabel ? (
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: T.text2,
                        fontWeight: 600,
                        fontFamily: '"Geist Mono", monospace',
                      }}
                    >
                      {rangeLabel}
                    </Typography>
                  ) : null}
                  {sourceHint ? (
                    <Tooltip title={sourceHint} arrow placement="top">
                      <Typography
                        component="span"
                        sx={{
                          fontSize: 11,
                          color: T.text3,
                          cursor: 'help',
                          borderBottom: `1px dotted ${T.borderStrong}`,
                          display: 'inline-block',
                          mt: 0.25,
                        }}
                      >
                        {helpLinkLabel}
                      </Typography>
                    </Tooltip>
                  ) : null}
                </Box>
                <CalendarLegendBar pricingSource={pricingSource} windowMode={windowMode} />
              </Stack>
            ) : (
              <>
                {rangeLabel ? (
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: T.text2,
                      mt: 0.25,
                      fontWeight: 600,
                      fontFamily: '"Geist Mono", monospace',
                    }}
                  >
                    {rangeLabel}
                  </Typography>
                ) : null}
                {sourceHint ? (
                  <Typography sx={{ fontSize: 11, color: T.text3, lineHeight: 1.35, mt: 0.5 }}>
                    {sourceHint}
                  </Typography>
                ) : null}
              </>
            )}
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

        {coverage ? (
          <Stack direction="row" sx={{ gap: 0.75,  flexWrap: 'wrap', width: '100%' }}>
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
            {pricingSource === 'airroi' ? (
              <Chip
                size="small"
                variant="outlined"
                label="Couleurs : bas · moyen · haut"
                sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}
              />
            ) : (
              <Chip
                size="small"
                variant="outlined"
                label="Standard · Premium · Borne · Event…"
                sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5 }}
              />
            )}
          </Stack>
        ) : null}

        {!compactHeader ? (
          <CalendarLegendBar pricingSource={pricingSource} windowMode={windowMode} />
        ) : null}
      </Stack>

      {/* Courbe prix/jour — fenêtre glissante depuis aujourd'hui */}
      {windowMode === 'rolling365' && chartData.length > 0 && (
        <Box sx={{ mb: 2.5 }}>
          <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text2 }}>
              {dualCurve ? 'Courbes des prix (MAD / nuit)' : 'Courbe des prix (MAD / nuit)'}
            </Typography>
            <Typography
              sx={{
                fontSize: 10.5,
                color: T.text4,
                fontFamily: '"Geist Mono", monospace',
                textAlign: 'right',
                maxWidth: '62%',
              }}
            >
              {dualCoverage ? (
                <>
                  AirROI {dualCoverage.marketWith}/{dualCoverage.expected} j
                  <Box component="span" sx={{ mx: 0.5 }}>·</Box>
                  Pilote {dualCoverage.pilotWith}/{dualCoverage.expected} j
                  <Box component="span" sx={{ display: 'block', mt: 0.25 }}>
                    Marché {priceExtent.marketMin}–{priceExtent.marketMax} MAD
                    <Box component="span" sx={{ mx: 0.5 }}>·</Box>
                    Pilote {priceExtent.pilotMin}–{priceExtent.pilotMax} MAD
                  </Box>
                </>
              ) : (
                <>
                  {coverage
                    ? `${coverage.withPrice}/${coverage.expected} j`
                    : `${visibleDays.length} j`}{' '}
                  · min {priceExtent.min} · max {priceExtent.max} MAD
                </>
              )}
              {eventDayCount > 0 ? (
                <Box component="span" sx={{ color: STATUS_BG.override, fontWeight: 800, ml: 0.75 }}>
                  · {eventDayCount} event
                </Box>
              ) : null}
            </Typography>
          </Stack>
          {dualCurve ? (
            <Stack direction="row" sx={{ gap: 1.5, mb: 1, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 10.5, color: T.text2 }}>
                <Box sx={{ width: 22, height: 0, borderTop: '2px dashed #4a7fb8' }} />
                <b>AirROI brut</b> (snapshot future/rates)
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, fontSize: 10.5, color: T.text2 }}>
                <Box sx={{ width: 22, height: 3, bgcolor: T.goldDeep, borderRadius: 0.5 }} />
                <b>Pilote Sojori</b> (modes + bornes + events)
              </Box>
            </Stack>
          ) : null}
          <Box
            sx={{
              height: dualCurve ? 200 : 168,
              width: '100%',
              minWidth: 0,
              minHeight: dualCurve ? 200 : 168,
              position: 'relative',
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={dualCurve ? 200 : 168}>
              <AreaChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <defs>
                  <linearGradient id="dpPriceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={T.gold} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={T.gold} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="dpMarketGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4a7fb8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#4a7fb8" stopOpacity={0.02} />
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
                  formatter={(v: number, name: string, item) => {
                    const p = item?.payload as { tierLabel?: string; status?: DayStatus };
                    if (name === 'Pilote Sojori' && p?.status === 'override') {
                      return [`${Math.round(v).toLocaleString('fr-FR')} MAD`, 'Pilote · event forcé'];
                    }
                    if (name === 'Marché AirROI') {
                      const tier = p?.tierLabel;
                      return [
                        `${Math.round(v).toLocaleString('fr-FR')} MAD`,
                        tier ? `AirROI · ${tier}` : 'AirROI brut',
                      ];
                    }
                    const tier = p?.tierLabel;
                    return [
                      `${Math.round(v).toLocaleString('fr-FR')} MAD`,
                      tier ? `marché · ${tier}` : String(name || 'Prix'),
                    ];
                  }}
                />
                {dualCurve ? (
                  <>
                    <Area
                      type="monotone"
                      name="Marché AirROI"
                      dataKey="marketPrice"
                      connectNulls={false}
                      stroke="#4a7fb8"
                      strokeWidth={1.75}
                      strokeDasharray="5 4"
                      fill="url(#dpMarketGrad)"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      name="Pilote Sojori"
                      dataKey="pilotPrice"
                      connectNulls={false}
                      stroke={T.goldDeep}
                      strokeWidth={2}
                      fill="url(#dpPriceGrad)"
                      dot={ChartEventDot}
                      activeDot={(props: {
                        cx?: number;
                        cy?: number;
                        payload?: { status?: DayStatus };
                      }) => {
                        const isEvent = props.payload?.status === 'override';
                        return (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={isEvent ? 6 : 4}
                            fill={isEvent ? STATUS_BG.override : T.goldDeep}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      }}
                      isAnimationActive={false}
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="price"
                    connectNulls={false}
                    stroke={T.goldDeep}
                    strokeWidth={2}
                    fill="url(#dpPriceGrad)"
                    dot={ChartEventDot}
                    activeDot={(props: { cx?: number; cy?: number; payload?: { status?: DayStatus } }) => {
                      const isEvent = props.payload?.status === 'override';
                      return (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={isEvent ? 6 : 4}
                          fill={isEvent ? STATUS_BG.override : T.goldDeep}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      );
                    }}
                  />
                )}
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
        sx={{ alignItems: 'center', gap: 1.125, 
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
          ) : windowMode === 'rolling365' && eventDayCount > 0 ? (
            <>
              Courbe pilote · <b style={{ color: STATUS_BG.override }}>points orange = event</b>{' '}
              (prix forcé MAD/nuit). Reste = marché + modes + bornes. Clic jour = justification G7.
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

function ChartEventDot(props: {
  cx?: number;
  cy?: number;
  payload?: { status?: DayStatus; price?: number | null };
}) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null || payload?.status !== 'override' || payload.price == null) {
    return null;
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={STATUS_BG.override}
      stroke="#fff"
      strokeWidth={1.5}
    />
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

function CalendarLegendBar({
  pricingSource,
  windowMode,
}: {
  pricingSource: CalendarPricingSource;
  windowMode: CalendarWindowMode;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        alignItems: 'center',
        flexShrink: 0,
        minWidth: 0,
        maxWidth: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        gap: 0,
        py: 0.625,
        px: 1,
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.125,
        fontSize: 10.5,
        fontFamily: '"Geist Mono", monospace',
        fontWeight: 600,
        color: T.text2,
        WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { bgcolor: T.borderStrong, borderRadius: 99 },
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
    </Box>
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
    <Stack
      direction="row"
      sx={{
        gap: 0.5,
        alignItems: 'center',
        px: 0.75,
        flexShrink: 0,
        whiteSpace: 'nowrap',
      }}
    >
      <Box
        sx={{
          width: 12,
          height: 12,
          borderRadius: '4px',
          bgcolor: color,
          border: bordered ? `1px solid ${T.borderStrong}` : 'none',
          flexShrink: 0,
        }}
      />
      <Box component="span" sx={{ lineHeight: 1.2 }}>
        {children}
      </Box>
    </Stack>
  );
}

function Sep() {
  return <Box sx={{ width: 1, height: 12, bgcolor: T.border, flexShrink: 0, mx: 0.125 }} />;
}
