import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip, alpha } from '@mui/material';
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
import AISuggestionModal from './AISuggestionModal';

// Platform colors
const AIRBNB_RED = '#FF385C';
const BOOKING_BLUE = '#003580';

/**
 * Get platform color based on channel name
 */
const getPlatformColor = (channel?: string): string => {
  if (!channel) return t.primary;
  const ch = channel.toLowerCase();
  if (ch.includes('airbnb')) return AIRBNB_RED;
  if (ch.includes('booking')) return BOOKING_BLUE;
  return t.primary;
};

/**
 * Get platform display name
 */
const getPlatformName = (channel?: string): string => {
  if (!channel) return 'OTA';
  const ch = channel.toLowerCase();
  if (ch.includes('airbnb')) return 'Airbnb';
  if (ch.includes('booking')) return 'Booking.com';
  return channel;
};

/**
 * Messages OTA Tab - Messages confirmés Airbnb/Booking
 * Tab dans Communications Hub
 *
 * Enhanced with:
 * - Platform badges and colors (Airbnb red, Booking blue)
 * - Visual filters (all, unreplied, replied, airbnb, booking, recent)
 * - Reservation info chips
 * - Day separators in messages
 * - Platform theme colors
 * - Better display with relative time and guest name
 */
export default function MessagesOTATab() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAIModal, setShowAIModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadOTAThreads();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadOTAThreads = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getOTAThreads({
        page: 0,
        limit: 50,
      });

      if (response.threads) {
        const allFormatted = response.threads.map((item: any) => {
          const threadData = item.thread || item;
          const reservation = item.reservation || {};

          return {
            threadId: threadData.threadId,
            guestName: reservation.guestName || threadData.recipientName || 'Guest',
            reservationNumber: reservation.reservationNumber || 'N/A',
            listingName: reservation.listingName || 'Listing',
            channel: threadData.communicationChannel || 'Unknown',
            lastMessage: threadData.preview || threadData.lastMessage || '',
            lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
            unreadCount: threadData.unreadCount || 0,
            checkInDate: reservation.checkInDate || reservation.arrivalDate,
            checkOutDate: reservation.checkOutDate || reservation.departureDate,
            status: reservation.status || reservation.reservationStatus,
          };
        });

        // Filtrer comme dans le legacy: garder actifs + terminés avec activité récente
        const filtered = allFormatted.filter((thread) => {
          const status = (thread.status || '').toLowerCase();

          // Garder: réservations actives
          if (status === 'confirmed' || status === 'pending') return true;

          // Garder: terminées/annulées AVEC messages non lus OU activité récente (< 7j)
          const hasUnreadMessages = thread.unreadCount > 0;
          const isRecentMessage = thread.lastMessageTime &&
                                 new Date().getTime() - new Date(thread.lastMessageTime).getTime() < 7 * 24 * 60 * 60 * 1000;

          if ((status === 'completed' || status.includes('cancel')) && (hasUnreadMessages || isRecentMessage)) {
            return true;
          }

          // Exclure: anciennes terminées/annulées sans activité
          return false;
        });

        setConversations(filtered);
        // NE PAS auto-sélectionner - l'utilisateur doit cliquer manuellement
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement OTA threads:', err);
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectConversation = async (conv: any) => {
    setActiveConversation(conv);
    setLoadingMessages(true);
    setError(null);

    try {
      const response = await messagesService.getOTAMessages(conv.threadId);

      // messagesService.getOTAMessages retourne response.data directement
      // Donc response est déjà l'objet {data: [...], status: 'success', etc}
      let messagesData: any[] = [];

      if (response && Array.isArray(response)) {
        messagesData = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        messagesData = response.data;
      }

      const formatted = messagesData.map((msg: any) => ({
        from: msg.isIncoming ? 'guest' : 'you',
        text: msg.body || msg.message || '',
        when: msg.createdAt || msg.date, // Keep full timestamp for day separators
        whenFormatted: formatTime(msg.createdAt || msg.date),
      }));

      setMessages(formatted);
    } catch (err: any) {
      console.error('❌ Erreur chargement messages OTA:', err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeConversation || !text.trim()) return;

    try {
      await messagesService.sendOTAMessage(activeConversation.threadId, text.trim());

      const now = new Date().toISOString();
      const tempMsg = {
        from: 'you',
        text: text.trim(),
        when: now,
        whenFormatted: formatTime(now),
      };

      setMessages([...messages, tempMsg]);
    } catch (err: any) {
      console.error('❌ Erreur envoi message:', err);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  /**
   * Calculer le statut dynamique du séjour
   * Basé sur les dates check-in/check-out
   */
  const getStayStatus = (checkIn?: string, checkOut?: string): { label: string; emoji: string; color: string } => {
    if (!checkIn || !checkOut) {
      return { label: 'N/A', emoji: '❓', color: t.text3 };
    }

    const now = new Date();
    const arrivalDate = new Date(checkIn);
    const departureDate = new Date(checkOut);

    // Reset time to compare only dates
    now.setHours(0, 0, 0, 0);
    arrivalDate.setHours(0, 0, 0, 0);
    departureDate.setHours(0, 0, 0, 0);

    const daysUntilArrival = Math.floor((arrivalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    const daysSinceDeparture = Math.floor((now.getTime() - departureDate.getTime()) / (24 * 60 * 60 * 1000));

    // Arrivé aujourd'hui
    if (daysUntilArrival === 0) {
      return { label: 'Arrivé auj.', emoji: '🔔', color: '#10B981' };
    }

    // En séjour
    if (arrivalDate < now && departureDate >= now) {
      return { label: 'En séjour', emoji: '🏠', color: '#3B82F6' };
    }

    // Parti aujourd'hui
    if (daysSinceDeparture === 0) {
      return { label: 'Parti auj.', emoji: '👋', color: '#F59E0B' };
    }

    // Parti récemment (< 7j)
    if (daysSinceDeparture > 0 && daysSinceDeparture <= 7) {
      return { label: `Parti -${daysSinceDeparture}j`, emoji: '📅', color: '#6B7280' };
    }

    // Arrivée proche (< 7j)
    if (daysUntilArrival > 0 && daysUntilArrival <= 7) {
      return { label: `Arrivée +${daysUntilArrival}j`, emoji: '⏰', color: '#8B5CF6' };
    }

    // Arrivée future (> 7j)
    if (daysUntilArrival > 7) {
      return { label: 'Arrivée future', emoji: '📆', color: t.text3 };
    }

    // Parti ancien (> 7j)
    if (daysSinceDeparture > 7) {
      return { label: 'Terminé', emoji: '✓', color: t.text4 };
    }

    return { label: 'N/A', emoji: '❓', color: t.text3 };
  };

  const getInitials = (name?: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatRelativeTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatTime = (timestamp?: string): string => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Helper: Check if conversation has been replied to
   */
  const hasReplied = (conv: any): boolean => {
    // If last message is from host (not incoming), we replied
    if (messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      return lastMsg.from === 'you';
    }
    return false;
  };

  /**
   * Helper: Check if two timestamps are different days
   */
  const isDifferentDay = (ts1?: string, ts2?: string): boolean => {
    if (!ts1 || !ts2) return true;
    const d1 = new Date(ts1).toDateString();
    const d2 = new Date(ts2).toDateString();
    return d1 !== d2;
  };

  /**
   * Helper: Format day label (Aujourd'hui, Hier, or full date)
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
   * Filtrer les conversations selon le filtre actif
   */
  const filteredConversations = useMemo(() => {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Apply search first
    let filtered = conversations;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      filtered = conversations.filter((conv) => {
        const name = (conv.guestName || '').toLowerCase();
        const resNum = (conv.reservationNumber || '').toLowerCase();
        const listing = (conv.listingName || '').toLowerCase();
        return name.includes(q) || resNum.includes(q) || listing.includes(q);
      });
    }

    // Apply filter logic
    return filtered.filter((conv) => {
      const status = getStayStatus(conv.checkInDate, conv.checkOutDate);
      const channel = (conv.channel || '').toLowerCase();

      switch (activeFilter) {
        case 'unreplied':
          // Not replied to (has unread messages)
          return conv.unreadCount > 0;

        case 'replied':
          // Replied to (no unread messages)
          return conv.unreadCount === 0;

        case 'airbnb':
          // Only Airbnb
          return channel.includes('airbnb');

        case 'booking':
          // Only Booking.com
          return channel.includes('booking');

        case 'recent':
          // Last 24 hours only
          return conv.lastMessageTime && new Date(conv.lastMessageTime) >= oneDayAgo;

        case 'all':
        default:
          return true;
      }
    });
  }, [conversations, activeFilter, searchTerm]);

  /**
   * Format messages with day separators
   */
  const formattedMessages = useMemo(() => {
    const msgs: any[] = [];

    messages.forEach((msg, index) => {
      // Add day separator if different day
      if (index === 0 || isDifferentDay(messages[index - 1]?.when, msg.when)) {
        msgs.push({
          type: 'day',
          text: formatDayLabel(msg.when),
        });
      }

      msgs.push(msg);
    });

    return msgs;
  }, [messages]);

  /**
   * Enhance conversations with platform color
   */
  const formattedConversations = filteredConversations.map((conv) => {
    const status = getStayStatus(conv.checkInDate, conv.checkOutDate);
    const platformColor = getPlatformColor(conv.channel);
    const platformName = getPlatformName(conv.channel);

    return {
      id: conv.threadId,
      name: conv.guestName,
      initials: getInitials(conv.guestName),
      preview: conv.lastMessage,
      when: formatRelativeTime(conv.lastMessageTime),
      listing: conv.listingName,
      unread: conv.unreadCount > 0,
      unreadCount: conv.unreadCount,
      color: platformColor,
      // Enhanced data
      channel: conv.channel,
      platformName,
      platformColor,
      reservationNumber: conv.reservationNumber,
      checkInDate: conv.checkInDate,
      checkOutDate: conv.checkOutDate,
      status,
    };
  });

  if (loading) {
    return (
      <Panel>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 48, mb: 2 }}>⚠️</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'error.main', mb: 1 }}>
            Erreur
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            {error}
          </Typography>
        </Box>
      </Panel>
    );
  }

  if (conversations.length === 0) {
    return (
      <Panel>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 48, mb: 2 }}>📨</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
            Aucun message OTA
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Aucun message de réservation trouvé
          </Typography>
        </Box>
      </Panel>
    );
  }

  /**
   * Custom ConversationListItem with platform colors and chips
   */
  const ConversationListItem = ({ conv, isActive, onClick }: any) => {
    const platformColor = getPlatformColor(conv.channel);

    return (
      <Box
        onClick={onClick}
        sx={{
          p: 2,
          borderBottom: `1px solid ${t.border}`,
          cursor: 'pointer',
          transition: 'all 0.15s',
          bgcolor: isActive ? alpha(platformColor, 0.08) : 'transparent',
          borderLeft: isActive ? `3px solid ${platformColor}` : 'none',
          pl: isActive ? 1.625 : 2,
          '&:hover': {
            bgcolor: isActive ? alpha(platformColor, 0.08) : t.bg2,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Avatar with platform color */}
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: platformColor,
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

            {/* Enhanced chips */}
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {/* Platform badge */}
              <Chip
                label={conv.platformName}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.65rem',
                  bgcolor: platformColor,
                  color: '#fff',
                  fontWeight: 700,
                }}
              />

              {/* Reservation number */}
              {conv.reservationNumber && conv.reservationNumber !== 'N/A' && (
                <Chip
                  label={conv.reservationNumber}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: t.bg2,
                    color: t.text2,
                    fontFamily: 'monospace',
                  }}
                />
              )}

              {/* Check-in/check-out dates */}
              {conv.checkInDate && conv.checkOutDate && (
                <Chip
                  label={`${new Date(conv.checkInDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(conv.checkOutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: alpha(t.primary, 0.1),
                    color: t.primary,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Stay status */}
              {conv.status && (
                <Chip
                  label={`${conv.status.emoji} ${conv.status.label}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: conv.status.bgcolor || t.bg2,
                    color: conv.status.color || t.text2,
                    fontWeight: 600,
                  }}
                />
              )}

              {/* Message count */}
              {conv.unreadCount > 0 && (
                <Chip
                  label={`${conv.unreadCount} nouveau${conv.unreadCount > 1 ? 'x' : ''}`}
                  size="small"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    bgcolor: t.error,
                    color: '#fff',
                    fontWeight: 700,
                  }}
                />
              )}
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
          { value: 'airbnb', label: '🏠 Airbnb', color: AIRBNB_RED },
          { value: 'booking', label: '🏨 Booking.com', color: BOOKING_BLUE },
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
              bgcolor: activeFilter === filter.value ? (filter.color || t.primary) : t.bg2,
              color: activeFilter === filter.value ? '#fff' : t.text3,
              border: activeFilter === filter.value ? 'none' : `1px solid ${t.border}`,
              cursor: 'pointer',
              '&:hover': {
                bgcolor: activeFilter === filter.value ? (filter.color || t.primary) : t.bg3,
              },
            }}
          />
        ))}
      </Stack>

      {/* Error message */}
      {error && (
        <Box
          sx={{
            mb: 2,
            mx: { xs: 2, md: 3 },
            p: 2,
            bgcolor: t.errorTint,
            border: `1px solid ${t.error}`,
            borderRadius: '8px',
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: t.error }}>⚠️ {error}</Typography>
        </Box>
      )}

      <ChatLayout mobileView='both'>
        {/* Colonne 1 : Liste conversations */}
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Search Bar */}
          <Box sx={{ p: 2, borderBottom: `1px solid ${t.border}` }}>
            <input
              type="text"
              placeholder="Rechercher (nom, réservation, listing)..."
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
                  Aucune réservation OTA trouvée
                </Typography>
              </Box>
            ) : (
              formattedConversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conv={conv}
                  isActive={activeConversation?.threadId === conv.id}
                  onClick={() => {
                    const original = conversations.find((c) => c.threadId === conv.id);
                    if (original) handleSelectConversation(original);
                  }}
                />
              ))
            )}
          </Box>
        </Box>

      {/* Colonne 2 : Messages */}
      {activeConversation ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Thread Header with platform gradient */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${t.border}`,
              background: `linear-gradient(135deg, ${getPlatformColor(activeConversation.channel)}, ${alpha(getPlatformColor(activeConversation.channel), 0.8)})`,
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
              {getInitials(activeConversation.guestName)}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
                {activeConversation.guestName}
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                <Chip
                  label={getPlatformName(activeConversation.channel)}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.7rem',
                    bgcolor: 'rgba(255, 255, 255, 0.25)',
                    color: '#fff',
                    fontWeight: 700,
                  }}
                />
                {activeConversation.reservationNumber && activeConversation.reservationNumber !== 'N/A' && (
                  <Chip
                    label={activeConversation.reservationNumber}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                      fontFamily: 'monospace',
                    }}
                  />
                )}
                {activeConversation.checkInDate && activeConversation.checkOutDate && (
                  <Chip
                    label={`${new Date(activeConversation.checkInDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} → ${new Date(activeConversation.checkOutDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.7rem',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: '#fff',
                    }}
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 2,
              bgcolor: t.bg,
            }}
          >
            {loadingMessages ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress size={32} sx={{ color: getPlatformColor(activeConversation.channel) }} />
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
                        bgcolor: isFromAdmin ? getPlatformColor(activeConversation.channel) : '#fff',
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
                        {msg.whenFormatted || msg.when}
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
              placeholder="Répondre au client (infos séjour, instructions check-in/out)..."
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
                backgroundColor: getPlatformColor(activeConversation.channel),
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

      {/* Colonne 3 : Context panel */}
      {activeConversation ? (
        <ChatAside>
          <Stack spacing={3}>
            {activeConversation.checkInDate && activeConversation.checkOutDate && (
              <AsideSection title="🏠 Statut Séjour">
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  {(() => {
                    const status = getStayStatus(activeConversation.checkInDate, activeConversation.checkOutDate);
                    return (
                      <>
                        <Typography sx={{ fontSize: 48, mb: 1 }}>{status.emoji}</Typography>
                        <Typography sx={{ fontSize: 16, fontWeight: 700, color: status.color }}>
                          {status.label}
                        </Typography>
                      </>
                    );
                  })()}
                </Box>
              </AsideSection>
            )}

            <AsideSection title="📋 Détails Réservation">
              <Stack spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Client</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {activeConversation.guestName}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Propriété</Typography>
                  <Typography sx={{ fontSize: 13 }}>{activeConversation.listingName}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Canal</Typography>
                  <Chip label={activeConversation.channel} size="small" />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Numéro de réservation</Typography>
                  <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
                    {activeConversation.reservationNumber}
                  </Typography>
                </Box>
                {activeConversation.checkInDate && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Check-in</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      {new Date(activeConversation.checkInDate).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                )}
                {activeConversation.checkOutDate && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Check-out</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      {new Date(activeConversation.checkOutDate).toLocaleDateString('fr-FR')}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </AsideSection>
          </Stack>
        </ChatAside>
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography sx={{ fontSize: 13, color: t.text4 }}>
            Aucun détail
          </Typography>
        </Box>
      )}
    </ChatLayout>

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
        guestName: activeConversation?.guestName,
        reservationNumber: activeConversation?.reservationNumber,
        type: 'ota',
      }}
    />
    </Box>
  );
}
