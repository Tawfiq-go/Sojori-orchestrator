/** Jour prévu affiché en liste / planning quand scheduledDate n’est pas encore renseigné. */

function toDayIso(d: Date | string | undefined): string | undefined {
  if (!d) return undefined;
  const s = typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
}

function dayToIso(day: string): string {
  return new Date(`${day}T00:00:00.000Z`).toISOString();
}

export interface ReservationDatesLike {
  arrivalDate?: Date | string;
  departureDate?: Date | string;
  checkIn?: Date | string;
  checkOut?: Date | string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

function normalizeHm(raw: unknown): string | undefined {
  const s = String(raw ?? '').trim();
  if (!s) return undefined;
  const m = /^(\d{1,2})(?::(\d{2}))?/.exec(s);
  if (!m) return undefined;
  const h = Number(m[1]);
  if (h > 23) return undefined;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}

const ARRIVAL_TYPES = new Set(['registration', 'arrival_choose', 'arrival_declare']);
const DEPARTURE_TYPES = new Set(['departure_choose', 'departure_declare']);
const CLEANING_TYPES = new Set(['cleaning_free', 'cleaning_paid', 'cleaning_sojori']);

/**
 * Heure métier de la tâche (HH:mm) — même cascade que srv-fulltask
 * (assignmentService.extractTaskTimeHm) : scheduledAt (choix guest), sinon
 * payload.time/declaredTime/selectedTime, sinon heure voyageur de la résa
 * (arrivée / départ selon le type). undefined si aucune heure connue.
 */
export function inferTaskPlannedTimeHm(
  task: Record<string, unknown>,
  reservation?: ReservationDatesLike,
): string | undefined {
  const fromScheduled = normalizeHm(task.scheduledAt);
  if (fromScheduled) return fromScheduled;

  const payload = (task.payload || {}) as Record<string, unknown>;
  const fromPayload =
    normalizeHm(payload.time) ||
    normalizeHm(payload.declaredTime) ||
    normalizeHm(payload.selectedTime);
  if (fromPayload) return fromPayload;

  const type = String(task.type || '');
  if (ARRIVAL_TYPES.has(type)) return normalizeHm(reservation?.checkInTime);
  if (DEPARTURE_TYPES.has(type) || CLEANING_TYPES.has(type)) {
    return normalizeHm(reservation?.checkOutTime);
  }
  return undefined;
}

export function inferTaskPlannedDay(
  task: Record<string, unknown>,
  reservation?: ReservationDatesLike,
): string | undefined {
  const scheduled = task.scheduledDate || task.dueAt;
  if (scheduled) {
    return toDayIso(String(scheduled));
  }

  const type = String(task.type || '');
  const payload = (task.payload || {}) as Record<string, unknown>;
  const checkIn =
    toDayIso(payload.checkIn as string) ||
    toDayIso(payload.arrivalDate as string) ||
    toDayIso(reservation?.arrivalDate) ||
    toDayIso(reservation?.checkIn);
  const checkOut =
    toDayIso(payload.checkOut as string) ||
    toDayIso(payload.departureDate as string) ||
    toDayIso(reservation?.departureDate) ||
    toDayIso(reservation?.checkOut);

  if (
    type === 'registration' ||
    type === 'arrival_choose' ||
    type === 'arrival_declare'
  ) {
    return checkIn;
  }
  if (type === 'departure_choose' || type === 'departure_declare') {
    return checkOut;
  }
  if (type === 'cleaning_free' || type === 'cleaning_paid') {
    const payloadDate = payload.date ? toDayIso(String(payload.date)) : undefined;
    const slots = payload.slots as { date?: string }[] | undefined;
    const slotDay = slots?.[0]?.date ? toDayIso(slots[0].date) : undefined;
    return payloadDate || slotDay || checkIn;
  }

  return checkIn || checkOut;
}

export function inferTaskPlannedIso(
  task: Record<string, unknown>,
  reservation?: ReservationDatesLike,
): string | undefined {
  const day = inferTaskPlannedDay(task, reservation);
  if (!day) return undefined;
  // ISO local avec l'heure métier quand elle est connue — minuit UTC sinon
  // (les vues qui n'affichent que le jour font .slice(0, 10) dans les 2 cas).
  const hm = inferTaskPlannedTimeHm(task, reservation);
  return hm ? `${day}T${hm}:00` : dayToIso(day);
}
