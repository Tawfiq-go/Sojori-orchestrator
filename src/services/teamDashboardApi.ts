/**
 * API Équipe & Rôles — port sojori-dashboard features/staff/services/serverApi.task.js + staffSimplified
 */
import apiClient from './apiClient';
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

export async function deleteOwner(id: string) {
  const { data } = await apiClient.delete(`${SRV_USER}/user/delete-account/${encodeURIComponent(id)}`);
  return data;
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

export async function inviteWorker(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${SRV_USER}/auth/invite-woker`, body);
  return data;
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
