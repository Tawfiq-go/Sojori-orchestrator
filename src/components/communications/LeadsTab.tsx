import { useState, useEffect, useRef, useMemo } from 'react';
import { Box, Stack, Typography, CircularProgress, Chip, Button } from '@mui/material';
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

/**
 * Leads Tab - Demandes pré-réservation Airbnb/Booking
 * Tab dans Communications Hub
 *
 * Basé sur: sojori-dashboard LeadsTab.jsx
 * Affiche les demandes de réservation (leads) avant confirmation
 */
export default function LeadsTab() {
  // États
  const [threads, setThreads] = useState<any[]>([]);
  const [selectedThread, setSelectedThread] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('smart');
  const [showAIModal, setShowAIModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger les leads au montage UNE SEULE FOIS - filtrage côté client
  useEffect(() => {
    loadLeads();
  }, []); // Pas de dépendances = charge une seule fois

  // Scroll automatique vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Format time - DOIT être déclaré AVANT les useMemo qui l'utilisent
   */
  const formatTime = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Format date - DOIT être déclaré AVANT les useMemo qui l'utilisent
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
   * Format date courte (pour inline display)
   */
  const formatShortDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  /**
   * Filtrer les leads selon le filtre actif
   * Filters: all, unreplied, replied, airbnb, booking, recent (24h)
   */
  const filteredThreads = useMemo(() => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return threads.filter((thread) => {
      switch (activeFilter) {
        case 'all':
          return true;

        case 'unreplied':
          // Non répondu = pas de message sortant de l'hôte
          return thread.unreadCount > 0 || !thread.hasReplied;

        case 'replied':
          // Répondu = au moins un message de l'hôte
          return thread.hasReplied;

        case 'airbnb':
          // Filtrer par plateforme Airbnb
          return thread.channel.toLowerCase().includes('airbnb');

        case 'booking':
          // Filtrer par plateforme Booking
          return thread.channel.toLowerCase().includes('booking');

        case 'recent':
          // Dernières 24h
          return new Date(thread.lastMessageTime) > twentyFourHoursAgo;

        default:
          return true;
      }
    });
  }, [threads, activeFilter]);

  /**
   * Formater les threads pour ConversationList
   */
  const formattedConversations = useMemo(() => {
    return filteredThreads.map((thread) => ({
      id: thread.id,
      name: thread.guestName,
      initials: thread.guestName[0]?.toUpperCase() || 'P',
      preview: thread.lastMessage || 'Aucun message',
      when: formatTime(thread.lastMessageTime),
      listing: thread.listingName,
      unread: thread.unreadCount > 0,
      unreadCount: thread.unreadCount,
      color: 'gold',
    }));
  }, [filteredThreads]);

  /**
   * Charger la liste des leads
   */
  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      // API: GET /api/v1/reservations/rentals/get-thread?source=lead
      const response = await messagesService.getLeads({
        search: searchTerm || undefined,
        limit: 50,
      });

      if (response.threads) {
        // Format threads
        const formattedThreads = response.threads.map((item: any) => {
          const threadData = item.thread || item;
          const reservation = item.reservation || {};
          const messagesPreview = item.messages || [];

          // Normalize channel name
          let channel = threadData.communicationChannel || 'Unknown';
          if (channel.toLowerCase().includes('booking')) {
            channel = 'Booking.com';
          } else if (channel.toLowerCase().includes('airbnb')) {
            channel = 'Airbnb';
          }

          // Derive hasReplied from messages
          const hasReplied = messagesPreview.some((msg: any) => !msg.isIncoming);

          return {
            id: threadData._id,
            threadId: threadData.threadId,
            reservationNumber: reservation.reservationNumber || 'Lead',
            guestName: reservation.guestName || threadData.recipientName || 'Prospect',
            listingName: reservation.listingName || 'Listing',
            channel: channel,
            lastMessage: threadData.preview || threadData.lastMessage || '',
            lastMessageTime: threadData.lastMessageAt || threadData.lastMessageDate,
            unreadCount: threadData.unreadCount || 0,
            proposedCheckIn: reservation.arrivalDate,
            proposedCheckOut: reservation.departureDate,
            numberOfGuests: reservation.numberOfGuests,
            totalPrice: reservation.totalPrice,
            currency: reservation.currency || 'EUR',
            hasReplied: hasReplied,
          };
        });

        setThreads(formattedThreads);
        // NE PAS auto-sélectionner - l'utilisateur doit cliquer manuellement
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement leads:', err);
      setError(err.message || 'Erreur lors du chargement des leads');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sélectionner un thread
   */
  const handleSelectThread = async (thread: any) => {
    setSelectedThread(thread);
    setLoadingMessages(true);
    setError(null);

    try {
      const response = await messagesService.getLeadMessages(thread.threadId);
      const rawMessages = Array.isArray(response?.messages)
        ? response.messages
        : Array.isArray(response?.data)
          ? response.data
          : [];

      if (rawMessages.length > 0) {
        const formatted = rawMessages.map((msg: any) => ({
          id: msg._id || msg.messageId,
          content: msg.body || msg.message || '',
          timestamp: msg.createdAt || msg.date,
          sender: msg.isIncoming ? 'guest' : 'host',
          senderName: msg.senderName || (msg.isIncoming ? thread.guestName : 'Vous'),
          isIncoming: msg.isIncoming,
          // ✅ Pass status and readAt for status indicators
          status: msg.status,
          readAt: msg.readAt,
        }));

        setMessages(formatted.sort((a: any, b: any) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      }
    } catch (err: any) {
      console.error(`❌ Erreur chargement messages lead:`, err);
      setError(err.message || 'Erreur lors du chargement des messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  /**
   * Envoyer un message
   */
  const handleSendMessage = async (text: string) => {
    if (!selectedThread || !text.trim()) return;

    try {
      await messagesService.sendLeadMessage(selectedThread.threadId, text.trim());

      // Ajouter message localement
      const tempMsg = {
        id: Date.now(),
        content: text.trim(),
        timestamp: new Date().toISOString(),
        sender: 'host',
        senderName: 'Vous',
        isIncoming: false,
      };

      setMessages([...messages, tempMsg]);
    } catch (err: any) {
      console.error('❌ Erreur envoi message:', err);
      alert('Erreur lors de l\'envoi du message');
    }
  };

  // formatTime et formatDate déplacés au début du composant

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
          <Typography sx={{ fontSize: 48, mb: 2 }}>🎯</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
            Aucune demande
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Aucune demande de réservation trouvée
          </Typography>
        </Box>
      </Panel>
    );
  }

  // Layout principal
  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto' }}>
      {/* Filtres - Leads specific */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1, px: { xs: 2, md: 3 } }}>
        {[
          { value: 'all', label: '📋 Tous', tooltip: 'Toutes les demandes' },
          { value: 'unreplied', label: '📭 Non Répondus', tooltip: 'Demandes sans réponse' },
          { value: 'replied', label: '✅ Répondus', tooltip: 'Demandes déjà répondues' },
          { value: 'airbnb', label: '🏠 Airbnb', tooltip: 'Demandes Airbnb uniquement' },
          { value: 'booking', label: '🛎️ Booking', tooltip: 'Demandes Booking.com uniquement' },
          { value: 'recent', label: '🕐 Dernières 24h', tooltip: 'Demandes des dernières 24h' },
        ].map((filter) => (
          <Box
            key={filter.value}
            onClick={() => setActiveFilter(filter.value)}
            title={filter.tooltip}
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
        {/* Colonne 1 : Liste des leads */}
        <Box sx={{ borderRight: `1px solid ${t.border}`, overflowY: 'auto' }}>
        <Box sx={{ p: '14px 16px', borderBottom: `1px solid ${t.border}`, bgcolor: t.bg2 }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>Demandes</Typography>
            <Badge variant="gold">{threads.length}</Badge>
          </Stack>
        </Box>
        <Stack spacing={0}>
          {threads.map((thread) => (
            <Box
              key={thread.id}
              onClick={() => handleSelectThread(thread)}
              sx={{
                p: 2,
                borderBottom: `1px solid ${t.border}`,
                cursor: 'pointer',
                bgcolor: selectedThread?.id === thread.id ? t.bg2 : 'transparent',
                '&:hover': { bgcolor: t.bg2 },
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
                {/* Avatar */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: t.primary,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {thread.guestName[0]?.toUpperCase() || 'P'}
                </Box>

                {/* Contenu */}
                <Stack spacing={0.5} flex={1} minWidth={0}>
                  {/* Nom + Platform Badge + DEMANDE chip */}
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography
                      sx={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: t.text1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {thread.guestName}
                    </Typography>
                    {/* Platform badge with color */}
                    <Chip
                      label={thread.channel}
                      size="small"
                      sx={{
                        fontSize: 10,
                        height: 18,
                        fontWeight: 700,
                        bgcolor: thread.channel.toLowerCase().includes('airbnb')
                          ? '#FF5A5F' // Airbnb red
                          : thread.channel.toLowerCase().includes('booking')
                          ? '#003580' // Booking blue
                          : t.primary,
                        color: '#fff',
                      }}
                    />
                    {/* DEMANDE chip */}
                    <Chip
                      label="DEMANDE"
                      size="small"
                      sx={{
                        fontSize: 9,
                        height: 16,
                        fontWeight: 700,
                        bgcolor: '#9C27B0', // Purple for leads
                        color: '#fff',
                      }}
                    />
                  </Stack>

                  {/* Listing + Dates */}
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: t.text3,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.listingName}
                    {thread.proposedCheckIn && thread.proposedCheckOut && (
                      <> · {formatShortDate(thread.proposedCheckIn)} → {formatShortDate(thread.proposedCheckOut)}</>
                    )}
                  </Typography>

                  {/* Dernier message */}
                  <Typography
                    sx={{
                      fontSize: 12,
                      color: t.text2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {thread.lastMessage}
                  </Typography>

                  {/* Prix */}
                  {thread.totalPrice && (
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: t.primary }}>
                      {thread.totalPrice} {thread.currency}
                    </Typography>
                  )}
                </Stack>

                {/* Time */}
                <Typography sx={{ fontSize: 11, color: t.text3, flexShrink: 0 }}>
                  {formatTime(thread.lastMessageTime)}
                </Typography>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Colonne 2 : Messages */}
      {selectedThread ? (
        <ChatThread
          conv={{
            name: selectedThread.guestName,
            initials: selectedThread.guestName[0]?.toUpperCase() || 'P',
            meta: `${selectedThread.reservationNumber} • ${selectedThread.listingName}`,
            color: 'gold',
          }}
          messages={messages}
          onSend={handleSendMessage}
          onAISuggestion={() => setShowAIModal(true)}
          loading={loadingMessages}
          onBack={() => setSelectedThread(null)}
        />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Typography sx={{ fontSize: 13, color: t.text4 }}>
            Sélectionnez un lead
          </Typography>
        </Box>
      )}

      {/* Colonne 3 : Context panel (Détails lead) */}
      {selectedThread ? (
        <ChatAside>
          <Stack spacing={3}>
            <AsideSection title="📋 Détails Lead">
              <Stack spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Prospect</Typography>
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
                      bgcolor: selectedThread.channel.toLowerCase().includes('airbnb')
                        ? '#FF5A5F'
                        : selectedThread.channel.toLowerCase().includes('booking')
                        ? '#003580'
                        : t.primary,
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Statut</Typography>
                  <Chip
                    label={selectedThread.hasReplied ? 'Répondu' : 'Nouveau'}
                    size="small"
                    sx={{
                      bgcolor: selectedThread.hasReplied ? '#4CAF50' : '#FF9800',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  />
                </Box>
              </Stack>
            </AsideSection>

            <AsideSection title="📅 Dates Demandées">
              <Stack spacing={1.5}>
                {selectedThread.proposedCheckIn && selectedThread.proposedCheckOut ? (
                  <>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Arrivée souhaitée</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {formatDate(selectedThread.proposedCheckIn)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Départ souhaité</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        {formatDate(selectedThread.proposedCheckOut)}
                      </Typography>
                    </Box>
                  </>
                ) : (
                  <Typography sx={{ fontSize: 12, color: t.text3, fontStyle: 'italic' }}>
                    Dates non spécifiées dans la demande
                  </Typography>
                )}
                {selectedThread.numberOfGuests && (
                  <Box>
                    <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Voyageurs</Typography>
                    <Typography sx={{ fontSize: 13 }}>
                      {selectedThread.numberOfGuests} {selectedThread.numberOfGuests > 1 ? 'personnes' : 'personne'}
                    </Typography>
                  </Box>
                )}
                <Box>
                  <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Date de la demande</Typography>
                  <Typography sx={{ fontSize: 13 }}>
                    {formatDate(selectedThread.lastMessageTime)}
                  </Typography>
                </Box>
              </Stack>
            </AsideSection>

            {selectedThread.totalPrice && (
              <AsideSection title="💰 Prix">
                <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.primary }}>
                  {selectedThread.totalPrice} {selectedThread.currency}
                </Typography>
              </AsideSection>
            )}

            {/* Special Offer button (Airbnb only) */}
            {selectedThread.channel.toLowerCase().includes('airbnb') && (
              <AsideSection title="💎 Actions Airbnb">
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    alert('Fonctionnalité Special Offer Airbnb\n\nCette fonctionnalité permet d\'envoyer une offre spéciale au prospect via l\'API Airbnb.\n\nÀ implémenter avec modal de saisie (montant, dates, conditions).');
                  }}
                  sx={{
                    bgcolor: '#FF5A5F',
                    color: '#fff',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: '#E04E53',
                    },
                  }}
                >
                  📨 Envoyer Special Offer
                </Button>
                <Typography sx={{ fontSize: 10, color: t.text3, mt: 1, textAlign: 'center' }}>
                  Proposer un tarif personnalisé au prospect
                </Typography>
              </AsideSection>
            )}
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
        if (selectedThread) {
          handleSendMessage(text);
        }
      }}
      context={{
        conversationHistory: messages,
        guestName: selectedThread?.guestName,
        reservationNumber: selectedThread?.reservationNumber,
        type: 'leads',
      }}
    />
    </Box>
  );
}
