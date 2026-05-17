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

export interface TaskListItem {
  _id: string;
  itemType: TaskItemType | string;
  itemNumber: string;
  name: string;
  type?: string | null;
  subType?: string | null;
  createdAt?: string;
  startDate?: string;
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
  guestName?: string;
  guestCountry?: string | null;
  listingId?: string;
  listingName?: string;
  /** Fin d’exécution (affichage « Heure tâche » comme partners). */
  endDate?: string;
  /** Créneau choisi côté client (WhatsApp). */
  timeslot_selected?: { start: number; end: number } | null;
  /** Fenêtre d’exécution (API récente). */
  execution_hours?: { start: number; end: number } | null;
  hourSource?: 'default' | 'client' | 'admin' | string;
  isArchived?: boolean;
  conciergeGroupingKey?: string;
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
}

export interface TasksPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TasksSearchParams {
  ownerId?: string;
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
  sortField?: 'startDate' | 'createdAt' | 'itemType' | 'name' | 'source';
  sortDirection?: 'asc' | 'desc';
  /** Aligné TasksNew : `false` exclut archivés ; `true` uniquement archivés ; `'all'` les deux. */
  isArchived?: boolean | 'all';
  /** Filtre multi-staff (côté API si supporté ; sinon filtré côté client). */
  staffCodes?: string[];
}

export interface TasksSearchResult {
  tasks: TaskListItem[];
  pagination: TasksPagination;
  performanceTime?: string;
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
