import type {
  AssignAttempt,
  EventStatus,
  PlanGuestRelanceItem,
  PlanStaffReminderItem,
  RelanceExecutionStatus,
  RelanceStatus,
  StaffAssignmentPlan,
} from './types';

const EXEC_LABELS: Record<RelanceExecutionStatus, string> = {
  prevision: 'Prévu',
  en_attente: 'En attente',
  envoyee: 'Envoyée',
  sautee: 'Sautée',
  echec: 'Échec',
};

export function relanceExecutionLabel(status: RelanceExecutionStatus): string {
  return EXEC_LABELS[status] ?? status;
}

export function relanceExecutionEventStatus(status: RelanceExecutionStatus): EventStatus {
  switch (status) {
    case 'envoyee':
      return 'done';
    case 'echec':
    case 'sautee':
      return 'blocked';
    case 'prevision':
      return 'future';
    case 'en_attente':
      return 'now';
    default:
      return 'pending';
  }
}

export function showRelanceConfigHint(status: RelanceExecutionStatus): boolean {
  return status === 'prevision' || status === 'en_attente';
}

const GROUP_LABELS: Record<EventStatus, string> = {
  done: 'Terminé',
  now: 'En cours',
  pending: 'En attente',
  blocked: 'Bloqué',
  future: 'À venir',
};

export function groupStatusLabel(status: EventStatus): string {
  return GROUP_LABELS[status] ?? status;
}

export function aggregateRelancesGroupStatus(
  relances: Pick<PlanGuestRelanceItem, 'status' | 'executionStatus'>[],
): EventStatus {
  if (relances.length === 0) return 'future';
  if (relances.every((r) => r.executionStatus === 'envoyee')) return 'done';
  if (relances.some((r) => r.executionStatus === 'echec' || r.executionStatus === 'sautee')) {
    return 'blocked';
  }
  if (relances.some((r) => r.executionStatus === 'envoyee')) return 'now';
  if (relances.every((r) => r.executionStatus === 'prevision')) return 'future';
  return 'pending';
}

export function aggregateStaffRemindersGroupStatus(
  reminders: Pick<PlanStaffReminderItem, 'status' | 'executionStatus'>[],
): EventStatus {
  return aggregateRelancesGroupStatus(reminders);
}

export function aggregateAssignGroupStatus(
  assign?: StaffAssignmentPlan,
  attempts?: AssignAttempt[],
): EventStatus {
  if (!assign) return 'future';
  if (assign.status === 'found') return 'done';
  if (assign.status === 'failed') return 'blocked';
  if (attempts?.some((a) => a.result === 'declined')) return 'now';
  if (attempts?.some((a) => a.result === 'accepted')) return 'done';
  if (attempts?.some((a) => a.result === 'pending')) return 'now';
  return 'now';
}
