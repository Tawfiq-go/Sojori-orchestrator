import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { displayToUpdateBody, type DisplayCleanliness } from '../utils/cleanlinessDisplay';
import { applyOperationalStatusPatch } from '../utils/operationalStatusStore';

const LISTING_BASE = MICROSERVICE_BASE_URL.SRV_LISTING;

export interface CleanlinessUpdateResult {
  success: boolean;
  message?: string;
  data?: {
    listingId: string;
    occupancyStatus?: string;
    cleanlinessStatus_v2?: string;
    dirtySince?: string | null;
    cleanlinessEmergency?: boolean;
  };
}

class CleanlinessService {
  async updateListingStatus(
    listingId: string,
    displayStatus: DisplayCleanliness,
  ): Promise<CleanlinessUpdateResult> {
    const body = displayToUpdateBody(displayStatus);
    const url = `${LISTING_BASE}/listings/${listingId}/operational-status`;
    console.log('[cleanlinessService] PATCH operational-status', { listingId, displayStatus, body, url });
    const response = await apiClient.patch<CleanlinessUpdateResult>(url, body);
    const result = response.data;
    console.log('[cleanlinessService] PATCH response', {
      listingId,
      success: result.success,
      data: result.data,
      message: result.message,
    });
    if (result.success && result.data) {
      applyOperationalStatusPatch(listingId, {
        occupancyStatus: result.data.occupancyStatus,
        cleanlinessStatus_v2: result.data.cleanlinessStatus_v2,
        cleanlinessEmergency: result.data.cleanlinessEmergency,
      });
    }
    return result;
  }
}

export const cleanlinessService = new CleanlinessService();
export default cleanlinessService;
