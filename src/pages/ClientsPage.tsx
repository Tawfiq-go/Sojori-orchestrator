import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ActionToast, useActionToast } from '../components/ActionToast';
import ColumnSelector, { type ColumnDef } from '../components/filters/ColumnSelector';
import { useAuth } from '../hooks/useAuth';
import {
  getStoredClients,
  getStoredOwners,
  saveStoredClients,
  type ClientRecord,
  type ClientStatus,
} from '../data/catalogueMock';
import {
  Badge,
  DataTable,
  FilterBar,
  FilterChip,
  PageHeader,
  Pagination,
  StatCard,
  StatsRow,
  btnGhostSx,
  btnPrimarySx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

const formatCurrency = (amount: number) => `${amount.toLocaleString('fr-FR')}€`;
const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
const CLIENT_COLUMN_ORDER = [
  'name',
  'country',
  'role',
  'owners',
  'totalBookings',
  'totalRevenue',
  'lastVisit',
  'status',
  'actions',
];

export function ClientsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const owners = getStoredOwners().filter((item) => item.role === 'owner');
  const { toast, showToast, hideToast } = useActionToast();

  const [clients, setClients] = useState<ClientRecord[]>(() => getStoredClients());
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [vipFilter, setVipFilter] = useState<'all' | 'vip' | 'standard'>('all');
  const [selectedOwners, setSelectedOwners] = useState<string[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showBanned, setShowBanned] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(CLIENT_COLUMN_ORDER);
  const [columnOrder, setColumnOrder] = useState(CLIENT_COLUMN_ORDER);
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<ClientRecord | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reservationOpen, setReservationOpen] = useState(false);

  const countries = useMemo(
    () => Array.from(new Set(clients.map((client) => client.country))).sort(),
    [clients],
  );

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      if (
        search &&
        ![client.name, client.email, client.phone].join(' ').toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      if (countryFilter !== 'all' && client.country !== countryFilter) {
        return false;
      }
      if (vipFilter === 'vip' && !client.vipStatus) {
        return false;
      }
      if (vipFilter === 'standard' && client.vipStatus) {
        return false;
      }
      if (!showDeleted && client.status === 'deleted') {
        return false;
      }
      if (!showBanned && client.status === 'banned') {
        return false;
      }
      if (isAdmin && selectedOwners.length > 0 && !client.ownerIds.some((id) => selectedOwners.includes(id))) {
        return false;
      }
      return true;
    });
  }, [clients, countryFilter, isAdmin, search, selectedOwners, showBanned, showDeleted, vipFilter]);

  const pageSize = 8;
  const paginatedClients = filteredClients.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));

  const stats = useMemo(() => {
    const activeClients = clients.filter((client) => client.status === 'active');
    const vipClients = clients.filter((client) => client.vipStatus);
    const avgRevenue = activeClients.length
      ? Math.round(activeClients.reduce((sum, client) => sum + client.totalRevenue, 0) / activeClients.length)
      : 0;
    const avgRating = activeClients.length
      ? activeClients.reduce((sum, client) => sum + client.avgRating, 0) / activeClients.length
      : 0;
    return {
      total: clients.length,
      vip: vipClients.length,
      banned: clients.filter((client) => client.status === 'banned').length,
      deleted: clients.filter((client) => client.status === 'deleted').length,
      avgRevenue,
      avgRating,
    };
  }, [clients]);

  const persistClients = (nextClients: ClientRecord[], message: string, severity: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setClients(nextClients);
    saveStoredClients(nextClients);
    showToast(message, severity);
  };
  const tableColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'Client',
        render: (row: any) => (
          <Stack>
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{row.name}</Typography>
            <Typography sx={{ fontSize: 11.5, color: t.text3 }}>{row.email}</Typography>
          </Stack>
        ),
      },
      {
        key: 'country',
        label: 'Pays',
        render: (row: any) => `${row.countryFlag} ${row.country}`,
      },
      {
        key: 'role',
        label: 'Role',
        render: (row: any) => <Badge variant={row.role === 'vip' ? 'gold' : row.role === 'corporate' ? 'info' : 'neutral'}>{row.role}</Badge>,
      },
      {
        key: 'owners',
        label: 'Owners associés',
        render: (row: any) => (
          <Typography sx={{ fontSize: 12, color: t.text3 }}>
            {row.ownerNames.join(', ')}
          </Typography>
        ),
      },
      { key: 'totalBookings', label: 'Séjours', align: 'right' },
      { key: 'totalRevenue', label: 'Revenu', align: 'right', render: (row: any) => formatCurrency(row.totalRevenue) },
      { key: 'lastVisit', label: 'Dernière visite', render: (row: any) => formatDate(row.lastVisit) },
      {
        key: 'status',
        label: 'Status',
        render: (row: any) => <Badge variant={row.status === 'active' ? 'success' : row.status === 'banned' ? 'error' : 'neutral'}>{row.status}</Badge>,
      },
      {
        key: 'actions',
        label: 'Actions',
        render: (row: any) => (
          <Stack direction="row" spacing={0.75}>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedClient(row); setDetailsOpen(true); }}>
              Voir
            </Button>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedClient(row); setEditOpen(true); }}>
              Modifier
            </Button>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate(`/clients/contacts?client=${row.id}`)}>
              Message
            </Button>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => { setSelectedClient(row); setReservationOpen(true); }}>
              Réservation
            </Button>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => toggleVip(row.id)}>
              {row.vipStatus ? 'UnVIP' : 'VIP'}
            </Button>
            <Button sx={{ ...btnGhostSx, ...btnSmSx }} color="error" onClick={() => removeClient(row.id)}>
              Supprimer
            </Button>
          </Stack>
        ),
      },
    ],
    [navigate],
  );
  const columnDefs = useMemo<ColumnDef[]>(
    () => [
      { id: 'name', label: 'Client', required: true },
      { id: 'country', label: 'Pays' },
      { id: 'role', label: 'Role' },
      { id: 'owners', label: 'Owners associés' },
      { id: 'totalBookings', label: 'Séjours' },
      { id: 'totalRevenue', label: 'Revenu' },
      { id: 'lastVisit', label: 'Dernière visite' },
      { id: 'status', label: 'Status' },
      { id: 'actions', label: 'Actions', required: true },
    ],
    [],
  );
  const visibleOrderedColumns = useMemo(
    () =>
      columnOrder
        .filter((columnId) => visibleColumns.includes(columnId))
        .map((columnId) => tableColumns.find((column) => column.key === columnId))
        .filter(Boolean),
    [columnOrder, tableColumns, visibleColumns],
  );

  const toggleVip = (clientId: string) => {
    persistClients(
      clients.map((client) =>
        client.id === clientId
          ? {
              ...client,
              vipStatus: !client.vipStatus,
              tags: !client.vipStatus
                ? Array.from(new Set([...client.tags, 'VIP']))
                : client.tags.filter((tag) => tag !== 'VIP'),
            }
          : client,
      ),
      'Statut VIP mis à jour',
    );
  };

  const removeClient = (clientId: string) => {
    persistClients(
      clients.map((client) =>
        client.id === clientId ? { ...client, status: 'deleted' } : client,
      ),
      'Client marqué comme supprimé',
      'warning',
    );
  };

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Clients']}>
      <PageHeader title="Base clients CRM" count={`${filteredClients.length} clients`}>
        <ColumnSelector
          columns={columnDefs}
          visible={visibleColumns}
          order={columnOrder}
          onChange={(nextVisible, nextOrder) => {
            setVisibleColumns(nextVisible);
            setColumnOrder(nextOrder);
          }}
        />
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => showToast('Export CSV mock généré', 'info')}>
          📊 Export CSV
        </Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate('/clients/contacts')}>
          💬 WhatsApp contacts
        </Button>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }} onClick={() => navigate('/crm')}>
          🧲 CRM
        </Button>
        <Button sx={btnPrimarySx} onClick={() => navigate('/onboarding')}>
          🚀 Onboarding
        </Button>
      </PageHeader>

      <StatsRow>
        <StatCard icon="👥" iconBg={t.primaryTint} iconColor={t.primary} value={String(stats.total)} label="Total clients" />
        <StatCard icon="⭐" iconBg={t.successTint} iconColor={t.success} value={String(stats.vip)} label="Clients VIP" />
        <StatCard icon="⛔" iconBg={t.errorTint} iconColor={t.error} value={String(stats.banned)} label="Banned" />
        <StatCard icon="💰" iconBg={t.infoTint} iconColor={t.info} value={formatCurrency(stats.avgRevenue)} label="Revenu moyen" />
      </StatsRow>

      <Box sx={{ my: 2 }}>
        <TextField
          placeholder="Rechercher par nom, email ou téléphone..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          fullWidth
          sx={{ maxWidth: 420 }}
        />
      </Box>

      <FilterBar>
        <FilterChip label={countryFilter === 'all' ? 'Tous pays' : countryFilter} active={countryFilter !== 'all'} onClick={() => setCountryFilter('all')} dropdown />
        <FilterChip label={vipFilter === 'all' ? 'Tous statuts' : vipFilter === 'vip' ? 'VIP' : 'Standard'} active={vipFilter !== 'all'} onClick={() => setVipFilter('all')} dropdown />
        <Stack direction="row" spacing={1} sx={{ ml: 'auto', alignItems: 'center' }}>
          <FormControlLabel control={<Checkbox checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />} label="Show Deleted" />
          <FormControlLabel control={<Checkbox checked={showBanned} onChange={(event) => setShowBanned(event.target.checked)} />} label="Show Banned" />
        </Stack>
      </FilterBar>

      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1, mb: 2 }}>
        {countries.map((country) => (
          <Button
            key={country}
            sx={{ ...btnGhostSx, ...(countryFilter === country ? { bgcolor: t.primaryTint } : {}) }}
            onClick={() => setCountryFilter((prev) => (prev === country ? 'all' : country))}
          >
            {country}
          </Button>
        ))}
        <Button
          sx={{ ...btnGhostSx, ...(vipFilter === 'vip' ? { bgcolor: t.primaryTint } : {}) }}
          onClick={() => setVipFilter((prev) => (prev === 'vip' ? 'all' : 'vip'))}
        >
          VIP
        </Button>
        <Button
          sx={{ ...btnGhostSx, ...(vipFilter === 'standard' ? { bgcolor: t.primaryTint } : {}) }}
          onClick={() => setVipFilter((prev) => (prev === 'standard' ? 'all' : 'standard'))}
        >
          Standard
        </Button>
        {isAdmin &&
          owners.map((owner) => (
            <Button
              key={owner.id}
              sx={{
                ...btnGhostSx,
                ...(selectedOwners.includes(owner.id) ? { bgcolor: t.primaryTint } : {}),
              }}
              onClick={() =>
                setSelectedOwners((prev) =>
                  prev.includes(owner.id)
                    ? prev.filter((item) => item !== owner.id)
                    : [...prev, owner.id],
                )
              }
            >
              {owner.name}
            </Button>
          ))}
      </Stack>

      <DataTable
        columns={visibleOrderedColumns}
        rows={paginatedClients}
        footer={
          <>
            <Typography sx={{ fontSize: 12 }}>
              {filteredClients.length} clients · Page {page} / {totalPages}
            </Typography>
            <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          </>
        }
      />

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Fiche client</DialogTitle>
        <DialogContent dividers>
          {selectedClient && (
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Identité</Typography>
                <Typography sx={{ fontSize: 12 }}>Nom: {selectedClient.name}</Typography>
                <Typography sx={{ fontSize: 12 }}>Email: {selectedClient.email}</Typography>
                <Typography sx={{ fontSize: 12 }}>Téléphone: {selectedClient.phone}</Typography>
                <Typography sx={{ fontSize: 12 }}>Role: {selectedClient.role}</Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Historique</Typography>
                <Typography sx={{ fontSize: 12 }}>Séjours: {selectedClient.totalBookings}</Typography>
                <Typography sx={{ fontSize: 12 }}>Revenu: {formatCurrency(selectedClient.totalRevenue)}</Typography>
                <Typography sx={{ fontSize: 12 }}>Listing préféré: {selectedClient.preferredListing}</Typography>
                <Typography sx={{ fontSize: 12 }}>Owners: {selectedClient.ownerNames.join(', ')}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{ width: 420, p: 3 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 2 }}>Modifier client</Typography>
          {selectedClient && (
            <Stack spacing={2}>
              <TextField label="Nom" value={selectedClient.name} onChange={(event) => setSelectedClient({ ...selectedClient, name: event.target.value })} />
              <TextField label="Email" value={selectedClient.email} onChange={(event) => setSelectedClient({ ...selectedClient, email: event.target.value })} />
              <TextField label="Téléphone" value={selectedClient.phone} onChange={(event) => setSelectedClient({ ...selectedClient, phone: event.target.value })} />
              <TextField
                label="Status"
                select
                value={selectedClient.status}
                onChange={(event) => setSelectedClient({ ...selectedClient, status: event.target.value as ClientStatus })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="banned">Banned</MenuItem>
                <MenuItem value="deleted">Deleted</MenuItem>
              </TextField>
              <Stack direction="row" spacing={1.5}>
                <Button sx={btnGhostSx} onClick={() => setEditOpen(false)}>
                  Annuler
                </Button>
                <Button
                  sx={btnPrimarySx}
                  onClick={() => {
                    if (!selectedClient) {
                      return;
                    }
                    persistClients(
                      clients.map((client) => (client.id === selectedClient.id ? selectedClient : client)),
                      'Client mis à jour',
                    );
                    setEditOpen(false);
                  }}
                >
                  Sauvegarder
                </Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={reservationOpen} onClose={() => setReservationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Créer réservation</DialogTitle>
        <DialogContent dividers>
          {selectedClient && (
            <Stack spacing={2}>
              <TextField label="Client" value={selectedClient.name} />
              <TextField label="Téléphone" value={selectedClient.phone} />
              <TextField label="Listing préféré" value={selectedClient.preferredListing} />
              <TextField label="Arrivée" type="date" />
              <TextField label="Départ" type="date" />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReservationOpen(false)}>Annuler</Button>
          <Button
            sx={btnPrimarySx}
            onClick={() => {
              setReservationOpen(false);
              showToast('Réservation mock créée');
            }}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <ActionToast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={hideToast}
      />
    </DashboardWrapper>
  );
}
