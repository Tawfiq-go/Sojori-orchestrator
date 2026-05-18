/**
 * API Client pour la gestion des sources de données AI.
 * Permet de visualiser et modifier ai_data_sources.json depuis le Dashboard Admin.
 */

import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
const API_BASE = `${MICROSERVICE_BASE_URL.SRV_CHATBOT}/data-sources`;

/**
 * Récupère la configuration complète des sources de données.
 * @returns {Promise<Object>} Configuration complète
 */
export const getFullConfig = async () => {
  try {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Récupère toutes les sources de données configurées.
 * @returns {Promise<Object>} Liste des sources
 */
export const getAllSources = async () => {
  try {
    const response = await fetch(`${API_BASE}/sources`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Récupère une source de données spécifique.
 * @param {string} sourceName - Nom de la source
 * @returns {Promise<Object>} Configuration de la source
 */
export const getSource = async sourceName => {
  try {
    const response = await fetch(`${API_BASE}/sources/${sourceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Met à jour une source de données.
 * @param {string} sourceName - Nom de la source
 * @param {Object} updateData - Données à mettre à jour
 * @returns {Promise<Object>} Résultat de la mise à jour
 */
export const updateSource = async (sourceName, updateData) => {
  try {
    const response = await fetch(`${API_BASE}/sources/${sourceName}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Active/désactive une source de données.
 * @param {string} sourceName - Nom de la source
 * @returns {Promise<Object>} Nouveau statut de la source
 */
export const toggleSource = async sourceName => {
  try {
    const response = await fetch(`${API_BASE}/sources/${sourceName}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Récupère tous les providers configurés.
 * @returns {Promise<Object>} Liste des providers
 */
export const getAllProviders = async () => {
  try {
    const response = await fetch(`${API_BASE}/providers`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Récupère les statistiques sur les sources de données.
 * @returns {Promise<Object>} Statistiques
 */
export const getStats = async () => {
  try {
    const response = await fetch(`${API_BASE}/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Liste tous les fichiers de backup disponibles.
 * @returns {Promise<Object>} Liste des backups
 */
export const listBackups = async () => {
  try {
    const response = await fetch(`${API_BASE}/backups`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};

/**
 * Vide le cache du AIDataProviderService.
 * @returns {Promise<Object>} Confirmation
 */
export const clearCache = async () => {
  try {
    const response = await fetch(`${API_BASE}/clear-cache`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    throw error;
  }
};
