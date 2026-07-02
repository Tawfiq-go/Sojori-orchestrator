import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip, alpha } from '@mui/material';
import { Phone as PhoneIcon, Message as MessageIcon } from '@mui/icons-material';
import {
  ChatLayout,
  ConversationList,
  ChatThread,
  ChatAside,
  AsideSection,
  Panel,
  Badge,
  tokens as t,
} from '../dashboard/DashboardV2.components';
import messagesService from '../../services/messagesService';
import { useAdminOwnerApiScope } from '../../hooks/useAdminOwnerApiScope';
import AISuggestionModal from './AISuggestionModal';
import type {
  Conversation,
  MessageExchange,
  ConversationFilter,
  ConversationDetailResponse,
} from '../../types/messages.types';
import { COLORS, SPACING, COMPONENT_SIZES } from '../../design/communications-theme';

const WHATSAPP_GREEN = COLORS.platforms.whatsapp.primary;

/**
 * WhatsApp Tab - Messagerie clients/guests avec réservations
 * Tab dans Communications Hub
 *
 * Enhanced with visual filters, chips, and WhatsApp green theme
 * Based on: sojori-dashboard WhatsAppTabNew.jsx + StaffWhatsAppTab.tsx design
 */
export default function WhatsAppTab() {
  // États
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageExchange[]>([]);
  const [userContext, setUserContext] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showAIModal, setShowAIModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  // Charger les conversations au montage UNIQUEMENT (pas à chaque changement de filtre)
  useEffect(() => {
    if (!scopeFetchReady) return;
    loadConversations();
  }, [scopeFetchReady, requestOwnerId]); // Pas de dépendances filtre = une seule fois au montage/scope

  // Scroll automatique vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Charger la liste des conversations
   */
  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getConversations({
        filter: 'all', // Charger TOUT, filtrage côté client
        search: searchTerm || undefined,
        hasReservation: true, // Guests uniquement = avec réservation
        owner_id: requestOwnerId || undefined,
        limit: 200, // Plus de résultats pour le filtrage client
      });

      if (response.status === 'success') {
        setConversations(response.data.conversations);
        // NE PAS auto-sélectionner - l'utilisateur doit cliquer manuellement
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
   * Helper: Vérifier si deux timestamps sont de jours différents
   */
  const isDifferentDay = (ts1?: string, ts2?: string): boolean => {
    if (!ts1 || !ts2) return true;
    const d1 = new Date(ts1).toDateString();
    const d2 = new Date(ts2).toDateString();
    return d1 !== d2;
  };

  /**
   * Helper: Formater un label de jour (Aujourd'hui, Hier, ou date complète)
   */
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

  /**
   * Check if conversation has been replied to (hasReplied logic)
   * Based on most recent exchange - if last message was sent by admin, hasReplied = true
   */
  const hasReplied = (conv: Conversation): boolean => {
    if (!conv.recent_exchanges || conv.recent_exchanges.length === 0) return false;
    const lastExchange = conv.recent_exchanges[0]; // Most recent
    return lastExchange.sent_by_admin === true;
  };

  /**
   * Filter conversations based on active filter
   */
  const filteredConversations = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Apply search filter first
    let filtered = conversations;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = conversations.filter((conv) => {
        const name = (conv.name || '').toLowerCase();
        const phone = (conv.phone || '').toLowerCase();
        const resNum = (conv.reservation_number || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || resNum.includes(q);
      });
    }

    // Apply filter logic
    filtered = filtered.filter((conv) => {
      switch (activeFilter) {
        case 'unreplied':
          // Only conversations that haven't been replied to
          return !hasReplied(conv);

        case 'replied':
          // Only conversations that have been replied to
          return hasReplied(conv);

        case 'recent':
          // Last 24 hours only
          return new Date(conv.last_message_time) >= oneDayAgo;

        case 'all':
        default:
          return true;
      }
    });

    return filtered;
  }, [conversations, activeFilter, searchTerm]);

  /**
   * Enhance conversation with chips data
   */
  const enhanceConversation = (conv: Conversation) => {
    const messagesCount = conv.recent_exchanges?.length || 0;
    const replied = hasReplied(conv);

    return {
      id: conv.phone,
      name: conv.name || conv.phone,
      initials: getInitials(conv.name),
      preview: conv.recent_exchanges[0]?.user_message || 'Aucun message',
      when: formatRelativeTime(conv.last_message_time),
      listing: conv.listing_name || conv.reservation_number || 'N/A',
      unread: conv.unread_count > 0,
      unreadCount: conv.unread_count,
      color: 'gold',
      // Enhanced chips data
      phone: conv.phone,
      reservationNumber: conv.reservation_number,
      messagesCount,
      hasReplied: replied,
    };
  };

  /**
   * Format conversations for ConversationList with enhanced chips
   */
  const formattedConversations = filteredConversations.map(enhanceConversation);

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

  /**
   * Simple ConversationListItem with chips
   */
  const ConversationListItem = ({ conv, isActive, onClick }: any) => {
    return (
      <Box
        onClick={onClick}
        sx={{
          p: 2,
          borderBottom: `1px solid ${t.border}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          bgcolor: isActive ? alpha(WHATSAPP_GREEN, 0.08) : 'transparent',
          borderLeft: isActive ? `3px solid ${WHATSAPP_GREEN}` : 'none',
          pl: isActive ? 1.625 : 2,
          '&:hover': {
            bgcolor: isActive ? alpha(WHATSAPP_GREEN, 0.08) : t.bg2,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Avatar */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: WHATSAPP_GREEN,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {conv.initials}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {conv.name}
              </Typography>
              <Typography
                sx={{
                  fontSize: 11,
                  color: t.text3,
                  flexShrink: 0,
                  ml: 1,
                }}
              >
                {conv.when}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 12,
                color: t.text2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                mb: 1,
              }}
            >
              {conv.preview}
            </Typography>

            {/* Chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {/* WhatsApp badge */}
              <Chip
                label="WhatsApp"
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(WHATSAPP_GREEN, 0.15),
                  color: WHATSAPP_GREEN,
                  fontWeight: 600,
                  border: `1px solid ${alpha(WHATSAPP_GREEN, 0.3)}`,
                }}
              />

              {/* Phone chip */}
              <Chip
                icon={<PhoneIcon sx={{ fontSize: 12 }} />}
                label={conv.phone}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: t.bg2,
                  color: t.text2,
                  fontFamily: 'monospace',
                }}
              />

              {/* Reservation chip (if exists) */}
              {conv.reservationNumber && conv.reservationNumber !== 'N/A' && (
                <Chip
                  label={conv.reservationNumber}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: t.primary,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Message count */}
              <Chip
                icon={<MessageIcon sx={{ fontSize: 12 }} />}
                label={`${conv.messagesCount} msg`}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: alpha(t.primary, 0.1),
                  color: t.primary,
                  fontWeight: 600,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      {/* Visual Filters */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1, px: { xs: 2, md: 3 } }}>
        {[
          { value: 'all', label: '📋 Tous' },
          { value: 'unreplied', label: '📬 Non répondus' },
          { value: 'replied', label: '✅ Répondus' },
          { value: 'recent', label: '🕐 Dernières 24h' },
        ].map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            onClick={() => setActiveFilter(filter.value)}
            size="small"
            sx={{
              fontSize: '0.75rem',
              fontWeight: 600,
              bgcolor: activeFilter === filter.value ? WHATSAPP_GREEN : t.bg2,
              color: activeFilter === filter.value ? '#fff' : t.text3,
              border: activeFilter === filter.value ? 'none' : `1px solid ${t.border}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: activeFilter === filter.value ? WHATSAPP_GREEN : t.bg3,
              },
            }}
          />
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
        <ChatLayout mobileView='both'>
          {/* Colonne 1: Liste avec recherche et chips */}
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Search Bar */}
            <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
              <input
                type="text"
                placeholder="Rechercher (nom, tel, résa)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${t.border}`,
                  borderRadius: '8px',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </Box>

            {/* Conversation List */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {formattedConversations.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography sx={{ fontSize: 13, color: t.text3 }}>
                    Aucune conversation trouvée
                  </Typography>
                </Box>
              ) : (
                formattedConversations.map((conv) => (
                  <ConversationListItem
                    key={conv.id}
                    conv={conv}
                    isActive={activeConversation?.phone === conv.id}
                    onClick={() => {
                      const original = conversations.find((c) => c.phone === conv.id);
                      if (original) handleSelectConversation(original);
                    }}
                  />
                ))
              )}
            </Box>
          </Box>

          {/* Colonne 2: Messages with WhatsApp green theme */}
          {activeConversation ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Thread Header with WhatsApp green */}
              <Box
                sx={{
                  p: 2,
                  borderBottom: `1px solid ${t.border}`,
                  bgcolor: WHATSAPP_GREEN,
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {getInitials(activeConversation.name)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
                    {activeConversation.name || activeConversation.phone}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    <Chip
                      label={activeConversation.phone}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.7rem',
                        bgcolor: 'rgba(255, 255, 255, 0.2)',
                        color: '#fff',
                        fontFamily: 'monospace',
                      }}
                    />
                    {activeConversation.reservation_number && (
                      <Chip
                        label={activeConversation.reservation_number}
                        size="small"
                        sx={{
                          height: 22,
                          fontSize: '0.7rem',
                          bgcolor: 'rgba(255, 255, 255, 0.2)',
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Messages */}
              <Box
                sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2,
                  bgcolor: t.bg,
                  backgroundImage:
                    'url(https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png)',
                  backgroundSize: '412.5px 749.25px',
                }}
              >
                {loadingMessages ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <CircularProgress size={32} sx={{ color: WHATSAPP_GREEN }} />
                  </Box>
                ) : (
                  formattedMessages.map((msg: any, index: number) => {
                    if (msg.type === 'day') {
                      return (
                        <Box
                          key={`day-${index}`}
                          sx={{
                            textAlign: 'center',
                            my: 2,
                          }}
                        >
                          <Chip
                            label={msg.text}
                            size="small"
                            sx={{
                              bgcolor: 'rgba(0,0,0,0.05)',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      );
                    }

                    const isFromAdmin = msg.from === 'you';
                    return (
                      <Box
                        key={`msg-${index}`}
                        sx={{
                          display: 'flex',
                          justifyContent: isFromAdmin ? 'flex-end' : 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Box
                          sx={{
                            maxWidth: '70%',
                            bgcolor: isFromAdmin ? WHATSAPP_GREEN : '#fff',
                            color: isFromAdmin ? '#fff' : t.text,
                            borderRadius: 2,
                            p: 1.5,
                            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                          }}
                        >
                          <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>
                            {msg.text}
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: 10,
                              color: isFromAdmin ? 'rgba(255,255,255,0.8)' : t.text3,
                              mt: 0.5,
                              textAlign: 'right',
                            }}
                          >
                            {msg.when}
                          </Typography>
                        </Box>
                      </Box>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </Box>

              {/* Input Area */}
              <Box
                sx={{
                  p: 2,
                  display: 'flex',
                  gap: 1,
                  alignItems: 'flex-end',
                  borderTop: `1px solid ${t.border}`,
                  bgcolor: t.bg2,
                }}
              >
                <textarea
                  placeholder="Envoyer un message WhatsApp..."
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: `1px solid ${t.border}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    minHeight: '40px',
                    maxHeight: '120px',
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      const text = e.currentTarget.value;
                      if (text.trim()) {
                        handleSendMessage(text);
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const textarea = e.currentTarget.previousElementSibling as HTMLTextAreaElement;
                    const text = textarea.value;
                    if (text.trim()) {
                      handleSendMessage(text);
                      textarea.value = '';
                    }
                  }}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: WHATSAPP_GREEN,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    fontSize: '13px',
                  }}
                >
                  Envoyer
                </button>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <Typography sx={{ fontSize: 13, color: t.text4 }}>
                Sélectionnez une conversation
              </Typography>
            </Box>
          )}

          {/* Colonne 3: Détails (placeholder si pas de sélection) */}
          {activeConversation ? (
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
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
              <Typography sx={{ fontSize: 13, color: t.text4 }}>
                Aucun détail
              </Typography>
            </Box>
          )}
        </ChatLayout>
      )}

      {/* Modal de suggestion IA */}
      <AISuggestionModal
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        onUseSuggestion={(text) => {
          if (activeConversation) {
            handleSendMessage(text);
          }
        }}
        context={{
          conversationHistory: messages,
          guestName: activeConversation?.name,
          reservationNumber: activeConversation?.reservation_number,
          type: 'whatsapp',
        }}
      />

      <div ref={messagesEndRef} />
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
