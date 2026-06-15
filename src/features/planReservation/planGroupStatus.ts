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

/** Statut séquence/bloc backend → badge UI (pas de recalcul métier). */
export function mapBackendOrchestrationStatus(
  status: string | null | undefined,
): EventStatus {
  if (status == null || status === '') return 'future';
  switch (status) {
    case 'termine':
    case 'fait':
      return 'done';
    case 'en_cours':
    case 'declenchee':
    case 'active':
      return 'now';
    case 'en_retard':
      return 'pending';
    case 'bloque':
    case 'echec':
    case 'annule':
    case 'saute':
      return 'blocked';
    case 'en_attente':
    default:
      return 'future';
  }
}

export type PlanBlockStatusesView = {
  relances: EventStatus;
  assignation: EventStatus;
  staffReminders: EventStatus;
  escalade: EventStatus;
};

export function mapBackendBlockStatuses(
  blocks?: {
    relances?: string | null;
    assignation?: string | null;
    staffReminders?: string | null;
    escalade?: string | null;
  } | null,
): PlanBlockStatusesView | undefined {
  if (!blocks) return undefined;
  return {
    relances: mapBackendOrchestrationStatus(blocks.relances),
    assignation: mapBackendOrchestrationStatus(blocks.assignation),
    staffReminders: mapBackendOrchestrationStatus(blocks.staffReminders),
    escalade: mapBackendOrchestrationStatus(blocks.escalade),
  };
}

/** Bloc relances voyageur — statut propre au bloc (≠ badge séquence L1). */
export function aggregateRelancesGroupStatus(
  relances: Pick<PlanGuestRelanceItem, 'status' | 'executionStatus'>[],
  actionCompleted: boolean = false,
): EventStatus {
  if (relances.length === 0) return 'future';

  if (actionCompleted) return 'done';

  if (relances.some((r) => r.executionStatus === 'echec')) return 'blocked';

  const hasFuture = relances.some((r) => r.executionStatus === 'prevision');
  const hasEnRetard = relances.some((r) => r.executionStatus === 'en_retard');
  const hasActive = relances.some(
    (r) =>
      r.executionStatus === 'prevision' ||
      r.executionStatus === 'en_attente' ||
      r.executionStatus === 'en_retard',
  );

  if (hasActive) {
    if (hasEnRetard && hasFuture) return 'now';
    if (hasFuture) return 'future';
    return 'now';
  }

  // Plus de relance à venir (envoyées / sautées / épuisées) sans action client
  return 'pending';
}

export function aggregateStaffRemindersGroupStatus(
  reminders: Pick<PlanStaffReminderItem, 'status' | 'executionStatus'>[],
): EventStatus {
  if (reminders.length === 0) return 'future';
  if (reminders.every((r) => r.executionStatus === 'envoyee')) return 'done';
  /** Création last-minute : toutes les dates passées → atomes `saute`, bloc clos (pas « À venir »). */
  if (reminders.every((r) => r.executionStatus === 'sautee')) return 'done';
  if (reminders.some((r) => r.executionStatus === 'echec')) return 'blocked';
  if (reminders.some((r) => r.executionStatus === 'envoyee')) return 'now';

  const hasFuture = reminders.some((r) => r.executionStatus === 'prevision');
  const hasEnRetard = reminders.some((r) => r.executionStatus === 'en_retard');
  if (hasEnRetard && hasFuture) return 'now';
  if (!hasFuture && hasEnRetard) return 'pending';
  if (hasFuture) return 'future';
  return 'future';
}

export function staffRemindersGroupStatusLabel(
  status: EventStatus,
  reminders: Pick<PlanStaffReminderItem, 'executionStatus'>[],
): string {
  if (reminders.length > 0 && reminders.every((r) => r.executionStatus === 'sautee')) {
    return 'Sauté';
  }
  return groupStatusLabel(status);
}

export function aggregateAssignGroupStatus(
  assign?: StaffAssignmentPlan,
  attempts?: AssignAttempt[],
  lmAssignSlots?: import('./types').PlanAssignLmItem[],
): EventStatus {
  if (!assign) return 'future';
  if (assign.status === 'found') return 'done';
  if (assign.status === 'pending_accept') return 'now';
  if (assign.status === 'failed') return 'blocked';

  if (assign.hasPendingLmAssign) {
    const pendingFuture = lmAssignSlots?.some((s) => s.executionStatus === 'prevision');
    if (pendingFuture) return 'future';
    return 'now';
  }

  if (assign.windowPast && assign.status !== 'found') return 'pending';
  if (assign.windowFuture) return 'future';
  if (assign.windowOpen) return 'now';

  if (attempts?.some((a) => a.result === 'declined')) return 'now';
  if (attempts?.some((a) => a.result === 'pending')) return 'now';
  return 'future';
}

export function aggregateEscaladeGroupStatus(
  escalade?: { scheduled: boolean; status?: string },
  scheduledAt?: Date | null,
  now = new Date(),
): EventStatus {
  if (!escalade) return 'future';
  const st = escalade.status;
  if (st === 'saute' || st === 'fait') return 'done';
  if (st === 'active') return 'now';
  if (!escalade.scheduled) return 'now';
  if (scheduledAt && scheduledAt.getTime() < now.getTime()) return 'pending';
  return 'future';
}

/**
 * Séquence workflow — miroir backend `seq.status` (task.status si tâche liée).
 * @deprecated Préférer mapBackendOrchestrationStatus(seq.status) depuis l’API.
 */
export function deriveSequenceDisplayStatus(input: {
  taskStatus?: string | null;
  seqStatus?: string;
  /** Séquence liée à une tâche ops — ignorer seqStatus et les blocs. */
  hasLinkedTask?: boolean;
}): EventStatus {
  const st = String(input.taskStatus ?? '').trim();

  if (input.hasLinkedTask) {
    if (!st) return 'future';
    if (st === 'done') return 'done';
    if (st === 'cancelled' || st === 'rejected') return 'blocked';
    if (['waiting_guest', 'new', 'pending_partner', 'confirmed', 'doing'].includes(st)) {
      return 'now';
    }
    return 'future';
  }

  if (input.seqStatus === 'termine') return 'done';
  if (input.seqStatus === 'annule' || input.seqStatus === 'saute') return 'blocked';
  if (input.seqStatus === 'en_cours') return 'now';
  return 'future';
}

/** @deprecated utiliser deriveSequenceDisplayStatus */
export function deriveSequenceDisplayStatusFromTask(
  input: Parameters<typeof deriveSequenceDisplayStatus>[0],
): EventStatus {
  return deriveSequenceDisplayStatus(input);
}

export function relancesGroupStatusLabel(
  status: EventStatus,
  relances: Pick<PlanGuestRelanceItem, 'executionStatus'>[],
  actionCompleted: boolean,
  backendBlockStatus?: string | null,
): string {
  if (
    (status === 'pending' || backendBlockStatus === 'en_retard') &&
    !actionCompleted
  ) {
    const stillActive = relances.some(
      (r) =>
        r.executionStatus === 'prevision' ||
        r.executionStatus === 'en_attente' ||
        r.executionStatus === 'en_retard',
    );
    if (!stillActive || backendBlockStatus === 'en_retard') return 'Expiré';
  }
  return groupStatusLabel(status);
}

export function sequenceStatusLabel(status: EventStatus, taskStatus?: string | null): string {
  const st = String(taskStatus || '').trim();
  if (status === 'blocked' && (st === 'cancelled' || st === 'rejected')) return 'Annulé';
  return groupStatusLabel(status);
}
