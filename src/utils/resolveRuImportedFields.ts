/**
 * Champs réellement remplis à l'import RU (badge I admin).
 * Clés = prop `ruField` du formulaire listing V2.
 */

type Raw = Record<string, unknown>;

function isRecord(v: unknown): v is Raw {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function hasValue(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'number') return Number.isFinite(v);
  if (typeof v === 'boolean') return true;
  if (Array.isArray(v)) return v.length > 0;
  if (isRecord(v)) return Object.keys(v).length > 0;
  return false;
}

function firstRoomType(raw: Raw): Raw {
  const rts = raw.roomTypes;
  if (Array.isArray(rts) && rts.length > 0 && isRecord(rts[0])) return rts[0];
  return {};
}

function hasDescriptionContent(raw: Raw): boolean {
  if (!Array.isArray(raw.description)) return false;
  return raw.description.some((row) => {
    if (!isRecord(row)) return false;
    return [
      'value',
      'headline',
      'space',
      'access',
      'neighborhood',
      'houseRules',
      'notes',
      'wiFiName',
    ].some((k) => hasValue(row[k]));
  });
}

function hasWifiInDescription(raw: Raw): boolean {
  if (!Array.isArray(raw.description)) return false;
  return raw.description.some((row) => isRecord(row) && hasValue(row.wiFiName));
}

function hasLicenceData(raw: Raw): boolean {
  const li = isRecord(raw.licenceInfo) ? raw.licenceInfo : {};
  return (
    hasValue(raw.licenceNumber) ||
    hasValue(li.licenceNumber) ||
    hasValue(raw.licenceType) ||
    hasValue(li.licenceType) ||
    hasValue(li.issueDate) ||
    hasValue(li.expirationDate)
  );
}

function hasRulesAndInfoRules(raw: Raw): boolean {
  if (!isRecord(raw.rulesAndInfo)) return false;
  const rules = raw.rulesAndInfo.Rules;
  return Array.isArray(rules) && rules.some((line) => hasValue(line));
}

function hasRulesAndInfoInfoUtils(raw: Raw): boolean {
  if (!isRecord(raw.rulesAndInfo)) return false;
  const infos = raw.rulesAndInfo.InfoUtils;
  return Array.isArray(infos) && infos.some((line) => hasValue(line));
}

function hasLocalizedRowsContent(rows: unknown): boolean {
  if (!Array.isArray(rows)) return false;
  return rows.some((row) => {
    if (!isRecord(row)) return false;
    return hasValue(row.value) || hasValue(row.locationDesc) || hasValue(row.notes);
  });
}

function hasInfoSectionContent(section: unknown): boolean {
  if (!isRecord(section)) return false;
  const descs = section.descriptions;
  if (!Array.isArray(descs)) return false;
  return descs.some((d) => {
    if (typeof d === 'string') return d.trim().length > 0;
    if (!isRecord(d)) return false;
    return hasValue(d.fr) || hasValue(d.en);
  });
}

function hasDescriptionFieldContent(raw: Raw, field: string): boolean {
  if (!Array.isArray(raw.description)) return false;
  return raw.description.some((row) => isRecord(row) && hasValue(row[field]));
}

function asString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return '';
}

function hasDiscountRows(rows: unknown): boolean {
  return Array.isArray(rows) && rows.length > 0;
}

function preporteyArrivalRows(raw: Raw, key: 'howToArrive' | 'pickupService'): unknown {
  const info = raw.preporteyInformation;
  if (!isRecord(info)) return undefined;
  const arrival = info.ruArrivalInstructions;
  if (!isRecord(arrival)) return undefined;
  return arrival[key];
}

function preporteyInfoArray(raw: Raw, key: string): unknown {
  const info = raw.preporteyInformation;
  if (!isRecord(info)) return undefined;
  return info[key];
}

function hasTimeFeeRows(rows: unknown): boolean {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  return rows.some((row) => {
    if (!isRecord(row)) return false;
    return row.fromHour != null || row.toHour != null || row.fee != null;
  });
}

function depositHasAmount(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  const value = raw.value;
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isRuLinkedListing(raw: Raw): boolean {
  if (Array.isArray(raw.rentalUnitedIds) && raw.rentalUnitedIds.length > 0) return true;
  if (Array.isArray(raw.ruImportedFields) && raw.ruImportedFields.length > 0) return true;
  if (raw.syncToRentalUnited === true) return true;
  const info = raw.preporteyInformation;
  if (!isRecord(info)) return false;
  return Boolean(info.ruImportedAt || info.ruRawProperty);
}

/** Infère les champs remplis sur un listing lié RU (données actuelles). */
export function inferRuImportedFieldsFromData(raw: Raw, roomTypeOverride?: Raw): Set<string> {
  const rt = roomTypeOverride && Object.keys(roomTypeOverride).length > 0 ? roomTypeOverride : firstRoomType(raw);
  const out = new Set<string>();
  const mark = (key: string, ok: boolean) => {
    if (ok) out.add(key);
  };

  mark('name', hasValue(raw.name));
  mark('propertyType', hasValue(raw.propertyType));
  mark('roomTypeConfigId', hasValue(rt.roomTypeConfigId));
  mark('floor', raw.floor != null && Number.isFinite(Number(raw.floor)));
  mark('totalFloor', raw.totalFloor != null && Number(raw.totalFloor) > 0);
  mark('personCapacity', hasValue(rt.personCapacity));
  mark('personCapacityMax', hasValue(raw.personCapacityMax) || hasValue(rt.personCapacityMax));
  mark('surface', hasValue(rt.surface) || hasValue(raw.surface));
  mark('bedroomsNumber', hasValue(rt.bedroomsNumber) || hasValue(raw.bedroomsNumber));
  mark('bathroomsNumber', hasValue(rt.bathroomsNumber) || hasValue(raw.bathroomsNumber));
  mark('bedsNumber', hasValue(rt.bedsNumber) || hasValue(raw.bedsNumber));
  mark('description', hasDescriptionContent(raw));
  mark('headline', hasDescriptionContent(raw));
  mark('airbnbSummary', hasValue(raw.airbnbSummary));
  mark('active', raw.active != null);

  mark('state', hasValue(raw.state));
  mark('city', hasValue(raw.city));
  mark('address', hasValue(raw.address));
  mark('zipcode', hasValue(raw.zipcode));
  mark('place', hasValue(raw.place));
  mark('country', hasValue(raw.country));
  mark('lat', hasValue(raw.lat) && Number(raw.lat) !== 0);
  mark('lng', hasValue(raw.lng) && Number(raw.lng) !== 0);

  mark('basePrice', hasValue(rt.basePrice) || hasValue(raw.basePrice));
  mark('currencyCode', hasValue(raw.currencyCode));
  mark('extra', raw.extra != null && Number(raw.extra) > 0);

  mark('checkInTimeStart', hasValue(raw.checkInTimeStart));
  mark('checkInTimeEnd', hasValue(raw.checkInTimeEnd));
  mark('checkOutTime', hasValue(raw.checkOutTime));
  mark('preparationTimeBeforeArrival', hasValue(raw.preparationTimeBeforeArrivalInHours));
  mark('minStay', hasValue(raw.minNights));
  mark('maxStay', hasValue(raw.maxNights));

  mark('additionalFees', Array.isArray(raw.additionalFees) && raw.additionalFees.length > 0);
  mark('deposit', depositHasAmount(raw.deposit));
  mark('securityDeposit', depositHasAmount(raw.securityDeposit));
  mark('cancellation', Array.isArray(raw.cancellationPolicies) && raw.cancellationPolicies.length > 0);

  mark('listingImages', Array.isArray(raw.listingImages) && raw.listingImages.length > 0);
  mark(
    'listingAmenitiesIds',
    (Array.isArray(raw.listingAmenitiesIds) && raw.listingAmenitiesIds.length > 0) ||
      (Array.isArray(raw.roomAmenities) && raw.roomAmenities.length > 0),
  );

  mark('licenceInfo', hasLicenceData(raw));
  mark('licenceNumber', hasLicenceData(raw));
  mark('licenceType', hasValue(raw.licenceType) || hasValue((raw.licenceInfo as Raw)?.licenceType));
  mark('issueDate', hasValue((raw.licenceInfo as Raw)?.issueDate));
  mark('expirationDate', hasValue((raw.licenceInfo as Raw)?.expirationDate));

  mark('daysBeforeArrival', hasValue(raw.daysBeforeArrival));
  mark('arrivalLandlord', hasValue(raw.arrivalLandlord));
  mark('arrivalEmail', hasValue(raw.arrivalEmail));
  mark('arrivalPhone', hasValue(raw.arrivalPhone));
  mark(
    'howToArrive',
    hasLocalizedRowsContent(raw.howToArrive) || hasLocalizedRowsContent(preporteyArrivalRows(raw, 'howToArrive')),
  );
  mark(
    'pickupService',
    hasLocalizedRowsContent(raw.pickupService) ||
      hasLocalizedRowsContent(preporteyArrivalRows(raw, 'pickupService')) ||
      hasDescriptionFieldContent(raw, 'pickupService'),
  );
  mark('paymentMethods', Array.isArray(raw.paymentMethods) && raw.paymentMethods.length > 0);
  mark('rulesAndInfo', hasValue(raw.rulesAndInfo) || hasRulesAndInfoRules(raw) || hasRulesAndInfoInfoUtils(raw));
  mark('houseRule', hasValue(raw.houseRule) || hasRulesAndInfoRules(raw));
  mark('note', hasValue(raw.note) || hasRulesAndInfoInfoUtils(raw));
  mark(
    'center',
    hasInfoSectionContent(raw.center) || hasDescriptionFieldContent(raw, 'neighborhood'),
  );
  mark(
    'transport',
    hasInfoSectionContent(raw.transport) || hasDescriptionFieldContent(raw, 'access'),
  );
  mark('policy', hasValue(raw.policy));
  mark(
    'zoneDescription',
    hasLocalizedRowsContent(raw.zoneDescription) ||
      hasDescriptionFieldContent(raw, 'locationDesc'),
  );
  mark('longStayDiscounts', hasDiscountRows(raw.longStayDiscounts));
  mark('lastMinuteDiscount', hasDiscountRows(raw.lastMinuteDiscount));
  mark('standardGuests', hasValue(raw.standardGuests));
  mark(
    'ruLateArrivalFees',
    hasTimeFeeRows(raw.ruLateArrivalFees) || hasTimeFeeRows(preporteyInfoArray(raw, 'ruLateArrivalFees')),
  );
  mark(
    'ruEarlyDepartureFees',
    hasTimeFeeRows(raw.ruEarlyDepartureFees) ||
      hasTimeFeeRows(preporteyInfoArray(raw, 'ruEarlyDepartureFees')),
  );
  mark('ruExternalListing', hasValue(raw.ruExternalListing));
  mark('rentalUnitedIds', Array.isArray(raw.rentalUnitedIds) && raw.rentalUnitedIds.length > 0);
  mark('rentalUnitedBuildingId', hasValue(raw.rentalUnitedBuildingId));
  mark('syncToRentalUnited', raw.syncToRentalUnited === true);
  mark('timeZoneName', hasValue(raw.timeZoneName));
  mark('wifiUsername', hasValue(raw.wifiUsername) || hasWifiInDescription(raw));
  mark('wifiPassword', hasValue(raw.wifiPassword));
  if (isRecord(raw.ruChannelToggles)) {
    mark('instantBookable', true);
    mark('checkInMethod', true);
    mark('petsAllowed', true);
    if (raw.petsMax != null && Number(raw.petsMax) > 0) mark('petsMax', true);
    mark('childrenAllowed', true);
    mark('infantsAllowed', true);
    mark('smokingAllowed', true);
    mark('eventsAllowed', true);
  } else {
    mark(
      'instantBookable',
      raw.instantBooking === true ||
        raw.onlineCheckIn === true ||
        (hasValue(raw.instantBookingMode) && raw.instantBookingMode !== 'off'),
    );
    mark('petsAllowed', raw.petsAllowed === true);
    if (raw.petsMax != null && Number(raw.petsMax) > 0) mark('petsMax', true);
    mark('childrenAllowed', raw.childrenAllowed != null);
    mark('infantsAllowed', raw.infantsAllowed != null);
    mark('smokingAllowed', raw.smokingAllowed != null);
    mark('eventsAllowed', raw.eventsAllowed != null);
    mark('checkInMethod', hasValue(raw.checkInMethod));
  }
  mark('messageCheckin', Array.isArray(raw.messageCheckin) && raw.messageCheckin.length > 0);
  mark('messageCheckout', Array.isArray(raw.messageCheckout) && raw.messageCheckout.length > 0);

  return out;
}

/**
 * Snapshot import (ruImportedFields) + inférence sur listing RU pour badge I complet.
 */
export function resolveRuImportedFields(raw: Raw | null | undefined): Set<string> {
  if (!raw) return new Set();

  const out = new Set<string>();
  const explicit = raw.ruImportedFields;
  if (Array.isArray(explicit)) {
    for (const k of explicit) out.add(String(k));
  }

  if (isRuLinkedListing(raw)) {
    for (const k of inferRuImportedFieldsFromData(raw)) out.add(k);
  }

  return out;
}

export function isListingImageImportedFromRu(img: Raw): boolean {
  if (img.importedFromRu === true) return true;
  if (Array.isArray(img.imageTypeRuId) && img.imageTypeRuId.length > 0) return true;
  return false;
}
