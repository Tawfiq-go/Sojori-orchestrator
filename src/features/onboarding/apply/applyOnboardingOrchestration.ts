import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import { replaceOwnerOrchestrationCapabilities } from '../../orchestrationListingV3/ownerOrchestrationReplace';
import type { WizardDraft, WizardPanel7 } from '../types';
import { applyWizardDeadlines } from './applyWizardDeadlines';
import { syncOwnerExecutionFromFulltask } from './syncOwnerExecutionFromFulltask';
import { buildOwnerOrchestrationCapabilitiesFromWizard } from './buildOwnerOrchestrationFromWizard';
import listingsService from '../../../services/listingsService';
import { applyWithTimeout } from './applyWithTimeout';

import {
  buildOrchestrationApplyAudit,
  detectWizardOrchestrationGaps,
  formatOrchestrationAuditLines,
  logOnboardingAudit,
  verifyOwnerOrchestrationAfterApply,
} from './onboardingOrchestrationAudit';

export type ApplyOrchestrationPhase =
  | 'build'
  | 'capabilities'
  | 'verify'
  | 'fulltask-seed'
  | 'deadlines';

export type ApplyOrchestrationOptions = {
  propagateToListings?: boolean;
  onPhase?: (phase: ApplyOrchestrationPhase, headline: string) => void;
};

const PHASE_HEADLINES: Record<ApplyOrchestrationPhase, string> = {
  build: 'Préparation du plan orchestration…',
  capabilities: 'Enregistrement capabilities owner (srv-listing)…',
  verify: 'Vérification owner après apply…',
  'fulltask-seed': 'Synchronisation workflows fulltask…',
  deadlines: 'Application délais staff…',
};

function emitPhase(
  options: ApplyOrchestrationOptions | undefined,
  phase: ApplyOrchestrationPhase,
  headline?: string,
) {
  options?.onPhase?.(phase, headline ?? PHASE_HEADLINES[phase]);
}

async function ownerHasFulltaskWorkflows(ownerId: string): Promise<boolean> {
  const raw = await fulltaskApi
    .getOrchestrationConfig(ownerId, { strictOwner: true })
    .catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ workflows?: unknown[] }>(raw) : null;
  return (doc?.workflows?.length ?? 0) > 0;
}

async function ensureFulltaskWorkflowsFromGlobal(
  ownerId: string,
  warnings: string[],
): Promise<void> {
  if (await ownerHasFulltaskWorkflows(ownerId)) return;
  try {
    await applyWithTimeout('Copie template global fulltask', 90_000, () =>
      fulltaskApi.copyOrchestrationConfigToOwner('global', ownerId),
    );
  } catch (e) {
    warnings.push(
      e instanceof Error
        ? `Fulltask : copie template global ignorée (${e.message})`
        : 'Fulltask : copie template global ignorée',
    );
  }
}

export type ApplyOrchestrationResult = {
  capabilitiesApplied: number;
  jxPatched: number;
  conditionsApplied: boolean;
  deadlinesPatched: number;
  listingsUpdated: number;
  warnings: string[];
  auditLines: string[];
};

async function resolveListingIdsForPropagation(
  ownerId: string,
  p7?: WizardPanel7,
): Promise<string[] | 'all'> {
  const imported = p7?.importedRuIds ?? [];
  if (!imported.length) return 'all';

  const res = await listingsService.getListings({ limit: 500, page: 0, staging: false });
  const items = (res.data?.items ?? []).filter((l) => !ownerId || l.ownerId === ownerId);
  const ruSet = new Set(imported.map(String));
  const matched = items
    .filter((l) => (l.rentalUnitedIds || []).some((ru) => ruSet.has(String(ru))))
    .map((l) => l.id);
  return matched.length ? matched : 'all';
}

/** Propage le plan owner vers les listings importés (après batch import). */
export async function propagateOnboardingOrchestrationToListings(
  ownerId: string,
  draft: WizardDraft,
): Promise<number> {
  const p7 = draft.panels['7'];
  const target = await resolveListingIdsForPropagation(ownerId, p7);
  if (target === 'all') {
    const applyRes = await listingsService.applyOwnerOrchestrationToAllListings(ownerId);
    const data = (applyRes as { data?: { updated?: number; applied?: number } })?.data ?? applyRes;
    return Number(
      (data as { updated?: number; applied?: number })?.updated ??
        (data as { applied?: number })?.applied ??
        0,
    );
  }
  let listingsUpdated = 0;
  for (const listingId of target) {
    try {
      await listingsService.applyListingOrchestrationFromOwner(listingId);
      listingsUpdated += 1;
    } catch {
      /* continue */
    }
  }
  return listingsUpdated;
}

/**
 * Applique le plan orchestration wizard — **écrase** activation + config owner existantes.
 * Un seul PUT listing (16 capabilities) + reset fulltask depuis le template global + délais.
 */
export async function applyOnboardingOrchestration(
  ownerId: string,
  draft: WizardDraft,
  options?: ApplyOrchestrationOptions,
): Promise<ApplyOrchestrationResult> {
  const warnings: string[] = [...detectWizardOrchestrationGaps(draft)];
  const p6 = draft.panels['6'];

  emitPhase(options, 'build');
  const built = buildOwnerOrchestrationCapabilitiesFromWizard(draft);

  const audit = buildOrchestrationApplyAudit({
    ownerId,
    draft,
    activations: built.activations,
    capabilities: built.capabilities,
    jxPatched: built.jxPatched,
    conditionsApplied: built.conditionsApplied,
  });

  emitPhase(options, 'capabilities');
  await applyWithTimeout('PUT owner orchestration', 120_000, () =>
    replaceOwnerOrchestrationCapabilities(ownerId, built.capabilities, built.activations),
  );

  let finalAuditLines: string[] = [];
  emitPhase(options, 'verify');
  try {
    const verified = await applyWithTimeout('Vérification owner', 45_000, () =>
      verifyOwnerOrchestrationAfterApply(audit, built.activations),
    );
    if (verified.mismatches.length) {
      warnings.push(...verified.mismatches.map((m) => `Vérif owner : ${m}`));
    }
    finalAuditLines = formatOrchestrationAuditLines(verified);
    logOnboardingAudit('orchestration', finalAuditLines);
  } catch (e) {
    warnings.push(
      e instanceof Error ? `Vérif owner post-apply échouée : ${e.message}` : 'Vérif owner échouée',
    );
    finalAuditLines = formatOrchestrationAuditLines(audit);
  }

  let deadlinesPatched = 0;
  if (p6) {
    try {
      emitPhase(options, 'fulltask-seed');
      await ensureFulltaskWorkflowsFromGlobal(ownerId, warnings);

      emitPhase(options, 'deadlines');
      deadlinesPatched = await applyWithTimeout('Délais staff fulltask', 60_000, () =>
        applyWizardDeadlines(ownerId, p6.deadlines, draft.panels['3']?.capabilities),
      );
      if (deadlinesPatched === 0) {
        warnings.push('Délais staff : aucun workflow mis à jour (seed fulltask manquant ?)');
      }

      const executionSynced = await applyWithTimeout('Sync execution fulltask → owner', 45_000, () =>
        syncOwnerExecutionFromFulltask(ownerId),
      );
      if (executionSynced > 0) {
        finalAuditLines = [
          ...finalAuditLines,
          `Execution orchestration synchronisée depuis fulltask (${executionSynced} service(s))`,
        ];
      }
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : 'Délais non appliqués');
    }
  }

  let listingsUpdated = 0;
  if (options?.propagateToListings !== false) {
    try {
      listingsUpdated = await propagateOnboardingOrchestrationToListings(ownerId, draft);
      if (listingsUpdated > 0) {
        finalAuditLines = [...finalAuditLines, `Listings synchronisés depuis owner : ${listingsUpdated}`];
      }
    } catch (e) {
      warnings.push(e instanceof Error ? e.message : 'Propagation listings échouée');
    }
  }

  if (warnings.length) {
    finalAuditLines = [...finalAuditLines, ...warnings.map((w) => `⚠ ${w}`)];
  }

  return {
    capabilitiesApplied: Object.values(built.capabilities).filter((c) => c.decisions?.managed === true)
      .length,
    jxPatched: built.jxPatched,
    conditionsApplied: built.conditionsApplied,
    deadlinesPatched,
    listingsUpdated,
    warnings,
    auditLines: finalAuditLines,
  };
}
