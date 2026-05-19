export type ReservationFilter =
  | 'today_arrivals'
  | 'today_departures'
  | 'week_arrivals'
  | 'week_departures'
  | 'month'
  | 'custom';

export interface Reservation {
  id: string;
  guestName?: string;
  guestEmail?: string;
  phone?: string;
  guestLanguage?: string | null;
  guestCountry?: string | null;
  channelName?: string;
  otaCode?: string;
  arrivalDate?: string | Date;
  departureDate?: string | Date;
  nights?: number;
  adults?: number;
  children?: number;
  infants?: number;
  actualArrivalTime?: string;
  actualDepartureTime?: string;
  totalPrice?: number;
  currency?: string;
  alreadyPaid?: number;
  paymentStatus?: string;
  doorCode?: string;
  status?: string;
  reservationNumber?: string;
  sojoriId?: string;
  listingMapId?: string;
  guestRegistration?: { members?: unknown[] };
  police_registration?: { members?: unknown[] };
}

export interface ReservationDetail {
  id: string;
  listing_name: string;
  guest_name?: string;
  guest_email: string;
  guest_phone: string;
  guest_phone_whatsapp: string;
  guest_language: string | null;
  guest_country: string | null;
  ota: string;
  arrival_date: string;
  departure_date: string;
  arrival_date_raw?: string | Date;
  departure_date_raw?: string | Date;
  nights?: number;
  guests: string;
  adults?: number;
  children?: number;
  infants?: number;
  arrival_declared: string;
  departure_declared: string;
  total_price: string;
  already_paid?: number;
  payment_status: string;
  door_code: string;
  status?: string;
  police_members: number;
  reservation_number: string;
  channel_name: string;
}

export interface ReservationDetailResponse {
  success: boolean;
  data: ReservationDetail;
}

export interface ReservationListItem {
  id: string;
  guestName: string;
  property: string;
  arrival: string;
  departure: string;
  status: string;
  source: string;
  nights: number;
  total: string;
}

export interface ReservationCounts {
  arrivals: number;
  departures: number;
  inHouse: number;
  cancelled: number;
}
