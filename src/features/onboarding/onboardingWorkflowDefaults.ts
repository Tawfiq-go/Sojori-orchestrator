import type { WizardCapabilities, WizardDeadlines, WizardWorkflowPreset } from './types';

export type StaffAssignStyle = 'immediate' | 'days_before' | 'with_client' | 'none';

export type WorkflowDateRef = 'checkin' | 'checkout' | 'scheduledDate' | 'task_created';

export interface OnboardingServiceRhythmDef {
  taskType: string;
  label: string;
  emoji: string;
  capabilityKey: keyof WizardCapabilities | null;
  dateRef: WorkflowDateRef;
  clientReminderDays: number[];
  clientReminderTime: string;
  clientReminderMessageId?: string;
  staffAssignStyle: StaffAssignStyle;
  staffAssignDaysBefore: number;
  /** Heure de la 1ère tentative d'assignation (HH:mm) — défaut 09:00 */
  staffAssignTime?: string;
  /** Auto-accepté (assigné sans acceptation staff) — undefined = défaut par style/partenaire */
  staffAutoAssign?: boolean;
  staffReminderDays: number[];
  staffReminderTime: string;
  acceptToleranceHours: number;
  escalationEnabled: boolean;
  deadlineDay?: number;
  deadlineTime?: string;
}

export const CLIENT_RELANCE_MESSAGE_ID: Record<string, string> = {
  arrival_choose: 'msg_relance_arrival_choose',
  departure_choose: 'msg_relance_departure_choose',
  arrival_declare: 'msg_relance_arrival_declare',
  departure_declare: 'msg_relance_departure_declare',
  registration: 'msg_relance_registration',
  cleaning_free: 'msg_relance_cleaning',
  cleaning_paid: 'msg_relance_cleaning',
};

export const STAFF_REMINDER_MESSAGE_ID: Record<string, string> = {
  arrival_choose: 'staff_reminder_arrival',
  departure_choose: 'staff_reminder_departure',
  cleaning_free: 'staff_reminder_cleaning',
  cleaning_paid: 'staff_reminder_cleaning',
  checkout_cleaning: 'staff_reminder_cleaning',
  transport: 'staff_reminder_transport',
  groceries: 'staff_reminder_groceries',
  concierge: 'staff_reminder_concierge',
  support: 'staff_reminder_support',
  service_client: 'staff_reminder_service_client',
};

const BALANCED: OnboardingServiceRhythmDef[] = [
  {
    taskType: 'arrival_choose',
    label: "Choisir l'heure d'arrivée",
    emoji: '🕓',
    capabilityKey: 'arrivalChoose',
    dateRef: 'checkin',
    clientReminderDays: [-3, -2, -1],
    clientReminderTime: '09:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: 3,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: -1,
    deadlineTime: '14:00',
  },
  {
    taskType: 'departure_choose',
    label: "Choisir l'heure de départ",
    emoji: '🕐',
    capabilityKey: 'departureChoose',
    dateRef: 'checkout',
    clientReminderDays: [-2, -1],
    clientReminderTime: '09:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: 3,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: -1,
    deadlineTime: '14:00',
  },
  {
    taskType: 'registration',
    label: 'Enregistrement voyageurs',
    emoji: '📝',
    capabilityKey: 'registration',
    dateRef: 'checkin',
    clientReminderDays: [-3, -2, -1],
    clientReminderTime: '10:00',
    staffAssignStyle: 'none',
    staffAssignDaysBefore: 0,
    staffReminderDays: [],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: -1,
    deadlineTime: '14:00',
  },
  {
    taskType: 'arrival_declare',
    label: "Déclarer l'arrivée",
    emoji: '📍',
    capabilityKey: 'arrivalDeclare',
    dateRef: 'checkin',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'none',
    staffAssignDaysBefore: 0,
    staffReminderDays: [],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: false,
  },
  {
    taskType: 'departure_declare',
    label: 'Déclarer le départ',
    emoji: '🚪',
    capabilityKey: 'departureDeclare',
    dateRef: 'checkout',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'none',
    staffAssignDaysBefore: 0,
    staffReminderDays: [],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: false,
  },
  {
    taskType: 'cleaning_free',
    label: 'Ménage inclus',
    emoji: '🧹',
    capabilityKey: 'cleaningFree',
    dateRef: 'scheduledDate',
    clientReminderDays: [-3],
    clientReminderTime: '10:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: 3,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: -1,
    deadlineTime: '14:00',
  },
  {
    taskType: 'cleaning_paid',
    label: 'Ménage payant',
    emoji: '🧹',
    capabilityKey: 'cleaningPaid',
    dateRef: 'scheduledDate',
    clientReminderDays: [-1],
    clientReminderTime: '10:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: 3,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: -1,
    deadlineTime: '14:00',
  },
  {
    taskType: 'checkout_cleaning',
    label: 'Ménage départ Sojori',
    emoji: '🧼',
    capabilityKey: 'cleaningSojori',
    dateRef: 'checkout',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: -1,
    staffReminderDays: [1],
    staffReminderTime: '08:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
    deadlineDay: 4,
    deadlineTime: '09:00',
  },
  {
    taskType: 'transport',
    label: 'Transport',
    emoji: '🚐',
    capabilityKey: 'transport',
    dateRef: 'scheduledDate',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'immediate',
    staffAssignDaysBefore: 0,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: false,
  },
  {
    taskType: 'groceries',
    label: 'Courses',
    emoji: '🛒',
    capabilityKey: 'groceries',
    dateRef: 'scheduledDate',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'days_before',
    staffAssignDaysBefore: 2,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: false,
  },
  {
    taskType: 'concierge',
    label: 'Conciergerie',
    emoji: '✨',
    capabilityKey: 'concierge',
    dateRef: 'scheduledDate',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'immediate',
    staffAssignDaysBefore: 0,
    staffReminderDays: [-1],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: false,
  },
  {
    taskType: 'support',
    label: 'Support urgence',
    emoji: '🆘',
    capabilityKey: 'support',
    dateRef: 'task_created',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'immediate',
    staffAssignDaysBefore: 0,
    staffReminderDays: [],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
  },
  {
    taskType: 'service_client',
    label: 'Service client',
    emoji: '🛎',
    capabilityKey: 'serviceClient',
    dateRef: 'task_created',
    clientReminderDays: [],
    clientReminderTime: '09:00',
    staffAssignStyle: 'immediate',
    staffAssignDaysBefore: 0,
    staffReminderDays: [],
    staffReminderTime: '11:00',
    acceptToleranceHours: 3,
    escalationEnabled: true,
  },
];

function cloneDefs(defs: OnboardingServiceRhythmDef[]): OnboardingServiceRhythmDef[] {
  return defs.map((d) => ({ ...d }));
}

function applyReactivePreset(defs: OnboardingServiceRhythmDef[]): OnboardingServiceRhythmDef[] {
  return defs.map((d) => {
    if (d.staffAssignStyle === 'none' || d.staffAssignStyle === 'immediate') return d;
    if (!CLIENT_RELANCE_MESSAGE_ID[d.taskType]) return d;
    return {
      ...d,
      clientReminderDays: d.clientReminderDays.filter((day) => day >= -2),
    };
  });
}

function applyProactivePreset(defs: OnboardingServiceRhythmDef[]): OnboardingServiceRhythmDef[] {
  return defs.map((d) => {
    if (d.staffAssignStyle === 'days_before') {
      return {
        ...d,
        // Négatif = fenêtre après la référence (checkout_cleaning) : ne pas décaler.
        staffAssignDaysBefore:
          d.staffAssignDaysBefore < 0
            ? d.staffAssignDaysBefore
            : Math.min(7, d.staffAssignDaysBefore + 1),
        clientReminderDays: CLIENT_RELANCE_MESSAGE_ID[d.taskType]
          ? [...new Set([...d.clientReminderDays, -4])].sort((a, b) => a - b)
          : d.clientReminderDays,
      };
    }
    return d;
  });
}

export function rhythmDefsForPreset(preset: WizardWorkflowPreset): OnboardingServiceRhythmDef[] {
  const base = cloneDefs(BALANCED);
  if (preset === 'reactive') return applyReactivePreset(base);
  if (preset === 'proactive') return applyProactivePreset(base);
  return base;
}

export function isServiceRhythmEnabled(
  caps: WizardCapabilities | undefined,
  def: OnboardingServiceRhythmDef,
): boolean {
  if (!def.capabilityKey || !caps) return true;
  return Boolean(caps[def.capabilityKey]);
}

export function resolveServiceRhythmRows(
  deadlines: WizardDeadlines,
  caps?: WizardCapabilities,
): OnboardingServiceRhythmDef[] {
  const base = rhythmDefsForPreset(deadlines.workflowPreset ?? 'balanced');
  const overrides = deadlines.perService ?? {};
  return base
    .map((row) => ({ ...row, ...(overrides[row.taskType] ?? {}) }))
    .filter((row) => isServiceRhythmEnabled(caps, row));
}

export function formatClientReminderLabel(days: number[]): string {
  if (!days.length) return '—';
  return days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => (d === 0 ? 'J0' : `J${d}`))
    .join(', ');
}

export function formatStaffAssignLabel(style: StaffAssignStyle, daysBefore: number): string {
  if (style === 'none') return '—';
  if (style === 'immediate') return 'Immédiat';
  if (style === 'with_client') return 'Au choix client';
  if (daysBefore < 0) return `J+${Math.abs(daysBefore)} (après)`;
  return `J-${Math.max(1, daysBefore)}`;
}

/** Jours de rappel staff par défaut du service (ex. checkout_cleaning = [+1], le jour du ménage). */
export function defaultStaffReminderDaysForTask(taskType: string): number[] {
  const def = BALANCED.find((d) => d.taskType === taskType);
  return def?.staffReminderDays.length ? [...def.staffReminderDays] : [-1];
}

export function formatStaffReminderDay(day: number): string {
  return day < 0 ? `J${day}` : `J+${day}`;
}

export function formatStaffReminderLabel(days: number[], time: string): string {
  if (!days.length) return '—';
  const label = days
    .slice()
    .sort((a, b) => a - b)
    .map(formatStaffReminderDay)
    .join(', ');
  return `${label} @${time}`;
}

export const WORKFLOW_PRESET_OPTIONS: Array<{
  id: WizardWorkflowPreset;
  emoji: string;
  title: string;
  desc: string;
}> = [
  {
    id: 'reactive',
    emoji: '🤝',
    title: 'Réactif',
    desc: 'Relances courtes · assignation standard',
  },
  {
    id: 'balanced',
    emoji: '⚖️',
    title: 'Équilibré',
    desc: 'Recommandé — ménage J-3, partenaires immédiat',
  },
  {
    id: 'proactive',
    emoji: '📅',
    title: 'Anticipé',
    desc: 'Assignation plus tôt · relances renforcées',
  },
];
