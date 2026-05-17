// Helper components for Listing Form V2
import React, { type ReactElement } from 'react';
import { Box, Stack, Typography, Button } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { tokens } from './ListingFormV2';

// ════════════════════════════════════════════════════════════════════
// SectionCard — wrap each form section
// ════════════════════════════════════════════════════════════════════

interface SectionCardProps {
  title: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}

export function SectionCard({ title, required, description, children }: SectionCardProps) {
  return (
    <Box sx={{
      bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`,
      borderRadius: '14px', p: '24px 24px 20px', mb: 2.25,
      boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
    }}>
      <Stack direction="row" spacing={1.5} sx={{
        mb: 2.25, pb: 1.5, borderBottom: `1px dashed ${tokens.border}`,
        alignItems: 'baseline',
      }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>{title}</Typography>
        {required && (
          <Box sx={{
            fontSize: 10, fontFamily: 'Geist Mono',
            color: '#b45309', bgcolor: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)',
            px: 0.875, py: 0.25, borderRadius: 0.5,
            letterSpacing: 0.4, textTransform: 'uppercase',
          }}>Required</Box>
        )}
        {description && (
          <Typography sx={{
            ml: 'auto !important', fontSize: 12.5, color: tokens.text3,
            maxWidth: 320, textAlign: 'right', lineHeight: 1.4,
          }}>{description}</Typography>
        )}
      </Stack>
      {children}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// AIField — wrap a MUI input with AI indicator
// ════════════════════════════════════════════════════════════════════

type AiSlotChild = ReactElement<{ sx?: SxProps<Theme> }>;

interface AIFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  aiFilled?: boolean;
  aiAccepted?: boolean;
  /** Reserved for future “accept AI suggestion” control */
  onAccept?: () => void;
  children: AiSlotChild;
}

export function AIField({ label, required, hint, aiFilled, aiAccepted, onAccept: _onAccept, children }: AIFieldProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: tokens.text2 }}>
          {label} {required && <Box component="span" sx={{ color: '#b45309' }}>*</Box>}
        </Typography>
        {aiFilled && !aiAccepted && (
          <Box sx={{
            ml: 'auto !important',
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            fontSize: 9.5, fontFamily: 'Geist Mono', fontWeight: 700,
            px: 0.75, py: 0.25, borderRadius: 0.5,
            bgcolor: tokens.aiTint, color: tokens.ai,
            border: '1px solid rgba(139,92,246,0.20)', letterSpacing: 0.4,
          }}>✨ AI</Box>
        )}
      </Stack>
      {React.cloneElement(children, {
        sx: {
          ...(children.props.sx || {}),
          ...(aiFilled && !aiAccepted
            ? {
                '& .MuiOutlinedInput-root': {
                  bgcolor: tokens.aiTint,
                  '& fieldset': { borderColor: 'rgba(139,92,246,0.25)' },
                },
              }
            : {}),
        },
      })}
      {hint && (
        <Typography sx={{ fontSize: 11.5, color: tokens.text3, lineHeight: 1.4 }}>{hint}</Typography>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// AIBanner — top of each form tab
// ════════════════════════════════════════════════════════════════════

interface AIBannerProps {
  title: string;
  hint?: string;
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>;
}

export function AIBanner({ title, hint, actions }: AIBannerProps) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.75,
      p: '14px 16px',
      background: `linear-gradient(135deg, rgba(139,92,246,0.06), rgba(244,207,94,0.04))`,
      border: '1px solid rgba(139,92,246,0.20)',
      borderRadius: '12px', mb: 3,
    }}>
      <Box sx={{
        width: 36, height: 36, borderRadius: '10px',
        background: `linear-gradient(135deg, #a78bfa, ${tokens.ai})`,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, boxShadow: '0 4px 12px rgba(139,92,246,0.30)', flexShrink: 0,
      }}>✨</Box>
      <Box sx={{ flex: 1, fontSize: 13, lineHeight: 1.5, color: tokens.text2 }}>
        <Box component="strong" sx={{ color: tokens.text }}>{title}</Box>{' '}
        {hint && <Box component="span" sx={{ color: tokens.text3 }}>{hint}</Box>}
      </Box>
      {actions && (
        <Stack direction="row" spacing={1}>
          {actions.map((a, i) => (
            <Button
              key={i}
              sx={{
                px: 1.5, py: 0.875, borderRadius: '8px',
                fontSize: 12, fontWeight: 600, textTransform: 'none',
                bgcolor: a.primary ? tokens.ai : tokens.bg1,
                color: a.primary ? '#fff' : tokens.text,
                border: `1px solid ${a.primary ? tokens.ai : tokens.border}`,
                '&:hover': { bgcolor: a.primary ? '#7c3aed' : tokens.bg2 },
              }}
              onClick={a.onClick}
            >
              {a.label}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// SaveBar — sticky bottom action bar
// ════════════════════════════════════════════════════════════════════

interface SaveBarProps {
  savedAgo?: string;
  onCancel?: () => void;
  onSave?: () => void;
}

export function SaveBar({ savedAgo = '2s', onCancel, onSave }: SaveBarProps) {
  return (
    <Box sx={{
      position: 'sticky', bottom: 0,
      mx: { xs: -2, md: '-36px' }, mt: 3, mb: -10,
      px: { xs: 2, md: '36px' }, py: 1.75,
      bgcolor: 'rgba(251,250,246,0.94)', backdropFilter: 'blur(20px)',
      borderTop: `1px solid ${tokens.border}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2,
      zIndex: 10,
    }}>
      <Stack direction="row" spacing={1} sx={{
        fontSize: 12, color: tokens.text3, fontFamily: 'Geist Mono',
        alignItems: 'center',
      }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: tokens.success, boxShadow: `0 0 8px ${tokens.success}` }}/>
        Auto-saved · {savedAgo} ago
      </Stack>
      <Stack direction="row" spacing={1}>
        <Button
          sx={{
            px: 1.75, py: 1, borderRadius: '9px',
            fontSize: 13, fontWeight: 600, textTransform: 'none',
            bgcolor: tokens.bg1, color: tokens.text, border: `1px solid ${tokens.border}`,
            '&:hover': { bgcolor: tokens.bg2, borderColor: tokens.borderStrong },
          }}
          onClick={onCancel}
        >
          Annuler
        </Button>
        <Button
          sx={{
            px: 1.75, py: 1, borderRadius: '9px',
            fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em', textTransform: 'none',
            background: `linear-gradient(180deg, ${tokens.primarySoft} 0%, ${tokens.primary} 100%)`,
            color: tokens.text,
            boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 4px 12px rgba(230,176,34,0.30)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.4) inset, 0 8px 24px rgba(230,176,34,0.40)',
            },
          }}
          onClick={onSave}
        >
          Sauvegarder & continuer →
        </Button>
      </Stack>
    </Box>
  );
}

// ════════════════════════════════════════════════════════════════════
// FormPager — bottom prev/next
// ════════════════════════════════════════════════════════════════════

interface FormPagerProps {
  prevLabel?: string;
  nextLabel?: string;
  currentIndex: number;
  total: number;
  onPrev?: () => void;
  onNext?: () => void;
}

export function FormPager({ prevLabel, nextLabel, currentIndex, total, onPrev, onNext }: FormPagerProps) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      mt: 2.75, p: 1.75, borderRadius: '12px',
      bgcolor: tokens.bg1, border: `1px solid ${tokens.border}`,
    }}>
      <Button
        onClick={onPrev}
        sx={{
          px: 1.75, py: 1, borderRadius: '9px',
          fontSize: 13, fontWeight: 600, textTransform: 'none',
          bgcolor: 'transparent', color: tokens.text, border: 0,
          '&:hover': { bgcolor: tokens.bg2 },
        }}
      >
        ← {prevLabel || 'Précédent'}
      </Button>
      <Typography sx={{
        fontSize: 11, color: tokens.text3, fontFamily: 'Geist Mono', letterSpacing: 0.4,
      }}>
        {currentIndex} / {total}
      </Typography>
      <Button
        onClick={onNext}
        sx={{
          px: 1.75, py: 1, borderRadius: '9px',
          fontSize: 13, fontWeight: 600, textTransform: 'none',
          bgcolor: 'transparent', color: tokens.text, border: 0,
          '&:hover': { bgcolor: tokens.bg2 },
        }}
      >
        {nextLabel || 'Suivant'} →
      </Button>
    </Box>
  );
}
