/**
 * Routage temps réel Inbox — mappe les payloads srv-sockets vers les onglets hub.
 *
 * | Onglet          | Room socket        | Source payload                          |
 * |-----------------|--------------------|-----------------------------------------|
 * | WhatsApp guest  | CHAT               | doc.msg.origin + inboxKind≠staff        |
 * | Staff WhatsApp  | CHAT               | doc.msg.origin + inboxKind=staff        |
 * | Messages OTA    | CHANNEXMESSAGE     | msgPayload.sender (guest/host)          |
 * | Demande (leads) | RU_CHAT            | event.threadId (RU rentals)             |
 * | Avis (reviews)  | RU_CHAT            | event.threadId (RU rentals)             |
 */

export type InboxRealtimeChannel = 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';

export const INBOX_REALTIME_CHANNELS: InboxRealtimeChannel[] = [
  'whatsapp',
  'staff',
  'ota',
  'leads',
  'reviews',
];

export type InboxRealtimeDetail = {
  channels: InboxRealtimeChannel[];
  socketEvent: string;
  payload?: unknown;
};

export const INBOX_REALTIME_DEBOUNCE_MS = 400;

export function inboxChannelEventName(channel: InboxRealtimeChannel): string {
  return `sojori:inbox-${channel}-updated`;
}

/** Classifie un payload socket.io vers un ou plusieurs onglets inbox. */
export function classifyInboxSocketPayload(payload: unknown): InboxRealtimeChannel[] {
  if (!payload || typeof payload !== 'object') {
    return [...INBOX_REALTIME_CHANNELS];
  }

  const p = payload as Record<string, unknown>;

  // WhatsApp user chat history (srv-fullchatbot / srv-admin / srv-fulltask staff)
  const msg = p.msg;
  if (msg && typeof msg === 'object' && ('origin' in (msg as object))) {
    const kind = String(p.inboxKind ?? p.inbox ?? '').toLowerCase();
    if (kind === 'staff') return ['staff'];
    return ['whatsapp'];
  }

  // Channex OTA (room CHANNEXMESSAGE)
  if ('sender' in p) {
    const sender = String(p.sender || '').toLowerCase();
    if (sender === 'guest' || sender === 'host' || sender === 'property') {
      return ['ota'];
    }
  }

  // Rentals United — threads OTA, leads, reviews (room RU_CHAT)
  if ('threadId' in p || 'isIncoming' in p) {
    return ['ota', 'leads', 'reviews'];
  }

  return [...INBOX_REALTIME_CHANNELS];
}

let inboxRealtimeTimer: ReturnType<typeof setTimeout> | null = null;
const pendingChannels = new Set<InboxRealtimeChannel>();

/** Debounce global : un seul refetch par onglet après rafale d'events socket. */
export function scheduleInboxRealtimeDispatch(
  socketEvent: string,
  payload: unknown,
  onAfterDispatch?: () => void,
): void {
  for (const ch of classifyInboxSocketPayload(payload)) {
    pendingChannels.add(ch);
  }

  if (inboxRealtimeTimer) clearTimeout(inboxRealtimeTimer);

  inboxRealtimeTimer = setTimeout(() => {
    inboxRealtimeTimer = null;
    const channels = [...pendingChannels];
    pendingChannels.clear();

    const detail: InboxRealtimeDetail = { channels, socketEvent, payload };

    for (const ch of channels) {
      window.dispatchEvent(
        new CustomEvent(inboxChannelEventName(ch), { detail }),
      );
    }

    // Legacy — certains écrans écoutent encore l'event global
    window.dispatchEvent(
      new CustomEvent('sojori:conversation-updated', { detail }),
    );

    onAfterDispatch?.();
  }, INBOX_REALTIME_DEBOUNCE_MS);
}
