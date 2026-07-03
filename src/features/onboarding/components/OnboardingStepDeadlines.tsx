import type { WizardCapabilities, WizardDeadlines, WizardServiceDeadlineOverride } from '../types';
import {
  defaultStaffReminderDaysForTask,
  formatClientReminderLabel,
  formatStaffAssignLabel,
  formatStaffReminderDay,
  formatStaffReminderLabel,
  resolveServiceRhythmRows,
  WORKFLOW_PRESET_OPTIONS,
  type OnboardingServiceRhythmDef,
  type StaffAssignStyle,
} from '../onboardingWorkflowDefaults';
import { ADMIN_ESCALATION_HOURS } from '../wizardStaffDeadlines';

const CLIENT_DAY_OPTIONS = [-4, -3, -2, -1] as const;

const STAFF_ASSIGN_OPTIONS: Array<{ id: StaffAssignStyle; label: string }> = [
  { id: 'none', label: '—' },
  { id: 'immediate', label: 'Immédiat' },
  { id: 'days_before', label: 'J-X avant la tâche' },
];

const DAYS_BEFORE_OPTIONS = [1, 2, 3, 4, 7] as const;

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`ob-toggle ${on ? 'on' : ''}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}

type Props = {
  deadlines: WizardDeadlines;
  capabilities?: WizardCapabilities;
  onChange: (patch: Partial<WizardDeadlines>) => void;
};

function patchServiceRow(
  deadlines: WizardDeadlines,
  taskType: string,
  patch: WizardServiceDeadlineOverride,
): Partial<WizardDeadlines> {
  return {
    perService: {
      ...(deadlines.perService ?? {}),
      [taskType]: {
        ...(deadlines.perService?.[taskType] ?? {}),
        ...patch,
      },
    },
  };
}

function ServiceRowEditor({
  row,
  deadlines,
  onChange,
}: {
  row: OnboardingServiceRhythmDef;
  deadlines: WizardDeadlines;
  onChange: (patch: Partial<WizardDeadlines>) => void;
}) {
  const toggleClientDay = (day: number) => {
    const current = row.clientReminderDays;
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day];
    onChange(patchServiceRow(deadlines, row.taskType, { clientReminderDays: next }));
  };

  const setAssignStyle = (style: StaffAssignStyle) => {
    onChange(
      patchServiceRow(deadlines, row.taskType, {
        staffAssignStyle: style,
        staffAssignDaysBefore: style === 'days_before' ? row.staffAssignDaysBefore || 3 : 0,
      }),
    );
  };

  const staffReminderDefaultDays = defaultStaffReminderDaysForTask(row.taskType);

  const toggleStaffReminder = () => {
    const hasReminder = row.staffReminderDays.length > 0;
    onChange(
      patchServiceRow(deadlines, row.taskType, {
        staffReminderDays: hasReminder ? [] : staffReminderDefaultDays,
      }),
    );
  };

  return (
    <tr className="ob-rhythm-row">
      <td className="ob-rhythm-svc">
        <span className="ob-rhythm-emoji">{row.emoji}</span>
        {row.label}
      </td>
      <td>
        <div className="ob-rhythm-chips">
          {CLIENT_DAY_OPTIONS.map((day) => (
            <button
              key={day}
              type="button"
              className={`ob-chip ob-rhythm-chip${row.clientReminderDays.includes(day) ? ' on' : ''}`}
              onClick={() => toggleClientDay(day)}
            >
              J{day}
            </button>
          ))}
        </div>
        <div className="ob-rhythm-hint">{formatClientReminderLabel(row.clientReminderDays)}</div>
      </td>
      <td>
        <select
          className="ob-field ob-rhythm-select"
          value={row.staffAssignStyle === 'days_before' ? 'days_before' : row.staffAssignStyle}
          onChange={(e) => setAssignStyle(e.target.value as StaffAssignStyle)}
        >
          {row.staffAssignStyle === 'with_client' ? (
            <option value="with_client">Au choix client (ancien)</option>
          ) : null}
          {STAFF_ASSIGN_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {row.staffAssignStyle === 'days_before' ? (
          <select
            className="ob-field ob-rhythm-select"
            style={{ marginTop: 4 }}
            value={row.staffAssignDaysBefore}
            onChange={(e) =>
              onChange(
                patchServiceRow(deadlines, row.taskType, {
                  staffAssignDaysBefore: Number(e.target.value),
                }),
              )
            }
          >
            {row.staffAssignDaysBefore < 0 ? (
              <option value={row.staffAssignDaysBefore}>
                J+{Math.abs(row.staffAssignDaysBefore)} (après)
              </option>
            ) : null}
            {DAYS_BEFORE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                J-{n}
              </option>
            ))}
          </select>
        ) : null}
        <div className="ob-rhythm-hint">
          {formatStaffAssignLabel(row.staffAssignStyle, row.staffAssignDaysBefore)}
        </div>
      </td>
      <td>
        <div className="ob-rhythm-staff-rem">
          <Toggle on={row.staffReminderDays.length > 0} onChange={toggleStaffReminder} />
          <span>
            {(row.staffReminderDays.length ? row.staffReminderDays : staffReminderDefaultDays)
              .map(formatStaffReminderDay)
              .join(', ')}
          </span>
        </div>
        <div className="ob-rhythm-hint">
          {formatStaffReminderLabel(row.staffReminderDays, row.staffReminderTime)}
        </div>
      </td>
      <td className="ob-rhythm-esc">
        <Toggle
          on={row.escalationEnabled}
          onChange={(v) =>
            onChange(patchServiceRow(deadlines, row.taskType, { escalationEnabled: v }))
          }
        />
      </td>
    </tr>
  );
}

export default function OnboardingStepDeadlines({ deadlines, capabilities, onChange }: Props) {
  const rows = resolveServiceRhythmRows(deadlines, capabilities);
  const preset = deadlines.workflowPreset ?? 'balanced';

  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 5 · Délais & relances</div>
      <h1>Rythme opérationnel par service</h1>
      <p className="sub">
        Relances client, assignation staff, rappels et escalade — enregistrés dans le{' '}
        <strong>modèle orchestration owner</strong> (srv-listing) et les workflows fulltask.
        Visible sur <strong>Annonces → Modèle orchestration</strong> après « Enregistrer → modèle owner ».
      </p>

      <div className="ob-team-config-lbl" style={{ marginBottom: 8 }}>
        Préréglage global
      </div>
      <div className="ob-preset-grid ob-rhythm-preset-grid">
        {WORKFLOW_PRESET_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`ob-preset${preset === opt.id ? ' on' : ''}`}
            onClick={() =>
              onChange({
                workflowPreset: opt.id,
                perService: {},
                staffAssignMode:
                  opt.id === 'reactive'
                    ? 'with_client_choice'
                    : opt.id === 'proactive'
                      ? 'standard'
                      : 'standard',
              })
            }
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.emoji}</div>
            <div style={{ fontWeight: 800, fontSize: 13 }}>{opt.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--ob-t3)', marginTop: 4 }}>{opt.desc}</div>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="ob-card" style={{ marginTop: 12 }}>
          <div className="ob-card-b">
            <p className="ob-scope-tab-hint">
              Aucun service avec tâche staff — activez des services à l&apos;étape Parcours client.
            </p>
          </div>
        </div>
      ) : (
        <div className="ob-card ob-rhythm-table-wrap" style={{ marginTop: 12 }}>
          <div className="ob-card-b" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="ob-rhythm-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Relances client</th>
                  <th>Assign staff</th>
                  <th>Rappel staff</th>
                  <th>Escalade</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <ServiceRowEditor
                    key={row.taskType}
                    row={row}
                    deadlines={deadlines}
                    onChange={onChange}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="ob-card" style={{ marginTop: 12 }}>
        <div className="ob-card-b">
          <div className="ob-deadline-esc-hd">
            <div>
              <div className="ob-deadline-esc-title">Heure escalade admin (J-1)</div>
              <div className="ob-deadline-esc-sub">
                Appliquée aux services avec escalade activée
              </div>
            </div>
          </div>
          <div className="ob-deadline-hour-pick" style={{ marginTop: 8, paddingTop: 0, borderTop: 0 }}>
            <div className="ob-deadline-hour-btns">
              {ADMIN_ESCALATION_HOURS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className={`ob-deadline-hour-btn${deadlines.adminEscalationHour === h.id ? ' on' : ''}`}
                  onClick={() => onChange({ adminEscalationHour: h.id })}
                >
                  {h.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
