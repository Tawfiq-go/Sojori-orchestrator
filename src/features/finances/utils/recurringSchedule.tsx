export type RecurringFrequency = 'monthly' | 'weekly' | 'yearly' | 'per_stay';

export const FREQUENCY_OPTIONS: { value: RecurringFrequency; label: string }[] = [
  { value: 'monthly', label: 'Chaque mois' },
  { value: 'weekly', label: 'Chaque semaine' },
  { value: 'yearly', label: 'Chaque année' },
  { value: 'per_stay', label: 'Par séjour' },
];

/** 0 = dimanche … 6 = samedi (convention JS Date). */
export const WEEKDAY_OPTIONS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
  { value: 0, label: 'Dimanche' },
];

const WEEKDAY_BY_VALUE = Object.fromEntries(WEEKDAY_OPTIONS.map((d) => [d.value, d.label]));

export function describeRecurringSchedule(input: {
  frequency?: string;
  dayOfMonth?: number;
  lastDayOfMonth?: boolean;
  dayOfWeek?: number;
}): string {
  switch (input.frequency) {
    case 'weekly':
      return `Chaque ${WEEKDAY_BY_VALUE[input.dayOfWeek ?? 1] ?? 'semaine'}`;
    case 'yearly':
      return 'Chaque année (même date calendaire)';
    case 'per_stay':
      return 'À chaque séjour terminé (checkout)';
    default:
      if (input.lastDayOfMonth) return 'Chaque fin de mois';
      return `Le ${input.dayOfMonth ?? 1} de chaque mois`;
  }
}

export function formatNextRunAt(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}
