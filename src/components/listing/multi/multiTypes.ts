/**
 * Tokens Listing Multi — alignés maquette Claude Design + Dashboard V2.
 * Single n’importe pas ce module.
 */
export const multiTokens = {
  primary: '#E6B022',
  primaryDeep: '#B8881A',
  primarySoft: '#F4CF5E',
  primaryTint: 'rgba(230,176,34,0.12)',
  info: '#0673b3',
  infoTint: 'rgba(6,115,179,0.10)',
  ai: '#8B5CF6',
  aiTint: 'rgba(139,92,246,0.10)',
  success: '#0a8f5e',
  error: '#c81e1e',
  errorTint: 'rgba(200,30,30,0.10)',
  bg0: '#f6f5f1',
  bg1: '#ffffff',
  bg2: '#f0eee8',
  bg3: '#e7e4dc',
  text: '#14110a',
  text2: '#55504a',
  text3: '#7a756c',
  text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)',
  borderStrong: 'rgba(20,17,10,0.14)',
  radius: '12px',
  mono: 'ui-monospace, "SF Mono", Menlo, monospace',
} as const;

export type MultiListingImage = {
  url: string;
  sortOrder?: number;
  fileName?: string | null;
  caption?: string;
};

export type MultiRoomTypeDraft = {
  /** client-only key */
  _key: string;
  _id?: string;
  roomTypeName: string;
  roomNumber: number;
  personCapacity: number;
  personCapacityMax?: number;
  bedsNumber: number;
  bedroomsNumber: number;
  bathroomsNumber: number;
  basePrice: number;
  surface: number;
  roomTypeImages: MultiListingImage[];
  amenitiesIds: Array<{ _id: string; count: number }>;
  ratePlanIds: string[];
  bedTypes: unknown[];
  roomAmenities: unknown[];
  useAddress: boolean;
  active: boolean;
  startCode: number;
  ranking: number;
  /** UI-only composition label */
  bedsLabel?: string;
  /** UI-only amenity chips (not persisted as amenity IDs in V1) */
  amenityLabels?: string[];
};

export type MultiCreateValues = {
  propertyUnit: 'Multi';
  name: string;
  address: string;
  description: Array<{ languageId?: string; languageRuId?: string; value?: string }>;
  listingImages: MultiListingImage[];
  roomTypes: MultiRoomTypeDraft[];
  country: string;
  city: string;
  cityId: string;
  ownerId?: string;
  active: boolean;
  directEnabled: boolean;
  atSojori: boolean;
  listingAmenitiesIds: unknown[];
  rulesAndInfo: { Rules: unknown[]; InfoUtils: unknown[] };
};

export const DEFAULT_AMENITY_LABELS = [
  'WiFi',
  'Climatisation',
  'Salle de bain privée',
  'TV',
  'Coffre-fort',
  'Sèche-cheveux',
  'Balcon',
  'Vue patio',
  'Minibar',
  'Bureau',
] as const;

export function newRoomTypeKey(): string {
  return `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyRoomType(partial?: Partial<MultiRoomTypeDraft>): MultiRoomTypeDraft {
  return {
    _key: newRoomTypeKey(),
    roomTypeName: 'Nouveau type',
    roomNumber: 1,
    personCapacity: 2,
    personCapacityMax: 2,
    bedsNumber: 1,
    bedroomsNumber: 1,
    bathroomsNumber: 1,
    basePrice: 500,
    surface: 20,
    roomTypeImages: [],
    amenitiesIds: [],
    ratePlanIds: [],
    bedTypes: [],
    roomAmenities: [],
    useAddress: true,
    active: true,
    startCode: 0,
    ranking: 0,
    bedsLabel: '1 lit double',
    amenityLabels: ['WiFi', 'Climatisation'],
    ...partial,
  };
}

/** Seed create Multi — cas principal V1 : 1 type × N (riad typologie unique). */
export function buildEmptyMultiCreateValues(): MultiCreateValues {
  return {
    propertyUnit: 'Multi',
    name: '',
    address: '',
    description: [{ value: '' }],
    listingImages: [],
    roomTypes: [
      createEmptyRoomType({
        roomTypeName: 'Chambre',
        roomNumber: 8,
        personCapacity: 2,
        bedsLabel: '1 lit double',
        basePrice: 750,
        amenityLabels: ['WiFi', 'Climatisation', 'Salle de bain privée', 'Sèche-cheveux'],
      }),
    ],
    country: '',
    city: '',
    cityId: '',
    active: false,
    directEnabled: false,
    atSojori: true,
    listingAmenitiesIds: [],
    rulesAndInfo: { Rules: [], InfoUtils: [] },
  };
}

export function totalUnits(roomTypes: MultiRoomTypeDraft[]): number {
  return roomTypes.reduce((sum, rt) => sum + Math.max(0, Number(rt.roomNumber) || 0), 0);
}

export function typePhotoCount(roomTypes: MultiRoomTypeDraft[]): number {
  return roomTypes.reduce((sum, rt) => sum + (rt.roomTypeImages?.length || 0), 0);
}
