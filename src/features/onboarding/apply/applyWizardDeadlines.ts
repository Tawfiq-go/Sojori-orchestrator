import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import type { WizardCapabilities, WizardDeadlines } from '../types';
import { isServiceRhythmEnabled, resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { buildFulltaskWorkflowPatchFromRhythmRow } from './buildWorkflowExecutionFromRhythm';

type WorkflowRow = {
  type?: string;
  enabled?: boolean;
};

/**
 * Met à jour reminders, staffAssignment, staffReminders et escalade sur les workflows.
 * Les services désactivés dans le wizard sont réécrits proprement avec enabled=false
 * (sinon le reliquat du template global reste actif côté fulltask).
 */
export async function applyWizardDeadlines(
  ownerId: string,
  deadlines: WizardDeadlines,
  capabilities?: WizardCapabilities,
): Promise<number> {
  const raw = await fulltaskApi.getOrchestrationConfig(ownerId, { strictOwner: true }).catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ workflows?: WorkflowRow[] }>(raw) : null;
  const workflows = [...(doc?.workflows ?? [])];
  if (!workflows.length) return 0;

  // Sans filtre capabilities : les services désactivés doivent aussi être patchés (enabled=false).
  const rows = resolveServiceRhythmRows(deadlines);
  const rowByType = new Map(rows.map((r) => [r.taskType, r]));

  let updated = 0;
  const next = workflows.map((wf) => {
    const row = wf.type ? rowByType.get(wf.type) : undefined;
    if (!row) return wf;
    updated += 1;
    const serviceEnabled = isServiceRhythmEnabled(capabilities, row);
    return buildFulltaskWorkflowPatchFromRhythmRow(
      row,
      deadlines,
      serviceEnabled && wf.enabled !== false,
    );
  });

  if (updated === 0) return 0;
  await fulltaskApi.upsertOrchestrationConfig(ownerId, { workflows: next });
  return updated;
}
