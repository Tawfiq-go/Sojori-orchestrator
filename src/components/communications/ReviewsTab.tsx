import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip, TextField, Button, Rating } from '@mui/material';
import {
  ChatLayout,
  ConversationList,
  ChatThread,
  ChatAside,
  AsideSection,
  Panel,
  tokens as t,
} from '../dashboard/DashboardV2.components';
import messagesService from '../../services/messagesService';
import AISuggestionModal from './AISuggestionModal';

/**
 * Reviews Tab - Avis clients post-stay
 * Tab dans Communications Hub
 *
 * Basé sur: sojori-dashboard ReviewsTab.jsx
 * Affiche les avis/reviews des clients après séjour
 *
 * API endpoints:
 * - GET /rentals/get-review - Get reviews from guests
 * - POST /rentals/replay-send - Send reply to review
 */
export default function ReviewsTab() {
  // États
  const [threads, setThreads] = useState<any[]>([]);
  const [allThreads, setAllThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [replyText, setReplyText] = useState('');

  const [loading, setLoading] = useState(true);
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [showAIModal, setShowAIModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les reviews au montage
  useEffect(() => {
    loadReviews();
  }, []);

  /**
   * Charger la liste des reviews
   */
  const loadReviews = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getReviews({
        limit: 50,
        msgLimit: 30, // Include messages with reviews
      });

      if (response.threads || response.data) {
        const threadsData = response.threads || response.data || [];

        // Format threads with review-specific data
        const formattedThreads = threadsData.map((item: any) => {
          const threadData = item.thread || item;
          const reservation = item.reservation || {};
          const messages = item.messages || [];

          // Parse review data from messages
          const reviewData = parseReviewData(messages);

          return {
            id: threadData._id,
            threadId: threadData.threadId,
            reservationNumber: reservation.reservationNumber || threadData.reservationId || 'N/A',
            guestName: reservation.guestName || threadData.recipientName || 'Guest',
            listingName: reservation.listingName || threadData.listingName || 'Listing',
            channel: normalizeChannel(threadData.communicationChannel || threadData.channelName || reservation.channelName || 'Unknown'),
            lastMessage: reviewData.message || threadData.preview || '',
            lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
            rating: reviewData.rating,
            reviewText: reviewData.message,
            categories: reviewData.categories,
            response: reviewData.response,
            responseDate: reviewData.responseDate,
            replied: !!reviewData.response,
            checkInDate: reservation.checkInDate || reservation.arrivalDate,
            checkOutDate: reservation.checkOutDate || reservation.departureDate,
            messages: messages,
          };
        });

        setAllThreads(formattedThreads);
        setThreads(formattedThreads);
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement reviews:', err);
      setError(err.message || 'Erreur lors du chargement des avis');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Parse review data from messages (legacy format)
   */
  const parseReviewData = (messages: any[]): {
    rating: number;
    message: string;
    categories: Record<string, number>;
    response: string;
    responseDate: string | null;
  } => {
    let rating = 5;
    let message = '';
    let categories: Record<string, number> = {};
    let response = '';
    let responseDate: string | null = null;

    for (const msg of messages || []) {
      const body = msg?.body;
      if (!body) continue;

      // HTML format (Booking.com)
      if (typeof body === 'string' && body.trim().startsWith('<')) {
        const overallScore = parseOverallScoreFromBookingHtml(body);
        if (overallScore != null) rating = overallScore;
        const plain = stripHtml(body);
        if (plain.length > 12) message = message || plain;
        continue;
      }

      // JSON format (Airbnb)
      try {
        const data = typeof body === 'string' ? JSON.parse(body) : body;
        if (data.Rating != null && data.Rating !== '') rating = Number(data.Rating) || rating;
        if (data.Message) message = message || String(data.Message);
        if (data.Categories && typeof data.Categories === 'object') {
          categories = { ...categories, ...data.Categories };
        }
        if (data.Response) {
          response = String(data.Response);
          responseDate = data.ResponseDate ?? responseDate;
        }
      } catch {
        const plain = stripHtml(String(body));
        if (plain.length > 12) message = message || plain;
      }
    }

    return { rating, message, categories, response, responseDate };
  };

  /**
   * Parse overall score from Booking.com HTML review
   */
  const parseOverallScoreFromBookingHtml = (html: string): number | null => {
    if (typeof html !== 'string') return null;
    const match = html.match(/Overall score[^0-9]*(\d+)/i) || html.match(/Overall[^0-9]*(\d+)/i);
    if (!match) return null;
    const score = Number.parseInt(match[1], 10);
    return Number.isFinite(score) ? score : null;
  };

  /**
   * Strip HTML tags
   */
  const stripHtml = (html: string): string => {
    if (!html || typeof html !== 'string') return '';
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  };

  /**
   * Normalize channel name
   */
  const normalizeChannel = (channel: string): string => {
    if (channel.toLowerCase().includes('booking')) return 'BookingCom';
    if (channel.toLowerCase().includes('airbnb')) return 'Airbnb';
    return channel;
  };

  /**
   * Sélectionner un thread
   */
  const handleSelectThread = (thread: any) => {
    setSelectedThread(thread);
    setReplyText(thread.response || '');
  };

  /**
   * Envoyer une réponse à l'avis
   */
  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim()) return;

    setSendingReply(true);
    try {
      await messagesService.replyToReview(selectedThread.threadId, replyText.trim());

      // Update local state
      const updatedThread = {
        ...selectedThread,
        response: replyText.trim(),
        responseDate: new Date().toISOString(),
        replied: true,
      };

      setSelectedThread(updatedThread);
      setThreads(prev => prev.map(t => t.id === updatedThread.id ? updatedThread : t));
      setAllThreads(prev => prev.map(t => t.id === updatedThread.id ? updatedThread : t));

      // Success message
      alert('Réponse publiée avec succès!');
    } catch (err: any) {
      console.error('❌ Erreur envoi réponse:', err);
      alert('Erreur lors de l\'envoi de la réponse');
    } finally {
      setSendingReply(false);
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  /**
   * Format time
   */
  const formatTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Get initials from name
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
   * Format relative time
   */
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

  /**
   * Filtrer et trier les reviews selon le filtre actif
   */
  const filteredThreads = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let filtered = threads.filter((thread) => {
      switch (activeFilter) {
        case 'replied':
          // Already replied
          return thread.replied;

        case 'unreplied':
          // Not replied yet
          return !thread.replied;

        case 'airbnb':
          // Airbnb only
          return thread.channel === 'Airbnb';

        case 'booking':
          // Booking only
          return thread.channel === 'BookingCom';

        case '5stars':
          // 5-star reviews
          return thread.rating === 5;

        case '4stars':
          // 4-star reviews
          return thread.rating === 4;

        case 'low':
          // 3 stars or below
          return thread.rating <= 3;

        case 'all':
        default:
          return true;
      }
    });

    // Sort by most recent
    filtered.sort((a, b) =>
      new Date(b.lastMessageTime || 0).getTime() - new Date(a.lastMessageTime || 0).getTime()
    );

    return filtered;
  }, [threads, activeFilter]);

  /**
   * Render star rating
   */
  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= rating) {
        stars.push(<span key={i} style={{ color: '#FFD700', fontSize: 20 }}>⭐</span>);
      } else {
        stars.push(<span key={i} style={{ color: '#E0E0E0', fontSize: 20 }}>☆</span>);
      }
    }
    return <Box sx={{ display: 'flex', gap: 0.5 }}>{stars}</Box>;
  };

  /**
   * Get platform badge color
   */
  const getPlatformColor = (channel: string) => {
    if (channel === 'Airbnb') return { bg: '#FF5A5F', text: '#FFF' };
    if (channel === 'BookingCom') return { bg: '#003580', text: '#FFF' };
    return { bg: '#9E9E9E', text: '#FFF' };
  };

  /**
   * Format conversations for ConversationList
   */
  const formattedConversations = filteredThreads.map((thread) => ({
    id: thread.id,
    name: thread.guestName,
    initials: getInitials(thread.guestName),
    preview: thread.reviewText || thread.lastMessage,
    when: formatRelativeTime(thread.lastMessageTime),
    listing: thread.listingName,
    unread: !thread.replied,
    unreadCount: thread.replied ? 0 : 1,
    color: 'orange' as const,
  }));

  // Affichage vide
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

  if (threads.length === 0) {
    return (
      <Panel>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography sx={{ fontSize: 48, mb: 2 }}>⭐</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
            Aucun avis
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Aucun avis client trouvé
          </Typography>
        </Box>
      </Panel>
    );
  }

  // Layout principal
  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      {/* Filtres */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1, px: { xs: 2, md: 3 } }}>
        {[
          { value: 'all', label: 'Tous' },
          { value: 'replied', label: '✅ Répondu' },
          { value: 'unreplied', label: '⏳ Non répondu' },
          { value: 'airbnb', label: '🏠 Airbnb' },
          { value: 'booking', label: '🅱️ Booking' },
          { value: '5stars', label: '⭐⭐⭐⭐⭐ 5 étoiles' },
          { value: '4stars', label: '⭐⭐⭐⭐ 4 étoiles' },
          { value: 'low', label: '⚠️ 3 étoiles ou moins' },
        ].map((filter) => (
          <Box
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: '8px',
              fontSize: 12.5,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              bgcolor: activeFilter === filter.value ? t.primary : t.bg2,
              color: activeFilter === filter.value ? '#fff' : t.text3,
              border: `1px solid ${activeFilter === filter.value ? t.primaryDeep : t.border}`,
              '&:hover': {
                bgcolor: activeFilter === filter.value ? t.primaryDeep : t.bg3,
              },
            }}
          >
            {filter.label}
          </Box>
        ))}
      </Stack>

      <ChatLayout>
        {/* Colonne 1 : Liste conversations */}
        <ConversationList
        conversations={formattedConversations}
        activeId={selectedThread?.id}
        onSelect={(id: string) => {
          const thread = threads.find((t) => t.id === id);
          if (thread) handleSelectThread(thread);
        }}
      />

      {/* Colonne 2 : Review Details */}
      {selectedThread ? (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Header */}
          <Box
            sx={{
              p: 2.5,
              borderBottom: `1px solid ${t.border}`,
              bgcolor: t.bg1,
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
                bgcolor: t.primary,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {getInitials(selectedThread.guestName)}
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 0.5 }}>
                {selectedThread.guestName}
              </Typography>
              <Typography sx={{ fontSize: 12, color: t.text3 }}>
                {selectedThread.reservationNumber} • {selectedThread.listingName}
              </Typography>
            </Box>
            <Chip
              label={selectedThread.channel}
              size="small"
              sx={{
                bgcolor: getPlatformColor(selectedThread.channel).bg,
                color: getPlatformColor(selectedThread.channel).text,
                fontWeight: 600,
              }}
            />
          </Box>

          {/* Review Content - Scrollable */}
          <Box sx={{ flex: 1, overflow: 'auto', p: 3, bgcolor: t.bg2 }}>
            {/* Star Rating Card */}
            <Box
              sx={{
                bgcolor: t.bg1,
                borderRadius: 2,
                p: 3,
                mb: 2.5,
                border: `2px solid ${t.border}`,
                textAlign: 'center',
              }}
            >
              <Typography sx={{ fontSize: 48, fontWeight: 700, color: '#FFD700', mb: 1 }}>
                {selectedThread.rating.toFixed(1)}
              </Typography>
              {renderStars(selectedThread.rating)}
              <Typography sx={{ fontSize: 12, color: t.text3, mt: 1 }}>
                Note globale
              </Typography>
            </Box>

            {/* Review Text Card */}
            {selectedThread.reviewText && (
              <Box
                sx={{
                  bgcolor: t.bg1,
                  borderRadius: 2,
                  p: 3,
                  mb: 2.5,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5, color: t.text2 }}>
                  💬 Commentaire du client
                </Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {selectedThread.reviewText}
                </Typography>
                {selectedThread.lastMessageTime && (
                  <Typography sx={{ fontSize: 11, color: t.text4, mt: 1.5 }}>
                    Publié le {formatDate(selectedThread.lastMessageTime)}
                  </Typography>
                )}
              </Box>
            )}

            {/* Category Scores */}
            {selectedThread.categories && Object.keys(selectedThread.categories).length > 0 && (
              <Box
                sx={{
                  bgcolor: t.bg1,
                  borderRadius: 2,
                  p: 3,
                  mb: 2.5,
                  border: `1px solid ${t.border}`,
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 2, color: t.text2 }}>
                  📊 Évaluation par catégorie
                </Typography>
                {Object.entries(selectedThread.categories).map(([key, value]: [string, any]) => (
                  <Box key={key} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 12, color: t.text3 }}>{key}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value}/5</Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 6,
                        bgcolor: t.bg3,
                        borderRadius: 1,
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(value / 5) * 100}%`,
                          height: '100%',
                          bgcolor: value >= 4 ? '#4CAF50' : value >= 3 ? '#FF9800' : '#F44336',
                          borderRadius: 1,
                        }}
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Host Response Section */}
            {selectedThread.replied ? (
              <Box
                sx={{
                  bgcolor: '#E8F5E9',
                  borderRadius: 2,
                  p: 3,
                  border: `2px solid #4CAF50`,
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5, color: '#2E7D32' }}>
                  ✅ Votre réponse publique
                </Typography>
                <Typography sx={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: 1.5 }}>
                  {selectedThread.response}
                </Typography>
                {selectedThread.responseDate && (
                  <Typography sx={{ fontSize: 11, color: t.text4 }}>
                    Répondu le {formatDate(selectedThread.responseDate)}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  bgcolor: t.bg1,
                  borderRadius: 2,
                  p: 3,
                  border: `2px solid ${t.primary}`,
                }}
              >
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1.5, color: t.text2 }}>
                  📝 Répondre publiquement à ce review
                </Typography>
                <Typography sx={{ fontSize: 12, color: t.text3, mb: 2 }}>
                  Cette réponse sera visible publiquement sur {selectedThread.channel}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  placeholder="Écrivez votre réponse publique (remerciements, clarifications, engagement...)..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      bgcolor: t.bg2,
                    },
                  }}
                />
                <Typography sx={{ fontSize: 11, color: t.text4, mb: 2 }}>
                  {replyText.length} / 500 caractères
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  disabled={!replyText.trim() || sendingReply}
                  onClick={handleSendReply}
                  sx={{
                    bgcolor: t.primary,
                    color: '#fff',
                    fontWeight: 600,
                    py: 1.25,
                    '&:hover': {
                      bgcolor: t.primaryDeep,
                    },
                  }}
                >
                  {sendingReply ? 'Envoi en cours...' : 'Publier la réponse'}
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography sx={{ fontSize: 48, mb: 2 }}>⭐</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
              Sélectionnez un avis
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Choisissez un avis dans la liste pour voir les détails
            </Typography>
          </Box>
        </Box>
      )}

      {/* Colonne 3 : Context panel */}
      {selectedThread ? (
        <ChatAside>
          <Stack spacing={3}>
            <AsideSection title="⭐ Évaluation">
              <Stack spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Note</Typography>
                  <Typography sx={{ fontSize: 28, fontWeight: 700, color: '#FFD700' }}>
                    {selectedThread.rating.toFixed(1)}/5
                  </Typography>
                  {renderStars(selectedThread.rating)}
                </Box>
              </Stack>
            </AsideSection>

            <AsideSection title="📋 Détails">
              <Stack spacing={1.5}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Client</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                    {selectedThread.guestName}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Propriété</Typography>
                  <Typography sx={{ fontSize: 13 }}>{selectedThread.listingName}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Plateforme</Typography>
                  <Chip
                    label={selectedThread.channel}
                    size="small"
                    sx={{
                      bgcolor: getPlatformColor(selectedThread.channel).bg,
                      color: getPlatformColor(selectedThread.channel).text,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Réservation</Typography>
                  <Typography sx={{ fontSize: 13 }}>{selectedThread.reservationNumber}</Typography>
                </Box>
              </Stack>
            </AsideSection>

            <AsideSection title="📅 Séjour">
              <Stack spacing={1.5}>
                {selectedThread.checkInDate && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Arrivée</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      {formatDate(selectedThread.checkInDate)}
                    </Typography>
                  </Box>
                )}
                {selectedThread.checkOutDate && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Départ</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      {formatDate(selectedThread.checkOutDate)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </AsideSection>

            <AsideSection title="📊 Statut">
              {selectedThread.replied ? (
                <Chip
                  label="✅ Répondu"
                  color="success"
                  sx={{ width: '100%', fontWeight: 600 }}
                />
              ) : (
                <Chip
                  label="⏳ Non répondu"
                  color="warning"
                  sx={{ width: '100%', fontWeight: 600 }}
                />
              )}
            </AsideSection>
          </Stack>
        </ChatAside>
      ) : null}
    </ChatLayout>

    {/* Modal de suggestion IA */}
    <AISuggestionModal
      open={showAIModal}
      onClose={() => setShowAIModal(false)}
      onUseSuggestion={(text) => {
        if (selectedThread) {
          setReplyText(text);
        }
      }}
      context={{
        conversationHistory: [],
        guestName: selectedThread?.guestName,
        reservationNumber: selectedThread?.reservationNumber,
        type: 'reviews',
        reviewText: selectedThread?.reviewText,
        rating: selectedThread?.rating,
      }}
    />
    </Box>
  );
}
