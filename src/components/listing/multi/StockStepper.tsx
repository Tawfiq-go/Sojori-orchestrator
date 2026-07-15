import { Box, IconButton, Typography } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { multiTokens as t } from './multiTypes';

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
};

/** Champ hero roomNumber — plancher 1. */
export function StockStepper({ value, onChange, min = 1 }: Props) {
  const n = Math.max(min, Number(value) || min);
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        background: t.bg1,
        border: `1.5px solid ${t.borderStrong}`,
        borderRadius: '12px',
        p: 0.75,
      }}
    >
      <IconButton
        size="small"
        aria-label="moins"
        onClick={() => onChange(Math.max(min, n - 1))}
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: t.bg2,
          color: t.text,
          '&:hover': { background: t.primaryTint, color: t.primaryDeep },
        }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        sx={{
          minWidth: 48,
          textAlign: 'center',
          fontWeight: 800,
          fontSize: 28,
          letterSpacing: '-0.03em',
          fontFamily: t.mono,
          color: t.text,
        }}
      >
        {n}
      </Typography>
      <IconButton
        size="small"
        aria-label="plus"
        onClick={() => onChange(n + 1)}
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          background: t.primary,
          color: '#3a2c08',
          '&:hover': { background: t.primarySoft },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
