/** Variables disponibles dans les messages Email / OTA (FR) */
export const MESSAGE_MERGE_VARIABLES: { key: string; label: string; group: string }[] = [
  { key: '{firstName}', label: 'Prénom invité', group: 'Invité' },
  { key: '{lastName}', label: 'Nom invité', group: 'Invité' },
  { key: '{guestName}', label: 'Nom complet invité', group: 'Invité' },
  { key: '{guestEmail}', label: 'Email invité', group: 'Invité' },
  { key: '{guestPhone}', label: 'Téléphone invité', group: 'Invité' },
  { key: '{guestAddress}', label: 'Adresse invité', group: 'Invité' },
  { key: '{guestCity}', label: 'Ville invité', group: 'Invité' },
  { key: '{guestCountry}', label: 'Pays invité', group: 'Invité' },
  { key: '{nationality}', label: 'Nationalité', group: 'Invité' },
  { key: '{reservationNumber}', label: 'Numéro de réservation', group: 'Réservation' },
  { key: '{numberOfGuests}', label: 'Nombre d\'invités', group: 'Réservation' },
  { key: '{adults}', label: 'Nombre d\'adultes', group: 'Réservation' },
  { key: '{nights}', label: 'Nombre de nuits', group: 'Réservation' },
  { key: '{arrivalDate}', label: 'Date d\'arrivée', group: 'Réservation' },
  { key: '{departureDate}', label: 'Date de départ', group: 'Réservation' },
  { key: '{checkInTime}', label: 'Heure d\'arrivée', group: 'Réservation' },
  { key: '{checkOutTime}', label: 'Heure de départ', group: 'Réservation' },
  { key: '{totalPrice}', label: 'Prix total', group: 'Paiement' },
  { key: '{currency}', label: 'Devise', group: 'Paiement' },
  { key: '{paymentStatus}', label: 'Statut paiement', group: 'Paiement' },
  { key: '{paymentMethod}', label: 'Mode de paiement', group: 'Paiement' },
  { key: '{doorCode}', label: 'Code porte', group: 'Listing' },
  { key: '{listingName}', label: 'Nom de l\'annonce', group: 'Listing' },
  { key: '{checkoutInstructions}', label: 'Instructions départ (texte global)', group: 'Listing' },
  { key: '{cityTaxParagraph}', label: 'Paragraphe taxe de séjour', group: 'Listing' },
  { key: '{checkoutTime}', label: 'Heure de départ', group: 'Listing' },
  { key: '{cityTaxPerAdult}', label: 'Taxe ville / adulte / nuit', group: 'Listing' },
  { key: '{cityTaxTotal}', label: 'Taxe ville totale', group: 'Listing' },
];

/** Numéro WhatsApp Sojori (E.164 sans +). */
export const WHATSAPP_SOJORI_E164 = '212773745388';

/** Lien wa.me avec texte prérempli — {reservationNumber} remplacé à l'envoi / aperçu. */
export const WHATSAPP_RESERVATION_LINK_VAR = `https://wa.me/${WHATSAPP_SOJORI_E164}?text=Bonjour,+ma+réservation+est+{reservationNumber}`;

export const OTA_EMAIL_WHATSAPP_FOOTER_FR = `

👉 WhatsApp Sojori (indiquez votre réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}

Équipe Sojori`;

/** Ajoute le lien WhatsApp + réservation si absent (OTA / email). */
export function ensureCatalogWhatsAppLink(body: string | undefined): string {
  if (!body?.trim()) return body ?? '';
  let b = body.trimEnd();
  const bare = `https://wa.me/${WHATSAPP_SOJORI_E164}`;
  if (!b.includes('wa.me/')) {
    return b + OTA_EMAIL_WHATSAPP_FOOTER_FR;
  }
  if (b.includes(bare) && !b.includes('{reservationNumber}') && !b.includes('text=')) {
    b = b.split(bare).join(WHATSAPP_RESERVATION_LINK_VAR);
  }
  if (!b.includes(WHATSAPP_RESERVATION_LINK_VAR) && !b.includes('text=Bonjour')) {
    return b + OTA_EMAIL_WHATSAPP_FOOTER_FR;
  }
  return b;
}

export const WELCOME_MESSAGE_TEMPLATE_FR = `Bonjour {firstName},

Nous sommes ravis de vous accueillir bientôt chez Sojori !

Votre réservation pour {listingName} est confirmée :
📅 Arrivée : {arrivalDate}
📅 Départ : {departureDate}
🔖 Numéro de réservation : {reservationNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ VOS SERVICES EN LIGNE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pour faciliter votre séjour, nous mettons à votre disposition un espace client accessible via WhatsApp.

👉 Accédez à votre espace :
https://wa.me/212773745388?text=Bonjour,+ma+réservation+est+{reservationNumber}

Vous pourrez ensuite accéder à :
• E — Enregistrement en ligne
• D — Choix de l'heure d'arrivée
• F — Codes d'accès au logement
• G — WiFi et informations pratiques
• I — Demande de ménage
• J — Services conciergerie
• K — Support client

À très bientôt,
L'équipe Sojori`;
