import apiClient from '../../../config/axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';
import { formatRuError } from '../utils/formatRuError';

export const RentalUnitedApi = {
  async getUserToken(ownerId, languageId, force = false) {
    if (!ownerId) {
      throw new Error('Owner requis pour le widget Rental United');
    }
    const base = MICROSERVICE_BASE_URL?.SRV_USER;
    if (!base) {
      throw new Error('URL srv-user non configurée (MICROSERVICE_BASE_URL.SRV_USER)');
    }
    try {
      const forceQ = force ? '&force=1' : '';
      const response = await apiClient.get(
        `${base}/rentals-white-label/get-user-token/${ownerId}?languageId=${languageId}${forceQ}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(formatRuError(error, 'Échec récupération token Rental United'));
    }
  },
};

export default RentalUnitedApi;
