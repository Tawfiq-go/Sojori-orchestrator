import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import { useNotificationScope } from './NotificationProvider';
import {
  fetchNotifications,
  fetchUnreadCount,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  markNotificationRead,
  setNotificationStatus,
  markAllNotificationsRead,
} from './notificationApi';
import type { NotificationPanelTab, NotificationItem } from './types';
import { isActionRequired, isActiveInPanel } from './constants';
import { aggregateActiveNotificationCounts } from './sidebarNotificationBadges';

import { isNotificationApiNotDeployed } from './notificationApiErrors';

const ROOT_KEY = ['notifications'] as const;

const notifQueryRetry = (failureCount: number, error: unknown) =>
  !isNotificationApiNotDeployed(error) && failureCount < 1;

export function useSidebarNotificationCounts() {
  const { ownerId, enabled } = useNotificationScope();
  return useQuery({
    queryKey: [...ROOT_KEY, 'active-items', ownerId],
    queryFn: async () => {
      const res = await fetchNotifications({ ownerId, limit: 100, page: 1 });
      const items = (res.items ?? []).filter(isActiveInPanel);
      return aggregateActiveNotificationCounts(items);
    },
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    retry: notifQueryRetry,
  });
}

export function useUnreadCount() {
  const { ownerId, enabled } = useNotificationScope();
  return useQuery({
    queryKey: [...ROOT_KEY, 'unread-count', ownerId],
    queryFn: () => fetchUnreadCount(ownerId),
    enabled,
    refetchInterval: enabled ? 60_000 : false,
    retry: notifQueryRetry,
  });
}

export function useNotificationList(
  facet: string,
  eventKey: string,
  tab: NotificationPanelTab,
) {
  const { ownerId, enabled } = useNotificationScope();
  return useQuery({
    queryKey: [...ROOT_KEY, 'list', ownerId, facet, eventKey, tab],
    queryFn: async () => {
      const res = await fetchNotifications({
        ownerId,
        facet: facet || undefined,
        eventKey: eventKey || undefined,
        limit: 50,
        page: 1,
      });
      let items = (res.items ?? []).filter(isActiveInPanel);
      if (tab === 'action') {
        items = items.filter(isActionRequired);
      }
      return { ...res, items };
    },
    enabled,
    placeholderData: keepPreviousData,
    retry: notifQueryRetry,
  });
}

export type NotificationHistoryTab = 'active' | 'treated' | 'dismissed';

export function useNotificationHistory(
  tab: NotificationHistoryTab,
  facet: string,
  eventKey: string,
) {
  const { ownerId, enabled } = useNotificationScope();
  return useQuery({
    queryKey: [...ROOT_KEY, 'history', ownerId, tab, facet, eventKey],
    queryFn: async () => {
      const facetParam = facet || undefined;
      const eventKeyParam = eventKey || undefined;
      if (tab === 'active') {
        const res = await fetchNotifications({
          ownerId,
          facet: facetParam,
          eventKey: eventKeyParam,
          limit: 100,
          page: 1,
        });
        return { items: (res.items ?? []).filter(isActiveInPanel) };
      }
      if (tab === 'dismissed') {
        const res = await fetchNotifications({
          ownerId,
          facet: facetParam,
          eventKey: eventKeyParam,
          status: 'dismissed',
          limit: 100,
          page: 1,
        });
        return { items: res.items ?? [] };
      }
      const [doneRes, handledRes] = await Promise.all([
        fetchNotifications({
          ownerId,
          facet: facetParam,
          eventKey: eventKeyParam,
          status: 'done',
          limit: 50,
          page: 1,
        }),
        fetchNotifications({
          ownerId,
          facet: facetParam,
          eventKey: eventKeyParam,
          status: 'handled',
          limit: 50,
          page: 1,
        }),
      ]);
      const items = [...(doneRes.items ?? []), ...(handledRes.items ?? [])].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
      return { items };
    },
    enabled,
    placeholderData: keepPreviousData,
    retry: notifQueryRetry,
  });
}

export function useNotificationPreferences(targetUserId?: string | null) {
  const { ownerId, enabled } = useNotificationScope();
  const preferenceUserId = targetUserId ?? ownerId;
  return useQuery({
    queryKey: [...ROOT_KEY, 'preferences', ownerId, preferenceUserId],
    queryFn: () => fetchNotificationPreferences(ownerId, preferenceUserId),
    enabled: enabled && Boolean(preferenceUserId),
    retry: notifQueryRetry,
  });
}

export function useUpdatePreferences(targetUserId?: string | null) {
  const { ownerId } = useNotificationScope();
  const preferenceUserId = targetUserId ?? ownerId;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (events: Record<string, { dashboard?: boolean }>) =>
      updateNotificationPreferences(events, ownerId, preferenceUserId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}

function patchList(
  old: { items: NotificationItem[] } | undefined,
  id: string,
  patch: Partial<NotificationItem> | 'remove',
) {
  if (!old?.items) return old;
  if (patch === 'remove') {
    return { ...old, items: old.items.filter((n) => n._id !== id) };
  }
  return {
    ...old,
    items: old.items.map((n) => (n._id === id ? { ...n, ...patch } : n)),
  };
}

export function useMarkRead() {
  const { ownerId } = useNotificationScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id, ownerId),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ROOT_KEY });
      const prev = queryClient.getQueriesData<{ items: NotificationItem[] }>({
        queryKey: [...ROOT_KEY, 'list'],
      });
      queryClient.setQueriesData<{ items: NotificationItem[] }>(
        { queryKey: [...ROOT_KEY, 'list'] },
        (old) => patchList(old, id, 'remove'),
      );
      return { prev };
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}

export function useSetStatus() {
  const { ownerId } = useNotificationScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      setNotificationStatus(id, status, ownerId),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ROOT_KEY });
      if (status === 'dismissed' || status === 'done') {
        queryClient.setQueriesData<{ items: NotificationItem[] }>(
          { queryKey: [...ROOT_KEY, 'list'] },
          (old) => patchList(old, id, 'remove'),
        );
        queryClient.setQueriesData<{ items: NotificationItem[] }>(
          { queryKey: [...ROOT_KEY, 'history'] },
          (old) => patchList(old, id, 'remove'),
        );
      } else {
        queryClient.setQueriesData<{ items: NotificationItem[] }>(
          { queryKey: [...ROOT_KEY, 'list'] },
          (old) =>
            patchList(old, id, {
              status: status as NotificationItem['status'],
              readAt: new Date().toISOString(),
            }),
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}

export function useMarkAllRead() {
  const { ownerId } = useNotificationScope();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (opts?: { facet?: string; eventKey?: string }) =>
      markAllNotificationsRead(opts, ownerId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}
