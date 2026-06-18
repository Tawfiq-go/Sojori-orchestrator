import {
  resolveReservationSourceKind,
  type ReservationSourceInput,
  type ReservationSourceKind,
} from '../reservations/ReservationSourceIcon';
import type { Conversation } from '../../types/messages.types';

export function conversationReservationSourceInput(conv: Conversation): ReservationSourceInput {
  return {
    source: conv.reservation_source ?? null,
    channelName: conv.reservation_channel_name ?? conv.booking_source ?? null,
    byRentals: conv.by_rentals ?? false,
  };
}

/** Kind résa (Airbnb, Booking, Direct…) — même logique que la liste Réservations. */
export function resolveWaBookingSourceKind(conv: Conversation): ReservationSourceKind | null {
  const num = conv.reservation_number || conv.reservation_id;
  if (!num || String(num).trim() === '' || String(num).trim() === 'N/A') return null;
  return resolveReservationSourceKind(conversationReservationSourceInput(conv));
}

export type WaBookingPlatform = 'ab' | 'bk' | 'direct';

/** Plateforme pour filtres Airbnb / Booking (canal messagerie = toujours WhatsApp). */
export function resolveWaBookingPlatform(conv: Conversation): WaBookingPlatform | null {
  const kind = resolveWaBookingSourceKind(conv);
  if (!kind) return null;
  if (kind === 'airbnb') return 'ab';
  if (kind === 'booking') return 'bk';
  if (kind === 'rentals') {
    const raw = [
      conv.reservation_source,
      conv.reservation_channel_name,
      conv.booking_source,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    if (raw.includes('booking')) return 'bk';
  }
  return 'direct';
}
