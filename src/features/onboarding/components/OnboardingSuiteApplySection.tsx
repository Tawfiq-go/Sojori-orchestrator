import { useState } from 'react';
import { toast } from 'react-toastify';
import { applyOnboardingOrchestration } from '../apply/applyOnboardingOrchestration';
import { formatOrchestrationApplyRecap, type ApplyRecap } from '../apply/suiteApplyRecap';
import { suiteStepLinesForView } from '../suiteDisplayForView';
import type { WizardDraft } from '../types';

type Props = {
  ownerId: string;
  draft: WizardDraft;
  audience?: 'pm' | 'admin';
  onApplied: (recap: ApplyRecap) => void;
};

export default function OnboardingSuiteApplySection({
  ownerId,
  draft,
  audience = 'pm',
  onApplied,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [lastRecap, setLastRecap] = useState<ApplyRecap | null>(null);

  const caps = draft.panels['3']?.capabilities;
  const capCount = caps ? Object.values(caps).filter(Boolean).length : 0;

  const handleApply = async () => {
    if (!ownerId) return;
    setLoading(true);
    setLastRecap(null);
    try {
      const result = await applyOnboardingOrchestration(ownerId, draft, {
        propagateToListings: false,
      });
      const recap = formatOrchestrationApplyRecap(result, { phase: 'template', audience });
      setLastRecap(recap);
      toast.success(
        audience === 'pm' ? 'Plan orchestration enregistré' : 'Plan orchestration appliqué',
      );
      if (result.warnings.length && audience === 'admin') {
        console.info('[onboarding-apply]', result.warnings);
      }
      onApplied(recap);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Apply impossible';
      toast.error(err);
      setLastRecap({ headline: `Erreur : ${err}`, lines: [] });
    } finally {
      setLoading(false);
    }
  };

  const displayLines = lastRecap
    ? suiteStepLinesForView(audience === 'admin' ? 'admin' : 'owner', 'plan', lastRecap.lines)
    : undefined;

  return (
    <div className="ob-suite-panel">
      <p className="ob-suite-panel-meta">
        {audience === 'admin' ? (
          <>
            Mode <strong>replace</strong> — {capCount} service(s) · J-X · conditions · délais staff.
            Propagation listings <strong>après import</strong> dans la suite auto.
          </>
        ) : (
          <>
            Enregistre votre plan orchestration ({capCount} service{capCount > 1 ? 's' : ''} activé
            {capCount > 1 ? 's' : ''}) — parcours voyageur, accès et délais équipe.
          </>
        )}
      </p>
      {lastRecap && (
        <div className="ob-suite-panel-recap">
          <p className="ob-suite-run-detail">{lastRecap.headline}</p>
          {displayLines && displayLines.length > 0 && (
            <ul className="ob-suite-run-lines">
              {displayLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="ob-suite-panel-actions">
        <button
          type="button"
          className="ob-btn-primary"
          disabled={loading || capCount === 0}
          onClick={() => void handleApply()}
        >
          {loading ? 'Application…' : 'Appliquer le plan orchestration'}
        </button>
      </div>
    </div>
  );
}
