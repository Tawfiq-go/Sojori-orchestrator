import type { OtaThreadRow } from './inboxOtaMappers';
import {
  isPlaceholderLastMessage,
  looksLikeGuestCourtesyClose,
  looksLikeHostOutboundMessage,
  looksLikeHostSpokenReply,
} from './waThreadPreview';

function messageTextFromPreloaded(msg: Record<string, unknown>): string {
  return String(
    msg.body || msg.text || msg.message || msg.content || msg.preview || '',
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function isTrulyEmptyLastMessage(raw?: string | null): boolean {
  const t = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  if (!t) return true;
  if (t === 'aucun message' || t.startsWith('aucun message')) return true;
  if (t === 'no message' || t === 'n/a' || t === '—' || t === '-') return true;
  return false;
}

function isAutomationPreloaded(msg: Record<string, unknown>): boolean {
  return Boolean(msg.isAutomation ?? msg.automation);
}

/** Dernier message utile dans le batch préchargé (liste get-thread). */
export function lastMeaningfulPreloadedMessage(row: OtaThreadRow): {
  text: string;
  isIncoming: boolean;
  at?: string;
} | null {
  const msgs = row.preloadedMessages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const msg = msgs[i] as Record<string, unknown>;
    if (!msg || typeof msg !== 'object') continue;
    const text = messageTextFromPreloaded(msg);
    if (!text || isTrulyEmptyLastMessage(text) || isPlaceholderLastMessage(text)) continue;
    return {
      text,
      isIncoming: Boolean(msg.isIncoming ?? msg.incoming),
      at: String(msg.createdAt || msg.date || msg.timestamp || msg.sentAt || '') || undefined,
    };
  }
  return null;
}

/** Dernier message réel (hors automation plan) — Q ou R manuel. */
export function lastRealNonAutoPreloaded(row: OtaThreadRow): {
  text: string;
  isIncoming: boolean;
  at?: string;
} | null {
  const msgs = row.preloadedMessages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  // Insensible à l'ordre (l'API get-thread renvoie DESC, l'ancien code supposait
  // ASC et prenait le plus VIEUX) : on garde le match le plus récent par date.
  let best: { atMs: number; text: string; isIncoming: boolean; at?: string } | null = null;
  for (const raw of msgs) {
    const msg = raw as Record<string, unknown>;
    if (!msg || typeof msg !== 'object') continue;
    if (isAutomationPreloaded(msg)) continue;
    const text = messageTextFromPreloaded(msg);
    if (!text || isTrulyEmptyLastMessage(text) || isPlaceholderLastMessage(text)) continue;
    // Contenu clairement plan/host auto même sans flag
    if (!Boolean(msg.isIncoming ?? msg.incoming) && looksLikeHostOutboundMessage(text)) {
      continue;
    }
    const atRaw = String(msg.createdAt || msg.date || msg.timestamp || msg.sentAt || '');
    const atMs = atRaw ? new Date(atRaw).getTime() : 0;
    const safeMs = Number.isNaN(atMs) ? 0 : atMs;
    if (!best || safeMs > best.atMs) {
      best = {
        atMs: safeMs,
        text,
        isIncoming: Boolean(msg.isIncoming ?? msg.incoming),
        at: atRaw || undefined,
      };
    }
  }
  return best ? { text: best.text, isIncoming: best.isIncoming, at: best.at } : null;
}

/**
 * Vrai échange OTA (vue Échanges).
 */
export function hasOtaRealExchange(row: OtaThreadRow): boolean {
  const last = String(row.lastMessage || '').trim();
  if (isTrulyEmptyLastMessage(last) && !lastMeaningfulPreloadedMessage(row) && !row.lastRealMessage) {
    return false;
  }
  if (row.lastRealMessage || row.lastGuestMessage) return true;
  if (last && !isPlaceholderLastMessage(last)) return true;
  if (lastMeaningfulPreloadedMessage(row)) return true;
  if (last && looksLikeHostOutboundMessage(last)) return true;
  if (
    isPlaceholderLastMessage(last) &&
    (row.lastMessageTime || row.messageStatus || (row.unreadCount || 0) > 0)
  ) {
    return true;
  }
  return false;
}

/**
 * Preview liste = dernier Q/R réel (hors plan auto).
 * Les envois programmé ne comptent pas comme R.
 */
/**
 * Faut-il vraiment répondre ? Priorité au dernier Q/R réel (preview),
 * pas au seul `messageStatus` Mongo (souvent resté « received » après une réponse hôte OTA).
 *
 * - ignored / responded (manuel) → non
 * - dernier message = hôte → non
 * - dernier message = voyageur courte politesse (« merci », « ok ») → non (à ignorer)
 * - dernier message = voyageur avec contenu → oui
 * - sinon fallback messageStatus / lastMessageIsIncoming
 */
export function otaThreadNeedsReply(row: OtaThreadRow): boolean {
  const status = String(row.messageStatus || '')
    .toLowerCase()
    .trim();
  if (status === 'ignored' || status === 'responded' || status === 'replied') {
    return false;
  }

  const effective = resolveOtaListLastMessage(row);
  if (!effective.empty && effective.text.trim()) {
    if (effective.isIncoming === false) return false;
    if (looksLikeHostSpokenReply(effective.text)) return false;
    if (effective.isIncoming === true) {
      if (looksLikeGuestCourtesyClose(effective.text)) return false;
      return true;
    }
  }

  if (status === 'received' || status === 'pending') return true;
  if (row.lastMessageIsIncoming === true) {
    const guest = String(row.lastGuestMessage || row.lastMessage || '');
    if (looksLikeGuestCourtesyClose(guest)) return false;
    return true;
  }
  return false;
}

export function resolveOtaListLastMessage(row: OtaThreadRow): {
  text: string;
  isIncoming: boolean | undefined;
  at?: string;
  empty: boolean;
} {
  const apiReal = String(row.lastRealMessage || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    apiReal &&
    !isPlaceholderLastMessage(apiReal) &&
    !isTrulyEmptyLastMessage(apiReal)
  ) {
    return {
      text: apiReal,
      isIncoming: looksLikeHostSpokenReply(apiReal) ? false : row.lastRealMessageIsIncoming,
      at: row.lastRealMessageAt || row.lastMessageTime,
      empty: false,
    };
  }

  const realPre = lastRealNonAutoPreloaded(row);
  if (realPre) {
    return {
      text: realPre.text,
      isIncoming: looksLikeHostSpokenReply(realPre.text) ? false : realPre.isIncoming,
      at: realPre.at || row.lastMessageTime,
      empty: false,
    };
  }

  const apiGuest = String(row.lastGuestMessage || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (
    apiGuest &&
    !isPlaceholderLastMessage(apiGuest) &&
    !isTrulyEmptyLastMessage(apiGuest) &&
    !looksLikeHostOutboundMessage(apiGuest)
  ) {
    return {
      text: apiGuest,
      isIncoming: true,
      at: row.lastGuestMessageAt || row.lastMessageTime,
      empty: false,
    };
  }

  return { text: '', isIncoming: undefined, at: undefined, empty: true };
}

/**
 * Ligne A uniquement si l’envoi programmé est le dernier événement du fil
 * (plus récent que le dernier Q/R réel, ou seul message).
 */
/** Timestamp d'un message préchargé (0 si invalide). */
function preloadedMsgAtMs(msg: Record<string, unknown>): number {
  const t = new Date(
    String(msg.createdAt || msg.date || msg.timestamp || msg.sentAt || ''),
  ).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Plus récent message AUTOMATION sortant parmi les préchargés — insensible à
 * l'ordre de l'API (get-thread renvoie DESC). Fallback quand le champ dénormalisé
 * `lastProgrammedOutbound` manque sur le thread (envois antérieurs à la denorm,
 * ou sans ruMessageId — cas SJ-FKR7WV4W / hanane, 24/07).
 */
function newestAutoOutboundPreloaded(row: OtaThreadRow): {
  sentAt: string;
  preview: string;
} | null {
  const msgs = row.preloadedMessages;
  if (!Array.isArray(msgs) || msgs.length === 0) return null;
  let best: { atMs: number; preview: string } | null = null;
  for (const raw of msgs) {
    const msg = raw as Record<string, unknown>;
    if (!msg || typeof msg !== 'object') continue;
    if (!isAutomationPreloaded(msg)) continue;
    if (Boolean(msg.isIncoming ?? msg.incoming)) continue;
    const atMs = preloadedMsgAtMs(msg);
    if (!atMs) continue;
    if (!best || atMs > best.atMs) {
      best = { atMs, preview: messageTextFromPreloaded(msg) };
    }
  }
  return best ? { sentAt: new Date(best.atMs).toISOString(), preview: best.preview } : null;
}

export function resolveOtaProgrammedAutoLine(row: OtaThreadRow): {
  catalogKey: string;
  sentAt: string;
  preview?: string;
} | null {
  // Candidat 1 : champ dénormalisé (catalogKey précis → libellé propre)
  const prog = row.lastProgrammedOutbound;
  let candidate: { catalogKey: string; sentAtMs: number; preview?: string } | null = null;
  if (prog && prog.status !== 'failed') {
    const sentAt = prog.sentAt ? new Date(prog.sentAt) : null;
    if (sentAt && !Number.isNaN(sentAt.getTime())) {
      const catalogKey = String(prog.catalogKey || '').trim();
      if (catalogKey || prog.preview) {
        candidate = { catalogKey: catalogKey || 'auto', sentAtMs: sentAt.getTime(), preview: prog.preview };
      }
    }
  }
  // Candidat 2 : automation préchargée plus récente (ou seule source si pas de denorm)
  const preloadedAuto = newestAutoOutboundPreloaded(row);
  if (preloadedAuto) {
    const atMs = new Date(preloadedAuto.sentAt).getTime();
    if (!candidate || atMs > candidate.sentAtMs) {
      candidate = { catalogKey: candidate?.catalogKey || 'auto', sentAtMs: atMs, preview: preloadedAuto.preview };
    }
  }
  if (!candidate) return null;

  // Un vrai Q/R plus récent que l'automation → pas de ligne A.
  const realAts = [row.lastRealMessageAt, lastRealNonAutoPreloaded(row)?.at]
    .map((v) => (v ? new Date(v).getTime() : Number.NaN))
    .filter((t) => !Number.isNaN(t));
  if (realAts.some((t) => t > candidate!.sentAtMs)) return null;

  return {
    catalogKey: candidate.catalogKey,
    sentAt: new Date(candidate.sentAtMs).toISOString(),
    preview: candidate.preview,
  };
}
