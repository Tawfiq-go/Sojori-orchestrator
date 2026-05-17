/**
 * WhatsApp API Service - Optimisé et moderne
 * Direct access to srv-chatbot endpoints
 */

import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
const BASE_URL = `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/debug`;

/**
 * API WhatsApp optimisée
 */
export const whatsappApiOptimized = {
  /**
   * Récupérer liste des conversations
   * @param {Object} params - { limit, skip, filter, search }
   * @returns {Promise} Liste conversations avec total
   */
  getConversations: async (params = {}) => {
    try {
      const response = await axios.get(`${BASE_URL}/conversations`, {
        params: {
          limit: params.limit || 50,
          skip: params.skip || 0,
          filter: params.filter || 'recent',
          // recent = tri par date décroissante
          search: params.search || undefined
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Récupérer messages d'une conversation
   * @param {string} phone - Numéro de téléphone
   * @param {number} limit - Nombre de messages (défaut: 300)
   * @returns {Promise} Messages groupés en exchanges
   */
  getMessages: async (phone, limit = 300) => {
    try {
      const response = await axios.get(`${BASE_URL}/conversations/${phone}`, {
        params: {
          limit
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
  /**
   * Envoyer un message WhatsApp
   * @param {string} phone - Numéro de téléphone
   * @param {string} message - Contenu du message
   * @returns {Promise} Confirmation avec message_id
   */
  sendMessage: async (phone, message) => {
    try {
      const response = await axios.post(`${BASE_URL}/send-message`, {
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
  /**
   * Rechercher conversations par numéro de réservation
   * @param {string} reservationNumber - Numéro de réservation (ex: SJ-XXX)
   * @returns {Promise} Conversations matching
   */
  searchByReservation: async reservationNumber => {
    try {
      const response = await axios.get(`${BASE_URL}/conversations`, {
        params: {
          limit: 20,
          skip: 0,
          search: reservationNumber
        }
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};
export default whatsappApiOptimized;
