import listingsService from './listingsService';
import * as fulltaskApi from './fulltaskApi';
import reservationsService from './reservationsService';
import { labelForTaskTypeId } from '../features/taskHub/staff-design/fulltaskTaskTypes';
import { LEGACY_TO_FULLTASK_STATUS, fullTaskToListItem } from '../utils/fulltaskMappers';
import type { ReservationMetaLike } from '../utils/fulltaskMappers';
import type { TaskFulltaskUpdatePayload, TasksSearchParams } from '../types/tasks.types';

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
  async getTasks(params: TasksSearchParams) {
    const [tasksRes, staffRes, listingRows] = await Promise.all([
      fulltaskApi.listTasks({
        listingId: params.listingIds?.length === 1 ? params.listingIds[0] : undefined,
        type: params.subTypes?.length === 1 ? params.subTypes[0] : undefined,
      }),
      fulltaskApi.listStaff(),
      this.getListings(),
    ]);

    const staffRows = staffRes?.data || [];
    const staffById = Object.fromEntries(
      staffRows.map((s: Record<string, unknown>) => [String(s._id), s]),
    );
    const listingById = Object.fromEntries(
      listingRows.map((l) => [String(l._id), l.name]),
    );

    const rawTasks = (tasksRes?.data || []) as Record<string, unknown>[];
    const reservationMetaById = await this.loadReservationMetaForTasks(rawTasks);

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

  async updateTask(taskId: string, body: TaskFulltaskUpdatePayload) {
    const patch: Record<string, unknown> = { ...body };
    if (body.status) {
      patch.status = LEGACY_TO_FULLTASK_STATUS[body.status] || body.status;
    }
    const res = await fulltaskApi.patchTask(taskId, patch);
    if (res?.success === false) throw new Error(res?.error || 'Mise à jour refusée');
    return res?.data;
  }

  async updateTaskStatus(taskId: string, legacyStatus: string) {
    const status = LEGACY_TO_FULLTASK_STATUS[legacyStatus] || 'new';
    const res = await fulltaskApi.patchTaskStatus(taskId, status);
    if (res?.success === false) throw new Error(res?.error || 'Statut refusé');
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
    const response = await listingsService.getListings({
      useActiveFilter: true,
      active: true,
      limit: 1000,
      page: 0,
    });
    const items = response?.data?.items ?? [];
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

    await Promise.all(
      ids.slice(0, 60).map(async (id) => {
        try {
          const res = await reservationsService.getById(id);
          map.set(id, {
            arrivalDate: res.arrivalDate,
            departureDate: res.departureDate,
            guestCountry: res.guestCountry ?? null,
            channelName: res.channelName ?? res.otaCode ?? null,
            reservationNumber: res.reservationNumber ?? null,
            adults: res.adults,
          });
        } catch {
          /* réservation introuvable */
        }
      }),
    );
    return map;
  }

}

export default new FulltaskTasksService();
