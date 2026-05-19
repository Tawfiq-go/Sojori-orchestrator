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
  uiPriority?: number;
}

export interface ImageTypesParams {
  priority?: string; // ex: "1,2,3"
  other?: string;
}

/**
 * Récupère les types d'images Sojori depuis srv-listing
 */
export async function getImageTypesSojori(params: ImageTypesParams = {}) {
  const queryParams = new URLSearchParams();
  if (params.priority) {
    queryParams.append('priority', params.priority);
  }
  if (params.other) {
    queryParams.append('other', params.other);
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `${LISTING_API}/image-types-sojori?${queryString}`
    : `${LISTING_API}/image-types-sojori`;

  return apiClient.get(url);
}

/**
 * Met à jour un type d'image
 */
export async function updateImageTypesSojori(imageTypeId: string, formData: unknown) {
  const response = await apiClient.put(
    `${LISTING_API}/image-types-sojori/update/${imageTypeId}`,
    formData,
  );
  return response;
}

/**
 * Crée un type d'image
 */
export async function createImageTypesSojori(formData: unknown) {
  const response = await apiClient.post(`${LISTING_API}/image-types-sojori/create`, formData);
  return response;
}

/**
 * Supprime un type d'image
 */
export async function deleteImageTypesSojori(imageTypeId: string) {
  const response = await apiClient.delete(
    `${LISTING_API}/image-types-sojori/delete/${imageTypeId}`,
  );
  return response;
}
