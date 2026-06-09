import { useEffect, useMemo, useState } from 'react';
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
import { buildInboxMessages, WA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import { formatThreadWhen } from '../unified-inbox/inboxFormat';

function isOtaChannel(ch?: string): boolean {
  const c = (ch || '').toLowerCase();
  if (!c || c.includes('whatsapp') || c === 'wa') return false;
  return c.includes('airbnb') || c.includes('booking') || c.includes('vrbo') || c === 'ab' || c === 'bk';
}

export default function WhatsAppTabV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxConversation();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await messagesService.getConversations({
          filter: 'smart',
          hasReservation: true,
          limit: 100,
        });
        if (response.status === 'success') {
          setConversations(
            response.data.conversations
              .filter((c) => !isOtaChannel(c.channel_name))
              .map((c) => ({
                ...c,
                reservation_number: c.reservation_number || c.reservation_id,
              })),
          );
        }
      } catch (err) {
        console.error('❌ Erreur chargement conversations:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (conv: Conversation) => {
    await inbox.selectConversation(conv);
  };

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
        const base = mapConversationToThread(conv, { channel: 'wa', channelColor: '#25D366' });
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
  const unreadTotal = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

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
          channels={[{ id: 'wa', label: 'WhatsApp', icon: '💬', color: '#25D366', count: conversations.length }]}
          listTitle="WhatsApp"
          mode="whatsapp"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          onSelectThread={(thread) => {
            const conv = conversations.find((c) => c.phone === thread.id);
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
              onSendMessage={async (text) => {
                if (!inbox.activeConversation) return;
                await messagesService.sendMessage({
                  phone: inbox.activeConversation.phone,
                  message: text.trim(),
                });
                await handleSelect(inbox.activeConversation);
              }}
              onSelectTemplate={(tpl) => tpl.text && void messagesService.sendMessage({
                phone: inbox.activeConversation!.phone,
                message: tpl.text,
              })}
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
        onUseSuggestion={(text) => {
          if (inbox.activeConversation) {
            void messagesService.sendMessage({ phone: inbox.activeConversation.phone, message: text });
          }
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
