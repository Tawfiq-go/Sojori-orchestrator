import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useAdminOwnerFilter } from '../../context/AdminOwnerFilterContext';
import { toLegacyAuthUser } from '../../utils/legacyAuthUser';
import { getPropertyOwnerScopeId } from '../../utils/taskScope.utils';
import { useSocketIO } from '../../hooks/useSocketIO';
import { SOCKET_EVENTS } from '../../constants/socketEvents';
import type { NotificationBellTier, NotificationItem } from './types';
import { NotificationToastStack } from './NotificationToast';

interface NotificationScopeValue {
  ownerId: string | null;
  userId: string | null;
  enabled: boolean;
  panelTier: NotificationBellTier | null;
  setPanelTier: (tier: NotificationBellTier | null) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  livePulse: number;
  pushToast: (n: NotificationItem) => void;
}

const NotificationScopeContext = createContext<NotificationScopeValue | null>(null);

export function useNotificationScope(): NotificationScopeValue {
  const ctx = useContext(NotificationScopeContext);
  if (!ctx) {
    throw new Error('useNotificationScope must be used within NotificationProvider');
  }
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user: authUser, loading: authLoading } = useAuth();
  const user = useMemo(() => toLegacyAuthUser(authUser), [authUser]);
  const { requestOwnerId, simulatedOwnerId } = useAdminOwnerFilter();
  const queryClient = useQueryClient();

  const userId = useMemo(() => {
    const id = user?.id ?? user?._id;
    return id != null && String(id).trim() ? String(id).trim() : null;
  }, [user]);

  const ownerId = useMemo(() => {
    if (simulatedOwnerId) return String(simulatedOwnerId);
    if (requestOwnerId) return String(requestOwnerId);
    return getPropertyOwnerScopeId(user);
  }, [simulatedOwnerId, requestOwnerId, user]);

  const enabled = Boolean(ownerId) && !authLoading;

  const [panelTier, setPanelTier] = useState<NotificationBellTier | null>(null);
  const [livePulse, setLivePulse] = useState(0);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);

  const setPanelOpen = useCallback((open: boolean) => {
    setPanelTier(open ? 'important' : null);
  }, []);

  const pushToast = useCallback((n: NotificationItem) => {
    setToasts((prev) => {
      if (prev.some((t) => t._id === n._id)) return prev;
      return [n, ...prev].slice(0, 3);
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t._id !== id));
  }, []);

  // Uniquement la room user : chaque destinataire reçoit sa copie.
  // La room owner broadcaste toutes les copies (owner+workers) → avalanche de rectangles.
  const socketRooms = useMemo(() => {
    if (!userId) return [];
    return [`room_notification_user_${userId}`];
  }, [userId]);

  useSocketIO({
    rooms: socketRooms,
    enabled: enabled && Boolean(userId),
    onReconnect: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    handlers: {
      [SOCKET_EVENTS.NEW_NOTIFICATION]: (
        payload: Partial<NotificationItem> & {
          notificationId?: string;
          recipientUserId?: string | null;
        },
      ) => {
        const rid = payload.recipientUserId != null ? String(payload.recipientUserId) : null;
        // Ne jamais afficher / pulser les notifs destinées à un autre user.
        if (rid && userId && rid !== String(userId)) return;

        void queryClient.refetchQueries({ queryKey: ['notifications'] });
        setLivePulse(Date.now());
        if (payload.priority === 'critical' || payload.priority === 'high') {
          const id = payload.notificationId || payload._id;
          pushToast({
            _id: id ? String(id) : `socket-${Date.now()}`,
            eventKey: payload.eventKey || 'message:ota_received',
            facet: (payload.facet as NotificationItem['facet']) || 'message',
            priority: (payload.priority as NotificationItem['priority']) || 'high',
            title: payload.title || 'Nouvelle notification',
            body: payload.body || '',
            linkPath: payload.linkPath || '',
            status: (payload.status as NotificationItem['status']) || 'pending',
            createdAt: new Date().toISOString(),
          });
        }
      },
    },
  });

  const value = useMemo(
    () => ({
      ownerId,
      userId,
      enabled,
      panelTier,
      setPanelTier,
      panelOpen: panelTier != null,
      setPanelOpen,
      livePulse,
      pushToast,
    }),
    [ownerId, userId, enabled, panelTier, setPanelOpen, livePulse, pushToast],
  );

  return (
    <NotificationScopeContext.Provider value={value}>
      {children}
      <NotificationToastStack toasts={toasts} onDismiss={dismissToast} />
    </NotificationScopeContext.Provider>
  );
}
