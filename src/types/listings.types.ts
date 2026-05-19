export const CHANNEX_MAPPING_UNAVAILABLE_INFO =
  'Mapping Channex indisponible pour ce listing.';

export type ListingStatus = 'active' | 'inactive' | 'draft';

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ListingImage {
  url: string;
  sortOrder: number;
}

export interface ListingPricingSnapshot {
  basePrice: number | null;
  cleaningFee: number | null;
  weekendMultiplier: number | null;
  minNights: number | null;
  maxNights: number | null;
  currency: string | null;
  useDynamicPrice: boolean | null;
}

export interface ListingRoomTypeSummary {
  id: string;
  name: string;
  basePrice: number | null;
  roomCount: number;
  channexRoomTypeId: string;
  channexRatePlanIds: string[];
  raw: Record<string, unknown>;
}

export interface ListingSummary {
  id: string;
  name: string;
  city: string;
  country: string;
  ownerId: string | null;
  ownerName: string;
  status: ListingStatus;
  active: boolean;
  propertyUnit: string;
  channelManager: string;
  channexListingId: string;
  rentalUnitedIds: string[];
  coverImageUrl: string;
  updatedAt: string | null;
  raw: Record<string, unknown>;
}

export interface ListingDetail extends ListingSummary {
  address: string;
  cityId: string;
  lat: number | null;
  lng: number | null;
  description: string;
  listingImages: ListingImage[];
  roomTypes: ListingRoomTypeSummary[];
  pricing: ListingPricingSnapshot;
}

export interface ListingChannelsRoomType {
  id: string;
  name: string;
  channexRoomTypeId: string;
  ratePlans: string[];
  raw: Record<string, unknown>;
}

export interface ListingChannelsSnapshot {
  listingId: string;
  listingName: string;
  channelManager: string;
  channexListingId: string;
  roomTypes: ListingChannelsRoomType[];
  raw?: Record<string, unknown>;
}

export interface ListingsStats {
  total: number;
  active: number;
  draft: number;
}

export interface ListingMutationPayload {
  [key: string]: unknown;
}

export type Listing = ListingSummary;
