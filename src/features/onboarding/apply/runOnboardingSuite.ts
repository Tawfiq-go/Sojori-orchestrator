import type { RuImportProgressData } from '../../../hooks/useRuImportProgress';
import { staffDisplayName } from '../staffNormalize';
import type { WizardDraft, WizardPanel7 } from '../types';
import {
  applyOnboardingOrchestration,
  propagateOnboardingOrchestrationToListings,
} from './applyOnboardingOrchestration';
import {
  applyOnboardingStaff,
  loadExistingStaffKeys,
  phasesNeededInDraft,
  STAFF_APPLY_PHASE_ORDER,
  STAFF_PHASE_LABELS,
  type StaffApplyPhase,
} from './applyOnboardingStaff';
import { fetchRuOwnerProperties } from '../../../services/channelsDashboardApi';
import {
  importRecapFromPanel7,
  reconcilePanel7WithChannels,
} from './syncPanel7FromChannels';
import { runRuBatchImport } from './runRuBatchImport';
import {
  formatImportApplyRecap,
  formatOrchestrationApplyRecap,
  formatStaffApplyRecap,
  mergeImportRecap,
} from './suiteApplyRecap';

/** Ordre strict de la suite onboarding. */
export const SUITE_STEP_ORDER = [
  'admin-wa',
  'staff-ops',
  'dashboard',
  'plan',
  'import',
  'orch-resa',
] as const;

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
  import: 'Importer les annonces Airbnb',
  'orch-resa': 'Orchestration des réservations',
};

/** Fusionne importedRuIds du wizard avec les annonces déjà mappées côté srv-listing. */
async function syncImportedRuIdsFromChannels(
  ownerId: string,
  p7: WizardPanel7,
): Promise<number[]> {
  const selected = new Set((p7.selectedRuIds ?? []).map(Number));
  const merged = new Set((p7.importedRuIds ?? []).map(Number));
  if (selected.size === 0) return [...merged];

  try {
    const res = await fetchRuOwnerProperties(ownerId);
    const payload = res.data as {
      properties?: Array<{ ruPropertyId?: number; alreadyImported?: boolean }>;
    };
    for (const row of payload.properties ?? []) {
      const ruId = Number(row.ruPropertyId);
      if (row.alreadyImported && selected.has(ruId)) merged.add(ruId);
    }
  } catch {
    /* best-effort — ne bloque pas la suite */
  }
  return [...merged];
}

function isImportFullyDone(p7: WizardPanel7 | undefined): boolean {
  const selected = p7?.selectedRuIds ?? [];
  const imported = p7?.importedRuIds ?? [];
  if (selected.length === 0) return false;
  const importedSet = new Set(imported.map(Number));
  return selected.every((id) => importedSet.has(Number(id)));
}

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
    case 'import':
      return isImportFullyDone(draft.panels['7'] as WizardPanel7) || completed.includes('import');
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
    case 'import':
      return { headline: log.importSummary, lines: log.importRecapLines };
    default:
      return {};
  }
}

function buildInitialSteps(draft: WizardDraft): SuiteStepState[] {
  const p7 = draft.panels['7'] as WizardPanel7 | undefined;
  const hasImport = (p7?.selectedRuIds?.length ?? 0) > 0 && !p7?.importSkippedLater;
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

  if (hasImport) {
    const importDone = stepDoneFromLog(draft, 'import');
    steps.push({
      id: 'import',
      label: STEP_LABELS.import,
      status: importDone ? 'done' : 'pending',
      headline: importDone
        ? draft.applyLog?.importSummary
        : `${p7?.selectedRuIds?.length ?? 0} annonce(s) — import une par une`,
      lines: draft.applyLog?.importRecapLines,
      detail: importDone ? draft.applyLog?.importSummary : undefined,
    });
  }

  steps.push({
    id: 'orch-resa',
    label: STEP_LABELS['orch-resa'],
    status: stepDoneFromLog(draft, 'orch-resa') ? 'done' : 'pending',
    headline: 'Suivi manuel depuis chaque fiche listing',
    lines: ['Après import — lancer depuis Annonces'],
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

function buildImportLines(
  preview: WizardPanel7['selectedRuPreview'],
  importedSet: Set<number>,
  currentRuId?: number,
): string[] {
  return (preview ?? []).map((row) => {
    const id = Number(row.ruPropertyId);
    if (importedSet.has(id)) return `✓ ${row.name}`;
    if (currentRuId != null && id === currentRuId) return `… ${row.name} (en cours)`;
    return `○ ${row.name}`;
  });
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
  onImportProgress?: (data: RuImportProgressData | null) => void;
};

export type RunOnboardingSuiteResult = {
  draft: WizardDraft;
  steps: SuiteStepState[];
  success: boolean;
  fatalError?: string;
};

/**
 * Suite onboarding — ordre strict :
 * 1 Admin WA → 2 Staff OPS → 3 Dashboard → 4 Plan orchestration → 5 Import (1 par 1) → 6 Résa (info)
 */
export async function runOnboardingSuite(
  options: RunOnboardingSuiteOptions,
): Promise<RunOnboardingSuiteResult> {
  const { ownerId, draft: initialDraft, resume = true, onProgress, onImportProgress } = options;
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
        propagateToListings: false,
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

    let p7 = draft.panels['7'] as WizardPanel7 | undefined;
    if (p7) {
      const reconciled = await reconcilePanel7WithChannels(ownerId, p7);
      p7 = reconciled.panel;
      const syncedImported = await syncImportedRuIdsFromChannels(ownerId, p7);
      p7 = { ...p7, importedRuIds: syncedImported };
      if (reconciled.recapStale && isImportFullyDone(p7)) {
        const importRecap = importRecapFromPanel7(p7, 2);
        draft = {
          ...draft,
          panels: { ...draft.panels, '7': p7 },
          applyLog: {
            ...draft.applyLog,
            importSummary: importRecap.headline,
            importRecapLines: importRecap.lines,
          },
        };
      } else if (
        syncedImported.length !== ((draft.panels['7'] as WizardPanel7)?.importedRuIds ?? []).length ||
        reconciled.recapStale
      ) {
        draft = {
          ...draft,
          panels: { ...draft.panels, '7': p7 },
        };
      }
    }
    if (p7 && shouldRun('import')) {

      const importProgressHandler = (data: RuImportProgressData | null) => {
        onImportProgress?.(data);
      };

      steps = patchStep(steps, 'import', {
        status: 'running',
        headline: 'Import Airbnb — annonce par annonce',
        lines: buildImportLines(p7.selectedRuPreview, new Set((p7.importedRuIds ?? []).map(Number))),
      });
      emit('running', 'import');

      const selectedIds = p7.selectedRuIds ?? [];
      const alreadyImported = new Set((p7.importedRuIds ?? []).map(Number));
      const pendingIds = selectedIds.filter((id) => !alreadyImported.has(id));

      if (pendingIds.length === 0) {
        let propagated = 0;
        try {
          propagated = await propagateOnboardingOrchestrationToListings(ownerId, draft);
        } catch {
          /* propagation best-effort */
        }
        const importRecap = mergeImportRecap(
          formatImportApplyRecap(
            (p7.selectedRuPreview ?? []).map((row) => ({
              ruPropertyId: String(row.ruPropertyId),
              propertyName: row.name,
              listingName: row.name,
              city: row.cityName || row.ruCity,
              success: true,
            })),
            { audience: 'pm' },
          ),
          propagated,
        );
        draft = {
          ...draft,
          suiteCompleted: [...new Set([...(draft.suiteCompleted ?? []), 'import'])],
          applyLog: {
            ...draft.applyLog,
            importSummary: importRecap.headline,
            importRecapLines: importRecap.lines,
          },
        };
        steps = patchStep(steps, 'import', {
          status: 'done',
          headline: importRecap.headline,
          lines: importRecap.lines,
        });
        emit('running', 'import');
      } else {
        const nameMap = new Map(
          (p7.selectedRuPreview ?? []).map((p) => [
            String(p.ruPropertyId),
            { name: p.name, city: p.cityName || p.ruCity, cityId: p.cityId },
          ]),
        );
        const importedSoFar = new Set((p7.importedRuIds ?? []).map(Number));

        const results = await runRuBatchImport({
          ownerId,
          ruPropertyIds: pendingIds,
          nameMap,
          onProgress: importProgressHandler,
          onPropertyStart: ({ index, total, ruPropertyId, name }) => {
            steps = patchStep(steps, 'import', {
              status: 'running',
              headline: `Import ${index}/${total} — ${name}`,
              lines: buildImportLines(p7.selectedRuPreview, importedSoFar, ruPropertyId),
            });
            emit('running', 'import');
          },
          onPropertyDone: ({ ruPropertyId, success }) => {
            if (success) importedSoFar.add(ruPropertyId);
          },
        });

        const succeeded = results.filter((r) => r.success).map((r) => Number(r.ruPropertyId));
        draft = {
          ...draft,
          panels: {
            ...draft.panels,
            '7': { ...p7, importedRuIds: [...new Set([...(p7.importedRuIds ?? []), ...succeeded])] },
          },
        };

        let propagated = 0;
        if (succeeded.length > 0) {
          propagated = await propagateOnboardingOrchestrationToListings(ownerId, draft);
        }

        const importRecap = mergeImportRecap(formatImportApplyRecap(results, { audience: 'pm' }), propagated);
        draft = {
          ...draft,
          suiteCompleted: [...new Set([...(draft.suiteCompleted ?? []), 'import'])],
          applyLog: {
            ...draft.applyLog,
            importSummary: importRecap.headline,
            importRecapLines: importRecap.lines,
          },
        };

        const importFatal = succeeded.length === 0 && pendingIds.length > 0;
        steps = patchStep(steps, 'import', {
          status: importFatal ? 'error' : 'done',
          headline: importRecap.headline,
          lines: importRecap.lines,
          error: importFatal ? 'Aucune annonce importée' : undefined,
        });
        emit('running', 'import');
        if (importFatal) throw new Error("Import : aucune annonce n'a pu être importée");
      }
    }

    steps = patchStep(steps, 'orch-resa', {
      status: 'skipped',
      headline: 'À lancer depuis chaque fiche listing',
      lines: ['Ouvrez Annonces → fiche → orchestration des réservations'],
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
