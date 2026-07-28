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
  /** Date création en base (createdAt) ou date réservation OTA (reservationDate) */
  reservationCreatedAt?: string;
  reservationCreatedDisplay?: string;
  checkInDate?: string;
  checkOutDate?: string;
  checkInDisplay?: string;
  checkOutDisplay?: string;
  nightsCount?: number;
  guestsLabel?: string;
  /** Composition compacte type planning : 2A · 1E */
  guestsCompact?: string;
  /** Téléphone voyageur (OTA / résa) */
  guestPhone?: string;
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
  /** Présence séjour (Attendu / En cours / Présent / …) — aligné liste réservations */
  presenceLabel?: string;
  /** Enregistrement police : inscrits / à enregistrer */
  registrationRegistered?: number;
  registrationTotal?: number;
  /** Heure d’arrivée choisie par le client (sinon listing par défaut) */
  arrivalTimeChosen?: boolean;
  arrivalTimeLabel?: string;
  departureTimeChosen?: boolean;
  departureTimeLabel?: string;
  /** Arrivée / départ réellement déclarés (actualArrival/Departure) */
  arrivalDeclared?: boolean;
  departureDeclared?: boolean;
}

