import { useMemo } from 'react';
import type { RecurringScheduleValue } from './RecurringScheduleFields';

export type CatchUpOption = {
  /** ISO date YYYY-MM-DD of the due date */
  isoDate: string;
  label: string;
};

function dueDateForMonth(
  year: number,
  monthIndex: number,
  dayOfMonth: number,
  lastDayOfMonth: boolean,
): Date {
  if (lastDayOfMonth) return new Date(year, monthIndex + 1, 0, 12, 0, 0, 0);
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(dayOfMonth, last), 12, 0, 0, 0);
}

function stepBack(from: Date, schedule: RecurringScheduleValue): Date {
  if (schedule.frequency === 'weekly') {
    const d = new Date(from);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (schedule.frequency === 'yearly') {
    const d = new Date(from);
    d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  const y = from.getFullYear();
  const m = from.getMonth() - 1;
  if (m < 0) return dueDateForMonth(y - 1, 11, schedule.dayOfMonth, schedule.lastDayOfMonth);
  return dueDateForMonth(y, m, schedule.dayOfMonth, schedule.lastDayOfMonth);
}

function mostRecentDueOnOrBefore(asOf: Date, schedule: RecurringScheduleValue): Date {
  if (schedule.frequency === 'weekly') {
    const dow = schedule.dayOfWeek;
    const d = new Date(asOf);
    d.setHours(12, 0, 0, 0);
    const diff = (d.getDay() - dow + 7) % 7;
    d.setDate(d.getDate() - diff);
    return d;
  }
  if (schedule.frequency === 'yearly') {
    const d = new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate(), 12, 0, 0, 0);
    if (d.getTime() > asOf.getTime()) d.setFullYear(d.getFullYear() - 1);
    return d;
  }
  let due = dueDateForMonth(
    asOf.getFullYear(),
    asOf.getMonth(),
    schedule.dayOfMonth,
    schedule.lastDayOfMonth,
  );
  if (due.getTime() > asOf.getTime()) {
    due = stepBack(due, schedule);
  }
  return due;
}

function toLocalYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Propose les N dernières échéances déjà dues (≤ aujourd’hui), du plus ancien au plus récent. */
export function proposeCatchUpOptions(
  schedule: RecurringScheduleValue,
  count = 6,
  asOf = new Date(),
): CatchUpOption[] {
  const n = Math.max(0, Math.min(24, count));
  let due = mostRecentDueOnOrBefore(asOf, schedule);
  const newestFirst: Date[] = [];
  while (newestFirst.length < n && due.getTime() <= asOf.getTime()) {
    newestFirst.push(new Date(due));
    due = stepBack(due, schedule);
  }
  return newestFirst.reverse().map((d) => ({
    isoDate: toLocalYmd(d),
    label: d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
  }));
}

type Props = {
  schedule: RecurringScheduleValue;
  selectedDates: string[];
  onChange: (dates: string[]) => void;
  /** Pour per_stay : rattrapage des N derniers mois de résas terminées */
  perStayMonths?: number;
  onPerStayMonthsChange?: (months: number) => void;
};

export function RecurringCatchUpFields({
  schedule,
  selectedDates,
  onChange,
  perStayMonths = 6,
  onPerStayMonthsChange,
}: Props) {
  const isPerStay = schedule.frequency === 'per_stay';
  const options = useMemo(
    () => (isPerStay ? [] : proposeCatchUpOptions(schedule, 6)),
    [schedule, isPerStay],
  );

  const selectedSet = useMemo(() => new Set(selectedDates), [selectedDates]);

  const toggle = (iso: string) => {
    if (selectedSet.has(iso)) onChange(selectedDates.filter((d) => d !== iso));
    else onChange([...selectedDates, iso].sort());
  };

  const allSelected = options.length > 0 && options.every((o) => selectedSet.has(o.isoDate));

  if (isPerStay) {
    return (
      <div className="fgrp">
        <div className="flabel">Rattrapage</div>
        <p className="fhint" style={{ marginTop: 0 }}>
          Génère une ligne (déjà liée à la résa) pour chaque séjour terminé sur les listings choisis, sur les{' '}
          <b>N derniers mois</b>. Les prochaines résas Completed créeront la ligne automatiquement.
        </p>
        <div className="seg">
          {[0, 3, 6, 12].map((n) => (
            <button
              key={n}
              type="button"
              className={perStayMonths === n ? 'on' : ''}
              onClick={() => onPerStayMonthsChange?.(n)}
            >
              {n === 0 ? 'Aucun' : `${n} mois`}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="fgrp">
      <div className="flabel">Rattrapage</div>
      <p className="fhint" style={{ marginTop: 0 }}>
        Propose les <b>6 dernières échéances</b> déjà dues. Décochez un mois pour l’ignorer — puis liez chaque
        ligne à une réservation depuis le journal.
      </p>
      <div className="chips" style={{ marginBottom: 8 }}>
        <button
          type="button"
          className={`chip ${allSelected ? 'on' : ''}`}
          onClick={() => onChange(allSelected ? [] : options.map((o) => o.isoDate))}
        >
          {allSelected ? 'Tout décocher' : 'Tout cocher'}
        </button>
      </div>
      <div className="chips">
        {options.map((o) => (
          <button
            key={o.isoDate}
            type="button"
            className={`chip ${selectedSet.has(o.isoDate) ? 'on' : ''}`}
            onClick={() => toggle(o.isoDate)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {!options.length && <p className="fhint">Aucune échéance passée à rattraper.</p>}
    </div>
  );
}

/** Initialise la sélection (tous cochés) quand le schedule change. */
export function defaultCatchUpDates(schedule: RecurringScheduleValue): string[] {
  return proposeCatchUpOptions(schedule, 6).map((o) => o.isoDate);
}
