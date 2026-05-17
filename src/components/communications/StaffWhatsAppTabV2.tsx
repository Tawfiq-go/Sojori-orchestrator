import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../dashboard/DashboardV2.components';
import InboxLayout from '../unified-inbox/InboxLayout';
import ThreadsList from '../unified-inbox/ThreadsList';
import ConversationThread from '../unified-inbox/ConversationThread';
import ConversationDetails from '../unified-inbox/ConversationDetails';
import AISuggestionModal from './AISuggestionModal';
import messagesService from '../../services/messagesService';
import type {
  Conversation,
  MessageExchange,
  ConversationDetailResponse,
} from '../../types/messages.types';
import type { Thread, Message, QuickTemplate } from '../../types/unifiedInbox.types';

/**
 * StaffWhatsAppTabV2 - Onglet WhatsApp Staff avec nouveau design
 * Utilisé dans CommunicationsHubPage pour les conversations staff
 */
export default function StaffWhatsAppTabV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const response = await messagesService.getConversations({
        filter: 'smart',
        hasReservation: false,
        limit: 50,
      });

      if (response.status === 'success') {
        setConversations(response.data.conversations);
        // ✅ RÈGLE 1: Ne PAS sélectionner automatiquement la première conversation
      }
    } catch (err) {
      console.error('❌ Erreur chargement conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setLoadingMessages(true);

    try {
      const response: ConversationDetailResponse = await messagesService.getConversationMessages(
        conv.phone,
        { limit: 50 }
      );

      if (response.status === 'success') {
        setMessages(response.data.exchanges);
      }
    } catch (err) {
      console.error('❌ Erreur chargement messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation) return;
    try {
      await messagesService.sendMessage({
        phone: activeConversation.phone,
        message: text.trim(),
      });
      await handleSelectConversation(activeConversation);
    } catch (err) {
      console.error('❌ Erreur envoi message:', err);
    }
  };

  const formattedThreads: Thread[] = conversations.map((conv) => ({
    id: conv.phone,
    name: conv.name || conv.phone,
    phone: conv.phone,
    channel: 'wa',
    channelColor: '#25D366',
    preview: conv.recent_exchanges[0]?.user_message || 'Aucun message',
    time: formatRelativeTime(conv.last_message_time),
    unread: conv.unread_count,
    avatarColor: getAvatarColor(conv.name),
    listingName: conv.listing_name,
    checkInDate: conv.checkin_date,
  }));

  const formattedMessages: Message[] = messages.flatMap((exchange, index) => {
    const msgs: Message[] = [];
    if (index === 0 || isDifferentDay(exchange.timestamp, messages[index - 1]?.timestamp)) {
      msgs.push({
        id: `day-${index}`,
        from: 'guest',
        text: formatDayLabel(exchange.timestamp),
        time: '',
        type: 'day-separator',
      });
    }
    if (exchange.user_message) {
      msgs.push({
        id: `user-${index}`,
        from: exchange.sent_by_admin ? 'you' : 'guest',
        text: exchange.user_message,
        time: formatTime(exchange.timestamp),
      });
    }
    if (exchange.ai_response) {
      msgs.push({
        id: `ai-${index}`,
        from: 'sojori',
        text: exchange.ai_response,
        time: formatTime(exchange.timestamp),
        isAI: true,
      });
    }
    return msgs;
  });

  const quickTemplates: QuickTemplate[] = [
    { id: '1', label: '✅ Tâche assignée', icon: '✅', text: 'Nouvelle tâche assignée : ' },
    { id: '2', label: '🕐 Rappel horaire', icon: '🕐', text: 'Rappel : N\'oubliez pas...' },
    { id: '3', label: '📋 Instructions', icon: '📋', text: 'Voici les instructions : ' },
  ];

  const mockChannel = [{ id: 'wa', label: 'WhatsApp', icon: '💬', color: '#25D366', count: conversations.length }];

  const activeThread: Thread | null = activeConversation
    ? {
        id: activeConversation.phone,
        name: activeConversation.name || activeConversation.phone,
        phone: activeConversation.phone,
        channel: 'wa',
        channelColor: '#25D366',
        preview: '',
        time: '',
        unread: 0,
        avatarColor: getAvatarColor(activeConversation.name),
        listingName: activeConversation.listing_name,
        checkInDate: activeConversation.checkin_date,
      }
    : null;

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
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 2 }}>
          <Typography sx={{ fontSize: 48 }}>💬</Typography>
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
          channels={mockChannel}
          activeThreadId={activeThread?.id || null}
          searchTerm={searchTerm}
          onSelectThread={(thread) => {
            const conv = conversations.find((c) => c.phone === thread.id);
            if (conv) handleSelectConversation(conv);
          }}
          onSearchChange={setSearchTerm}
        />
        {activeThread ? (
          <>
            <ConversationThread
              thread={activeThread}
              messages={loadingMessages ? [] : formattedMessages}
              quickTemplates={quickTemplates}
              onSendMessage={handleSendMessage}
              onSelectTemplate={(t) => console.log('Template:', t.text)}
              onAISuggestion={() => setShowAIModal(true)}
            />
            {activeConversation && (
              <ConversationDetails
                thread={activeThread}
                type="staff"
                reservationData={{
                  listingName: activeConversation.listing_name,
                  status: 'Staff',
                }}
                onAction={(action) => {
                  console.log('Action staff:', action);
                }}
              />
            )}
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
            <Typography sx={{ fontSize: 48 }}>👷</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.text2 }}>
              Sélectionnez une conversation
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Choisissez un contact staff pour voir les messages
            </Typography>
          </Box>
        )}
      </InboxLayout>

      {/* Modal de suggestion IA */}
      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => {
          handleSendMessage(text);
        }}
        context={{
          conversationHistory: messages,
          guestName: activeConversation?.name,
          type: 'staff',
        }}
      />
    </>
  );
}

// Helper functions
function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins}min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatTime(timestamp?: string): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function isDifferentDay(ts1?: string, ts2?: string): boolean {
  if (!ts1 || !ts2) return true;
  return new Date(ts1).toDateString() !== new Date(ts2).toDateString();
}

function formatDayLabel(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (date.toDateString() === yesterday.toDateString()) return 'Hier';
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function getAvatarColor(name?: string): string {
  const colors = ['#f59e0b', '#06b6d4', '#a78bfa', '#10b981', '#ec4899', '#f97316', '#3b82f6'];
  if (!name) return colors[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
