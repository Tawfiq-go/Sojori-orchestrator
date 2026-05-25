/**
 * Appels API AddTaskModal — alignés legacy dashboard (srv-task + srv-listing).
 */

import apiClient from '../../../services/apiClient';
import { MICROSERVICE_BASE_URL } from '../../../config/authConfig';
import listingsService from '../../../services/listingsService';
import reservationsService from '../../../services/reservationsService';
import type { Reservation as ApiReservation } from '../../../types/reservations.types';
import type { Listing, ListingClientServices, Reservation, TaskFormData } from './types';

const SRV_TASK = MICROSERVICE_BASE_URL.SRV_TASK;
const SRV_LISTING = MICROSERVICE_BASE_URL.SRV_LISTING;

export async function fetchTaskListings(ownerId?: string): Promise<Listing[]> {
  const response = await apiClient.get(`${SRV_TASK}/listings`, {
    params: ownerId ? { ownerId } : {},
  });
  return response.data || [];
}

/** Logements srv-listing (même source que la liste tâches fulltask). */
export async function fetchFulltaskListings(): Promise<Listing[]> {
  const res = await listingsService.getListings({
    useActiveFilter: true,
    active: true,
    limit: 1000,
    page: 0,
  });
  const items = res.data?.items ?? [];
  return items.map((l) => ({
    _id: String(l.id),
    id: String(l.id),
    name: l.name || 'Sans nom',
    title: l.name,
    address: l.city || undefined,
    city: l.city,
    ownerId: l.ownerId ? String(l.ownerId) : '',
  }));
}

function mapApiReservation(r: ApiReservation): Reservation {
  const listingId = String(r.sojoriId || r.listingMapId || '');
  return {
    _id: String(r.id),
    id: String(r.id),
    number: r.reservationNumber || r.id,
    reservationNumber: r.reservationNumber || r.id,
    guestName: r.guestName || 'Invité',
    checkIn: r.arrivalDate,
    checkOut: r.departureDate,
    arrivalDate: r.arrivalDate,
    departureDate: r.departureDate,
    adults: r.adults ?? 1,
    children: r.children ?? 0,
    listingId,
    sojoriId: listingId,
    status: r.status || '',
    guestPhone: r.phone,
    phone: r.phone,
  };
}

function isActiveReservationStatus(status: string): boolean {
  const s = (status || '').toLowerCase();
  return !s.includes('cancel');
}

function findCurrentReservationForListing(
  rows: ApiReservation[],
  listingId: string,
): Reservation | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const r of rows) {
    const lid = String(r.sojoriId || r.listingMapId || '');
    if (lid !== listingId || !isActiveReservationStatus(r.status)) continue;
    const start = new Date(r.arrivalDate);
    const end = new Date(r.departureDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    if (today >= start && today <= end) return mapApiReservation(r);
  }
  return null;
}

async function fetchReservationsWindow(): Promise<ApiReservation[]> {
  const status = 'Confirmed,Pending,Checked_in,Accepted';
  const [checkIn, checkOut] = await Promise.all([
    reservationsService.getList({ filter: 'CHECKIN_7DAYS', limit: 400, status }),
    reservationsService.getList({ filter: 'CHECKOUT_7DAYS', limit: 400, status }),
  ]);
  const byId = new Map<string, ApiReservation>();
  for (const r of [...(checkIn.data || []), ...(checkOut.data || [])]) {
    byId.set(r.id, r);
  }
  return [...byId.values()];
}

export async function fetchFulltaskReservationsForListing(
  listingId: string,
): Promise<Reservation[]> {
  const all = (await fetchReservationsWindow()).map(mapApiReservation);
  return all.filter((r) => {
    const lid = r.listingId || r.sojoriId;
    return lid === listingId && isActiveReservationStatus(r.status);
  });
}

export async function fetchFulltaskCurrentReservation(
  listingId: string,
): Promise<Reservation | null> {
  return findCurrentReservationForListing(await fetchReservationsWindow(), listingId);
}

export async function fetchCurrentReservation(
  listingId: string,
): Promise<Reservation | null> {
  const response = await apiClient.get(`${SRV_TASK}/reservations/current`, {
    params: { listingId },
  });
  return response.data?.reservation || null;
}

export async function fetchTaskReservations(
  ownerId: string | undefined,
  listingId: string,
): Promise<Reservation[]> {
  const response = await apiClient.get(`${SRV_TASK}/reservations`, {
    params: ownerId ? { ownerId, limit: 100 } : { limit: 100 },
  });
  const allData = response.data || [];
  return allData.filter((res: Reservation) => {
    const resListingId = res.listingId || res.sojoriId;
    const isCorrectListing = resListingId === listingId;
    const status = (res.status || '').toLowerCase();
    const isValidStatus =
      !status ||
      ['pending', 'confirmed', 'checked_in', 'accepted'].includes(status);
    return isCorrectListing && isValidStatus;
  });
}

export async function fetchListingClientServices(
  listingId: string,
): Promise<ListingClientServices | null> {
  const response = await apiClient.get(
    `${SRV_LISTING}/listings/${listingId}/client-services`,
  );
  return response.data?.data || null;
}

export async function fetchStaffSimplified(ownerId: string) {
  const response = await apiClient.get(`${SRV_TASK}/staff-simplified`, {
    params: { ownerId, isActive: true, limit: 100 },
  });
  const staffData = response.data?.staff || [];
  return Array.isArray(staffData) ? staffData : [];
}

export interface AvailableStaffQuery {
  listingId?: string;
  taskType?: string;
  taskCategory?: string;
  ownerId?: string;
  startDate?: Date;
  startTime?: string;
  endTime?: string;
  checkListing?: boolean;
  checkTaskType?: boolean;
  checkPlanning?: boolean;
}

export async function fetchAvailableStaffForTask(
  query: AvailableStaffQuery,
): Promise<{
  available: unknown[];
  unavailable: unknown[];
  listingTaskLine: string;
  staffSummary: string;
}> {
  const params: Record<string, string> = {
    checkListing: String(query.checkListing ?? true),
    checkTaskType: String(query.checkTaskType ?? true),
    checkPlanning: String(query.checkPlanning ?? true),
  };
  if (query.listingId) params.listingId = query.listingId;
  if (query.taskType) params.taskType = query.taskType;
  if (query.taskCategory) params.taskCategory = query.taskCategory;
  if (query.ownerId) params.ownerId = query.ownerId;
  if (query.startDate) params.startDate = query.startDate.toISOString();
  if (query.startTime) params.startTime = query.startTime;
  if (query.endTime) params.endTime = query.endTime;

  const response = await apiClient.get(
    `${SRV_TASK}/staff-simplified/available-for-task`,
    { params },
  );
  if (!response.data?.success) {
    return {
      available: [],
      unavailable: [],
      listingTaskLine: '',
      staffSummary: '',
    };
  }
  const payload = response.data.data || {};
  const staffs = payload.staffs || {};
  return {
    available: Array.isArray(staffs.available) ? staffs.available : [],
    unavailable: Array.isArray(staffs.unavailable) ? staffs.unavailable : [],
    listingTaskLine:
      payload.context?.listingTaskLine || payload.listing_task_line || '',
    staffSummary: payload.staff_summary || '',
  };
}

/** POST /tasks — payloads legacy (source ADMIN, types arrival/support/transport…). */
export async function createTaskFromFormData(
  formData: TaskFormData,
  ownerId?: string,
): Promise<{ task?: unknown; success?: boolean; message?: string }> {
  const { taskType, listing, reservation, clientRequest, taskInfo } = formData;
  if (!taskType || !listing || !reservation) {
    throw new Error('Type, listing et réservation sont requis');
  }

  const listingId = listing._id || listing.id;
  const listingName = listing.name || listing.title || 'Unknown';
  const reservationId = reservation._id || reservation.id;
  const reservationNumber =
    reservation.number || reservation.reservationNumber;
  const listingOwner =
    listing.ownerId != null ? String(listing.ownerId) : '';
  const reservationOwner =
    (reservation as { ownerId?: string }).ownerId != null
      ? String((reservation as { ownerId?: string }).ownerId)
      : '';
  const resolvedOwnerId = ownerId || listingOwner || reservationOwner;
  if (!resolvedOwnerId) {
    throw new Error(
      'Impossible de déterminer le propriétaire (ownerId) pour cette tâche',
    );
  }

  const commonFields = {
    ownerId: resolvedOwnerId,
    listingId,
    listingName,
    reservationId,
    reservationNumber,
    startDate: taskInfo.startDate,
    endDate: taskInfo.endDate,
    duration: taskInfo.duration,
    emergency: taskInfo.emergency,
    tags: taskInfo.tags || [],
    comment: taskInfo.comment || '',
    descriptions: taskInfo.comment ? [taskInfo.comment] : [],
    images: taskInfo.images || [],
    paid: taskInfo.paid || false,
    price: taskInfo.price || 0,
    paymentMode: taskInfo.paymentMode || '',
    staffId: taskInfo.staffId,
    staffCode: taskInfo.staffCode,
    initialStatus: taskInfo.initialStatus,
    timeslot: clientRequest?.timeslot || null,
    source: 'ADMIN',
  };

  let payload: Record<string, unknown>;

  if (taskType === 'ARRIVAL') {
    payload = {
      ...commonFields,
      name: 'Arrivée',
      type: 'arrival',
      category: 'arrival',
    };
  } else if (taskType === 'DEPARTURE') {
    payload = {
      ...commonFields,
      name: 'Départ',
      type: 'departure',
      category: 'departure',
    };
  } else if (taskType === 'CLEANING') {
    payload = {
      ...commonFields,
      name: 'Ménage',
      type: 'cleaning',
      category: 'cleaning',
      paid: clientRequest?.cleaningType === 'paid',
      price:
        clientRequest?.cleaningType === 'paid'
          ? clientRequest.price || 0
          : 0,
    };
  } else if (taskType === 'REGISTRATION') {
    payload = {
      ...commonFields,
      name: 'Enregistrement',
      type: 'registration',
      category: 'registration',
    };
  } else if (taskType === 'SUPPORT') {
    payload = {
      ...commonFields,
      name: clientRequest?.categoryName || 'Support',
      type: 'support',
      category: clientRequest?.categoryName || 'maintenance',
      categoryId: clientRequest?.categoryId || null,
      categoryName: clientRequest?.categoryName || null,
      descriptions: [clientRequest?.description || ''],
      images: clientRequest?.photos || [],
    };
  } else if (taskType === 'TRANSPORT') {
    const serviceName = clientRequest?.categoryName || 'Transport';
    payload = {
      ...commonFields,
      name: serviceName,
      type: 'transport',
      category: 'transport',
      categoryId: clientRequest?.categoryId || null,
      categoryName: clientRequest?.categoryName || null,
      price: clientRequest?.price || commonFields.price || 0,
      comment: [
        clientRequest?.categoryName
          ? `Service: ${clientRequest.categoryName}`
          : '',
        `Passagers: ${clientRequest?.passengers || 1}`,
        clientRequest?.flightNumber ? `Vol: ${clientRequest.flightNumber}` : '',
        clientRequest?.pickupTime
          ? `Heure: ${new Date(clientRequest.pickupTime).toTimeString().substring(0, 5)}`
          : '',
      ]
        .filter(Boolean)
        .join(' — '),
    };
  } else if (taskType === 'GROCERIES') {
    const serviceName = clientRequest?.categoryName || 'Courses';
    payload = {
      ...commonFields,
      name: serviceName,
      type: 'groceries',
      category: 'groceries',
      categoryId: clientRequest?.categoryId || null,
      categoryName: clientRequest?.categoryName || null,
      price: clientRequest?.price || commonFields.price || 0,
      comment: clientRequest?.budget
        ? `Budget: ${clientRequest.budget} MAD`
        : '',
      descriptions: clientRequest?.items || [],
    };
  } else {
    const serviceName =
      clientRequest?.categoryName || 'Demande personnalisée';
    payload = {
      ...commonFields,
      name: serviceName,
      type: 'custom',
      category: 'custom',
      categoryId: clientRequest?.categoryId || null,
      categoryName: clientRequest?.categoryName || null,
      comment: clientRequest?.description || taskInfo.comment || '',
      descriptions: clientRequest?.description
        ? [clientRequest.description]
        : [],
    };
  }

  const response = await apiClient.post(`${SRV_TASK}/tasks`, payload);
  return response.data;
}
