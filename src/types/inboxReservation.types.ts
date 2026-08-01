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
  /** Total payé par le client (guest OTA) */
  totalPrice?: number;
  currency?: string;
  paymentStatus?: string;
  /** Hébergement (stay) inclus dans le total client */
  stayAmount?: number;
  /** Ménage / cleaning inclus (0 = pas de ménage) */
  cleaningAmount?: number;
  /** Taxe de séjour / Tourist Tax (≠ ménage) */
  touristTaxAmount?: number;
  netHost?: number;
  commission?: number;
  /** Libellé commission : Host service fee / Commission Booking… */
  commissionLabel?: string;
  /** Airbnb : host fee 15,5 % (HT) */
  hostFeeAmount?: number;
  /** Airbnb : TVA 20 % sur host fee (Maroc) */
  hostFeeVatAmount?: number;
  otaPlatform?: string;
  /** Code confirmation canal (Airbnb HM…, Booking, etc.) — lien « Ouvrir sur … » */
  otaCode?: string;
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

