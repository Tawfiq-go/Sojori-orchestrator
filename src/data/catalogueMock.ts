import { readStorage, writeStorage } from '../utils/mockStorage';

export type ListingStatus = 'active' | 'inactive' | 'draft';
export type ListingType = 'Villa' | 'Riad' | 'Apartment' | 'Loft' | 'House' | 'Studio';
export type PricingRuleKind = 'increase' | 'decrease';
export type ChannelStatus = 'connected' | 'error' | 'disconnected' | 'pending';
export type ClientStatus = 'active' | 'banned' | 'deleted';

export interface OwnerOption {
  id: string;
  name: string;
  company: string;
  country: string;
  role: 'admin' | 'owner';
}

export interface ListingChannelConnection {
  id: string;
  name: string;
  status: 'synced' | 'pending' | 'disconnected';
  lastSync: string;
  listingCount?: number;
  commissionPct?: number;
}

export interface ListingFormData {
  basic: {
    name: string;
    type: ListingType;
    bedrooms: number;
    bathrooms: number;
    guests: number;
    surface: number;
    beds: number;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    ownerName: string;
    status: ListingStatus;
  };
  address: {
    street: string;
    postalCode: string;
    city: string;
    region: string;
    country: string;
    countryCode: string;
    latitude: string;
    longitude: string;
    accessLandmark: string;
  };
  media: {
    coverPhoto: string;
    galleryCount: number;
    photoNotes: string;
    videoTourUrl: string;
  };
  equipment: {
    highlights: string[];
    kitchen: boolean;
    pool: boolean;
    parking: boolean;
    wifi: boolean;
    airConditioning: boolean;
    safetyNotes: string;
  };
  pricing: {
    basePrice: number;
    cleaningFee: number;
    weekendMultiplier: number;
    minStay: number;
    currency: string;
    cityTax: number;
    petFee: number;
  };
  extras: {
    earlyCheckInFee: number;
    lateCheckOutFee: number;
    airportTransferFee: number;
    babyKitFee: number;
    extraGuestFee: number;
    notes: string;
  };
  channels: {
    preferredChannel: string;
    syncMode: string;
    allowInstantBook: boolean;
    channelNotes: string;
  };
  licenses: {
    tourismLicense: string;
    vatNumber: string;
    insurancePolicy: string;
    expiresAt: string;
    licensingNotes: string;
  };
  automsg: {
    bookingConfirmation: string;
    preArrivalReminder: string;
    stayCheckIn: string;
    preDeparture: string;
    thankYou: string;
    enabled: boolean;
  };
  whatsapp: {
    menuTitle: string;
    welcomeTemplate: string;
    quickReplies: string[];
    autoReplyEnabled: boolean;
    escalationNumber: string;
  };
  concierge: {
    enabled: boolean;
    airportTransfer: boolean;
    groceryDelivery: boolean;
    chefService: boolean;
    localGuide: boolean;
    conciergeNotes: string;
  };
  services: {
    breakfast: boolean;
    spa: boolean;
    housekeeping: boolean;
    babysitting: boolean;
    carRental: boolean;
    serviceNotes: string;
  };
  support: {
    phone: string;
    email: string;
    hours: string;
    emergencyProtocol: string;
    supportNotes: string;
  };
  cleaning: {
    standardChecklist: string;
    linenChange: string;
    suppliesStorage: string;
    qualityControl: string;
    cleaningNotes: string;
  };
  autotasks: {
    createCleaningTask: boolean;
    createMaintenanceTask: boolean;
    createWelcomePackTask: boolean;
    assignDefaultTeam: boolean;
    taskNotes: string;
  };
  roomtypes: {
    multiRoomEnabled: boolean;
    defaultRoomType: string;
    roomInventory: string;
    occupancyMatrix: string;
    roomtypeNotes: string;
  };
  deposit: {
    enabled: boolean;
    amount: number;
    method: string;
    refundDelayDays: number;
    depositNotes: string;
  };
  rules: {
    smokingAllowed: boolean;
    eventsAllowed: boolean;
    childrenAllowed: boolean;
    petAllowed: boolean;
    securityNotes: string;
  };
  houserules: {
    checkInWindow: string;
    checkOutWindow: string;
    quietHours: string;
    trashInstructions: string;
    houseRulesText: string;
  };
  access: {
    accessType: string;
    keypadCode: string;
    lockboxCode: string;
    parkingInstructions: string;
    accessNotes: string;
  };
  wifi: {
    ssid: string;
    password: string;
    speed: string;
    backupNetwork: string;
    wifiNotes: string;
  };
  iot: {
    smartLock: boolean;
    thermostat: boolean;
    noiseSensor: boolean;
    cameraOutdoor: boolean;
    deviceNotes: string;
  };
}

export interface ListingRecord {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  ownerId: string;
  ownerName: string;
  type: ListingType;
  status: ListingStatus;
  photoColor: string;
  rating: number;
  reviewCount: number;
  occupancy: number;
  adr: number;
  monthlyRevenue: number;
  sizeLabel: string;
  channels: ListingChannelConnection[];
  form: ListingFormData;
  updatedAt: string;
}

export interface PricingMonthRule {
  key: string;
  label: string;
  value: number;
  enabled: boolean;
}

export interface PricingWeekdayRule {
  key: string;
  label: string;
  value: number;
  enabled: boolean;
}

export interface PricingEventRule {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  mode: PricingRuleKind;
  modifierPct: number;
  minStay: number;
  enabled: boolean;
}

export interface PricingOccupancyRule {
  id: string;
  minOccupancy: number;
  maxOccupancy: number;
  mode: PricingRuleKind;
  modifierPct: number;
  enabled: boolean;
}

export interface PricingStayRule {
  id: string;
  minNights: number;
  maxNights: number;
  mode: PricingRuleKind;
  modifierPct: number;
  enabled: boolean;
}

export interface PricingBookingWindowRule {
  id: string;
  minDaysBefore: number;
  maxDaysBefore: number;
  mode: PricingRuleKind;
  modifierPct: number;
  enabled: boolean;
}

export interface PricingProfile {
  listingId: string;
  dynamicPricingEnabled: boolean;
  autoApply: boolean;
  monthRules: PricingMonthRule[];
  weekdayRules: PricingWeekdayRule[];
  events: PricingEventRule[];
  occupancyRules: PricingOccupancyRule[];
  longStayRules: PricingStayRule[];
  lastMinuteRules: PricingBookingWindowRule[];
}

export interface ChannelOverviewRow {
  id: string;
  name: string;
  logo: string;
  status: ChannelStatus;
  lastSync: string;
  today: number;
  ok: number;
  err: number;
  yesterday: number;
  delta: number;
  mappedListings: number;
  uptime: number;
}

export interface ChannelSummaryCall {
  id: string;
  action: string;
  total: number;
  ok: number;
  err: number;
  dataVolume: string;
}

export interface ChannelBusinessMessage {
  id: string;
  date: string;
  event: string;
  path: string;
  thread: string;
  message: string;
  guest: string;
  preview: string;
  correlation: string;
}

export interface ChannelBusinessReservation {
  id: string;
  date: string;
  createdRu: string;
  checkIn: string;
  checkOut: string;
  client: string;
  phone: string;
  adults: number;
  children: number;
  amount: number;
  ota: string;
  mapped: string;
  listing: string;
  owner: string;
  path: string;
  ruId: string;
}

export interface ChannelBusinessCalendar {
  id: string;
  when: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  durationMs: number;
  property: string;
  listing: string;
  owner: string;
  queue: string;
  source: string;
  prices: string;
  ranges: string;
  changes: string;
  response: string;
}

export interface ChannelBusinessListing {
  id: string;
  date: string;
  action: string;
  status: 'success' | 'warning' | 'error';
  owner: string;
  listing: string;
  code: string;
  durationMs: number;
  details: string;
}

export interface ChannelDebugLog {
  id: string;
  timestamp: string;
  service: string;
  level: 'info' | 'warning' | 'error';
  endpoint: string;
  method: string;
  statusCode: number;
  durationMs: number;
  correlationId: string;
  message: string;
}

export interface ChannelCronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: string;
  lastRun: string;
  duration: string;
  owners: number;
  failures: number;
  correlationId: string;
  lastError: string;
}

export interface ChannelRuFieldMapping {
  id: string;
  ruCode: string;
  sojoriName: string;
  category: string;
  priority: number;
  active: boolean;
  outboundPush: boolean;
  notes: string;
}

export interface ChannelImportBatch {
  id: string;
  ownerId: string;
  ownerName: string;
  cityId: string;
  cityName: string;
  propertiesImported: number;
  status: 'completed' | 'partial';
  createdAt: string;
}

export interface ChannelsData {
  overview: ChannelOverviewRow[];
  directApiCalls: ChannelSummaryCall[];
  cronApiCalls: ChannelSummaryCall[];
  businessMessages: ChannelBusinessMessage[];
  businessReservations: ChannelBusinessReservation[];
  businessCalendar: ChannelBusinessCalendar[];
  businessListing: ChannelBusinessListing[];
  debugLogs: ChannelDebugLog[];
  cronJobs: ChannelCronJob[];
  ruMappings: ChannelRuFieldMapping[];
  importHistory: ChannelImportBatch[];
}

export interface ClientRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  countryFlag: string;
  totalBookings: number;
  totalRevenue: number;
  avgRevenuePerStay: number;
  lastVisit: string;
  avgRating: number;
  vipStatus: boolean;
  tags: string[];
  firstBooking: string;
  preferredListing: string;
  role: 'guest' | 'vip' | 'corporate';
  ownerIds: string[];
  ownerNames: string[];
  status: ClientStatus;
}

export interface ContactThreadRecord {
  id: string;
  guestName: string;
  phone: string;
  language: string;
  ownerName: string;
  listingName: string;
  reservationNumber: string;
  arrivalDate: string;
  departureDate: string;
  reservationStatus: string;
  communicationStatus: string;
  unreadCount: number;
  lastMessageAt: string;
  messages: Array<{ id: string; from: 'guest' | 'me'; text: string; when: string }>;
}

export interface CrmLeadRecord {
  id: string;
  source: string;
  type: 'demo' | 'lead';
  contactName: string;
  company: string;
  email: string;
  phone: string;
  properties: number;
  qualification: 'hot' | 'warm' | 'cold';
  status: 'new' | 'qualified' | 'proposal' | 'won' | 'lost';
  pms: boolean;
  channelManager: boolean;
  dynamicPricing: boolean;
  createdAt: string;
  notes: string;
}

export interface OnboardingRecord {
  id: string;
  ownerId: string;
  ownerName: string;
  company: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'blocked' | 'done';
  step: string;
  listings: number;
  updatedAt: string;
  blockers: string[];
}

export interface ListingTabMeta {
  key: keyof ListingFormData;
  icon: string;
  label: string;
  group: string;
}

export const CATALOGUE_OWNERS_STORAGE_KEY = 'sojori_catalogue_owners_v1';
export const CATALOGUE_LISTINGS_STORAGE_KEY = 'sojori_catalogue_listings_v1';
export const CATALOGUE_PRICING_STORAGE_KEY = 'sojori_catalogue_pricing_v1';
export const CATALOGUE_CHANNELS_STORAGE_KEY = 'sojori_catalogue_channels_v1';
export const CATALOGUE_CLIENTS_STORAGE_KEY = 'sojori_catalogue_clients_v1';
export const CATALOGUE_CONTACTS_STORAGE_KEY = 'sojori_catalogue_contacts_v1';
export const CATALOGUE_CRM_STORAGE_KEY = 'sojori_catalogue_crm_v1';
export const CATALOGUE_ONBOARDING_STORAGE_KEY = 'sojori_catalogue_onboarding_v1';

export const ownerOptionsSeed: OwnerOption[] = [
  { id: 'owner-1', name: 'Claire Martin', company: 'Riviera Collection', country: 'France', role: 'owner' },
  { id: 'owner-2', name: 'Nicolas Durand', company: 'Belvedere Group', country: 'France', role: 'owner' },
  { id: 'owner-3', name: 'Yasmine El Idrissi', company: 'Atlas Retreats', country: 'Maroc', role: 'owner' },
  { id: 'owner-4', name: 'Fatima Benali', company: 'Dar Sojori', country: 'Maroc', role: 'owner' },
  { id: 'owner-5', name: 'Admin Sojori', company: 'Sojori Demo', country: 'France', role: 'admin' },
];

export const LISTING_TAB_META: ListingTabMeta[] = [
  { key: 'basic', icon: '🏠', label: 'Informations de base', group: 'PROPRIÉTÉ' },
  { key: 'address', icon: '📍', label: 'Adresse', group: 'PROPRIÉTÉ' },
  { key: 'media', icon: '📸', label: 'Médias', group: 'PROPRIÉTÉ' },
  { key: 'equipment', icon: '✨', label: 'Équipements', group: 'PROPRIÉTÉ' },
  { key: 'pricing', icon: '💰', label: 'Tarification', group: 'PROPRIÉTÉ' },
  { key: 'extras', icon: 'ℹ️', label: 'Infos supplémentaires', group: 'PROPRIÉTÉ' },
  { key: 'channels', icon: '🔗', label: 'Channel Manager', group: 'DISTRIBUTION' },
  { key: 'licenses', icon: '📄', label: 'Licences', group: 'DISTRIBUTION' },
  { key: 'automsg', icon: '💬', label: 'Messages auto', group: 'GUEST EXPERIENCE' },
  { key: 'whatsapp', icon: '📱', label: 'Menu WhatsApp', group: 'GUEST EXPERIENCE' },
  { key: 'concierge', icon: '🛎️', label: 'Conciergerie', group: 'GUEST EXPERIENCE' },
  { key: 'services', icon: '🎯', label: 'Services', group: 'GUEST EXPERIENCE' },
  { key: 'support', icon: '🆘', label: 'Support', group: 'GUEST EXPERIENCE' },
  { key: 'cleaning', icon: '🧹', label: 'Ménage', group: 'OPÉRATIONS' },
  { key: 'autotasks', icon: '✅', label: 'Tâches auto', group: 'OPÉRATIONS' },
  { key: 'roomtypes', icon: '🛏️', label: 'Types de chambres', group: 'OPÉRATIONS' },
  { key: 'deposit', icon: '💵', label: 'Caution', group: 'OPÉRATIONS' },
  { key: 'rules', icon: '📜', label: 'Règles & sécurité', group: 'RÈGLES & SÉCURITÉ' },
  { key: 'houserules', icon: '🎛️', label: 'Règles & informations', group: 'RÈGLES & SÉCURITÉ' },
  { key: 'access', icon: '🔐', label: 'Configuration accès', group: 'ACCÈS & IOT' },
  { key: 'wifi', icon: '🌐', label: 'WiFi', group: 'ACCÈS & IOT' },
  { key: 'iot', icon: '🔌', label: 'Appareils IoT', group: 'ACCÈS & IOT' },
];

const createDefaultListingForm = (params: {
  ownerId: string;
  ownerName: string;
  city: string;
  country: string;
  countryCode: string;
  name: string;
  type: ListingType;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  surface: number;
  beds: number;
  status: ListingStatus;
  basePrice: number;
  cleaningFee: number;
}): ListingFormData => ({
  basic: {
    name: params.name,
    type: params.type,
    bedrooms: params.bedrooms,
    bathrooms: params.bathrooms,
    guests: params.guests,
    surface: params.surface,
    beds: params.beds,
    shortDescription: `${params.type} premium à ${params.city}`,
    longDescription: `Une propriété Sojori pensée pour un séjour premium à ${params.city}.`,
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    status: params.status,
  },
  address: {
    street: '12 Rue des Oliviers',
    postalCode: params.countryCode === 'FR' ? '06000' : '40000',
    city: params.city,
    region: params.countryCode === 'FR' ? "Côte d'Azur" : 'Marrakech-Safi',
    country: params.country,
    countryCode: params.countryCode,
    latitude: params.countryCode === 'FR' ? '43.7031' : '31.6295',
    longitude: params.countryCode === 'FR' ? '7.2661' : '-7.9811',
    accessLandmark: 'Accès principal côté jardin',
  },
  media: {
    coverPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
    galleryCount: 14,
    photoNotes: 'Inclure photos jour + nuit, rooftop et entrée.',
    videoTourUrl: 'https://sojori-demo.local/tour',
  },
  equipment: {
    highlights: ['Piscine privée', 'WiFi fibre', 'Check-in autonome'],
    kitchen: true,
    pool: true,
    parking: true,
    wifi: true,
    airConditioning: true,
    safetyNotes: 'Détecteur fumée + extincteur installés.',
  },
  pricing: {
    basePrice: params.basePrice,
    cleaningFee: params.cleaningFee,
    weekendMultiplier: 1.25,
    minStay: 2,
    currency: 'EUR',
    cityTax: params.countryCode === 'FR' ? 4.2 : 2.1,
    petFee: 35,
  },
  extras: {
    earlyCheckInFee: 35,
    lateCheckOutFee: 45,
    airportTransferFee: 70,
    babyKitFee: 20,
    extraGuestFee: 25,
    notes: 'Les extras sont confirmés 24h avant arrivée.',
  },
  channels: {
    preferredChannel: 'airbnb',
    syncMode: '2-way',
    allowInstantBook: true,
    channelNotes: 'Sync prix et dispos toutes les 15 minutes.',
  },
  licenses: {
    tourismLicense: 'LIC-2026-001',
    vatNumber: 'FR0123456789',
    insurancePolicy: 'AXA-TRAVEL-9921',
    expiresAt: '2027-03-31',
    licensingNotes: 'Licence vérifiée par l’équipe operations.',
  },
  automsg: {
    bookingConfirmation: 'Merci pour votre réservation, nous préparons votre arrivée.',
    preArrivalReminder: 'Pensez à compléter votre check-in en ligne 48h avant arrivée.',
    stayCheckIn: 'Tout se passe bien ? Répondez 1 si besoin d’aide.',
    preDeparture: 'Voici vos instructions de départ et le rappel ménage.',
    thankYou: 'Merci pour votre séjour avec Sojori.',
    enabled: true,
  },
  whatsapp: {
    menuTitle: 'Bienvenue chez Sojori',
    welcomeTemplate: 'Message d’accueil personnalisé',
    quickReplies: ['WiFi', 'Check-in', 'Transport', 'Support'],
    autoReplyEnabled: true,
    escalationNumber: '+33 6 55 44 22 11',
  },
  concierge: {
    enabled: true,
    airportTransfer: true,
    groceryDelivery: true,
    chefService: false,
    localGuide: true,
    conciergeNotes: 'Partenaires disponibles de 8h à 21h.',
  },
  services: {
    breakfast: false,
    spa: false,
    housekeeping: true,
    babysitting: false,
    carRental: true,
    serviceNotes: 'Service housekeeping disponible tous les 2 jours.',
  },
  support: {
    phone: '+33 6 44 55 66 77',
    email: 'support@sojori.com',
    hours: '08:00-22:00',
    emergencyProtocol: 'Escalade manager sous 15 min si urgence.',
    supportNotes: 'Support trilingue FR/EN/AR.',
  },
  cleaning: {
    standardChecklist: 'Cuisine, sols, salle de bain, terrasse.',
    linenChange: 'À chaque départ + séjour > 5 nuits.',
    suppliesStorage: 'Placard technique entrée.',
    qualityControl: 'Photos avant/après obligatoires.',
    cleaningNotes: 'Prévoir contrôle piscine chaque vendredi.',
  },
  autotasks: {
    createCleaningTask: true,
    createMaintenanceTask: true,
    createWelcomePackTask: true,
    assignDefaultTeam: true,
    taskNotes: 'Assigner équipe locale par défaut.',
  },
  roomtypes: {
    multiRoomEnabled: false,
    defaultRoomType: 'Entire home',
    roomInventory: '1x master, 2x double, 1x twin',
    occupancyMatrix: '8 adultes / 2 enfants',
    roomtypeNotes: 'Pas de vente à la chambre pour le moment.',
  },
  deposit: {
    enabled: true,
    amount: 500,
    method: 'Card pre-authorization',
    refundDelayDays: 7,
    depositNotes: 'Relâcher la caution après inspection du logement.',
  },
  rules: {
    smokingAllowed: false,
    eventsAllowed: false,
    childrenAllowed: true,
    petAllowed: false,
    securityNotes: 'Interdiction de sous-location et d’évènements.',
  },
  houserules: {
    checkInWindow: '16:00-22:00',
    checkOutWindow: '08:00-11:00',
    quietHours: '22:00-08:00',
    trashInstructions: 'Déposer les sacs dans le local technique.',
    houseRulesText: 'Merci de respecter le voisinage et les horaires.',
  },
  access: {
    accessType: 'Smart lock',
    keypadCode: '4582#',
    lockboxCode: 'BLV-19',
    parkingInstructions: 'Place #14 dans le parking privé.',
    accessNotes: 'Envoyer le code seulement après check-in validé.',
  },
  wifi: {
    ssid: 'SOJORI-GUEST',
    password: 'Sojori2026!',
    speed: '500 Mbps',
    backupNetwork: 'SOJORI-BACKUP',
    wifiNotes: 'Redémarrer la box via prise connectée si besoin.',
  },
  iot: {
    smartLock: true,
    thermostat: true,
    noiseSensor: true,
    cameraOutdoor: true,
    deviceNotes: 'Caméra extérieure uniquement, conforme RGPD.',
  },
});

const createListingSeed = (params: {
  id: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  ownerId: string;
  ownerName: string;
  type: ListingType;
  status: ListingStatus;
  photoColor: string;
  rating: number;
  reviewCount: number;
  occupancy: number;
  adr: number;
  monthlyRevenue: number;
  bedrooms: number;
  bathrooms: number;
  guests: number;
  surface: number;
  beds: number;
  channels: ListingChannelConnection[];
}): ListingRecord => ({
  id: params.id,
  name: params.name,
  city: params.city,
  country: params.country,
  countryCode: params.countryCode,
  ownerId: params.ownerId,
  ownerName: params.ownerName,
  type: params.type,
  status: params.status,
  photoColor: params.photoColor,
  rating: params.rating,
  reviewCount: params.reviewCount,
  occupancy: params.occupancy,
  adr: params.adr,
  monthlyRevenue: params.monthlyRevenue,
  sizeLabel: `${params.city.toUpperCase()} · ${params.bedrooms}ch · ${params.surface}m²`,
  channels: params.channels,
  form: createDefaultListingForm({
    ownerId: params.ownerId,
    ownerName: params.ownerName,
    city: params.city,
    country: params.country,
    countryCode: params.countryCode,
    name: params.name,
    type: params.type,
    bedrooms: params.bedrooms,
    bathrooms: params.bathrooms,
    guests: params.guests,
    surface: params.surface,
    beds: params.beds,
    status: params.status,
    basePrice: params.adr,
    cleaningFee: Math.round(params.adr * 0.45),
  }),
  updatedAt: '2026-05-14T09:00:00Z',
});

export const listingSeeds: ListingRecord[] = [
  createListingSeed({
    id: 'villa-belvedere',
    name: 'Villa Belvédère',
    city: 'Nice',
    country: 'France',
    countryCode: 'FR',
    ownerId: 'owner-2',
    ownerName: 'Nicolas Durand',
    type: 'Villa',
    status: 'active',
    photoColor: 'gold',
    rating: 4.92,
    reviewCount: 47,
    occupancy: 87,
    adr: 280,
    monthlyRevenue: 18000,
    bedrooms: 4,
    bathrooms: 3,
    guests: 8,
    surface: 240,
    beds: 5,
    channels: [
      { id: 'airbnb', name: 'Airbnb', status: 'synced', lastSync: '2h ago', listingCount: 38, commissionPct: 15 },
      { id: 'booking', name: 'Booking.com', status: 'synced', lastSync: '1h ago', listingCount: 35, commissionPct: 17 },
      { id: 'vrbo', name: 'Vrbo', status: 'pending', lastSync: '2d ago', listingCount: 18, commissionPct: 12 },
      { id: 'direct', name: 'Direct', status: 'synced', lastSync: '15m ago', listingCount: 42, commissionPct: 2 },
    ],
  }),
  createListingSeed({
    id: 'dar-sojori',
    name: 'Dar Sojori',
    city: 'Marrakech',
    country: 'Maroc',
    countryCode: 'MA',
    ownerId: 'owner-4',
    ownerName: 'Fatima Benali',
    type: 'Riad',
    status: 'active',
    photoColor: 'blue',
    rating: 4.85,
    reviewCount: 32,
    occupancy: 92,
    adr: 180,
    monthlyRevenue: 14000,
    bedrooms: 6,
    bathrooms: 4,
    guests: 10,
    surface: 320,
    beds: 6,
    channels: [
      { id: 'airbnb', name: 'Airbnb', status: 'synced', lastSync: '45m ago', listingCount: 22, commissionPct: 15 },
      { id: 'booking', name: 'Booking.com', status: 'synced', lastSync: '1h ago', listingCount: 20, commissionPct: 16 },
    ],
  }),
  createListingSeed({
    id: 'villa-atlas',
    name: 'Villa Atlas',
    city: 'Marrakech',
    country: 'Maroc',
    countryCode: 'MA',
    ownerId: 'owner-3',
    ownerName: 'Yasmine El Idrissi',
    type: 'Villa',
    status: 'active',
    photoColor: 'purple',
    rating: 4.95,
    reviewCount: 28,
    occupancy: 91,
    adr: 420,
    monthlyRevenue: 22000,
    bedrooms: 5,
    bathrooms: 5,
    guests: 12,
    surface: 320,
    beds: 7,
    channels: [
      { id: 'airbnb', name: 'Airbnb', status: 'synced', lastSync: '1h ago', listingCount: 28, commissionPct: 15 },
      { id: 'booking', name: 'Booking.com', status: 'disconnected', lastSync: '5d ago', listingCount: 0, commissionPct: 17 },
      { id: 'direct', name: 'Direct', status: 'synced', lastSync: '22m ago', listingCount: 31, commissionPct: 2 },
    ],
  }),
  createListingSeed({
    id: 'atlas-loft',
    name: 'Atlas Loft',
    city: 'Marrakech',
    country: 'Maroc',
    countryCode: 'MA',
    ownerId: 'owner-3',
    ownerName: 'Yasmine El Idrissi',
    type: 'Loft',
    status: 'inactive',
    photoColor: 'green',
    rating: 4.78,
    reviewCount: 19,
    occupancy: 78,
    adr: 110,
    monthlyRevenue: 8000,
    bedrooms: 2,
    bathrooms: 2,
    guests: 4,
    surface: 110,
    beds: 2,
    channels: [{ id: 'airbnb', name: 'Airbnb', status: 'synced', lastSync: '4h ago', listingCount: 14, commissionPct: 15 }],
  }),
  createListingSeed({
    id: 'medina-house',
    name: 'Médina House',
    city: 'Marrakech',
    country: 'Maroc',
    countryCode: 'MA',
    ownerId: 'owner-4',
    ownerName: 'Fatima Benali',
    type: 'House',
    status: 'active',
    photoColor: 'pink',
    rating: 4.88,
    reviewCount: 24,
    occupancy: 83,
    adr: 145,
    monthlyRevenue: 11000,
    bedrooms: 3,
    bathrooms: 2,
    guests: 6,
    surface: 145,
    beds: 4,
    channels: [
      { id: 'airbnb', name: 'Airbnb', status: 'synced', lastSync: '1h ago', listingCount: 17, commissionPct: 15 },
      { id: 'booking', name: 'Booking.com', status: 'synced', lastSync: '90m ago', listingCount: 16, commissionPct: 16 },
      { id: 'vrbo', name: 'Vrbo', status: 'pending', lastSync: '1d ago', listingCount: 8, commissionPct: 12 },
    ],
  }),
  createListingSeed({
    id: 'studio-cote-bleue',
    name: 'Studio Côte Bleue',
    city: 'Calvi',
    country: 'France',
    countryCode: 'FR',
    ownerId: 'owner-1',
    ownerName: 'Claire Martin',
    type: 'Studio',
    status: 'draft',
    photoColor: 'gold',
    rating: 0,
    reviewCount: 0,
    occupancy: 0,
    adr: 95,
    monthlyRevenue: 0,
    bedrooms: 1,
    bathrooms: 1,
    guests: 2,
    surface: 45,
    beds: 1,
    channels: [],
  }),
];

const createDefaultPricingProfile = (listing: ListingRecord): PricingProfile => ({
  listingId: listing.id,
  dynamicPricingEnabled: true,
  autoApply: false,
  monthRules: [
    'Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec',
  ].map((label, index) => ({
    key: String(index + 1).padStart(2, '0'),
    label,
    value: index === 6 || index === 7 ? 35 : index === 10 || index === 11 ? -10 : 0,
    enabled: true,
  })),
  weekdayRules: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((label, index) => ({
    key: String(index),
    label,
    value: index >= 4 ? 18 : 0,
    enabled: true,
  })),
  events: [
    { id: `${listing.id}-event-1`, name: 'Festival local', startDate: '2026-05-16', endDate: '2026-05-18', mode: 'increase', modifierPct: 40, minStay: 2, enabled: true },
    { id: `${listing.id}-event-2`, name: 'Pont national', startDate: '2026-11-01', endDate: '2026-11-03', mode: 'increase', modifierPct: 25, minStay: 3, enabled: false },
  ],
  occupancyRules: [
    { id: `${listing.id}-occ-1`, minOccupancy: 0, maxOccupancy: 40, mode: 'decrease', modifierPct: 12, enabled: true },
    { id: `${listing.id}-occ-2`, minOccupancy: 80, maxOccupancy: 100, mode: 'increase', modifierPct: 18, enabled: true },
  ],
  longStayRules: [
    { id: `${listing.id}-long-1`, minNights: 7, maxNights: 13, mode: 'decrease', modifierPct: 10, enabled: true },
    { id: `${listing.id}-long-2`, minNights: 14, maxNights: 30, mode: 'decrease', modifierPct: 18, enabled: true },
  ],
  lastMinuteRules: [
    { id: `${listing.id}-last-1`, minDaysBefore: 0, maxDaysBefore: 3, mode: 'decrease', modifierPct: 12, enabled: true },
    { id: `${listing.id}-last-2`, minDaysBefore: 30, maxDaysBefore: 90, mode: 'decrease', modifierPct: 8, enabled: false },
  ],
});

export const pricingProfileSeeds: PricingProfile[] = listingSeeds.map(createDefaultPricingProfile);

export const channelsDataSeed: ChannelsData = {
  overview: [
    { id: 'airbnb', name: 'Airbnb', logo: '🏠', status: 'connected', lastSync: '2026-05-14T08:30:00Z', today: 214, ok: 207, err: 7, yesterday: 198, delta: 16, mappedListings: 38, uptime: 99.2 },
    { id: 'booking', name: 'Booking.com', logo: '🅱️', status: 'connected', lastSync: '2026-05-14T08:20:00Z', today: 198, ok: 193, err: 5, yesterday: 201, delta: -3, mappedListings: 35, uptime: 99.8 },
    { id: 'vrbo', name: 'VRBO', logo: '🏡', status: 'pending', lastSync: '2026-05-14T07:10:00Z', today: 76, ok: 69, err: 7, yesterday: 82, delta: -6, mappedListings: 28, uptime: 97.5 },
    { id: 'expedia', name: 'Expedia', logo: '✈️', status: 'error', lastSync: '2026-05-13T18:20:00Z', today: 54, ok: 39, err: 15, yesterday: 58, delta: -4, mappedListings: 22, uptime: 85.2 },
  ],
  directApiCalls: [
    { id: 'd1', action: 'Pull_Reservations', total: 142, ok: 138, err: 4, dataVolume: '38 Mo' },
    { id: 'd2', action: 'Push_Availability', total: 96, ok: 92, err: 4, dataVolume: '14 Mo' },
    { id: 'd3', action: 'Pull_Messages', total: 54, ok: 54, err: 0, dataVolume: '3 Mo' },
  ],
  cronApiCalls: [
    { id: 'c1', action: 'Nightly_RU_Sync', total: 42, ok: 40, err: 2, dataVolume: '126k rows' },
    { id: 'c2', action: 'Calendar_Reconciliation', total: 42, ok: 41, err: 1, dataVolume: '84k rows' },
  ],
  businessMessages: [
    { id: 'bm1', date: '2026-05-14 08:10', event: 'New guest message', path: '/ota/messages', thread: 'TH-1001', message: 'Late arrival request', guest: 'Sophie Martin', preview: 'Nous arriverons à 23h...', correlation: 'corr-msg-01' },
    { id: 'bm2', date: '2026-05-14 07:42', event: 'Reply sent', path: '/ota/messages', thread: 'TH-1002', message: 'Check-in details', guest: 'Ahmed Benali', preview: 'Voici votre code d’accès...', correlation: 'corr-msg-02' },
  ],
  businessReservations: [
    { id: 'br1', date: '2026-05-14 08:22', createdRu: '2026-05-14 08:20', checkIn: '2026-06-02', checkOut: '2026-06-06', client: 'Emma Wilson', phone: '+44 7700 900123', adults: 2, children: 1, amount: 1340, ota: 'Airbnb', mapped: 'OK', listing: 'Villa Belvédère', owner: 'Belvedere Group', path: '/booking/ingress', ruId: 'RU-8291' },
    { id: 'br2', date: '2026-05-14 07:55', createdRu: '2026-05-14 07:50', checkIn: '2026-05-21', checkOut: '2026-05-25', client: 'Maria Garcia', phone: '+34 612 345 678', adults: 4, children: 0, amount: 2260, ota: 'Booking.com', mapped: 'Warning', listing: 'Dar Sojori', owner: 'Dar Sojori', path: '/booking/modify', ruId: 'RU-8290' },
  ],
  businessCalendar: [
    { id: 'bc1', when: '2026-05-14 08:28', action: 'Push rates', status: 'success', durationMs: 1280, property: 'Villa Belvédère', listing: 'villa-belvedere', owner: 'Belvedere Group', queue: 'ru-pricing', source: 'DynamicPricing', prices: '4 days', ranges: '02-06 Jun', changes: '+12%', response: '200 OK' },
    { id: 'bc2', when: '2026-05-14 07:44', action: 'Pull availability', status: 'warning', durationMs: 2120, property: 'Dar Sojori', listing: 'dar-sojori', owner: 'Dar Sojori', queue: 'ru-availability', source: 'Cron', prices: '0', ranges: '21-25 May', changes: '2 warnings', response: '206 Partial' },
  ],
  businessListing: [
    { id: 'bl1', date: '2026-05-14 08:00', action: 'Push photos', status: 'success', owner: 'Belvedere Group', listing: 'Villa Belvédère', code: 'IMG_SYNC', durationMs: 890, details: '12 photos synced' },
    { id: 'bl2', date: '2026-05-13 19:10', action: 'Push amenities', status: 'error', owner: 'Atlas Retreats', listing: 'Villa Atlas', code: 'AMN_409', durationMs: 1330, details: 'Missing room type mapping' },
  ],
  debugLogs: [
    { id: 'dbg1', timestamp: '2026-05-14T08:35:22Z', service: 'srv-channels', level: 'info', endpoint: '/api/channels/sync', method: 'POST', statusCode: 200, durationMs: 812, correlationId: 'corr-debug-01', message: 'Availability sync completed' },
    { id: 'dbg2', timestamp: '2026-05-14T08:25:44Z', service: 'srv-channels', level: 'error', endpoint: '/api/channels/push-pricing', method: 'POST', statusCode: 401, durationMs: 512, correlationId: 'corr-debug-02', message: 'Authentication failed for Expedia' },
    { id: 'dbg3', timestamp: '2026-05-14T07:59:13Z', service: 'srv-admin', level: 'warning', endpoint: '/api/admin/channels-dashboard', method: 'GET', statusCode: 206, durationMs: 1660, correlationId: 'corr-debug-03', message: 'Partial payload returned for business calendar' },
  ],
  cronJobs: [
    { id: 'cron1', name: 'Nightly RU Sync', enabled: true, schedule: '0 2 * * *', lastRun: '2026-05-14 02:00', duration: '12m 22s', owners: 18, failures: 1, correlationId: 'cron-corr-1', lastError: '1 listing missing mapping' },
    { id: 'cron2', name: 'Calendar Reconciliation', enabled: true, schedule: '*/30 * * * *', lastRun: '2026-05-14 08:30', duration: '2m 14s', owners: 42, failures: 0, correlationId: 'cron-corr-2', lastError: '—' },
    { id: 'cron3', name: 'Languages Sync', enabled: false, schedule: '0 5 * * 1', lastRun: '2026-05-12 05:00', duration: '58s', owners: 42, failures: 0, correlationId: 'cron-corr-3', lastError: 'Paused by ops team' },
  ],
  ruMappings: [
    { id: 'map1', ruCode: 'PROP_NAME', sojoriName: 'Property name', category: 'Listing', priority: 1, active: true, outboundPush: true, notes: 'Champ critique pour publication OTA' },
    { id: 'map2', ruCode: 'CHECKIN_FROM', sojoriName: 'Check-in start', category: 'Arrival', priority: 2, active: true, outboundPush: true, notes: 'Utilisé pour messages auto' },
    { id: 'map3', ruCode: 'HOUSE_RULES', sojoriName: 'House rules', category: 'Guest Experience', priority: 3, active: true, outboundPush: false, notes: 'Lecture uniquement' },
  ],
  importHistory: [
    { id: 'imp1', ownerId: 'owner-3', ownerName: 'Yasmine El Idrissi', cityId: 'marrakech', cityName: 'Marrakech', propertiesImported: 3, status: 'completed', createdAt: '2026-05-13 16:40' },
    { id: 'imp2', ownerId: 'owner-1', ownerName: 'Claire Martin', cityId: 'nice', cityName: 'Nice', propertiesImported: 1, status: 'partial', createdAt: '2026-05-12 11:15' },
  ],
};

export const clientSeeds: ClientRecord[] = [
  { id: 'CL-001', name: 'Ahmed Benali', email: 'ahmed.benali@example.com', phone: '+212 6 12 34 56 78', country: 'MA', countryFlag: '🇲🇦', totalBookings: 8, totalRevenue: 4250, avgRevenuePerStay: 531, lastVisit: '2026-05-10T14:00:00Z', avgRating: 4.9, vipStatus: true, tags: ['Fidèle', 'VIP'], firstBooking: '2024-08-15T10:00:00Z', preferredListing: 'Dar Sojori', role: 'vip', ownerIds: ['owner-4'], ownerNames: ['Fatima Benali'], status: 'active' },
  { id: 'CL-002', name: 'Sophie Martin', email: 'sophie.martin@example.fr', phone: '+33 6 45 78 90 12', country: 'FR', countryFlag: '🇫🇷', totalBookings: 5, totalRevenue: 2450, avgRevenuePerStay: 490, lastVisit: '2026-04-22T14:00:00Z', avgRating: 4.8, vipStatus: false, tags: ['Fidèle'], firstBooking: '2025-01-10T10:00:00Z', preferredListing: 'Villa Belvédère', role: 'guest', ownerIds: ['owner-2'], ownerNames: ['Nicolas Durand'], status: 'active' },
  { id: 'CL-003', name: 'John Smith', email: 'john.smith@example.com', phone: '+1 555 123 4567', country: 'US', countryFlag: '🇺🇸', totalBookings: 3, totalRevenue: 1890, avgRevenuePerStay: 630, lastVisit: '2026-03-15T14:00:00Z', avgRating: 4.7, vipStatus: false, tags: [], firstBooking: '2025-06-20T10:00:00Z', preferredListing: 'Villa Atlas', role: 'corporate', ownerIds: ['owner-3'], ownerNames: ['Yasmine El Idrissi'], status: 'banned' },
  { id: 'CL-004', name: 'Maria Garcia', email: 'maria.garcia@example.es', phone: '+34 612 345 678', country: 'ES', countryFlag: '🇪🇸', totalBookings: 12, totalRevenue: 6840, avgRevenuePerStay: 570, lastVisit: '2026-05-12T14:00:00Z', avgRating: 5.0, vipStatus: true, tags: ['VIP', 'Fidèle'], firstBooking: '2023-11-05T10:00:00Z', preferredListing: 'Médina House', role: 'vip', ownerIds: ['owner-4'], ownerNames: ['Fatima Benali'], status: 'active' },
  { id: 'CL-005', name: 'Hans Mueller', email: 'hans.mueller@example.de', phone: '+49 170 123 4567', country: 'DE', countryFlag: '🇩🇪', totalBookings: 2, totalRevenue: 980, avgRevenuePerStay: 490, lastVisit: '2026-02-18T14:00:00Z', avgRating: 4.5, vipStatus: false, tags: [], firstBooking: '2025-09-12T10:00:00Z', preferredListing: 'Atlas Loft', role: 'guest', ownerIds: ['owner-3'], ownerNames: ['Yasmine El Idrissi'], status: 'deleted' },
];

export const contactSeeds: ContactThreadRecord[] = [
  {
    id: 'contact-1',
    guestName: 'Sophie Martin',
    phone: '+33 6 45 78 90 12',
    language: 'FR',
    ownerName: 'Nicolas Durand',
    listingName: 'Villa Belvédère',
    reservationNumber: 'R-10021',
    arrivalDate: '2026-06-02',
    departureDate: '2026-06-06',
    reservationStatus: 'confirmed',
    communicationStatus: 'active',
    unreadCount: 2,
    lastMessageAt: '2026-05-14 08:15',
    messages: [
      { id: 'm1', from: 'guest', text: 'Bonjour, peut-on arriver vers 23h ?', when: '08:12' },
      { id: 'm2', from: 'me', text: 'Oui, nous pouvons vous envoyer un accès autonome.', when: '08:14' },
    ],
  },
  {
    id: 'contact-2',
    guestName: 'Maria Garcia',
    phone: '+34 612 345 678',
    language: 'ES',
    ownerName: 'Fatima Benali',
    listingName: 'Dar Sojori',
    reservationNumber: 'R-10022',
    arrivalDate: '2026-05-21',
    departureDate: '2026-05-25',
    reservationStatus: 'pending',
    communicationStatus: 'unreplied',
    unreadCount: 4,
    lastMessageAt: '2026-05-14 07:55',
    messages: [
      { id: 'm3', from: 'guest', text: 'Hola, necesitamos transporte desde el aeropuerto.', when: '07:55' },
    ],
  },
];

export const crmLeadSeeds: CrmLeadRecord[] = [
  { id: 'crm-1', source: 'Demo request', type: 'demo', contactName: 'Jean Morel', company: 'Azur Homes', email: 'jean@azurhomes.fr', phone: '+33 6 22 33 44 55', properties: 18, qualification: 'hot', status: 'proposal', pms: true, channelManager: true, dynamicPricing: true, createdAt: '2026-05-14 10:00', notes: 'Besoin migration PMS avant été.' },
  { id: 'crm-2', source: 'Website lead', type: 'lead', contactName: 'Nadia Karim', company: 'Marrakech Signature', email: 'nadia@m-signature.ma', phone: '+212 6 66 77 88 99', properties: 6, qualification: 'warm', status: 'qualified', pms: true, channelManager: false, dynamicPricing: true, createdAt: '2026-05-13 15:10', notes: 'Intéressée surtout par WhatsApp + pricing.' },
];

export const onboardingSeeds: OnboardingRecord[] = [
  { id: 'onb-1', ownerId: 'owner-2', ownerName: 'Nicolas Durand', company: 'Belvedere Group', progress: 72, status: 'in_progress', step: 'Mapping OTA', listings: 12, updatedAt: '2026-05-14 09:22', blockers: [] },
  { id: 'onb-2', ownerId: 'owner-3', ownerName: 'Yasmine El Idrissi', company: 'Atlas Retreats', progress: 48, status: 'blocked', step: 'Documents légaux', listings: 8, updatedAt: '2026-05-13 18:10', blockers: ['Licence manquante', '1 owner sans mapping RU'] },
  { id: 'onb-3', ownerId: 'owner-4', ownerName: 'Fatima Benali', company: 'Dar Sojori', progress: 100, status: 'done', step: 'Live', listings: 5, updatedAt: '2026-05-10 11:00', blockers: [] },
];

export const getStoredOwners = () => {
  const stored = readStorage<OwnerOption[]>(CATALOGUE_OWNERS_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_OWNERS_STORAGE_KEY, ownerOptionsSeed);
  return ownerOptionsSeed;
};

export const getStoredListings = () => {
  const stored = readStorage<ListingRecord[]>(CATALOGUE_LISTINGS_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_LISTINGS_STORAGE_KEY, listingSeeds);
  return listingSeeds;
};

export const saveStoredListings = (listings: ListingRecord[]) => {
  writeStorage(CATALOGUE_LISTINGS_STORAGE_KEY, listings);
};

export const getStoredPricingProfiles = () => {
  const stored = readStorage<PricingProfile[]>(CATALOGUE_PRICING_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_PRICING_STORAGE_KEY, pricingProfileSeeds);
  return pricingProfileSeeds;
};

export const saveStoredPricingProfiles = (profiles: PricingProfile[]) => {
  writeStorage(CATALOGUE_PRICING_STORAGE_KEY, profiles);
};

export const getStoredChannelsData = () => {
  const stored = readStorage<ChannelsData | null>(CATALOGUE_CHANNELS_STORAGE_KEY, null);
  if (stored) {
    return stored;
  }
  writeStorage(CATALOGUE_CHANNELS_STORAGE_KEY, channelsDataSeed);
  return channelsDataSeed;
};

export const saveStoredChannelsData = (data: ChannelsData) => {
  writeStorage(CATALOGUE_CHANNELS_STORAGE_KEY, data);
};

export const getStoredClients = () => {
  const stored = readStorage<ClientRecord[]>(CATALOGUE_CLIENTS_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_CLIENTS_STORAGE_KEY, clientSeeds);
  return clientSeeds;
};

export const saveStoredClients = (clients: ClientRecord[]) => {
  writeStorage(CATALOGUE_CLIENTS_STORAGE_KEY, clients);
};

export const getStoredContacts = () => {
  const stored = readStorage<ContactThreadRecord[]>(CATALOGUE_CONTACTS_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_CONTACTS_STORAGE_KEY, contactSeeds);
  return contactSeeds;
};

export const saveStoredContacts = (contacts: ContactThreadRecord[]) => {
  writeStorage(CATALOGUE_CONTACTS_STORAGE_KEY, contacts);
};

export const getStoredCrmLeads = () => {
  const stored = readStorage<CrmLeadRecord[]>(CATALOGUE_CRM_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_CRM_STORAGE_KEY, crmLeadSeeds);
  return crmLeadSeeds;
};

export const saveStoredCrmLeads = (leads: CrmLeadRecord[]) => {
  writeStorage(CATALOGUE_CRM_STORAGE_KEY, leads);
};

export const getStoredOnboarding = () => {
  const stored = readStorage<OnboardingRecord[]>(CATALOGUE_ONBOARDING_STORAGE_KEY, []);
  if (stored.length > 0) {
    return stored;
  }
  writeStorage(CATALOGUE_ONBOARDING_STORAGE_KEY, onboardingSeeds);
  return onboardingSeeds;
};

export const saveStoredOnboarding = (items: OnboardingRecord[]) => {
  writeStorage(CATALOGUE_ONBOARDING_STORAGE_KEY, items);
};

export const createEmptyListing = (): ListingRecord => {
  const owner = getStoredOwners().find((item) => item.role === 'owner') || ownerOptionsSeed[0];
  const id = `listing-${Date.now()}`;
  return createListingSeed({
    id,
    name: 'Nouvelle annonce',
    city: 'Marrakech',
    country: 'Maroc',
    countryCode: 'MA',
    ownerId: owner.id,
    ownerName: owner.name,
    type: 'Apartment',
    status: 'draft',
    photoColor: 'gold',
    rating: 0,
    reviewCount: 0,
    occupancy: 0,
    adr: 120,
    monthlyRevenue: 0,
    bedrooms: 2,
    bathrooms: 1,
    guests: 4,
    surface: 80,
    beds: 2,
    channels: [],
  });
};
