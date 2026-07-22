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
  nightsBetween,
  normalizeBookingSource,
  stayStatusLabel,
} from './inboxFormat';
import { otaChannelColor, otaChannelFromName } from './inboxMappers';
import { formatInboxMessageText, inboxMessagePreview } from './formatInboxMessageText';
import { resolveListingName } from './inboxListingName';

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
  unreadCount: number;
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: number;
  totalPrice?: number;
  currency?: string;
  status?: string;
  reservationCreatedAt?: string;
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
  const s = (status || '').toLowerCase();
  if (!s) return false;
  return (
    s.includes('cancel') ||
    s === 'rejected' ||
    s === 'declined' ||
    s === 'refused'
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

const RECENT_INACTIVE_THREAD_MS = 30 * 24 * 60 * 60 * 1000;

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

/**
 * Inbox OTA par défaut (Tout) :
 * - réservations actives (en cours / à venir)
 * - + séjours terminés/annulés **avec activité message récente** (30 j) pour le suivi post-départ
 */
export function filterOtaInboxDefault(rows: OtaThreadRow[]): OtaThreadRow[] {
  const cutoff = Date.now() - RECENT_INACTIVE_THREAD_MS;
  return rows.filter((thread) => {
    if (isWhatsappOnlyThread(thread)) return false;
    if (!isInactiveOtaReservation(thread.status)) return true;
    return threadActivityMs(thread) >= cutoff;
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
    unreadCount: threadData.unreadCount || 0,
    checkInDate: reservation.arrivalDate || reservation.checkInDate,
    checkOutDate: reservation.departureDate || reservation.checkOutDate,
    numberOfGuests: reservation.numberOfGuests,
    totalPrice: reservation.totalPrice,
    currency: reservation.currency || 'EUR',
    status: reservation.status || threadData.status,
    reservationCreatedAt: reservation.createdAt || reservation.reservationDate,
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

export function mapOtaRowToThread(row: OtaThreadRow, taskCount?: number): Thread {
  const ch = resolveOtaPlatformChannel(row) ?? otaChannelFromName(row.channel);
  const checkInBadge = checkInDaysLabel(row.checkInDate);
  const phone = String(row.guestPhone || '').trim() || undefined;
  return {
    id: row.threadId,
    name: row.guestName,
    phone,
    channel: ch,
    channelColor: otaChannelColor(ch),
    preview: inboxMessagePreview(row.lastMessage) || 'Aucun message',
    time: '',
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
  const total = row.totalPrice;
  const commission = total != null ? Math.round(total * 0.1) : undefined;
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
    netHost: total != null && commission != null ? total - commission : undefined,
    commission,
    reservationCreatedAt: row.reservationCreatedAt,
    reservationCreatedDisplay: formatReservationCreatedDisplay(row.reservationCreatedAt),
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

/**
 * Thread en tête de liste (preview / lastMessageAt RU) mais 0 message en base → afficher au moins l’aperçu.
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

export function mapOtaApiMessagesToInbox(messages: any[], guestName: string): Message[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime(),
  );

  return sorted.flatMap((msg, index) => {
    const out: Message[] = [];
    const ts = msg.createdAt || msg.date;
    if (index === 0 || new Date(ts).toDateString() !== new Date(sorted[index - 1].createdAt || sorted[index - 1].date).toDateString()) {
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

    const body = formatInboxMessageText(rawBody);
    if (!body) return out;

    if (body.startsWith('[Auto]')) {
      out.push({
        id: msg._id || msg.messageId || `sys-${index}`,
        from: 'sojori',
        text: body.replace(/^\[Auto\]\s*/, '⚙ Auto · '),
        time: '',
        type: 'system-note',
      });
      return out;
    }

    const isIncoming = Boolean(msg.isIncoming);
    out.push({
      id: msg._id || msg.messageId || `m-${index}`,
      from: isIncoming ? 'guest' : 'you',
      text: body,
      time: ts
        ? new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '',
      status: !isIncoming ? msg.status : undefined,
    });
    return out;
  });
}
