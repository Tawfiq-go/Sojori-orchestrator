import { useState } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { CommunicationsSectionToggle } from '../components/CommunicationsSectionToggle';
import {
  PageHeader, ChatLayout, ConversationList, ChatThread, ChatAside, AsideSection, Revenue,
  btnGhostSx, btnSmSx, btnAiSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Alert, Box, Button, Snackbar, Stack, Typography } from '@mui/material';

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
  const [conversations, setConversations] = useState([
    { id: 'sarah', name: 'Sarah Johnson', initials: 'SJ', color: 'gold',
      preview: 'Could you arrange airport pickup?', when: '10:24',
      listing: 'Villa Belvédère', unreadCount: 2, unread: true },
    { id: 'marco', name: 'Marco Rossi', initials: 'MR', color: 'cyan',
      preview: 'Buongiorno, è possibile arrivare prima?', when: '09:55',
      listing: 'Dar Sojori', unreadCount: 1, unread: true },
    { id: 'aisha', name: 'Aisha Khalil', initials: 'AK', color: 'pink',
      preview: 'Merci Sofia, le séjour s\'annonce parfait ✨', when: 'Hier',
      listing: 'Villa Atlas' },
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
            }
          : item,
      ),
    );
    setToast('Message envoyé');
  };

  return (
    <DashboardWrapper breadcrumb={['Communications', 'WhatsApp Guests']}>
      <PageHeader title="WhatsApp Guests">
        <CommunicationsSectionToggle />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📋 Templates</Button>
        <Button sx={btnAiSx}>✨ Réponse AI</Button>
      </PageHeader>

      <ChatLayout>
        <ConversationList conversations={conversations} activeId={activeConv} onSelect={setActiveConv} />
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
              {['📧 Envoyer template welcome', '🔑 Renvoyer code accès', '📋 Créer tâche', '👤 Voir profil voyageur'].map(a => (
                <Button key={a} sx={{
                  ...btnGhostSx, ...btnSmSx,
                  justifyContent: 'flex-start', fontWeight: 500, color: t.text2,
                }}>{a}</Button>
              ))}
            </Stack>
          </AsideSection>
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
