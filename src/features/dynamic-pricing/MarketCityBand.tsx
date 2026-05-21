// ════════════════════════════════════════════════════════════════════
// MarketCityBand.tsx — bande "MARCHÉ MARRAKECH" sous les 4 macros portefeuille
// Données marché: markets/summary + markets/metrics/all + markets/future/pacing
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, Tooltip } from '@mui/material';
import { T } from './_tokens';
import type { MarketCityKpis } from './PortfolioView';
import { formatSnapshotLabel } from './DataSourceBadges';

export interface MarketCityBandProps {
  city: MarketCityKpis;
  hasData?: boolean;
  fetchedAt?: string | null;
}

const fmtMad = (n: number) => n.toLocaleString('fr-FR');
const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

const dash = '—';

export default function MarketCityBand({ city, hasData = false, fetchedAt }: MarketCityBandProps) {
  const snap = formatSnapshotLabel(fetchedAt);
  return (
    <Box sx={{
      mb: 2.25,
      background: 'linear-gradient(135deg, #1a1408 0%, #2a2014 100%)',
      border: '1px solid rgba(244,207,94,0.20)',
      borderRadius: 1.75,
      p: '14px 18px',
      position: 'relative', overflow: 'hidden',
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Box sx={{ fontSize: 14 }}>🏙</Box>
        <Typography sx={{
          fontSize: 10.5, fontFamily: '"Geist Mono", monospace', fontWeight: 800,
          color: T.gold, textTransform: 'uppercase', letterSpacing: '0.10em',
        }}>MARCHÉ · {city.cityName.toUpperCase()}</Typography>
        <Tooltip title="Données marché markets/summary + metrics/all + future/pacing" arrow>
          <Box sx={{
            width: 16, height: 16, borderRadius: '50%',
            bgcolor: 'rgba(244,207,94,0.15)', color: T.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, fontWeight: 800, cursor: 'help',
          }}>ⓘ</Box>
        </Tooltip>
        <Typography sx={{
          ml: 'auto', fontSize: 10, color: 'rgba(244,207,94,0.55)',
          fontFamily: '"Geist Mono", monospace', letterSpacing: '0.04em', fontWeight: 600,
        }}>
          {hasData ? 'Snapshot · cache ville' : 'Pas de cache — lancer ⟳ marché'}
          {snap ? ` · ${snap}` : ''}
        </Typography>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2.25 }}>
        <CityKpi
          label="Occupation moyenne"
          value={hasData && city.occupancyAvg24m > 0 ? fmtPct(city.occupancyAvg24m) : dash}
          sub="24 mois glissants"
        />
        <CityKpi
          label="ADR médian"
          value={hasData && city.adrMedianCity > 0 ? fmtMad(city.adrMedianCity) : dash}
          unit={hasData && city.adrMedianCity > 0 ? 'MAD' : undefined}
          sub={`Ville · ${city.cityName}`}
        />
        <CityKpi
          label="Pacing 12 mois"
          value={hasData && city.pacingCurrent.fillRate > 0 ? `${Math.round(city.pacingCurrent.fillRate * 100)}%` : dash}
          sub={
            hasData
              ? `${city.pacingCurrent.monthLabel} → ${Math.round(city.pacingNext.fillRate * 100)}% (${city.pacingNext.monthLabel})`
              : '—'
          }
        />
        <CityKpi
          label="Croissance offre"
          value={hasData && city.supplyGrowthPct > 0 ? `+${city.supplyGrowthPct}%` : dash}
          sub={`Listings actifs · ${city.supplyGrowthMonths} mois`}
          warn={hasData && city.supplyGrowthPct > 0}
        />
      </Box>
    </Box>
  );
}

function CityKpi({ label, value, unit, sub, warn }: {
  label: string; value: string; unit?: string; sub: string; warn?: boolean;
}) {
  return (
    <Box>
      <Typography sx={{
        fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
        color: 'rgba(244,207,94,0.55)', textTransform: 'uppercase', letterSpacing: '0.06em', mb: 0.5,
      }}>{label}</Typography>
      <Typography sx={{
        fontFamily: '"Geist Mono", monospace', fontSize: 24, fontWeight: 800,
        color: warn ? '#fda4af' : '#fff', letterSpacing: '-0.025em', lineHeight: 1,
      }}>
        {value}
        {unit && <Box component="span" sx={{ fontSize: 11, color: 'rgba(244,207,94,0.7)', fontWeight: 700, ml: 0.5 }}>{unit}</Box>}
      </Typography>
      <Typography sx={{
        fontSize: 10.5, color: 'rgba(255,255,255,0.45)',
        fontFamily: '"Geist Mono", monospace', mt: 0.625, letterSpacing: '0.02em',
      }}>{sub}</Typography>
    </Box>
  );
}
