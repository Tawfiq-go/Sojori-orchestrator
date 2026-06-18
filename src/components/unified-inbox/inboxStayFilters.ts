/** Filtres rapides arrivée / départ (OTA + WhatsApp guest). */
export type StayQuickFilter =
  | 'none'
  | 'arr_today'
  | 'arr_tomorrow'
  | 'dep_today'
  | 'dep_tomorrow';

export interface StayQuickFilterCounts {
  arr_today: number;
  arr_tomorrow: number;
  dep_today: number;
  dep_tomorrow: number;
}

export interface StayDateFields {
  checkInDate?: string;
  checkOutDate?: string;
}

function toCalendarDay(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function startOfTodayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function addCalendarDays(day: Date, offset: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + offset);
  return next;
}

function isSameCalendarDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime();
}

export function isArrivalOn(dates: StayDateFields, offsetDays: 0 | 1): boolean {
  const arrival = toCalendarDay(dates.checkInDate);
  if (!arrival) return false;
  return isSameCalendarDay(arrival, addCalendarDays(startOfTodayLocal(), offsetDays));
}

export function isDepartureOn(dates: StayDateFields, offsetDays: 0 | 1): boolean {
  const departure = toCalendarDay(dates.checkOutDate);
  if (!departure) return false;
  return isSameCalendarDay(departure, addCalendarDays(startOfTodayLocal(), offsetDays));
}

export function applyStayQuickFilter<T>(
  rows: T[],
  filter: StayQuickFilter,
  getDates: (row: T) => StayDateFields,
): T[] {
  if (filter === 'none') return rows;
  switch (filter) {
    case 'arr_today':
      return rows.filter((r) => isArrivalOn(getDates(r), 0));
    case 'arr_tomorrow':
      return rows.filter((r) => isArrivalOn(getDates(r), 1));
    case 'dep_today':
      return rows.filter((r) => isDepartureOn(getDates(r), 0));
    case 'dep_tomorrow':
      return rows.filter((r) => isDepartureOn(getDates(r), 1));
    default:
      return rows;
  }
}

export function countStayQuickFilters<T>(
  rows: T[],
  getDates: (row: T) => StayDateFields,
): StayQuickFilterCounts {
  return {
    arr_today: rows.filter((r) => isArrivalOn(getDates(r), 0)).length,
    arr_tomorrow: rows.filter((r) => isArrivalOn(getDates(r), 1)).length,
    dep_today: rows.filter((r) => isDepartureOn(getDates(r), 0)).length,
    dep_tomorrow: rows.filter((r) => isDepartureOn(getDates(r), 1)).length,
  };
}
