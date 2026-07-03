/** Design tokens dashboard — fichier sans dépendances pour éviter les cycles d'import. */
export const tokens = {
  primary: '#E6B022',
  primaryDeep: '#B8881A',
  primarySoft: '#F4CF5E',
  primaryTint: 'rgba(230,176,34,0.10)',
  primaryOnGold: '#1A1408',

  ai: '#8B5CF6',
  aiTint: 'rgba(139,92,246,0.10)',

  success: '#0a8f5e',
  successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506',
  warningTint: 'rgba(196,101,6,0.10)',
  error: '#c81e1e',
  errorTint: 'rgba(200,30,30,0.10)',
  info: '#0673b3',
  infoTint: 'rgba(6,115,179,0.10)',

  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#f0eee8',
  bg3: '#e7e4dc',

  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',

  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',

  sidebarW: 248,
  topbarH: 56,
} as const;

export const pageMetaChipSx = {
  fontFamily: 'Geist Mono, monospace',
  fontSize: 12,
  color: tokens.text3,
  fontWeight: 600,
  bgcolor: tokens.bg2,
  px: 1.25,
  py: 0.375,
  borderRadius: '999px',
  border: `1px solid ${tokens.border}`,
  letterSpacing: 0.02,
  lineHeight: 1.45,
  whiteSpace: 'normal' as const,
  wordBreak: 'break-word' as const,
  maxWidth: '100%',
};
