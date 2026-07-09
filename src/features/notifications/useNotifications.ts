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
import { isActionRequired } from './constants';

import { isNotificationApiNotDeployed } from './notificationApiErrors';

const ROOT_KEY = ['notifications'] as const;

const notifQueryRetry = (failureCount: number, error: unknown) =>
  !isNotificationApiNotDeployed(error) && failureCount < 1;

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

export function useNotificationList(facet: string, tab: NotificationPanelTab) {
  const { ownerId, enabled } = useNotificationScope();
  return useQuery({
    queryKey: [...ROOT_KEY, 'list', ownerId, facet, tab],
    queryFn: async () => {
      const res = await fetchNotifications({
        ownerId,
        facet: facet || undefined,
        limit: 50,
        page: 1,
      });
      let items = res.items ?? [];
      if (tab === 'action') {
        items = items.filter(isActionRequired);
      }
      items = items.filter((n) => n.status !== 'dismissed' && n.status !== 'expired');
      return { ...res, items };
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
        (old) =>
          patchList(old, id, {
            readAt: new Date().toISOString(),
            status: 'handled',
          }),
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
      if (status === 'dismissed') {
        queryClient.setQueriesData<{ items: NotificationItem[] }>(
          { queryKey: [...ROOT_KEY, 'list'] },
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
    mutationFn: (facet?: string) => markAllNotificationsRead(facet, ownerId),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ROOT_KEY });
    },
  });
}
