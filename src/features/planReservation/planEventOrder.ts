import type { PlanEvent } from './types';

/** Ordre par défaut = parcours voyageur (`ORCHESTRATION_JOURNEY_SLOTS`). */
export const DEFAULT_UI_PLAN_LIST_ORDER: string[] = [
  'sched:welcome_sojori_v2',
  'wf:arrival_choose',
  'wf:registration',
  'wf:arrival_declare',
  'sched:checkin_feedback',
  'wf:departure_choose',
  'sched:departure_instructions',
  'wf:departure_declare',
  'wf:cleaning_free',
  'wf:cleaning_paid',
  'wf:checkout_cleaning',
  'wf:transport',
  'wf:groceries',
  'wf:concierge',
  'wf:support',
  'wf:service_client',
  'sched:checkout_feedback',
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
