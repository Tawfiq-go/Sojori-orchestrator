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

/** Jalons parcours déclenchés via WhatsApp (flows E, D1/D2…). */
export const GUEST_JOURNEY_NOTIFY_EVENTS = [
  'guest:registration_started',
  'guest:registration_member',
  'guest:registration_completed',
  'guest:arrival_time_chosen',
  'guest:departure_time_chosen',
] as const;

export type GuestJourneyNotifyEventKey = (typeof GUEST_JOURNEY_NOTIFY_EVENTS)[number];

/** Badge sidebar Inbox Guest → WhatsApp : messages libres + jalons parcours WA. */
export const WHATSAPP_GUEST_SIDEBAR_EVENT_KEYS = [
  'message:whatsapp_received',
  ...GUEST_JOURNEY_NOTIFY_EVENTS,
] as const;

/** Filtres inbox guest dans la cloche (remplace la facette « message » unique). */
export const NOTIF_MESSAGE_CHANNELS = [
  {
    eventKey: 'message:ota_received',
    label: 'OTA',
    color: '#FF5A5F',
  },
  {
    eventKey: 'message:whatsapp_received',
    label: 'WhatsApp',
    color: '#25D366',
  },
] as const;

export type MessageChannelEventKey = (typeof NOTIF_MESSAGE_CHANNELS)[number]['eventKey'];

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

export function isImportantTier(n: Pick<NotificationItem, 'priority'>): boolean {
  return n.priority === 'critical' || n.priority === 'high';
}

export function matchesBellTier(
  n: Pick<NotificationItem, 'priority'>,
  tier: 'important' | 'secondary',
): boolean {
  return tier === 'important' ? isImportantTier(n) : !isImportantTier(n);
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

export function messageChannelMeta(eventKey: string) {
  return NOTIF_MESSAGE_CHANNELS.find((c) => c.eventKey === eventKey);
}
