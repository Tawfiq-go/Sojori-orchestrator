import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import { staffOutboundExchange } from '../../services/staffConversationMapper';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import { findConversationByThreadId } from '../../utils/conversationThreadId';
import type { Conversation } from '../../types/messages.types';
import type { Thread } from '../../types/unifiedInbox.types';
import { useInboxStaffConversation } from '../../hooks/useInboxStaffConversation';
import { useInboxRealtimeRefresh } from '../../hooks/useInboxRealtimeRefresh';
import { mapConversationToThread } from '../unified-inbox/inboxMappers';
import { buildInboxMessages } from '../unified-inbox/inboxMessages';
import { formatThreadWhen } from '../unified-inbox/inboxFormat';
import type { QuickTemplate } from '../../types/unifiedInbox.types';

const STAFF_TEMPLATES: QuickTemplate[] = [
  { id: 's1', label: '✅ Tâche assignée', icon: '✅', text: 'Nouvelle tâche assignée : ' },
  { id: 's2', label: '🕐 Rappel horaire', icon: '🕐', text: "Rappel : n'oubliez pas…" },
  { id: 's3', label: '📋 Instructions', icon: '📋', text: 'Voici les instructions : ' },
  { id: 's4', label: '📍 Lieu', icon: '📍', text: 'Adresse du logement : ' },
];

export default function StaffWhatsAppTabV2() {
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [composerDraft, setComposerDraft] = useState('');
  const [aiSourceDraft, setAiSourceDraft] = useState('');
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxStaffConversation();

  const loadStaffConversations = useCallback(async () => {
    if (!scopeFetchReady) {
      setConversations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const response = await messagesService.getConversations({
        filter: 'smart',
        hasReservation: false,
        limit: 50,
        owner_id: requestOwnerId || undefined,
      });
      if (response.status === 'success') {
        setConversations(response.data.conversations);
      }
    } catch {
      /* échec déjà loggé par apiClient (HTTP) */
    } finally {
      setLoading(false);
    }
  }, [scopeFetchReady, requestOwnerId]);

  useEffect(() => {
    void loadStaffConversations();
  }, [loadStaffConversations]);

  useInboxRealtimeRefresh(
    'staff',
    () => loadStaffConversations(),
    () => {
      if (inbox.activeConversation) void inbox.refreshStaffMessages();
    },
  );

  const handleSelect = async (conv: Conversation) => {
    setComposerDraft('');
    setAiSourceDraft('');
    await inbox.selectStaffConversation(conv);
  };

  const bumpConversationPreview = useCallback((phone: string, text: string) => {
    const exchange = staffOutboundExchange(text);
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.phone === phone);
      if (idx < 0) return prev;
      const conv = prev[idx];
      const staff = [...(conv.staff_exchanges || conv.recent_exchanges || []), exchange];
      const updated: Conversation = {
        ...conv,
        last_message_time: exchange.timestamp,
        messages_count: (conv.messages_count || 0) + 1,
        exchanges_count: (conv.exchanges_count || 0) + 1,
        staff_exchanges: staff,
        recent_exchanges: staff.slice(-5),
      };
      return [updated, ...prev.filter((_, i) => i !== idx)];
    });
  }, []);

  const handleStaffSend = useCallback(
    async (text: string) => {
      if (!inbox.activeConversation) return;
      const trimmed = text.trim();
      if (!trimmed) return;
      const phone = inbox.activeConversation.phone;
      inbox.appendOutboundMessage(trimmed);
      bumpConversationPreview(phone, trimmed);
      try {
        await messagesService.sendMessage({ phone, message: trimmed }, 'staff');
        void inbox.refreshStaffMessages(phone);
      } catch (err) {
        inbox.removeLastOutboundMessage();
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.phone === phone);
          if (idx < 0) return prev;
          const conv = prev[idx];
          const staff = (conv.staff_exchanges || conv.recent_exchanges || []).slice(0, -1);
          const last = staff[staff.length - 1];
          const updated: Conversation = {
            ...conv,
            staff_exchanges: staff,
            recent_exchanges: staff.slice(-5),
            messages_count: Math.max(0, (conv.messages_count || 1) - 1),
            exchanges_count: Math.max(0, (conv.exchanges_count || 1) - 1),
            last_message_time: last?.timestamp || conv.last_message_time,
          };
          return prev.map((c, i) => (i === idx ? updated : c));
        });
        throw err;
      }
    },
    [inbox, bumpConversationPreview],
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
      conversations.map((conv) => {
        const base = mapConversationToThread(conv, {
          channel: 'wa',
          channelColor: '#25D366',
          isStaff: true,
        });
        return {
          ...base,
          time: formatThreadWhen(conv.last_message_time),
          taskCount: taskCounts[conv.phone],
        };
      }),
    [conversations, taskCounts],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeConversation) return null;
    const base = mapConversationToThread(inbox.activeConversation, {
      channel: 'wa',
      channelColor: '#25D366',
      isStaff: true,
    });
    return {
      ...base,
      preview: '',
      unread: 0,
      guestPresence: 'En ligne',
      listingName:
        inbox.matchedStaff?.username || inbox.activeConversation.listing_name,
      taskCount: inbox.tasks.length,
      tasks: inbox.tasks,
      tasksLoading: inbox.loadingTasks,
    };
  }, [
    inbox.activeConversation,
    inbox.matchedStaff,
    inbox.tasks,
    inbox.loadingTasks,
  ]);

  const formattedMessages = buildInboxMessages(inbox.messages, false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  if (conversations.length === 0) {
    return (
      <InboxLayout>
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column',
            gap: 2,
            gridColumn: '1 / -1',
          }}
        >
          <Typography sx={{ fontSize: 48 }}>👷</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune conversation staff</Typography>
        </Box>
      </InboxLayout>
    );
  }

  return (
    <>
      <InboxLayout>
        <ThreadsList
          threads={formattedThreads}
          channels={[
            { id: 'wa', label: 'Staff', icon: '👷', color: '#25D366', count: conversations.length },
          ]}
          listTitle="Staff WhatsApp"
          mode="whatsapp"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          onSelectThread={(thread) => {
            const conv = findConversationByThreadId(conversations, String(thread.id));
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
              quickTemplates={STAFF_TEMPLATES}
              composerValue={composerDraft}
              onComposerValueChange={setComposerDraft}
              onSendMessage={handleStaffSend}
              onSelectTemplate={async (tpl) => {
                if (tpl.text) await handleStaffSend(tpl.text);
              }}
              onAISuggestion={(draft) => {
                setAiSourceDraft(draft);
                setShowAIModal(true);
              }}
            />
            <ConversationDetails thread={activeThread} type="staff" />
          </>
        ) : (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2,
              gridColumn: { xs: '1', lg: '2' },
            }}
          >
            <Typography sx={{ fontSize: 48 }}>👷</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              Sélectionnez un contact staff
            </Typography>
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
        context={{
          threadContext: inbox.messages
            .map((ex) => {
              const parts: string[] = [];
              if (ex.user_message?.trim()) {
                parts.push(`${ex.sent_by_admin ? 'Staff' : 'Client'}: ${ex.user_message.trim()}`);
              }
              if (ex.ai_response?.trim()) {
                parts.push(`Staff: ${ex.ai_response.trim()}`);
              }
              return parts.join('\n');
            })
            .filter(Boolean)
            .join('\n'),
          lastGuestMessage: [...inbox.messages]
            .reverse()
            .find((ex) => ex.user_message?.trim() && !ex.sent_by_admin)?.user_message,
          draft: aiSourceDraft,
          guestName: inbox.activeConversation?.name,
          type: 'staff',
        }}
      />
    </>
  );
}








