import type { WizardDeadlines } from '../types';
import {
  CLIENT_RELANCE_MESSAGE_ID,
  STAFF_REMINDER_MESSAGE_ID,
  type OnboardingServiceRhythmDef,
} from '../onboardingWorkflowDefaults';

const PARTNER_TASK_TYPES = new Set(['transport', 'groceries', 'concierge']);

function reminderRef(def: OnboardingServiceRhythmDef): string {
  if (def.dateRef === 'task_created') return 'task_created';
  return def.dateRef;
}

export function buildClientReminders(
  def: OnboardingServiceRhythmDef,
): Array<Record<string, unknown>> {
  const messageId = CLIENT_RELANCE_MESSAGE_ID[def.taskType];
  if (!messageId || !def.clientReminderDays.length) return [];

  const ref = reminderRef(def);
  return def.clientReminderDays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => ({
      ref,
      day,
      time: def.clientReminderTime,
      label: day === 0 ? 'Relance J0' : `Relance J${day}`,
      messageId,
    }));
}

export function buildStaffReminders(
  def: OnboardingServiceRhythmDef,
): Array<Record<string, unknown>> {
  const messageId = STAFF_REMINDER_MESSAGE_ID[def.taskType];
  if (!messageId || !def.staffReminderDays.length) return [];

  const ref = PARTNER_TASK_TYPES.has(def.taskType) ? 'scheduledDate' : reminderRef(def);
  return def.staffReminderDays
    .slice()
    .sort((a, b) => a - b)
    .map((day) => ({
      label: day === 0 ? 'Rappel J0' : `Rappel J${day}`,
      ref,
      messageId,
      day,
      time: def.staffReminderTime,
    }));
}

export function buildStaffAssignment(
  def: OnboardingServiceRhythmDef,
  adminEscalationHour: WizardDeadlines['adminEscalationHour'],
): Record<string, unknown> | null {
  const hour = adminEscalationHour === '14' ? '14:00' : '11:00';
  const base = {
    releaseWindows: ['11:00', '16:00'],
    acceptToleranceHours: def.acceptToleranceHours,
    releaseMode: 'tolerance',
  };

  if (def.staffAssignStyle === 'none') return null;

  const isPartner = PARTNER_TASK_TYPES.has(def.taskType);

  if (def.staffAssignStyle === 'immediate') {
    return {
      ...base,
      autoAssign: isPartner,
      findAnotherStaff: !isPartner,
      startAt: { ref: 'task_created' },
    };
  }

  if (def.staffAssignStyle === 'with_client') {
    return {
      ...base,
      autoAssign: false,
      findAnotherStaff: true,
      startAt: { ref: 'client_timeslot_confirmed' },
      endAt: { ref: 'task_execution', hours: -2 },
    };
  }

  const ref = def.dateRef === 'task_created' ? 'scheduledDate' : def.dateRef;
  const days = def.staffAssignDaysBefore;

  // days < 0 = fenêtre à cheval sur la référence (checkout_cleaning : le ménage a lieu
  // après le check-out). Fin J+4 alignée sur le seed srv-fulltask (defaultSeeds.ts).
  if (days < 0) {
    return {
      ...base,
      autoAssign: false,
      findAnotherStaff: true,
      startAt: { ref, day: days, time: '09:00' },
      endAt: { ref, day: 4, time: '09:00' },
    };
  }

  return {
    ...base,
    autoAssign: false,
    findAnotherStaff: true,
    startAt: { ref, day: -Math.max(1, days), time: '09:00' },
    endAt: { ref, day: -1, time: hour },
  };
}

export function buildDeadline(def: OnboardingServiceRhythmDef): Record<string, unknown> | null {
  if (def.deadlineDay == null) return null;
  const ref = def.dateRef === 'task_created' ? 'task_created' : def.dateRef;
  return {
    ref,
    day: def.deadlineDay,
    time: def.deadlineTime ?? '14:00',
  };
}

export function buildCapabilityExecutionFromRhythmRow(
  row: OnboardingServiceRhythmDef,
  deadlines: WizardDeadlines,
): Record<string, unknown> {
  return {
    enabled: true,
    escalationEnabled: row.escalationEnabled,
    reminders: buildClientReminders(row),
    staffReminders: buildStaffReminders(row),
    staffAssignment: buildStaffAssignment(row, deadlines.adminEscalationHour),
    deadline: buildDeadline(row),
  };
}

export function buildFulltaskWorkflowPatchFromRhythmRow(
  row: OnboardingServiceRhythmDef,
  deadlines: WizardDeadlines,
  enabled = true,
): Record<string, unknown> {
  return {
    type: row.taskType,
    enabled,
    escalationEnabled: row.escalationEnabled,
    reminders: buildClientReminders(row),
    staffReminders: buildStaffReminders(row),
    staffAssignment: buildStaffAssignment(row, deadlines.adminEscalationHour),
    deadline: buildDeadline(row),
  };
}
