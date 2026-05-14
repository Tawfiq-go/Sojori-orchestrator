import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Stack, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  getStoredContacts,
  type ContactThreadRecord,
} from '../data/catalogueMock';
import {
  AsideSection,
  ChatAside,
  ChatLayout,
  ChatThread,
  ConversationList,
  FilterBar,
  FilterChip,
  PageHeader,
  btnGhostSx,
  btnSmSx,
} from '../components/dashboard/DashboardV2.components';

export function WhatsAppContactsPage() {
  const [searchParams] = useSearchParams();
  const [threads, setThreads] = useState<ContactThreadRecord[]>(() => getStoredContacts());
  const [activeId, setActiveId] = useState<string>(() => {
    const fromQuery = searchParams.get('client');
    if (!fromQuery) {
      return getStoredContacts()[0]?.id || '';
    }
    return getStoredContacts().find((item) => item.id === fromQuery)?.id || getStoredContacts()[0]?.id || '';
  });
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [languageFilter, setLanguageFilter] = useState('all');

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (ownerFilter !== 'all' && thread.ownerName !== ownerFilter) {
        return false;
      }
      if (languageFilter !== 'all' && thread.language !== languageFilter) {
        return false;
      }
      return true;
    });
  }, [languageFilter, ownerFilter, threads]);

  const activeThread = filteredThreads.find((item) => item.id === activeId) || filteredThreads[0];

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Clients', 'WhatsApp contacts']}>
      <PageHeader title="WhatsApp Contacts" count={`${filteredThreads.length} threads`}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>Sync threads</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label={ownerFilter === 'all' ? 'Tous owners' : ownerFilter} active={ownerFilter !== 'all'} onClick={() => setOwnerFilter('all')} dropdown />
        <FilterChip label={languageFilter === 'all' ? 'Toutes langues' : languageFilter} active={languageFilter !== 'all'} onClick={() => setLanguageFilter('all')} dropdown />
      </FilterBar>

      <Stack direction="row" spacing={1} sx={{ mb: 2, mt: 1, flexWrap: 'wrap', gap: 1 }}>
        {Array.from(new Set(threads.map((item) => item.ownerName))).map((owner) => (
          <Button key={owner} sx={btnGhostSx} onClick={() => setOwnerFilter((prev) => (prev === owner ? 'all' : owner))}>
            {owner}
          </Button>
        ))}
        {Array.from(new Set(threads.map((item) => item.language))).map((language) => (
          <Button key={language} sx={btnGhostSx} onClick={() => setLanguageFilter((prev) => (prev === language ? 'all' : language))}>
            {language}
          </Button>
        ))}
      </Stack>

      {activeThread && (
        <ChatLayout>
          <ConversationList
            conversations={filteredThreads.map((thread) => ({
              id: thread.id,
              name: thread.guestName,
              initials: thread.guestName.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase(),
              color: 'gold',
              when: thread.lastMessageAt,
              preview: thread.messages.at(-1)?.text || 'Aucun message',
              listing: thread.listingName,
              unread: thread.unreadCount > 0,
              unreadCount: thread.unreadCount,
            }))}
            activeId={activeThread.id}
            onSelect={setActiveId}
          />
          <ChatThread
            conv={{
              id: activeThread.id,
              name: activeThread.guestName,
              initials: activeThread.guestName.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase(),
              color: 'gold',
              meta: `${activeThread.listingName} · ${activeThread.ownerName} · ${activeThread.language}`,
            }}
            messages={[
              { type: 'day', text: 'Aujourd’hui' },
              ...activeThread.messages.map((message) => ({
                from: message.from === 'me' ? 'you' : 'them',
                text: message.text,
                when: message.when,
              })),
            ]}
            aiSuggestions={['Envoyer check-in', 'Partager WiFi', 'Proposer transfert']}
            onSend={(text) =>
              setThreads((prev) =>
                prev.map((thread) =>
                  thread.id === activeThread.id
                    ? {
                        ...thread,
                        messages: [
                          ...thread.messages,
                          { id: `msg-${Date.now()}`, from: 'me', text, when: 'maintenant' },
                        ],
                        lastMessageAt: 'maintenant',
                        unreadCount: 0,
                      }
                    : thread,
                ),
              )
            }
          />
          <ChatAside>
            <AsideSection title="Réservation">
              <Typography sx={{ fontSize: 12 }}>Réf: {activeThread.reservationNumber}</Typography>
              <Typography sx={{ fontSize: 12 }}>Arrivée: {activeThread.arrivalDate}</Typography>
              <Typography sx={{ fontSize: 12 }}>Départ: {activeThread.departureDate}</Typography>
              <Typography sx={{ fontSize: 12 }}>Statut: {activeThread.reservationStatus}</Typography>
            </AsideSection>
            <AsideSection title="Contexte">
              <Typography sx={{ fontSize: 12 }}>Owner: {activeThread.ownerName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Listing: {activeThread.listingName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Langue: {activeThread.language}</Typography>
              <Typography sx={{ fontSize: 12 }}>Phone: {activeThread.phone}</Typography>
            </AsideSection>
          </ChatAside>
        </ChatLayout>
      )}
    </DashboardWrapper>
  );
}
