import type { Conversation } from '../types/messages.types';

const THREAD_SEP = '::';

function reservationKey(conv: Conversation): string {
  return String(
    conv.reservation_mongo_id || conv.reservation_id || conv.reservation_number || '',
  ).trim();
}

/** Stable thread id for inbox lists (phone + reservation when present). */
export function conversationThreadId(conv: Conversation): string {
  const phone = String(conv.phone || '').trim();
  const res = reservationKey(conv);
  return res ? `${phone}${THREAD_SEP}${res}` : phone;
}

export function findConversationByThreadId(
  conversations: Conversation[],
  threadId: string,
): Conversation | undefined {
  const key = String(threadId || '').trim();
  if (!key) return undefined;

  const exact = conversations.find((c) => conversationThreadId(c) === key);
  if (exact) return exact;

  // Legacy: thread id was phone only (WhatsAppTab v1).
  if (!key.includes(THREAD_SEP)) {
    return conversations.find((c) => String(c.phone || '').trim() === key);
  }

  const [phonePart, resPart] = key.split(THREAD_SEP);
  if (!phonePart || !resPart) return undefined;
  return conversations.find((c) => {
    if (String(c.phone || '').trim() !== phonePart.trim()) return false;
    const rk = reservationKey(c);
    return rk === resPart.trim() || String(c.reservation_id || '').trim() === resPart.trim();
  });
}
