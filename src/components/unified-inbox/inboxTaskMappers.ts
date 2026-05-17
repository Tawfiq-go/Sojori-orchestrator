import type { ReservationTask } from '../../types/reservationTask.types';
import type { TasksStaffMember } from '../../types/tasks.types';

export function mapSearchTaskToReservationTask(t: Record<string, unknown>): ReservationTask {
  const assigned = t.assignedStaff as { name?: string; phone?: string } | undefined;
  return {
    taskId: String(t._id || t.taskId || ''),
    taskCode: String(t.taskCode || t.code || ''),
    type: String(t.subType || t.itemType || t.type || 'other'),
    status: String(t.status || 'CREATED'),
    scheduledFor: (t.startDate || t.scheduledFor) as string | undefined,
    deadline: (t.deadline || t.endDate) as string | undefined,
    assignedStaff:
      assigned?.name || t.staffName
        ? {
            name: String(assigned?.name || t.staffName),
            phone: String(assigned?.phone || t.staffWhatsappPhone || t.staffPhone || ''),
          }
        : null,
  };
}

function normalizePhone(p?: string): string {
  return (p || '').replace(/\D/g, '');
}

/** Trouve un staff par numéro WhatsApp (aligné /tasks/team). */
export function findStaffByPhone(
  staffList: TasksStaffMember[],
  phone?: string,
): TasksStaffMember | undefined {
  const needle = normalizePhone(phone);
  if (!needle || needle.length < 8) return undefined;
  return staffList.find((s) => {
    const wa = normalizePhone(s.whatsappPhone);
    const call = normalizePhone(s.callPhone);
    return (
      (wa && (wa === needle || wa.endsWith(needle.slice(-9)) || needle.endsWith(wa.slice(-9)))) ||
      (call && (call === needle || call.endsWith(needle.slice(-9)) || needle.endsWith(call.slice(-9))))
    );
  });
}
