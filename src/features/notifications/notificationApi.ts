import apiClient from '../../services/apiClient';
import { API_BASE_URL } from '../../config/backendServer.config';
import type {
  NotificationItem,
  NotificationListResponse,
  NotificationPreferencesData,
  NotificationEventDefinition,
  UnreadCountData,
  EventChannelPreference,
} from './types';
import { isNotificationApiNotDeployed, markNotificationApiDeployed } from './notificationApiErrors';

async function withNotifFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await fn();
    markNotificationApiDeployed(true);
    return result;
  } catch (error) {
    if (isNotificationApiNotDeployed(error)) {
      markNotificationApiDeployed(false);
      return fallback;
    }
    throw error;
  }
}

function resolveFulltaskBase(): string {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return '/api/v1/admin/fulltask';
  }
  return `${API_BASE_URL}/api/v1/admin/fulltask`;
}

const NOTIF_BASE = `${resolveFulltaskBase()}/notification`;

function scopeParams(
  ownerId?: string | null,
  userId?: string | null,
): Record<string, string> {
  const params: Record<string, string> = {};
  if (ownerId) params.ownerId = String(ownerId);
  if (userId) params.userId = String(userId);
  return params;
}

export async function fetchUnreadCount(ownerId?: string | null): Promise<UnreadCountData> {
  return withNotifFallback(async () => {
    const { data } = await apiClient.get(`${NOTIF_BASE}/unread-count`, {
      params: scopeParams(ownerId),
    });
    if (!data?.success) throw new Error(data?.error || 'unread-count failed');
    return data.data as UnreadCountData;
  }, {
    total: 0,
    activeCount: 0,
    actionRequired: 0,
    byFacet: {},
    byEventKey: {},
    byFacetActive: {},
    byEventKeyActive: {},
  });
}

export interface ListNotificationsParams {
  ownerId?: string | null;
  facet?: string;
  eventKey?: string;
  unreadOnly?: boolean;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export async function fetchNotifications(
  params: ListNotificationsParams = {},
): Promise<NotificationListResponse> {
  const { ownerId, ...rest } = params;
  const { data } = await apiClient.get(`${NOTIF_BASE}/`, {
    params: { ...scopeParams(ownerId), ...rest },
  });
  if (!data?.success) throw new Error(data?.error || 'list notifications failed');
  return data as NotificationListResponse;
}

export async function markNotificationRead(
  id: string,
  ownerId?: string | null,
): Promise<NotificationItem> {
  const { data } = await apiClient.put(`${NOTIF_BASE}/${id}/read`, null, {
    params: scopeParams(ownerId),
  });
  if (!data?.success) throw new Error(data?.error || 'mark read failed');
  return data.data as NotificationItem;
}

export async function setNotificationStatus(
  id: string,
  status: string,
  ownerId?: string | null,
): Promise<NotificationItem> {
  const { data } = await apiClient.put(
    `${NOTIF_BASE}/${id}/status`,
    { status },
    { params: scopeParams(ownerId) },
  );
  if (!data?.success) throw new Error(data?.error || 'set status failed');
  return data.data as NotificationItem;
}

export async function markAllNotificationsRead(
  opts?: { facet?: string; eventKey?: string },
  ownerId?: string | null,
): Promise<{ modifiedCount: number }> {
  const { data } = await apiClient.put(`${NOTIF_BASE}/read-all`, null, {
    params: {
      ...scopeParams(ownerId),
      ...(opts?.facet ? { facet: opts.facet } : {}),
      ...(opts?.eventKey ? { eventKey: opts.eventKey } : {}),
    },
  });
  if (!data?.success) throw new Error(data?.error || 'mark all read failed');
  return data.data as { modifiedCount: number };
}

export async function fetchNotificationPreferences(
  ownerId?: string | null,
  userId?: string | null,
): Promise<NotificationPreferencesData> {
  return withNotifFallback(
    async () => {
      const { data } = await apiClient.get(`${NOTIF_BASE}/preferences`, {
        params: scopeParams(ownerId, userId),
      });
      if (!data?.success) throw new Error(data?.error || 'preferences failed');
      return data.data as NotificationPreferencesData;
    },
    { preferences: {}, catalog: [] },
  );
}

export async function updateNotificationPreferences(
  events: Record<string, EventChannelPreference>,
  ownerId?: string | null,
  userId?: string | null,
): Promise<NotificationPreferencesData> {
  const { data } = await apiClient.put(
    `${NOTIF_BASE}/preferences`,
    { events },
    { params: scopeParams(ownerId, userId) },
  );
  if (!data?.success) throw new Error(data?.error || 'update preferences failed');
  return data.data as NotificationPreferencesData;
}

export async function fetchEventCatalog(): Promise<NotificationEventDefinition[]> {
  const { data } = await apiClient.get(`${NOTIF_BASE}/event-catalog`);
  if (!data?.success) throw new Error(data?.error || 'event-catalog failed');
  return data.data as NotificationEventDefinition[];
}
