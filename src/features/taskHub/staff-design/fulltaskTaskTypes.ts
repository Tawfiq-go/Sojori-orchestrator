import type { ReferencePoint } from './types';

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
  checkout_cleaning: 'Ménage Sojori',
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

/** Libellés Réf dans l’UI orchestration (V3 + éditeur staff). */
export const REFERENCE_POINT_LABELS: Record<ReferencePoint, string> = {
  reservation_date: 'Date réservation',
  check_in: 'Check-in',
  check_out: 'Check-out',
  task_created: 'Création tâche',
  previous_step_done: 'Date tâche',
};

const PARTNER_AUTO_ASSIGN_TYPES = new Set(['transport', 'groceries', 'concierge']);

/**
 * Référence par défaut relances / rappels / deadline — aligné srv-fulltask defaultSeeds.
 * `previous_step_done` = scheduledDate API = jour du créneau / intervention.
 */
export function defaultOrchestrationReferenceForTaskType(taskType?: string): ReferencePoint {
  const t = (taskType || '').toLowerCase();
  if (t === 'cleaning_free' || t === 'cleaning_paid') return 'previous_step_done';
  if (
    t === 'transport' ||
    t === 'groceries' ||
    t === 'concierge' ||
    t === 'checkout_cleaning'
  ) {
    return 'previous_step_done';
  }
  if (t === 'departure_choose' || t === 'departure_declare') return 'check_out';
  if (t === 'support' || t === 'service_client') return 'task_created';
  return 'check_in';
}

/** Assignation staff — début fenêtre (transport/courses/conciergerie : dès création tâche). */
function defaultAssignmentReferenceForTaskType(taskType?: string): ReferencePoint {
  const t = (taskType || '').toLowerCase();
  if (PARTNER_AUTO_ASSIGN_TYPES.has(t)) return 'task_created';
  return defaultOrchestrationReferenceForTaskType(taskType);
}

const ASSIGNMENT_DEFAULTS_BASE = {
  assignmentHoursMode: 'planning' as const,
  findAnotherStaff: true,
  releaseMode: 'tolerance' as const,
  acceptToleranceHours: 3,
  attemptWindows: ['09:00', '11:00'] as string[],
};

export function defaultWorkflowAssignment(taskType?: string) {
  const t = (taskType || '').toLowerCase();
  const reference = defaultAssignmentReferenceForTaskType(taskType);

  if (PARTNER_AUTO_ASSIGN_TYPES.has(t)) {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'task_created' as const,
      windowStart: { value: 0, unit: 'hours' as const, time: '09:00' },
      windowEnd: { value: -2, unit: 'hours' as const, time: '11:00' },
      autoAssign: true,
      findAnotherStaff: false,
    };
  }

  if (t === 'cleaning_free' || t === 'cleaning_paid') {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'previous_step_done' as const,
      windowStart: { value: -2, unit: 'days' as const, time: '09:00' },
      windowEnd: { value: -1, unit: 'days' as const, time: '11:00' },
      autoAssign: false,
    };
  }

  if (t === 'arrival_choose') {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'check_in' as const,
      windowStart: { value: -7, unit: 'days' as const, time: '09:00' },
      windowEnd: { value: -1, unit: 'days' as const, time: '11:00' },
      autoAssign: false,
    };
  }

  if (t === 'departure_choose') {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'check_out' as const,
      windowStart: { value: -5, unit: 'days' as const, time: '09:00' },
      windowEnd: { value: 0, unit: 'days' as const, time: '11:00' },
      autoAssign: false,
    };
  }

  if (t === 'checkout_cleaning') {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'check_out' as const,
      windowStart: { value: 1, unit: 'days' as const, time: '09:00' },
      windowEnd: { value: 4, unit: 'days' as const, time: '11:00' },
      autoAssign: false,
    };
  }

  if (t === 'support' || t === 'service_client') {
    return {
      ...ASSIGNMENT_DEFAULTS_BASE,
      reference: 'task_created' as const,
      windowStart: { value: 0, unit: 'hours' as const, time: '09:00' },
      windowEnd: { value: t === 'support' ? 4 : 24, unit: 'hours' as const, time: '11:00' },
      autoAssign: false,
    };
  }

  return {
    ...ASSIGNMENT_DEFAULTS_BASE,
    reference,
    windowStart: { value: -2, unit: 'days' as const, time: '09:00' },
    windowEnd: { value: -1, unit: 'days' as const, time: '11:00' },
    autoAssign: false,
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
