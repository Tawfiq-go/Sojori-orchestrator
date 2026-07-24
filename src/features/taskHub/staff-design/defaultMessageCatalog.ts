import {
  WHATSAPP_RESERVATION_LINK_VAR,
  ensureCatalogWhatsAppLink,
} from './orchestrationMessageVars';
import type { CatalogMessage } from './types';

/** 10 messages alignés design Claude / seeds srv-fulltask (OTA + email, WA Meta). */
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

👉 WhatsApp (réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}

Équipe Sojori`,
    messageFrEmail: `Objet : Bienvenue — {listingName} · {reservationNumber}

Bonjour {firstName},

Votre réservation {reservationNumber} pour {listingName} est confirmée.
Arrivée : {arrivalDate} · Départ : {departureDate} · {nights} nuit(s)

Pour préparer votre arrivée, écrivez-nous sur WhatsApp :
• Choisir votre heure d'arrivée
• Consignes d'accès et parcours jusqu'au logement
{babyCotBlock}• Navette aéroport
• Ménage, courses, conciergerie et autres services

👉 WhatsApp (réf. {reservationNumber}) :
${WHATSAPP_RESERVATION_LINK_VAR}

Équipe Sojori`,
  },
  {
    id: 'checkin_feedback',
    label: 'Comment ça va ?',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Nous espérons que votre séjour à {listingName} se déroule bien.
N'hésitez pas à nous contacter via la messagerie de la plateforme ou sur WhatsApp :

${WHATSAPP_RESERVATION_LINK_VAR}

Belle journée,
Équipe Sojori`,
    messageFrEmail: `Objet : Votre séjour — {listingName}

Bonjour {firstName},

Nous espérons que votre séjour à {listingName} se déroule bien.

${WHATSAPP_RESERVATION_LINK_VAR}

Belle journée,
Équipe Sojori`,
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
${WHATSAPP_RESERVATION_LINK_VAR}

Équipe Sojori · Réf. {reservationNumber}`,
    messageFrEmail: `Objet : Instructions de départ — {listingName} · {departureDate}

Bonjour {firstName},

Votre départ de {listingName} approche : demain à {checkoutTime}.

Avant de partir, merci de :
{checkoutInstructions}

{cityTaxParagraph}

Question de dernière minute :
${WHATSAPP_RESERVATION_LINK_VAR}`,
  },
  {
    id: 'checkout_feedback',
    label: 'Nouvelles après départ',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Merci d'avoir séjourné à {listingName}.
Votre avis sur la plateforme nous aide à améliorer l'accueil de futurs voyageurs.

À bientôt,
Équipe Sojori · Réf. {reservationNumber}`,
    messageFrEmail: '',
  },
  {
    id: 'msg_relance_arrival_choose',
    label: 'Relance · choisir arrivée',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Pour préparer votre arrivée à {listingName}, merci de nous indiquer votre heure d'arrivée prévue via WhatsApp ou la messagerie OTA.
Réf. réservation : {reservationNumber}

Équipe Sojori`,
    messageFrEmail: `Objet : Heure d'arrivée — {listingName}

Bonjour {firstName},

Nous attendons encore votre choix d'heure d'arrivée pour {listingName} ({arrivalDate}).
${WHATSAPP_RESERVATION_LINK_VAR}

Réf. {reservationNumber}
Équipe Sojori`,
  },
  {
    id: 'msg_relance_departure_choose',
    label: 'Relance · choisir départ',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Merci d'indiquer votre heure de départ pour {listingName} (départ prévu {departureDate}).
Réf. {reservationNumber} — Équipe Sojori`,
    messageFrEmail: `Objet : Heure de départ — {listingName}

Bonjour {firstName},

Merci de confirmer votre heure de départ pour {listingName}.
Équipe Sojori · Réf. {reservationNumber}`,
  },
  {
    id: 'msg_relance_arrival_declare',
    label: 'Relance · déclarer arrivée',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Pouvez-vous nous confirmer vos informations d'arrivée (vol/train, heure) pour {listingName} ?
Réf. {reservationNumber}`,
    messageFrEmail: '',
  },
  {
    id: 'msg_relance_departure_declare',
    label: 'Relance · déclarer départ',
    whatsappTemplateId: 'reminder_departure_declare_v1',
    messageFrOta: `Bonjour {firstName},

Avez-vous bien quitté {listingName} ?

Merci de nous confirmer votre départ.

Équipe Sojori · Réf. {reservationNumber}`,
    messageFrEmail: `Objet : Confirmation de départ — {listingName}

Bonjour {firstName},

Avez-vous bien quitté {listingName} ?

Merci de nous confirmer votre départ en répondant à cet email.

Équipe Sojori · Réf. {reservationNumber}`,
  },
  {
    id: 'msg_relance_registration',
    label: 'Relance · enregistrement',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Pour votre séjour à {listingName}, merci de compléter l'enregistrement voyageurs (obligatoire avant l'arrivée).
Réf. {reservationNumber} — Équipe Sojori`,
    messageFrEmail: `Objet : Enregistrement à compléter — {listingName}

Bonjour {firstName},

L'enregistrement pour {listingName} n'est pas encore finalisé. Complétez-le via WhatsApp Sojori.
Réf. {reservationNumber}`,
  },
  {
    id: 'msg_relance_cleaning',
    label: 'Relance · ménage',
    whatsappTemplateId: '',
    messageFrOta: `Bonjour {firstName},

Rappel : votre créneau de ménage pour {listingName} approche. Confirmez ou modifiez via WhatsApp.
Réf. {reservationNumber}`,
    messageFrEmail: '',
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
