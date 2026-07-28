/**
 * Helpers planning StayView — matching résa ↔ listing.
 * Grille = listings actifs uniquement (comme calendrier multi).
 * Pas d’injection de listings inactifs / orphelins.
 */

import type { ListingSummary } from '../types/listings.types';
import type { Reservation } from '../types/reservations.types';

export function normalizeMongoId(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') {
    const s = value.trim();
    return s && s !== '[object Object]' ? s : undefined;
  }
  if (typeof value === 'object') {
    const o = value as { _id?: unknown; toString?: () => string };
    if (o._id != null) return normalizeMongoId(o._id);
    if (typeof o.toString === 'function') {
      const s = o.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  const s = String(value);
  return s && s !== '[object Object]' ? s : undefined;
}

export function reservationOwnerId(res: Reservation): string | undefined {
  const anyRes = res as Reservation & {
    ownerId?: unknown;
    owner?: { _id?: unknown; id?: unknown };
  };
  return (
    normalizeMongoId(anyRes.ownerId) ||
    normalizeMongoId(anyRes.owner?._id) ||
    normalizeMongoId(anyRes.owner?.id)
  );
}

/** Toutes les clés listing possibles sur une réservation. */
export function collectReservationListingIds(res: Reservation): string[] {
  const anyRes = res as Reservation & {
    listing?: { _id?: unknown; id?: unknown };
    listingId?: unknown;
  };
  const ids = [
    normalizeMongoId(anyRes.sojoriId),
    normalizeMongoId(anyRes.listingMapId),
    normalizeMongoId(anyRes.listingId),
    normalizeMongoId(anyRes.listing?._id),
    normalizeMongoId(anyRes.listing?.id),
  ].filter(Boolean) as string[];
  return [...new Set(ids)];
}

export function resolveReservationListingId(res: Reservation): string | undefined {
  return collectReservationListingIds(res)[0];
}

/** Index listingId → listing (toutes les variantes d’id connues). */
export function buildListingIdIndex(listings: ListingSummary[]): Map<string, ListingSummary> {
  const map = new Map<string, ListingSummary>();
  for (const listing of listings) {
    const primary = normalizeMongoId(listing.id);
    if (primary) map.set(primary, listing);
    const raw = listing.raw || {};
    for (const key of ['_id', 'id', 'listingId', 'sojoriId'] as const) {
      const alt = normalizeMongoId(raw[key]);
      if (alt) map.set(alt, listing);
    }
  }
  return map;
}

export function findListingForReservation(
  res: Reservation,
  byId: Map<string, ListingSummary>,
): ListingSummary | undefined {
  for (const id of collectReservationListingIds(res)) {
    const hit = byId.get(id);
    if (hit) return hit;
  }
  return undefined;
}

export function reservationListingLabel(res: Reservation): { name: string; city: string } {
  const anyRes = res as Reservation & {
    listing?: { name?: string; city?: string };
    listingName?: string;
  };
  return {
    name: anyRes.listing?.name || anyRes.listingName || 'Listing (inactif / hors grille)',
    city: anyRes.listing?.city || '—',
  };
}

export type OrphanListingSeed = {
  listingId: string;
  listingName: string;
  city: string;
};

/**
 * @deprecated Planning = actifs only — toujours [].
 * Conservé pour compat imports ; ne plus injecter d’inactifs.
 */
export function collectOrphanListingSeedsForOwner(
  _reservations: Reservation[],
  _activeListings: ListingSummary[],
  _ownerKey: string | undefined,
): OrphanListingSeed[] {
  return [];
}

/** Planning : actifs only (ignore les graines orphelines). */
export function mergeActiveAndOrphanListings(
  activeListings: ListingSummary[],
  _orphans: OrphanListingSeed[] = [],
): ListingSummary[] {
  return activeListings;
}
