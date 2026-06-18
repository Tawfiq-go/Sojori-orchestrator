import { isAxiosError } from 'axios';
import apiClient from './apiClient';
import {
  getStoredChannelsData,
  getStoredListings,
} from '../data/catalogueMock';
import { amenityNameToDisplay } from '../utils/amenityDisplayName';
import {
  CHANNEX_MAPPING_UNAVAILABLE_INFO,
  type ListingChannelsSnapshot,
  type ListingChannelsRoomType,
  type ListingDetail,
  type ListingImage,
  type ListingMutationPayload,
  type ListingPricingSnapshot,
  type ListingsStats,
  type ListingStatus,
  type ListingSummary,
  type ListingRoomTypeSummary,
  type ServiceResult,
  type RentalUnitedSyncResult,
} from '../types/listings.types';
import type { ClientServicesPayload } from '../utils/mapApiListingToListingRecord';
import { getOwners } from './teamDashboardApi';
import { getOwnerListLabel } from '../utils/ownerDisplay.utils';
import {
  LISTING_API_BASE_URL,
  logListingApiRequest,
  logListingActivationSave,
  describeListingApiRequest,
} from '../config/listingApiBase';

export { LISTING_API_BASE_URL, describeListingApiRequest, logListingApiRequest };

/** Même ordre que sojori-dashboard `getPredefinedCategories` / AmenityCategories.jsx */
export function normalizeAmenityCategoryTabs(apiCategories: string[]): string[] {
  const rest = apiCategories.filter((cat) => {
    const lower = cat.toLowerCase();
    return lower !== 'all categories' && lower !== 'all' && lower !== 'basic';
  });
  return ['All Categories', 'Basic', ...rest];
}

/**
 * Même logique que sojori-dashboard `AmenitiesByCategories.handleTabChange` :
 * index 0 = tout, index 1 = Basic (basic=true), index 2+ = libellé de l’onglet.
 */
export function resolveSelectedCategoriesForTab(
  categoryTab: number,
  categoryTabs: string[],
): string[] {
  if (categoryTab <= 0) return [];
  if (categoryTab === 1) return ['Basic'];
  const label = categoryTabs[categoryTab];
  if (!label) return [];
  const lower = label.toLowerCase();
  if (lower === 'all categories' || lower === 'all' || lower === 'basic') {
    return lower === 'basic' ? ['Basic'] : [];
  }
  return [label];
}

/** Filtre affichage sélectionnés / appartenance catégorie (legacy getFilteredSelectedAmenities). */
export type RoomTabOptionLike = {
  id: string;
  label?: string;
  rentalId?: string | number;
};

/** IDs Rental United pour GET /amenities?roomIds=… (legacy AmenitiesByRooms). */
export function resolveRoomIdsForTab(
  roomTab: number,
  rooms: RoomTabOptionLike[],
): Array<string | number> | undefined {
  const current = rooms[roomTab];
  if (!current) return undefined;
  if (current.id === '__all__') {
    const ids = rooms
      .filter((r) => r.id !== '__all__' && r.rentalId != null)
      .map((r) => r.rentalId as string | number);
    return ids.length > 0 ? ids : undefined;
  }
  return current.rentalId != null ? [current.rentalId] : [current.id];
}

export function getAllEnabledCompositionRoomIds(rooms: RoomTabOptionLike[]): Array<string | number> {
  return rooms
    .filter((r) => r.id !== '__all__' && r.rentalId != null)
    .map((r) => r.rentalId as string | number);
}

/** Équipement applicable à la pièce (compositionRooms). */
export function amenityMatchesRoomFilter(
  amenity: {
    compositionRooms?: Array<{ roomId?: string | number }>;
  },
  filterRoomIds: Array<string | number> | undefined,
  allEnabledRoomIds: Array<string | number>,
): boolean {
  const targetIds = (
    filterRoomIds && filterRoomIds.length > 0
      ? filterRoomIds
      : allEnabledRoomIds
  ).map(String);
  if (targetIds.length === 0) return true;
  const comp = amenity.compositionRooms;
  if (!comp || comp.length === 0) return false;
  return comp.some((r) => targetIds.includes(String(r.roomId)));
}

type RoomAmenityInstance = { amenities?: Array<{ _id?: string }> };
type RoomAmenityConfig = {
  roomId?: string | number;
  rooms?: RoomAmenityInstance[];
};
type RoomTypeWithAmenities = { roomAmenities?: RoomAmenityConfig[] };

/** Équipement assigné dans roomTypes[0].roomAmenities (instances par pièce). */
export function isAmenityAssignedInRoomAmenities(
  amenityId: string,
  roomTypes: unknown,
  filterRoomIds: Array<string | number> | undefined,
  allEnabledRoomIds: Array<string | number>,
): boolean {
  const targetIds = (
    filterRoomIds && filterRoomIds.length > 0
      ? filterRoomIds
      : allEnabledRoomIds
  ).map(String);
  if (targetIds.length === 0) return false;
  const rts = Array.isArray(roomTypes) ? roomTypes : [];
  const rt = rts[0] as RoomTypeWithAmenities | undefined;
  if (!rt?.roomAmenities) return false;
  for (const ra of rt.roomAmenities) {
    if (!targetIds.includes(String(ra.roomId))) continue;
    for (const inst of ra.rooms || []) {
      if (inst.amenities?.some((a) => String(a._id) === amenityId)) return true;
    }
  }
  return false;
}

export function listingAmenityMatchesRoomTab(
  item: {
    _id: string;
    amenityData?: {
      compositionRooms?: Array<{ roomId?: string | number }>;
    };
  },
  filterRoomIds: Array<string | number> | undefined,
  allEnabledRoomIds: Array<string | number>,
  roomTypes: unknown,
): boolean {
  const data = item.amenityData || {};
  if (amenityMatchesRoomFilter(data, filterRoomIds, allEnabledRoomIds)) return true;
  return isAmenityAssignedInRoomAmenities(
    item._id,
    roomTypes,
    filterRoomIds,
    allEnabledRoomIds,
  );
}

export function amenityMatchesCatalogCategories(
  amenity: {
    basic?: boolean;
    SojoriSubcategory?: unknown[];
    category?: string;
  },
  categories: string[],
): boolean {
  if (!categories.length) return true;
  const current = categories[0];
  if (current === 'Basic') return amenity.basic === true;
  const subcats = Array.isArray(amenity.SojoriSubcategory) ? amenity.SojoriSubcategory : [];
  for (const subcat of subcats) {
    if (typeof subcat === 'string' && subcat === current) return true;
    if (subcat && typeof subcat === 'object') {
      const o = subcat as Record<string, string>;
      if (
        o.en === current ||
        o.fr === current ||
        o.es === current ||
        o.it === current
      ) {
        return true;
      }
    }
  }
  return typeof amenity.category === 'string' && amenity.category === current;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function asString(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function asBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value === 'true') return true;
    if (value === 'false') return false;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item).trim())
    .filter((item) => item.length > 0);
}

function pickFirstNumber(source: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = asNumber(source[key]);
    if (value !== null) return value;
  }
  return null;
}

function pickFirstString(source: UnknownRecord, keys: string[]): string {
  for (const key of keys) {
    const value = asString(source[key]).trim();
    if (value) return value;
  }
  return '';
}

function deriveListingStatus(source: UnknownRecord): ListingStatus {
  if (source.staging === true || source.draft === true) return 'draft';
  if (source.active === false) return 'inactive';
  return 'active';
}

function normalizeListingImages(source: unknown): ListingImage[] {
  if (!Array.isArray(source)) return [];

  return source
    .map((item, index) => {
      const record = asRecord(item);
      const url = asString(record.url || record.image || record.src).trim();
      if (!url) return null;

      return {
        url,
        sortOrder: asNumber(record.sortOrder) ?? index,
      };
    })
    .filter((item): item is ListingImage => item !== null);
}

function normalizeRoomTypes(source: unknown): ListingRoomTypeSummary[] {
  if (!Array.isArray(source)) return [];

  return source.map((item, index) => {
    const record = asRecord(item);
    return {
      id: asString(record._id || record.id || `room-type-${index}`),
      name: pickFirstString(record, ['roomTypeName', 'name']) || `Room type ${index + 1}`,
      basePrice: pickFirstNumber(record, ['basePrice', 'price', 'minimumPrice']),
      roomCount: Array.isArray(record.rooms) ? record.rooms.length : asNumber(record.roomCount) ?? 0,
      channexRoomTypeId: asString(record.channexRoomTypeId),
      channexRatePlanIds: asStringArray(record.channexRatePlanIds),
      raw: record,
    };
  });
}

function normalizePricing(source: UnknownRecord): ListingPricingSnapshot {
  return {
    basePrice: pickFirstNumber(source, ['basePrice', 'minimumPrice', 'pricePerNight', 'nightlyPrice']),
    cleaningFee: pickFirstNumber(source, ['cleaningFee', 'cleaningPrice']),
    weekendMultiplier: pickFirstNumber(source, ['weekendMultiplier', 'weekendPriceMultiplier']),
    minNights: pickFirstNumber(source, ['minNights', 'minimumStay']),
    maxNights: pickFirstNumber(source, ['maxNights', 'maximumStay']),
    currency: pickFirstString(source, ['currency', 'currencyCode']) || null,
    useDynamicPrice: asBoolean(source.useDynamicPrice),
  };
}

function resolveOwnerRecord(record: UnknownRecord): UnknownRecord {
  const ownerRaw = record.owner;
  if (Array.isArray(ownerRaw) && ownerRaw.length > 0) return asRecord(ownerRaw[0]);
  if (ownerRaw && typeof ownerRaw === 'object' && !Array.isArray(ownerRaw)) {
    return asRecord(ownerRaw);
  }
  return asRecord(record.ownerDoc);
}

function collectRentalUnitedIds(record: UnknownRecord): string[] {
  const fromListing = asStringArray(record.rentalUnitedIds);
  const ids = new Set(fromListing.filter(Boolean));
  const roomTypes = Array.isArray(record.roomTypes) ? record.roomTypes : [];
  for (const rt of roomTypes) {
    const ruId = asString(asRecord(rt).rentalUnitedId).trim();
    if (ruId) ids.add(ruId);
  }
  const buildingId = asString(record.rentalUnitedBuildingId).trim();
  if (buildingId && ids.size === 0) ids.add(buildingId);
  return [...ids];
}

const UNKNOWN_OWNER_LABEL = 'Propriétaire inconnu';

async function enrichListingSummariesWithOwners(items: ListingSummary[]): Promise<ListingSummary[]> {
  const needsEnrich = items.some(
    (item) => item.ownerId && (!item.ownerName || item.ownerName === UNKNOWN_OWNER_LABEL),
  );
  if (!needsEnrich) return items;
  try {
    const res = (await getOwners({ page: 0, limit: 500, deleted: false, banned: false })) as {
      data?: unknown[];
    };
    const rows = Array.isArray(res?.data) ? res.data : [];
    const byId = new Map<string, string>();
    for (const row of rows) {
      const owner = asRecord(row);
      const id = asString(owner._id);
      if (id) byId.set(id, getOwnerListLabel(owner));
    }
    return items.map((item) => {
      if (!item.ownerId || (item.ownerName && item.ownerName !== UNKNOWN_OWNER_LABEL)) return item;
      const label = byId.get(String(item.ownerId));
      return label ? { ...item, ownerName: label } : item;
    });
  } catch {
    return items;
  }
}

function normalizeListingSummary(source: unknown): ListingSummary {
  const record = asRecord(source);
  const listingImages = normalizeListingImages(record.listingImages);
  const owner = resolveOwnerRecord(record);
  const ownerNameFromParts = [asString(owner.firstName).trim(), asString(owner.lastName).trim()]
    .filter(Boolean)
    .join(' ');
  const ownerName =
    pickFirstString(record, ['ownerName']) ||
    ownerNameFromParts ||
    pickFirstString(owner, ['companyName', 'email']) ||
    pickFirstString(record, ['ownerEmail']);

  return {
    id: asString(record._id || record.id),
    name: pickFirstString(record, ['name']) || 'Listing sans nom',
    city: pickFirstString(record, ['city']),
    country: pickFirstString(record, ['country']),
    ownerId: asString(record.ownerId || owner._id) || null,
    ownerName: ownerName || UNKNOWN_OWNER_LABEL,
    status: deriveListingStatus(record),
    active: record.active !== false,
    propertyUnit: pickFirstString(record, ['propertyUnit']) || 'N/A',
    channelManager: pickFirstString(record, ['channelManager']) || 'direct',
    channexListingId: pickFirstString(record, ['channexListingId']),
    rentalUnitedIds: collectRentalUnitedIds(record),
    coverImageUrl: listingImages[0]?.url || '',
    updatedAt: pickFirstString(record, ['updatedAt', 'createdAt']) || null,
    raw: record,
  };
}

function normalizeListingDetail(source: unknown): ListingDetail {
  const summary = normalizeListingSummary(source);
  const record = asRecord(source);

  return {
    ...summary,
    address: pickFirstString(record, ['address']),
    cityId: pickFirstString(record, ['cityId']),
    lat: pickFirstNumber(record, ['lat', 'latitude']),
    lng: pickFirstNumber(record, ['lng', 'longitude']),
    description: pickFirstString(record, ['description', 'shortDescription', 'longDescription']),
    listingImages: normalizeListingImages(record.listingImages),
    roomTypes: normalizeRoomTypes(record.roomTypes),
    pricing: normalizePricing(record),
  };
}

function normalizeChannelsSnapshot(source: unknown, listing?: ListingSummary): ListingChannelsSnapshot {
  const record = asRecord(source);
  const myListing = asRecord(record.myListing);
  const roomTypesSource = Array.isArray(record.roomTypes) ? record.roomTypes : [];

  const roomTypes: ListingChannelsRoomType[] = roomTypesSource.map((item, index) => {
    const roomTypeRecord = asRecord(item);
    const myRoomType = asRecord(roomTypeRecord.myRoomType);
    const ratePlansSource = Array.isArray(roomTypeRecord.ratePlans)
      ? roomTypeRecord.ratePlans
      : Array.isArray(roomTypeRecord.channexRatePlans)
        ? roomTypeRecord.channexRatePlans
        : [];

    return {
      id: asString(myRoomType._id || myRoomType.id || `channel-room-${index}`),
      name: pickFirstString(myRoomType, ['roomTypeName', 'name']) || `Room type ${index + 1}`,
      channexRoomTypeId: asString(myRoomType.channexRoomTypeId),
      ratePlans: ratePlansSource
        .map((plan) => {
          const planRecord = asRecord(plan);
          return pickFirstString(planRecord, ['title', 'name', 'id', '_id']);
        })
        .filter(Boolean),
      raw: roomTypeRecord,
    };
  });

  return {
    listingId: asString(myListing._id || listing?.id),
    listingName: pickFirstString(myListing, ['name']) || listing?.name || 'Listing',
    channelManager: pickFirstString(myListing, ['channelManager']) || listing?.channelManager || 'direct',
    channexListingId: pickFirstString(myListing, ['channexListingId']) || listing?.channexListingId || '',
    channexListing: isRecord(record.channexListing) ? record.channexListing : null,
    roomTypes,
  };
}

function buildServiceError(error: unknown): string {
  if (isAxiosError(error)) {
    const data = asRecord(error.response?.data);
    return (
      pickFirstString(data, ['message', 'error']) ||
      error.message ||
      `Erreur API (${error.response?.status ?? 'réseau'})`
    );
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (isRecord(error)) {
    const response = asRecord(error.response);
    const data = asRecord(response.data);
    return (
      pickFirstString(data, ['message', 'error']) ||
      pickFirstString(asRecord(error), ['message']) ||
      'Erreur API inconnue'
    );
  }
  return 'Erreur API inconnue';
}

export interface ListingSrvConfigFetchResult {
  data: unknown | null;
  error?: string;
  /** true when srv-listing returned HTTP 404 (config row missing). */
  notFound?: boolean;
}

function parseListingConfigPayload(body: unknown): ListingSrvConfigFetchResult {
  const p = asRecord(body);
  if (p.success === false) {
    return {
      data: null,
      error: pickFirstString(p, ['error', 'message']) || 'Requête refusée',
    };
  }
  if ('data' in p) {
    return { data: p.data };
  }
  return { data: p };
}

function listingConfigHttpStatus(error: unknown): number | undefined {
  if (isAxiosError(error)) {
    return error.response?.status;
  }
  if (isRecord(error)) {
    const response = asRecord(error.response);
    const status = response.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

async function safeListingConfigGet(url: string): Promise<ListingSrvConfigFetchResult> {
  try {
    const response = await apiClient.get(url);
    return parseListingConfigPayload(response.data);
  } catch (error) {
    const httpStatus = listingConfigHttpStatus(error);
    if (isRecord(error)) {
      const responsePayload = asRecord(error.response);
      const responseData = responsePayload.data;
      if (responseData !== undefined && responseData !== null) {
        const parsed = parseListingConfigPayload(responseData);
        if (parsed.error) {
          return { ...parsed, notFound: httpStatus === 404 };
        }
      }
    }
    return { data: null, error: buildServiceError(error), notFound: httpStatus === 404 };
  }
}

async function safeListingConfigPut(url: string, body: unknown): Promise<ListingSrvConfigFetchResult> {
  try {
    const response = await apiClient.put(url, body);
    return parseListingConfigPayload(response.data);
  } catch (error) {
    if (isRecord(error)) {
      const responsePayload = asRecord(error.response);
      const responseData = responsePayload.data;
      if (responseData !== undefined && responseData !== null) {
        const parsed = parseListingConfigPayload(responseData);
        if (parsed.error) {
          return parsed;
        }
      }
    }
    return { data: null, error: buildServiceError(error) };
  }
}

async function safeListingConfigPost(url: string, body: unknown): Promise<ListingSrvConfigFetchResult> {
  try {
    const response = await apiClient.post(url, body);
    return parseListingConfigPayload(response.data);
  } catch (error) {
    if (isRecord(error)) {
      const responsePayload = asRecord(error.response);
      const responseData = responsePayload.data;
      if (responseData !== undefined && responseData !== null) {
        const parsed = parseListingConfigPayload(responseData);
        if (parsed.error) {
          return parsed;
        }
      }
    }
    return { data: null, error: buildServiceError(error) };
  }
}

function buildMockListings(): ListingSummary[] {
  return getStoredListings().map((listing) => ({
    id: listing.id,
    name: listing.name,
    city: listing.city,
    country: listing.country,
    ownerId: listing.ownerId,
    ownerName: listing.ownerName,
    status: listing.status,
    active: listing.status === 'active',
    propertyUnit: listing.type,
    channelManager: listing.channels[0]?.name || 'direct',
    channexListingId: '',
    rentalUnitedIds: [],
    coverImageUrl: '',
    updatedAt: listing.updatedAt,
    raw: {
      mock: true,
      rating: listing.rating,
      reviewCount: listing.reviewCount,
      occupancy: listing.occupancy,
      adr: listing.adr,
      monthlyRevenue: listing.monthlyRevenue,
    },
  }));
}

function buildMockListingDetail(id: string): ListingDetail | null {
  const listing = getStoredListings().find((item) => item.id === id);
  if (!listing) return null;

  return {
    id: listing.id,
    name: listing.name,
    city: listing.city,
    country: listing.country,
    ownerId: listing.ownerId,
    ownerName: listing.ownerName,
    status: listing.status,
    active: listing.status === 'active',
    propertyUnit: listing.type,
    channelManager: listing.form.channels.preferredChannel || 'direct',
    channexListingId: '',
    rentalUnitedIds: [],
    coverImageUrl: listing.form.media.coverPhoto,
    updatedAt: listing.updatedAt,
    address: listing.form.address.street,
    cityId: '',
    lat: asNumber(listing.form.address.latitude),
    lng: asNumber(listing.form.address.longitude),
    description: listing.form.basic.longDescription,
    listingImages: listing.form.media.coverPhoto
      ? [{ url: listing.form.media.coverPhoto, sortOrder: 0 }]
      : [],
    roomTypes: [],
    pricing: {
      basePrice: listing.form.pricing.basePrice,
      cleaningFee: listing.form.pricing.cleaningFee,
      weekendMultiplier: listing.form.pricing.weekendMultiplier,
      minNights: listing.form.pricing.minStay,
      maxNights: listing.form.availability?.maxNights ?? null,
      currency: listing.form.pricing.currency,
      useDynamicPrice: null,
    },
    raw: { mock: true },
  };
}

function buildMockStats(): ListingsStats {
  const listings = getStoredListings();
  const active = listings.filter((item) => item.status === 'active').length;
  const inactive = listings.filter((item) => item.status === 'inactive').length;
  const draft = listings.filter((item) => item.status === 'draft').length;

  return {
    total: listings.length,
    active,
    inactive,
    draft,
  };
}

function buildMockChannelsSnapshot(listingId: string): ListingChannelsSnapshot | null {
  const listing = getStoredListings().find((item) => item.id === listingId);
  if (!listing) return null;

  const channelsData = getStoredChannelsData();
  const overview = channelsData.overview.filter((channel) =>
    listing.channels.some((connection) => connection.name === channel.name),
  );

  return {
    listingId: listing.id,
    listingName: listing.name,
    channelManager: listing.form.channels.preferredChannel || 'direct',
    channexListingId: '',
    channexListing: null,
    roomTypes: overview.map((channel) => ({
      id: channel.id,
      name: channel.name,
      channexRoomTypeId: '',
      ratePlans: channel.today > 0 ? [`ok:${channel.ok}/${channel.today}`] : [],
      raw: { mock: true, status: channel.status },
    })),
  };
}

export interface ListingAmenityRow {
  id: string;
  displayName: string;
  count: number;
  iconUrl: string;
}

function isExpectedMissingChannexMapping(message: string): boolean {
  const m = message.toLowerCase();
  if (m.includes('listing not found or missing channex')) return true;
  if (m.includes('missing channex')) return true;
  if (m.includes('no channex')) return true;
  if (m.includes('channex') && m.includes('not found')) return true;
  if (m.includes('channex') && (m.includes('invalid') || m.includes('absent'))) return true;
  return false;
}

export const listingsService = {
  apiBaseUrl: LISTING_API_BASE_URL,

  /**
   * Document listing brut tel que renvoyé par `GET /listings/by-id/:id` (pour le formulaire orchestrateur).
   * Retourne null si erreur réseau / 404 / listing absent.
   */
  async getListingDocument(listingId: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/listings/by-id/${listingId}`);
      const payload = asRecord(response.data);
      const listing = payload.listing;
      return isRecord(listing) ? listing : null;
    } catch {
      return null;
    }
  },

  /**
   * GET /api/v1/listing/listings (paginated) pour calendar
   * Basé sur sojori-dashboard/serverApi.calendar.js getMultiListing()
   */
  async getListingsForCalendar(
    page: number = 0,
    limit: number = 25,
    filters?: {
      countryNames?: string[];
      cityIds?: string[];
      tags?: string | string[];
      active?: boolean;
      name?: string;
      staging?: boolean;
    }
  ): Promise<{ success: boolean; data: any[]; total: number }> {
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      params.append('paged', 'true');
      params.append('useActiveFilter', 'true');
      params.append('active', (filters?.active ?? true).toString());
      params.append('forCalendar', 'true');

      if (filters?.countryNames && Array.isArray(filters.countryNames)) {
        filters.countryNames.forEach(country => {
          if (country) params.append('countryNames', country);
        });
      }

      if (filters?.cityIds && Array.isArray(filters.cityIds)) {
        filters.cityIds.forEach(cityId => {
          if (cityId) params.append('cityId[]', cityId);
        });
      }

      if (filters?.tags) {
        const tagsString = Array.isArray(filters.tags)
          ? filters.tags.join(',')
          : filters.tags;
        params.append('tags', tagsString);
      }

      if (filters?.name) {
        params.append('name', filters.name);
      }

      if (filters?.staging !== undefined) {
        params.append('staging', filters.staging.toString());
      }

      const url = `${LISTING_API_BASE_URL}/listings?${params.toString()}`;

      const response = await apiClient.get(url, {
        timeout: 60000,
      });

      const result = response.data;

      return {
        success: result.success !== false,
        data: result.data || [],
        total: result.total || 0,
      };
    } catch (error) {
      console.error('Error fetching listings for calendar:', error);
      return { success: false, data: [], total: 0 };
    }
  },

  /**
   * GET /api/v1/admin/country
   */
  async getCountries(): Promise<{ _id: string; name: string }[]> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://dev.sojori.com';
      const response = await apiClient.get(`${baseUrl}/api/v1/admin/country?paged=false`);
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  /**
   * GET /api/v1/admin/city
   * @param allCities — true = toutes les villes admin (dont hors usedInSojoriSysytem), requis pour l’import RU
   */
  async getCities(options?: {
    allCities?: boolean;
    limit?: number;
    search_text?: string;
  }): Promise<{ _id: string; name: string; countryId?: string }[]> {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'https://dev.sojori.com';
      const params = new URLSearchParams({
        page: '0',
        limit: String(options?.limit ?? 2000),
        paged: 'false',
        allCities: String(options?.allCities !== false),
        search_text: options?.search_text ?? '',
      });
      const response = await apiClient.get(`${baseUrl}/api/v1/admin/city?${params.toString()}`);
      const body = response.data;
      let rows: unknown[] = [];
      if (Array.isArray(body)) rows = body;
      else if (Array.isArray(asRecord(body).cities)) rows = asRecord(body).cities as unknown[];
      else if (Array.isArray(asRecord(asRecord(body).data).cities)) {
        rows = asRecord(asRecord(body).data).cities as unknown[];
      }
      return rows
        .map((row) => {
          const r = asRecord(row);
          const nameRaw = r.name;
          let name = '';
          if (typeof nameRaw === 'string') name = nameRaw;
          else if (isRecord(nameRaw)) {
            name =
              pickFirstString(nameRaw, ['fr', 'en', 'FR', 'EN', 'ar']) ||
              Object.values(nameRaw).find((v) => typeof v === 'string' && v) as string ||
              '';
          }
          return {
            _id: asString(r._id),
            name: name || asString(r._id),
            countryId: asString(r.countryId) || undefined,
          };
        })
        .filter((c) => c._id)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    } catch {
      return [];
    }
  },

  /**
   * GET /api/v1/listing/user/rentals-cities-mapping/:ownerId
   * Auto-sélection devise quand la ville change (legacy Address.jsx).
   */
  async getRentalsCitiesCurrencyMapping(ownerId: string): Promise<{
    hasMapping?: boolean;
    rentalsCitiesAndCurrencyMapping?: Array<{
      cityId?: string;
      cityName?: string;
      currency?: string;
    }>;
  } | null> {
    if (!ownerId) return null;
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/user/rentals-cities-mapping/${ownerId}`,
      );
      const body = asRecord(response.data);
      return {
        hasMapping: body.hasMapping === true,
        rentalsCitiesAndCurrencyMapping: Array.isArray(body.rentalsCitiesAndCurrencyMapping)
          ? (body.rentalsCitiesAndCurrencyMapping as Array<{
              cityId?: string;
              cityName?: string;
              currency?: string;
            }>)
          : [],
      };
    } catch {
      return null;
    }
  },

  /**
   * GET /api/v1/listing/tag
   */
  async getTags(): Promise<{ _id: string; name: string }[]> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/tag?paged=false`);
      return response.data?.data || [];
    } catch {
      return [];
    }
  },

  /** Concierge + support (même agrégat que le dashboard admin). */
  async getClientServicesBundle(listingId: string): Promise<ClientServicesPayload | null> {
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/listings/${listingId}/client-services`,
      );
      const payload = asRecord(response.data);
      if (payload.success === false) return null;
      const data = asRecord(payload.data);
      const transport = Array.isArray(data.transport) ? data.transport : [];
      const grocery = Array.isArray(data.grocery) ? data.grocery : [];
      const custom = Array.isArray(data.custom) ? data.custom : [];
      const support = Array.isArray(data.support) ? data.support : [];
      return {
        transport,
        grocery,
        custom,
        support,
        hasConciergeServices: Boolean(data.hasConciergeServices),
        hasSupportCategories: Boolean(data.hasSupportCategories),
      };
    } catch {
      return null;
    }
  },

  /** GET /listing-chatbot-config/:listingId — aligné dashboard admin (WhatsApp menu). */
  async getListingChatbotConfig(
    listingId: string,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    const q = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/listing-chatbot-config/${listingId}${q}`);
  },

  /** GET /listing-chatbot-config/:listingId/check-sync */
  async getListingChatbotSyncStatus(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/listing-chatbot-config/${listingId}/check-sync`);
  },

  /** GET /concierge-config/:listingId */
  async getListingConciergeConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/concierge-config/${listingId}`);
  },

  async getListingConciergeSyncStatus(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/concierge-config/${listingId}/check-sync`);
  },

  /** GET /listing-support-categories/:listingId */
  async getListingSupportCategoriesConfig(
    listingId: string,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    const q = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/listing-support-categories/${listingId}${q}`);
  },

  async getListingSupportSyncStatus(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(
      `${LISTING_API_BASE_URL}/listing-support-categories/${listingId}/check-sync`,
    );
  },

  /** GET /rules-and-info/:listingId */
  async getListingRulesAndInfoConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/rules-and-info/${listingId}`);
  },

  async getListingRulesSyncStatus(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/rules-and-info/${listingId}/check-sync`);
  },

  /** GET /listing-access/:listingId */
  async getListingAccessConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigGet(`${LISTING_API_BASE_URL}/listing-access/${listingId}`);
  },

  async updateListingChatbotOverrides(
    listingId: string,
    overrides: unknown[],
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(`${LISTING_API_BASE_URL}/listing-chatbot-config/${listingId}`, {
      overrides,
    });
  },

  async createListingChatbotConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/listing-chatbot-config`, { listingId });
  },

  async syncListingChatbotConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/listing-chatbot-config/${listingId}/sync`, {});
  },

  async updateListingConciergeServices(
    listingId: string,
    body: { transportServices: unknown[]; groceryServices: unknown[]; customServices: unknown[] },
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(`${LISTING_API_BASE_URL}/concierge-config/${listingId}`, body);
  },

  async createListingConciergeConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/concierge-config`, { listingId });
  },

  async syncListingConciergeConfig(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/concierge-config/${listingId}/sync`, {});
  },

  async updateListingSupportCategories(
    listingId: string,
    categories: unknown[],
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(`${LISTING_API_BASE_URL}/listing-support-categories/${listingId}`, {
      categories,
    });
  },

  async createListingSupportCategories(
    listingId: string,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/listing-support-categories`, {
      listingId,
      ...(ownerId ? { ownerId } : {}),
    });
  },

  /** GET /listing-service-client-config/:listingId */
  async getListingServiceClientConfig(
    listingId: string,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    const q = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
    return safeListingConfigGet(
      `${LISTING_API_BASE_URL}/listing-service-client-config/${listingId}${q}`,
    );
  },

  async createListingServiceClientConfig(
    listingId: string,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/listing-service-client-config`, {
      listingId,
      ...(ownerId ? { ownerId } : {}),
    });
  },

  async updateListingServiceClientConfig(
    listingId: string,
    body: Record<string, unknown>,
    ownerId?: string,
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(
      `${LISTING_API_BASE_URL}/listing-service-client-config/${listingId}`,
      { ...body, ...(ownerId ? { ownerId } : {}) },
    );
  },

  async syncListingSupportCategories(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(
      `${LISTING_API_BASE_URL}/listing-support-categories/${listingId}/sync`,
      {},
    );
  },

  async updateListingRulesAndInfo(
    listingId: string,
    rulesAndInfo: unknown,
  ): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(`${LISTING_API_BASE_URL}/rules-and-info/${listingId}`, {
      rulesAndInfo,
    });
  },

  async createListingRulesAndInfo(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/rules-and-info`, { listingId });
  },

  async syncListingRulesAndInfo(listingId: string): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/rules-and-info/${listingId}/sync`, {});
  },

  async updateListingAccess(listingId: string, body: unknown): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPut(`${LISTING_API_BASE_URL}/listing-access/${listingId}`, body);
  },

  async createListingAccess(body: unknown): Promise<ListingSrvConfigFetchResult> {
    return safeListingConfigPost(`${LISTING_API_BASE_URL}/listing-access`, body);
  },

  /**
   * GET /listings/listing-amenities/:listingId — aligné dashboard (`getListingAmenities`).
   * Retourne les équipements propriété avec quantités.
   */
  async getListingAmenitiesWithCounts(
    listingId: string,
  ): Promise<{ items: ListingAmenityRow[]; error?: string }> {
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/listings/listing-amenities/${listingId}`,
      );
      const payload = asRecord(response.data);
      if (payload.success === false) {
        return {
          items: [],
          error: pickFirstString(payload, ['message', 'error']) || 'Erreur API',
        };
      }
      const raw = payload.data;
      if (!Array.isArray(raw)) {
        return { items: [] };
      }
      const items: ListingAmenityRow[] = raw.map((row) => {
        const r = asRecord(row);
        return {
          id: asString(r._id),
          displayName: amenityNameToDisplay(r.name) || '—',
          count: asNumber(r.count) ?? 1,
          iconUrl: asString(r.iconUrl),
        };
      });
      return { items };
    } catch (error) {
      return { items: [], error: buildServiceError(error) };
    }
  },

  /**
   * GET /amenities — catalogue paginé (même service que le dashboard, recherche + filtre lits).
   * `useBed=false` & `ignoreBed=true` comme `getAmenities(..., false, true)` côté listing.
   */
  async getAmenitiesCatalogPage(options: {
    page?: number;
    limit?: number;
    paged?: boolean;
    searchText?: string;
    categories?: string[];
    roomIds?: Array<string | number>;
  }): Promise<{ items: Record<string, unknown>[]; total: number; error?: string }> {
    const page = options.page ?? 0;
    const limit = options.limit ?? 40;
    const paged = options.paged ?? true;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    params.set('paged', String(paged));
    params.set('useBed', 'false');
    params.set('ignoreBed', 'true');
    if (options.searchText?.trim()) {
      params.set('search_text', options.searchText.trim());
    }
    if (options.categories && options.categories.length > 0) {
      for (const category of options.categories) {
        if (category.toLowerCase() === 'basic') {
          params.set('basic', 'true');
        } else {
          params.append('categories', category);
        }
      }
    }
    if (options.roomIds && options.roomIds.length > 0) {
      for (const roomId of options.roomIds) {
        params.append('roomIds', String(roomId));
      }
    }
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/amenities?${params.toString()}`,
      );
      const payload = asRecord(response.data);
      if (payload.success === false) {
        return { items: [], total: asNumber(payload.total) ?? 0 };
      }
      const raw = payload.data;
      const arr = Array.isArray(raw) ? raw : [];
      const total = asNumber(payload.total) ?? arr.length;
      const items = arr.map((row) => {
        const r = asRecord(row);
        const id = asString(r._id || r.id);
        return {
          ...r,
          _id: id,
          id,
          name: r.name ?? amenityNameToDisplay(r.name) ?? '—',
          iconUrl: asString(r.iconUrl),
        };
      });
      return { items, total };
    } catch (error) {
      if (isAxiosError(error)) {
        const body = asRecord(error.response?.data);
        if (error.response?.status === 404 || body.success === false) {
          return { items: [], total: asNumber(body.total) ?? 0 };
        }
      }
      return { items: [], total: 0 };
    }
  },

  /**
   * Résout des équipements par ID — via GET /listings/listing-amenities/:listingId
   * (srv-listing n’a pas de POST /amenities/by-ids ; le dashboard hydrate via le catalogue ou ce GET).
   */
  async getAmenitiesByIds(ids: string[], listingId?: string): Promise<Record<string, unknown>[]> {
    if (ids.length === 0) return [];
    if (!listingId) return [];

    const idSet = new Set(ids.map(String));
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/listings/listing-amenities/${listingId}`,
      );
      const payload = asRecord(response.data);
      if (payload.success === false) return [];
      const raw = payload.data;
      if (!Array.isArray(raw)) return [];

      return raw
        .filter((row) => idSet.has(String(asRecord(row)._id)))
        .map((row) => {
          const r = asRecord(row);
          const id = asString(r._id);
          return { ...r, _id: id, id };
        });
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return [];
      }
      console.warn('[listings] getAmenitiesByIds via listing-amenities:', error);
      return [];
    }
  },

  /**
   * GET /composition-rooms/get — catalogue global des types de pièces (dashboard).
   * Pas de route /room-composition/:listingId sur srv-listing.
   */
  /** GET /listing-structure — config champs R / * (legacy FieldIndicator). */
  async getListingStructure(): Promise<Record<string, unknown> | null> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/listing-structure`);
      const payload = asRecord(response.data);
      if (payload.success === false) return null;
      const data = payload.data;
      if (Array.isArray(data) && data.length > 0) {
        return asRecord(data[0]);
      }
      if (data && typeof data === 'object') return asRecord(data);
      return null;
    } catch (error) {
      console.warn('[listings] listing-structure unavailable:', error);
      return null;
    }
  },

  /** GET /room-type-config/get — types de logement (Two Bedroom, etc.). */
  async getRoomTypeConfigs(): Promise<Array<{ _id: string; type: string }>> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/room-type-config/get`);
      const payload = asRecord(response.data);
      if (payload.success === false) return [];
      const raw = payload.data;
      if (!Array.isArray(raw)) return [];
      return raw.map((row, index) => {
        const r = asRecord(row);
        return {
          _id: asString(r._id || r.id || `rtc-${index}`),
          type: asString(r.type || r.name || r.roomTypeName || 'Type'),
        };
      });
    } catch (error) {
      console.warn('[listings] room-type-config/get unavailable:', error);
      return [];
    }
  },

  async getRoomComposition(): Promise<{ rooms?: unknown[] } | null> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/composition-rooms/get`);
      const payload = asRecord(response.data);
      if (payload.success === false) {
        return null;
      }
      const data = payload.data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const doc = asRecord(data);
        return { rooms: Array.isArray(doc.rooms) ? doc.rooms : [] };
      }
      return null;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.warn('[listings] composition-rooms/get unavailable:', error);
      return null;
    }
  },

  /**
   * Lits disponibles pour une pièce du catalogue composition (legacy RoomAmenitiesPopup).
   */
  async getBedAmenitiesForCompositionRoom(
    rentalId: string | number,
  ): Promise<Record<string, unknown>[]> {
    const params = new URLSearchParams();
    params.set('page', '0');
    params.set('limit', '300');
    params.set('paged', 'true');
    params.set('useBed', 'true');
    params.append('roomIds', String(rentalId));
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/amenities?${params.toString()}`,
      );
      const payload = asRecord(response.data);
      if (payload.success === false) return [];
      const raw = payload.data;
      const arr = Array.isArray(raw) ? raw : [];
      return arr
        .map((row) => asRecord(row))
        .filter((r) => r.useBed === true);
    } catch (error) {
      console.warn('[listings] getBedAmenitiesForCompositionRoom:', error);
      return [];
    }
  },

  /**
   * GET /amenities/categories - Fetch predefined amenity categories
   */
  async getPredefinedCategories(): Promise<string[]> {
    try {
      const response = await apiClient.get(
        `${LISTING_API_BASE_URL}/amenities/categories`,
      );
      const payload = asRecord(response.data);

      const dataObj = asRecord(payload.data);
      if (dataObj && Array.isArray(dataObj.categories)) {
        return normalizeAmenityCategoryTabs(dataObj.categories as string[]);
      }

      if (Array.isArray(payload.data)) {
        return normalizeAmenityCategoryTabs(payload.data as string[]);
      }
      if (Array.isArray(payload.categories)) {
        return normalizeAmenityCategoryTabs(payload.categories as string[]);
      }

      return normalizeAmenityCategoryTabs([]);
    } catch (error) {
      console.error('Error fetching predefined categories:', error);
      return normalizeAmenityCategoryTabs([]);
    }
  },

  async getListings(options?: {
    page?: number;
    limit?: number;
    staging?: boolean;
    useActiveFilter?: boolean;
    active?: boolean;
    name?: string;
    forListingsOverview?: boolean;
    compact?: boolean; // ⚡ Mode compact pour filtres/dropdowns
  }): Promise<ServiceResult<{ items: ListingSummary[]; total: number }>> {
    const page = options?.page ?? 0;
    const limit = options?.limit ?? 20;
    const staging = options?.staging ?? false;
    const compact = options?.compact === true;
    const forListingsOverview = compact
      ? false
      : (options?.forListingsOverview ?? true);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      staging: String(staging),
      forListingsOverview: String(forListingsOverview),
    });
    if (options?.useActiveFilter) {
      query.set('useActiveFilter', 'true');
      query.set('active', String(options.active !== false));
    }
    if (options?.name?.trim()) {
      query.set('name', options.name.trim());
    }
    if (compact) {
      query.set('compact', 'true'); // ⚡ Mode compact: uniquement {_id, name, city}
    }

    const url = `${LISTING_API_BASE_URL}/listings/?${query.toString()}`;

    try {
      const response = await apiClient.get(url);
      const payload = asRecord(response.data);
      if (payload.success === false) {
        throw new Error(pickFirstString(payload, ['message', 'error']) || 'Échec chargement listings');
      }
      const items = Array.isArray(payload.data)
        ? payload.data.map((item) => normalizeListingSummary(item))
        : [];
      const enriched = compact ? items : await enrichListingSummariesWithOwners(items);
      return {
        data: { items: enriched, total: asNumber(payload.total) ?? enriched.length },
        source: 'api',
      };
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return { data: { items: [], total: 0 }, source: 'api' };
      }
      throw error;
    }
  },

  async getListingById(listingId: string): Promise<ServiceResult<ListingDetail | null>> {
    const response = await apiClient.get(`${LISTING_API_BASE_URL}/listings/by-id/${listingId}`);
    const payload = asRecord(response.data);
    if (payload.success === false) {
      throw new Error(pickFirstString(payload, ['message', 'error']) || 'Listing introuvable');
    }
    const listing = normalizeListingDetail(payload.listing);
    return { data: listing.id ? listing : null, source: 'api' };
  },

  async getStats(): Promise<ServiceResult<ListingsStats>> {
    const response = await apiClient.get(`${LISTING_API_BASE_URL}/listings/stats`);
    const payload = asRecord(response.data);
    const total = asNumber(payload.totalListing) ?? 0;
    const active = asNumber(payload.totalActive) ?? 0;
    const inactive = asNumber(payload.totalInactive) ?? 0;
    return {
      data: {
        total,
        active,
        inactive,
        draft: Math.max(0, total - active - inactive),
      },
      source: 'api',
    };
  },
  async getChannels(listingId: string, listing?: ListingSummary): Promise<ServiceResult<ListingChannelsSnapshot | null>> {
    try {
      const response = await apiClient.get(`${LISTING_API_BASE_URL}/listings/channex-mapping/${listingId}`);
      const payload = asRecord(response.data);
      return {
        data: normalizeChannelsSnapshot(asRecord(payload.data), listing),
        source: 'api',
      };
    } catch (error) {
      const msg = buildServiceError(error);
      if (isExpectedMissingChannexMapping(msg)) {
        return {
          data: null,
          source: 'api',
          info: CHANNEX_MAPPING_UNAVAILABLE_INFO,
        };
      }
      return {
        data: null,
        source: 'api',
        warning: msg,
      };
    }
  },

  async syncListing(listingId: string): Promise<void> {
    await apiClient.post(`${LISTING_API_BASE_URL}/listings/sync-with-rental-united/${listingId}`);
  },


  /** POST /listings/create-property — même endpoint que le dashboard legacy (NewListing). */

  /** PUT /listings/quick-edit/:id — champs import RU (legacy ModifyListings). */
  async updateListingQuickEdit(
    listingId: string,
    payload: {
      name: string;
      active: boolean;
      rentalUnitedIds: string[];
      roomTypes: Array<{ _id: string; rentalUnitedId: string }>;
    },
  ): Promise<{
    success: boolean;
    message?: string;
    data?: {
      listing?: { name?: string; active?: boolean; rentalUnitedIds?: string[] };
      roomTypes?: Array<{ _id: string; roomTypeName?: string; rentalUnitedId?: string }>;
    };
  }> {
    const response = await apiClient.put(
      `${LISTING_API_BASE_URL}/listings/quick-edit/${listingId}`,
      payload,
    );
    return response.data as {
      success: boolean;
      message?: string;
      data?: {
        listing?: { name?: string; active?: boolean; rentalUnitedIds?: string[] };
        roomTypes?: Array<{ _id: string; roomTypeName?: string; rentalUnitedId?: string }>;
      };
    };
  },

  async createListingProperty(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await apiClient.post(
      `${LISTING_API_BASE_URL}/listings/create-property`,
      payload,
    );
    const body = asRecord(response.data);
    const data = body.data;
    if (isRecord(data)) return data;
    return body;
  },

  async createListing(payload: ListingMutationPayload): Promise<ListingDetail> {
    const response = await apiClient.post(`${LISTING_API_BASE_URL}/listings/create`, payload);
    const body = asRecord(response.data);
    return normalizeListingDetail(body.listing);
  },

  async updateListing(listingId: string, payload: Partial<ListingMutationPayload>): Promise<ListingDetail> {
    const response = await apiClient.put(`${LISTING_API_BASE_URL}/listings/update/${listingId}`, payload);
    const body = asRecord(response.data);
    return normalizeListingDetail(body.listing);
  },

  /** POST draft en cours d’édition → message interpolé avec dernière résa du listing. */
  async postDepartureMessagePreview(
    listingId: string,
    draft: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post(
      `${LISTING_API_BASE_URL}/listings/${listingId}/departure-message-preview`,
      draft,
    );
    const body = asRecord(response.data);
    if (body.success === false) {
      throw new Error(asString(body.error) || 'departure-message-preview failed');
    }
    const data = body.data;
    if (isRecord(data)) return data;
    return body;
  },

  /** Dernière résa du PM → message depuis listing sauvegardé (orchestration). */
  async getDepartureMessagePreviewByOwner(ownerId: string): Promise<Record<string, unknown>> {
    const response = await apiClient.get(
      `${LISTING_API_BASE_URL}/listings/departure-message-preview-by-owner/${ownerId}`,
    );
    const body = asRecord(response.data);
    if (body.success === false) {
      throw new Error(asString(body.error) || 'departure-message-preview-by-owner failed');
    }
    const data = body.data;
    if (isRecord(data)) return data;
    return body;
  },

  /** Draft template PM → aperçu live sans sauvegarder. */
  async postDepartureMessagePreviewByOwner(
    ownerId: string,
    draft: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await apiClient.post(
      `${LISTING_API_BASE_URL}/listings/departure-message-preview-by-owner/${ownerId}`,
      draft,
    );
    const body = asRecord(response.data);
    if (body.success === false) {
      throw new Error(asString(body.error) || 'departure-message-preview-by-owner failed');
    }
    const data = body.data;
    if (isRecord(data)) return data;
    return body;
  },

  /**
   * PUT /listings/update-property/:id — même contrat que sojori-dashboard (descriptions[], roomTypes, …).
   */
  async updateListingProperty(
    listingId: string,
    payload: Record<string, unknown>,
  ): Promise<Record<string, unknown> | null> {
    console.log('[LISTING UPDATE] Payload keys:', Object.keys(payload));
    console.log('[LISTING UPDATE] Fees fields:', {
      licenceIsExempt: payload.licenceIsExempt,
      cleaningFeeEnabled: payload.cleaningFeeEnabled,
      cleaningFee: payload.cleaningFee,
      cleaningFeeDiscriminator: payload.cleaningFeeDiscriminator,
      cityTaxEnabled: payload.cityTaxEnabled,
      cityTaxPerAdult: payload.cityTaxPerAdult,
      cityTaxDiscriminator: payload.cityTaxDiscriminator,
    });
    console.log('[LISTING UPDATE] Full payload:', JSON.stringify(payload, null, 2));

    const response = await apiClient.put(
      `${LISTING_API_BASE_URL}/listings/update-property/${listingId}`,
      payload,
    );
    const body = asRecord(response.data);
    if (body.success === false) {
      console.error('[LISTING UPDATE] Error response:', body);
      throw new Error(asString(body.message) || 'update-property failed');
    }
    const data = body.data;
    if (isRecord(data)) return data;
    return body;
  },

  /** GET template orchestration (global ou owner). */
  async getListingOrchestrationTemplate(ownerKey: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/listing-orchestration-template/${encodeURIComponent(ownerKey)}`,
    );
    return data;
  },

  async putListingOrchestrationTemplate(ownerKey: string, flags: Record<string, boolean>) {
    const { data } = await apiClient.put(
      `${LISTING_API_BASE_URL}/listing-orchestration-template/${encodeURIComponent(ownerKey)}`,
      flags,
    );
    return data;
  },

  /** Flags effectifs + overrides pour un listing (legacy template). */
  async getListingOrchestrationTemplateEffective(listingId: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/listing-orchestration-template/by-listing/${listingId}/effective`,
    );
    return data;
  },

  /** @deprecated alias template — préférer getListingOrchestrationEffective */
  async getListingOrchestrationEffective(listingId: string) {
    return this.getListingOrchestrationCompiled(listingId);
  },

  /** Document orchestration listing (404 si non migré). */
  async getListingOrchestration(listingId: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/listings/${listingId}/orchestration`,
    );
    return data;
  },

  /** Config effective compilée — workflows + categoryEnabled (source canonique). */
  async getListingOrchestrationCompiled(listingId: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/listings/${listingId}/orchestration-effective`,
    );
    return data;
  },

  async putListingOrchestration(
    listingId: string,
    patch: {
      orchestrationEnabled?: boolean;
      capabilities?: Record<string, unknown>;
      scheduledMessages?: unknown[];
    },
  ) {
    const { data } = await apiClient.put(
      `${LISTING_API_BASE_URL}/listings/${listingId}/orchestration`,
      patch,
    );
    return data;
  },

  async getListingServiceActivation(listingId: string) {
    const path = `/listings/${listingId}/service-activation`;
    logListingApiRequest('GET', path);
    const { data } = await apiClient.get(`${LISTING_API_BASE_URL}${path}`);
    return data;
  },

  async putListingServiceActivation(
    listingId: string,
    patch: { overrides?: Record<string, boolean>; unset?: string[]; activations?: Record<string, boolean> },
  ) {
    const path = `/listings/${listingId}/service-activation`;
    logListingApiRequest('PUT', path);
    try {
      const response = await apiClient.put(`${LISTING_API_BASE_URL}${path}`, patch);
      logListingActivationSave(listingId, 'PUT', path, patch, {
        status: response.status,
        data: response.data,
      });
      return response.data;
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        logListingActivationSave(listingId, 'PUT', path, patch, undefined, {
          status: error.response?.status,
          data: error.response?.data ?? error.message,
        });
      }
      throw error;
    }
  },

  async applyListingOrchestrationFromOwner(listingId: string) {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/owner-orchestration/by-listing/${listingId}/apply-owner-template`,
      {},
    );
    return data;
  },

  async getOwnerOrchestrationCompiled(ownerKey: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/owner-orchestration/${encodeURIComponent(ownerKey)}/orchestration-effective`,
    );
    return data;
  },

  async putOwnerOrchestration(
    ownerKey: string,
    patch: {
      orchestrationEnabled?: boolean;
      capabilities?: Record<string, unknown>;
      scheduledMessages?: unknown[];
    },
  ) {
    const { data } = await apiClient.put(
      `${LISTING_API_BASE_URL}/owner-orchestration/${encodeURIComponent(ownerKey)}/orchestration`,
      patch,
    );
    return data;
  },

  async applyOwnerOrchestrationToAllListings(ownerKey: string) {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/owner-orchestration/${encodeURIComponent(ownerKey)}/apply-listings`,
      {},
    );
    return data;
  },

  /** Admin global → modèle orchestration d'un PM (owner_orchestrations + template listing). */
  async syncOwnerOrchestrationFromAdminToOwner(
    ownerId: string,
    mode: 'auto' | 'bootstrap' | 'library_update' = 'auto',
  ) {
    const url = `${LISTING_API_BASE_URL}/owner-orchestration/global/sync-owner/${ownerId}?mode=${mode}`;
    const { data } = await apiClient.post(url, {});
    return data;
  },

  async syncOwnerOrchestrationFromAdminToAllOwners() {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/owner-orchestration/global/sync-all-owners`,
      {},
    );
    return data;
  },

  async syncOrchestrationTemplateToOwner(
    ownerId: string,
    mode: 'auto' | 'bootstrap' | 'library_update' = 'auto',
  ) {
    const url = `${LISTING_API_BASE_URL}/listing-orchestration-template/global/sync-owner/${ownerId}?mode=${mode}`;
    console.log('[listingsService] POST', url);
    try {
      const { data } = await apiClient.post(url, {});
      console.log('[listingsService] sync-owner response', data);
      return data;
    } catch (e) {
      console.error('[listingsService] sync-owner failed', ownerId, e);
      throw e;
    }
  },

  async syncOrchestrationTemplateToAllOwners() {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/listing-orchestration-template/global/sync-all-owners`,
      {},
    );
    return data;
  },

  /** Copie la config d’un listing (ex. Harcay) vers template Admin global. */
  async syncOrchestrationTemplateToOwnerListings(ownerId: string) {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/listing-orchestration-template/${ownerId}/sync-listings`,
      {},
    );
    return data;
  },

  async getListingOwnerConfigTemplate(ownerKey: string) {
    const { data } = await apiClient.get(
      `${LISTING_API_BASE_URL}/listing-owner-config-template/${encodeURIComponent(ownerKey)}`,
    );
    return data;
  },

  async putListingOwnerConfigTemplateSection(
    ownerKey: string,
    section: 'access' | 'support' | 'concierge' | 'listing' | 'serviceClient' | 'chatbot' | 'rulesAndInfo',
    payload: Record<string, unknown>,
  ) {
    const { data } = await apiClient.put(
      `${LISTING_API_BASE_URL}/listing-owner-config-template/${encodeURIComponent(ownerKey)}/${section}`,
      payload,
    );
    return data;
  },

  async applyListingOwnerConfigFromOwner(listingId: string) {
    const { data } = await apiClient.post(
      `${LISTING_API_BASE_URL}/listing-owner-config-template/by-listing/${listingId}/apply-owner-template`,
      {},
    );
    return data;
  },

  async deleteListing(listingId: string): Promise<void> {
    await apiClient.delete(`${LISTING_API_BASE_URL}/listings/delete-listing/${listingId}`);
  },

  /**
   * POST /listings/ota-channels-verify/:listingId
   * Rafraîchit les canaux de distribution connectés pour une annonce via Rental United
   * et persiste `otaChannelsSnapshot` dans la base de données.
   */
  async verifyOtaChannels(listingId: string): Promise<{ success: boolean; data?: unknown; error?: string }> {
    try {
      const response = await apiClient.post(
        `${LISTING_API_BASE_URL}/listings/ota-channels-verify/${listingId}`,
        {},
        { timeout: 240000 }, // 4 minutes timeout (API peut être lent)
      );
      const payload = asRecord(response.data);
      return {
        success: payload.success !== false,
        data: payload.data,
      };
    } catch (error) {
      return {
        success: false,
        error: buildServiceError(error),
      };
    }
  },

  /**
   * GET /api/v1/listing/listings?staging=false&compact=false
   * Récupère la liste des listings avec leurs roomTypes (pour le modal de création de réservation)
   *
   * Basé sur le Legacy dashboard: serverApi.reservation.jsx getListings()
   * ⚠️ IMPORTANT: compact=false pour avoir les roomTypes complets
   */
  async getListingsWithRoomTypes(options?: {
    staging?: boolean;
    compact?: boolean;
    active?: boolean;
  }): Promise<{
    success: boolean;
    data: Array<{
      id: string;
      name: string;
      checkInTime?: string;
      checkOutTime?: string;
      propertyUnit?: string;
      roomTypes: Array<{
        _id: string;
        roomTypeName: string;
        personCapacityMax?: number;
      }>;
    }>;
  }> {
    try {
      const staging = options?.staging ?? false;
      const compact = options?.compact ?? false; // false pour avoir roomTypes
      const active = options?.active ?? undefined;

      let url = `${LISTING_API_BASE_URL}/listings?staging=${staging}&compact=${compact}`;

      // ✅ Si active est défini, ajouter useActiveFilter=true + active=true/false
      if (active !== undefined) {
        url += `&useActiveFilter=true&active=${active}`;
      }

      const response = await apiClient.get(url);

      const payload = asRecord(response.data);

      if (payload.success === false) {
        return { success: false, data: [] };
      }

      const listings = Array.isArray(payload.data) ? payload.data : [];

      const mappedListings = listings.map((listing: any) => {
        const record = asRecord(listing);
        return {
          id: asString(record._id || record.id),
          name: asString(record.name),
          checkInTime: asString(record.checkInTimeStart || record.checkInTime),
          checkOutTime: asString(record.checkOutTime),
          propertyUnit: asString(record.propertyUnit),
          roomTypes: Array.isArray(record.roomTypes)
            ? record.roomTypes.map((rt: any) => {
                const roomType = asRecord(rt);
                return {
                  _id: asString(roomType._id || roomType.id),
                  roomTypeName: asString(roomType.roomTypeName || roomType.name),
                  personCapacityMax: asNumber(roomType.personCapacityMax) ?? 0,
                };
              })
            : [],
        };
      });

      return {
        success: true,
        data: mappedListings,
      };
    } catch (error) {
      console.error('Error fetching listings with room types:', error);

      // Backend retourne 404 quand 0 listings → retourner [] au lieu de throw
      if (isRecord(error)) {
        const responsePayload = asRecord(error.response);
        if (responsePayload.status === 404) {
          const data = asRecord(responsePayload.data);
          const listings = Array.isArray(data.data) ? data.data : [];

          if (listings.length > 0) {
            // Même mapping si des données sont présentes dans la 404
            const mappedListings = listings.map((listing: any) => {
              const record = asRecord(listing);
              return {
                id: asString(record._id || record.id),
                name: asString(record.name),
                checkInTime: asString(record.checkInTimeStart || record.checkInTime),
                checkOutTime: asString(record.checkOutTime),
                propertyUnit: asString(record.propertyUnit),
                roomTypes: Array.isArray(record.roomTypes)
                  ? record.roomTypes.map((rt: any) => {
                      const roomType = asRecord(rt);
                      return {
                        _id: asString(roomType._id || roomType.id),
                        roomTypeName: asString(roomType.roomTypeName || roomType.name),
                        personCapacityMax: asNumber(roomType.personCapacityMax) ?? 0,
                      };
                    })
                  : [],
              };
            });

            return {
              success: true,
              data: mappedListings,
            };
          }
        }
      }

      return { success: false, data: [] };
    }
  },

  /**
   * Synchronise un listing vers RentalsUnited via srv-listing
   * POST /api/v1/listing/listings/sync-with-rental-united/:listingId
   *
   * srv-listing orchestre: récupération credentials RU, validation, appel srv-channels → RU APIs
   * Retourne { success, orchestrationId, data: { apiCallCount, propertyIds } }
   */
  async syncListingToRentalUnited(listingId: string): Promise<RentalUnitedSyncResult> {
    try {
      const url = `${LISTING_API_BASE_URL}/listings/sync-with-rental-united/${listingId}`;
      console.log('[syncListingToRentalUnited] Request URL:', url);
      console.log('[syncListingToRentalUnited] LISTING_API_BASE_URL:', LISTING_API_BASE_URL);
      console.log('[syncListingToRentalUnited] listingId:', listingId);

      const response = await apiClient.post(url, {}, { timeout: 60000 });

      console.log('[syncListingToRentalUnited] Response status:', response.status);
      console.log('[syncListingToRentalUnited] Response data:', response.data);

      const result = response.data;
      if (result?.success) {
        return {
          success: true,
          data: result.data || {},
          message: result.message || 'Listing successfully synchronized with RentalsUnited',
        };
      }

      console.warn('[syncListingToRentalUnited] Response success=false:', result);
      const ruErrors = Array.isArray(result?.data?.errors) ? result.data.errors : [];
      const ruDetail = ruErrors
        .map((e: { message?: string; step?: string }) => e?.message)
        .filter(Boolean)
        .join(' · ');
      return {
        success: false,
        data: result?.data || {},
        error: ruDetail || result?.message || 'Failed to sync listing to RentalsUnited',
      };
    } catch (error) {
      if (isAxiosError(error)) {
        const msg = error.response?.data?.message || error.response?.data?.error || error.message;
        console.error('[syncListingToRentalUnited] Axios error:');
        console.error('  - Status:', error.response?.status);
        console.error('  - Status text:', error.response?.statusText);
        console.error('  - Response data:', error.response?.data);
        console.error('  - Error message:', error.message);
        console.error('  - Full error:', error);
        return {
          success: false,
          error: msg || 'Failed to sync listing to RentalsUnited',
        };
      }

      console.error('[syncListingToRentalUnited] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to sync listing to RentalsUnited',
      };
    }
  },
};

export default listingsService;
