import type { GuestContextLike, MenuOptionLike } from '../features/chatbot/whatsappMenuAvailability';
import type { ListingSnapshotDetail } from '../features/chatbot/ChatbotWhitelistStayPanels';

const TTL_MS = 5 * 60 * 1000;

type MenuEntry = { items: MenuOptionLike[]; fetchedAt: number };
type CtxEntry = { ctx: GuestContextLike; fetchedAt: number };
type SnapshotEntry = { snapshot: ListingSnapshotDetail; fetchedAt: number };
type DetailShellEntry = { data: Record<string, unknown>; fetchedAt: number };

const menuStore = new Map<string, MenuEntry>();
const ctxStore = new Map<string, CtxEntry>();
const snapshotStore = new Map<string, SnapshotEntry>();
const detailShellStore = new Map<string, DetailShellEntry>();

function isFresh(fetchedAt: number): boolean {
  return Date.now() - fetchedAt <= TTL_MS;
}

export function hasCachedMenuOptions(listingId: string): boolean {
  const hit = menuStore.get(listingId);
  if (!hit || !isFresh(hit.fetchedAt)) {
    if (hit) menuStore.delete(listingId);
    return false;
  }
  return true;
}

export function getCachedMenuOptions(listingId: string): MenuOptionLike[] | null {
  if (!hasCachedMenuOptions(listingId)) return null;
  return menuStore.get(listingId)!.items;
}

export function setCachedMenuOptions(listingId: string, items: MenuOptionLike[]): void {
  menuStore.set(listingId, { items, fetchedAt: Date.now() });
}

export function getCachedGuestContext(reservationId: string): GuestContextLike | null {
  const hit = ctxStore.get(reservationId);
  if (!hit || !isFresh(hit.fetchedAt)) {
    if (hit) ctxStore.delete(reservationId);
    return null;
  }
  return hit.ctx;
}

export function setCachedGuestContext(reservationId: string, ctx: GuestContextLike): void {
  ctxStore.set(reservationId, { ctx, fetchedAt: Date.now() });
}

export function getCachedListingSnapshot(listingId: string): ListingSnapshotDetail | null {
  const hit = snapshotStore.get(listingId);
  if (!hit || !isFresh(hit.fetchedAt)) {
    if (hit) snapshotStore.delete(listingId);
    return null;
  }
  return hit.snapshot;
}

export function setCachedListingSnapshot(listingId: string, snapshot: ListingSnapshotDetail): void {
  snapshotStore.set(listingId, { snapshot, fetchedAt: Date.now() });
}

export function getCachedWhitelistDetailShell(reservationId: string): Record<string, unknown> | null {
  const hit = detailShellStore.get(reservationId);
  if (!hit || !isFresh(hit.fetchedAt)) {
    if (hit) detailShellStore.delete(reservationId);
    return null;
  }
  return hit.data;
}

export function setCachedWhitelistDetailShell(reservationId: string, data: Record<string, unknown>): void {
  detailShellStore.set(reservationId, { data, fetchedAt: Date.now() });
}

/** Préremplit le shell détail depuis une ligne liste (navigation instantanée). */
export function seedWhitelistDetailFromListRow(row: {
  reservationId: string;
  listingId?: string;
  reservationCode?: string;
  guestName?: string;
  phoneOta?: string;
  guestLanguage?: string;
  whatsappSelectedLanguage?: string | null;
  status?: string;
  hasCommunicated?: boolean;
  checkIn?: string;
  checkOut?: Date | string;
  adults?: number;
  createdAt?: string | Date;
}): void {
  const prev = getCachedWhitelistDetailShell(row.reservationId) ?? {};
  const prevWl = (prev.whitelist as Record<string, unknown> | undefined) ?? {};
  const gc = getCachedGuestContext(row.reservationId);
  const snap = row.listingId ? getCachedListingSnapshot(row.listingId) : null;
  setCachedWhitelistDetailShell(row.reservationId, {
    ...prev,
    whitelist: { ...prevWl, ...row },
    guestContext: gc ?? prev.guestContext ?? null,
    listingSnapshot: snap ?? prev.listingSnapshot ?? null,
  });
}

export function invalidateWhitelistEnrichmentCache(): void {
  menuStore.clear();
  ctxStore.clear();
  snapshotStore.clear();
  detailShellStore.clear();
}
