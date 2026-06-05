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
  anchorDateForScheduleRef,
  formatScheduleOffset,
  inferScheduleOffsetFromDates,
  normalizeScheduleRef,
} from './planScheduleLabel';

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
      attempts: Array<{ window: string; tried: boolean; found: boolean }>;
      autoAssign?: boolean;
      assignmentHoursMode?: 'planning' | 'always';
      findAnotherStaff?: boolean;
      acceptToleranceHours?: number;
      releaseWindows?: string[];
    } | null;
    escalade?: {
      scheduledAt: string | Date;
      status: 'en_attente' | 'declenchee' | 'resolue';
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

function eventStatusAt(scheduled: Date, raw: string, now = new Date()): EventStatus {
  if (raw === 'termine' || raw === 'envoye') return 'done';
  if (raw === 'saute' || raw === 'echec' || raw === 'bloque') return 'blocked';
  if (raw === 'en_cours' || raw === 'declenchee') return 'now';
  if (scheduled.getTime() > now.getTime()) return 'future';
  if (scheduled.getTime() < now.getTime() - 3600000) return 'pending';
  return 'now';
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
  options?: { itemDelivered?: boolean },
) {
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
  const raw = r.status as PlanGuestRelanceItem['rawStatus'];
  const isFuture = due.getTime() > now.getTime();

  let executionStatus: RelanceExecutionStatus;
  if (raw === 'envoyee') executionStatus = 'envoyee';
  else if (raw === 'echec') executionStatus = 'echec';
  else if (raw === 'saute') executionStatus = 'sautee';
  else if (isFuture) executionStatus = 'prevision';
  else if (raw === 'en_attente' && !isFuture) executionStatus = 'en_retard';  // ✅ BUG FIX #2
  else executionStatus = 'en_attente';

  let status: RelanceStatus = 'scheduled';
  if (executionStatus === 'envoyee') status = 'sent';
  else if (executionStatus === 'sautee' || executionStatus === 'echec') status = 'skipped';

  const { lastDispatch, lastDispatchAttempt, dispatchLog } = mapDispatchLog(r.dispatchLog, {
    itemDelivered: raw === 'envoyee',
  });

  return {
    id: `${idPrefix}-${i}`,
    step: i + 1,
    status,
    dueAt: formatWhen(due),
    label: r.label,
    channel,
    executionStatus,
    rawStatus: raw,
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
  if (raw === 'envoyee' || raw === 'envoye') return eventStatusAt(scheduled, 'envoye', now);
  if (raw === 'saute' || raw === 'echec') return 'blocked';
  return eventStatusAt(scheduled, 'en_attente', now);
}

function mapAssignStatus(
  scheduled: Date,
  raw: 'en_recherche' | 'trouvee' | 'echec',
  now = new Date(),
): EventStatus {
  if (raw === 'trouvee') return 'done';
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
): string {
  if (status === 'found' && staffName) {
    return `Staff assigné · ${staffName}`;
  }
  if (status === 'failed' || now.getTime() >= end.getTime()) {
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
    a.status === 'trouvee' ? 'found' : a.status === 'echec' ? 'failed' : 'searching';

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
    toleranceLabel: autoAssign ? undefined : `${a.acceptToleranceHours ?? 3} h`,
    slotsLabel: releaseWindows.join(' / '),
    nextAssignmentLabel: computeNextAssignmentLabel(
      start,
      end,
      releaseWindows,
      now,
      status,
      staffName,
    ),
    staffName,
    windowPast: end.getTime() <= now.getTime(),
  };
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
      status: mapRelanceStatus(end, a.status === 'trouvee' ? 'envoyee' : 'en_attente', now),
      detail: a.autoAssign
        ? 'Auto-accept actif'
        : `Acceptation sous ${a.acceptToleranceHours ?? 3} h si staff proposé`,
    });
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
    items.push({
      id: 'escalade',
      phase: 'escalade',
      sortAt: at.toISOString(),
      title: 'Escalade PM',
      when: formatWhen(at),
      status: mapRelanceStatus(
        at,
        seq.escalade.status === 'declenchee' ? 'envoyee' : 'en_attente',
        now,
      ),
      detail:
        seq.escalade.status === 'declenchee'
          ? 'Escalade déclenchée'
          : 'Si tâche non confirmée avant deadline',
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
  return seq.assignation.attempts.map((a, i) => {
    let result: AttemptResult = 'pending';
    if (a.found) result = 'accepted';
    else if (a.tried && !a.found) result = 'declined';
    const staffId = seq.assignation?.staffId ? String(seq.assignation.staffId) : '';
    return {
      id: `att-${i}`,
      step: i + 1,
      triedAt: a.window,
      staffName: staffNames[staffId] || (staffId ? `Staff ${staffId.slice(-4)}` : '—'),
      staffRole: 'Staff',
      result,
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
  cleaningFreeCount = 1,
  sequenceId = '',
): PlanSequenceView {
  const start = toDate(seq.assignation?.startAt) || toDate(seq.relances[0]?.scheduledAt) || now;
  const end = toDate(seq.assignation?.endAt);
  const status = eventStatusAt(start, seq.status, now);
  const icon =
    FULLTASK_TASK_TYPE_EMOJI[seq.taskType as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '⚙️';

  const taskAnchorDate = toDate(seq.taskScheduledDate) ?? undefined;
  const relances: PlanGuestRelanceItem[] = (seq.relances ?? []).map((r, i) => {
    const at = toDate(r.scheduledAt) || now;
    const m = mapRelanceExecution(r, i, 'wa', 'rel', now);
    const meta = catalogMetaForSequenceRelance(plan, seq, at, r.label);
    const scheduleRef = normalizeScheduleRef(r.scheduleRef, seq.taskType);
    const anchor =
      anchorDateForScheduleRef(plan, scheduleRef, taskAnchorDate) ||
      toDate(
        scheduleRef === 'checkout'
          ? plan.checkOut
          : scheduleRef === 'scheduledDate'
            ? taskAnchorDate
            : plan.checkIn,
      ) ||
      at;
    return {
      ...m,
      relanceIndex: i,
      channel: meta.catalogChannel ?? m.channel,
      catalogTemplate: meta.catalogTemplate,
      scheduleOffsetLabel:
        formatScheduleOffset(r.scheduleDay, scheduleRef, r.scheduleTime, seq.taskType) ??
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
    const srAnchor =
      anchorDateForScheduleRef(plan, srRef, taskAnchorDate) ||
      toDate(
        srRef === 'checkout'
          ? plan.checkOut
          : srRef === 'scheduledDate'
            ? taskAnchorDate
            : plan.checkIn,
      ) ||
      at;
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
  const escRef = normalizeScheduleRef(seq.escalade?.scheduleRef, seq.taskType);
  const escAnchor =
    anchorDateForScheduleRef(plan, escRef, taskAnchorDate) ||
    toDate(
      escRef === 'checkout'
        ? plan.checkOut
        : escRef === 'scheduledDate'
          ? taskAnchorDate
          : plan.checkIn,
    ) ||
    now;
  const escalade = seq.escalade
    ? {
        scheduled: seq.escalade.status === 'en_attente',
        dueAt: formatWhen(toDate(seq.escalade.scheduledAt) || now),
        scheduleOffsetLabel:
          formatScheduleOffset(
            seq.escalade.scheduleDay,
            escRef,
            seq.escalade.scheduleTime,
            seq.taskType,
          ) ??
          inferScheduleOffsetFromDates(
            toDate(seq.escalade.scheduledAt) || now,
            escAnchor,
            escRef,
            seq.escalade.scheduleTime,
            seq.taskType,
          ),
        description:
          seq.escalade.status === 'declenchee'
            ? 'Escalade PM déclenchée'
            : 'Escalade PM si non confirmé avant deadline',
      }
    : undefined;

  const baseTitle = labelForTaskTypeId(seq.taskType);
  const title =
    seq.taskType === 'cleaning_free' && cleaningFreeCount > 1
      ? `${baseTitle} · ${formatWhen(start)}`
      : baseTitle;

  return {
    id: sequenceId || String(seq.taskId || seq.taskType),
    taskId: String(seq.taskId || ''),
    taskType: seq.taskType,
    title,
    icon: String(icon),
    status,
    atDisplay: formatWhen(start),
    range: formatRange(start, end),
    planStep,
    relances,
    staffReminders,
    staffAssignment,
    attempts,
    escalade,
    hasRelances: relances.length > 0,
    hasAssignation: Boolean(seq.assignation),
    hasStaffReminders: staffReminders.length > 0,
    hasEscalade: Boolean(escalade),
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
    const delivered = m.status === 'envoye';
    const { lastDispatch, lastDispatchAttempt, dispatchLog } = mapDispatchLog(m.dispatchLog, {
      itemDelivered: delivered,
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

  const cleaningFreeCount = plan.sequences.filter((s) => s.taskType === 'cleaning_free').length;

  for (const seq of plan.sequences) {
    const start = toDate(seq.assignation?.startAt) || toDate(seq.relances[0]?.scheduledAt) || now;
    const end = toDate(seq.assignation?.endAt);
    const status = eventStatusAt(start, seq.status, now);
    const icon = FULLTASK_TASK_TYPE_EMOJI[seq.taskType as keyof typeof FULLTASK_TASK_TYPE_EMOJI] || '⚙️';
    const baseTitle = labelForTaskTypeId(seq.taskType);
    const seqTitle =
      seq.taskType === 'cleaning_free' && cleaningFreeCount > 1
        ? `${baseTitle} · ${formatWhen(start)}`
        : baseTitle;
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
      ? {
          scheduled: seq.escalade.status === 'en_attente',
          dueAt: formatWhen(toDate(seq.escalade.scheduledAt) || now),
          description:
            seq.escalade.status === 'declenchee'
              ? 'Escalade PM déclenchée'
              : 'Escalade PM si non confirmé avant deadline',
        }
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
      atDisplay: formatWhen(start),
      range: formatRange(start, end),
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
      cleaningFreeCount,
      seqEventKey,
    );
  });

  return {
    reservationId: plan.reservationId,
    ownerId: plan.ownerId,
    listingId: plan.listingId,
    orchestrationConfigSource: plan.orchestrationConfigSource,
    events: ordered,
    sequences,
    messages: ordered.filter((e) => e.kind === 'message'),
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
