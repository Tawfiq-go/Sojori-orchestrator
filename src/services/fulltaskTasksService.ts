import listingsService from './listingsService';
import * as fulltaskApi from './fulltaskApi';
import reservationsService from './reservationsService';
import { LEGACY_TO_FULLTASK_STATUS, fullTaskToListItem } from '../utils/fulltaskMappers';
import type { ReservationMetaLike } from '../utils/fulltaskMappers';
import type { TaskFulltaskUpdatePayload, TaskListItem, TasksSearchParams } from '../types/tasks.types';
import { toLegacyAuthUser } from '../utils/legacyAuthUser';
import {
  canSelectOwnerInAdminFilter,
  getPropertyOwnerScopeId,
} from '../utils/taskScope.utils';

export interface TasksAuthLikeUser {
  id?: string;
  _id?: string;
  role?: string;
  ownerId?: string;
  theOwnerId?: string;
}

export function resolveTasksUserScope(user: TasksAuthLikeUser | null | undefined) {
  const legacy = toLegacyAuthUser(user as Parameters<typeof toLegacyAuthUser>[0]);
  const role = String(legacy?.role || user?.role || '').trim();
  // Dev sans session → admin template ; avec session Owner/Worker → scope prod
  if (import.meta.env.VITE_DISABLE_AUTH === 'true' && !legacy) {
    return { ownerId: undefined, canAccessAllOwners: true, role: 'SuperAdmin' };
  }
  if (canSelectOwnerInAdminFilter(legacy)) {
    return { ownerId: undefined, canAccessAllOwners: true, role };
  }
  // Owner → compte _id ; Worker/Landlord → ownerId employeur (pas user.ownerId en premier pour Owner)
  const ownerId = getPropertyOwnerScopeId(legacy);
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

  /** Legacy UI statuses → statuts Mongo srv-fulltask (filtre search). */
  private legacyStatusesToFulltask(statuses?: string[]): string[] | undefined {
    if (!statuses?.length) return undefined;
    const set = new Set<string>();
    for (const s of statuses) {
      if (s === 'CREATED') {
        set.add('new');
        set.add('waiting_guest');
        set.add('pending_partner');
      } else if (s === 'ASSIGNED') {
        set.add('pending_partner');
        set.add('new');
        set.add('confirmed');
      } else if (s === 'ACCEPTED') {
        set.add('confirmed');
      } else if (s === 'IN_PROGRESS') {
        set.add('doing');
      } else if (s === 'COMPLETED') {
        set.add('done');
      } else if (s === 'CANCELLED_ADMIN' || s === 'CANCELLED_CUSTOMER') {
        set.add('cancelled');
        set.add('rejected');
      } else {
        const mapped = LEGACY_TO_FULLTASK_STATUS[s];
        if (mapped) set.add(mapped);
      }
    }
    return [...set];
  }

  async getTasks(params: TasksSearchParams) {
    const startTime = performance.now();

    const isArchivedParam =
      params.isArchived === 'all'
        ? 'all'
        : params.isArchived === true
          ? true
          : false;

    const hasStaffCache = Boolean(params.staffByIdCache && Object.keys(params.staffByIdCache).length);
    const hasListingCache = Boolean(
      params.listingByIdCache && Object.keys(params.listingByIdCache).length,
    );

    const page = params.page ?? 0;
    const limit = params.limit ?? 100;
    const sortField = params.sortField || 'updatedAt';
    const sortDirection = params.sortDirection || 'desc';
    const ftStatuses = this.legacyStatusesToFulltask(params.statuses);

    // Tri + pagination Mongo via /tasks/search (pas de tri limité à la page client).
    const tasksPromise = fulltaskApi.searchTasks({
      ownerId: params.ownerId,
      audience: params.audience ?? 'STAFF',
      page,
      limit,
      listingIds: params.listingIds?.length ? params.listingIds.join(',') : undefined,
      itemTypes: params.subTypes?.length ? params.subTypes.join(',') : undefined,
      statuses: ftStatuses?.length ? ftStatuses.join(',') : undefined,
      searchTerm: params.searchTerm?.trim() || undefined,
      sortField,
      sortDirection,
      isArchived: isArchivedParam,
      dateType: params.dateType,
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
    });

    // Staff / listings : 1 seul fetch (page ne doit plus les rappeler en parallèle).
    const staffPromise = hasStaffCache
      ? Promise.resolve(null)
      : fulltaskApi.listStaff();
    const listingsPromise = hasListingCache
      ? Promise.resolve(null)
      : this.getListings({ filterOwnerId: params.filterOwnerId });

    const [tasksRes, staffRes, listingRows] = await Promise.all([
      tasksPromise,
      staffPromise,
      listingsPromise,
    ]);

    let staffRows: Record<string, unknown>[] = [];
    let staffById: Record<string, Record<string, unknown>>;
    if (hasStaffCache && params.staffByIdCache) {
      staffById = params.staffByIdCache;
    } else {
      staffRows = staffRes?.data || [];
      if (params.ownerId) {
        staffRows = staffRows.filter(
          (s) => !s.ownerId || String(s.ownerId) === String(params.ownerId),
        );
      }
      staffById = Object.fromEntries(staffRows.map((s) => [String(s._id), s]));
    }

    let listingById: Record<string, string>;
    let listingOptions: Array<{ id: string; _id: string; name: string; city?: string }> = [];
    if (hasListingCache && params.listingByIdCache) {
      listingById = params.listingByIdCache;
    } else {
      listingOptions = listingRows || [];
      listingById = Object.fromEntries(listingOptions.map((l) => [String(l._id), l.name]));
    }

    const searchPayload = (tasksRes?.data || tasksRes || {}) as {
      tasks?: Record<string, unknown>[];
      pagination?: { page: number; limit: number; total: number; totalPages: number };
    };
    const rawTasks = (searchPayload.tasks || []) as Record<string, unknown>[];

    // Enrichit staffById depuis populate search (_assignedStaff).
    for (const t of rawTasks) {
      const pop = t._assignedStaff as { _id?: string; name?: string; phone?: string } | undefined;
      if (pop?._id && !staffById[String(pop._id)]) {
        staffById[String(pop._id)] = {
          _id: pop._id,
          name: pop.name,
          phone: pop.phone,
        };
      }
    }

    const reservationMetaById = await this.loadReservationMetaForTasks(rawTasks);
    if (import.meta.env.DEV) {
      console.debug(
        `[getTasks] search page=${page} n=${rawTasks.length}/${searchPayload.pagination?.total ?? '?'} sort=${sortField}:${sortDirection}, ${(performance.now() - startTime).toFixed(0)}ms`,
      );
    }

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

    // Affinage legacy CREATED vs ASSIGNED (mapping Mongo large) — sur la page seulement.
    if (params.statuses?.length) {
      const set = new Set(params.statuses);
      rows = rows.filter((t) => set.has(t.taskStatus));
    }
    if (params.sources?.length) {
      const want = new Set(params.sources.map((s) => s.toLowerCase()));
      rows = rows.filter((t) => {
        const raw = String(t.source || '').toLowerCase();
        const norm =
          raw === 'orchestrator' || raw === 'orchestration'
            ? 'orchestrator'
            : raw === 'whatsapp' || raw === 'wa'
              ? 'whatsapp'
              : 'manual';
        return want.has(norm) || want.has(raw);
      });
    }
    if (params.staffCodes?.length) {
      const set = new Set(params.staffCodes.map(String));
      rows = rows.filter(
        (t) =>
          (t.staffId && set.has(String(t.staffId))) ||
          (t.staffCode && set.has(String(t.staffCode))),
      );
    }

    const pagination = searchPayload.pagination || {
      page,
      limit,
      total: rows.length,
      totalPages: Math.max(1, Math.ceil(rows.length / Math.max(limit, 1))),
    };

    return {
      success: true,
      tasks: rows,
      data: rows,
      pagination,
      ...(!hasStaffCache
        ? {
            staff: staffRows.slice(0, 200).map((s) => ({
              _id: s._id,
              staffCode: String(s._id),
              name: s.name,
              phone: s.phone,
            })),
          }
        : {}),
      ...(!hasListingCache ? { listings: listingOptions } : {}),
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

  async getListings(options?: { filterOwnerId?: string }) {
    const startTime = performance.now();

    const response = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      limit: 100, // ⚡ Réduit de 1000 → 100 (suffisant pour les filtres)
      page: 0,
      compact: true, // ⚡ Mode compact: uniquement {_id, name, city}
      filterOwnerId: options?.filterOwnerId,
    });

    const items = response?.data?.items ?? [];
    if (import.meta.env.DEV) {
      console.debug(
        `[getListings] ${items.length} listings in ${(performance.now() - startTime).toFixed(0)}ms`,
      );
    }

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
    roomTypeName?: string | null;
    roomTypes?: { roomTypeName?: string } | null;
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
      roomTypeName:
        String(
          (res as { roomTypeName?: string | null }).roomTypeName ||
            (res as { roomTypes?: { roomTypeName?: string } }).roomTypes?.roomTypeName ||
            '',
        ).trim() || null,
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

    const uniqueIds = ids.slice(0, 200);
    const chunkSize = 100;
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize);
      try {
        const batch = await reservationsService.getBatch(chunk);
        for (const res of batch.data || []) {
          const id = String((res as { _id?: string; id?: string })._id || (res as { id?: string }).id || '');
          if (id) map.set(id, this.reservationToMeta(res));
        }
      } catch (err) {
        console.warn('[loadReservationMetaForTasks] batch fetch failed', err);
      }
    }
    return map;
  }

}

export default new FulltaskTasksService();
