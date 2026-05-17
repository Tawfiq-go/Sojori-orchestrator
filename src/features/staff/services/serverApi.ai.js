import axios from 'axios';
import { MICROSERVICE_BASE_URL } from 'config/backendServer.config';

/**
 * Get all AI configurations for all property managers
 * @returns {Promise<Array>} Array of AI configurations
 */
export async function getAIConfigs() {
  try {
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/config/all`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message || 'Failed to fetch AI configurations';
  }
}

/**
 * Get AI configuration for a specific property manager
 * @param {string} propertyManagerId - Property Manager ID (or 'global' for global config)
 * @returns {Promise<Object>} AI configuration
 */
export async function getAIConfig(propertyManagerId) {
  try {
    const id = propertyManagerId || 'global';
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/config/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message || 'Failed to fetch AI configuration';
  }
}

/**
 * Update AI configuration (enable/disable) for a property manager
 * @param {string} propertyManagerId - Property Manager ID (or 'global')
 * @param {boolean} enabled - Whether AI should be enabled
 * @returns {Promise<Object>} Update confirmation
 */
export async function updateAIConfig(propertyManagerId, enabled) {
  try {
    const response = await axios.post(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/config/update`, {
      property_manager_id: propertyManagerId === 'global' ? null : propertyManagerId,
      enabled
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message || 'Failed to update AI configuration';
  }
}

/**
 * Get AI status for a property manager
 * @param {string} propertyManagerId - Property Manager ID (or 'global')
 * @returns {Promise<Object>} AI status
 */
export async function getAIStatus(propertyManagerId) {
  try {
    const id = propertyManagerId || 'global';
    const response = await axios.get(`${MICROSERVICE_BASE_URL.SRV_CHATBOT}/config/status/${id}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message || 'Failed to fetch AI status';
  }
}
