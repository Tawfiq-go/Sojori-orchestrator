import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import ChannelsRail from '../components/unified-inbox/ChannelsRail';
import ThreadsList from '../components/unified-inbox/ThreadsList';
import ConversationThread from '../components/unified-inbox/ConversationThread';
import type { Channel, Thread, Message, QuickTemplate, ChannelType } from '../types/unifiedInbox.types';

/**
 * UnifiedInboxPage - Communications Hub Unified Inbox
 * Design source: Claude Design - Unified Inbox.html
 *
 * Architecture:
 * - 3 colonnes: ChannelsRail (80px) | ThreadsList (320px) | ConversationThread (flex)
 * - Fix de scroll intégré dans chaque composant
 * - Tokens Aurora appliqués
 *
 * Route: /communications/unified-inbox
 */
export default function UnifiedInboxPage() {
  const [activeChannel, setActiveChannel] = useState<ChannelType>('all');
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Mock data - À remplacer par API calls
  const channels: Channel[] = [
    { id: 'all', label: 'Tous', icon: '✦', count: 24 },
    { id: 'wa', label: 'WhatsApp', icon: '💬', color: '#25D366', count: 12 },
    { id: 'ab', label: 'Airbnb', icon: 'A', color: '#FF5A5F', count: 6 },
    { id: 'bk', label: 'Booking', icon: 'B', color: '#003580', count: 4 },
    { id: 'em', label: 'Email', icon: '@', color: '#a78bfa', count: 2 },
  ];

  const threads: Thread[] = [
    {
      id: 1,
      name: 'Sarah Johnson',
      channel: 'wa',
      channelColor: '#25D366',
      preview: 'Merci ! Je suis dans le taxi 🚕',
      time: '2 min',
      unread: 0,
      avatarColor: '#f59e0b',
      listingName: 'Riad El Fenn',
      checkInDate: '15:00',
    },
    {
      id: 2,
      name: 'Marco Rossi',
      channel: 'ab',
      channelColor: '#FF5A5F',
      preview: 'Question about the AC unit, it stopped...',
      time: '8 min',
      unread: 2,
      avatarColor: '#06b6d4',
      listingName: 'Villa Belvédère',
    },
    {
      id: 3,
      name: 'Aisha Khalil',
      channel: 'wa',
      channelColor: '#25D366',
      preview: 'On prend pour 6 ! 🙌',
      time: '14 min',
      unread: 0,
      avatarColor: '#a78bfa',
    },
    {
      id: 4,
      name: 'James Park',
      channel: 'ab',
      channelColor: '#FF5A5F',
      preview: 'Thanks again, amazing stay!',
      time: '34 min',
      unread: 0,
      avatarColor: '#10b981',
    },
    {
      id: 5,
      name: 'Linh Nguyen',
      channel: 'bk',
      channelColor: '#003580',
      preview: 'Need to extend my stay by 2 nights',
      time: '1h',
      unread: 1,
      avatarColor: '#ec4899',
    },
    {
      id: 6,
      name: 'Carlos M.',
      channel: 'wa',
      channelColor: '#25D366',
      preview: 'Could you arrange airport pickup?',
      time: '2h',
      unread: 0,
      avatarColor: '#f97316',
    },
    {
      id: 7,
      name: 'Wei Liu',
      channel: 'em',
      channelColor: '#a78bfa',
      preview: 'Re: Invoice for stay March 12-18',
      time: '3h',
      unread: 0,
      avatarColor: '#3b82f6',
    },
  ];

  const messages: Message[] = [
    { id: 1, from: 'guest', text: 'Bonjour ! Je suis Sarah, j\'arrive à 15h pour le check-in.', time: '14:00' },
    { id: 2, from: 'sojori', text: 'Bonjour Sarah ! 👋 Bienvenue à Marrakech. Voici votre code: 4729. 47 Derb El Hammam.', time: '14:00', isAI: true },
    { id: 3, from: 'guest', text: 'Merci ! Je suis dans le taxi 🚕', time: '14:55' },
    { id: 4, from: 'you', text: 'Parfait ✓ J\'ai informé l\'équipe. Mehdi vous attend devant le riad.', time: '14:55' },
  ];

  const quickTemplates: QuickTemplate[] = [
    { id: '1', label: '👍 Confirmer arrivée', icon: '👍', text: 'Confirmer arrivée' },
    { id: '2', label: '🗺️ Renvoyer GPS', icon: '🗺️', text: 'Renvoyer GPS' },
    { id: '3', label: '✨ Suggérer dîner', icon: '✨', text: 'Suggérer dîner' },
  ];

  useEffect(() => {
    // Simuler chargement initial
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Auto-sélectionner la première conversation
      if (threads.length > 0) {
        setActiveThread(threads[0]);
      }
    }, 500);
  }, []);

  const handleSelectChannel = (channelId: ChannelType) => {
    setActiveChannel(channelId);
    // TODO: Filtrer threads par canal
  };

  const handleSelectThread = (thread: Thread) => {
    setActiveThread(thread);
    setLoadingMessages(true);
    // TODO: Charger messages via API
    setTimeout(() => {
      setLoadingMessages(false);
    }, 300);
  };

  const handleSendMessage = (text: string) => {
    console.log('📤 Envoi message:', text);
    // TODO: Envoyer via API
  };

  const handleSelectTemplate = (template: QuickTemplate) => {
    console.log('✨ Template sélectionné:', template.text);
    // TODO: Pré-remplir l'input avec le template
  };

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, mb: 0.5 }}>
          💬 Unified Inbox
        </Typography>
        <Typography sx={{ fontSize: 13, color: t.text3 }}>
          Tous vos canaux de communication en un seul endroit
        </Typography>
      </Box>

      {/* Inbox Container */}
      {loading ? (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: 620,
            bgcolor: t.bg1,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
          }}
        >
          <CircularProgress size={32} sx={{ color: t.primary }} />
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            height: 620,
            maxHeight: 620,           // ← Fix cascade scroll
            overflow: 'hidden',       // ← Chaque composant enfant gère son scroll
            bgcolor: t.bg1,
            border: `1px solid ${t.border}`,
            borderRadius: '16px',
            boxShadow: '0 1px 2px rgba(26,20,8,0.03)',
          }}
        >
          {/* Col 1: Channels Rail */}
          <ChannelsRail
            channels={channels}
            activeChannel={activeChannel}
            onSelectChannel={handleSelectChannel}
          />

          {/* Col 2: Threads List */}
          <ThreadsList
            threads={threads}
            channels={channels}
            activeThreadId={activeThread?.id || null}
            searchTerm={searchTerm}
            onSelectThread={handleSelectThread}
            onSearchChange={setSearchTerm}
          />

          {/* Col 3: Conversation Thread */}
          {activeThread ? (
            <ConversationThread
              thread={activeThread}
              messages={loadingMessages ? [] : messages}
              quickTemplates={quickTemplates}
              onSendMessage={handleSendMessage}
              onSelectTemplate={handleSelectTemplate}
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
              <Typography sx={{ fontSize: 15, fontWeight: 600 }}>
                Sélectionnez une conversation
              </Typography>
              <Typography sx={{ fontSize: 13, color: t.text3 }}>
                Choisissez un thread pour voir les messages
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
}
