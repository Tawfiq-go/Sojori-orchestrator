import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import type { Thread } from '../../types/unifiedInbox.types';
import { useInboxOTAConversation } from '../../hooks/useInboxOTAConversation';
import {
  filterOtaThreadsByStatus,
  mapApiItemToOtaThread,
  mapOtaRowToThread,
  type OtaThreadRow,
} from '../unified-inbox/inboxOtaMappers';
import { OTA_QUICK_REPLIES, OTA_QUICK_TEMPLATES } from '../unified-inbox/inboxMessages';
import { formatThreadWhen, normalizeBookingSource } from '../unified-inbox/inboxFormat';

export default function MessagesOTATabV2() {
  const [threads, setThreads] = useState<OtaThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const inbox = useInboxOTAConversation();

  const loadThreads = useCallback(async (search?: string) => {
    try {
      setLoading(true);
      const response = await messagesService.getOTAThreads({
        page: 0,
        limit: 50,
        search: search?.trim() || undefined,
      });
      const items = response.threads || response.data?.threads || [];
      const mapped = items.map(mapApiItemToOtaThread);
      setThreads(filterOtaThreadsByStatus(mapped));
    } catch (err) {
      console.error('❌ Erreur chargement threads OTA:', err);
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadThreads(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, loadThreads]);

  useEffect(() => {
    if (inbox.activeRow) {
      setTaskCounts((prev) => ({
        ...prev,
        [inbox.activeRow!.threadId]: inbox.tasks.length,
      }));
    }
  }, [inbox.tasks, inbox.activeRow]);

  const formattedThreads: Thread[] = useMemo(
    () =>
      threads.map((row) => ({
        ...mapOtaRowToThread(row, taskCounts[row.threadId]),
        time: formatThreadWhen(row.lastMessageTime),
      })),
    [threads, taskCounts],
  );

  const activeThread: Thread | null = useMemo(() => {
    if (!inbox.activeRow) return null;
    return {
      ...mapOtaRowToThread(inbox.activeRow, inbox.tasks.length),
      preview: '',
      unread: 0,
      guestsLabel: inbox.reservation?.guestsLabel,
      taskCount: inbox.tasks.length,
      tasks: inbox.tasks,
      tasksLoading: inbox.loadingTasks,
    };
  }, [inbox.activeRow, inbox.tasks, inbox.loadingTasks, inbox.reservation]);

  const otaPlatform = inbox.activeRow
    ? normalizeBookingSource(inbox.activeRow.channel)
    : 'Airbnb';

  const handleSelect = async (row: OtaThreadRow) => {
    await inbox.selectOtaThread(row);
  };

  if (loading && threads.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress size={32} sx={{ color: t.primary }} />
      </Box>
    );
  }

  if (!loading && threads.length === 0) {
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
          <Typography sx={{ fontSize: 48 }}>🏨</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucun message OTA</Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Les threads confirmés apparaissent ici (API rentals/get-thread).
          </Typography>
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
            { id: 'ab', label: 'OTA', icon: '🏨', color: '#FF5A5F', count: threads.length },
          ]}
          listTitle="Messages OTA"
          mode="ota"
          activeThreadId={activeThread?.id ?? null}
          searchTerm={searchTerm}
          onSelectThread={(thread) => {
            const row = threads.find((r) => r.threadId === thread.id);
            if (row) void handleSelect(row);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={inbox.loadingMessages ? [] : inbox.messages}
              quickTemplates={OTA_QUICK_TEMPLATES}
              quickReplies={OTA_QUICK_REPLIES}
              otaPlatform={otaPlatform}
              onSendMessage={async (text) => {
                if (!inbox.activeRow) return;
                await messagesService.sendOTAMessage(inbox.activeRow.threadId, text.trim());
                await handleSelect(inbox.activeRow);
              }}
              onSelectTemplate={(tpl) => {
                if (tpl.text && inbox.activeRow) {
                  void messagesService.sendOTAMessage(inbox.activeRow.threadId, tpl.text);
                }
              }}
              onAISuggestion={() => setShowAIModal(true)}
            />
            <ConversationDetails
              thread={activeThread}
              type="ota"
              reservation={inbox.reservation ?? undefined}
              onAction={(action) => {
                if (action === 'view-platform') {
                  console.log('Ouvrir sur', otaPlatform);
                }
              }}
            />
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
            <Typography sx={{ fontSize: 48 }}>📨</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              Sélectionnez un message OTA
            </Typography>
          </Box>
        )}
      </InboxLayout>

      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => {
          if (inbox.activeRow) {
            void messagesService.sendOTAMessage(inbox.activeRow.threadId, text);
          }
        }}
        context={{
          conversationHistory: [],
          guestName: inbox.activeRow?.guestName,
          reservationNumber: inbox.reservation?.reservationNumber,
          type: 'ota',
        }}
      />
    </>
  );
}
