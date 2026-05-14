import { useMemo, useState } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CommunicationsSectionToggle } from '../components/CommunicationsSectionToggle';
import {
  PageHeader, ChatLayout, ConversationList, ChatThread, ChatAside, AsideSection, Revenue,
  Badge, SourcePill, btnPrimarySx, btnGhostSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Alert, Box, Button, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA - Realistic OTA Conversations & Messages
// ═══════════════════════════════════════════════════════════════

interface OTAConversation {
  id: string;
  guestName: string;
  initials: string;
  color: string;
  preview: string;
  when: string;
  listingName: string;
  reservationNumber: string;
  ota: 'Airbnb' | 'Booking.com' | 'Vrbo';
  unreadCount?: number;
  unread?: boolean;
  updatedAt: string;
  checkIn: string;
  checkOut: string;
  revenue: string;
  status: 'confirmed' | 'pending' | 'completed';
}

interface OTAMessage {
  type?: 'day' | 'msg';
  from?: 'them' | 'you';
  text: string;
  when?: string;
}

const MOCK_CONVERSATIONS: OTAConversation[] = [
  {
    id: 'sarah-airbnb',
    guestName: 'Sarah Johnson',
    initials: 'SJ',
    color: 'gold',
    preview: 'Could you arrange airport pickup? Flight lands at 14:30.',
    when: '10:24',
    listingName: 'Villa Belvédère',
    reservationNumber: 'RES-2026-001',
    ota: 'Airbnb',
    unreadCount: 2,
    unread: true,
    updatedAt: '2026-05-13T10:24:00',
    checkIn: '2026-05-15',
    checkOut: '2026-05-22',
    revenue: '€1,840',
    status: 'confirmed',
  },
  {
    id: 'marco-booking',
    guestName: 'Marco Rossi',
    initials: 'MR',
    color: 'cyan',
    preview: 'Buongiorno! È possibile fare check-in alle 11:00?',
    when: '09:55',
    listingName: 'Dar Sojori',
    reservationNumber: 'RES-2026-002',
    ota: 'Booking.com',
    unreadCount: 1,
    unread: true,
    updatedAt: '2026-05-13T09:55:00',
    checkIn: '2026-05-16',
    checkOut: '2026-05-23',
    revenue: '€1,260',
    status: 'confirmed',
  },
  {
    id: 'aisha-airbnb',
    guestName: 'Aisha Khalil',
    initials: 'AK',
    color: 'pink',
    preview: 'Thank you Sofia! The welcome basket is lovely ✨',
    when: 'Hier',
    listingName: 'Villa Atlas',
    reservationNumber: 'RES-2026-003',
    ota: 'Airbnb',
    updatedAt: '2026-05-12T15:45:00',
    checkIn: '2026-05-10',
    checkOut: '2026-05-17',
    revenue: '€2,100',
    status: 'confirmed',
  },
  {
    id: 'pierre-vrbo',
    guestName: 'Pierre Dubois',
    initials: 'PD',
    color: 'green',
    preview: 'Is there parking available near the riad?',
    when: '12 mai',
    listingName: 'Riad Jasmine',
    reservationNumber: 'RES-2026-004',
    ota: 'Vrbo',
    updatedAt: '2026-05-12T14:20:00',
    checkIn: '2026-05-18',
    checkOut: '2026-05-21',
    revenue: '€980',
    status: 'confirmed',
  },
  {
    id: 'emma-booking',
    guestName: 'Emma Watson',
    initials: 'EW',
    color: 'purple',
    preview: 'Perfect stay! Everything was exactly as described.',
    when: '11 mai',
    listingName: 'Villa Belvédère',
    reservationNumber: 'RES-2026-005',
    ota: 'Booking.com',
    updatedAt: '2026-05-11T11:05:00',
    checkIn: '2026-05-08',
    checkOut: '2026-05-11',
    revenue: '€1,450',
    status: 'completed',
  },
  {
    id: 'ahmed-airbnb',
    guestName: 'Ahmed Hassan',
    initials: 'AH',
    color: 'orange',
    preview: 'Can you recommend good restaurants for traditional food?',
    when: '10 mai',
    listingName: 'Dar Sojori',
    reservationNumber: 'RES-2026-006',
    ota: 'Airbnb',
    updatedAt: '2026-05-10T16:45:00',
    checkIn: '2026-05-14',
    checkOut: '2026-05-20',
    revenue: '€1,680',
    status: 'confirmed',
  },
];

const MOCK_MESSAGES: Record<string, OTAMessage[]> = {
  'sarah-airbnb': [
    { type: 'day', text: 'Hier · 12 mai' },
    { from: 'them', text: "Hi! We're so excited for our stay at Villa Belvédère next week! The property looks absolutely stunning 😍", when: '14:30' },
    { from: 'you', text: "Hello Sarah! Thank you so much, we're thrilled to host you! The villa is ready and waiting. Let me know if you need anything before arrival.", when: '15:15 ✓✓' },
    { type: 'day', text: "Aujourd'hui · 13 mai" },
    { from: 'them', text: 'Good morning! I have a quick question - could you arrange airport pickup for us?', when: '10:20' },
    { from: 'them', text: 'Our flight lands at NCE airport at 14:30 on May 15th. There will be 4 of us with luggage.', when: '10:24' },
  ],
  'marco-booking': [
    { type: 'day', text: "Aujourd'hui · 13 mai" },
    { from: 'them', text: 'Buongiorno! Mi chiamo Marco, ho prenotato Dar Sojori dal 16 al 23 maggio.', when: '09:45' },
    { from: 'them', text: 'Il nostro volo arriva la mattina presto. È possibile fare il check-in alle 11:00 invece delle 15:00?', when: '09:55' },
  ],
  'aisha-airbnb': [
    { type: 'day', text: 'Avant-hier · 11 mai' },
    { from: 'them', text: "Hi Sofia! Just wanted to confirm our check-in details for tomorrow. We should arrive around 3pm.", when: '18:20' },
    { from: 'you', text: "Perfect Aisha! I'll be there to welcome you at 3pm. The villa is all ready for you 🏡", when: '18:45 ✓✓' },
    { type: 'day', text: 'Hier · 12 mai' },
    { from: 'them', text: "We've arrived and WOW! The villa is even more beautiful than the photos! 😍", when: '15:30' },
    { from: 'them', text: 'Thank you Sofia! The welcome basket with local treats is such a lovely touch ✨', when: '15:45' },
    { from: 'you', text: "I'm so happy you love it! Enjoy your stay, and don't hesitate to reach out if you need anything 💛", when: '16:00 ✓✓' },
  ],
  'pierre-vrbo': [
    { type: 'day', text: '12 mai' },
    { from: 'them', text: 'Bonjour, nous avons réservé le Riad Jasmine pour 3 nuits à partir du 18 mai.', when: '14:15' },
    { from: 'them', text: 'Y a-t-il un parking à proximité ? Nous venons en voiture de location.', when: '14:20' },
    { from: 'you', text: "Bonjour Pierre! Oui, il y a un parking public sécurisé à 200m du riad. Je vous enverrai les détails dans le guide d'accueil.", when: '15:30 ✓✓' },
  ],
  'emma-booking': [
    { type: 'day', text: '11 mai' },
    { from: 'them', text: "Just checked out from Villa Belvédère. What an amazing stay! Everything was perfect from start to finish 🌟", when: '11:00' },
    { from: 'them', text: 'The villa, the service, the location - all exceeded our expectations. Thank you so much!', when: '11:05' },
    { from: 'you', text: "Thank you Emma! It was our absolute pleasure to host you. We hope to welcome you back soon! 💛", when: '11:30 ✓✓' },
  ],
  'ahmed-airbnb': [
    { type: 'day', text: '10 mai' },
    { from: 'them', text: "Hello! We're arriving in 4 days and very excited! Can you recommend restaurants for traditional Moroccan food?", when: '16:45' },
    { from: 'you', text: "Hello Ahmed! I'm preparing a personalized restaurant guide for you with my top 5 favorites. I'll send it tomorrow!", when: '17:15 ✓✓' },
  ],
};

function RowKV({ k, v, mono, divider }: { k: string; v: any; mono?: boolean; divider?: boolean }) {
  return (
    <Stack direction="row" sx={{
      justifyContent: 'space-between',
      alignItems: 'center',
      pt: divider ? 0.875 : 0,
      borderTop: divider ? `1px dashed ${t.border}` : 'none',
    }}>
      <Typography sx={{ color: t.text3, fontSize: 12 }}>{k}</Typography>
      <Box sx={{ fontWeight: 600, fontSize: 12, fontFamily: mono ? 'Geist Mono' : 'inherit' }}>{v}</Box>
    </Stack>
  );
}

export function OTAMessagesPage() {
  const [activeConv, setActiveConv] = useState('sarah-airbnb');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({
    searchTerm: '',
    ota: 'all',
    listing: 'all',
    status: 'all',
    dateRange: 'all',
  });
  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS);
  const [messagesByConversation, setMessagesByConversation] = useState(MOCK_MESSAGES);

  const conv = conversations.find(c => c.id === activeConv) || conversations[0];
  const messages = messagesByConversation[activeConv] || [];
  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const searchMatch =
        !filters.searchTerm ||
        conversation.guestName.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        conversation.preview.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        conversation.reservationNumber.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const otaMatch = filters.ota === 'all' || conversation.ota === filters.ota;
      const listingMatch = filters.listing === 'all' || conversation.listingName === filters.listing;
      const statusMatch =
        filters.status === 'all' ||
        (filters.status === 'unread' && (conversation.unreadCount ?? 0) > 0) ||
        (filters.status === 'read' && !(conversation.unreadCount ?? 0)) ||
        (filters.status === conversation.status);
      const updatedAt = new Date(conversation.updatedAt);
      const dateMatch =
        filters.dateRange === 'all' ||
        (filters.dateRange === 'today' && updatedAt.toDateString() === new Date().toDateString()) ||
        (filters.dateRange === '7d' && updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      return searchMatch && otaMatch && listingMatch && statusMatch && dateMatch;
    });
  }, [conversations, filters]);

  // Calculate conversation meta info
  const getConvMeta = () => {
    if (!conv) return '';
    const daysDiff = Math.floor((new Date(conv.checkIn).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    const stayStatus = daysDiff > 0
      ? `Arrive dans ${daysDiff}j`
      : daysDiff === 0
      ? "Arrive aujourd'hui"
      : conv.status === 'completed'
      ? 'Séjour terminé'
      : 'En séjour';

    return `${conv.listingName} · ${stayStatus} · ${conv.ota}`;
  };

  // Stats
  const totalConversations = conversations.length;
  const unreadCount = conversations.filter(c => c.unread).length;
  const airbnbCount = conversations.filter(c => c.ota === 'Airbnb').length;
  const bookingCount = conversations.filter(c => c.ota === 'Booking.com').length;

  const formatMessageTime = (date: Date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleSendMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !conv) return;

    const sentAt = new Date();
    const nextMessage: OTAMessage = {
      from: 'you',
      text: trimmed,
      type: 'msg',
      when: `${formatMessageTime(sentAt)} ✓`,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [conv.id]: [...(prev[conv.id] || []), nextMessage],
    }));
    setConversations((prev) =>
      prev.map((item) =>
        item.id === conv.id
          ? {
              ...item,
              preview: trimmed,
              when: formatMessageTime(sentAt),
              unread: false,
              unreadCount: 0,
              updatedAt: sentAt.toISOString(),
            }
          : item,
      ),
    );
    setToast(`Message envoyé via ${conv.ota}`);
  };

  return (
    <DashboardWrapper breadcrumb={['Communications', 'Messages OTA']}>
      <PageHeader title="Messages OTA" count={`${unreadCount} non lus`}>
        <CommunicationsSectionToggle />
        <Button sx={btnGhostSx}>
          <SourcePill source="Airbnb" /> {airbnbCount}
        </Button>
        <Button sx={btnGhostSx}>
          <SourcePill source="Booking.com" /> {bookingCount}
        </Button>
        <Button sx={btnPrimarySx}>📨 Inbox OTA ({totalConversations})</Button>
      </PageHeader>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          px: { xs: 2, md: 3 },
          pb: 2,
          flexWrap: 'wrap',
          rowGap: 1.5,
        }}
      >
        <TextField
          size="small"
          label="Recherche"
          value={filters.searchTerm}
          onChange={(e) => setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))}
          sx={{ minWidth: 220 }}
        />
        <TextField
          select
          size="small"
          label="OTA"
          value={filters.ota}
          onChange={(e) => setFilters((prev) => ({ ...prev, ota: e.target.value }))}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Toutes</MenuItem>
          <MenuItem value="Airbnb">Airbnb</MenuItem>
          <MenuItem value="Booking.com">Booking.com</MenuItem>
          <MenuItem value="Vrbo">Vrbo</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Listing"
          value={filters.listing}
          onChange={(e) => setFilters((prev) => ({ ...prev, listing: e.target.value }))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Array.from(new Set(conversations.map((conversation) => conversation.listingName))).map((listing) => (
            <MenuItem key={listing} value={listing}>{listing}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Statut"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          sx={{ minWidth: 150 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="unread">Non lus</MenuItem>
          <MenuItem value="read">Lus</MenuItem>
          <MenuItem value="confirmed">Confirmé</MenuItem>
          <MenuItem value="pending">En attente</MenuItem>
          <MenuItem value="completed">Terminé</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="Période"
          value={filters.dateRange}
          onChange={(e) => setFilters((prev) => ({ ...prev, dateRange: e.target.value }))}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">Toutes</MenuItem>
          <MenuItem value="today">Aujourd'hui</MenuItem>
          <MenuItem value="7d">7 jours</MenuItem>
        </TextField>
      </Stack>

      {/* Info Banner */}
      <Box sx={{
        mx: { xs: 2, md: 3 },
        mb: 2,
        p: 2,
        bgcolor: t.primaryTint,
        border: `1px solid ${t.primary}`,
        borderRadius: '12px',
      }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 20 }}>📨</Typography>
          <Box>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.text }}>
              Unified Inbox OTA - Messages Airbnb + Booking.com
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.text2 }}>
              Toutes les conversations avec vos guests depuis les plateformes OTA centralisées ici.
              Les réponses sont synchronisées automatiquement avec chaque plateforme.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <ChatLayout>
        {/* Conversation List */}
        <ConversationList
          conversations={filteredConversations.map(c => ({
            ...c,
            // Add OTA badge to preview
            preview: `[${c.ota}] ${c.preview}`,
          }))}
          activeId={activeConv}
          onSelect={setActiveConv}
        />

        {/* Chat Thread */}
        <ChatThread
          conv={{
            ...conv,
            name: conv.guestName,
            meta: getConvMeta(),
          }}
          messages={messages}
          onSend={handleSendMessage}
          aiSuggestions={[
            '✨ Confirmer pickup €45 NCE→Villa',
            '✨ Proposer early check-in €35',
            '✨ Envoyer guide restaurants',
          ]}
        />

        {/* Chat Aside - Reservation Details */}
        <ChatAside>
          {/* OTA Badge */}
          <Box sx={{ mb: 2 }}>
            <SourcePill source={conv.ota} />
          </Box>

          {/* Reservation Section */}
          <AsideSection title="Réservation">
            <Stack spacing={0.875} sx={{ fontSize: 12 }}>
              <RowKV k="Listing" v={conv.listingName} mono />
              <RowKV k="Numéro" v={conv.reservationNumber} mono />
              <RowKV k="Check-in" v={new Date(conv.checkIn).toLocaleDateString('fr-FR')} mono />
              <RowKV k="Check-out" v={new Date(conv.checkOut).toLocaleDateString('fr-FR')} mono />
              <RowKV k="Statut" v={
                <Badge
                  color={conv.status === 'confirmed' ? 'success' : conv.status === 'completed' ? 'default' : 'warning'}
                  size="sm"
                >
                  {conv.status === 'confirmed' ? '✓ Confirmé' : conv.status === 'completed' ? '✓ Terminé' : '⏳ En attente'}
                </Badge>
              } />
              <RowKV k="Revenu" v={<Revenue amount={conv.revenue} />} divider />
            </Stack>
          </AsideSection>

          {/* Guest Info */}
          <AsideSection title="Guest">
            <Stack spacing={0.875} sx={{ fontSize: 12 }}>
              <RowKV k="Nom" v={conv.guestName} />
              <RowKV k="Plateforme" v={conv.ota} />
              <RowKV k="Initialisées" v={conv.initials} mono />
            </Stack>
          </AsideSection>

          {/* Quick Actions */}
          <AsideSection title="Actions rapides">
            <Stack spacing={0.75}>
              {[
                '📧 Template bienvenue',
                '🔑 Code accès',
                '🗺️ Guide local',
                '🚕 Réserver transport',
                '👤 Profil guest',
                '⭐ Voir reviews',
              ].map(a => (
                <Button key={a} sx={{
                  ...btnGhostSx, ...btnSmSx,
                  justifyContent: 'flex-start', fontWeight: 500, color: t.text2,
                }}>{a}</Button>
              ))}
            </Stack>
          </AsideSection>

          {/* OTA Sync Status */}
          <Box sx={{
            mt: 2,
            p: 1.5,
            bgcolor: t.bg2,
            borderRadius: '8px',
            border: `1px solid ${t.border}`,
          }}>
            <Typography sx={{ fontSize: 11, color: t.text3, fontWeight: 600, mb: 0.5 }}>
              🔄 SYNCHRONISATION OTA
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Dernière sync: Il y a 2 min
            </Typography>
            <Typography sx={{ fontSize: 11, color: t.success, mt: 0.5 }}>
              ✓ Messages synchronisés avec {conv.ota}
            </Typography>
          </Box>
        </ChatAside>
      </ChatLayout>

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast('')}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </DashboardWrapper>
  );
}
