import type { TaskFormData } from '../components/tasks/AddTaskModal/types';
import { resolveFulltaskTypeId } from '../utils/fulltaskAddTaskHelpers';
import * as fulltaskApi from './fulltaskApi';

export async function createFulltaskFromFormData(formData: TaskFormData, ownerId?: string) {
  const { listing, reservation, clientRequest, taskInfo } = formData;
  if (!listing || !reservation) {
    throw new Error('Logement et réservation sont requis');
  }

  const listingId = listing._id || listing.id;
  const reservationId = reservation._id || reservation.id;
  const resolvedOwnerId =
    ownerId ||
    (listing.ownerId != null ? String(listing.ownerId) : '') ||
    (reservation.ownerId != null ? String(reservation.ownerId) : '');

  const guestName = reservation.guestName || reservation.customerName || 'Invité';
  const guestPhone = reservation.guestPhone || reservation.phone || '+212000000000';

  const priority =
    taskInfo.emergency === 'Critical'
      ? 'critical'
      : taskInfo.emergency === 'Urgent'
        ? 'urgent'
        : 'normal';

  const type = resolveFulltaskTypeId(formData.fulltaskTypeId, formData.taskType);

  const res = await fulltaskApi.createTask({
    type,
    triggeredBy: 'manual',
    listingId: String(listingId),
    reservationId: String(reservationId),
    guestPhone: String(guestPhone),
    guestName: String(guestName),
    ownerId: resolvedOwnerId || undefined,
    priority,
    requestNote: taskInfo.comment || clientRequest?.description || '',
    scheduledDate: taskInfo.startDate || undefined,
    dueAt: taskInfo.endDate || undefined,
    payload: {
      source: 'ADMIN',
      legacyTaskType: formData.taskType,
      clientRequest,
      taskInfo,
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
