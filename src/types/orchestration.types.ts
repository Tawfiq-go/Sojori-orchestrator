// ════════════════════════════════════════════════════════════════════
// Sojori — orchestration.types 🟣 TYPESCRIPT TYPES
// Types pour l'orchestration des workflows de réservation
// Mappé depuis WorkflowOrchestrationPlan (srv-orchestrator)
// ════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════
// ENUMS & STATUS
// ═══════════════════════════════════════════════════════════════════

export type WorkflowStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'CREATED'
  | 'ASSIGNED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'EXECUTED'
  | 'FAILED'
  | 'ESCALATED'
  | 'confirmed'
  | 'CANCELLED'
  | 'SKIPPED'
  | 'STOPPED'
  | 'EXPIRED';

export type ActionStatus =
  | 'PENDING'
  | 'LAST_SENT'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'TERMINATED'
  | 'RETARD'
  | 'LM_RELANCE'
  | 'REMINDERS_EXHAUSTED'
  | 'ASSIGNMENTS_EXHAUSTED'
  | 'NO_STAFF_AVAILABLE'
  | 'INITIAL_SENT'
  | 'REMINDED'
  | 'EXECUTED'
  | 'SKIPPED';

export type WorkflowCategoryType =
  | 'NOTIFICATION'
  | 'CHOICE_ARRIVAL'
  | 'CHOICE_DEPARTURE'
  | 'CLEANING_FREE'
  | 'CLEANING_PAID'
  | 'CLEANING_SOJORI'
  | 'DECLARATION_ARRIVAL'
  | 'DECLARATION_DEPARTURE'
  | 'DECLARATION_REGISTRATION'
  | 'DECLARATION'
  | 'CHOICE'
  | 'CLIENT_REQUEST'
  | 'CLIENT_REQUEST_SUPPORT'
  | 'CLIENT_REQUEST_TRANSPORT'
  | 'CLIENT_REQUEST_GROCERY'
  | 'CLIENT_REQUEST_CUSTOM'
  | 'CLEANING';

export type PlanStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type OrchestrationStatusBadge = 'no_plan' | 'error' | 'active' | 'completed';

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW ACTIONS
// ═══════════════════════════════════════════════════════════════════

export interface RequestTimeslotAction {
  actionId: string;
  status: 'PENDING' | 'MESSAGE_SENT' | 'RESPONDED' | 'DEADLINE_PASSED' | 'COMPLETED';
  config: {
    trigger: string;
    timing: { value: number | string; unit: 'HOURS' | 'DAYS' };
    channelPriority: string;
    templateId: string;
    templateName: string;
    deadlineHours: number;
    reminders: Array<{
      timing: { value: number; unit: string };
      condition: string;
      templateName: string;
    }>;
  };
  deadline: string; // ISO date
  scheduledReminders: Array<{
    scheduledFor: string; // ISO date
    condition: string;
  }>;
  execution?: {
    initialMessage?: {
      sentAt: string;
      messageId: string;
      channel: 'whatsapp' | 'email';
    };
    reminders: Array<{
      sentAt: string;
      messageId: string;
      condition: string;
    }>;
    response?: {
      timeslotCode: string;
      selectedAt: string;
      selectedHour?: number;
    };
  };
}

export interface AssignStaffAction {
  actionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'ASSIGNED' | 'FAILED' | 'COMPLETED';
  config: {
    strategy: 'PRIORITY' | 'ROUND_ROBIN' | 'MANUAL';
    dayJ: {
      maxRetriesPerDay: number;
      retryIntervalHours: number;
      contactHours: string;
    };
    nextDays: {
      enabled: boolean;
      maxDays: number;
    };
    refusalPolicy: {
      blockingStrategy: string;
      actionAfterRefusal: string;
    };
  };
  currentDay: 'J' | 'J+1' | 'J+2';
  nextAttemptScheduledFor?: string; // ISO date
  deadline?: string; // ISO date
  execution: {
    attempts: Array<{
      day: string;
      attemptNumber: number;
      staffId: string;
      staffName: string;
      attemptedAt: string;
      status: string;
      respondedAt?: string;
      refusalReason?: string;
    }>;
    assignedStaff?: {
      staffId: string;
      staffName: string;
      assignedAt: string;
      acceptedAt?: string;
    };
  };
}

export interface DeadlineEscalationAction {
  actionId: string;
  status: 'PENDING' | 'DEADLINE_REACHED' | 'ESCALATED' | 'RESOLVED' | 'COMPLETED';
  config: {
    deadlineType: string;
    escalateTo: 'ADMIN' | 'OWNER';
    notificationTemplate?: string;
    autoResolve: boolean;
  };
  deadline: string; // ISO date
  execution?: {
    deadlineReachedAt?: string;
    escalation?: {
      reason: string;
      escalatedTo: 'ADMIN' | 'OWNER';
      escalatedAt: string;
      notification?: {
        messageId: string;
        sentAt: string;
        channel: string;
      };
    };
    resolution?: {
      resolvedBy: string;
      resolvedAt: string;
      resolutionNote?: string;
    };
  };
}

export interface SendNotificationAction {
  actionId: string;
  status: ActionStatus;
  config: {
    trigger: string;
    timing: { value: number | string; unit: 'HOURS' | 'DAYS' };
    sendCondition: 'ALWAYS' | 'IF_NOT_DONE';
    channelPriority: string;
    templateId: string;
    templateName: string;
  };
  scheduledFor: string; // ISO date
  conditionStatus?: 'WAITING' | 'MET' | 'FAILED';
  execution?: {
    messageId: string;
    sentAt: string;
    channel: string;
  };
}

export type WorkflowActions = {
  requestTimeslot?: RequestTimeslotAction;
  assignStaff?: AssignStaffAction;
  deadlineEscalation?: DeadlineEscalationAction;
  sendNotification?: SendNotificationAction;
};

// ═══════════════════════════════════════════════════════════════════
// WORKFLOW & PLAN
// ═══════════════════════════════════════════════════════════════════

export interface CategoryWorkflow {
  workflowId: string;
  category: string;
  categoryDisplayLabel?: string;
  categoryType?: WorkflowCategoryType;
  timeslotCode?: string;
  timeslotId?: string | null;
  status: WorkflowStatus;
  whatsappInfo?: {
    serviceEnabled: boolean;
    canRequestFrom: string;
    canRequestUntil: string;
  };
  hasWhatsAppMapping?: boolean;
  registrationStats?: {
    adults: number;
    validated: number;
    draft: number;
    notRegistered: number;
    updatedAt: string;
  };
  declarationInfo?: {
    actualTime: string;
    confirmedBy: string;
    method: string;
    computedStatus: string;
    customerStatus?: string;
    updatedAt: string;
  };
  metadata?: {
    timeslotType?: string;
    requestDate?: string;
    requestCode?: string;
    groupingKey?: string;
    requestCreatedAt?: string;
    timeslotCreatedAt?: string;
  };
  actions: WorkflowActions;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface ListingOperationalSnapshot {
  listingId?: string;
  name?: string;
  occupancyStatus?: string;
  cleanlinessStatus_v2?: string;
  cleanlinessStatus?: string;
  cleanlinessEmergency?: boolean;
  orchestration_cleaning_sojori?: boolean;
}

export interface OrchestrationPlanDetail {
  reservationCode: string;
  planId: string;
  systemType: 'new';
  reservationId: string;
  listingId: string;
  listingName?: string;
  ownerId: string;
  checkInDate?: string;
  checkOutDate?: string;
  listingOperational?: ListingOperationalSnapshot | null;
  workflows: CategoryWorkflow[];
  planCreated?: boolean;
  planCreationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestrationPlan {
  id: string;
  reservationNumber: string;
  reservationId: string;
  ownerId: string;
  listingId: string;
  arrivalDate?: string;
  departureDate?: string;
  guestName?: string;
  listingName?: string;
  status: string; // Reservation status: "Confirmed", "cancelled", etc.
  createdAt: string;
  orchestrationStatus: OrchestrationStatusBadge;
  planNotCreated?: boolean;
  eventCounts: {
    total: number;
    pending: number;
    executed: number;
    failed: number;
    rescheduled: number;
  };
}

export interface OrchestrationSummary {
  totalWorkflows: number;
  pendingWorkflows: number;
  inProgressWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
}

// ═══════════════════════════════════════════════════════════════════
// API PARAMS & RESPONSES
// ═══════════════════════════════════════════════════════════════════

export interface GetPlansParams {
  limit?: number;
  offset?: number;
  listingId?: string;
  reservationStatus?: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'ALL';
  sortBy?: 'recent' | 'oldest' | 'checkin_asc' | 'checkin_desc' | 'checkout_asc' | 'checkout_desc';
}

export interface GetPlansResponse {
  success: boolean;
  data: OrchestrationPlan[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    countOnPage: number;
  };
  filters: {
    listingId: string | null;
    reservationStatus: string;
    sortBy: string;
  };
}

export interface OrchestrationStats {
  plans: {
    total: number;
    active: number;
    completed: number;
    withoutPlan: number;
  };
  actions: {
    pending: number;
  };
}

export interface CancelPlanParams {
  reservationNumber: string;
  reason?: string;
}
