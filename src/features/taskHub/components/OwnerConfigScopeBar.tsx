import { Box, Chip, Stack, Typography } from '@mui/material';
import OwnerFilterField from '../../../components/OwnerFilterBar/OwnerFilterField';
import type { FulltaskConfigOwnerScope } from '../../../hooks/useFulltaskConfigOwner';

type Props = FulltaskConfigOwnerScope & {
  compact?: boolean;
};

/**
 * Bandeau propriétaire pour pages config fulltask (workflows, messages, task config).
 */
export default function OwnerConfigScopeBar({
  ownerDisplayName,
  ownerKeyDetail,
  showOwnerPicker,
  hideOwnerScopeLabels = false,
  compact = false,
}: Props) {
  if (hideOwnerScopeLabels && !showOwnerPicker) {
    return null;
  }

  return (
    <Box
      sx={{
        mb: compact ? 1.5 : 2,
        px: compact ? 0 : 0,
        py: compact ? 0.75 : 1.25,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1.5,
        borderRadius: 2,
        bgcolor: 'rgba(6,115,179,0.06)',
        border: '1px solid rgba(6,115,179,0.18)',
        ...(compact ? {} : { px: 2 }),
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0673b3', letterSpacing: '0.04em' }}>
          PROPRIÉTAIRE
        </Typography>
        <Chip
          label={ownerDisplayName}
          size="small"
          sx={{
            fontWeight: 700,
            bgcolor: '#0673b3',
            color: '#fff',
            maxWidth: '100%',
            '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
          }}
        />
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ fontFamily: 'Geist Mono, ui-monospace, monospace', fontSize: 11 }}
        >
          {ownerKeyDetail}
        </Typography>
      </Stack>
      {showOwnerPicker ? (
        <OwnerFilterField toolbarInputHeight={36} sx={{ minWidth: 220, maxWidth: 320 }} />
      ) : null}
    </Box>
  );
}
