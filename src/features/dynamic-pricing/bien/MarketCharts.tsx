// ════════════════════════════════════════════════════════════════════
// MarketCharts.tsx — §05 : comps + ville Marrakech (deux cadres visibles)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { T, DP_LAYOUT_SX } from '../_tokens';
import DataEmptyPlaceholder from '../DataEmptyPlaceholder';
import { formatDistanceMeters } from '../utils/geoDistance';
import type { CompsMarketStats, SelfVsComps } from '../utils/computeCompsMarketStats';

/** Conservé pour compat hooks — plus de toggle UI */
export type MarketScope = 'comps' | 'city';

export interface MarketKpis {
  occupancyAvg: number;
  adrMedianDistrict: number;
  adrMedianCity: number;
  supplyGrowthPct: number;
  leadTimeDays: number;
  avgStayNights: number;
  activeListings?: number;
}

export interface SeasonalityPoint {
  month: string;
  occupancy: number;
  adr: number;
}

export interface PacingPoint {
  month: string;
  fillRate: number;
}

export interface SupplyGrowthPoint {
  label: string;
  listingCount: number;
}

export interface MarketChartsProps {
  cityName: string;
  kpis?: MarketKpis;
  compsStats?: CompsMarketStats | null;
  selfVsComps?: SelfVsComps;
  seasonality: SeasonalityPoint[];
  pacing: PacingPoint[];
  supplyGrowth: SupplyGrowthPoint[];
  hasData?: boolean;
  hasCharts?: boolean;
  hasCompsStats?: boolean;
  /**
   * city = tendances + KPIs ville (portefeuille filtré)
   * listing = médianes comps vs votre bien (fiche)
   * full = les deux (legacy)
   */
  variant?: 'city' | 'listing' | 'full';
}

const dash = '—';

const kpiGridSx = {
  display: 'grid',
  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' },
  gap: 1.25,
} as const;

export default function MarketCharts(props: MarketChartsProps) {
  const {
    cityName,
    kpis,
    compsStats,
    selfVsComps,
    seasonality,
    pacing,
    supplyGrowth,
    hasData = false,
    hasCharts = false,
    hasCompsStats = false,
    variant = 'full',
  } = props;

  const showCity = variant === 'city' || variant === 'full';
  const showListingComps = variant === 'listing' || variant === 'full';

  if (!hasData && !hasCharts && !hasCompsStats) {
    return (
      <DataEmptyPlaceholder
        hint={`⟳ Actualiser le marché ${cityName} (modal données marché)`}
      />
    );
  }

  const k = kpis ?? {
    occupancyAvg: 0,
    adrMedianDistrict: 0,
    adrMedianCity: 0,
    supplyGrowthPct: 0,
    leadTimeDays: 0,
    avgStayNights: 0,
  };

  const cs = compsStats;

  return (
    <Box sx={{ ...DP_LAYOUT_SX }}>
      {showCity ? (
        <>
      {/* Graphiques ville — pleine largeur */}
      <MarketFrame
        title={`Tendances marché · ${cityName}`}
        subtitle="Saisonnalité · pacing · offre (24 mois)"
        badge="Graphiques"
        sx={{ mb: 1.75 }}
      >
        {hasCharts ? (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
              gap: 1.75,
            }}
          >
            <ChartCard
              title="Saisonnalité 24 mois"
              sub="Occupation % · ADR MAD"
              pedagogy={
                <>
                  <b>Pics</b> festivals / automne · creux été.
                </>
              }
            >
              {seasonality.length > 0 ? (
                <ResponsiveContainer width="100%" height={148}>
                  <LineChart
                    data={seasonality}
                    margin={{ top: 8, right: 44, bottom: 4, left: 36 }}
                  >
                    <CartesianGrid stroke={T.border} strokeDasharray="2 2" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: T.text4, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="occ"
                      orientation="left"
                      domain={[0, 100]}
                      tick={{ fontSize: 9, fill: T.info, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `${v}%`}
                      width={32}
                    />
                    <YAxis
                      yAxisId="adr"
                      orientation="right"
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 9, fill: T.goldDeep, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => String(Math.round(v))}
                      width={40}
                    />
                    <Tooltip
                      {...tooltipProps}
                      formatter={(value: number, name: string) => {
                        if (name === 'Occupation %') return [`${value} %`, name];
                        if (name === 'ADR MAD') {
                          return [`${Math.round(value).toLocaleString('fr-FR')} MAD`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={22}
                      iconType="line"
                      iconSize={10}
                      wrapperStyle={{
                        fontSize: 10,
                        fontFamily: 'Geist Mono',
                        paddingBottom: 4,
                      }}
                    />
                    <Line
                      yAxisId="occ"
                      type="monotone"
                      dataKey="occupancy"
                      stroke={T.info}
                      strokeWidth={2}
                      dot={false}
                      name="Occupation %"
                    />
                    <Line
                      yAxisId="adr"
                      type="monotone"
                      dataKey="adr"
                      stroke={T.goldDeep}
                      strokeWidth={2}
                      dot={false}
                      name="ADR MAD"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </ChartCard>

            <ChartCard
              title="Pacing 12 mois"
              sub="Fill rate futur par mois"
              pedagogy={<>Fenêtres à activer selon les mois peu remplis.</>}
            >
              {pacing.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={pacing} margin={{ top: 4, right: 6, bottom: 0, left: -28 }}>
                    <CartesianGrid stroke={T.border} strokeDasharray="2 2" vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: T.text4, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip {...tooltipProps} />
                    <Bar dataKey="fillRate" fill={T.gold} radius={[3, 3, 0, 0]} name="Fill %" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </ChartCard>

            <ChartCard
              title="Croissance offre"
              sub={k.supplyGrowthPct !== 0 ? `${k.supplyGrowthPct >= 0 ? '+' : ''}${k.supplyGrowthPct}%` : dash}
              pedagogy={<>Évolution annonces actives sur 24 mois.</>}
            >
              {supplyGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={supplyGrowth} margin={{ top: 4, right: 6, bottom: 0, left: -28 }}>
                    <defs>
                      <linearGradient id="supplyGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor={T.error} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={T.error} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke={T.border} strokeDasharray="2 2" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 9, fill: T.text4, fontFamily: 'Geist Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip {...tooltipProps} />
                    <Area
                      type="monotone"
                      dataKey="listingCount"
                      stroke={T.error}
                      strokeWidth={2.5}
                      fill="url(#supplyGrad)"
                      name="Listings"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <ChartEmpty />
              )}
            </ChartCard>
          </Box>
        ) : (
          <DataEmptyPlaceholder
            compact
            title="Graphiques indisponibles"
            hint={`⟳ Modal · Actualiser le marché · ${cityName}`}
          />
        )}
      </MarketFrame>

      {variant === 'city' ? (
        <MarketFrame
          title={`Marché · ${cityName}`}
          subtitle="Indicateurs agrégés de la ville"
          badge="Ville"
        >
          {hasData ? (
            <Box sx={kpiGridSx}>
              <Kpi
                v={k.occupancyAvg > 0 ? Math.round(k.occupancyAvg * 100) : dash}
                u="%"
                l="Occupation 24m"
              />
              <Kpi
                v={k.adrMedianCity > 0 ? k.adrMedianCity.toLocaleString('fr-FR') : dash}
                u="MAD"
                l={`ADR ${cityName}`}
              />
              <Kpi
                v={k.leadTimeDays > 0 ? Math.round(k.leadTimeDays) : dash}
                u="j"
                l="Lead time"
              />
              <Kpi v={k.avgStayNights > 0 ? k.avgStayNights : dash} u="n" l="Durée séjour" />
              <Kpi
                v={k.supplyGrowthPct !== 0 ? `${k.supplyGrowthPct >= 0 ? '+' : ''}${k.supplyGrowthPct}` : dash}
                u="%"
                l="Croiss. offre"
              />
              <Kpi
                v={k.activeListings && k.activeListings > 0 ? k.activeListings.toLocaleString('fr-FR') : dash}
                u=""
                l="Annonces actives"
              />
            </Box>
          ) : (
            <DataEmptyPlaceholder
              compact
              hint={`Actualiser le marché · ${cityName}`}
            />
          )}
        </MarketFrame>
      ) : null}
        </>
      ) : null}

      {showListingComps ? (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            lg: variant === 'listing' ? '1fr' : '1fr 1fr',
          },
          gap: 1.75,
          mt: showCity ? 1.75 : 0,
        }}
      >
        <MarketFrame
          title={cs ? `Concurrents marché (${cs.count})` : 'Concurrents marché'}
          subtitle="Médianes TTM · annonces comparables"
          badge="Comps"
        >
          {hasCompsStats && cs ? (
            <>
              <Box sx={kpiGridSx}>
                <Kpi v={cs.count} u="" l="Comps" />
                <Kpi v={cs.occupancyMedianPct} u="%" l="Occ. médiane" />
                <Kpi v={cs.adrMedianMad.toLocaleString('fr-FR')} u="MAD" l="ADR médiane" />
                <Kpi v={cs.revenueMedianMad.toLocaleString('fr-FR')} u="MAD" l="Revenu TTM méd." />
                <Kpi
                  v={cs.distanceMedianM != null ? formatDistanceMeters(cs.distanceMedianM) : dash}
                  u=""
                  l="Distance méd."
                />
                <Kpi v={cs.ratingMedian > 0 ? cs.ratingMedian.toFixed(2) : dash} u="★" l="Note méd." />
              </Box>
              {selfVsComps &&
              (selfVsComps.adrDeltaPct != null || selfVsComps.occDeltaPts != null) ? (
                <Box
                  sx={{
                    mt: 1.5,
                    p: 1.25,
                    borderRadius: 1,
                    bgcolor: T.goldTint,
                    border: `1px solid ${T.border}`,
                    fontSize: 11.5,
                    color: T.text2,
                    lineHeight: 1.45,
                  }}
                >
                  <b>Vous vs médiane :</b>{' '}
                  {selfVsComps.adrDeltaPct != null
                    ? `ADR ${selfVsComps.adrDeltaPct >= 0 ? '+' : ''}${selfVsComps.adrDeltaPct} %`
                    : null}
                  {selfVsComps.occDeltaPts != null
                    ? ` · Occ. ${selfVsComps.occDeltaPts >= 0 ? '+' : ''}${selfVsComps.occDeltaPts} pts`
                    : null}
                  {selfVsComps.revenueDeltaPct != null
                    ? ` · Revenu ${selfVsComps.revenueDeltaPct >= 0 ? '+' : ''}${selfVsComps.revenueDeltaPct} %`
                    : null}
                </Box>
              ) : null}
            </>
          ) : (
            <DataEmptyPlaceholder
              compact
              hint="⟳ Refresh perf bien pour charger les comparables"
            />
          )}
        </MarketFrame>

        {variant === 'full' ? (
        <MarketFrame
          title={`Marché · ${cityName}`}
          subtitle="Indicateurs agrégés de la ville"
          badge="Ville"
        >
          {hasData ? (
            <Box sx={kpiGridSx}>
              <Kpi
                v={k.occupancyAvg > 0 ? Math.round(k.occupancyAvg * 100) : dash}
                u="%"
                l="Occupation 24m"
              />
              <Kpi
                v={k.adrMedianCity > 0 ? k.adrMedianCity.toLocaleString('fr-FR') : dash}
                u="MAD"
                l={`ADR ${cityName}`}
              />
              <Kpi
                v={k.leadTimeDays > 0 ? Math.round(k.leadTimeDays) : dash}
                u="j"
                l="Lead time"
              />
              <Kpi v={k.avgStayNights > 0 ? k.avgStayNights : dash} u="n" l="Durée séjour" />
              <Kpi
                v={k.supplyGrowthPct !== 0 ? `${k.supplyGrowthPct >= 0 ? '+' : ''}${k.supplyGrowthPct}` : dash}
                u="%"
                l="Croiss. offre"
              />
              <Kpi
                v={k.activeListings && k.activeListings > 0 ? k.activeListings.toLocaleString('fr-FR') : dash}
                u=""
                l="Annonces actives"
              />
            </Box>
          ) : (
            <DataEmptyPlaceholder
              compact
              hint={`Actualiser le marché · ${cityName}`}
            />
          )}
        </MarketFrame>
        ) : null}
      </Box>
      ) : null}
    </Box>
  );
}

function MarketFrame({
  title,
  subtitle,
  badge,
  children,
  sx,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: React.ReactNode;
  sx?: object;
}) {
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        ...sx,
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, 
          px: 2,
          py: 1.5,
          borderBottom: `1px solid ${T.border}`,
          bgcolor: T.bg2,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, fontWeight: 800, letterSpacing: '-0.01em' }}>
            {title}
          </Typography>
          <Typography
            sx={{
              fontSize: 10,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              mt: 0.25,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            flexShrink: 0,
            px: 1,
            py: 0.375,
            borderRadius: 0.75,
            fontSize: 9.5,
            fontWeight: 800,
            fontFamily: '"Geist Mono", monospace',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            bgcolor: T.goldTint,
            color: T.goldDeep,
            border: `1px solid rgba(199,155,34,0.35)`,
          }}
        >
          {badge}
        </Box>
      </Stack>
      <Box sx={{ p: 2 }}>{children}</Box>
    </Box>
  );
}

function ChartEmpty() {
  return (
    <Box sx={{ py: 4, textAlign: 'center', color: T.text4, fontSize: 12 }}>{dash}</Box>
  );
}

const tooltipProps = {
  contentStyle: {
    background: T.bg1,
    border: `1px solid ${T.borderStrong}`,
    borderRadius: 8,
    fontSize: 11,
    fontFamily: 'Geist',
  },
  labelStyle: { color: T.text3, fontWeight: 700, fontSize: 10, fontFamily: 'Geist Mono' },
} as const;

function Kpi({ v, u, l }: { v: number | string; u: string; l: string }) {
  return (
    <Box
      sx={{
        p: '12px 10px',
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.25,
      }}
    >
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 17,
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        {v}
        <Box
          component="span"
          sx={{ fontSize: 10, color: T.text3, ml: 0.375, fontWeight: 600 }}
        >
          {u}
        </Box>
      </Typography>
      <Typography
        sx={{
          fontSize: 9.5,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 700,
          mt: 0.5,
          lineHeight: 1.3,
        }}
      >
        {l}
      </Typography>
    </Box>
  );
}

function ChartCard({
  title,
  sub,
  pedagogy,
  children,
}: {
  title: string;
  sub: string;
  pedagogy: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.5,
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 800, mb: 0.5 }}>{title}</Typography>
      <Typography
        sx={{
          fontSize: 10.5,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          mb: 1.5,
        }}
      >
        {sub}
      </Typography>
      {children}
      <Box
        sx={{
          mt: 1.25,
          p: '8px 10px',
          bgcolor: T.bg1,
          borderRadius: 1,
          fontSize: 11,
          color: T.text2,
          '& b': { color: T.text },
        }}
      >
        {pedagogy}
      </Box>
    </Box>
  );
}
