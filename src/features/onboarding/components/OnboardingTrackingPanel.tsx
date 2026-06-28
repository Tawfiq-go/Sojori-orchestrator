import type { OwnerOnboarding } from '../../../services/crmService';
import type { WizardDraft } from '../types';
import { WIZARD_STEP_LABELS } from '../types';
import {
  isPanelCurrentForStep,
  isPanelValidatedForStep,
  stepIndexToPanel,
  WIZARD_STEP_COUNT,
  WIZARD_VISIBLE_PANELS,
} from '../wizardNavigation';

interface OnboardingTrackingPanelProps {
  draft: WizardDraft;
  onboarding: OwnerOnboarding | null;
  lastSavedAt: string | null;
  saving: boolean;
  /** Journal technique apply — réservé admin Sojori */
  showAuditJournal?: boolean;
  onGoToPanel?: (panel: number) => void;
}

function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return '—';
  }
}

export function OnboardingTrackingPanel({
  draft,
  onboarding,
  lastSavedAt,
  saving,
  showAuditJournal = false,
  onGoToPanel,
}: OnboardingTrackingPanelProps) {
  const listingsCount = onboarding?.listings?.length ?? 0;
  const listingsDone = onboarding?.listings?.filter((l) => l.steps?.created_in_sojori).length ?? 0;
  const onRecap = draft.currentPanel >= 8;

  return (
    <aside className="ob-track">
      <div className="ob-track-card">
        <div className="ob-track-h">Suivi configuration</div>
        <div className="ob-track-pct">
          {WIZARD_VISIBLE_PANELS.filter((p) => draft.panelsValidated.includes(p)).length}/
          {WIZARD_STEP_COUNT} étapes validées
        </div>
        <ul className={`ob-track-steps${onGoToPanel ? ' clickable' : ''}`}>
          {WIZARD_STEP_LABELS.map((label, stepIndex) => {
            const ok = isPanelValidatedForStep(draft, stepIndex);
            const cur = isPanelCurrentForStep(draft, stepIndex);
            const panel = stepIndexToPanel(stepIndex);
            return (
              <li key={label} className={ok ? 'ok' : cur ? 'cur' : ''}>
                {onGoToPanel ? (
                  <button
                    type="button"
                    className="ob-track-step-btn"
                    onClick={() => onGoToPanel(panel)}
                    title={`Modifier · ${label}`}
                  >
                    <span>{ok ? '✓' : cur ? '●' : '○'}</span> {label}
                  </button>
                ) : (
                  <>
                    <span>{ok ? '✓' : cur ? '●' : '○'}</span> {label}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="ob-track-card">
        <div className="ob-track-h">Import</div>
        <div className="ob-track-kpi">
          <span>Listings</span>
          <strong>
            {listingsDone}/{listingsCount || '—'}
          </strong>
        </div>
        <p className="ob-track-note">
          Résas en attente d&apos;orchestration : lancez-les depuis la fiche listing après import.
        </p>
      </div>

      <div className="ob-track-card ob-track-save">
        <div className="ob-track-h">Sauvegarde</div>
        <p>{saving ? 'Enregistrement…' : `Dernière : ${formatTime(lastSavedAt)}`}</p>
        <p className="ob-track-note">
          {onRecap
            ? '« Enregistrer le brouillon » ou cliquez une étape ci-dessus pour modifier.'
            : '« Enregistrer » pour sauver sans avancer · « Continuer » pour valider l\'étape'}
        </p>
      </div>

      {(showAuditJournal && (draft.applyLog?.orchestrationAuditLines?.length ?? 0) > 0) ? (
        <div className="ob-track-card ob-track-audit">
          <div className="ob-track-h">Journal apply orchestration</div>
          <ul className="ob-track-audit-list">
            {draft.applyLog!.orchestrationAuditLines!.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}
