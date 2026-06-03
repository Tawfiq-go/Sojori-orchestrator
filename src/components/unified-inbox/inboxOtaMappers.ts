import type { Message } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import type { Thread } from '../../types/unifiedInbox.types';
import {
  checkInDaysLabel,
  formatInboxDaySeparator,
  formatReservationCreatedDisplay,
  formatStayDateShort,
  nightsBetween,
  normalizeBookingSource,
  stayStatusLabel,
} from './inboxFormat';
import { otaChannelColor, otaChannelFromName } from './inboxMappers';
import { formatInboxMessageText, inboxMessagePreview } from './formatInboxMessageText';

export interface OtaThreadRow {
  id: string;
  threadId: string;
  guestName: string;
  listingName: string;
  channel: string;
  reservationNumber: string;
  lastMessage: string;
  lastMessageTime?: string;
  unreadCount: number;
  checkInDate?: string;
  checkOutDate?: string;
  numberOfGuests?: number;
  totalPrice?: number;
  currency?: string;
  status?: string;
  reservationCreatedAt?: string;
  preloadedMessages?: any[];
}

function normalizeChannel(raw?: string): string {
  const ch = (raw || '').toLowerCase();
  if (ch.includes('booking')) return 'Booking.com';
  if (ch.includes('airbnb')) return 'Airbnb';
  if (ch.includes('vrbo')) return 'Vrbo';
  if (ch.includes('sojori')) return 'Sojori';
  return raw || 'OTA';
}

/** Filtre statut — aligné legacy OTAMessagesTab.jsx */
export function filterOtaThreadsByStatus(rows: OtaThreadRow[]): OtaThreadRow[] {
  return rows.filter((thread) => {
    const status = thread.status?.toLowerCase();
    if (!status) return true;
    if (status === 'confirmed' || status === 'pending') return true;
    const hasUnread = thread.unreadCount > 0;
    const isRecent =
      thread.lastMessageTime &&
      Date.now() - new Date(thread.lastMessageTime).getTime() < 7 * 86400000;
    if ((status === 'completed' || status.includes('cancel')) && (hasUnread || isRecent)) {
      return true;
    }
    return false;
  });
}

export function mapApiItemToOtaThread(item: any): OtaThreadRow {
  const threadData = item.thread || item;
  const reservation = item.reservation || {};
  const guestName = reservation.guestName || threadData.recipientName || 'Guest';
  const reservationNumber =
    reservation.reservationNumber || threadData.reservationId || threadData.reservationNumber || '';

  return {
    id: threadData._id,
    threadId: threadData.threadId,
    guestName,
    listingName: reservation.listingName || threadData.listingName || 'Listing',
    channel: normalizeChannel(
      threadData.communicationChannel || threadData.channelName || reservation.channelName,
    ),
    reservationNumber,
    lastMessage: threadData.preview || threadData.lastMessage || '',
    lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
    unreadCount: threadData.unreadCount || 0,
    checkInDate: reservation.arrivalDate || reservation.checkInDate,
    checkOutDate: reservation.departureDate || reservation.checkOutDate,
    numberOfGuests: reservation.numberOfGuests,
    totalPrice: reservation.totalPrice,
    currency: reservation.currency || 'EUR',
    status: reservation.status || threadData.status,
    reservationCreatedAt: reservation.createdAt || reservation.reservationDate,
    preloadedMessages: item.messages || [],
  };
}

export function mapOtaRowToThread(row: OtaThreadRow, taskCount?: number): Thread {
  const ch = otaChannelFromName(row.channel);
  const checkInBadge = checkInDaysLabel(row.checkInDate);
  return {
    id: row.threadId,
    name: row.guestName,
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
    guestsLabel: row.numberOfGuests ? `${row.numberOfGuests} voyageurs` : undefined,
    nightsCount: nightsBetween(row.checkInDate, row.checkOutDate),
    reservationCreatedDisplay: formatReservationCreatedDisplay(row.reservationCreatedAt),
    taskCount,
  };
}

export function mapOtaRowToReservation(row: OtaThreadRow): InboxReservationData {
  const source = normalizeBookingSource(row.channel);
  const total = row.totalPrice;
  const commission = total != null ? Math.round(total * 0.1) : undefined;
  return {
    reservationNumber: row.reservationNumber,
    listingName: row.listingName,
    bookingSource: source,
    otaPlatform: source,
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
