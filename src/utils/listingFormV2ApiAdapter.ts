/**
 * Pont entre document GET /listings/by-id (legacy) et état plat ListingFormV2.
 */

type UnknownRecord = Record<string, unknown>;

const DESC_LANG_UI = ['🇫🇷 FR', '🇬🇧 EN', '🇪🇸 ES', '🇮🇹 IT'] as const;
export type DescLangUi = (typeof DESC_LANG_UI)[number];

/** languageRuId RU courants (dashboard) */
const LANG_RU_BY_UI: Record<DescLangUi, string> = {
  '🇫🇷 FR': '4',
  '🇬🇧 EN': '1',
  '🇪🇸 ES': '2',
  '🇮🇹 IT': '3',
};

function isRecord(v: unknown): v is UnknownRecord {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function firstRoomType(raw: UnknownRecord): UnknownRecord {
  const rts = raw.roomTypes;
  if (!Array.isArray(rts) || rts.length === 0) return {};
  return isRecord(rts[0]) ? rts[0] : {};
}

function propertyTypeToUi(api: unknown): string {
  const v = asString(api);
  if (v === 'Apartment') return 'Appartement';
  if (v === 'House') return 'Maison';
  return v || 'Villa';
}

function propertyTypeToApi(ui: unknown): string {
  const v = asString(ui);
  if (v === 'Appartement') return 'Apartment';
  if (v === 'Maison') return 'House';
  return v || 'Apartment';
}

function cloneDescriptionArray(raw: unknown): UnknownRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => (isRecord(item) ? { ...item } : {}));
}

export function findDescIndexForLang(
  descriptions: UnknownRecord[],
  langUi: DescLangUi,
): number {
  const ru = LANG_RU_BY_UI[langUi];
  let idx = descriptions.findIndex(
    (d) => asString(d.languageRuId) === ru || asString(d.languageRuId) === String(Number(ru)),
  );
  if (idx >= 0) return idx;
  const order = DESC_LANG_UI.indexOf(langUi);
  if (order >= 0 && order < descriptions.length) return order;
  return descriptions.length > 0 ? 0 : -1;
}

export function getDescEntryForLang(
  descriptions: UnknownRecord[],
  langUi: DescLangUi,
): UnknownRecord {
  const idx = findDescIndexForLang(descriptions, langUi);
  if (idx >= 0) return descriptions[idx];
  return {};
}

/**
 * Charge le formulaire V2 depuis le document listing brut.
 */
export function mapApiToFormV2Values(raw: UnknownRecord): UnknownRecord {
  const rt = firstRoomType(raw);
  const descriptions = cloneDescriptionArray(raw.description);
  const descLang: DescLangUi = '🇫🇷 FR';
  const fr = getDescEntryForLang(descriptions, descLang);

  console.log('🔵 [mapApiToFormV2Values] Mapping listing data', {
    hasListingImages: Array.isArray(raw.listingImages),
    listingImagesCount: Array.isArray(raw.listingImages) ? raw.listingImages.length : 0,
    listingImages: raw.listingImages
  });

  return {
    ...raw,
    name: asString(raw.name),
    propertyType: propertyTypeToUi(raw.propertyType),
    propertyUnit: asString(raw.propertyUnit) || 'Single',
    bedrooms: asNumber(rt.bedroomsNumber) ?? asNumber(raw.bedroomsNumber),
    bathrooms: asNumber(rt.bathroomsNumber) ?? asNumber(raw.bathroomsNumber),
    guests:
      asNumber(rt.personCapacityMax) ??
      asNumber(raw.personCapacityMax) ??
      asNumber(rt.personCapacity),
    personCapacity: asNumber(rt.personCapacity),
    personCapacityMax:
      asNumber(rt.personCapacityMax) ?? asNumber(raw.personCapacityMax),
    beds: asNumber(rt.bedsNumber) ?? asNumber(raw.bedsNumber),
    sqm: asNumber(rt.surface) ?? asNumber(raw.surface),
    floor: asNumber(raw.floor),
    totalFloor: asNumber(raw.totalFloor),
    roomTypeConfigId: asString(rt.roomTypeConfigId),
    description: descriptions,
    _descLang: descLang,
    shortDescription: asString(fr.headline),
    longDescription: asString(fr.value),
    airbnbSummary: asString(raw.airbnbSummary),
    listingImages: Array.isArray(raw.listingImages) ? raw.listingImages : [],
    airbnbHeroOrder: asString(raw.airbnbHeroOrder),
    active: raw.active !== false,
    staging: raw.staging === true,
    instantBooking: raw.instantBookable === true,
    otaOnly: raw.otaOnly === true,
  };
}

/**
 * Fusionne les champs édités du formulaire V2 dans le payload PUT update-property.
 */
export function mergeFormV2ToUpdatePropertyPayload(
  values: UnknownRecord,
): UnknownRecord {
  const descriptions = cloneDescriptionArray(values.description);
  const descLang = (asString(values._descLang) || '🇫🇷 FR') as DescLangUi;
  let idx = findDescIndexForLang(descriptions, descLang);

  const patchHeadline = asString(values.shortDescription);
  const patchValue = asString(values.longDescription);

  if (idx >= 0) {
    descriptions[idx] = {
      ...descriptions[idx],
      headline: patchHeadline,
      value: patchValue,
    };
  } else if (patchHeadline || patchValue) {
    descriptions.push({
      languageRuId: LANG_RU_BY_UI[descLang],
      languageId: '',
      headline: patchHeadline,
      value: patchValue,
    });
  }

  const roomTypes = Array.isArray(values.roomTypes)
    ? values.roomTypes.map((rt, i) => {
        const row = isRecord(rt) ? { ...rt } : {};
        if (i === 0) {
          if (values.bedrooms != null) row.bedroomsNumber = values.bedrooms;
          if (values.bathrooms != null) row.bathroomsNumber = values.bathrooms;
          if (values.personCapacity != null) row.personCapacity = values.personCapacity;
          if (values.personCapacityMax != null) {
            row.personCapacityMax = values.personCapacityMax;
          } else if (values.guests != null) {
            row.personCapacityMax = values.guests;
          }
          if (values.guests != null && values.personCapacity == null) {
            row.personCapacity = values.guests;
          }
          if (values.beds != null) row.bedsNumber = values.beds;
          if (values.sqm != null) row.surface = values.sqm;
          if (values.roomTypeConfigId != null) {
            row.roomTypeConfigId = values.roomTypeConfigId;
          }
        }
        return row;
      })
    : undefined;

  const payload: UnknownRecord = {
    name: values.name,
    description: descriptions,
    propertyUnit: values.propertyUnit,
    propertyType: propertyTypeToApi(values.propertyType),
    active: values.active,
    staging: values.staging,
    instantBookable: values.instantBooking,
    floor: values.floor,
    totalFloor: values.totalFloor,
    surface: values.sqm,
    personCapacityMax: values.personCapacityMax ?? values.guests,
  };

  if (roomTypes) payload.roomTypes = roomTypes;
  if (values.airbnbSummary != null) payload.airbnbSummary = values.airbnbSummary;
  if (Array.isArray(values.listingImages)) {
    console.log('🔵 [mergeFormV2ToUpdatePropertyPayload] Saving listingImages', {
      count: values.listingImages.length,
      images: values.listingImages
    });
    payload.listingImages = values.listingImages;
  }
  if (values.airbnbHeroOrder != null) payload.airbnbHeroOrder = values.airbnbHeroOrder;

  if (Array.isArray(values.listingAmenitiesIds)) {
    payload.listingAmenitiesIds = values.listingAmenitiesIds
      .map((row) => {
        const r = isRecord(row) ? row : {};
        const id = asString(r._id);
        if (!id) return null;
        return { _id: id, count: asNumber(r.count) ?? 1 };
      })
      .filter(Boolean);
  }

  return payload;
}

export { DESC_LANG_UI, LANG_RU_BY_UI };
