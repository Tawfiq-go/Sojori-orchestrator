// Priorités support — alignées flow voyageur (srv-chatbot)

export type SupportPriority = 'normal' | 'high' | 'urgent';

export const SUPPORT_PRIORITIES: {
  id: SupportPriority;
  emoji: string;
  labelFr: string;
  labelEn: string;
  bg: string;
  fg: string;
}[] = [
  { id: 'normal', emoji: '🟢', labelFr: 'Normal', labelEn: 'Normal', bg: 'rgba(10,143,94,0.10)', fg: '#0a8f5e' },
  { id: 'high', emoji: '🟡', labelFr: 'Haute', labelEn: 'High', bg: 'rgba(196,101,6,0.12)', fg: '#c46506' },
  { id: 'urgent', emoji: '🔴', labelFr: 'Critique', labelEn: 'Critical', bg: 'rgba(200,30,30,0.10)', fg: '#c81e1e' },
];

export function priorityLabel(priority: string | undefined): string {
  const p = SUPPORT_PRIORITIES.find(x => x.id === priority);
  return p ? p.labelFr : 'Normal';
}

export function priorityMeta(priority: string | undefined) {
  return SUPPORT_PRIORITIES.find(x => x.id === priority) || SUPPORT_PRIORITIES[0];
}

/** Meta stockée dans `categories[].fields.__sojori` (Mixed, ignorée par le flow formulaire). */
export type SojoriSupportMeta = {
  guestCanChoosePriority?: boolean;
};

export function readSojoriMeta(fields: Record<string, unknown> | undefined): SojoriSupportMeta {
  const raw = fields?.__sojori;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as SojoriSupportMeta;
  }
  return {};
}

export function mergeSojoriMeta(
  fields: Record<string, unknown> | undefined,
  meta: SojoriSupportMeta,
): Record<string, unknown> {
  const base = { ...(fields || {}) };
  delete base.__sojori;
  return { ...base, __sojori: { ...readSojoriMeta(fields), ...meta } };
}
