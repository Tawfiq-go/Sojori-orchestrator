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
  if (type === 'cleaning_free') {
    const slots = payload.slots as { date?: string }[] | undefined;
    const slotDay = slots?.[0]?.date ? toDayIso(slots[0].date) : undefined;
    return slotDay || checkIn;
  }

  return checkIn || checkOut;
}

export function inferTaskPlannedIso(
  task: Record<string, unknown>,
  reservation?: ReservationDatesLike,
): string | undefined {
  const day = inferTaskPlannedDay(task, reservation);
  return day ? dayToIso(day) : undefined;
}
