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
  /** Langue de travail — FR / EN / AR */
  lang?: 'fr' | 'en' | 'ar';
  avatarColor?: 1 | 2 | 3 | 4 | 5 | 6;
  status: StaffStatus;
  isAdmin: boolean;
  contractType: ContractType;
  /** Freelance only · prix par type de tâche en MAD (clés fulltask) */
  rates?: Record<string, number>;
  allowedTaskTypes: string[];
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
  /** @deprecated — préférer deliveryChannel (aligné messages planifiés) */
  channel: ChannelKind;
  /** Message (OTA/email) ou WhatsApp */
  deliveryChannel: MessageDeliveryChannel;
  reference: ReferencePoint;
  /** Jour relatif (ex: -3 = J-3) */
  delay: { value: number; unit: WindowUnit };
  time: string;
  /** Référence entrée catalogue messages */
  catalogMessageId: string;
  /** @deprecated — utiliser catalogMessageId */
  template?: string;
  enabled: boolean;
}

/** Rappel envoyé au staff assigné avant exécution (même logique timing que relances). */
export interface WorkflowStaffReminder {
  id: string;
  label: string;
  reference: ReferencePoint;
  delay: { value: number; unit: 'days' | 'hours' };
  time: string;
  enabled: boolean;
  /** Slug template WhatsApp (compte staff). */
  staffTemplateId?: string;
}

export interface WorkflowAssignment {
  reference: ReferencePoint;
  /** Fenêtre relative ouverture → fermeture (ex : -7j 09:00 → J0 23:59) */
  windowStart: { value: number; unit: WindowUnit; time?: string };
  windowEnd: { value: number; unit: WindowUnit; time?: string };
  /** Auto-assign + forcer acceptation staff. */
  autoAssign: boolean;
  /** planning = créneaux livreur · always = toutes les heures windows. */
  assignmentHoursMode: 'planning' | 'always';
  /** Réassigner si pas accepté après une fenêtre cron. */
  findAnotherStaff: boolean;
  /** Tolérance (h) après acceptation avant remplacement. */
  acceptToleranceHours: number;
  /** Créneaux find-another si staff pending (HH:mm) — ex. 11:00, 16:00. */
  attemptWindows: string[];
}

export interface WorkflowDeadline {
  reference: ReferencePoint;
  delay: { value: number; unit: WindowUnit };
  /** Heure du jour si delay.unit === 'days' (créneaux entiers HH:00). */
  time?: string;
  hardLockAfter: boolean;             // bloque toute action après deadline
  notifyPM: boolean;
}

export interface Workflow {
  _id: string;
  /** ID technique srv-fulltask — clé de mapping (ex: arrival_choose) */
  taskTypeId: string;
  kind: WorkflowKind | string;
  label: string;
  description?: string;
  enabled: boolean;
  /** @deprecated utiliser taskTypeId — conservé pour compat */
  triggerTaskType?: string;
  relances: WorkflowRelance[];
  staffReminders: WorkflowStaffReminder[];
  /** null = pas de séquence assignation dans le plan exécuté */
  assignment: WorkflowAssignment | null;
  /** false = pas de bloc escalade dans le plan exécuté */
  escalationEnabled: boolean;
  deadline: WorkflowDeadline;
}

/** Canal d'envoi — pas le canal de réservation (direct vs OTA booking) */
export type MessageDeliveryChannel = 'whatsapp' | 'email' | 'ota';

/** Catalogue OPS — contenu seul (pas de déclencheur). */
export interface CatalogMessage {
  id: string;
  label: string;
  whatsappTemplateId: string;
  messageFrOta: string;
  messageFrEmail: string;
}

/** Règle d'envoi planifié sur la réservation — pointe vers CatalogMessage.id */
export interface ScheduledOrchestrationMessage {
  _id: string;
  label: string;
  enabled: boolean;
  catalogMessageId: string;
  trigger: {
    reference: ReferencePoint;
    delay: { value: number; unit: WindowUnit };
    time?: string;
  };
  deliveryChannel: MessageDeliveryChannel;
}

/** @deprecated — ancien type monolithique */
export type SimpleMessage = ScheduledOrchestrationMessage & CatalogMessage;

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
