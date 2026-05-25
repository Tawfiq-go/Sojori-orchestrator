import type { PlanEvent } from './types';

/** Ordre par défaut (seed orchestration complète). */
export const DEFAULT_UI_PLAN_LIST_ORDER: string[] = [
  'sched:welcome_sojori_v2',
  'wf:arrival_choose',
  'wf:arrival_declare',
  'wf:registration',
  'sched:checkin_feedback',
  'wf:cleaning_free',
  'wf:cleaning_paid',
  'wf:transport',
  'wf:groceries',
  'wf:concierge',
  'sched:departure_instructions',
  'wf:departure_choose',
  'wf:departure_declare',
  'sched:checkout_feedback',
  'wf:support',
  'wf:service_client',
];

export function messagePlanOrderKey(messageId?: string, template?: string): string | undefined {
  const id = messageId?.trim() || template?.trim();
  return id ? `sched:${id}` : undefined;
}

export function sequencePlanOrderKey(taskType: string): string {
  return `wf:${taskType}`;
}

export function sortPlanEventsByListOrder(
  events: PlanEvent[],
  listOrder: string[] = DEFAULT_UI_PLAN_LIST_ORDER,
): PlanEvent[] {
  const order = listOrder.length ? listOrder : DEFAULT_UI_PLAN_LIST_ORDER;
  const rank = new Map(order.map((k, i) => [k, i]));

  const sorted = [...events].sort((a, b) => {
    const ra = a.planOrderKey ? rank.get(a.planOrderKey) : undefined;
    const rb = b.planOrderKey ? rank.get(b.planOrderKey) : undefined;
    const ia = ra ?? 9999;
    const ib = rb ?? 9999;
    if (ia !== ib) return ia - ib;
    return new Date(a.at).getTime() - new Date(b.at).getTime();
  });

  return sorted.map((ev, i) => ({ ...ev, planStep: i + 1 }));
}
