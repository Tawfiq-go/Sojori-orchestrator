import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import SmartAvailabilitySelector from './SmartAvailabilitySelector';
import { T, codeChipSx, isSubOption, menuCardSx, sxInput } from './menuTheme';

const MenuOptionCard = ({ option, onChange }) => {
  const [expanded, setExpanded] = useState(false);

  if (!option) return null;

  const isDeclarationOption = option.code === 'D3' || option.code === 'D4';
  const isParentOnly = ['C', 'D', 'J'].includes(option.code);
  const sub = isSubOption(option.code);

  return (
    <Box
      sx={{
        ...menuCardSx({
          borderColor: option.enabled
            ? isDeclarationOption
              ? 'rgba(6,115,179,0.35)'
              : sub
                ? 'rgba(184,133,26,0.28)'
                : T.borderStrong
            : T.border,
          bgcolor: isDeclarationOption && option.enabled ? T.infoTint : sub && option.enabled ? T.primaryTint : T.bg1,
        }),
        ml: sub ? 2.5 : 0,
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 1.5, py: 1.125 }}
      >
        <Chip label={option.code} size="small" sx={codeChipSx(option.enabled, isDeclarationOption ? 'declaration' : 'default')} />
        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 13, color: T.text, lineHeight: 1.35 }}>
          {option.label}
        </Typography>
        {isDeclarationOption && (
          <Chip label="📍" size="small" sx={{ height: 20, bgcolor: T.infoTint, color: T.info, fontSize: '0.65rem' }} />
        )}
        <Switch
          checked={option.enabled}
          onChange={(e) => onChange({ ...option, enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primarySoft },
          }}
        />
        {!isParentOnly && (
          <IconButton
            size="small"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Replier' : 'Déplier'}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s',
              color: T.text3,
            }}
          >
            <ExpandMoreIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      {!isParentOnly && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box sx={{ px: 1.5, pb: 1.5, pt: 0, borderTop: `1px solid ${T.border}`, bgcolor: sub ? 'rgba(255,255,255,0.55)' : T.bg2 }}>
            <SmartAvailabilitySelector
              value={option.availability}
              onChange={(availability) => onChange({ ...option, availability })}
            />
            {option.availability?.type === 'conditional_and_time' && (
              <FormControl size="small" fullWidth sx={{ mt: 1.5 }}>
                <InputLabel id={`requires-label-${option.code}`}>Condition requise</InputLabel>
                <Select
                  labelId={`requires-label-${option.code}`}
                  value={option.availability?.requires || ''}
                  onChange={(e) =>
                    onChange({
                      ...option,
                      availability: { ...(option.availability || {}), requires: e.target.value },
                    })
                  }
                  label="Condition requise"
                  sx={sxInput}
                >
                  <MenuItem value=""><em>Aucune</em></MenuItem>
                  <MenuItem value="D1_completed">D1 - Heure d&apos;arrivée choisie</MenuItem>
                  <MenuItem value="D2_completed">D2 - Heure de départ choisie</MenuItem>
                  <MenuItem value="D3_completed">D3 - Heure d&apos;arrivée déclarée</MenuItem>
                  <MenuItem value="D4_completed">D4 - Heure de départ déclarée</MenuItem>
                  <MenuItem value="E_completed">E - Enregistrement voyageurs</MenuItem>
                </Select>
              </FormControl>
            )}
            {option.action && (
              <Typography
                sx={{
                  mt: 1.25,
                  fontSize: 10.5,
                  fontFamily: '"Geist Mono", monospace',
                  color: T.text3,
                  bgcolor: T.bg3,
                  px: 1,
                  py: 0.5,
                  borderRadius: 0.5,
                  display: 'inline-block',
                }}
              >
                {option.action}
              </Typography>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export default MenuOptionCard;
