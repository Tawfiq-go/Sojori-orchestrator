import type { CalendarDay } from '../bien/YearlyCalendar';
import type { PricingEvent } from '../bien/PricingControls';
import { addDaysIso } from './calendarWindow';

/** Aperçu immédiat : prix forcé event sur la courbe avant retour preview API */
export function overlayEventsOnCalendarDays(
  days: CalendarDay[],
  events: PricingEvent[],
): CalendarDay[] {
  if (!events.length) return days;

  const byDate = new Map<string, CalendarDay>();
  for (const d of days) {
    byDate.set(d.date, { ...d });
  }

  for (const ev of events) {
    const parts = ev.dateRange.split('→').map((s) => s.trim());
    const start = parts[0]?.slice(0, 10);
    const end = (parts[1] ?? parts[0] ?? '').slice(0, 10);
    if (!start || !end || !/^\d{4}-\d{2}-\d{2}$/.test(start)) continue;

    let cursor = start;
    while (cursor <= end) {
      const existing = byDate.get(cursor);
      // Ne pas inventer de jours : overlay uniquement sur dates déjà dans le snapshot
      if (existing && existing.status !== 'blocked') {
        const base = existing.recommendedPrice;
        const price =
          ev.kind === 'market_percent'
            ? Math.round((base * (ev.marketPercent / 100)) / 10) * 10
            : ev.fixedPrice;
        byDate.set(cursor, {
          ...existing,
          recommendedPrice: price,
          status: 'override',
          priceTier: undefined,
        });
      }
      if (cursor === end) break;
      cursor = addDaysIso(cursor, 1);
    }
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
