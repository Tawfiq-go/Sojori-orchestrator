// ════════════════════════════════════════════════════════════════════
// Sojori · Plan Réservation · types.ts
// ════════════════════════════════════════════════════════════════════

export type PlanStatus = 'now' | 'done' | 'pending' | 'blocked' | 'future';
export type EventStatus = 'done' | 'now' | 'pending' | 'blocked' | 'future';
export type Channel = 'wa' | 'ota' | 'email' | 'sms';
export type RelanceStatus = 'sent' | 'scheduled' | 'skipped';

/** Statut affiché par relance (exécution ou prévision). */
export type RelanceExecutionStatus =
  | 'prevision'
  | 'en_attente'
  | 'en_retard'  // ✅ BUG FIX #2: état manquant pour date passée
  | 'envoyee'
  | 'sautee'
  | 'echec';
export type AttemptResult = 'accepted' | 'declined' | 'timeout' | 'pending';

export interface Guest {
  id: string;
  name: string;
  initials: string;
  countryFlag?: string;            // emoji 🇲🇦
  avatarColor?: 1 | 2 | 3 | 4 | 5; // c1..c5
}

export interface Listing {
  id: string;
  name: string;
  district?: string;
}

export interface Reservation {
  id: string;
  /** Code plan orchestration (OS- + 8 caractères). */
  planCode: string;
  /** Numéro réservation srv-reservations (SJ- + 8). */
  reference: string;
  guest: Guest;
  listing: Listing;
  source: string;                  // Airbnb, Booking, Direct…
  guestsCount: number;
  checkIn: string;                 // ISO 25 Mai 2026 15:00
  checkOut: string;
  status: PlanStatus;
  /** 0..1 */
  progress: number;
  /** counts pour les KPIs */
  done: number;
  inProgress: number;
  upcoming: number;
  blocked: number;
}

/* ─── Plan events ─── */
export interface Relance {
  id: string;
  step: number;
  status: RelanceStatus;
  dueAt: string;                   // ISO
  label: string;
  channel?: Channel;
}

export interface AssignAttempt {
  id: string;
  step: number;
  triedAt: string;
  staffName: string;
  staffRole?: string;
  result: AttemptResult;
  /** Résumé échec (ex. « Aucun staff au planning »). */
  failureLabel?: string;
  isLm?: boolean;
}

export interface Escalade {
  scheduled: boolean;              // true = en_attente (pas encore due ou active)
  status: 'en_attente' | 'active' | 'saute' | 'fait';
  dueAt: string;
  description: string;
  /** Ex. J-1 · check-in · 23:00 */
  scheduleOffsetLabel?: string;
}

export type PlanEventKind = 'message' | 'sequence';

export type PlanMessageCategory = 'simple' | 'relance';

export interface PlanEvent {
  id: string;
  kind: PlanEventKind;
  status: EventStatus;
  title: string;
  description?: string;
  icon: string;                    // emoji
  at: string;                      // ISO point d'ancrage temporel
  atDisplay?: string;              // libellé affiché (ex. Aujourd'hui · 14:08)
  range?: string;                  // ex "24 mai → en cours"
  /** Clé ordre config (sched:… / wf:…) */
  planOrderKey?: string;
  /** Position 1..N dans le plan (après tri uiPlanListOrder) */
  planStep?: number;
  /** Message catalogue planifié vs relance liée à une tâche */
  messageCategory?: PlanMessageCategory;

  /* Message-only */
  channel?: Channel;
  /** Canal effectif prévu (OTA vs Email selon source résa, fallback WA). */
  dispatchPreview?: import('./planDispatchPreview').MessageDispatchPreview;
  channels?: Channel[];            // multi (ex Bienvenue OTA + Email)
  template?: string;
  /** Corps catalogue (non affiché sur /tasks/plans — statut envoi seulement). */
  messagePreviewFr?: string;
  /** Statut Mongo plan.messages (fait = envoyé, legacy envoye). */
  messageSendStatus?: 'en_attente' | 'fait' | 'envoye' | 'saute' | 'echec';
  /** Index dans plan.messages (srv-fulltask) pour envoi manuel. */
  messageIndex?: number;
  channelMeta?: string;            // "Envoyé · 14:08"
  lastDispatch?: import('./planDispatchDisplay').PlanLastDispatchView;
  lastDispatchAttempt?: import('./planDispatchDisplay').PlanLastDispatchView;
  dispatchLog?: import('./planDispatchDisplay').PlanDispatchLogEntryView[];

  /* Sequence-only */
  relances?: Relance[];
  /** Rappels au staff assigné (depuis config orchestration) */
  staffReminders?: Relance[];
  attempts?: AssignAttempt[];
  /** Créneaux assignation LM (hors fenêtre config). */
  lmAssignSlots?: PlanAssignLmItem[];
  escalade?: Escalade;
  /** Parcours chronologique lisible (relances → assignation → rappels staff → escalade) */
  sequenceFlow?: SequenceFlowItem[];
  /** Règles fenêtre assignation (auto-accept, créneaux 11h/16h, etc.) */
  staffAssignment?: StaffAssignmentPlan;
  /** Pour les séquences futures · description "1 relance + 1 assignation + escalade J+4" */
  futureConfig?: string;
}

export type SequenceFlowPhase = 'guest' | 'assign' | 'staff' | 'escalade';

export interface SequenceFlowItem {
  id: string;
  phase: SequenceFlowPhase;
  sortAt: string;
  title: string;
  when: string;
  status: EventStatus;
  detail?: string;
  channel?: Channel;
  /** Ex. « Après relance #2 · 29 AVR 10:00 » */
  contextNote?: string;
}

export interface StaffAssignmentPlan {
  /** found = assigné et accepté (termine) ; pending_accept = assigné, en attente acceptation */
  status: 'searching' | 'pending_accept' | 'found' | 'failed';
  windowStart: string;
  windowEnd: string;
  /** Ex. 24 AVR · 10:00 → 30 AVR · 12:00 */
  windowRange: string;
  autoAssign: boolean;
  assignmentHoursMode: 'planning' | 'always';
  findAnotherStaff: boolean;
  acceptToleranceHours: number;
  releaseWindows: string[];
  /** Manuel | Auto-accept */
  modeLabel: string;
  /** Ex. 3 h (vide si auto-accept) */
  toleranceLabel?: string;
  /** Créneaux 11:00 / 16:00 */
  slotsLabel: string;
  /** Prochaine assignation · date/heure ou staff retenu */
  nextAssignmentLabel: string;
  /** Dernier créneau d'assignation dans la fenêtre (fin opérationnelle). */
  lastAssignmentLabel: string;
  staffName?: string;
  /** Fenêtre assignation déjà passée (dates du plan = séjour). */
  windowPast?: boolean;
  /** Fenêtre ouverte maintenant (start ≤ now < end). */
  windowOpen?: boolean;
  /** Fenêtre pas encore ouverte (now < start). */
  windowFuture?: boolean;
  /** Slot assignation LM (hors fenêtre config). */
  hasPendingLmAssign?: boolean;
  /** Fenêtre + LM assignation épuisés — plus de relance guest ni assignation. */
  assignationExhausted?: boolean;
  /** Dernier libellé d’échec LM assignation. */
  lmFailureLabel?: string;
}

/** Slot assignation LM (affiché comme une relance dans le bloc assignation). */
export type PlanAssignLmItem = PlanGuestRelanceItem;

/** Relance voyageur dans une séquence (niveau 3). */
export interface PlanGuestRelanceItem {
  id: string;
  step: number;
  label: string;
  dueAt: string;
  status: RelanceStatus;
  channel?: Channel;
  /** Canal effectif prévu (OTA vs Email selon source résa). */
  dispatchPreview?: import('./planDispatchPreview').MessageDispatchPreview;
  catalogTemplate?: string;
  /** Ex. J-3 · check-in · 09:00 (config, pas la date seule). */
  scheduleOffsetLabel?: string;
  executionStatus: RelanceExecutionStatus;
  rawStatus: 'en_attente' | 'envoyee' | 'saute' | 'echec';
  relanceIndex: number;
  /** Dernier envoi (manuel ou scheduler) pour audit UI. */
  lastDispatch?: import('./planDispatchDisplay').PlanLastDispatchView;
  lastDispatchAttempt?: import('./planDispatchDisplay').PlanLastDispatchView;
  dispatchLog?: import('./planDispatchDisplay').PlanDispatchLogEntryView[];
}

/** Rappel staff (niveau 3). */
export interface PlanStaffReminderItem {
  id: string;
  step: number;
  label: string;
  dueAt: string;
  status: RelanceStatus;
  whatsappTemplateId?: string;
  executionStatus: RelanceExecutionStatus;
  rawStatus: 'en_attente' | 'envoyee' | 'saute' | 'echec';
  scheduleOffsetLabel?: string;
  reminderIndex: number;
  lastDispatch?: import('./planDispatchDisplay').PlanLastDispatchView;
  lastDispatchAttempt?: import('./planDispatchDisplay').PlanLastDispatchView;
  dispatchLog?: import('./planDispatchDisplay').PlanDispatchLogEntryView[];
}

/** Séquence tâche = niveau 1 (Choisir arrivée, Enregistrement, …). */
export interface PlanSequenceView {
  id: string;
  taskId: string;
  taskType: string;
  title: string;
  icon: string;
  status: EventStatus;
  atDisplay?: string;
  range?: string;
  planStep?: number;
  relances: PlanGuestRelanceItem[];
  staffReminders: PlanStaffReminderItem[];
  staffAssignment?: StaffAssignmentPlan;
  attempts?: AssignAttempt[];
  lmAssignSlots?: PlanAssignLmItem[];
  escalade?: Escalade;
  hasRelances: boolean;
  hasAssignation: boolean;
  hasLmAssignSlots?: boolean;
  hasStaffReminders: boolean;
  hasEscalade: boolean;
  /** Client a choisi heure arrivée/départ — bloc relances terminé. */
  clientActionCompleted?: boolean;
  /** Heure choisie par le client (depuis payload tâche). */
  clientChosenTime?: string;
  /** Statut tâche fulltask (waiting_guest, done, cancelled…). */
  taskStatus?: string;
  /** Enregistrement voyageurs : validés / total attendus. */
  registrationProgress?: { registered: number; total: number };
  /** Statuts blocs — mappés depuis API backend (`blocks`). */
  blockStatuses: import('./planGroupStatus').PlanBlockStatusesView;
  /** Statuts bruts API (debug / labels Expiré). */
  backendBlockStatuses?: {
    relances: string | null;
    assignation: string | null;
    staffReminders: string | null;
    escalade: string | null;
  };
}

export interface ReservationPlan {
  reservationId: string;
  /** Propriétaire du listing — config orchestration / task-config à charger pour ce plan. */
  ownerId?: string;
  listingId?: string;
  guestPhone?: string;
  guestName?: string;
  /** owner = config PM dédiée ; global_template = repli template admin (ownerId null). */
  orchestrationConfigSource?: 'owner' | 'global_template';
  /** Source résa + arbitrage Email/OTA (srv-fulltask). */
  dispatchContext?: import('./planDispatchPreview').PlanDispatchContext;
  /** Tous les événements (progression globale, filtres legacy). */
  events: PlanEvent[];
  /** Séquences tâches — affichage 3 niveaux. */
  sequences: PlanSequenceView[];
  /** Messages planifiés (simples + relances catalogue). */
  messages: PlanEvent[];
  /** Journal audit plan (envois, assignations, LM…). */
  auditLog?: Array<{
    at: string | Date;
    type: string;
    target: string;
    from?: string;
    to?: string;
    reason?: string;
    meta?: Record<string, unknown>;
  }>;
}

/* ─── Filter & sort ─── */
export type ResaFilterKey = 'in_progress' | 'blocked' | 'today' | 'next7d' | 'done';
export type ResaSortKey = 'arrival_asc' | 'urgency' | 'recent' | 'by_listing';

export interface PlanListQuery {
  filters: ResaFilterKey[];
  search: string;
  sort: ResaSortKey;
}

export interface ReservationGroup {
  label: string;
  icon: string;
  reservations: Reservation[];
}

/* ─── Tokens Sojori Atelier 2026 ─── */
export const T = {
  primary: '#b8851a', primaryDeep: '#876119', primarySoft: '#e6c46a',
  primaryTint: 'rgba(184,133,26,0.10)', primaryTint2: 'rgba(184,133,26,0.22)',
  bg0: '#f6f5f1', bg1: '#fff', bg2: '#fafaf7', bg3: '#f0eee8',
  text: '#14110a', text2: '#55504a', text3: '#7a756c', text4: '#a8a299',
  border: 'rgba(20,17,10,0.07)', borderStrong: 'rgba(20,17,10,0.14)',
  success: '#0a8f5e', successTint: 'rgba(10,143,94,0.10)',
  error: '#c81e1e', errorTint: 'rgba(200,30,30,0.10)',
  warning: '#c46506', warningTint: 'rgba(196,101,6,0.12)',
  info: '#0673b3', infoTint: 'rgba(6,115,179,0.10)',
  ai: '#7c3aed', aiTint: 'rgba(124,58,237,0.10)',
  fontSans: 'Geist, system-ui, sans-serif',
  fontMono: '"Geist Mono", ui-monospace, monospace',
} as const;

export const AVATAR_GRADIENTS = {
  1: 'linear-gradient(135deg,#fde68a,#d97706)',
  2: 'linear-gradient(135deg,#a5f3fc,#0e7490)',
  3: 'linear-gradient(135deg,#86efac,#16a34a)',
  4: 'linear-gradient(135deg,#ddd6fe,#7c3aed)',
  5: 'linear-gradient(135deg,#fda4af,#ec4899)',
} as const;
