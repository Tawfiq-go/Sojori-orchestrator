import { useState } from 'react';
import { toast } from 'react-toastify';
import { applyOnboardingStaff } from '../apply/applyOnboardingStaff';
import { formatStaffApplyRecap, type ApplyRecap } from '../apply/suiteApplyRecap';
import { formatStaffPersonRecap, staffApplyAccountCounts } from '../staffRecap';
import { PM_ONBOARDING_WIZARD_PATH } from '../wizardNavigation';
import type { WizardDraft } from '../types';
import { staffDisplayName } from '../staffNormalize';

type Props = {
  ownerId: string;
  draft: WizardDraft;
  onApplied: (recap: ApplyRecap) => void;
};

export default function OnboardingSuiteStaffSection({ ownerId, draft, onApplied }: Props) {
  const [loading, setLoading] = useState(false);
  const [lastRecap, setLastRecap] = useState<ApplyRecap | null>(null);

  const rows = (draft.panels['1']?.staff ?? []).filter((s) => staffDisplayName(s));
  const accounts = staffApplyAccountCounts(rows);
  const accountTotal =
    accounts.staffSimplified + accounts.adminWhatsapp + accounts.dashboardWorkers;

  const handleApply = async () => {
    if (!ownerId || rows.length === 0) return;
    setLoading(true);
    setLastRecap(null);
    try {
      const result = await applyOnboardingStaff(ownerId, draft);
      const recap = formatStaffApplyRecap(result);
      setLastRecap(recap);
      if (result.failed > 0) toast.warn(recap.headline);
      else toast.success('Équipe appliquée');
      onApplied(recap);
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Apply équipe impossible';
      toast.error(err);
      setLastRecap({ headline: `Erreur : ${err}`, lines: [] });
    } finally {
      setLoading(false);
    }
  };

  if (rows.length === 0) {
    return (
      <p className="ob-suite-panel-note">
        Aucun membre dans le wizard —{' '}
        <a href={PM_ONBOARDING_WIZARD_PATH} className="ob-suite-inline-link">
          étape Équipe
        </a>
      </p>
    );
  }

  return (
    <div className="ob-suite-panel">
      <div className="ob-suite-selected-list ob-suite-selected-list--stack">
        {rows.map((row) => (
          <span key={row.id} className="ob-recap-chip ob-recap-chip--person">
            {formatStaffPersonRecap(row)}
          </span>
        ))}
      </div>
      <p className="ob-suite-panel-meta">
        Prévu : {accounts.staffSimplified} staff · {accounts.adminWhatsapp} admin WA ·{' '}
        {accounts.dashboardWorkers} dashboard — mode <strong>additif</strong>.
      </p>
      {lastRecap && (
        <div className="ob-suite-panel-recap">
          <p className="ob-suite-run-detail">{lastRecap.headline}</p>
          {lastRecap.lines.length > 0 && (
            <ul className="ob-suite-run-lines">
              {lastRecap.lines.map((line) => (
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
          disabled={loading}
          onClick={() => void handleApply()}
        >
          {loading
            ? 'Création…'
            : `Créer l'équipe (${rows.length} pers. · ${accountTotal} comptes)`}
        </button>
      </div>
    </div>
  );
}
