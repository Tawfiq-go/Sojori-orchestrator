import type { ScheduledOrchestrationMessage, Workflow } from '../staff-design/types';

export type TimelineEventKind =
  | 'anchor'
  | 'assignment'
  | 'assignment_end'
  | 'reminder'
  | 'planned_message'
  | 'deadline'
  | 'completion';

export interface TimelineEvent {
  kind: TimelineEventKind;
  sortKey: number;
  dayLabel: string;
  refLine: string;
  time?: string;
  title: string;
  description?: string;
  windows?: string[];
}

const REF_API_LABEL: Record<string, string> = {
  checkin: 'CHECKIN',
  checkout: 'CHECKOUT',
  booking_created: 'BOOKING',
  task_created: 'TASK',
  scheduledDate: 'SCHEDULED',
  check_in: 'CHECKIN',
  check_out: 'CHECKOUT',
  reservation_date: 'BOOKING',
  previous_step_done: 'SCHEDULED',
};

function refLabel(ref?: string): string {
  if (!ref) return 'CHECKIN';
  return REF_API_LABEL[ref] || String(ref).toUpperCase();
}

export function formatDayLabel(day: number): string {
  if (day === 0) return 'J';
  return day > 0 ? `J+${day}` : `J${day}`;
}

function formatRefLine(ref: string, day: number, time?: string): string {
  const d = day > 0 ? `+${day}` : String(day);
  const base = `${formatDayLabel(day)} · ${refLabel(ref)} ${d}`;
  return time ? `${base} · ${time}` : base;
}

function timeToSort(ref: string, day: number, time?: string): number {
  let minutes = day * 24 * 60;
  if (time && /^\d{1,2}:\d{2}/.test(time)) {
    const [h, m] = time.split(':').map(Number);
    minutes += (h || 0) * 60 + (m || 0);
  }
  return minutes;
}

function pushEvent(events: TimelineEvent[], event: TimelineEvent) {
  events.push(event);
}

function sortEvents(events: TimelineEvent[]): TimelineEvent[] {
  return [...events].sort((a, b) => a.sortKey - b.sortKey);
}

const ARRIVAL_TYPES = new Set([
  'arrival_choose',
  'arrival_declare',
  'departure_choose',
  'departure_declare',
  'registration',
]);

function completionCopy(taskTypeId?: string): { title: string; description: string } {
  if (taskTypeId === 'departure_choose' || taskTypeId === 'departure_declare') {
    return {
      title: 'Départ voyageur',
      description: 'Tâche complétée si tout s\'est bien passé',
    };
  }
  if (taskTypeId === 'registration') {
    return {
      title: 'Enregistrement validé',
      description: 'Tâche complétée si tout s\'est bien passé',
    };
  }
  return {
    title: 'Arrivée voyageur',
    description: 'Tâche complétée si tout s\'est bien passé',
  };
}

type TimeRefLike = { ref?: string; day?: number; time?: string; hours?: number };

function pushAssignmentRange(
  events: TimelineEvent[],
  staff: {
    startAt?: TimeRefLike;
    endAt?: TimeRefLike;
    windows?: string[];
  },
  primaryRef: string,
  endFallback?: TimeRefLike | null,
) {
  if (!staff?.startAt) return;

  const startDay = staff.startAt.day ?? -7;
  const startRef = staff.startAt.ref || primaryRef;
  const startTime = staff.startAt.time || '09:00';
  const windows = staff.windows?.length ? staff.windows : ['09:00', '11:00', '15:00', '19:00'];

  pushEvent(events, {
    kind: 'assignment',
    sortKey: timeToSort(startRef, startDay, startTime),
    dayLabel: formatDayLabel(startDay),
    refLine: formatRefLine(startRef, startDay, startTime),
    title: 'Assignation staff · début',
    description: 'Le système commence à tenter d\'assigner aux fenêtres :',
    windows,
  });

  const endRef = staff.endAt ?? endFallback ?? {
    ref: startRef,
    day: (startDay ?? -7) + 7,
    time: '23:59',
  };
  const endDay = endRef.day ?? 0;
  const endR = endRef.ref || startRef;
  const endTime = endRef.time || '23:59';

  pushEvent(events, {
    kind: 'assignment_end',
    sortKey: timeToSort(endR, endDay, endTime),
    dayLabel: formatDayLabel(endDay),
    refLine: formatRefLine(endR, endDay, endTime),
    title: 'Assignation staff · fin',
    description: 'Dernière fenêtre de recherche staff (avant escalade si configurée)',
  });
}

/** Construit la timeline à partir du format API srv-fulltask. */
export function buildTimelineFromApiWorkflow(
  workflow: Record<string, unknown> | null | undefined,
  taskTypeId?: string,
): TimelineEvent[] {
  if (!workflow) return [];

  const events: TimelineEvent[] = [];
  const primaryRef =
    ((workflow.deadline as { ref?: string })?.ref ||
      (workflow.staffAssignment as { startAt?: { ref?: string } })?.startAt?.ref ||
      (workflow.reminders as { ref?: string }[])?.[0]?.ref ||
      'checkin') as string;

  if (ARRIVAL_TYPES.has(taskTypeId || String(workflow.type || ''))) {
    const anchorDay = -30;
    pushEvent(events, {
      kind: 'anchor',
      sortKey: timeToSort(primaryRef, anchorDay),
      dayLabel: formatDayLabel(anchorDay),
      refLine: formatRefLine(primaryRef, anchorDay),
      title: 'Réservation créée',
      description: 'Point d\'ancrage initial',
    });
  }

  const staff = workflow.staffAssignment as {
    startAt?: TimeRefLike;
    endAt?: TimeRefLike;
    windows?: string[];
  } | null;
  pushAssignmentRange(
    events,
    staff ?? {},
    primaryRef,
    workflow.deadline as TimeRefLike | null,
  );

  const reminders =
    (workflow.reminders as { ref?: string; day?: number; time?: string; hours?: number }[]) || [];
  reminders.forEach((r, i) => {
    const ref = r.ref || primaryRef;
    const useHours = r.hours !== undefined && r.hours !== null;
    const day = useHours ? 0 : (r.day ?? 0);
    const time = r.time || '09:00';
    const n = i + 1;
    const isLast = i === reminders.length - 1;
    const refLine = useHours
      ? `${refLabel(ref)} +${r.hours}h`
      : formatRefLine(ref, day, time);
    const sortKey = useHours ? (r.hours ?? 0) * 60 : timeToSort(ref, day, time);
    pushEvent(events, {
      kind: 'reminder',
      sortKey,
      dayLabel: useHours ? `+${r.hours}h` : formatDayLabel(day),
      refLine,
      title: isLast ? `Relance voyageur #${n} · dernière` : `Relance voyageur #${n}`,
      description:
        n === 1 && taskTypeId === 'arrival_choose'
          ? 'Bonjour, à quelle heure souhaitez-vous arriver ?'
          : undefined,
    });
  });

  const deadline = workflow.deadline as TimeRefLike | null;
  if (deadline) {
    const day = deadline.day ?? -1;
    const ref = deadline.ref || primaryRef;
    const time = deadline.time || '14:00';
    pushEvent(events, {
      kind: 'deadline',
      sortKey: timeToSort(ref, day, time),
      dayLabel: formatDayLabel(day),
      refLine: formatRefLine(ref, day, time),
      title: 'DEADLINE · escalade admin',
      description: 'Notification immédiate PM (admin)',
    });
  }

  const done = completionCopy(taskTypeId || String(workflow.type || ''));
  pushEvent(events, {
    kind: 'completion',
    sortKey: timeToSort(primaryRef, 0),
    dayLabel: 'J',
    refLine: `${formatDayLabel(0)} · ${refLabel(primaryRef)}`,
    title: done.title,
    description: done.description,
  });

  return sortEvents(events);
}

export const UI_REF_TO_API: Record<string, string> = {
  check_in: 'checkin',
  check_out: 'checkout',
  reservation_date: 'booking_created',
  task_created: 'task_created',
  previous_step_done: 'scheduledDate',
};

function anchorTitleForRef(apiRef: string): string {
  if (apiRef === 'booking_created') return 'Réservation créée';
  if (apiRef === 'checkin') return 'Date d\'arrivée (check-in)';
  if (apiRef === 'checkout') return 'Date de départ (check-out)';
  return `Référence · ${refLabel(apiRef)}`;
}

/** Timeline message plan résa (Bienvenu, Comment ça va, etc.). */
export function buildTimelineFromScheduledRule(
  rule: ScheduledOrchestrationMessage | null | undefined,
  opts?: { catalogLabel?: string },
): TimelineEvent[] {
  if (!rule) return [];

  const events: TimelineEvent[] = [];
  const apiRef = UI_REF_TO_API[rule.trigger.reference] || rule.trigger.reference;
  const label = rule.label || opts?.catalogLabel || rule.catalogMessageId;

  pushEvent(events, {
    kind: 'anchor',
    sortKey: 0,
    dayLabel: 'J',
    refLine: `${refLabel(apiRef)} · J`,
    title: anchorTitleForRef(apiRef),
    description: 'Point d\'ancrage du déclencheur',
  });

  const { delay, time } = rule.trigger;
  let sortKey: number;
  let refLine: string;
  let dayLabel: string;

  if (delay.unit === 'hours') {
    const h = delay.value ?? 0;
    sortKey = h * 60;
    dayLabel = `+${h}h`;
    refLine = `${refLabel(apiRef)} +${h}h`;
  } else {
    const day = delay.value ?? 0;
    const t = time || '10:00';
    sortKey = timeToSort(apiRef, day, t);
    dayLabel = formatDayLabel(day);
    refLine = formatRefLine(apiRef, day, t);
  }

  const sendMode =
    rule.deliveryChannel === 'whatsapp'
      ? 'WhatsApp (template Meta)'
      : 'Message · OTA ou email selon la réservation';

  pushEvent(events, {
    kind: 'planned_message',
    sortKey,
    dayLabel,
    refLine,
    time: delay.unit === 'days' ? time : undefined,
    title: `Envoi message · ${label}`,
    description: `${sendMode} · plan réservation (pas de tâche)`,
  });

  return sortEvents(events);
}

/** Timeline depuis carte Workflow (page orchestration config). */
export function buildTimelineFromDesignWorkflow(
  workflow: Workflow | null | undefined,
  taskTypeId?: string,
): TimelineEvent[] {
  if (!workflow) return [];

  const assignRef = workflow.assignment
    ? UI_REF_TO_API[workflow.assignment.reference] || workflow.assignment.reference
    : 'checkin';
  const apiShape: Record<string, unknown> = {
    type: workflow.taskTypeId || workflow.kind,
    reminders: workflow.relances.map((r) =>
      r.delay?.unit === 'hours'
        ? {
            ref: UI_REF_TO_API[r.reference] || r.reference,
            hours: r.delay?.value ?? 0,
          }
        : {
            ref: UI_REF_TO_API[r.reference] || r.reference,
            day: r.delay?.value ?? 0,
            time: r.time || '09:00',
          },
    ),
    staffAssignment: workflow.assignment
      ? {
          startAt:
            workflow.assignment.windowStart?.unit === 'hours'
              ? { ref: assignRef, hours: workflow.assignment.windowStart?.value ?? 0 }
              : {
                  ref: assignRef,
                  day: workflow.assignment.windowStart?.value ?? -7,
                  time: workflow.assignment.windowStart?.time || '09:00',
                },
          endAt:
            workflow.assignment.windowEnd?.unit === 'hours'
              ? { ref: assignRef, hours: workflow.assignment.windowEnd?.value ?? 0 }
              : {
                  ref: assignRef,
                  day: workflow.assignment.windowEnd?.value ?? 0,
                  time: workflow.assignment.windowEnd?.time || '23:00',
                },
          windows: ['09:00', '11:00', '15:00', '19:00'],
        }
      : null,
    deadline:
      workflow.escalationEnabled !== false && workflow.deadline
        ? workflow.deadline.delay?.unit === 'hours'
          ? {
              ref: UI_REF_TO_API[workflow.deadline.reference] || workflow.deadline.reference,
              hours: workflow.deadline.delay?.value ?? 0,
            }
          : {
              ref: UI_REF_TO_API[workflow.deadline.reference] || workflow.deadline.reference,
              day: workflow.deadline.delay?.value ?? -1,
              time: workflow.deadline.time || '14:00',
            }
        : null,
  };

  return buildTimelineFromApiWorkflow(apiShape, taskTypeId || workflow.taskTypeId);
}
