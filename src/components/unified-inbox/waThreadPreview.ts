import type { Conversation, MessageExchange } from '../../types/messages.types';

/** Q = question voyageur · R = réponse (AI / admin / auto). */
export type WaLastMessageKind = 'Q' | 'R';

const TEMPLATE_OWNER: Record<string, string> = {
  reminder_arrival_choice_v1: 'Relance · choisir heure d’arrivée',
  reminder_departure_choice_v1: 'Relance · choisir heure de départ',
  reminder_arrival_declare_v1: 'Relance · déclarer l’arrivée',
  reminder_departure_declare_v1: 'Relance · déclarer le départ',
  reminder_registration_v1: 'Relance · formulaire enregistrement',
  reminder_cleaning_free_v1: 'Relance · ménage gratuit',
  welcome_sojori_v2: 'Bienvenue · message d’accueil',
  welcome_sojori: 'Bienvenue · message d’accueil',
  checkin_feedback_v1: 'Feedback · après arrivée',
  checkin_feedback: 'Feedback · après arrivée',
  departure_instructions_v1: 'Instructions · départ',
  departure_instructions: 'Instructions · départ',
  checkout_feedback_v1: 'Feedback · après départ',
  checkout_feedback: 'Feedback · après départ',
};

/** Libellé owner pour un catalogKey / template plan (badge A). */
export function ownerLabelForPlanCatalog(catalogKey?: string | null): string {
  return ownerSummaryFromTemplateName(catalogKey) || String(catalogKey || '').replace(/_/g, ' ');
}

function clip(text: string, max = 90): string {
  const t = String(text || '')
    .replace(/###PLACEHOLDER_\d+###/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function exchangeTs(ex?: MessageExchange | null): number {
  if (!ex?.timestamp) return 0;
  const t = new Date(ex.timestamp).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Plus récent d’abord — ne pas faire confiance à l’ordre API / optimistic. */
export function sortedExchangesNewestFirst(conv: Conversation): MessageExchange[] {
  const list = [...(conv.recent_exchanges || [])];
  return list.sort((a, b) => {
    const tb = exchangeTs(b);
    const ta = exchangeTs(a);
    if (tb !== ta) return tb - ta;
    return 0;
  });
}

function exchangeRawPreview(ex: MessageExchange, kind: WaLastMessageKind): string {
  if (kind === 'Q') return String(ex.user_message || '').trim();
  return (
    String(ex.ai_response || '').trim() ||
    (ex.sent_by_admin ? String(ex.user_message || '').trim() : '')
  );
}

/** Relance / template plan — pas un Q/R inbox. */
export function isWaProgrammedAutoExchange(ex: MessageExchange): boolean {
  const kind = resolveWaLastMessageKind(ex);
  if (!kind) return false;
  const raw = exchangeRawPreview(ex, kind);
  const human = humanizeOwnerPreview(raw) || raw;
  if (looksLikeWaProgrammedAuto(human)) return true;
  if (/📋\s*Template|reminder_[a-z0-9_]+/i.test(raw)) return true;
  if (/Relance\s*·/i.test(human)) return true;
  return false;
}

function ownerSummaryFromTemplateName(templateName?: string | null): string | null {
  const key = String(templateName || '')
    .trim()
    .toLowerCase();
  if (!key) return null;
  if (TEMPLATE_OWNER[key]) return TEMPLATE_OWNER[key];
  if (key.includes('registration')) return 'Relance · formulaire enregistrement';
  if (key.includes('arrival') && key.includes('choice')) return 'Relance · choisir heure d’arrivée';
  if (key.includes('departure') && key.includes('choice')) return 'Relance · choisir heure de départ';
  if (key.includes('arrival') && key.includes('declare')) return 'Relance · déclarer l’arrivée';
  if (key.includes('departure') && key.includes('declare')) return 'Relance · déclarer le départ';
  if (key.includes('cleaning')) return 'Relance · ménage';
  if (key.includes('welcome')) return 'Bienvenue · message d’accueil';
  return `Relance · ${key.replace(/_/g, ' ')}`;
}

/** Message host Sojori (email / OTA auto) — pas une question voyageur. */
export function looksLikeHostOutboundMessage(raw?: string | null): boolean {
  const c = String(raw || '');
  if (!c.trim()) return false;
  if (/équipe\s*sojori|equipe\s*sojori/i.test(c)) return true;
  if (/wa\.me\//i.test(c)) return true;
  if (/nous\s+espérons\s+que\s+votre\s+séjour/i.test(c)) return true;
  if (/écrivez-nous\s+sur\s+whatsapp/i.test(c)) return true;
  if (/votre\s+réservation\b.+\best\s+confirmée/i.test(c)) return true;
  if (/sent via booking\.com|sent via airbnb/i.test(c)) return true;
  return false;
}

/**
 * Réponse hôte « parlée » (souvent mal taggée incoming=true côté OTA).
 * Ne pas utiliser dans lastRealNonAuto (sinon on ignore le vrai dernier R).
 */
export function looksLikeHostSpokenReply(raw?: string | null): boolean {
  const c = String(raw || '');
  if (!c.trim()) return false;
  if (looksLikeHostOutboundMessage(c)) return true;
  if (/hope you'?re enjoying|just checking in|we have left you a \d/i.test(c)) return true;
  if (/thank you for staying with us/i.test(c)) return true;
  if (/you'?re very welcome|see you soon/i.test(c)) return true;
  if (/belle journ[ée]e\b|je vais te texter/i.test(c)) return true;
  if (/^(avec plaisir|je vous en prie|de rien)[\s!.…]*$/i.test(c.trim())) return true;
  return false;
}

/**
 * Court remerciement / ack voyageur — pas une vraie question à traiter.
 * (Ma journée / Non répondu : ne pas compter comme « À répondre ».)
 */
export function looksLikeGuestCourtesyClose(raw?: string | null): boolean {
  const t = String(raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t || t.length > 100) return false;
  if (/\?/.test(t)) return false;
  const low = t.toLowerCase();
  if (
    /^(ok(ay)?|oui|yes|yep|sure|parfait|super|great|cool|fabulous|noted|c'?est noté|d'?accord|merci(\s+beaucoup)?|thanks?(?:\s+you)?|thank you|muito obrigado|👍|🙏|😊|🙂)[\s!.…]*$/i.test(
      low,
    )
  ) {
    return true;
  }
  // « Okay thanks 😊 » / « Hi Moncef Thanks everything is fine thanks a lot »
  if (
    t.length <= 90 &&
    /^(ok(ay)?|hi\b|hello\b|bonjour)?[\s,]*(thanks?|thank you|merci)\b/i.test(t) &&
    !/\b(can|could|please|pouvez|pourriez|besoin|need|when|où|where|how)\b/i.test(t)
  ) {
    return true;
  }
  return false;
}

/** Nettoie sujet email vide + extrait le vrai début du message. */
function cleanEmailishPreview(raw: string): string {
  let t = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim();
  // "Re: (no subject) Bonjour…" → garder le corps
  t = t.replace(/^re:\s*\(no subject\)\s*/i, '');
  t = t.replace(/^(re|fw|fwd):\s*/i, '');
  if (/^\(no subject\)\s*/i.test(t)) t = t.replace(/^\(no subject\)\s*/i, '');
  return t.trim();
}

/** Transforme le jargon technique (Template « id », flow…) en libellé owner. */
export function humanizeOwnerPreview(raw?: string | null, ownerSummary?: string | null): string {
  const explicit = clip(String(ownerSummary || ''));
  if (explicit && !/reminder_[a-z0-9_]+/i.test(explicit)) return explicit;

  const cleaned = cleanEmailishPreview(String(raw || ''));
  const c = cleaned || String(raw || '');

  const tmpl = c.match(/Template\s*«\s*([^»]+)\s*»/i);
  if (tmpl) return ownerSummaryFromTemplateName(tmpl[1]) || 'Message auto · séjour';

  const flowReply = c.match(/WhatsApp Flow reply\s*·\s*([^*\n]+)/i);
  if (flowReply) {
    const label = flowReply[1].trim();
    if (/^whatsapp flow$/i.test(label)) return 'Voyageur · réponse formulaire';
    return clip(`Voyageur · ${label}`);
  }

  if (/^\[Auto\]/i.test(c)) return clip(c.replace(/^\[Auto\]\s*/i, 'Auto · '));
  if (/Parcours mis à jour/i.test(c)) return 'Mise à jour · parcours séjour';
  if (/Bienvenue chez Sojori|Welcome to Sojori/i.test(c)) return 'Accueil · message bienvenue';

  // Relance mid-stay / confirmation (email → WhatsApp) — intent court
  if (looksLikeHostOutboundMessage(c)) {
    if (/ménage|transport|aide/i.test(c) && /whatsapp|wa\.me/i.test(c)) {
      return 'Relance · WhatsApp séjour';
    }
    if (/confirmée|confirmé/i.test(c) && /wa\.me|whatsapp/i.test(c)) {
      return 'Confirmation · lien WhatsApp';
    }
    if (/équipe\s*sojori|equipe\s*sojori/i.test(c)) {
      return 'Réponse hôte · Sojori';
    }
    return clip(c);
  }

  // Éviter d’afficher un pavé technique / IDs
  if (/reminder_[a-z0-9_]+/i.test(c) || /📋\s*Template/i.test(c)) {
    return 'Message auto · séjour';
  }

  // Sujet seul sans corps → vide (pas « Message OTA »)
  if (isPlaceholderLastMessage(raw) || isPlaceholderLastMessage(cleaned)) {
    return '';
  }

  return clip(cleaned || c);
}

export function isEmptyThreadPreview(preview?: string | null): boolean {
  const p = String(preview || '')
    .trim()
    .toLowerCase();
  if (!p) return true;
  return (
    p === 'aucun message' ||
    p.startsWith('aucun message') ||
    p === 'no message' ||
    p === 'message ota' ||
    p === '—' ||
    p === '-'
  );
}

/**
 * Placeholder RU / sujet vide — ce n’est PAS un vrai échange.
 * Ex. « Aucun message », « Re: (no subject) » sans corps.
 */
export function isPlaceholderLastMessage(raw?: string | null): boolean {
  const t = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!t) return true;
  if (t === 'aucun message' || t.startsWith('aucun message')) return true;
  if (t === 'no message' || t === 'n/a' || t === '—' || t === '-') return true;
  if (t === 'message ota') return true;
  if (t === 're: (no subject)' || t === '(no subject)' || t === 're:' || t === 'fw:' || t === 'fwd:') {
    return true;
  }
  // Sujet seul très court sans contenu utile
  if (/^(re|fw|fwd):\s*\(no subject\)$/i.test(t)) return true;
  return false;
}

/** Plus récent (tri timestamp) — pas seulement `[0]`. */
export function latestExchange(conv: Conversation): MessageExchange | undefined {
  return sortedExchangesNewestFirst(conv)[0];
}

export function resolveWaLastMessageKind(ex?: MessageExchange): WaLastMessageKind | undefined {
  if (!ex) return undefined;
  const hasUser = Boolean(String(ex.user_message || '').trim());
  const hasAi = Boolean(String(ex.ai_response || '').trim());
  if (!hasUser && !hasAi) return undefined;
  if (hasAi) return 'R';
  if (hasUser) {
    // Admin qui tape dans le slot user → réponse
    if (ex.sent_by_admin) return 'R';
    return 'Q';
  }
  return undefined;
}

export function resolveWaLastMessageAt(conv: Conversation): string | undefined {
  const ex = latestExchange(conv);
  return ex?.timestamp || conv.last_message_time || undefined;
}

/** Envoi plan / relance (badge A) — pas une réponse manuelle R. */
function looksLikeWaProgrammedAuto(preview: string): boolean {
  const p = String(preview || '').trim();
  return /^(Relance|Bienvenue|Feedback|Instructions|Accueil|Auto|Confirmation|Message auto)\s*·/i.test(
    p,
  );
}

/**
 * Dernier Q/R réel (ignore relances plan).
 * Si le fil ne contient que des templates → vide + éventuellement badge A.
 */
export function buildWaListPreview(conv: Conversation): {
  preview: string;
  lastMessageKind?: WaLastMessageKind;
  lastMessageAt?: string;
  programmedAuto?: {
    catalogKey: string;
    label: string;
    sentAt?: string;
  };
} {
  const emptyBase = 'Aucun message';
  const exchanges = sortedExchangesNewestFirst(conv);
  let latestAuto:
    | {
        catalogKey: string;
        label: string;
        sentAt?: string;
      }
    | undefined;

  for (const ex of exchanges) {
    const kind = resolveWaLastMessageKind(ex);
    if (!kind) continue;
    const raw = exchangeRawPreview(ex, kind);
    const preview = humanizeOwnerPreview(raw) || raw || (kind === 'Q' ? 'Message voyageur' : 'Réponse');
    const at = ex.timestamp || conv.last_message_time;

    if (isWaProgrammedAutoExchange(ex) || looksLikeWaProgrammedAuto(preview)) {
      if (!latestAuto) {
        latestAuto = {
          catalogKey: 'wa_plan',
          label: preview,
          sentAt: at,
        };
      }
      continue;
    }

    return {
      preview,
      lastMessageKind: kind,
      lastMessageAt: at,
    };
  }

  if (latestAuto) {
    return {
      preview: emptyBase,
      lastMessageKind: undefined,
      lastMessageAt: latestAuto.sentAt || conv.last_message_time || undefined,
      programmedAuto: latestAuto,
    };
  }

  return {
    preview: emptyBase,
    lastMessageKind: undefined,
    lastMessageAt: conv.last_message_time || undefined,
  };
}
