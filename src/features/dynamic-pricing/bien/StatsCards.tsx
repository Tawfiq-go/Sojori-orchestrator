// ════════════════════════════════════════════════════════════════════
// StatsCards.tsx — Section 2 : 3 cards potentiel · TTM · pacing
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import { T, DP_LAYOUT_SX } from '../_tokens';
import DataEmptyPlaceholder from '../DataEmptyPlaceholder';

export interface StatsCardsProps {
  hasPotentialProd: boolean;
  hasTtm: boolean;
  hasL90d: boolean;
  potentialAnnual: { p25: number; p50: number; p75: number; currency: 'MAD' };
  potentialUsd: number;
  performance: {
    ttmRevenue: number;
    ttmUsd: number;
    occupancy: number;
    adr: number;
    nights: number;
    quartile: 'P25' | 'P50' | 'P75';
  };
  pacing: {
    fillRate: number;
    monthLabel: string;
    trendPct: number;
    compsCount: number;
    avgAdr: number;
    leadTimeDays: number;
    avgStayNights: number;
    cityFillRate?: number;
  };
  /** Ex. médiane revenus TTM des comps marché */
  potentialHint?: string;
  /** Ex. projection depuis estimation (~0,20 $) */
  ttmHint?: string;
  /** Ex. médiane occ. comps (~0,10 $) */
  pacingHint?: string;
}

const fmtMad = (n: number) => n.toLocaleString('fr-FR');
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;
const dash = '—';

export default function StatsCards({
  hasPotentialProd,
  hasTtm,
  hasL90d,
  potentialAnnual,
  potentialUsd,
  performance,
  pacing,
  potentialHint,
  ttmHint,
  pacingHint,
}: StatsCardsProps) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(3, 1fr)' },
        gap: 2.25,
        ...DP_LAYOUT_SX,
      }}
    >
      <StatCard label="POTENTIEL ANNUEL" emoji="⭐" tooltip={potentialHint ?? 'revenue-estimate marché non branché'}>
        {hasPotentialProd ? (
          <>
            <ValueBlock value={fmtMad(potentialAnnual.p50)} unit="MAD" sub={`≈ ${fmtMad(potentialUsd)} USD`} />
            <RangeBar p25={potentialAnnual.p25} p50={potentialAnnual.p50} p75={potentialAnnual.p75} />
            {potentialHint ? (
              <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.75 }}>{potentialHint}</Typography>
            ) : null}
          </>
        ) : (
          <DataEmptyPlaceholder
            compact
            title="—"
            hint="Médiane comps ou refresh marché · revenue-estimate pas encore branché"
          />
        )}
      </StatCard>

      <StatCard
        label="PERFORMANCE TTM"
        emoji="📊"
        tooltip={ttmHint ?? 'Revenus · occupation · ADR sur 12 mois'}
      >
        {hasTtm ? (
          <>
            <ValueBlock
              value={fmtMad(performance.ttmRevenue)}
              unit="MAD"
              sub={`≈ ${fmtMad(performance.ttmUsd)} USD · 12 mois`}
            />
            <MiniStats
              items={[
                { v: fmtPct(performance.occupancy), l: 'Occupation' },
                { v: fmtMad(performance.adr), l: 'ADR · MAD' },
                { v: String(performance.nights), l: 'Nuits' },
              ]}
            />
            {ttmHint ? (
              <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.75 }}>{ttmHint}</Typography>
            ) : (
              <CtxPhrase warn>
                Quartile estimé · <b>{performance.quartile}</b>
              </CtxPhrase>
            )}
          </>
        ) : (
          <DataEmptyPlaceholder
            compact
            title="—"
            hint={
              ttmHint ??
              'Estimation marché indisponible — activez « Estimation auto » (lun. & jeu.)'
            }
          />
        )}
      </StatCard>

      <StatCard
        label="PACING L90D"
        emoji="⚡"
        tooltip={pacingHint ?? 'Occupation récente vs TTM · ou référence comps'}
      >
        {hasL90d ? (
          <>
            <ValueBlock
              value={String(Math.round(pacing.fillRate * 100))}
              unit="%"
              sub={
                pacing.monthLabel.startsWith('Marché')
                  ? `${pacing.monthLabel} · occ. 24 mois`
                  : pacing.monthLabel.startsWith('Estimation')
                    ? `${pacing.monthLabel} · occ. projetée`
                    : `${pacing.monthLabel} · ${pacingHint?.includes('comps') ? 'occ. médiane comps' : 'occupation 90 j'}`
              }
              trend={
                pacing.trendPct !== 0
                  ? {
                      delta: pacing.trendPct,
                      label: `${pacing.trendPct >= 0 ? '+' : ''}${Math.round(pacing.trendPct * 100)} pts vs estimation`,
                    }
                  : undefined
              }
            />
            <MiniStats
              items={[
                { v: pacing.avgAdr > 0 ? fmtMad(pacing.avgAdr) : dash, l: pacingHint?.includes('comps') ? 'ADR comps' : pacing.monthLabel.startsWith('Estimation') ? 'ADR est.' : 'ADR L90D' },
                { v: pacing.avgStayNights > 0 ? `${pacing.avgStayNights.toFixed(1)}n` : dash, l: 'Durée moy' },
                { v: pacing.compsCount > 0 ? String(pacing.compsCount) : dash, l: 'Comps' },
              ]}
            />
            {pacingHint ? (
              <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.75 }}>{pacingHint}</Typography>
            ) : null}
          </>
        ) : (
          <DataEmptyPlaceholder
            compact
            title="—"
            hint={
              pacingHint ??
              'Estimation marché indisponible — activez « Estimation auto » (lun. & jeu.)'
            }
          />
        )}
      </StatCard>
    </Box>
  );
}

function StatCard({
  label,
  emoji,
  tooltip,
  children,
}: {
  label: string;
  emoji: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: 2.25,
        p: '24px 22px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
        minHeight: 200,
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${T.gold}, ${T.goldSoft})`,
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75,  mb: 1.75 }}>
        <Box sx={{ fontSize: 13 }}>{emoji}</Box>
        <Typography
          sx={{
            fontSize: 10.5,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 800,
            color: T.text3,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {label}
        </Typography>
        {tooltip && (
          <Tooltip title={tooltip} arrow>
            <Box
              sx={{
                ml: 'auto',
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: T.bg3,
                color: T.text3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 9,
                fontWeight: 800,
                cursor: 'help',
              }}
            >
              ⓘ
            </Box>
          </Tooltip>
        )}
      </Stack>
      {children}
    </Box>
  );
}

function ValueBlock({
  value,
  unit,
  sub,
  trend,
}: {
  value: string;
  unit: string;
  sub: string;
  trend?: { delta: number; label: string };
}) {
  return (
    <>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 1,  mb: 0.375 }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 34,
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1,
          }}
        >
          {value}
          <Box component="span" sx={{ fontSize: 14, color: T.text3, fontWeight: 700, ml: 0.5 }}>
            {unit}
          </Box>
        </Typography>
        {trend && (
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 11,
              color: trend.delta < 0 ? T.error : T.success,
              fontFamily: '"Geist Mono", monospace',
              fontWeight: 700,
              bgcolor: trend.delta < 0 ? T.errorTint : T.successTint,
              px: 1,
              py: 0.375,
              borderRadius: '99px',
            }}
          >
            {trend.label}
          </Box>
        )}
      </Stack>
      <Typography
        sx={{
          fontSize: 11.5,
          color: T.text4,
          fontFamily: '"Geist Mono", monospace',
          mb: 1.75,
        }}
      >
        {sub}
      </Typography>
    </>
  );
}

function RangeBar({ p25, p50, p75 }: { p25: number; p50: number; p75: number }) {
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  return (
    <Box sx={{ position: 'relative', height: 34, my: '14px' }}>
      <Box sx={{ position: 'absolute', left: 0, right: 0, top: 14, height: 6, bgcolor: T.bg3, borderRadius: '99px' }} />
      <Stack direction="row" sx={{ justifyContent: 'space-between',  mt: '22px', fontSize: 9.5, fontFamily: '"Geist Mono", monospace', color: T.text4, fontWeight: 700 }}>
        <span>P25 · {fmt(p25)}</span>
        <Box component="span" sx={{ color: T.goldDeep, fontWeight: 800 }}>
          P50 · {fmt(p50)}
        </Box>
        <span>P75 · {fmt(p75)}</span>
      </Stack>
    </Box>
  );
}

function MiniStats({ items }: { items: { v: string; l: string }[] }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 1.25,
        my: '14px',
        p: 1.375,
        bgcolor: T.bg2,
        borderRadius: 1.25,
      }}
    >
      {items.map((it, i) => (
        <Box key={i} sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 14, fontWeight: 800 }}>{it.v}</Typography>
          <Typography
            sx={{
              fontSize: 9.5,
              color: T.text3,
              fontFamily: '"Geist Mono", monospace',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
              fontWeight: 700,
              mt: 0.125,
            }}
          >
            {it.l}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function CtxPhrase({ warn, children }: { warn?: boolean; children: React.ReactNode }) {
  return (
    <Box
      sx={{
        p: '9px 12px',
        fontSize: 11.5,
        color: T.text2,
        background: warn ? `linear-gradient(90deg, ${T.warningTint}, transparent)` : `linear-gradient(90deg, ${T.bg2}, transparent)`,
        borderLeft: `3px solid ${warn ? T.warning : T.gold}`,
        borderRadius: '0 8px 8px 0',
        '& b': { color: T.text, fontWeight: 700 },
      }}
    >
      {children}
    </Box>
  );
}
