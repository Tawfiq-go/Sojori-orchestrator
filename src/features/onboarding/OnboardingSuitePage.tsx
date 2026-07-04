import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { getWizardDraft, patchOnboarding, saveWizardDraft } from '../../services/crmService';
import OnboardingSuiteApplySection from './components/OnboardingSuiteApplySection';
import { resolvePmOnboardingOwnerId, onboardingSuiteViewMode } from './resolveOwnerId';
import { suiteStepLinesForView, suiteRunningSubtitleText } from './suiteDisplayForView';
import { PM_ONBOARDING_WIZARD_PATH } from './wizardNavigation';
import type { WizardDraft } from './types';
import { staffDisplayName } from './staffNormalize';
import { staffApplyAccountCounts } from './staffRecap';
import {
  runOnboardingSuite,
  buildSuiteStepsFromDraft,
  type SuiteRunProgress,
  type SuiteStepId,
  type SuiteStepState,
} from './apply/runOnboardingSuite';
import type { ApplyRecap } from './apply/suiteApplyRecap';
import './onboarding-wizard.css';

type SuiteItemId = SuiteStepId;

type SuiteItem = {
  id: SuiteItemId;
  title: string;
  desc: string;
  done?: boolean;
  running?: boolean;
  runHeadline?: string;
  runLines?: string[];
  runError?: string;
  href?: string;
  expandable?: boolean;
};

function applyLogRecap(
  id: SuiteItemId,
  applyLog: WizardDraft['applyLog'],
): Pick<ApplyRecap, 'headline' | 'lines'> {
  if (!applyLog) return {};
  switch (id) {
    case 'admin-wa':
      return { headline: applyLog.adminWaSummary, lines: applyLog.adminWaRecapLines };
    case 'staff-ops':
      return { headline: applyLog.staffOpsSummary, lines: applyLog.staffOpsRecapLines };
    case 'dashboard':
      return { headline: applyLog.dashboardSummary, lines: applyLog.dashboardRecapLines };
    case 'plan':
      return { headline: applyLog.orchestrationSummary, lines: applyLog.orchestrationRecapLines };
    default:
      return {};
  }
}

function stepDesc(id: SuiteItemId, draft: WizardDraft | null, staffAccounts: ReturnType<typeof staffApplyAccountCounts>): string {
  switch (id) {
    case 'admin-wa':
      return `${staffAccounts.adminWhatsapp} admin(s) WhatsApp à créer`;
    case 'staff-ops':
      return `${staffAccounts.staffSimplified} staff terrain à créer`;
    case 'dashboard':
      return `${staffAccounts.dashboardWorkers} accès dashboard à créer`;
    case 'plan':
      return 'Template owner — capabilities, J-X, conditions, délais (remplace l\'existant)';
    case 'orch-resa':
      return 'Après l\'onboarding — Annonces → Importer (le plan s\'applique automatiquement)';
    default:
      return '';
  }
}

function stepHref(id: SuiteItemId): string | undefined {
  switch (id) {
    case 'admin-wa':
      return '/tasks/team?tab=admin';
    case 'staff-ops':
      return '/tasks/team?tab=worker';
    case 'dashboard':
      return '/admin/equipe?tab=worker';
    case 'plan':
      return '/tasks/orchestration';
    case 'orch-resa':
      return '/listings';
    default:
      return undefined;
  }
}

export function OnboardingSuitePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const autoRun = searchParams.get('run') === '1';
  const { user } = useAuth();
  const { showOwnerFilter, requestOwnerId } = useAdminOwnerFilter();
  const ownerId = resolvePmOnboardingOwnerId(user, requestOwnerId, showOwnerFilter);
  const [draft, setDraft] = useState<WizardDraft | null>(null);
  const [onboardingId, setOnboardingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<SuiteItemId | null>(null);
  const [saving, setSaving] = useState(false);
  const [suiteRunning, setSuiteRunning] = useState(false);
  const [runSteps, setRunSteps] = useState<SuiteStepState[] | null>(null);
  const [runPhase, setRunPhase] = useState<SuiteRunProgress['phase']>('idle');
  const autoRunStarted = useRef(false);

  useEffect(() => {
    if (!ownerId) return;
    void getWizardDraft(ownerId).then((res) => {
      const loaded = res.data.wizardDraft as WizardDraft;
      setDraft(loaded);
      setOnboardingId(res.data.onboarding?._id ?? null);
      setRunSteps(buildSuiteStepsFromDraft(loaded));
      if (loaded.applyLog?.suiteRunAt) setRunPhase('done');
    });
  }, [ownerId]);

  const p1 = draft?.panels['1'];
  const suiteCompleted = draft?.suiteCompleted ?? [];
  const applyLog = draft?.applyLog;
  const staffRows = (p1?.staff ?? []).filter((s) => staffDisplayName(s));
  const staffAccounts = staffApplyAccountCounts(staffRows);

  const suiteViewMode = onboardingSuiteViewMode(user, showOwnerFilter);

  const persistDraft = useCallback(
    async (next: WizardDraft) => {
      if (!ownerId) return;
      setSaving(true);
      try {
        await saveWizardDraft(ownerId, { wizardDraft: next, emitEvent: true });
        setDraft(next);
      } finally {
        setSaving(false);
      }
    },
    [ownerId],
  );

  const markStepDone = useCallback(
    (id: SuiteItemId, extra?: Partial<WizardDraft>) => {
      if (!draft) return;
      const completed = suiteCompleted.includes(id) ? suiteCompleted : [...suiteCompleted, id];
      void persistDraft({ ...draft, ...extra, suiteCompleted: completed });
    },
    [draft, persistDraft, suiteCompleted],
  );

  const handlePlanApplied = useCallback(
    (recap: ApplyRecap) => {
      if (!draft) return;
      void persistDraft({
        ...draft,
        suiteCompleted: suiteCompleted.includes('plan') ? suiteCompleted : [...suiteCompleted, 'plan'],
        applyLog: {
          ...draft.applyLog,
          orchestrationAt: new Date().toISOString(),
          orchestrationSummary: recap.headline,
          orchestrationRecapLines: recap.lines,
        },
      });
      setRunSteps((prev) =>
        (prev ?? buildSuiteStepsFromDraft(draft)).map((s) =>
          s.id === 'plan'
            ? { ...s, status: 'done' as const, headline: recap.headline, lines: recap.lines }
            : s,
        ),
      );
    },
    [draft, persistDraft, suiteCompleted],
  );

  const runFullSuite = useCallback(async () => {
    if (!ownerId || !draft || suiteRunning) return;
    setSuiteRunning(true);
    setRunPhase('running');
    setExpandedId(null);

    const draftForRun: WizardDraft = {
      ...draft,
      suiteCompleted: [],
      applyLog: {},
    };

    try {
      const result = await runOnboardingSuite({
        ownerId,
        draft: draftForRun,
        resume: false,
        onProgress: (p) => {
          setRunSteps(p.steps);
          setRunPhase(p.phase);
          setDraft(p.draft);
        },
      });

      const nextDraft: WizardDraft = {
        ...result.draft,
        applyLog: {
          ...result.draft.applyLog,
          suiteRunAt: new Date().toISOString(),
        },
      };

      await persistDraft(nextDraft);
      setRunSteps(result.steps);

      if (result.success) {
        if (onboardingId) {
          await patchOnboarding(onboardingId, { status: 'completed' });
        }
        setRunPhase('done');
        toast.success('Onboarding terminé — équipe et plan d\'orchestration appliqués');
      } else {
        setRunPhase('error');
        toast.error(result.fatalError ?? 'Suite interrompue');
      }
    } catch (e) {
      setRunPhase('error');
      toast.error(e instanceof Error ? e.message : 'Suite impossible');
    } finally {
      setSuiteRunning(false);
      if (searchParams.get('run')) {
        searchParams.delete('run');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, [ownerId, draft, suiteRunning, persistDraft, onboardingId, searchParams, setSearchParams]);

  useEffect(() => {
    if (!autoRun || !draft || !ownerId || autoRunStarted.current) return;
    autoRunStarted.current = true;
    void runFullSuite();
  }, [autoRun, draft, ownerId, runFullSuite]);

  const items: SuiteItem[] = useMemo(() => {
    if (!draft) return [];
    const stepsSource = runSteps ?? buildSuiteStepsFromDraft(draft);

    return stepsSource.map((step) => {
      const persisted = applyLogRecap(step.id, applyLog);
      const done = step.status === 'done' || step.status === 'skipped';
      return {
        id: step.id,
        title: step.label,
        desc: stepDesc(step.id, draft, staffAccounts),
        href: stepHref(step.id),
        expandable: !suiteRunning && step.id === 'plan',
        done,
        running: step.status === 'running',
        runHeadline: step.headline ?? step.detail ?? persisted.headline,
        runLines: suiteStepLinesForView(
          suiteViewMode,
          step.id,
          step.lines ?? persisted.lines,
          applyLog,
        ),
        runError: step.error,
      };
    });
  }, [draft, runSteps, applyLog, staffAccounts, suiteRunning, suiteViewMode]);

  const automatedDone = items.filter((i) => i.id !== 'orch-resa' && i.done).length;
  const automatedTotal = items.filter((i) => i.id !== 'orch-resa').length;
  const allAutomatedDone = automatedDone === automatedTotal && automatedTotal > 0;

  return (
    <DashboardWrapper breadcrumb={['Configuration', 'Suite']}>
      <div className="ob-wizard ob-wizard--embedded">
        <div className="ob-sh" style={{ maxWidth: 720 }}>
          <div className="eyebrow">Après le récapitulatif</div>
          <h1>Terminer l&apos;onboarding</h1>
          <p className="sub">
            {suiteRunning ? (
              <>
                {suiteRunningSubtitleText(suiteViewMode)}
                {saving && ' · Enregistrement…'}
              </>
            ) : runPhase === 'done' ? (
              <>
                <strong>{automatedDone}/{automatedTotal}</strong> étape
                {automatedTotal > 1 ? 's' : ''} automatique{automatedTotal > 1 ? 's' : ''} terminée
                {automatedTotal > 1 ? 's' : ''}. Réservations : suivi manuel depuis les annonces.
              </>
            ) : (
              <>
                <strong>{automatedDone}/{automatedTotal}</strong> étape
                {automatedTotal > 1 ? 's' : ''} terminée{automatedDone > 1 ? 's' : ''}.
                {saving && ' · Enregistrement…'}
              </>
            )}
          </p>

          <ul className="ob-suite-list">
            {items.map((item, idx) => {
              const expanded = expandedId === item.id;
              return (
                <li
                  key={item.id}
                  className={`ob-suite-item${item.done ? ' done' : ''}${item.running ? ' running' : ''}${item.runError ? ' error' : ''}`}
                >
                  <span className="ob-suite-num">
                    {item.running ? '…' : item.done ? '✓' : idx + 1}
                  </span>
                  <div className="ob-suite-body">
                    <strong>{item.title}</strong>
                    <p>{item.desc}</p>
                    {item.runLines && item.runLines.length > 0 && (
                      <ul className="ob-suite-run-lines">
                        {item.runLines.map((line, lineIdx) => (
                          <li key={`${item.id}-${lineIdx}`}>{line}</li>
                        ))}
                      </ul>
                    )}
                    {item.runError && (
                      <p className="ob-suite-run-error">{item.runError}</p>
                    )}
                    {!suiteRunning && (
                      <div className="ob-suite-item-actions">
                        {item.expandable && (
                          <button
                            type="button"
                            className="ob-btn-ghost ob-suite-link"
                            onClick={() => setExpandedId(expanded ? null : item.id)}
                          >
                            {expanded ? 'Masquer' : 'Apply manuel →'}
                          </button>
                        )}
                        {item.href && (
                          <Link to={item.href} className="ob-btn-ghost ob-suite-link">
                            Ouvrir →
                          </Link>
                        )}
                        {!item.done && item.id === 'orch-resa' && (
                          <button
                            type="button"
                            className="ob-btn-ghost ob-suite-link"
                            onClick={() => markStepDone(item.id)}
                          >
                            Marquer fait
                          </button>
                        )}
                      </div>
                    )}
                    {expanded && item.id === 'plan' && draft && ownerId && (
                      <OnboardingSuiteApplySection
                        ownerId={ownerId}
                        draft={draft}
                        audience={suiteViewMode === 'admin' ? 'admin' : 'pm'}
                        onApplied={handlePlanApplied}
                      />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="ob-actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="ob-btn-primary"
              disabled={suiteRunning || !draft || !ownerId}
              onClick={() => void runFullSuite()}
            >
              {suiteRunning
                ? 'Exécution en cours…'
                : allAutomatedDone
                  ? 'Relancer depuis le début'
                  : 'Lancer l\'onboarding'}
            </button>
            <button
              type="button"
              className="ob-btn-ghost"
              disabled={suiteRunning}
              onClick={() => navigate('/dashboard')}
            >
              Aller au dashboard
            </button>
            <button
              type="button"
              className="ob-btn-ghost"
              disabled={suiteRunning}
              onClick={() => navigate(PM_ONBOARDING_WIZARD_PATH)}
            >
              Modifier la configuration initiale
            </button>
          </div>
        </div>
      </div>
    </DashboardWrapper>
  );
}

export default OnboardingSuitePage;
