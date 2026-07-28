import type { TaskFormData } from '../components/tasks/AddTaskModal/types';
import { resolveFulltaskTypeId } from '../utils/fulltaskAddTaskHelpers';
import * as fulltaskApi from './fulltaskApi';

function endFromStart(start: Date, durationHours: number): Date {
  return new Date(start.getTime() + Math.max(0.5, durationHours) * 3600 * 1000);
}

export async function createFulltaskFromFormData(formData: TaskFormData, ownerId?: string) {
  const { listing, reservation, clientRequest, taskInfo } = formData;
  if (!listing) {
    throw new Error('Logement requis');
  }

  const listingId = listing._id || listing.id;
  const reservationId = reservation
    ? String(reservation._id || reservation.id || '').trim()
    : '';
  const resolvedOwnerId =
    ownerId ||
    (listing.ownerId != null ? String(listing.ownerId) : '') ||
    (reservation?.ownerId != null ? String(reservation.ownerId) : '');

  const guestName = reservation
    ? reservation.guestName || reservation.customerName || 'Invité'
    : 'Sans réservation';
  const guestPhone = reservation
    ? reservation.guestPhone || reservation.phone || '+212000000000'
    : '+212000000000';

  const priority =
    taskInfo.emergency === 'Critical'
      ? 'critical'
      : taskInfo.emergency === 'Urgent'
        ? 'urgent'
        : 'normal';

  const type = resolveFulltaskTypeId(formData.fulltaskTypeId, formData.taskType);

  if (!taskInfo.startDate) {
    throw new Error('Date de début requise');
  }
  const start = new Date(taskInfo.startDate);
  if (Number.isNaN(start.getTime())) {
    throw new Error('Date de début invalide');
  }
  const durationHours = Math.max(0.5, Number(taskInfo.duration) || 2);
  const end =
    taskInfo.endDate && !Number.isNaN(new Date(taskInfo.endDate).getTime())
      ? new Date(taskInfo.endDate)
      : endFromStart(start, durationHours);

  const note = String(taskInfo.comment || clientRequest?.description || '').trim();
  const reservationCode = reservation
    ? String(reservation.number || reservation.reservationNumber || '').trim()
    : '';

  const res = await fulltaskApi.createTask({
    type,
    triggeredBy: 'manual',
    listingId: String(listingId),
    ...(reservationId ? { reservationId } : {}),
    ...(reservationCode ? { reservationCode } : {}),
    guestPhone: String(guestPhone),
    guestName: String(guestName),
    ownerId: resolvedOwnerId || undefined,
    priority,
    ...(note ? { requestNote: note } : {}),
    scheduledDate: start.toISOString(),
    scheduledAt: start.toISOString(),
    dueAt: end.toISOString(),
    payload: {
      source: 'ADMIN',
      legacyTaskType: formData.taskType,
      durationHours,
      clientRequest,
      taskInfo: {
        ...taskInfo,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        duration: durationHours,
      },
      ...(reservationId ? {} : { noReservation: true }),
    },
  });

  if (res?.success === false) throw new Error(res?.error || 'Création impossible');

  const taskId = res?.data?._id;
  const staffId = taskInfo.staffId || taskInfo.staffCode;
  if (taskId && staffId) {
    await fulltaskApi.assignTask(String(taskId), String(staffId));
  }

  return { success: true, task: res?.data };
}
