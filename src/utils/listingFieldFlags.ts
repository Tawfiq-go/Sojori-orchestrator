/**
 * Flags champs listing (structure admin) — R = RU, * = obligatoire annonce.
 * Aligné sojori-dashboard listingFieldFlags.js
 */

export type ListingStructureField = {
  name?: string;
  ru?: boolean;
  listingRequired?: boolean;
  ruRequired?: boolean;
};

export type ListingStructureDoc = {
  listingMappings?: Array<{
    tab?: string;
    fields?: ListingStructureField[];
  }>;
};

export function isListingFieldRu(field: ListingStructureField | null | undefined): boolean {
  return Boolean(field && typeof field === 'object' && field.ru === true);
}

export function isListingFieldRequired(field: ListingStructureField | null | undefined): boolean {
  if (!field || typeof field !== 'object') return false;
  if (field.listingRequired === true) return true;
  if (field.ruRequired === true) return true;
  return false;
}

export const LISTING_DESCRIPTION_FIELDS_SENT_TO_RU = [
  'description',
  'space',
  'access',
  'interaction',
  'neighborhood',
  'notes',
  'houseRules',
  'headline',
  'whyPurchased',
  'ownerListingStory',
  'wiFiName',
  'additionalInfo',
  'locationDesc',
];

const DESCRIPTION_RU_SET = new Set(LISTING_DESCRIPTION_FIELDS_SENT_TO_RU);

export function isListingDescriptionFieldSyncedToRu(fieldName: string | undefined): boolean {
  return typeof fieldName === 'string' && DESCRIPTION_RU_SET.has(fieldName);
}

export function findListingStructureField(
  listingStructure: ListingStructureDoc | null | undefined,
  fieldName: string,
): ListingStructureField | null {
  if (!listingStructure?.listingMappings) return null;
  for (const mapping of listingStructure.listingMappings) {
    const hit = mapping.fields?.find((f) => f.name === fieldName);
    if (hit) return hit;
  }
  return null;
}
