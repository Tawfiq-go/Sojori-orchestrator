/** Labels & pills — alignés sur preview HTML (0 deviation) */
export const STAFF_TASK_PILLS = [
  { key: 'cleaning_free', label: 'Ménage inclus', emoji: '🧹' },
  { key: 'cleaning_paid', label: 'Ménage payant', emoji: '✨' },
  { key: 'arrival_choose', label: 'Arrivée', emoji: '🛬' },
  { key: 'departure_choose', label: 'Départ', emoji: '🛫' },
  { key: 'transport', label: 'Transport', emoji: '🚗' },
  { key: 'support', label: 'Support', emoji: '🆘' },
  { key: 'concierge', label: 'Conciergerie', emoji: '🛎' },
  { key: 'groceries', label: 'Courses', emoji: '🛒' },
] as const;

export const DAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

export const LANG_OPTIONS = ['fr', 'en', 'ar'] as const;
export type WorkLang = (typeof LANG_OPTIONS)[number];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function pillLabelForType(type: string): { label: string; emoji: string } | null {
  const found = STAFF_TASK_PILLS.find((p) => p.key === type);
  if (found) return found;
  const legacy: Record<string, { label: string; emoji: string }> = {
    cleaning_in_out: { label: 'Ménage inclus', emoji: '🧹' },
    cleaning_mid_stay: { label: 'Ménage payant', emoji: '✨' },
    check_in: { label: 'Arrivée', emoji: '🛬' },
    check_out: { label: 'Départ', emoji: '🛫' },
    maintenance: { label: 'Support', emoji: '🆘' },
    concierge: { label: 'Conciergerie', emoji: '🛎' },
    transport: { label: 'Transport', emoji: '🚗' },
    groceries: { label: 'Courses', emoji: '🛒' },
  };
  return legacy[type] || null;
}
