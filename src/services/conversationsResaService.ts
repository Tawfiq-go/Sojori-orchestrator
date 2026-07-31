/**
 * Conversations Résa — vue unifiée web + WhatsApp des demandes de réservation.
 * Proxy : srv-admin channels-dashboard → srv-channels /conversations (modèle unifié).
 * Lecture seule (liste + détail) : la réponse et la reprise se font pour l'instant
 * via l'Inbox Resa (WhatsApp) ou le concierge (web).
 */
import apiClient from './apiClient';
import { channelsDashboardAxiosConfig } from '../utils/channelsAxiosConfig';

const BASE = '/api/v1/admin/channels-dashboard/conversations';

export type ConversationChannel = 'web' | 'whatsapp';

export interface ConversationIntent {
  intentType?: string;
  city?: string;
  locationStatus?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  budgetMad?: number;
  propertyType?: string;
  amenities?: string[];
}

/** « Comment cette réponse a été faite » — provider IA, latence, contexte. */
export interface ConversationTrace {
  provider?: string;
  model?: string;
  latencyMs?: number;
  historyCount?: number;
  fallback?: boolean;
}

export interface ConversationListItem {
  id: string;
  channel: ConversationChannel;
  contactId: string;
  displayName: string;
  waNumber?: string;
  language: string;
  lastMessageAt: string | null;
  lastPreview: string;
  unreadCount: number;
  lastIntent?: ConversationIntent;
}

export interface ConversationMessageItem {
  id: string;
  isIncoming: boolean;
  source: 'bot' | 'admin' | 'guest';
  type: string;
  body: string;
  transcript?: string;
  summary?: string;
  mediaId?: string;
  tags: string[];
  aiIntent?: ConversationIntent;
  trace?: ConversationTrace;
  timestamp: string;
}

export interface ConversationDetail {
  id: string;
  channel: ConversationChannel;
  displayName: string;
  waNumber?: string;
  language: string;
  messages: ConversationMessageItem[];
}

export async function getConversations(params?: {
  limit?: number;
  channel?: ConversationChannel;
  search?: string;
}): Promise<ConversationListItem[]> {
  const { data } = await apiClient.get(BASE, {
    params: {
      limit: params?.limit ?? 50,
      channel: params?.channel,
      search: params?.search,
    },
    ...channelsDashboardAxiosConfig(),
  });
  const rows = (data?.data || data || []) as ConversationListItem[];
  return Array.isArray(rows) ? rows : [];
}

export async function getConversationDetail(id: string): Promise<ConversationDetail | null> {
  const { data } = await apiClient.get(`${BASE}/${encodeURIComponent(id)}`, {
    ...channelsDashboardAxiosConfig(),
  });
  return (data?.data || null) as ConversationDetail | null;
}
