import apiClient from './apiClient';
import { API_BASE_URL } from '../config/backendServer.config';
import { guestContextStaySummary, logResaGuest } from '../utils/resaGuestActionDebug';

/** En dev : proxy Vite relatif (évite CORS). Avec VITE_API_URL → API distante via srv-admin. */
function resolveFulltaskBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return '/api/v1/admin/fulltask';
  }
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}

const BASE = resolveFulltaskBase();

export async function listTasks(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/tasks`, { params });
  return data;
}

export async function createTask(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/tasks`, body);
  return data;
}

export async function getTask(id: string) {
  const { data } = await apiClient.get(`${BASE}/tasks/${id}`);
  return data;
}

export async function patchTask(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}`, body);
  return data;
}

export async function patchTaskStatus(id: string, status: string) {
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/status`, { status });
  return data;
}

/** Acceptation staff / admin (pending_partner → confirmed + sync plan). */
export async function acceptTask(id: string, staffId?: string) {
  const body = staffId ? { staffId } : {};
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/accept`, body);
  return data;
}

export async function assignTask(id: string, staffId: string) {
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/assign`, { staffId });
  return data;
}

export async function deleteTask(id: string) {
  const { data } = await apiClient.delete(`${BASE}/tasks/${id}`);
  return data;
}

export async function listStaff(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/staff`, { params });
  return data;
}

export async function createStaff(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/staff`, body);
  return data;
}

export async function updateStaff(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.patch(`${BASE}/staff/${id}`, body);
  return data;
}

export async function deleteStaff(id: string) {
  const { data } = await apiClient.delete(`${BASE}/staff/${id}`);
  return data;
}

export async function listWhatsappAdmins(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/whatsapp-admins`, { params });
  return data;
}

export async function createWhatsappAdmin(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/whatsapp-admins`, body);
  return data;
}

export async function updateWhatsappAdmin(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.patch(`${BASE}/whatsapp-admins/${id}`, body);
  return data;
}

export async function deleteWhatsappAdmin(id: string) {
  const { data } = await apiClient.delete(`${BASE}/whatsapp-admins/${id}`);
  return data;
}

export async function getTaskConfigs(ownerId: string, params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/task-config/${ownerId}`, { params });
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
  const { data } = await apiClient.put(path, body);
  return data;
}

export type OrchestrationConfigLoadMeta = {
  configSource?: 'owner' | 'global_template' | null;
};

const ORCH_HTTP_TIMEOUT_MS = 90_000;

export async function getOrchestrationConfig(
  ownerId: string,
  options?: { strictOwner?: boolean },
) {
  const params = options?.strictOwner ? { strictOwner: 'true' } : undefined;
  const { data } = await apiClient.get(`${BASE}/orchestration/${ownerId}`, { params,
    timeout: ORCH_HTTP_TIMEOUT_MS,
  });
  return data;
}

export async function upsertOrchestrationConfig(ownerId: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${BASE}/orchestration/${ownerId}`, body, { timeout: ORCH_HTTP_TIMEOUT_MS,
  });
  return data;
}

/** Réinjecte 12 workflows + 10 messages catalogue + 4 messages plan (ownerId global). */
export async function seedOrchestrationComplete(force = false) {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/seed-complete`,
    force ? { force: true } : {},
    { params: force ? { force: 'true' } : undefined },
  );
  return data;
}

/** Templates WA staff + workflows.staffReminders uniquement (sans toucher catalogue voyageur). */
export async function seedStaffRemindersOnly(force = false) {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/seed-staff-reminders`,
    force ? { force: true } : {},
    { params: force ? { force: 'true' } : undefined },
  );
  return data;
}

export async function getPlan(reservationId: string) {
  const { data } = await apiClient.get(`${BASE}/plans/${reservationId}`);
  return data;
}

export async function listWhatsAppMessages() {
  const { data } = await apiClient.get(`${BASE}/whatsapp-messages`);
  return data;
}

/** Insère / met à jour les corps templates voyageur depuis le seed srv-fulltask. */
export async function mergeGuestWhatsAppSeeds() {
  const { data } = await apiClient.post(`${BASE}/whatsapp-messages/merge-guest-seeds`, {});
  return data;
}

/** messageCatalog → whatsapp_messages (noms Meta + corps seed). */
export async function syncWhatsAppFromCatalog(ownerId = 'global') {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/sync-whatsapp-from-catalog`,
    { ownerId },
  );
  return data;
}

/** Insère / met à jour les templates staff_reminder_* dans whatsapp_messages. */
export async function mergeStaffWhatsAppSeeds() {
  const { data } = await apiClient.post(`${BASE}/whatsapp-messages/merge-staff-seeds`, {});
  return data;
}

export async function getWhatsAppMessage(slug: string) {
  const { data } = await apiClient.get(`${BASE}/whatsapp-messages/${encodeURIComponent(slug)}`);
  return data;
}

export async function getWhatsAppMessagesConfigStatus() {
  const { data } = await apiClient.get(`${BASE}/whatsapp-messages/config-status`);
  return data;
}

export async function updateWhatsAppMessage(slug: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${BASE}/whatsapp-messages/${slug}`, body);
  return data;
}

export async function submitWhatsAppMessageToMeta(slug: string) {
  const { data } = await apiClient.post(`${BASE}/whatsapp-messages/${slug}/submit-meta`, {});
  return data;
}

export async function syncWhatsAppMessageFromMeta(slug: string) {
  const { data } = await apiClient.post(`${BASE}/whatsapp-messages/${slug}/sync-meta`, {});
  return data;
}

export async function syncAllWhatsAppMessagesFromMeta(account: 'guest' | 'staff' = 'guest') {
  const { data } = await apiClient.post(`${BASE}/whatsapp-messages/sync-all-meta`, { account });
  return data;
}

export async function archivePlan(
  reservationId: string,
  body: { reason?: string } = {},
) {
  const { data } = await apiClient.post(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/archive`,
    body,
  );
  return data;
}

export async function deletePlan(reservationId: string) {
  const { data } = await apiClient.delete(
    `${BASE}/plans/${encodeURIComponent(reservationId)}`,
  );
  return data;
}

/** Tick cron horaire (`processPlanCronTick`) filtré sur une réservation. */
export async function runPlanScheduler(reservationId: string) {
  const { data } = await apiClient.post(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/run-scheduler`,
    {},
  );
  return data;
}

export type PlanDispatchApiResponse = {
  success: boolean;
  error?: string;
  code?: string;
  data?: unknown;
  dispatch?: { stubOnly?: boolean; channel?: string };
};

async function postPlanDispatch(
  url: string,
  body: Record<string, unknown> = {},
): Promise<PlanDispatchApiResponse> {
  const t0 = performance.now();
  console.log('[dispatch-test] POST start', { url, body });
  const res = await apiClient.post(url, body, { validateStatus: () => true,
  });
  const ms = Math.round(performance.now() - t0);
  const data = res.data as PlanDispatchApiResponse | string | undefined;
  if (data && typeof data === 'object' && 'success' in data) {
    console.log('[dispatch-test] POST response', {
      url,
      ms,
      status: res.status,
      success: data.success,
      channel: data.dispatch?.channel,
      error: data.error,
      code: (data as PlanDispatchApiResponse).code,
    });
    return { ...(data as PlanDispatchApiResponse), success: data.success && res.status < 400 };
  }
  const snippet =
    typeof data === 'string'
      ? data.replace(/\s+/g, ' ').trim().slice(0, 200)
      : `HTTP ${res.status}`;
  console.warn('[dispatch-test] POST unexpected', { url, ms, status: res.status, snippet });
  return {
    success: false,
    error: res.status >= 500 ? `Erreur serveur (${res.status})` : snippet || 'Action refusée',
  };
}

export async function sendPlanMessage(
  reservationId: string,
  messageIndex: number,
  opts?: { forceResend?: boolean },
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/messages/${messageIndex}/send`,
    opts?.forceResend ? { forceResend: true } : {},
  );
}

export async function sendPlanRelance(
  reservationId: string,
  taskId: string,
  relanceIndex: number,
  opts?: { forceResend?: boolean },
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/relances/${relanceIndex}/send`,
    opts?.forceResend ? { forceResend: true } : {},
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
  const { data, status } = await apiClient.get(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/assignation/candidates`,
    { validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
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
  const { data, status } = await apiClient.get(`${BASE}/plans`, { params,
    validateStatus: (s) => (s >= 200 && s < 300) || s === 404,
  });
  if (status === 404) {
    return { success: true, data: [] as unknown[] };
  }
  return data;
}

/** Sidebar plans : métadonnées uniquement (pas sequences/messages). */
export type ListPlansSummaryParams = {
  limit?: number;
  filters?: string;
  search?: string;
  listingIds?: string;
  sort?: string;
  includeReservationId?: string;
  ownerId?: string;
  status?: string;
  includeArchived?: boolean;
  includeCancelled?: boolean;
};

export async function listPlansSummary(params: ListPlansSummaryParams = {}) {
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
  const { data } = await apiClient.get(`${BASE}/plans/ops-feed`, { params: { days },
  });
  return data as OpsFeedResponse;
}

export type DayPlanAction = {
  type: 'assign' | 'relance_guest' | 'force_slot' | 'plan' | 'call';
  label: string;
  taskId?: string;
  messageIndex?: number;
  phone?: string;
};

export type DayPlanStep = {
  id: string;
  time: string | null;
  hourUnknown?: boolean;
  kind: 'departure' | 'arrival' | 'cleaning' | 'task' | 'message' | 'relance';
  title: string;
  listingId: string;
  listingName: string;
  guestName?: string;
  reservationId: string;
  reservationCode?: string;
  taskId?: string;
  taskType?: string;
  staffName?: string | null;
  state: 'done' | 'pending' | 'attention';
  auto: boolean;
  meta?: string;
  chainId?: string;
  slackMinutes?: number;
  attention?: {
    reason: string;
    attempted?: string;
    deadline?: string;
    actions: DayPlanAction[];
  };
};

export type DayPlanChain = {
  id: string;
  listingId: string;
  listingName: string;
  departingReservationId: string;
  arrivingReservationId: string;
  departingGuestName?: string;
  arrivingGuestName?: string;
  slackMinutes: number;
  status: 'ok' | 'tight' | 'broken';
  cleaningDurationMinutes: number;
  expectedCleaningEnd: string;
};

export type DayPlanResponse = {
  success: boolean;
  date: string;
  compiledAt: string;
  fragility: { tightChains: number; label: 'calme' | 'normale' | 'tendue'; window?: { from: string; to: string } };
  nextAttentionAt: string | null;
  stats: {
    steps: number;
    done: number;
    attention: number;
    arrivals: number;
    departures: number;
    turnovers: number;
    hourUnknown: number;
  };
  chains: DayPlanChain[];
  steps: DayPlanStep[];
};

export async function getDayPlan(date?: string): Promise<DayPlanResponse> {
  const { data } = await apiClient.get(`${BASE}/plans/day-plan`, { params: date ? { date } : {} });
  return data as DayPlanResponse;
}

export async function chooseGuestArrival(reservationId: string, time: string) {
  logResaGuest('api:choose-arrival →', { reservationId, time });
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/choose-arrival`,
    { reservationId, time },
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
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/choose-departure`,
    { reservationId, time },
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
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/declare-arrival`,
    { reservationId, declared: true, time },
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
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/declare-departure`,
    { reservationId, declared: true, time },
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
  const { data } = await apiClient.get(
    `${BASE}/guest-actions/registration/${encodeURIComponent(reservationId)}`,
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
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/register-guest`,
    { reservationId, index, member },
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
  const { data } = await apiClient.post(
    `${BASE}/config/task-config/copy`,
    { sourceOwnerId, targetOwnerId },
  );
  return data;
}

/**
 * Copie la config Task d'un Owner source vers TOUS les Owners de la plateforme.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 */
export async function copyTaskConfigToAllOwners(sourceOwnerId: string) {
  const { data } = await apiClient.post(
    `${BASE}/config/task-config/copy-to-all`,
    { sourceOwnerId },
  );
  return data;
}

/**
 * Copie la config Orchestration d'un Owner source vers un Owner cible.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 * @param targetOwnerId - ID du Owner cible
 */
export async function copyOrchestrationConfigToOwner(sourceOwnerId: string, targetOwnerId: string) {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/copy`,
    { sourceOwnerId, targetOwnerId },
    { timeout: ORCH_HTTP_TIMEOUT_MS },
  );
  return data;
}

/**
 * Copie la config Orchestration d'un Owner source vers TOUS les Owners de la plateforme.
 * @param sourceOwnerId - ID du Owner source (ORCHESTRATION_ADMIN_OWNER_ID pour templates admin)
 */
export async function copyOrchestrationConfigToAllOwners(sourceOwnerId: string) {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/copy-to-all`,
    { sourceOwnerId },
  );
  return data;
}
