import type { Conversation, ConversationDetailResponse, MessageExchange } from '../types/messages.types';

type StaffWaMessage = {
  body?: string;
  createdAt?: string;
  isIncoming?: boolean;
  status?: string;
  type?: string;
};

export type StaffWaThreadRow = {
  workerWaNumber?: string;
  workerWaName?: string;
  workerRole?: string;
  lastMessageAt?: string;
  lastMessage?: StaffWaMessage;
  messages?: StaffWaMessage[];
  unreadCount?: number;
};

function messageTime(m?: StaffWaMessage): number {
  return new Date(m?.createdAt || 0).getTime();
}

function sortStaffMessagesChronologically(messages: StaffWaMessage[]): StaffWaMessage[] {
  return [...messages].sort((a, b) => messageTime(a) - messageTime(b));
}

/** API returns messages newest-first; normalize + include lastMessage when batch is empty. */
export function resolveThreadMessages(row: StaffWaThreadRow | null | undefined): StaffWaMessage[] {
  const raw = row?.messages || [];
  const sorted = sortStaffMessagesChronologically(raw);
  if (sorted.length > 0) return sorted;
  if (row?.lastMessage) return [row.lastMessage];
  return [];
}

function messageDisplayBody(m: StaffWaMessage): string {
  const body = String(m.body || '').trim();
  if (body) return body;
  if (m.type && m.type !== 'text') return `[${m.type}]`;
  return '';
}

export function mergeStaffExchanges(
  prev: MessageExchange[],
  fetched: MessageExchange[],
): MessageExchange[] {
  if (!fetched.length) return prev;
  const seen = new Set<string>();
  const merged: MessageExchange[] = [];
  for (const e of [...fetched, ...prev]) {
    const key = `${e.timestamp ?? ''}|${e.ai_response ?? ''}|${e.user_message ?? ''}|${e.sent_by_admin ? '1' : '0'}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  merged.sort(
    (a, b) => new Date(a.timestamp || 0).getTime() - new Date(b.timestamp || 0).getTime(),
  );
  return merged;
}

export function staffOutboundExchange(text: string): MessageExchange {
  return {
    user_message: '',
    ai_response: text,
    ai_response_content_type: 'text',
    timestamp: new Date().toISOString(),
    sent_by_admin: true,
    ai_response_send_status: 'sent',
  };
}

export function staffMessagesToExchanges(messages: StaffWaMessage[] = []): MessageExchange[] {
  return messages.map((m) => {
    const text = messageDisplayBody(m);
    return {
      user_message: m.isIncoming ? text : '',
      ai_response: !m.isIncoming ? text : null,
      ai_response_content_type: !m.isIncoming ? 'text' : null,
      timestamp: m.createdAt || new Date().toISOString(),
      sent_by_admin: !m.isIncoming,
      user_message_status: m.status as MessageExchange['user_message_status'],
    };
  });
}

export function mapStaffThreadToConversation(row: StaffWaThreadRow): Conversation {
  const messages = resolveThreadMessages(row);
  const lastMsg = messages[messages.length - 1];
  const allExchanges = staffMessagesToExchanges(messages);

  return {
    phone: String(row.workerWaNumber || ''),
    name: row.workerWaName || row.workerWaNumber || 'Staff',
    channel_name: 'Staff',
    listing_name: row.workerRole || 'Staff',
    last_message_time: lastMsg?.createdAt || row.lastMessageAt,
    messages_count: messages.length,
    exchanges_count: messages.length,
    recent_exchanges: allExchanges.slice(-5),
    staff_exchanges: allExchanges,
    unread_count: Number(row.unreadCount) || 0,
  };
}

export function mapStaffThreadToDetail(
  phone: string,
  row: StaffWaThreadRow | null | undefined,
): ConversationDetailResponse {
  const messages = resolveThreadMessages(row);
  return {
    status: 'success',
    data: {
      phone,
      exchanges_count: messages.length,
      exchanges: staffMessagesToExchanges(messages),
      has_more_older: false,
    },
  };
}
