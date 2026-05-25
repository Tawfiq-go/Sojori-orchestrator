/**
 * Catalogue officiel srv-fulltask — doit rester aligné avec
 * apps/srv-fulltask/src/types/domain.ts TASK_TYPES
 */
export const FULLTASK_TASK_TYPES = [
  'arrival_choose',
  'departure_choose',
  'cleaning_free',
  'arrival_declare',
  'departure_declare',
  'registration',
  'cleaning_paid',
  'checkout_cleaning',
  'transport',
  'groceries',
  'concierge',
  'support',
  'service_client',
] as const;

export type FulltaskTaskTypeId = (typeof FULLTASK_TASK_TYPES)[number];

export const FULLTASK_TASK_TYPE_LABELS: Record<FulltaskTaskTypeId, string> = {
  arrival_choose: 'Choisir arrivée',
  departure_choose: 'Choisir départ',
  cleaning_free: 'Ménage gratuit',
  arrival_declare: 'Déclarer arrivée',
  departure_declare: 'Déclarer départ',
  registration: 'Enregistrement',
  cleaning_paid: 'Ménage payant',
  checkout_cleaning: 'Ménage checkout',
  transport: 'Transport',
  groceries: 'Courses',
  concierge: 'Conciergerie',
  support: 'Support',
  service_client: 'Service client',
};

export const FULLTASK_TASK_TYPE_EMOJI: Partial<Record<FulltaskTaskTypeId, string>> = {
  arrival_choose: '🛬',
  departure_choose: '🛫',
  cleaning_free: '🧹',
  arrival_declare: '🛬',
  departure_declare: '🛫',
  registration: '📝',
  cleaning_paid: '✨',
  checkout_cleaning: '🧼',
  transport: '🚗',
  groceries: '🛒',
  concierge: '🛎',
  support: '🆘',
  service_client: '💌',
};

export function labelForTaskTypeId(id: string): string {
  return FULLTASK_TASK_TYPE_LABELS[id as FulltaskTaskTypeId] || id;
}

export function defaultWorkflowAssignment() {
  return {
    reference: 'check_in' as const,
    windowStart: { value: -7, unit: 'days' as const, time: '09:00' },
    windowEnd: { value: 0, unit: 'days' as const, time: '23:00' },
    autoAssign: false,
    assignmentHoursMode: 'planning' as const,
    findAnotherStaff: true,
    acceptToleranceHours: 3,
    attemptWindows: ['11:00', '16:00'],
  };
}

export function emptyWorkflowPlan(taskTypeId: FulltaskTaskTypeId) {
  return {
    _id: `wf-new-${taskTypeId}-${Date.now()}`,
    kind: taskTypeId,
    taskTypeId,
    label: labelForTaskTypeId(taskTypeId),
    description: `${taskTypeId} · plan orchestration`,
    enabled: true,
    triggerTaskType: taskTypeId,
    relances: [],
    staffReminders: [],
    assignment: null,
    escalationEnabled: false,
    deadline: {
      reference: 'check_in' as const,
      delay: { value: -1, unit: 'days' as const },
      time: '14:00',
      hardLockAfter: true,
      notifyPM: true,
    },
  };
}
