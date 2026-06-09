import { labelForTaskTypeId } from '../features/taskHub/staff-design/fulltaskTaskTypes';
import { defaultStaffReminderMessageId } from '../features/taskHub/staff-design/staffReminderTemplates';
import {
  inferTaskPlannedIso,
  type ReservationDatesLike,
} from './inferTaskPlannedDate';

export const FULLTASK_TO_LEGACY_STATUS: Record<string, string> = {
  waiting_guest: 'CREATED',
  new: 'CREATED',
  pending_partner: 'ASSIGNED',
  confirmed: 'ACCEPTED',
  doing: 'IN_PROGRESS',
  done: 'COMPLETED',
  cancelled: 'CANCELLED_ADMIN',
  rejected: 'CANCELLED_ADMIN',
};

export const LEGACY_TO_FULLTASK_STATUS: Record<string, string> = {
  CREATED: 'new',
  ASSIGNED: 'confirmed',
  ACCEPTED: 'confirmed',
  IN_PROGRESS: 'doing',
  COMPLETED: 'done',
  CANCELLED_ADMIN: 'cancelled',
  CANCELLED_CUSTOMER: 'cancelled',
  ARCHIVED: 'cancelled',
};

export function fullTaskPriorityToEmergency(priority?: string): string {
  if (priority === 'critical') return 'Critical';
  if (priority === 'urgent') return 'Urgent';
  return 'Normal';
}

export interface GuestRegistrationMetaLike {
  nbre_guest_registered?: number;
  nbre_guest_to_register?: number;
  members?: Array<Record<string, unknown>>;
}

export interface ReservationMetaLike extends ReservationDatesLike {
  guestCountry?: string | null;
  channelName?: string | null;
  reservationNumber?: string | null;
  adults?: number;
  checkInTime?: string | number | null;
  checkOutTime?: string | number | null;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
  guestRegistration?: GuestRegistrationMetaLike;
}

function slotIdToTimeLabel(slotId: unknown): string | undefined {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(String(slotId ?? '').trim());
  if (!m) return undefined;
  return `${m[1]}h-${m[2]}h`;
}

function formatPayloadTime(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const s = String(value).trim();
  if (!s) return undefined;
  if (s.includes('T')) {
    const m = s.match(/T(\d{2}):(\d{2})/);
    if (m) return `${m[1]}:${m[2]}`;
  }
  if (s.includes(':')) return s.slice(0, 5);
  const n = Number(s);
  if (Number.isFinite(n) && n >= 0 && n < 24) {
    return `${String(Math.floor(n)).padStart(2, '0')}:00`;
  }
  return s;
}

function mapPayloadHourSource(
  payload: Record<string, unknown>,
): 'default' | 'client' | 'admin' {
  if (payload.selectedByGuest === true) return 'client';
  const s = String(payload.source || 'default').toLowerCase();
  if (s === 'guest' || s === 'whatsapp' || s === 'client') return 'client';
  if (s === 'admin') return 'admin';
  return 'default';
}

const CONCIERGE_TASK_TYPES = new Set(['concierge', 'transport', 'groceries'])

function formatConciergeDateLabel(value: unknown): string {
  if (!value) return ''
  try {
    const d = new Date(String(value))
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  } catch {
    return ''
  }
}

function mapConciergeGroupingKey(payload: Record<string, unknown>): string | undefined {
  const kind = String(payload.conciergeKind ?? '').toLowerCase()
  if (kind === 'transport') return 'TRANSPORT'
  if (kind === 'grocery') return 'GROCERIES'
  if (kind === 'custom') return 'CUSTOM'
  return undefined
}

/** Ligne liste + drawer : service, date, heure, passagers (payload + requestNote). */
function buildConciergeDetailLine(
  payload: Record<string, unknown>,
  requestNote?: unknown,
): string {
  const service = String(payload.serviceName ?? '').trim()
  const route = String(payload.routeLabel ?? '').trim()
  const date =
    formatConciergeDateLabel(payload.scheduledDate) ||
    formatConciergeDateLabel(payload.scheduled_date)
  const time = formatPayloadTime(payload.scheduledTime ?? payload.scheduled_time)
  const people = payload.customPeople ?? payload.passengers
  const peopleLabel =
    people != null && String(people).trim() !== ''
      ? `${people} pers.`
      : ''
  const list = payload.shoppingList ?? payload.shopping_list
  const fromPayload = [service || route, date, time, peopleLabel, list ? String(list).slice(0, 80) : '']
    .filter(Boolean)
    .join(' · ')
  const note = String(requestNote ?? '').trim().replace(/\s+/g, ' ')
  if (!note) return fromPayload
  if (service && !note.toLowerCase().includes(service.toLowerCase())) {
    return `${service} · ${note}`
  }
  return note
}

export function registrationCountsFromPayload(
  payload: Record<string, unknown>,
  reservationAdults?: number,
) {
  const guests = Array.isArray(payload.guests) ? payload.guests : [];
  const total = Math.max(
    0,
    Number(payload.totalToRegister ?? reservationAdults ?? guests.length ?? 0),
  );
  const validated = guests.filter(
    (g) => (g as { done?: boolean }).done === true,
  ).length;
  const draft = guests.filter((g) => {
    const x = g as { done?: boolean; draft?: boolean };
    return x.done !== true && x.draft === true;
  }).length;
  const notRegistered = Math.max(0, total - validated - draft);
  return {
    adults: total || reservationAdults,
    nbreGuestValidated: validated,
    nbreGuestDraft: draft,
    nbreGuestNotRegistered: notRegistered,
  };
}

export function fullTaskToListItem(
  task: Record<string, unknown>,
  staffById: Record<string, Record<string, unknown>> = {},
  listingById: Record<string, string> = {},
  reservationMeta?: ReservationMetaLike,
) {
  const legacyStatus = FULLTASK_TO_LEGACY_STATUS[String(task.status)] || 'CREATED';
  const assignedTo = task.assignedTo ? String(task.assignedTo) : '';
  const staff = assignedTo ? staffById[assignedTo] : null;
  const listingId = task.listingId ? String(task.listingId) : '';
  const startIso = inferTaskPlannedIso(task, reservationMeta);
  const endIso = task.dueAt
    ? new Date(String(task.dueAt)).toISOString()
    : startIso;
  const payload = (task.payload || {}) as Record<string, unknown>;
  const taskType = String(task.type || '');
  const regCounts =
    taskType === 'registration'
      ? registrationCountsFromPayload(payload, reservationMeta?.adults)
      : null;
  const isCleaningType =
    taskType === 'cleaning_free' || taskType === 'cleaning_paid';
  const showsGuestHour =
    taskType === 'arrival_choose' ||
    taskType === 'departure_choose' ||
    taskType === 'arrival_declare' ||
    taskType === 'departure_declare' ||
    isCleaningType;
  const plannedTime = showsGuestHour
      ? formatPayloadTime(
          payload.time ??
            payload.selectedTime ??
            payload.declaredTime ??
            payload.defaultTime,
        ) ?? slotIdToTimeLabel(payload.slotId)
      : undefined;
  const hourSource = showsGuestHour ? mapPayloadHourSource(payload) : undefined;
  const guestHourChosen =
    showsGuestHour &&
    (payload.selectedByGuest === true ||
      String(payload.source || '').toLowerCase() === 'guest');
  const requestedAtRaw = task.requestedAt
    ? String(task.requestedAt)
    : hourSource === 'client'
      ? formatPayloadTime(payload.time ?? payload.requestedTime)
      : formatPayloadTime(payload.requestedTime);
  const reservationDefaultTime =
    taskType === 'arrival_choose' || taskType === 'arrival_declare'
      ? formatPayloadTime(reservationMeta?.checkInTime)
      : taskType === 'departure_choose' || taskType === 'departure_declare'
        ? formatPayloadTime(reservationMeta?.checkOutTime)
        : undefined;
  const scheduledAtRaw = task.scheduledAt
    ? String(task.scheduledAt)
    : formatPayloadTime(payload.scheduledTime ?? payload.defaultTime) ??
      reservationDefaultTime;
  const reservationId = task.reservationId ? String(task.reservationId) : '';
  const reservationNumber =
    reservationMeta?.reservationNumber ||
    (payload.reservationNumber as string) ||
    (payload.reservationCode as string) ||
    (reservationId.length > 8 ? `…${reservationId.slice(-8)}` : reservationId) ||
    undefined;

  const isConciergeType = CONCIERGE_TASK_TYPES.has(taskType)
  const conciergeDetailLine = isConciergeType
    ? buildConciergeDetailLine(payload, task.requestNote)
    : undefined
  const conciergeGroupingKey = isConciergeType ? mapConciergeGroupingKey(payload) : undefined
  const descriptionLine =
    conciergeDetailLine ||
    (task.requestNote ? String(task.requestNote) : '')

  return {
    _id: task._id,
    itemType: 'Task',
    itemNumber: task.taskCode || task._id,
    name: task.taskCode || task._id,
    type: task.type,
    subType: task.type,
    createdAt:
      task.createdAt != null
        ? String(task.createdAt)
        : task.updatedAt != null
          ? String(task.updatedAt)
          : undefined,
    startDate: startIso,
    endDate: endIso,
    taskStatus: legacyStatus,
    status: legacyStatus,
    emergency: fullTaskPriorityToEmergency(task.priority as string),
    source: task.triggeredBy === 'orchestrator' ? 'orchestrator' : 'manual',
    guestName: task.guestName,
    guestPhone: task.guestPhone,
    listingId,
    listingName: listingById[listingId] || (payload.listingName as string) || undefined,
    reservationId,
    reservationNumber,
    reservationCheckIn:
      reservationMeta?.arrivalDate != null
        ? String(reservationMeta.arrivalDate).slice(0, 10)
        : undefined,
    reservationCheckOut:
      reservationMeta?.departureDate != null
        ? String(reservationMeta.departureDate).slice(0, 10)
        : undefined,
    guestCountry: (task.guestCountry as string) ?? reservationMeta?.guestCountry ?? null, // ⚡ Priorité au champ task direct
    channelName: (task.channelName as string) ?? reservationMeta?.channelName ?? null, // ⚡ Priorité au champ task direct
    reservationAdults: reservationMeta?.adults,
    checkInTime: reservationMeta?.checkInTime ?? null,
    checkOutTime: reservationMeta?.checkOutTime ?? null,
    actualArrivalTime: reservationMeta?.actualArrivalTime ?? null,
    actualDepartureTime: reservationMeta?.actualDepartureTime ?? null,
    confirmedCheckInTime: reservationMeta?.confirmedCheckInTime,
    confirmedCheckOutTime: reservationMeta?.confirmedCheckOutTime,
    guestRegistration: reservationMeta?.guestRegistration,
    plannedTime,
    hourSource,
    guestHourChosen,
    requestedAt: requestedAtRaw || null,
    scheduledAt: scheduledAtRaw || null,
    adults: regCounts?.adults,
    nbreGuestValidated: regCounts?.nbreGuestValidated,
    nbreGuestDraft: regCounts?.nbreGuestDraft,
    nbreGuestNotRegistered: regCounts?.nbreGuestNotRegistered,
    ownerId: task.ownerId,
    staffId: staff?._id || task.assignedTo,
    staffCode: staff?._id ? String(staff._id) : undefined,
    staffName: staff?.name || null,
    staffPhone: staff?.phone || null,
    descriptions: descriptionLine ? [{ description: descriptionLine }] : [],
    conciergeDetailLine,
    conciergeGroupingKey,
    supportCategoryLabel:
      taskType === 'support'
        ? String(payload.categoryLabel ?? payload.categoryTitle ?? '').trim() || undefined
        : undefined,
    supportCategoryIcon:
      taskType === 'support' ? String(payload.categoryIcon ?? '').trim() || undefined : undefined,
    comment: task.executionNote ? String(task.executionNote) : '',
    isArchived: false,
    isClientRequest: task.status === 'waiting_guest',
    isClientConfirmed: task.status !== 'waiting_guest',
  };
}

export function apiStaffToDesign(row: Record<string, unknown>) {
  const schedule = Array.isArray(row.schedule) ? row.schedule : [];
  const daysOfWeek = [...new Set(schedule.map((s: { dayOfWeek: number }) => s.dayOfWeek))];
  const timeWindows = schedule.map((s: { start: string; end: string }) => ({
    start: s.start,
    end: s.end,
  }));
  const rates: Record<string, number> = {};
  (row.pricing as { taskType: string; amount: number }[] | undefined)?.forEach((p) => {
    rates[p.taskType] = p.amount;
  });

  return {
    _id: String(row._id),
    fullName: String(row.name),
    phoneE164: String(row.phone),
    whatsappE164: String(row.phone),
    ownerId: row.ownerId ? String(row.ownerId) : undefined,
    status: 'active' as const,
    isAdmin: Boolean(row.isAdmin),
    contractType: row.contractType === 'salaried' ? ('employee' as const) : ('freelance' as const),
    rates,
    allowedTaskTypes: (row.taskTypes as string[]) || [],
    allowedListingIds: ((row.listingIds as unknown[]) || []).map(String),
    maxTasksPerDay: row.maxTasksPerDay as number | undefined,
    schedule: { daysOfWeek, timeWindows },
    lang: (['fr', 'en', 'ar'].includes(String(row.lang)) ? row.lang : 'fr') as 'fr' | 'en' | 'ar',
    notes: '',
  };
}

export function designStaffToApi(
  staff: Record<string, unknown>,
  opts?: { isCreate?: boolean; ownerId?: string },
) {
  const sched = staff.schedule as { daysOfWeek?: number[]; timeWindows?: { start: string; end: string }[] };
  const schedule: { dayOfWeek: number; start: string; end: string }[] = [];
  const days = Array.isArray(sched?.daysOfWeek)
    ? sched.daysOfWeek
    : opts?.isCreate
      ? [0, 1, 2, 3, 4]
      : [];
  const windows = sched?.timeWindows?.length
    ? sched.timeWindows
    : opts?.isCreate
      ? [{ start: '09:00', end: '18:00' }]
      : [];
  days.forEach((dayOfWeek) => {
    windows.forEach((w) => schedule.push({ dayOfWeek, start: w.start, end: w.end }));
  });

  const pricing: { taskType: string; amount: number }[] = [];
  if (staff.contractType === 'freelance' && staff.rates) {
    Object.entries(staff.rates as Record<string, number>).forEach(([taskType, amount]) => {
      if (amount != null) pricing.push({ taskType, amount: Number(amount) });
    });
  }

  return {
    name: staff.fullName,
    phone: staff.whatsappE164 || staff.phoneE164,
    ownerId: opts?.ownerId || staff.ownerId || null,
    lang: staff.lang || 'fr',
    contractType: staff.contractType === 'employee' ? 'salaried' : 'freelance',
    taskTypes: staff.allowedTaskTypes || [],
    listingIds: staff.allowedListingIds || [],
    schedule,
    maxTasksPerDay: staff.maxTasksPerDay ?? 8,
    isAdmin: Boolean(staff.isAdmin),
    pricing,
  };
}

function normDeliveryChannel(v: unknown): 'whatsapp' | 'email' | 'ota' {
  const s = String(v || '').toLowerCase();
  if (s === 'whatsapp') return 'whatsapp';
  if (s === 'ota') return 'ota';
  return 'email';
}

function deliveryChannelToApi(ch: 'whatsapp' | 'email' | 'ota'): 'whatsapp' | 'OTA' | 'email' {
  if (ch === 'ota') return 'OTA';
  if (ch === 'whatsapp') return 'whatsapp';
  return 'email';
}

/** Types avec escalade admin par défaut (aligné defaultSeeds). */
const ESCALATION_ENABLED_BY_DEFAULT = new Set([
  'arrival_choose',
  'departure_choose',
  'checkout_cleaning',
  'support',
])

/** Aligné srv-fulltask messageCatalogSeed — relances client par type de tâche. */
export const RELANCE_MESSAGE_BY_TASK_TYPE: Record<string, string> = {
  arrival_choose: 'msg_relance_arrival_choose',
  departure_choose: 'msg_relance_departure_choose',
  arrival_declare: 'msg_relance_arrival_declare',
  departure_declare: 'msg_relance_departure_declare',
  registration: 'msg_relance_registration',
  cleaning_free: 'msg_relance_cleaning',
  cleaning_paid: 'msg_relance_cleaning',
};

function slugCatalogId(name: string, template?: string): string {
  const t = String(template || '').trim();
  if (t) return t;
  return String(name || 'msg')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'msg';
}

export function apiOrchestrationToDesign(doc: Record<string, unknown> | null) {
  if (!doc) return { workflows: [], catalog: [], scheduledRules: [], listOrder: [] as string[] };
  const workflows = ((doc.workflows as Record<string, unknown>[]) || []).map((w, i) => {
    const taskTypeId = String(w.type || '');
    return {
    _id: taskTypeId,
    taskTypeId,
    kind: taskTypeId,
    label: labelForTaskTypeId(taskTypeId),
    description: `${taskTypeId} · plan orchestration`,
    enabled: w.enabled !== false,
    escalationEnabled:
      w.escalationEnabled === undefined
        ? ESCALATION_ENABLED_BY_DEFAULT.has(taskTypeId)
        : w.escalationEnabled !== false,
    triggerTaskType: taskTypeId,
    relances: ((w.reminders as Record<string, unknown>[]) || []).map((r, j) => {
      const hours = r.hours as number | undefined;
      const useHours = hours !== undefined && hours !== null;
      const ch = r.channel as { primary?: string; fallback?: string };
      const deliveryChannel = normDeliveryChannel(ch?.primary ?? 'whatsapp');
      return {
      id: `rel-${i}-${j}`,
      channel: (deliveryChannel === 'whatsapp' ? 'whatsapp' : deliveryChannel === 'email' ? 'email' : 'sms') as const,
      deliveryChannel,
      reference: mapRefFromApi(String(r.ref || 'checkin')) as 'check_in',
      delay: {
        value: useHours ? Number(hours) : Number(r.day ?? 0),
        unit: useHours ? ('hours' as const) : ('days' as const),
      },
      time: String(r.time || '09:00'),
      catalogMessageId: String(
        (r as { messageId?: string }).messageId ||
          (r as { template?: string }).template ||
          RELANCE_MESSAGE_BY_TASK_TYPE[taskTypeId] ||
          '',
      ),
      template: String((r as { template?: string }).template || ''),
      enabled: true,
    };
    }),
    staffReminders: ((w.staffReminders as Record<string, unknown>[]) || []).map((sr, j) => {
      const hours = sr.hours as number | undefined;
      const useHours = hours != null && hours !== 0;
      const taskTypeId = String(w.type || '');
      return {
        id: `staff-${i}-${j}`,
        label: String(sr.label || `Rappel ${j + 1}`),
        reference: mapRefFromApi(String(sr.ref || 'scheduledDate')) as 'check_in',
        delay: {
          value: useHours ? Number(hours) : Number(sr.day ?? 0),
          unit: useHours ? ('hours' as const) : ('days' as const),
        },
        time: String(sr.time || '09:00'),
        enabled: true,
        staffTemplateId: String(
          (sr as { messageId?: string }).messageId ||
            defaultStaffReminderMessageId(taskTypeId),
        ),
      };
    }),
    assignment: w.staffAssignment
      ? (() => {
          const sa = w.staffAssignment as {
            startAt?: { ref?: string; day?: number; time?: string; hours?: number }
            endAt?: { ref?: string; day?: number; time?: string; hours?: number }
          }
          const startAt = sa.startAt ?? { ref: 'checkin', day: -7, time: '09:00' }
          const endAt =
            sa.endAt ??
            ({ ref: startAt.ref, day: (w.deadline as { day?: number })?.day ?? 0, time: '23:00' } as const)
          return {
          reference: mapRefFromApi(String(startAt.ref || 'checkin')) as 'check_in',
          windowStart: assignmentWindowFromAt(startAt),
          windowEnd: assignmentWindowFromAt(endAt),
          autoAssign: (w.staffAssignment as { autoAssign?: boolean }).autoAssign === true,
          assignmentHoursMode:
            ((w.staffAssignment as { assignmentHoursMode?: string }).assignmentHoursMode as
              | 'planning'
              | 'always') || 'planning',
          findAnotherStaff: (() => {
            const sa = w.staffAssignment as {
              autoAssign?: boolean
              findAnotherStaff?: boolean
            }
            if (sa.autoAssign === true) return false
            return sa.findAnotherStaff !== false
          })(),
          releaseMode:
            ((w.staffAssignment as { releaseMode?: string }).releaseMode as
              | 'tolerance'
              | 'windows') || 'tolerance',
          acceptToleranceHours:
            Number((w.staffAssignment as { acceptToleranceHours?: number }).acceptToleranceHours) ||
            3,
          attemptWindows:
            ((w.staffAssignment as { releaseWindows?: string[] }).releaseWindows?.length
              ? (w.staffAssignment as { releaseWindows: string[] }).releaseWindows
              : ['11:00', '16:00']) ?? [],
        }
        })()
      : null,
    deadline: (() => {
      const dl = w.deadline as {
        ref?: string
        day?: number
        time?: string
        hours?: number
      } | null
      if (!dl) {
        return {
          reference: 'check_out' as const,
          delay: { value: 0, unit: 'days' as const },
          time: '14:00',
          hardLockAfter: false,
          notifyPM: false,
        }
      }
      const hasDay = dl.day !== undefined && dl.day !== null
      const hasHours = dl.hours !== undefined && dl.hours !== null
      const useHours = hasHours && !hasDay
      return {
        reference: mapRefFromApi(String(dl.ref || 'check_out')) as 'check_out',
        delay: {
          value: useHours ? Number(dl.hours) : Number(dl.day ?? 0),
          unit: useHours ? ('hours' as const) : ('days' as const),
        },
        time: String(dl.time || '14:00'),
        hardLockAfter: false,
        notifyPM: true,
      }
    })(),
  };
  });

  const rawCatalog = (doc.messageCatalog as Record<string, unknown>[]) || [];
  const rawScheduled = (doc.scheduledMessages as Record<string, unknown>[]) || [];

  let catalog = rawCatalog.map((c) => ({
    id: String(c.id || ''),
    label: String(c.label || ''),
    whatsappTemplateId: String(c.whatsappTemplateId || c.id || ''),
    flowCategory: c.flowCategory ? String(c.flowCategory) : undefined,
    messageFrOta: String(c.messageFrOta || ''),
    messageFrEmail: String(c.messageFrEmail || ''),
  }));

  const scheduledRules = rawScheduled.map((m, i) => {
    const trigger = m.trigger as { ref?: string; day?: number; time?: string; hours?: number };
    const ch = m.channel as { primary?: string; fallback?: string };
    const useHours = trigger?.hours != null && trigger.hours !== 0;
    const legacyName = String(m.name || m.label || '');
    const messageId = String(m.messageId || m.template || slugCatalogId(legacyName, String(m.template || '')));
    const schedId = messageId || `sched-${i}`;
    return {
      _id: schedId,
      label: String(m.label || legacyName || ''),
      enabled: m.enabled !== false,
      catalogMessageId: messageId,
      trigger: {
        reference: mapRefFromApi(String(trigger?.ref || 'check_in')) as 'check_in',
        delay: {
          value: useHours ? (trigger?.hours ?? 0) : (trigger?.day ?? 0),
          unit: useHours ? ('hours' as const) : ('days' as const),
        },
        time: trigger?.time || '10:00',
      },
      deliveryChannel: normDeliveryChannel(
        ch?.primary ?? (m as { deliveryChannel?: string }).deliveryChannel,
      ),
    };
  });

  if (catalog.length === 0 && rawScheduled.some((m) => m.template || m.messageFr)) {
    const seen = new Set<string>();
    for (const m of rawScheduled) {
      const legacyName = String(m.name || m.label || '');
      const id = slugCatalogId(legacyName, String(m.template || ''));
      if (seen.has(id)) continue;
      seen.add(id);
      const ch = m.channel as { primary?: string };
      const primary = String(ch?.primary || '').toLowerCase();
      catalog.push({
        id,
        label: legacyName || id,
        whatsappTemplateId: String(m.template || id),
        messageFrOta: primary === 'ota' ? String(m.messageFr || '') : '',
        messageFrEmail: primary === 'email' ? String(m.messageFr || '') : String(m.messageFr || ''),
      });
    }
  }

  const listOrder = Array.isArray(doc.uiPlanListOrder)
    ? (doc.uiPlanListOrder as string[]).filter((k) => typeof k === 'string' && k.length > 0)
    : [];

  return { workflows, catalog, scheduledRules, listOrder };
}

/** Refs UI orchestration → refs stockées srv-fulltask (seeds / cron) */
const REF_TO_API: Record<string, string> = {
  reservation_date: 'booking_created',
  check_in: 'checkin',
  check_out: 'checkout',
  task_created: 'task_created',
  previous_step_done: 'scheduledDate',
};

const API_TO_REF: Record<string, string> = {
  booking_created: 'reservation_date',
  checkin: 'check_in',
  checkout: 'check_out',
  task_created: 'task_created',
  scheduledDate: 'previous_step_done',
};

function mapRefToApi(ref: string | undefined): string {
  if (!ref) return 'checkin';
  return REF_TO_API[ref] || ref;
}

function mapRefFromApi(ref: string | undefined): string {
  if (!ref) return 'check_in';
  return API_TO_REF[ref] || ref;
}

function assignmentWindowFromAt(at: {
  ref?: string
  day?: number
  time?: string
  hours?: number
}): { value: number; unit: 'days' | 'hours'; time: string } {
  const hasDay = at.day !== undefined && at.day !== null
  const hasHours = at.hours !== undefined && at.hours !== null
  const useHours = hasHours && !hasDay
  return {
    value: useHours ? Number(at.hours) : Number(at.day ?? 0),
    unit: useHours ? 'hours' : 'days',
    time: String(at.time || '09:00'),
  }
}

function assignmentAtToApi(
  reference: string,
  win: { value?: number; unit?: string; time?: string },
  defaultTime: string,
): { ref: string; day?: number; time?: string; hours?: number } {
  const ref = mapRefToApi(reference)
  if (win.unit === 'hours') {
    return { ref, hours: win.value ?? 0 }
  }
  return {
    ref,
    day: win.value ?? 0,
    time: win.time || defaultTime,
  }
}

/** Un plan orchestration API → carte UI (même format que Orchestration config). */
export function apiOrchestrationWorkflowToDesign(
  workflow: Record<string, unknown> | null | undefined,
  taskTypeId: string,
) {
  if (!workflow) return null;
  const mapped = apiOrchestrationToDesign({
    workflows: [{ ...workflow, type: workflow.type || taskTypeId }],
    scheduledMessages: [],
  });
  return mapped.workflows[0] ?? null;
}

/** Carte UI → sous-document orchestration TaskTypeConfig. */
export function designWorkflowToApi(workflow: Record<string, unknown>) {
  const body = designOrchestrationToApi([workflow], [], []);
  return body.workflows[0] ?? null;
}

export function orchestrationSummary(workflow: Record<string, unknown> | null | undefined): string {
  if (!workflow) return 'Aucun plan';
  const reminders = (workflow.reminders as unknown[])?.length ?? 0;
  const staffRem = (workflow.staffReminders as unknown[])?.length ?? 0;
  const staff = workflow.staffAssignment ? 'Staff' : 'Sans staff';
  const esc =
    workflow.escalationEnabled === false
      ? 'Sans escalade'
      : workflow.deadline
        ? 'Escalade'
        : 'Sans escalade';
  return `${reminders} relance${reminders > 1 ? 's' : ''} · ${staffRem} rappel staff · ${staff} · ${esc}`;
}

export function designOrchestrationToApi(
  workflows: Record<string, unknown>[],
  catalog: Record<string, unknown>[],
  scheduledRules: Record<string, unknown>[],
  listOrder?: string[],
) {
  return {
    uiPlanListOrder: listOrder ?? [],
    messageCatalog: catalog.map((c) => ({
      id: String(c.id || c.whatsappTemplateId || `msg-${Date.now()}`),
      label: String(c.label || ''),
      whatsappTemplateId: String(c.whatsappTemplateId || c.id || ''),
      ...(c.flowCategory ? { flowCategory: String(c.flowCategory) } : {}),
      messageFrOta: String(c.messageFrOta || ''),
      messageFrEmail: String(c.messageFrEmail || ''),
    })),
    workflows: workflows.map((w) => ({
      type: (w as { taskTypeId?: string }).taskTypeId || w.triggerTaskType || w.kind,
      enabled: (w as { enabled?: boolean }).enabled !== false,
      escalationEnabled: (w as { escalationEnabled?: boolean }).escalationEnabled !== false,
      reminders: ((w.relances as Record<string, unknown>[]) || []).map((r) => {
        const delay = r.delay as { value?: number; unit?: string };
        const messageId = (r as { catalogMessageId?: string }).catalogMessageId
          ? { messageId: (r as { catalogMessageId: string }).catalogMessageId }
          : (r as { template?: string }).template
            ? { messageId: (r as { template: string }).template }
            : {};
        const deliveryChannel = normDeliveryChannel(
          (r as { deliveryChannel?: string }).deliveryChannel ??
            (r as { channel?: string }).channel,
        );
        const channel = {
          primary: deliveryChannelToApi(deliveryChannel),
          fallback: deliveryChannel === 'whatsapp' ? 'OTA' : 'email',
        };
        if (delay?.unit === 'hours') {
          return {
            ref: mapRefToApi((r as { reference?: string }).reference),
            hours: delay.value ?? 0,
            channel,
            ...messageId,
          };
        }
        return {
          ref: mapRefToApi((r as { reference?: string }).reference),
          day: delay?.value ?? 0,
          time: (r as { time?: string }).time || '09:00',
          channel,
          ...messageId,
        };
      }),
      staffReminders: ((w.staffReminders as Record<string, unknown>[]) || []).map((sr, idx) => {
        const delay = sr.delay as { value?: number; unit?: string };
        const label = String(sr.label || `Rappel ${idx + 1}`);
        const ref = mapRefToApi((sr as { reference?: string }).reference);
        const taskType =
          (w as { taskTypeId?: string }).taskTypeId || w.triggerTaskType || w.kind;
        const messageId = String(
          (sr as { staffTemplateId?: string }).staffTemplateId ||
            defaultStaffReminderMessageId(String(taskType)),
        );
        if (delay?.unit === 'hours') {
          return { label, ref, hours: delay.value ?? 0, messageId };
        }
        return {
          label,
          ref,
          day: delay?.value ?? 0,
          time: (sr as { time?: string }).time || '09:00',
          messageId,
        };
      }),
      staffAssignment: w.assignment
        ? {
            startAt: assignmentAtToApi(
              (w.assignment as { reference: string }).reference,
              (w.assignment as { windowStart?: { value?: number; unit?: string; time?: string } })
                .windowStart ?? { value: -7, unit: 'days' },
              '09:00',
            ),
            endAt: assignmentAtToApi(
              (w.assignment as { reference: string }).reference,
              (w.assignment as { windowEnd?: { value?: number; unit?: string; time?: string } })
                .windowEnd ?? { value: 0, unit: 'days' },
              '23:00',
            ),
            releaseWindows:
              ((w.assignment as { attemptWindows?: string[] }).attemptWindows?.length
                ? (w.assignment as { attemptWindows: string[] }).attemptWindows
                : ['11:00', '16:00']) ?? [],
            autoAssign: (w.assignment as { autoAssign?: boolean }).autoAssign === true,
            assignmentHoursMode:
              (w.assignment as { assignmentHoursMode?: 'planning' | 'always' })
                .assignmentHoursMode ?? 'planning',
            findAnotherStaff: (() => {
              const a = w.assignment as { autoAssign?: boolean; findAnotherStaff?: boolean }
              if (a.autoAssign === true) return false
              return a.findAnotherStaff !== false
            })(),
            releaseMode:
              (w.assignment as { releaseMode?: 'tolerance' | 'windows' }).releaseMode ??
              'tolerance',
            acceptToleranceHours:
              Number((w.assignment as { acceptToleranceHours?: number }).acceptToleranceHours) ||
              3,
          }
        : null,
      deadline:
        (w as { escalationEnabled?: boolean }).escalationEnabled !== false && w.deadline
          ? (() => {
              const dl = w.deadline as {
                reference: string
                delay: { value?: number; unit?: string }
                time?: string
              }
              const delay = dl.delay
              if (delay?.unit === 'hours') {
                return {
                  ref: mapRefToApi(dl.reference),
                  hours: delay.value ?? 0,
                }
              }
              return {
                ref: mapRefToApi(dl.reference),
                day: delay?.value ?? 0,
                time: dl.time || '14:00',
              }
            })()
          : null,
    })),
    scheduledMessages: scheduledRules.map((m) => {
      const trigger = m.trigger as {
        reference: string;
        delay: { value: number; unit: string };
        time?: string;
      };
      const isHours = trigger?.delay?.unit === 'hours';
      return {
        enabled: m.enabled !== false,
        label: m.label,
        messageId: String(m.catalogMessageId || ''),
        trigger: {
          ref: mapRefToApi(trigger?.reference),
          ...(isHours ? { hours: trigger.delay?.value ?? 0 } : { day: trigger.delay?.value ?? 0 }),
          time: trigger?.time || '10:00',
        },
        channel: {
          primary: deliveryChannelToApi(
            (m.deliveryChannel as 'whatsapp' | 'email' | 'ota') || 'whatsapp',
          ),
          fallback:
            (m.deliveryChannel as string) === 'whatsapp' ? 'OTA' : 'email',
        },
      };
    }),
  };
}
