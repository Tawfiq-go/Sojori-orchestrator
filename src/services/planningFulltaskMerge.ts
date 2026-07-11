import * as fulltaskApi from './fulltaskApi';
import reservationsService from './reservationsService';
import type { Reservation } from '../types/reservations.types';
import { mapFulltaskStatusToLegacy } from '../utils/fulltaskMappers';
import {
  inferTaskPlannedDay,
  inferTaskPlannedIso,
} from '../utils/inferTaskPlannedDate';
import { resolveReservationListingId, reservationListingLabel } from '../utils/planningListingMatch';
import type { TaskType } from '../components/calendar-views/_shared';

export interface PlanningTimelineItem {
  type: TaskType;
  category?: string;
  scheduledFor: string;
  isTask?: boolean;
  staffId?: string | null;
  staffName?: string | null;
  status?: string;
  cleaning_type?: string;
  data?: Record<string, unknown>;
}

export interface PlanningReservationRow {
  reservationId: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  status: string;
  channelName?: string;
  numberOfGuests?: number;
  reservationNumber?: string;
  timeline: PlanningTimelineItem[];
}

export interface PlanningListingRow {
  listingId: string;
  listingName?: string;
  city?: string;
  reservations: PlanningReservationRow[];
}

/** fulltask type → chip StayView */
export function fulltaskTypeToStayTaskType(type: string): TaskType {
  const t = String(type || '').toLowerCase();
  if (t.includes('arrival') || t === 'check_in') return 'arrival';
  if (t.includes('departure') || t === 'check_out') return 'departure';
  if (t.includes('cleaning') || t.includes('menage')) return 'cleaning';
  if (t === 'registration') return 'registration';
  if (t === 'transport') return 'transport';
  if (t === 'concierge' || t === 'groceries') return 'concierge';
  if (t === 'support' || t === 'service_client') return 'support';
  return 'task';
}

function toIsoDate(d: Date | string | undefined): string {
  if (!d) return '';
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function normalizeMongoId(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as { _id?: unknown; toString?: () => string };
    if (o._id != null) return String(o._id);
    if (typeof o.toString === 'function') {
      const s = o.toString();
      if (/^[a-f0-9]{24}$/i.test(s)) return s;
    }
  }
  const s = String(value);
  return s && s !== '[object Object]' ? s : undefined;
}

function resolveListingId(res: Reservation): string | undefined {
  return resolveReservationListingId(res);
}

function resolveReservationId(res: Reservation): string {
  const anyRes = res as Reservation & { _id?: unknown };
  return (
    normalizeMongoId(anyRes.id) ||
    normalizeMongoId(anyRes._id) ||
    String(res.reservationNumber || '')
  );
}

function reservationOverlapsWindow(
  res: Reservation,
  startDate: string,
  endDate: string,
): boolean {
  const arrival = toIsoDate(res.arrivalDate);
  const departure = toIsoDate(res.departureDate);
  if (!arrival || !departure) return false;
  return departure >= startDate && arrival <= endDate;
}

function mapReservationStatus(status?: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('confirm')) return 'confirmed';
  if (s.includes('pending')) return 'pending';
  return 'confirmed';
}

function taskInDateRange(
  task: Record<string, unknown>,
  startDate: string,
  endDate: string,
  reservation?: Reservation,
): boolean {
  const day =
    inferTaskPlannedDay(task, reservation) ||
    toIsoDate(task.createdAt as string | Date | undefined);
  if (!day) return true;
  return day >= startDate && day <= endDate;
}

export function fulltaskToTimelineItem(
  task: Record<string, unknown>,
  staffById: Record<string, { name?: string }>,
  reservation?: Reservation,
): PlanningTimelineItem {
  const scheduled =
    inferTaskPlannedIso(task, reservation) ||
    (task.createdAt ? new Date(String(task.createdAt)).toISOString() : '');
  const assignedTo = task.assignedTo ? String(task.assignedTo) : null;
  const staff = assignedTo ? staffById[assignedTo] : null;
  const ftType = String(task.type || 'task');
  const legacyStatus = mapFulltaskStatusToLegacy(task.status, task.assignedTo);

  return {
    type: fulltaskTypeToStayTaskType(ftType),
    category: ftType,
    scheduledFor: scheduled,
    isTask: true,
    staffId: assignedTo,
    staffName: staff?.name ? String(staff.name) : null,
    status: legacyStatus,
    data: {
      taskId: task._id,
      taskCode: task.taskCode,
      fulltask: true,
      ...task,
    },
  };
}

/**
 * Planning TaskNew — sans srv-task :
 * - Réservations : srv-reservations (comme /reservations/planning)
 * - Tâches timeline : srv-fulltask via admin BFF
 */
export async function fetchTaskNewPlanning(params: {
  startDate: string;
  endDate: string;
  ownerId?: string;
}): Promise<{ success: boolean; data: { listings: PlanningListingRow[] }; message?: string }> {
  console.log('🔍 [fetchTaskNewPlanning] START - Fetching reservations, tasks, and staff in parallel');
  const startTime = performance.now();

  const reservationsPromise = reservationsService.getList({
    limit: 100, // backend cap 100
    status: 'Confirmed,Pending,Inside',
    dateType: 'arrival_or_departure',
    startDate: params.startDate,
    endDate: params.endDate,
    filterOwnerId: params.ownerId,
  }).then(res => {
    console.log(`✅ [fetchTaskNewPlanning] getList (reservations) completed in ${(performance.now() - startTime).toFixed(0)}ms - ${res?.data?.length || 0} items`);
    return res;
  });

  const tasksPromise = fulltaskApi.listTasks({}).then(res => {
    console.log(`✅ [fetchTaskNewPlanning] listTasks completed in ${(performance.now() - startTime).toFixed(0)}ms - ${res?.data?.length || 0} items`);
    return res;
  });

  const staffPromise = fulltaskApi.listStaff().then(res => {
    console.log(`✅ [fetchTaskNewPlanning] listStaff completed in ${(performance.now() - startTime).toFixed(0)}ms - ${res?.data?.length || 0} items`);
    return res;
  });

  const [reservationsRes, tasksRes, staffRes] = await Promise.all([
    reservationsPromise,
    tasksPromise,
    staffPromise,
  ]);

  console.log(`⏱️  [fetchTaskNewPlanning] All 3 API calls completed in ${(performance.now() - startTime).toFixed(0)}ms`);

  // ⚡ OPTIMISATION: Augmenter la limite des réservations pour réduire les appels individuels
  // Si on a plus de tâches que de réservations, on manque probablement des réservations
  const tasksCount = tasksRes?.data?.length || 0;
  const reservationsCount = reservationsRes?.data?.length || 0;
  console.log(`📊 [fetchTaskNewPlanning] Loaded ${reservationsCount} reservations and ${tasksCount} tasks`);
  if (tasksCount > reservationsCount) {
    console.warn(`⚠️  [fetchTaskNewPlanning] WARNING: More tasks (${tasksCount}) than reservations (${reservationsCount})! This will cause individual API calls.`);
    console.warn(`    💡 Solution: Increase limit in reservationsService.getList() from 100 to ${Math.max(200, tasksCount)}`);
  }

  const staffRows = staffRes?.data || [];
  const staffById = Object.fromEntries(
    staffRows.map((s: Record<string, unknown>) => [String(s._id), { name: s.name as string }]),
  );

  const reservationsById = new Map<string, Reservation>();
  for (const res of reservationsRes?.data || []) {
    const id = resolveReservationId(res);
    if (id) reservationsById.set(id, res);
  }

  let tasks = (tasksRes?.data || []) as Record<string, unknown>[];
  if (params.ownerId) {
    tasks = tasks.filter(
      (t) => !t.ownerId || String(t.ownerId) === String(params.ownerId),
    );
  }
  tasks = tasks.filter((t) => {
    if (String(t.status) === 'cancelled') return false;
    const resId = t.reservationId ? String(t.reservationId) : '';
    const reservation = resId ? reservationsById.get(resId) : undefined;
    return taskInDateRange(t, params.startDate, params.endDate, reservation);
  });

  const tasksByReservation = new Map<string, PlanningTimelineItem[]>();
  const tasksByListingOnly = new Map<string, PlanningTimelineItem[]>();

  for (const task of tasks) {
    const resId = task.reservationId ? String(task.reservationId) : '';
    const reservation = resId ? reservationsById.get(resId) : undefined;
    const item = fulltaskToTimelineItem(task, staffById, reservation);
    const listingId = task.listingId ? String(task.listingId) : '';
    if (resId) {
      const key = `${listingId}::${resId}`;
      const arr = tasksByReservation.get(key) || [];
      arr.push(item);
      tasksByReservation.set(key, arr);
    } else if (listingId) {
      const arr = tasksByListingOnly.get(listingId) || [];
      arr.push(item);
      tasksByListingOnly.set(listingId, arr);
    }
  }

  let reservations = reservationsRes?.data || [];
  if (params.ownerId) {
    const ownerKey = String(params.ownerId);
    reservations = reservations.filter((r) => {
      const resOwner = String((r as Reservation & { ownerId?: unknown }).ownerId || '');
      return !resOwner || resOwner === ownerKey;
    });
  }
  reservations = reservations.filter((r) =>
    reservationOverlapsWindow(r, params.startDate, params.endDate),
  );

  const reservationsByListing = new Map<string, PlanningReservationRow[]>();
  const listingMeta = new Map<string, { listingName: string; city: string }>();
  const reservationKeysSeen = new Set<string>();

  for (const res of reservations) {
    const listingId = resolveListingId(res);
    if (!listingId) continue;

    if (!listingMeta.has(listingId)) {
      const label = reservationListingLabel(res);
      listingMeta.set(listingId, { listingName: label.name, city: label.city });
    }

    const reservationId = resolveReservationId(res);
    const key = `${listingId}::${reservationId}`;
    reservationKeysSeen.add(key);
    const timeline = tasksByReservation.get(key) || [];

    const row: PlanningReservationRow = {
      reservationId,
      guestName: res.guestName || 'Guest',
      arrivalDate: toIsoDate(res.arrivalDate),
      departureDate: toIsoDate(res.departureDate),
      status: mapReservationStatus(res.status),
      channelName: res.channelName || res.otaCode || 'direct',
      numberOfGuests: res.numberOfGuests ?? res.adults ?? 0,
      reservationNumber: res.reservationNumber || reservationId,
      timeline,
    };

    const list = reservationsByListing.get(listingId) || [];
    list.push(row);
    reservationsByListing.set(listingId, list);
  }

  // Réservations avec tâches mais hors filtre API initial (ex. pagination)
  const missingReservationIds = [];
  for (const [key, timeline] of tasksByReservation) {
    if (reservationKeysSeen.has(key)) continue;
    const [listingId, reservationId] = key.split('::');
    if (!listingId || !reservationId) continue;
    missingReservationIds.push(reservationId);
  }

  console.log(`⚠️  [fetchTaskNewPlanning] Found ${missingReservationIds.length} reservations with tasks but NOT in initial API response`);
  console.log(`    ℹ️  This will trigger ${missingReservationIds.length} individual getById() API calls (SLOW!)`);

  // ⚡ OPTIMISATION: Batch fetch des réservations manquantes en 1 seul appel
  if (missingReservationIds.length > 0) {
    const batchStart = performance.now();
    try {
      console.log(`🚀 [fetchTaskNewPlanning] Batch fetching ${missingReservationIds.length} reservations in 1 API call...`);
      const batchResult = await reservationsService.getBatch(missingReservationIds);
      const batchMs = performance.now() - batchStart;
      console.log(`✅ [fetchTaskNewPlanning] Batch fetch completed in ${batchMs.toFixed(0)}ms (vs ${(missingReservationIds.length * 3000).toFixed(0)}ms for individual calls)`);

      if (batchResult.success && batchResult.data) {
        for (const res of batchResult.data) {
          const resId = resolveReservationId(res);
          if (resId) {
            reservationsById.set(resId, res);
          }
        }
      }
    } catch (error) {
      console.error(`❌ [fetchTaskNewPlanning] Batch fetch failed:`, error);
      // Fallback to stub data from tasks
    }
  }

  // Créer les lignes de réservations pour les IDs manquants
  for (const [key, timeline] of tasksByReservation) {
    if (reservationKeysSeen.has(key)) continue;
    const [listingId, reservationId] = key.split('::');
    if (!listingId || !reservationId) continue;

    let guestName = 'Guest';
    let arrivalDate = params.startDate;
    let departureDate = params.endDate;
    let reservationNumber = reservationId;
    const firstTask = timeline[0]?.data as Record<string, unknown> | undefined;
    if (firstTask?.guestName) guestName = String(firstTask.guestName);

    // Utiliser les données du batch si disponibles
    const res = reservationsById.get(reservationId);
    if (res) {
      arrivalDate = toIsoDate(res.arrivalDate) || arrivalDate;
      departureDate = toIsoDate(res.departureDate) || departureDate;
      guestName = res.guestName || guestName;
      reservationNumber = res.reservationNumber || reservationNumber;
      if (!listingMeta.has(listingId)) {
        const label = reservationListingLabel(res);
        listingMeta.set(listingId, { listingName: label.name, city: label.city });
      }
    }

    const row: PlanningReservationRow = {
      reservationId,
      guestName,
      arrivalDate,
      departureDate,
      status: 'confirmed',
      reservationNumber,
      timeline,
    };
    const list = reservationsByListing.get(listingId) || [];
    list.push(row);
    reservationsByListing.set(listingId, list);
    reservationKeysSeen.add(key);
  }

  const listingIdsFromTasks = new Set<string>();
  tasksByListingOnly.forEach((_, listingId) => listingIdsFromTasks.add(listingId));
  tasksByReservation.forEach((_, key) => {
    const listingId = key.split('::')[0];
    if (listingId) listingIdsFromTasks.add(listingId);
  });
  for (const listingId of reservationsByListing.keys()) {
    listingIdsFromTasks.add(listingId);
  }

  const listings: PlanningListingRow[] = [...listingIdsFromTasks].map((listingId) => {
    const reservations = reservationsByListing.get(listingId) || [];
    const meta = listingMeta.get(listingId);
    const orphanTasks = tasksByListingOnly.get(listingId) || [];
    if (orphanTasks.length > 0 && reservations.length === 0) {
      return {
        listingId,
        listingName: meta?.listingName,
        city: meta?.city,
        reservations: [
          {
            reservationId: `orphan-${listingId}`,
            guestName: '—',
            arrivalDate: params.startDate,
            departureDate: params.endDate,
            status: 'confirmed',
            timeline: orphanTasks,
          },
        ],
      };
    }
    return {
      listingId,
      listingName: meta?.listingName,
      city: meta?.city,
      reservations,
    };
  });

  return {
    success: true,
    data: { listings },
  };
}

/** @deprecated Utiliser fetchTaskNewPlanning */
export const fetchPlanningWithFulltaskTasks = fetchTaskNewPlanning;
