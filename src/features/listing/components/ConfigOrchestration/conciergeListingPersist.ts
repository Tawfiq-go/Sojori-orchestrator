import { listingsService } from '../../../../services/listingsService';

export type ConciergeServicesSlice = {
  transportServices?: unknown[];
  groceryServices?: unknown[];
  customServices?: unknown[];
};

export type ConciergeServicesArrays = {
  transportServices: unknown[];
  groceryServices: unknown[];
  customServices: unknown[];
};

/** Read current listing_concierge_services (source of truth for WhatsApp snapshot). */
export async function fetchListingConciergeArrays(
  listingId: string,
): Promise<ConciergeServicesArrays> {
  const res = await listingsService.getListingConciergeConfig(listingId);
  const doc = (res.data || {}) as ConciergeServicesSlice;
  return {
    transportServices: Array.isArray(doc.transportServices) ? doc.transportServices : [],
    groceryServices: Array.isArray(doc.groceryServices) ? doc.groceryServices : [],
    customServices: Array.isArray(doc.customServices) ? doc.customServices : [],
  };
}

/**
 * PUT concierge-config merging with existing arrays so one tab cannot wipe another.
 * Only keys present in `slice` are updated; others are kept from Mongo.
 */
export async function persistListingConciergeSlice(
  listingId: string,
  slice: ConciergeServicesSlice,
): Promise<ConciergeServicesArrays> {
  const existing = await fetchListingConciergeArrays(listingId);
  const body: ConciergeServicesArrays = {
    transportServices:
      slice.transportServices !== undefined ? slice.transportServices : existing.transportServices,
    groceryServices:
      slice.groceryServices !== undefined ? slice.groceryServices : existing.groceryServices,
    customServices:
      slice.customServices !== undefined ? slice.customServices : existing.customServices,
  };
  const res = await listingsService.updateListingConciergeServices(listingId, body);
  if (res.error) throw new Error(res.error);
  return body;
}
