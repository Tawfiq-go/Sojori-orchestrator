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
  cityId?: string;
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
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessEmergency?: boolean;
  /** Compact / planning Multi — ids + noms des roomTypes (+ rooms physiques si compact). */
  roomTypes?: Array<{
    id: string;
    name: string;
    rooms?: Array<{ id: string; name: string; number?: number }>;
  }>;
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
  city?: string;
  currencyCode?: string;
  currency?: string;
  coverImageUrl?: string;
  photoColor?: string;
  photoColorDeep?: string;
  /** Revue calendrier post-import — distinct de l’orchestration. */
  calendarImportReview?: {
    active?: boolean;
    startedAt?: string | null;
    completedAt?: string | null;
  } | null;
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

/* ══════════════════════════════════════════════════════════════════════════
 * STRUCTURE PHYSIQUE D'UN ÉTABLISSEMENT (Multi / hôtel)
 * Miroir de GET /listings/:listingId/structure (srv-listing).
 *
 * Hiérarchie alignée sur Mews : Bâtiment (Enterprise) → RoomType
 * (ResourceCategory, l'unité de VENTE) → Room (Resource, l'unité PHYSIQUE).
 * ══════════════════════════════════════════════════════════════════════════ */

/** États Mews `Resource.State`. OutOfOrder/OutOfService = non vendable. */
export type HousekeepingState =
  | 'Dirty'
  | 'Clean'
  | 'Inspected'
  | 'OutOfOrder'
  | 'OutOfService';

/** Chambre PHYSIQUE — ce qu'on assigne à un client et ce qu'on fait nettoyer. */
export interface ListingStructureRoom {
  id: string;
  /** « Villa 05 » — le nom que voit le staff. */
  name: string;
  number: number | null;
  code: string | null;
  enabled: boolean;
  housekeepingState: HousekeepingState | string | null;
  housekeepingStateUpdatedAt?: string | null;
  /** Calculé serveur : enabled && état ∉ {OutOfOrder, OutOfService}. */
  sellable: boolean;
}

/** Type de chambre — l'unité de VENTE (ce qui part vers les OTA). */
export interface ListingStructureRoomType {
  id: string;
  /** Nom interne / mapping Mews. */
  name: string;
  /** Nom public poussé aux OTA (fallback `name` si vide). */
  otaDisplayName: string | null;
  capacity: number | null;
  capacityMax: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  surface: number | null;
  basePrice: number | null;
  active: boolean;
  /** Compteur THÉORIQUE saisi sur le type — ne jamais l'afficher seul. */
  declaredUnits: number;
  /** Chambres réellement créées en base. */
  physicalRooms: number;
  /** Capacité RÉELLE — celle qui vaut pour l'occupation et le RevPAR. */
  sellableRooms: number;
  rentalUnitedId: string | null;
  ruObjectTypeId: string | null;
  paidPrivatePool?: boolean;
  privatePoolPricePerDayMad?: number | null;
  paidBeds?: boolean;
  bedsPricePerDayMad?: number | null;
  rooms: ListingStructureRoom[];
}

export interface ListingStructure {
  success: boolean;
  building: {
    id: string;
    name: string;
    nickname: string | null;
    propertyType: string | null;
    /** 'Multi' = hôtel/resort · 'Single' = logement entier. */
    propertyUnit: 'Multi' | 'Single' | string;
    city: string | null;
    address: string | null;
    district: string | null;
    active: boolean;
    paidPrivatePool?: boolean;
    privatePoolPricePerDayMad?: number | null;
    paidBeds?: boolean;
    bedsPricePerDayMad?: number | null;
  };
  totals: {
    roomTypes: number;
    declaredUnits: number;
    physicalRooms: number;
    sellableRooms: number;
  };
  roomTypes: ListingStructureRoomType[];
  /** Chambres rattachées à aucun type — défaut de données à montrer, pas à masquer. */
  orphanRooms: ListingStructureRoom[];
}
