import React, { useState } from 'react';
import {
  Box,
  Chip,
  Collapse,
  IconButton,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import SmartAvailabilitySelector from './SmartAvailabilitySelector';
import RequiresConditionsSelector from './RequiresConditionsSelector';
import { resolveAvailabilityType, normalizeMenuOptionAvailability } from './menuAvailabilityNormalize';
import { T, codeChipSx, isSubOption, menuCardSx } from './menuTheme';

const MenuOptionCard = ({
  option,
  onChange,
  defaultExpanded = false,
  /** navigation-leaf = switch + dispo · navigation-category = C/D/J parent · switch seul */
  variant = 'default',
  /** A/B : toujours actif, non désactivable */
  lockEnabledOn = false,
  /** A/B : disponibilité figée « Toujours » */
  lockAvailabilityAlways = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!option) return null;

  const isNavigationLeaf = variant === 'navigation-leaf';
  const isNavigationCategory = variant === 'navigation-category';
  const isDeclarationOption = option.code === 'D3' || option.code === 'D4';
  const isParentOnly = isNavigationCategory || (!isNavigationLeaf && ['D', 'J'].includes(option.code));
  const showAvailability =
    !lockAvailabilityAlways &&
    (isNavigationLeaf || (!isParentOnly && !isNavigationCategory));
  const enabled = lockEnabledOn ? true : option.enabled;
  const sub = isSubOption(option.code);
  const availType = resolveAvailabilityType(option.availability);

  return (
    <Box
      sx={{
        ...menuCardSx({
          borderColor: isNavigationCategory
            ? T.border
            : enabled
              ? isDeclarationOption
                ? 'rgba(6,115,179,0.35)'
                : sub
                  ? 'rgba(184,133,26,0.28)'
                  : T.borderStrong
              : T.border,
          bgcolor: isNavigationCategory
            ? T.bg2
            : isDeclarationOption && enabled
              ? T.infoTint
              : sub && enabled
                ? T.primaryTint
                : T.bg1,
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
        <Chip
          label={option.code}
          size="small"
          sx={codeChipSx(enabled, isDeclarationOption ? 'declaration' : 'default')}
        />
        <Typography sx={{ flex: 1, fontWeight: 600, fontSize: 13, color: T.text, lineHeight: 1.35 }}>
          {option.label}
        </Typography>
        {isDeclarationOption && (
          <Chip label="📍" size="small" sx={{ height: 20, bgcolor: T.infoTint, color: T.info, fontSize: '0.65rem' }} />
        )}
        {lockEnabledOn ? (
          <Chip
            label="Toujours actif"
            size="small"
            sx={{ height: 22, bgcolor: T.primaryTint, color: T.primaryDeep, fontSize: '0.65rem', fontWeight: 700 }}
          />
        ) : (
        <Switch
          checked={enabled}
          onChange={(e) => onChange({ ...option, enabled: e.target.checked })}
          size="small"
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primarySoft },
          }}
        />
        )}
        {!isParentOnly && !isNavigationLeaf && (
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

      {lockAvailabilityAlways && (
        <Box sx={{ px: 1.5, pb: 1.25, pt: 0, borderTop: `1px solid ${T.border}`, bgcolor: T.bg2 }}>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.06em', pt: 1 }}>
            Fenêtre de disponibilité
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: T.text2, mt: 0.5 }}>Toujours — non modifiable</Typography>
        </Box>
      )}

      {showAvailability && (isNavigationLeaf || expanded) && (
        <Collapse in={isNavigationLeaf || expanded} timeout="auto" unmountOnExit>
          <Box sx={{ px: 1.5, pb: 1.5, pt: 0, borderTop: `1px solid ${T.border}`, bgcolor: sub ? 'rgba(255,255,255,0.55)' : T.bg2 }}>
            <SmartAvailabilitySelector
              value={option.availability}
              onChange={(availability) =>
                onChange({
                  ...option,
                  availability: normalizeMenuOptionAvailability(availability),
                })
              }
            />
            {availType === 'conditional_and_time' && (
              <RequiresConditionsSelector
                value={option.availability?.requires || ''}
                onChange={(requires) =>
                  onChange({
                    ...option,
                    availability: normalizeMenuOptionAvailability({
                      ...(option.availability || {}),
                      requires,
                    }),
                  })
                }
              />
            )}
            {option.action && !isNavigationLeaf && (
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
