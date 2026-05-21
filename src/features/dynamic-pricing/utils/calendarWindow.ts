import type { CalendarDay } from '../bien/YearlyCalendar';

const MONTHS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** Date locale YYYY-MM-DD (affichage « aujourd'hui »). */
export function todayIsoLocal(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

export function formatFrShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS_FR[m - 1]} ${y}`;
}

export function filterRolling365(days: CalendarDay[], start = todayIsoLocal()): CalendarDay[] {
  const end = addDaysIso(start, 365);
  return [...days]
    .filter((d) => d.date >= start && d.date < end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function filterCalendarYear(days: CalendarDay[], year: number): CalendarDay[] {
  return [...days]
    .filter((d) => Number(d.date.slice(0, 4)) === year)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export type DayPhase = 'past' | 'today' | 'future';

export type HeatmapCell =
  | { type: 'pad' }
  | { type: 'past'; date: string }
  | { type: 'missing'; date: string }
  | { type: 'day'; day: CalendarDay; phase: DayPhase };

export type HeatmapMonth = {
  label: string;
  sortKey: number;
  cells: HeatmapCell[];
};

function monthSortKey(year: number, monthIndex: number): number {
  return year * 100 + monthIndex;
}

function isoDaysInMonth(year: number, monthIndex: number): string[] {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const mm = String(monthIndex + 1).padStart(2, '0');
  return Array.from({ length: last }, (_, i) => {
    const dd = String(i + 1).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  });
}

function mondayFirstOffset(utcWeekday: number): number {
  return (utcWeekday + 6) % 7;
}

function parseWeekday(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Grille chronologique : uniquement du mois courant → fin fenêtre 365j (pas de mois passés). */
export function buildRollingHeatmapMonths(
  days: CalendarDay[],
  today = todayIsoLocal(),
): HeatmapMonth[] {
  const windowEnd = addDaysIso(today, 365);
  const lastData =
    days.length > 0
      ? days.reduce((max, d) => (d.date > max ? d.date : max), days[0].date)
      : windowEnd;
  const rangeEnd = lastData < windowEnd ? lastData : addDaysIso(windowEnd, -1);

  const startYear = Number(today.slice(0, 4));
  const startMonth = Number(today.slice(5, 7)) - 1;
  const endYear = Number(rangeEnd.slice(0, 4));
  const endMonth = Number(rangeEnd.slice(5, 7)) - 1;
  const endKey = monthSortKey(endYear, endMonth);
  const byDate = new Map(days.map((d) => [d.date, d]));

  const monthList: { year: number; mi: number }[] = [];
  let y = startYear;
  let mi = startMonth;
  while (monthSortKey(y, mi) <= endKey) {
    monthList.push({ year: y, mi });
    mi += 1;
    if (mi > 11) {
      mi = 0;
      y += 1;
    }
  }

  return monthList
    .map(({ year, mi }) => {
      const visibleDays = isoDaysInMonth(year, mi).filter(
        (iso) => iso >= today && iso <= rangeEnd,
      );
      if (visibleDays.length === 0) {
        return { label: '', sortKey: monthSortKey(year, mi), cells: [] as HeatmapCell[] };
      }

      const lead = mondayFirstOffset(parseWeekday(visibleDays[0]));
      const cells: HeatmapCell[] = Array.from({ length: lead }, () => ({ type: 'pad' }));

      for (const iso of visibleDays) {
        const data = byDate.get(iso);
        if (data) {
          const phase: DayPhase = iso === today ? 'today' : 'future';
          cells.push({ type: 'day', day: data, phase });
        } else {
          cells.push({ type: 'missing', date: iso });
        }
      }
      while (cells.length % 7 !== 0) cells.push({ type: 'pad' });

      const yy = String(year).slice(2);
      return {
        label: `${MONTHS_SHORT[mi]} '${yy}`,
        sortKey: monthSortKey(year, mi),
        cells,
      };
    })
    .filter((m) => m.cells.length > 0);
}

/** Année civile : Jan → Déc, passé / aujourd’hui / futur. */
export function buildCalendarYearHeatmapMonths(
  days: CalendarDay[],
  year: number,
  today = todayIsoLocal(),
): HeatmapMonth[] {
  const byDate = new Map(days.map((d) => [d.date, d]));

  return Array.from({ length: 12 }, (_, mi) => {
    const monthDays = isoDaysInMonth(year, mi);
    const lead = mondayFirstOffset(parseWeekday(monthDays[0]));
    const cells: HeatmapCell[] = Array.from({ length: lead }, () => ({ type: 'pad' }));

    for (const iso of monthDays) {
      const data = byDate.get(iso);
      if (iso < today) {
        cells.push(data ? { type: 'day', day: data, phase: 'past' } : { type: 'past', date: iso });
      } else if (data) {
        cells.push({
          type: 'day',
          day: data,
          phase: iso === today ? 'today' : 'future',
        });
      } else if (iso >= today) {
        cells.push({ type: 'missing', date: iso });
      } else {
        cells.push({ type: 'past', date: iso });
      }
    }
    while (cells.length % 7 !== 0) cells.push({ type: 'pad' });

    return {
      label: MONTHS_SHORT[mi],
      sortKey: monthSortKey(year, mi),
      cells,
    };
  });
}
