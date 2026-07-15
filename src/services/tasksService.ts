import apiClient from './apiClient';
import { MICROSERVICE_BASE_URL } from '../config/authConfig';
import { hasAdminAccess } from '../utils/rbac.utils';
import type {
  ReservationTasksResult,
  StaffAssignmentsResult,
  StaffWorkloadResult,
  TaskAssignPayload,
  TaskCreatePayload,
  TaskListingOption,
  TasksSearchParams,
  TasksSearchResult,
  TasksStaffResult,
  TaskUpdateFieldsPayload,
} from '../types/tasks.types';
import type { ReservationPlanningResponse } from '../types/tasksPlanning.types';

const TASKS_BASE_URL = MICROSERVICE_BASE_URL.SRV_TASK;

export interface TasksAuthLikeUser {
  id?: string;
  _id?: string;
  role?: string;
  ownerId?: string;
  theOwnerId?: string;
}

export interface TasksUserScope {
  ownerId?: string;
  canAccessAllOwners: boolean;
  role: string;
}

const compactParams = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  );

const toCommaSeparated = (values?: string[]) =>
  values && values.length > 0 ? values.join(',') : undefined;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  return fallback;
};

export function resolveTasksUserScope(user: TasksAuthLikeUser | null | undefined): TasksUserScope {
  const role = String(user?.role || '').trim();

  // Dev sans utilisateur connecté → accès admin ; Owner/Worker connectés restent scopés
  if (import.meta.env.VITE_DISABLE_AUTH === 'true' && !user) {
    return { ownerId: undefined, canAccessAllOwners: true, role: 'SuperAdmin' };
  }

  if (hasAdminAccess(role)) {
    return { ownerId: undefined, canAccessAllOwners: true, role };
  }

  const ownerId =
    user?.ownerId ||
    user?.theOwnerId ||
    user?.id ||
    user?._id;

  if (ownerId) {
    return { ownerId: String(ownerId), canAccessAllOwners: false, role };
  }

  return { ownerId: undefined, canAccessAllOwners: false, role };
}

class TasksService {
  async getTasks(params: TasksSearchParams): Promise<TasksSearchResult> {
    try {
      const isArchivedParam =
        params.isArchived === 'all'
          ? 'all'
          : params.isArchived === true
            ? true
            : params.isArchived === false
              ? false
              : false;

      const response = await apiClient.get(`${TASKS_BASE_URL}/tasks/search`, {
        params: compactParams({
          ownerId: params.ownerId,
          audience: params.audience ?? 'STAFF',
          page: params.page ?? 0,
          limit: params.limit ?? 100,
          listingIds: toCommaSeparated(params.listingIds),
          itemTypes: toCommaSeparated(params.itemTypes),
          subTypes: toCommaSeparated(params.subTypes),
          statuses: toCommaSeparated(params.statuses),
          sources: toCommaSeparated(params.sources),
          staffCodes: toCommaSeparated(params.staffCodes),
          paymentStatus: params.paymentStatus,
          hasAssociation: params.hasAssociation,
          emergency: params.emergency,
          dateType: params.dateType,
          dateStart: params.dateStart,
          dateEnd: params.dateEnd,
          searchTerm: params.searchTerm,
          sortField: params.sortField ?? 'startDate',
          sortDirection: params.sortDirection ?? 'desc',
          isArchived: isArchivedParam,
        }),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du chargement des tâches');
      }

      return {
        tasks: response.data.data?.tasks || [],
        pagination: response.data.data?.pagination || {
          page: 0,
          limit: params.limit ?? 100,
          total: 0,
          totalPages: 0,
        },
        performanceTime: response.data.performance?.totalTime,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du chargement des tâches'));
    }
  }

  async createTask(payload: TaskCreatePayload): Promise<void> {
    try {
      const response = await apiClient.post(`${TASKS_BASE_URL}/tasks`, {
        ...payload,
        source: payload.source || 'MANUAL',
        requestType: payload.requestType || 'TASK',
        emergency: payload.emergency || 'Normal',
        price: payload.price || 0,
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la création de la tâche');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors de la création de la tâche'));
    }
  }

  async updateTaskFields(taskId: string, payload: TaskUpdateFieldsPayload): Promise<void> {
    try {
      const response = await apiClient.patch(`${TASKS_BASE_URL}/tasks/${taskId}/fields`, payload);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors de la mise à jour'));
    }
  }

  async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      const response = await apiClient.patch(`${TASKS_BASE_URL}/tasks/${taskId}/status`, { status });
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du changement de statut');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du changement de statut'));
    }
  }

  async assignTask(taskId: string, payload: TaskAssignPayload): Promise<void> {
    try {
      const response = await apiClient.put(`${TASKS_BASE_URL}/tasks/${taskId}/assign`, payload);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors de l’assignation');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors de l’assignation'));
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`${TASKS_BASE_URL}/tasks/${taskId}`);
      if (response.data?.success === false) {
        throw new Error(response.data?.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors de la suppression'));
    }
  }

  async getStaff(params: {
    ownerId?: string;
    search?: string;
    types?: string[];
    page?: number;
    limit?: number;
  }): Promise<TasksStaffResult> {
    try {
      const response = await apiClient.get(`${TASKS_BASE_URL}/staff-simplified`, {
        params: compactParams({
          ownerId: params.ownerId,
          search: params.search,
          types: toCommaSeparated(params.types),
          page: params.page ?? 0,
          limit: params.limit ?? 100,
        }),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du chargement du staff');
      }

      return {
        staff: response.data.staff || [],
        pagination: response.data.pagination || {
          page: 0,
          limit: params.limit ?? 100,
          totalCount: 0,
          totalPages: 0,
        },
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du chargement du staff'));
    }
  }

  async getStaffAssignments(
    staffCode: string,
    params?: { startDate?: string; endDate?: string },
  ): Promise<StaffAssignmentsResult> {
    try {
      const response = await apiClient.get(
        `${TASKS_BASE_URL}/staff-simplified/${staffCode}/assignments`,
        {
          params: compactParams({
            startDate: params?.startDate,
            endDate: params?.endDate,
          }),
        },
      );

      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du chargement des affectations');
      }

      return {
        data: response.data.data || [],
        stats: response.data.stats,
      };
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du chargement des affectations'));
    }
  }

  async getStaffWorkload(staffCode: string): Promise<StaffWorkloadResult> {
    try {
      const response = await apiClient.get(`${TASKS_BASE_URL}/staff-simplified/${staffCode}/workload`);
      if (!response.data?.success) {
        throw new Error(response.data?.message || 'Erreur lors du chargement de la charge');
      }
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du chargement de la charge'));
    }
  }

  /**
   * `/api/v1/task/listings` (ancien srv-task) n'existe plus côté backend — srv-fulltask
   * n'a pas de collection Listing locale. On repasse par srv-listing (source de vérité),
   * déjà utilisé ailleurs dans l'app via listingsService.
   */
  async getListings(params?: { filterOwnerId?: string }): Promise<TaskListingOption[]> {
    try {
      const { default: listingsService } = await import('./listingsService');
      const result = await listingsService.getListingsForCalendar(0, 500, {
        filterOwnerId: params?.filterOwnerId,
      });
      if (!result.success) return [];
      return result.data.map((l: Record<string, unknown>) => ({
        _id: String(l._id ?? l.id ?? ''),
        name: String(l.name ?? l.title ?? ''),
        address: l.address ? String(l.address) : undefined,
        city: l.city ? String(l.city) : undefined,
        country: l.country ? String(l.country) : undefined,
      }));
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Erreur lors du chargement des annonces'));
    }
  }

  /**
   * Vue Séjour / calendrier tâches — même endpoint que sojori-dashboard (`UltimateDashboard` / `?tab=sejour`).
   * GET `/api/v1/task/reservation/planning`
   */
  async getReservationPlanning(params: {
    startDate: string;
    endDate: string;
    ownerId?: string;
  }): Promise<ReservationPlanningResponse> {
    const response = await apiClient.get<ReservationPlanningResponse>(
      `${TASKS_BASE_URL}/reservation/planning`,
      {
        params: compactParams({
          startDate: params.startDate,
          endDate: params.endDate,
          ownerId: params.ownerId,
        }),
        timeout: 90000,
      },
    );
    return response.data;
  }

  /**
   * Récupère toutes les tâches liées à une réservation
   * GET /api/v1/internal/tasks/reservation/:reservationId
   *
   * @param reservationId - ID ou numéro de réservation
   * @param includeCompleted - Inclure les tâches terminées/annulées (défaut: false)
   */
  async getTasksByReservation(
    reservationId: string,
    includeCompleted = false,
  ): Promise<ReservationTasksResult> {
    try {
      const fulltaskBase = `${MICROSERVICE_BASE_URL.SRV_ADMIN}/fulltask/reservation-tasks`;
      const response = await apiClient.get<{ success?: boolean; data?: unknown[] }>(fulltaskBase, {
        params: {
          reservationCode: reservationId,
          limit: 100,
        },
      });

      const rawTasks = Array.isArray(response.data?.data) ? response.data.data : [];
      const tasks = rawTasks
        .filter((task) => {
          if (includeCompleted) return true;
          const status = String((task as { status?: string }).status || '').toLowerCase();
          return status !== 'done' && status !== 'cancelled';
        })
        .map((task) => {
          const t = task as Record<string, unknown>;
          const assigned = t.assignedTo as { username?: string; whatsappPhone?: string } | undefined;
          return {
            taskId: String(t._id || t.taskId || ''),
            taskCode: String(t.taskCode || t.code || ''),
            type: String(t.type || t.subType || 'other'),
            status: String(t.status || 'new'),
            scheduledFor: (t.scheduledDate || t.scheduledAt || t.startDate) as string | undefined,
            deadline: (t.dueAt || t.deadline || t.endDate) as string | undefined,
            assignedStaff: assigned?.username
              ? {
                  name: String(assigned.username),
                  phone: String(assigned.whatsappPhone || ''),
                }
              : null,
          };
        });

      return {
        success: true,
        data: {
          reservationId,
          total: tasks.length,
          tasks,
        },
      };
    } catch (error) {
      console.error(`❌ Erreur récupération tâches pour réservation ${reservationId}:`, error);
      return {
        success: false,
        data: {
          reservationId,
          total: 0,
          tasks: [],
        },
      };
    }
  }
}

export const tasksService = new TasksService();
export default tasksService;
