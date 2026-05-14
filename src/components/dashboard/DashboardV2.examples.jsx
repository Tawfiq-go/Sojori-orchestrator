// ════════════════════════════════════════════════════════════════════
// Sojori Dashboard V2 — Examples · usage par page
// Tous les imports viennent de ./DashboardV2.components.jsx
// ════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Box, Stack, Button, Typography } from '@mui/material';
import {
  DashboardLayout, PageHeader,
  StatsRow, StatCard,
  FilterBar, FilterChip, ViewToggle,
  DataTable, GuestCell, ListingCell, Badge, SourcePill, Revenue, Pagination,
  OrchestrationTimeline, TLDayLabel, TLEvent,
  CalendarGantt,
  KanbanBoard, KanbanColumn, TaskCard,
  ChatLayout, ConversationList, ChatThread, ChatAside, AsideSection,
  ListingsGrid, ListingCard,
  AIBanner, AIChip, AICard,
  Panel,
  btnPrimarySx, btnGhostSx, btnAiSx, btnSmSx,
  tokens as t,
} from './DashboardV2.components';

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 1 — Réservations (table page)
// ════════════════════════════════════════════════════════════════════

export function ReservationsPage() {
  const [selected, setSelected] = useState(['r2']);

  const rows = [
    { id: 'r1', guestName: 'Sarah Johnson', guestInitials: 'SJ', guestMeta: '🇺🇸 · 1er séjour', guestColor: 'gold',
      checkIn: '15 mai', checkOut: '22 mai', nights: 7, daysToGo: 'J+2',
      listing: 'Villa Belvédère · Nice', listingColor: 'gold',
      status: 'success', statusLabel: 'Confirmée', source: 'airbnb', revenue: '€1,840' },
    { id: 'r2', guestName: 'Marco Rossi', guestInitials: 'MR', guestMeta: '🇮🇹 · 3 séjours · ⭐ VIP', guestColor: 'cyan',
      checkIn: '16 mai', checkOut: '19 mai', nights: 3, daysToGo: 'J+3',
      listing: 'Dar Sojori · Marrakech', listingColor: 'blue',
      status: 'success', statusLabel: 'Confirmée', source: 'booking', revenue: '€720' },
    { id: 'r3', guestName: 'Aisha Khalil', guestInitials: 'AK', guestMeta: '🇫🇷 · 6 invités', guestColor: 'pink',
      checkIn: '18 mai', checkOut: '25 mai', nights: 7, daysToGo: 'J+5',
      listing: 'Villa Atlas · Marrakech', listingColor: 'purple',
      status: 'warning', statusLabel: 'En attente paiement', source: 'direct', revenue: '€2,850' },
  ];

  const columns = [
    { key: 'guest', label: 'Voyageur', sortable: true, render: (row) =>
      <GuestCell name={row.guestName} initials={row.guestInitials} meta={row.guestMeta} color={row.guestColor} /> },
    { key: 'dates', label: 'Check-in', sortable: true, render: (row) =>
      <Box>
        <Box><strong>{row.checkIn}</strong> → {row.checkOut}</Box>
        <Box sx={{ fontSize: 10.5, color: t.text3, fontFamily: 'Geist Mono' }}>{row.nights} nuits · {row.daysToGo}</Box>
      </Box>
    },
    { key: 'listing', label: 'Listing', sortable: true, render: (row) =>
      <ListingCell name={row.listing} color={row.listingColor} /> },
    { key: 'status', label: 'Statut', render: (row) =>
      <Badge variant={row.status} dot>{row.statusLabel}</Badge> },
    { key: 'source', label: 'Source', render: (row) => <SourcePill source={row.source} /> },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right',
      render: (row) => <Revenue amount={row.revenue} /> },
  ];

  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner · 42 listings' }}
      activePath="reservations"
      breadcrumb={['Pilotage', 'Réservations']}
    >
      <StatsRow>
        <StatCard icon="🎫" iconBg="rgba(16,185,129,0.10)" iconColor={t.success}
          value="23" label="Réservations actives" trend="12%" trendUp />
        <StatCard icon="€" iconBg="rgba(230,176,34,0.10)" iconColor={t.primaryDeep}
          value="€18,420" label="Revenu ce mois" trend="8%" trendUp />
        <StatCard icon="📊" iconBg="rgba(6,182,212,0.10)" iconColor="#0e7490"
          value="87%" label="Taux d'occupation" trend="3%" trendUp />
        <StatCard icon="⭐" iconBg="rgba(139,92,246,0.10)" iconColor={t.ai}
          value="4.92" label="Note moyenne · 47 avis" trend="0.1" trendUp />
      </StatsRow>

      <PageHeader title="Réservations" count="145">
        <Button sx={btnGhostSx}>📥 Exporter CSV</Button>
        <Button sx={btnAiSx}>✨ Suggestion AI</Button>
        <Button sx={btnPrimarySx}>+ Nouvelle résa</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label="Statut" dropdown />
        <FilterChip label="Confirmées" active dropdown />
        <FilterChip label="Source" dropdown />
        <FilterChip label="📅 12 → 25 Mai" dropdown />
        <Box sx={{ ml: 'auto' }}>
          <ViewToggle
            options={[{value:'table', label:'Table'}, {value:'cards', label:'Cards'}, {value:'timeline', label:'Timeline'}]}
            value="table"
          />
        </Box>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={rows}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        footer={<>
          <Box>{selected.length} sélectionnée(s) sur 145</Box>
          <Pagination page={1} totalPages={21} />
          <Box>Affichage 1–{rows.length} sur 145</Box>
        </>}
      />
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 2 — Orchestration · Chronologie
// ════════════════════════════════════════════════════════════════════

export function OrchestrationPage() {
  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner' }}
      activePath="orchestration/timeline"
      breadcrumb={['Pilotage', 'Orchestration', 'Chronologie']}
    >
      <PageHeader title="✨ Orchestration · Chronologie" count="RÉSA #1234">
        <Button sx={btnGhostSx}>📋 Voir réservation</Button>
        <Button sx={btnAiSx}>✨ Demander à l'AI</Button>
      </PageHeader>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, gap: 2.25 }}>
        <Panel title="Chronologie des événements">
          <TLDayLabel>12 mai · J-3</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent
              time={<><strong>10:14</strong> · il y a 3 jours</>}
              icon="✓" iconBg={t.successTint} iconColor={t.success}
              title="Réservation confirmée"
              badge={<Badge variant="success">Auto</Badge>}
              meta="Source : <strong>Airbnb</strong> · ID résa <strong>HMXY42TZ8K</strong> · Montant <strong>€1,840</strong>"
            />
            <TLEvent
              time={<><strong>10:14</strong> · +18s</>}
              icon="✨" iconBg={t.aiTint} iconColor={t.ai}
              title="Workflow orchestrateur déclenché"
              badge={<Badge variant="ai">AI</Badge>}
              meta="23 tâches générées · Workflow <strong>Villa Belvédère · Long séjour</strong>"
            />
            <TLEvent
              time={<><strong>10:18</strong> · +4 min</>}
              icon="📧" iconBg={t.infoTint} iconColor="#0e7490"
              title="Message de bienvenue envoyé"
              badge={<Badge variant="info">WhatsApp</Badge>}
              meta="Template <strong>welcome-villa</strong> · 🇬🇧 EN · Lu <strong>il y a 2 min</strong>"
              quote='"Hi Sarah! 👋 Welcome to Villa Belvédère..."'
            />
          </OrchestrationTimeline>

          <TLDayLabel>15 mai · Check-in</TLDayLabel>
          <OrchestrationTimeline>
            <TLEvent critical
              time={<><strong>16:14</strong> · aujourd'hui</>}
              icon="🛬" iconBg={t.successTint} iconColor={t.success}
              title="Sarah a effectué son check-in"
              badge={<Badge variant="success">Auto · QR + GPS</Badge>}
              meta="Vérifié sur place · ID + photo · Vidéo welcome <strong>vue 2 fois</strong>"
            />
            <TLEvent future
              time={<><strong>17 mai · 10:00</strong> · dans 2 jours</>}
              icon="📧" iconBg={t.bg2} iconColor={t.text3}
              title="Message mid-stay programmé"
              meta="Template <strong>midstay-villa</strong> · Personnalisation AI"
            />
          </OrchestrationTimeline>
        </Panel>

        <Stack spacing={1.75}>
          <Panel sx={{ p: 2 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1.5 }}>Résumé séjour</Typography>
            <Stack spacing={1.125} sx={{ fontSize: 12 }}>
              <RowKV k="Statut" v={<Badge variant="success" dot>Active</Badge>} />
              <RowKV k="Avancement" v="3 / 23 tâches" />
              <RowKV k="Prochaine action" v="17/05 · 10:00" mono />
              <RowKV k="Anomalies" v={<Box sx={{ color: t.success, fontWeight: 600 }}>Aucune ✓</Box>} />
              <RowKV k="Revenu net" v={<Revenue amount="€1,656" />} divider />
            </Stack>
          </Panel>

          <AICard
            title="Sojori AI"
            footer={<Button sx={{ ...btnAiSx, ...btnSmSx, width: '100%', justifyContent: 'center' }}>Générer suggestion ✨</Button>}
          >
            <Typography sx={{ fontSize: 12, color: t.text2, lineHeight: 1.55 }}>
              Sarah est en J+3. <strong>Recommandation</strong> : envoyer une suggestion d'activité (excursion Èze ou Mont Boron) — meilleure conversion à mid-stay.
            </Typography>
          </AICard>
        </Stack>
      </Box>
    </DashboardLayout>
  );
}

function RowKV({ k, v, mono, divider }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{
      pt: divider ? 1.125 : 0,
      borderTop: divider ? `1px dashed ${t.border}` : 'none',
    }}>
      <Typography sx={{ color: t.text3, fontSize: 12 }}>{k}</Typography>
      <Box sx={{ fontWeight: 600, fontSize: 12, fontFamily: mono ? 'Geist Mono' : 'inherit' }}>{v}</Box>
    </Stack>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 3 — Calendrier
// ════════════════════════════════════════════════════════════════════

export function CalendarPage() {
  const properties = [
    { name: 'Villa Belvédère', city: 'Nice', color: 'gold' },
    { name: 'Dar Sojori',       city: 'Marrakech', color: 'blue' },
    { name: 'Villa Atlas',      city: 'Marrakech', color: 'purple' },
    { name: 'Atlas Loft',       city: 'Marrakech', color: 'green' },
    { name: 'Médina House',     city: 'Marrakech', color: 'pink' },
  ];
  const bookings = [
    { prop: 0, start: 3, length: 7, status: 'confirmed', label: 'Sarah Johnson · 🇺🇸', price: '€1,840' },
    { prop: 0, start: 13, length: 6, status: 'pending', label: 'James Park', price: '€820' },
    { prop: 1, start: 4, length: 3, status: 'confirmed', label: 'Marco Rossi · VIP', price: '€720' },
    { prop: 2, start: 6, length: 7, status: 'pending', label: 'Aisha K. · 6p', price: '€2,850' },
    { prop: 3, start: 8, length: 14, status: 'confirmed', label: 'Linh N. · long séjour', price: '€2,240' },
    { prop: 4, start: 2, length: 5, status: 'confirmed', label: 'Yumi K. · 🇯🇵', price: '€1,250' },
  ];

  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner' }}
      activePath="calendar"
      breadcrumb={['Pilotage', 'Calendrier']}
    >
      <PageHeader title="Calendrier" count="Mai 2026">
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>← Avril</Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>Juin →</Button>
        <ViewToggle
          options={[{value:'21j', label:'21 jours'}, {value:'mois', label:'Mois'}, {value:'sem', label:'Semaine'}]}
          value="21j"
        />
      </PageHeader>

      <CalendarGantt days={21} properties={properties} bookings={bookings} todayIdx={4} />
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 4 — Tâches (Kanban)
// ════════════════════════════════════════════════════════════════════

export function TasksPage() {
  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner' }}
      activePath="tasks"
      breadcrumb={['Activité', 'Tâches']}
    >
      <PageHeader title="Tâches & opérations" count="28">
        <ViewToggle
          options={[{value:'kanban', label:'Kanban'}, {value:'list', label:'Liste'}, {value:'cal', label:'Calendrier'}]}
          value="kanban"
        />
        <Button sx={btnPrimarySx}>+ Nouvelle tâche</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label="📅 Aujourd'hui" />
        <FilterChip label="Cette semaine" active />
        <FilterChip label="🏠 Tous listings" dropdown />
        <FilterChip label="👥 Tout staff" dropdown />
        <FilterChip label="🔴 Priorité haute" />
      </FilterBar>

      <KanbanBoard>
        <KanbanColumn status="todo" label="À faire" count={8} addable>
          <TaskCard
            priority="high" type={{ icon: '🧹', label: 'MÉNAGE' }}
            title="Ménage pré-arrivée · Villa Belvédère"
            listing="47 Derb El Hammam"
            assignee={{ initials: 'YK', name: 'Yasmine K.', color: 'pink' }}
            deadline="🔴 Aujourd'hui · 14:00" urgent
          />
          <TaskCard
            priority="high" type={{ icon: '🛠️', label: 'MAINTENANCE' }}
            title="Réparation plombier · Studio Calvi"
            listing="12 Rue Clémenceau · Fuite SDB"
            assignee={{ initials: '?', name: 'Non assigné' }}
            deadline="🔴 Urgent" urgent
          />
        </KanbanColumn>

        <KanbanColumn status="doing" label="En cours" count={5} addable>
          <TaskCard
            priority="med" type={{ icon: '🛬', label: 'CHECK-IN' }}
            title="Accueil Marco Rossi"
            listing="Dar Sojori · 16:00"
            assignee={{ initials: 'HM', name: 'Hassan M.', color: 'cyan' }}
            deadline="Maintenant"
          />
        </KanbanColumn>

        <KanbanColumn status="review" label="À valider" count={3} addable>
          <TaskCard
            priority="med" type={{ icon: '📸', label: 'PHOTOS' }}
            title="Validation photos ménage · Médina House"
            assignee={{ initials: 'AI', name: 'Sojori AI · 8/10', color: 'gold' }}
            deadline="À review"
          />
        </KanbanColumn>

        <KanbanColumn status="done" label="Terminé" count={12}>
          <TaskCard completed
            type={{ icon: '🧹', label: 'MÉNAGE' }}
            title="Ménage pré-arrivée · Villa Belvédère"
            assignee={{ initials: 'YK', name: 'Yasmine K.', color: 'pink' }}
            deadline="✓ 9.6/10"
          />
        </KanbanColumn>
      </KanbanBoard>
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 5 — Communications (WhatsApp)
// ════════════════════════════════════════════════════════════════════

export function CommsPage() {
  const [activeConv, setActiveConv] = useState('sarah');
  const conversations = [
    { id: 'sarah', name: 'Sarah Johnson', initials: 'SJ', color: 'gold',
      preview: 'Could you arrange airport pickup?', when: '10:24',
      listing: 'Villa Belvédère', unreadCount: 2, unread: true },
    { id: 'marco', name: 'Marco Rossi', initials: 'MR', color: 'cyan',
      preview: 'Buongiorno, è possibile arrivare prima?', when: '09:55',
      listing: 'Dar Sojori', unreadCount: 1, unread: true },
    { id: 'aisha', name: 'Aisha Khalil', initials: 'AK', color: 'pink',
      preview: 'Merci Sofia, le séjour s\'annonce parfait ✨', when: 'Hier',
      listing: 'Villa Atlas' },
  ];

  const conv = conversations.find(c => c.id === activeConv) || conversations[0];
  const messages = [
    { type: 'day', text: 'Hier · 15 mai' },
    { from: 'them', text: "Hi! Just arrived, it's stunning 😍 thank you for the welcome basket!", when: '16:42' },
    { from: 'you',  text: "So happy to hear that, Sarah! 💛 Enjoy your stay. The pool is heated to 28°C.", when: '16:48 ✓✓' },
    { type: 'day', text: "Aujourd'hui · 16 mai" },
    { from: 'them', text: 'Good morning! Could you arrange airport pickup for our friends arriving Saturday?', when: '10:20' },
    { from: 'them', text: 'Their flight lands at NCE at 14:30.', when: '10:24' },
  ];

  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner' }}
      activePath="comms"
      breadcrumb={['Activité', 'Communications']}
    >
      <PageHeader title="Communications">
        <ViewToggle
          options={[{value:'wa', label:'WhatsApp Guests'}, {value:'staff', label:'Staff WA'}, {value:'ota', label:'OTA'}]}
          value="wa"
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📋 Templates</Button>
        <Button sx={btnAiSx}>✨ Réponse AI</Button>
      </PageHeader>

      <ChatLayout>
        <ConversationList conversations={conversations} activeId={activeConv} onSelect={setActiveConv} />
        <ChatThread
          conv={{ ...conv, meta: '🇺🇸 EN · Villa Belvédère · Jour 3/7' }}
          messages={messages}
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
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════
// EXAMPLE 6 — Annonces (cards grid)
// ════════════════════════════════════════════════════════════════════

export function ListingsPage() {
  return (
    <DashboardLayout
      user={{ initials: 'SC', name: 'Sofia C.', role: 'Owner' }}
      activePath="listings"
      breadcrumb={['Catalogue', 'Annonces']}
    >
      <PageHeader title="Annonces" count="42 actives">
        <ViewToggle
          options={[{value:'grid', label:'Grid'}, {value:'table', label:'Table'}, {value:'map', label:'Map'}]}
          value="grid"
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📥 Import OTA</Button>
        <Button sx={btnPrimarySx}>+ Nouvelle annonce</Button>
      </PageHeader>

      <FilterBar>
        <FilterChip label="Actives" active dropdown />
        <FilterChip label="Type" dropdown />
        <FilterChip label="Ville" dropdown />
        <FilterChip label="Performance" dropdown />
      </FilterBar>

      <ListingsGrid>
        <ListingCard photoColor="gold" name="Villa Belvédère" place="NICE · CÔTE D'AZUR · 4ch · 240m²"
          rating="4.92 · 47 avis" occupancy="87%" adr="€280" monthlyRev="€18k"
          channels={['airbnb', 'booking', 'vrbo', 'direct']} />
        <ListingCard photoColor="blue" name="Dar Sojori" place="MARRAKECH · MÉDINA · 6ch · riad"
          rating="4.85 · 32 avis" occupancy="92%" adr="€180" monthlyRev="€14k"
          channels={['airbnb', 'booking']} />
        <ListingCard photoColor="purple" name="Villa Atlas" place="MARRAKECH · PALMERAIE · 5ch · 320m²"
          rating="4.95 · 28 avis" occupancy="91%" adr="€420" monthlyRev="€22k"
          channels={['airbnb', 'booking', 'direct']} />
        <ListingCard photoColor="green" name="Atlas Loft" place="MARRAKECH · GUÉLIZ · 2ch · 110m²"
          rating="4.78 · 19 avis" occupancy="78%" adr="€110" monthlyRev="€8k"
          channels={['airbnb']} />
        <ListingCard photoColor="pink" name="Médina House" place="MARRAKECH · MOUASSINE · 3ch · 145m²"
          rating="4.88 · 24 avis" occupancy="83%" adr="€145" monthlyRev="€11k"
          channels={['airbnb', 'booking', 'vrbo']} />
        <ListingCard photoColor="gold" draft name="Studio Côte Bleue" place="CALVI · CENTRE · 1ch · 45m² ✨ AI"
          draftAction={{ onClick: () => console.log('Finalize AI') }} />
      </ListingsGrid>
    </DashboardLayout>
  );
}
