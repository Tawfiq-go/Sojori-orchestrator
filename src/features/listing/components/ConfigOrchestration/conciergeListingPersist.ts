import { listingsService } from '../../../../services/listingsService';

export type ConciergeServicesSlice = {
  transportServices?: unknown[];
  groceryServices?: unknown[];
  customServices?: unknown[];
  conciergeSource?: 'own' | 'partner';
  /** Toujours null côté owner — Sojori résout par ville. */
  conciergePartnerId?: string | null;
  /** Ids PartnerService cochés sur le listing (absent / [] = aucune expérience guest). */
  enabledExperienceIds?: string[];
};

export type ConciergeServicesArrays = {
  transportServices: unknown[];
  groceryServices: unknown[];
  customServices: unknown[];
  conciergeSource?: 'own' | 'partner';
  conciergePartnerId?: string | null;
  enabledExperienceIds?: string[] | null;
};

/** Read current listing_concierge_services (source of truth for WhatsApp snapshot). */
export async function fetchListingConciergeArrays(
  listingId: string,
): Promise<ConciergeServicesArrays> {
  const res = await listingsService.getListingConciergeConfig(listingId);
  const doc = (res.data || {}) as ConciergeServicesSlice & {
    enabledExperienceIds?: unknown;
  };
  const enabledRaw = doc.enabledExperienceIds;
  const enabledExperienceIds =
    enabledRaw === undefined || enabledRaw === null
      ? []
      : (Array.isArray(enabledRaw) ? enabledRaw : []).map(String).filter(Boolean);
  return {
    transportServices: Array.isArray(doc.transportServices) ? doc.transportServices : [],
    groceryServices: Array.isArray(doc.groceryServices) ? doc.groceryServices : [],
    customServices: Array.isArray(doc.customServices) ? doc.customServices : [],
    conciergeSource: doc.conciergeSource === 'partner' ? 'partner' : 'own',
    conciergePartnerId: doc.conciergePartnerId ?? null,
    enabledExperienceIds,
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
  const body: ConciergeServicesSlice = {
    transportServices:
      slice.transportServices !== undefined ? slice.transportServices : existing.transportServices,
    groceryServices:
      slice.groceryServices !== undefined ? slice.groceryServices : existing.groceryServices,
    customServices:
      slice.customServices !== undefined ? slice.customServices : existing.customServices,
  };
  if (slice.conciergeSource !== undefined) {
    body.conciergeSource = slice.conciergeSource;
    body.conciergePartnerId =
      slice.conciergeSource === 'partner' ? (slice.conciergePartnerId ?? null) : null;
  } else if (slice.conciergePartnerId !== undefined) {
    body.conciergePartnerId = slice.conciergePartnerId;
  }
  if (slice.enabledExperienceIds !== undefined) {
    body.enabledExperienceIds = slice.enabledExperienceIds;
  }
  const res = await listingsService.updateListingConciergeServices(listingId, body);
  if (res.error) throw new Error(res.error);
  return {
    transportServices: body.transportServices as unknown[],
    groceryServices: body.groceryServices as unknown[],
    customServices: body.customServices as unknown[],
    conciergeSource: body.conciergeSource ?? existing.conciergeSource,
    conciergePartnerId: body.conciergePartnerId ?? null,
    enabledExperienceIds:
      body.enabledExperienceIds !== undefined
        ? body.enabledExperienceIds
        : existing.enabledExperienceIds,
  };
}
