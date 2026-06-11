// Composants réutilisables — Config orchestration listing
import React from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { SOJORI_TOKENS as T, CONFIG_ORCH_FONT } from './types';

/** Styles typo réutilisables */
export const TYPO = {
  intro: { fontSize: 13, color: T.text2, lineHeight: 1.5, letterSpacing: '-0.005em' },
  body: { fontSize: 13, fontWeight: 500, color: T.text, letterSpacing: '-0.005em' },
  bodyBold: { fontSize: 13, fontWeight: 700, color: T.text, letterSpacing: '-0.005em' },
  label: { fontSize: 11.5, fontWeight: 700, color: T.text2 },
  small: { fontSize: 12, fontWeight: 600, color: T.text2, letterSpacing: '-0.005em' },
  caption: { fontSize: 11.5, color: T.text3, fontWeight: 500 },
  caps: {
    fontSize: 9.5,
    fontWeight: 800,
    fontFamily: CONFIG_ORCH_FONT.mono,
    color: T.text3,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  mono: { fontFamily: CONFIG_ORCH_FONT.mono },
  monoHelp: {
    fontSize: 10.5,
    fontFamily: CONFIG_ORCH_FONT.mono,
    fontWeight: 600,
    color: T.text4,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
  },
  price: {
    fontSize: 13,
    fontWeight: 700,
    color: T.primary,
    fontFamily: CONFIG_ORCH_FONT.mono,
    letterSpacing: '-0.01em',
  },
};

export function pillBtnSx(active) {
  return {
    all: 'unset',
    cursor: 'pointer',
    px: 1.375,
    py: 0.75,
    borderRadius: 0.875,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    fontFamily: CONFIG_ORCH_FONT.sans,
    ...(active
      ? { bgcolor: T.primaryTint, color: T.primaryDeep, border: `1px solid ${T.primary}` }
      : { bgcolor: T.bg1, color: T.text3, border: `1px solid ${T.border}` }),
  };
}

export function chipActionSx(active, opts = {}) {
  const { compact = false } = opts;
  return {
    all: 'unset',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 0.5,
    px: compact ? 0.85 : 1.25,
    py: compact ? 0.45 : 0.75,
    borderRadius: 0.875,
    fontSize: compact ? 11.5 : 12.5,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    fontFamily: CONFIG_ORCH_FONT.sans,
    border: `1px solid ${active ? T.primary : T.border}`,
    bgcolor: active ? T.primaryTint : T.bg2,
    color: active ? T.primaryDeep : T.text2,
    '&:hover': {
      borderColor: T.primary,
      bgcolor: T.primaryTint,
      color: T.primaryDeep,
    },
  };
}

export function ConfigIntroBar({ children, saveState = 'idle' }) {
  const saveColors =
    saveState === 'saved'
      ? { bg: T.successTint, border: T.success, color: T.success }
      : saveState === 'saving'
        ? { bg: T.warningTint, border: T.warning, color: T.warning }
        : { bg: T.bg2, border: T.border, color: T.text3 };
  const saveLabel =
    saveState === 'saving'
      ? 'Enregistrement…'
      : saveState === 'saved'
        ? 'Modifications enregistrées'
        : null;
  return (
    <Stack sx={{ gap: 0.75, mb: 1.25 }}>
      {saveState === 'saved' ? (
        <Box
          sx={{
            px: 1.25,
            py: 0.6,
            borderRadius: 1,
            bgcolor: T.successTint,
            border: `1px solid ${T.success}`,
          }}
        >
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.success }}>
            ✓ Modifications enregistrées
          </Typography>
        </Box>
      ) : null}
      <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
        <Typography sx={{ ...TYPO.intro, flex: 1, minWidth: 200 }}>{children}</Typography>
        {saveLabel && saveState !== 'saved' ? (
          <Box
            sx={{
              textAlign: 'center',
              px: 1,
              py: 0.35,
              borderRadius: 0.75,
              bgcolor: saveColors.bg,
              border: `1px solid ${saveColors.border}`,
            }}
          >
            <Typography sx={{ fontSize: 10, fontWeight: 700, fontFamily: CONFIG_ORCH_FONT.mono, color: saveColors.color }}>
              {saveLabel}
            </Typography>
          </Box>
        ) : null}
      </Stack>
    </Stack>
  );
}

export function PillButton({ children, active, onClick, disabled, compact }) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        ...pillBtnSx(active),
        ...(compact ? { px: 1, py: 0.5, fontSize: 11.5 } : {}),
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </Box>
  );
}

export function SectionCaps({ children }) {
  return <Typography sx={{ ...TYPO.caps, mb: 0.75 }}>{children}</Typography>;
}

/** Champ lieu éditable — même famille visuelle que LockedPropertyBox. */
export function PlaceEndpointField({ label, value, onChange, placeholder }) {
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: T.bg1,
        borderRadius: 1,
        border: `1px solid ${T.border}`,
        transition: 'border-color 0.15s, box-shadow 0.15s',
        '&:focus-within': {
          borderColor: T.primary,
          boxShadow: `0 0 0 2px ${T.primaryTint}`,
        },
      }}
    >
      <Typography sx={{ ...TYPO.caps, color: T.text4, mb: 0.5 }}>{label}</Typography>
      <Box
        component="input"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        placeholder={placeholder}
        sx={{
          width: '100%',
          border: 'none',
          outline: 'none',
          bgcolor: 'transparent',
          fontSize: 13,
          fontWeight: 600,
          color: T.text,
          fontFamily: CONFIG_ORCH_FONT.sans,
          letterSpacing: '-0.005em',
          lineHeight: 1.45,
          p: 0,
          '&::placeholder': {
            color: T.text4,
            fontWeight: 500,
            opacity: 1,
          },
        }}
      />
    </Box>
  );
}

export function LockedPropertyBox({ name, address, label }) {
  const addr = (address && String(address).trim()) || 'Adresse non renseignée';
  const caps = label ? `${label} · logement` : 'Logement · non modifiable';
  return (
    <Box
      sx={{
        p: 1,
        bgcolor: T.bg3,
        borderRadius: 1,
        border: `1px dashed ${T.borderStrong}`,
        opacity: 0.92,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <Typography sx={{ ...TYPO.caps, color: T.text4, mb: 0.5 }}>{caps}</Typography>
      <Typography sx={{ ...TYPO.bodyBold, fontSize: 12.5, color: T.text2 }}>{name}</Typography>
      <Typography sx={{ ...TYPO.caps, color: T.text4, mt: 0.75, mb: 0.25 }}>Adresse listing</Typography>
      <Typography sx={{ ...TYPO.caption, lineHeight: 1.45 }}>{addr}</Typography>
    </Box>
  );
}

export function Toggle({ on, sm, onChange, disabled = false }) {
  const w = sm ? 28 : 36;
  const h = sm ? 16 : 20;
  const knob = sm ? 12 : 16;
  return (
    <Box
      onClick={disabled ? undefined : onChange}
      sx={{
        width: w,
        height: h,
        borderRadius: '99px',
        position: 'relative',
        flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        background: on ? `linear-gradient(135deg, #cb9b2c, ${T.primary})` : T.borderStrong,
        transition: 'background 0.2s',
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 2,
          left: 2,
          width: knob,
          height: knob,
          bgcolor: '#fff',
          borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.20)',
          transition: 'transform 0.2s',
          ...(on ? { transform: `translateX(${w - knob - 4}px)` } : {}),
        },
      }}
    />
  );
}

export function Card({ icon, title, subtitle, meta, children, toggle, onToggleChange, compact = false }) {
  return (
    <Box
      sx={{
        bgcolor: T.bg1,
        border: `1px solid ${T.border}`,
        borderRadius: compact ? 1.25 : 1.625,
        mb: compact ? 1.25 : 1.75,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(20,17,10,0.04)',
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: compact ? 0.75 : 1.25,
          p: compact ? '8px 12px' : '14px 16px',
          bgcolor: T.bg2,
          borderBottom: children ? `1px solid ${T.border}` : 0,
        }}
      >
        <Box
          sx={{
            width: compact ? 28 : 34,
            height: compact ? 28 : 34,
            borderRadius: 1,
            bgcolor: T.primaryTint,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: compact ? 14 : 16,
          }}
        >
          {icon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 700, letterSpacing: '-0.005em' }}>{title}</Typography>
          {subtitle && !compact && (
            <Typography sx={{ fontSize: 11.5, color: T.text3, mt: 0.25, fontWeight: 500 }}>{subtitle}</Typography>
          )}
        </Box>
        {meta && (
          <Box
            sx={{
              fontFamily: CONFIG_ORCH_FONT.mono,
              fontSize: 10,
              color: T.text3,
              bgcolor: T.bg1,
              border: `1px solid ${T.border}`,
              px: 0.875,
              py: 0.25,
              borderRadius: 0.625,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            {meta}
          </Box>
        )}
        {toggle !== undefined && onToggleChange && <Toggle on={toggle} onChange={onToggleChange} />}
      </Stack>
      {children && <Box sx={{ p: compact ? 1.25 : 2 }}>{children}</Box>}
    </Box>
  );
}

export function FormRow({ label, required, help, children, optional, compact = false }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: compact ? { xs: '1fr', md: '120px 1fr' } : { xs: '1fr', md: '160px 1fr' },
        gap: compact ? 1 : 1.25,
        alignItems: 'flex-start',
        py: compact ? 0.75 : 1.25,
        borderBottom: `1px solid ${T.border}`,
        '&:last-child': { borderBottom: 0 },
      }}
    >
      <Box sx={{ pt: 0.875 }}>
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>
          {label}
          {required && (
            <Box component="span" sx={{ color: T.error, ml: 0.25 }}>
              *
            </Box>
          )}
          {optional && (
            <Box component="span" sx={{ color: T.text4, ml: 0.5, fontWeight: 500, fontSize: 10.5 }}>
              (facultatif)
            </Box>
          )}
        </Typography>
        {help && (
          <Typography sx={{ fontSize: 10.5, color: T.text4, fontWeight: 500, mt: 0.375, lineHeight: 1.4 }}>
            {help}
          </Typography>
        )}
      </Box>
      <Box sx={{ p: 0.5, borderRadius: 1, border: `1px solid ${T.border}` }}>{children}</Box>
    </Box>
  );
}

export function TextInput({ style, inputProps, onKeyDown, ...props }) {
  return (
    <input
      {...inputProps}
      {...props}
      onKeyDown={e => {
        e.stopPropagation();
        onKeyDown?.(e);
      }}
      style={{
        width: '100%',
        padding: '9px 11px',
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        background: T.bg1,
        fontSize: 13,
        color: T.text,
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        ...style,
      }}
    />
  );
}

export function TextArea({ style, inputProps, onKeyDown, ...props }) {
  return (
    <textarea
      {...inputProps}
      {...props}
      onKeyDown={e => {
        e.stopPropagation();
        onKeyDown?.(e);
      }}
      style={{
        width: '100%',
        padding: '9px 11px',
        border: `1px solid ${T.border}`,
        borderRadius: 8,
        background: T.bg1,
        fontSize: 13,
        color: T.text,
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        resize: 'vertical',
        minHeight: 80,
        ...style,
      }}
    />
  );
}

export function NumInput({ suffix, style, inputProps, ...rest }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        {...inputProps}
        {...rest}
        type="number"
        style={{
          width: '100%',
          padding: suffix ? '9px 56px 9px 11px' : '9px 11px',
          border: `1px solid ${T.border}`,
          borderRadius: 8,
          background: T.bg1,
          fontSize: 13,
          color: T.text,
          fontFamily: '"Geist Mono", monospace',
          boxSizing: 'border-box',
          ...style,
        }}
      />
      {suffix && (
        <Box
          sx={{
            position: 'absolute',
            right: 11,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 11,
            color: T.text3,
            fontFamily: '"Geist Mono", monospace',
            fontWeight: 700,
            pointerEvents: 'none',
          }}
        >
          {suffix}
        </Box>
      )}
    </Box>
  );
}

export function AddRowBtn({ onClick, children, disabled }) {
  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        all: 'unset',
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        mt: 1.25,
        p: '11px',
        bgcolor: T.bg1,
        border: `1.5px dashed ${T.borderStrong}`,
        borderRadius: 1.125,
        fontSize: 12.5,
        fontWeight: 700,
        color: T.text3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.875,
        opacity: disabled ? 0.4 : 1,
        '&:hover': !disabled
          ? { borderColor: T.primary, bgcolor: T.primaryTint, color: T.primaryDeep }
          : {},
      }}
    >
      {children}
    </Box>
  );
}

export function DayPills({ value, onChange }) {
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {days.map((d, i) => {
        const on = value.includes(i);
        return (
          <Box
            key={i}
            component="button"
            onClick={() => onChange(on ? value.filter(x => x !== i) : [...value, i])}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              px: 1.375,
              py: 0.75,
              borderRadius: 0.875,
              fontSize: 11.5,
              fontWeight: 700,
              fontFamily: CONFIG_ORCH_FONT.mono,
              ...(on
                ? { bgcolor: T.primaryTint, border: `1px solid ${T.primary}`, color: T.primaryDeep }
                : { bgcolor: T.bg1, border: `1px solid ${T.border}`, color: T.text3 }),
            }}
          >
            {d}
          </Box>
        );
      })}
    </Stack>
  );
}

export function SlotPills({ value, options, onChange }) {
  return (
    <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
      {options.map(slot => {
        const on = value.includes(slot);
        return (
          <Box
            key={slot}
            component="button"
            onClick={() => onChange(on ? value.filter(x => x !== slot) : [...value, slot])}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              px: 1.375,
              py: 0.75,
              borderRadius: 0.875,
              fontSize: 11.5,
              fontWeight: on ? 700 : 600,
              fontFamily: CONFIG_ORCH_FONT.mono,
              ...(on
                ? { bgcolor: T.primaryTint, border: `1px solid ${T.primary}`, color: T.primaryDeep }
                : { bgcolor: T.bg1, border: `1px solid ${T.border}`, color: T.text3 }),
            }}
          >
            {slot}
          </Box>
        );
      })}
    </Stack>
  );
}

export function SectionHeader({
  icon,
  title,
  badge,
  badgeKind,
  subtitle,
  toggle,
  onToggleChange,
  toggleLabel = 'Activer',
}) {
  const badgeStyles = {
    'wa-yes': { bg: 'rgba(10,143,94,0.10)', fg: T.success },
    'wa-no': { bg: T.bg3, fg: T.text3 },
    'wa-partial': { bg: 'rgba(6,115,179,0.10)', fg: '#0673b3' },
  };
  const bs = badge && badgeKind ? badgeStyles[badgeKind] : null;

  return (
    <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1.75, mb: 3 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 1.625,
          background: `linear-gradient(135deg, ${T.primarySoft}, ${T.primaryDeep})`,
          color: '#1a1408',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          flexShrink: 0,
          boxShadow: '0 6px 16px rgba(184,133,26,0.25)',
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
          <Typography sx={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.025em' }}>{title}</Typography>
          {badge && bs && (
            <Box
              sx={{
                fontSize: 9.5,
                fontFamily: CONFIG_ORCH_FONT.mono,
                fontWeight: 800,
                bgcolor: bs.bg,
                color: bs.fg,
                px: 0.875,
                py: 0.25,
                borderRadius: 0.625,
                letterSpacing: '0.06em',
              }}
            >
              {badge}
            </Box>
          )}
        </Stack>
        {subtitle && (
          <Typography sx={{ fontSize: 13, color: T.text3, mt: 0.625, lineHeight: 1.55 }}>{subtitle}</Typography>
        )}
      </Box>
      {toggle !== undefined && onToggleChange && (
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            gap: 1.125,
            p: '6px 11px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 1.125,
          }}
        >
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: T.text2 }}>{toggleLabel}</Typography>
          <Toggle on={toggle} onChange={onToggleChange} />
        </Stack>
      )}
    </Stack>
  );
}

export function WhenOffNote({ children }) {
  return (
    <Box
      sx={{
        mt: 2,
        p: '11px 13px',
        bgcolor: T.bg2,
        border: `1px solid ${T.border}`,
        borderRadius: 1.125,
        fontSize: 11.5,
        color: T.text3,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        lineHeight: 1.5,
      }}
    >
      <Box sx={{ fontSize: 14 }}>💡</Box>
      <Box>{children}</Box>
    </Box>
  );
}
