import { Box, Typography } from '@mui/material';

export type TemplateSyncLogLine = {
  at: string;
  level: 'info' | 'ok' | 'warn' | 'error';
  message: string;
};

const LEVEL_COLOR: Record<TemplateSyncLogLine['level'], string> = {
  info: '#64748b',
  ok: '#15803d',
  warn: '#b45309',
  error: '#b91c1c',
};

type Props = {
  lines: TemplateSyncLogLine[];
};

export default function TemplateSyncLogPanel({ lines }: Props) {
  if (lines.length === 0) return null;

  return (
    <Box
      sx={{
        mb: 1,
        p: 1,
        borderRadius: 1,
        bgcolor: 'rgba(15,23,42,0.04)',
        border: '1px solid rgba(15,23,42,0.1)',
        maxHeight: 140,
        overflow: 'auto',
      }}
    >
      <Typography
        variant="caption"
        sx={{ fontWeight: 800, letterSpacing: '0.06em', color: 'text.secondary', display: 'block', mb: 0.5 }}
      >
        Journal sync Template
      </Typography>
      {lines.map((line, i) => (
        <Typography
          key={`${line.at}-${i}`}
          component="div"
          sx={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            lineHeight: 1.45,
            color: LEVEL_COLOR[line.level],
          }}
        >
          [{line.at}] {line.message}
        </Typography>
      ))}
    </Box>
  );
}
