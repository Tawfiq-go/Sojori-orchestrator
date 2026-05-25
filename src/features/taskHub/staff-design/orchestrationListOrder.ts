import { buildOrchestrationJourneyList, type JourneyListItem } from './orchestrationJourneyOrder';
import type { ScheduledOrchestrationMessage, Workflow } from './types';

export type OrchListKey = `sched:${string}` | `wf:${string}`;

export function schedListKey(ruleId: string): OrchListKey {
  return `sched:${ruleId}`;
}

export function wfListKey(workflowId: string): OrchListKey {
  return `wf:${workflowId}`;
}

/** Ordre par défaut (parcours voyageur) à l’import config. */
export function defaultOrchestrationListOrder(
  scheduledRules: ScheduledOrchestrationMessage[],
  workflows: Workflow[],
): OrchListKey[] {
  return buildOrchestrationJourneyList(scheduledRules, workflows).map((item) =>
    item.kind === 'scheduled'
      ? schedListKey(item.rule.catalogMessageId || item.rule._id)
      : wfListKey(item.workflow.taskTypeId || item.workflow._id),
  );
}

/** Réaligne uiPlanListOrder (seed / anciennes versions) sur les _id workflow + messageId plan. */
export function reconcileOrchestrationListOrder(
  listOrder: string[],
  scheduledRules: ScheduledOrchestrationMessage[],
  workflows: Workflow[],
): OrchListKey[] {
  const result: OrchListKey[] = [];
  const seen = new Set<string>();

  const push = (key: OrchListKey) => {
    if (seen.has(key)) return;
    seen.add(key);
    result.push(key);
  };

  const resolve = (raw: string): OrchListKey | null => {
    if (raw.startsWith('sched:')) {
      const suffix = raw.slice(6);
      const rule = scheduledRules.find(
        (r) =>
          r._id === suffix ||
          r._id === raw ||
          r.catalogMessageId === suffix ||
          r._id === `sched-${suffix}`,
      );
      if (rule) return schedListKey(rule.catalogMessageId || rule._id);
    }
    if (raw.startsWith('wf:')) {
      const suffix = raw.slice(3);
      const wf = workflows.find((w) => {
        if (w._id === suffix || w.taskTypeId === suffix || w._id === `wf-${suffix}`) return true;
        const legacy = /^wf-(.+)-(\d+)$/.exec(w._id);
        return legacy?.[1] === suffix;
      });
      if (wf) return wfListKey(wf.taskTypeId || wf._id);
    }
    const wfDirect = workflows.find((w) => w._id === raw);
    if (wfDirect) return wfListKey(wfDirect.taskTypeId || wfDirect._id);
    const schedDirect = scheduledRules.find((r) => r._id === raw);
    if (schedDirect) return schedListKey(schedDirect.catalogMessageId || schedDirect._id);
    return null;
  };

  for (const raw of listOrder) {
    const key = resolve(raw);
    if (key) push(key);
  }

  for (const key of defaultOrchestrationListOrder(scheduledRules, workflows)) {
    push(key);
  }

  return result;
}

export function journeyItemsFromListOrder(
  listOrder: OrchListKey[],
  scheduledRules: ScheduledOrchestrationMessage[],
  workflows: Workflow[],
): JourneyListItem[] {
  const schedById = new Map(scheduledRules.map((r) => [r._id, r]));
  const wfById = new Map(workflows.map((w) => [w._id, w]));
  const items: JourneyListItem[] = [];
  const seenSched = new Set<string>();
  const seenWf = new Set<string>();

  for (const key of listOrder) {
    if (key.startsWith('sched:')) {
      const id = key.slice(6);
      const rule = schedById.get(id);
      if (rule) {
        items.push({ kind: 'scheduled', rule });
        seenSched.add(id);
      }
    } else if (key.startsWith('wf:')) {
      const id = key.slice(3);
      const workflow = wfById.get(id);
      if (workflow) {
        items.push({ kind: 'workflow', workflow });
        seenWf.add(id);
      }
    }
  }

  for (const rule of scheduledRules) {
    if (!seenSched.has(rule._id)) items.push({ kind: 'scheduled', rule });
  }
  for (const workflow of workflows) {
    if (!seenWf.has(workflow._id)) items.push({ kind: 'workflow', workflow });
  }

  return items;
}

/** Réordonne tableaux sauvegardés API selon l’ordre affiché. */
export function applyListOrderToState(
  listOrder: OrchListKey[],
  scheduledRules: ScheduledOrchestrationMessage[],
  workflows: Workflow[],
): { scheduledRules: ScheduledOrchestrationMessage[]; workflows: Workflow[] } {
  const schedById = new Map(scheduledRules.map((r) => [r._id, r]));
  const wfById = new Map(workflows.map((w) => [w._id, w]));
  const orderedSched: ScheduledOrchestrationMessage[] = [];
  const orderedWf: Workflow[] = [];
  const seenSched = new Set<string>();
  const seenWf = new Set<string>();

  for (const key of listOrder) {
    if (key.startsWith('sched:')) {
      const id = key.slice(6);
      const r = schedById.get(id);
      if (r) {
        orderedSched.push(r);
        seenSched.add(id);
      }
    } else if (key.startsWith('wf:')) {
      const id = key.slice(3);
      const w = wfById.get(id);
      if (w) {
        orderedWf.push(w);
        seenWf.add(id);
      }
    }
  }

  for (const r of scheduledRules) {
    if (!seenSched.has(r._id)) orderedSched.push(r);
  }
  for (const w of workflows) {
    if (!seenWf.has(w._id)) orderedWf.push(w);
  }

  return { scheduledRules: orderedSched, workflows: orderedWf };
}
