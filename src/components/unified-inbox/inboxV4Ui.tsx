import { Box, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { T } from './_tokens';

export const inboxShellSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', lg: '360px 1fr 340px' },
  height: { xs: 'auto', lg: 'min(760px, calc(100vh - 200px))' },
  minHeight: { xs: 0, lg: 560 },
  overflow: 'hidden',
  bgcolor: T.bg1,
  border: `1px solid ${T.border}`,
  borderRadius: '14px',
  boxShadow: '0 4px 12px -2px rgba(20,17,10,0.06), 0 2px 4px -1px rgba(20,17,10,0.04)',
} as const;

export const inboxShellFillSx = {
  ...inboxShellSx,
  height: { xs: 'auto', lg: '100%' },
  minHeight: { xs: 420, lg: 0 },
  maxHeight: { lg: '100%' },
  flex: 1,
} as const;

export const inboxShellFullscreenSx = {
  ...inboxShellSx,
  height: '100%',
  minHeight: 0,
  maxHeight: 'none',
  borderRadius: '12px',
  flex: 1,
} as const;

export function DtCard({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children: ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: '11px',
        p: '12px 13px',
        boxShadow: '0 1px 2px rgba(20,17,10,0.03)',
      }}
    >
      <Stack direction="row" gap={0.875} sx={{ alignItems: 'center',  mb: 1.125 }}>
        <Box sx={{ fontSize: 13, lineHeight: 1 }}>{emoji}</Box>
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 700,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {title}
        </Typography>
      </Stack>
      {children}
    </Box>
  );
}

export function DtRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 1,
        py: 0.375,
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          color: T.text4,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Box sx={{ color: T.text, fontWeight: 600, textAlign: 'right', fontSize: 11.5 }}>{children}</Box>
    </Stack>
  );
}

export function PlatformChip({
  label,
  tone,
}: {
  label: string;
  tone: 'wa' | 'airbnb' | 'booking' | 'default';
}) {
  const styles = {
    wa: { bg: T.greenBg, color: '#0e8c4d' },
    airbnb: { bg: T.airbnbBg, color: '#c0353a' },
    booking: { bg: T.bookingBg, color: '#003580' },
    default: { bg: T.primaryTint, color: T.primaryDeep },
  }[tone];

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: 1,
        py: '2px',
        borderRadius: '5px',
        fontFamily: '"Geist Mono", monospace',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.04em',
        bgcolor: styles.bg,
        color: styles.color,
      }}
    >
      {label}
    </Box>
  );
}

export function StatusPill({ label }: { label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.625,
        px: 1,
        py: '2px',
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        fontFamily: '"Geist Mono", monospace',
        bgcolor: T.successTint,
        color: T.success,
      }}
    >
      <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: T.success }} />
      {label}
    </Box>
  );
}

export function DetailsHeader({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <Box
      sx={{
        px: '18px',
        py: '13px',
        borderBottom: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        flexShrink: 0,
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          color: T.text3,
          fontFamily: '"Geist Mono", monospace',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          mb: 0.375,
          '&::before': {
            content: '""',
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: T.primary,
            flexShrink: 0,
          },
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-0.015em', color: T.text }}>
        {title}
      </Typography>
    </Box>
  );
}

export function PriceHero({ value, currency = 'EUR' }: { value: number; currency?: string }) {
  return (
    <Stack direction="row" gap={0.75} sx={{ alignItems: 'baseline',  mt: 0.625, mb: 0.25 }}>
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: 22,
          fontWeight: 800,
          color: T.primaryDeep,
          letterSpacing: '-0.025em',
          lineHeight: 1,
        }}
      >
        {Math.round(value).toLocaleString('fr-FR')}
      </Typography>
      <Typography
        sx={{
          fontSize: 10.5,
          color: T.text3,
          fontWeight: 600,
          fontFamily: '"Geist Mono", monospace',
        }}
      >
        {currency}
      </Typography>
    </Stack>
  );
}

export function StickyActionButton({
  label,
  onClick,
  variant = 'gold',
}: {
  label: string;
  onClick?: () => void;
  variant?: 'gold' | 'airbnb' | 'booking';
}) {
  const airbnb = variant === 'airbnb';
  const booking = variant === 'booking';
  return (
    <Box
      sx={{
        px: '18px',
        py: '14px',
        borderTop: `1px solid ${T.border}`,
        bgcolor: T.bg1,
        flexShrink: 0,
      }}
    >
      <Box
        component="button"
        onClick={onClick}
        sx={{
          width: '100%',
          py: 1.25,
          borderRadius: '10px',
          border: 0,
          cursor: 'pointer',
          fontSize: 12.5,
          fontWeight: 700,
          fontFamily: 'inherit',
          color: airbnb || booking ? '#fff' : '#1a1408',
          background: booking
            ? 'linear-gradient(135deg,#4a7eb8,#003580)'
            : airbnb
              ? 'linear-gradient(135deg,#ff8a8e,#FF5A5F)'
              : `linear-gradient(180deg, #cb9b2c, ${T.primary})`,
          boxShadow: booking
            ? '0 2px 10px rgba(0,53,128,0.35)'
            : airbnb
              ? '0 2px 10px rgba(255,90,95,0.35)'
              : '0 2px 10px rgba(184,133,26,0.30), inset 0 1px 0 rgba(255,255,255,0.30)',
          '&:hover': { transform: 'translateY(-1px)' },
        }}
      >
        {label}
      </Box>
    </Box>
  );
}
