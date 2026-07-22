import {
  describeRecurringSchedule,
  FREQUENCY_OPTIONS,
  WEEKDAY_OPTIONS,
  type RecurringFrequency,
} from '../utils/recurringSchedule.tsx';

export type RecurringScheduleValue = {
  frequency: RecurringFrequency;
  dayOfMonth: number;
  lastDayOfMonth: boolean;
  dayOfWeek: number;
};

type Props = {
  value: RecurringScheduleValue;
  onChange: (patch: Partial<RecurringScheduleValue>) => void;
  showHint?: boolean;
};

export function RecurringScheduleFields({ value, onChange, showHint = true }: Props) {
  const preview = describeRecurringSchedule(value);
  const isPerStay = value.frequency === 'per_stay';

  return (
    <>
      <div className="fgrp">
        <div className="flabel">Fréquence</div>
        <div className="seg" style={{ flexWrap: 'wrap' }}>
          {FREQUENCY_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={value.frequency === o.value ? 'on' : ''}
              onClick={() => onChange({ frequency: o.value })}
            >
              {o.value === 'weekly'
                ? 'Semaine'
                : o.value === 'yearly'
                  ? 'Année'
                  : o.value === 'per_stay'
                    ? 'Par séjour'
                    : 'Mois'}
            </button>
          ))}
        </div>
      </div>

      {value.frequency === 'weekly' && (
        <div className="fgrp">
          <div className="flabel">Jour de la semaine</div>
          <select
            className="fin"
            value={value.dayOfWeek}
            onChange={(e) => onChange({ dayOfWeek: Number(e.target.value) })}
          >
            {WEEKDAY_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {value.frequency === 'monthly' && (
        <div className="fgrp">
          <div className="flabel">Jour du mois</div>
          <div className="seg" style={{ marginBottom: 10 }}>
            <button
              type="button"
              className={!value.lastDayOfMonth ? 'on' : ''}
              onClick={() => onChange({ lastDayOfMonth: false })}
            >
              Jour fixe
            </button>
            <button
              type="button"
              className={value.lastDayOfMonth ? 'on' : ''}
              onClick={() => onChange({ lastDayOfMonth: true })}
            >
              Fin de mois
            </button>
          </div>
          {!value.lastDayOfMonth && (
            <select
              className="fin"
              value={value.dayOfMonth}
              onChange={(e) => onChange({ dayOfMonth: Number(e.target.value) })}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Le {d} de chaque mois
                </option>
              ))}
            </select>
          )}
          {value.lastDayOfMonth && (
            <p className="fhint">Échéance automatique le dernier jour (28, 29, 30 ou 31 selon le mois).</p>
          )}
        </div>
      )}

      {value.frequency === 'yearly' && (
        <p className="fhint">Même date calendaire chaque année (jour et mois de la première génération).</p>
      )}

      {isPerStay && (
        <div className="inote info" style={{ marginBottom: 12 }}>
          <span className="i">ℹ️</span>
          <b>Par séjour</b> — une ligne journal à chaque réservation <b>Completed</b> (checkout), déjà liée à la
          résa + listing. Indépendant du ménage orchestration.
          <br />
          Catégorie conseillée : <b>Ménage</b> ou <b>Ménage checkout</b> (groupe Charges) — pas « Ménage payant »
          (service guest avec marge).
        </div>
      )}

      {showHint && !isPerStay && (
        <p className="fhint">
          Planification : <strong>{preview}</strong> — une ligne journal par listing à chaque échéance.
        </p>
      )}
      {showHint && isPerStay && (
        <p className="fhint">
          Planification : <strong>{preview}</strong> — une ligne par résa terminée sur les listings sélectionnés.
        </p>
      )}
    </>
  );
}

export function buildRecurringApiBody(
  schedule: RecurringScheduleValue,
): Pick<RecurringScheduleValue, 'frequency' | 'dayOfMonth' | 'lastDayOfMonth' | 'dayOfWeek'> {
  const body: Record<string, unknown> = { frequency: schedule.frequency };
  if (schedule.frequency === 'weekly') {
    body.dayOfWeek = schedule.dayOfWeek;
  } else if (schedule.frequency === 'monthly') {
    body.lastDayOfMonth = schedule.lastDayOfMonth;
    if (!schedule.lastDayOfMonth) body.dayOfMonth = schedule.dayOfMonth;
  }
  return body as Pick<RecurringScheduleValue, 'frequency' | 'dayOfMonth' | 'lastDayOfMonth' | 'dayOfWeek'>;
}
