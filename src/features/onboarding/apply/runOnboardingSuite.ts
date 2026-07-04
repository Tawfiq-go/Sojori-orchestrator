import type { WizardDraft } from '../types';
import { applyOnboardingOrchestration } from './applyOnboardingOrchestration';
import {
  applyOnboardingStaff,
  loadExistingStaffKeys,
  phasesNeededInDraft,
  STAFF_APPLY_PHASE_ORDER,
  STAFF_PHASE_LABELS,
  type StaffApplyPhase,
} from './applyOnboardingStaff';
import { formatOrchestrationApplyRecap, formatStaffApplyRecap } from './suiteApplyRecap';

/**
 * Ordre strict de la suite onboarding.
 * L'import des annonces se fait hors onboarding (Annonces → Importer) —
 * le plan owner s'applique automatiquement aux annonces importées.
 */
export const SUITE_STEP_ORDER = ['admin-wa', 'staff-ops', 'dashboard', 'plan', 'orch-resa'] as const;

export type SuiteStepId = (typeof SUITE_STEP_ORDER)[number];

export type SuiteStepStatus = 'pending' | 'running' | 'done' | 'skipped' | 'error';

export type SuiteStepState = {
  id: SuiteStepId;
  label: string;
  status: SuiteStepStatus;
  headline?: string;
  lines?: string[];
  detail?: string;
  error?: string;
};

export type SuiteRunProgress = {
  phase: 'idle' | 'running' | 'done' | 'error';
  currentStep: SuiteStepId | null;
  steps: SuiteStepState[];
  draft: WizardDraft;
};

const PHASE_TO_STEP: Record<StaffApplyPhase, SuiteStepId> = {
  adminWhatsapp: 'admin-wa',
  taskStaff: 'staff-ops',
  dashboardEmail: 'dashboard',
};

const STEP_LABELS: Record<SuiteStepId, string> = {
  'admin-wa': 'Créer les admins WhatsApp',
  'staff-ops': 'Créer le staff terrain',
  dashboard: 'Créer les accès dashboard',
  plan: "Appliquer le plan d'orchestration",
  'orch-resa': 'Import & orchestration des réservations',
};

function stepDoneFromLog(draft: WizardDraft, id: SuiteStepId): boolean {
  const completed = draft.suiteCompleted ?? [];
  if (completed.includes(id)) return true;
  const log = draft.applyLog ?? {};
  switch (id) {
    case 'admin-wa':
      return Boolean(log.adminWaAt);
    case 'staff-ops':
      return Boolean(log.staffOpsAt);
    case 'dashboard':
      return Boolean(log.dashboardAt);
    case 'plan':
      return Boolean(log.orchestrationAt);
    case 'orch-resa':
      return completed.includes('orch-resa');
    default:
      return false;
  }
}

function logRecapForStep(draft: WizardDraft, id: SuiteStepId): { headline?: string; lines?: string[] } {
  const log = draft.applyLog ?? {};
  switch (id) {
    case 'admin-wa':
      return { headline: log.adminWaSummary, lines: log.adminWaRecapLines };
    case 'staff-ops':
      return { headline: log.staffOpsSummary, lines: log.staffOpsRecapLines };
    case 'dashboard':
      return { headline: log.dashboardSummary, lines: log.dashboardRecapLines };
    case 'plan':
      return { headline: log.orchestrationSummary, lines: log.orchestrationRecapLines };
    default:
      return {};
  }
}

function buildInitialSteps(draft: WizardDraft): SuiteStepState[] {
  const teamPhases = phasesNeededInDraft(draft);
  const steps: SuiteStepState[] = [];

  for (const phase of STAFF_APPLY_PHASE_ORDER) {
    if (!teamPhases.includes(phase)) continue;
    const id = PHASE_TO_STEP[phase];
    const recap = logRecapForStep(draft, id);
    steps.push({
      id,
      label: STEP_LABELS[id],
      status: stepDoneFromLog(draft, id) ? 'done' : 'pending',
      headline: recap.headline,
      lines: recap.lines,
      detail: recap.headline,
    });
  }

  steps.push({
    id: 'plan',
    label: STEP_LABELS.plan,
    status: stepDoneFromLog(draft, 'plan') ? 'done' : 'pending',
    ...logRecapForStep(draft, 'plan'),
    detail: draft.applyLog?.orchestrationSummary,
  });

  steps.push({
    id: 'orch-resa',
    label: STEP_LABELS['orch-resa'],
    status: stepDoneFromLog(draft, 'orch-resa') ? 'done' : 'pending',
    headline: 'Après l’onboarding — depuis Annonces',
    lines: [
      'Annonces → Importer : le plan owner s’applique automatiquement',
      'Puis fiche listing → orchestration des réservations',
    ],
  });

  return steps;
}

export function buildSuiteStepsFromDraft(draft: WizardDraft): SuiteStepState[] {
  return buildInitialSteps(draft);
}

function patchStep(
  steps: SuiteStepState[],
  id: SuiteStepId,
  patch: Partial<SuiteStepState>,
): SuiteStepState[] {
  return steps.map((s) => (s.id === id ? { ...s, ...patch } : s));
}

function applyLogPatchForStaffPhase(
  phase: StaffApplyPhase,
  recap: { headline: string; lines: string[] },
): Partial<NonNullable<WizardDraft['applyLog']>> {
  const at = new Date().toISOString();
  switch (phase) {
    case 'adminWhatsapp':
      return { adminWaAt: at, adminWaSummary: recap.headline, adminWaRecapLines: recap.lines };
    case 'taskStaff':
      return { staffOpsAt: at, staffOpsSummary: recap.headline, staffOpsRecapLines: recap.lines };
    case 'dashboardEmail':
      return { dashboardAt: at, dashboardSummary: recap.headline, dashboardRecapLines: recap.lines };
  }
}

export type RunOnboardingSuiteOptions = {
  ownerId: string;
  draft: WizardDraft;
  resume?: boolean;
  onProgress: (progress: SuiteRunProgress) => void;
};

export type RunOnboardingSuiteResult = {
  draft: WizardDraft;
  steps: SuiteStepState[];
  success: boolean;
  fatalError?: string;
};

/**
 * Suite onboarding — ordre strict :
 * 1 Admin WA → 2 Staff OPS → 3 Dashboard → 4 Plan orchestration → 5 Import & résa (info)
 */
export async function runOnboardingSuite(
  options: RunOnboardingSuiteOptions,
): Promise<RunOnboardingSuiteResult> {
  const { ownerId, draft: initialDraft, resume = true, onProgress } = options;
  let draft = initialDraft;
  let steps = buildInitialSteps(draft);

  const emit = (phase: SuiteRunProgress['phase'], currentStep: SuiteStepId | null) => {
    onProgress({ phase, currentStep, steps, draft });
  };

  emit('running', null);

  const shouldRun = (id: SuiteStepId) => {
    const step = steps.find((s) => s.id === id);
    if (!step) return false;
    if (!resume) return true;
    return step.status !== 'done' && step.status !== 'skipped';
  };

  try {
    const teamPhases = phasesNeededInDraft(draft);
    const existing = await loadExistingStaffKeys(ownerId);

    for (const phase of STAFF_APPLY_PHASE_ORDER) {
      if (!teamPhases.includes(phase)) continue;
      const stepId = PHASE_TO_STEP[phase];
      if (!shouldRun(stepId)) continue;

      const phaseLabel = STAFF_PHASE_LABELS[phase];
      steps = patchStep(steps, stepId, {
        status: 'running',
        headline: `${phaseLabel}…`,
        lines: undefined,
      });
      emit('running', stepId);

      const staffResult = await applyOnboardingStaff(ownerId, draft, {
        phases: [phase],
        existing,
      });
      const recap = formatStaffApplyRecap(staffResult, { phaseLabel });

      const suiteCompleted = [...new Set([...(draft.suiteCompleted ?? []), stepId])];
      draft = {
        ...draft,
        suiteCompleted,
        applyLog: {
          ...draft.applyLog,
          ...applyLogPatchForStaffPhase(phase, recap),
          staffAt: new Date().toISOString(),
          staffSummary: recap.headline,
          staffRecapLines: recap.lines,
        },
      };

      const created = staffResult.results.reduce((n, r) => n + r.created.length, 0);
      const phaseError = staffResult.failed > 0 && created === 0 && staffResult.results.length > 0;

      steps = patchStep(steps, stepId, {
        status: phaseError ? 'error' : 'done',
        headline: recap.headline,
        lines: recap.lines,
        detail: recap.headline,
        error: phaseError ? `Aucun ${phaseLabel} créé` : undefined,
      });
      emit('running', stepId);
      if (phaseError) throw new Error(`${phaseLabel} : échec`);
    }

    if (shouldRun('plan')) {
      steps = patchStep(steps, 'plan', {
        status: 'running',
        headline: 'Création du plan orchestration…',
        lines: undefined,
      });
      emit('running', 'plan');

      const orchResult = await applyOnboardingOrchestration(ownerId, draft, {
        propagateToListings: true,
        onPhase: (_phase, headline) => {
          steps = patchStep(steps, 'plan', {
            status: 'running',
            headline,
          });
          emit('running', 'plan');
        },
      });
      const recap = formatOrchestrationApplyRecap(orchResult, { phase: 'template', audience: 'pm' });

      draft = {
        ...draft,
        suiteCompleted: [...new Set([...(draft.suiteCompleted ?? []), 'plan'])],
        applyLog: {
          ...draft.applyLog,
          orchestrationAt: new Date().toISOString(),
          orchestrationSummary: recap.headline,
          orchestrationRecapLines: recap.lines,
          orchestrationAuditLines: orchResult.auditLines,
        },
      };

      steps = patchStep(steps, 'plan', {
        status: 'done',
        headline: recap.headline,
        lines: recap.lines,
        detail: recap.headline,
      });
      emit('running', 'plan');
    }

    steps = patchStep(steps, 'orch-resa', {
      status: 'skipped',
      headline: 'Après l’onboarding — depuis Annonces',
      lines: [
        'Annonces → Importer : le plan owner s’applique automatiquement',
        'Puis fiche listing → orchestration des réservations',
      ],
    });

    steps = steps.map((s) => {
      if (s.id === 'orch-resa') return s;
      if ((s.status === 'pending' || s.status === 'running') && stepDoneFromLog(draft, s.id)) {
        const recap = logRecapForStep(draft, s.id);
        return {
          ...s,
          status: 'done' as const,
          headline: recap.headline ?? s.headline,
          lines: recap.lines ?? s.lines,
        };
      }
      return s;
    });

    emit('done', null);

    return { draft, steps, success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Suite onboarding interrompue';
    emit('error', null);
    return { draft, steps, success: false, fatalError: message };
  }
}
