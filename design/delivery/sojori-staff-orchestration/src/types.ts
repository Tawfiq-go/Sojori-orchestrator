// ════════════════════════════════════════════════════════════════════
// Sojori · Staff & Orchestration · types.ts
// ════════════════════════════════════════════════════════════════════

export type ContractType = 'employee' | 'freelance';
export type StaffStatus = 'active' | 'off' | 'leave';
export type TaskType =
  | 'cleaning_in_out' | 'cleaning_mid_stay' | 'check_in' | 'check_out'
  | 'maintenance' | 'concierge' | 'transport' | 'groceries' | 'inventory';

export type ChannelKind = 'whatsapp' | 'email' | 'sms';
export type WorkflowKind = 'choose_arrival' | 'choose_departure' | 'cleaning_after_checkout' | 'support_ticket' | 'service_client';
export type ReferencePoint = 'reservation_date' | 'check_in' | 'check_out' | 'task_created' | 'previous_step_done';
export type WindowUnit = 'minutes' | 'hours' | 'days';

export interface Staff {
  _id: string;
  fullName: string;
  phoneE164: string;
  whatsappE164: string;
  email?: string;
  avatarColor?: 1 | 2 | 3 | 4 | 5 | 6;
  status: StaffStatus;
  isAdmin: boolean;
  contractType: ContractType;
  /** Freelance only · prix par type de tâche en MAD */
  rates?: Partial<Record<TaskType, number>>;
  allowedTaskTypes: TaskType[];
  allowedListingIds: string[];        // [] = tous
  maxTasksPerDay?: number;
  schedule: {
    daysOfWeek: number[];             // 0=L → 6=D
    timeWindows: { start: string; end: string }[]; // HH:mm
  };
  notes?: string;
}

export interface WorkflowRelance {
  id: string;
  channel: ChannelKind;
  delay: { value: number; unit: WindowUnit };  // ex: 24h après step précédente
  template: string;                              // id template ou label
  enabled: boolean;
}

export interface WorkflowAssignment {
  reference: ReferencePoint;
  /** Fenêtre relative ouverture → fermeture (ex : -2j à J0) */
  windowStart: { value: number; unit: WindowUnit };
  windowEnd: { value: number; unit: WindowUnit };
  autoAssign: boolean;
}

export interface WorkflowDeadline {
  reference: ReferencePoint;
  delay: { value: number; unit: WindowUnit };
  hardLockAfter: boolean;             // bloque toute action après deadline
  notifyPM: boolean;
}

export interface Workflow {
  _id: string;
  kind: WorkflowKind;
  label: string;                       // ex: "Choisir arrivée"
  description?: string;
  enabled: boolean;
  triggerTaskType: TaskType;
  relances: WorkflowRelance[];
  assignment: WorkflowAssignment;
  deadline: WorkflowDeadline;
}

export interface SimpleMessage {
  _id: string;
  label: string;
  enabled: boolean;
  trigger: { reference: ReferencePoint; delay: { value: number; unit: WindowUnit } };
  channel: ChannelKind;
  templateId: string;
  audience: 'guest' | 'staff' | 'owner';
}

/* ─── Tokens (cohérence Atelier 2026) ─── */
export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)', primaryTint2: 'rgba(184,133,26,0.22)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.12)',
  error: '#c81e1e', errorTint: 'rgba(200,30,30,0.10)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
} as const;

export const TASK_TYPE_META: Record<TaskType, { label: string; emoji: string }> = {
  cleaning_in_out:   { label: 'Ménage entrée/sortie', emoji: '🧼' },
  cleaning_mid_stay: { label: 'Ménage mi-séjour',     emoji: '🧽' },
  check_in:          { label: 'Check-in',             emoji: '🛬' },
  check_out:         { label: 'Check-out',            emoji: '🛫' },
  maintenance:       { label: 'Maintenance',          emoji: '🔧' },
  concierge:         { label: 'Conciergerie',         emoji: '🛎' },
  transport:         { label: 'Transport',            emoji: '🚗' },
  groceries:         { label: 'Courses',              emoji: '🛒' },
  inventory:         { label: 'Inventaire',           emoji: '📦' },
};
