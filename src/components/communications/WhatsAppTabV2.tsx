import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import type { Conversation } from '../../types/messages.types';
import type { Thread } from '../../types/unifiedInbox.types';
import { useInboxConversation } from '../../hooks/useInboxConversation';
import { mapConversationToThread } from '../unified-inbox/inboxMappers';
import { enrichThreadFromReservation } from '../unified-inbox/inboxReservationEnrichment';
import { buildInboxMessages, outboundInboxExchange, WA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import { formatThreadWhen } from '../unified-inbox/inboxFormat';
import {
  applyWaInboxFilters,
  countWaFilters,
  countWaStayQuickFilters,
  type WaChannelFilter,
  type WaStayQuickFilter,
} from '../unified-inbox/waThreadFilters';

const WA_INBOX_LIMIT = 100;
const GLOBAL_SEARCH_MIN_LEN = 2;
const GLOBAL_SEARCH_DEBOUNCE_MS = 500;

function isOtaChannel(ch?: string): boolean {
  const c = (ch || '').toLowerCase();
  if (!c || c.includes('whatsapp') || c === 'wa') return false;
  return c.includes('airbnb') || c.includes('booking') || c.includes('vrbo') || c === 'ab' || c === 'bk';
}

function normalizeConversations(raw: Conversation[]): Conversation[] {
  return raw
    .filter((c) => !isOtaChannel(c.channel_name))
    .map((c) => ({
      ...c,
      reservation_number: c.reservation_number || c.reservation_id,
    }));
}

export default function WhatsAppTabV2() {
  const [inboxConversations, setInboxConversations] = useState<Conversation[]>([]);
  const [searchConversations, setSearchConversations] = useState<Conversation[]>([]);
  const [searchMode, setSearchMode] = useState<'none' | 'global'>('none');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalSearchPending, setGlobalSearchPending] = useState(false);
  const [waChannelFilter, setWaChannelFilter] = useState<WaChannelFilter>('all');
  const [waStayQuickFilter, setWaStayQuickFilter] = useState<WaStayQuickFilter>('none');
  const [waUnreadOnly, setWaUnreadOnly] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const globalSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const globalSearchRequestIdRef = useRef(0);
  const loadRequestIdRef = useRef(0);

  const inbox = useInboxConversation();

  const loadInbox = useCallback(async () => {
    const requestId = ++loadRequestIdRef.current;
    try {
      setLoading(true);
      const response = await messagesService.getConversations({
        filter: 'smart',
        limit: WA_INBOX_LIMIT,
      });
      if (requestId !== loadRequestIdRef.current) return;
      if (response.status === 'success') {
        setInboxConversations(normalizeConversations(response.data.conversations));
        setSearchConversations([]);
        setSearchMode('none');
      }
    } catch (err) {
      if (requestId !== loadRequestIdRef.current) return;
      console.error('❌ Erreur chargement conversations:', err);
    } finally {
      if (requestId === loadRequestIdRef.current) setLoading(false);
    }
  }, []);

  const loadServerSearch = useCallback(async (query: string) => {
    const requestId = ++globalSearchRequestIdRef.current;
    try {
      setSearchLoading(true);
      const response = await messagesService.getConversations({
        filter: 'smart',
        limit: WA_INBOX_LIMIT,
        search: query,
      });
      if (requestId !== globalSearchRequestIdRef.current) return;
      if (response.status === 'success') {
        setSearchConversations(normalizeConversations(response.data.conversations));
        setSearchMode('global');
      } else {
        setSearchConversations([]);
      }
    } catch (err) {
      if (requestId !== globalSearchRequestIdRef.current) return;
      console.error('❌ Erreur recherche WhatsApp:', err);
      setSearchConversations([]);
    } finally {
      if (requestId === globalSearchRequestIdRef.current) {
        setGlobalSearchPending(false);
        setSearchLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (globalSearchDebounceRef.current) {
      clearTimeout(globalSearchDebounceRef.current);
      globalSearchDebounceRef.current = null;
    }

    if (!q) {
      setGlobalSearchPending(false);
      setSearchMode((mode) => {
        if (mode === 'global') {
          setSearchConversations([]);
          return 'none';
        }
        return mode;
      });
      return;
    }

    if (q.length < GLOBAL_SEARCH_MIN_LEN) {
      setGlobalSearchPending(false);
      return;
    }

    setGlobalSearchPending(true);
    globalSearchDebounceRef.current = setTimeout(() => {
      void loadServerSearch(q);
    }, GLOBAL_SEARCH_DEBOUNCE_MS);

    return () => {
      if (globalSearchDebounceRef.current) {
        clearTimeout(globalSearchDebounceRef.current);
        globalSearchDebounceRef.current = null;
      }
    };
  }, [searchTerm, loadServerSearch]);

  const waGlobalQueryActive = searchTerm.trim().length >= GLOBAL_SEARCH_MIN_LEN;

  const baseConversations = useMemo(() => {
    if (waGlobalQueryActive || searchMode !== 'none') return searchConversations;
    return inboxConversations;
  }, [waGlobalQueryActive, searchMode, searchConversations, inboxConversations]);

  const waFilterCounts = useMemo(() => countWaFilters(baseConversations), [baseConversations]);

  const waStayQuickCounts = useMemo(() => {
    const scoped = applyWaInboxFilters(baseConversations, waChannelFilter, waUnreadOnly, 'none');
    return countWaStayQuickFilters(scoped);
  }, [baseConversations, waChannelFilter, waUnreadOnly]);

  const waFiltersActive = useMemo(
    () =>
      waGlobalQueryActive ||
      waChannelFilter !== 'all' ||
      waStayQuickFilter !== 'none' ||
      waUnreadOnly,
    [waGlobalQueryActive, waChannelFilter, waStayQuickFilter, waUnreadOnly],
  );

  const displayConversations = useMemo(
    () =>
      applyWaInboxFilters(
        baseConversations,
        waChannelFilter,
        waUnreadOnly,
        waStayQuickFilter,
      ),
    [baseConversations, waChannelFilter, waUnreadOnly, waStayQuickFilter],
  );

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setWaChannelFilter('all');
    setWaStayQuickFilter('none');
    setWaUnreadOnly(false);
    setSearchConversations([]);
    setSearchMode('none');
  };

  const handleSelect = async (conv: Conversation) => {
    await inbox.selectConversation(conv);
  };

  const bumpConversationPreview = useCallback((phone: string, text: string) => {
    const exchange = outboundInboxExchange(text);
    const bump = (list: Conversation[]) => {
      const idx = list.findIndex((c) => c.phone === phone);
      if (idx < 0) return list;
      const conv = list[idx];
      const recent = [...(conv.recent_exchanges || []), exchange];
      const updated: Conversation = {
        ...conv,
        last_message_time: exchange.timestamp,
        messages_count: (conv.messages_count || 0) + 1,
        exchanges_count: (conv.exchanges_count || 0) + 1,
        recent_exchanges: recent.slice(-5),
      };
      return [updated, ...list.filter((_, i) => i !== idx)];
    };
    setInboxConversations((prev) => bump(prev));
    setSearchConversations((prev) => bump(prev));
  }, []);

  const revertConversationPreview = useCallback((phone: string) => {
    const revert = (list: Conversation[]) => {
      const idx = list.findIndex((c) => c.phone === phone);
      if (idx < 0) return list;
      const conv = list[idx];
      const recent = (conv.recent_exchanges || []).slice(0, -1);
      const last = recent[recent.length - 1];
      const updated: Conversation = {
        ...conv,
        recent_exchanges: recent,
        messages_count: Math.max(0, (conv.messages_count || 1) - 1),
        exchanges_count: Math.max(0, (conv.exchanges_count || 1) - 1),
        last_message_time: last?.timestamp || conv.last_message_time,
      };
      return list.map((c, i) => (i === idx ? updated : c));
    };
    setInboxConversations((prev) => revert(prev));
    setSearchConversations((prev) => revert(prev));
  }, []);

  const handleGuestSend = useCallback(
    async (text: string) => {
      if (!inbox.activeConversation) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const phone = inbox.activeConversation.phone;
      const conv = inbox.activeConversation;
      inbox.appendOutboundMessage(trimmed);
      bumpConversationPreview(phone, trimmed);
      try {
        await messagesService.sendMessage({ phone, message: trimmed });
        void inbox.refreshMessages(conv);
      } catch (err) {
        inbox.removeLastOutboundMessage();
        revertConversationPreview(phone);
        throw err;
      }
    },
    [inbox, bumpConversationPreview, revertConversationPreview],
  );

  useEffect(() => {
    if (inbox.activeConversation) {
      setTaskCounts((prev) => ({
        ...prev,
        [inbox.activeConversation!.phone]: inbox.tasks.length,
      }));
    }
  }, [inbox.tasks, inbox.activeConversation]);

  const formattedThreads: Thread[] = useMemo(
    () =>
      displayConversations.map((conv) => {
        const base = mapConversationToThread(conv, { channel: 'wa', channelColor: '#25D366' });
        return {
          ...base,
          time: formatThreadWhen(conv.last_message_time),
          taskCount: taskCounts[conv.phone],
        };
      }),
    [displayConversations, taskCounts],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeConversation) return null;
    const base = mapConversationToThread(inbox.activeConversation, {
      channel: 'wa',
      channelColor: '#25D366',
    });
    return enrichThreadFromReservation(
      {
        ...base,
        preview: '',
        unread: 0,
        guestPresence: 'En ligne',
        taskCount: inbox.tasks.length,
        tasks: inbox.tasks,
        tasksLoading: inbox.loadingTasks,
      },
      inbox.activeConversation,
      inbox.reservation,
      inbox.rawReservation,
    );
  }, [inbox.activeConversation, inbox.tasks, inbox.loadingTasks, inbox.reservation, inbox.rawReservation]);

  const formattedMessages = buildInboxMessages(inbox.messages, false);
  const unreadTotal = inboxConversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  if (loading && inboxConversations.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  if (inboxConversations.length === 0 && searchMode === 'none' && !searchTerm.trim()) {
    return (
      <InboxLayout>
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2, gridColumn: '1 / -1' }}>
          <Typography sx={{ fontSize: 48 }}>💬</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune conversation</Typography>
        </Box>
      </InboxLayout>
    );
  }

  return (
    <>
      <InboxLayout>
        <ThreadsList
          threads={formattedThreads}
          channels={[{ id: 'wa', label: 'WhatsApp', icon: '💬', color: '#25D366', count: displayConversations.length }]}
          listTitle="WhatsApp"
          mode="whatsapp"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          loading={searchLoading || globalSearchPending}
          waListTotalCount={displayConversations.length}
          waGlobalSearchActive={waGlobalQueryActive}
          waSearchPending={globalSearchPending}
          waChannelFilter={waChannelFilter}
          onWaChannelFilterChange={setWaChannelFilter}
          waUnreadOnly={waUnreadOnly}
          onWaUnreadOnlyChange={setWaUnreadOnly}
          waFilterCounts={waFilterCounts}
          waStayQuickFilter={waStayQuickFilter}
          onWaStayQuickFilterChange={setWaStayQuickFilter}
          waStayQuickCounts={waStayQuickCounts}
          waFiltersActive={waFiltersActive}
          onWaResetAll={handleResetAllFilters}
          onSelectThread={(thread) => {
            const conv = displayConversations.find((c) => c.phone === thread.id);
            if (conv) void handleSelect(conv);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={formattedMessages}
              loadingMessages={inbox.loadingMessages}
              quickTemplates={WA_QUICK_TEMPLATES}
              onSendMessage={handleGuestSend}
              onSelectTemplate={async (tpl) => {
                if (tpl.text) await handleGuestSend(tpl.text);
              }}
              onAISuggestion={() => setShowAIModal(true)}
            />
            <ConversationDetails
              thread={activeThread}
              type="whatsapp"
              reservation={inbox.reservation ?? undefined}
              onAction={(action) => {
                if (action === 'view-full-reservation' && inbox.reservation?.reservationNumber) {
                  window.open(`/reservations/${inbox.reservation.reservationNumber}`, '_blank');
                }
              }}
            />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2, gridColumn: { xs: '1', lg: '2' } }}>
            <Typography sx={{ fontSize: 48 }}>💬</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              Sélectionnez une conversation
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              {unreadTotal} non lues · choisissez un guest
            </Typography>
          </Box>
        )}
      </InboxLayout>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={async (text) => {
          setShowAIModal(false);
          await handleGuestSend(text);
        }}
        context={{
          conversationHistory: inbox.messages,
          guestName: inbox.activeConversation?.name,
          reservationNumber: inbox.reservation?.reservationNumber,
          type: 'whatsapp',
        }}
      />
    </>
  );
}
