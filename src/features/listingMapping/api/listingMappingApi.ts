import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';

const LISTING = MICROSERVICE_BASE_URL.SRV_LISTING;
const ADMIN = MICROSERVICE_BASE_URL.SRV_ADMIN;

export type LanguageRow = { _id?: string; languageCode: string; name?: string };

export type RuImageTypeRow = {
  _id: string;
  rentalImageTypeId: number;
  name: string;
  category?: string;
};

export type PropertyTypeRow = {
  _id: string;
  rentalPropertyTypeId?: number;
  name: string;
  manageRoomType?: boolean;
};

export async function fetchRuImageTypes(): Promise<RuImageTypeRow[]> {
  const res = await apiClient.get(`${LISTING}/image-types`);
  return (res.data?.data as RuImageTypeRow[]) || [];
}

export async function syncImageTypesFromRu(): Promise<void> {
  await apiClient.get(`${LISTING}/image-types/fetch-image-types-from-ru`);
}

export async function fetchPropertyTypes(): Promise<PropertyTypeRow[]> {
  const res = await apiClient.get(`${LISTING}/propertyTypes`);
  return (res.data?.data as PropertyTypeRow[]) || [];
}

export async function syncPropertyTypesFromRu(): Promise<void> {
  await apiClient.get(`${LISTING}/propertyTypes/fetch-property-types-from-ru`);
}

export async function fetchLanguages(): Promise<LanguageRow[]> {
  const res = await apiClient.get(
    `${ADMIN}/language?page=0&limit=50&paged=false&search_text=`,
  );
  const body = res.data;
  if (Array.isArray(body)) return body as LanguageRow[];
  if (Array.isArray(body?.data)) return body.data as LanguageRow[];
  return [];
}

export type AmenityCatalogCategoryRow = {
  _id: string;
  nameFr: string;
  nameEn: string;
  isBasicEquipment: boolean;
  sortOrder: number;
  source: string;
};

export type RuIdDetailRow = { rentalAmenityId: number; nameEn: string };

export type AmenityCatalogMappingRow = {
  _id: string;
  rentalAmenityIds: number[];
  ruIdDetails?: RuIdDetailRow[];
  nameRu: string;
  nameSojoriFr: string;
  nameSojoriEn: string;
  airbnb: { enabled: boolean; nameEn: string };
  booking: { enabled: boolean; nameEn: string };
  vrbo: { enabled: boolean; nameEn: string };
  categoryId?: string | AmenityCatalogCategoryRow;
  isBasicEquipment: boolean;
  categoryAirbnb: string;
  categoryBooking: string;
  categoryVrbo: string;
  categorySojori: string;
  enabledForListing: boolean;
  source: string;
  sortOrder: number;
  /** false = orphelin RU / hôtel — switch Listing désactivé */
  listingManageable?: boolean;
};

export type AmenityCatalogMappingFilter =
  | 'all'
  | 'curated'
  | 'to-enrich'
  | 'airbnb'
  | 'booking'
  | 'vrbo'
  | 'listing'
  | 'ru-orphan'
  | 'basic';

export async function fetchAmenityCatalogCategories(): Promise<AmenityCatalogCategoryRow[]> {
  const res = await apiClient.get(`${LISTING}/amenities/catalog-categories`);
  return (res.data?.data as AmenityCatalogCategoryRow[]) || [];
}

export async function fetchAmenityCatalogMappings(
  options: { filter?: AmenityCatalogMappingFilter; categoryId?: string } = {},
): Promise<AmenityCatalogMappingRow[]> {
  const params = new URLSearchParams();
  if (options.filter && options.filter !== 'all') params.set('filter', options.filter);
  if (options.categoryId) params.set('categoryId', options.categoryId);
  const qs = params.toString();
  const res = await apiClient.get(`${LISTING}/amenities/catalog-mapping${qs ? `?${qs}` : ''}`);
  return (res.data?.data as AmenityCatalogMappingRow[]) || [];
}

/** Même périmètre que le formulaire listing PM (catalog-for-listing). */
export async function fetchListingCatalogEligible(): Promise<{
  categories: Array<{
    _id: string;
    nameFr: string;
    amenities: Array<{ _id: string; catalogMappingId?: string }>;
  }>;
  total: number;
  listingIds: Set<string>;
  countByCategoryId: Map<string, number>;
}> {
  const res = await apiClient.get(`${LISTING}/amenities/catalog-for-listing`);
  const categories = (res.data?.categories as Array<{
    _id: string;
    nameFr: string;
    amenities: Array<{ _id: string; catalogMappingId?: string }>;
  }>) || [];
  const listingIds = new Set<string>();
  const countByCategoryId = new Map<string, number>();
  for (const cat of categories) {
    const n = cat.amenities?.length ?? 0;
    countByCategoryId.set(cat._id, n);
    for (const a of cat.amenities || []) {
      listingIds.add(String(a._id));
    }
  }
  const total = Number(res.data?.total) || listingIds.size;
  return { categories, total, listingIds, countByCategoryId };
}

export async function updateAmenityCatalogMapping(
  id: string,
  patch: Partial<AmenityCatalogMappingRow>,
): Promise<AmenityCatalogMappingRow> {
  const res = await apiClient.patch(`${LISTING}/amenities/catalog-mapping/${id}`, patch);
  return res.data?.data as AmenityCatalogMappingRow;
}

export async function seedAmenityCatalogMappings(): Promise<{
  categoryRows: number;
  airbnbRows: number;
  orphanRows: number;
  totalRu: number;
  claimedRuIds: number;
}> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/seed`);
  return res.data?.data;
}

export async function enrichBookingCatalogMappings(): Promise<{ updated: number }> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/enrich-booking`);
  return res.data?.data;
}

export type EnrichOtaChannelsResult = {
  curatedUpdated: number;
  bookingEnabled: number;
  vrboEnabled: number;
  essentialsPromoted: number;
  bookingOnlyPromoted: number;
  channelCounts: Record<string, number>;
};

export type BootstrapAmenityCatalogResult = {
  seed: {
    categoryRows: number;
    airbnbRows: number;
    orphanRows: number;
    totalRu: number;
    claimedRuIds: number;
  };
  merge: {
    rowsUpdated: number;
    idsMerged: number;
    orphansRemoved: number;
    orphansReset: number;
  };
  ota: EnrichOtaChannelsResult;
  curatedTotal: number;
  categories: {
    updated: number;
    stillOrphanCategory: number;
  };
};

export async function assignAirbnbCategoriesCatalogMappings(): Promise<{
  updated: number;
  stillOrphanCategory: number;
}> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/assign-categories`);
  return res.data?.data;
}

export type PmListingModelResult = {
  enabledTotal: number;
  airbnbFirstEnabled: number;
  ruOrphanEnabled: number;
  excludedHotel: Array<{ nameSojoriEn: string; nameRu: string; source: string }>;
  excludedPolicy: number;
  categoryNeedsReview: Array<{ nameSojoriEn: string; _id: string }>;
  multiIdPmLines: Array<{ nameSojoriEn: string; rentalAmenityIds: number[] }>;
  trimmedRuOrphans: number;
};

export async function selectPmListingModelCatalog(): Promise<PmListingModelResult> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/select-pm-model`);
  return res.data?.data;
}

export async function bootstrapAmenityCatalogMappings(options?: {
  syncRu?: boolean;
}): Promise<BootstrapAmenityCatalogResult> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/bootstrap`, options || {});
  return res.data?.data;
}

export async function enrichOtaChannelsCatalogMappings(): Promise<EnrichOtaChannelsResult> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/enrich-ota-channels`);
  return res.data?.data;
}

export async function mergeOtaRuIdsCatalogMappings(): Promise<{
  rowsUpdated: number;
  idsMerged: number;
  orphansRemoved: number;
  orphansReset: number;
}> {
  const res = await apiClient.post(`${LISTING}/amenities/catalog-mapping/merge-ota-ru-ids`);
  return res.data?.data;
}

// ─── Image OTA catalog (srv-listing /image-types/ota-catalog) ───────────────

export type ImageOtaCatalogCategoryRow = {
  _id: string;
  nameFr: string;
  nameEn: string;
  sortOrder: number;
  source: string;
};

export type RuImageIdDetailRow = { rentalImageTypeId: number; nameEn: string };

export type ImageOtaCatalogMappingRow = {
  _id: string;
  rentalImageTypeIds: number[];
  ruIdDetails?: RuImageIdDetailRow[];
  nameRu: string;
  nameSojoriFr: string;
  nameSojoriEn: string;
  airbnb: { enabled: boolean; nameEn: string };
  booking: { enabled: boolean; nameEn: string };
  vrbo: { enabled: boolean; nameEn: string };
  categoryId?: string | ImageOtaCatalogCategoryRow;
  categoryAirbnb: string;
  categoryBooking: string;
  categoryVrbo: string;
  categorySojori: string;
  enabledForListing: boolean;
  source: string;
  sortOrder: number;
  listingManageable?: boolean;
};

export type ImageOtaCatalogMappingFilter =
  | 'all'
  | 'curated'
  | 'to-enrich'
  | 'airbnb'
  | 'booking'
  | 'vrbo'
  | 'listing'
  | 'ru-orphan';

export async function fetchImageOtaCatalogCategories(): Promise<ImageOtaCatalogCategoryRow[]> {
  const res = await apiClient.get(`${LISTING}/image-types/ota-catalog/categories`);
  return (res.data?.data as ImageOtaCatalogCategoryRow[]) || [];
}

export async function fetchImageOtaCatalogMappings(
  options: { filter?: ImageOtaCatalogMappingFilter; categoryId?: string } = {},
): Promise<ImageOtaCatalogMappingRow[]> {
  const params = new URLSearchParams();
  if (options.filter && options.filter !== 'all') params.set('filter', options.filter);
  if (options.categoryId) params.set('categoryId', options.categoryId);
  const qs = params.toString();
  const res = await apiClient.get(`${LISTING}/image-types/ota-catalog/mapping${qs ? `?${qs}` : ''}`);
  return (res.data?.data as ImageOtaCatalogMappingRow[]) || [];
}

export async function updateImageOtaCatalogMapping(
  id: string,
  patch: Partial<ImageOtaCatalogMappingRow>,
): Promise<ImageOtaCatalogMappingRow> {
  const res = await apiClient.patch(`${LISTING}/image-types/ota-catalog/mapping/${id}`, patch);
  return res.data?.data as ImageOtaCatalogMappingRow;
}

export async function bootstrapImageOtaCatalogMappings(options?: {
  syncRu?: boolean;
}): Promise<{
  seed: {
    categoryRows: number;
    airbnbRows: number;
    orphanRows: number;
    totalRu: number;
    claimedRuIds: number;
  };
  merge: { rowsUpdated: number; idsMerged: number };
  curatedTotal: number;
}> {
  const res = await apiClient.post(`${LISTING}/image-types/ota-catalog/mapping/bootstrap`, options || {});
  return res.data?.data;
}

export type PmImageListingModelResult = {
  enabledTotal: number;
  airbnbFirstEnabled: number;
  airbnbEnabledTotal: number;
  ruOrphanEnabled: number;
  skippedNoLabel: number;
};

export async function selectPmImageListingModelCatalog(): Promise<PmImageListingModelResult> {
  const res = await apiClient.post(`${LISTING}/image-types/ota-catalog/mapping/select-pm-model`);
  return res.data?.data;
}
