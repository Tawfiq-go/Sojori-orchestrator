import { Box, Stack, Typography, Chip, Button } from '@mui/material';
import { tokens as t, AsideSection, ChatAside } from '../dashboard/DashboardV2.components';
import type { Thread } from '../../types/unifiedInbox.types';

interface ConversationDetailsProps {
  thread: Thread;
  type: 'whatsapp' | 'staff' | 'ota' | 'leads' | 'reviews';
  reservationData?: {
    reservationNumber?: string;
    listingName?: string;
    channel?: string;
    status?: string;
    checkInDate?: string;
    checkOutDate?: string;
    numberOfGuests?: number;
    totalPrice?: number;
    currency?: string;
    hasReplied?: boolean;
  };
  onAction?: (action: string) => void;
}

/**
 * ConversationDetails - Panneau latéral de détails (3e colonne)
 *
 * Affiche les détails de la conversation selon le type:
 * - WhatsApp Guests: Infos réservation
 * - Staff: Infos tâche/contact
 * - OTA: Détails réservation + actions plateforme
 * - Leads: Détails prospect
 * - Reviews: Détails avis
 */
export default function ConversationDetails({
  thread,
  type,
  reservationData,
  onAction,
}: ConversationDetailsProps) {
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatShortDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  // Couleur du channel selon la plateforme
  const getChannelColor = (channel?: string): string => {
    if (!channel) return t.primary;
    const ch = channel.toLowerCase();
    if (ch.includes('airbnb')) return '#FF5A5F';
    if (ch.includes('booking')) return '#003580';
    if (ch.includes('vrbo')) return '#0058A3';
    return t.primary;
  };

  // Section commune: Détails conversation
  const renderBasicInfo = () => (
    <AsideSection title="📋 Détails">
      <Stack spacing={1}>
        <Box>
          <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>
            {type === 'staff' ? 'Contact' : 'Prospect / Guest'}
          </Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
            {thread.name}
          </Typography>
        </Box>

        {thread.phone && (
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Téléphone</Typography>
            <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono' }}>
              {thread.phone}
            </Typography>
          </Box>
        )}

        {reservationData?.listingName && (
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Propriété</Typography>
            <Typography sx={{ fontSize: 13 }}>{reservationData.listingName}</Typography>
          </Box>
        )}

        {reservationData?.channel && (
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Plateforme</Typography>
            <Chip
              label={reservationData.channel}
              size="small"
              sx={{
                bgcolor: getChannelColor(reservationData.channel),
                color: '#fff',
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          </Box>
        )}

        {reservationData?.status && (
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Statut</Typography>
            <Chip
              label={reservationData.status}
              size="small"
              sx={{
                bgcolor: reservationData.hasReplied ? '#4CAF50' : '#FF9800',
                color: '#fff',
                fontWeight: 600,
                fontSize: 11,
              }}
            />
          </Box>
        )}

        {reservationData?.reservationNumber && (
          <Box>
            <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Réservation</Typography>
            <Typography sx={{ fontSize: 12, fontFamily: 'Geist Mono', fontWeight: 600 }}>
              {reservationData.reservationNumber}
            </Typography>
          </Box>
        )}
      </Stack>
    </AsideSection>
  );

  // Section dates
  const renderDates = () => {
    if (!reservationData?.checkInDate && !reservationData?.checkOutDate) return null;

    return (
      <AsideSection title="📅 Dates">
        <Stack spacing={1.5}>
          {reservationData.checkInDate && (
            <Box>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>
                Arrivée
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {formatDate(reservationData.checkInDate)}
              </Typography>
            </Box>
          )}

          {reservationData.checkOutDate && (
            <Box>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>
                Départ
              </Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                {formatDate(reservationData.checkOutDate)}
              </Typography>
            </Box>
          )}

          {reservationData.numberOfGuests && (
            <Box>
              <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.5 }}>Voyageurs</Typography>
              <Typography sx={{ fontSize: 13 }}>
                {reservationData.numberOfGuests}{' '}
                {reservationData.numberOfGuests > 1 ? 'personnes' : 'personne'}
              </Typography>
            </Box>
          )}
        </Stack>
      </AsideSection>
    );
  };

  // Section prix
  const renderPrice = () => {
    if (!reservationData?.totalPrice) return null;

    return (
      <AsideSection title="💰 Prix">
        <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.primary }}>
          {reservationData.totalPrice} {reservationData.currency || 'EUR'}
        </Typography>
      </AsideSection>
    );
  };

  // Section actions plateforme
  const renderPlatformActions = () => {
    if (!reservationData?.channel) return null;

    const channel = reservationData.channel.toLowerCase();
    const isAirbnb = channel.includes('airbnb');
    const isBooking = channel.includes('booking');

    if (!isAirbnb && !isBooking) return null;

    return (
      <AsideSection title={isAirbnb ? '💎 Actions Airbnb' : '🛎️ Actions Booking'}>
        <Stack spacing={1.5}>
          {isAirbnb && type === 'leads' && (
            <>
              <Button
                variant="contained"
                fullWidth
                onClick={() => onAction?.('special-offer')}
                sx={{
                  bgcolor: '#FF5A5F',
                  color: '#fff',
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: 13,
                  '&:hover': { bgcolor: '#E04E53' },
                }}
              >
                📨 Envoyer Special Offer
              </Button>
              <Typography sx={{ fontSize: 10, color: t.text3, textAlign: 'center' }}>
                Proposer un tarif personnalisé
              </Typography>
            </>
          )}

          {(type === 'whatsapp' || type === 'ota') && (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => onAction?.('view-platform')}
              sx={{
                borderColor: getChannelColor(reservationData.channel),
                color: getChannelColor(reservationData.channel),
                fontWeight: 600,
                textTransform: 'none',
                fontSize: 13,
                '&:hover': {
                  borderColor: getChannelColor(reservationData.channel),
                  bgcolor: `${getChannelColor(reservationData.channel)}15`,
                },
              }}
            >
              🔗 Voir sur {isAirbnb ? 'Airbnb' : 'Booking'}
            </Button>
          )}
        </Stack>
      </AsideSection>
    );
  };

  // Layout principal
  return (
    <ChatAside>
      <Stack spacing={3}>
        {renderBasicInfo()}
        {renderDates()}
        {renderPrice()}
        {renderPlatformActions()}

        {/* Debug info (dev only) */}
        {import.meta.env.DEV && (
          <Box sx={{ pt: 2, borderTop: `1px dashed ${t.border}` }}>
            <Typography sx={{ fontSize: 10, color: t.text4, fontFamily: 'Geist Mono' }}>
              Type: {type} | Thread: {thread.id.substring(0, 8)}...
            </Typography>
          </Box>
        )}
      </Stack>
    </ChatAside>
  );
}
