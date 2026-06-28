import type { WizardDeadlines } from '../types';
import { ADMIN_ESCALATION_HOURS, STAFF_ASSIGN_OPTIONS } from '../wizardStaffDeadlines';

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
  onChange: (patch: Partial<WizardDeadlines>) => void;
};

export default function OnboardingStepDeadlines({ deadlines, onChange }: Props) {
  return (
    <div className="ob-sh">
      <div className="eyebrow">Étape 5 · Délais & relances</div>
      <h1>Assignation staff & escalade</h1>
      <p className="sub">
        Règle par défaut pour toutes les tâches — affinable par type dans{' '}
        <strong>Annonces → Modèle orchestration</strong>.
      </p>

      <div className="ob-team-config-lbl" style={{ marginBottom: 6 }}>
        Quand assigner le staff ?
      </div>
      <div className="ob-deadline-assign-grid">
        {STAFF_ASSIGN_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`ob-rcard ob-deadline-assign${deadlines.staffAssignMode === opt.id ? ' on' : ''}`}
            onClick={() =>
              onChange({
                staffAssignMode: opt.id,
                staffAssignDaysBefore: opt.id === 'standard' ? 3 : deadlines.staffAssignDaysBefore,
              })
            }
          >
            <span className="ob-deadline-assign-emoji">{opt.emoji}</span>
            <div>
              <div className="ob-deadline-assign-title">{opt.title}</div>
              <div className="ob-deadline-assign-desc">{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="ob-card" style={{ marginTop: 12 }}>
        <div className="ob-card-b">
          <div className="ob-deadline-esc-hd">
            <div>
              <div className="ob-deadline-esc-title">Si le staff n&apos;accepte pas</div>
              <div className="ob-deadline-esc-sub">
                Escalade admin la veille de la tâche (<strong>J-1</strong>)
              </div>
            </div>
            <Toggle
              on={deadlines.escalateAdminJ1}
              onChange={(v) => onChange({ escalateAdminJ1: v })}
            />
          </div>

          {deadlines.escalateAdminJ1 ? (
            <div className="ob-deadline-hour-pick">
              <span className="ob-deadline-hour-lbl">Heure de relance admin (J-1)</span>
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
          ) : (
            <p className="ob-scope-tab-hint ob-scope-tab-hint--muted" style={{ margin: '8px 0 0' }}>
              Aucune escalade automatique — la tâche reste en attente d&apos;acceptation staff.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
