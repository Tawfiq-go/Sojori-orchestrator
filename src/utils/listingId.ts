/** True when id is a persisted srv-listing MongoDB ObjectId (24 hex). */
export function isPersistedListingId(id?: string | null): boolean {
  return typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id.trim());
}

/** Alias explicite pour champs optionnels (roomTypeConfigId, languageId, …). */
export const isMongoObjectId = isPersistedListingId;
