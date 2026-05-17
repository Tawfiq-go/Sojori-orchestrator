/** Données réservation pour le panneau droit Inbox V4 (WhatsApp + OTA). */
export interface InboxReservationData {
  reservationNumber?: string;
  listingName?: string;
  /** Plateforme de réservation (Airbnb, Booking…) — ligne Source (WhatsApp) */
  bookingSource?: string;
  /** Canal de messagerie (WhatsApp) — ligne Canal */
  messagingChannel?: string;
  /** Statut résa (Confirmée…) */
  reservationStatus?: string;
  /** Note voyageur OTA ex. "4.92 · 12 séj." */
  guestRating?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInDisplay?: string;
  checkOutDisplay?: string;
  nightsCount?: number;
  guestsLabel?: string;
  totalPrice?: number;
  currency?: string;
  paymentStatus?: string;
  netHost?: number;
  commission?: number;
  otaPlatform?: string;
  /** Lead / demande */
  leadStatus?: string;
  /** Avis */
  reviewRating?: number;
  reviewReplied?: boolean;
  reviewResponse?: string;
}
