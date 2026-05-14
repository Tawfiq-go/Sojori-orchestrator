import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ActionToast, useActionToast } from '../components/ActionToast';
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
  btnPrimarySx,
  btnSmSx,
} from '../components/dashboard/DashboardV2.components';

export function WhatsAppContactsPage() {
  const [searchParams] = useSearchParams();
  const { toast, showToast, hideToast } = useActionToast();
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
  const [search, setSearch] = useState('');
  const [reservationFilter, setReservationFilter] = useState('all');
  const [communicationFilter, setCommunicationFilter] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (
        search &&
        ![
          thread.guestName,
          thread.phone,
          thread.reservationNumber,
          thread.listingName,
        ]
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())
      ) {
        return false;
      }
      if (ownerFilter !== 'all' && thread.ownerName !== ownerFilter) {
        return false;
      }
      if (languageFilter !== 'all' && thread.language !== languageFilter) {
        return false;
      }
      if (reservationFilter !== 'all' && thread.reservationStatus !== reservationFilter) {
        return false;
      }
      if (communicationFilter !== 'all' && thread.communicationStatus !== communicationFilter) {
        return false;
      }
      if (unreadOnly && thread.unreadCount === 0) {
        return false;
      }
      return true;
    });
  }, [communicationFilter, languageFilter, ownerFilter, reservationFilter, search, threads, unreadOnly]);

  const activeThread = filteredThreads.find((item) => item.id === activeId) || filteredThreads[0];

  const updateActiveThread = (updates: Partial<ContactThreadRecord>) => {
    if (!activeThread) return;

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === activeThread.id
          ? {
              ...thread,
              ...updates,
            }
          : thread,
      ),
    );
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Clients', 'WhatsApp contacts']}>
      <PageHeader title="WhatsApp Contacts" count={`${filteredThreads.length} threads`}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Sync threads lancé', 'info')}>
          Sync threads
        </Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => setAdvancedOpen(true)}>
          Filtres avancés
        </Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => setReservationOpen(true)} disabled={!activeThread}>
          Détail réservation
        </Button>
        <Button sx={btnPrimarySx} onClick={() => setEditOpen(true)} disabled={!activeThread}>
          Modifier contact
        </Button>
      </PageHeader>

      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Rechercher nom, téléphone, réservation, listing..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          sx={{ maxWidth: 420 }}
        />
      </Box>

      <FilterBar>
        <FilterChip label={ownerFilter === 'all' ? 'Tous owners' : ownerFilter} active={ownerFilter !== 'all'} onClick={() => setOwnerFilter('all')} dropdown />
        <FilterChip label={languageFilter === 'all' ? 'Toutes langues' : languageFilter} active={languageFilter !== 'all'} onClick={() => setLanguageFilter('all')} dropdown />
        <FilterChip label={communicationFilter === 'all' ? 'Toutes communications' : communicationFilter} active={communicationFilter !== 'all'} onClick={() => setCommunicationFilter('all')} dropdown />
        <FilterChip label={reservationFilter === 'all' ? 'Toutes résas' : reservationFilter} active={reservationFilter !== 'all'} onClick={() => setReservationFilter('all')} dropdown />
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
            onSend={(text: string) =>
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
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => setReservationOpen(true)}>
                  Voir détail
                </Button>
                <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Timeline mock ouverte', 'info')}>
                  Timeline
                </Button>
              </Stack>
            </AsideSection>
            <AsideSection title="Contexte">
              <Typography sx={{ fontSize: 12 }}>Owner: {activeThread.ownerName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Listing: {activeThread.listingName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Langue: {activeThread.language}</Typography>
              <Typography sx={{ fontSize: 12 }}>Phone: {activeThread.phone}</Typography>
              <Typography sx={{ fontSize: 12 }}>Communication: {activeThread.communicationStatus}</Typography>
            </AsideSection>
          </ChatAside>
        </ChatLayout>
      )}

      <Dialog open={advancedOpen} onClose={() => setAdvancedOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filtres avancés WhatsApp</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField label="Recherche globale" value={search} onChange={(event) => setSearch(event.target.value)} />
            <TextField label="Statut réservation" select value={reservationFilter} onChange={(event) => setReservationFilter(event.target.value)}>
              {['all', 'confirmed', 'pending', 'cancelled'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <TextField label="Statut communication" select value={communicationFilter} onChange={(event) => setCommunicationFilter(event.target.value)}>
              {['all', 'active', 'unreplied', 'closed'].map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            <FormControlLabel control={<Switch checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />} label="Afficher seulement les threads non lus" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSearch('');
              setReservationFilter('all');
              setCommunicationFilter('all');
              setUnreadOnly(false);
            }}
          >
            Réinitialiser
          </Button>
          <Button sx={btnPrimarySx} onClick={() => setAdvancedOpen(false)}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={reservationOpen} onClose={() => setReservationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Détail réservation</DialogTitle>
        <DialogContent dividers>
          {activeThread && (
            <Stack spacing={2}>
              <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                {activeThread.guestName} · {activeThread.listingName}
              </Typography>
              <Typography sx={{ fontSize: 12 }}>Réservation: {activeThread.reservationNumber}</Typography>
              <Typography sx={{ fontSize: 12 }}>Arrivée: {activeThread.arrivalDate}</Typography>
              <Typography sx={{ fontSize: 12 }}>Départ: {activeThread.departureDate}</Typography>
              <Typography sx={{ fontSize: 12 }}>Statut réservation: {activeThread.reservationStatus}</Typography>
              <Typography sx={{ fontSize: 12 }}>Statut communication: {activeThread.communicationStatus}</Typography>
              <Typography sx={{ fontSize: 12 }}>Owner: {activeThread.ownerName}</Typography>
              <Typography sx={{ fontSize: 12 }}>Téléphone: {activeThread.phone}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReservationOpen(false)}>Fermer</Button>
          <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Message de check-in envoyé (mock)', 'info')}>
            Envoyer Check-in
          </Button>
          <Button sx={btnPrimarySx} onClick={() => showToast('Tâche ajoutée depuis la réservation (mock)', 'success')}>
            Ajouter tâche
          </Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>Modifier contact WhatsApp</Typography>
          {activeThread && (
            <Stack spacing={2}>
              <TextField label="Nom" value={activeThread.guestName} onChange={(event) => updateActiveThread({ guestName: event.target.value })} />
              <TextField label="Téléphone" value={activeThread.phone} onChange={(event) => updateActiveThread({ phone: event.target.value })} />
              <TextField label="Langue" value={activeThread.language} onChange={(event) => updateActiveThread({ language: event.target.value })} />
              <TextField
                label="Statut communication"
                select
                value={activeThread.communicationStatus}
                onChange={(event) => updateActiveThread({ communicationStatus: event.target.value })}
              >
                {['active', 'unreplied', 'closed'].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <Button sx={btnGhostSx} onClick={() => setEditOpen(false)}>
                  Annuler
                </Button>
                <Button
                  sx={btnPrimarySx}
                  onClick={() => {
                    setEditOpen(false);
                    showToast('Contact WhatsApp mis à jour');
                  }}
                >
                  Sauvegarder
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <ActionToast open={toast.open} message={toast.message} severity={toast.severity} onClose={hideToast} />
    </DashboardWrapper>
  );
}
