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

function normalizeFactorLabel(label: string) {
  return label.replace(/\(estimate\)/gi, '').replace(/\s+/g, ' ').trim();
}

function priceOfInv(inv: InvSlice): number {
  return priceOf(inv);
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
  const factors = history.pilotFactors ?? [];
  const isPilot = history.source === 'pilot-v2' || factors.length > 0;
  if (!isPilot) return null;

  const calc = inv?.calculatedPrice;
  const man = inv?.manualPrice;
  const mode = inv ? resolvePriceMode(inv) : 'base';
  const manualActive = mode === 'manual';
  const dynamicActive = mode === 'dynamic';
  const total = inv ? priceOfInv(inv) : (history.calculated ?? 0);

  return (
    <Box sx={{ p: 1.5, minWidth: 280, maxWidth: 360, bgcolor: '#fff' }}>
      <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.ai, mb: 1, textTransform: 'uppercase' }}>
        Sojori AI · {history.mixEngineVersion ?? 'v2.4'}
      </Typography>
      {factors.map((f, i) => {
        const isBase = f.key === 'base';
        const label = isBase ? 'Prix marché' : normalizeFactorLabel(f.label);
        const valueText = isBase
          ? `${Math.round(f.after ?? history.base ?? f.valueMad ?? 0)} ${currency}`
          : `${(f.valueMad ?? 0) >= 0 ? '+' : ''}${Math.round(f.valueMad ?? 0)} ${currency}`;
        return (
          <Stack key={`${f.key ?? i}`} direction="row" sx={{ justifyContent: 'space-between', py: 0.35 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 600, color: T.text2 }}>{label}</Typography>
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                fontFamily: '"Geist Mono", monospace',
                color: isBase ? T.text : (f.valueMad ?? 0) >= 0 ? T.success : T.error,
              }}
            >
              {valueText}
            </Typography>
          </Stack>
        );
      })}

      {inv ? (
        <>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: T.text3, mt: 1, mb: 0.5, textTransform: 'uppercase' }}>
            Prix affiché calendrier
          </Typography>
          {calc != null ? (
            <ModeRow label="Prix dynamique" value={`${calc} ${currency}`} active={dynamicActive} color={T.ai} />
          ) : null}
          {man != null ? (
            <ModeRow label="✏ Manuel" value={`${man} ${currency}`} active={manualActive} color={T.warning} />
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
    <Stack direction="row" sx={{ justifyContent: 'space-between', opacity: active ? 1 : 0.45 }}>
      <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? color : T.text4 }}>
        {label}
        {active ? (
          <Box component="span" sx={{ ml: 0.75, fontSize: 9, fontWeight: 800 }}>
            ACTIF
          </Box>
        ) : null}
      </Typography>
      <Typography sx={{ fontSize: 11, fontWeight: active ? 700 : 500, color: active ? color : T.text4, fontFamily: '"Geist Mono", monospace' }}>
        {value}
      </Typography>
    </Stack>
  );
}
