import { Box, Typography } from '@mui/material';
import { T, DP_LAYOUT_SX } from './_tokens';

export default function DataEmptyPlaceholder({
  title = 'Aucune donnée en production',
  hint,
  compact,
}: {
  title?: string;
  hint?: string;
  compact?: boolean;
}) {
  return (
    <Box
      sx={{
        p: compact ? 2 : 3,
        borderRadius: 1.5,
        border: `1px dashed ${T.borderStrong}`,
        bgcolor: T.bg2,
        textAlign: 'center',
        ...DP_LAYOUT_SX,
      }}
    >
      <Typography sx={{ fontSize: compact ? 13 : 14, fontWeight: 700, color: T.text2 }}>
        {title}
      </Typography>
      {hint && (
        <Typography sx={{ fontSize: 12, color: T.text3, mt: 0.75, lineHeight: 1.45 }}>{hint}</Typography>
      )}
    </Box>
  );
}
