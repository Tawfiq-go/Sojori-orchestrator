// ════════════════════════════════════════════════════════════════════
// types.ts — Sojori PM Dashboard · Support Config
// ════════════════════════════════════════════════════════════════════

/** Aligné sur listing_support_categories.priority : normal | high | urgent */
export type SupportPriority = 'normal' | 'high' | 'urgent';

/** @deprecated alias */
export type UrgencyLevel = SupportPriority;

export interface LocalizedString {
  fr: string;
  en: string;
  ar?: string;
}

export interface SupportCategory {
  id: string;                    // slug · ex: 'technique'
  enabled: boolean;
  label: LocalizedString;
  description?: LocalizedString;
  icon: string;                  // emoji
  defaultUrgency: SupportPriority;
  /** true = le voyageur choisit l'urgence dans le flow · false = urgence forcée (défaut catégorie) */
  guestCanChoosePriority: boolean;
  order: number;
}

export interface SupportConfig {
  enabled: boolean;
  categories: SupportCategory[];
}

/* ─── Tokens design Sojori Atelier 2026 ─── */
export const SOJORI_TOKENS = {
  primary: '#b8851a',
  primaryDeep: '#876119',
  primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)',
  bg0: '#f6f5f1',
  bg1: '#fff',
  bg2: '#fafaf7',
  bg3: '#f0eee8',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e',
  successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506',
  warningTint: 'rgba(196,101,6,0.12)',
  error: '#c81e1e',
  errorTint: 'rgba(200,30,30,0.10)',
} as const;

/** Typographie Atelier 2026 — Config Orch. (aligné Support / SHARED) */
export const CONFIG_ORCH_FONT = {
  sans: 'inherit',
  mono: '"Geist Mono", "SF Mono", ui-monospace, monospace',
} as const;

/* ─── Couleurs urgences (FR) ─── */
export const URGENCY_COLORS: Record<SupportPriority, { bg: string; fg: string; label: string }> = {
  normal: { bg: 'rgba(10,143,94,0.10)', fg: '#0a8f5e', label: 'Normal' },
  high: { bg: 'rgba(196,101,6,0.12)', fg: '#c46506', label: 'Haute' },
  urgent: { bg: 'rgba(200,30,30,0.10)', fg: '#c81e1e', label: 'Critique' },
};

/* ─── Seeds par défaut (3 catégories Sojori) ─── */
export const DEFAULT_CATEGORIES: SupportCategory[] = [
  {
    id: 'technique',
    enabled: true,
    label: { fr: 'Problème technique', en: 'Technical issue', ar: 'مشكلة تقنية' },
    description: { fr: 'Électricité, plomberie, Wi-Fi', en: 'Electricity, plumbing, Wi-Fi' },
    icon: '🔧',
    defaultUrgency: 'high',
    guestCanChoosePriority: true,
    order: 0,
  },
  {
    id: 'confort',
    enabled: true,
    label: { fr: 'Confort', en: 'Comfort' },
    description: { fr: 'Climatisation, chauffage, literie', en: 'A/C, heating, bedding' },
    icon: '🌡️',
    defaultUrgency: 'normal',
    guestCanChoosePriority: true,
    order: 1,
  },
  {
    id: 'question',
    enabled: true,
    label: { fr: 'Question générale', en: 'General question' },
    description: { fr: 'Règles, accès, informations', en: 'Rules, access, information' },
    icon: '💬',
    defaultUrgency: 'normal',
    guestCanChoosePriority: true,
    order: 2,
  },
];
