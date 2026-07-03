import { isAxiosError } from 'axios';
import type {
  GuestContextLike,
  MenuOptionLike,
} from '../features/chatbot/whatsappMenuAvailability';
import { API_BASE_URL } from '../config/backendServer.config';
import apiClient from './apiClient';

/**
 * Whitelist / listing-snapshots : proxy srv-admin (chemins internes /api/whitelist…).
 * Le proxy relaie Authorization + x-refresh-token (srv-admin fullchatbotDashboard).
 */
function resolveFullchatbotBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined' && !import.meta.env.VITE_API_URL) {
    return '/api/v1/admin/fullchatbot';
  }
  return `${API_BASE_URL}/api/v1/admin/fullchatbot`;
}

const BASE = resolveFullchatbotBase();

/** owner_id : forcé côté proxy srv-admin pour les Owner, mais transmis ici pour Admin/SuperAdmin en simulation. */
export async function listWhitelist(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/whitelist`, { params });
  return data;
}

export type WhitelistPageEnrichmentResult = {
  guestContextByReservationId: Record<string, GuestContextLike>;
  menuByListingId: Record<string, { options: MenuOptionLike[]; snapshotMissing: boolean }>;
};

/** 1 appel — guest_context + menus snapshot pour la page visible (évite N× GET detail). */
export async function batchWhitelistPageEnrichment(payload: {
  reservationIds: string[];
  listingIds: string[];
}): Promise<WhitelistPageEnrichmentResult> {
  const { data } = await apiClient.post(`${BASE}/whitelist/page-enrichment`, payload);
  const raw = data?.data ?? {};
  const guestContextByReservationId =
    (raw.guestContextByReservationId as Record<string, GuestContextLike>) ?? {};
  const menuByListingId: WhitelistPageEnrichmentResult['menuByListingId'] = {};
  const menus = (raw.menuByListingId as Record<string, { options?: MenuOptionLike[]; snapshotMissing?: boolean }>) ?? {};
  for (const [listingId, row] of Object.entries(menus)) {
    menuByListingId[listingId] = {
      options: Array.isArray(row?.options) ? row.options : [],
      snapshotMissing: row?.snapshotMissing === true,
    };
  }
  return { guestContextByReservationId, menuByListingId };
}

export async function getWhitelistDetail(
  reservationId: string,
  opts?: { includeConversation?: boolean; includeAiModel?: boolean },
) {
  const params: Record<string, string> = {};
  if (opts?.includeConversation === false) {
    params.includeConversation = 'false';
  }
  if (opts?.includeAiModel === false) {
    params.includeAiModel = 'false';
  }
  const { data } = await apiClient.get(`${BASE}/whitelist/${encodeURIComponent(reservationId)}`, {
    params: Object.keys(params).length ? params : undefined,
  });
  return data;
}

export async function patchWhitelistClaudeModelTier(
  reservationId: string,
  body: { tier?: number; useOwnerDefault?: boolean },
) {
  const { data } = await apiClient.patch(
    `${BASE}/whitelist/${encodeURIComponent(reservationId)}/claude-model-tier`,
    body,
  );
  return data;
}

/** After PM changes owner Claude tier — push to all whitelist rows for that owner. */
export async function syncOwnerModelToWhitelist(ownerId: string, tier: number) {
  const { data } = await apiClient.post(
    `${BASE}/whitelist/sync-owner-model/${encodeURIComponent(String(ownerId))}`,
    { tier: Number(tier) },
  );
  return data;
}

export async function listListingSnapshots(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/listing-snapshots`, {
    params: { compact: 'true', ...params },
  });
  return data;
}

export async function getListingSnapshot(listingId: string) {
  const { data } = await apiClient.get(
    `${BASE}/listing-snapshots/${encodeURIComponent(listingId)}`,
  );
  return data;
}

function extractMenuOptionsFromSnapshot(snap: unknown): MenuOptionLike[] {
  const row = snap as { menu?: { menuOptions?: MenuOptionLike[] } } | null | undefined;
  return Array.isArray(row?.menu?.menuOptions) ? row.menu.menuOptions : [];
}

export type ListingMenuOptionsResult = {
  options: MenuOptionLike[];
  /** Pas de doc dans Mongo fullchatbot `listing_snapshot` — sync via /chatbot/listing */
  snapshotMissing: boolean;
};

/**
 * Menu A→L pour la whitelist : lecture **uniquement** `listing_snapshot` (Mongo srv-fullchatbot).
 * Même collection que le runtime bot — alimentée par sync depuis /chatbot/listing (RabbitMQ update.listing).
 */
export async function getListingMenuOptions(listingId: string): Promise<ListingMenuOptionsResult> {
  try {
    const res = await getListingSnapshot(listingId);
    if (res?.success && res.data != null) {
      return {
        options: extractMenuOptionsFromSnapshot(res.data),
        snapshotMissing: false,
      };
    }
  } catch (err) {
    if (isAxiosError(err) && err.response?.status === 404) {
      return { options: [], snapshotMissing: true };
    }
  }
  return { options: [], snapshotMissing: false };
}

/** POST — sync un listing (projection Config Orch. NEW → Mongo fullchatbot). */
export async function syncListingSnapshot(listingId: string) {
  const { data } = await apiClient.post(
    `${BASE}/listing-snapshots/${encodeURIComponent(listingId)}/sync`,
    {},
  );
  return data;
}

/** POST — sync tous les listings actifs (backfill). */
export async function syncAllListingSnapshots(options?: { activeOnly?: boolean; limit?: number }) {
  const { data } = await apiClient.post(`${BASE}/listing-snapshots/sync`, options ?? {}, {
    timeout: 300_000,
  });
  return data;
}
