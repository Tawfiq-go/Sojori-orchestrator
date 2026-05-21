import type { CalendarDay } from '../bien/YearlyCalendar';
import type { PriceFactor } from '../_tokens';
import type { G7Factor } from '../../../services/dynamicPricingApi';

export function mapG7FactorsToPriceFactors(factors: G7Factor[]): PriceFactor[] {
  return factors.map((f) => ({
    key: f.key,
    label: f.label,
    sub: f.sub,
    value: f.valueMad,
    kind:
      f.kind === 'clamp'
        ? 'neutral'
        : f.kind === 'base'
          ? 'base'
          : f.kind === 'plus'
            ? 'plus'
            : f.kind === 'minus'
              ? 'minus'
              : 'neutral',
  }));
}

const PILOT_TO_CALENDAR: Record<string, CalendarDay['status']> = {
  std: 'std',
  prem: 'prem',
  clamp_floor: 'clamp',
  clamp_ceiling: 'clamp',
  event: 'override',
  lastmin: 'clamp',
  blocked: 'blocked',
  anomaly: 'anomaly',
};

export function mapPilotDayToCalendar(day: {
  date: string;
  finalPriceMad: number;
  status: string;
}): CalendarDay {
  const st = PILOT_TO_CALENDAR[day.status] ?? 'std';
  return {
    date: day.date,
    recommendedPrice: day.finalPriceMad,
    status: st,
  };
}
