import { useState, useEffect } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import {
  ChatLayout,
  ConversationList,
  ChatThread,
  ChatAside,
  AsideSection,
  Panel,
  Badge,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import messagesService from '../services/messagesService';
import type {
  Conversation,
  MessageExchange,
  ConversationFilter,
  ConversationDetailResponse,
} from '../types/messages.types';

/**
 * Page WhatsApp Staff - Messagerie équipe/staff
 * Route: /communications/whatsapp-staff
 */
export default function WhatsAppStaffPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('recent');

  useEffect(() => {
    loadConversations();
  }, [activeFilter]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getConversations({
        filter: activeFilter,
        hasReservation: false, // Staff = sans réservation (ou filtrer autrement)
        limit: 50,
      });

      if (response.status === 'success') {
        setConversations(response.data.conversations);

        if (!activeConversation && response.data.conversations.length > 0) {
          handleSelectConversation(response.data.conversations[0]);
        }
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement conversations staff:', err);
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
      }
    } catch (err: any) {
      console.error(`❌ Erreur chargement messages staff pour ${conv.phone}:`, err);
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

      await handleSelectConversation(activeConversation);
    } catch (err: any) {
      console.error('❌ Erreur envoi message staff:', err);
      setError(err.message || 'Erreur lors de l\'envoi du message');
    }
  };

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins}min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formattedConversations = conversations.map((conv) => ({
    id: conv.phone,
    name: conv.name || conv.phone,
    initials: getInitials(conv.name),
    preview: conv.recent_exchanges[0]?.user_message || 'Aucun message',
    when: formatRelativeTime(conv.last_message_time),
    listing: 'Staff',
    unread: conv.unread_count > 0,
    unreadCount: conv.unread_count,
    color: 'purple',
  }));

  const formattedMessages = messages.flatMap((exchange, index) => {
    const msgs: any[] = [];

    if (index === 0 || isDifferentDay(exchange.timestamp, messages[index - 1]?.timestamp)) {
      msgs.push({
        type: 'day',
        text: formatDayLabel(exchange.timestamp),
      });
    }

    if (exchange.user_message) {
      msgs.push({
        from: exchange.sent_by_admin ? 'you' : 'staff',
        text: exchange.user_message,
        when: formatTime(exchange.timestamp),
      });
    }

    if (exchange.ai_response) {
      msgs.push({
        from: 'you',
        text: exchange.ai_response,
        when: formatTime(exchange.timestamp),
      });
    }

    return msgs;
  });

  const isDifferentDay = (ts1?: string, ts2?: string): boolean => {
    if (!ts1 || !ts2) return true;
    return new Date(ts1).toDateString() !== new Date(ts2).toDateString();
  };

  const formatDayLabel = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Aujourd\'hui';
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';

    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              👷 WhatsApp Staff
            </Typography>
            <Badge variant="gold">
              {conversations.length}
            </Badge>
          </Stack>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Messagerie équipe (ménage, maintenance, concierge)
          </Typography>
        </Box>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
        {(['recent', 'unread', 'all'] as ConversationFilter[]).map((filter) => (
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
            {filter === 'recent' && '🕐 Récents'}
            {filter === 'unread' && '📬 Non lus'}
            {filter === 'all' && '📋 Tous'}
          </Box>
        ))}
      </Stack>

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

      {loading ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: t.primary }} />
            <Typography sx={{ mt: 2, fontSize: 13, color: t.text3 }}>
              Chargement des conversations staff...
            </Typography>
          </Box>
        </Panel>
      ) : conversations.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: 48, mb: 2 }}>👷</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
              Aucune conversation staff
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Les conversations avec votre équipe apparaîtront ici
            </Typography>
          </Box>
        </Panel>
      ) : (
        <ChatLayout>
          <ConversationList
            conversations={formattedConversations}
            activeId={activeConversation?.phone}
            onSelect={(id: string) => {
              const conv = conversations.find((c) => c.phone === id);
              if (conv) handleSelectConversation(conv);
            }}
          />

          {activeConversation && (
            <ChatThread
              conv={{
                name: activeConversation.name || activeConversation.phone,
                initials: getInitials(activeConversation.name),
                meta: `Staff • ${activeConversation.phone}`,
                color: 'purple',
              }}
              messages={loadingMessages ? [] : formattedMessages}
              onSend={handleSendMessage}
            />
          )}

          {activeConversation && (
            <ChatAside>
              <AsideSection title="Contact">
                <Stack spacing={1.25}>
                  <InfoRow label="Téléphone" value={activeConversation.phone} />
                  <InfoRow label="Nom" value={activeConversation.name || 'N/A'} />
                </Stack>
              </AsideSection>
            </ChatAside>
          )}
        </ChatLayout>
      )}
    </Box>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, color: t.text4, mb: 0.25, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: t.text }}>{value || 'N/A'}</Typography>
    </Box>
  );
}
