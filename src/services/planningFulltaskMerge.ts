import * as fulltaskApi from './fulltaskApi';
import reservationsService from './reservationsService';
import type { Reservation } from '../types/reservations.types';
import { mapFulltaskStatusToLegacy } from '../utils/fulltaskMappers';
import {
  inferTaskPlannedDay,
  inferTaskPlannedIso,
} from '../utils/inferTaskPlannedDate';
import { resolveReservationListingId, reservationListingLabel } from '../utils/planningListingMatch';
import type { TaskType, TaskUrgencyInfo } from '../components/calendar-views/_shared';

export interface PlanningTimelineItem {
  type: TaskType;
  category?: string;
  scheduledFor: string;
  isTask?: boolean;
  staffId?: string | null;
  staffName?: string | null;
  status?: string;
  cleaning_type?: string;
  priority?: TaskUrgencyInfo;
  data?: Record<string, unknown>;
}

export interface PlanningReservationRow {
  reservationId: string;
  guestName: string;
  arrivalDate: string;
  departureDate: string;
  /** Heure d'arrivée / départ voyageur (HH:mm) — les tâches fulltask étant
   *  planifiées à la journée, c'est la source d'heure des vues staff. */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status: string;
  channelName?: string;
  numberOfGuests?: number;
  reservationNumber?: string;
  roomTypeName?: string;
  roomTypeId?: string;
  roomId?: string;
  roomName?: string;
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
  if (s.includes('pending')) return 'pending';
  if (s.includes('start') || s === 'inside' || s === 'arrived') return 'started';
  if (s.includes('confirm')) return 'confirmed';
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

  const stayType = fulltaskTypeToStayTaskType(ftType);
  const cleaningType =
    stayType === 'cleaning'
      ? String(task.cleaning_type || task.cleaningType || ftType || '')
      : undefined;

  const rawPriority = task.priority as TaskUrgencyInfo | undefined;
  const priority =
    rawPriority &&
    (rawPriority.urgency === 'red' ||
      rawPriority.urgency === 'orange' ||
      rawPriority.urgency === 'green')
      ? {
          urgency: rawPriority.urgency,
          reason: rawPriority.reason,
          dueAt: rawPriority.dueAt,
        }
      : undefined;

  return {
    type: stayType,
    category: ftType,
    scheduledFor: scheduled,
    isTask: true,
    staffId: assignedTo,
    staffName: staff?.name ? String(staff.name) : null,
    status: legacyStatus,
    cleaning_type: cleaningType,
    priority,
    data: {
      taskId: task._id,
      taskCode: task.taskCode,
      fulltask: true,
      ...task,
      priority,
    },
  };
}

/**
 * Résas chargées pour la fenêtre du planning. Le backend ne plafonne pas
 * (paginate._limit = parseInt brut) ; 200 couvre largement 30 jours de grille.
 */
const RESERVATIONS_WINDOW_LIMIT = 200;

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
    /* 200 : au-delà de ~100 résas sur la fenêtre, les tâches référençaient des
       résas hors page → une requête unitaire par résa manquante (cf. batch plus bas).
       Le backend ne plafonne pas (paginate._limit = parseInt brut). */
    limit: RESERVATIONS_WINDOW_LIMIT,
    status: 'Confirmed,Pending,Started,Inside',
    dateType: 'arrival_or_departure',
    startDate: params.startDate,
    endDate: params.endDate,
    filterOwnerId: params.ownerId,
  }).then(res => {
    console.log(`✅ [fetchTaskNewPlanning] getList (reservations) completed in ${(performance.now() - startTime).toFixed(0)}ms - ${res?.data?.length || 0} items`);
    return res;
  });

  /* ownerId côté API : évite la troncature globale à 500 tâches (autres PM)
     qui faisait disparaître les tâches Majorelle sur /tasks/team. */
  const tasksPromise = fulltaskApi
    .listTasks({
      audience: 'STAFF',
      ...(params.ownerId ? { ownerId: params.ownerId } : {}),
      limit: 2000,
    })
    .then((res) => {
      console.log(
        `✅ [fetchTaskNewPlanning] listTasks completed in ${(performance.now() - startTime).toFixed(0)}ms - ${res?.data?.length || 0} items`,
      );
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

  const tasksCount = tasksRes?.data?.length || 0;
  const reservationsCount = reservationsRes?.data?.length || 0;
  console.log(`📊 [fetchTaskNewPlanning] Loaded ${reservationsCount} reservations and ${tasksCount} tasks`);
  /* ⚠️ Ne crier QUE sur une vraie troncature : getList a renvoyé exactement la
     limite demandée → il reste des résas non chargées. Avoir plus de tâches que
     de résas est normal (plusieurs tâches par séjour, et séjours qui débordent
     de la fenêtre — ces derniers sont récupérés par le batch groupé plus bas). */
  if (reservationsCount >= RESERVATIONS_WINDOW_LIMIT) {
    console.warn(
      `⚠️  [fetchTaskNewPlanning] Fenêtre tronquée : ${reservationsCount} résas = limite (${RESERVATIONS_WINDOW_LIMIT}).`,
    );
    console.warn(`    💡 Augmenter RESERVATIONS_WINDOW_LIMIT dans planningFulltaskMerge.ts.`);
  }

  const staffRows = staffRes?.data || [];
  const staffById = Object.fromEntries(
    staffRows.map((s: Record<string, unknown>) => [String(s._id), { name: s.name as string }]),
  );

  const reservationsById = new Map<string, Reservation>();
  const reservationsByAnyKey = new Map<string, Reservation>();
  for (const res of reservationsRes?.data || []) {
    const id = resolveReservationId(res);
    if (id) {
      reservationsById.set(id, res);
      reservationsByAnyKey.set(id, res);
    }
    const num = String(res.reservationNumber || '').trim();
    if (num) reservationsByAnyKey.set(num, res);
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
    const reservation = resId ? reservationsByAnyKey.get(resId) : undefined;
    return taskInDateRange(t, params.startDate, params.endDate, reservation);
  });

  const tasksByReservation = new Map<string, PlanningTimelineItem[]>();
  const tasksByListingOnly = new Map<string, PlanningTimelineItem[]>();

  const pushTimeline = (listingId: string, resKey: string, item: PlanningTimelineItem) => {
    if (!listingId || !resKey) return;
    const key = `${listingId}::${resKey}`;
    const arr = tasksByReservation.get(key) || [];
    arr.push(item);
    tasksByReservation.set(key, arr);
  };

  for (const task of tasks) {
    const resRef = task.reservationId ? String(task.reservationId) : '';
    const reservation = resRef ? reservationsByAnyKey.get(resRef) : undefined;
    const item = fulltaskToTimelineItem(task, staffById, reservation);
    const listingId =
      (task.listingId ? String(task.listingId) : '') ||
      (reservation ? resolveListingId(reservation) || '' : '');
    if (resRef) {
      pushTimeline(listingId, resRef, item);
      if (reservation) {
        const canonical = resolveReservationId(reservation);
        const num = String(reservation.reservationNumber || '').trim();
        if (canonical && canonical !== resRef) pushTimeline(listingId, canonical, item);
        if (num && num !== resRef && num !== canonical) pushTimeline(listingId, num, item);
      }
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
    const resaNum = String(res.reservationNumber || '').trim();
    const key = `${listingId}::${reservationId}`;
    reservationKeysSeen.add(key);
    if (resaNum) reservationKeysSeen.add(`${listingId}::${resaNum}`);

    // Rattache les tâches même si task.listingId ≠ listing résa (clés croisées).
    const timelineMap = new Map<string, PlanningTimelineItem>();
    for (const [tKey, items] of tasksByReservation) {
      const resKey = tKey.split('::')[1] || '';
      if (resKey !== reservationId && !(resaNum && resKey === resaNum)) continue;
      for (const item of items) {
        const tid = String(
          (item.data as { taskId?: unknown } | undefined)?.taskId ||
            `${item.type}-${item.scheduledFor}-${item.staffId || ''}`,
        );
        if (!timelineMap.has(tid)) timelineMap.set(tid, item);
      }
      reservationKeysSeen.add(tKey);
    }
    const timeline = [...timelineMap.values()];

    const row: PlanningReservationRow = {
      reservationId,
      guestName: res.guestName || 'Guest',
      arrivalDate: toIsoDate(res.arrivalDate),
      departureDate: toIsoDate(res.departureDate),
      checkInTime: res.checkInTime ?? null,
      checkOutTime: res.checkOutTime ?? null,
      status: mapReservationStatus(res.status),
      channelName: res.channelName || res.otaCode || 'direct',
      numberOfGuests: res.numberOfGuests ?? res.adults ?? 0,
      reservationNumber: res.reservationNumber || reservationId,
      roomTypeName: (() => {
        const n = String(res.roomTypeName || res.roomTypes?.roomTypeName || '').trim();
        return n || undefined;
      })(),
      roomTypeId: (() => {
        const id = String(res.roomTypeId || '').trim();
        return id || undefined;
      })(),
      roomId: (() => {
        const id = String((res as { roomId?: string }).roomId || '').trim();
        return id || undefined;
      })(),
      roomName: (() => {
        const n = String((res as { roomName?: string }).roomName || '').trim();
        return n || undefined;
      })(),
      timeline,
    };

    const list = reservationsByListing.get(listingId) || [];
    list.push(row);
    reservationsByListing.set(listingId, list);
  }

  // Réservations avec tâches mais hors filtre API initial (ex. pagination)
  const missingReservationIds: string[] = [];
  for (const [key] of tasksByReservation) {
    if (reservationKeysSeen.has(key)) continue;
    const [, reservationId] = key.split('::');
    if (!reservationId) continue;
    // Déjà couvert via numéro / id sur une autre clé listing ?
    if ([...reservationKeysSeen].some((k) => k.endsWith(`::${reservationId}`))) continue;
    missingReservationIds.push(reservationId);
  }

  const uniqueMissing = [...new Set(missingReservationIds)];
  const isMongoId = (id: string) => /^[a-f0-9]{24}$/i.test(id);
  const missingMongoIds = uniqueMissing.filter(isMongoId);
  const missingOtherIds = uniqueMissing.filter((id) => !isMongoId(id));

  if (uniqueMissing.length > 0) {
    console.log(`⚠️  [fetchTaskNewPlanning] ${uniqueMissing.length} résa(s) avec tâches hors getList`, {
      mongoIds: missingMongoIds.length,
      codes: missingOtherIds.length,
    });
  }

  // Batch uniquement les ObjectId Mongo — les SJ-* cassent /batch (500).
  if (missingMongoIds.length > 0) {
    const batchStart = performance.now();
    try {
      console.log(`🚀 [fetchTaskNewPlanning] Batch fetching ${missingMongoIds.length} reservations…`);
      const batchResult = await reservationsService.getBatch(missingMongoIds, { silent: true });
      const batchMs = performance.now() - batchStart;
      console.log(`✅ [fetchTaskNewPlanning] Batch fetch completed in ${batchMs.toFixed(0)}ms`);

      if (batchResult.success && batchResult.data) {
        for (const res of batchResult.data) {
          const resId = resolveReservationId(res);
          if (resId) {
            reservationsById.set(resId, res);
          }
          const num = String(res.reservationNumber || '').trim();
          if (num) reservationsByAnyKey.set(num, res);
        }
      }
    } catch (error) {
      console.warn(`[fetchTaskNewPlanning] Batch fetch skipped/failed — stubs from tasks`, error);
    }
  }

  // Créer les lignes de réservations pour les IDs encore manquants (stubs / batch)
  for (const [key, timeline] of tasksByReservation) {
    if (reservationKeysSeen.has(key)) continue;
    const [listingId, reservationId] = key.split('::');
    if (!listingId || !reservationId) continue;

    let guestName = 'Guest';
    let arrivalDate = params.startDate;
    let departureDate = params.endDate;
    let reservationNumber = reservationId;
    let checkInTime: string | null = null;
    let checkOutTime: string | null = null;
    let channelName: string | undefined;
    let numberOfGuests = 0;
    let roomTypeName: string | undefined;
    let roomTypeId: string | undefined;
    let roomId: string | undefined;
    let roomName: string | undefined;
    const firstTask = timeline[0]?.data as Record<string, unknown> | undefined;
    if (firstTask?.guestName) guestName = String(firstTask.guestName);

    const res =
      reservationsById.get(reservationId) ||
      reservationsByAnyKey.get(reservationId);
    if (res) {
      arrivalDate = toIsoDate(res.arrivalDate) || arrivalDate;
      departureDate = toIsoDate(res.departureDate) || departureDate;
      guestName = res.guestName || guestName;
      reservationNumber = res.reservationNumber || reservationNumber;
      checkInTime = res.checkInTime ?? null;
      checkOutTime = res.checkOutTime ?? null;
      channelName = res.channelName || res.otaCode || 'direct';
      numberOfGuests = res.numberOfGuests ?? res.adults ?? 0;
      const rt = String(res.roomTypeName || res.roomTypes?.roomTypeName || '').trim();
      roomTypeName = rt || undefined;
      roomTypeId = String(res.roomTypeId || '').trim() || undefined;
      roomId = String((res as { roomId?: string }).roomId || '').trim() || undefined;
      roomName = String((res as { roomName?: string }).roomName || '').trim() || undefined;
      const realListingId = resolveListingId(res) || listingId;
      if (!listingMeta.has(realListingId)) {
        const label = reservationListingLabel(res);
        listingMeta.set(realListingId, { listingName: label.name, city: label.city });
      }
      // Fusionner sur la vraie listing si différente
      const targetListing = realListingId;
      const canonicalId = resolveReservationId(res);
      const existingList = reservationsByListing.get(targetListing) || [];
      const existing = existingList.find(
        (r) =>
          r.reservationId === canonicalId ||
          r.reservationNumber === reservationNumber ||
          r.reservationId === reservationId,
      );
      if (existing) {
        if (!existing.roomTypeName && roomTypeName) existing.roomTypeName = roomTypeName;
        const seen = new Set(
          existing.timeline.map((t) =>
            String((t.data as { taskId?: unknown } | undefined)?.taskId || `${t.type}-${t.scheduledFor}`),
          ),
        );
        for (const item of timeline) {
          const tid = String(
            (item.data as { taskId?: unknown } | undefined)?.taskId ||
              `${item.type}-${item.scheduledFor}`,
          );
          if (!seen.has(tid)) existing.timeline.push(item);
        }
        reservationKeysSeen.add(key);
        continue;
      }
      const row: PlanningReservationRow = {
        reservationId: canonicalId,
        guestName,
        arrivalDate,
        departureDate,
        checkInTime,
        checkOutTime,
        status: mapReservationStatus(res.status),
        channelName,
        numberOfGuests,
        reservationNumber,
        roomTypeName,
        roomTypeId,
        roomId,
        roomName,
        timeline,
      };
      existingList.push(row);
      reservationsByListing.set(targetListing, existingList);
      reservationKeysSeen.add(key);
      reservationKeysSeen.add(`${targetListing}::${canonicalId}`);
      if (reservationNumber) reservationKeysSeen.add(`${targetListing}::${reservationNumber}`);
      continue;
    }

    const row: PlanningReservationRow = {
      reservationId,
      guestName,
      arrivalDate,
      departureDate,
      checkInTime,
      checkOutTime,
      status: 'confirmed',
      reservationNumber,
      roomTypeName,
      roomTypeId,
      roomId,
      roomName,
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
