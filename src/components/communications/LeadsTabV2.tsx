import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import type { Thread, Message } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import { otaChannelColor, otaChannelFromName } from '../unified-inbox/inboxMappers';
import { OTA_QUICK_REPLIES, OTA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import {
  buildOtaPreviewFallbackMessages,
  extractOtaMessagesFromApiResponse,
  mapOtaApiMessagesToInbox,
} from '../unified-inbox/inboxOtaMappers';
import { formatThreadWhen, nightsBetween, normalizeBookingSource } from '../unified-inbox/inboxFormat';
import { T } from '../unified-inbox/_tokens';

interface LeadRow {
  id: string;
  threadId: string;
  guestName: string;
  listingName: string;
  channel: string;
  lastMessage: string;
  lastMessageTime?: string;
  unreadCount: number;
  hasReplied: boolean;
  reservationNumber: string;
  proposedCheckIn?: string;
  proposedCheckOut?: string;
  numberOfGuests?: number;
  totalPrice?: number;
  currency?: string;
}

export default function LeadsTabV2() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [active, setActive] = useState<LeadRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    void loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const response = await messagesService.getLeads({ limit: 50 });
      if (!response.threads) return;
      const rows: LeadRow[] = response.threads.map((item: any) => {
        const threadData = item.thread || item;
        const reservation = item.reservation || {};
        const messagesPreview = item.messages || [];
        let channel = threadData.communicationChannel || 'Unknown';
        if (channel.toLowerCase().includes('booking')) channel = 'Booking.com';
        else if (channel.toLowerCase().includes('airbnb')) channel = 'Airbnb';
        return {
          id: threadData._id,
          threadId: threadData.threadId,
          guestName: reservation.guestName || threadData.recipientName || 'Prospect',
          listingName: reservation.listingName || 'Listing',
          channel,
          lastMessage: threadData.preview || threadData.lastMessage || '',
          lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
          unreadCount: threadData.unreadCount || 0,
          hasReplied: messagesPreview.some((m: any) => !m.isIncoming),
          reservationNumber: reservation.reservationNumber || 'Lead',
          proposedCheckIn: reservation.arrivalDate,
          proposedCheckOut: reservation.departureDate,
          numberOfGuests: reservation.numberOfGuests,
          totalPrice: reservation.totalPrice,
          currency: reservation.currency || 'EUR',
        };
      });
      setLeads(rows);
    } catch (err) {
      console.error('❌ Erreur leads:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const now = Date.now();
    return leads.filter((l) => {
      if (filter === 'unreplied') return !l.hasReplied;
      if (filter === 'replied') return l.hasReplied;
      if (filter === 'airbnb') return l.channel.toLowerCase().includes('airbnb');
      if (filter === 'booking') return l.channel.toLowerCase().includes('booking');
      if (filter === 'recent') {
        return l.lastMessageTime && now - new Date(l.lastMessageTime).getTime() < 86400000;
      }
      return true;
    });
  }, [leads, filter]);

  const threads: Thread[] = useMemo(
    () =>
      filteredLeads.map((l) => {
        const ch = otaChannelFromName(l.channel);
        return {
          id: l.threadId,
          name: l.guestName,
          channel: ch,
          channelColor: otaChannelColor(ch),
          preview: l.lastMessage,
          time: formatThreadWhen(l.lastMessageTime),
          unread: l.unreadCount,
          avatarColor: '',
          listingName: l.listingName,
          reservationNumber: l.reservationNumber,
          checkInDate: l.proposedCheckIn,
          checkOutDate: l.proposedCheckOut,
          isAuto: l.lastMessage.startsWith('[Auto]'),
          stayBadge: 'Demande',
        };
      }),
    [filteredLeads],
  );

  const handleSelect = async (lead: LeadRow) => {
    setActive(lead);
    setLoadingMessages(true);
    setMessages([]);
    setMessagesLoadError(null);
    setMessagesTotal(0);
    try {
      const response = await messagesService.getLeadMessages(String(lead.threadId));
      const raw = extractOtaMessagesFromApiResponse(response);
      const total =
        typeof (response as { total?: number })?.total === 'number'
          ? (response as { total: number }).total
          : raw.length;
      setMessagesTotal(total);

      let mapped = mapOtaApiMessagesToInbox(raw, lead.guestName);
      if (mapped.length === 0 && lead.lastMessage?.trim()) {
        mapped = buildOtaPreviewFallbackMessages({
          threadId: lead.threadId,
          guestName: lead.guestName,
          lastMessage: lead.lastMessage,
          lastMessageTime: lead.lastMessageTime,
        } as Parameters<typeof buildOtaPreviewFallbackMessages>[0]);
      }
      setMessages(mapped);
    } catch (err) {
      console.error('❌ Erreur chargement messages lead:', err);
      setMessagesLoadError(err instanceof Error ? err.message : 'Erreur chargement messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const activeThread = active
    ? threads.find((th) => th.id === active.threadId) ?? null
    : null;

  const reservation: InboxReservationData | undefined = active
    ? {
        reservationNumber: active.reservationNumber,
        listingName: active.listingName,
        bookingSource: normalizeBookingSource(active.channel),
        otaPlatform: normalizeBookingSource(active.channel),
        reservationStatus: active.hasReplied ? 'Répondu' : 'Nouveau',
        leadStatus: active.hasReplied ? 'Répondu' : 'Demande',
        checkInDate: active.proposedCheckIn,
        checkOutDate: active.proposedCheckOut,
        checkInDisplay: active.proposedCheckIn
          ? new Date(active.proposedCheckIn).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : undefined,
        checkOutDisplay: active.proposedCheckOut
          ? new Date(active.proposedCheckOut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
          : undefined,
        nightsCount: nightsBetween(active.proposedCheckIn, active.proposedCheckOut),
        guestsLabel: active.numberOfGuests ? `${active.numberOfGuests} voyageurs` : undefined,
        totalPrice: active.totalPrice,
        currency: active.currency,
      }
    : undefined;

  const otaPlatform = active ? normalizeBookingSource(active.channel) : 'Airbnb';

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  if (leads.length === 0) {
    return (
      <InboxLayout>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gridColumn: '1 / -1' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune demande</Typography>
        </Box>
      </InboxLayout>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', gap: 0.75, mb: 1.5, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: 'Tout' },
          { id: 'unreplied', label: 'Non répondus' },
          { id: 'replied', label: 'Répondus' },
          { id: 'airbnb', label: '🏠 Airbnb' },
          { id: 'booking', label: '🏨 Booking' },
          { id: 'recent', label: '24h' },
        ].map((f) => (
          <Box
            key={f.id}
            component="button"
            onClick={() => setFilter(f.id)}
            sx={{
              px: 1.25,
              py: 0.5,
              borderRadius: '6px',
              border: `1px solid ${filter === f.id ? '#FF5A5F' : t.border}`,
              bgcolor: filter === f.id ? T.airbnbBg : T.bg1,
              color: filter === f.id ? '#c0353a' : t.text3,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {f.label}
          </Box>
        ))}
      </Box>

      <InboxLayout>
        <ThreadsList
          threads={threads}
          channels={[{ id: 'ab', label: 'Demande', icon: '🎯', color: '#FF5A5F', count: leads.length }]}
          listTitle="Demandes"
          mode="ota"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          onSelectThread={(th) => {
            const lead = filteredLeads.find((l) => l.threadId === th.id);
            if (lead) void handleSelect(lead);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread && active ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={messages}
              loadingMessages={loadingMessages}
              messagesLoadError={messagesLoadError}
              messagesTotal={messagesTotal}
              quickTemplates={OTA_QUICK_TEMPLATES}
              quickReplies={OTA_QUICK_REPLIES}
              otaPlatform={otaPlatform}
              onSendMessage={async (text) => {
                await messagesService.sendLeadMessage(active.threadId, text);
                await handleSelect(active);
              }}
              onSelectTemplate={() => {}}
              onAISuggestion={() => setShowAIModal(true)}
            />
            <ConversationDetails
              thread={activeThread}
              type="leads"
              reservation={reservation}
              onAction={() => {}}
            />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gridColumn: { xs: '1', lg: '2' } }}>
            <Typography sx={{ color: t.text3 }}>Sélectionnez une demande</Typography>
          </Box>
        )}
      </InboxLayout>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => active && void messagesService.sendLeadMessage(active.threadId, text)}
        context={{ guestName: active?.guestName, type: 'leads' }}
      />
    </>
  );
}
