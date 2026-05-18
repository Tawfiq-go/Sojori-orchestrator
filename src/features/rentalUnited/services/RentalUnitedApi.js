import apiClient from '../../../config/axios';
import { MICROSERVICE_BASE_URL } from '../../../config/backendServer.config';

export const RentalUnitedApi = {
  async getUserToken(ownerId, languageId) {
    try {
      const response = await apiClient.get(
        `${MICROSERVICE_BASE_URL.SRV_USER}/rentals-white-label/get-user-token/${ownerId}?languageId=${languageId}`,
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  }
};

export default RentalUnitedApi;

