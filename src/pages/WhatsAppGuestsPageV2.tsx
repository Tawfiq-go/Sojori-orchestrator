import { useState, useEffect } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import InboxLayout from '../components/unified-inbox/InboxLayout';
import ThreadsList from '../components/unified-inbox/ThreadsList';
import ConversationThread from '../components/unified-inbox/ConversationThread';
import messagesService from '../services/messagesService';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import type {
  Conversation,
  MessageExchange,
  ConversationFilter,
  ConversationDetailResponse,
} from '../types/messages.types';
import type { Thread, Message, QuickTemplate } from '../types/unifiedInbox.types';

/**
 * WhatsApp Guests Page V2 - Nouveau design Claude
 * Route: /communications/whatsapp-guests
 * Design: 2 colonnes (ThreadsList + ConversationThread)
 */
export default function WhatsAppGuestsPageV2() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [userContext, setUserContext] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('smart');
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  // Charger les conversations au montage
  useEffect(() => {
    if (!scopeFetchReady) return;
    loadConversations();
  }, [activeFilter, searchTerm, scopeFetchReady, requestOwnerId]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getConversations({
        filter: activeFilter,
        search: searchTerm || undefined,
        hasReservation: true, // Guests uniquement = avec réservation
        limit: 50,
        owner_id: requestOwnerId || undefined,
      });

      if (response.status === 'success') {
        setConversations(response.data.conversations);

        // Auto-sélectionner la première conversation
        if (!activeConversation && response.data.conversations.length > 0) {
          handleSelectConversation(response.data.conversations[0]);
        }
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement conversations:', err);
      setError(err.message || 'Erreur lors du chargement des conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    setError(null);

    try {
      const response: ConversationDetailResponse = await messagesService.getConversationMessages(
        conv.phone,
        { limit: 50 }
      );

      if (response.status === 'success') {
        setMessages(response.data.exchanges);
        setUserContext(response.data.user_context);
      }
    } catch (err: any) {
      console.error(`❌ Erreur chargement messages pour ${conv.phone}:`, err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation || !text.trim()) return;

    try {
      await messagesService.sendMessage({
        phone: activeConversation.phone,
        message: text.trim(),
      });

      // Recharger les messages après envoi
      await handleSelectConversation(activeConversation);
    } catch (err: any) {
      console.error('❌ Erreur envoi message:', err);
      setError(err.message || "Erreur lors de l'envoi du message");
    }
  };

  // Formater les conversations pour le nouveau composant ThreadsList
  const formattedThreads: Thread[] = conversations.map((conv) => ({
    id: conv.phone,
    name: conv.name || conv.phone,
    phone: conv.phone,
    channel: 'wa',  // WhatsApp
    channelColor: '#25D366',
    preview: conv.recent_exchanges[0]?.user_message || 'Aucun message',
    time: formatRelativeTime(conv.last_message_time),
    unread: conv.unread_count,
    avatarColor: getAvatarColor(conv.name),
    listingName: conv.listing_name,
    reservationNumber: conv.reservation_number,
    checkInDate: conv.checkin_date,
    status: conv.status,
  }));

  // Formater les messages pour le nouveau composant ConversationThread
  const formattedMessages: Message[] = messages.flatMap((exchange, index) => {
    const msgs: Message[] = [];

    // Ajouter séparateur de jour si nécessaire
    if (index === 0 || isDifferentDay(exchange.timestamp, messages[index - 1]?.timestamp)) {
      msgs.push({
        id: `day-${index}`,
        from: 'guest',
        text: formatDayLabel(exchange.timestamp),
        time: '',
        type: 'day-separator',
      });
    }

    // Message user
    if (exchange.user_message) {
      msgs.push({
        id: `user-${index}`,
        from: exchange.sent_by_admin ? 'you' : 'guest',
        text: exchange.user_message,
        time: formatTime(exchange.timestamp),
      });
    }

    // Réponse AI/Orchestrator
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
    { id: '1', label: '👋 Bienvenue', icon: '👋', text: 'Bienvenue ! Nous sommes ravis de vous accueillir.' },
    { id: '2', label: '🗝️ Code accès', icon: '🗝️', text: 'Voici votre code d\'accès: ' },
    { id: '3', label: '📍 GPS', icon: '📍', text: 'Voici le lien GPS de la propriété: ' },
  ];

  // Mock channel (pour ThreadsList qui en a besoin)
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

  return (
    <DashboardWrapper breadcrumb={['Communications', 'WhatsApp Guests']}>
    <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              💬 WhatsApp Guests
            </Typography>
            <Box
              sx={{
                px: 1.5,
                py: 0.5,
                borderRadius: '8px',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: 'Geist Mono',
                bgcolor: t.primaryTint,
                color: t.primary,
                border: `1px solid ${t.primary}`,
              }}
            >
              {conversations.length}
            </Box>
          </Stack>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Messagerie clients avec réservations actives
          </Typography>
        </Box>
      </Stack>

      {/* Filtres */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
        {(['smart', 'urgent', 'unread', 'recent'] as ConversationFilter[]).map((filter) => (
          <Box
            key={filter}
            onClick={() => setActiveFilter(filter)}
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: '8px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              bgcolor: activeFilter === filter ? t.primary : t.bg2,
              color: activeFilter === filter ? t.text : t.text3,
              border: `1px solid ${activeFilter === filter ? t.primaryDeep : t.border}`,
              '&:hover': {
                bgcolor: activeFilter === filter ? t.primaryDeep : t.bg3,
              },
            }}
          >
            {filter === 'smart' && '✨ Smart'}
            {filter === 'urgent' && '🔴 Urgent'}
            {filter === 'unread' && '📬 Non lus'}
            {filter === 'recent' && '🕐 Récents'}
          </Box>
        ))}
      </Stack>

      {/* Message d'erreur */}
      {error && (
        <Box
          sx={{
            mb: 2,
            p: 2,
            bgcolor: t.errorTint,
            border: `1px solid ${t.error}`,
            borderRadius: '8px',
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: t.error }}>❌ {error}</Typography>
        </Box>
      )}

      {/* Inbox Layout */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 660,
            bgcolor: t.bg1,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
          }}
        >
          <CircularProgress size={32} sx={{ color: t.primary }} />
        </Box>
      ) : conversations.length === 0 ? (
        <InboxLayout>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: 48 }}>💬</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Aucune conversation</Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Les conversations avec vos guests apparaîtront ici
            </Typography>
          </Box>
        </InboxLayout>
      ) : (
        <InboxLayout>
          {/* Col 1: Liste conversations */}
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

          {/* Col 2: Thread messages */}
          {activeThread ? (
            <ConversationThread
              thread={activeThread}
              messages={loadingMessages ? [] : formattedMessages}
              quickTemplates={quickTemplates}
              onSendMessage={handleSendMessage}
              onSelectTemplate={(template) => {
                console.log('✨ Template sélectionné:', template.text);
                // TODO: Pré-remplir l'input
              }}
            />
          ) : (
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <Typography sx={{ fontSize: 48 }}>💬</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez une conversation</Typography>
              <Typography sx={{ fontSize: 13, color: t.text3 }}>
                Choisissez un guest pour voir les messages
              </Typography>
            </Box>
          )}
        </InboxLayout>
      )}
    </Box>
    </DashboardWrapper>
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
  return new Date(timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
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

  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function getAvatarColor(name?: string): string {
  const colors = ['#f59e0b', '#06b6d4', '#a78bfa', '#10b981', '#ec4899', '#f97316', '#3b82f6'];
  if (!name) return colors[0];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
