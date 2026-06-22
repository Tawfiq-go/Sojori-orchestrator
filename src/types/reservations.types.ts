// ════════════════════════════════════════════════════════════════════
// Sojori — Reservations Types
// Types pour le service srv-reservations (port 4007)
// ════════════════════════════════════════════════════════════════════

/**
 * Membre d'une réservation (pour enregistrement police)
 */
export interface ReservationMember {
  document_type: string;
  document_number: string;
  first_name: string;
  last_name: string;
  nationality: string;
  country_of_residence: string;
  date_of_birth: string;
  gender: string;
  email: string;
  phone: string;
  registration: 'Automatic' | 'Manual';
  document_front_scan: string;
  document_back_scan: string;
  document_front_download: string;
  document_back_download: string;
  status: string;
}

/**
 * Enregistrement des invités
 */
export interface GuestRegistration {
  nbre_guest_to_register: number;
  nbre_guest_registered: number;
  nbre_guest_draft: number;
  nbre_guest_complete: number;
  registration_status: string;
  members: ReservationMember[];
}

/**
 * Format complet d'une réservation (backend)
 */
export interface Reservation {
  id: string;

  // Identification
  channelId?: string;
  channelName?: string;
  channelReservationId?: string;
  channexId?: string;
  reservationNumber?: string;

  // Guest info
  guestName: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestAddress?: string;
  guestCity?: string;
  guestCountry?: string;
  guestCountryCode?: string;
  source?: string;
  nationality?: string;
  guestEmail?: string;
  guestLanguage?: string | null;
  phone?: string;

  // Dates
  createdAt?: Date | string;
  reservationDate?: Date | string;
  arrivalDate: Date | string;
  departureDate: Date | string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  actualArrivalTime?: Date | string | null;
  actualDepartureTime?: Date | string | null;
  nights?: number;

  // Guests
  numberOfGuests?: number;
  adults?: number;
  children?: number | null;
  infants?: number | null;
  pets?: number | null;

  // Pricing
  totalPrice?: number;
  alreadyPaid?: number;
  currency?: string;
  paymentMethod?: string | null;
  paymentType?: string | null;
  paymentStatus?: string;
  paymentLink?: string;

  // Status
  status: string; // confirmed, cancelled, pending, etc.
  cancellationDate?: Date | string | null;
  cancellationAcknowledged?: boolean;
  cancelledBy?: string | null;

  // Listing & Room
  sojoriId?: string; // Listing ID
  listingMapId?: string; // Fallback Listing ID
  listing?: {
    _id?: string;
    name?: string;
    importOnboarding?: { active?: boolean } | null;
  };
  orchestrationLaunch?: {
    status?: 'pending' | 'launched' | string | null;
    importListingId?: string | null;
  } | null;
  roomTypeId?: string;
  doorCode?: string;

  // Registration
  guestsRegistrationStatus?: string | null;
  guestRegistration?: GuestRegistration;
  police_registration?: GuestRegistration; // Alias

  // Messages & Communication
  messages_status?: string;
  messages?: any[];

  // OTA Integration
  byChannex?: boolean;
  byRentals?: boolean;
  channexListingId?: string | null;
  channexRoomTypeId?: string;
  channexRatePlaneId?: string;
  otaCode?: string;
  voucherNo?: string;

  // Notes & Services
  notes?: string;
  services?: any[];

  // Other
  atSojori?: boolean | null;
  staging?: boolean;
  midCleanTaskCount?: number;
  pdfUrl?: string;
  mailTemplates?: any[];
}

/**
 * Format d'une réservation pour liste (résumé)
 */
export interface ReservationListItem {
  id: string;
  title: string; // "Villa Atlas Loft • Airbnb"
  description: string; // "John Doe • 📅15/05 14:00→20/05 11:00 • 👥2A+1E • 1200€"
  guest_name: string;
  listing_name: string;
  arrival_date: Date | string;
  departure_date: Date | string;
  actual_arrival_time?: Date | string | null;
  actual_departure_time?: Date | string | null;
  status: string;
}

/**
 * Format d'une réservation pour détails complets
 */
export interface ReservationDetail {
  id: string;
  listing_name: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  guest_phone_whatsapp: string;
  guest_language: string | null;
  guest_country: string | null;
  ota: string; // "Airbnb", "Booking", "Direct", etc.
  arrival_date: string; // Formatted: "15/05/2026 14:00"
  departure_date: string;
  arrival_date_raw: Date | string;
  departure_date_raw: Date | string;
  nights?: number;
  guests: string; // "2 adultes, 1 enfant"
  adults?: number;
  children?: number;
  infants?: number;
  check_in_time_chosen?: string;
  check_out_time_chosen?: string;
  actual_arrival_time?: Date | string | null;
  actual_departure_time?: Date | string | null;
  arrival_declared: string; // "14h30" ou "Pas déclaré"
  departure_declared: string;
  total_price: string; // "1200.00€"
  already_paid?: number;
  payment_status: string;
  door_code: string;
  status: string;
  police_members: number;
  reservation_number: string;
  channel_name: string;
}

/**
 * Filtres pour liste de réservations (Check-in / Check-out)
 */
export type ReservationFilter =
  | 'CHECKIN_TODAY'
  | 'CHECKIN_TOMORROW'
  | 'CHECKIN_7DAYS'
  | 'CHECKOUT_TODAY'
  | 'CHECKOUT_TOMORROW'
  | 'CHECKOUT_7DAYS';

/**
 * Counts pour filtres
 */
export interface ReservationCounts {
  CHECKIN_TODAY: number;
  CHECKIN_TOMORROW: number;
  CHECKIN_7DAYS: number;
  CHECKOUT_TODAY: number;
  CHECKOUT_TOMORROW: number;
  CHECKOUT_7DAYS: number;
}

/**
 * Requête pour liste de réservations
 */
export interface ReservationListRequest {
  filter: ReservationFilter;
  limit?: number;
}

/**
 * Réponse pour liste de réservations
 */
export interface ReservationListResponse {
  success: boolean;
  filter_label: string;
  reservations: ReservationListItem[];
  reservation_count: number;
}

/**
 * Réponse pour détail d'une réservation
 */
export interface ReservationDetailResponse {
  success: boolean;
  reservation: ReservationDetail;
}

/**
 * Réponse pour counts
 */
export interface ReservationCountsResponse {
  success: boolean;
  counts: ReservationCounts;
}

/**
 * Requête pour recherche de réservation par téléphone
 */
export interface ReservationSearchByPhoneRequest {
  phone: string;
}

/**
 * Requête pour recherche de réservation par numéro
 */
export interface ReservationSearchByNumberRequest {
  reservationNumber: string;
}

/**
 * Données pour calendrier (simplifiées depuis reservation)
 */
export interface ReservationCalendarData {
  id: string;
  listingId: string;
  listingName?: string;
  guestName: string;
  arrivalDate: Date | string;
  departureDate: Date | string;
  nights: number;
  adults: number;
  children?: number;
  infants?: number;
  status: string;
  totalPrice?: number;
  currency?: string;
  ota?: string;
  doorCode?: string;
}

/**
 * Requête pour récupérer réservations d'un listing (calendrier)
 */
export interface ReservationsByListingRequest {
  listingId: string;
  startDate: string; // ISO format
  endDate: string;
}

/**
 * Status possibles pour une réservation
 */
export type ReservationStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'CancelledByHost'
  | 'CancelledByCustomer'
  | 'CancelledByAdmin'
  | 'completed';

/**
 * Status de paiement possibles
 */
export type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'refunded';

/**
 * Canaux OTA supportés
 */
export type OTAChannel = 'airbnb' | 'booking' | 'direct' | 'expedia' | 'vrbo' | string;
