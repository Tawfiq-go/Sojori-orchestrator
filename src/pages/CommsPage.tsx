import { useMemo, useState } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CommunicationsSectionToggle } from '../components/CommunicationsSectionToggle';
import { MessageComposeModal, type MessageComposeTemplate } from '../components/modals/MessageComposeModal';
import { CreateTaskModal } from '../components/tasks/CreateTaskModal';
import type { Task } from '../data/mockTasks';
import {
  PageHeader, ChatLayout, ConversationList, ChatThread, ChatAside, AsideSection, Revenue,
  btnGhostSx, btnSmSx, btnAiSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Alert, Box, Button, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';

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

export function CommsPage() {
  const [activeConv, setActiveConv] = useState('sarah');
  const [toast, setToast] = useState('');
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [composeModal, setComposeModal] = useState<{
    title: string;
    subtitle: string;
    initialMessage: string;
    sendLabel: string;
    templates: MessageComposeTemplate[];
  } | null>(null);
  const [filters, setFilters] = useState({
    reservation: '',
    client: '',
    listing: 'all',
    status: 'all',
    statsWhatsApp: 'all',
    dateRange: 'all',
  });
  const [conversations, setConversations] = useState([
    { id: 'sarah', name: 'Sarah Johnson', initials: 'SJ', color: 'gold',
      preview: 'Could you arrange airport pickup?', when: '10:24',
      listing: 'Villa Belvédère', unreadCount: 2, unread: true, reservationNumber: 'RES-2026-001', updatedAt: '2026-05-16T10:24:00' },
    { id: 'marco', name: 'Marco Rossi', initials: 'MR', color: 'cyan',
      preview: 'Buongiorno, è possibile arrivare prima?', when: '09:55',
      listing: 'Dar Sojori', unreadCount: 1, unread: true, reservationNumber: 'RES-2026-002', updatedAt: '2026-05-16T09:55:00' },
    { id: 'aisha', name: 'Aisha Khalil', initials: 'AK', color: 'pink',
      preview: 'Merci Sofia, le séjour s\'annonce parfait ✨', when: 'Hier',
      listing: 'Villa Atlas', unreadCount: 0, unread: false, reservationNumber: 'RES-2026-003', updatedAt: '2026-05-15T18:22:00' },
  ]);
  const [messagesByConversation, setMessagesByConversation] = useState<Record<string, Array<{ type?: string; from?: string; text: string; when?: string }>>>({
    sarah: [
      { type: 'day', text: 'Hier · 15 mai' },
      { from: 'them', text: "Hi! Just arrived, it's stunning 😍 thank you for the welcome basket!", when: '16:42' },
      { from: 'you', text: 'So happy to hear that, Sarah! 💛 Enjoy your stay. The pool is heated to 28°C.', when: '16:48 ✓✓' },
      { type: 'day', text: "Aujourd'hui · 16 mai" },
      { from: 'them', text: 'Good morning! Could you arrange airport pickup for our friends arriving Saturday?', when: '10:20' },
      { from: 'them', text: 'Their flight lands at NCE at 14:30.', when: '10:24' },
    ],
    marco: [
      { type: 'day', text: "Aujourd'hui · 16 mai" },
      { from: 'them', text: "Buongiorno, è possibile arrivare prima?", when: '09:55' },
    ],
    aisha: [
      { type: 'day', text: 'Hier · 15 mai' },
      { from: 'them', text: "Merci Sofia, le séjour s'annonce parfait ✨", when: '18:22' },
    ],
  });

  const conv = conversations.find(c => c.id === activeConv) || conversations[0];
  const messages = messagesByConversation[activeConv] || [];
  const guestTemplates = useMemo<MessageComposeTemplate[]>(
    () => [
      {
        id: 'comms-guest-welcome',
        name: 'Welcome',
        channel: ['whatsapp'],
        body: `Bonjour ${conv?.name.split(' ')[0] || 'guest'},\n\nBienvenue chez Sojori. Je reste disponible si vous avez besoin de quoi que ce soit pendant votre séjour.`,
      },
      {
        id: 'comms-guest-access',
        name: 'Code accès',
        channel: ['whatsapp'],
        body: `Bonjour ${conv?.name.split(' ')[0] || 'guest'},\n\nVoici le rappel de vos codes d'accès:\n- Porte principale: 4821\n- Coffre à clés: 9907\n\nDites-moi si vous avez besoin d'aide à l'arrivée.`,
      },
      {
        id: 'comms-guest-task',
        name: 'Créer tâche',
        channel: ['whatsapp'],
        body: `Bonjour équipe,\n\nMerci de préparer une intervention pour la réservation ${conv?.reservationNumber || 'RES-XXXX'}.\n\nPriorité: standard.`,
      },
    ],
    [conv],
  );
  const aiTemplates = useMemo<MessageComposeTemplate[]>(
    () => [
      {
        id: 'comms-ai-pickup',
        name: 'Pickup',
        channel: ['whatsapp'],
        body: `Bonjour ${conv?.name.split(' ')[0] || 'guest'},\n\nNous pouvons organiser votre transfert aéroport. Merci de me confirmer le nombre de passagers et les bagages.`,
      },
      {
        id: 'comms-ai-early',
        name: 'Early check-in',
        channel: ['whatsapp'],
        body: `Bonjour ${conv?.name.split(' ')[0] || 'guest'},\n\nJe vérifie la disponibilité de l'appartement pour un early check-in et je vous confirme cela très vite.`,
      },
      {
        id: 'comms-ai-upsell',
        name: 'Upsell',
        channel: ['whatsapp'],
        body: `Bonjour ${conv?.name.split(' ')[0] || 'guest'},\n\nJe peux aussi vous proposer un transport privé ou un panier d'accueil premium si vous le souhaitez.`,
      },
    ],
    [conv],
  );
  const filteredConversations = useMemo(() => {
    return conversations.filter((conversation) => {
      const reservationMatch =
        !filters.reservation ||
        conversation.reservationNumber.toLowerCase().includes(filters.reservation.toLowerCase());
      const clientMatch =
        !filters.client || conversation.name.toLowerCase().includes(filters.client.toLowerCase());
      const listingMatch = filters.listing === 'all' || conversation.listing === filters.listing;
      const unreadMatch =
        filters.statsWhatsApp === 'all' ||
        (filters.statsWhatsApp === 'unread' && conversation.unreadCount > 0) ||
        (filters.statsWhatsApp === 'read' && conversation.unreadCount === 0);
      const statusMatch =
        filters.status === 'all' ||
        (() => {
          const thread = messagesByConversation[conversation.id] || [];
          const lastMessage = [...thread].reverse().find((item) => item.from);
          if (!lastMessage) return true;
          if (filters.status === 'pending') return lastMessage.from === 'them';
          if (filters.status === 'responded') return lastMessage.from === 'you';
          return true;
        })();
      const updatedAt = new Date(conversation.updatedAt);
      const dateMatch =
        filters.dateRange === 'all' ||
        (filters.dateRange === 'today' && updatedAt.toDateString() === new Date().toDateString()) ||
        (filters.dateRange === '7d' && updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));

      return reservationMatch && clientMatch && listingMatch && unreadMatch && statusMatch && dateMatch;
    });
  }, [conversations, filters, messagesByConversation]);

  const formatMessageTime = (date: Date) =>
    date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  const handleSendMessage = (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || !conv) return;

    const sentAt = new Date();
    const nextMessage = { from: 'you', text: trimmed, when: `${formatMessageTime(sentAt)} ✓` };

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
    setToast('Message envoyé');
  };

  const openComposeModal = (mode: 'templates' | 'ai' | 'welcome' | 'access') => {
    if (!conv) return;

    if (mode === 'ai') {
      setComposeModal({
        title: 'Réponse AI',
        subtitle: `${conv.name} · ${conv.reservationNumber}`,
        initialMessage: aiTemplates[0]?.body || '',
        sendLabel: 'Envoyer la réponse',
        templates: aiTemplates,
      });
      return;
    }

    if (mode === 'access') {
      setComposeModal({
        title: 'Renvoyer code d\'accès',
        subtitle: `${conv.name} · ${conv.listing}`,
        initialMessage: guestTemplates[1]?.body || '',
        sendLabel: 'Renvoyer',
        templates: guestTemplates,
      });
      return;
    }

    setComposeModal({
      title: mode === 'welcome' ? 'Envoyer template welcome' : 'Templates WhatsApp',
      subtitle: `${conv.name} · ${conv.listing}`,
      initialMessage: guestTemplates[0]?.body || '',
      sendLabel: 'Envoyer',
      templates: guestTemplates,
    });
  };

  const handleSaveTask = (task: Task) => {
    setTaskModalOpen(false);
    setToast(`Tâche ${task.itemNumber} créée`);
  };

  return (
    <DashboardWrapper breadcrumb={['Communications', 'WhatsApp Guests']}>
      <PageHeader title="WhatsApp Guests">
        <CommunicationsSectionToggle />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => openComposeModal('templates')}>📋 Templates</Button>
        <Button sx={btnAiSx} onClick={() => openComposeModal('ai')}>✨ Réponse AI</Button>
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
          label="Réservation"
          value={filters.reservation}
          onChange={(e) => setFilters((prev) => ({ ...prev, reservation: e.target.value }))}
          sx={{ minWidth: 160 }}
        />
        <TextField
          size="small"
          label="Client"
          value={filters.client}
          onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
          sx={{ minWidth: 160 }}
        />
        <TextField
          select
          size="small"
          label="Listing"
          value={filters.listing}
          onChange={(e) => setFilters((prev) => ({ ...prev, listing: e.target.value }))}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Array.from(new Set(conversations.map((conversation) => conversation.listing))).map((listing) => (
            <MenuItem key={listing} value={listing}>{listing}</MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Statut"
          value={filters.status}
          onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="pending">En attente</MenuItem>
          <MenuItem value="responded">Répondu</MenuItem>
        </TextField>
        <TextField
          select
          size="small"
          label="WhatsApp"
          value={filters.statsWhatsApp}
          onChange={(e) => setFilters((prev) => ({ ...prev, statsWhatsApp: e.target.value }))}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="unread">Non lus</MenuItem>
          <MenuItem value="read">Lus</MenuItem>
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

      <ChatLayout>
        <ConversationList conversations={filteredConversations} activeId={activeConv} onSelect={setActiveConv} />
        <ChatThread
          conv={{ ...conv, meta: '🇺🇸 EN · Villa Belvédère · Jour 3/7' }}
          messages={messages}
          onSend={handleSendMessage}
          aiSuggestions={[
            '✨ Confirmer pickup €45 NCE→Villa',
            '✨ Demander nb passagers & bagages',
            '✨ Proposer transfert privé €85',
          ]}
        />
        <ChatAside>
          <AsideSection title="Réservation">
            <Stack spacing={0.875} sx={{ fontSize: 12 }}>
              <RowKV k="Listing" v="Villa Belvédère" mono />
              <RowKV k="Dates" v="15 → 22 mai" mono />
              <RowKV k="Jour" v="3 / 7" mono />
              <RowKV k="Revenu" v={<Revenue amount="€1,840" />} divider />
            </Stack>
          </AsideSection>
          <AsideSection title="Actions rapides">
            <Stack spacing={0.75}>
              <Button
                sx={{ ...btnGhostSx, ...btnSmSx, justifyContent: 'flex-start', fontWeight: 500, color: t.text2 }}
                onClick={() => openComposeModal('welcome')}
              >
                📧 Envoyer template welcome
              </Button>
              <Button
                sx={{ ...btnGhostSx, ...btnSmSx, justifyContent: 'flex-start', fontWeight: 500, color: t.text2 }}
                onClick={() => openComposeModal('access')}
              >
                🔑 Renvoyer code accès
              </Button>
              <Button
                sx={{ ...btnGhostSx, ...btnSmSx, justifyContent: 'flex-start', fontWeight: 500, color: t.text2 }}
                onClick={() => setTaskModalOpen(true)}
              >
                📋 Créer tâche
              </Button>
              <Button sx={{
                ...btnGhostSx, ...btnSmSx,
                justifyContent: 'flex-start', fontWeight: 500, color: t.text2,
              }} onClick={() => setToast('Profil voyageur à brancher')}>
                👤 Voir profil voyageur
              </Button>
            </Stack>
          </AsideSection>
        </ChatAside>
      </ChatLayout>

      {composeModal ? (
        <MessageComposeModal
          open
          onClose={() => setComposeModal(null)}
          onSend={handleSendMessage}
          title={composeModal.title}
          subtitle={composeModal.subtitle}
          initialMessage={composeModal.initialMessage}
          sendLabel={composeModal.sendLabel}
          templates={composeModal.templates}
        />
      ) : null}

      <CreateTaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      <Snackbar open={Boolean(toast)} autoHideDuration={2500} onClose={() => setToast('')}>
        <Alert severity="success" variant="filled" onClose={() => setToast('')}>
          {toast}
        </Alert>
      </Snackbar>
    </DashboardWrapper>
  );
}
