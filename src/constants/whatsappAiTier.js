/** Claude tiers for guest WhatsApp AI — cheapest (1) to most capable (4). Admin-only PM config. */
export const WHATSAPP_AI_TIER_OPTIONS = [
  {
    tier: 1,
    label: 'Économique',
    hint: 'Haiku 4.5 — le plus rapide et le moins cher',
    modelId: 'claude-haiku-4-5-20251001',
  },
  {
    tier: 2,
    label: 'Équilibré',
    hint: 'Sonnet 4.6 — recommandé (défaut)',
    modelId: 'claude-sonnet-4-6',
  },
  {
    tier: 3,
    label: 'Avancé',
    hint: 'Opus 4.7',
    modelId: 'claude-opus-4-7',
  },
  {
    tier: 4,
    label: 'Premium',
    hint: 'Opus 4.8 — le plus capable',
    modelId: 'claude-opus-4-8',
  },
];

export function labelForWhatsappAiTier(tier) {
  const n = Number(tier);
  const opt = WHATSAPP_AI_TIER_OPTIONS.find((o) => o.tier === n);
  return opt ? `${opt.label} (${opt.hint})` : 'Équilibré (défaut)';
}

export function shortLabelForWhatsappAiTier(tier) {
  const n = Number(tier);
  const opt = WHATSAPP_AI_TIER_OPTIONS.find((o) => o.tier === n);
  return opt?.label ?? 'Équilibré';
}

/** Label for owner create/edit dropdown (cheapest → most capable). */
export function tierOptionDropdownLabel(opt) {
  return `${opt.tier}. ${opt.label} — ${opt.hint}`;
}
