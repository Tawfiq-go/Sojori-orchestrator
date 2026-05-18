import { T, sxInput } from '../../tabs/_shared';

export { T, sxInput };

export const menuBtnPrimary = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  bgcolor: T.primary,
  color: '#fff',
  boxShadow: 'none',
  '&:hover': { bgcolor: T.primaryDeep, boxShadow: '0 2px 8px rgba(184,133,26,0.25)' },
};

export const menuBtnOutlined = {
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '0.8rem',
  color: T.text2,
  borderColor: T.borderStrong,
  bgcolor: T.bg1,
  '&:hover': { borderColor: T.primary, color: T.primaryDeep, bgcolor: T.primaryTint },
};

export const menuCardSx = (opts = {}) => ({
  borderRadius: 1.25,
  border: `1px solid ${opts.borderColor || T.border}`,
  bgcolor: opts.bgcolor || T.bg1,
  boxShadow: 'none',
  overflow: 'hidden',
});

export const codeChipSx = (enabled, variant) => {
  if (variant === 'declaration') {
    return {
      fontWeight: 700,
      fontSize: '0.68rem',
      height: 22,
      minWidth: 32,
      bgcolor: enabled ? T.infoTint : T.bg3,
      color: enabled ? T.info : T.text3,
      border: `1px solid ${enabled ? 'rgba(6,115,179,0.25)' : T.border}`,
    };
  }
  return {
    fontWeight: 700,
    fontSize: '0.68rem',
    height: 22,
    minWidth: 32,
    bgcolor: enabled ? T.primary : T.bg3,
    color: enabled ? '#fff' : T.text3,
  };
};

/** Indentation visuelle sous D, J */
export const isSubOption = (code) => /^D[1-4]$/.test(code) || /^J[1-3]$/.test(code);
