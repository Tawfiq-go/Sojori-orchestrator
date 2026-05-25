type UnknownRecord = Record<string, unknown>;

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

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map(asString).filter(Boolean);
}

function collectRentalUnitedIds(record: UnknownRecord): string[] {
  const fromListing = asStringArray(record.rentalUnitedIds);
  const ids = new Set(fromListing);
  const roomTypes = Array.isArray(record.roomTypes) ? record.roomTypes : [];
  for (const rt of roomTypes) {
    const row = rt as UnknownRecord;
    const ruId = asString(row.rentalUnitedId).trim();
    if (ruId) ids.add(ruId);
  }
  const buildingId = asString(record.rentalUnitedBuildingId).trim();
  if (buildingId && ids.size === 0) ids.add(buildingId);
  return [...ids];
}

function resolveOwnerName(record: UnknownRecord): string {
  const ownerRaw = record.owner;
  let owner: UnknownRecord = {};
  if (Array.isArray(ownerRaw) && ownerRaw.length > 0) owner = ownerRaw[0] as UnknownRecord;
  else if (ownerRaw && typeof ownerRaw === 'object') owner = ownerRaw as UnknownRecord;

  const fromParts = [asString(owner.firstName), asString(owner.lastName)].filter(Boolean).join(' ');
  return (
    asString(record.ownerName) ||
    fromParts ||
    asString(owner.companyName) ||
    asString(owner.email) ||
    ''
  );
}

export type ChatbotListingSummary = {
  listingId: string;
  name: string;
  city: string;
  country: string;
  locationLine: string;
  propertyType: string;
  propertyUnit: string;
  channelManager: string;
  ownerName: string;
  rentalUnitedLabel: string | null;
  bedrooms?: number;
  bathrooms?: number;
  beds?: number;
  maxGuests?: number;
  personCapacity?: number;
  surface?: number;
  floor?: number;
  totalFloors?: number;
  listingUpdatedAt?: string;
  active: boolean;
};

export type ChatbotPropertyResumeDetail = ChatbotListingSummary & {
  address: string;
  zipcode: string;
  state: string;
  place: string;
  coordinates: string;
  roomTypeName: string;
  roomTypeId: string;
  instantBooking: boolean;
  staging: boolean;
  otaOnly: boolean;
  shortDescription: string;
  longDescription: string;
};

export function buildChatbotListingSummary(
  listingId: string,
  formValues: UnknownRecord,
  rawDoc?: UnknownRecord | null,
): ChatbotListingSummary {
  const raw = rawDoc ?? formValues;
  const ruIds = collectRentalUnitedIds(raw);
  const country = asString(formValues.country) || asString(raw.country);
  const city = asString(formValues.city) || asString(raw.city);
  const updatedRaw = raw.updatedAt ?? formValues.updatedAt;

  return {
    listingId,
    name: asString(formValues.name) || 'Listing sans nom',
    city,
    country,
    locationLine:
      asString(formValues.locationLine) ||
      [city, country].filter(Boolean).join(' · ') ||
      '—',
    propertyType: asString(formValues.propertyType) || '—',
    propertyUnit: asString(formValues.propertyUnit) || 'Single',
    channelManager: asString(raw.channelManager) || 'direct',
    ownerName: resolveOwnerName(raw) || '—',
    rentalUnitedLabel: ruIds.length ? ruIds.map((id) => `RU #${id}`).join(' · ') : null,
    bedrooms: asNumber(formValues.bedrooms),
    bathrooms: asNumber(formValues.bathrooms),
    beds: asNumber(formValues.beds),
    maxGuests: asNumber(formValues.personCapacityMax) ?? asNumber(formValues.guests),
    personCapacity: asNumber(formValues.personCapacity),
    surface: asNumber(formValues.sqm),
    floor: asNumber(formValues.floor),
    totalFloors: asNumber(formValues.totalFloor),
    listingUpdatedAt:
      typeof updatedRaw === 'string'
        ? updatedRaw
        : updatedRaw instanceof Date
          ? updatedRaw.toISOString()
          : undefined,
    active: formValues.active !== false,
  };
}

export function formatSummaryDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function displayMetric(value?: number): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(value);
}

function firstRoomType(record: UnknownRecord): UnknownRecord {
  const rts = record.roomTypes;
  if (!Array.isArray(rts) || rts.length === 0) return {};
  return rts[0] as UnknownRecord;
}

export function buildChatbotPropertyResumeDetail(
  listingId: string,
  formValues: UnknownRecord,
  rawDoc?: UnknownRecord | null,
): ChatbotPropertyResumeDetail {
  const summary = buildChatbotListingSummary(listingId, formValues, rawDoc);
  const raw = rawDoc ?? formValues;
  const rt = firstRoomType(raw);
  const lat = asNumber(formValues.lat) ?? asNumber(raw.lat);
  const lng = asNumber(formValues.lng) ?? asNumber(raw.lng);
  const coordinates =
    lat != null && lng != null ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : '—';

  return {
    ...summary,
    address: asString(formValues.address) || asString(raw.address),
    zipcode: asString(formValues.zipcode) || asString(raw.zipcode),
    state: asString(formValues.state) || asString(raw.state),
    place: asString(formValues.place) || asString(raw.place),
    coordinates,
    roomTypeName: asString(rt.roomTypeName) || asString(rt.name),
    roomTypeId: asString(rt._id) || asString(rt.id),
    instantBooking: formValues.instantBooking === true,
    staging: formValues.staging === true,
    otaOnly: formValues.otaOnly === true,
    shortDescription: asString(formValues.shortDescription),
    longDescription: asString(formValues.longDescription),
  };
}

export function boolLabel(on: boolean): string {
  return on ? 'Oui' : 'Non';
}
