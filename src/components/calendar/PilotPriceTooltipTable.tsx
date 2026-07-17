import React from 'react';
import { Box, Typography, Stack } from '@mui/material';
import { T } from '../../features/dynamic-pricing/_tokens';
import { priceOf, resolvePriceMode, PRICE_MODE_LABEL } from '../calendar-v3/_shared';

type PilotFactorRow = {
  key?: string;
  label: string;
  sub?: string;
  valueMad?: number;
  before?: number;
  after?: number;
};

type History = {
  source?: string;
  mixEngineVersion?: string;
  calculated?: number;
  base?: number;
  pricingBaseSource?: 'estimate' | 'manual_base';
  pilotFactors?: PilotFactorRow[];
};

type InvSlice = {
  basePrice?: number;
  calculatedPrice?: number;
  manualPrice?: number | null;
  applyManual?: boolean;
  useDynamicPrice?: boolean;
  priceMode?: 'manual' | 'dynamic' | 'base';
  setUseDynamicPriceManual?: boolean;
};

const FACTOR_ORDER = [
  'base',
  'mode',
  'occupancy',
  'floorNormal',
  'floorAggressive',
  'ceiling',
  'event',
  'lastMinute',
  'rounding',
];

function factorTitle(f: PilotFactorRow) {
  if (f.key === 'base') {
    const sub = String(f.sub || '').toLowerCase();
    if (sub.includes('listing')) return 'Prix base listing';
    return 'Estimation prix de marché';
  }
  if (f.key === 'mode') return f.label || 'Mode';
  if (f.key === 'occupancy') return 'Taux occupation';
  if (f.key === 'lastMinute') return 'Dernière minute';
  if (f.key === 'event') return f.label || 'Événement';
  if (f.key === 'rounding') return 'Arrondi';
  return f.label || f.key || '';
}

export default function PilotPriceTooltipTable({
  history,
  inv,
  currency = 'MAD',
}: {
  history: History;
  inv?: InvSlice;
  currency?: string;
}) {
  if (!history) return null;
  const factors = [...(history.pilotFactors ?? [])].sort((a, b) => {
    const ia = FACTOR_ORDER.indexOf(a.key || '');
    const ib = FACTOR_ORDER.indexOf(b.key || '');
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  const isPilot = history.source === 'pilot-v2' || factors.length > 0;
  if (!isPilot) return null;

  const calc = inv?.calculatedPrice;
  const man = inv?.manualPrice;
  const mode = inv ? resolvePriceMode(inv) : 'base';
  const manualActive = mode === 'manual';
  const dynamicActive = mode === 'dynamic';
  const total = inv ? priceOf(inv) : (history.calculated ?? 0);
  const baseSource =
    history.pricingBaseSource === 'manual_base' ? 'base manuel' : 'base estimé';

  return (
    <Box sx={{ p: 1.5, minWidth: 280, maxWidth: 360, bgcolor: '#fff' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.ai, mb: 1, textTransform: 'uppercase' }}>
        Sojori AI · {history.mixEngineVersion ?? 'v2.1'} · {baseSource}
      </Typography>
      {factors.map((f, i) => {
        const isBase = f.key === 'base';
        const after = Math.round(f.after ?? (isBase ? history.base : 0) ?? 0);
        const delta = Math.round(f.valueMad ?? 0);
        return (
          <Stack key={`${f.key ?? i}`} sx={{ py: 0.4 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', gap: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: isBase ? 800 : 650, color: T.text2 }}>
                {factorTitle(f)}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: '"Geist Mono", monospace',
                  color: isBase ? T.text : delta >= 0 ? T.success : T.error,
                }}
              >
                {isBase
                  ? `${after} ${currency}`
                  : `${delta >= 0 ? '+' : ''}${delta} ${currency}`}
              </Typography>
            </Stack>
            {f.sub ? (
              <Typography sx={{ fontSize: 9.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>
                {f.sub}
              </Typography>
            ) : null}
          </Stack>
        );
      })}

      {inv ? (
        <>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3, mt: 1, mb: 0.5, textTransform: 'uppercase' }}>
            Affiché calendrier
          </Typography>
          {calc != null ? (
            <ModeRow label="Prix dynamique" value={`${Math.round(calc)} ${currency}`} active={dynamicActive} color={T.ai} />
          ) : null}
          {man != null ? (
            <ModeRow label="Prix manuel" value={`${Math.round(man)} ${currency}`} active={manualActive} color={T.warning} />
          ) : null}
        </>
      ) : null}

      <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
          Prix final · {PRICE_MODE_LABEL[mode]}
        </Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: T.goldDeep, fontFamily: '"Geist Mono", monospace' }}>
          {Math.round(total)} {currency}
        </Typography>
      </Box>
    </Box>
  );
}

function ModeRow({
  label,
  value,
  active,
  color,
}: {
  label: string;
  value: string;
  active: boolean;
  color: string;
}) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', py: 0.25 }}>
      <Typography sx={{ fontSize: 11.5, fontWeight: active ? 800 : 500, color: active ? color : T.text4 }}>
        {label}
        {active ? ' ●' : ''}
      </Typography>
      <Typography
        sx={{
          fontSize: 12,
          fontWeight: active ? 800 : 500,
          color: active ? color : T.text4,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}
