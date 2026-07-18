import type { ReservationTask } from '../../types/reservationTask.types';
import type { TasksStaffMember } from '../../types/tasks.types';

const TASK_TITLES: Record<string, string> = {
  arrival_choose: "Choix de l'heure d'arrivée",
  arrival: "Choix de l'heure d'arrivée",
  arrival_declare: "Heure d'arrivée déclarée",
  departure_choose: "Choix de l'heure de départ",
  departure: "Choix de l'heure de départ",
  departure_declare: "Heure de départ déclarée",
  cleaning_free: 'Ménage inclus',
  cleaning_paid: 'Ménage supplémentaire',
  checkout_cleaning: 'Ménage après le départ',
  cleaning: 'Ménage',
  registration: 'Enregistrement des voyageurs',
  transport: 'Transport',
  groceries: 'Courses et livraison',
  concierge: 'Service de conciergerie',
  service_client: 'Demande voyageur',
  support: 'Assistance voyageur',
  maintenance: 'Maintenance',
};

function nonEmpty(value: unknown): string | undefined {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || undefined;
}

function humanizeTaskType(type: string): string {
  return type
    .replace(/[_-]+/g, ' ')
    .replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

export function taskTitle(type: string, payload: Record<string, unknown> = {}): string {
  return (
    nonEmpty(payload.categoryTitle) ||
    nonEmpty(payload.categoryLabel) ||
    nonEmpty(payload.serviceName) ||
    TASK_TITLES[type.toLowerCase()] ||
    humanizeTaskType(type) ||
    'Tâche'
  );
}

function taskDescription(t: Record<string, unknown>, title: string): string | undefined {
  const payload = (t.payload && typeof t.payload === 'object' ? t.payload : {}) as Record<string, unknown>;
  const candidates = [payload.routeLabel, payload.serviceName, payload.categoryLabel, t.requestNote];
  return candidates.map(nonEmpty).find((value) => value && value !== title);
}

function normalizeTaskStatus(value: unknown): string {
  const status = String(value || 'new').toLowerCase();
  if (status === 'done' || status === 'completed') return 'COMPLETED';
  if (status === 'cancelled' || status === 'rejected') return 'CANCELLED';
  if (status === 'doing' || status === 'in_progress') return 'IN_PROGRESS';
  if (status === 'confirmed' || status === 'pending_partner' || status === 'assigned') return 'ASSIGNED';
  return 'CREATED';
}

export function mapSearchTaskToReservationTask(t: Record<string, unknown>): ReservationTask {
  const assigned = (t.assignedStaff || t.assignedTo) as
    | { name?: string; username?: string; phone?: string; whatsappPhone?: string }
    | undefined;
  const payload = (t.payload && typeof t.payload === 'object' ? t.payload : {}) as Record<string, unknown>;
  const type = String(t.type || t.subType || t.itemType || 'other');
  const title = taskTitle(type, payload);
  return {
    taskId: String(t._id || t.taskId || ''),
    taskCode: String(t.taskCode || t.code || ''),
    type,
    title,
    description: taskDescription(t, title),
    status: normalizeTaskStatus(t.status || t.taskStatus),
    priority: nonEmpty(t.priority || t.emergency),
    source: nonEmpty(t.triggeredBy || payload.source),
    scheduledFor: (t.scheduledDate || t.scheduledAt || t.startDate || t.scheduledFor) as string | undefined,
    deadline: (t.dueAt || t.deadline || t.endDate) as string | undefined,
    assignedStaff:
      assigned?.name || assigned?.username || t.staffName
        ? {
            name: String(assigned?.name || assigned?.username || t.staffName),
            phone: String(
              assigned?.phone || assigned?.whatsappPhone || t.staffWhatsappPhone || t.staffPhone || '',
            ),
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
