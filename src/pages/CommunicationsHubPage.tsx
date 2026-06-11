import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import WhatsAppTabV2 from '../components/communications/WhatsAppTabV2';
import StaffWhatsAppTabV2 from '../components/communications/StaffWhatsAppTabV2';
import WATemplatesTabV2 from '../components/communications/WATemplatesTabV2';
import MessagesOTATabV2 from '../components/communications/MessagesOTATabV2';
import LeadsTabV2 from '../components/communications/LeadsTabV2';
import ReviewsTabV2 from '../components/communications/ReviewsTabV2';
import InboxHubTabs, { type CommsHubTab } from '../components/unified-inbox/InboxHubTabs';
import messagesService from '../services/messagesService';
import { getCachedOtaInbox } from '../utils/otaInboxCache';

function isOtaChannel(ch?: string): boolean {
  const c = (ch || '').toLowerCase();
  if (!c || c.includes('whatsapp') || c === 'wa') return false;
  return c.includes('airbnb') || c.includes('booking') || c.includes('vrbo') || c === 'ab' || c === 'bk';
}

function isWaGuestChannel(ch?: string): boolean {
  return !isOtaChannel(ch);
}

export default function CommunicationsHubPage() {
  const [searchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') || 'whatsapp') as CommsHubTab;

  const [counts, setCounts] = useState<Partial<Record<CommsHubTab, number>>>({});
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const cachedOta = getCachedOtaInbox();
    if (cachedOta) {
      setCounts((prev) => ({ ...prev, ota: cachedOta.length }));
    }

    const onOtaUpdated = (event: Event) => {
      const count = (event as CustomEvent<{ count: number }>).detail?.count;
      if (typeof count === 'number') {
        setCounts((prev) => ({ ...prev, ota: count }));
      }
    };
    window.addEventListener('sojori:ota-inbox-updated', onOtaUpdated);

    void (async () => {
      try {
        const [guestRes, staffRes, leadsRes, reviewsRes] = await Promise.all([
          messagesService.getConversations({ filter: 'smart', hasReservation: true, limit: 100 }),
          messagesService.getConversations({ filter: 'smart', hasReservation: false, limit: 50 }),
          messagesService.getLeads({ limit: 50 }).catch(() => ({ threads: [] })),
          messagesService.getReviews({ limit: 50 }).catch(() => ({ threads: [] })),
        ]);

        let waGuest = 0;
        let unread = 0;

        if (guestRes.status === 'success') {
          for (const c of guestRes.data.conversations) {
            if (!isWaGuestChannel(c.channel_name)) continue;
            unread += c.unread_count || 0;
            waGuest += 1;
          }
        }

        const ota = cachedOta?.length ?? 0;

        const staffCount =
          staffRes.status === 'success' ? staffRes.data.conversations.length : 0;
        const leadsCount = leadsRes.threads?.length ?? 0;
        const reviewsCount = (reviewsRes.threads || reviewsRes.data || []).length;

        setCounts({
          whatsapp: waGuest,
          staff: staffCount,
          templates: 6,
          ota,
          leads: leadsCount,
          reviews: reviewsCount,
        });
        setUnreadCount(unread);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      window.removeEventListener('sojori:ota-inbox-updated', onOtaUpdated);
    };
  }, []);

  return (
    <DashboardWrapper breadcrumb={['Communications', 'Inbox']}>
      <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 } }}>
        <InboxHubTabs counts={counts} unreadCount={unreadCount} />

        {activeTab === 'whatsapp' && <WhatsAppTabV2 />}
        {activeTab === 'staff' && <StaffWhatsAppTabV2 />}
        {activeTab === 'templates' && <WATemplatesTabV2 />}
        {activeTab === 'ota' && <MessagesOTATabV2 />}
        {activeTab === 'leads' && <LeadsTabV2 />}
        {activeTab === 'reviews' && <ReviewsTabV2 />}
      </Box>
    </DashboardWrapper>
  );
}
