/**
 * Communications API Service
 * Unifie les appels API pour WhatsApp, OTA Messages et Reviews
 * Point commun: Numéro de réservation
 */

import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';

/**
 * WhatsApp API - Collection: chatbot.conversationMessages
 */
export const whatsappApi = {
  // Récupérer toutes les conversations WhatsApp depuis srv-chatbot (pagination: page = numéro de page, skip = offset)
  getConversations: async (params = {}) => {
    try {
      const limit = params.limit || 25; // Optimized: 25 instead of 100
      const page = params.page ?? 0;
      const skip = page * limit; // offset pour la pagination (page 0 → skip 0, page 1 → skip 50, etc.)
      const requestParams = {
        limit,
        skip,
        filter: params.filter ?? 'recent',
        hasReservation: params.hasReservation // true/false/undefined
      };
      if (params.sortBy != null && params.sortBy !== '') requestParams.sortBy = params.sortBy;
      if (params.search != null && params.search !== '') requestParams.search = params.search;
      if (params.owner_id != null && params.owner_id !== '') requestParams.owner_id = params.owner_id; // Filtrage par owner
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`, {
        params: requestParams
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer messages d'une conversation spécifique (par téléphone). Optionnel: skip, limit si le backend supporte la pagination des messages.
  getMessages: async (phone, options = {}) => {
    try {
      const params = {};
      if (options.skip != null) params.skip = options.skip;
      if (options.limit != null) params.limit = options.limit;
      if (options.before != null && options.before !== '') params.before = options.before;
      if (options.before_message_id != null && options.before_message_id !== '') {
        params.before_message_id = options.before_message_id;
      }
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations/${encodeURIComponent(phone)}`, {
        params: Object.keys(params).length ? params : undefined
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Envoyer un message WhatsApp (depuis le dashboard → srv-chatbot → WhatsApp API + stockage conversationMessages)
  sendMessage: async (phone, message) => {
    try {
      const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/send-message`, {
        phone,
        message
      }, {
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer conversation(s) par numéro de réservation (backend utilise param "search")
  getByReservation: async reservationNumber => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/conversations`, {
        params: {
          limit: 25,
          // Optimized: 25 instead of 100
          skip: 0,
          search: reservationNumber
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Documents MongoDB bruts (conversationMessages) — ai_intent, user_context, content_type, etc.
   * srv-chatbot: GET /api/v1/ai/debug/messages/{phone}
   */
  getRawMessages: async (phone, options = {}) => {
    try {
      const params = {};
      if (options.limit != null) params.limit = options.limit;
      if (options.before != null && options.before !== '') params.before = options.before;
      if (options.before_message_id != null && options.before_message_id !== '') {
        params.before_message_id = options.before_message_id;
      }
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug/messages/${encodeURIComponent(phone)}`, {
        params: Object.keys(params).length ? params : undefined,
        timeout: 60000
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * OTA Messages API - Collection: srv-reservations.threads + messages
 */
export const otaMessagesApi = {
  // Récupérer tous les threads OTA (Airbnb/Booking)
  getThreads: async (params = {}) => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`, {
        params: {
          page: params.page || 0,
          limit: params.limit || 25,
          msgLimit: 0,
          // ⚡ OPTIMIZED: 0 = no messages, use thread.preview or thread.lastMessage (90% faster)
          reservationNumber: params.search || undefined,
          sortBy: params.sortBy || undefined,
          // Ajout du paramètre de tri pour le backend
          source: 'reservation', // ✅ FIX: Filter only confirmed reservations (exclude leads)
          ...(params.ownerId != null && params.ownerId !== '' ? { ownerId: params.ownerId } : {}),
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer messages d'un thread
  getMessages: async threadId => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-messages-by-thread-id/${threadId}`, {
        params: {
          limit: 100
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Envoyer un message OTA
  sendMessage: async (threadId, message) => {
    try {
      const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/send-message`, {
        threadId: threadId,
        messageBody: message
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer thread par numéro de réservation
  getByReservation: async reservationNumber => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`, {
        params: {
          reservationNumber: reservationNumber,
          limit: 10,
          msgLimit: 1,
          // Optimized: 1 message instead of 30 for list view
          source: 'reservation' // ✅ FIX: Filter only confirmed reservations (exclude leads)
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Leads API - Collection: srv-reservations.threads (source: 'lead')
 * Demandes de réservation Airbnb avant confirmation
 */
export const leadsApi = {
  // Récupérer tous les threads Lead (demandes non confirmées)
  getLeads: async (params = {}) => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`, {
        params: {
          page: params.page || 0,
          limit: params.limit || 25,
          msgLimit: 1,
          // Optimized: 1 message (last only) instead of 30 for list view
          source: 'lead',
          // Filter par source=lead
          reservationNumber: params.search || undefined,
          sortBy: params.sortBy || undefined,
          ...(params.ownerId != null && params.ownerId !== '' ? { ownerId: params.ownerId } : {}),
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer messages d'un thread Lead
  getMessages: async threadId => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-messages-by-thread-id/${threadId}`, {
        params: {
          limit: 100
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Envoyer un message sur un Lead
  sendMessage: async (threadId, message) => {
    try {
      const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/send-message`, {
        threadId: threadId,
        messageBody: message
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Envoyer Special Offer (Airbnb uniquement)
  sendSpecialOffer: async (threadId, offerData) => {
    try {
      const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/special-offer`, {
        threadId,
        ...offerData
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer Lead par numéro de réservation
  getByReservation: async reservationNumber => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-thread`, {
        params: {
          reservationNumber: reservationNumber,
          source: 'lead',
          limit: 10,
          msgLimit: 1 // Optimized: 1 message instead of 30 for list view
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Reviews API - Collection: srv-reservations.threads + messages (isReview: true)
 */
export const reviewsApi = {
  // Récupérer tous les reviews (pagination cursor côté srv-reservations, cf. getReviewThreads)
  getReviews: async (params = {}) => {
    try {
      const requestParams = {
        limit: params.limit ?? 25,
        msgLimit: params.msgLimit ?? 30,
      };
      if (params.page != null && params.page !== '') requestParams.page = params.page;
      if (params.cursor != null && params.cursor !== '') requestParams.cursor = params.cursor;
      if (params.reservationNumber) requestParams.reservationNumber = params.reservationNumber;
      if (params.reservationId) requestParams.reservationId = params.reservationId;
      if (params.sortBy) requestParams.sortBy = params.sortBy;
      if (params.dateRangeType) requestParams.dateRangeType = params.dateRangeType;
      if (params.name) requestParams.name = params.name;
      if (params.listingIds?.length) {
        requestParams.listingIds = Array.isArray(params.listingIds)
          ? params.listingIds
          : String(params.listingIds).split(',').filter(Boolean);
      }
      if (params.channelName?.length) {
        requestParams.channelName = Array.isArray(params.channelName)
          ? params.channelName
          : String(params.channelName).split(',').filter(Boolean);
      }
      if (params.reviewStatus?.length) {
        requestParams.reviewStatus = Array.isArray(params.reviewStatus)
          ? params.reviewStatus
          : String(params.reviewStatus).split(',').filter(Boolean);
      }
      if (params.ownerId != null && params.ownerId !== '') {
        requestParams.ownerId = params.ownerId;
      }
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`, {
        params: requestParams,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer détails d'un review
  getReviewDetails: async reservationId => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`, {
        params: {
          limit: 10,
          reservationId: reservationId
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  // Répondre à un review
  respondToReview: async (threadId, messageBody) => {
    try {
      const result = await axios.post(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/replay-send`, {
        threadId: threadId,
        reply: messageBody
      });
      return result.data;
    } catch (error) {
      throw error;
    }
  },
  // Récupérer reviews par numéro de réservation
  getByReservation: async reservationNumber => {
    try {
      const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_RESERVATION}/rentals/get-review`, {
        params: {
          limit: 10,
          reservationId: reservationNumber
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

/**
 * Service unifié pour récupérer toutes les communications d'une réservation
 */
export const unifiedCommunicationsApi = {
  // Récupérer TOUTES les communications liées à une réservation
  getByReservationNumber: async reservationNumber => {
    try {
      const [whatsapp, otaMessages, leads, reviews] = await Promise.allSettled([whatsappApi.getByReservation(reservationNumber), otaMessagesApi.getByReservation(reservationNumber), leadsApi.getByReservation(reservationNumber), reviewsApi.getByReservation(reservationNumber)]);
      return {
        whatsapp: whatsapp.status === 'fulfilled' ? whatsapp.value : null,
        otaMessages: otaMessages.status === 'fulfilled' ? otaMessages.value : null,
        leads: leads.status === 'fulfilled' ? leads.value : null,
        reviews: reviews.status === 'fulfilled' ? reviews.value : null,
        reservationNumber
      };
    } catch (error) {
      throw error;
    }
  },
  // Vérifier l'existence de communications pour chaque type
  checkAvailability: async reservationNumber => {
    const data = await unifiedCommunicationsApi.getByReservationNumber(reservationNumber);
    return {
      hasWhatsApp: data.whatsapp?.data?.length > 0,
      hasOTAMessages: data.otaMessages?.data?.length > 0,
      hasLeads: data.leads?.data?.length > 0,
      hasReviews: data.reviews?.data?.length > 0,
      counts: {
        whatsapp: data.whatsapp?.data?.length || 0,
        otaMessages: data.otaMessages?.data?.length || 0,
        leads: data.leads?.data?.length || 0,
        reviews: data.reviews?.data?.length || 0
      }
    };
  }
};
export default {
  whatsapp: whatsappApi,
  otaMessages: otaMessagesApi,
  leads: leadsApi,
  reviews: reviewsApi,
  unified: unifiedCommunicationsApi
};
