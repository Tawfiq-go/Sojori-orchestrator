import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircularProgress, Alert, Button } from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { PageHeader, btnGhostSx, btnPrimarySx } from '../../components/dashboard/DashboardV2.components';
import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { OnboardingOwnerSetup } from './components/OnboardingOwnerSetup';
import { usePmOnboardingWizard } from './hooks/usePmOnboardingWizard';
import { OnboardingStepper } from './components/OnboardingStepper';
import { OnboardingTrackingPanel } from './components/OnboardingTrackingPanel';
import { OnboardingStepPanels } from './components/OnboardingStepPanels';
import {
  canAccessPmOnboarding,
  isOwnerRole,
  resolvePmOnboardingOwnerId,
  onboardingSuiteViewMode,
} from './resolveOwnerId';
import { panelToStepIndex, prevWizardPanel, WIZARD_STEP_COUNT, PM_ONBOARDING_WIZARD_PATH } from './wizardNavigation';
import { applyOwnerIdToSearchParams } from './onboardingOwnerUrl';
import './onboarding-wizard.css';

type PmOnboardingWizardProps = {
  /** Intégré dans Équipe & Rôles (/admin/equipe?tab=onboarding) */
  embedded?: boolean;
};

function OnboardingWizardShell({
  children,
  embedded,
}: {
  children: ReactNode;
  embedded?: boolean;
}) {
  if (embedded) return <>{children}</>;
  return (
    <DashboardWrapper breadcrumb={['Task', 'Équipe', 'Configuration']}>{children}</DashboardWrapper>
  );
}

export function PmOnboardingWizard({ embedded = false }: PmOnboardingWizardProps) {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showOwnerFilter, requestOwnerId, setSelectedOwnerId } = useAdminOwnerFilter();
  const targetOwnerId = authLoading
    ? null
    : resolvePmOnboardingOwnerId(user, requestOwnerId, showOwnerFilter);
  const isOwnerSelfService = !showOwnerFilter && isOwnerRole(user);
  const wizard = usePmOnboardingWizard(user, targetOwnerId, { isOwnerSelfService });
  const { draft, loading, saving, error, progressPercent, onboarding, lastSavedAt } = wizard;
  const ownerScopeBlocked = showOwnerFilter && !requestOwnerId;

  useEffect(() => {
    if (!showOwnerFilter) return;
    const fromUrl = searchParams.get('ownerId')?.trim();
    if (fromUrl) setSelectedOwnerId(fromUrl);
  }, [searchParams, setSelectedOwnerId, showOwnerFilter]);

  useEffect(() => {
    if (!showOwnerFilter || !targetOwnerId) return;
    const inUrl = searchParams.get('ownerId')?.trim();
    if (inUrl === targetOwnerId) return;
    setSearchParams(applyOwnerIdToSearchParams(searchParams, targetOwnerId), { replace: true });
  }, [targetOwnerId, searchParams, setSearchParams, showOwnerFilter]);

  const handleSave = async () => {
    const ok = await wizard.saveDraft();
    if (ok) {
      if (showOwnerFilter && targetOwnerId) {
        setSearchParams(applyOwnerIdToSearchParams(searchParams, targetOwnerId), { replace: true });
      }
      toast.success('Brouillon enregistré');
    } else {
      toast.error(wizard.error || 'Impossible d’enregistrer la progression');
    }
  };

  const handleContinue = async () => {
    const ok = await wizard.validateCurrentPanel();
    if (ok) {
      if (showOwnerFilter && targetOwnerId) {
        setSearchParams(applyOwnerIdToSearchParams(searchParams, targetOwnerId), { replace: true });
      }
      toast.success('Étape enregistrée — étape suivante');
    } else {
      toast.error(wizard.error || 'Impossible d’enregistrer l’étape');
    }
  };

  const handleSaveAndExit = async () => {
    await wizard.saveAndExit();
    toast.success('Progression enregistrée — reprenez via Équipe & Rôles → On-boarding');
    navigate(embedded ? PM_ONBOARDING_WIZARD_PATH : '/dashboard');
  };

  if (!canAccessPmOnboarding(user)) {
    return (
      <OnboardingWizardShell embedded={embedded}>
        <Alert severity="warning" sx={{ mx: embedded ? 0 : { xs: 2, md: 3 }, mt: embedded ? 0 : 1 }}>
          Compte propriétaire ou admin requis pour l&apos;on-boarding PM.
        </Alert>
      </OnboardingWizardShell>
    );
  }

  if (ownerScopeBlocked) {
    return (
      <OnboardingWizardShell embedded={embedded}>
        <div className="ob-team-setup-bar" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div>
            <div className="ob-team-setup-title">On-boarding · property manager</div>
            <div className="ob-team-setup-sub">
              Créez ou choisissez un PM pour lancer la configuration <strong>quand vous le souhaitez</strong>.
              Rien n&apos;est obligatoire — le compte peut déjà se connecter au dashboard.
            </div>
          </div>
          <OnboardingOwnerSetup />
          <Alert severity="info" sx={{ mt: 1, fontSize: 13 }}>
            Vous pouvez quitter cette page à tout moment (sidebar, dashboard, Property managers). Revenez ici
            via <strong>Équipe → On-boarding</strong> pour reprendre le wizard.
          </Alert>
        </div>
      </OnboardingWizardShell>
    );
  }

  if (!targetOwnerId) {
    return (
      <OnboardingWizardShell embedded={embedded}>
        <Alert severity="warning" sx={{ mx: embedded ? 0 : { xs: 2, md: 3 }, mt: embedded ? 0 : 1 }}>
          Compte propriétaire introuvable pour cet on-boarding.
        </Alert>
      </OnboardingWizardShell>
    );
  }

  if (authLoading || !isAuthenticated) {
    return (
      <OnboardingWizardShell embedded={embedded}>
        <div
          className="ob-wizard ob-wizard--embedded"
          style={{ display: 'flex', justifyContent: 'center', padding: embedded ? 48 : 80 }}
        >
          <CircularProgress sx={{ color: '#b8851a' }} />
        </div>
      </OnboardingWizardShell>
    );
  }

  if (loading) {
    return (
      <OnboardingWizardShell embedded={embedded}>
        {!embedded && <PageHeader title="Configuration Sojori" count="Chargement…" />}
        <div
          className="ob-wizard ob-wizard--embedded"
          style={{ display: 'flex', justifyContent: 'center', padding: embedded ? 48 : 80 }}
        >
          <CircularProgress sx={{ color: '#b8851a' }} />
        </div>
      </OnboardingWizardShell>
    );
  }

  const isLast = draft.currentPanel >= 8;

  return (
    <OnboardingWizardShell embedded={embedded}>
      {!embedded ? (
        <PageHeader
          title="Configuration Sojori"
          count={`Étape ${panelToStepIndex(draft.currentPanel) + 1}/${WIZARD_STEP_COUNT} · ${progressPercent}%`}
        >
          <Button sx={btnGhostSx} onClick={() => void handleSaveAndExit()}>
            Enregistrer et continuer plus tard
          </Button>
        </PageHeader>
      ) : (
        <div className="ob-team-setup-bar">
          <div>
            <div className="ob-team-setup-title">Configuration initiale</div>
            <div className="ob-team-setup-sub">
              Étape {panelToStepIndex(draft.currentPanel) + 1}/{WIZARD_STEP_COUNT} · {progressPercent}% — enregistrez et reprenez quand vous voulez ·{' '}
              <span className="ob-team-setup-hint">cliquez une étape du stepper pour modifier</span>
            </div>
          </div>
          <Button size="small" sx={btnGhostSx} onClick={() => void handleSaveAndExit()}>
            Enregistrer et quitter
          </Button>
        </div>
      )}

      <div className="ob-wizard ob-wizard--embedded">
        {error && (
          <div className="ob-wizard-alert">
            <Alert severity="error">{error}</Alert>
          </div>
        )}

        <OnboardingStepper
          draft={draft}
          progressPercent={progressPercent}
          onSelect={(panel) => wizard.setCurrentPanel(panel)}
        />

        <div className="ob-shell">
          <main>
            <OnboardingStepPanels wizard={wizard} ownerId={targetOwnerId!} />
            {!isLast ? (
              <div className="ob-actions">
                {draft.currentPanel > 0 && (
                  <button
                    type="button"
                    className="ob-btn-ghost"
                    onClick={() => wizard.setCurrentPanel(prevWizardPanel(draft.currentPanel))}
                    disabled={saving}
                  >
                    Retour
                  </button>
                )}
                <button
                  type="button"
                  className="ob-btn-ghost"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <Button
                  sx={btnPrimarySx}
                  disabled={saving}
                  onClick={() => void handleContinue()}
                >
                  {saving ? 'Enregistrement…' : 'Continuer'}
                </Button>
              </div>
            ) : (
              <div className="ob-actions ob-actions--recap">
                <button
                  type="button"
                  className="ob-btn-ghost"
                  onClick={() => wizard.setCurrentPanel(prevWizardPanel(draft.currentPanel))}
                  disabled={saving}
                >
                  ← Retour
                </button>
                <button
                  type="button"
                  className="ob-btn-ghost"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? 'Enregistrement…' : 'Enregistrer le brouillon'}
                </button>
              </div>
            )}
          </main>
          <OnboardingTrackingPanel
            draft={draft}
            onboarding={onboarding}
            lastSavedAt={lastSavedAt}
            saving={saving}
            showAuditJournal={onboardingSuiteViewMode(user, showOwnerFilter) === 'admin'}
            onGoToPanel={(panel) => wizard.setCurrentPanel(panel)}
          />
        </div>
      </div>
    </OnboardingWizardShell>
  );
}
