import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { displayToUpdateBody, type DisplayCleanliness } from '../utils/cleanlinessDisplay';

const TASK_BASE = MICROSERVICE_BASE_URL.SRV_TASK;

export interface CleanlinessUpdateResult {
  success: boolean;
  message?: string;
  data?: {
    listingId: string;
    occupancyStatus?: string;
    cleanlinessStatus_v2?: string;
    cleanlinessStatus?: string;
    cleanlinessEmergency?: boolean;
  };
}

class CleanlinessService {
  async updateListingStatus(
    listingId: string,
    displayStatus: DisplayCleanliness,
  ): Promise<CleanlinessUpdateResult> {
    const body = displayToUpdateBody(displayStatus);
    const response = await apiClient.patch<CleanlinessUpdateResult>(
      `${TASK_BASE}/listings/${listingId}/cleanliness-status`,
      body,
    );
    return response.data;
  }
}

export const cleanlinessService = new CleanlinessService();
export default cleanlinessService;
