import apiClient from './apiClient';
import { extractHttpErrorMessage } from '../utils/extractHttpErrorMessage';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { getStaffWaThreads, sendStaffWaText } from './staffWhatsAppService';
import {
  mapStaffThreadToConversation,
  mapStaffThreadToDetail,
} from './staffConversationMapper';
import type {
  ConversationFilter,
  SendMessageRequest,
  SendMessageResponse,
  ConversationsResponse,
  ConversationDetailResponse,
  StorageStatsResponse,
  LastClientMessageResponse,
} from '../types/messages.types';

/**
 * Guest WhatsApp → srv-fullchatbot via proxy srv-admin (/fullchatbot/debug/*).
 * Staff WhatsApp → srv-fulltask (hasReservation=false dans getConversations).
 */
function resolveGuestWhatsappDebugBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined' && !import.meta.env.VITE_API_URL) {
    return '/api/v1/admin/fullchatbot/debug';
  }
  return `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fullchatbot/debug`;
}

type WhatsappInboxKind = 'guest' | 'staff';

function resolveWhatsappDebugBase(kind: WhatsappInboxKind): string {
  return resolveGuestWhatsappDebugBase();
}

class MessagesService {
  /**
   * Récupérer toutes les conversations groupées par téléphone
   * GET /api/v1/ai/debug/conversations
   *
   * Comme sojori-dashboard: whatsappApi.getConversations()
   */
  async getConversations(params?: {
    limit?: number;
    skip?: number;
    page?: number;
    search?: string;
    filter?: ConversationFilter;
    hasReservation?: boolean;
    owner_id?: string;
    sortBy?: string;
  }): Promise<ConversationsResponse> {
    try {
      // Comme sojori-dashboard: conversion page → skip
      const limit = params?.limit || 25;
      const page = params?.page ?? 0;
      const skip = params?.skip ?? (page * limit);

      const requestParams: any = {
        limit,
        skip,
        filter: params?.filter ?? 'recent',
      };

      // Ajouter params optionnels comme sojori-dashboard
      if (params?.hasReservation !== undefined) {
        requestParams.hasReservation = params.hasReservation;
      }
      if (params?.sortBy) requestParams.sortBy = params.sortBy;
      if (params?.search) requestParams.search = params.search;
      if (params?.owner_id) requestParams.owner_id = params.owner_id;

      if (params?.hasReservation === false) {
        const pageNum = params?.page ?? (skip ? Math.floor(skip / limit) : 0);
        const { rows, total } = await getStaffWaThreads({
          paged: true,
          page: pageNum,
          limit,
          messagesLimit: 50,
          ...(params?.search ? { search_text: params.search } : {}),
        });
        return {
          status: 'success',
          data: {
            conversations: rows.map(mapStaffThreadToConversation),
            total,
            limit,
            skip,
          },
        };
      }

      const response = await apiClient.get<ConversationsResponse>(
        `${resolveWhatsappDebugBase('guest')}/conversations`,
        { params: requestParams }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération conversations:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération des conversations'
      );
    }
  }

  /**
   * Récupérer les messages d'une conversation (format raw avec MongoDB docs)
   * GET /api/v1/ai/debug/messages/:phone
   *
   * Comme sojori-dashboard: whatsappApi.getRawMessages()
   */
  async getRawMessages(
    phone: string,
    options?: {
      limit?: number;
      before?: string;
      before_message_id?: string;
      inbox?: WhatsappInboxKind;
    }
  ): Promise<any> {
    try {
      const inbox = options?.inbox ?? 'guest';

      if (inbox === 'staff') {
        const digits = (phone || '').replace(/\D/g, '');
        const { rows } = await getStaffWaThreads({
          workerWaNumber: digits || phone,
          messagesLimit: options?.limit ?? 50,
        });
        const row =
          rows[0] ||
          rows.find((r: { workerWaNumber?: string }) =>
            (r.workerWaNumber || '').replace(/\D/g, '') === digits,
          );
        const messages = row?.messages || (row?.lastMessage ? [row.lastMessage] : []);
        return {
          status: 'success',
          data: {
            messages: messages.map((m: Record<string, unknown>) => ({
              phone,
              role: m.isIncoming ? 'user' : 'assistant',
              content: m.body,
              timestamp: m.createdAt,
              sent_by_admin: !m.isIncoming,
            })),
          },
        };
      }

      const params: any = {};
      if (options?.limit) params.limit = options.limit;
      if (options?.before) params.before = options.before;
      if (options?.before_message_id) params.before_message_id = options.before_message_id;

      const response = await apiClient.get(
        `${resolveWhatsappDebugBase('guest')}/messages/${encodeURIComponent(phone)}`,
        {
          params: Object.keys(params).length ? params : undefined,
          timeout: 60000,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération raw messages pour ${phone}:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les messages d'une conversation (format exchanges)
   * GET /api/v1/ai/debug/conversations/:phone
   *
   * Comme sojori-dashboard: whatsappApi.getMessages()
   */
  async getConversationMessages(
    phone: string,
    options?: {
      limit?: number;
      skip?: number;
      before?: string;
      before_message_id?: string;
      /** staff = srv-fulltask /staff-whatsapp, guest = srv-fullchatbot */
      inbox?: WhatsappInboxKind;
      /** Mongo reservationId — loads thread if phone variants miss */
      reservationId?: string;
    }
  ): Promise<ConversationDetailResponse> {
    try {
      const inbox = options?.inbox ?? 'guest';

      if (inbox === 'staff') {
        const digits = (phone || '').replace(/\D/g, '');
        const { rows } = await getStaffWaThreads({
          workerWaNumber: digits || phone,
          messagesLimit: options?.limit ?? 50,
        });
        const row =
          rows[0] ||
          rows.find((r: { workerWaNumber?: string }) =>
            (r.workerWaNumber || '').replace(/\D/g, '') === digits,
          );
        return mapStaffThreadToDetail(phone, row);
      }

      const params: Record<string, string | number> = {};
      if (options?.skip) params.skip = options.skip;
      if (options?.limit) params.limit = options.limit;
      if (options?.before) params.before = String(options.before);
      if (options?.before_message_id) params.before_message_id = options.before_message_id;
      if (options?.reservationId) params.reservationId = options.reservationId;

      const response = await apiClient.get<ConversationDetailResponse>(
        `${resolveWhatsappDebugBase('guest')}/conversations/${encodeURIComponent(phone)}`,
        {
          params: Object.keys(params).length ? params : undefined,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération messages pour ${phone}:`, error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération des messages'
      );
    }
  }

  /**
   * Envoyer un message WhatsApp depuis le dashboard (admin)
   * POST /api/v1/ai/debug/send-message
   *
   * Comme sojori-dashboard: whatsappApi.sendMessage()
   */
  async sendMessage(
    data: SendMessageRequest,
    inbox: WhatsappInboxKind = 'guest',
  ): Promise<SendMessageResponse> {
    try {
      if (inbox === 'staff') {
        await sendStaffWaText({ to: data.phone, text: data.message });
        return { success: true };
      }

      const response = await apiClient.post<SendMessageResponse>(
        `${resolveWhatsappDebugBase('guest')}/send-message`,
        {
          phone: data.phone,
          message: data.message,
        },
        {
          timeout: 45_000,
        }
      );

      const body = response.data as SendMessageResponse & { status?: string; detail?: string };
      if (body.status === 'error' || body.success === false) {
        throw new Error(
          body.error || body.detail || 'Échec envoi WhatsApp',
        );
      }
      return response.data;
    } catch (error: unknown) {
      console.error('❌ Erreur envoi message:', error);
      throw new Error(extractHttpErrorMessage(error, 'Erreur lors de l\'envoi du message'));
    }
  }

  /**
   * Rechercher conversations par numéro de réservation
   * Comme sojori-dashboard: whatsappApi.getByReservation()
   */
  async getByReservation(reservationNumber: string): Promise<ConversationsResponse> {
    try {
      const response = await apiClient.get<ConversationsResponse>(
        `${resolveGuestWhatsappDebugBase()}/conversations`,
        {
          params: {
            limit: 25,
            skip: 0,
            search: reservationNumber,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur recherche réservation ${reservationNumber}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un message WhatsApp avec template (orchestrator)
   * POST /api/v1/whatsapp/send-message
   */
  async sendWhatsAppTemplate(data: {
    phone: string;
    templateId: string;
    templateVariables: string[];
    languageCode?: string;
    reservationNumber?: string;
    reservationId?: string;
    category?: string;
    flowButtonIndex?: string;
  }): Promise<SendMessageResponse> {
    try {
      const response = await apiClient.post<SendMessageResponse>(
        `${MICROSERVICE_BASE_URL.SRV_CHATBOT.replace('/debug', '')}/whatsapp/send-message`,
        {
          phone: data.phone,
          templateId: data.templateId,
          templateVariables: data.templateVariables,
          languageCode: data.languageCode || 'fr',
          reservationNumber: data.reservationNumber,
          reservationId: data.reservationId,
          category: data.category,
          flowButtonIndex: data.flowButtonIndex,
        },
        {
          headers: {
            'X-Orchestrator-Auth': import.meta.env.VITE_ORCHESTRATOR_SECRET || 'orchestrator-secret',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi template WhatsApp:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de l\'envoi du template WhatsApp'
      );
    }
  }

  /**
   * Récupérer le dernier message du client (fenêtre 72h WhatsApp)
   * GET /api/v1/whatsapp/last-client-message
   */
  async getLastClientMessage(phone: string): Promise<LastClientMessageResponse> {
    try {
      const response = await apiClient.get<LastClientMessageResponse>(
        `${resolveGuestWhatsappDebugBase()}/last-client-message`,
        { params: { phone: phone } }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération dernier message client pour ${phone}:`, error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération du dernier message client'
      );
    }
  }

  /**
   * Récupérer les statistiques de stockage des messages
   * GET /api/v1/ai/debug/storage-stats
   */
  async getStorageStats(): Promise<StorageStatsResponse> {
    try {
      const response = await apiClient.get<StorageStatsResponse>(
        `${resolveGuestWhatsappDebugBase()}/storage-stats`
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération stats stockage:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération des statistiques de stockage'
      );
    }
  }

  /**
   * Marquer une conversation comme lue
   * (Pour implémentation future)
   */
  async markAsRead(phone: string): Promise<{ success: boolean }> {
    // TODO: Implémenter endpoint backend si nécessaire
    // Logs désactivés pour nettoyer la console
    // console.log(`Marquer conversation ${phone} comme lue`);
    return { success: true };
  }

  /**
   * Rechercher dans les conversations
   * (Utilise getConversations avec paramètre search)
   */
  async searchConversations(searchTerm: string): Promise<ConversationsResponse> {
    return this.getConversations({ search: searchTerm, limit: 50 });
  }

  /**
   * Filtrer conversations par type
   */
  async filterConversations(
    filter: ConversationFilter,
    hasReservation?: boolean
  ): Promise<ConversationsResponse> {
    return this.getConversations({ filter, hasReservation, limit: 50 });
  }

  // ═══════════════════════════════════════════════════════════════
  // LEADS API - Demandes pré-réservation
  // ═══════════════════════════════════════════════════════════════

  /**
   * Récupérer tous les leads (demandes pré-réservation)
   * GET /api/v1/reservations/rentals/get-thread?source=lead
   */
  async getLeads(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    ownerId?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`,
        {
          params: {
            page: params?.page || 0,
            limit: params?.limit || 25,
            msgLimit: 1, // Optimized: 1 message for list view
            source: 'lead', // Filter only leads
            reservationNumber: params?.search || undefined,
            sortBy: params?.sortBy || undefined,
            ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération leads:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération des leads'
      );
    }
  }

  /**
   * Récupérer les messages d'un lead
   * GET /api/v1/reservations/rentals/get-messages-by-thread-id/:threadId
   */
  async getLeadMessages(threadId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-messages-by-thread-id/${threadId}`,
        {
          params: { limit: 100 },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération messages lead ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un message à un lead
   * POST /api/v1/reservations/rentals/send-message
   */
  async sendLeadMessage(threadId: string, message: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/send-message`,
        {
          threadId: threadId,
          messageBody: message,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi message lead:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de l\'envoi du message au lead'
      );
    }
  }

  /**
   * Envoyer une Special Offer (Airbnb uniquement)
   * POST /api/v1/reservations/rentals/special-offer
   */
  async sendSpecialOffer(threadId: string, offerData: {
    amount?: number;
    currency?: string;
    checkIn?: string;
    checkOut?: string;
    guestsIncluded?: number;
  }): Promise<any> {
    try {
      const response = await apiClient.post(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/special-offer`,
        {
          threadId: threadId,
          ...offerData,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi special offer:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de l\'envoi de la special offer'
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // REVIEWS API - Avis clients
  // ═══════════════════════════════════════════════════════════════

  /**
   * Récupérer tous les avis (reviews)
   * GET /api/v1/reservations/rentals/get-review
   */
  async getReviews(params?: {
    cursor?: string;
    limit?: number;
    msgLimit?: number;
    page?: number;
    sortBy?: string;
    reservationNumber?: string;
    reservationId?: string;
    name?: string;
    listingIds?: string[];
    channelName?: string[];
    reviewStatus?: string[];
    dateRangeType?: string;
    ownerId?: string;
  }): Promise<any> {
    try {
      const requestParams: any = {
        limit: params?.limit ?? 25,
        msgLimit: params?.msgLimit ?? 30,
      };

      if (params?.page != null && params.page !== '') requestParams.page = params.page;
      if (params?.cursor != null && params.cursor !== '') requestParams.cursor = params.cursor;
      if (params?.reservationNumber) requestParams.reservationNumber = params.reservationNumber;
      if (params?.reservationId) requestParams.reservationId = params.reservationId;
      if (params?.sortBy) requestParams.sortBy = params.sortBy;
      if (params?.dateRangeType) requestParams.dateRangeType = params.dateRangeType;
      if (params?.name) requestParams.name = params.name;
      if (params?.listingIds?.length) {
        requestParams.listingIds = Array.isArray(params.listingIds)
          ? params.listingIds
          : String(params.listingIds).split(',').filter(Boolean);
      }
      if (params?.channelName?.length) {
        requestParams.channelName = Array.isArray(params.channelName)
          ? params.channelName
          : String(params.channelName).split(',').filter(Boolean);
      }
      if (params?.reviewStatus?.length) {
        requestParams.reviewStatus = Array.isArray(params.reviewStatus)
          ? params.reviewStatus
          : String(params.reviewStatus).split(',').filter(Boolean);
      }
      if (params?.ownerId != null && params.ownerId !== '') {
        requestParams.ownerId = params.ownerId;
      }

      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`,
        { params: requestParams }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération reviews:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la récupération des avis'
      );
    }
  }

  /**
   * Récupérer détails d'un review par reservationId
   * GET /api/v1/reservations/rentals/get-review?reservationId=...
   */
  async getReviewDetails(reservationId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`,
        {
          params: {
            limit: 10,
            reservationId: reservationId,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération review ${reservationId}:`, error);
      throw error;
    }
  }

  /**
   * Répondre à un avis
   * POST /api/v1/reservations/rentals/replay-send
   */
  async replyToReview(threadId: string, reply: string): Promise<any> {
    try {
      const response = await apiClient.post(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/replay-send`,
        {
          threadId: threadId,
          reply: reply,
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur réponse review:', error);
      throw new Error(
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Erreur lors de la réponse à l\'avis'
      );
    }
  }

  /**
   * Récupérer reviews par numéro de réservation
   * GET /api/v1/reservations/rentals/get-review?reservationId=...
   */
  async getReviewsByReservation(reservationNumber: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`,
        {
          params: {
            limit: 10,
            reservationId: reservationNumber,
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération reviews pour ${reservationNumber}:`, error);
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // OTA MESSAGES API - Messages OTA (Airbnb/Booking confirmés)
  // ═══════════════════════════════════════════════════════════════

  /**
   * Récupérer tous les threads OTA (réservations confirmées)
   * GET /api/v1/reservations/rentals/get-thread?source=reservation
   */
  async getOTAThreads(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    ownerId?: string;
    otaSearch?: boolean;
    q?: string;
    reservationNumber?: string;
    guestName?: string;
    guestPhone?: string;
    listingName?: string;
    messageText?: string;
    arrivalFrom?: string;
    arrivalTo?: string;
    stayPeriod?: string;
    messageStatus?: string;
    unreplied?: boolean;
    otaChannel?: string;
    cursor?: string;
  }): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`,
        {
          params: {
            page: params?.page || 0,
            limit: params?.limit || 25,
            msgLimit: 0,
            source: 'reservation',
            reservationNumber: params?.reservationNumber || params?.search || undefined,
            sortBy: params?.sortBy || undefined,
            ...(params?.cursor ? { cursor: params.cursor } : {}),
            ...(params?.ownerId ? { ownerId: params.ownerId } : {}),
            ...(params?.otaSearch ? { otaSearch: '1' } : {}),
            ...(params?.q ? { q: params.q } : {}),
            ...(params?.guestName ? { guestName: params.guestName } : {}),
            ...(params?.guestPhone ? { guestPhone: params.guestPhone } : {}),
            ...(params?.listingName ? { listingName: params.listingName } : {}),
            ...(params?.messageText ? { messageText: params.messageText } : {}),
            ...(params?.arrivalFrom ? { arrivalFrom: params.arrivalFrom } : {}),
            ...(params?.arrivalTo ? { arrivalTo: params.arrivalTo } : {}),
            ...(params?.stayPeriod ? { stayPeriod: params.stayPeriod } : {}),
            ...(params?.messageStatus ? { messageStatus: params.messageStatus } : {}),
            ...(params?.unreplied ? { unreplied: '1' } : {}),
            ...(params?.otaChannel ? { otaChannel: params.otaChannel } : {}),
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur récupération threads OTA:', error);
      throw error;
    }
  }

  /**
   * Récupérer les messages d'un thread OTA
   * GET /api/v1/reservations/rentals/get-messages-by-thread-id/:threadId
   */
  async getOTAMessages(threadId: string): Promise<any> {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-messages-by-thread-id/${threadId}`,
        {
          params: { limit: 100 },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error(`❌ Erreur récupération messages OTA ${threadId}:`, error);
      throw error;
    }
  }

  /**
   * Envoyer un message OTA
   * POST /api/v1/reservations/rentals/send-message
   */
  async sendOTAMessage(threadId: string, message: string): Promise<any> {
    try {
      const numericThreadId = Number(String(threadId).replace(/\D/g, '')) || threadId;
      const response = await apiClient.post(
        `${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/send-message`,
        {
          threadId: numericThreadId,
          messageBody: message,
        },
      );

      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi message OTA:', error);
      const ruError =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.response?.data?.detail;
      const hint = error.response?.data?.hint;
      throw new Error(
        [ruError, hint].filter(Boolean).join(' — ') ||
          (error.response?.status === 401
            ? 'Session expirée — reconnectez-vous.'
            : 'Erreur lors de l\'envoi du message OTA.'),
      );
    }
  }
}

export const messagesService = new MessagesService();
export default messagesService;
