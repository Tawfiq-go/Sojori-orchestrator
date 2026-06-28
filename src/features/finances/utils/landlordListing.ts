import type { LandlordAccount } from '../types';

/** Nombre d'annonces rattachées (source : `listingIds` sur le compte propriétaire). */
export function landlordListingCount(landlord: LandlordAccount): number {
  return (landlord.listingIds || []).length;
}
