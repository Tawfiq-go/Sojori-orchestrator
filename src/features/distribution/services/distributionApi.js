import axios from 'axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
import { getToken } from '../../../utils/auth.utils';

const BASE_RU = `${MICROSERVICE_BASE_URL.SRV_LISTING}/ru/distribution`;
const BASE_LISTING = MICROSERVICE_BASE_URL.SRV_LISTING;

/** Backend appelle plusieurs APIs RU (canaux) avec délais → timeout large */
const OVERVIEW_TIMEOUT_MS = 60000;

function authHeaders() {
  const token = typeof getToken === 'function' ? getToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const distributionApi = {
  getOverview: (ownerId) =>
    axios
      .get(`${BASE_RU}/overview`, {
        params: ownerId ? { ownerId } : {},
        headers: authHeaders(),
        timeout: 15000,
      })
      .then((r) => r.data),

  /**
   * Chargement en arrière-plan : statut par canal (ne bloque pas l’affichage).
   * Les 4xx (ex. 400 « owner sans credentials RU ») ne rejettent pas la promesse : évite la trace rouge Axios dans la console.
   */
  getStatus: (ownerId) =>
    axios
      .get(`${BASE_RU}/status`, {
        params: ownerId ? { ownerId } : {},
        headers: authHeaders(),
        timeout: OVERVIEW_TIMEOUT_MS,
        validateStatus: (status) => status < 500,
      })
      .then((r) => r.data),

  saveSyncSettings: (listingId, settings) =>
    axios.put(`${BASE_RU}/sync-settings/${listingId}`, settings, { headers: authHeaders() }).then((r) => r.data),

  getSyncSettings: (listingId) =>
    axios.get(`${BASE_LISTING}/listings/${listingId}`, { headers: authHeaders() }).then((r) => r.data?.data?.distribution),

  getMCQStatus: (propertyId) =>
    axios.get(`${BASE_RU}/mcq/${propertyId}`, { headers: authHeaders() }).then((r) => r.data),

  updateMarkup: (propertyId, { channelId, percent }) =>
    axios.put(`${BASE_RU}/markup/${propertyId}`, { channelId, percent }, { headers: authHeaders() }).then((r) => r.data),

  toggleChannel: (propertyId, { channelId, active }) =>
    axios.put(`${BASE_RU}/toggle/${propertyId}`, { channelId, active }, { headers: authHeaders() }).then((r) => r.data),

  orderMcqCheck: (propertyId) =>
    axios.post(`${BASE_RU}/mcq-check/${propertyId}`, {}, { headers: authHeaders() }).then((r) => r.data),
};
