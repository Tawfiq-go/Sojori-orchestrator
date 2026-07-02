import { useState, useEffect } from 'react';
import { Box, Stack, Typography, CircularProgress } from '@mui/material';
import {
  Panel,
  DataTable,
  Badge,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import messagesService from '../services/messagesService';
import { useAdminOwnerApiScope } from '../hooks/useAdminOwnerApiScope';
import type { Conversation } from '../types/messages.types';

/**
 * Page Messages OTA - Messages provenant des plateformes (Airbnb, Booking, etc.)
 * Route: /communications/messages-ota
 *
 * Note: Pour l'instant, cette page affiche toutes les conversations.
 * TODO: Ajouter filtre spécifique OTA quand backend sera prêt.
 */
export default function MessagesOTAPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { scopeFetchReady, requestOwnerId } = useAdminOwnerApiScope();

  useEffect(() => {
    if (!scopeFetchReady) return;
    loadOTAMessages();
  }, [scopeFetchReady, requestOwnerId]);

  const loadOTAMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await messagesService.getConversations({
        filter: 'recent',
        limit: 100,
        owner_id: requestOwnerId || undefined,
      });

      if (response.status === 'success') {
        // Filtrer uniquement les messages avec channel_name (OTA)
        const otaConversations = response.data.conversations.filter(
          (conv) => conv.channel_name && conv.channel_name !== 'Direct'
        );
        setConversations(otaConversations);
      }
    } catch (err: any) {
      console.error('❌ Erreur chargement messages OTA:', err);
      setError(err.message || 'Erreur lors du chargement des messages OTA');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChannelBadge = (channel?: string): any => {
    if (!channel) return { label: 'N/A', variant: 'neutral' };

    if (channel.toLowerCase().includes('airbnb')) {
      return { label: '🏠 Airbnb', variant: 'info' };
    }
    if (channel.toLowerCase().includes('booking')) {
      return { label: '🅱️ Booking', variant: 'gold' };
    }
    if (channel.toLowerCase().includes('vrbo')) {
      return { label: '🏡 VRBO', variant: 'warning' };
    }
    return { label: `📧 ${channel}`, variant: 'neutral' };
  };

  const getStatusBadge = (status?: string): any => {
    if (!status) return { label: 'N/A', variant: 'neutral' };

    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'checked_in':
        return { label: '✅ Confirmé', variant: 'success' };
      case 'pending':
        return { label: '⏳ En attente', variant: 'warning' };
      case 'cancelled':
        return { label: '❌ Annulé', variant: 'error' };
      default:
        return { label: status, variant: 'neutral' };
    }
  };

  const tableColumns = [
    {
      key: 'channel',
      label: 'Canal',
      width: '140px',
      render: (row: Conversation) => {
        const badge = getChannelBadge(row.channel_name);
        return <Badge variant={badge.variant} small>{badge.label}</Badge>;
      },
    },
    {
      key: 'guest',
      label: 'Guest',
      render: (row: Conversation) => (
        <Box>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.name || row.phone}</Typography>
          <Typography sx={{ fontSize: 11, color: t.text3, fontFamily: 'Geist Mono' }}>
            {row.phone}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'reservation',
      label: 'Réservation',
      width: '140px',
      render: (row: Conversation) => (
        <Typography sx={{ fontSize: 12, fontFamily: 'Geist Mono' }}>
          {row.reservation_number || 'N/A'}
        </Typography>
      ),
    },
    {
      key: 'listing',
      label: 'Propriété',
      render: (row: Conversation) => (
        <Typography sx={{ fontSize: 12 }}>{row.listing_name || 'N/A'}</Typography>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      width: '130px',
      render: (row: Conversation) => {
        const badge = getStatusBadge(row.status);
        return <Badge variant={badge.variant} small>{badge.label}</Badge>;
      },
    },
    {
      key: 'last_message',
      label: 'Dernier message',
      width: '160px',
      render: (row: Conversation) => (
        <Typography sx={{ fontSize: 11.5, color: t.text3 }}>
          {formatDate(row.last_message_time)}
        </Typography>
      ),
    },
    {
      key: 'messages_count',
      label: 'Messages',
      width: '100px',
      align: 'center' as const,
      render: (row: Conversation) => (
        <Box sx={{ textAlign: 'center' }}>
          <Badge variant="neutral">{row.messages_count || 0}</Badge>
        </Box>
      ),
    },
  ];

  const tableRows = conversations.map((conv) => ({
    id: conv.phone,
    ...conv,
  }));

  return (
    <Box sx={{ maxWidth: 1600, mx: 'auto', px: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Typography sx={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>
              📨 Messages OTA
            </Typography>
            <Badge variant="gold">
              {conversations.length}
            </Badge>
          </Stack>
          <Typography sx={{ fontSize: 13, color: t.text3 }}>
            Messages provenant des plateformes (Airbnb, Booking.com, VRBO, etc.)
          </Typography>
        </Box>
      </Stack>

      {/* Filtres rapides */}
      <Stack direction="row" spacing={1} sx={{ mb: 2.5, flexWrap: 'wrap', rowGap: 1 }}>
        <Box
          sx={{
            px: 2,
            py: 0.75,
            borderRadius: '8px',
            fontSize: 12.5,
            fontWeight: 600,
            bgcolor: t.bg2,
            color: t.text3,
            border: `1px solid ${t.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          📊 {conversations.length} conversations OTA
        </Box>
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

      {/* Table ou états de chargement */}
      {loading ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <CircularProgress size={32} sx={{ color: t.primary }} />
            <Typography sx={{ mt: 2, fontSize: 13, color: t.text3 }}>
              Chargement des messages OTA...
            </Typography>
          </Box>
        </Panel>
      ) : conversations.length === 0 ? (
        <Panel>
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography sx={{ fontSize: 48, mb: 2 }}>📨</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, mb: 1 }}>
              Aucun message OTA
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text3 }}>
              Les messages provenant des plateformes apparaîtront ici
            </Typography>
          </Box>
        </Panel>
      ) : (
        <DataTable
          columns={tableColumns}
          rows={tableRows}
          onRowClick={(row: Conversation) => {
            console.log('Clic sur conversation OTA:', row);
            // TODO: Ouvrir modal détail ou naviguer vers page détail
          }}
          footer={
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              💡 Astuce : Cliquez sur une ligne pour voir la conversation complète
            </Typography>
          }
        />
      )}

      {/* Info box */}
      <Box
        sx={{
          mt: 3,
          p: 2.5,
          bgcolor: t.infoTint,
          border: `1px solid ${t.info}`,
          borderRadius: '12px',
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Typography sx={{ fontSize: 20 }}>💡</Typography>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 0.5, color: t.info }}>
              À propos des messages OTA
            </Typography>
            <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.6 }}>
              Les messages OTA sont automatiquement synchronisés depuis vos canaux de distribution
              (Airbnb, Booking.com, VRBO). Les réponses peuvent être gérées directement depuis
              cette interface ou via les plateformes respectives.
            </Typography>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
