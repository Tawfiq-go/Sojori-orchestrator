export type ListingStatus = 'active' | 'inactive' | 'draft';

export interface ListingImage {
  url: string;
  sortOrder: number;
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

export interface ListingRoomTypeSummary {
  id: string;
  name: string;
  basePrice: number | null;
  roomCount: number;
  channexRoomTypeId: string;
  channexRatePlanIds: string[];
  raw: Record<string, unknown>;
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
  channexListing: Record<string, unknown> | null;
  roomTypes: ListingChannelsRoomType[];
}

export interface ListingsStats {
  total: number;
  active: number;
  inactive: number;
  draft: number;
}

export interface ListingMutationPayload {
  atSojori: boolean;
  name: string;
  address: string;
  city: string;
  cityId: string;
  country: string;
  lat: number;
  lng: number;
  propertyUnit: string;
  listingImages?: ListingImage[];
  [key: string]: unknown;
}

/** `ServiceResult.info` quand GET channex-mapping échoue pour absence d’ID / listing non branché Channex (cas attendu). */
export const CHANNEX_MAPPING_UNAVAILABLE_INFO = 'channex_mapping_unavailable' as const;

export interface ServiceResult<T> {
  data: T;
  source: 'api' | 'mock';
  warning?: string;
  /** Cas métier attendu (ex. pas de mapping Channex), distinct d’une panne réseau. */
  info?: string;
}

export type RentalUnitedSyncPayload = {
  orchestrationId?: string;
  apiCallCount?: number;
  propertyIds?: string[];
};

/** POST sync-with-rental-united — shape consumed by ListingFormV2 publish flow. */
export type RentalUnitedSyncResult =
  | { success: true; data: RentalUnitedSyncPayload; message?: string }
  | { success: false; data?: RentalUnitedSyncPayload; error: string };

// ════════════════════════════════════════════════════════════════════
// Types pour API Calendar (basé sur sojori-dashboard)
// ════════════════════════════════════════════════════════════════════

/**
 * Listing pour calendar (payload léger avec forCalendar=true)
 * Retourné par GET /api/v1/listing/listings?forCalendar=true
 */
export interface Listing {
  _id: string;
  name: string;
  propertyUnit: string;
  active: boolean;
  calendarData?: CalendarDayData[];
  roomTypes?: Array<{
    id: string;
    name: string;
    inventory: Record<string, any>; // dateStr -> InventoryDay
  }>;
}

/**
 * Données d'un jour de calendrier (vient de srv-calendar)
 */
export interface CalendarDayData {
  _id?: string;
  date: string | Date;
  sojoriId?: string;
  hostawayId?: number;
  listingId?: number;
  price: number;
  minimumStay: number;
  maximumStay: number;
  isAvailable: boolean;
  status?: string;
  note?: string;
  closedOnArrival?: boolean;
  closedOnDeparture?: boolean;
  reservations: CalendarReservation[];
}

/**
 * Réservation dans une cellule calendrier
 */
export interface CalendarReservation {
  id: string;
  reservationId: string;
  arrivalDate: string;
  departureDate: string;
  guestName?: string;
  guestEmail?: string;
  totalPrice?: number;
  status?: string;
  source?: 'airbnb' | 'booking' | 'direct' | string;
}

/**
 * Réponse API GET /api/v1/listing/listings (paginated)
 */
export interface ListingsResponse {
  success: boolean;
  data: Listing[];
  total: number;
  page?: number;
  limit?: number;
  error?: string;
}

/**
 * Filtres pour la recherche de listings
 */
export interface ListingFilters {
  countryNames?: string[];
  cityIds?: string[];
  tags?: string | string[];
  active?: boolean;
  name?: string;
  staging?: boolean;
}
