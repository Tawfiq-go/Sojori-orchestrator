// ════════════════════════════════════════════════════════════════════
// YearlyCalendar.tsx — Section 4 : courbe 365j depuis aujourd'hui + heatmap
// ════════════════════════════════════════════════════════════════════
import React, { useMemo, useState } from 'react';
import { Box, Stack, Typography, Button, Tooltip, Chip } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { T } from '../_tokens';
import { DP, marketCurveLegend } from '../clientLabels';
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
  /** Snapshot AirROI / estimate brut — courbe bleue */
  compareMarketDays?: CalendarDay[];
  /** calculatedPrice calendrier ops — courbe grise */
  compareCalendarDays?: CalendarDay[];
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
  compareCalendarDays,
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
      ? 'Prévisualisation estimation Sojori ⓘ'
      : pricingSource === 'airroi'
        ? 'Comparaison tarifs marché Sojori ⓘ'
        : 'Source pilote Sojori ⓘ';

  /** Pas de courbe future/rates OTA — estimate / pilote uniquement */
  const isRollingWindow = windowMode === 'rolling365' || windowMode === 'rolling12m';

  const dualCurve =
    (pricingSource === 'estimate' ||
      pricingSource === 'sojori' ||
      pricingSource === 'airroi') &&
    Boolean(compareMarketDays?.length && isRollingWindow);

  const tripleCurve = dualCurve && Boolean(compareCalendarDays?.length);

  const visibleDays = useMemo(
    () => sliceVisibleDays(days, windowMode, year, today, true),
    [days, windowMode, year, today],
  );

  const visibleMarketDays = useMemo(() => {
    if (!compareMarketDays?.length) return [];
    return sliceVisibleDays(compareMarketDays, windowMode, year, today, true);
  }, [compareMarketDays, windowMode, year, today]);

  const visibleOpsDays = useMemo(() => {
    if (!compareCalendarDays?.length) return [];
    return sliceVisibleDays(compareCalendarDays, windowMode, year, today, false);
  }, [compareCalendarDays, windowMode, year, today]);

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
    const opsByDate = new Map(
      visibleOpsDays.map((d) => [
        d.date,
        d.status === 'blocked' || d.recommendedPrice <= 0 ? null : d.recommendedPrice,
      ]),
    );
    const dates = new Set([
      ...marketByDate.keys(),
      ...pilotByDate.keys(),
      ...opsByDate.keys(),
    ]);
    return [...dates]
      .sort()
      .map((date) => {
        const pilot = pilotByDate.get(date);
        const market = marketByDate.get(date);
        const m = market?.price ?? null;
        const p = pilot?.price ?? null;
        const c = opsByDate.get(date) ?? null;
        const deltaMad =
          m != null && p != null && m > 0 && p > 0 ? p - m : null;
        const deltaApplyMad =
          p != null && c != null && p > 0 && c > 0 ? p - c : null;
        return {
          date,
          marketPrice: m,
          pilotPrice: p,
          calendarPrice: c,
          deltaMad,
          deltaApplyMad,
          price: p ?? m ?? c ?? null,
          status: pilot?.status,
          tierLabel: market?.tierLabel,
        };
      });
  }, [dualCurve, visibleDays, visibleMarketDays, visibleOpsDays]);

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
    let applyDifferent = 0;
    let maxApplyDelta = 0;
    for (const r of chartData) {
      const d = r.deltaApplyMad;
      if (d == null) continue;
      const abs = Math.abs(d);
      if (abs <= 5) continue;
      applyDifferent += 1;
      maxApplyDelta = Math.max(maxApplyDelta, abs);
    }
    return {
      identical,
      different,
      maxAbsDelta,
      compared: priced.length,
      applyDifferent,
      maxApplyDelta,
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
    console.info('[DP] compare estimation vs pilote', dualCompareStats);
  }, [dualCompareStats]);

  const priceExtent = useMemo(() => {
    const prices: number[] = [];
    for (const row of chartData) {
      if (row.marketPrice != null && row.marketPrice > 0) prices.push(row.marketPrice);
      if (row.pilotPrice != null && row.pilotPrice > 0) prices.push(row.pilotPrice);
      if (row.calendarPrice != null && row.calendarPrice > 0) prices.push(row.calendarPrice);
      if (!dualCurve && row.price != null && row.price > 0) prices.push(row.price);
    }
    if (!prices.length) return { min: 0, max: 0, marketMin: 0, marketMax: 0, pilotMin: 0, pilotMax: 0, calendarMin: 0, calendarMax: 0 };
    const marketPrices = chartData
      .map((r) => r.marketPrice)
      .filter((p): p is number => p != null && p > 0);
    const pilotPrices = chartData
      .map((r) => r.pilotPrice)
      .filter((p): p is number => p != null && p > 0);
    const calendarPrices = chartData
      .map((r) => r.calendarPrice)
      .filter((p): p is number => p != null && p > 0);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      marketMin: marketPrices.length ? Math.min(...marketPrices) : 0,
      marketMax: marketPrices.length ? Math.max(...marketPrices) : 0,
      pilotMin: pilotPrices.length ? Math.min(...pilotPrices) : 0,
      pilotMax: pilotPrices.length ? Math.max(...pilotPrices) : 0,
      calendarMin: calendarPrices.length ? Math.min(...calendarPrices) : 0,
      calendarMax: calendarPrices.length ? Math.max(...calendarPrices) : 0,
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
    const opsWith = visibleOpsDays.filter((d) => d.recommendedPrice > 0).length;
    return { expected, marketWith, pilotWith, opsWith };
  }, [dualCurve, windowMode, today, windowEnd, visibleMarketDays, visibleDays, visibleOpsDays]);

  const calendarOpsFlat = useMemo(
    () =>
      Boolean(
        tripleCurve &&
          priceExtent.calendarMin > 0 &&
          priceExtent.calendarMin === priceExtent.calendarMax,
      ),
    [tripleCurve, priceExtent.calendarMin, priceExtent.calendarMax],
  );

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
        ? 'Tarifs marché Sojori · 12 mois'
        : `Tarifs marché Sojori ${year}`
      : pricingSource === 'estimate'
        ? 'Estimation Sojori · 12 mois'
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
          emptyHint ?? DP.fetchEstimationHint
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
            ? `Aucun jour entre aujourd’hui et le ${formatFrShort(windowEnd)}. ${DP.fetchEstimationEmpty}`
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
                  : '✨ Appliquer au calendrier Sojori'}
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
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: T.text2, mb: 1 }}>
            {tripleCurve
              ? 'Comparaison 3 niveaux (MAD / nuit)'
              : dualCurve
                ? 'Courbes des prix (MAD / nuit)'
                : 'Courbe des prix (MAD / nuit)'}
          </Typography>

          {dualCurve && dualCompareStats ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: { xs: 'column', lg: 'row' },
                alignItems: { lg: 'center' },
                gap: { xs: 1, lg: 1.25 },
                flexWrap: 'wrap',
                px: 1.25,
                py: 1,
                mb: 1,
                borderRadius: 1.25,
                bgcolor: T.bg2,
                border: `1px solid ${T.border}`,
              }}
            >
              <Stack
                direction="row"
                sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap', flexShrink: 0 }}
              >
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.45,
                    borderRadius: 1,
                    bgcolor: 'rgba(37,99,235,0.10)',
                    border: '1px solid rgba(37,99,235,0.35)',
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: '#1d4ed8',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Box sx={{ width: 16, height: 3, bgcolor: '#2563eb', borderRadius: 0.5 }} />
                  {marketCurveLegend(pricingSource === 'estimate' ? 'estimate' : pricingSource === 'airroi' ? 'airroi' : undefined)}
                </Box>
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1,
                    py: 0.45,
                    borderRadius: 1,
                    bgcolor: T.goldTint,
                    border: `1px solid ${T.gold}`,
                    fontSize: 10.5,
                    fontWeight: 700,
                    color: T.goldDeep,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <Box sx={{ width: 16, height: 3, bgcolor: T.goldDeep, borderRadius: 0.5 }} />
                  Sojori (bornes · mode · events)
                </Box>
                {tripleCurve ? (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.75,
                      px: 1,
                      py: 0.45,
                      borderRadius: 1,
                      bgcolor: 'rgba(100,116,139,0.12)',
                      border: '1px solid rgba(100,116,139,0.45)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: '#475569',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Box sx={{ width: 16, height: 3, bgcolor: '#94a3b8', borderRadius: 0.5 }} />
                    {DP.calendrierActuel}
                  </Box>
                ) : null}
              </Stack>

              <Box
                sx={{
                  display: { xs: 'none', lg: 'block' },
                  width: '1px',
                  alignSelf: 'stretch',
                  minHeight: 28,
                  bgcolor: T.border,
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  flex: 1,
                  minWidth: { xs: '100%', lg: 280 },
                  fontSize: 10.5,
                  color: T.text3,
                  fontFamily: '"Geist Mono", monospace',
                  lineHeight: 1.5,
                }}
              >
                {dualCompareStats.rangeStart && dualCompareStats.rangeEnd ? (
                  <>
                    {formatFrShort(dualCompareStats.rangeStart)} → {formatFrShort(dualCompareStats.rangeEnd)}
                    {' · '}
                  </>
                ) : null}
                {dualCompareStats.different > 0 ? (
                  <Box component="span" sx={{ color: T.goldDeep, fontWeight: 800 }}>
                    {dualCompareStats.different} j estimation ≠ Sojori
                    {dualCompareStats.maxAbsDelta > 0
                      ? ` (max ${dualCompareStats.maxAbsDelta.toLocaleString('fr-FR')})`
                      : ''}
                  </Box>
                ) : (
                  <Box component="span" sx={{ color: '#1d4ed8', fontWeight: 800 }}>
                    Estimation ≈ Sojori · {dualCompareStats.compared} j
                  </Box>
                )}
                {dualCompareStats.applyDifferent > 0 ? (
                  <>
                    {' · '}
                    <Box component="span" sx={{ color: T.warning, fontWeight: 800 }}>
                      {dualCompareStats.applyDifferent} j Sojori ≠ calendrier (Δ apply max{' '}
                      {dualCompareStats.maxApplyDelta.toLocaleString('fr-FR')} MAD)
                    </Box>
                  </>
                ) : null}
                {dualCoverage ? (
                  <>
                    {' · '}
                    estimation {priceExtent.marketMin}–{priceExtent.marketMax}
                    {' · '}
                    Sojori {priceExtent.pilotMin}–{priceExtent.pilotMax}
                    {tripleCurve ? (
                      <>
                        {' · '}
                        calendrier {priceExtent.calendarMin}–{priceExtent.calendarMax}
                      </>
                    ) : null}
                  </>
                ) : null}
              </Typography>
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: 10.5,
                color: T.text4,
                fontFamily: '"Geist Mono", monospace',
                mb: 0.75,
              }}
            >
              {coverage
                ? `${coverage.withPrice}/${coverage.expected} j · min ${priceExtent.min} · max ${priceExtent.max} MAD`
                : `${visibleDays.length} j`}
              {eventDayCount > 0 ? ` · ${eventDayCount} event` : ''}
            </Typography>
          )}

          {calendarOpsFlat ? (
            <Box
              sx={{
                mb: 1,
                px: 1.25,
                py: 1,
                borderRadius: 1,
                bgcolor: T.warningTint,
                border: `1px solid ${T.warning}`,
                fontSize: 11,
                color: T.text2,
                lineHeight: 1.5,
              }}
            >
              <b>{DP.calendrierActuel} plat à {priceExtent.calendarMin.toLocaleString('fr-FR')} MAD</b> sur toute la
              fenêtre — inventaire sans variation (base ou calculatedPrice). Si /calendar affiche d’autres
              tarifs, vérifiez que vous êtes sur le même listing ID ; après déploiement, la courbe grise =
              prix affiché calendrier (manualPrice si dynamique OFF).
            </Box>
          ) : null}

          {dualCurve && dualCompareStats ? (
            <Typography
              sx={{
                fontSize: 10,
                color: T.text4,
                fontFamily: '"Geist Mono", monospace',
                mb: 0.75,
                lineHeight: 1.45,
              }}
            >
              Tableau §04 = Δ apply (Sojori − calendrier). Survol = 3 prix du jour.
              {dualCompareStats.missingInWindow > 0 ? (
                <> · {dualCompareStats.missingInWindow} j sans tarif d’estimation dans le snapshot.</>
              ) : null}
              {dualCompareStats.flatStreakLen >= 14 ? (
                <>
                  {' '}
                  · Plat estimation ({dualCompareStats.flatStreakPrice.toLocaleString('fr-FR')} MAD /{' '}
                  {dualCompareStats.flatStreakLen} j) = estimation brute, pas prix Sojori.
                </>
              ) : null}
            </Typography>
          ) : null}
          <Box
            sx={{
              height: dualCurve ? 248 : 168,
              width: '100%',
              minWidth: 0,
              minHeight: dualCurve ? 248 : 168,
              position: 'relative',
            }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={dualCurve ? 248 : 168}>
              {dualCurve ? (
                <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
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
                        calendarPrice?: number | null;
                        deltaMad?: number | null;
                        deltaApplyMad?: number | null;
                        status?: DayStatus;
                        tierLabel?: string;
                      };
                      const m = row.marketPrice;
                      const p = row.pilotPrice;
                      const c = row.calendarPrice;
                      const delta = row.deltaMad;
                      const deltaApply = row.deltaApplyMad;
                      return (
                        <Box sx={{ ...chartTooltipStyle, p: 1.25, minWidth: 220 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.75 }}>
                            {formatFrShort(String(label))}
                          </Typography>
                          {m != null && m > 0 ? (
                            <Typography sx={{ fontSize: 11, color: '#1d4ed8', fontFamily: '"Geist Mono", monospace' }}>
                              {marketCurveLegend(pricingSource === 'estimate' ? 'estimate' : 'airroi')} :{' '}
                              <b>{Math.round(m).toLocaleString('fr-FR')} MAD</b>
                              {row.tierLabel ? ` · ${row.tierLabel}` : ''}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: 10.5, color: T.text3 }}>{DP.estimationSojori} : —</Typography>
                          )}
                          {p != null && p > 0 ? (
                            <Typography sx={{ fontSize: 11, color: T.goldDeep, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                              Sojori : <b>{Math.round(p).toLocaleString('fr-FR')} MAD</b>
                              {row.status === 'override' ? ' · event' : ''}
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>Sojori : —</Typography>
                          )}
                          {c != null && c > 0 ? (
                            <Typography sx={{ fontSize: 11, color: '#475569', fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                              {DP.calendrierActuel} : <b>{Math.round(c).toLocaleString('fr-FR')} MAD</b>
                            </Typography>
                          ) : null}
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
                              Δ Sojori − estimation : {delta > 0 ? '+' : ''}
                              {Math.round(delta).toLocaleString('fr-FR')} MAD
                            </Typography>
                          ) : null}
                          {deltaApply != null ? (
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                mt: 0.25,
                                fontWeight: 800,
                                color: Math.abs(deltaApply) <= 5 ? T.text3 : deltaApply > 0 ? T.warning : T.success,
                                fontFamily: '"Geist Mono", monospace',
                              }}
                            >
                              Δ apply (Sojori − calendrier) : {deltaApply > 0 ? '+' : ''}
                              {Math.round(deltaApply).toLocaleString('fr-FR')} MAD
                            </Typography>
                          ) : null}
                        </Box>
                      );
                    }}
                  />
                  {/* Ordre : ops (fond) → estimate → Sojori (devant) — lignes seules, pas de remplissage opaque */}
                  {tripleCurve ? (
                    <Line
                      type="monotone"
                      name={DP.calendrierActuel}
                      dataKey="calendarPrice"
                      connectNulls={false}
                      stroke="#94a3b8"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={false}
                      isAnimationActive={false}
                    />
                  ) : null}
                  <Line
                    type="monotone"
                    name={DP.estimationSojori}
                    dataKey="marketPrice"
                    connectNulls={false}
                    stroke="#2563eb"
                    strokeWidth={2.5}
                    strokeDasharray="8 5"
                    dot={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    name="Sojori"
                    dataKey="pilotPrice"
                    connectNulls={false}
                    stroke={T.goldDeep}
                    strokeWidth={3.25}
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
                </ComposedChart>
              ) : (
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
                      calendarPrice?: number | null;
                      deltaMad?: number | null;
                      deltaApplyMad?: number | null;
                      status?: DayStatus;
                      tierLabel?: string;
                    };
                    const m = row.marketPrice;
                    const p = row.pilotPrice;
                    const c = row.calendarPrice;
                    const delta = row.deltaMad;
                    const deltaApply = row.deltaApplyMad;
                    return (
                      <Box sx={{ ...chartTooltipStyle, p: 1.25, minWidth: 220 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, mb: 0.75 }}>
                          {formatFrShort(String(label))}
                        </Typography>
                        {m != null && m > 0 ? (
                          <Typography sx={{ fontSize: 11, color: '#1d4ed8', fontFamily: '"Geist Mono", monospace' }}>
                            {marketCurveLegend(pricingSource === 'estimate' ? 'estimate' : 'airroi')} :{' '}
                            <b>{Math.round(m).toLocaleString('fr-FR')} MAD</b>
                            {row.tierLabel ? ` · ${row.tierLabel}` : ''}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: T.text3 }}>{DP.estimationSojori} : —</Typography>
                        )}
                        {p != null && p > 0 ? (
                          <Typography sx={{ fontSize: 11, color: T.goldDeep, fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                            Sojori : <b>{Math.round(p).toLocaleString('fr-FR')} MAD</b>
                            {row.status === 'override' ? ' · event' : ''}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: 10.5, color: T.text3, mt: 0.25 }}>Sojori : —</Typography>
                        )}
                        {c != null && c > 0 ? (
                          <Typography sx={{ fontSize: 11, color: '#475569', fontFamily: '"Geist Mono", monospace', mt: 0.25 }}>
                            {DP.calendrierActuel} : <b>{Math.round(c).toLocaleString('fr-FR')} MAD</b>
                          </Typography>
                        ) : null}
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
                            Δ Sojori − estimation : {delta > 0 ? '+' : ''}
                            {Math.round(delta).toLocaleString('fr-FR')} MAD
                          </Typography>
                        ) : null}
                        {deltaApply != null ? (
                          <Typography
                            sx={{
                              fontSize: 10.5,
                              mt: 0.25,
                              fontWeight: 800,
                              color: Math.abs(deltaApply) <= 5 ? T.text3 : deltaApply > 0 ? T.warning : T.success,
                              fontFamily: '"Geist Mono", monospace',
                            }}
                          >
                            Δ apply (Sojori − ops) : {deltaApply > 0 ? '+' : ''}
                            {Math.round(deltaApply).toLocaleString('fr-FR')} MAD
                          </Typography>
                        ) : null}
                      </Box>
                    );
                  }}
                />
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
              </AreaChart>
              )}
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
              <b>Prix pilote</b> dérivés de l’<b>estimation Sojori</b> (12 mois) — pas les tarifs
              journaliers bruts du marché. Vérifiez ici avant « Appliquer » vers le {DP.calendrierSojori.toLowerCase()}.
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
