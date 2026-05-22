import moment from 'moment';

/** Fenêtre visible vue multi (jours) */
export const MULTI_VISIBLE_DAYS = 31;

/** Jours passés gardés en base active (srv-calendar) — au-delà : InventoryArchive */
export const INVENTORY_PAST_RETENTION_DAYS = 10;

/** Horizon futur inventaire actif (aligné srv-calendar INVENTORY_ROLLING_FUTURE_HORIZON_DAYS) */
export const INVENTORY_FUTURE_HORIZON_DAYS = 1095;

export const CALENDAR_HORIZON_YEARS = 3;

export const CALENDAR_HORIZON_MESSAGE =
  `Le calendrier inventaire est géré sur ${CALENDAR_HORIZON_YEARS} ans à partir d'aujourd'hui.`;

function startOfDayLocal(d: Date = new Date()): Date {
  const x = d instanceof Date && !Number.isNaN(d.getTime()) ? d : new Date();
  return new Date(x.getFullYear(), x.getMonth(), x.getDate());
}

function addDaysLocal(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfDayLocal(x);
}

/** Normalise Date native, timestamp ou Moment → Date locale début de jour. */
export function toLocalDate(d?: Date | moment.Moment | string | number | null): Date {
  if (d == null) return startOfDayLocal();
  if (moment.isMoment(d)) return startOfDayLocal(d.toDate());
  if (d instanceof Date) return startOfDayLocal(d);
  const parsed = new Date(d);
  return Number.isNaN(parsed.getTime()) ? startOfDayLocal() : startOfDayLocal(parsed);
}

/** Bornes navigables (pivot = début de la fenêtre visible). */
export function getCalendarWindowBounds() {
  const today = startOfDayLocal();
  const horizonEnd = addDaysLocal(today, INVENTORY_FUTURE_HORIZON_DAYS);
  const maxPivotStart = addDaysLocal(horizonEnd, -(MULTI_VISIBLE_DAYS - 1));
  return { today, horizonEnd, maxPivotStart };
}

export function clampPivotDate(d?: Date | moment.Moment | string | number | null): Date {
  const { maxPivotStart } = getCalendarWindowBounds();
  const day = toLocalDate(d);
  if (day.getTime() > maxPivotStart.getTime()) return maxPivotStart;
  return day;
}

export function isPivotWithinWindow(d?: Date | moment.Moment | string | number | null): boolean {
  const { maxPivotStart } = getCalendarWindowBounds();
  return toLocalDate(d).getTime() <= maxPivotStart.getTime();
}

export function isAtHorizonEnd(pivot?: Date | moment.Moment | string | number | null): boolean {
  const { maxPivotStart } = getCalendarWindowBounds();
  return toLocalDate(pivot).getTime() >= maxPivotStart.getTime();
}

export function formatHorizonEndLabel(): string {
  const { horizonEnd } = getCalendarWindowBounds();
  return horizonEnd.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** Calcule la plage API pour couvrir la vue multi + le mois courant (vue simple). */
export function computeInventoryFetchRange(pivot: moment.Moment): { from: string; to: string } {
  const { horizonEnd } = getCalendarWindowBounds();
  const maxEnd = moment(horizonEnd);
  const multiFrom = pivot.clone().startOf('day');
  let multiTo = pivot.clone().add(MULTI_VISIBLE_DAYS - 1, 'days').endOf('day');
  if (multiTo.isAfter(maxEnd)) multiTo = maxEnd.clone().endOf('day');
  const monthFrom = pivot.clone().startOf('month');
  let monthTo = pivot.clone().endOf('month');
  if (monthTo.isAfter(maxEnd)) monthTo = maxEnd.clone().endOf('month');
  const from = moment.min(multiFrom, monthFrom).format('YYYY-MM-DD');
  const to = moment.max(multiTo, monthTo).format('YYYY-MM-DD');
  const cappedTo = moment.min(moment(to), maxEnd).format('YYYY-MM-DD');
  return { from, to: cappedTo };
}
