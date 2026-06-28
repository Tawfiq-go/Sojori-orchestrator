import '../onboarding-wizard.css';
import type { WizardDraft } from '../types';
import { WIZARD_STEP_LABELS } from '../types';
import {
  isPanelCurrentForStep,
  isPanelValidatedForStep,
  panelToStepIndex,
  stepIndexToPanel,
  WIZARD_STEP_COUNT,
} from '../wizardNavigation';

interface OnboardingStepperProps {
  draft: WizardDraft;
  onSelect: (panel: number) => void;
  progressPercent: number;
}

export function OnboardingStepper({ draft, onSelect, progressPercent }: OnboardingStepperProps) {
  const current = draft.currentPanel;

  return (
    <div className="ob-stepper">
      <div className="ob-stepper-inner">
        <div className="ob-steps-row">
          {WIZARD_STEP_LABELS.map((label, stepIndex) => {
            const done = isPanelValidatedForStep(draft, stepIndex);
            const active = isPanelCurrentForStep(draft, stepIndex);
            const state = done ? 'done' : active ? 'active' : 'pending';
            return (
              <button
                key={label}
                type="button"
                className={`ob-snode ${state}`}
                onClick={() => onSelect(stepIndexToPanel(stepIndex))}
              >
                <div className="ob-bar" />
                <div className="ob-lbl">
                  <span className="ob-no">{done ? '✓' : stepIndex}</span>
                  {label}
                </div>
              </button>
            );
          })}
        </div>
        <div className="ob-stepper-meta">
          <span>
            Étape {panelToStepIndex(current) + 1} / {WIZARD_STEP_COUNT}
          </span>
          <span className="ob-pct">{progressPercent}%</span>
        </div>
      </div>
    </div>
  );
}
