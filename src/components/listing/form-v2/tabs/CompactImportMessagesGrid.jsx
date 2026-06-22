// Messages planifiés — lecture seule + toggle par résa (lancement import).
import React from 'react';
import { Box, Chip, Stack, Switch, Typography } from '@mui/material';
import { SCHEDULED_MESSAGE_EMOJI } from '../../../../features/taskHub/staff-design/orchestrationJourneyOrder';
import { formatImportLaunchMessageSubtitle } from '../../../../utils/importLaunchMessageFormat';
import { T } from './_shared';

const switchSx = {
  transform: 'scale(0.72)',
  transformOrigin: 'center right',
  mr: -0.75,
  flexShrink: 0,
  '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: T.primary, opacity: 0.85 },
};

export function CompactImportMessagesGrid({
  rules,
  catalog,
  enabledByMessageId,
  onToggle,
  disabled = false,
}) {
  if (!rules?.length) {
    return (
      <Typography sx={{ fontSize: 12, color: T.text3 }}>
        Aucun message planifié sur cette annonce — voir l&apos;onglet Orchestration · Messages.
      </Typography>
    );
  }

  return (
    <Stack spacing={0.75}>
      {rules.map((rule) => {
        const cat = catalog.find((c) => c.id === rule.catalogMessageId);
        const emoji = SCHEDULED_MESSAGE_EMOJI[rule.catalogMessageId] ?? '📨';
        const messageId = rule.catalogMessageId;
        const effectiveEnabled =
          enabledByMessageId?.[messageId] ?? (rule.enabled !== false);
        const subtitle = formatImportLaunchMessageSubtitle(rule, cat?.label);

        return (
          <Box
            key={rule._id || messageId}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              py: 0.35,
              minWidth: 0,
            }}
          >
            <Typography sx={{ fontSize: 14, lineHeight: 1, flexShrink: 0 }} aria-hidden>
              {emoji}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: effectiveEnabled ? T.text : T.text3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {rule.label || cat?.label || 'Message'}
              </Typography>
              <Typography
                sx={{
                  fontSize: 10,
                  color: T.text3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
                title={subtitle}
              >
                {subtitle}
              </Typography>
            </Box>
            <Chip
              size="small"
              label={effectiveEnabled ? 'Actif' : 'Inactif'}
              sx={{
                height: 20,
                fontSize: 9.5,
                fontWeight: 700,
                flexShrink: 0,
                bgcolor: effectiveEnabled ? T.successTint : T.bg2,
                color: effectiveEnabled ? T.success : T.text3,
                border: effectiveEnabled
                  ? '1px solid rgba(10,143,94,0.22)'
                  : `1px solid ${T.border}`,
              }}
            />
            <Switch
              size="small"
              checked={effectiveEnabled}
              disabled={disabled}
              onChange={(_, checked) => onToggle?.(messageId, checked)}
              inputProps={{ 'aria-label': rule.label || cat?.label }}
              sx={switchSx}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

export default CompactImportMessagesGrid;
