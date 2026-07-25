import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import { useCommsHubChrome } from './CommsHubChromeContext';
import messagesService from '../../services/messagesService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { useInboxRealtimeRefresh } from '../../hooks/useInboxRealtimeRefresh';
import type { Thread, Message } from '../../types/unifiedInbox.types';
import type { InboxReservationData } from '../../types/inboxReservation.types';
import { otaChannelColor, otaChannelFromName } from '../unified-inbox/inboxMappers';
import { OTA_QUICK_REPLIES, OTA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import {
  buildOtaPreviewFallbackMessages,
  extractOtaMessagesFromApiResponse,
  mapOtaApiMessagesToInbox,
} from '../unified-inbox/inboxOtaMappers';
import {
  buildOtaThreadContextForAi,
  getLastGuestMessageFromInbox,
} from '../../services/communicationsAi.helpers';
import { formatThreadWhen, nightsBetween, normalizeBookingSource } from '../unified-inbox/inboxFormat';
import { T } from '../unified-inbox/_tokens';

const LEAD_FILTERS = [
  { id: 'all', label: 'Tout' },
  { id: 'unreplied', label: 'Non rép.' },
  { id: 'replied', label: 'Répondus' },
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'booking', label: 'Booking' },
  { id: 'recent', label: '24h' },
] as const;

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
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const { setLeading, setSubBar } = useCommsHubChrome();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [active, setActive] = useState<LeadRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesTotal, setMessagesTotal] = useState(0);
  const [messagesLoadError, setMessagesLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [filter, setFilter] = useState('all');
  const activeRef = useRef<LeadRow | null>(null);
  activeRef.current = active;

  const loadLeads = useCallback(async () => {
    if (!scopeFetchReady) {
      setLeads([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await messagesService.getLeads({
        limit: 50,
        ownerId: requestOwnerId || undefined,
      });
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
  }, [scopeFetchReady, requestOwnerId]);

  const refreshActiveLeadMessages = useCallback(async () => {
    const lead = activeRef.current;
    if (!lead) return;
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
      setMessages((prev) => (mapped.length >= prev.length ? mapped : prev));
    } catch (err) {
      console.error('❌ Erreur refresh messages lead:', err);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  useInboxRealtimeRefresh('leads', () => loadLeads(), () => refreshActiveLeadMessages());

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

  /* Barre hub : Demandes + recherche (petit bloc, place de Guest) ; chips juste en dessous. */
  useEffect(() => {
    setLeading(
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          width: '100%',
          maxWidth: 520,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 800,
            color: T.text,
            flexShrink: 0,
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}
        >
          🎯 Demandes
        </Typography>
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            fontWeight: 700,
            px: 0.75,
            py: '2px',
            borderRadius: 999,
            bgcolor: T.airbnbBg,
            color: '#c0353a',
            flexShrink: 0,
          }}
        >
          {filteredLeads.length}
        </Box>
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: '8px',
            py: '4px',
            bgcolor: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: '8px',
            '&:focus-within': {
              borderColor: T.primary,
              boxShadow: `0 0 0 2px ${T.primaryTint}`,
            },
          }}
        >
          <Box sx={{ fontSize: 12, color: T.text3, lineHeight: 1 }}>🔍</Box>
          <Box
            component="input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Résa, listing, voyageur, tél., owner…"
            sx={{
              flex: 1,
              minWidth: 0,
              border: 0,
              outline: 0,
              font: 'inherit',
              fontSize: 11.5,
              color: T.text,
              bgcolor: 'transparent',
              '&::placeholder': { color: T.text4 },
            }}
          />
        </Box>
      </Box>,
    );
  }, [setLeading, filteredLeads.length, searchTerm]);

  useEffect(() => {
    setSubBar(
      <Box sx={{ display: 'flex', gap: '3px', flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' } }}>
        {LEAD_FILTERS.map((f) => (
          <Box
            key={f.id}
            component="button"
            type="button"
            onClick={() => setFilter(f.id)}
            sx={{
              px: 0.875,
              py: 0.3,
              borderRadius: '6px',
              border: `1px solid ${filter === f.id ? '#FF5A5F' : T.border}`,
              bgcolor: filter === f.id ? T.airbnbBg : T.bg1,
              color: filter === f.id ? '#c0353a' : T.text3,
              fontSize: 10,
              fontWeight: 650,
              cursor: 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              lineHeight: 1.2,
            }}
          >
            {f.label}
          </Box>
        ))}
      </Box>,
    );
  }, [setSubBar, filter]);

  useEffect(
    () => () => {
      setLeading(null);
      setSubBar(null);
    },
    [setLeading, setSubBar],
  );

  const handleSelect = async (lead: LeadRow) => {
    setComposerDraft('');
    setAiSourceDraft('');
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

  const leadsThreadContext = useMemo(() => {
    const built = buildOtaThreadContextForAi(messages);
    if (built.trim()) return built;
    if (active?.lastMessage?.trim()) {
      return `Client: ${active.lastMessage.trim()}`;
    }
    return '';
  }, [messages, active?.lastMessage]);

  const leadsLastGuestMessage = useMemo(() => {
    const fromThread = getLastGuestMessageFromInbox(messages);
    if (fromThread) return fromThread;
    return active?.lastMessage?.trim() || '';
  }, [messages, active?.lastMessage]);

  const handleLeadSend = useCallback(
    async (text: string) => {
      if (!active) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      await messagesService.sendLeadMessage(active.threadId, trimmed);
      await handleSelect(active);
    },
    [active, handleSelect],
  );

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
    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <InboxLayout fillViewport>
        <ThreadsList
          threads={threads}
          channels={[{ id: 'ab', label: 'Demande', icon: '🎯', color: '#FF5A5F', count: leads.length }]}
          listTitle="Demandes"
          mode="ota"
          hideListHeader
          ultraCompact
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
              composerValue={composerDraft}
              onComposerValueChange={setComposerDraft}
              onSendMessage={handleLeadSend}
              onSelectTemplate={() => {}}
              onAISuggestion={(draft) => {
                setAiSourceDraft(draft);
                setShowAIModal(true);
              }}
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
        onUseSuggestion={(text) => {
          setComposerDraft(text);
          setShowAIModal(false);
        }}
        onSendSuggestion={async (text) => {
          await handleLeadSend(text);
          setComposerDraft('');
          setShowAIModal(false);
        }}
        context={{
          threadContext: leadsThreadContext,
          lastGuestMessage: leadsLastGuestMessage,
          draft: aiSourceDraft,
          guestName: active?.guestName,
          reservationNumber: active?.reservationNumber,
          channelName: otaPlatform,
          type: 'leads',
        }}
      />
    </Box>
  );
}
