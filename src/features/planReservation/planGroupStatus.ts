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
  en_retard: 'En retard',  // ✅ BUG FIX #2: label pour date passée
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
      return 'blocked';
    case 'sautee':
      // ✅ BUG FIX: 'sautee' = date passée, neutre (pas d'échec)
      return 'done';
    case 'prevision':
      return 'future';
    case 'en_attente':
      return 'now';
    case 'en_retard':  // ✅ BUG FIX #2: en retard = pending
      return 'pending';
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
  pending: 'En retard',
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

  // ✅ BUG FIX: Seul 'echec' bloque, 'sautee' est neutre (date passée à la création)
  if (relances.some((r) => r.executionStatus === 'echec')) {
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

  // ⚠️ Fenêtre passée sans assignation = En retard
  if (assign.windowPast && assign.status !== 'found') return 'pending';

  if (attempts?.some((a) => a.result === 'declined')) return 'now';
  if (attempts?.some((a) => a.result === 'accepted')) return 'done';
  if (attempts?.some((a) => a.result === 'pending')) return 'now';
  return 'now';
}
