import axios from 'axios';
import { API_BASE_URL } from '../config/backendServer.config';
import { getToken } from '../utils/authUtils';
import { guestContextStaySummary, logResaGuest } from '../utils/resaGuestActionDebug';

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

export type OrchestrationConfigLoadMeta = {
  configSource?: 'owner' | 'global_template' | null;
};

export async function getOrchestrationConfig(
  ownerId: string,
  options?: { strictOwner?: boolean },
) {
  const params = options?.strictOwner ? { strictOwner: 'true' } : undefined;
  const { data } = await axios.get(`${BASE}/orchestration/${ownerId}`, {
    ...authHeaders(),
    params,
  });
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
  const res = await axios.post(url, body, {
    ...authHeaders(),
    validateStatus: () => true,
  });
  const data = res.data as PlanDispatchApiResponse | string | undefined;
  if (data && typeof data === 'object' && 'success' in data) {
    return data as PlanDispatchApiResponse;
  }
  const snippet =
    typeof data === 'string'
      ? data.replace(/\s+/g, ' ').trim().slice(0, 200)
      : `HTTP ${res.status}`;
  return {
    success: false,
    error: res.status >= 500 ? `Erreur serveur (${res.status})` : snippet || 'Action refusée',
  };
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
  opts?: { date?: string },
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/escalade/force-slot`,
    { time, ...(opts?.date ? { date: opts.date } : {}) },
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

export type OpsFeedItem = {
  id: string;
  priority: 'p1' | 'p2' | 'p3' | 'ok';
  day: 'today' | 'tomorrow';
  groupKey: string;
  emoji: string;
  title: string;
  listingId: string;
  listingName: string;
  guestName: string;
  reservationId: string;
  reservationCode: string;
  taskId?: string;
  taskType?: string;
  messageIndex?: number;
  problem: string;
  meta: string;
  timeLabel?: string;
  statusBadges: { code: string; label: string }[];
  staffName?: string | null;
  deadlineAt?: string;
  deadlineLabel?: string;
  actions: { kind: string; label: string; primary?: boolean; index?: number }[];
  urgent: boolean;
  urgencyFilter?: string;
};

export type OpsFeedResponse = {
  success: boolean;
  generatedAt: string;
  horizonDays: number;
  stats: {
    critical: number;
    important: number;
    ok: number;
    total: number;
    checkInsToday: number;
    checkOutsToday: number;
    turnoversToday: number;
    checkInsTomorrow: number;
    checkOutsTomorrow: number;
    turnoversTomorrow: number;
  };
  items: OpsFeedItem[];
};

export async function getOpsFeed(days = 2): Promise<OpsFeedResponse> {
  const { data } = await axios.get(`${BASE}/plans/ops-feed`, {
    ...authHeaders(),
    params: { days },
  });
  return data as OpsFeedResponse;
}

export async function chooseGuestArrival(reservationId: string, time: string) {
  logResaGuest('api:choose-arrival →', { reservationId, time });
  const { data } = await axios.patch(
    `${BASE}/guest-actions/choose-arrival`,
    { reservationId, time },
    authHeaders(),
  );
  logResaGuest('api:choose-arrival ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    guestContext: guestContextStaySummary(data?.data),
  });
  return data as { success?: boolean; error?: string; data?: unknown };
}

export async function chooseGuestDeparture(reservationId: string, time: string) {
  logResaGuest('api:choose-departure →', { reservationId, time });
  const { data } = await axios.patch(
    `${BASE}/guest-actions/choose-departure`,
    { reservationId, time },
    authHeaders(),
  );
  logResaGuest('api:choose-departure ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    guestContext: guestContextStaySummary(data?.data),
  });
  return data as { success?: boolean; error?: string; data?: unknown };
}

/** Déclaration — heure entière (HH:00) ou null si non précisée. */
export async function declareGuestArrival(reservationId: string, hour?: number) {
  const time = hour != null ? `${String(hour).padStart(2, '0')}:00` : null;
  logResaGuest('api:declare-arrival →', { reservationId, hour, time });
  const { data } = await axios.patch(
    `${BASE}/guest-actions/declare-arrival`,
    { reservationId, declared: true, time },
    authHeaders(),
  );
  logResaGuest('api:declare-arrival ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    guestContext: guestContextStaySummary(data?.data),
  });
  return data as { success?: boolean; error?: string; data?: unknown };
}

export async function declareGuestDeparture(reservationId: string, hour?: number) {
  const time = hour != null ? `${String(hour).padStart(2, '0')}:00` : null;
  logResaGuest('api:declare-departure →', { reservationId, hour, time });
  const { data } = await axios.patch(
    `${BASE}/guest-actions/declare-departure`,
    { reservationId, declared: true, time },
    authHeaders(),
  );
  logResaGuest('api:declare-departure ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    guestContext: guestContextStaySummary(data?.data),
  });
  return data as { success?: boolean; error?: string; data?: unknown };
}

export type RegistrationFlowState = {
  travelersList: Array<{ id: string; title: string; description: string }>;
  summary: string;
  total: number;
  registered: number;
  complete: boolean;
};

export type GuestMemberInput = {
  first_name?: string;
  last_name?: string;
  nationality?: string;
  document_number?: string;
  gender?: string;
  date_of_birth?: string;
  document_type?: string;
};

export async function getRegistrationFlowState(reservationId: string) {
  logResaGuest('api:registration-state →', { reservationId });
  const { data } = await axios.get(
    `${BASE}/guest-actions/registration/${encodeURIComponent(reservationId)}`,
    authHeaders(),
  );
  logResaGuest('api:registration-state ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    state: data?.data,
  });
  return data as { success?: boolean; error?: string; data?: RegistrationFlowState };
}

export async function registerGuestMember(
  reservationId: string,
  index: number,
  member: GuestMemberInput,
) {
  logResaGuest('api:register-guest →', { reservationId, index, member });
  const { data } = await axios.patch(
    `${BASE}/guest-actions/register-guest`,
    { reservationId, index, member },
    authHeaders(),
  );
  logResaGuest('api:register-guest ←', {
    reservationId,
    index,
    success: data?.success,
    error: data?.error,
    state: data?.data?.state,
    guestContext: guestContextStaySummary(data?.data?.guestContext),
  });
  return data as {
    success?: boolean;
    error?: string;
    data?: { state?: RegistrationFlowState; guestContext?: unknown };
  };
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
