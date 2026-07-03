import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import type { WizardDraft } from '../types';
import { applyWizardDeadlines } from './applyWizardDeadlines';
import { replaceOwnerExecutionsFromWizard } from './replaceOwnerExecutionsFromWizard';
import { syncOwnerExecutionFromFulltask } from './syncOwnerExecutionFromFulltask';

async function ownerHasFulltaskWorkflows(ownerId: string): Promise<boolean> {
  const raw = await fulltaskApi
    .getOrchestrationConfig(ownerId, { strictOwner: true })
    .catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ workflows?: unknown[] }>(raw) : null;
  return (doc?.workflows?.length ?? 0) > 0;
}

/** Étape 6 wizard → srv-fulltask workflows + owner_orchestrations.execution (srv-listing). */
export async function applyWizardDeadlinesToOwnerModel(
  ownerId: string,
  draft: WizardDraft,
): Promise<{
  deadlinesPatched: number;
  executionReplaced: number;
  executionSynced: number;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const p6 = draft.panels['6'];
  if (!p6?.deadlines) {
    return {
      deadlinesPatched: 0,
      executionReplaced: 0,
      executionSynced: 0,
      warnings: ['Délais wizard absents'],
    };
  }

  if (!(await ownerHasFulltaskWorkflows(ownerId))) {
    try {
      await fulltaskApi.copyOrchestrationConfigToOwner('global', ownerId);
    } catch (e) {
      warnings.push(
        e instanceof Error ? `Copie template fulltask : ${e.message}` : 'Copie template fulltask échouée',
      );
    }
  }

  let deadlinesPatched = 0;
  try {
    deadlinesPatched = await applyWizardDeadlines(
      ownerId,
      p6.deadlines,
      draft.panels['3']?.capabilities,
    );
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Délais fulltask non appliqués');
  }

  let executionReplaced = 0;
  try {
    executionReplaced = await replaceOwnerExecutionsFromWizard(
      ownerId,
      p6.deadlines,
      draft.panels['3']?.capabilities,
    );
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Remplacement execution owner échoué');
  }

  let executionSynced = 0;
  try {
    executionSynced = await syncOwnerExecutionFromFulltask(ownerId);
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Sync execution owner échouée');
  }

  if (deadlinesPatched === 0) {
    warnings.push('Aucun workflow fulltask mis à jour — lancez « Plan orchestration » dans la Suite si besoin');
  }

  return { deadlinesPatched, executionReplaced, executionSynced, warnings };
}
