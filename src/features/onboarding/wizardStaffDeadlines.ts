import type { WizardDeadlines } from './types';

export const STAFF_ASSIGN_OPTIONS: Array<{
  id: WizardDeadlines['staffAssignMode'];
  emoji: string;
  title: string;
  desc: string;
}> = [
  {
    id: 'with_client_choice',
    emoji: '🤝',
    title: 'Au choix du client',
    desc: 'Assigner en même temps que le voyageur confirme son créneau (arrivée, départ…).',
  },
  {
    id: 'last_minute',
    emoji: '⚡',
    title: 'Dernière minute',
    desc: 'Assignation au plus tard avant l’exécution de la tâche.',
  },
  {
    id: 'standard',
    emoji: '⚖️',
    title: 'Standard',
    desc: 'Assigner 3 jours avant la date de la tâche (recommandé).',
  },
];

export const ADMIN_ESCALATION_HOURS: Array<{
  id: WizardDeadlines['adminEscalationHour'];
  label: string;
}> = [
  { id: '11', label: '11h (matin)' },
  { id: '14', label: '14h (après-midi)' },
];

export function defaultDeadlines(): WizardDeadlines {
  return {
    staffAssignMode: 'standard',
    staffAssignDaysBefore: 3,
    escalateAdminJ1: true,
    adminEscalationHour: '11',
  };
}

/** Migration brouillons anciens (réactif / standard / relances). */
export function normalizeWizardDeadlines(
  raw?: Partial<WizardDeadlines> & {
    rhythmPreset?: string;
    guestPreset?: string;
    staffEscalation?: string;
  },
): WizardDeadlines {
  const base = defaultDeadlines();
  if (!raw) return base;

  if (raw.staffAssignMode) {
    return {
      staffAssignMode: raw.staffAssignMode,
      staffAssignDaysBefore: raw.staffAssignDaysBefore ?? 3,
      escalateAdminJ1: raw.escalateAdminJ1 ?? true,
      adminEscalationHour: raw.adminEscalationHour === '14' ? '14' : '11',
    };
  }

  let staffAssignMode: WizardDeadlines['staffAssignMode'] = 'standard';
  if (raw.rhythmPreset === 'reactive') staffAssignMode = 'with_client_choice';
  if (raw.rhythmPreset === 'relaxed') staffAssignMode = 'last_minute';

  return {
    ...base,
    staffAssignMode,
  };
}
