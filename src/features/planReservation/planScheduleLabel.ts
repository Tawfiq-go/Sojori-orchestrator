const REF_LABELS: Record<string, string> = {
  checkin: 'check-in',
  check_in: 'check-in',
  checkout: 'check-out',
  check_out: 'check-out',
  booking_created: 'création résa',
  reservation_date: 'création résa',
  scheduledDate: 'date tâche',
  previous_step_done: 'date tâche',
  task_created: 'création tâche',
};

/** Référence planning par défaut selon le type de tâche (aligné srv-fulltask). */
export function defaultScheduleRefForTaskType(taskType: string): string {
  const t = taskType.toLowerCase();
  if (t === 'cleaning_free' || t === 'cleaning_paid') return 'scheduledDate';
  if (
    t === 'transport' ||
    t === 'groceries' ||
    t === 'concierge' ||
    t === 'checkout_cleaning'
  ) {
    return 'scheduledDate';
  }
  if (
    t === 'departure_choose' ||
    t === 'departure_declare'
  ) {
    return 'checkout';
  }
  if (t === 'support' || t === 'service_client') return 'task_created';
  return 'checkin';
}

export function normalizeScheduleRef(ref?: string | null, taskType?: string): string {
  const r = String(ref || '').trim().toLowerCase();
  if (r === 'check_out') return 'checkout';
  if (r === 'check_in') return 'checkin';
  if (r === 'previous_step_done' || r === 'scheduleddate') return 'scheduledDate';
  if (r === 'reservation_date') return 'booking_created';
  if (r) return r;
  return defaultScheduleRefForTaskType(taskType || '');
}

export type PlanAnchorDates = {
  checkIn?: Date | string;
  checkOut?: Date | string;
  bookingCreatedAt?: Date | string;
};

export type SequenceScheduleAnchors = {
  taskScheduledDate?: Date | string | null;
  taskCreatedAt?: Date | string | null;
};

function toAnchorDate(v: Date | string | null | undefined): Date | undefined {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export function anchorDateForScheduleRef(
  plan: PlanAnchorDates,
  ref: string,
  seqAnchors?: SequenceScheduleAnchors | null,
): Date | undefined {
  const r = normalizeScheduleRef(ref);
  const taskScheduledDate = seqAnchors?.taskScheduledDate;
  const taskCreatedAt = seqAnchors?.taskCreatedAt;

  if (r === 'scheduledDate') {
    return toAnchorDate(taskScheduledDate);
  }
  if (r === 'task_created') {
    return toAnchorDate(taskCreatedAt);
  }
  if (r === 'checkout') {
    return toAnchorDate(plan.checkOut);
  }
  if (r === 'booking_created') {
    return toAnchorDate(plan.bookingCreatedAt);
  }
  if (r === 'checkin') {
    return toAnchorDate(plan.checkIn);
  }
  return toAnchorDate(plan.checkIn);
}

/** Ancre pour libellés J±N quand scheduleDay manque (plans legacy). */
export function resolveScheduleAnchorDate(
  plan: PlanAnchorDates,
  ref: string,
  seqAnchors?: SequenceScheduleAnchors | null,
  scheduledAt?: Date | string | null,
): Date | undefined {
  const normalized = normalizeScheduleRef(ref);
  const fromRef = anchorDateForScheduleRef(plan, ref, seqAnchors);
  if (fromRef) return fromRef;
  return toAnchorDate(scheduledAt);
}

/** Libellé config orchestration : J-3 · date tâche · 09:00 */
export function formatScheduleOffset(
  day?: number | null,
  ref?: string | null,
  time?: string | null,
  taskType?: string,
): string | undefined {
  if (day === undefined || day === null || Number.isNaN(day)) return undefined;
  const refLabel = REF_LABELS[normalizeScheduleRef(ref, taskType)] || ref || 'réf.';
  const j = day === 0 ? 'J0' : day < 0 ? `J${day}` : `J+${day}`;
  const t = time?.trim();
  return t ? `${j} · ${refLabel} · ${t}` : `${j} · ${refLabel}`;
}

/** Fallback plans créés avant scheduleDay en base. */
export function inferScheduleOffsetFromDates(
  scheduledAt: Date,
  anchor: Date,
  ref?: string | null,
  time?: string | null,
  taskType?: string,
): string | undefined {
  const s = new Date(scheduledAt);
  const a = new Date(anchor);
  s.setHours(12, 0, 0, 0);
  a.setHours(12, 0, 0, 0);
  const day = Math.round((s.getTime() - a.getTime()) / 86400000);
  return formatScheduleOffset(day, ref, time, taskType);
}
