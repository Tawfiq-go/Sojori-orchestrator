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

export function anchorDateForScheduleRef(
  plan: PlanAnchorDates,
  ref: string,
  taskScheduledDate?: Date | string | null,
): Date | undefined {
  const r = normalizeScheduleRef(ref);
  if (r === 'scheduledDate') {
    if (taskScheduledDate) return new Date(taskScheduledDate);
    return undefined;
  }
  if (r === 'checkout') {
    const d = plan.checkOut;
    return d ? new Date(d) : undefined;
  }
  if (r === 'booking_created') {
    const d = plan.bookingCreatedAt;
    return d ? new Date(d) : undefined;
  }
  const d = plan.checkIn;
  return d ? new Date(d) : undefined;
}

/** Libellé config orchestration : J-3 · check-in · 09:00 */
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
