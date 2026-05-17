import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  StatsRow, StatCard, PageHeader, FilterBar, FilterChip, ViewToggle,
  DataTable, GuestCell, ListingCell, Badge, SourcePill, Revenue, Pagination,
  btnGhostSx, btnAiSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, TextField, Select, MenuItem, FormControl, InputLabel, Stack, Typography, IconButton, Menu, Chip, Tooltip } from '@mui/material';
import { CreateReservationModal } from '../components/modals/CreateReservationModal';
import { mockReservations, type Reservation } from '../data/mockReservations';
import ColumnSelector, { type ColumnDef } from '../components/filters/ColumnSelector';

export function ReservationsPageV2() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>(mockReservations);
  const [selected, setSelected] = useState<string[]>([]);

  // Modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Filters state
  const [searchNumber, setSearchNumber] = useState('');
  const [searchGuest, setSearchGuest] = useState('');
  const [filterListing, setFilterListing] = useState<string[]>([]);
  const [filterTimeline, setFilterTimeline] = useState('all');
  const [filterSource, setFilterSource] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>(['Confirmée', 'En attente paiement']);
  const [filterPayment, setFilterPayment] = useState('all');

  // Actions menu
  const [actionsMenuAnchor, setActionsMenuAnchor] = useState<null | HTMLElement>(null);
  const [, setActionRowId] = useState<string | null>(null);

  // Column selector state
  const allColumnDefs: ColumnDef[] = [
    { id: 'reservationNumber', label: 'N° Résa', required: true },
    { id: 'guest', label: 'Voyageur', required: true },
    { id: 'listing', label: 'Listing' },
    { id: 'dates', label: 'Dates' },
    { id: 'travelers', label: 'Voyageurs' },
    { id: 'revenue', label: 'Revenu' },
    { id: 'status', label: 'Statut' },
    { id: 'source', label: 'Source' },
    { id: 'payment', label: 'Paiement' },
    { id: 'createdAt', label: 'Créé le' },
    { id: 'actions', label: 'Actions', required: true },
  ];
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'reservationNumber', 'guest', 'listing', 'dates', 'travelers', 'revenue', 'status', 'source', 'payment', 'actions'
  ]);
  const [columnOrder, setColumnOrder] = useState<string[]>([
    'reservationNumber', 'guest', 'listing', 'dates', 'travelers', 'revenue', 'status', 'source', 'payment', 'createdAt', 'actions'
  ]);

  // Handle create reservation
  const handleCreateReservation = (newReservation: Partial<Reservation>) => {
    setReservations([newReservation as Reservation, ...reservations]);
    // Toast success
    alert('✅ Réservation créée avec succès !');
  };

  // Filtered reservations
  const filteredReservations = reservations.filter(r => {
    // Search by number
    if (searchNumber && !r.reservationNumber.toLowerCase().includes(searchNumber.toLowerCase())) {
      return false;
    }
    // Search by guest name
    if (searchGuest && !r.guestName.toLowerCase().includes(searchGuest.toLowerCase())) {
      return false;
    }
    // Filter by listing
    if (filterListing.length > 0 && !filterListing.includes(r.listingId)) {
      return false;
    }
    // Filter by timeline
    const today = new Date();
    const checkIn = new Date(r.checkInDate);
    const checkOut = new Date(r.checkOutDate);
    if (filterTimeline === 'arriving_today' && checkIn.toDateString() !== today.toDateString()) {
      return false;
    }
    if (filterTimeline === 'departing_today' && checkOut.toDateString() !== today.toDateString()) {
      return false;
    }
    if (filterTimeline === 'in_house' && (checkIn > today || checkOut < today)) {
      return false;
    }
    if (filterTimeline === 'upcoming' && checkIn <= today) {
      return false;
    }
    if (filterTimeline === 'past' && checkOut >= today) {
      return false;
    }
    // Filter by source
    if (filterSource.length > 0 && !filterSource.includes(r.source)) {
      return false;
    }
    // Filter by status
    if (filterStatus.length > 0 && !filterStatus.includes(r.statusLabel)) {
      return false;
    }
    // Filter by payment
    if (filterPayment !== 'all' && r.paymentStatus !== filterPayment) {
      return false;
    }
    return true;
  });

  // All columns definitions
  const allColumns = [
    {
      key: 'reservationNumber',
      label: 'N° Résa',
      sortable: true,
      render: (row: Reservation) =>
        <Tooltip title="Cliquer pour voir détails">
          <Typography
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/reservations/${row.id}`);
            }}
            sx={{
              fontSize: 12,
              fontWeight: 700,
              color: t.primary,
              cursor: 'pointer',
              fontFamily: 'Geist Mono',
              '&:hover': { textDecoration: 'underline' }
            }}
          >
            {row.reservationNumber}
          </Typography>
        </Tooltip>
    },
    {
      key: 'guest',
      label: 'Voyageur',
      sortable: true,
      render: (row: Reservation) => (
        <Box>
          <GuestCell name={row.guestName} initials={row.guestInitials} meta={row.guestMeta} color={row.guestColor} />
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: 10, color: t.text3 }}>📞 {row.guestPhone}</Typography>
            {row.notes && (
              <Tooltip title={row.notes}>
                <span style={{ fontSize: 12, cursor: 'help' }}>💬</span>
              </Tooltip>
            )}
          </Stack>
        </Box>
      )
    },
    {
      key: 'listing',
      label: 'Listing',
      sortable: true,
      render: (row: Reservation) => (
        <Box>
          <ListingCell name={row.listing} color={row.listingColor} />
          {row.roomTypeName && (
            <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
              🏠 {row.roomTypeName}
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'dates',
      label: 'Check-in',
      sortable: true,
      render: (row: Reservation) => (
        <Box>
          <Box sx={{ fontSize: 12, fontWeight: 600 }}>
            {row.checkIn} ({row.checkInTime})
          </Box>
          <Box sx={{ fontSize: 11, color: t.text3 }}>
            → {row.checkOut} ({row.checkOutTime})
          </Box>
          <Box sx={{ fontSize: 11, color: t.text2, mt: 0.5 }}>
            🌙 {row.nights} nuits · {row.daysToGo}
          </Box>
        </Box>
      )
    },
    {
      key: 'travelers',
      label: 'Voyageurs',
      sortable: false,
      render: (row: Reservation) => {
        const validated = row.travelers.filter(t => t.status === 'COMPLETE').length;
        const draft = row.travelers.filter(t => t.status === 'DRAFT').length;
        const notReg = row.travelers.filter(t => t.status === 'NOT_REGISTERED').length;

        return (
          <Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
              {row.adults}A · {row.children}C · {row.infants}I
            </Typography>
            <Typography
              sx={{
                fontSize: 10,
                mt: 0.5,
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' }
              }}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/reservations/${row.id}`, { state: { tab: 'travelers' } });
              }}
            >
              <span style={{ color: t.success, fontWeight: 600 }}>{validated}V</span>
              {' · '}
              <span style={{ color: t.warning, fontWeight: 600 }}>{draft}D</span>
              {' · '}
              <span style={{ color: t.error, fontWeight: 600 }}>{notReg}N</span>
            </Typography>
          </Box>
        );
      }
    },
    {
      key: 'status',
      label: 'Statut',
      sortable: true,
      render: (row: Reservation) => (
        <Stack spacing={0.5}>
          <Badge variant={row.status} dot>{row.statusLabel}</Badge>
          {row.checkInOutStatus === 'arrived' && (
            <Badge variant="info" dot>Arrivé</Badge>
          )}
          {row.checkInOutStatus === 'departed' && (
            <Badge variant="neutral" dot>Parti</Badge>
          )}
        </Stack>
      )
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (row: Reservation) => (
        <Box>
          <SourcePill source={row.source} />
          {row.otaCode && (
            <Typography sx={{ fontSize: 9, color: t.text3, mt: 0.5, fontFamily: 'Geist Mono' }}>
              {row.otaCode}
            </Typography>
          )}
          {row.channelManager && (
            <Chip
              label={row.channelManager === 'channex' ? 'Channex' : 'RU'}
              size="small"
              sx={{ fontSize: 8, height: 16, mt: 0.5 }}
            />
          )}
        </Box>
      )
    },
    {
      key: 'revenue',
      label: 'Revenue',
      sortable: true,
      align: 'right',
      render: (row: Reservation) => (
        <Box sx={{ textAlign: 'right' }}>
          <Revenue amount={row.revenue} />
          <Typography sx={{ fontSize: 10, color: t.text3, mt: 0.5 }}>
            {row.currency} · {row.pricePerNight}€/nuit
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', mt: 0.5 }}>
            <Typography sx={{ fontSize: 9, color: t.text3 }}>
              Comm: {row.commission}€
            </Typography>
            <Typography sx={{ fontSize: 9, color: t.success, fontWeight: 600 }}>
              Net: {row.netOwner}€
            </Typography>
          </Stack>
        </Box>
      )
    },
    {
      key: 'payment',
      label: 'Paiement',
      sortable: true,
      render: (row: Reservation) => (
        <Chip
          label={row.paymentStatus === 'paid' ? '✅ Payé' : row.paymentStatus === 'partial' ? '⏳ Partiel' : '❌ Non payé'}
          size="small"
          sx={{
            fontSize: 10,
            fontWeight: 700,
            bgcolor: row.paymentStatus === 'paid' ? t.successTint : row.paymentStatus === 'partial' ? t.warningTint : t.errorTint,
            color: row.paymentStatus === 'paid' ? t.success : row.paymentStatus === 'partial' ? t.warning : t.error,
            border: `1px solid ${row.paymentStatus === 'paid' ? t.success : row.paymentStatus === 'partial' ? t.warning : t.error}`,
          }}
        />
      )
    },
    {
      key: 'createdAt',
      label: 'Créé le',
      sortable: true,
      render: (row: Reservation) => (
        <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono' }}>
          {new Date(row.createdAt).toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Typography>
      )
    },
    {
      key: 'actions',
      label: '',
      sortable: false,
      render: (row: Reservation) => (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setActionRowId(row.id);
            setActionsMenuAnchor(e.currentTarget);
          }}
        >
          ⋮
        </IconButton>
      )
    },
  ];

  // Filter and order columns based on user selection
  const columns = columnOrder
    .filter(colId => visibleColumns.includes(colId))
    .map(colId => allColumns.find(col => col.key === colId))
    .filter(col => col !== undefined);

  return (
    <DashboardWrapper breadcrumb={['Activité', 'Réservations']}>
      <StatsRow>
        <StatCard icon="🎫" iconBg="rgba(16,185,129,0.10)" iconColor={t.success}
          value={filteredReservations.filter(r => r.status === 'success').length.toString()}
          label="Réservations actives"
          trend="12%" trendUp />
        <StatCard icon="€" iconBg="rgba(230,176,34,0.10)" iconColor={t.primaryDeep}
          value={`€${filteredReservations.reduce((sum, r) => sum + r.totalPrice, 0).toLocaleString('fr')}`}
          label="Revenu ce mois"
          trend="8%" trendUp />
        <StatCard icon="📊" iconBg="rgba(6,182,212,0.10)" iconColor="#0e7490"
          value="87%" label="Taux d'occupation" trend="3%" trendUp />
        <StatCard icon="⭐" iconBg="rgba(139,92,246,0.10)" iconColor={t.ai}
          value="4.92" label="Note moyenne · 47 avis" trend="0.1" trendUp />
      </StatsRow>

      <PageHeader title="Réservations" count={filteredReservations.length.toString()}>
        <ColumnSelector
          columns={allColumnDefs}
          visible={visibleColumns}
          order={columnOrder}
          onChange={(newVisible, newOrder) => {
            setVisibleColumns(newVisible);
            setColumnOrder(newOrder);
          }}
        />
        <Button sx={btnGhostSx} onClick={() => alert('Export CSV - MOCK')}>
          📥 Exporter CSV
        </Button>
        <Button sx={btnAiSx} onClick={() => alert('AI Suggestions - MOCK')}>
          ✨ Suggestion AI
        </Button>
        <Button sx={btnPrimarySx} onClick={() => setCreateModalOpen(true)}>
          + Nouvelle résa
        </Button>
      </PageHeader>

      {/* Filters */}
      <Box sx={{ mb: 2.5 }}>
        <Stack spacing={1.5}>
          {/* Row 1: Search + Quick filters */}
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="Rechercher N° résa..."
              value={searchNumber}
              onChange={(e) => setSearchNumber(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <TextField
              size="small"
              placeholder="Rechercher voyageur..."
              value={searchGuest}
              onChange={(e) => setSearchGuest(e.target.value)}
              sx={{ minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Timeline</InputLabel>
              <Select value={filterTimeline} onChange={(e) => setFilterTimeline(e.target.value)} label="Timeline">
                <MenuItem value="all">Toutes</MenuItem>
                <MenuItem value="arriving_today">🛬 Arrivées aujourd'hui</MenuItem>
                <MenuItem value="departing_today">🛫 Départs aujourd'hui</MenuItem>
                <MenuItem value="in_house">🏠 Séjours en cours</MenuItem>
                <MenuItem value="upcoming">📅 À venir</MenuItem>
                <MenuItem value="past">📜 Passées</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Paiement</InputLabel>
              <Select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)} label="Paiement">
                <MenuItem value="all">Tous</MenuItem>
                <MenuItem value="paid">✅ Payé</MenuItem>
                <MenuItem value="unpaid">❌ Non payé</MenuItem>
                <MenuItem value="partial">⏳ Partiel</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          {/* Row 2: Filter chips */}
          <FilterBar>
            <FilterChip
              label={`Statut (${filterStatus.length})`}
              active={filterStatus.length > 0}
              dropdown
            />
            <FilterChip
              label={filterStatus.includes('Confirmée') ? 'Confirmées' : 'Statut'}
              active={filterStatus.includes('Confirmée')}
              dropdown
            />
            <FilterChip
              label={`Source (${filterSource.length})`}
              active={filterSource.length > 0}
              dropdown
            />
            <FilterChip label="📅 Toutes dates" dropdown />

            {/* Clear filters button */}
            {(searchNumber || searchGuest || filterTimeline !== 'all' || filterPayment !== 'all' || filterStatus.length > 0 || filterSource.length > 0 || filterListing.length > 0) && (
              <Button
                size="small"
                onClick={() => {
                  setSearchNumber('');
                  setSearchGuest('');
                  setFilterTimeline('all');
                  setFilterPayment('all');
                  setFilterStatus([]);
                  setFilterSource([]);
                  setFilterListing([]);
                }}
                sx={{ ml: 1, textTransform: 'none', fontSize: 12 }}
              >
                ✕ Effacer filtres
              </Button>
            )}

            <Box sx={{ ml: 'auto' }}>
              <ViewToggle
                options={[
                  {value:'table', label:'Table'},
                  {value:'cards', label:'Cards'},
                  {value:'timeline', label:'Timeline'}
                ]}
                value="table"
              />
            </Box>
          </FilterBar>
        </Stack>
      </Box>

      <DataTable
        columns={columns}
        rows={filteredReservations}
        selectable
        selectedIds={selected}
        onSelectionChange={setSelected}
        onRowClick={(row: Reservation) => navigate(`/reservations/${row.id}`)}
        footer={<>
          <Box>{selected.length} sélectionnée(s) sur {filteredReservations.length}</Box>
          <Pagination page={1} totalPages={Math.ceil(filteredReservations.length / 20)} />
          <Box>Affichage 1–{Math.min(20, filteredReservations.length)} sur {filteredReservations.length}</Box>
        </>}
      />

      {/* Create Modal */}
      <CreateReservationModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSave={handleCreateReservation}
      />

      {/* Actions Menu */}
      <Menu
        anchorEl={actionsMenuAnchor}
        open={Boolean(actionsMenuAnchor)}
        onClose={() => setActionsMenuAnchor(null)}
      >
        <MenuItem onClick={() => { alert('Modifier - MOCK'); setActionsMenuAnchor(null); }}>
          ✏️ Modifier
        </MenuItem>
        <MenuItem onClick={() => { alert('Voir calendrier - MOCK'); setActionsMenuAnchor(null); }}>
          📅 Voir calendrier
        </MenuItem>
        <MenuItem onClick={() => { alert('Voir tâches - MOCK'); setActionsMenuAnchor(null); }}>
          📋 Voir tâches
        </MenuItem>
        <MenuItem onClick={() => { alert('Déclarer arrivée - MOCK'); setActionsMenuAnchor(null); }}>
          ✅ Déclarer arrivée/départ
        </MenuItem>
        <MenuItem onClick={() => { alert('Envoyer message - MOCK'); setActionsMenuAnchor(null); }}>
          📧 Envoyer message
        </MenuItem>
        <MenuItem onClick={() => { alert('Dupliquer - MOCK'); setActionsMenuAnchor(null); }}>
          🔗 Dupliquer
        </MenuItem>
        <MenuItem onClick={() => {
          if (confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) {
            alert('Annuler - MOCK');
          }
          setActionsMenuAnchor(null);
        }} sx={{ color: t.error }}>
          ❌ Annuler réservation
        </MenuItem>
      </Menu>
    </DashboardWrapper>
  );
}
