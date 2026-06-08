import listingsService from './listingsService';
import * as fulltaskApi from './fulltaskApi';
import reservationsService from './reservationsService';
import { labelForTaskTypeId } from '../features/taskHub/staff-design/fulltaskTaskTypes';
import { LEGACY_TO_FULLTASK_STATUS, fullTaskToListItem } from '../utils/fulltaskMappers';
import type { ReservationMetaLike } from '../utils/fulltaskMappers';
import type { TaskFulltaskUpdatePayload, TaskListItem, TasksSearchParams } from '../types/tasks.types';

export interface TasksAuthLikeUser {
  id?: string;
  _id?: string;
  role?: string;
  ownerId?: string;
  theOwnerId?: string;
}

export function resolveTasksUserScope(user: TasksAuthLikeUser | null | undefined) {
  const role = String(user?.role || '').trim();
  if (import.meta.env.VITE_DISABLE_AUTH === 'true') {
    return { ownerId: undefined, canAccessAllOwners: true, role: role || 'dev' };
  }
  const adminRoles = ['SuperAdmin', 'Admin', 'superadmin', 'admin'];
  if (adminRoles.includes(role)) {
    return { ownerId: undefined, canAccessAllOwners: true, role };
  }
  const ownerId = user?.ownerId || user?.theOwnerId || user?.id || user?._id;
  return {
    ownerId: ownerId ? String(ownerId) : undefined,
    canAccessAllOwners: false,
    role,
  };
}

class FulltaskTasksService {
  private buildStaffById(rows: Record<string, unknown>[]) {
    return Object.fromEntries(rows.map((s) => [String(s._id), s]));
  }

  private buildListingById(rows: { id?: string; _id?: string; name?: string }[]) {
    return Object.fromEntries(rows.map((l) => [String(l._id || l.id), l.name || 'Sans nom']));
  }

  /** Map une tâche API → ligne liste (réutilise staff/listings en cache si fournis). */
  async mapRawTaskToListItem(
    raw: Record<string, unknown>,
    caches?: {
      staffById?: Record<string, Record<string, unknown>>;
      listingById?: Record<string, string>;
    },
  ): Promise<TaskListItem> {
    let staffById = caches?.staffById;
    let listingById = caches?.listingById;
    if (!staffById || !listingById) {
      const [staffRes, listingRows] = await Promise.all([
        fulltaskApi.listStaff(),
        this.getListings(),
      ]);
      staffById = staffById ?? this.buildStaffById(staffRes?.data || []);
      listingById = listingById ?? this.buildListingById(listingRows);
    }

    const resId = raw.reservationId ? String(raw.reservationId) : '';
    let reservationMeta: ReservationMetaLike | undefined;
    if (resId) {
      try {
        const res = await reservationsService.getById(resId);
        reservationMeta = this.reservationToMeta(res);
      } catch {
        /* réservation introuvable */
      }
    }

    return fullTaskToListItem(raw, staffById, listingById, reservationMeta);
  }

  async fetchTaskListItem(
    taskId: string,
    caches?: {
      staffById?: Record<string, Record<string, unknown>>;
      listingById?: Record<string, string>;
    },
  ): Promise<TaskListItem> {
    const raw = await this.getTaskById(taskId);
    return this.mapRawTaskToListItem(raw, caches);
  }

  async getTasks(params: TasksSearchParams) {
    console.log('🔍 [getTasks] START - Fetching tasks, staff, and listings in parallel');
    const startTime = performance.now();

    const tasksPromise = fulltaskApi.listTasks({
      listingId: params.listingIds?.length === 1 ? params.listingIds[0] : undefined,
      type: params.subTypes?.length === 1 ? params.subTypes[0] : undefined,
    }).then(res => {
      console.log(`✅ [getTasks] listTasks completed in ${(performance.now() - startTime).toFixed(0)}ms`);
      return res;
    });

    const staffPromise = fulltaskApi.listStaff().then(res => {
      console.log(`✅ [getTasks] listStaff completed in ${(performance.now() - startTime).toFixed(0)}ms`);
      return res;
    });

    const listingsPromise = this.getListings().then(res => {
      console.log(`✅ [getTasks] getListings completed in ${(performance.now() - startTime).toFixed(0)}ms`);
      return res;
    });

    const [tasksRes, staffRes, listingRows] = await Promise.all([
      tasksPromise,
      staffPromise,
      listingsPromise,
    ]);

    console.log(`⏱️  [getTasks] All 3 API calls completed in ${(performance.now() - startTime).toFixed(0)}ms`);

    const staffRows = staffRes?.data || [];
    const staffById = Object.fromEntries(
      staffRows.map((s: Record<string, unknown>) => [String(s._id), s]),
    );
    const listingById = Object.fromEntries(
      listingRows.map((l) => [String(l._id), l.name]),
    );

    const rawTasks = (tasksRes?.data || []) as Record<string, unknown>[];
    console.log(`🔄 [getTasks] Processing ${rawTasks.length} tasks, loading reservation metadata...`);

    const resStartTime = performance.now();
    const reservationMetaById = await this.loadReservationMetaForTasks(rawTasks);
    console.log(`🔄 [getTasks] Loaded ${reservationMetaById.size} reservations in ${(performance.now() - resStartTime).toFixed(0)}ms`);

    let rows = rawTasks.map((t: Record<string, unknown>) => {
      const resId = t.reservationId ? String(t.reservationId) : '';
      const payload = (t.payload || {}) as Record<string, unknown>;
      const fromPayload: ReservationMetaLike | undefined =
        payload.arrivalDate || payload.checkIn
          ? {
              arrivalDate: String(payload.arrivalDate || payload.checkIn),
              departureDate: String(payload.departureDate || payload.checkOut || ''),
            }
          : undefined;
      const reservationMeta =
        (resId ? reservationMetaById.get(resId) : undefined) || fromPayload;
      return fullTaskToListItem(t, staffById, listingById, reservationMeta);
    });

    if (params.ownerId) {
      rows = rows.filter((t) => !t.ownerId || String(t.ownerId) === String(params.ownerId));
    }
    if (params.listingIds?.length) {
      const set = new Set(params.listingIds.map(String));
      rows = rows.filter((t) => set.has(String(t.listingId)));
    }
    if (params.subTypes?.length) {
      const set = new Set(params.subTypes);
      rows = rows.filter((t) => set.has(t.subType));
    }
    if (params.statuses?.length) {
      const set = new Set(params.statuses);
      rows = rows.filter((t) => set.has(t.taskStatus));
    }
    if (params.sources?.length) {
      const want = new Set(params.sources.map((s) => s.toLowerCase()));
      rows = rows.filter((t) => {
        const raw = String(t.source || '').toLowerCase();
        const norm = raw === 'orchestrator' || raw === 'orchestration' ? 'orchestrator' : 'manual';
        return want.has(norm) || want.has(raw);
      });
    }
    if (params.searchTerm?.trim()) {
      const q = params.searchTerm.trim().toLowerCase();
      rows = rows.filter((t) => {
        const typeLabel = t.subType ? labelForTaskTypeId(String(t.subType)).toLowerCase() : '';
        return (
          String(t.itemNumber || '').toLowerCase().includes(q) ||
          String(t.guestName || '').toLowerCase().includes(q) ||
          String(t.listingName || '').toLowerCase().includes(q) ||
          String(t.guestPhone || '').toLowerCase().includes(q) ||
          String(t.staffName || '').toLowerCase().includes(q) ||
          typeLabel.includes(q)
        );
      });
    }

    const sortField = params.sortField || 'createdAt';
    const dir = params.sortDirection === 'desc' ? -1 : 1;
    rows.sort((a, b) => {
      const rowA = a as Record<string, unknown>;
      const rowB = b as Record<string, unknown>;
      if (sortField === 'createdAt' || sortField === 'startDate') {
        const at = rowA[sortField] ? new Date(String(rowA[sortField])).getTime() : 0;
        const bt = rowB[sortField] ? new Date(String(rowB[sortField])).getTime() : 0;
        if (at !== bt) return (at < bt ? -1 : 1) * dir;
        return 0;
      }
      const av = String(rowA[sortField] ?? '').toLowerCase();
      const bv = String(rowB[sortField] ?? '').toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });

    const page = params.page ?? 0;
    const limit = params.limit ?? 100;
    const start = page * limit;
    const slice = rows.slice(start, start + limit);

    return {
      success: true,
      tasks: slice,
      data: slice,
      pagination: {
        page,
        limit,
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / limit)),
      },
    };
  }

  async getTaskById(taskId: string) {
    const res = await fulltaskApi.getTask(taskId);
    if (res?.success === false) throw new Error(res?.error || 'Tâche introuvable');
    return res?.data as Record<string, unknown>;
  }

  async updateTask(
    taskId: string,
    body: TaskFulltaskUpdatePayload,
    caches?: {
      staffById?: Record<string, Record<string, unknown>>;
      listingById?: Record<string, string>;
    },
  ): Promise<TaskListItem | null> {
    const { status: legacyStatus, ...fields } = body;
    let latestRaw: Record<string, unknown> | null = null;

    if (legacyStatus) {
      latestRaw = await this.applyLegacyStatusChange(taskId, legacyStatus);
    }

    const fieldPatch: Record<string, unknown> = {};
    if (fields.requestedAt !== undefined) fieldPatch.requestedAt = fields.requestedAt;
    if (fields.scheduledAt !== undefined) fieldPatch.scheduledAt = fields.scheduledAt;
    if (fields.scheduledDate !== undefined) fieldPatch.scheduledDate = fields.scheduledDate;
    if (fields.requestNote !== undefined) fieldPatch.requestNote = fields.requestNote;
    if (fields.executionNote !== undefined) fieldPatch.executionNote = fields.executionNote;
    if (fields.priority !== undefined) fieldPatch.priority = fields.priority;

    if (Object.keys(fieldPatch).length > 0) {
      const res = await fulltaskApi.patchTask(taskId, fieldPatch);
      if (res?.success === false) throw new Error(res?.error || 'Mise à jour refusée');
      if (res?.data) latestRaw = res.data as Record<string, unknown>;
    }

    if (!latestRaw) return null;
    return this.mapRawTaskToListItem(latestRaw, caches);
  }

  private async applyLegacyStatusChange(
    taskId: string,
    legacyStatus: string,
  ): Promise<Record<string, unknown>> {
    if (legacyStatus === 'ACCEPTED') {
      try {
        const res = await fulltaskApi.acceptTask(taskId);
        if (res?.success === false) throw new Error(res?.error || 'Acceptation refusée');
        if (res?.data) return res.data as Record<string, unknown>;
      } catch {
        /* hors pending_partner : forcer confirmed */
      }
    }

    const fullStatus = LEGACY_TO_FULLTASK_STATUS[legacyStatus] || legacyStatus;
    const res = await fulltaskApi.patchTaskStatus(taskId, fullStatus);
    if (res?.success === false) throw new Error(res?.error || 'Statut refusé');
    if (!res?.data) throw new Error('Réponse statut vide');
    return res.data as Record<string, unknown>;
  }

  async updateTaskStatus(
    taskId: string,
    legacyStatus: string,
    caches?: {
      staffById?: Record<string, Record<string, unknown>>;
      listingById?: Record<string, string>;
    },
  ): Promise<TaskListItem | null> {
    const raw = await this.applyLegacyStatusChange(taskId, legacyStatus);
    return this.mapRawTaskToListItem(raw, caches);
  }

  async deleteTask(taskId: string) {
    const res = await fulltaskApi.deleteTask(taskId);
    if (res?.success === false) throw new Error(res?.error || 'Suppression impossible');
  }

  async getStaff(params: { ownerId?: string; limit?: number } = {}) {
    const res = await fulltaskApi.listStaff();
    let rows = res?.data || [];
    if (params.ownerId) {
      rows = rows.filter(
        (s: Record<string, unknown>) => !s.ownerId || String(s.ownerId) === String(params.ownerId),
      );
    }
    const limit = params.limit ?? 200;
    return {
      staff: rows.slice(0, limit).map((s: Record<string, unknown>) => ({
        _id: s._id,
        staffCode: String(s._id),
        name: s.name,
        phone: s.phone,
      })),
    };
  }

  async getListings() {
    console.log('📋 [getListings] START - Fetching with limit=100, compact=true');
    const startTime = performance.now();

    const response = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      limit: 100, // ⚡ Réduit de 1000 → 100 (suffisant pour les filtres)
      page: 0,
      compact: true, // ⚡ Mode compact: uniquement {_id, name, city}
    });

    const elapsed = (performance.now() - startTime).toFixed(0);
    const items = response?.data?.items ?? [];
    console.log(`📋 [getListings] Received ${items.length} listings in ${elapsed}ms`);

    return items.map((l) => {
      const id = (l as { id?: string; _id?: string }).id || (l as { _id?: string })._id;
      return {
        id: String(id),
        _id: String(id),
        name: (l as { name?: string }).name || 'Sans nom',
        city: (l as { city?: string }).city,
      };
    });
  }

  /** Dates séjour pour afficher le jour prévu quand scheduledDate n’est pas encore fixé. */
  private reservationToMeta(res: {
    arrivalDate?: Date | string;
    departureDate?: Date | string;
    guestCountry?: string;
    channelName?: string;
    otaCode?: string;
    reservationNumber?: string;
    adults?: number;
    checkInTime?: string | number | null;
    checkOutTime?: string | number | null;
    actualArrivalTime?: Date | string | null;
    actualDepartureTime?: Date | string | null;
    confirmedCheckInTime?: boolean;
    confirmedCheckOutTime?: boolean;
    guestRegistration?: {
      nbre_guest_registered?: number;
      nbre_guest_to_register?: number;
      members?: Array<Record<string, unknown>>;
    };
  }): ReservationMetaLike {
    return {
      arrivalDate: res.arrivalDate,
      departureDate: res.departureDate,
      guestCountry: res.guestCountry ?? null,
      channelName: res.channelName ?? res.otaCode ?? null,
      reservationNumber: res.reservationNumber ?? null,
      adults: res.adults,
      checkInTime: res.checkInTime ?? null,
      checkOutTime: res.checkOutTime ?? null,
      actualArrivalTime: res.actualArrivalTime != null ? String(res.actualArrivalTime) : null,
      actualDepartureTime: res.actualDepartureTime != null ? String(res.actualDepartureTime) : null,
      confirmedCheckInTime: res.confirmedCheckInTime,
      confirmedCheckOutTime: res.confirmedCheckOutTime,
      guestRegistration: res.guestRegistration
        ? {
            nbre_guest_registered: res.guestRegistration.nbre_guest_registered,
            nbre_guest_to_register: res.guestRegistration.nbre_guest_to_register,
            members: res.guestRegistration.members,
          }
        : undefined,
    };
  }

  private async loadReservationMetaForTasks(
    tasks: Record<string, unknown>[],
  ): Promise<Map<string, ReservationMetaLike>> {
    const map = new Map<string, ReservationMetaLike>();
    const ids = [
      ...new Set(
        tasks.filter((t) => t.reservationId).map((t) => String(t.reservationId)),
      ),
    ];
    if (ids.length === 0) return map;

    // ⚠️ TEMPORAIRE: Désactivé pour tester performance (3-6 secondes de chargement!)
    // TODO: Créer un endpoint batch GET /reservations?ids=id1,id2,id3 pour charger en 1 seul appel
    console.warn(`⚠️  [loadReservationMetaForTasks] SKIPPING ${ids.length} reservations (performance optimization)`);
    return map;

    // Code original (TRÈS LENT - 24 appels HTTP × 150ms = 3600ms):
    // await Promise.all(
    //   ids.slice(0, 60).map(async (id) => {
    //     try {
    //       const res = await reservationsService.getById(id);
    //       map.set(id, this.reservationToMeta(res));
    //     } catch {
    //       /* réservation introuvable */
    //     }
    //   }),
    // );
    // return map;
  }

}

export default new FulltaskTasksService();
