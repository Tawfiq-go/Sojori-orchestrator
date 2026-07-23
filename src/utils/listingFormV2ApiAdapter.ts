/**
 * Pont entre document GET /listings/by-id (legacy) et état plat ListingFormV2.
 */

import {
  hourNumberToTimeInput,
  resolveCheckInTimeEnd,
  timeInputToHourNumber,
} from './listingTimeHelpers';
import {
  decodeCancellationPolicyUiDetailed,
  encodeCancellationPolicyUi,
  CANCELLATION_POLICY_PRESET_LABELS,
  type CancellationPolicyRow,
} from './listingCancellationPolicyPresets';
import { buildAdditionalFeesSavePayload } from './listingRuFeesDisplay';
import { isMongoObjectId } from './listingId';

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
  if (v != null && typeof v === 'object') {
    const rec = v as { toString?: () => string; _id?: unknown };
    if (typeof rec.toString === 'function' && rec.toString !== Object.prototype.toString) {
      const s = rec.toString();
      if (s && s !== '[object Object]') return s;
    }
    if (typeof rec._id === 'string') return rec._id;
    if (rec._id != null && typeof rec._id === 'object' && typeof (rec._id as { toString?: () => string }).toString === 'function') {
      return String((rec._id as { toString: () => string }).toString());
    }
  }
  return '';
}

function infoSectionHasContent(section: unknown): boolean {
  if (!isRecord(section)) return false;
  const descs = section.descriptions;
  if (!Array.isArray(descs)) return false;
  return descs.some((d) => {
    if (typeof d === 'string') return d.trim().length > 0;
    if (!isRecord(d)) return false;
    return hasStoredValue(d.fr) || hasStoredValue(d.en);
  });
}

const PICKUP_PARAGRAPH_RE =
  /pickup\s+service|prise en charge|arrange transportation|transport sur demande/i;

type LocalizedRow = UnknownRecord;

function localizedRowsHaveText(rows: unknown): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((row) => isRecord(row) && hasStoredValue(row.value));
}

/** Airbnb/RU : parfois tout est dans HowToArrive, PickupService vide. */
function splitPickupParagraphsFromHowToArrive(howToArrive: unknown): {
  howToArrive: LocalizedRow[];
  pickupService: LocalizedRow[];
} {
  if (!Array.isArray(howToArrive)) return { howToArrive: [], pickupService: [] };
  const nextHow: LocalizedRow[] = [];
  const pickup: LocalizedRow[] = [];
  for (const row of howToArrive) {
    if (!isRecord(row)) continue;
    const value = asString(row.value).trim();
    if (!value) continue;
    const parts = value.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      nextHow.push({ ...row, value });
      continue;
    }
    const main: string[] = [];
    const pickupParts: string[] = [];
    for (const part of parts) {
      if (PICKUP_PARAGRAPH_RE.test(part)) pickupParts.push(part);
      else main.push(part);
    }
    if (main.length > 0) nextHow.push({ ...row, value: main.join('\n\n') });
    if (pickupParts.length > 0) pickup.push({ ...row, value: pickupParts.join('\n\n') });
  }
  return { howToArrive: nextHow, pickupService: pickup };
}

function infoSectionFromLocalizedRows(
  rows: unknown,
  label: string,
): UnknownRecord | undefined {
  if (!Array.isArray(rows)) return undefined;
  const lines = rows
    .map((row) => (isRecord(row) ? asString(row.value).trim() : ''))
    .filter(Boolean);
  if (!lines.length) return undefined;
  return {
    name: { fr: label, en: label },
    descriptions: lines.map((line) => ({ fr: line, en: line })),
    iconUrl: '',
  };
}

function infoSectionFromDescriptionLines(
  description: unknown,
  field: string,
  label: string,
): UnknownRecord | undefined {
  if (!Array.isArray(description)) return undefined;
  const lines = description
    .map((row) => (isRecord(row) ? asString(row[field]).trim() : ''))
    .filter(Boolean);
  if (!lines.length) return undefined;
  return {
    name: { fr: label, en: label },
    descriptions: lines.map((line) => ({ fr: line, en: line })),
    iconUrl: '',
  };
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function hasStoredValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (isRecord(v)) return Object.keys(v).length > 0;
  return false;
}

function hasTimeFeeRows(rows: unknown): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((row) => {
    if (!isRecord(row)) return false;
    return row.fromHour != null || row.toHour != null || row.fee != null;
  });
}

/** Listings importés avant schéma top-level : hydrate depuis preporteyInformation. */
function hydrateRuFieldsFromPreportey(raw: UnknownRecord): UnknownRecord {
  const info = isRecord(raw.preporteyInformation) ? raw.preporteyInformation : {};
  const out: UnknownRecord = { ...raw };
  const arrival = isRecord(info.ruArrivalInstructions) ? info.ruArrivalInstructions : {};

  const fill = (key: string, value: unknown) => {
    if (!hasStoredValue(out[key]) && hasStoredValue(value)) out[key] = value;
  };

  fill('daysBeforeArrival', arrival.daysBeforeArrival);
  fill('arrivalLandlord', arrival.landlord);
  fill('arrivalEmail', arrival.email);
  fill('arrivalPhone', arrival.phone);
  fill('howToArrive', arrival.howToArrive);
  fill('pickupService', arrival.pickupService);
  fill('ruExternalListing', info.ruExternalListing);
  fill('ruLateArrivalFees', info.ruLateArrivalFees);
  fill('ruEarlyDepartureFees', info.ruEarlyDepartureFees);

  if (!hasTimeFeeRows(out.ruLateArrivalFees) && hasTimeFeeRows(info.ruLateArrivalFees)) {
    out.ruLateArrivalFees = info.ruLateArrivalFees;
  }
  if (!hasTimeFeeRows(out.ruEarlyDepartureFees) && hasTimeFeeRows(info.ruEarlyDepartureFees)) {
    out.ruEarlyDepartureFees = info.ruEarlyDepartureFees;
  }

  if (!hasStoredValue(out.zoneDescription) && Array.isArray(out.description)) {
    const fromDesc = out.description
      .filter((row) => isRecord(row) && hasStoredValue(row.locationDesc))
      .map((row) => ({
        languageRuId: asString(row.languageRuId) || '4',
        value: asString(row.locationDesc),
        locationDesc: asString(row.locationDesc),
      }));
    if (fromDesc.length > 0) out.zoneDescription = fromDesc;
  }

  if (!hasStoredValue(out.center) && Array.isArray(out.description)) {
    const lines = out.description
      .map((row) => (isRecord(row) ? asString(row.neighborhood).trim() : ''))
      .filter(Boolean);
    if (lines.length > 0) {
      out.center = {
        name: { fr: 'Quartier', en: 'Neighborhood' },
        descriptions: lines.map((line) => ({ fr: line, en: line })),
        iconUrl: '',
      };
    }
  }

  if (!infoSectionHasContent(out.transport) && Array.isArray(out.description)) {
    const fromAccess = infoSectionFromDescriptionLines(out.description, 'access', 'Accès & transport');
    if (fromAccess) out.transport = fromAccess;
  }

  if (!hasStoredValue(out.pickupService) && Array.isArray(out.description)) {
    const fromDesc = out.description
      .filter((row) => isRecord(row) && hasStoredValue(row.pickupService))
      .flatMap((row) => {
        const text = asString(row.pickupService).trim();
        return text ? [{ languageRuId: asString(row.languageRuId) || '4', value: text }] : [];
      });
    if (fromDesc.length > 0) out.pickupService = fromDesc;
  }

  if (!hasStoredValue(out.pickupService) && localizedRowsHaveText(out.howToArrive)) {
    const split = splitPickupParagraphsFromHowToArrive(out.howToArrive);
    if (split.pickupService.length > 0) {
      out.pickupService = split.pickupService;
      if (split.howToArrive.length > 0) out.howToArrive = split.howToArrive;
    }
  }

  if (!infoSectionHasContent(out.transport)) {
    const arrivalLines = [
      ...(Array.isArray(out.howToArrive) ? out.howToArrive : []),
      ...(Array.isArray(out.pickupService) ? out.pickupService : []),
    ];
    const fromArrival = infoSectionFromLocalizedRows(arrivalLines, 'Accès & transport');
    if (fromArrival) out.transport = fromArrival;
  }

  const ruProp = isRecord(info.ruRawProperty) ? info.ruRawProperty : {};
  fill('standardGuests', asNumber(ruProp.StandardGuests));
  if (!hasStoredValue(out.timeZoneName)) {
    fill('timeZoneName', ruProp.TimeZone || ruProp.timeZoneName);
  }

  return out;
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

function feeRowFromAdditional(raw: UnknownRecord, feeTaxType: string): UnknownRecord | undefined {
  const fees = raw.additionalFees;
  if (!Array.isArray(fees)) return undefined;
  const row = fees.find((f) => isRecord(f) && f.feeTaxType === feeTaxType);
  return isRecord(row) ? row : undefined;
}

function feeEnabledFromAdditionalFees(
  raw: UnknownRecord,
  feeTaxType: string,
  topLevelFlag: unknown,
): boolean {
  if (topLevelFlag === true) return true;
  const row = feeRowFromAdditional(raw, feeTaxType);
  if (row && (asNumber(row.value) ?? 0) > 0) return true;
  return false;
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
  enabled?: boolean,
): UnknownRecord | undefined {
  const existing = isRecord(existingMeta) ? existingMeta : {};
  const depositId = asString(existing.depositId);
  const existingRuId = asString(existing.depositRuId);

  if (enabled === false) {
    return {
      ...(depositId ? { depositId } : {}),
      depositRuId: '1',
      value: 0,
    };
  }

  const value = asNumber(amount);
  if (value === undefined) return undefined;
  const useFlatAmount = value > 0;
  const depositRuId = useFlatAmount ? '5' : existingRuId || '1';
  return {
    ...(depositId && !useFlatAmount ? { depositId } : {}),
    depositRuId,
    value: useFlatAmount ? value : 0,
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

/** Mongo rejette languageId: "" — ne garder que les ObjectId valides. */
function cleanDescriptionForApiPayload(descriptions: UnknownRecord[]): UnknownRecord[] {
  return descriptions.map((item) => {
    const row = { ...item };
    const languageId = asString(row.languageId).trim();
    if (!isMongoObjectId(languageId)) {
      delete row.languageId;
    }
    return row;
  });
}

/** roomTypeConfigId optionnel — "" ou invalide → omis (évite Cast BSON à l’update). */
function cleanRoomTypeRowForApi(row: UnknownRecord): UnknownRecord {
  const out = { ...row };
  const configId = asString(out.roomTypeConfigId).trim();
  if (!isMongoObjectId(configId)) {
    delete out.roomTypeConfigId;
  } else {
    out.roomTypeConfigId = configId;
  }
  const propertyTypeId = asString(out.propertyTypeId).trim();
  if (!isMongoObjectId(propertyTypeId)) {
    delete out.propertyTypeId;
  } else {
    out.propertyTypeId = propertyTypeId;
  }
  const ruPt = asNumber(out.rentalPropertyTypeId);
  if (ruPt == null || !Number.isFinite(ruPt)) {
    delete out.rentalPropertyTypeId;
  } else {
    out.rentalPropertyTypeId = ruPt;
  }
  return out;
}

function cleanRoomTypesForApiPayload(roomTypes: unknown): UnknownRecord[] | undefined {
  if (!Array.isArray(roomTypes)) return undefined;
  return roomTypes.map((rt) => cleanRoomTypeRowForApi(isRecord(rt) ? rt : {}));
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
  const hydrated = hydrateRuFieldsFromPreportey(raw);
  const rt = firstRoomType(hydrated);
  const descriptions = cloneDescriptionArray(hydrated.description);
  const descLang: DescLangUi = '🇫🇷 FR';
  const fr = getDescEntryForLang(descriptions, descLang);
  const licenceInfo = isRecord(hydrated.licenceInfo) ? hydrated.licenceInfo : {};
  const cityTaxAmount = cityTaxAmountFromApi(hydrated);

  return {
    ...hydrated,
    name: asString(hydrated.name),
    locationLine: formatListingLocationLine(hydrated),
    propertyType: propertyTypeToUi(hydrated.propertyType),
    propertyUnit: asString(hydrated.propertyUnit) || 'Single',
    bedrooms: asNumber(rt.bedroomsNumber) ?? asNumber(hydrated.bedroomsNumber),
    bathrooms: asNumber(rt.bathroomsNumber) ?? asNumber(hydrated.bathroomsNumber),
    guests:
      asNumber(rt.personCapacityMax) ??
      asNumber(hydrated.personCapacityMax) ??
      asNumber(rt.personCapacity),
    personCapacity: asNumber(rt.personCapacity),
    personCapacityMax:
      asNumber(rt.personCapacityMax) ?? asNumber(hydrated.personCapacityMax),
    beds: asNumber(rt.bedsNumber) ?? asNumber(hydrated.bedsNumber),
    sqm: asNumber(rt.surface) ?? asNumber(hydrated.surface),
    floor: hydrated.floor != null ? asNumber(hydrated.floor) : null,
    totalFloor: hydrated.totalFloor != null ? asNumber(hydrated.totalFloor) : null,
    roomTypeConfigId: isMongoObjectId(asString(rt.roomTypeConfigId))
      ? asString(rt.roomTypeConfigId)
      : undefined,
    ownerId: isMongoObjectId(asString(hydrated.ownerId))
      ? asString(hydrated.ownerId)
      : undefined,
    description: descriptions,
    _descLang: descLang,
    shortDescription: asString(fr.headline),
    longDescription: asString(fr.value),
    airbnbSummary: asString(raw.airbnbSummary),
    active: raw.active !== false,
    instantBooking: raw.onlineCheckIn === true || raw.instantBookable === true,
    onlineCheckIn: raw.onlineCheckIn === true,
    instantBookingMode: asString(raw.instantBookingMode) || (raw.onlineCheckIn === true ? 'everyone' : 'off'),
    checkInMethod: asString(raw.checkInMethod),
    petsAllowed: raw.petsAllowed === true,
    petsPaid: raw.petsPaid === true,
    petsMax: raw.petsMax != null ? asNumber(raw.petsMax) : null,
    childrenAllowed: raw.childrenAllowed !== false,
    infantsAllowed: raw.infantsAllowed !== false,
    smokingAllowed: raw.smokingAllowed === true,
    eventsAllowed: raw.eventsAllowed === true,
    ruChannelToggles: isRecord(raw.ruChannelToggles) ? { ...raw.ruChannelToggles } : undefined,
    longStayDiscounts: [],
    lastMinuteDiscount: [],
    basePrice: asNumber(rt.basePrice) ?? asNumber(raw.basePrice),
    weekendPrice: (() => {
      const n = asNumber(raw.extra);
      return n != null && n > 0 ? n : null;
    })(),
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

    ruImportedFields: Array.isArray(raw.ruImportedFields) ? [...raw.ruImportedFields] : undefined,

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
    cleaningFeeEnabled: feeEnabledFromAdditionalFees(raw, 'cleaning', raw.cleaningFeeEnabled),
    cleaningFee:
      asNumber(raw.cleaningFee) ?? asNumber(feeRowFromAdditional(raw, 'cleaning')?.value),
    cleaningFeeDiscriminator:
      asString(raw.cleaningFeeDiscriminator) ||
      asString(feeRowFromAdditional(raw, 'cleaning')?.discriminatorId) ||
      '1',
    cityTaxEnabled: feeEnabledFromAdditionalFees(raw, 'city_tax', raw.cityTaxEnabled),
    cityTaxPerAdult: cityTaxAmount,
    cityTaxPerAdultPerNight: cityTaxAmount,
    cityTaxDiscriminator:
      asString(raw.cityTaxDiscriminator) ||
      asString(feeRowFromAdditional(raw, 'city_tax')?.discriminatorId) ||
      '6',
    cityTaxCollectionMode: asString(raw.cityTaxCollectionMode) || 'on_table',

    additionalFees: Array.isArray(raw.additionalFees)
      ? raw.additionalFees.map((row) => {
          if (!isRecord(row)) return row;
          const value = asNumber(row.value) ?? 0;
          const kind = asString(row.feeTaxType);
          const isKnown = kind === 'cleaning' || kind === 'city_tax';
          return {
            ...row,
            enabled: isKnown ? value > 0 : row.enabled === true || value > 0,
          };
        })
      : [],

    // Acompte (arrhes RU) + caution — afficher 0 MAD comme RU
    bookingDeposit: depositAmountFromApi(raw.deposit) ?? 0,
    bookingDepositEnabled: (depositAmountFromApi(raw.deposit) ?? 0) > 0,
    _bookingDepositMeta: isRecord(raw.deposit) ? { ...raw.deposit } : null,
    depositRequired:
      raw.depositRequired === true || (depositAmountFromApi(raw.securityDeposit) ?? 0) > 0,
    securityDeposit: depositAmountFromApi(raw.securityDeposit) ?? 0,
    _securityDepositMeta: isRecord(raw.securityDeposit) ? { ...raw.securityDeposit } : null,

    // Cancellation policy
    cancellationPolicies: cancellationPoliciesFromApi(raw),
    ...(() => {
      const policies = cancellationPoliciesFromApi(raw);
      const decoded = decodeCancellationPolicyUiDetailed(policies);
      return {
        cancellationPolicy: decoded.exact ?? (decoded.isCustom ? 'custom' : decoded.suggested ?? ''),
        cancellationPolicySuggested: decoded.suggested,
        cancellationPolicyIsCustom: decoded.isCustom,
      };
    })(),

    standardGuests: asNumber(hydrated.standardGuests),
    daysBeforeArrival: asNumber(hydrated.daysBeforeArrival),
    arrivalLandlord: asString(hydrated.arrivalLandlord),
    arrivalEmail: asString(hydrated.arrivalEmail),
    arrivalPhone: asString(hydrated.arrivalPhone),
    howToArrive: Array.isArray(hydrated.howToArrive) ? [...hydrated.howToArrive] : [],
    pickupService: Array.isArray(hydrated.pickupService) ? [...hydrated.pickupService] : [],
    houseRule: isRecord(hydrated.houseRule) ? { ...hydrated.houseRule } : undefined,
    note: isRecord(hydrated.note) ? { ...hydrated.note } : undefined,
    center: isRecord(hydrated.center) ? { ...hydrated.center } : undefined,
    transport: isRecord(hydrated.transport) ? { ...hydrated.transport } : undefined,
    policy: isRecord(hydrated.policy) ? { ...hydrated.policy } : undefined,
    zoneDescription: Array.isArray(hydrated.zoneDescription) ? [...hydrated.zoneDescription] : [],
    ruLateArrivalFees: Array.isArray(hydrated.ruLateArrivalFees) ? [...hydrated.ruLateArrivalFees] : [],
    ruEarlyDepartureFees: Array.isArray(hydrated.ruEarlyDepartureFees) ? [...hydrated.ruEarlyDepartureFees] : [],
    ruExternalListing: isRecord(hydrated.ruExternalListing) ? { ...hydrated.ruExternalListing } : undefined,
    rulesAndInfo: isRecord(hydrated.rulesAndInfo) ? { ...hydrated.rulesAndInfo } : {},
    paymentMethods: Array.isArray(hydrated.paymentMethods) ? [...hydrated.paymentMethods] : [],
    rentalUnitedIds: Array.isArray(hydrated.rentalUnitedIds) ? [...hydrated.rentalUnitedIds] : [],
    rentalUnitedBuildingId: asString(hydrated.rentalUnitedBuildingId),
    syncToRentalUnited: hydrated.syncToRentalUnited === true,
    timeZoneName: asString(hydrated.timeZoneName),
    wifiUsername: asString(hydrated.wifiUsername),
    wifiPassword: asString(hydrated.wifiPassword),
    messageCheckin: Array.isArray(hydrated.messageCheckin) ? [...hydrated.messageCheckin] : [],
    messageCheckout: Array.isArray(hydrated.messageCheckout) ? [...hydrated.messageCheckout] : [],
    preporteyInformation: isRecord(hydrated.preporteyInformation) ? { ...hydrated.preporteyInformation } : {},
    otaChannelsSnapshot: isRecord(hydrated.otaChannelsSnapshot) ? { ...hydrated.otaChannelsSnapshot } : undefined,
    directPaymentMethods: mapDirectPaymentMethodsFromApi(hydrated),
    directPayment: mapDirectPaymentFromApi(hydrated),
    visibility: mapVisibilityFromApi(hydrated),
    channelDiscounts: mapChannelDiscountsFromApi(hydrated),
    directEnabled: mapVisibilityFromApi(hydrated).sojori,
  };
}

function mapPartialMethodFromApi(partial: UnknownRecord, legacy?: UnknownRecord | null) {
  const src = partial && Object.keys(partial).length ? partial : legacy || {};
  return {
    enabled: src.enabled === true,
    depositPercent: asNumber(src.depositPercent) ?? 20,
    allowFullPayment: src.allowFullPayment !== false,
  };
}

function mapChannelDiscountsFromApi(hydrated: UnknownRecord): {
  sojori: number | '';
  directBooking: number | '';
  whatsapp: number | '';
  marketplace: number | '';
} {
  const raw = isRecord(hydrated.channelDiscounts) ? hydrated.channelDiscounts : {};
  const legacyDirect = asNumber(hydrated.directDiscount);
  const pick = (key: string) => {
    const v = asNumber(raw[key]);
    return v != null && v > 0 ? v : '';
  };
  return {
    sojori: pick('sojori'),
    directBooking: pick('directBooking') || (legacyDirect != null && legacyDirect > 0 ? legacyDirect : ''),
    whatsapp: pick('whatsapp'),
    marketplace: pick('marketplace'),
  };
}

function mapDirectPaymentMethodsFromApi(hydrated: UnknownRecord): string[] {
  const dp = mapDirectPaymentFromApi(hydrated);
  return dp.methods;
}

function mapDirectPaymentFromApi(hydrated: UnknownRecord): {
  methods: string[];
  cashForReturningOnly: boolean;
  wire: { iban: string; bic: string; holder: string; bankName: string };
  partialPayment: {
    card: { enabled: boolean; depositPercent: number; allowFullPayment: boolean };
    wire: { enabled: boolean; depositPercent: number; allowFullPayment: boolean };
  };
} {
  const raw = isRecord(hydrated.directPayment) ? hydrated.directPayment : {};
  const legacyMethods = Array.isArray(hydrated.directPaymentMethods)
    ? hydrated.directPaymentMethods.map((m) => String(m))
    : ['card', 'wire', 'cash'];
  const methodsRaw = Array.isArray(raw.methods) ? raw.methods.map((m) => String(m)) : legacyMethods;
  const allowed = new Set(['card', 'wire', 'cash']);
  const methods = methodsRaw.filter((m) => allowed.has(m));
  const wire = isRecord(raw.wire) ? raw.wire : {};
  const partial = isRecord(raw.partialPayment) ? raw.partialPayment : {};
  const legacyPartial =
    partial.enabled !== undefined && !partial.card && !partial.wire ? partial : null;
  return {
    methods: methods.length ? methods : ['card', 'wire', 'cash'],
    cashForReturningOnly: raw.cashForReturningOnly === true,
    wire: {
      iban: asString(wire.iban),
      bic: asString(wire.bic),
      holder: asString(wire.holder),
      bankName: asString(wire.bankName),
    },
    partialPayment: {
      card: mapPartialMethodFromApi(
        isRecord(partial.card) ? partial.card : {},
        legacyPartial,
      ),
      wire: mapPartialMethodFromApi(isRecord(partial.wire) ? partial.wire : {}),
    },
  };
}

function mapVisibilityFromApi(hydrated: UnknownRecord): {
  sojori: boolean;
  directBooking: boolean;
  whatsapp: boolean;
  marketplace: boolean;
} {
  const vis = isRecord(hydrated.visibility) ? hydrated.visibility : null;
  if (vis) {
    return {
      sojori: vis.sojori !== false,
      directBooking: vis.directBooking !== false,
      whatsapp: vis.whatsapp !== false,
      marketplace: vis.marketplace !== false,
    };
  }
  const sojori =
    hydrated.directEnabled !== undefined
      ? hydrated.directEnabled === true
      : hydrated.atSojori !== false;
  return {
    sojori,
    directBooking: true,
    whatsapp: true,
    marketplace: true,
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
          const configId = asString(values.roomTypeConfigId ?? row.roomTypeConfigId).trim();
          if (isMongoObjectId(configId)) {
            row.roomTypeConfigId = configId;
          } else {
            delete row.roomTypeConfigId;
          }
          const basePrice = asNumber(values.basePrice);
          if (basePrice != null) row.basePrice = basePrice;
        }
        return cleanRoomTypeRowForApi(row);
      })
    : undefined;

  const payload: UnknownRecord = {
    name: values.name,
    description: cleanDescriptionForApiPayload(descriptions),
    propertyUnit: values.propertyUnit,
    propertyType: propertyTypeToApi(values.propertyType),
    active: values.active,
    onlineCheckIn: values.instantBooking,
    instantBookingMode: values.instantBooking
      ? (asString(values.instantBookingMode) || 'everyone')
      : 'off',
    checkInMethod: asString(values.checkInMethod) || '',
    petsAllowed: values.petsAllowed === true,
    petsPaid: values.petsPaid === true,
    ...(values.petsAllowed === true && asNumber(values.petsMax) != null
      ? { petsMax: asNumber(values.petsMax) }
      : values.petsAllowed === false
        ? { petsMax: null }
        : {}),
    childrenAllowed: values.childrenAllowed !== false,
    infantsAllowed: values.infantsAllowed !== false,
    smokingAllowed: values.smokingAllowed === true,
    eventsAllowed: values.eventsAllowed === true,
    ...(values.floor !== undefined ? { floor: values.floor ?? null } : {}),
    ...(values.totalFloor !== undefined ? { totalFloor: values.totalFloor ?? null } : {}),
    surface: values.sqm,
    personCapacityMax: values.personCapacityMax ?? values.guests,
  };

  if (roomTypes) payload.roomTypes = cleanRoomTypesForApiPayload(roomTypes);
  if (values.airbnbSummary != null) payload.airbnbSummary = values.airbnbSummary;

  if (Array.isArray(values.listingAmenitiesIds)) {
    payload.listingAmenitiesIds = values.listingAmenitiesIds
      .map((row) => {
        const r = isRecord(row) ? row : {};
        const rawId = r._id;
        const id = isRecord(rawId)
          ? asString(rawId._id ?? rawId.id)
          : asString(rawId);
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

  const ownerId = asString(
    values.ownerId ?? (isRecord(values.owner) ? values.owner._id : ''),
  ).trim();
  if (isMongoObjectId(ownerId)) {
    payload.ownerId = ownerId;
  } else if (values.ownerId === null) {
    payload.ownerId = null;
  }

  const minNights = asNumber(values.minNights);
  const maxNights = asNumber(values.maxNights);
  if (minNights != null) payload.minNights = minNights;
  if (maxNights != null) payload.maxNights = maxNights;

  const advanceNotice = asNumber(values.advanceNotice);
  if (advanceNotice != null) {
    payload.preparationTimeBeforeArrivalInHours = advanceNotice;
  }

  if (values.weekendPrice !== undefined) {
    const weekendPrice = asNumber(values.weekendPrice);
    payload.extra = weekendPrice != null && weekendPrice > 0 ? weekendPrice : 0;
  }

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
    'orchestration_receive_arrival',
    'orchestration_receive_departure',
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
  const checkInEndHour =
    timeInputToHourNumber(values.checkInTimeEnd) ?? asNumber(values.checkInTimeEnd);
  if (checkInHour != null) {
    payload.checkInTimeStart = checkInHour;
    payload.checkInTimeEnd = resolveCheckInTimeEnd(checkInHour, checkInEndHour);
  } else if (checkInEndHour != null) {
    payload.checkInTimeEnd = checkInEndHour;
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

  if (
    values.cleaningFeeEnabled !== undefined ||
    values.cityTaxEnabled !== undefined ||
    values.additionalFees !== undefined ||
    values.cleaningFee !== undefined ||
    values.cityTaxPerAdult !== undefined
  ) {
    payload.additionalFees = buildAdditionalFeesSavePayload(values);
  }

  // Acompte (arrhes) + caution
  if (values.bookingDepositEnabled !== undefined || values.bookingDeposit !== undefined) {
    const enabled = values.bookingDepositEnabled === true;
    payload.deposit = depositToUpdatePayload(
      enabled ? values.bookingDeposit : 0,
      values._bookingDepositMeta ?? (isRecord(values.deposit) ? values.deposit : null),
      enabled,
    );
  }
  if (values.depositRequired !== undefined) payload.depositRequired = values.depositRequired === true;
  if (values.securityDeposit !== undefined || values.depositRequired !== undefined) {
    const enabled = values.depositRequired === true;
    payload.securityDeposit = depositToUpdatePayload(
      enabled ? values.securityDeposit : 0,
      values._securityDepositMeta ?? (isRecord(values.securityDeposit) ? values.securityDeposit : null),
      enabled,
    );
  }

  if (values.syncToRentalUnited !== undefined) {
    payload.syncToRentalUnited = values.syncToRentalUnited === true;
  }

  if (isRecord(values.otaChannelsSnapshot)) {
    payload.otaChannelsSnapshot = values.otaChannelsSnapshot;
  }

  if (isRecord(values.visibility)) {
    payload.visibility = {
      sojori: values.visibility.sojori === true,
      directBooking: values.visibility.directBooking === true,
      whatsapp: values.visibility.whatsapp === true,
      marketplace: values.visibility.marketplace === true,
    };
    payload.atSojori = payload.visibility.sojori;
  } else if (values.directEnabled !== undefined) {
    payload.visibility = {
      sojori: values.directEnabled === true,
      directBooking: true,
      whatsapp: true,
      marketplace: true,
    };
    payload.atSojori = values.directEnabled === true;
  }
  if (isRecord(values.channelDiscounts)) {
    const cd = values.channelDiscounts;
    payload.channelDiscounts = {
      sojori: asNumber(cd.sojori) ?? 0,
      directBooking: asNumber(cd.directBooking) ?? 0,
      whatsapp: asNumber(cd.whatsapp) ?? 0,
      marketplace: asNumber(cd.marketplace) ?? 0,
    };
  }

  if (isRecord(values.directPayment) || Array.isArray(values.directPaymentMethods)) {
    const dp = isRecord(values.directPayment) ? values.directPayment : {};
    const methodsRaw = Array.isArray(dp.methods)
      ? dp.methods
      : Array.isArray(values.directPaymentMethods)
        ? values.directPaymentMethods
        : ['card', 'wire', 'cash'];
    const wire = isRecord(dp.wire) ? dp.wire : {};
    const partial = isRecord(dp.partialPayment) ? dp.partialPayment : {};
    const cardPartial = isRecord(partial.card) ? partial.card : {};
    const wirePartial = isRecord(partial.wire) ? partial.wire : {};
    payload.directPayment = {
      methods: methodsRaw.map((m) => String(m)).filter((m) => ['card', 'wire', 'cash'].includes(m)),
      cashForReturningOnly: dp.cashForReturningOnly === true,
      wire: {
        iban: asString(wire.iban),
        bic: asString(wire.bic),
        holder: asString(wire.holder),
        bankName: asString(wire.bankName),
      },
      partialPayment: {
        card: {
          enabled: cardPartial.enabled === true,
          depositPercent: asNumber(cardPartial.depositPercent) ?? 20,
          allowFullPayment: cardPartial.allowFullPayment !== false,
        },
        wire: {
          enabled: wirePartial.enabled === true,
          depositPercent: asNumber(wirePartial.depositPercent) ?? 20,
          allowFullPayment: wirePartial.allowFullPayment !== false,
        },
      },
    };
  }

  if (values.cancellationPolicy !== undefined && values.cancellationPolicy !== 'custom' && values.cancellationPolicy !== '') {
    payload.cancellationPolicies = encodeCancellationPolicyUi(asString(values.cancellationPolicy));
  } else if (Array.isArray(values.cancellationPolicies) && values.cancellationPolicies.length > 0) {
    payload.cancellationPolicies = values.cancellationPolicies;
  }

  const ruImportPassthrough = [
    'daysBeforeArrival',
    'arrivalLandlord',
    'arrivalEmail',
    'arrivalPhone',
    'howToArrive',
    'pickupService',
    'houseRule',
    'note',
    'center',
    'transport',
    'policy',
    'zoneDescription',
    'standardGuests',
    'ruLateArrivalFees',
    'ruEarlyDepartureFees',
    'ruExternalListing',
    'rulesAndInfo',
    'paymentMethods',
    'rentalUnitedIds',
    'rentalUnitedBuildingId',
    'timeZoneName',
    'wifiUsername',
    'wifiPassword',
    'messageCheckin',
    'messageCheckout',
    'preporteyInformation',
    'directPaymentMethods',
  ] as const;
  for (const key of ruImportPassthrough) {
    if (values[key] !== undefined) payload[key] = values[key];
  }

  return payload;
}

/** Defaults alignés dashboard legacy (NewListing formikInitialValues.roomTypes[0]). */
function defaultCreateRoomTypeShell(): UnknownRecord {
  return {
    roomTypeConfigId: null,
    roomTypeName: 'Standard Room',
    basePrice: 0,
    ratePlanIds: [],
    amenitiesIds: [],
    roomTypeImages: [],
    bedTypes: [],
    useAddress: true,
    active: true,
    personCapacity: 0,
    personCapacityMax: 0,
    bedroomsNumber: 0,
    bedsNumber: 0,
    bathroomsNumber: 0,
    roomNumber: 1,
    startCode: 0,
    ranking: 0,
    surface: 0,
    roomAmenities: [],
    rooms: [
      {
        roomNumber: 0,
        roomName: '',
        roomCode: '0',
        address: '',
        enabled: true,
      },
    ],
  };
}

function cleanAmenitiesIdsForCreate(raw: unknown): UnknownRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const row = isRecord(item) ? item : {};
      const id = asString(row._id);
      if (!id) return null;
      return { _id: id, count: asNumber(row.count) ?? 1 };
    })
    .filter(Boolean) as UnknownRecord[];
}

function cleanRoomAmenitiesForCreate(raw: unknown): UnknownRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((ra) => {
    const row = isRecord(ra) ? ra : {};
    return {
      ...row,
      rooms: (Array.isArray(row.rooms) ? row.rooms : []).map((r) => {
        const room = isRecord(r) ? r : {};
        return {
          ...room,
          amenities: (Array.isArray(room.amenities) ? room.amenities : [])
            .map((a) => {
              const am = isRecord(a) ? a : {};
              const id = asString(am._id);
              if (!id) return null;
              return { _id: id, count: asNumber(am.count) ?? 1 };
            })
            .filter(Boolean),
        };
      }),
    };
  });
}

/** Normalise roomTypes[0] pour POST /listings/create-property (Joi exige roomTypeName, basePrice, …). */
function normalizeCreateRoomTypes(values: UnknownRecord, roomTypes: unknown): UnknownRecord[] {
  const src = Array.isArray(roomTypes) && roomTypes.length > 0
    ? roomTypes
    : Array.isArray(values.roomTypes)
      ? values.roomTypes
      : [];
  const first = isRecord(src[0]) ? { ...src[0] } : {};

  const roomTypeName =
    asString(first.roomTypeName)?.trim() ||
    asString(values.name)?.trim() ||
    'Standard Room';

  const normalized: UnknownRecord = {
    ...defaultCreateRoomTypeShell(),
    ...first,
    roomTypeName,
    basePrice: asNumber(first.basePrice) ?? asNumber(values.basePrice) ?? 0,
    personCapacity:
      asNumber(first.personCapacity) ??
      asNumber(values.personCapacity) ??
      asNumber(values.guests) ??
      0,
    personCapacityMax:
      asNumber(first.personCapacityMax) ??
      asNumber(values.personCapacityMax) ??
      asNumber(values.guests) ??
      0,
    bedroomsNumber: asNumber(first.bedroomsNumber) ?? asNumber(values.bedrooms) ?? 0,
    bathroomsNumber: asNumber(first.bathroomsNumber) ?? asNumber(values.bathrooms) ?? 0,
    bedsNumber: asNumber(first.bedsNumber) ?? asNumber(values.beds) ?? 0,
    surface: asNumber(first.surface) ?? asNumber(values.sqm) ?? 0,
    roomNumber: asNumber(first.roomNumber) ?? 1,
    startCode: asNumber(first.startCode) ?? 0,
    ranking: asNumber(first.ranking) ?? 0,
    useAddress: first.useAddress !== false,
    active: first.active !== false,
    ratePlanIds: Array.isArray(first.ratePlanIds) ? first.ratePlanIds : [],
    amenitiesIds: cleanAmenitiesIdsForCreate(first.amenitiesIds),
    roomTypeImages: Array.isArray(first.roomTypeImages) ? first.roomTypeImages : [],
    bedTypes: Array.isArray(first.bedTypes) ? first.bedTypes : [],
    roomAmenities: cleanRoomAmenitiesForCreate(first.roomAmenities),
  };

  if (values.roomTypeConfigId != null) {
    const configId = asString(values.roomTypeConfigId).trim();
    if (isMongoObjectId(configId)) {
      normalized.roomTypeConfigId = configId;
    }
  }

  const rest = src.slice(1).map((rt) => cleanRoomTypeRowForApi(isRecord(rt) ? rt : {}));
  return [normalized, ...rest];
}

/**
 * Payload POST /listings/create-property — réutilise le mapping update + défauts roomTypes
 * (le formulaire V2 stocke bedrooms/basePrice au niveau racine ; Rooms n’écrit que roomAmenities).
 */
export function mergeFormV2ToCreatePropertyPayload(values: UnknownRecord): UnknownRecord {
  const payload = mergeFormV2ToUpdatePropertyPayload(values);
  payload.roomTypes = normalizeCreateRoomTypes(values, payload.roomTypes);
  if (!asString(payload.currencyCode)) payload.currencyCode = 'MAD';
  if (!asString(payload.timeZoneName)) payload.timeZoneName = 'Africa/Casablanca';
  if (payload.atSojori === undefined) payload.atSojori = true;
  if (payload.active === undefined) payload.active = false;
  return payload;
}

function dateToInput(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v.slice(0, 10);
  if (v instanceof Date && Number.isFinite(v.getTime())) return v.toISOString().slice(0, 10);
  return '';
}

export type LongStayDiscountUi = {
  from: string;
  to: string;
  adjustment: number;
  bigger: number;
  smaller: number;
  name?: string;
  active: boolean;
};

export type LastMinuteDiscountUi = {
  from: string;
  to: string;
  DaysToArrivalFrom: number;
  DaysToArrivalTo: number;
  adjustment: number;
  name?: string;
  active: boolean;
};

export function normalizeLongStayDiscountsFromApi(rows: unknown): LongStayDiscountUi[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((raw) => {
      if (!isRecord(raw)) return null;
      const from = dateToInput(raw.from);
      const to = dateToInput(raw.to);
      const adjustment = asNumber(raw.adjustment) ?? 0;
      if (!from || !to) return null;
      return {
        from,
        to,
        adjustment,
        bigger: asNumber(raw.bigger) ?? 7,
        smaller: asNumber(raw.smaller) ?? 28,
        name: asString(raw.name) || undefined,
        active: raw.active !== false,
      };
    })
    .filter(Boolean) as LongStayDiscountUi[];
}

export function normalizeLastMinuteDiscountsFromApi(rows: unknown): LastMinuteDiscountUi[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((raw) => {
      if (!isRecord(raw)) return null;
      const from = dateToInput(raw.from);
      const to = dateToInput(raw.to);
      const adjustment = asNumber(raw.adjustment) ?? 0;
      if (!from || !to) return null;
      return {
        from,
        to,
        adjustment,
        DaysToArrivalFrom: asNumber(raw.DaysToArrivalFrom) ?? 0,
        DaysToArrivalTo: asNumber(raw.DaysToArrivalTo) ?? 3,
        name: asString(raw.name) || undefined,
        active: raw.active !== false,
      };
    })
    .filter(Boolean) as LastMinuteDiscountUi[];
}

export function discountsToApiPayload(values: UnknownRecord) {
  const longStay = Array.isArray(values.longStayDiscounts) ? values.longStayDiscounts : [];
  const lastMinute = Array.isArray(values.lastMinuteDiscount) ? values.lastMinuteDiscount : [];
  return {
    longStayDiscounts: longStay.map((row) => {
      const r = isRecord(row) ? row : {};
      return {
        from: new Date(String(r.from)),
        to: new Date(String(r.to)),
        adjustment: asNumber(r.adjustment) ?? 0,
        bigger: asNumber(r.bigger) ?? 7,
        smaller: asNumber(r.smaller) ?? 28,
        name: asString(r.name) || '',
        active: r.active !== false,
      };
    }),
    lastMinuteDiscount: lastMinute.map((row) => {
      const r = isRecord(row) ? row : {};
      return {
        from: new Date(String(r.from)),
        to: new Date(String(r.to)),
        adjustment: asNumber(r.adjustment) ?? 0,
        DaysToArrivalFrom: asNumber(r.DaysToArrivalFrom) ?? 0,
        DaysToArrivalTo: asNumber(r.DaysToArrivalTo) ?? 3,
        name: asString(r.name) || '',
        active: r.active !== false,
      };
    }),
  };
}

export { DESC_LANG_UI, LANG_RU_BY_UI };
