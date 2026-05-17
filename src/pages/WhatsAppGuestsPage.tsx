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
 * Page WhatsApp Guests - Messagerie clients/guests
 * Route: /communications/whatsapp-guests
 */
export default function WhatsAppGuestsPage() {
  // États
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [userContext, setUserContext] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ConversationFilter>('smart');

  // Charger les conversations au montage
  useEffect(() => {
    loadConversations();
  }, [activeFilter, searchTerm]);

  /**
   * Charger la liste des conversations
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getConversations({
        filter: activeFilter,
        search: searchTerm || undefined,
        hasReservation: true, // Guests uniquement = avec réservation
        limit: 50,
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

  /**
   * Sélectionner une conversation
   */
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

  /**
   * Envoyer un message
   */
  const handleSendMessage = async (text: string) => {
    if (!activeConversation || !text.trim()) return;

    try {
      setSending(true);
      setError(null);

      await messagesService.sendMessage({
        phone: activeConversation.phone,
        message: text.trim(),
      });

      // Recharger les messages après envoi
      await handleSelectConversation(activeConversation);
    } catch (err: any) {
      console.error('❌ Erreur envoi message:', err);
      setError(err.message || 'Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  /**
   * Formater la date relative (ex: "Il y a 2h", "Hier", etc.)
   */
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

  /**
   * Formater l'heure (ex: "14:30")
   */
  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Obtenir les initiales pour l'avatar
   */
  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  /**
   * Formater les conversations pour ConversationList
   */
  const formattedConversations = conversations.map((conv) => ({
    id: conv.phone,
    name: conv.name || conv.phone,
    initials: getInitials(conv.name),
    preview: conv.recent_exchanges[0]?.user_message || 'Aucun message',
    when: formatRelativeTime(conv.last_message_time),
    listing: conv.listing_name || conv.reservation_number || 'N/A',
    unread: conv.unread_count > 0,
    unreadCount: conv.unread_count,
    color: 'gold',
  }));

  /**
   * Formater les messages pour ChatThread
   */
  const formattedMessages = messages.flatMap((exchange, index) => {
    const msgs: any[] = [];

    // Ajouter séparateur de jour si nécessaire
    if (index === 0 || isDifferentDay(exchange.timestamp, messages[index - 1]?.timestamp)) {
      msgs.push({
        type: 'day',
        text: formatDayLabel(exchange.timestamp),
      });
    }

    // Message user
    if (exchange.user_message) {
      msgs.push({
        from: exchange.sent_by_admin ? 'you' : 'guest',
        text: exchange.user_message,
        when: formatTime(exchange.timestamp),
      });
    }

    // Réponse AI/Orchestrator
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
    const d1 = new Date(ts1).toDateString();
    const d2 = new Date(ts2).toDateString();
    return d1 !== d2;
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
    <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              💬 WhatsApp Guests
            </Typography>
            <Badge variant="gold">
              {conversations.length}
            </Badge>
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

      {/* Chat Layout */}
      {loading ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: t.primary }} />
            <Typography sx={{ mt: 2, fontSize: 13, color: t.text3 }}>
              Chargement des conversations...
            </Typography>
          </Box>
        </Panel>
      ) : conversations.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: 48, mb: 2 }}>💬</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
              Aucune conversation
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Les conversations avec vos guests apparaîtront ici
            </Typography>
          </Box>
        </Panel>
      ) : (
        <ChatLayout>
          {/* Liste des conversations */}
          <ConversationList
            conversations={formattedConversations}
            activeId={activeConversation?.phone}
            onSelect={(id: string) => {
              const conv = conversations.find((c) => c.phone === id);
              if (conv) handleSelectConversation(conv);
            }}
          />

          {/* Thread de messages */}
          {activeConversation && (
            <ChatThread
              conv={{
                name: activeConversation.name || activeConversation.phone,
                initials: getInitials(activeConversation.name),
                meta: `${activeConversation.reservation_number || 'N/A'} • ${
                  activeConversation.listing_name || 'N/A'
                }`,
                color: 'gold',
              }}
              messages={loadingMessages ? [] : formattedMessages}
              onSend={handleSendMessage}
            />
          )}

          {/* Panneau latéral (infos réservation) */}
          {activeConversation && (
            <ChatAside>
              <AsideSection title="Réservation">
                <Stack spacing={1.25}>
                  <InfoRow label="Numéro" value={activeConversation.reservation_number || 'N/A'} />
                  <InfoRow label="Statut" value={activeConversation.status || 'N/A'} />
                  <InfoRow label="Check-in" value={formatDate(activeConversation.checkin_date)} />
                  <InfoRow label="Check-out" value={formatDate(activeConversation.checkout_date)} />
                </Stack>
              </AsideSection>

              <AsideSection title="Propriété">
                <Stack spacing={1.25}>
                  <InfoRow label="Nom" value={activeConversation.listing_name || 'N/A'} />
                  <InfoRow label="Canal" value={activeConversation.channel_name || 'N/A'} />
                </Stack>
              </AsideSection>

              <AsideSection title="Contact">
                <Stack spacing={1.25}>
                  <InfoRow label="Téléphone" value={activeConversation.phone} />
                  <InfoRow
                    label="Langue"
                    value={userContext?.language?.toUpperCase() || 'FR'}
                  />
                </Stack>
              </AsideSection>
            </ChatAside>
          )}
        </ChatLayout>
      )}
    </Box>
  );
}

/**
 * Composant InfoRow pour l'aside
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: 10, color: t.text4, mb: 0.25, fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography sx={{ fontSize: 12, color: t.text }}>
        {value || 'N/A'}
      </Typography>
    </Box>
  );
}

/**
 * Formater date
 */
function formatDate(dateStr?: string): string {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
