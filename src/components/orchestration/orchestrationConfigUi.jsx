/**
 * Design Atelier — onglet Configuration orchestration (Modèles / Messages).
 * Tokens alignés DashboardV2 ; remplace l’ancien orange legacy #FF6B35.
 */
import React from 'react';
import { Box, Typography, FormControl } from '@mui/material';
import {
  tokens as T,
  btnPrimarySx,
  btnGhostSx,
} from '../dashboard/DashboardV2.components';

export { T, btnPrimarySx, btnGhostSx };

/** Compat legacy ConfigTaskTemplateView / ConfigMessagesView */
export const SOJORI_COLORS = {
  primary: T.primary,
  primaryDark: T.primaryDeep,
  primaryPale: T.primaryTint,
  gray: {
    300: T.bg3,
    500: T.text4,
    700: T.text2,
  },
};

/** Compat DS (violet legacy → ambre Atelier) */
export const DS = {
  neutral: {
    50: T.bg0,
    100: T.bg2,
    200: T.bg3,
    300: T.border,
    400: T.text4,
    500: T.text3,
    600: T.text2,
    700: T.text2,
    900: T.text,
  },
  primary: {
    50: T.primaryTint,
    100: T.primaryTint,
    500: T.primary,
    600: T.primaryDeep,
    700: T.primaryDeep,
  },
  success: { 50: T.successTint, 500: T.success, 600: T.success },
  error: { 50: T.errorTint, 500: T.error },
  warning: { 50: T.warningTint, 500: T.warning },
  info: { 50: T.infoTint, 500: T.info, 600: T.info },
  shadow: {
    xs: '0 1px 2px rgba(20,17,10,0.05)',
    sm: '0 1px 3px rgba(20,17,10,0.08)',
    md: '0 4px 12px rgba(20,17,10,0.08)',
  },
};

export const orchPanelSx = {
  bgcolor: T.bg1,
  border: `1px solid ${T.border}`,
  borderRadius: '14px',
  boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
  overflow: 'hidden',
};

export const orchTableContainerSx = {
  border: `1px solid ${T.border}`,
  borderRadius: '12px',
  mb: 2,
  boxShadow: 'none',
  '& .MuiTableHead-root .MuiTableCell-root': {
    fontWeight: 700,
    fontSize: 12,
    color: '#1a1408',
    bgcolor: T.primary,
    borderBottom: 'none',
    py: 1.25,
  },
  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    bgcolor: T.primaryTint,
  },
  '& .MuiTableCell-root': {
    borderColor: T.border,
    fontSize: 13,
  },
};

export const orchSelectSx = {
  minWidth: 260,
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: T.bg1,
    fontSize: 13,
    '&.Mui-focused fieldset': {
      borderColor: T.primary,
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: T.primaryDeep,
  },
};

export function OrchConfigPageShell({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 1.5, md: 2.5 },
        pt: 1.5,
        pb: 2,
        fontFamily: 'Geist, system-ui, sans-serif',
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: T.text, letterSpacing: '-0.02em' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.75, lineHeight: 1.45 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Box>
  );
}

export function OrchTabBar({ tabs, activeId, onChange }) {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 0.5,
        flexWrap: 'wrap',
        borderBottom: `2px solid ${T.border}`,
        mb: 2,
      }}
    >
      {tabs.map(({ id, label, icon }) => {
        const active = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{
              padding: '11px 18px',
              fontSize: 13,
              fontWeight: 700,
              fontFamily: 'inherit',
              color: active ? T.primary : T.text3,
              background: 'transparent',
              border: 0,
              borderBottom: `3px solid ${active ? T.primary : 'transparent'}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: -2,
              transition: 'color 0.15s ease',
            }}
          >
            {icon && <span aria-hidden>{icon}</span>}
            {label}
          </button>
        );
      })}
    </Box>
  );
}

/** Onglets secondaires (Admin / Owner) — pills */
export function OrchSubTabBar({ tabs, activeId, onChange, children }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 1,
        py: 1.25,
        mb: 1.5,
        px: 1,
        bgcolor: T.bg2,
        borderRadius: '12px',
        border: `1px solid ${T.border}`,
      }}
    >
      {tabs.map(({ id, label, icon }) => {
        const active = activeId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            style={{
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'inherit',
              borderRadius: 8,
              border: active ? `1px solid ${T.borderStrong}` : '1px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: active ? T.bg1 : 'transparent',
              color: active ? T.primaryDeep : T.text3,
              boxShadow: active ? '0 1px 2px rgba(20,17,10,0.06)' : 'none',
            }}
          >
            {icon && <span aria-hidden>{icon}</span>}
            {label}
          </button>
        );
      })}
      {children}
    </Box>
  );
}

export function OrchConfigPanel({ children, sx }) {
  return (
    <Box sx={{ ...orchPanelSx, flex: 1, minHeight: 200, display: 'flex', flexDirection: 'column', ...sx }}>
      {children}
    </Box>
  );
}

export function OrchHint({ children }) {
  return (
    <Typography
      sx={{
        fontSize: 12,
        color: T.text3,
        mb: 1.5,
        px: 0.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </Typography>
  );
}

/** Barre stats Messages (5 cartes) */
export function OrchStatCard({ emoji, value, label, accent }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 120,
        bgcolor: T.bg1,
        p: 1.5,
        borderRadius: '12px',
        border: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: accent.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.2rem',
        }}
      >
        {emoji}
      </Box>
      <Box>
        <Typography sx={{ fontSize: 18, fontWeight: 800, color: accent.text, lineHeight: 1.1 }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: 11, color: T.text3, fontWeight: 600, textTransform: 'uppercase' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export const orchStatsRowSx = {
  display: 'flex',
  gap: 1.5,
  flexWrap: 'wrap',
  px: 2,
  py: 1.5,
  bgcolor: T.bg2,
  borderBottom: `1px solid ${T.border}`,
};

export const orchFilterBarSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  px: 2,
  py: 1.5,
  bgcolor: T.bg1,
  borderBottom: `1px solid ${T.border}`,
  flexWrap: 'wrap',
};

/** Chip filtre (statut / canal) */
export function orchChipSx(active) {
  return {
    fontWeight: 600,
    fontSize: 12,
    borderRadius: '8px',
    border: `1px solid ${active ? T.primaryDeep : T.border}`,
    bgcolor: active ? T.primary : T.bg1,
    color: active ? '#1a1408' : T.text2,
    '&:hover': {
      bgcolor: active ? T.primaryDeep : T.primaryTint,
      color: active ? '#fff' : T.text,
    },
  };
}

export function orchMoveIconSx(disabled) {
  return {
    p: 0.25,
    color: disabled ? T.text4 : T.primaryDeep,
    '&:hover': { bgcolor: T.primaryTint },
  };
}

/** Boutons icône ligne tableau Messages */
export const orchActionIconSx = {
  view: {
    bgcolor: T.infoTint,
    color: T.info,
    width: 32,
    height: 32,
    '&:hover': { bgcolor: T.info, color: '#fff' },
  },
  edit: {
    bgcolor: T.primaryTint,
    color: T.primaryDeep,
    width: 32,
    height: 32,
    '&:hover': { bgcolor: T.primary, color: '#1a1408' },
  },
  delete: {
    bgcolor: T.errorTint,
    color: T.error,
    width: 32,
    height: 32,
    '&:hover': { bgcolor: T.error, color: '#fff' },
  },
};

export const orchPaginationSx = {
  '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
    fontSize: 12,
    color: T.text2,
  },
  '.MuiTablePagination-select': {
    borderRadius: '8px',
  },
  '.MuiIconButton-root': {
    color: T.primaryDeep,
    '&.Mui-disabled': { color: T.text4 },
  },
};

export function orchFilterChipSx(active) {
  return {
    textTransform: 'none',
    fontWeight: 700,
    fontSize: 12,
    borderRadius: '8px',
    px: 1.25,
    py: 0.35,
    minHeight: 32,
    ...(active
      ? {
          bgcolor: T.primary,
          color: '#1a1408',
          border: `1px solid ${T.primaryDeep}`,
          '&:hover': { bgcolor: T.primaryDeep, color: '#fff' },
        }
      : {
          bgcolor: T.bg1,
          color: T.text2,
          border: `1px solid ${T.border}`,
          '&:hover': { bgcolor: T.bg2, borderColor: T.borderStrong },
        }),
  };
}
