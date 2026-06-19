import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const LISTING_API = MICROSERVICE_BASE_URL.SRV_LISTING;

export interface ImageType {
  _id: string;
  sojoriName?: {
    en?: string;
    fr?: string;
    es?: string;
    ar?: string;
    [key: string]: string | undefined;
  };
  airbnbCategory?: string;
  bookingCategory?: string;
  rentalAmenityIds?: number[];
  rentalImageTypeIds?: number[];
  uiPriority?: number;
  categoryGroup?: string;
  sortOrder?: number;
}

/** Catalogue Image OTA — espaces photo actifs pour la galerie listing. */
export async function getImageOtaTypesForListing() {
  return apiClient.get(`${LISTING_API}/image-types/ota-catalog/for-listing`);
}

/** Libellés catalogue pour imageTypeId déjà assignés (orphelins RU / hors listing PM). */
export async function resolveImageOtaDisplayTypes(catalogIds: string[]) {
  const ids = [...new Set(catalogIds.map(String).filter(Boolean))]
  if (!ids.length) {
    return { data: { success: true, data: [] as ImageType[] } }
  }
  return apiClient.post(`${LISTING_API}/image-types/ota-catalog/resolve-display`, {
    catalogIds: ids,
  })
}
