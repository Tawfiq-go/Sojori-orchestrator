// ════════════════════════════════════════════════════════════════════
// DynamicPricingShell.tsx — en-tête page Dynamic Pricing
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { T } from './_tokens';

interface Props {
  /** Déclencheur discret (modal marché) */
  dataActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function DynamicPricingShell({ dataActions, children }: Props) {
  return (
    <Box sx={{ maxWidth: 1500, mx: 'auto', px: { xs: 2, md: 3.5 } }}>
      <Stack direction="row" sx={{ alignItems: 'baseline', gap: 2, pt: 2.5, pb: 1.75, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{
            fontSize: 11, color: T.text3, fontFamily: '"Geist Mono", monospace',
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>Sojori · Pricing</Typography>
          <Typography sx={{ m: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.025em' }}>
            Dynamic Pricing
          </Typography>
        </Box>
        {dataActions ? (
          <Stack direction="row" sx={{ alignItems: 'center', gap: 1, ml: 'auto', flexWrap: 'wrap' }}>
            {dataActions}
          </Stack>
        ) : null}
      </Stack>
      {children}
    </Box>
  );
}
