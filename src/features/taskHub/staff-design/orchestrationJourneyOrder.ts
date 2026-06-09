import type { FulltaskTaskTypeId } from './fulltaskTaskTypes';
import type { ScheduledOrchestrationMessage, Workflow } from './types';

/** Parcours voyageur : messages plan résa intercalés avec workflows tâche. */
export const ORCHESTRATION_JOURNEY_SLOTS: Array<
  | { kind: 'message'; catalogMessageId: string }
  | { kind: 'workflow'; taskTypeId: FulltaskTaskTypeId }
> = [
  { kind: 'message', catalogMessageId: 'welcome_sojori_v2' },
  { kind: 'workflow', taskTypeId: 'arrival_choose' },
  { kind: 'workflow', taskTypeId: 'registration' },
  { kind: 'workflow', taskTypeId: 'arrival_declare' },
  { kind: 'message', catalogMessageId: 'checkin_feedback' },
  { kind: 'workflow', taskTypeId: 'departure_choose' },
  { kind: 'message', catalogMessageId: 'departure_instructions' },
  { kind: 'workflow', taskTypeId: 'departure_declare' },
  { kind: 'workflow', taskTypeId: 'cleaning_free' },
  { kind: 'workflow', taskTypeId: 'cleaning_paid' },
  { kind: 'workflow', taskTypeId: 'checkout_cleaning' },
  { kind: 'workflow', taskTypeId: 'transport' },
  { kind: 'workflow', taskTypeId: 'groceries' },
  { kind: 'workflow', taskTypeId: 'concierge' },
  { kind: 'workflow', taskTypeId: 'support' },
  { kind: 'workflow', taskTypeId: 'service_client' },
  { kind: 'message', catalogMessageId: 'checkout_feedback' },
];

export const SCHEDULED_MESSAGE_EMOJI: Record<string, string> = {
  welcome_sojori_v2: '👋',
  checkin_feedback: '☺️',
  departure_instructions: '⭐',
  checkout_feedback: '💌',
};

export type JourneyListItem =
  | { kind: 'scheduled'; rule: ScheduledOrchestrationMessage }
  | { kind: 'workflow'; workflow: Workflow };

function workflowTaskTypeId(w: Workflow): string {
  return w.taskTypeId || w.triggerTaskType || String(w.kind);
}

export function sortWorkflowsByJourney(workflows: Workflow[]): Workflow[] {
  const order = ORCHESTRATION_JOURNEY_SLOTS.filter((s) => s.kind === 'workflow').map(
    (s) => (s as { kind: 'workflow'; taskTypeId: string }).taskTypeId,
  );
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...workflows].sort((a, b) => {
    const ra = rank.get(workflowTaskTypeId(a)) ?? 999;
    const rb = rank.get(workflowTaskTypeId(b)) ?? 999;
    if (ra !== rb) return ra - rb;
    return workflowTaskTypeId(a).localeCompare(workflowTaskTypeId(b));
  });
}

export function sortScheduledRulesByJourney(
  rules: ScheduledOrchestrationMessage[],
): ScheduledOrchestrationMessage[] {
  const order = ORCHESTRATION_JOURNEY_SLOTS.filter((s) => s.kind === 'message').map(
    (s) => (s as { kind: 'message'; catalogMessageId: string }).catalogMessageId,
  );
  const rank = new Map(order.map((id, i) => [id, i]));
  return [...rules].sort((a, b) => {
    const ra = rank.get(a.catalogMessageId) ?? 999;
    const rb = rank.get(b.catalogMessageId) ?? 999;
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label);
  });
}

export function buildOrchestrationJourneyList(
  scheduledRules: ScheduledOrchestrationMessage[],
  workflows: Workflow[],
): JourneyListItem[] {
  const rulesByCatalog = new Map(scheduledRules.map((r) => [r.catalogMessageId, r]));
  const wfByType = new Map<string, Workflow>();
  for (const w of workflows) {
    const tid = workflowTaskTypeId(w);
    if (!wfByType.has(tid)) wfByType.set(tid, w);
  }

  const items: JourneyListItem[] = [];
  const usedRules = new Set<string>();
  const usedWf = new Set<string>();

  for (const slot of ORCHESTRATION_JOURNEY_SLOTS) {
    if (slot.kind === 'message') {
      const rule = rulesByCatalog.get(slot.catalogMessageId);
      if (rule) {
        items.push({ kind: 'scheduled', rule });
        usedRules.add(rule._id);
      }
    } else {
      const wf = wfByType.get(slot.taskTypeId);
      if (wf) {
        items.push({ kind: 'workflow', workflow: wf });
        usedWf.add(wf._id);
      }
    }
  }

  for (const rule of sortScheduledRulesByJourney(scheduledRules)) {
    if (!usedRules.has(rule._id)) items.push({ kind: 'scheduled', rule });
  }
  for (const wf of sortWorkflowsByJourney(workflows)) {
    if (!usedWf.has(wf._id)) items.push({ kind: 'workflow', workflow: wf });
  }

  return items;
}
