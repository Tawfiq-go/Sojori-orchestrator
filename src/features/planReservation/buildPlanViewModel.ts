import type { Reservation as ApiReservation } from '../../types/reservations.types';
import {
  FULLTASK_TASK_TYPE_EMOJI,
  labelForTaskTypeId,
} from '../taskHub/staff-design/fulltaskTaskTypes';
import { mapDispatchDisplay } from './planDispatchDisplay';
import type {
  Channel,
  EventStatus,
  PlanEvent,
  PlanEventKind,
  PlanStatus,
  Relance,
  RelanceStatus,
  Reservation,
  ReservationPlan,
  AssignAttempt,
  AttemptResult,
  PlanGuestRelanceItem,
  PlanSequenceView,
  PlanStaffReminderItem,
  RelanceExecutionStatus,
  SequenceFlowItem,
  StaffAssignmentPlan,
} from './types';
import {
  messagePlanOrderKey,
  sequencePlanOrderKey,
  sortPlanEventsByListOrder,
} from './planEventOrder';
import {
  formatScheduleOffset,
  inferScheduleOffsetFromDates,
  normalizeScheduleRef,
  resolveScheduleAnchorDate,
  type SequenceScheduleAnchors,
} from './planScheduleLabel';
import { registrationCountsFromPayload } from '../../utils/fulltaskMappers';
import { deriveSequenceDisplayStatus } from './planGroupStatus';

export interface FulltaskPlanDoc {
  reservationId: string;
  planCode?: string;
  reservationCode?: string;
  listingId: string;
  ownerId: string;
  status: 'en_cours' | 'termine' | 'bloque' | 'annule' | 'archive';
  sequences: Array<{
    taskId: string;
    taskScheduledDate?: string | Date;
    taskType: string;
    status: 'en_attente' | 'en_cours' | 'termine' | 'saute';
    clientActionCompleted?: boolean;
    clientActionCompletedAt?: string | Date;
    task?: {
      status?: string;
      scheduledDate?: string | Date;
      createdAt?: string | Date;
      payload?: {
        time?: string;
        selectedTime?: string;
        declaredTime?: string;
        scheduledDate?: string | Date;
        scheduled_date?: string;
        scheduledTime?: string;
        scheduled_time?: string;
        serviceName?: string;
        service_name?: string;
        routeLabel?: string;
        route_label?: string;
        totalToRegister?: number;
        guests?: Array<{ done?: boolean; draft?: boolean }>;
      };
    } | null;
    relances: Array<{
      label: string;
      scheduledAt: string | Date;
      sentAt?: string | Date | null;
      status: 'en_attente' | 'envoyee' | 'saute' | 'echec';
      dispatchLog?: Array<{
        at: string | Date;
        ok: boolean;
        channel?: string;
        source?: 'manual' | 'scheduler';
        error?: string;
      }>;
      scheduleRef?: string;
      scheduleDay?: number;
      scheduleTime?: string;
    }>;
    staffReminders?: Array<{
      label: string;
      scheduledAt: string | Date;
      sentAt?: string | Date | null;
      status: 'en_attente' | 'envoyee' | 'saute' | 'echec';
      dispatchLog?: Array<{
        at: string | Date;
        ok: boolean;
        channel?: string;
        source?: 'manual' | 'scheduler';
        error?: string;
      }>;
    }>;
    assignation?: {
      status: 'en_recherche' | 'trouvee' | 'echec';
      startAt: string | Date;
      endAt: string | Date;
      foundAt?: string | Date | null;
      staffId?: string | null;
      staffAcceptedAt?: string | Date | null;
      attempts: Array<{
        window: string;
        tried: boolean;
        found: boolean;
        failureReason?: string;
        failureLabel?: string;
      }>;
      autoAssign?: boolean;
      assignmentHoursMode?: 'planning' | 'always';
      findAnotherStaff?: boolean;
      acceptToleranceHours?: number;
      releaseWindows?: string[];
      lmAttempts?: Array<{
        label: string;
        scheduledAt: string | Date;
        status: string;
        lm?: boolean;
        triedAt?: string | Date | null;
        failureReason?: string;
        failureLabel?: string;
      }>;
    } | null;
    escalade?: {
      scheduledAt: string | Date;
      status: 'en_attente' | 'active' | 'fait' | 'saute' | 'declenchee' | 'resolue';
      triggeredAt?: string | Date | null;
      scheduleRef?: string;
      scheduleDay?: number;
      scheduleTime?: string;
    } | null;
  }>;
  messages: Array<{
      label: string;
      scheduledAt: string | Date;
      sentAt?: string | Date | null;
      status: 'en_attente' | 'envoye' | 'saute' | 'echec';
      canal: 'whatsapp' | 'OTA' | 'email';
      template?: string;
      messageFr?: string;
      messageId?: string;
      dispatchLog?: Array<{
        at: string | Date;
        ok: boolean;
        channel?: string;
        source?: 'manual' | 'scheduler';
        error?: string;
      }>;
    }>;
  uiPlanListOrder?: string[];
  /** Origine config utilisée pour ce plan (API srv-fulltask). */
  orchestrationConfigSource?: 'owner' | 'global_template';
  guestPhone?: string;
  guestName?: string;
  checkIn?: string | Date;
  checkOut?: string | Date;
  bookingCreatedAt?: string | Date;
  auditLog?: Array<{
    at: string | Date;
    type: string;
    target: string;
    from?: string;
    to?: string;
    reason?: string;
    meta?: Record<string, unknown>;
  }>;
}

const MONTHS_SHORT = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
const DAYS_SHORT = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

function toDate(v: string | Date | undefined | null): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return (parts[0]?.slice(0, 2) || '??').toUpperCase();
}

function avatarColorFromId(id: string): 1 | 2 | 3 | 4 | 5 {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % 5;
  return (h + 1) as 1 | 2 | 3 | 4 | 5;
}

function mapCanal(canal: string): Channel {
  if (canal === 'OTA') return 'ota';
  if (canal === 'email') return 'email';
  return 'wa';
}

function formatWhen(d: Date): string {
  // ⚠️ Utiliser timezone Casablanca pour l'affichage (UTC+1)
  const casablanca = new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
  const now = new Date();
  const nowCasablanca = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));

  const sameDay =
    casablanca.getFullYear() === nowCasablanca.getFullYear() &&
    casablanca.getMonth() === nowCasablanca.getMonth() &&
    casablanca.getDate() === nowCasablanca.getDate();
  const time = `${String(casablanca.getHours()).padStart(2, '0')}:${String(casablanca.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `Aujourd'hui · ${time}`;
  return `${casablanca.getDate()} ${MONTHS_SHORT[casablanca.getMonth()]} · ${time}`;
}

function formatRange(start: Date, end?: Date | null): string {
  const s = `${start.getDate()} ${MONTHS_SHORT[start.getMonth()]}`;
  if (!end) return `${s} → en cours`;
  return `${s} → ${end.getDate()} ${MONTHS_SHORT[end.getMonth()]}`;
}

function isTaskScheduledDateAnchored(taskType: string): boolean {
  const t = taskType.toLowerCase();
  return (
    t === 'cleaning_free' ||
    t === 'cleaning_paid' ||
    t === 'checkout_cleaning' ||
    t === 'transport' ||
    t === 'groceries' ||
    t === 'concierge'
  );
}

const TASK_TYPES_SHOW_CREATED_DAY = new Set(['support', 'service_client']);

function taskPayloadRecord(
  seq: FulltaskPlanDoc['sequences'][0],
): Record<string, unknown> | undefined {
  const p = seq.task?.payload;
  return p && typeof p === 'object' ? (p as Record<string, unknown>) : undefined;
}

function sequenceScheduleAnchors(
  seq: FulltaskPlanDoc['sequences'][0],
  taskAnchorDate?: Date,
): SequenceScheduleAnchors {
  return {
    taskScheduledDate:
      taskAnchorDate ??
      toDate(seq.taskScheduledDate) ??
      toDate(seq.task?.scheduledDate) ??
      undefined,
    taskCreatedAt:
      toDate(seq.task?.createdAt) ??
      toDate(seq.assignation?.startAt) ??
      undefined,
  };
}

function resolveTaskDisplayDate(
  seq: FulltaskPlanDoc['sequences'][0],
  plan: FulltaskPlanDoc,
  taskAnchorDate: Date | undefined,
): Date | undefined {
  const t = seq.taskType.toLowerCase();
  const payload = taskPayloadRecord(seq);

  if (isTaskScheduledDateAnchored(t)) {
    return (
      taskAnchorDate ??
      toDate(seq.task?.scheduledDate) ??
      toDate(payload?.scheduledDate) ??
      toDate(payload?.scheduled_date) ??
      undefined
    );
  }

  if (TASK_TYPES_SHOW_CREATED_DAY.has(t)) {
    return (
      toDate(seq.task?.createdAt) ??
      toDate(seq.assignation?.startAt) ??
      toDate(plan.bookingCreatedAt) ??
      undefined
    );
  }

  return undefined;
}

function sequenceServiceLabel(seq: FulltaskPlanDoc['sequences'][0]): string | undefined {
  const payload = taskPayloadRecord(seq);
  if (!payload) return undefined;
  const service = String(payload.serviceName ?? payload.service_name ?? '').trim();
  if (service) return service;
  const route = String(payload.routeLabel ?? payload.route_label ?? '').trim();
  return route || undefined;
}

function buildSequenceTitle(
  seq: FulltaskPlanDoc['sequences'][0],
  baseTitle: string,
  atDisplay: string,
  typeCounts: Record<string, number>,
): string {
  const t = seq.taskType;
  const service = sequenceServiceLabel(seq);
  const showService =
    service && (t === 'concierge' || t === 'transport' || t === 'groceries');
  const showDate =
    (t === 'cleaning_free' && (typeCounts.cleaning_free ?? 0) > 1) ||
    isTaskScheduledDateAnchored(t) ||
    TASK_TYPES_SHOW_CREATED_DAY.has(t);

  if (!showService && !showDate) return baseTitle;

  const parts = [baseTitle];
  if (showService) parts.push(service!);
  if (showDate) parts.push(atDisplay);
  return parts.join(' · ');
}

function countSequencesByType(
  sequences: FulltaskPlanDoc['sequences'],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sequences) {
    counts[s.taskType] = (counts[s.taskType] ?? 0) + 1;
  }
  return counts;
}

function casablancaLocalDate(d: Date): Date {
  return new Date(d.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
}

/** Jour de la tâche (ex. date ménage) — pas la 1re relance ni la fenêtre assignation. */
function formatTaskDayLabel(d: Date): string {
  const casablanca = casablancaLocalDate(d);
  const nowCasablanca = casablancaLocalDate(new Date());
  const sameDay =
    casablanca.getFullYear() === nowCasablanca.getFullYear() &&
    casablanca.getMonth() === nowCasablanca.getMonth() &&
    casablanca.getDate() === nowCasablanca.getDate();
  if (sameDay) return "Aujourd'hui";
  return `${casablanca.getDate()} ${MONTHS_SHORT[casablanca.getMonth()]}`;
}

function formatTaskDayWhen(d: Date): string {
  const casablanca = casablancaLocalDate(d);
  const dayLabel = formatTaskDayLabel(d);
  const h = casablanca.getHours();
  const m = casablanca.getMinutes();
  if (h === 0 && m === 0) return dayLabel;
  const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return `${dayLabel} · ${time}`;
}

function resolveSequenceTimelineDisplay(
  seq: FulltaskPlanDoc['sequences'][0],
  plan: FulltaskPlanDoc,
  taskAnchorDate: Date | undefined,
  now: Date,
): { start: Date; end: Date | null; atDisplay: string; range: string } {
  const displayDate = resolveTaskDisplayDate(seq, plan, taskAnchorDate);
  if (displayDate) {
    return {
      start: displayDate,
      end: null,
      atDisplay: formatTaskDayWhen(displayDate),
      range: formatTaskDayLabel(displayDate),
    };
  }
  const start =
    toDate(seq.assignation?.startAt) || toDate(seq.relances[0]?.scheduledAt) || now;
  const end = toDate(seq.assignation?.endAt);
  return {
    start,
    end,
    atDisplay: formatWhen(start),
    range: formatRange(start, end),
  };
}

function isAtomeSentStatus(raw: string): boolean {
  return raw === 'fait' || raw === 'envoyee' || raw === 'envoye';
}

function isAssignationFoundStatus(raw: string): boolean {
  return raw === 'trouvee' || raw === 'attente_acceptation' || raw === 'termine';
}

function eventStatusAt(scheduled: Date, raw: string, now = new Date()): EventStatus {
  if (raw === 'termine' || isAtomeSentStatus(raw)) return 'done';
  if (raw === 'saute' || raw === 'echec' || raw === 'bloque') return 'blocked';
  if (raw === 'en_cours' || raw === 'declenchee') return 'now';
  if (scheduled.getTime() > now.getTime()) return 'future';
  if (scheduled.getTime() < now.getTime() - 3600000) return 'pending';
  return 'now';
}

type EscaladeViewStatus = 'en_attente' | 'active' | 'saute' | 'fait';

function normalizeEscaladeStatus(raw: string): EscaladeViewStatus {
  if (raw === 'declenchee' || raw === 'active') return 'active';
  if (raw === 'resolue' || raw === 'fait') return 'fait';
  if (raw === 'saute') return 'saute';
  return 'en_attente';
}

function escaladeDescription(status: EscaladeViewStatus): string {
  switch (status) {
    case 'active':
      return 'Escalade active — intervention admin';
    case 'saute':
      return 'Non nécessaire (gates OK)';
    case 'fait':
      return 'Escalade traitée';
    default:
      return 'Escalade PM si non confirmé avant deadline';
  }
}

function mapEscaladeAtomRaw(status: EscaladeViewStatus): string {
  if (status === 'active') return 'declenchee';
  if (status === 'saute') return 'saute';
  if (status === 'fait') return 'fait';
  return 'en_attente';
}

function mapEscaladeView(
  esc: NonNullable<FulltaskPlanDoc['sequences'][0]['escalade']>,
  plan: FulltaskPlanDoc,
  taskType: string,
  seqAnchors: SequenceScheduleAnchors,
  now: Date,
) {
  const status = normalizeEscaladeStatus(esc.status);
  const escRef = normalizeScheduleRef(esc.scheduleRef, taskType);
  const escAnchor =
    resolveScheduleAnchorDate(plan, escRef, seqAnchors, esc.scheduledAt) || now;
  return {
    scheduled: status === 'en_attente',
    status,
    dueAt: formatWhen(toDate(esc.scheduledAt) || now),
    scheduleOffsetLabel:
      formatScheduleOffset(esc.scheduleDay, escRef, esc.scheduleTime, taskType) ??
      inferScheduleOffsetFromDates(
        toDate(esc.scheduledAt) || now,
        escAnchor,
        escRef,
        esc.scheduleTime,
        taskType,
      ),
    description: escaladeDescription(status),
  };
}

function countSteps(plan: FulltaskPlanDoc) {
  let done = 0;
  let inProgress = 0;
  let upcoming = 0;
  let blocked = 0;
  const now = new Date();

  for (const m of plan.messages) {
    if (isWorkflowRelanceMessage(m.label)) continue;
    const st = eventStatusAt(toDate(m.scheduledAt) || now, m.status, now);
    if (st === 'done') done++;
    else if (st === 'now' || st === 'pending') inProgress++;
    else if (st === 'blocked') blocked++;
    else upcoming++;
  }

  for (const s of plan.sequences) {
    const anchor =
      toDate(s.assignation?.startAt) ||
      toDate(s.relances[0]?.scheduledAt) ||
      toDate(s.staffReminders?.[0]?.scheduledAt) ||
      now;
    const st = eventStatusAt(anchor, s.status, now);
    if (st === 'done') done++;
    else if (st === 'now' || st === 'pending') inProgress++;
    else if (st === 'blocked') blocked++;
    else upcoming++;
    for (const sr of s.staffReminders ?? []) {
      const srSt = eventStatusAt(toDate(sr.scheduledAt) || now, sr.status, now);
      if (srSt === 'done') done++;
      else if (srSt === 'now' || srSt === 'pending') inProgress++;
      else if (srSt === 'blocked') blocked++;
      else upcoming++;
    }
  }

  const total = done + inProgress + upcoming + blocked || 1;
  return { done, inProgress, upcoming, blocked, progress: done / total };
}

export interface PlanListSummaryDoc {
  reservationId: string;
  planCode?: string;
  reservationCode?: string;
  listingId: string;
  ownerId?: string;
  status?: string;
  guestName?: string;
  checkIn?: string | Date;
  checkOut?: string | Date;
}

export function deriveReservationStatusFromSummary(
  checkIn: Date | null,
  checkOut: Date | null,
  planStatus?: string,
  now = new Date(),
): PlanStatus {
  if (planStatus === 'annule' || planStatus === 'bloque') return 'blocked';
  if (planStatus === 'termine') return 'done';
  if (checkOut && checkOut < now) return 'done';
  if (checkIn && checkIn > now) return 'future';
  if (checkIn && checkOut && checkIn <= now && checkOut >= now) return 'now';
  if (planStatus === 'en_cours') return 'now';
  return 'pending';
}

/** Vue sidebar à partir de la liste légère API (sans plan complet). */
export function buildReservationViewFromSummary(
  summary: PlanListSummaryDoc,
  listingName?: string,
): Reservation {
  const guestName = summary.guestName || 'Invité';
  const checkIn = toDate(summary.checkIn)?.toISOString() || new Date().toISOString();
  const checkOut = toDate(summary.checkOut)?.toISOString() || checkIn;
  const reference = summary.reservationCode?.trim() || summary.reservationId.slice(-8).toUpperCase();
  const planCode = summary.planCode?.trim() || '—';
  const status = deriveReservationStatusFromSummary(
    toDate(summary.checkIn),
    toDate(summary.checkOut),
    summary.status,
  );

  return {
    id: summary.reservationId,
    planCode,
    reference,
    guest: {
      id: summary.reservationId,
      name: guestName,
      initials: initials(guestName),
      avatarColor: avatarColorFromId(summary.reservationId),
    },
    listing: {
      id: summary.listingId,
      name: listingName || 'Logement',
    },
    source: 'Direct',
    guestsCount: 1,
    checkIn,
    checkOut,
    status,
    progress: status === 'done' ? 1 : 0,
    done: status === 'done' ? 1 : 0,
    inProgress: status === 'now' || status === 'pending' ? 1 : 0,
    upcoming: status === 'future' ? 1 : 0,
    blocked: status === 'blocked' ? 1 : 0,
  };
}

export function deriveReservationStatus(
  resa: ApiReservation,
  plan: FulltaskPlanDoc | null,
  now = new Date(),
): PlanStatus {
  if (plan?.status === 'annule') return 'blocked';
  if (plan?.status === 'bloque') return 'blocked';
  const checkIn = toDate(resa.arrivalDate);
  const checkOut = toDate(resa.departureDate);

  // Plan encore actif (ex. départ / ménage après la date de checkout calendrier)
  if (plan?.status === 'en_cours') {
    const counts = countSteps(plan);
    if (counts.inProgress > 0 || counts.blocked > 0) {
      if (checkIn && checkIn > now) return 'future';
      return 'now';
    }
    if (counts.upcoming > 0) {
      if (checkIn && checkIn > now) return 'future';
      return 'pending';
    }
  }

  if (plan?.status === 'termine') return 'done';
  if (checkOut && checkOut < now) return 'done';
  if (checkIn && checkIn > now) return 'future';
  if (checkIn && checkOut && checkIn <= now && checkOut >= now) return 'now';
  return 'pending';
}

export function buildReservationView(
  resa: ApiReservation,
  plan: FulltaskPlanDoc | null,
  listingName?: string,
): Reservation {
  const guestName = plan?.guestName || resa.guestName || 'Invité';
  const counts = plan
    ? countSteps(plan)
    : { done: 0, inProgress: 0, upcoming: 0, blocked: 0, progress: 0 };

  const checkIn = toDate(plan?.checkIn || resa.arrivalDate)?.toISOString() || new Date().toISOString();
  const checkOut = toDate(plan?.checkOut || resa.departureDate)?.toISOString() || checkIn;

  const apiRef = resa.reservationNumber?.trim();
  const planRef = plan?.reservationCode?.trim();
  const reference =
    apiRef ||
    (planRef && !/^SJ-\d{4,6}$/i.test(planRef) ? planRef : '') ||
    planRef ||
    resa.id.slice(-8).toUpperCase();

  const planCode =
    plan?.planCode?.trim() ||
    (plan?._id ? `OS-${String(plan._id).slice(-8).toUpperCase()}` : '') ||
    '—';

  return {
    id: resa.id,
    planCode,
    reference,
    guest: {
      id: resa.id,
      name: guestName,
      initials: initials(guestName),
      countryFlag: countryFlagEmoji(resa.guestCountry || resa.nationality),
      avatarColor: avatarColorFromId(resa.id),
    },
    listing: {
      id: String(resa.sojoriId || resa.listingMapId || plan?.listingId || ''),
      name: listingName || String(resa.sojoriId || 'Logement'),
    },
    source: resa.channelName || resa.otaCode || 'Direct',
    guestsCount: resa.numberOfGuests || resa.adults || 1,
    checkIn,
    checkOut,
    status: deriveReservationStatus(resa, plan),
    progress: counts.progress,
    done: counts.done,
    inProgress: counts.inProgress,
    upcoming: counts.upcoming,
    blocked: counts.blocked,
  };
}

function countryFlagEmoji(country?: string | null): string | undefined {
  if (!country) return undefined;
  const c = country.trim().toUpperCase();
  if (c === 'MA' || c.includes('MAROC')) return '🇲🇦';
  if (c === 'FR' || c.includes('FRANCE')) return '🇫🇷';
  return undefined;
}

function mapDispatchLog(
  log?: Array<{
    at: string | Date;
    ok: boolean;
    channel?: string;
    source?: 'manual' | 'scheduler';
    error?: string;
  }>,
  options?: {
    itemDelivered?: boolean;
    sentAt?: string | Date | null;
    fallbackChannel?: string;
  },
) {
  if (!log?.length && options?.itemDelivered && options?.sentAt) {
    const sent = toDate(options.sentAt);
    if (sent) {
      const iso = sent.toISOString();
      const synthetic = [
        {
          at: iso,
          ok: true,
          channel: options.fallbackChannel,
          source: 'scheduler' as const,
        },
      ];
      const { lastDispatch, lastAttempt } = mapDispatchDisplay(synthetic, { itemDelivered: true });
      return { lastDispatch, lastDispatchAttempt: lastAttempt, dispatchLog: synthetic };
    }
  }
  if (!log?.length) return { lastDispatch: undefined, lastDispatchAttempt: undefined, dispatchLog: undefined };
  const dispatchLog = log.map((e) => ({
    at: typeof e.at === 'string' ? e.at : new Date(e.at).toISOString(),
    ok: e.ok,
    channel: e.channel,
    source: e.source,
    error: e.error,
  }));
  const { lastDispatch, lastAttempt } = mapDispatchDisplay(dispatchLog, options);
  return { lastDispatch, lastDispatchAttempt: lastAttempt, dispatchLog };
}

function mapRelanceExecution(
  r: {
    label: string;
    scheduledAt: string | Date;
    status: string;
    dispatchLog?: Array<{
      at: string | Date;
      ok: boolean;
      channel?: string;
      source?: 'manual' | 'scheduler';
      error?: string;
    }>;
  },
  i: number,
  channel: Relance['channel'] = 'wa',
  idPrefix = 'rel',
  now = new Date(),
): Pick<
  PlanGuestRelanceItem,
  | 'id'
  | 'step'
  | 'label'
  | 'dueAt'
  | 'status'
  | 'channel'
  | 'executionStatus'
  | 'rawStatus'
  | 'lastDispatch'
  | 'lastDispatchAttempt'
  | 'dispatchLog'
> {
  const due = toDate(r.scheduledAt) || now;
  const raw = String(r.status);
  const isFuture = due.getTime() > now.getTime();

  let executionStatus: RelanceExecutionStatus;
  if (isAtomeSentStatus(raw)) executionStatus = 'envoyee';
  else if (raw === 'echec') executionStatus = 'echec';
  else if (raw === 'saute') executionStatus = 'sautee';
  else if (isFuture) executionStatus = 'prevision';
  else if (raw === 'en_attente' && !isFuture) executionStatus = 'en_retard';  // ✅ BUG FIX #2
  else executionStatus = 'en_attente';

  let status: RelanceStatus = 'scheduled';
  if (executionStatus === 'envoyee') status = 'sent';
  else if (executionStatus === 'sautee' || executionStatus === 'echec') status = 'skipped';

  const { lastDispatch, lastDispatchAttempt, dispatchLog } = mapDispatchLog(r.dispatchLog, {
    itemDelivered: isAtomeSentStatus(raw),
  });

  const rawStatus: PlanGuestRelanceItem['rawStatus'] = isAtomeSentStatus(raw)
    ? 'envoyee'
    : (raw as PlanGuestRelanceItem['rawStatus']);

  return {
    id: `${idPrefix}-${i}`,
    step: i + 1,
    status,
    dueAt: formatWhen(due),
    label: r.label,
    channel,
    executionStatus,
    rawStatus,
    lastDispatch,
    lastDispatchAttempt,
    dispatchLog,
  };
}

function mapRelance(
  r: { label: string; scheduledAt: string | Date; status: string },
  i: number,
  channel: Relance['channel'] = 'wa',
  idPrefix = 'rel',
): Relance {
  const m = mapRelanceExecution(r, i, channel, idPrefix);
  return {
    id: m.id,
    step: m.step,
    status: m.status,
    dueAt: m.dueAt,
    label: m.label,
    channel: m.channel,
  };
}

function mapRelanceStatus(scheduled: Date, raw: string, now = new Date()): EventStatus {
  if (isAtomeSentStatus(raw)) return eventStatusAt(scheduled, 'envoye', now);
  if (raw === 'saute' || raw === 'echec') return 'blocked';
  return eventStatusAt(scheduled, 'en_attente', now);
}

function mapAssignStatus(
  scheduled: Date,
  raw: string,
  now = new Date(),
): EventStatus {
  if (isAssignationFoundStatus(raw)) return 'done';
  if (raw === 'echec') return 'blocked';
  return eventStatusAt(scheduled, 'en_attente', now);
}

function computeNextAssignmentLabel(
  start: Date,
  end: Date,
  releaseWindows: string[],
  now: Date,
  status: 'searching' | 'found' | 'failed',
  staffName?: string,
  lmAttempts?: Array<{
    scheduledAt: string | Date;
    status: string;
    failureLabel?: string;
  }>,
  assignationExhausted?: boolean,
  lmFailureLabel?: string,
): string {
  if (status === 'found' && staffName) {
    return `Staff assigné · ${staffName}`;
  }
  if (assignationExhausted && lmFailureLabel) {
    return `Assignation LM échouée · ${lmFailureLabel} · plus de relance`;
  }
  if (assignationExhausted) {
    return 'Assignation terminée · échec · plus de relance';
  }
  if (status === 'failed' || now.getTime() >= end.getTime()) {
    const pendingLm = lmAttempts?.find((lm) => lm.status === 'en_attente');
    if (pendingLm) {
      const at = toDate(pendingLm.scheduledAt);
      if (at) return `Prochaine assignation LM · ${formatWhen(at)}`;
    }
    const failedLm = lmAttempts?.find((lm) => lm.status === 'echec');
    if (failedLm?.failureLabel) {
      return `Assignation LM échouée · ${failedLm.failureLabel}`;
    }
    return 'Fenêtre assignation terminée';
  }

  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  for (
    let day = new Date(dayStart);
    day.getTime() <= endDay.getTime();
    day.setDate(day.getDate() + 1)
  ) {
    for (const w of releaseWindows) {
      const [hh, mm] = w.split(':').map((x) => Number(x));
      const slot = new Date(day);
      slot.setHours(hh || 0, mm || 0, 0, 0);
      if (slot.getTime() < start.getTime() || slot.getTime() > end.getTime()) continue;
      if (slot.getTime() > now.getTime()) {
        return `Prochaine assignation · ${formatWhen(slot)}`;
      }
    }
  }

  return 'Prochaine assignation · après clôture fenêtre';
}

function iterAssignmentSlots(
  start: Date,
  end: Date,
  releaseWindows: string[],
): Date[] {
  const slots: Date[] = [];
  const dayStart = new Date(start);
  dayStart.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(23, 59, 59, 999);

  for (
    let day = new Date(dayStart);
    day.getTime() <= endDay.getTime();
    day.setDate(day.getDate() + 1)
  ) {
    for (const w of releaseWindows) {
      const [hh, mm] = w.split(':').map((x) => Number(x));
      const slot = new Date(day);
      slot.setHours(hh || 0, mm || 0, 0, 0);
      if (slot.getTime() < start.getTime() || slot.getTime() > end.getTime()) continue;
      slots.push(slot);
    }
  }
  return slots;
}

function computeLastAssignmentLabel(
  start: Date,
  end: Date,
  releaseWindows: string[],
  status: 'searching' | 'found' | 'failed',
  foundAt?: Date | null,
  staffName?: string,
): string {
  if (status === 'found' && foundAt) {
    return `Dernière assignation · ${formatWhen(foundAt)}${staffName ? ` · ${staffName}` : ''}`;
  }
  if (status === 'failed') {
    return `Fin assignations · ${formatWhen(end)} · échec`;
  }

  const slots = iterAssignmentSlots(start, end, releaseWindows);
  if (slots.length === 0) {
    return `Fin assignations · ${formatWhen(end)}`;
  }
  const lastSlot = slots[slots.length - 1];
  return `Dernière assignation · ${formatWhen(lastSlot)}`;
}

function mapStaffAssignment(
  seq: FulltaskPlanDoc['sequences'][0],
  staffNames: Record<string, string>,
  now = new Date(),
): StaffAssignmentPlan | undefined {
  const a = seq.assignation;
  if (!a) return undefined;
  const start = toDate(a.startAt);
  const end = toDate(a.endAt);
  if (!start || !end) return undefined;

  const staffId = a.staffId ? String(a.staffId) : '';
  const staffName = staffId ? staffNames[staffId] : undefined;
  const releaseWindows = a.releaseWindows?.length ? a.releaseWindows : ['11:00', '16:00'];
  const autoAssign = Boolean(a.autoAssign);
  const status =
    isAssignationFoundStatus(a.status) ? 'found' : a.status === 'echec' ? 'failed' : 'searching';
  const windowPast = end.getTime() <= now.getTime();
  const windowOpen = start.getTime() <= now.getTime() && end.getTime() > now.getTime();
  const windowFuture = start.getTime() > now.getTime();
  const foundAt = toDate(a.foundAt);
  const lmAttempts = a.lmAttempts ?? [];
  const hasPendingLmAssign = lmAttempts.some((lm) => lm.status === 'en_attente');
  const failedLm = lmAttempts.find((lm) => lm.status === 'echec');
  const assignationExhausted =
    status === 'failed' && Boolean(failedLm) && !hasPendingLmAssign;
  const lmFailureLabel = failedLm?.failureLabel;

  return {
    status,
    windowStart: formatWhen(start),
    windowEnd: formatWhen(end),
    windowRange: `${formatWhen(start)} → ${formatWhen(end)}`,
    autoAssign,
    assignmentHoursMode: a.assignmentHoursMode === 'always' ? 'always' : 'planning',
    findAnotherStaff: a.findAnotherStaff !== false,
    acceptToleranceHours: a.acceptToleranceHours ?? 3,
    releaseWindows,
    modeLabel: autoAssign ? 'Auto-accept' : 'Manuel',
    toleranceLabel:
      autoAssign || a.releaseMode === 'windows'
        ? undefined
        : `${a.acceptToleranceHours ?? 3} h`,
    slotsLabel: a.releaseMode === 'tolerance' ? undefined : releaseWindows.join(' / '),
    nextAssignmentLabel: computeNextAssignmentLabel(
      start,
      end,
      releaseWindows,
      now,
      status,
      staffName,
      lmAttempts,
      assignationExhausted,
      lmFailureLabel,
    ),
    lastAssignmentLabel: computeLastAssignmentLabel(
      start,
      end,
      releaseWindows,
      status,
      foundAt,
      staffName,
    ),
    staffName,
    windowPast,
    windowOpen,
    windowFuture,
    hasPendingLmAssign,
    assignationExhausted,
    lmFailureLabel,
  };
}

function mapLmAssignSlots(
  seq: FulltaskPlanDoc['sequences'][0],
  now = new Date(),
): import('./types').PlanAssignLmItem[] {
  const slots = seq.assignation?.lmAttempts ?? [];
  return slots.map((lm, i) => {
    const m = mapRelanceExecution(lm, i, 'wa', 'lm-assign', now);
    const failureNote =
      lm.status === 'echec' && lm.failureLabel ? lm.failureLabel : undefined;
    return {
      ...m,
      relanceIndex: i,
      scheduleOffsetLabel: failureNote
        ? `LM · échec · ${failureNote}`
        : 'LM · hors fenêtre',
    };
  });
}

function buildSequenceFlow(
  seq: FulltaskPlanDoc['sequences'][0],
  staffNames: Record<string, string>,
  now = new Date(),
): SequenceFlowItem[] {
  const items: SequenceFlowItem[] = [];

  for (let i = 0; i < (seq.relances?.length ?? 0); i++) {
    const r = seq.relances[i];
    const at = toDate(r.scheduledAt) || now;
    const prev = i > 0 ? seq.relances[i - 1] : null;
    items.push({
      id: `rel-${i}`,
      phase: 'guest',
      sortAt: at.toISOString(),
      title: r.label || `Relance ${i + 1}`,
      when: formatWhen(at),
      status: mapRelanceStatus(at, r.status, now),
      channel: 'wa',
      contextNote: prev
        ? `Après · ${prev.label} (${formatWhen(toDate(prev.scheduledAt) || at)})`
        : 'Début séquence · relance voyageur',
    });
  }

  const a = seq.assignation;
  if (a) {
    const start = toDate(a.startAt) || now;
    const end = toDate(a.endAt) || start;
    const releaseWindows = a.releaseWindows?.length ? a.releaseWindows : ['11:00', '16:00'];
    const staffId = a.staffId ? String(a.staffId) : '';

    items.push({
      id: 'assign-open',
      phase: 'assign',
      sortAt: start.toISOString(),
      title: 'Assignation staff — ouverture',
      when: formatWhen(start),
      status: mapAssignStatus(start, a.status, now),
      detail: `Créneaux ${releaseWindows.join(' · ')} · ${a.autoAssign ? 'auto-accept' : `acceptation ${a.acceptToleranceHours ?? 3} h`}`,
      contextNote: 'Début fenêtre assignation (avant / pendant relances client)',
    });

    if (a.attempts?.length) {
      for (let i = 0; i < a.attempts.length; i++) {
        const att = a.attempts[i];
        items.push({
          id: `assign-try-${i}`,
          phase: 'assign',
          sortAt: new Date(start.getTime() + 1000 + i).toISOString(),
          title: `Tentative ${att.window}`,
          when: att.window,
          status: att.found ? 'done' : att.tried ? 'blocked' : 'pending',
          detail: att.found
            ? `Staff trouvé${staffId ? ` · ${staffNames[staffId] || ''}` : ''}`
            : att.tried
              ? 'Aucun staff disponible'
              : 'Prévu',
        });
      }
    }

    items.push({
      id: 'assign-close',
      phase: 'assign',
      sortAt: end.toISOString(),
      title: 'Assignation staff — clôture fenêtre',
      when: formatWhen(end),
      status: mapRelanceStatus(
        end,
        isAssignationFoundStatus(a.status) ? 'envoyee' : 'en_attente',
        now,
      ),
      detail: a.autoAssign
        ? 'Auto-accept actif'
        : `Acceptation sous ${a.acceptToleranceHours ?? 3} h si staff proposé`,
    });

    for (let i = 0; i < (a.lmAttempts?.length ?? 0); i++) {
      const lm = a.lmAttempts![i];
      const at = toDate(lm.scheduledAt) || now;
      items.push({
        id: `assign-lm-${i}`,
        phase: 'assign',
        sortAt: at.toISOString(),
        title: lm.label || `Assignation LM ${i + 1}`,
        when: formatWhen(at),
        status: mapAssignStatus(
          at,
          lm.status === 'fait' ? 'termine' : lm.status,
          now,
        ),
        detail: 'Hors fenêtre config · prochain tick cron',
        contextNote: 'Last-minute · après clôture fenêtre',
      });
    }
  }

  for (let i = 0; i < (seq.staffReminders?.length ?? 0); i++) {
    const sr = seq.staffReminders[i];
    const at = toDate(sr.scheduledAt) || now;
    items.push({
      id: `staff-${i}`,
      phase: 'staff',
      sortAt: at.toISOString(),
      title: sr.label,
      when: formatWhen(at),
      status: mapRelanceStatus(at, sr.status, now),
      channel: 'sms',
    });
  }

  if (seq.escalade) {
    const at = toDate(seq.escalade.scheduledAt) || now;
    const escStatus = normalizeEscaladeStatus(seq.escalade.status);
    const escRaw = mapEscaladeAtomRaw(escStatus);
    items.push({
      id: 'escalade',
      phase: 'escalade',
      sortAt: at.toISOString(),
      title: 'Escalade PM',
      when: formatWhen(at),
      status: mapRelanceStatus(at, escRaw, now),
      detail: escaladeDescription(escStatus),
    });
  }

  items.sort((x, y) => new Date(x.sortAt).getTime() - new Date(y.sortAt).getTime());

  for (let i = 0; i < items.length; i++) {
    if (items[i].phase !== 'staff') continue;
    const prev = items[i - 1];
    const assignStep = [...items].reverse().find((s) => s.phase === 'assign' && s.id === 'assign-close')
      || items.find((s) => s.phase === 'assign');
    let note = prev ? `Après · ${prev.title} (${prev.when})` : 'Après relances client';
    if (assignStep) {
      note += ` · fenêtre assignation jusqu’au ${assignStep.when}`;
    }
    if (seq.assignation?.autoAssign) note += ' · auto-accept';
    items[i].contextNote = note;
  }

  return items;
}

function mapAttempts(
  seq: FulltaskPlanDoc['sequences'][0],
  staffNames: Record<string, string>,
): AssignAttempt[] | undefined {
  if (!seq.assignation?.attempts?.length) return undefined;
  const staffId = seq.assignation?.staffId ? String(seq.assignation.staffId) : '';
  const assignedName = staffNames[staffId] || (staffId ? `Staff ${staffId.slice(-4)}` : undefined);

  return seq.assignation.attempts.map((a, i) => {
    const isLm = a.window.startsWith('LM:');
    let result: AttemptResult = 'pending';
    if (a.found) result = 'accepted';
    else if (a.tried && !a.found) result = 'declined';

    let staffName = '—';
    let staffRole = isLm ? 'LM assignation' : 'Staff';
    if (a.found && assignedName) {
      staffName = assignedName;
    } else if (a.tried && !a.found && a.failureLabel) {
      staffName = a.failureLabel;
      staffRole = isLm ? 'LM · échec' : 'Échec';
    } else if (a.tried && !a.found) {
      staffName = isLm ? 'Aucun staff disponible' : 'Aucun staff';
    }

    return {
      id: `att-${i}`,
      step: i + 1,
      triedAt: a.window,
      staffName,
      staffRole,
      result,
      failureLabel: a.failureLabel,
      isLm,
    };
  });
}

function inferMessageCategory(label: string): 'simple' | 'relance' {
  return label.startsWith('Relance ·') ? 'relance' : 'simple';
}

/** Doublon : relances workflow sont déjà dans sequences[].relances. */
function isWorkflowRelanceMessage(label: string): boolean {
  return inferMessageCategory(label) === 'relance';
}

function inferWorkflowKeyFromRelanceLabel(label: string): string | undefined {
  const m = /^Relance · ([^·]+) ·/i.exec(label);
  if (!m) return undefined;
  return `wf:${m[1].trim().replace(/\s+/g, '_')}`;
}

function catalogMetaForSequenceRelance(
  plan: FulltaskPlanDoc,
  seq: FulltaskPlanDoc['sequences'][0],
  scheduledAt: Date,
  reminderLabel: string,
): { catalogTemplate?: string; catalogChannel?: Channel } {
  const taskHint = seq.taskType.replace(/_/g, ' ');
  for (const m of plan.messages) {
    if (!isWorkflowRelanceMessage(m.label)) continue;
    const at = toDate(m.scheduledAt);
    if (!at || Math.abs(at.getTime() - scheduledAt.getTime()) > 90_000) continue;
    if (!m.label.toLowerCase().includes(taskHint)) continue;
    if (reminderLabel && !m.label.includes(reminderLabel) && !m.label.endsWith('Relance')) {
      const short = reminderLabel.slice(0, 12);
      if (short && !m.label.includes(short)) continue;
    }
    return {
      catalogTemplate: m.template || m.messageId,
      catalogChannel: mapCanal(m.canal),
    };
  }
  return {};
}

function buildSequenceView(
  seq: FulltaskPlanDoc['sequences'][0],
  staffNames: Record<string, string>,
  planStep: number | undefined,
  plan: FulltaskPlanDoc,
  now = new Date(),
  typeCounts: Record<string, number> = {},
  sequenceId = '',
): PlanSequenceView {
  const icon =
    FULLTASK_TASK_TYPE_EMOJI[seq.taskType as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '⚙️';

  const taskAnchorDate =
    toDate(seq.taskScheduledDate) ?? toDate(seq.task?.scheduledDate) ?? undefined;
  const seqAnchors = sequenceScheduleAnchors(seq, taskAnchorDate ?? undefined);
  const { start, atDisplay, range } = resolveSequenceTimelineDisplay(
    seq,
    plan,
    taskAnchorDate,
    now,
  );
  const relances: PlanGuestRelanceItem[] = (seq.relances ?? []).map((r, i) => {
    const at = toDate(r.scheduledAt) || now;
    const m = mapRelanceExecution(r, i, 'wa', 'rel', now);
    const meta = catalogMetaForSequenceRelance(plan, seq, at, r.label);
    const scheduleRef = normalizeScheduleRef(r.scheduleRef, seq.taskType);
    const isLm = Boolean((r as { lm?: boolean }).lm);
    const anchor = resolveScheduleAnchorDate(plan, scheduleRef, seqAnchors, at) || at;
    return {
      ...m,
      relanceIndex: i,
      channel: meta.catalogChannel ?? m.channel,
      catalogTemplate: meta.catalogTemplate,
      scheduleOffsetLabel: isLm
        ? 'LM · prochaine heure'
        : formatScheduleOffset(r.scheduleDay, scheduleRef, r.scheduleTime, seq.taskType) ??
          inferScheduleOffsetFromDates(
            at,
            anchor,
            scheduleRef,
            r.scheduleTime,
            seq.taskType,
          ),
    };
  });

  const staffReminders: PlanStaffReminderItem[] = (seq.staffReminders ?? []).map((r, i) => {
    const at = toDate(r.scheduledAt) || now;
    const m = mapRelanceExecution(r, i, 'sms', 'staff', now);
    const srRef = normalizeScheduleRef(
      (r as { scheduleRef?: string }).scheduleRef,
      seq.taskType,
    );
    const srAnchor = resolveScheduleAnchorDate(plan, srRef, seqAnchors, at) || at;
    const scheduleDay = (r as { scheduleDay?: number }).scheduleDay;
    const scheduleTime = (r as { scheduleTime?: string }).scheduleTime;
    return {
      ...m,
      reminderIndex: i,
      whatsappTemplateId: r.messageId?.trim() || undefined,
      rawStatus: r.status as PlanStaffReminderItem['rawStatus'],
      scheduleOffsetLabel:
        formatScheduleOffset(scheduleDay, srRef, scheduleTime, seq.taskType) ??
        inferScheduleOffsetFromDates(at, srAnchor, srRef, scheduleTime, seq.taskType),
    };
  });

  const staffAssignment = mapStaffAssignment(seq, staffNames, now);
  const attempts = mapAttempts(seq, staffNames);
  const lmAssignSlots = mapLmAssignSlots(seq, now);
  const escalade = seq.escalade
    ? mapEscaladeView(seq.escalade, plan, seq.taskType, seqAnchors, now)
    : undefined;

  const baseTitle = labelForTaskTypeId(seq.taskType);
  const title = buildSequenceTitle(seq, baseTitle, atDisplay, typeCounts);

  const clientActionCompleted = Boolean(seq.clientActionCompleted);
  const clientChosenTime =
    seq.task?.payload?.selectedTime?.trim() ||
    seq.task?.payload?.time?.trim() ||
    seq.task?.payload?.declaredTime?.trim() ||
    undefined;

  const taskStatus = seq.task?.status;
  const registrationProgress =
    seq.taskType === 'registration' && seq.task?.payload
      ? (() => {
          const counts = registrationCountsFromPayload(
            seq.task.payload as Record<string, unknown>,
          );
          const total = counts.adults ?? 0;
          if (total <= 0) return undefined;
          return { registered: counts.nbreGuestValidated, total };
        })()
      : undefined;
  const status = deriveSequenceDisplayStatus({
    taskStatus,
    seqStatus: seq.status,
  });

  return {
    id: sequenceId || String(seq.taskId || seq.taskType),
    taskId: String(seq.taskId || ''),
    taskType: seq.taskType,
    title,
    icon: String(icon),
    status,
    atDisplay,
    range,
    planStep,
    relances,
    staffReminders,
    staffAssignment,
    attempts,
    lmAssignSlots,
    escalade,
    hasRelances: relances.length > 0,
    hasAssignation: Boolean(seq.assignation),
    hasLmAssignSlots: lmAssignSlots.length > 0,
    hasStaffReminders: staffReminders.length > 0,
    hasEscalade: Boolean(escalade),
    clientActionCompleted,
    clientChosenTime,
    taskStatus,
    registrationProgress,
  };
}

export function buildPlanViewModel(
  plan: FulltaskPlanDoc,
  staffNames: Record<string, string> = {},
  uiPlanListOrder?: string[],
): ReservationPlan {
  const events: PlanEvent[] = [];
  const now = new Date();
  const listOrder = uiPlanListOrder?.length ? uiPlanListOrder : plan.uiPlanListOrder;

  for (let messageIndex = 0; messageIndex < plan.messages.length; messageIndex++) {
    const m = plan.messages[messageIndex];
    if (isWorkflowRelanceMessage(m.label)) continue;

    const at = toDate(m.scheduledAt) || now;
    const status = eventStatusAt(at, m.status, now);
    const ch = mapCanal(m.canal);
    const messageCategory = inferMessageCategory(m.label);
    const planOrderKey =
      messageCategory === 'simple'
        ? messagePlanOrderKey(m.messageId, m.template)
        : inferWorkflowKeyFromRelanceLabel(m.label);
    const delivered = isAtomeSentStatus(m.status);
    const { lastDispatch, lastDispatchAttempt, dispatchLog } = mapDispatchLog(m.dispatchLog, {
      itemDelivered: delivered,
      sentAt: m.sentAt,
      fallbackChannel: ch === 'ota' ? 'OTA' : ch === 'email' ? 'email' : 'whatsapp',
    });
    events.push({
      id: `msg-${m.label}-${at.getTime()}`,
      kind: 'message' as PlanEventKind,
      status,
      title: m.label,
      description:
        messageCategory === 'relance'
          ? m.template
            ? `Relance liée · ${m.template}`
            : 'Relance liée à une séquence'
          : undefined,
      icon: ch === 'ota' ? '📧' : ch === 'email' ? '✉️' : '💬',
      at: at.toISOString(),
      atDisplay: formatWhen(at),
      channel: ch,
      template: m.template,
      messageSendStatus: m.status as PlanEvent['messageSendStatus'],
      channelMeta: m.sentAt ? `Envoyé · ${formatWhen(toDate(m.sentAt) || at)}` : undefined,
      planOrderKey,
      messageCategory,
      messageIndex,
      lastDispatch,
      lastDispatchAttempt,
      dispatchLog,
    });
  }

  const typeCounts = countSequencesByType(plan.sequences);

  for (const seq of plan.sequences) {
    const taskAnchorDate =
      toDate(seq.taskScheduledDate) ?? toDate(seq.task?.scheduledDate) ?? undefined;
    const seqAnchors = sequenceScheduleAnchors(seq, taskAnchorDate ?? undefined);
    const { start, atDisplay, range } = resolveSequenceTimelineDisplay(
      seq,
      plan,
      taskAnchorDate,
      now,
    );
    const status = eventStatusAt(start, seq.status, now);
    const icon = FULLTASK_TASK_TYPE_EMOJI[seq.taskType as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '⚙️';
    const baseTitle = labelForTaskTypeId(seq.taskType);
    const seqTitle = buildSequenceTitle(seq, baseTitle, atDisplay, typeCounts);
    const relances = seq.relances?.length
      ? seq.relances.map((r, i) => mapRelance(r, i, 'wa', 'rel'))
      : undefined;
    const staffReminders = seq.staffReminders?.length
      ? seq.staffReminders.map((r, i) => mapRelance(r, i, 'sms', 'staff'))
      : undefined;
    const attempts = mapAttempts(seq, staffNames);
    const staffAssignment = mapStaffAssignment(seq, staffNames, now);
    const sequenceFlow = buildSequenceFlow(seq, staffNames, now);
    const escalade = seq.escalade
      ? mapEscaladeView(seq.escalade, plan, seq.taskType, seqAnchors, now)
      : undefined;

    const futureParts: string[] = [];
    if (relances?.length) futureParts.push(`${relances.length} relance(s)`);
    if (attempts?.length) futureParts.push('assignation staff');
    if (staffReminders?.length) futureParts.push(`${staffReminders.length} rappel(s) staff`);
    if (escalade) futureParts.push('escalade');

    const seqEventKey = seq.taskId
      ? String(seq.taskId)
      : `${seq.taskType}-${start.getTime()}`;

    events.push({
      id: `seq-${seqEventKey}`,
      kind: 'sequence',
      status,
      planOrderKey: sequencePlanOrderKey(seq.taskType),
      title: seqTitle,
      description: staffAssignment
        ? staffAssignment.status === 'found'
          ? `Staff · ${staffAssignment.staffName || 'assigné'}${staffAssignment.autoAssign ? ' · auto-accept' : ''}`
          : staffAssignment.status === 'failed'
            ? 'Assignation · échec'
            : `Assignation · ${staffAssignment.windowStart} → ${staffAssignment.windowEnd} · ${staffAssignment.releaseWindows.join('/')}${staffAssignment.autoAssign ? ' · auto-accept' : ''}`
        : undefined,
      icon: String(icon),
      at: start.toISOString(),
      atDisplay,
      range,
      relances,
      staffReminders,
      attempts,
      staffAssignment,
      sequenceFlow,
      escalade,
      futureConfig: status === 'future' && futureParts.length ? futureParts.join(' · ') : undefined,
    });
  }

  const ordered = sortPlanEventsByListOrder(events, listOrder);
  const stepByTaskId = new Map<string, number>();
  for (const ev of ordered) {
    if (ev.kind === 'sequence' && ev.id.startsWith('seq-')) {
      stepByTaskId.set(ev.id.slice(4), ev.planStep ?? 0);
    }
  }

  const sequences = plan.sequences.map((seq, idx) => {
    const start =
      toDate(seq.assignation?.startAt) ||
      toDate(seq.relances[0]?.scheduledAt) ||
      now;
    const seqEventKey = seq.taskId
      ? String(seq.taskId)
      : `${seq.taskType}-${start.getTime()}-${idx}`;
    return buildSequenceView(
      seq,
      staffNames,
      stepByTaskId.get(seqEventKey),
      plan,
      now,
      typeCounts,
      seqEventKey,
    );
  });

  return {
    reservationId: plan.reservationId,
    ownerId: plan.ownerId,
    listingId: plan.listingId,
    orchestrationConfigSource: plan.orchestrationConfigSource,
    guestPhone: plan.guestPhone,
    guestName: plan.guestName,
    events: ordered,
    sequences,
    messages: ordered.filter((e) => e.kind === 'message'),
    auditLog: plan.auditLog ?? [],
  };
}

/** Code plan OS-XXXXXXXX */
export function planCodeDisplay(planCode: string | undefined): string {
  const ref = String(planCode ?? '').trim();
  if (!ref) return '—';
  return ref;
}

/** Numéro résa SJ-XXXXXXXX */
export function reservationRefDisplay(reference: string | undefined): string {
  const ref = String(reference ?? '').trim();
  if (!ref) return '—';
  return ref;
}

/** SJ-47070 = ancien code généré par fulltask ; vraies résas = SJ- + lettres/chiffres (8). */
export function isLegacyPlanOnlyRef(reference: string | undefined): boolean {
  const ref = String(reference ?? '').trim();
  return /^SJ-\d{4,6}$/i.test(ref);
}

export function formatDayLabel(iso: string, now = new Date()): { label: string; rel: string; today: boolean } {
  const d = new Date(iso);
  const today =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const label = today
    ? "AUJOURD'HUI"
    : `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  let rel = "aujourd'hui";
  if (diff === 1) rel = 'demain';
  else if (diff === -1) rel = 'hier';
  else if (diff > 1) rel = `dans ${diff} j`;
  else if (diff < -1) rel = `il y a ${-diff} j`;
  return { label, rel, today };
}

export type ProgressSegmentKind = 'done' | 'now' | 'todo' | 'blocked';

export function buildProgressSegments(events: PlanEvent[]): { kind: ProgressSegmentKind; flex: number }[] {
  if (!events.length) return [{ kind: 'todo', flex: 1 }];
  return events.map((ev) => {
    let kind: ProgressSegmentKind = 'todo';
    if (ev.status === 'done') kind = 'done';
    else if (ev.status === 'now' || ev.status === 'pending') kind = 'now';
    else if (ev.status === 'blocked') kind = 'blocked';
    return { kind, flex: 1 };
  });
}
