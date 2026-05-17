// ════════════════════════════════════════════════════════════════════
// Sojori — Calendar Types
// Types TypeScript pour le calendrier (basés sur le modèle srv-calendar)
// ════════════════════════════════════════════════════════════════════

/**
 * Représente une réservation dans le calendrier
 */
export interface CalendarReservation {
  id: string;
  reservationId: string;
  listingMapId?: string;
  arrivalDate: string;
  departureDate: string;
  guestName?: string;
  guestFirstName?: string;
  guestLastName?: string;
  guestEmail?: string;
  guestCity?: string;
  guestCountry?: string;
  numberOfGuests?: number;
  adults?: number;
  children?: number;
  infants?: number;
  pets?: number;
  checkInTime?: string;
  checkOutTime?: string;
  nights?: number;
  phone?: string;
  totalPrice?: number;
  currency?: string;
  status?: string;
  paymentStatus?: string;
  cancellationDate?: string;
  cancelledBy?: string;
  hostNote?: string;
  guestNote?: string;
  comment?: string;
  isStarred?: boolean;
  isArchived?: boolean;
  isPinned?: boolean;
  isProcessed?: boolean;
  isInitial?: boolean;
  isManuallyChecked?: boolean;
  reservationDate?: string;
}

/**
 * Représente un jour dans le calendrier (retour API)
 */
export interface CalendarDay {
  _id?: string;
  date: Date | string;
  sojoriId: string;
  hostawayId?: number;
  listingId?: number;
  ownerId?: string;
  isAvailable: boolean;
  isProcessed?: boolean;
  status?: string;
  price: number;
  minimumStay?: number;
  maximumStay?: number;
  closedOnArrival?: boolean;
  closedOnDeparture?: boolean;
  note?: string;
  countAvailableUnits?: number;
  availableUnitsToSell?: number;
  countPendingUnits?: number;
  countBlockingReservations?: number;
  countBlockedUnits?: number;
  desiredUnitsToSell?: number;
  reservations?: CalendarReservation[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Paramètres pour récupérer le calendrier d'un mois
 */
export interface CalendarMonthRequest {
  listingId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Réponse API pour getCalendar
 */
export interface CalendarMonthResponse {
  success: boolean;
  message: string;
  data: CalendarDay[];
}

/**
 * Paramètres pour mettre à jour le calendrier
 */
export interface CalendarUpdateRequest {
  listingId: string;
  startDate: string;
  endDate: string;
  price: number;
  maximumStay: number;
  minimumStay: number;
  isAvailable: boolean;
  note?: string;
  status?: string;
  days: string[]; // Array of weekday names: ['monday', 'tuesday', ...] or all 7 days
}

/**
 * Réponse API pour updateCalendar
 */
export interface CalendarUpdateResponse {
  success: boolean;
  message: string;
  postUpdateDocs: CalendarDay[];
}

/**
 * Type pour le statut d'un jour (simplifié frontend)
 */
export type DayStatus = 'available' | 'booked' | 'closed' | 'pending';

/**
 * Type pour les canaux de distribution
 */
export interface ChannelStatus {
  airbnb: 'ok' | 'pending' | 'error';
  booking: 'ok' | 'pending' | 'error';
  direct: 'ok';
}

/**
 * Type pour une cellule de jour dans le calendrier UI
 */
export interface DayCell {
  date: string;            // YYYY-MM-DD
  day: number;
  weekday: number;         // 0=Sun … 6=Sat
  inMonth: boolean;
  status: DayStatus;
  price: number;
  suggestedPrice?: number; // AI suggestion
  minNights?: number;
  maxNights?: number;
  checkInAllowed?: boolean;
  checkOutAllowed?: boolean;
  bookedBy?: {
    initials: string;
    name: string;
    source: 'airbnb' | 'booking' | 'direct';
  };
  channels?: ChannelStatus;
  isToday?: boolean;
  note?: string;
  // Données brutes du backend
  raw?: CalendarDay;
}

/**
 * Type pour une propriété dans la vue multi-propriétés
 */
export interface PropertyRow {
  id: string;
  name: string;
  city: string;
  color: string;
}

/**
 * Paramètres pour le bulk update (sélection multiple de jours)
 */
export interface BulkUpdateParams {
  listingId: string;
  selectedDates: string[]; // Array of YYYY-MM-DD dates
  updates: {
    price?: number;
    isAvailable?: boolean;
    minimumStay?: number;
    maximumStay?: number;
    note?: string;
    status?: string;
  };
}

/**
 * Stats d'occupation
 */
export interface OccupancyStats {
  rate: number;          // 0-100
  bookedDays: number;
  totalDays: number;
  availableDays: number;
}

/**
 * Stats de revenus (ADR = Average Daily Rate)
 */
export interface RevenueStats {
  adr: number;           // Prix moyen par jour
  totalRevenue: number;
  bookedDays: number;
  projectedRevenue?: number;
}
