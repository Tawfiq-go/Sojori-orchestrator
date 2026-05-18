import apiClient from './apiClient';

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
    ? `/listing/image-types-sojori?${queryString}`
    : '/listing/image-types-sojori';

  const response = await apiClient.get(url);
  return response;
}

/**
 * Met à jour un type d'image
 */
export async function updateImageTypesSojori(imageTypeId: string, formData: any) {
  const response = await apiClient.put(`/listing/image-types-sojori/update/${imageTypeId}`, formData);
  return response.data;
}

/**
 * Crée un nouveau type d'image
 */
export async function createImageTypesSojori(formData: any) {
  const response = await apiClient.post('/listing/image-types-sojori/create', formData);
  return response.data;
}

/**
 * Supprime un type d'image
 */
export async function deleteImageTypesSojori(imageTypeId: string) {
  const response = await apiClient.delete(`/listing/image-types-sojori/delete/${imageTypeId}`);
  return response.data;
}
