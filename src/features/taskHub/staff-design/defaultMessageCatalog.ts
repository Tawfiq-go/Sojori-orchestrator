import {
  WHATSAPP_RESERVATION_LINK_VAR,
  ensureCatalogWhatsAppLink,
  withEmailSubject,
} from './orchestrationMessageVars';
import type { CatalogMessage } from './types';

const WA_CTA = `Appuyer pour ouvrir WhatsApp (réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}`;

/** Socle unique OTA = email (sans signature) ; email = Objet + corps. */
export const CLAUDE_DEFAULT_MESSAGE_CATALOG: CatalogMessage[] = [
  {
    id: 'welcome_sojori_v2',
    label: 'Bienvenu',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Votre réservation {reservationNumber} pour {listingName} est confirmée.
Arrivée : {arrivalDate} · Départ : {departureDate} · {nights} nuit(s)

Pour préparer votre arrivée, écrivez-nous sur WhatsApp :
• Choisir votre heure d'arrivée
• Consignes d'accès et parcours jusqu'au logement
{babyCotBlock}• Navette aéroport
• Ménage, courses, conciergerie et autres services

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Bienvenue — {listingName} · {reservationNumber}',
      `Bonjour {firstName},

Votre réservation {reservationNumber} pour {listingName} est confirmée.
Arrivée : {arrivalDate} · Départ : {departureDate} · {nights} nuit(s)

Pour préparer votre arrivée, écrivez-nous sur WhatsApp :
• Choisir votre heure d'arrivée
• Consignes d'accès et parcours jusqu'au logement
{babyCotBlock}• Navette aéroport
• Ménage, courses, conciergerie et autres services

${WA_CTA}`,
    ),
  },
  {
    id: 'checkin_feedback',
    label: 'Comment ça va ?',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Nous espérons que votre séjour à {listingName} se passe bien.

Besoin d'un ménage, d'un transport ou d'aide ? Écrivez-nous sur WhatsApp :

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Votre séjour à {listingName} — tout se passe bien ?',
      `Bonjour {firstName},

Nous espérons que votre séjour à {listingName} se passe bien.

Besoin d'un ménage, d'un transport ou d'aide ? Écrivez-nous sur WhatsApp :

${WA_CTA}`,
    ),
  },
  {
    id: 'departure_instructions',
    label: 'Instructions départ',
    whatsappTemplateId: 'departure_instructions_v1',
    messageFrOta: `Bonjour {firstName},

Votre départ de {listingName} approche : demain à {checkoutTime}.

Avant de partir, merci de :
{checkoutInstructions}

{cityTaxParagraph}

Une question ?

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Instructions de départ — {listingName} · {departureDate}',
      `Bonjour {firstName},

Votre départ de {listingName} approche : demain à {checkoutTime}.

Avant de partir, merci de :
{checkoutInstructions}

{cityTaxParagraph}

Une question ?

${WA_CTA}`,
    ),
  },
  {
    id: 'checkout_feedback',
    label: 'Nouvelles après départ',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Merci d'avoir séjourné à {listingName}.

Votre avis sur la plateforme nous aide à améliorer l'accueil de futurs voyageurs.

Une question ou un retour ?

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Merci pour votre séjour — {listingName}',
      `Bonjour {firstName},

Merci d'avoir séjourné à {listingName}.

Votre avis sur la plateforme nous aide à améliorer l'accueil de futurs voyageurs.

Une question ou un retour ?

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_arrival_choose',
    label: 'Relance · choisir arrivée',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Votre arrivée à {listingName} est prévue le {arrivalDate}.

Merci d'indiquer votre heure d'arrivée estimée pour que nous préparions votre accueil.

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      "Heure d'arrivée — {listingName} · {arrivalDate}",
      `Bonjour {firstName},

Votre arrivée à {listingName} est prévue le {arrivalDate}.

Merci d'indiquer votre heure d'arrivée estimée pour que nous préparions votre accueil.

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_departure_choose',
    label: 'Relance · choisir départ',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Votre départ de {listingName} est prévu le {departureDate}.

Merci de confirmer votre heure de départ. Les instructions de départ vous seront envoyées séparément.

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Heure de départ — {listingName} · {departureDate}',
      `Bonjour {firstName},

Votre départ de {listingName} est prévu le {departureDate}.

Merci de confirmer votre heure de départ. Les instructions de départ vous seront envoyées séparément.

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_arrival_declare',
    label: 'Relance · déclarer arrivée',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Êtes-vous bien arrivé(e) à {listingName} ?

Merci de nous confirmer votre arrivée. Notre équipe reste disponible si besoin :

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      "Confirmation d'arrivée — {listingName}",
      `Bonjour {firstName},

Êtes-vous bien arrivé(e) à {listingName} ?

Merci de nous confirmer votre arrivée. Notre équipe reste disponible si besoin :

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_departure_declare',
    label: 'Relance · déclarer départ',
    whatsappTemplateId: 'reminder_departure_declare_v1',
    messageFrOta: `Bonjour {firstName},

Avez-vous bien quitté {listingName} ?

Merci de nous confirmer votre départ :

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Confirmation de départ — {listingName}',
      `Bonjour {firstName},

Avez-vous bien quitté {listingName} ?

Merci de nous confirmer votre départ :

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_registration',
    label: 'Relance · enregistrement',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

L'enregistrement voyageurs pour {listingName} n'est pas encore finalisé (obligatoire avant l'arrivée).

Complétez-le en quelques minutes sur WhatsApp :

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Enregistrement à compléter — {listingName} · avant {arrivalDate}',
      `Bonjour {firstName},

L'enregistrement voyageurs pour {listingName} n'est pas encore finalisé (obligatoire avant l'arrivée).

Complétez-le en quelques minutes sur WhatsApp :

${WA_CTA}`,
    ),
  },
  {
    id: 'msg_relance_cleaning',
    label: 'Relance · ménage',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Votre séjour à {listingName} inclut un ménage gratuit.

Planifiez votre créneau sur WhatsApp :

${WA_CTA}`,
    messageFrEmail: withEmailSubject(
      'Ménage inclus — {listingName}',
      `Bonjour {firstName},

Votre séjour à {listingName} inclut un ménage gratuit.

Planifiez votre créneau sur WhatsApp :

${WA_CTA}`,
    ),
  },
];

function withWhatsAppLinkFields(entry: CatalogMessage): CatalogMessage {
  return {
    ...entry,
    messageFrOta: entry.messageFrOta?.trim()
      ? ensureCatalogWhatsAppLink(entry.messageFrOta)
      : entry.messageFrOta,
    messageFrEmail: entry.messageFrEmail?.trim()
      ? ensureCatalogWhatsAppLink(entry.messageFrEmail)
      : entry.messageFrEmail,
  };
}

export function mergeCatalogWithClaudeDefaults(catalog: CatalogMessage[]): CatalogMessage[] {
  const apiById = new Map(catalog.map((c) => [c.id, c]));
  const merged: CatalogMessage[] = CLAUDE_DEFAULT_MESSAGE_CATALOG.map((def) => {
    const api = apiById.get(def.id);
    if (!api) return withWhatsAppLinkFields({ ...def });
    return withWhatsAppLinkFields({
      ...def,
      ...api,
      label: api.label || def.label,
      messageFrOta: api.messageFrOta?.trim() ? api.messageFrOta : def.messageFrOta,
      messageFrEmail: api.messageFrEmail?.trim() ? api.messageFrEmail : def.messageFrEmail,
      whatsappTemplateId: api.whatsappTemplateId ?? def.whatsappTemplateId,
    });
  });
  for (const c of catalog) {
    if (!CLAUDE_DEFAULT_MESSAGE_CATALOG.some((d) => d.id === c.id)) {
      merged.push(withWhatsAppLinkFields(c));
    }
  }
  return merged;
}
