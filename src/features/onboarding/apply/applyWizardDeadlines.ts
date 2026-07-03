import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import type { WizardCapabilities, WizardDeadlines } from '../types';
import { resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { buildFulltaskWorkflowPatchFromRhythmRow } from './buildWorkflowExecutionFromRhythm';

type WorkflowRow = {
  type?: string;
  enabled?: boolean;
};

/** Met à jour reminders, staffAssignment, staffReminders et escalade sur les workflows actifs. */
export async function applyWizardDeadlines(
  ownerId: string,
  deadlines: WizardDeadlines,
  capabilities?: WizardCapabilities,
): Promise<number> {
  const raw = await fulltaskApi.getOrchestrationConfig(ownerId, { strictOwner: true }).catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ workflows?: WorkflowRow[] }>(raw) : null;
  const workflows = [...(doc?.workflows ?? [])];
  if (!workflows.length) return 0;

  const rows = resolveServiceRhythmRows(deadlines, capabilities);
  const rowByType = new Map(rows.map((r) => [r.taskType, r]));

  let updated = 0;
  const next = workflows.map((wf) => {
    const row = wf.type ? rowByType.get(wf.type) : undefined;
    if (!row) return wf;
    updated += 1;
    return buildFulltaskWorkflowPatchFromRhythmRow(row, deadlines, wf.enabled !== false);
  });

  if (updated === 0) return 0;
  await fulltaskApi.upsertOrchestrationConfig(ownerId, { workflows: next });
  return updated;
}
