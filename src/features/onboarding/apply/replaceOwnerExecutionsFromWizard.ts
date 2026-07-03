import listingsService from '../../../services/listingsService';
import { CAPABILITY_REGISTRY } from '../../serviceMatrix/capabilityRegistry';
import type { ListingCapabilityDoc } from '../../orchestrationListingV3/listingOrchestrationApi';
import type { WizardCapabilities, WizardDeadlines } from '../types';
import { resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { buildCapabilityExecutionFromRhythmRow } from './buildWorkflowExecutionFromRhythm';

function capabilityKeyForTaskType(taskType: string): string | undefined {
  return CAPABILITY_REGISTRY.find((def) => def.taskType === taskType)?.key;
}

function unwrapOwnerDoc(raw: unknown): { capabilities?: Record<string, ListingCapabilityDoc> } {
  return ((raw as { data?: { capabilities?: Record<string, ListingCapabilityDoc> } })?.data ??
    raw) as { capabilities?: Record<string, ListingCapabilityDoc> };
}

/** PUT owner_orchestrations.execution directement depuis les lignes wizard (étape 6). */
export async function replaceOwnerExecutionsFromWizard(
  ownerId: string,
  deadlines: WizardDeadlines,
  capabilities?: WizardCapabilities,
): Promise<number> {
  const raw = await listingsService.getOwnerOrchestrationCompiled(ownerId);
  const doc = unwrapOwnerDoc(raw);
  const existing = doc.capabilities ?? {};
  if (!Object.keys(existing).length) return 0;

  const rows = resolveServiceRhythmRows(deadlines, capabilities);
  if (!rows.length) return 0;

  const next: Record<string, ListingCapabilityDoc> = { ...existing };
  let patched = 0;

  for (const row of rows) {
    const capKey = capabilityKeyForTaskType(row.taskType);
    if (!capKey || !next[capKey]) continue;
    next[capKey] = {
      ...next[capKey],
      execution: buildCapabilityExecutionFromRhythmRow(row, deadlines),
    };
    patched += 1;
  }

  if (patched === 0) return 0;

  await listingsService.putOwnerOrchestration(ownerId, {
    capabilities: next,
    replaceCapabilities: true,
  });
  return patched;
}
