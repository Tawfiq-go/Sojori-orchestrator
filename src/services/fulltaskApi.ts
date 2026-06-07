import axios from 'axios';
import { API_BASE_URL } from '../config/backendServer.config';
import { getToken } from '../utils/authUtils';

/** En dev : proxy Vite relatif (évite CORS). Avec VITE_API_URL → API distante via srv-admin. */
function resolveFulltaskBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return '/api/v1/admin/fulltask';
  }
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}

const BASE = resolveFulltaskBase();

function authHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const isLocalhost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]');
  const devToken = import.meta.env.VITE_DEV_TOKEN;
  if (isLocalhost && devToken) {
    headers['X-Dev-Token'] = String(devToken);
  }
  return { headers };
}

export async function listTasks(params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/tasks`, { ...authHeaders(), params });
  return data;
}

export async function createTask(body: Record<string, unknown>) {
  const { data } = await axios.post(`${BASE}/tasks`, body, authHeaders());
  return data;
}

export async function getTask(id: string) {
  const { data } = await axios.get(`${BASE}/tasks/${id}`, authHeaders());
  return data;
}

export async function patchTask(id: string, body: Record<string, unknown>) {
  const { data } = await axios.patch(`${BASE}/tasks/${id}`, body, authHeaders());
  return data;
}

export async function patchTaskStatus(id: string, status: string) {
  const { data } = await axios.patch(`${BASE}/tasks/${id}/status`, { status }, authHeaders());
  return data;
}

/** Acceptation staff / admin (pending_partner → confirmed + sync plan). */
export async function acceptTask(id: string, staffId?: string) {
  const body = staffId ? { staffId } : {};
  const { data } = await axios.patch(`${BASE}/tasks/${id}/accept`, body, authHeaders());
  return data;
}

export async function assignTask(id: string, staffId: string) {
  const { data } = await axios.patch(`${BASE}/tasks/${id}/assign`, { staffId }, authHeaders());
  return data;
}

export async function deleteTask(id: string) {
  const { data } = await axios.delete(`${BASE}/tasks/${id}`, authHeaders());
  return data;
}

export async function listStaff(params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/staff`, { ...authHeaders(), params });
  return data;
}

export async function createStaff(body: Record<string, unknown>) {
  const { data } = await axios.post(`${BASE}/staff`, body, authHeaders());
  return data;
}

export async function updateStaff(id: string, body: Record<string, unknown>) {
  const { data } = await axios.patch(`${BASE}/staff/${id}`, body, authHeaders());
  return data;
}

export async function deleteStaff(id: string) {
  const { data } = await axios.delete(`${BASE}/staff/${id}`, authHeaders());
  return data;
}

export async function listWhatsappAdmins(params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/whatsapp-admins`, { ...authHeaders(), params });
  return data;
}

export async function createWhatsappAdmin(body: Record<string, unknown>) {
  const { data } = await axios.post(`${BASE}/whatsapp-admins`, body, authHeaders());
  return data;
}

export async function updateWhatsappAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await axios.patch(`${BASE}/whatsapp-admins/${id}`, body, authHeaders());
  return data;
}

export async function deleteWhatsappAdmin(id: string) {
  const { data } = await axios.delete(`${BASE}/whatsapp-admins/${id}`, authHeaders());
  return data;
}

export async function getTaskConfigs(ownerId: string, params: Record<string, unknown> = {}) {
  const { data } = await axios.get(`${BASE}/task-config/${ownerId}`, { ...authHeaders(), params });
  return data;
}

export async function upsertTaskTypeConfig(
  ownerId: string,
  type: string,
  body: Record<string, unknown>,
  listingId?: string,
) {
  const path = listingId
    ? `${BASE}/task-config/${ownerId}/${listingId}/${type}`
    : `${BASE}/task-config/${ownerId}/${type}`;
  const { data } = await axios.put(path, body, authHeaders());
  return data;
}

export async function getOrchestrationConfig(ownerId: string) {
  const { data } = await axios.get(`${BASE}/orchestration/${ownerId}`, authHeaders());
  return data;
}

export async function upsertOrchestrationConfig(ownerId: string, body: Record<string, unknown>) {
  const { data } = await axios.put(`${BASE}/orchestration/${ownerId}`, body, authHeaders());
  return data;
}

/** Réinjecte 12 workflows + 10 messages catalogue + 4 messages plan (ownerId global). */
export async function seedOrchestrationComplete(force = false) {
  const { data } = await axios.post(
    `${BASE}/orchestration/seed-complete`,
    force ? { force: true } : {},
    { ...authHeaders(), params: force ? { force: 'true' } : undefined },
  );
  return data;
}

/** Templates WA staff + workflows.staffReminders uniquement (sans toucher catalogue voyageur). */
export async function seedStaffRemindersOnly(force = false) {
  const { data } = await axios.post(
    `${BASE}/orchestration/seed-staff-reminders`,
    force ? { force: true } : {},
    { ...authHeaders(), params: force ? { force: 'true' } : undefined },
  );
  return data;
}

export async function getPlan(reservationId: string) {
  const { data } = await axios.get(`${BASE}/plans/${reservationId}`, authHeaders());
  return data;
}

export async function listWhatsAppMessages() {
  const { data } = await axios.get(`${BASE}/whatsapp-messages`, authHeaders());
  return data;
}

/** Insère / met à jour les corps templates voyageur depuis le seed srv-fulltask. */
export async function mergeGuestWhatsAppSeeds() {
  const { data } = await axios.post(`${BASE}/whatsapp-messages/merge-guest-seeds`, {}, authHeaders());
  return data;
}

/** messageCatalog → whatsapp_messages (noms Meta + corps seed). */
export async function syncWhatsAppFromCatalog(ownerId = 'global') {
  const { data } = await axios.post(
    `${BASE}/orchestration/sync-whatsapp-from-catalog`,
    { ownerId },
    authHeaders(),
  );
  return data;
}

/** Insère / met à jour les templates staff_reminder_* dans whatsapp_messages. */
export async function mergeStaffWhatsAppSeeds() {
  const { data } = await axios.post(`${BASE}/whatsapp-messages/merge-staff-seeds`, {}, authHeaders());
  return data;
}

export async function getWhatsAppMessage(slug: string) {
  const { data } = await axios.get(`${BASE}/whatsapp-messages/${encodeURIComponent(slug)}`, authHeaders());
  return data;
}

export async function getWhatsAppMessagesConfigStatus() {
  const { data } = await axios.get(`${BASE}/whatsapp-messages/config-status`, authHeaders());
  return data;
}

export async function updateWhatsAppMessage(slug: string, body: Record<string, unknown>) {
  const { data } = await axios.put(`${BASE}/whatsapp-messages/${slug}`, body, authHeaders());
  return data;
}

export async function submitWhatsAppMessageToMeta(slug: string) {
  const { data } = await axios.post(`${BASE}/whatsapp-messages/${slug}/submit-meta`, {}, authHeaders());
  return data;
}

export async function syncWhatsAppMessageFromMeta(slug: string) {
  const { data } = await axios.post(`${BASE}/whatsapp-messages/${slug}/sync-meta`, {}, authHeaders());
  return data;
}

export async function syncAllWhatsAppMessagesFromMeta(account: 'guest' | 'staff' = 'guest') {
  const { data } = await axios.post(`${BASE}/whatsapp-messages/sync-all-meta`, { account }, authHeaders());
  return data;
}

export async function archivePlan(
  reservationId: string,
  body: { reason?: string } = {},
) {
  const { data } = await axios.post(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/archive`,
    body,
    authHeaders(),
  );
  return data;
}

export async function deletePlan(reservationId: string) {
  const { data } = await axios.delete(
    `${BASE}/plans/${encodeURIComponent(reservationId)}`,
    authHeaders(),
  );
  return data;
}

/** Tick cron horaire (`processPlanCronTick`) filtré sur une réservation. */
export async function runPlanScheduler(reservationId: string) {
  const { data } = await axios.post(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/run-scheduler`,
    {},
    authHeaders(),
  );
  return data;
}

export type PlanDispatchApiResponse = {
  success: boolean;
  error?: string;
  data?: unknown;
  dispatch?: { stubOnly?: boolean; channel?: string };
};

async function postPlanDispatch(
  url: string,
  body: Record<string, unknown> = {},
): Promise<PlanDispatchApiResponse> {
  const { data } = await axios.post(url, body, {
    ...authHeaders(),
    validateStatus: (status) => status >= 200 && status < 500,
  });
  return data as PlanDispatchApiResponse;
}

export async function sendPlanMessage(reservationId: string, messageIndex: number) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/messages/${messageIndex}/send`,
  );
}

export async function sendPlanRelance(
  reservationId: string,
  taskId: string,
  relanceIndex: number,
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/relances/${relanceIndex}/send`,
  );
}

export type AssignationContext = {
  dateLabel: string;
  timeLabel: string;
  endTimeLabel: string;
  dayLabel: string;
};

export type AssignationCandidate = {
  staffId: string;
  name: string;
  phone: string;
  contractType: string;
  load: number;
  maxTasksPerDay: number;
  planningOk: boolean;
  atMaxCapacity: boolean;
  timeConflict?: boolean;
  availableForTask?: boolean;
};

export type AssignationCandidatesResponse = {
  success: boolean;
  data: AssignationCandidate[];
  assignmentContext?: AssignationContext;
  error?: string;
};

export async function listAssignationCandidates(
  reservationId: string,
  taskId: string,
): Promise<AssignationCandidatesResponse> {
  const { data, status } = await axios.get(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/assignation/candidates`,
    {
      ...authHeaders(),
      validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
    },
  );
  if (status === 404) {
    const body = data as AssignationCandidatesResponse;
    if (body?.error) {
      return { success: false, data: body.data ?? [], error: body.error };
    }
    return {
      success: false,
      data: [],
      error: 'Endpoint assignation non déployé — redéployer srv-fulltask',
    };
  }
  return data as AssignationCandidatesResponse;
}

export async function runPlanAssignation(
  reservationId: string,
  taskId: string,
  staffId?: string,
) {
  const body = staffId ? { staffId } : {};
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/assignation/run`,
    body,
  );
}

export async function sendPlanStaffReminder(
  reservationId: string,
  taskId: string,
  reminderIndex: number,
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/staff-reminders/${reminderIndex}/send`,
  );
}

export async function forcePlanGuestSlot(
  reservationId: string,
  taskId: string,
  time: string,
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/escalade/force-slot`,
    { time },
  );
}

export async function listPlans(params: Record<string, unknown> = {}) {
  const { data, status } = await axios.get(`${BASE}/plans`, {
    ...authHeaders(),
    params,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  });
  if (status === 404) {
    return { success: true, data: [] as unknown[] };
  }
  return data;
}

/** Sidebar plans : métadonnées uniquement (pas sequences/messages). */
export async function listPlansSummary(params: Record<string, unknown> = {}) {
  return listPlans({ ...params, summary: 'true' });
}

export async function chooseGuestArrival(reservationId: string, time: string) {
  const { data } = await axios.patch(
    `${BASE}/guest-actions/choose-arrival`,
    { reservationId, time },
    authHeaders(),
  );
  return data as { success?: boolean; error?: string; data?: unknown };
}

export async function chooseGuestDeparture(reservationId: string, time: string) {
  const { data } = await axios.patch(
    `${BASE}/guest-actions/choose-departure`,
    { reservationId, time },
    authHeaders(),
  );
  return data as { success?: boolean; error?: string; data?: unknown };
}

/** Déclaration — heure entière (HH:00) ou null si non précisée. */
export async function declareGuestArrival(reservationId: string, hour?: number) {
  const time = hour != null ? `${String(hour).padStart(2, '0')}:00` : null;
  const { data } = await axios.patch(
    `${BASE}/guest-actions/declare-arrival`,
    { reservationId, declared: true, time },
    authHeaders(),
  );
  return data as { success?: boolean; error?: string; data?: unknown };
}

export async function declareGuestDeparture(reservationId: string, hour?: number) {
  const time = hour != null ? `${String(hour).padStart(2, '0')}:00` : null;
  const { data } = await axios.patch(
    `${BASE}/guest-actions/declare-departure`,
    { reservationId, declared: true, time },
    authHeaders(),
  );
  return data as { success?: boolean; error?: string; data?: unknown };
}

// ========================================
// COPY ADMIN CONFIG TO OWNER(S)
// ========================================

/**
 * Copie la config Task d'un Owner source vers un Owner cible.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 * @param targetOwnerId - ID du Owner cible
 */
export async function copyTaskConfigToOwner(sourceOwnerId: string, targetOwnerId: string) {
  const { data } = await axios.post(
    `${BASE}/config/task-config/copy`,
    { sourceOwnerId, targetOwnerId },
    authHeaders(),
  );
  return data;
}

/**
 * Copie la config Task d'un Owner source vers TOUS les Owners de la plateforme.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 */
export async function copyTaskConfigToAllOwners(sourceOwnerId: string) {
  const { data } = await axios.post(
    `${BASE}/config/task-config/copy-to-all`,
    { sourceOwnerId },
    authHeaders(),
  );
  return data;
}

/**
 * Copie la config Orchestration d'un Owner source vers un Owner cible.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 * @param targetOwnerId - ID du Owner cible
 */
export async function copyOrchestrationConfigToOwner(sourceOwnerId: string, targetOwnerId: string) {
  const { data } = await axios.post(
    `${BASE}/orchestration/copy`,
    { sourceOwnerId, targetOwnerId },
    authHeaders(),
  );
  return data;
}

/**
 * Copie la config Orchestration d'un Owner source vers TOUS les Owners de la plateforme.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 */
export async function copyOrchestrationConfigToAllOwners(sourceOwnerId: string) {
  const { data } = await axios.post(
    `${BASE}/orchestration/copy-to-all`,
    { sourceOwnerId },
    authHeaders(),
  );
  return data;
}
