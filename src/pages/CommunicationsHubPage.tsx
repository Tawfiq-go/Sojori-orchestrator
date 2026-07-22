import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { DASHBOARD_PAGE_FILL_SX } from '../constants/dashboardLayout';
import WhatsAppTabV2 from '../components/communications/WhatsAppTabV2';
import BookingWhatsAppTabV2 from '../components/communications/BookingWhatsAppTabV2';
import StaffWhatsAppTabV2 from '../components/communications/StaffWhatsAppTabV2';
import MessagesOTATabV2 from '../components/communications/MessagesOTATabV2';
import ResasTabV2 from '../components/communications/ResasTabV2';
import LeadsTabV2 from '../components/communications/LeadsTabV2';
import ReviewsTabV2 from '../components/communications/ReviewsTabV2';
import InboxHubTabs from '../components/unified-inbox/InboxHubTabs';
import {
  normalizeCommsTab,
  resolveCommsSection,
  type CommsHubTab,
  type CommsSection,
} from '../components/communications/commsHubConfig';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import { useSocketIO } from '../hooks/useSocketIO';
import { SOCKET_EVENTS, DEFAULT_ROOMS } from '../constants/socketEvents';
import { scheduleInboxRealtimeDispatch } from '../utils/inboxRealtime';
import { hasJwtSession } from '../utils/devApiAccess';
import messagesService from '../services/messagesService';
import { getBookingInboxThreads } from '../services/bookingInboxService';
import { getCachedOtaInbox } from '../utils/otaInboxCache';
import { useAuth } from '../hooks/useAuth';
import { Roles } from '../constants/roles';

function isOtaChannel(ch?: string): boolean {
  const c = (ch || '').toLowerCase();
  if (!c || c.includes('whatsapp') || c === 'wa') return false;
  return c.includes('airbnb') || c.includes('booking') || c.includes('vrbo') || c === 'ab' || c === 'bk';
}

function isWaGuestChannel(ch?: string): boolean {
  return !isOtaChannel(ch);
}

export default function CommunicationsHubPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const section: CommsSection = resolveCommsSection(searchParams.get('section'), tabParam);
  const activeTab = normalizeCommsTab(tabParam, section);
  const isPlatformAdmin =
    user?.role === Roles.Admin ||
    user?.role === Roles.SuperAdmin ||
    String(user?.role || '').toLowerCase() === 'admin' ||
    String(user?.role || '').toLowerCase() === 'superadmin';

  useEffect(() => {
    const needsSection = !searchParams.get('section');
    const legacyTemplates = tabParam === 'templates';
    const wrongTab = tabParam != null && tabParam !== activeTab;
    const bookingForbidden = activeTab === 'booking' && !isPlatformAdmin;
    if (needsSection || legacyTemplates || wrongTab || bookingForbidden) {
      const params = new URLSearchParams(searchParams);
      params.set('section', bookingForbidden ? 'staff' : section);
      params.set('tab', bookingForbidden ? 'admin' : activeTab);
      navigate(`/communications?${params.toString()}`, { replace: true });
    }
  }, [searchParams, tabParam, section, activeTab, navigate, isPlatformAdmin]);

  const [counts, setCounts] = useState<Partial<Record<CommsHubTab, number>>>({});
  const [unreadCount, setUnreadCount] = useState(0);

  const refetchCounts = useCallback(async () => {
    const cachedOta = getCachedOtaInbox();
    if (cachedOta) {
      setCounts((prev) => ({ ...prev, ota: cachedOta.length }));
    }

    // Inbox Resa = plateforme sans owner — compteurs indépendants du filtre propriétaire
    if (isPlatformAdmin) {
      void getBookingInboxThreads({ limit: 50 })
        .then((res) => {
          setCounts((prev) => ({
            ...prev,
            booking: res.data.conversations?.length || 0,
          }));
        })
        .catch(() => {
          /* ignore */
        });
    }

    if (!scopeFetchReady) {
      if (!isPlatformAdmin) {
        setCounts({});
        setUnreadCount(0);
      }
      return;
    }

    try {
      const ownerScope = requestOwnerId || undefined;
      const jwtReady = hasJwtSession();

      const guestRes = await messagesService
        .getConversations({
          filter: 'smart',
          hasReservation: true,
          limit: 100,
          owner_id: ownerScope,
          silent: true,
        })
        .catch(() => null);

      let staffRes: Awaited<ReturnType<typeof messagesService.getConversations>> | null = null;
      let adminWaRes: Awaited<ReturnType<typeof messagesService.getConversations>> | null = null;
      let leadsRes: { threads?: unknown[] } = { threads: [] };
      let reviewsRes: { threads?: unknown[]; data?: unknown[] } = { threads: [] };

      if (jwtReady) {
        [staffRes, adminWaRes, leadsRes, reviewsRes] = await Promise.all([
          messagesService
            .getConversations({
              filter: 'smart',
              hasReservation: false,
              limit: 50,
              owner_id: ownerScope,
              inboxParty: 'staff',
              silent: true,
            })
            .catch(() => null),
          messagesService
            .getConversations({
              filter: 'smart',
              hasReservation: false,
              limit: 50,
              owner_id: ownerScope,
              inboxParty: 'admin',
              silent: true,
            })
            .catch(() => null),
          messagesService
            .getLeads({ limit: 50, ownerId: ownerScope, silent: true })
            .catch(() => ({ threads: [] })),
          messagesService
            .getReviews({ limit: 50, ownerId: ownerScope, silent: true })
            .catch(() => ({ threads: [] })),
        ]);
      }

      let waGuest = 0;
      let unread = 0;

      if (guestRes?.status === 'success') {
        for (const c of guestRes.data.conversations) {
          if (!isWaGuestChannel(c.channel_name)) continue;
          unread += c.unread_count || 0;
          waGuest += 1;
        }
      }

      const ota = cachedOta?.length ?? 0;

      const staffCount =
        staffRes?.status === 'success' ? staffRes.data.conversations.length : 0;
      const adminWaCount =
        adminWaRes?.status === 'success' ? adminWaRes.data.conversations.length : 0;
      const leadsCount = leadsRes.threads?.length ?? 0;
      const reviewsCount = (reviewsRes.threads || reviewsRes.data || []).length;

      setCounts((prev) => ({
        ...prev,
        whatsapp: waGuest,
        staff: staffCount,
        admin: adminWaCount,
        ota,
        leads: leadsCount,
        reviews: reviewsCount,
      }));
      setUnreadCount(unread);
    } catch {
      /* counts optionnels — échecs déjà loggés par apiClient */
    }
  }, [scopeFetchReady, requestOwnerId, isPlatformAdmin]);

  useEffect(() => {
    void refetchCounts();

    const onOtaUpdated = (event: Event) => {
      const count = (event as CustomEvent<{ count: number }>).detail?.count;
      if (typeof count === 'number') {
        setCounts((prev) => ({ ...prev, ota: count }));
      }
    };
    window.addEventListener('sojori:ota-inbox-updated', onOtaUpdated);

    return () => {
      window.removeEventListener('sojori:ota-inbox-updated', onOtaUpdated);
    };
  }, [refetchCounts]);

  // ─── Temps réel (socket.io) ───────────────────────────────────────
  // Refetch ciblé des compteurs + notification aux sous-onglets actifs (pattern CustomEvent
  // déjà utilisé par otaInboxCache) plutôt qu'un patch state fin par tab — cf. plan V1.
  const notifyInboxRealtime = useCallback((socketEvent: string, payload?: unknown) => {
    if (import.meta.env.DEV) {
      console.warn('[CommsHub] socket', socketEvent, payload);
    }
    scheduleInboxRealtimeDispatch(socketEvent, payload, () => {
      void refetchCounts();
    });
  }, [refetchCounts]);

  useSocketIO({
    rooms: [DEFAULT_ROOMS.CHAT, DEFAULT_ROOMS.CHANNEXMESSAGE, DEFAULT_ROOMS.RU_CHAT],
    enabled: scopeFetchReady,
    onReconnect: () => notifyInboxRealtime('reconnect'),
    handlers: {
      [SOCKET_EVENTS.NEW_SENDED_MSG]: (p) => notifyInboxRealtime(SOCKET_EVENTS.NEW_SENDED_MSG, p),
      [SOCKET_EVENTS.NEW_RECIVED_MSG]: (p) => notifyInboxRealtime(SOCKET_EVENTS.NEW_RECIVED_MSG, p),
      [SOCKET_EVENTS.CONVERSATION_CHANGED]: (p) => notifyInboxRealtime(SOCKET_EVENTS.CONVERSATION_CHANGED, p),
      [SOCKET_EVENTS.READ_MSG]: (p) => notifyInboxRealtime(SOCKET_EVENTS.READ_MSG, p),
      [SOCKET_EVENTS.MODIFIED_MSG]: (p) => notifyInboxRealtime(SOCKET_EVENTS.MODIFIED_MSG, p),
    },
  });

  return (
    <DashboardWrapper
      hidePageHeader
      breadcrumb={['Communications', section === 'staff' ? 'Staff' : 'Guest']}
    >
      <Box
        sx={{
          ...DASHBOARD_PAGE_FILL_SX,
          minHeight: { xs: 'calc(100dvh - 80px)', md: 'calc(100dvh - 88px)' },
          maxHeight: { xs: 'calc(100dvh - 80px)', md: 'calc(100dvh - 88px)' },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <InboxHubTabs section={section} counts={counts} unreadCount={unreadCount} compact />

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {activeTab === 'whatsapp' && <WhatsAppTabV2 />}
          {activeTab === 'booking' && isPlatformAdmin && <BookingWhatsAppTabV2 />}
          {activeTab === 'staff' && <StaffWhatsAppTabV2 inboxParty="staff" />}
          {activeTab === 'admin' && <StaffWhatsAppTabV2 inboxParty="admin" />}
          {activeTab === 'ota' && <MessagesOTATabV2 />}
          {activeTab === 'resas' && <ResasTabV2 />}
          {activeTab === 'leads' && <LeadsTabV2 />}
          {activeTab === 'reviews' && <ReviewsTabV2 />}
        </Box>
      </Box>
    </DashboardWrapper>
  );
}
