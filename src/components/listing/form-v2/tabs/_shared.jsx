// ════════════════════════════════════════════════════════════════════
// Sojori · Listing Form V2 — Atelier 2026
// shared.jsx — tokens + primitives partagées par tous les onglets
// (Field / Card / ToggleRow / Counter / ChipsRow / Section / AiBanner /
//  GlobalBanner / LangSwitcher / NumberInput / CurrencyInput)
// ════════════════════════════════════════════════════════════════════
import React from 'react';
import { Box, Stack, Typography, TextField, Switch, IconButton, Chip, Button, Select, MenuItem, FormControl } from '@mui/material';
import { FieldIndicator } from '../components/FieldIndicator';
import { useListingFormStructure } from '../ListingFormStructureContext';
import { localizeField } from '../utils/localizeField';
import { useAuth } from '../../../../hooks/useAuth';
import { hasAdminAccess } from '../../../../utils/rbac.utils';

export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a', primaryTint: 'rgba(184,133,26,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.08)', aiBorder: 'rgba(124,58,237,0.20)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error: '#c81e1e', errorTint: 'rgba(200,30,30,0.10)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
};

export const sxInput = {
  '& .MuiOutlinedInput-root': {
    fontSize: 13, bgcolor: T.bg1,
    '& fieldset': { borderColor: T.border },
    '&:hover fieldset': { borderColor: T.borderStrong },
    '&.Mui-focused fieldset': { borderColor: T.primary, borderWidth: 1.5, boxShadow: '0 0 0 3px rgba(184,133,26,0.16)' },
  },
};
export const sxInputAI = {
  '& .MuiOutlinedInput-root': { fontSize: 13, bgcolor: T.aiTint,
    '& fieldset': { borderColor: T.aiBorder } },
};

export function RuFormLegend() {
  const listingStructure = useListingFormStructure();
  const { user } = useAuth();
  const isAdmin = Boolean(user && hasAdminAccess(user.role));
  if (!listingStructure && !isAdmin) return null;
  if (!isAdmin) {
    return (
      <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5, lineHeight: 1.45 }}>
        <Box component="span" sx={{ color: '#4a90e2', fontWeight: 700 }}>R</Box>
        {' '}= publié vers les plateformes de réservation (OTA) ·{' '}
        <Box component="span" sx={{ color: '#b91c1c', fontWeight: 700 }}>*</Box>
        {' '}= obligatoire pour une annonce valide
      </Typography>
    );
  }
  return (
    <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5, lineHeight: 1.45 }}>
      <Box component="span" sx={{ color: '#0a8f5e', fontWeight: 700 }}>I</Box>
      {' '}= importé depuis RU ·{' '}
      <Box component="span" sx={{ color: '#4a90e2', fontWeight: 700 }}>R</Box>
      {' '}= mappé export RU ·{' '}
      <Box component="span" sx={{ color: '#b91c1c', fontWeight: 700 }}>*</Box>
      {' '}= obligatoire
    </Typography>
  );
}

export function Label({
  children,
  required,
  ai,
  charCount,
  ruField,
  listingStructure: listingStructureProp,
  inferRuWhenMissing = false,
}) {
  const listingStructure = listingStructureProp ?? useListingFormStructure();
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        gap: 0.75,
        flexWrap: 'wrap',
        fontSize: 10.5,
        color: T.text3,
        fontFamily: '"Geist Mono", monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        fontWeight: 700,
        mb: 0.5,
      }}
    >
      <Box sx={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
        {children}
        {required && <Box component="span" sx={{ color: T.error, ml: 0.25 }}>*</Box>}
        {ruField ? (
          <FieldIndicator
            field={ruField}
            listingStructure={listingStructure}
            inferRuWhenMissing={inferRuWhenMissing}
            dense
          />
        ) : null}
      </Box>
      {ai && (
        <Box
          sx={{
            bgcolor: T.aiTint,
            color: T.ai,
            px: 0.625,
            py: '1px',
            borderRadius: '3px',
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          ✨ AI
        </Box>
      )}
      {charCount && (
        <Box sx={{ ml: 'auto', fontSize: 9.5, color: T.text3, textTransform: 'none' }}>{charCount}</Box>
      )}
    </Stack>
  );
}

export function Field({
  label,
  required,
  ai,
  charCount,
  hint,
  children,
  fullWidth,
  ruField,
  listingStructure,
  inferRuWhenMissing = false,
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.625, flex: fullWidth ? 1 : 'initial' }}>
      <Label
        required={required}
        ai={ai}
        charCount={charCount}
        ruField={ruField}
        listingStructure={listingStructure}
        inferRuWhenMissing={inferRuWhenMissing}
      >
        {label}
      </Label>
      {children}
      {hint && <Typography sx={{ fontSize: 10.5, color: T.text4, mt: 0.25 }}>{hint}</Typography>}
    </Box>
  );
}

export function Card({ title, meta, children, accent }) {
  const titleText = typeof title === 'string' || typeof title === 'number'
    ? title
    : localizeField(title, '');
  return (
    <Box sx={{
      bgcolor: T.bg1, border: `1px solid ${T.border}`, borderRadius: 1.5, p: 2, mb: 1.75,
      ...(accent === 'primary' ? { background: `linear-gradient(180deg, ${T.primaryTint}, ${T.bg1} 70%)`, borderColor: T.primary } : {}),
    }}>
      <Stack direction="row" sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>{titleText}</Typography>
        {meta && <Typography sx={{ ml: 'auto', fontSize: 10.5, color: T.text3, fontFamily: '"Geist Mono", monospace' }}>{meta}</Typography>}
      </Stack>
      {children}
    </Box>
  );
}

export function SectionH({ children }) {
  return (
    <Typography sx={{
      fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
      color: T.text3, letterSpacing: '0.08em', textTransform: 'uppercase', mt: 1.75, mb: 0.75,
    }}>{children}</Typography>
  );
}

export function ToggleRow({
  title,
  desc,
  badges = [],
  checked,
  onChange,
  disabled,
  ruField,
  listingStructure,
}) {
  const ls = listingStructure ?? useListingFormStructure();
  const titleText = typeof title === 'string' || typeof title === 'number' ? title : localizeField(title, '');
  const descText = desc == null ? '' : typeof desc === 'string' ? desc : localizeField(desc, '');
  return (
    <Stack direction="row" sx={{
      alignItems: 'center',
      gap: 1.75,
      p: '10px 12px', border: `1px solid ${T.border}`, borderRadius: 1, bgcolor: T.bg1, mb: 0.75,
      opacity: disabled ? 0.5 : 1,
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
          {titleText}
          {ruField ? <FieldIndicator field={ruField} listingStructure={ls} dense /> : null}
        </Typography>
        {descText ? <Typography sx={{ fontSize: 11, color: T.text3, mt: 0.25 }}>{descText}</Typography> : null}
        {badges.length > 0 && (
          <Stack direction="row" gap={0.625} sx={{ mt: 0.625, flexWrap: 'wrap' }} useFlexGap>
            {badges.map((b, i) => (
              <Box key={i} sx={{
                fontSize: 9.5, fontFamily: '"Geist Mono", monospace', fontWeight: 700,
                px: 0.75, py: '1px', borderRadius: 0.5, letterSpacing: '0.04em',
                bgcolor: b.tone === 'info' ? T.infoTint : b.tone === 'ai' ? T.aiTint : b.tone === 'success' ? T.successTint : T.bg2,
                color: b.tone === 'info' ? T.info : b.tone === 'ai' ? T.ai : b.tone === 'success' ? T.success : T.text2,
              }}>{b.label}</Box>
            ))}
          </Stack>
        )}
      </Box>
      <Switch checked={checked} disabled={disabled} onChange={(_, v) => onChange?.(v)}
        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary }, '& .MuiSwitch-track.Mui-checked, & .Mui-checked + .MuiSwitch-track': { bgcolor: T.primary } }} />
    </Stack>
  );
}

export function Counter({ value, onChange, min = 0, max = 99, emphasized = false }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        border: emphasized ? `1.5px solid ${T.borderStrong || T.border}` : `1px solid ${T.border}`,
        borderRadius: emphasized ? '8px' : 1,
        bgcolor: emphasized ? '#fff' : T.bg1,
        width: 'fit-content',
        minWidth: emphasized ? 118 : undefined,
        boxShadow: emphasized ? '0 1px 2px rgba(0,0,0,0.06)' : undefined,
        overflow: 'visible',
        flexShrink: 0,
      }}
    >
      <IconButton
        size="small"
        aria-label="Diminuer"
        onClick={() => onChange?.(Math.max(min, value - 1))}
        disabled={value <= min}
        sx={{
          width: emphasized ? 34 : 32,
          height: emphasized ? 34 : 32,
          color: T.text,
          fontWeight: 800,
          fontSize: emphasized ? 18 : 16,
          borderRadius: emphasized ? '7px 0 0 7px' : undefined,
          '&:hover': { bgcolor: T.bg2 },
          '&.Mui-disabled': { color: T.text3, opacity: 0.45 },
        }}
      >
        −
      </IconButton>
      <Box
        sx={{
          px: emphasized ? 1.25 : 1.75,
          fontFamily: '"Geist Mono", monospace',
          fontWeight: 800,
          fontSize: emphasized ? 14 : 13,
          minWidth: emphasized ? 36 : 50,
          textAlign: 'center',
          color: T.text,
          lineHeight: 1,
        }}
      >
        {value}
      </Box>
      <IconButton
        size="small"
        aria-label="Augmenter"
        onClick={() => onChange?.(Math.min(max, value + 1))}
        disabled={value >= max}
        sx={{
          width: emphasized ? 34 : 32,
          height: emphasized ? 34 : 32,
          color: emphasized ? T.primaryDeep || T.text : T.text,
          bgcolor: emphasized ? T.primaryTint : 'transparent',
          fontWeight: 800,
          fontSize: emphasized ? 18 : 16,
          borderRadius: emphasized ? '0 7px 7px 0' : undefined,
          '&:hover': { bgcolor: emphasized ? T.primary : T.bg2, color: emphasized ? '#fff' : T.text },
          '&.Mui-disabled': { color: T.text3, opacity: 0.45, bgcolor: 'transparent' },
        }}
      >
        +
      </IconButton>
    </Stack>
  );
}

export function ChipsRow({ items, value = [], onToggle, single = false, suggested }) {
  return (
    <Stack direction="row" useFlexGap sx={{ gap: 0.75, flexWrap: 'wrap' }}>
      {items.map(item => {
        const active = single ? value === item.id : value.includes(item.id);
        const isSuggested = single && suggested === item.id && !active;
        return (
          <Chip key={item.id} label={item.label} clickable size="small" onClick={() => onToggle?.(item.id)}
            sx={{
              bgcolor: active ? T.primaryTint : isSuggested ? T.warningTint : T.bg1,
              color: active ? T.primaryDeep : isSuggested ? T.warning : T.text2,
              border: '1px solid',
              borderColor: active ? T.primary : isSuggested ? T.warning : T.border,
              borderStyle: isSuggested ? 'dashed' : 'solid',
              fontWeight: active ? 600 : 500, fontSize: 11.5,
              '&:hover': { borderColor: T.borderStrong },
            }} />
        );
      })}
    </Stack>
  );
}

export function LangSwitcher({ value, onChange, languages = ['🇫🇷 FR', '🇬🇧 EN', '🇸🇦 AR'] }) {
  return (
    <Stack direction="row" sx={{ gap: 0.625, mb: 1.25 }}>
      {languages.map(l => (
        <Box key={l} component="button" onClick={() => onChange?.(l)} sx={{
          all: 'unset', cursor: 'pointer', px: 1.25, py: 0.625, borderRadius: 0.75,
          border: `1px solid ${T.border}`, bgcolor: value === l ? T.primary : T.bg1,
          color: value === l ? T.text : T.text2, fontSize: 11, fontWeight: 600,
          '&:hover': { borderColor: T.borderStrong },
        }}>{l}</Box>
      ))}
    </Stack>
  );
}

export function AiBanner({ title, body, ctaLabel = 'Appliquer', onCta }) {
  return (
    <Stack direction="row" sx={{
      alignItems: 'center',
      gap: 1.5,
      background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(184,133,26,0.04))',
      border: `1px solid ${T.aiBorder}`, borderRadius: 1.5, p: '12px 14px', mb: 1.75,
    }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: 1, fontSize: 14, color: '#fff',
        background: `linear-gradient(135deg, #9669f7, ${T.ai})`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 10px rgba(124,58,237,0.3)', flexShrink: 0,
      }}>✨</Box>
      <Typography sx={{ flex: 1, fontSize: 12.5, color: T.text2 }}>
        <strong style={{ color: T.text }}>{title}</strong> · <span style={{ color: T.text3 }}>{body}</span>
      </Typography>
      {onCta && (
        <Button size="small" onClick={onCta} sx={{ textTransform: 'none', fontSize: 11.5, bgcolor: T.ai, color: '#fff', '&:hover': { bgcolor: '#6d29d1' } }}>
          {ctaLabel}
        </Button>
      )}
    </Stack>
  );
}

export function GlobalBanner({ children }) {
  return (
    <Stack direction="row" sx={{
      alignItems: 'flex-start',
      gap: 1.5,
      background: 'linear-gradient(135deg, rgba(6,115,179,0.06), rgba(184,133,26,0.04))',
      border: `1px solid rgba(6,115,179,0.20)`, borderRadius: 1.25, p: '12px 14px', mb: 1.75,
    }}>
      <Box sx={{ fontSize: 18, flexShrink: 0 }}>ℹ️</Box>
      <Typography sx={{ fontSize: 11.5, color: T.text2 }}>{children}</Typography>
    </Stack>
  );
}

export function NumberInput({ value, onChange, suffix, prefix, inputProps, slotProps, ...rest }) {
  return (
    <TextField
      size="small"
      type="number"
      value={value ?? ''}
      onChange={e => onChange?.(+e.target.value)}
      slotProps={{
        ...slotProps,
        htmlInput: { ...inputProps, ...slotProps?.htmlInput },
        input: {
          startAdornment: prefix && <Box sx={{ color: T.text3, mr: 0.5, fontSize: 12 }}>{prefix}</Box>,
          endAdornment: suffix && <Box sx={{ color: T.text3, ml: 0.5, fontSize: 12 }}>{suffix}</Box>,
          ...slotProps?.input,
        },
      }}
      sx={sxInput}
      {...rest}
    />
  );
}

export function MoneyInput({ value, onChange, currency = '€', ...rest }) {
  return <NumberInput value={value} onChange={onChange} suffix={currency} {...rest} />;
}

export function SelectField({ value, onChange, options, ...rest }) {
  return (
    <FormControl size="small" {...rest}>
      <Select value={value || ''} onChange={e => onChange?.(e.target.value)}>
        {options.map(o => typeof o === 'string'
          ? <MenuItem key={o} value={o}>{o}</MenuItem>
          : <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
      </Select>
    </FormControl>
  );
}
