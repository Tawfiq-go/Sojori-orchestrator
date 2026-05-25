// ════════════════════════════════════════════════════════════════════
// YearlyCalendar.tsx — Section 4 : courbe 365j depuis aujourd'hui + heatmap
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Button, Tooltip, Chip } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
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
  filterRolling12Months,
  buildRolling12MonthsHeatmapMonths,
  lastDayInSeries,
  rolling12mDisplayEnd,
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

export type CalendarWindowMode = 'rolling365' | 'rolling12m' | 'calendarYear';

/** Bas → Moyen → Haut (lisible sur la grille) */
const TIER_BG: Record<PriceTier, string> = {
  low: '#7dd3fc',
  mid: '#4ade80',
  high: '#ea580c',
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
      : windowMode === 'rolling12m'
        ? filterRolling12Months(source, today)
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
  const windowEnd =
    windowMode === 'rolling12m'
      ? rolling12mDisplayEnd(today, lastDayInSeries(days))
      : addDaysIso(today, 365);
  const helpLinkLabel =
    sourceLinkLabel ??
    pricingSource === 'estimate'
      ? 'Preview estimate (Sojori) ⓘ'
      : pricingSource === 'airroi'
        ? 'Comparaison OTA (future/rates) ⓘ'
        : 'Source pilote Sojori ⓘ';

  /** Pas de courbe future/rates OTA — estimate / pilote uniquement */
  const isRollingWindow = windowMode === 'rolling365' || windowMode === 'rolling12m';

  const dualCurve =
    (pricingSource === 'estimate' ||
      pricingSource === 'sojori' ||
      pricingSource === 'airroi') &&
    Boolean(compareMarketDays?.length && isRollingWindow);

  const visibleDays = useMemo(
    () => sliceVisibleDays(days, windowMode, year, today, true),
    [days, windowMode, year, today],
  );

  const visibleMarketDays = useMemo(() => {
    if (!compareMarketDays?.length) return [];
    return sliceVisibleDays(compareMarketDays, windowMode, year, today, true);
  }, [compareMarketDays, windowMode, year, today]);

  const coverage = useMemo(() => {
    if (windowMode !== 'rolling365' && windowMode !== 'rolling12m') return null;
    const expected = countExpectedDaysInWindow(today, addDaysIso(windowEnd, 1));
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
        const m = market?.price ?? null;
        const p = pilot?.price ?? null;
        const deltaMad =
          m != null && p != null && m > 0 && p > 0 ? p - m : null;
        return {
          date,
          marketPrice: m,
          pilotPrice: p,
          deltaMad,
          price: p ?? m ?? null,
          status: pilot?.status,
          tierLabel: market?.tierLabel,
        };
      });
  }, [dualCurve, visibleDays, visibleMarketDays]);

  const dualCompareStats = useMemo(() => {
    if (!dualCurve) return null;
    const priced = chartData.filter(
      (r) =>
        r.marketPrice != null &&
        r.pilotPrice != null &&
        r.marketPrice > 0 &&
        r.pilotPrice > 0,
    );
    let identical = 0;
    let different = 0;
    let maxAbsDelta = 0;
    for (const r of priced) {
      const d = Math.abs((r.pilotPrice ?? 0) - (r.marketPrice ?? 0));
      if (d <= 5) identical += 1;
      else {
        different += 1;
        maxAbsDelta = Math.max(maxAbsDelta, d);
      }
    }
    const marketPriced = visibleMarketDays
      .filter((d) => d.status !== 'blocked' && d.recommendedPrice > 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const marketDates = marketPriced.map((d) => d.date);
    let flatStreakLen = 0;
    let flatStreakPrice = 0;
    if (marketPriced.length >= 2) {
      let run = 1;
      let runPrice = marketPriced[0].recommendedPrice;
      for (let i = 1; i < marketPriced.length; i += 1) {
        if (marketPriced[i].recommendedPrice === marketPriced[i - 1].recommendedPrice) {
          run += 1;
        } else {
          if (run > flatStreakLen) {
            flatStreakLen = run;
            flatStreakPrice = runPrice;
          }
          run = 1;
          runPrice = marketPriced[i].recommendedPrice;
        }
      }
      if (run > flatStreakLen) {
        flatStreakLen = run;
        flatStreakPrice = runPrice;
      }
    }
    const expected =
      isRollingWindow ? countExpectedDaysInWindow(today, addDaysIso(windowEnd, 1)) : 0;
    const missingInWindow = Math.max(0, expected - visibleMarketDays.length);
    const blockedInWindow = visibleMarketDays.filter((d) => d.status === 'blocked').length;
    return {
      identical,
      different,
      maxAbsDelta,
      compared: priced.length,
      rangeStart: marketDates[0] ?? null,
      rangeEnd: marketDates[marketDates.length - 1] ?? null,
      flatStreakLen,
      flatStreakPrice,
      missingInWindow,
      blockedInWindow,
    };
  }, [dualCurve, chartData, visibleMarketDays, windowMode, today, windowEnd]);

  React.useEffect(() => {
    if (!import.meta.env.DEV || !dualCompareStats) return;
    console.info('[DP] compare AirROI vs Pilote', dualCompareStats);
  }, [dualCompareStats]);

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
    if (!dualCurve || !isRollingWindow) return null;
    const expected = countExpectedDaysInWindow(today, addDaysIso(windowEnd, 1));
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
    if (windowMode === 'rolling12m') {
      return buildRolling12MonthsHeatmapMonths(visibleDays, today);
    }
    return buildRollingHeatmapMonths(visibleDays, today);
  }, [visibleDays, windowMode, year, today]);

  const monthAxisLabels = useMemo(
    () => (isRollingWindow ? monthGrids.map((m) => ({ label: m.label, sortKey: m.sortKey })) : []),
    [isRollingWindow, monthGrids],
  );

  const title =
    pricingSource === 'airroi'
      ? isRollingWindow
        ? 'Comparaison OTA (future/rates)'
        : `Comparaison OTA ${year}`
      : pricingSource === 'estimate'
        ? 'Prix estimés (calculator/estimate) · 12 mois'
        : isRollingWindow
          ? 'Prix recommandés Sojori · 12 mois'
          : `Prix recommandés Sojori ${year}`;

  const rangeLabel = isRollingWindow
    ? `${formatFrShort(today)} → ${formatFrShort(windowEnd)}`
    : undefined;

  if (days.length === 0) {
    return (
      <DataEmptyPlaceholder
        title="Calendrier vide"
        hint={
          emptyHint ??
          'Modal ⟳ · GET /calculator/estimate puis preview ici (12 mois)'
        }
      />
    );
  }

  if (visibleDays.length === 0) {
    return (
      <DataEmptyPlaceholder
        title="Aucun jour dans la fenêtre"
        hint={
          isRollingWindow
            ? `Aucun jour entre aujourd’hui et le ${formatFrShort(windowEnd)}. Relancez ⟳ calculator/estimate.`
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
      {isRollingWindow && chartData.length > 0 && (
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
          {dualCurve && dualCompareStats ? (
            <Box sx={{ mb: 1 }}>
              <Stack direction="row" sx={{ gap: 1, mb: 0.75, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.125,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: 'rgba(37,99,235,0.10)',
                    border: '1px solid rgba(37,99,235,0.35)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#1d4ed8',
                  }}
                >
                  <Box sx={{ width: 14, height: 3, bgcolor: '#2563eb', borderRadius: 0.5 }} />
                  {pricingSource === 'estimate' ? 'Marché estimate (brut)' : 'Marché AirROI (brut)'}
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.125,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: T.goldTint,
                    border: `1px solid ${T.gold}`,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: T.goldDeep,
                  }}
                >
                  <Box sx={{ width: 14, height: 3, bgcolor: T.goldDeep, borderRadius: 0.5 }} />
                  Prix calendrier Sojori
                </Box>
              </Stack>
              <Typography sx={{ fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace', lineHeight: 1.45 }}>
                {dualCompareStats.rangeStart && dualCompareStats.rangeEnd ? (
                  <>
                    Données AirROI du {formatFrShort(dualCompareStats.rangeStart)} au{' '}
                    {formatFrShort(dualCompareStats.rangeEnd)}
                    {' · '}
                  </>
                ) : null}
                {dualCompareStats.different > 0 ? (
                  <Box component="span" sx={{ color: T.goldDeep, fontWeight: 800 }}>
                    {dualCompareStats.different} j avec écart
                    {dualCompareStats.maxAbsDelta > 0
                      ? ` (max Δ ${dualCompareStats.maxAbsDelta.toLocaleString('fr-FR')} MAD)`
                      : ''}
                  </Box>
                ) : (
                  <Box component="span" sx={{ color: '#1d4ed8', fontWeight: 800 }}>
                    Courbes quasi identiques sur {dualCompareStats.compared} j
                  </Box>
                )}
                {dualCompareStats.identical > 0 ? (
                  <>
                    {' · '}
                    {dualCompareStats.identical} j superposés (mode ×1, bornes non touchées)
                  </>
                ) : null}
              </Typography>
              {(dualCompareStats.missingInWindow > 0 ||
                dualCompareStats.blockedInWindow > 0 ||
                dualCompareStats.flatStreakLen >= 14) && (
                <Box
                  sx={{
                    mt: 0.75,
                    p: 1,
                    borderRadius: 1,
                    bgcolor: T.bg2,
                    border: `1px solid ${T.border}`,
                    fontSize: 10.5,
                    color: T.text2,
                    lineHeight: 1.45,
                  }}
                >
                  {dualCompareStats.missingInWindow > 0 ? (
                    <Box>
                      <b>Trous dans la courbe (vides)</b> : {dualCompareStats.missingInWindow} j
                      sans ligne dans le snapshot AirROI (API n’a pas envoyé de tarif pour ces dates).
                      Cases grises dans la grille = même chose.
                    </Box>
                  ) : null}
                  {dualCompareStats.blockedInWindow > 0 ? (
                    <Box sx={{ mt: dualCompareStats.missingInWindow > 0 ? 0.5 : 0 }}>
                      <b>Indisponible</b> : {dualCompareStats.blockedInWindow} j marqués{' '}
                      <code>available=false</code> chez AirROI (pas de prix marché).
                    </Box>
                  ) : null}
                  {dualCompareStats.flatStreakLen >= 14 ? (
                    <Box sx={{ mt: 0.5 }}>
                      <b>Plat en fin de période</b> : AirROI renvoie le même tarif (
                      {dualCompareStats.flatStreakPrice.toLocaleString('fr-FR')} MAD) sur{' '}
                      {dualCompareStats.flatStreakLen} jours consécutifs — comportement fournisseur
                      fréquent loin dans le futur, pas un calcul Sojori.
                    </Box>
                  ) : null}
                </Box>
              )}
            </Box>
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload as {
                      marketPrice?: number | null;
                      pilotPrice?: number | null;
                      deltaMad?: number | null;
                      status?: DayStatus;
                      tierLabel?: string;
                    };
                    const m = row.marketPrice;
                    const p = row.pilotPrice;
                    const delta = row.deltaMad;
                    return (
                      <Box sx={{ ...chartTooltipStyle, p: 1.25, minWidth: 200 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.75 }}>
                          {formatFrShort(String(label))}
                        </Typography>
                        {m != null && m > 0 ? (
                          <Typography sx={{ fontSize: 11, color: '#1d4ed8', fontFamily: '"Geist Mono", monospace' }}>
                            {pricingSource === 'estimate' ? 'Marché estimate' : 'Marché AirROI'} :{' '}
                            <b>{Math.round(m).toLocaleString('fr-FR')} MAD</b>
                            {row.tierLabel ? ` · ${row.tierLabel}` : ''}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: T.text3 }}>AirROI : —</Typography>
                        )}
                        {p != null && p > 0 ? (
                          <Typography sx={{ fontSize: 11, color: T.goldDeep, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                            Calendrier Sojori : <b>{Math.round(p).toLocaleString('fr-FR')} MAD</b>
                            {row.status === 'override' ? ' · event' : ''}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>Pilote : —</Typography>
                        )}
                        {delta != null ? (
                          <Typography
                            sx={{
                              fontSize: 10.5,
                              mt: 0.5,
                              fontWeight: 800,
                              color: Math.abs(delta) <= 5 ? T.text3 : delta > 0 ? T.goldDeep : T.error,
                              fontFamily: '"Geist Mono", monospace',
                            }}
                          >
                            Δ pilote − AirROI : {delta > 0 ? '+' : ''}
                            {Math.round(delta).toLocaleString('fr-FR')} MAD
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  }}
                />
                {dualCurve ? (
                  <>
                    <Line
                      type="monotone"
                      name="Marché AirROI"
                      dataKey="marketPrice"
                      connectNulls={false}
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                      dot={false}
                      isAnimationActive={false}
                    />
                    <Area
                      type="monotone"
                      name="Pilote Sojori"
                      dataKey="pilotPrice"
                      connectNulls={false}
                      stroke={T.goldDeep}
                      strokeWidth={2.25}
                      fill="url(#dpPriceGrad)"
                      fillOpacity={0.35}
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
            md: `repeat(${Math.max(monthGrids.length, 1)}, minmax(52px, 1fr))`,
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

      {monthAxisLabels.length > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(3, minmax(52px, 1fr))',
              sm: 'repeat(4, minmax(52px, 1fr))',
              md: `repeat(${monthAxisLabels.length}, minmax(52px, 1fr))`,
            },
            gap: 1.25,
            mt: 1,
            pt: 0.75,
            borderTop: `1px solid ${T.border}`,
          }}
        >
          {monthAxisLabels.map((m) => (
            <Typography
              key={m.sortKey}
              sx={{
                fontSize: 10.5,
                fontFamily: '"Geist Mono", monospace',
                fontWeight: 800,
                color: T.text2,
                textAlign: 'center',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {m.label}
            </Typography>
          ))}
        </Box>
      )}

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
          {isRollingWindow && pricingSource === 'estimate' ? (
            <>
              <b>Prix pilote</b> dérivés de <b>calculator/estimate</b> (12 mois) — pas les tarifs
              Airbnb future/rates. Vérifiez ici avant « Appliquer » vers le calendrier ops.
            </>
          ) : isRollingWindow && eventDayCount > 0 ? (
            <>
              Courbe pilote · <b style={{ color: STATUS_BG.override }}>points orange = event</b>{' '}
              (prix forcé MAD/nuit). Clic jour = justification G7.
            </>
          ) : isRollingWindow ? (
            <>
              Calendrier prospectif · <b>aujourd’hui</b> en or · 12 mois. Clic = justification.
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
      onClick={() => onDayClick(cell.day)}
    />
  );
}

function DayCell({
  day,
  phase,
  onClick,
}: {
  day: CalendarDay;
  phase: DayPhase;
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
    day.priceTier && day.status !== 'blocked' && day.status !== 'override'
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
      {pricingSource === 'airroi' || pricingSource === 'estimate' ? (
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
      {(windowMode === 'rolling365' || windowMode === 'rolling12m') && (
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
