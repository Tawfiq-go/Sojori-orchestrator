import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  StatsRow, StatCard, PageHeader, FilterBar, FilterChip, ViewToggle,
  DataTable, GuestCell, ListingCell, Badge, SourcePill, Revenue, Pagination,
  btnGhostSx, btnAiSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button } from '@mui/material';

export function ReservationsPage() {
  const navigate = useNavigate();
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
    { key: 'guest', label: 'Voyageur', sortable: true, render: (row: any) =>
      <GuestCell name={row.guestName} initials={row.guestInitials} meta={row.guestMeta} color={row.guestColor} /> },
    { key: 'dates', label: 'Check-in', sortable: true, render: (row: any) =>
      <Box>
        <Box sx={{ fontSize: 13, fontWeight: 600 }}>{row.checkIn} → {row.checkOut}</Box>
        <Box sx={{ fontSize: 11.5, color: t.text3 }}>{row.nights} nuits · {row.daysToGo}</Box>
      </Box> },
    { key: 'listing', label: 'Listing', sortable: true,
      render: (row: any) => <ListingCell name={row.listing} color={row.listingColor} /> },
    { key: 'status', label: 'Statut', sortable: true,
      render: (row: any) => <Badge variant={row.status} dot>{row.statusLabel}</Badge> },
    { key: 'source', label: 'Source', sortable: true,
      render: (row: any) => <SourcePill source={row.source} /> },
    { key: 'revenue', label: 'Revenue', sortable: true, align: 'right',
      render: (row: any) => <Revenue amount={row.revenue} /> },
  ];

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
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
        onRowClick={(row) => navigate(`/reservations/${row.id}`)}
        footer={<>
          <Box>{selected.length} sélectionnée(s) sur 145</Box>
          <Pagination page={1} totalPages={21} />
          <Box>Affichage 1–{rows.length} sur 145</Box>
        </>}
      />
    </DashboardWrapper>
  );
}
