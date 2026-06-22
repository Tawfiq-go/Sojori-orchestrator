// Grille compacte — libellé + toggle (préparation avant lancement).
import React from 'react';
import { Box, Switch, Typography } from '@mui/material';
import { CAPABILITY_REGISTRY } from '../../../../features/serviceMatrix/capabilityRegistry';
import { T } from './_shared';

const switchSx = {
  transform: 'scale(0.72)',
  transformOrigin: 'center right',
  mr: -0.75,
  '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary, opacity: 0.85 },
};

export function CompactOrchestrationConfigGrid({ activations, onToggle, disabled = false }) {
  const items = CAPABILITY_REGISTRY.filter((c) => !c.listingRailHidden);

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(2, minmax(0, 1fr))',
          sm: 'repeat(3, minmax(0, 1fr))',
          md: 'repeat(4, minmax(0, 1fr))',
        },
        columnGap: 1,
        rowGap: 0,
      }}
    >
      {items.map((def) => {
        const on = activations[def.key] === true;
        return (
          <Box
            key={def.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 0.25,
              minWidth: 0,
              py: 0,
            }}
          >
            <Typography
              title={def.label}
              sx={{
                fontSize: 10.5,
                color: on ? T.text : T.text3,
                fontWeight: on ? 600 : 400,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1,
                minWidth: 0,
              }}
            >
              {def.emoji} {def.label}
            </Typography>
            <Switch
              size="small"
              checked={on}
              disabled={disabled}
              onChange={(_, checked) => onToggle?.(def.key, checked)}
              inputProps={{ 'aria-label': def.label }}
              sx={switchSx}
            />
          </Box>
        );
      })}
    </Box>
  );
}

export default CompactOrchestrationConfigGrid;
