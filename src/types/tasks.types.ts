export type TaskStatus =
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED_ADMIN'
  | 'CANCELLED_CUSTOMER'
  | 'ARCHIVED';

export type TaskEmergency = 'Normal' | 'Urgent' | 'Critical';

export type TaskItemType = 'Task' | 'Timeslot' | 'Support' | 'Concierge';

export type TaskBoardLane = 'todo' | 'inProgress' | 'done';

export interface TaskTimeSlot {
  start: number;
  end: number;
  type?: string;
  title?: string;
}

export interface TaskDescription {
  description: string;
}

/** Priorité 3 couleurs dérivée backend — « vert je continue, orange je regarde, rouge j'agis ». */
export interface TaskUrgencyInfo {
  urgency: 'green' | 'orange' | 'red';
  reason?: string;
  dueAt?: string;
}

export interface TaskListItem {
  _id: string;
  priority?: TaskUrgencyInfo;
  itemType: TaskItemType | string;
  itemNumber: string;
  name: string;
  type?: string | null;
  subType?: string | null;
  createdAt?: string;
  startDate?: string;
  /** Échéance / fin planifiée (dueAt). */
  dueAt?: string;
  /** Date de clôture réelle (done). */
  completedAt?: string;
  taskStatus: TaskStatus | string;
  status: TaskStatus | string;
  isClientRequest?: boolean;
  isClientConfirmed?: boolean;
  paymentStatus?: string;
  price?: number;
  paid?: boolean;
  emergency?: TaskEmergency | string;
  source?: string;
  staffName?: string | null;
  staffCode?: string | null;
  staffPhone?: string | null;
  staffId?: string | null;
  linkedItemNumber?: string | null;
  linkedItemId?: string | null;
  descriptions?: Array<string | TaskDescription>;
  comment?: string;
  tags?: string[];
  timeslot?: TaskTimeSlot | null;
  reservationNumber?: string;
  reservationId?: string;
  guestName?: string;
  guestCountry?: string | null;
  /** Canal OTA (airbnb, booking…) — pour affichage, distinct de `source` interne */
  channelName?: string | null;
  listingId?: string;
  listingName?: string;
  /** Fin d’exécution (affichage « Heure tâche » comme partners). */
  endDate?: string;
  /** Créneau choisi côté client (WhatsApp). */
  timeslot_selected?: { start: number; end: number } | null;
  /** Fenêtre d’exécution (API récente). */
  execution_hours?: { start: number; end: number } | null;
  hourSource?: 'default' | 'client' | 'admin' | string;
  /** Choix client enregistré (payload.selectedByGuest / source guest). */
  guestHourChosen?: boolean;
  /** Heure arrivée/départ (payload) pour colonne Prévu */
  plannedTime?: string | null;
  /** Demande client (WhatsApp) — champ srv-fulltask `requestedAt` */
  requestedAt?: string | null;
  /** Créneau confirmé / dispo Sojori — champ srv-fulltask `scheduledAt` */
  scheduledAt?: string | null;
  isArchived?: boolean;
  /** Support — libellé catégorie listing (ex. WiFi / Internet ne fonctionne pas) */
  supportCategoryLabel?: string;
  supportCategoryIcon?: string;
  conciergeGroupingKey?: string;
  /** Détail affiché (ex. Massage · dim. 7 juin · 8h · 1 pers.) */
  conciergeDetailLine?: string;
  reservationCheckIn?: string;
  reservationCheckOut?: string;
  reservationAdults?: number;
  reservationChildren?: number;
  actual_time?: {
    time?: number | string;
    confirmed_at?: string;
    confirmed_by?: string;
    method?: string;
    notes?: string;
  } | null;
  computed_status?: string;
  timeslots_available?: Array<{ start: number; end: number; type?: string }>;
  /** Enregistrement invités (colonne détails sous catégorie) */
  adults?: number;
  nbreGuestValidated?: number;
  nbreGuestDraft?: number;
  nbreGuestNotRegistered?: number;
  checkinStatus?: string;
  /** Champs séjour réservation (actions arrivée / départ comme page Réservations) */
  checkInTime?: string | number | null;
  checkOutTime?: string | number | null;
  actualArrivalTime?: string | null;
  actualDepartureTime?: string | null;
  confirmedCheckInTime?: boolean;
  confirmedCheckOutTime?: boolean;
  guestRegistration?: {
    nbre_guest_registered?: number;
    nbre_guest_to_register?: number;
    members?: Array<Record<string, unknown>>;
  };
  /** Checklist ménage (payload) — icône cliquable ; `done` = coché par le staff (checklistDone). */
  checklistItems?: Array<{
    id?: string;
    label: string;
    labelDa?: string;
    labelEn?: string;
    labelAr?: string;
    categoryId?: string;
    categoryLabel?: string;
    done?: boolean;
    required?: boolean;
    photoRequired?: boolean;
  }>;
  /** Note affichable (requestNote / executionNote / payload.notes / staffFinishNote) — distinct de la checklist */
  notesText?: string;
  /** Photos guest ou FdM (Aide / ménage finish) — URLs GCS, affichage via proxy listing-media. */
  photoUrls?: string[];
  /** True si le guest a joint / signalé une photo (même sans URL encore). */
  hasGuestPhoto?: boolean;
  /** Déclarations ménage Flow X (payload.staffDeclareKinds) — distinct de l’enregistrement invités. */
  cleaningDeclarations?: Array<{ id: string; label: string }>;
  /** Dernière MAJ (statut, assignation, checklist…) — tri « récemment mis à jour ». */
  updatedAt?: string;
  ownerId?: string;
}

export interface TasksPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TasksSearchParams {
  ownerId?: string;
  /** Scope listings (filtres admin PM) — transmis à getListings. */
  filterOwnerId?: string;
  audience?: 'STAFF' | 'GUEST' | 'SYSTEM';
  page?: number;
  limit?: number;
  listingIds?: string[];
  itemTypes?: string[];
  subTypes?: string[];
  statuses?: string[];
  sources?: string[];
  paymentStatus?: string;
  hasAssociation?: 'with' | 'without';
  emergency?: TaskEmergency | 'all';
  dateType?: 'startDate' | 'createdAt';
  dateStart?: string;
  dateEnd?: string;
  searchTerm?: string;
  sortField?:
    | 'updatedAt'
    | 'createdAt'
    | 'startDate'
    | 'endDate'
    | 'reservationNumber'
    | 'itemNumber'
    | 'type'
    | 'status'
    | 'guestName'
    | 'listingName'
    | 'priority'
    | 'source'
    | 'staffName';
  sortDirection?: 'asc' | 'desc';
  /** Aligné TasksNew : `false` exclut archivés ; `true` uniquement archivés ; `'all'` les deux. */
  isArchived?: boolean | 'all';
  /** Filtre multi-staff (côté API si supporté ; sinon filtré côté client). */
  staffCodes?: string[];
  /**
   * Caches optionnels : si fournis, getTasks ne refetch ni staff ni listings
   * (évite le double appel page + service).
   */
  staffByIdCache?: Record<string, Record<string, unknown>>;
  listingByIdCache?: Record<string, string>;
}

export interface TasksSearchResult {
  tasks: TaskListItem[];
  pagination: TasksPagination;
  performanceTime?: string;
  /** Présents uniquement quand le service a chargé staff/listings (pas de cache). */
  staff?: Array<{ _id: unknown; staffCode: string; name: unknown; phone: unknown }>;
  listings?: Array<{ id: string; _id: string; name: string; city?: string }>;
}

export interface TaskCreatePayload {
  name: string;
  type: string;
  listingId: string;
  ownerId: string;
  startDate: string;
  endDate: string;
  listingName?: string;
  reservationNumber?: string;
  reservationId?: string;
  price?: number;
  source?: string;
  requestType?: 'TASK' | 'CLIENT_REQUEST';
  emergency?: TaskEmergency;
  comment?: string;
  descriptions?: TaskDescription[];
  staffCode?: string;
  initialStatus?: 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS';
}

export interface TaskUpdateFieldsPayload {
  startDate?: string;
  endDate?: string;
  startHour?: number;
  endHour?: number;
  price?: number;
}

/** PATCH /api/v1/admin/fulltask/tasks/:id */
export interface TaskFulltaskUpdatePayload {
  status?: string;
  priority?: 'normal' | 'urgent' | 'critical';
  requestedAt?: string | null;
  scheduledAt?: string | null;
  scheduledDate?: string | null;
  requestNote?: string | null;
  executionNote?: string | null;
}

export interface TaskAssignPayload {
  staffCode: string;
  reservationNumber?: string;
}

export interface TaskListingOption {
  _id: string;
  name: string;
  address?: string;
  city?: string;
  country?: string;
}

export interface StaffDayTiming {
  start: number;
  end: number;
}

export interface StaffDaySchedule {
  present: boolean;
  timings: StaffDayTiming[];
}

export interface TasksStaffMember {
  _id: string;
  staffCode: string;
  username: string;
  email: string;
  callPhone?: string;
  whatsappPhone?: string;
  language?: string;
  categories: string[];
  subcategories: string[];
  skills: string[];
  certifications?: string[];
  priority: number;
  tasksThisWeek: number;
  lastAssignedAt?: string | null;
  isActive: boolean;
  maxTasksPerDay: number;
  maxHoursPerWeek: number;
  totalTasksCompleted: number;
  totalTasksRefused: number;
  averageResponseTime?: number | null;
  rating: number;
  completionRate: number;
  staffType?: string;
  memberRole?: string;
  listingIds: string[];
  schedule?: Record<string, StaffDaySchedule>;
}

export interface TasksStaffResult {
  staff: TasksStaffMember[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

export interface StaffAssignment {
  staffCode: string;
  taskId: string;
  date: string;
  startTime?: number;
  endTime?: number;
  status?: string;
  category?: string;
  listingId?: string;
  reservationNumber?: string;
  notes?: string;
}

export interface StaffAssignmentsResult {
  data: StaffAssignment[];
  stats?: {
    totalTasks: number;
    tasksByDay: Record<string, number>;
  };
}

export interface StaffWorkloadResult {
  workload: {
    thisWeek: {
      tasks: number;
      hours: number;
      maxTasks: number;
      maxHours: number;
      taskPercentage: number;
      hourPercentage: number;
    };
    today: {
      tasks: number;
      maxTasks: number;
      taskList: TaskListItem[];
    };
    performance: {
      totalCompleted: number;
      totalRefused: number;
      completionRate: number;
      rating: number;
      averageResponseTime: number | null;
    };
    staff: {
      staffCode: string;
      username: string;
      priority: number;
      isActive: boolean;
      categories: string[];
    };
  };
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  CREATED: 'Créée',
  ASSIGNED: 'Assignée',
  ACCEPTED: 'Acceptée',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminée',
  CANCELLED_ADMIN: 'Annulée admin',
  CANCELLED_CUSTOMER: 'Annulée client',
  ARCHIVED: 'Archivée',
};

export const TASK_STATUS_VARIANTS: Record<
  TaskStatus,
  'neutral' | 'warning' | 'success' | 'error' | 'info' | 'gold' | 'ai'
> = {
  CREATED: 'neutral',
  ASSIGNED: 'gold',
  ACCEPTED: 'info',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED_ADMIN: 'error',
  CANCELLED_CUSTOMER: 'error',
  ARCHIVED: 'neutral',
};

export const TASK_STATUS_SEQUENCE: TaskStatus[] = [
  'CREATED',
  'ASSIGNED',
  'ACCEPTED',
  'IN_PROGRESS',
  'COMPLETED',
];

export const TASK_BOARD_STATUS_MAP: Record<TaskBoardLane, TaskStatus[]> = {
  todo: ['CREATED', 'ASSIGNED'],
  inProgress: ['ACCEPTED', 'IN_PROGRESS'],
  done: ['COMPLETED', 'CANCELLED_ADMIN', 'CANCELLED_CUSTOMER', 'ARCHIVED'],
};

export function normalizeTaskStatus(value: string | null | undefined): TaskStatus {
  if (!value) return 'CREATED';
  const knownStatuses = new Set<TaskStatus>([
    'CREATED',
    'ASSIGNED',
    'ACCEPTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED_ADMIN',
    'CANCELLED_CUSTOMER',
    'ARCHIVED',
  ]);

  return knownStatuses.has(value as TaskStatus) ? (value as TaskStatus) : 'CREATED';
}

export function getNextTaskStatus(value: string | null | undefined): TaskStatus | null {
  const status = normalizeTaskStatus(value);
  if (!TASK_STATUS_SEQUENCE.includes(status)) {
    return null;
  }

  const index = TASK_STATUS_SEQUENCE.indexOf(status);
  if (index === -1 || index === TASK_STATUS_SEQUENCE.length - 1) {
    return null;
  }

  return TASK_STATUS_SEQUENCE[index + 1];
}

export function resolveTaskBoardLane(value: string | null | undefined): TaskBoardLane {
  const status = normalizeTaskStatus(value);
  if (TASK_BOARD_STATUS_MAP.inProgress.includes(status)) return 'inProgress';
  if (TASK_BOARD_STATUS_MAP.done.includes(status)) return 'done';
  return 'todo';
}

export function getTaskPriorityLevel(
  emergency: string | null | undefined,
): 'low' | 'med' | 'high' {
  if (emergency === 'Critical') return 'high';
  if (emergency === 'Urgent') return 'med';
  return 'low';
}

export type { ReservationTask, ReservationTasksResult } from './reservationTask.types';
