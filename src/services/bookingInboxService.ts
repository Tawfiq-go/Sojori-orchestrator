/**
 * Inbox Resa — numéro booking WhatsApp (+212 669-742611)
 * Proxy : srv-admin channels-dashboard → srv-channels booking-inbox
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';
import type { Conversation, MessageExchange } from '../types/messages.types';

const BASE = '/api/v1/admin/channels-dashboard/booking-inbox';

export type BookingInboxExchange = MessageExchange & {
  id?: string;
  transcript?: string;
  summary?: string;
  type?: string;
  media_id?: string;
  has_audio?: boolean;
  /** Bytes audio persistés côté serveur — rejouable même si Meta a expiré */
  audio_stored?: boolean;
  tags?: string[];
};

type ThreadRow = {
  id: string;
  phone: string;
  name: string;
  language?: string;
  last_message_time?: string | null;
  last_preview?: string;
  unread_count?: number;
};

function mapThreadToConversation(row: ThreadRow): Conversation {
  const preview = row.last_preview || '';
  const ts = row.last_message_time || new Date().toISOString();
  return {
    phone: row.phone,
    guest_name: row.name,
    last_message_time: ts,
    messages_count: 0,
    exchanges_count: 0,
    unread_count: row.unread_count || 0,
    recent_exchanges: preview
      ? [
          {
            user_message: preview,
            ai_response: null,
            timestamp: ts,
          },
        ]
      : [],
    staff_exchanges: [],
    language: row.language,
  } as Conversation;
}

export async function getBookingInboxThreads(params?: {
  limit?: number;
  search?: string;
}): Promise<{ status: string; data: { conversations: Conversation[] } }> {
  const { data } = await apiClient.get(`${BASE}/threads`, {
    params: {
      limit: params?.limit ?? 50,
      search: params?.search,
    },
    ...channelsDashboardAxiosConfig(),
  });
  const rows = (data?.data || data || []) as ThreadRow[];
  const list = Array.isArray(rows) ? rows.map(mapThreadToConversation) : [];
  return { status: 'success', data: { conversations: list } };
}

export async function getBookingInboxMessages(
  phone: string,
  limit = 80,
): Promise<{ status: string; data: { exchanges: BookingInboxExchange[]; language?: string } }> {
  const { data } = await apiClient.get(`${BASE}/threads/${encodeURIComponent(phone)}`, {
    params: { limit },
    ...channelsDashboardAxiosConfig(),
  });
  const payload = data?.data || data || {};
  return {
    status: 'success',
    data: {
      exchanges: (payload.exchanges || []) as BookingInboxExchange[],
      language: payload.language,
    },
  };
}

export async function sendBookingInboxMessage(
  to: string,
  text: string,
): Promise<{ status: string; wamid?: string }> {
  const { data } = await apiClient.post(
    `${BASE}/send`,
    { to, text },
    channelsDashboardAxiosConfig(),
  );
  if (data?.success === false) {
    throw new Error(data?.error || 'send_failed');
  }
  return { status: 'success', wamid: data?.data?.wamid };
}

export async function sendBookingInboxAudio(params: {
  to: string;
  audioBase64: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
}): Promise<{ status: string; wamid?: string }> {
  const { data } = await apiClient.post(
    `${BASE}/send-audio`,
    {
      to: params.to,
      audioBase64: params.audioBase64,
      mimeType: params.mimeType || 'audio/webm',
      filename: params.filename || 'admin-voice.webm',
      caption: params.caption,
    },
    { ...channelsDashboardAxiosConfig(), timeout: 60000 },
  );
  if (data?.success === false) {
    throw new Error(data?.error || 'send_audio_failed');
  }
  return { status: 'success', wamid: data?.data?.wamid };
}

export async function suggestBookingInboxAi(params: {
  to: string;
  draft?: string;
}): Promise<{ text: string; provider?: string; language?: string }> {
  const { data } = await apiClient.post(
    `${BASE}/ai-suggest`,
    { to: params.to, draft: params.draft },
    { ...channelsDashboardAxiosConfig(), timeout: 45000 },
  );
  if (data?.success === false || !data?.data?.text) {
    throw new Error(data?.error || 'ai_failed');
  }
  return data.data;
}

/** Fetch audio blob with auth for HTMLAudioElement. key = mediaId ou mongo id. */
export async function fetchBookingInboxMediaBlob(mediaId: string): Promise<Blob> {
  const { data, headers, status } = await apiClient.get(
    `${BASE}/media/${encodeURIComponent(mediaId)}`,
    {
      ...channelsDashboardAxiosConfig(),
      responseType: 'blob',
      timeout: 60000,
      validateStatus: (s) => s < 500,
    },
  );
  const type = String(headers?.['content-type'] || '');
  if (status >= 400 || type.includes('application/json')) {
    throw new Error('media_unavailable');
  }
  const blob =
    data instanceof Blob ? data : new Blob([data], { type: type || 'audio/ogg' });
  if (!blob.size) throw new Error('media_empty');
  // Still JSON error wrapped as blob (some proxies)
  if (type.includes('application/json') || blob.type.includes('json')) {
    throw new Error('media_unavailable');
  }
  return blob.type ? blob : new Blob([blob], { type: 'audio/ogg' });
}

export function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}
