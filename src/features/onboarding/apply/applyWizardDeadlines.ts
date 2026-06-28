import * as fulltaskApi from '../../../services/fulltaskApi';
import { unwrapFulltaskData } from '../../../utils/unwrapFulltaskResponse';
import type { WizardDeadlines } from '../types';

type WorkflowRow = {
  type?: string;
  staffAssignment?: Record<string, unknown> | null;
  escalationEnabled?: boolean;
  enabled?: boolean;
};

const STAFF_TASK_TYPES = new Set([
  'arrival_choose',
  'departure_choose',
  'cleaning_free',
  'cleaning_paid',
  'support',
  'service_client',
]);

function buildStaffAssignment(deadlines: WizardDeadlines): Record<string, unknown> | null {
  const hour = deadlines.adminEscalationHour === '14' ? '14:00' : '11:00';
  const base = {
    autoAssign: false,
    findAnotherStaff: true,
    releaseWindows: ['11:00', '16:00'],
    acceptToleranceHours: 3,
    releaseMode: 'tolerance',
  };

  if (deadlines.staffAssignMode === 'with_client_choice') {
    return {
      ...base,
      startAt: { ref: 'client_timeslot_confirmed' },
      endAt: { ref: 'task_execution', hours: -2 },
    };
  }
  if (deadlines.staffAssignMode === 'last_minute') {
    return {
      ...base,
      startAt: { ref: 'task_execution', hours: -4 },
      endAt: { ref: 'task_execution', hours: -1 },
    };
  }

  const days = Math.max(1, deadlines.staffAssignDaysBefore || 3);
  return {
    ...base,
    startAt: { ref: 'scheduledDate', day: -days, time: '09:00' },
    endAt: { ref: 'scheduledDate', day: -1, time: hour },
  };
}

/** Met à jour staffAssignment + escalation sur les workflows fulltask owner. */
export async function applyWizardDeadlines(
  ownerId: string,
  deadlines: WizardDeadlines,
): Promise<number> {
  const raw = await fulltaskApi.getOrchestrationConfig(ownerId, { strictOwner: true }).catch(() => null);
  const doc = raw ? unwrapFulltaskData<{ workflows?: WorkflowRow[] }>(raw) : null;
  const workflows = [...(doc?.workflows ?? [])];
  if (!workflows.length) return 0;

  const staffAssignment = buildStaffAssignment(deadlines);
  let updated = 0;
  const next = workflows.map((wf) => {
    if (!wf.type || !STAFF_TASK_TYPES.has(wf.type)) return wf;
    updated += 1;
    return {
      ...wf,
      escalationEnabled: deadlines.escalateAdminJ1,
      staffAssignment,
    };
  });

  if (updated === 0) return 0;
  await fulltaskApi.upsertOrchestrationConfig(ownerId, { workflows: next });
  return updated;
}
