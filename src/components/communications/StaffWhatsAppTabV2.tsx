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
import { useInboxStaffConversation } from '../../hooks/useInboxStaffConversation';
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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxStaffConversation();

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const response = await messagesService.getConversations({
          filter: 'smart',
          hasReservation: false,
          limit: 50,
        });
        if (response.status === 'success') {
          setConversations(response.data.conversations);
        }
      } catch (err) {
        console.error('❌ Erreur chargement staff:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelect = async (conv: Conversation) => {
    await inbox.selectStaffConversation(conv);
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
            const conv = conversations.find((c) => c.phone === thread.id);
            if (conv) void handleSelect(conv);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={inbox.loadingMessages ? [] : formattedMessages}
              quickTemplates={STAFF_TEMPLATES}
              onSendMessage={async (text) => {
                if (!inbox.activeConversation) return;
                await messagesService.sendMessage({
                  phone: inbox.activeConversation.phone,
                  message: text.trim(),
                });
                await handleSelect(inbox.activeConversation);
              }}
              onSelectTemplate={(tpl) =>
                tpl.text &&
                inbox.activeConversation &&
                void messagesService.sendMessage({
                  phone: inbox.activeConversation.phone,
                  message: tpl.text,
                })
              }
              onAISuggestion={() => setShowAIModal(true)}
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
          if (inbox.activeConversation) {
            void messagesService.sendMessage({
              phone: inbox.activeConversation.phone,
              message: text,
            });
          }
        }}
        context={{
          conversationHistory: inbox.messages,
          guestName: inbox.activeConversation?.name,
          type: 'staff',
        }}
      />
    </>
  );
}









