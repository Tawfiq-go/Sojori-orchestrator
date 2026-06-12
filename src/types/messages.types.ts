/**
 * Types pour le système de messagerie WhatsApp + OTA
 * Backend: srv-chatbot (port 4000)
 */

// ═══════════════════════════════════════════════════════════════
// Types de base
// ═══════════════════════════════════════════════════════════════

/**
 * Types de contenu des messages
 */
export type MessageContentType = 'text' | 'flow' | 'buttons' | 'list' | 'template' | 'image';

/**
 * Sources des messages
 */
export type MessageSource = 'ai' | 'orchestrator' | 'backend' | 'admin';

/**
 * Rôles des messages
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Statuts des messages utilisateur
 */
export type UserMessageStatus = 'sent' | 'delivered' | 'read';

/**
 * Filtres de conversations
 */
export type ConversationFilter = 'smart' | 'urgent' | 'unread' | 'today' | 'short_term' | 'recent' | 'all';

// ═══════════════════════════════════════════════════════════════
// Interfaces principales
// ═══════════════════════════════════════════════════════════════

/**
 * Échange de messages (user + assistant)
 */
export interface MessageExchange {
  user_message: string;
  ai_response: string | null;
  ai_response_content_type: MessageContentType | null;
  ai_response_message_source?: MessageSource;
  timestamp: string;
  message_id?: string;
  sent_by_admin?: boolean;
  user_message_status?: UserMessageStatus;
  ai_model?: string;
  tokens_used?: number;
  cache_hit?: boolean;
  response_time_ms?: number;
  trace_id?: string;
  processing_trace?: any;
  ai_intent?: any;
  user_context?: any;
  /** Outbound WhatsApp delivery (srv-fullchatbot assistant row). */
  ai_response_send_status?: 'pending' | 'sent' | 'failed';
  ai_response_send_error?: string | null;
}

/**
 * Message individuel stocké en DB
 */
export interface ConversationMessage {
  _id: string;
  phone: string;
  reservation_id?: string;
  reservation_number?: string;
  listing_id?: string;
  role: MessageRole;
  content: string;
  content_type: MessageContentType;
  message_source?: MessageSource;
  detected_language?: string;
  response_language?: string;
  ai_intent?: any;
  session_id?: string;
  timestamp: string;
  whatsapp_message_id?: string;
  sent_by_admin?: boolean;
  model?: string;
  tokens_used?: number;
  response_time_ms?: number;
  trace_id?: string;
  processing_trace?: any;
  user_context?: {
    checkin_date?: string;
    checkout_date?: string;
    current_flow?: string;
    events_completed?: string[];
  };
}

/**
 * Conversation groupée (liste)
 */
export interface Conversation {
  phone: string;
  name?: string;
  /** Champ API chatbot (contient souvent le n° SJ-xxx) */
  reservation_id?: string;
  /** srv-fullchatbot — ObjectId réservation pour charger le fil */
  reservation_mongo_id?: string | null;
  reservation_number?: string;
  listing_id?: string;
  listing_name?: string;
  channel_name?: string;
  status?: string;
  checkin_date?: string;
  checkout_date?: string;
  last_message_time?: string;
  messages_count: number;
  exchanges_count: number;
  recent_exchanges: MessageExchange[];
  unread_count: number;
}

/**
 * Contexte utilisateur global (statut)
 */
export interface UserContext {
  phone: string;
  reservation_id?: string;
  reservation_number?: string;
  listing_id?: string;
  language?: string;
  checkin_date?: string;
  checkout_date?: string;
  guest_display_name?: string;
  listing_name?: string;
  channel_name?: string;
  status?: string;
  current_flow?: string;
  events_completed?: string[];
}

// ═══════════════════════════════════════════════════════════════
// Requêtes et réponses API
// ═══════════════════════════════════════════════════════════════

/**
 * Paramètres de pagination/filtrage des conversations
 */
export interface ConversationsParams {
  limit?: number;
  skip?: number;
  search?: string;
  filter?: ConversationFilter;
  hasReservation?: boolean;
  owner_id?: string;
}

/**
 * Réponse: Liste des conversations
 * GET /api/v1/ai/debug/conversations
 */
export interface ConversationsResponse {
  status: 'success';
  data: {
    conversations: Conversation[];
    total: number;
    limit: number;
    skip: number;
  };
}

/**
 * Réponse: Détail d'une conversation
 * GET /api/v1/ai/debug/messages/:phone
 */
export interface ConversationDetailResponse {
  status: 'success';
  data: {
    phone: string;
    exchanges_count: number;
    exchanges: MessageExchange[];
    has_more_older: boolean;
    user_context?: UserContext;
  };
}

/**
 * Requête: Envoyer un message
 * POST /api/v1/ai/debug/send-message
 */
export interface SendMessageRequest {
  phone: string;
  message: string;
}

/**
 * Réponse: Message envoyé
 */
export interface SendMessageResponse {
  success: boolean;
  messageId?: string;
  message_status?: string;
  error?: string;
}

/**
 * Réponse: Dernier message client
 * GET /api/v1/whatsapp/last-client-message
 */
export interface LastClientMessageResponse {
  lastClientMessageAt: string | null;
}

/**
 * Statistiques de stockage
 * GET /api/v1/ai/debug/storage-stats
 */
export interface StorageStatsResponse {
  status: 'success';
  data: {
    total_messages: number;
    unique_conversations: number;
    messages_by_period: {
      last_30_days: number;
      last_90_days: number;
      last_180_days: number;
    };
    storage: {
      size_mb: number;
      storage_size_mb: number;
      index_size_mb: number;
      total_mb: number;
    };
    oldest_message: {
      timestamp: string | null;
      phone: string | null;
      age_days: number;
    };
    newest_message: {
      timestamp: string | null;
    };
    retention_policy: {
      enabled: boolean;
      ttl_days: number | null;
      description: string;
    };
    indexes: string[];
    health: {
      status: 'healthy' | 'warning';
      message: string;
    };
  };
}

// ═══════════════════════════════════════════════════════════════
// Types UI
// ═══════════════════════════════════════════════════════════════

/**
 * État de chargement d'une conversation
 */
export interface ConversationLoadingState {
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

/**
 * État de l'envoi d'un message
 */
export interface SendMessageState {
  sending: boolean;
  error: string | null;
  success: boolean;
}

/**
 * Filtre UI actif
 */
export interface ConversationUIFilter {
  type: ConversationFilter;
  search: string;
  hasReservation?: boolean;
}
