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
    desc: "Assignation au plus tard avant l'exécution de la tâche.",
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
  { id: '08', label: '8h' },
  { id: '09', label: '9h' },
  { id: '10', label: '10h' },
  { id: '11', label: '11h' },
  { id: '14', label: '14h' },
  { id: '16', label: '16h' },
  { id: '18', label: '18h' },
];

export function defaultDeadlines(): WizardDeadlines {
  return {
    workflowPreset: 'balanced',
    perService: {},
    acceptToleranceHours: 3,
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

  let workflowPreset = raw.workflowPreset ?? base.workflowPreset;
  let staffAssignMode = raw.staffAssignMode ?? base.staffAssignMode;

  if (!raw.workflowPreset && raw.rhythmPreset) {
    if (raw.rhythmPreset === 'reactive') {
      workflowPreset = 'reactive';
      staffAssignMode = 'with_client_choice';
    } else if (raw.rhythmPreset === 'relaxed') {
      workflowPreset = 'proactive';
      staffAssignMode = 'last_minute';
    }
  }

  if (raw.staffAssignMode === 'with_client_choice') workflowPreset = workflowPreset ?? 'reactive';
  if (raw.staffAssignMode === 'last_minute') workflowPreset = workflowPreset ?? 'proactive';

  return {
    workflowPreset: workflowPreset ?? 'balanced',
    perService: raw.perService ?? {},
    acceptToleranceHours: raw.acceptToleranceHours ?? 3,
    staffAssignMode,
    staffAssignDaysBefore: raw.staffAssignDaysBefore ?? 3,
    escalateAdminJ1: raw.escalateAdminJ1 ?? true,
    adminEscalationHour: /^\d{1,2}$/.test(String(raw.adminEscalationHour ?? '')) ? String(raw.adminEscalationHour) : '11',
  };
}
