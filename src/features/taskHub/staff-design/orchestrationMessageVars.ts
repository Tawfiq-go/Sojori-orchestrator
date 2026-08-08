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
  { key: '{numberOfGuests}', label: "Nombre d'invités", group: 'Réservation' },
  { key: '{adults}', label: "Nombre d'adultes", group: 'Réservation' },
  { key: '{nights}', label: 'Nombre de nuits', group: 'Réservation' },
  { key: '{arrivalDate}', label: "Date d'arrivée", group: 'Réservation' },
  { key: '{departureDate}', label: 'Date de départ', group: 'Réservation' },
  { key: '{checkInTime}', label: "Heure d'arrivée", group: 'Réservation' },
  { key: '{checkOutTime}', label: 'Heure de départ', group: 'Réservation' },
  { key: '{totalPrice}', label: 'Prix total', group: 'Paiement' },
  { key: '{currency}', label: 'Devise', group: 'Paiement' },
  { key: '{paymentStatus}', label: 'Statut paiement', group: 'Paiement' },
  { key: '{paymentMethod}', label: 'Mode de paiement', group: 'Paiement' },
  { key: '{doorCode}', label: 'Code porte', group: 'Listing' },
  { key: '{listingName}', label: "Nom de l'annonce", group: 'Listing' },
  { key: '{checkoutInstructions}', label: 'Instructions départ (texte global)', group: 'Listing' },
  { key: '{cityTaxParagraph}', label: 'Paragraphe taxe de séjour', group: 'Listing' },
  { key: '{checkoutTime}', label: 'Heure de départ', group: 'Listing' },
  { key: '{cityTaxPerAdult}', label: 'Taxe ville / adulte / nuit', group: 'Listing' },
  { key: '{cityTaxTotal}', label: 'Taxe ville totale', group: 'Listing' },
  { key: '{babyCotBlock}', label: 'Puce lit bébé (si amenity)', group: 'Bienvenue' },
];

/** Numéro WhatsApp Sojori (E.164 sans +). */
export const WHATSAPP_SOJORI_E164 = '212773745388';

/** Lien wa.me avec texte prérempli — {reservationNumber} remplacé à l'envoi / aperçu. */
export const WHATSAPP_RESERVATION_LINK_VAR = `https://wa.me/${WHATSAPP_SOJORI_E164}?text=Bonjour,+ma+réservation+est+{reservationNumber}`;

/** CTA + lien résa — sans signature (signature PM séparée). */
export const OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR = `

Appuyer pour ouvrir WhatsApp (réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}`;

/** @deprecated — préférer OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR (sans « Équipe Sojori »). */
export const OTA_EMAIL_WHATSAPP_FOOTER_FR = OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR;

/** Compose email = Objet + corps (même texte que l’OTA). */
export function withEmailSubject(subject: string, body: string): string {
  const sub = String(subject || '').trim();
  const b = String(body || '').trimEnd();
  if (!sub) return b;
  return `Objet : ${sub}\n\n${b}`;
}

/** Extrait titre + corps depuis messageFrEmail (ligne « Objet : … »). */
export function parseEmailSubjectAndBody(email: string | undefined): {
  subject: string;
  body: string;
} {
  const raw = String(email || '');
  const m = raw.match(/^Objet\s*:\s*(.+?)\s*\n\n([\s\S]*)$/i);
  if (m) {
    return { subject: m[1].trim(), body: m[2].trimEnd() };
  }
  const firstLine = raw.split('\n')[0] || '';
  if (/^Objet\s*:/i.test(firstLine)) {
    return {
      subject: firstLine.replace(/^Objet\s*:\s*/i, '').trim(),
      body: raw.slice(firstLine.length).replace(/^\n+/, '').trimEnd(),
    };
  }
  return { subject: '', body: raw.trimEnd() };
}

/** Ajoute le CTA WhatsApp + réservation si absent (OTA / email). */
export function ensureCatalogWhatsAppLink(body: string | undefined): string {
  if (!body?.trim()) return body ?? '';
  let b = body.trimEnd();
  const bare = `https://wa.me/${WHATSAPP_SOJORI_E164}`;
  if (!b.includes('wa.me/')) {
    return b + OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR;
  }
  if (b.includes(bare) && !b.includes('{reservationNumber}') && !b.includes('text=')) {
    b = b.split(bare).join(WHATSAPP_RESERVATION_LINK_VAR);
  }
  if (!b.includes(WHATSAPP_RESERVATION_LINK_VAR) && !b.includes('text=Bonjour')) {
    return b + OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR;
  }
  return b;
}

/** Insère le CTA WhatsApp (sans signature) — pour édition PM. */
export function insertCatalogWhatsAppLink(body: string | undefined): string {
  const b = String(body || '').trimEnd();
  const bare = `https://wa.me/${WHATSAPP_SOJORI_E164}`;
  if (b.includes('wa.me/') || b.includes(WHATSAPP_RESERVATION_LINK_VAR)) {
    if (b.includes(bare) && !b.includes('{reservationNumber}') && !b.includes('text=')) {
      return b.split(bare).join(WHATSAPP_RESERVATION_LINK_VAR);
    }
    return b;
  }
  return (b ? `${b}${OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR}` : OTA_EMAIL_WHATSAPP_LINK_BLOCK_FR.trimStart()).trimEnd();
}

export const WELCOME_MESSAGE_TEMPLATE_FR = `Bonjour {firstName},

Votre réservation {reservationNumber} pour {listingName} est confirmée.
Arrivée : {arrivalDate} · Départ : {departureDate} · {nights} nuit(s)

Pour préparer votre arrivée, écrivez-nous sur WhatsApp :
• Choisir votre heure d'arrivée
• Consignes d'accès et parcours jusqu'au logement
{babyCotBlock}• Navette aéroport
• Ménage, courses, conciergerie et autres services

Appuyer pour ouvrir WhatsApp (réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}`;
