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

/** Liste paginée + tri Mongo (bypass tri limité à la page client). */
export async function searchTasks(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/tasks/search`, { params });
  return data;
}

export type TaskOperationalSummary = {
  open: number;
  unassigned: number;
  overdue: number;
  dueToday: number;
  dueNext7Days: number;
  withoutDate: number;
  actionRequired: number;
  audience: 'STAFF';
  generatedAt: string;
};

export async function getTaskOperationalSummary(
  params: Record<string, unknown> = {},
): Promise<{ success: boolean; data: TaskOperationalSummary }> {
  const { data } = await apiClient.get(`${BASE}/tasks/summary`, { params });
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

/** Refus staff / admin. */
export async function rejectTask(id: string, staffId?: string) {
  const body = staffId ? { staffId } : {};
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/reject`, body);
  return data;
}

/** Clôture staff (doing → done) — staffId obligatoire côté API. */
export async function completeTask(
  id: string,
  staffId: string,
  executionNote?: string,
) {
  const body: Record<string, unknown> = { staffId };
  if (executionNote?.trim()) body.executionNote = executionNote.trim();
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/complete`, body);
  return data;
}

export async function assignTask(id: string, staffId: string | null) {
  const { data } = await apiClient.patch(`${BASE}/tasks/${id}/assign`, { staffId });
  return data;
}

/** Tâches assignées à un staff pour un jour (YYYY-MM-DD optionnel). */
export async function listStaffTasksToday(staffId: string, date?: string) {
  const { data } = await apiClient.get(`${BASE}/staff/${staffId}/tasks/today`, {
    params: date ? { date } : undefined,
  });
  return data;
}

/** Tâches assignées à un staff pour la semaine (lundi–dimanche). */
export async function listStaffTasksWeek(staffId: string, date?: string) {
  const { data } = await apiClient.get(`${BASE}/staff/${staffId}/tasks/week`, {
    params: date ? { date } : undefined,
  });
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

/** Noms staff par ids (présents sur un plan — hors filtre liste). */
export async function lookupStaffByIds(ids: string[]) {
  const cleaned = [...new Set(ids.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 50);
  if (!cleaned.length) return { success: true as const, data: [] as Array<{ _id: string; name?: string }> };
  const { data } = await apiClient.get(`${BASE}/staff/lookup`, {
    params: { ids: cleaned.join(',') },
  });
  return data as {
    success: boolean;
    data?: Array<{ _id: string; name?: string; phone?: string; active?: boolean }>;
    count?: number;
  };
}

export async function createStaff(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/staff`, body);
  return data;
}

export async function addStaffAbsence(
  id: string,
  body: { startDate: string; endDate: string; reason?: string },
) {
  const { data } = await apiClient.post(`${BASE}/staff/${id}/absences`, body);
  return data;
}

export async function removeStaffAbsence(id: string, absenceId: string) {
  const { data } = await apiClient.delete(
    `${BASE}/staff/${id}/absences/${encodeURIComponent(absenceId)}`,
  );
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

export interface StaffPeriodStats {
  staffId: string;
  tasksCompleted: number;
  estimatedMinutes: number;
  lateCount: number;
  costMad: number;
  byType: Record<string, number>;
}

export async function getStaffStats(
  period: 'day' | 'week' | 'month',
  date?: string,
): Promise<StaffPeriodStats[]> {
  const { data } = await apiClient.get(`${BASE}/staff/stats`, {
    params: { period, ...(date ? { date } : {}) },
  });
  return data?.data || [];
}

export interface DayTimelineTask {
  _id: string;
  taskCode: string;
  type: string;
  status: string;
  assignedTo: string;
  scheduledAt?: string;
  dueAt?: string;
  estimatedMinutes: number;
  guestName?: string;
}

/** Tâches de tous les staff de l'owner pour un jour — base de la timeline planning. */
export async function getStaffDayTimeline(date?: string): Promise<DayTimelineTask[]> {
  const { data } = await apiClient.get(`${BASE}/staff/tasks/day`, {
    params: date ? { date } : undefined,
  });
  return data?.data || [];
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

/** Allowlist Resa Proprio (whatsapp_owner_bookers) */
export async function listOwnerBookers(params: Record<string, unknown> = {}) {
  const { data } = await apiClient.get(`${BASE}/owner-bookers`, { params });
  return data;
}

export async function createOwnerBooker(body: Record<string, unknown>) {
  const { data } = await apiClient.post(`${BASE}/owner-bookers`, body);
  return data;
}

export async function updateOwnerBooker(id: string, body: Record<string, unknown>) {
  const { data } = await apiClient.put(`${BASE}/owner-bookers/${id}`, body);
  return data;
}

export async function deleteOwnerBooker(id: string) {
  const { data } = await apiClient.delete(`${BASE}/owner-bookers/${id}`);
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

/** Aperçu texte catalogue (OTA/email) sur la dernière résa du PM — avec / sans taxe. */
export async function previewCatalogMessage(
  ownerId: string,
  body: {
    catalogId: string;
    channel: 'ota' | 'email';
    messageFr?: string;
    signature?: string;
  },
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    reservation: {
      id: string;
      number: string;
      guestName: string;
      listingName: string;
      arrivalDate: string;
      departureDate: string;
      nights: number;
      channelName?: string;
    };
    catalogId: string;
    channel: 'ota' | 'email';
    cityTaxWouldCollect: boolean;
    withTax: string;
    withoutTax: string;
    checkoutInstructionsPreview?: string;
  };
}> {
  const { data } = await apiClient.post(
    `${BASE}/orchestration/${encodeURIComponent(ownerId)}/catalog-message-preview`,
    body,
    { timeout: ORCH_HTTP_TIMEOUT_MS, validateStatus: () => true },
  );
  return data as {
    success: boolean;
    error?: string;
    data?: {
      reservation: {
        id: string;
        number: string;
        guestName: string;
        listingName: string;
        arrivalDate: string;
        departureDate: string;
        nights: number;
        channelName?: string;
      };
      catalogId: string;
      channel: 'ota' | 'email';
      cityTaxWouldCollect: boolean;
      withTax: string;
      withoutTax: string;
      checkoutInstructionsPreview?: string;
    };
  };
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
  alreadyDeferred?: boolean;
  message?: string;
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

/** Relance admin hors planning — WhatsApp ou OTA (nouvelle ligne d'historique sur le plan). */
export async function sendExtraPlanRelance(
  reservationId: string,
  taskId: string,
  channel: 'whatsapp' | 'OTA',
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/relances/extra`,
    { channel },
  );
}

/** Rappel staff admin hors planning — nouvelle ligne d'historique. */
/** Statut du vol d'une course navette, EN DIRECT (bouton ✈️ du plan). */
export async function getTaskFlightStatus(taskId: string): Promise<{
  hasFlight: boolean;
  flightNumber?: string;
  live?: { found: boolean; snapshot?: Record<string, unknown>; reason?: string };
  tracking?: {
    checks?: Array<{ kind: string; plannedAt: string; ranAt?: string; status?: string; delayMinutes?: number | null }>;
    lastStatus?: string;
    lastDelayMinutes?: number | null;
  } | null;
}> {
  const res = await apiClient.get(`${BASE}/plans/tasks/${encodeURIComponent(taskId)}/flight`);
  return (res.data?.data ?? res.data) as never;
}

export async function sendExtraPlanStaffReminder(reservationId: string, taskId: string) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/sequences/${encodeURIComponent(taskId)}/staff-reminders/extra`,
    {},
  );
}

/** Aperçu corps message (WA / email / OTA) — mêmes interpolations que l’envoi. */
export async function previewPlanDispatch(
  reservationId: string,
  opts:
    | { kind: 'message'; messageIndex: number }
    | { kind: 'relance'; taskId: string; relanceIndex: number },
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    label: string;
    messageId?: string;
    bodies: Array<{
      canal: 'whatsapp' | 'email' | 'OTA';
      content: string;
      metaTemplateName?: string;
      templateVariables?: string[];
    }>;
  };
}> {
  const params = new URLSearchParams({ kind: opts.kind });
  if (opts.kind === 'message') {
    params.set('messageIndex', String(opts.messageIndex));
  } else {
    params.set('taskId', opts.taskId);
    params.set('relanceIndex', String(opts.relanceIndex));
  }
  const { data } = await apiClient.get(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/dispatch-preview?${params.toString()}`,
    { validateStatus: () => true },
  );
  return data as {
    success: boolean;
    error?: string;
    data?: {
      label: string;
      messageId?: string;
      bodies: Array<{
        canal: 'whatsapp' | 'email' | 'OTA';
        content: string;
        metaTemplateName?: string;
        templateVariables?: string[];
      }>;
    };
  };
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
  planningOk: boolean;
  onAbsence?: boolean;
  availableForTask?: boolean;
  /** @deprecated retirés assignation v1 — ignorés si présents. */
  load?: number;
  maxTasksPerDay?: number;
  atMaxCapacity?: boolean;
  timeConflict?: boolean;
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

/** Stop relances enregistrement + mode à l'arrivée (accès WhatsApp OK, guest peut encore s'enregistrer). */
export async function deferRegistrationToArrival(
  reservationId: string,
  opts?: { note?: string },
) {
  return postPlanDispatch(
    `${BASE}/plans/${encodeURIComponent(reservationId)}/registration/defer-to-arrival`,
    opts?.note ? { note: opts.note } : {},
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
  page?: number;
  filters?: string;
  search?: string;
  listingIds?: string;
  listingId?: string;
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

export type DayPlanStepRelance = {
  index: number;
  label: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: 'en_attente' | 'en_cours' | 'fait' | 'saute' | 'echec';
  reason?: string;
  /** Saut / report plateforme — afficher « sautée exprès », pas un bug. */
  intentionalSkip?: boolean;
};

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
  /** Statut brut de la tâche (new/confirmed/doing/done…) — distingue « accepté » de « commencé ». */
  taskStatus?: string;
  /** Priorité 3 couleurs dérivée backend — « vert je continue, orange je regarde, rouge j'agis ». */
  priority?: { urgency: 'green' | 'orange' | 'red'; reason?: string; dueAt?: string };
  staffName?: string | null;
  registrationPending?: boolean;
  /** Mode à l'arrivée — affiché, non bloquant, accès WhatsApp OK. */
  registrationAtArrival?: boolean;
  state: 'done' | 'pending' | 'attention';
  /** Dates du séjour (ISO) — arrivée → départ, pour situer la réservation. */
  stayFrom?: string;
  stayTo?: string;
  /** Heure par défaut estimée ('HH:mm' — départ 11:00 / arrivée 15:00) quand hourUnknown. */
  estimatedTime?: string;
  /** Prochaine relance client planifiée (ISO) — quand l'heure n'est pas encore choisie. */
  nextRelanceAt?: string;
  /** État de propreté du bien (source de vérité srv-listing). */
  listingCleanliness?: 'clean' | 'dirty' | 'in_progress';
  listingOccupancy?: 'occupied' | 'vacant';
  /** Historique + planification des relances du choose-task (départ/arrivée). */
  relances?: DayPlanStepRelance[];
  /** TaskId du choose-task — « Fixer une heure » / « Relancer maintenant ». */
  chooseTaskId?: string;
  guestPhone?: string;
  auto: boolean;
  meta?: string;
  /** Accueil staff — points à vérifier. */
  checklist?: Array<{ id: string; label: string; required: boolean; done?: boolean }>;
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
  /** HH:mm mur — afficher tel quel (évite décalage TZ sur ISO). */
  expectedCleaningEndHm?: string;
  /** Heures départ/arrivée non choisies : la marge est estimée sur des défauts. */
  hoursUnknown?: boolean;
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

export async function getDayPlan(date?: string, ownerId?: string | null): Promise<DayPlanResponse> {
  const { data } = await apiClient.get(`${BASE}/plans/day-plan`, {
    params: { ...(date ? { date } : {}), ...(ownerId ? { ownerId } : {}) },
  });
  return data as DayPlanResponse;
}

/** Copilot IA du Cockpit — question libre sur le plan de journée (scopé owner côté backend). */
export async function askDayPlanCopilot(
  question: string,
  date?: string,
  ownerId?: string | null,
): Promise<{ success: boolean; answer?: string; error?: string }> {
  const { data } = await apiClient.post(`${BASE}/plans/copilot`, {
    question,
    ...(date ? { date } : {}),
    ...(ownerId ? { ownerId } : {}),
  });
  return data as { success: boolean; answer?: string; error?: string };
}

export type DayBriefDecision = {
  stepId?: string;
  title: string;
  severity: 'critical' | 'important' | 'info';
  /** 'HH:mm' — dernier moment pour agir. */
  deadline?: string;
  consequence: string;
  recommendation: string;
};

/** Risque résiduel : planifié mais pas encore constaté — le « vert théorique ». */
export type DayBriefRisk = {
  title: string;
  /** 'HH:mm' — heure à partir de laquelle s'inquiéter si le signal n'est pas arrivé. */
  watchAt?: string;
  /** L'événement observable qui mettra ce point au vert réel. */
  signal: string;
};

export type DayBriefResult = {
  success: boolean;
  brief?: string;
  decisions?: DayBriefDecision[];
  risks?: DayBriefRisk[];
  model?: string;
  cached?: boolean;
  error?: string;
};

/** Brief de décision IA — priorisation des décisions du jour (scopé owner côté backend, cache 10 min). */
export async function getDayPlanBrief(
  date?: string,
  ownerId?: string | null,
): Promise<DayBriefResult> {
  const { data } = await apiClient.post(`${BASE}/plans/day-brief`, {
    ...(date ? { date } : {}),
    ...(ownerId ? { ownerId } : {}),
  });
  return data as DayBriefResult;
}

export type DayPlanWeekDay = {
  date: string;
  fragility: DayPlanResponse['fragility'];
  stats: DayPlanResponse['stats'];
};

export async function getDayPlanWeek(
  start?: string,
  days = 7,
  ownerId?: string | null,
): Promise<{ success: boolean; start: string; days: DayPlanWeekDay[] }> {
  const { data } = await apiClient.get(`${BASE}/plans/day-plan-week`, {
    params: { ...(start ? { start } : {}), days, ...(ownerId ? { ownerId } : {}) },
  });
  return data as { success: boolean; start: string; days: DayPlanWeekDay[] };
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
    // forceCreate: PM dashboard crée la Task même si service guest OFF sur le listing
    { reservationId, declared: true, time, forceCreate: true },
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
    // forceCreate: PM dashboard crée la Task même si service guest OFF sur le listing
    { reservationId, declared: true, time, forceCreate: true },
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
  registrationLevel?: 'simple' | 'complete';
  stayMissing?: string[];
  registrationForm?: {
    schema?: unknown;
    origin?: string;
    override?: boolean;
  };
};

export type GuestMemberInput = {
  first_name?: string;
  last_name?: string;
  nationality?: string;
  document_number?: string;
  gender?: string;
  date_of_birth?: string;
  document_type?: string;
  residence_country?: string;
  country?: string;
  email?: string;
  phone?: string;
  document_front_download?: string;
  document_back_download?: string;
  place_of_birth?: string;
  profession?: string;
  domicile?: string;
  city?: string;
  coming_from?: string;
  going_to?: string;
  document_issued_at?: string;
  document_issued_on?: string;
  customAnswers?: Record<string, unknown>;
  stayAnswers?: Record<string, unknown>;
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

export async function saveRegistrationAnswers(
  reservationId: string,
  patch: { stay?: Record<string, unknown>; travelers?: Record<string, Record<string, unknown>> },
) {
  const { data } = await apiClient.patch(`${BASE}/guest-actions/registration-answers`, {
    reservationId,
    ...patch,
  });
  return data as { success?: boolean; error?: string; data?: { state?: RegistrationFlowState } };
}
export async function unregisterGuestMember(reservationId: string, index: number) {
  logResaGuest('api:unregister-guest →', { reservationId, index });
  const { data } = await apiClient.patch(
    `${BASE}/guest-actions/unregister-guest`,
    { reservationId, index },
  );
  logResaGuest('api:unregister-guest ←', {
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

export async function resetGuestRegistrationAttempt(reservationId: string) {
  logResaGuest('api:reset-registration →', { reservationId });
  const { data } = await apiClient.post(`${BASE}/guest-actions/reset-registration`, {
    reservationId,
  });
  logResaGuest('api:reset-registration ←', {
    reservationId,
    success: data?.success,
    error: data?.error,
    state: data?.data?.state,
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
