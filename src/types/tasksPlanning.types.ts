/** Réponse GET `/api/v1/task/reservation/planning` (srv-task) — aligné sojori-dashboard / UltimateDashboard */

export interface PlanningTimelineItem {
  type?: string;
  category?: string;
  categoryGroup?: string;
  scheduledFor?: string;
  isTask?: boolean;
  staffId?: string;
  status?: string;
  cleaning_type?: string;
  data?: Record<string, unknown>;
}

export interface PlanningReservationRow {
  reservationId?: string;
  id?: string;
  _id?: string;
  guestName?: string;
  arrivalDate: string;
  departureDate: string;
  status?: string;
  reservationNumber?: string;
  timeline?: PlanningTimelineItem[];
  /** Présent quand l’API planning les renvoie (srv-task) */
  channelName?: string;
  numberOfGuests?: number;
}

export interface PlanningListingRow {
  listingId?: string;
  listingName?: string;
  name?: string;
  /** Aligné srv-task Listing.active — absent si API legacy */
  active?: boolean;
  address?: string;
  cleanlinessStatus?: string;
  /** srv-task Listing — utilisé si `cleanlinessStatus` legacy absent */
  cleanlinessStatus_v2?: string;
  occupancyStatus?: string;
  reservations?: PlanningReservationRow[];
}

export interface ReservationPlanningPayload {
  startDate: string;
  endDate: string;
  listings: PlanningListingRow[];
}

export interface ReservationPlanningResponse {
  success: boolean;
  message?: string;
  data?: ReservationPlanningPayload;
}
