// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Mapper API → WorkflowTimeline
// Maps API response from /orchestrator/plans/:reservationCode to WorkflowTimeline format
// ════════════════════════════════════════════════════════════════════

import { formatCasablancaDateTime, formatCasablancaDateOnly, formatCasablancaTimeOnly } from './dateFormatting';
import { buildActionConfigEntries, buildConfigSections } from './orchestrationConfigDisplay';
import {
  getExecutionTypeLabel,
  getSkippedReasonLabel,
  mapExecutionRowStatus,
} from './orchestrationExecutionLabels';

/**
 * Calculate relative day label from check-in date
 * @param {Date|string} date - Date to compare
 * @param {Date|string} checkInDate - Check-in date reference
 * @param {Date|string} checkOutDate - Check-out date reference
 * @returns {string} Label like "J-3", "Arrivée", "J+2", "Départ"
 */
const getRelativeDayLabel = (date, checkInDate, checkOutDate) => {
  if (!date || !checkInDate) return '';

  const dateObj = new Date(date);
  const checkIn = new Date(checkInDate);
  const checkOut = checkOutDate ? new Date(checkOutDate) : null;

  // Set all to midnight for day comparison
  dateObj.setHours(0, 0, 0, 0);
  checkIn.setHours(0, 0, 0, 0);
  if (checkOut) checkOut.setHours(0, 0, 0, 0);

  const diffMs = dateObj - checkIn;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  // Check if it's check-in day
  if (diffDays === 0) return 'Arrivée';

  // Check if it's check-out day
  if (checkOut && dateObj.getTime() === checkOut.getTime()) return 'Départ';

  // Before check-in
  if (diffDays < 0) return `J${diffDays}`;

  // After check-in
  return `J+${diffDays}`;
};

/**
 * Emoji mapping by workflow category
 */
const ICON_BY_CATEGORY = {
  message: '📨',
  notification: '📨',
  welcome: '📨',
  registration: '🔐',
  arrival_choice: '🎫',
  arrival_choose: '🎫',
  departure_choice: '🚪',
  departure_choose: '🚪',
  cleaning: '🧹',
  feedback_during_stay: '💬',
  thank_you: '💝',
  default: '⚙',
};

/**
 * Get status tone for WorkflowTimeline
 */
const getStatusTone = (status) => {
  const statusMap = {
    COMPLETED: 'success',
    EXECUTED: 'success',
    IN_PROGRESS: 'warning',
    PENDING: 'warning',
    FAILED: 'error',
    LATE: 'error',
    SKIPPED: 'neutral',
    CANCELLED: 'neutral',
  };
  return statusMap[status] || 'info';
};

/**
 * Get sub-step status from workflow actions
 */
const getSubStepStatus = (action) => {
  if (!action) return 'pending';

  const statusMap = {
    COMPLETED: 'completed',
    EXECUTED: 'completed',
    PENDING: 'pending',
    IN_PROGRESS: 'pending',
    FAILED: 'failed',
    LATE: 'late',
    SKIPPED: 'skipped',
  };

  return statusMap[action.status] || 'pending';
};

/**
 * Format date avec jour de la semaine (ex: "Jeu 07/05 à 11:00")
 */
const formatReminderDate = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const dayName = days[date.getDay()];
  const dateStr = formatCasablancaDateOnly(dateInput);
  const timeStr = formatCasablancaTimeOnly(dateInput).substring(0, 5); // Remove seconds
  return `${dayName} ${dateStr} à ${timeStr}`;
};

/**
 * Build reminders array from scheduledExecutions
 */
const buildReminders = (scheduledExecutions) => {
  if (!Array.isArray(scheduledExecutions) || scheduledExecutions.length === 0) {
    return [];
  }

  return scheduledExecutions.map(exec => {
    const scheduledDate = exec.scheduledFor || exec.scheduledAt;
    const executedDate = exec.executedAt;
    const rowStatus = mapExecutionRowStatus(exec);
    const skipLabel = getSkippedReasonLabel(exec.skippedReason);

    return {
      when: formatReminderDate(scheduledDate),
      firedAt: executedDate ? formatReminderDate(executedDate) : null,
      status: rowStatus.key,
      statusLabel: rowStatus.label,
      channel: exec.executionResult?.channel || exec.channel || 'whatsapp',
      crossed: rowStatus.crossed,
      lastMinute: exec.condition === 'LAST_CHANCE' || exec.metadata?.lastMinuteRecovery === true,
      executionType: getExecutionTypeLabel(exec),
      skippedReason: exec.skippedReason,
      skipReasonLabel: skipLabel,
      executionId: exec.executionId,
      error: exec.executionResult?.error || exec.error,
    };
  });
};

/**
 * Build assignments array from assignStaff execution attempts
 */
const buildAssignments = (assignStaffAction) => {
  if (!assignStaffAction?.execution?.attempts) {
    return [];
  }

  // Group attempts by day to count attempts per day
  const attemptsByDay = {};
  assignStaffAction.execution.attempts.forEach((attempt) => {
    const day = attempt.day || 1;
    if (!attemptsByDay[day]) {
      attemptsByDay[day] = [];
    }
    attemptsByDay[day].push(attempt);
  });

  // Build assignments with correct J1#1, J1#2, J2#1, J2#2 labels
  const assignments = [];
  assignStaffAction.execution.attempts.forEach((attempt) => {
    const day = attempt.day || 1;
    const dayAttempts = attemptsByDay[day];
    const attemptNum = dayAttempts.indexOf(attempt) + 1;

    const date = formatCasablancaDateOnly(attempt.scheduledAt);
    const time = formatCasablancaTimeOnly(attempt.scheduledAt);

    assignments.push({
      dayLabel: `J${day}#${attemptNum}`,
      slot: `${date} à ${time}`,
      status: attempt.accepted ? 'assigned' :
              attempt.declined ? 'declined' :
              attempt.noResponse ? 'no_response' : 'unused',
      staffName: attempt.staffName || null,
      manual: attempt.manual || false,
    });
  });

  return assignments;
};

/** @deprecated use buildActionConfigEntries / buildConfigSections */
const buildConfig = (action, actionKey, workflow) =>
  buildActionConfigEntries(action, actionKey, workflow);

/**
 * Build audit trail from workflow metadata and action executions
 */
const buildAudit = (workflow, action) => {
  const audit = [];

  // Add workflow creation event
  if (workflow.createdAt) {
    audit.push({
      at: formatCasablancaDateTime(workflow.createdAt),
      icon: '⚙️',
      label: `Workflow créé · ${workflow.workflowId}`,
      source: 'srv-orchestrator',
    });
  }

  // Add action executions
  if (action?.scheduledExecutions) {
    action.scheduledExecutions.forEach(exec => {
      const skipLabel = getSkippedReasonLabel(exec.skippedReason);
      const typeLabel = getExecutionTypeLabel(exec);
      if (exec.executedAt) {
        audit.push({
          at: formatCasablancaDateTime(exec.executedAt),
          icon: exec.status === 'EXECUTED' ? '✅' : '⚠',
          label: `${exec.status === 'EXECUTED' ? 'Exécuté' : 'Échec'} · ${typeLabel} · ${exec.executionId || 'N/A'}`,
          source: exec.executionResult?.triggeredBy === 'MANUAL' ? 'manual' : 'cron',
        });
      } else if (String(exec.status).toUpperCase() === 'SKIPPED') {
        audit.push({
          at: formatCasablancaDateTime(exec.scheduledAt || exec.scheduledFor),
          icon: '⊘',
          label: `Ignoré · ${typeLabel}${skipLabel ? ` · ${skipLabel}` : ''}`,
          source: 'srv-orchestrator',
        });
      } else if (exec.metadata?.lastMinuteRecovery && String(exec.status).toUpperCase() === 'PENDING') {
        audit.push({
          at: formatCasablancaDateTime(exec.scheduledAt || exec.scheduledFor),
          icon: '⏱',
          label: `Dernier créneau (LM) planifié · ${exec.executionId || 'N/A'}`,
          source: 'srv-orchestrator',
        });
      }
    });
  }

  // Add completion event
  if (workflow.completedAt) {
    audit.push({
      at: formatCasablancaDateTime(workflow.completedAt),
      icon: '✅',
      label: 'Workflow terminé',
      source: 'srv-orchestrator',
    });
  }

  return audit.sort((a, b) => new Date(b.at) - new Date(a.at));
};

/**
 * Build actions array (interactive buttons for L3)
 */
const buildActions = (actionKey, action, workflow) => {
  const actions = [];
  const actionId = action?.actionId; // ID from API for execution

  // Ménage payant : requestTimeslot = trace client WhatsApp (COMPLETED), pas de relances orchestrateur
  if (
    workflow?.categoryType === 'CLEANING_PAID' &&
    actionKey === 'requestTimeslot'
  ) {
    return actions;
  }

  if (actionKey === 'sendNotification' || actionKey === 'requestTimeslot') {
    if (action?.status === 'PENDING') {
      actions.push({ id: 'force-send', label: '⚡ Envoyer hors date', intent: 'primary', actionId });
    }
    actions.push({ id: 'resend', label: '⚡ Renvoyer manuellement', intent: 'ghost', actionId });
    if (actionKey === 'requestTimeslot') {
      actions.push({ id: 'view-messages', label: '📝 Voir messages', intent: 'ghost', actionId });
    }
  }

  if (actionKey === 'assignStaff') {
    actions.push({ id: 'reassign-auto', label: '✨ Réassigner auto', intent: 'ai', actionId });
    actions.push({ id: 'reassign-manual', label: '👤 Manuel', intent: 'ghost', actionId });
  }

  if (actionKey === 'deadlineEscalation') {
    if (action?.status === 'LATE' || action?.status === 'FAILED') {
      actions.push({ id: 'extend', label: '⚡ Prolonger', intent: 'primary', actionId });
    }
  }

  return actions;
};

/**
 * Map a single workflow action to a SubStep
 */
const mapActionToSubStep = (workflow, actionKey, action, enrichment = {}) => {
  const subStep = {
    id: actionKey,
    actionId: action?.actionId, // Add actionId for reminder actions
    icon: ICON_BY_CATEGORY[actionKey] || ICON_BY_CATEGORY[workflow.category] || ICON_BY_CATEGORY.default,
    label: actionKey.replace(/([A-Z])/g, ' $1').trim(),
    status: getSubStepStatus(action),
  };

  // Primary metric (summary line)
  if (actionKey === 'sendNotification' && action?.executedAt) {
    subStep.primaryMetric = `Email · envoyé ${formatCasablancaTimeOnly(action.executedAt)}`;
  } else if (actionKey === 'requestTimeslot' && workflow?.categoryType === 'CLEANING_PAID') {
    subStep.primaryMetric = 'Créneau commandé par le client (WhatsApp)';
  } else if (actionKey === 'requestTimeslot' && action?.scheduledReminders) {
    const remindersCount = action.scheduledReminders.length || 0;
    subStep.primaryMetric = `${remindersCount} relance(s) envoyée(s)`;
  } else if (actionKey === 'assignStaff' && action?.execution?.attempts) {
    const attempts = action.execution.attempts;
    const assigned = attempts.filter(a => a.accepted).length;
    subStep.primaryMetric = `${assigned}/${attempts.length} assigné(s)`;
  }

  // Side badge
  if (action?.status === 'LATE') {
    subStep.sideBadge = { tone: 'error', label: 'RETARD' };
  } else if (action?.status === 'COMPLETED' || action?.status === 'EXECUTED') {
    subStep.sideBadge = { tone: 'success', label: 'TERMINÉ' };
  } else if (action?.status === 'PENDING') {
    subStep.sideBadge = { tone: 'warning', label: 'EN COURS' };
  }

  // L3 Details — relances from scheduledExecutions or scheduledReminders
  if (action?.scheduledExecutions?.length) {
    subStep.reminders = buildReminders(action.scheduledExecutions);
  } else if (action?.scheduledReminders?.length) {
    subStep.reminders = buildReminders(
      action.scheduledReminders.map((r) => ({
        scheduledFor: r.scheduledFor,
        status: 'PENDING',
        condition: r.condition,
      })),
    );
  }

  if (actionKey === 'assignStaff') {
    subStep.assignments = buildAssignments(action);
  }

  const { configCards, flatConfig } = buildConfigSections({
    action,
    actionKey,
    workflow,
    ownerTemplate: enrichment.ownerTemplate,
    listingDoc: enrichment.listingDoc,
    planMeta: enrichment.planMeta,
  });
  subStep.config = flatConfig;
  subStep.configCards = configCards;
  subStep.audit = buildAudit(workflow, action);
  const isPlaceholder = (workflow.workflowId || '').toString().startsWith('PLACEHOLDER-');
  subStep.isPlaceholder = isPlaceholder;
  subStep.actions = isPlaceholder ? [] : buildActions(actionKey, action, workflow);

  return subStep;
};

/**
 * Map API workflow to WorkflowTimeline workflow format
 */
const mapWorkflow = (workflow, reservationNumber, enrichment = {}) => {
  // Build sub-steps from workflow actions
  const subSteps = [];

  if (workflow.actions) {
    Object.entries(workflow.actions).forEach(([actionKey, action]) => {
      // ⚠️ SKIP createTask - le timeslot EST la tâche elle-même
      if (actionKey === 'createTask') return;

      if (action && typeof action === 'object') {
        const subStep = mapActionToSubStep(workflow, actionKey, action, enrichment);
        // Add reservationNumber to each action for execution
        if (subStep.actions) {
          subStep.actions = subStep.actions.map(act => ({
            ...act,
            reservationNumber
          }));
        }
        subSteps.push(subStep);
      }
    });
  }

  const isPlaceholder = (workflow.workflowId || '').toString().startsWith('PLACEHOLDER-');

  return {
    id: workflow.workflowId,
    type: workflow.category,
    icon: ICON_BY_CATEGORY[workflow.category] || ICON_BY_CATEGORY.default,
    title: workflow.categoryDisplayLabel || workflow.category,
    isPlaceholder,
    createdAt: formatCasablancaDateTime(workflow.createdAt),
    timeslotId: workflow.timeslotCode || null,
    globalStatus: {
      tone: getStatusTone(workflow.status),
      label: workflow.status,
      animate: workflow.status === 'PENDING' || workflow.status === 'LATE',
    },
    subSteps,
    reservationNumber, // Add for context
  };
};

/**
 * Map API reservation data to WorkflowTimeline format
 * @param {Object} planData - Data from /orchestrator/plans/:reservationCode
 * @returns {Object} { workflows, daySeparators }
 */
export const mapReservationToWorkflows = (planData, enrichment = {}) => {
  if (!planData || !planData.workflows) {
    return { workflows: [], daySeparators: [] };
  }

  const checkInDate = planData.checkInDate;
  const checkOutDate = planData.checkOutDate;
  const reservationNumber = planData.reservationCode;

  // Map workflows
  const workflows = planData.workflows.map((wf) =>
    mapWorkflow(wf, reservationNumber, enrichment),
  );

  // Build day separators (group by creation date) with relative day labels
  const daySeparators = [];
  const dateGroups = new Map();

  workflows.forEach((workflow, index) => {
    const dateOnly = formatCasablancaDateOnly(workflow.createdAt);
    if (!dateGroups.has(dateOnly)) {
      dateGroups.set(dateOnly, { index, dateStr: workflow.createdAt });
    }
  });

  // Add separator before each new day (except first) with relative label
  let isFirst = true;
  dateGroups.forEach(({ index, dateStr }, date) => {
    if (!isFirst) {
      const relativeLabel = getRelativeDayLabel(dateStr, checkInDate, checkOutDate);
      daySeparators.push({
        beforeId: workflows[index].id,
        label: relativeLabel ? `${date} · ${relativeLabel}` : date,
      });
    }
    isFirst = false;
  });

  return { workflows, daySeparators };
};
