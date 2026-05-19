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

/** Aligné dashboard `cleanMediaData` — URLs GCS + métadonnées pour update-property. */
export function cleanListingImagesForPayload(images: unknown): UnknownRecord[] {
  if (!Array.isArray(images)) return [];
  return images
    .map((image) => {
      const row = isRecord(image) ? image : {};
      const url = asString(row.url).trim();
      if (!url) return null;
      const sortOrder = asNumber(row.sortOrder);
      return {
        fileName: asString(row.fileName),
        imageTypeId: row.imageTypeId ?? '',
        imageTypeRuId: Array.isArray(row.imageTypeRuId) ? row.imageTypeRuId : [],
        sortOrder: sortOrder ?? 0,
        url,
      };
    })
    .filter((row): row is UnknownRecord => row !== null);
}

/** Sous-titre lieu (ville · région · pays) — uniquement champs API réels, pas de fallback mock. */
export function formatListingLocationLine(raw: UnknownRecord): string {
  const parts = [asString(raw.city), asString(raw.country)]
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.join(' · ');
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

  return {
    ...raw,
    name: asString(raw.name),
    locationLine: formatListingLocationLine(raw),
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
    active: raw.active !== false,
    staging: raw.staging === true,
    instantBooking: raw.instantBookable === true,
    otaOnly: raw.otaOnly === true,
    lat: asNumber(raw.lat) ?? 0,
    lng: asNumber(raw.lng) ?? 0,
    address: asString(raw.address),
    state: asString(raw.state),
    city: asString(raw.city),
    cityId: asString(raw.cityId),
    zipcode: asString(raw.zipcode),
    place: asString(raw.place),
    country: asString(raw.country),
    countryCode: asString(raw.countryCode),
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

  const lat = asNumber(values.lat);
  const lng = asNumber(values.lng);
  if (lat != null) payload.lat = lat;
  if (lng != null) payload.lng = lng;
  if (values.address != null) payload.address = asString(values.address);
  if (values.city != null) payload.city = asString(values.city);
  if (values.cityId != null) payload.cityId = values.cityId;
  if (values.state != null) payload.state = asString(values.state);
  if (values.zipcode != null) payload.zipcode = asString(values.zipcode);
  if (values.place != null) payload.place = asString(values.place);
  if (values.country != null) payload.country = asString(values.country);
  if (values.countryCode != null) payload.countryCode = asString(values.countryCode);
  if (values.currencyCode != null) payload.currencyCode = asString(values.currencyCode);

  if (Array.isArray(values.listingImages)) {
    payload.listingImages = cleanListingImagesForPayload(values.listingImages);
  }

  return payload;
}

export { DESC_LANG_UI, LANG_RU_BY_UI };
