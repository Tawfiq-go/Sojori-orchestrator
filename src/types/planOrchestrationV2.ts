/**
 * ═══════════════════════════════════════════════════════════════════
 * Types orchestration v2 (alignés backend srv-fulltask)
 * ═══════════════════════════════════════════════════════════════════
 *
 * Types PARTAGÉS conceptuellement entre backend et frontend.
 * Frontend manipule ces types pour affichage, backend les stocke.
 */

// ════════════════════════════════════════════════════════════════════
// Statuts unifiés (specs orchestration v2)
// ════════════════════════════════════════════════════════════════════

/** Statut du plan (cycle de vie propre, ne dérive PAS des séquences) */
export type PlanStatus = 'cree' | 'completed' | 'archived'

/** Statut de séquence (dérivé - voir module planDerivations) */
export type SequenceStatus = 'en_attente' | 'en_cours' | 'termine' | 'en_retard' | 'bloque'

/** Statut atome (message/relance/rappel) - `en_retard` est dérivé, pas stocké */
export type AtomeStatus = 'en_attente' | 'en_cours' | 'fait' | 'saute' | 'echec'

/** Statut relance voyageur */
export type RelanceStatus = AtomeStatus

/** Statut rappel staff */
export type StaffReminderStatus = AtomeStatus

/** Statut message catalogue planifié */
export type PlannedMessageStatus = AtomeStatus

/** Statut assignation staff (enrichi) */
export type AssignationStatus = 'en_attente' | 'en_cours' | 'attente_acceptation' | 'termine' | 'echec'

/** Statut escalade/deadline */
export type EscaladeStatus = 'en_attente' | 'fait' | 'saute'

/** Raison pour statut `saute` ou contexte audit */
export type SkipReason =
  | 'expire'
  | 'client_a_repondu'
  | 'date_passee_creation'
  | 'remplace_par_lm'
  | string

/** Kind de séquence (task = avancement, message = logique simple) */
export type SequenceKind = 'task' | 'message'

export interface RelanceDoc {
  label: string
  scheduledAt: Date | string
  sentAt: Date | string | null
  status: RelanceStatus
  /** Raison si `saute` ou contexte */
  reason?: SkipReason
  /** Flag Last-Minute (au niveau ligne pour traçabilité) */
  lm?: boolean
  /** Copie config orchestration (ex. -3 = J-3 avant ref). */
  scheduleRef?: string
  scheduleDay?: number
  scheduleTime?: string
}

export interface StaffReminderDoc {
  label: string
  scheduledAt: Date | string
  sentAt: Date | string | null
  status: StaffReminderStatus
  /** Raison si `saute` ou contexte */
  reason?: SkipReason
  /** Template WhatsApp staff (slug). */
  messageId?: string
  scheduleRef?: string
  scheduleDay?: number
  scheduleTime?: string
}

export interface AssignationAttempt {
  window: string
  tried: boolean
  found: boolean
}

/** Tentative assignation Last-Minute — cron ignore la fenêtre config. */
export interface AssignationLmAttempt {
  label: string
  scheduledAt: Date | string
  status: 'en_attente' | 'fait' | 'saute' | 'echec'
  lm: true
  triedAt?: Date | string | null
}

export interface AssignationDoc {
  status: AssignationStatus
  startAt: Date | string
  endAt: Date | string
  foundAt: Date | string | null
  staffId: string | null
  /** Date acceptation staff (task confirmed). */
  staffAcceptedAt: Date | string | null
  /** @deprecated Legacy — LM staff via lmAttempts[] */
  lm: boolean
  attempts: AssignationAttempt[]
  lmAttempts?: AssignationLmAttempt[]
  /** Copié depuis orchestration config au build du plan. */
  autoAssign?: boolean
  releaseMode?: 'tolerance' | 'windows'
  assignmentHoursMode?: 'planning' | 'always'
  findAnotherStaff?: boolean
  acceptToleranceHours?: number
  releaseWindows?: string[]
}

export interface EscaladeDoc {
  scheduledAt: Date | string
  status: EscaladeStatus
  triggeredAt: Date | string | null
  assignedTo: string | null
  scheduleRef?: string
  scheduleDay?: number
  scheduleTime?: string
}

export interface SequenceDoc {
  /** Absent tant que la tâche « action client » n'est pas créée à la demande. */
  taskId?: string
  taskType: string
  /** Kind : task = avancement (gates), message = logique simple */
  kind: SequenceKind
  /** Statut dérivé (voir planDerivations) */
  status: SequenceStatus
  /** Flag persisté : client a complété l'action (arrival_chosen, etc.) */
  clientActionCompleted?: boolean
  relances: RelanceDoc[]
  staffReminders: StaffReminderDoc[]
  assignation: AssignationDoc | null
  escalade: EscaladeDoc | null
}

export interface PlannedMessageDoc {
  label: string
  scheduledAt: Date | string
  sentAt: Date | string | null
  status: PlannedMessageStatus
  /** Raison si `saute` ou contexte */
  reason?: SkipReason
  canal: 'whatsapp' | 'OTA' | 'email'
  template: string
  messageFr?: string
  /** Référence catalogue (ex. welcome_sojori_v2) — ordre plan sched:… */
  messageId?: string
}

/** Entrée audit (journal complet) */
export interface AuditEntry {
  at: Date | string
  type:
    | 'message_sent'
    | 'relance_sent'
    | 'relance_skipped'
    | 'assignation_opened'
    | 'assignation_found'
    | 'assignation_accepted'
    | 'assignation_failed'
    | 'reminder_sent'
    | 'escalade_triggered'
    | 'lm_relance_created'
    | 'lm_assignation_created'
    | 'lm_assignation_reopened'
    | 'status_change'
    | string
  /** ex: 'sequence:arrival_choose/relance#2', 'plan', 'message#1' */
  target: string
  from?: string
  to?: string
  reason?: string
  meta?: Record<string, unknown>
}

export interface PlanDocShape {
  reservationId: string
  reservationCode: string
  listingId: string
  ownerId: string
  status: PlanStatus
  sequences: SequenceDoc[]
  messages: PlannedMessageDoc[]
  /** Journal complet (audit) */
  auditLog: AuditEntry[]
  source?: string
  guestPhone?: string
  guestName?: string
  checkIn?: Date | string
  checkOut?: Date | string
  bookingCreatedAt?: Date | string
}
