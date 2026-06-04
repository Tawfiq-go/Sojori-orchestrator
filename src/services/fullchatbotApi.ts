import axios from 'axios';
import { API_BASE_URL } from '../config/backendServer.config';
import { getToken } from '../utils/authUtils';

/** En dev : proxy Vite relatif (évite CORS). Prod : API via srv-admin. */
function resolveFullchatbotBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return '/api/v1/admin/fullchatbot';
  }
  return `${API_BASE_URL}/api/v1/admin/fullchatbot`;
}

const BASE = resolveFullchatbotBase();

function authHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]');
  const devToken = import.meta.env.VITE_DEV_TOKEN;
  if (isLocalhost && devToken) headers['X-Dev-Token'] = String(devToken);
  return { headers };
}

export async function listWhitelist(params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/whitelist`, { ...authHeaders(), params });
  return data;
}

export async function getWhitelistDetail(reservationId: string) {
  const { data } = await axios.get(`${BASE}/whitelist/${encodeURIComponent(reservationId)}`, authHeaders());
  return data;
}

export async function patchWhitelistClaudeModelTier(
  reservationId: string,
  body: { tier?: number; useOwnerDefault?: boolean },
) {
  const { data } = await axios.patch(
    `${BASE}/whitelist/${encodeURIComponent(reservationId)}/claude-model-tier`,
    body,
    authHeaders(),
  );
  return data;
}

/** After PM changes owner Claude tier — push to all whitelist rows for that owner. */
export async function syncOwnerModelToWhitelist(ownerId: string, tier: number) {
  const { data } = await axios.post(
    `${BASE}/whitelist/sync-owner-model/${encodeURIComponent(String(ownerId))}`,
    { tier: Number(tier) },
    authHeaders(),
  );
  return data;
}

export async function listListingSnapshots(params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/listing-snapshots`, { ...authHeaders(), params });
  return data;
}

export async function getListingSnapshot(listingId: string) {
  const { data } = await axios.get(
    `${BASE}/listing-snapshots/${encodeURIComponent(listingId)}`,
    authHeaders(),
  );
  return data;
}

/** POST — sync un listing (projection Config Orch. NEW → Mongo fullchatbot). */
export async function syncListingSnapshot(listingId: string) {
  const { data } = await axios.post(
    `${BASE}/listing-snapshots/${encodeURIComponent(listingId)}/sync`,
    {},
    authHeaders(),
  );
  return data;
}

/** POST — sync tous les listings actifs (backfill). */
export async function syncAllListingSnapshots(options?: { activeOnly?: boolean; limit?: number }) {
  const { data } = await axios.post(`${BASE}/listing-snapshots/sync`, options ?? {}, {
    ...authHeaders(),
    timeout: 300_000,
  });
  return data;
}
