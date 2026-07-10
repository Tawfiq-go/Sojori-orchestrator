import { tokens as t } from '../../components/dashboard/dashboardTokens';
import type { NotificationFacet, NotificationItem, NotificationPriority } from './types';

export interface FacetMeta {
  label: string;
  icon: string;
  color: string;
}

export const NOTIF_FACETS: Record<NotificationFacet, FacetMeta> = {
  reservation: { label: 'Réservations', icon: '🗓', color: t.info },
  guest_journey: { label: 'Parcours guest', icon: '🧭', color: t.success },
  orchestration: { label: 'Orchestration', icon: '⚙️', color: t.primaryDeep },
  message: { label: 'Messages', icon: '💬', color: t.ai },
  task: { label: 'Tâches', icon: '✅', color: t.warning },
  concierge: { label: 'Conciergerie', icon: '🛎', color: '#0e7490' },
  finance: { label: 'Finances', icon: '💰', color: t.success },
  review: { label: 'Avis', icon: '⭐', color: '#d97706' },
  lead: { label: 'Leads', icon: '🎯', color: '#db2777' },
};

export const FACET_ORDER: NotificationFacet[] = [
  'reservation',
  'guest_journey',
  'orchestration',
  'message',
  'task',
  'concierge',
  'finance',
  'review',
  'lead',
];

export interface PriorityMeta {
  label: string;
  color: string;
  tint: string;
}

export const NOTIF_PRIORITY: Record<NotificationPriority, PriorityMeta> = {
  critical: { label: 'Critique', color: t.error, tint: t.errorTint },
  high: { label: 'Urgent', color: t.warning, tint: t.warningTint },
  normal: { label: 'Normal', color: t.info, tint: t.infoTint },
  low: { label: 'Info', color: t.text3, tint: 'rgba(122,117,108,0.10)' },
};

export function isUnread(n: Pick<NotificationItem, 'readAt'>): boolean {
  return n.readAt == null;
}

export function isActionRequired(n: {
  priority: NotificationPriority;
  status: string;
}): boolean {
  return (
    (n.priority === 'critical' || n.priority === 'high') &&
    (n.status === 'created' || n.status === 'pending')
  );
}

/** Visible dans le panneau cloche (exclut archivées / traitées). */
export function isActiveInPanel(n: Pick<NotificationItem, 'status'>): boolean {
  return (
    n.status !== 'dismissed' &&
    n.status !== 'expired' &&
    n.status !== 'done' &&
    n.status !== 'handled'
  );
}
