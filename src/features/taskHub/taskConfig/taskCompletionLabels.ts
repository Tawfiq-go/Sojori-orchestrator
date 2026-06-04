/** Aligné avec apps/srv-fulltask/src/types/taskCompletion.ts */
export const TASK_AUTO_COMPLETION_TRIGGERS = ['manual', 'status_complete', 'staff_done'] as const;

export type TaskAutoCompletionTrigger = (typeof TASK_AUTO_COMPLETION_TRIGGERS)[number];

const LEGACY_MAP: Record<string, TaskAutoCompletionTrigger> = {
  none: 'manual',
  client_action: 'status_complete',
  admin_done: 'manual',
  staff_or_admin_done: 'manual',
  client_or_staff_done: 'status_complete',
};

export function normalizeCompletionTrigger(
  raw: string | null | undefined,
): TaskAutoCompletionTrigger | null {
  if (raw == null || raw === '') return null;
  if (TASK_AUTO_COMPLETION_TRIGGERS.includes(raw as TaskAutoCompletionTrigger)) {
    return raw as TaskAutoCompletionTrigger;
  }
  return LEGACY_MAP[raw] ?? null;
}

export const AUTO_COMPLETION_TRIGGER_LABELS: Record<TaskAutoCompletionTrigger, string> = {
  manual: 'Manuel — admin ou staff (WhatsApp / dashboard)',
  status_complete: 'Statut atteint',
  staff_done: 'Staff — clic Terminé (menu S)',
};

export const STATUS_COMPLETE_EXAMPLE_BY_TYPE: Record<string, string> = {
  arrival_declare: "Heure d'arrivée déclarée",
  departure_declare: 'Heure de départ déclarée',
  registration: 'Enregistrement complet',
  arrival_choose: "Heure d'arrivée choisie",
  departure_choose: 'Heure de départ choisie',
};

export function hintForAutoCompletion(
  taskType: string,
  trigger: TaskAutoCompletionTrigger | null,
): string {
  if (!trigger) {
    return 'Non configuré en base — enregistrer une valeur ou lancer le seed admin.';
  }
  if (trigger === 'manual') {
    return 'Pas de passage auto à terminée. Clôture par admin (T), staff (S) ou dashboard.';
  }
  if (trigger === 'staff_done') {
    return 'Terminée quand le staff valide dans le menu S (Terminé).';
  }
  const statusLabel = STATUS_COMPLETE_EXAMPLE_BY_TYPE[taskType];
  if (statusLabel) {
    return `Terminée quand le statut est : « ${statusLabel} » (client, admin ou système).`;
  }
  return 'Terminée quand le statut métier est atteint (ex. enregistrement complet, heure déclarée).';
}
