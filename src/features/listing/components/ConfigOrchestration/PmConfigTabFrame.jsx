import React, { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';
import { TYPO } from './SHARED';
import { PM_CONFIG_SCHEMA_FIELDS, countSchemaGaps } from './pmConfigSchemaRegistry';

/**
 * En-tête commun Config Orch. NEW : légende schéma repliable (gain vertical).
 */
export default function PmConfigTabFrame({ tabKey, children }) {
  const [open, setOpen] = useState(false);
  const fields = PM_CONFIG_SCHEMA_FIELDS[tabKey] || [];
  const { inSchema, mockup } = countSchemaGaps(tabKey);

  return (
    <Box sx={{ maxWidth: 1100 }}>
      <Box
        component="button"
        type="button"
        onClick={() => setOpen(o => !o)}
        sx={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          width: '100%',
          mb: 1.5,
          p: 1,
          borderRadius: 1,
          border: `1px solid ${T.border}`,
          bgcolor: T.bg2,
          '&:hover': { borderColor: T.borderStrong, bgcolor: T.bg3 },
        }}
      >
        <Stack direction="row" flexWrap="wrap" gap={1} alignItems="center">
          <Typography sx={{ ...TYPO.label }}>
            {open ? '▼' : '▶'} Lecture design ↔ schéma Mongo
          </Typography>
          <Box sx={{ ...TYPO.mono, fontSize: 10, fontWeight: 700, px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: T.successTint, color: T.success }}>
            {inSchema} schéma
          </Box>
          {mockup > 0 && (
            <Box sx={{ ...TYPO.mono, fontSize: 10, fontWeight: 700, px: 0.75, py: 0.2, borderRadius: 0.75, bgcolor: T.errorTint, color: T.error }}>
              {mockup} mockup
            </Box>
          )}
          <Typography sx={{ ...TYPO.monoHelp, ml: 'auto' }}>
            {open ? 'Replier' : 'Déplier la légende'}
          </Typography>
        </Stack>
      </Box>
      {open && (
        <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 2 }}>
          {fields.map(f => (
            <Box
              key={f.id}
              title={f.note || f.designPath}
              sx={{
                fontSize: 9.5,
                fontFamily: CONFIG_ORCH_FONT.mono,
                px: 0.75,
                py: 0.25,
                borderRadius: 0.5,
                border: `1px solid ${f.inSchema ? T.border : T.error}`,
                color: f.inSchema ? T.text3 : T.error,
                bgcolor: f.inSchema ? T.bg1 : T.errorTint,
              }}
            >
              {f.inSchema ? '✓' : '⚠'} {f.label}
            </Box>
          ))}
        </Stack>
      )}
      {children}
    </Box>
  );
}
