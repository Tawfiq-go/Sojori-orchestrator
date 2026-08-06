import type { Message } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import type { Thread } from '../../types/unifiedInbox.types';
import {
  resolveReservationSourceKind,
  type ReservationSourceInput,
} from '../reservations/ReservationSourceIcon';
import {
  checkInDaysLabel,
  flagFromPhone,
  formatInboxDaySeparator,
  formatReservationCreatedDisplay,
  formatStayDateShort,
  formatThreadWhen,
  formatThreadWhenExact,
  nightsBetween,
  normalizeBookingSource,
  stayStatusLabel,
} from './inboxFormat';
import { otaChannelColor, otaChannelFromName } from './inboxMappers';
import { formatInboxMessageText, inboxMessagePreview } from './formatInboxMessageText';
import { resolveListingName } from './inboxListingName';
import {
  humanizeOwnerPreview,
  isEmptyThreadPreview,
  ownerLabelForPlanCatalog,
} from './waThreadPreview';
import {
  resolveOtaListLastMessage,
  resolveOtaProgrammedAutoLine,
} from './otaExchangePresence';
import { inferOtaOriginalLanguage, normalizeOtaOriginalLanguage } from './otaOriginalLanguage';

export interface OtaThreadRow {
  id: string;
  threadId: string;
  guestName: string;
  guestPhone?: string;
  listingName: string;
  channel: string;
  /** Valeur brute backend (channelName / communicationChannel) */
  channelNameRaw?: string;
  source?: string;
  byRentals?: boolean;
  reservationNumber: string;
  lastMessage: string;
  lastMessageTime?: string;
  threadUpdatedAt?: string;
  threadCreatedAt?: string;
  messageStatus?: string;
  lastMessageIsIncoming?: boolean;
  /** Dernière question voyageur (backend) — preview liste Q. */
  lastGuestMessage?: string;
  lastGuestMessageAt?: string;
  /** Dernier message réel hors automation — Q ou R. */
  lastRealMessage?: string;
  lastRealMessageAt?: string;
  lastRealMessageIsIncoming?: boolean;
  /** Miroir Thread — dernier envoi programmé plan. */
  lastProgrammedOutbound?: {
    ruMessageId?: string;
    catalogKey?: string;
    channel?: string;
    preview?: string;
    sentAt?: string;
    status?: 'sent' | 'failed';
  };
  unreadCount: number;
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: number;
  totalPrice?: number;
  currency?: string;
  status?: string;
  reservationCreatedAt?: string;
  /** Code confirmation OTA (Airbnb HM…, etc.) */
  otaCode?: string;
  preloadedMessages?: any[];
  /** Recherche avancée « mot-clé dans les messages » */
  messageMatchCount?: number;
}

function channelLabelFromSourceKind(kind: ReturnType<typeof resolveReservationSourceKind>): string {
  if (kind === 'airbnb') return 'Airbnb';
  if (kind === 'booking') return 'Booking.com';
  if (kind === 'vrbo') return 'Vrbo';
  return 'OTA';
}

export function otaChannelFromReservation(
  input: ReservationSourceInput,
): 'ab' | 'bk' | 'vrbo' | null {
  const kind = resolveReservationSourceKind(input);
  if (kind === 'airbnb') return 'ab';
  if (kind === 'booking') return 'bk';
  if (kind === 'vrbo') return 'vrbo';
  return null;
}

/** Plateforme OTA (AB/BK) — source résa puis repli sur le libellé canal brut. */
export function resolveOtaPlatformChannel(
  row: Pick<OtaThreadRow, 'source' | 'channelNameRaw' | 'byRentals' | 'channel'>,
): 'ab' | 'bk' | 'vrbo' | null {
  const fromReservation = otaChannelFromReservation({
    source: row.source,
    channelName: row.channelNameRaw,
    byRentals: row.byRentals,
  });
  if (fromReservation) return fromReservation;

  const raw = `${row.channelNameRaw || ''} ${row.channel || ''}`.toLowerCase();
  if (raw.includes('booking') || raw.includes('book.com')) return 'bk';
  if (raw.includes('vrbo') || raw === 'ha') return 'vrbo';
  if (raw.includes('airbnb') || raw === 'ab') return 'ab';
  return null;
}

/** Réservation directe Sojori (hors Airbnb / Booking / Vrbo). */
export function isOtaDirectChannel(
  row: Pick<OtaThreadRow, 'source' | 'channelNameRaw' | 'byRentals' | 'channel'>,
): boolean {
  if (resolveOtaPlatformChannel(row) != null) return false;
  const raw = `${row.channelNameRaw || ''} ${row.channel || ''} ${row.source || ''}`.toLowerCase();
  if (raw.includes('whatsapp')) return false;
  if (
    raw.includes('sojori') ||
    raw.includes('direct') ||
    raw.includes('marketplace') ||
    raw.includes('vente') ||
    raw.includes('dashboard')
  ) {
    return true;
  }
  const kind = resolveReservationSourceKind({
    source: row.source,
    channelName: row.channelNameRaw,
    byRentals: row.byRentals,
  });
  return kind === 'vente' || kind === 'admin';
}

export function isCancelledReservationStatus(status?: string): boolean {
  const s = (status || '').toLowerCase().trim();
  if (!s) return false;
  return (
    s.includes('cancel') ||
    s.includes('annul') || // Annulée / Annulee (libellé FR UI)
    s === 'rejected' ||
    s === 'declined' ||
    s === 'refused' ||
    s === 'othercancellation'
  );
}

export function isCompletedReservationStatus(status?: string): boolean {
  const s = (status || '').toLowerCase();
  if (!s) return false;
  return s === 'completed' || s.includes('complete');
}

/** Résa terminée ou annulée — exclue de Tout / canaux / Non répondu. */
export function isInactiveOtaReservation(status?: string): boolean {
  return isCancelledReservationStatus(status) || isCompletedReservationStatus(status);
}

function isWhatsappOnlyThread(
  row: Pick<OtaThreadRow, 'channelNameRaw' | 'channel' | 'source'>,
): boolean {
  const raw = `${row.channelNameRaw || ''} ${row.channel || ''} ${row.source || ''}`.toLowerCase();
  return raw.includes('whatsapp') && !raw.includes('airbnb') && !raw.includes('booking');
}

function threadActivityMs(row: Pick<OtaThreadRow, 'lastMessageTime' | 'threadUpdatedAt' | 'threadCreatedAt'>): number {
  for (const c of [row.lastMessageTime, row.threadUpdatedAt, row.threadCreatedAt]) {
    if (!c) continue;
    const t = new Date(c).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return 0;
}

/** Completed : garder seulement si dernier message après check-out (fin de séjour). */
function completedHasMessageAfterCheckout(row: OtaThreadRow): boolean {
  if (!isCompletedReservationStatus(row.status)) return true;
  const checkout = row.checkOutDate ? new Date(row.checkOutDate) : null;
  if (!checkout || Number.isNaN(checkout.getTime())) return false;
  checkout.setHours(23, 59, 59, 999);
  // Aligné backend : uniquement lastMessageAt (pas threadUpdatedAt / createdAt)
  if (!row.lastMessageTime) return false;
  const last = new Date(row.lastMessageTime).getTime();
  if (Number.isNaN(last)) return false;
  return last > checkout.getTime();
}

/**
 * Inbox OTA par défaut (Tout) :
 * - réservations actives (en cours / à venir)
 * - + Completed seulement s’il y a un message après la fin de séjour
 * - annulées : toujours exclues
 */
export function filterOtaInboxDefault(rows: OtaThreadRow[]): OtaThreadRow[] {
  return rows.filter((thread) => {
    if (isWhatsappOnlyThread(thread)) return false;
    if (isCancelledReservationStatus(thread.status)) return false;
    if (!isCompletedReservationStatus(thread.status)) return true;
    return completedHasMessageAfterCheckout(thread);
  });
}

/**
 * Non répondu + canaux : actives uniquement (pas les « Parti » sauf recherche globale).
 */
export function filterOtaActiveReservationsOnly(rows: OtaThreadRow[]): OtaThreadRow[] {
  return rows.filter((thread) => {
    if (isWhatsappOnlyThread(thread)) return false;
    return !isInactiveOtaReservation(thread.status);
  });
}

/** Remonte un fil après envoi dashboard + met à jour l’aperçu. */
export function bumpOtaThreadAfterSend(
  rows: OtaThreadRow[],
  threadId: string | number,
  messageText: string,
  fallbackRow?: OtaThreadRow | null,
): OtaThreadRow[] {
  const now = new Date().toISOString();
  const key = String(threadId);
  const idx = rows.findIndex((r) => String(r.threadId) === key);
  const base =
    idx >= 0
      ? rows[idx]
      : fallbackRow && String(fallbackRow.threadId) === key
        ? fallbackRow
        : null;
  if (!base) return rows;

  const updated: OtaThreadRow = {
    ...base,
    lastMessage: messageText.trim().slice(0, 200) || base.lastMessage,
    lastMessageTime: now,
    messageStatus: 'responded',
    lastMessageIsIncoming: false,
    unreadCount: 0,
  };

  const rest = rows.filter((r) => String(r.threadId) !== key);
  const merged = [updated, ...rest];
  merged.sort((a, b) => threadActivityMs(b) - threadActivityMs(a));
  return merged;
}

export function mergeOtaThreadPages(existing: OtaThreadRow[], page: OtaThreadRow[]): OtaThreadRow[] {
  const seen = new Set(existing.map((r) => String(r.threadId)));
  const added = page.filter((r) => !seen.has(String(r.threadId)));
  return [...existing, ...added];
}

/** @deprecated alias */
export function filterOtaThreadsForInbox(rows: OtaThreadRow[]): OtaThreadRow[] {
  return filterOtaInboxDefault(rows);
}

/** Correspondance `?thread=` (RU threadId ou _id Mongo) pour deep links notifications. */
export function findOtaThreadByLinkKey(
  rows: OtaThreadRow[],
  key: string,
): OtaThreadRow | undefined {
  const norm = key.trim();
  if (!norm) return undefined;
  const digits = norm.replace(/\D/g, '');
  return rows.find((r) => {
    if (String(r.threadId) === norm) return true;
    if (String(r.id) === norm) return true;
    if (digits && String(r.threadId).replace(/\D/g, '') === digits) return true;
    return false;
  });
}

/** Construit une ligne inbox depuis GET get-messages-by-thread-id (thread + reservation). */
export function mapOtaThreadDetailToRow(payload: unknown): OtaThreadRow | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;
  if (!p.thread || typeof p.thread !== 'object') return null;
  return mapApiItemToOtaThread(p);
}

export function mapApiItemToOtaThread(item: any): OtaThreadRow {
  const threadData = item.thread || item;
  const reservation = item.reservation || {};
  const guestName = reservation.guestName || threadData.recipientName || 'Guest';
  const reservationNumber =
    reservation.reservationNumber || threadData.reservationId || threadData.reservationNumber || '';
  const channelNameRaw =
    reservation.channelName || threadData.communicationChannel || threadData.channelName;
  const sourceInput: ReservationSourceInput = {
    source: reservation.source,
    channelName: channelNameRaw,
    byRentals: reservation.byRentals,
  };
  const sourceKind = resolveReservationSourceKind(sourceInput);

  return {
    id: threadData._id,
    threadId: threadData.threadId,
    guestName,
    listingName: resolveListingName(reservation, threadData) || '—',
    channel: channelLabelFromSourceKind(sourceKind),
    channelNameRaw,
    source: reservation.source,
    byRentals: reservation.byRentals,
    reservationNumber,
    guestPhone:
      reservation.phone ||
      (Array.isArray(reservation.owner_number) && reservation.owner_number[0]) ||
      threadData.recipientPhone ||
      undefined,
    lastMessage: threadData.preview || threadData.lastMessage || '',
    lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
    threadUpdatedAt: threadData.updatedAt,
    threadCreatedAt: threadData.createdAt,
    messageStatus: threadData.messageStatus,
    lastMessageIsIncoming: threadData.lastMessageIsIncoming,
    lastGuestMessage: threadData.lastGuestMessage || undefined,
    lastGuestMessageAt: threadData.lastGuestMessageAt || undefined,
    lastRealMessage: threadData.lastRealMessage || undefined,
    lastRealMessageAt: threadData.lastRealMessageAt || undefined,
    lastRealMessageIsIncoming: threadData.lastRealMessageIsIncoming,
    lastProgrammedOutbound: threadData.lastProgrammedOutbound || undefined,
    unreadCount: threadData.unreadCount || 0,
    checkInDate: reservation.arrivalDate || reservation.checkInDate,
    checkOutDate: reservation.departureDate || reservation.checkOutDate,
    numberOfGuests: reservation.numberOfGuests,
    totalPrice: reservation.totalPrice,
    currency: reservation.currency || 'EUR',
    status: reservation.status || threadData.status,
    reservationCreatedAt: reservation.createdAt || reservation.reservationDate,
    otaCode: (() => {
      const mappingId =
        reservation.mapping && typeof reservation.mapping === 'object'
          ? String((reservation.mapping as { ReservationID?: string }).ReservationID || '')
          : '';
      return String(reservation.otaCode || mappingId || '').trim() || undefined;
    })(),
    preloadedMessages: item.messages || [],
    messageMatchCount:
      typeof threadData.messageMatchCount === 'number' ? threadData.messageMatchCount : undefined,
  };
}

function otaRowNeedsReply(row: OtaThreadRow): boolean {
  const s = (row.messageStatus || '').toLowerCase();
  if (s === 'received' || s === 'pending') return true;
  if (s === 'responded' || s === 'ignored' || s === 'replied') return false;
  return row.lastMessageIsIncoming === true;
}

/** Q / R réels uniquement (hors plan auto). */
function resolveOtaLastMessageKind(
  effective: { text: string; isIncoming: boolean | undefined; empty: boolean },
): 'Q' | 'R' | undefined {
  if (effective.empty || !effective.text.trim()) return undefined;
  if (effective.isIncoming === false) return 'R';
  return 'Q';
}

export function mapOtaRowToThread(row: OtaThreadRow, taskCount?: number): Thread {
  const ch = resolveOtaPlatformChannel(row) ?? otaChannelFromName(row.channel);
  const checkInBadge = checkInDaysLabel(row.checkInDate);
  const phone = String(row.guestPhone || '').trim() || undefined;
  const effective = resolveOtaListLastMessage(row);
  const rawPreview = inboxMessagePreview(effective.text) || '';
  /** Intent owner en tête — jamais le jargon technique / template ID. */
  const preview = humanizeOwnerPreview(rawPreview) || rawPreview || 'Aucun message';
  const empty = effective.empty || isEmptyThreadPreview(preview) || !rawPreview;
  const lastMessageKind = empty ? undefined : resolveOtaLastMessageKind(effective);
  const autoLine = resolveOtaProgrammedAutoLine(row);
  // Pas de badge A seul : si pas de Q/R → « Aucun message » (comme le panneau fil).
  const programmedAuto =
    !empty && lastMessageKind && autoLine
      ? {
          catalogKey: autoLine.catalogKey,
          // catalogKey 'auto' = fallback messages préchargés (pas de denorm) → libellé depuis le preview
          label:
            autoLine.catalogKey !== 'auto'
              ? ownerLabelForPlanCatalog(autoLine.catalogKey)
              : humanizeOwnerPreview(autoLine.preview || '') || 'Message programmé',
          time: formatThreadWhenExact(autoLine.sentAt),
          sentAt: autoLine.sentAt,
        }
      : undefined;
  const bookingPlatform: 'ab' | 'bk' | 'direct' | null =
    ch === 'ab' || ch === 'bk' ? ch : isOtaDirectChannel(row) ? 'direct' : null;
  return {
    id: row.threadId,
    name: row.guestName,
    phone,
    channel: ch,
    channelColor: otaChannelColor(ch),
    preview: empty ? 'Aucun message' : preview,
    time: empty
      ? ''
      : formatThreadWhenExact(effective.at || row.lastMessageTime || row.threadUpdatedAt),
    lastMessageKind,
    programmedAuto,
    unread: row.unreadCount,
    avatarColor: '',
    listingName: row.listingName,
    reservationNumber: row.reservationNumber,
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    checkInBadge,
    stayBadge: stayStatusLabel(row.checkInDate, row.checkOutDate, 'ota'),
    needsReply: otaRowNeedsReply(row),
    guestsLabel: row.numberOfGuests ? `${row.numberOfGuests} voyageurs` : undefined,
    nightsCount: nightsBetween(row.checkInDate, row.checkOutDate),
    reservationCreatedDisplay: formatReservationCreatedDisplay(row.reservationCreatedAt),
    taskCount,
    messageMatchCount: row.messageMatchCount,
    guestFlag: flagFromPhone(phone),
    bookingPlatform,
    bookingSourceKind:
      ch === 'ab' ? 'airbnb' : ch === 'bk' ? 'booking' : ch === 'vrbo' ? 'vrbo' : undefined,
  };
}

export function mapOtaRowToReservation(row: OtaThreadRow): InboxReservationData {
  const kind = resolveReservationSourceKind({
    source: row.source,
    channelName: row.channelNameRaw,
    byRentals: row.byRentals,
  });
  const source =
    kind === 'airbnb'
      ? 'Airbnb'
      : kind === 'booking'
        ? 'Booking.com'
        : kind === 'vrbo'
          ? 'Vrbo'
          : normalizeBookingSource(row.channelNameRaw || row.channel);
  // Sans Comments Airbnb sur la row OTA : on n’invente plus 10 %.
  // Commission / net hôte viennent du détail résa (mapReservationToInboxData) quand dispo.
  const total = row.totalPrice;
  const phone = String(row.guestPhone || '').trim() || undefined;
  return {
    reservationNumber: row.reservationNumber,
    listingName: row.listingName,
    bookingSource: source,
    otaPlatform: source,
    guestPhone: phone,
    reservationStatus:
      row.status?.toLowerCase() === 'confirmed'
        ? 'Confirmée'
        : row.status || 'Confirmée',
    checkInDate: row.checkInDate,
    checkOutDate: row.checkOutDate,
    checkInDisplay: formatStayDateShort(row.checkInDate, '16h'),
    checkOutDisplay: formatStayDateShort(row.checkOutDate, '11h'),
    nightsCount: nightsBetween(row.checkInDate, row.checkOutDate),
    guestsLabel: row.numberOfGuests ? `${row.numberOfGuests} voyageurs` : undefined,
    totalPrice: total,
    currency: row.currency,
    netHost: undefined,
    commission: undefined,
    reservationCreatedAt: row.reservationCreatedAt,
    reservationCreatedDisplay: formatReservationCreatedDisplay(row.reservationCreatedAt),
    otaCode: row.otaCode,
  };
}

/** Extrait le tableau messages depuis les réponses API srv-reservations (formes variables). */
export function extractOtaMessagesFromApiResponse(payload: unknown): any[] {
  if (!payload || typeof payload !== 'object') return [];
  const p = payload as Record<string, unknown>;
  if (Array.isArray(p.messages)) return p.messages;
  const data = p.data;
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>).messages)) {
    return (data as Record<string, unknown>).messages as any[];
  }
  return [];
}

/** Fil API vide : efface lastRealMessage / guest fantômes (preview liste ≠ panneau). */
export function clearOtaGhostPreview(row: OtaThreadRow): OtaThreadRow {
  return {
    ...row,
    lastMessage: '',
    lastRealMessage: undefined,
    lastRealMessageAt: undefined,
    lastRealMessageIsIncoming: undefined,
    lastGuestMessage: undefined,
    lastGuestMessageAt: undefined,
    lastProgrammedOutbound: undefined,
    preloadedMessages: [],
    messageMatchCount: 0,
  };
}

/**
 * Thread en tête de liste (preview / lastMessageAt RU) mais 0 message en base → afficher au moins l’aperçu.
 * Uniquement en cas d’erreur réseau — pas si l’API a répondu 0 message.
 */
export function buildOtaPreviewFallbackMessages(row: OtaThreadRow): Message[] {
  const preview = formatInboxMessageText(row.lastMessage);
  if (!preview) return [];
  const ts = row.lastMessageTime;
  const out: Message[] = [];
  if (ts) {
    out.push({
      id: 'day-preview',
      from: 'guest',
      text: formatInboxDaySeparator(ts),
      time: '',
      type: 'day-separator',
    });
  }
  out.push({
    id: 'preview-fallback',
    from: 'guest',
    text: preview,
    time: ts
      ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : '',
    status: undefined,
  });
  return out;
}

function otaMessageTimestampMs(msg: Record<string, unknown>): number {
  const raw = msg.createdAt ?? msg.date ?? msg.CreateDate ?? msg.sentAt;
  const t = new Date(raw as string | number | Date).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Tag court sur les réponses host OTA : WA / AI / AD / OT */
export function otaReplyOriginTag(msg: {
  replyOrigin?: string | null;
  replyMode?: string | null;
  isIncoming?: boolean;
  isAutomation?: boolean;
  body?: string | null;
}): string | null {
  if (msg.isIncoming) return null;
  if (msg.replyMode === 'ai_assisted') return 'AI';
  if (
    msg.replyOrigin === 'automation' ||
    msg.replyMode === 'automation' ||
    msg.isAutomation === true
  ) {
    return null; // rendu en system-note Auto
  }
  switch (msg.replyOrigin) {
    case 'whatsapp_staff':
      return 'WA';
    case 'dashboard':
      return 'AD';
    case 'ota_external':
      return 'OT';
    default:
      break;
  }
  // Anciens messages RU hors Sojori : footer OTA dans le corps
  if (/sent via (booking\.com|airbnb|vrbo)/i.test(String(msg.body || ''))) return 'OT';
  return null;
}

/** Retire le footer OTA redondant (« Sent via Booking.com ») — remplacé par le tag OT. */
export function stripOtaSentViaFooter(text: string): string {
  return String(text || '')
    .replace(/\n*\s*sent via (booking\.com|airbnb|vrbo)\s*\.?$/i, '')
    .trim();
}

/**
 * Traduction exploitable, ou null. Le backend peut renvoyer null, une chaîne vide,
 * ou un placeholder si le modèle a échoué — on ne veut pas d'une bulle vide.
 */
function cleanTranslation(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v || v === '-' || v === 'null' || v === 'undefined') return null;
  return v;
}

/**
 * Côté voyageur vs hôte/équipe.
 * RU Airbnb marque souvent les msgs Cohost avec isIncoming=true — ne PAS
 * s'appuyer seul sur isIncoming, sinon une réponse host apparaît comme guest.
 */
export function isOtaGuestMessageSide(msg: {
  senderType?: string | null;
  isIncoming?: boolean | null;
}): boolean {
  const t = String(msg.senderType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  if (
    t === 'host' ||
    t === 'cohost' ||
    t === 'owner' ||
    t === 'propertymanager' ||
    t === 'manager' ||
    t === 'admin'
  ) {
    return false;
  }
  if (t === 'guest') return true;
  if (!t) return Boolean(msg.isIncoming);
  return false;
}

export function mapOtaApiMessagesToInbox(messages: any[], guestName: string): Message[] {
  // Chrono croissant : ancien en haut, récent en bas (comme WhatsApp).
  const sorted = [...messages].sort((a, b) => {
    const d = otaMessageTimestampMs(a) - otaMessageTimestampMs(b);
    if (d !== 0) return d;
    return Number(a.messageId || a.ID || 0) - Number(b.messageId || b.ID || 0);
  });

  return sorted.flatMap((msg, index) => {
    const out: Message[] = [];
    const ts = msg.createdAt || msg.date;
    const prevTs = sorted[index - 1]?.createdAt || sorted[index - 1]?.date;
    if (index === 0 || new Date(ts).toDateString() !== new Date(prevTs).toDateString()) {
      out.push({
        id: `day-${index}`,
        from: 'guest',
        text: formatInboxDaySeparator(ts),
        time: '',
        type: 'day-separator',
      });
    }
    const rawBody = (msg.body || msg.message || '').trim();
    if (!rawBody) return out;

    const body = stripOtaSentViaFooter(formatInboxMessageText(rawBody));
    if (!body) return out;

    const isAutomationMsg =
      body.startsWith('[Auto]') ||
      msg.replyOrigin === 'automation' ||
      msg.replyMode === 'automation' ||
      msg.isAutomation === true;

    // Courts marqueurs [Auto] → note système ; longs (bienvenue OTA…) → bulle + tag AU
    if (body.startsWith('[Auto]')) {
      out.push({
        id: msg._id || msg.messageId || `sys-${index}`,
        from: 'sojori',
        text: body.replace(/^\[Auto\]\s*/, '⚙ Auto · '),
        time: ts
          ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
          : '',
        type: 'system-note',
      });
      return out;
    }

    const isIncoming = Boolean(msg.isIncoming);
    const isGuestSide = isOtaGuestMessageSide(msg);
    const originTag = isAutomationMsg
      ? 'AU'
      : otaReplyOriginTag({
          replyOrigin: msg.replyOrigin,
          replyMode: msg.replyMode,
          isIncoming,
          isAutomation: msg.isAutomation,
          body: rawBody,
        });
    // Traductions opérateur : messages VOYAGEUR seulement (pas Host/Cohost).
    const translatedFr = isGuestSide ? cleanTranslation(msg.translatedFr) : null;
    const translatedAry = isGuestSide ? cleanTranslation(msg.translatedAry) : null;
    const originalLanguage = isGuestSide
      ? normalizeOtaOriginalLanguage(msg.originalLanguage) ||
        (translatedFr || translatedAry ? inferOtaOriginalLanguage(body) : null)
      : null;

    out.push({
      id: msg._id || msg.messageId || `m-${index}`,
      from: isGuestSide ? 'guest' : 'you',
      text: body,
      time: ts
        ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '',
      status: !isGuestSide ? msg.status : undefined,
      ...(originTag && !isGuestSide ? { tags: [originTag] } : {}),
      ...(translatedFr ? { translatedFr } : {}),
      ...(translatedAry ? { translatedAry } : {}),
      ...(originalLanguage ? { originalLanguage } : {}),
      // `body` reste la source de vérité affichable ; on garde l'original pour le
      // révéler sous la traduction (bouton 🌐).
      ...(translatedFr || translatedAry ? { originalText: body } : {}),
    });
    return out;
  });
}
