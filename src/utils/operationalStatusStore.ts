export type OperationalStatusPatch = {
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessEmergency?: boolean;
};

export const OPERATIONAL_STATUS_CHANGED = 'sojori:listing-operational-status-changed';

const patches = new Map<string, OperationalStatusPatch>();

export function applyOperationalStatusPatch(
  listingId: string,
  patch: OperationalStatusPatch,
): OperationalStatusPatch {
  const id = String(listingId || '').trim();
  if (!id) return patch;
  const merged = { ...patches.get(id), ...patch };
  patches.set(id, merged);
  console.log('[operationalStatusStore] patch applied', { listingId: id, patch, merged });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(OPERATIONAL_STATUS_CHANGED, {
        detail: { listingId: id, patch: merged },
      }),
    );
  }
  return merged;
}

/** Listing (srv-listing) prime sur toute copie legacy (srv-task, cache planning). */
export function mergeListingOperationalRow<T extends OperationalStatusPatch>(
  listingId: string,
  listing: OperationalStatusPatch,
  fallback?: Record<string, unknown>,
): T {
  const listingSoT: OperationalStatusPatch = {};
  if (listing.occupancyStatus) listingSoT.occupancyStatus = listing.occupancyStatus;
  if (listing.cleanlinessStatus_v2) listingSoT.cleanlinessStatus_v2 = listing.cleanlinessStatus_v2;
  if (listing.cleanlinessEmergency != null) {
    listingSoT.cleanlinessEmergency = listing.cleanlinessEmergency;
  }
  return mergeOperationalStatusFields(listingId, {
    ...(fallback || {}),
    ...listingSoT,
  } as T);
}

export function getOperationalStatusPatch(listingId: string): OperationalStatusPatch | undefined {
  const id = String(listingId || '').trim();
  if (!id) return undefined;
  return patches.get(id);
}

export function mergeOperationalStatusFields<T extends OperationalStatusPatch>(
  listingId: string,
  row: T,
): T {
  const patch = getOperationalStatusPatch(listingId);
  if (!patch) return row;
  return {
    ...row,
    ...(patch.occupancyStatus != null ? { occupancyStatus: patch.occupancyStatus } : {}),
    ...(patch.cleanlinessStatus_v2 != null
      ? { cleanlinessStatus_v2: patch.cleanlinessStatus_v2 }
      : {}),
    ...(patch.cleanlinessEmergency != null
      ? { cleanlinessEmergency: patch.cleanlinessEmergency }
      : {}),
  };
}
