// ════════════════════════════════════════════════════════════════════
// Sojori · Inbox V4 (Atelier 2026 Light)
// _tokens.ts — palette light Sojori + helpers shared
// ════════════════════════════════════════════════════════════════════

export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)', primaryTint2: 'rgba(184,133,26,0.20)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.10)',
  error:   '#c81e1e', errorTint:   'rgba(200,30,30,0.10)',
  info:    '#0673b3', infoTint:    'rgba(6,115,179,0.10)',
  green:   '#25D366', greenBg: 'rgba(37,211,102,0.12)',
  airbnb:  '#FF5A5F', airbnbBg: 'rgba(255,90,95,0.12)',
  booking: '#003580', bookingBg: 'rgba(0,53,128,0.10)',
} as const;

// ─── Task types catalog (drives left-border color + emoji) ────────
export type TaskType =
  | 'cleaning' | 'arrival' | 'departure'
  | 'concierge' | 'support' | 'transport'
  | 'registration' | 'maintenance' | 'other';

export const TASK_META: Record<TaskType, { emoji: string; label: string; accent: string }> = {
  cleaning:     { emoji: '🧹', label: 'Ménage',                 accent: T.warning },
  arrival:      { emoji: '🛬', label: 'Choisir arrivée',        accent: T.success },
  departure:    { emoji: '🚪', label: 'Départ',                 accent: T.error },
  concierge:    { emoji: '🛎', label: 'Conciergerie',           accent: T.ai },
  support:      { emoji: '🆘', label: 'Support',                accent: '#86198f' },
  transport:    { emoji: '🚗', label: 'Transport',              accent: T.info },
  registration: { emoji: '📋', label: 'Enregistrement police',  accent: T.info },
  maintenance:  { emoji: '🔧', label: 'Maintenance',            accent: T.error },
  other:        { emoji: '📋', label: 'Tâche',                  accent: T.text3 },
};

export type TaskStatus = 'CREATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const STATUS_META: Record<TaskStatus, { label: string; color: string; step: 1|2|3|4 }> = {
  CREATED:     { label: 'Créée',     color: T.text3,   step: 1 },
  ASSIGNED:    { label: 'Assignée',  color: T.info,    step: 2 },
  IN_PROGRESS: { label: 'En cours',  color: T.warning, step: 3 },
  COMPLETED:   { label: 'Terminée',  color: T.success, step: 4 },
  CANCELLED:   { label: 'Annulée',   color: T.error,   step: 1 },
};

// ─── Initials helper for staff avatars ────────────────────────────
export function initials(name?: string | null) {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] || '') + (p[p.length - 1]?.[0] || '')).toUpperCase();
}

// ─── Deadline formatter + urgency detection ───────────────────────
export function formatDeadline(iso?: string) {
  if (!iso) return { label: '', urgency: 'none' as const };
  try {
    const d = new Date(iso);
    const diffH = (d.getTime() - Date.now()) / 3600000;
    const isToday = d.toDateString() === new Date().toDateString();
    const dayPart = isToday ? "Auj." : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 0) return { label: `${dayPart} ${time} · en retard`, urgency: 'late' as const };
    if (diffH < 4) return { label: `${dayPart} ${time}`, urgency: 'urgent' as const };
    return { label: `${dayPart} · ${time}`, urgency: 'normal' as const };
  } catch { return { label: '', urgency: 'none' as const }; }
}

// ─── @keyframes (inject once in index.css) ────────────────────────
export const KEYFRAMES = `
@keyframes sojori-pulse-error { 0%,100%{box-shadow:0 0 0 0 rgba(200,30,30,0.55)} 50%{box-shadow:0 0 0 6px rgba(200,30,30,0)} }
@keyframes sojori-pulse-success { 0%,100%{box-shadow:0 0 0 0 rgba(10,143,94,0.45)} 50%{box-shadow:0 0 0 5px rgba(10,143,94,0)} }
@keyframes sojori-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes sojori-fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
`;
