import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import type { WizardCapabilities, WizardDeadlines, WizardScheduledMessageOverride } from '../types';
import { isServiceRhythmEnabled, resolveServiceRhythmRows } from '../onboardingWorkflowDefaults';
import { buildFulltaskWorkflowPatchFromRhythmRow } from './buildWorkflowExecutionFromRhythm';

type WorkflowRow = {
  type?: string;
  enabled?: boolean;
};

type ScheduledMessageRow = {
  messageId?: string;
  enabled?: boolean;
  trigger?: { ref?: string; day?: number; hours?: number; time?: string };
};

/**
 * Applique les réglages « quand envoyer chaque message » du wizard aux
 * scheduledMessages fulltask (fusion par messageId — textes et canaux conservés).
 */
export async function applyWizardScheduledMessages(
  ownerId: string,
  overrides: WizardScheduledMessageOverride[] | undefined,
): Promise<number> {
  if (!overrides?.length) return 0;
  const raw = await fulltaskApi.getOrchestrationConfig(ownerId, { strictOwner: true }).catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ scheduledMessages?: ScheduledMessageRow[] }>(raw) : null;
  const messages = [...(doc?.scheduledMessages ?? [])];
  if (!messages.length) return 0;

  let patched = 0;
  const next = messages.map((msg) => {
    const ov = overrides.find((o) => o.messageId === msg.messageId);
    if (!ov) return msg;
    patched += 1;
    const trigger = { ...(msg.trigger ?? {}) };
    if (ov.day !== undefined) trigger.day = ov.day;
    if (ov.hours !== undefined) trigger.hours = ov.hours;
    if (ov.time !== undefined) trigger.time = ov.time;
    return {
      ...msg,
      enabled: ov.enabled ?? msg.enabled,
      trigger,
    };
  });

  if (patched === 0) return 0;
  await fulltaskApi.upsertOrchestrationConfig(ownerId, { scheduledMessages: next });
  return patched;
}

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
