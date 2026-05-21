import React from 'react';
import { Box, Stack, Typography, Skeleton } from '@mui/material';
import { T } from './_tokens';
import type { DataMaturitySummary } from './listingFilters';

interface Props {
  maturity: DataMaturitySummary;
  cityLabel: string | null;
  loading?: boolean;
}

function scoreColor(pct: number): string {
  if (pct >= 75) return T.success;
  if (pct >= 40) return T.goldDeep;
  return T.error;
}

function GaugeBar({ label, num, den, hint }: { label: string; num: number; den: number; hint: string }) {
  const pct = den > 0 ? Math.round((num / den) * 100) : 0;
  const barPct = den > 0 ? Math.min(100, (num / den) * 100) : 0;
  return (
    <Box sx={{ flex: 1, minWidth: 140 }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between',  mb: 0.5 }}>
        <Typography sx={{
          fontSize: 10, fontWeight: 800, fontFamily: '"Geist Mono", monospace',
          color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontSize: 11, fontFamily: '"Geist Mono", monospace', fontWeight: 800, color: T.text,
        }}>
          {den > 0 ? `${num}/${den}` : '—'}
          <Box component="span" sx={{ color: T.text3, fontWeight: 600, ml: 0.5 }}>{den > 0 ? `${pct}%` : ''}</Box>
        </Typography>
      </Stack>
      <Box sx={{ height: 8, bgcolor: T.bg3, borderRadius: 999, overflow: 'hidden' }}>
        <Box sx={{
          height: '100%',
          width: `${barPct}%`,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${T.gold}, ${T.goldDeep})`,
          transition: 'width 0.35s ease',
        }} />
      </Box>
      <Typography sx={{ fontSize: 10, color: T.text3, mt: 0.5 }}>{hint}</Typography>
    </Box>
  );
}

export default function PortfolioDataMaturityCard({ maturity, cityLabel, loading }: Props) {
  if (loading) {
    return (
      <Box sx={{ mb: 2.25 }}>
        <Skeleton variant="rounded" height={108} sx={{ borderRadius: 1.75 }} />
      </Box>
    );
  }

  const color = scoreColor(maturity.scorePct);
  const title = cityLabel ? `Maturité · ${cityLabel}` : 'Maturité · toutes villes';

  return (
    <Box sx={{
      mb: 2.25,
      p: 2,
      borderRadius: 1.75,
      border: `1px solid ${T.border}`,
      bgcolor: T.bg1,
      boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      animation: 'sj-fadeIn 0.35s',
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 2,  mb: 1.75, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{
            fontSize: 10, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
            color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {title}
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text2, mt: 0.25 }}>
            Diagnostic données · pas d’appel marché automatique
          </Typography>
        </Box>
        <Box sx={{ ml: 'auto', textAlign: 'right' }}>
          <Typography sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: 32, fontWeight: 800,
            color, lineHeight: 1, letterSpacing: '-0.03em',
          }}>
            {maturity.scorePct}%
          </Typography>
          <Typography sx={{ fontSize: 10, color: T.text3, fontWeight: 700 }}>
            score ville
            {maturity.todoCount > 0 ? (
              <Box component="span" sx={{ color: T.warning, ml: 0.75 }}>
                · {maturity.todoCount} à traiter
              </Box>
            ) : null}
          </Typography>
        </Box>
      </Stack>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        sx={{ gap: 2,  flexWrap: 'wrap' }}
      >
        {maturity.gauges.map((g) => (
          <GaugeBar key={g.id} label={g.label} num={g.num} den={g.den} hint={g.hint} />
        ))}
      </Stack>
    </Box>
  );
}
