/**
 * Pont entre document GET /listings/by-id (legacy) et état plat ListingFormV2.
 */

import {
  hourNumberToTimeInput,
  resolveCheckInTimeEnd,
  timeInputToHourNumber,
} from './listingTimeHelpers';
import {
  decodeCancellationPolicyUi,
  encodeCancellationPolicyUi,
  type CancellationPolicyRow,
} from './listingCancellationPolicyPresets';

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

function cityTaxAmountFromApi(raw: UnknownRecord): number | undefined {
  const fromField =
    asNumber(raw.cityTaxPerAdultPerNight) ?? asNumber(raw.cityTaxPerAdult);
  if (fromField !== undefined) return fromField;
  const fees = raw.additionalFees;
  if (!Array.isArray(fees)) return undefined;
  const row = fees.find((f) => isRecord(f) && f.feeTaxType === 'city_tax');
  return row ? asNumber(row.value) : undefined;
}

/** Montant caution — API Mongo = objet `{ depositRuId, value }`, formulaire = nombre. */
function depositAmountFromApi(raw: unknown): number | undefined {
  if (isRecord(raw)) return asNumber(raw.value);
  return asNumber(raw);
}

function dateToInputValue(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString().slice(0, 10);
  return '';
}

function dateInputToIso(v: unknown): Date | null {
  const s = asString(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d : null;
}

function depositToUpdatePayload(
  amount: unknown,
  existingMeta: unknown,
  depositRequired?: boolean,
): UnknownRecord | undefined {
  const value = asNumber(amount);
  if (value === undefined) return undefined;
  const existing = isRecord(existingMeta) ? existingMeta : {};
  const depositId = asString(existing.depositId);
  const existingRuId = asString(existing.depositRuId);
  const useFlatAmount = depositRequired !== false && value > 0;
  const depositRuId = useFlatAmount ? '5' : existingRuId || '1';
  return {
    ...(depositId && !useFlatAmount ? { depositId } : {}),
    depositRuId,
    value: useFlatAmount ? value : depositRequired === false ? 0 : value,
  };
}

function cancellationPoliciesFromApi(raw: UnknownRecord): CancellationPolicyRow[] | undefined {
  const rows = raw.cancellationPolicies;
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  const parsed = rows
    .map((row) => {
      if (!isRecord(row)) return null;
      const from = asNumber(row.from);
      const to = asNumber(row.to);
      const val = asNumber(row.value);
      if (from === undefined || to === undefined || val === undefined) return null;
      return { from, to, value: val };
    })
    .filter(Boolean) as CancellationPolicyRow[];
  return parsed.length > 0 ? parsed : undefined;
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
  const licenceInfo = isRecord(raw.licenceInfo) ? raw.licenceInfo : {};
  const cityTaxAmount = cityTaxAmountFromApi(raw);

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
    instantBooking: raw.onlineCheckIn === true || raw.instantBookable === true,
    otaOnly: raw.otaOnly === true,
    basePrice: asNumber(rt.basePrice) ?? asNumber(raw.basePrice),
    weekendPrice: asNumber(raw.extra),
    minNights: asNumber(raw.minNights),
    maxNights: asNumber(raw.maxNights),
    advanceNotice: asNumber(raw.preparationTimeBeforeArrivalInHours),
    dynamicPricing: raw.useDynamicPrice === true,
    frequency: Array.isArray(raw.frequency) ? raw.frequency : [],
    TS_CLEAN: Array.isArray(raw.TS_CLEAN) ? raw.TS_CLEAN : [],
    TS_CHECKIN: Array.isArray(raw.TS_CHECKIN) ? raw.TS_CHECKIN : [],
    TS_CHECKOUT: Array.isArray(raw.TS_CHECKOUT) ? raw.TS_CHECKOUT : [],
    paidCleaningConfig: isRecord(raw.paidCleaningConfig) ? { ...raw.paidCleaningConfig } : undefined,
    requiresOnlineCheckin: raw.requiresOnlineCheckin === true,
    messageCheckout: Array.isArray(raw.messageCheckout) ? [...raw.messageCheckout] : [],
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
    checkInTime: hourNumberToTimeInput(
      asNumber(raw.checkInTimeStart) ?? asNumber(raw.checkInTime),
    ),
    checkOutTime: hourNumberToTimeInput(asNumber(raw.checkOutTime)),
    checkInTimeStart: asNumber(raw.checkInTimeStart),
    checkInTimeEnd: asNumber(raw.checkInTimeEnd),
    currencyCode: asString(raw.currencyCode),

    // Licence / Enregistrement (UI = license*, Mongo = licence*)
    licenceIsExempt:
      raw.licenceIsExempt === true || licenceInfo.isExempt === true,
    licenseNumber:
      asString(raw.licenceNumber) || asString(licenceInfo.licenceNumber),
    licenseType: asString(raw.licenceType) || asString(licenceInfo.licenceType),
    licenseIssueDate:
      dateToInputValue(licenceInfo.issueDate) || dateToInputValue(raw.licenseIssueDate),
    licenseExpiryDate:
      dateToInputValue(licenceInfo.expirationDate) ||
      dateToInputValue(raw.licenseExpiryDate),
    cityHall: asString(raw.cityHall),
    adminContact: asString(raw.adminContact),
    policeRegistrationRequired: raw.policeRegistrationRequired === true,
    policeApiEndpoint: asString(raw.policeApiEndpoint),

    // Fees & Taxes (discriminators RU)
    cleaningFeeEnabled: raw.cleaningFeeEnabled === true,
    cleaningFee: asNumber(raw.cleaningFee),
    cleaningFeeDiscriminator: asString(raw.cleaningFeeDiscriminator) || '1',
    cityTaxEnabled: raw.cityTaxEnabled === true,
    cityTaxPerAdult: cityTaxAmount,
    cityTaxPerAdultPerNight: cityTaxAmount,
    cityTaxDiscriminator: asString(raw.cityTaxDiscriminator) || '6',
    cityTaxCollectionMode: asString(raw.cityTaxCollectionMode) || 'on_table',

    // Acompte (arrhes RU) + caution
    bookingDeposit: depositAmountFromApi(raw.deposit),
    bookingDepositEnabled: (depositAmountFromApi(raw.deposit) ?? 0) > 0,
    _bookingDepositMeta: isRecord(raw.deposit) ? { ...raw.deposit } : null,
    depositRequired:
      raw.depositRequired === true || (depositAmountFromApi(raw.securityDeposit) ?? 0) > 0,
    securityDeposit: depositAmountFromApi(raw.securityDeposit),
    _securityDepositMeta: isRecord(raw.securityDeposit) ? { ...raw.securityDeposit } : null,

    // Cancellation policy
    cancellationPolicy: decodeCancellationPolicyUi(cancellationPoliciesFromApi(raw)),
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
          const basePrice = asNumber(values.basePrice);
          if (basePrice != null) row.basePrice = basePrice;
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
    otaOnly: values.otaOnly,
    onlineCheckIn: values.instantBooking,
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

  const minNights = asNumber(values.minNights);
  const maxNights = asNumber(values.maxNights);
  if (minNights != null) payload.minNights = minNights;
  if (maxNights != null) payload.maxNights = maxNights;

  const advanceNotice = asNumber(values.advanceNotice);
  if (advanceNotice != null) {
    payload.preparationTimeBeforeArrivalInHours = advanceNotice;
  }

  const weekendPrice = asNumber(values.weekendPrice);
  if (weekendPrice != null) payload.extra = weekendPrice;

  if (values.dynamicPricing !== undefined) {
    payload.useDynamicPrice = Boolean(values.dynamicPricing);
  }

  if (Array.isArray(values.frequency)) payload.frequency = values.frequency;
  if (Array.isArray(values.TS_CLEAN)) payload.TS_CLEAN = values.TS_CLEAN;
  if (Array.isArray(values.TS_CHECKIN)) payload.TS_CHECKIN = values.TS_CHECKIN;
  if (Array.isArray(values.TS_CHECKOUT)) payload.TS_CHECKOUT = values.TS_CHECKOUT;
  if (isRecord(values.paidCleaningConfig)) {
    payload.paidCleaningConfig = values.paidCleaningConfig;
  }
  if (values.requiresOnlineCheckin !== undefined) {
    payload.requiresOnlineCheckin = values.requiresOnlineCheckin;
  }
  if (Array.isArray(values.messageCheckout)) {
    payload.messageCheckout = values.messageCheckout;
  }

  if (Array.isArray(values.listingImages)) {
    payload.listingImages = cleanListingImagesForPayload(values.listingImages);
  }

  const orchKeys = [
    'orchestrationEnabled',
    'orchestration_choose_arrival',
    'orchestration_choose_departure',
    'orchestration_declare_arrival',
    'orchestration_declare_departure',
    'orchestration_registration',
    'orchestration_cleaning_free',
    'orchestration_cleaning_paid',
    'orchestration_cleaning_sojori',
    'orchestration_transport',
    'orchestration_grocery',
    'orchestration_custom',
    'orchestration_support',
    'orchestration_service_client',
  ] as const;
  for (const k of orchKeys) {
    if (values[k] !== undefined) payload[k] = values[k];
  }
  if (values.cleaningOrchestration !== undefined) {
    payload.cleaningOrchestration = values.cleaningOrchestration;
  }

  const checkInHour =
    timeInputToHourNumber(values.checkInTime) ?? asNumber(values.checkInTimeStart);
  if (checkInHour != null) {
    payload.checkInTimeStart = checkInHour;
    payload.checkInTimeEnd = resolveCheckInTimeEnd(
      checkInHour,
      asNumber(values.checkInTimeEnd),
    );
  }

  const checkOutHour =
    timeInputToHourNumber(values.checkOutTime) ?? asNumber(values.checkOutTime);
  if (checkOutHour != null) {
    payload.checkOutTime = checkOutHour;
  }

  // Licence / Enregistrement (Mongo = licence*, pas license*)
  if (values.licenceIsExempt !== undefined) payload.licenceIsExempt = values.licenceIsExempt;
  if (values.licenseNumber !== undefined) {
    payload.licenceNumber = asString(values.licenseNumber);
  }
  if (values.licenseType !== undefined) payload.licenceType = asString(values.licenseType);

  const existingLicenceInfo = isRecord(values.licenceInfo) ? values.licenceInfo : {};
  const licenceInfoPatch: UnknownRecord = { ...existingLicenceInfo };
  let licenceInfoTouched = false;
  if (values.licenceIsExempt !== undefined) {
    licenceInfoPatch.isExempt = values.licenceIsExempt;
    licenceInfoTouched = true;
  }
  if (values.licenseNumber !== undefined) {
    licenceInfoPatch.licenceNumber = asString(values.licenseNumber);
    licenceInfoTouched = true;
  }
  if (values.licenseType !== undefined) {
    licenceInfoPatch.licenceType = asString(values.licenseType);
    licenceInfoTouched = true;
  }
  const issueDate = dateInputToIso(values.licenseIssueDate);
  if (values.licenseIssueDate !== undefined) {
    licenceInfoPatch.issueDate = issueDate;
    licenceInfoTouched = true;
  }
  const expirationDate = dateInputToIso(values.licenseExpiryDate);
  if (values.licenseExpiryDate !== undefined) {
    licenceInfoPatch.expirationDate = expirationDate;
    licenceInfoTouched = true;
  }
  if (licenceInfoTouched) payload.licenceInfo = licenceInfoPatch;

  // Fees & Taxes (discriminators RU)
  if (values.cleaningFeeEnabled !== undefined) payload.cleaningFeeEnabled = values.cleaningFeeEnabled;
  if (values.cleaningFee !== undefined) payload.cleaningFee = asNumber(values.cleaningFee);
  if (values.cleaningFeeDiscriminator !== undefined) payload.cleaningFeeDiscriminator = asString(values.cleaningFeeDiscriminator);
  if (values.cityTaxEnabled !== undefined) payload.cityTaxEnabled = values.cityTaxEnabled;
  const cityTaxAmount =
    asNumber(values.cityTaxPerAdult) ?? asNumber(values.cityTaxPerAdultPerNight);
  if (cityTaxAmount !== undefined) {
    payload.cityTaxPerAdultPerNight = cityTaxAmount;
  }
  if (values.cityTaxDiscriminator !== undefined) payload.cityTaxDiscriminator = asString(values.cityTaxDiscriminator);
  if (values.cityTaxCollectionMode !== undefined) payload.cityTaxCollectionMode = asString(values.cityTaxCollectionMode);

  // Acompte (arrhes) + caution
  if (values.bookingDepositEnabled !== undefined || values.bookingDeposit !== undefined) {
    const enabled = values.bookingDepositEnabled === true;
    payload.deposit = depositToUpdatePayload(
      enabled ? values.bookingDeposit : 0,
      values._bookingDepositMeta ?? (isRecord(values.deposit) ? values.deposit : null),
      enabled,
    );
  }
  if (values.depositRequired !== undefined) payload.depositRequired = values.depositRequired;
  if (values.securityDeposit !== undefined || values.depositRequired !== undefined) {
    const enabled = values.depositRequired === true;
    payload.securityDeposit = depositToUpdatePayload(
      enabled ? values.securityDeposit : 0,
      values._securityDepositMeta ?? (isRecord(values.securityDeposit) ? values.securityDeposit : null),
      enabled,
    );
  }

  if (values.cancellationPolicy !== undefined) {
    payload.cancellationPolicies = encodeCancellationPolicyUi(asString(values.cancellationPolicy));
  }

  return payload;
}

export { DESC_LANG_UI, LANG_RU_BY_UI };
