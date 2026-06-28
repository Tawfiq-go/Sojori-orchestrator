/**
 * API Équipe & Rôles — port sojori-dashboard features/staff/services/serverApi.task.js + staffSimplified
 */
import apiClient from './apiClient';
import { isAxiosError } from 'axios';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';

const SRV_USER = MICROSERVICE_BASE_URL.SRV_USER;
const SRV_FULLTASK = MICROSERVICE_BASE_URL.SRV_FULLTASK;
const SRV_ADMIN = MICROSERVICE_BASE_URL.SRV_ADMIN;
const CITY = MICROSERVICE_BASE_URL.CITY;
const STAFF_SIMPLIFIED = `${SRV_FULLTASK}/staff-simplified`;

// ─── Staff simplified (srv-task) ───────────────────────────────────────────

export async function getStaffSimplified(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(STAFF_SIMPLIFIED, { params });
  return data;
}

export async function createStaffSimplified(body: Record<string, unknown>) {
  const { data } = await apiClient.post(STAFF_SIMPLIFIED, body);
  return data;
}

export async function updateStaffSimplified(staffCode: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${STAFF_SIMPLIFIED}/${encodeURIComponent(staffCode)}`, body);
  return data;
}

export async function deleteStaffSimplified(staffCode: string) {
  const { data } = await apiClient.delete(`${STAFF_SIMPLIFIED}/${encodeURIComponent(staffCode)}`);
  return data;
}

// ─── Owners (srv-user) ─────────────────────────────────────────────────────

export async function getOwners(params: Record<string, unknown> = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 0),
    limit: String(params.limit ?? 20),
    paged: 'true',
    roles: 'Owner',
    deleted: String(params.deleted ?? false),
    banned: String(params.banned ?? false),
    search_text: String(params.search_text ?? ''),
  });
  const { data } = await apiClient.get(`${SRV_USER}/user/get-account?${q}`);
  return data;
}

/** Tous les owners (pagination) — filtre admin « Propriétaire » */
export async function getOwnersAllPages(params: Record<string, unknown> = {}) {
  const pageSize = 200;
  const maxPages = 500;
  const acc: unknown[] = [];
  for (let page = 0; page < maxPages; page += 1) {
    let res: { data?: unknown[]; total?: number } | null = null;
    try {
      res = (await getOwners({
        page,
        limit: pageSize,
        deleted: false,
        banned: false,
        search_text: params.search_text ?? '',
        ...params,
      })) as { data?: unknown[]; total?: number };
    } catch {
      if (page === 0) return [];
      break;
    }
    const batch = Array.isArray(res?.data) ? res.data : [];
    acc.push(...batch);
    const total = typeof res?.total === 'number' ? res.total : null;
    if (batch.length < pageSize) break;
    if (total != null && acc.length >= total) break;
  }
  return acc;
}

export async function deleteOwner(id: string) {
  const { data } = await apiClient.delete(`${SRV_USER}/user/delete-account/${encodeURIComponent(id)}`);
  return data;
}

/** Création PM (admin) — POST /auth/register ; si channelManager=RU → provision RU auto (srv-user). */
export async function createOwnerAccount(body: Record<string, unknown>) {
  const { role: _r, ...fields } = body;
  const { data } = await apiClient.post(`${SRV_USER}/auth/register`, { ...fields, role: 'Owner' });
  return data as {
    success?: boolean;
    message?: string;
    error?: string;
    data?: { accountId?: string; email?: string; ruOwnerId?: string | null };
  };
}

export async function updateFillCompany(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${SRV_USER}/user/update-fill-company/${encodeURIComponent(id)}`, body);
  return data;
}

// ─── Workers (srv-user) ────────────────────────────────────────────────────

export async function getWorkers(params: Record<string, unknown> = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 0),
    limit: String(params.limit ?? 20),
    paged: 'true',
    roles: 'Worker',
    deleted: String(params.deleted ?? false),
    banned: String(params.banned ?? false),
    search_text: String(params.search_text ?? ''),
    workerTypeOwner: String(params.workerTypeOwner ?? false),
  });
  if (params.ownerId) q.set('ownerId', String(params.ownerId));
  const { data } = await apiClient.get(`${SRV_USER}/user/get-account?${q}`);
  return data;
}

export class AccountInviteConflictError extends Error {
  readonly existingRole?: string;

  constructor(message: string, existingRole?: string) {
    super(message);
    this.name = 'AccountInviteConflictError';
    this.existingRole = existingRole;
  }
}

export function parseAccountInvite409(error: unknown): string | null {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;
  const body = error.response.data as {
    error?: string;
    message?: string;
    existingRole?: string;
  };
  if (body.error === 'owner is required' || body.message === 'owner is required') {
    return 'Propriétaire PM requis — sélectionnez un owner dans le filtre en haut de page.';
  }
  if (body.error === 'owner not exist') {
    return 'Compte Owner introuvable — vérifiez le filtre propriétaire.';
  }
  if (body.error === 'parent account must be owner') {
    return 'Le compte parent doit être un Property Manager (Owner).';
  }
  if (body.error === 'Email already in use') {
    if (body.existingRole === 'Owner') {
      return "Cet email est déjà le compte Owner (PM). Utilisez une autre adresse pour l'accès dashboard équipe.";
    }
    if (body.existingRole === 'Landlord') {
      return 'Cet email est déjà un compte Propriétaire (Finances → Propriétaires). Pas besoin de le recréer ici.';
    }
    if (body.existingRole === 'Worker') {
      return 'Cet email est déjà un worker dashboard — le compte existe déjà.';
    }
    return (
      body.message ||
      'Cet email est déjà enregistré — utilisez une autre adresse ou modifiez le compte existant.'
    );
  }
  return body.error || body.message || 'Conflit (409)';
}

export async function inviteWorker(body: Record<string, unknown>) {
  try {
    const { data } = await apiClient.post(`${SRV_USER}/auth/invite-woker`, body);
    return data;
  } catch (e) {
    if (isAxiosError(e) && e.response?.status === 409) {
      const body = e.response.data as { error?: string; existingRole?: string };
      const msg = parseAccountInvite409(e);
      if (msg) throw new AccountInviteConflictError(msg, body.existingRole);
    }
    throw e;
  }
}

export async function updateWorker(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${SRV_USER}/auth/update-account/${encodeURIComponent(id)}`, body);
  return data;
}

// ─── Groups (srv-user) ─────────────────────────────────────────────────────

export async function getGroups(ownerId?: string) {
  const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  const { data } = await apiClient.get(`${SRV_USER}/group/list-groups${qs}`);
  return data;
}

export async function createGroup(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${SRV_USER}/group/group-created`, body);
  return data;
}

export async function updateGroup(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${SRV_USER}/group/group-update/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteGroup(id: string) {
  const { data } = await apiClient.delete(`${SRV_USER}/group/group-delete/${encodeURIComponent(id)}`);
  return data;
}

// ─── Admin WhatsApp (srv-task) ─────────────────────────────────────────────

export async function getAdminWhatsapp(params: Record<string, unknown> = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 0),
    limit: String(params.limit ?? 25),
    paged: 'true',
    search_text: String(params.search_text ?? ''),
  });
  if (params.owner_id) q.set('owner_id', String(params.owner_id));
  const { data } = await apiClient.get(`${SRV_FULLTASK}/admin-whatsapp/get?${q}`);
  return data;
}

export async function createAdminWhatsapp(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${SRV_FULLTASK}/admin-whatsapp/create`, body);
  return data;
}

export async function updateAdminWhatsapp(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${SRV_FULLTASK}/admin-whatsapp/update/${encodeURIComponent(id)}`, body);
  return data;
}

export async function deleteAdminWhatsapp(id: string) {
  const { data } = await apiClient.delete(`${SRV_FULLTASK}/admin-whatsapp/delete/${encodeURIComponent(id)}`);
  return data;
}

// ─── Référentiels ──────────────────────────────────────────────────────────

export function normalizeCitiesApiResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { cities?: unknown[] }).cities)) {
    return (data as { cities: unknown[] }).cities;
  }
  return [];
}

export async function getCities(params: Record<string, unknown> = {}) {
  const q = new URLSearchParams({
    page: String(params.page ?? 0),
    limit: String(params.limit ?? 200),
    paged: String(params.paged ?? false),
    search_text: String(params.search_text ?? ''),
  });
  const { data } = await apiClient.get(`${CITY}?${q}`);
  return normalizeCitiesApiResponse(data);
}

export async function getNotificationEvent() {
  const { data } = await apiClient.get(`${SRV_FULLTASK}/notification/notification-events`);
  return data;
}
