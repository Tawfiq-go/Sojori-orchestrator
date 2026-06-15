/**
 * Sojori Brand Kit v1.0 — Juin 2026 (Sojori (43).zip)
 * Source : brand-kit/README.md + Sojori Brand Guidelines.html
 */
export const sojoriBrand = {
  gold: '#E6B022',
  goldSoft: '#F4CF5E',
  goldDeep: '#B8881A',
  violet: '#8B5CF6',
  cyan: '#06B6D4',
  success: '#10B981',
  error: '#EF4444',
  /** Fonds nuit — marketing / hero */
  night0: '#08080B',
  night1: '#0F0F14',
  night2: '#16161E',
  night3: '#1F1F2A',
} as const;

/** Tokens dashboard light (app orchestrator) */
export const dashboardTokens = {
  primary: sojoriBrand.gold,
  primaryDeep: sojoriBrand.goldDeep,
  primarySoft: sojoriBrand.goldSoft,
  primaryTint: 'rgba(230,176,34,0.10)',
  primaryOnGold: '#1A1408',

  ai: sojoriBrand.violet,
  aiTint: 'rgba(139,92,246,0.10)',

  success: '#0A8F5E',
  successTint: 'rgba(10,143,94,0.10)',
  warning: '#C46506',
  warningTint: 'rgba(196,101,6,0.10)',
  error: '#C81E1E',
  errorTint: 'rgba(200,30,30,0.10)',
  info: '#0673B3',
  infoTint: 'rgba(6,115,179,0.10)',

  bg0: '#F6F5F1',
  bg1: '#FFFFFF',
  bg2: '#F0EEE8',
  bg3: '#E7E4DC',

  text: '#14110A',
  text2: '#55504A',
  text3: '#7A756C',
  text4: '#A8A299',

  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',

  sidebarW: 248,
  topbarH: 56,
} as const;

export type DashboardTokens = typeof dashboardTokens;
