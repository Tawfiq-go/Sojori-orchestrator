import type { ProcessedInventoryData } from './processInventoryResponse';

/** Fusionne un chunk inventaire dans l’existant (jours / roomTypes). */
export function mergeProcessedInventory(
  base: ProcessedInventoryData,
  chunk: ProcessedInventoryData,
): ProcessedInventoryData {
  if (!chunk || Object.keys(chunk).length === 0) return base;
  const out: ProcessedInventoryData = { ...base };

  for (const [listingId, roomTypes] of Object.entries(chunk)) {
    const prevListing = out[listingId] || {};
    const nextListing: ProcessedInventoryData[string] = { ...prevListing };

    for (const [rtId, rt] of Object.entries(roomTypes || {})) {
      const prevRt = nextListing[rtId];
      nextListing[rtId] = {
        name: rt.name || prevRt?.name,
        availability: {
          ...(prevRt?.availability || {}),
          ...(rt.availability || {}),
        },
      };
    }

    out[listingId] = nextListing;
  }

  return out;
}
