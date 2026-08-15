/**
 * Tokens de l'écran Configuration d'établissement.
 *
 * ⚠️ Module GREENFIELD — aucun import depuis components/listing/form-v2 (le
 * formulaire legacy à 12 onglets). Les deux coexistent volontairement : cet
 * écran est la refonte, l'ancien reste en place tant que tous les champs n'ont
 * pas été repris (voir section « Autres »).
 *
 * Palette identique aux autres modules Sojori (or/crème, jamais de bleu SaaS).
 */
export const T = {
  gold: '#E6B022',
  goldDeep: '#B8881A',
  goldLight: '#F4CF5E',
  goldTint: 'rgba(230,176,34,0.12)',

  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#f0eee8',
  bg3: '#e7e4dc',

  ink: '#14110a',
  ink2: '#55504a',
  ink3: '#7a756c',
  ink4: '#a8a299',

  line: 'rgba(20,17,10,0.07)',
  lineStrong: 'rgba(20,17,10,0.14)',

  ok: '#0a8f5e',
  okBg: 'rgba(10,143,94,0.12)',
  err: '#c81e1e',
  errBg: 'rgba(200,30,30,0.10)',
  info: '#0673b3',
  infoBg: 'rgba(6,115,179,0.10)',
  ia: '#8B5CF6',
  wa: '#1fa855',

  radius: 12,
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
} as const;

/** Carte standard — même respiration partout dans l'écran. */
export const cardSx = {
  bgcolor: T.bg1,
  border: `1px solid ${T.line}`,
  borderRadius: `${T.radius}px`,
  p: 2,
} as const;

/** Sur-titre en petites capitales — sert de repère de section. */
export const kickerSx = {
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.9px',
  textTransform: 'uppercase' as const,
  color: T.ink3,
};
