import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, DataTable, StatCard, StatsRow, Badge, ViewToggle, KanbanBoard, KanbanColumn,
  btnPrimarySx, btnGhostSx, btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import {
  Alert, Box, Button, Snackbar, Stack, Typography, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Avatar, Chip,
} from '@mui/material';

// ═══════════════════════════════════════════════════════════════
// MOCK DATA - Realistic Guest Requests
// ═══════════════════════════════════════════════════════════════

type RequestType = 'early-checkin' | 'late-checkout' | 'extra-towels' | 'info' | 'problem' | 'other';
type RequestStatus = 'nouveau' | 'en-cours' | 'resolu' | 'refuse';
type RequestPriority = 'normal' | 'urgent';

interface GuestRequest {
  id: string;
  type: RequestType;
  guestName: string;
  reservationNumber: string;
  listingName: string;
  listingPhoto: string;
  dateRequested: string;
  dateDesired?: string;
  description: string;
  status: RequestStatus;
  assignedTo?: string;
  priority: RequestPriority;
  additionalPrice?: number;
  history: { date: string; action: string; by: string }[];
}

const MOCK_REQUESTS: GuestRequest[] = [
  {
    id: 'req1',
    type: 'early-checkin',
    guestName: 'Sarah Johnson',
    reservationNumber: 'RES-2026-001',
    listingName: 'Villa Belvédère',
    listingPhoto: '🏡',
    dateRequested: '2026-05-13T10:30:00',
    dateDesired: '2026-05-15T11:00:00',
    description: 'Flight arrives early at 9am. Could we check in at 11am instead of 3pm? Happy to pay extra if needed.',
    status: 'nouveau',
    priority: 'normal',
    history: [
      { date: '2026-05-13T10:30:00', action: 'Demande créée', by: 'Guest' },
    ],
  },
  {
    id: 'req2',
    type: 'late-checkout',
    guestName: 'Marco Rossi',
    reservationNumber: 'RES-2026-002',
    listingName: 'Dar Sojori',
    listingPhoto: '🏘️',
    dateRequested: '2026-05-12T14:20:00',
    dateDesired: '2026-05-18T17:00:00',
    description: 'Our flight is at 8pm. Can we extend checkout until 5pm? We will keep the place tidy.',
    status: 'en-cours',
    assignedTo: 'Sofia',
    priority: 'normal',
    history: [
      { date: '2026-05-12T14:20:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-12T15:00:00', action: 'Assigné à Sofia', by: 'System' },
    ],
  },
  {
    id: 'req3',
    type: 'problem',
    guestName: 'Aisha Khalil',
    reservationNumber: 'RES-2026-003',
    listingName: 'Villa Atlas',
    listingPhoto: '⛰️',
    dateRequested: '2026-05-13T08:15:00',
    description: 'The hot water is not working in the master bathroom. Can someone come fix it today?',
    status: 'en-cours',
    assignedTo: 'Ahmed',
    priority: 'urgent',
    history: [
      { date: '2026-05-13T08:15:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-13T08:20:00', action: 'Marqué urgent', by: 'System' },
      { date: '2026-05-13T08:30:00', action: 'Assigné à Ahmed', by: 'Sofia' },
    ],
  },
  {
    id: 'req4',
    type: 'extra-towels',
    guestName: 'Pierre Dubois',
    reservationNumber: 'RES-2026-004',
    listingName: 'Riad Jasmine',
    listingPhoto: '🌸',
    dateRequested: '2026-05-11T16:45:00',
    description: 'We have 2 extra guests joining for the weekend. Could we get 2 more sets of towels and bedding?',
    status: 'resolu',
    assignedTo: 'Maria',
    priority: 'normal',
    history: [
      { date: '2026-05-11T16:45:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-11T17:00:00', action: 'Assigné à Maria', by: 'System' },
      { date: '2026-05-11T18:30:00', action: 'Livré', by: 'Maria' },
      { date: '2026-05-11T18:35:00', action: 'Marqué résolu', by: 'Maria' },
    ],
  },
  {
    id: 'req5',
    type: 'info',
    guestName: 'Emma Watson',
    reservationNumber: 'RES-2026-005',
    listingName: 'Villa Belvédère',
    listingPhoto: '🏡',
    dateRequested: '2026-05-10T12:00:00',
    description: 'What are the best restaurants nearby? Looking for authentic Moroccan cuisine.',
    status: 'resolu',
    assignedTo: 'Sofia',
    priority: 'normal',
    history: [
      { date: '2026-05-10T12:00:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-10T12:15:00', action: 'Répondu avec liste restaurants', by: 'Sofia' },
      { date: '2026-05-10T12:20:00', action: 'Marqué résolu', by: 'Sofia' },
    ],
  },
  {
    id: 'req6',
    type: 'problem',
    guestName: 'Ahmed Hassan',
    reservationNumber: 'RES-2026-006',
    listingName: 'Dar Sojori',
    listingPhoto: '🏘️',
    dateRequested: '2026-05-13T09:30:00',
    description: 'Air conditioning in bedroom not cooling. It is very hot.',
    status: 'nouveau',
    priority: 'urgent',
    history: [
      { date: '2026-05-13T09:30:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-13T09:35:00', action: 'Marqué urgent', by: 'System' },
    ],
  },
  {
    id: 'req7',
    type: 'other',
    guestName: 'Sophie Martin',
    reservationNumber: 'RES-2026-007',
    listingName: 'Villa Atlas',
    listingPhoto: '⛰️',
    dateRequested: '2026-05-09T11:20:00',
    description: 'Can you arrange a private chef for dinner on Saturday? We are celebrating an anniversary.',
    status: 'resolu',
    assignedTo: 'Sofia',
    priority: 'normal',
    history: [
      { date: '2026-05-09T11:20:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-09T12:00:00', action: 'Chef privé contacté', by: 'Sofia' },
      { date: '2026-05-09T14:30:00', action: 'Réservation confirmée', by: 'Sofia' },
      { date: '2026-05-09T14:35:00', action: 'Marqué résolu', by: 'Sofia' },
    ],
  },
  {
    id: 'req8',
    type: 'info',
    guestName: 'Carlos Mendez',
    reservationNumber: 'RES-2026-008',
    listingName: 'Riad Jasmine',
    listingPhoto: '🌸',
    dateRequested: '2026-05-12T10:00:00',
    description: 'How do we get to the Medina from here? Is it walking distance?',
    status: 'refuse',
    priority: 'normal',
    history: [
      { date: '2026-05-12T10:00:00', action: 'Demande créée', by: 'Guest' },
      { date: '2026-05-12T10:15:00', action: 'Info fournie (déjà dans guide)', by: 'System' },
      { date: '2026-05-12T10:20:00', action: 'Fermé (info disponible)', by: 'System' },
    ],
  },
];

// Request type config
const REQUEST_TYPE_CONFIG: Record<RequestType, { label: string; icon: string; color: string }> = {
  'early-checkin': { label: 'Early Check-in', icon: '🔑', color: t.info },
  'late-checkout': { label: 'Late Check-out', icon: '🚪', color: t.warning },
  'extra-towels': { label: 'Extra Amenities', icon: '🧺', color: t.success },
  'info': { label: 'Information', icon: 'ℹ️', color: t.primary },
  'problem': { label: 'Problème', icon: '⚠️', color: t.error },
  'other': { label: 'Autre', icon: '📝', color: t.text3 },
};

// Status config
const STATUS_CONFIG: Record<RequestStatus, { label: string; color: 'default' | 'warning' | 'success' | 'error' }> = {
  'nouveau': { label: 'Nouveau', color: 'warning' },
  'en-cours': { label: 'En cours', color: 'default' },
  'resolu': { label: 'Résolu', color: 'success' },
  'refuse': { label: 'Refusé', color: 'error' },
};

export function RequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [selectedRequest, setSelectedRequest] = useState<GuestRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'warning' | 'info' } | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [filters, setFilters] = useState({ type: 'all', status: 'all', priority: 'all', listing: 'all' });

  // Calculate stats
  const stats = useMemo(() => {
    const total = requests.length;
    const nouveau = requests.filter(r => r.status === 'nouveau').length;
    const enCours = requests.filter(r => r.status === 'en-cours').length;
    const urgent = requests.filter(r => r.priority === 'urgent').length;
    const avgResolutionTime = '2.3h'; // Mock
    const satisfaction = 94; // Mock %

    return { total, nouveau, enCours, urgent, avgResolutionTime, satisfaction };
  }, [requests]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (filters.type !== 'all' && r.type !== filters.type) return false;
      if (filters.status !== 'all' && r.status !== filters.status) return false;
      if (filters.priority !== 'all' && r.priority !== filters.priority) return false;
      if (filters.listing !== 'all' && r.listingName !== filters.listing) return false;
      if (dateRange.start && new Date(r.dateRequested) < new Date(dateRange.start)) return false;
      if (dateRange.end && new Date(r.dateRequested) > new Date(`${dateRange.end}T23:59:59`)) return false;
      return true;
    });
  }, [dateRange.end, dateRange.start, requests, filters]);

  // Group for Kanban
  const kanbanColumns = useMemo(() => {
    const grouped = filteredRequests.reduce((acc, req) => {
      if (!acc[req.status]) acc[req.status] = [];
      acc[req.status].push(req);
      return acc;
    }, {} as Record<RequestStatus, GuestRequest[]>);

    return [
      { id: 'nouveau', title: '🆕 Nouveau', color: t.warning, requests: grouped['nouveau'] || [] },
      { id: 'en-cours', title: '⏳ En cours', color: t.info, requests: grouped['en-cours'] || [] },
      { id: 'resolu', title: '✅ Résolu', color: t.success, requests: grouped['resolu'] || [] },
      { id: 'refuse', title: '❌ Refusé', color: t.error, requests: grouped['refuse'] || [] },
    ];
  }, [filteredRequests]);

  const handleViewDetail = (request: GuestRequest) => {
    setSelectedRequest(request);
    setDetailModalOpen(true);
  };

  const pushHistory = (request: GuestRequest, action: string, by: string) => [
    ...request.history,
    { date: new Date().toISOString(), action, by },
  ];

  const handleApprove = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, status: 'resolu', history: pushHistory(request, 'Demande approuvée', 'Sojori Ops') }
          : request,
      ),
    );
    setSelectedRequest((prev) =>
      prev ? { ...prev, status: 'resolu', history: pushHistory(prev, 'Demande approuvée', 'Sojori Ops') } : prev,
    );
    setToast({ message: 'Demande approuvée', severity: 'success' });
  };

  const handleReject = (requestId: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? { ...request, status: 'refuse', history: pushHistory(request, 'Demande rejetée', 'Sojori Ops') }
          : request,
      ),
    );
    setSelectedRequest((prev) =>
      prev ? { ...prev, status: 'refuse', history: pushHistory(prev, 'Demande rejetée', 'Sojori Ops') } : prev,
    );
    setToast({ message: 'Demande rejetée', severity: 'warning' });
  };

  const handleAssignStaff = (requestId: string, staffName: string) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              assignedTo: staffName,
              status: request.status === 'nouveau' ? 'en-cours' : request.status,
              history: pushHistory(request, `Assigné à ${staffName}`, 'Dispatcher'),
            }
          : request,
      ),
    );
    setSelectedRequest((prev) =>
      prev
        ? {
            ...prev,
            assignedTo: staffName,
            status: prev.status === 'nouveau' ? 'en-cours' : prev.status,
            history: pushHistory(prev, `Assigné à ${staffName}`, 'Dispatcher'),
          }
        : prev,
    );
    setToast({ message: `Assigné à ${staffName}`, severity: 'success' });
  };

  const handleCreateTask = (requestId: string) => {
    navigate(`/tasks?request=${requestId}`);
    setToast({ message: 'Ouverture du board tâches', severity: 'info' });
  };

  const handleAddPricing = (requestId: string, amount: number) => {
    setRequests((prev) =>
      prev.map((request) =>
        request.id === requestId
          ? {
              ...request,
              additionalPrice: amount,
              history: pushHistory(request, `Supplément ajouté (${amount}€)`, 'Revenue Ops'),
            }
          : request,
      ),
    );
    setSelectedRequest((prev) =>
      prev
        ? { ...prev, additionalPrice: amount, history: pushHistory(prev, `Supplément ajouté (${amount}€)`, 'Revenue Ops') }
        : prev,
    );
    setToast({ message: `Supplément ajouté: ${amount}€`, severity: 'success' });
  };

  // DataTable columns
  const columns = [
    {
      key: 'type',
      label: 'Type',
      render: (row: GuestRequest) => {
        const config = REQUEST_TYPE_CONFIG[row.type];
        return (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography sx={{ fontSize: 16 }}>{config.icon}</Typography>
            <Typography sx={{ fontSize: 13, fontWeight: 500, color: config.color }}>
              {config.label}
            </Typography>
          </Stack>
        );
      },
    },
    {
      key: 'guest',
      label: 'Guest & Réservation',
      render: (row: GuestRequest) => (
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.guestName}</Typography>
          <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono', color: t.text3 }}>
            {row.reservationNumber}
          </Typography>
        </Stack>
      ),
    },
    {
      key: 'listing',
      label: 'Listing',
      render: (row: GuestRequest) => (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography sx={{ fontSize: 18 }}>{row.listingPhoto}</Typography>
          <Typography sx={{ fontSize: 13 }}>{row.listingName}</Typography>
        </Stack>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row: GuestRequest) => (
        <Typography sx={{
          fontSize: 13,
          color: t.text2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 280,
        }}>
          {row.description}
        </Typography>
      ),
    },
    {
      key: 'dates',
      label: 'Dates',
      render: (row: GuestRequest) => (
        <Stack spacing={0.25}>
          <Typography sx={{ fontSize: 11, color: t.text3 }}>
            Demandé: {new Date(row.dateRequested).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Typography>
          {row.dateDesired && (
            <Typography sx={{ fontSize: 11, color: t.text3 }}>
              Souhaité: {new Date(row.dateDesired).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'status',
      label: 'Statut',
      render: (row: GuestRequest) => (
        <Badge color={STATUS_CONFIG[row.status].color} size="sm">
          {STATUS_CONFIG[row.status].label}
        </Badge>
      ),
    },
    {
      key: 'priority',
      label: 'Priorité',
      render: (row: GuestRequest) => (
        <Badge color={row.priority === 'urgent' ? 'error' : 'default'} size="sm">
          {row.priority === 'urgent' ? '🔥 Urgent' : '📋 Normal'}
        </Badge>
      ),
    },
    {
      key: 'assigned',
      label: 'Assigné à',
      render: (row: GuestRequest) => (
        row.assignedTo ? (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: t.primary }}>
              {row.assignedTo[0]}
            </Avatar>
            <Typography sx={{ fontSize: 13 }}>{row.assignedTo}</Typography>
          </Stack>
        ) : (
          <Typography sx={{ fontSize: 12, color: t.text4 }}>Non assigné</Typography>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: GuestRequest) => (
        <Stack direction="row" spacing={0.5}>
          <Button
            sx={{ ...btnSmSx, ...btnPrimarySx }}
            onClick={() => handleViewDetail(row)}
          >
            👁️ Détail
          </Button>
          {row.status !== 'resolu' && (
            <Button sx={{ ...btnSmSx, ...btnGhostSx }} onClick={() => handleApprove(row.id)}>
              ✅
            </Button>
          )}
        </Stack>
      ),
    },
  ];

  const RequestKanbanCard = ({ request }: { request: GuestRequest }) => {
    const typeConfig = REQUEST_TYPE_CONFIG[request.type];

    return (
      <Box
        onClick={() => handleViewDetail(request)}
        sx={{
          bgcolor: t.bg1,
          border: `1px solid ${t.border}`,
          borderRadius: '10px',
          p: 1.5,
          cursor: 'pointer',
          transition: 'all 0.15s',
          '&:hover': { borderColor: t.borderStrong, boxShadow: '0 4px 10px rgba(26,20,8,0.08)' },
        }}
      >
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.75 }}>
          <Typography sx={{ fontSize: 15 }}>{typeConfig.icon}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>{request.guestName}</Typography>
          {request.priority === 'urgent' ? <Badge color="error" size="sm">Urgent</Badge> : null}
        </Stack>
        <Typography sx={{ fontSize: 11, color: t.text3, mb: 0.75 }}>{request.listingName}</Typography>
        <Typography sx={{ fontSize: 12.5, color: t.text2, mb: 1.25, lineHeight: 1.5 }}>
          {request.description}
        </Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
          <Chip size="small" label={typeConfig.label} />
          <Chip size="small" label={request.assignedTo || 'Non assigné'} />
          {request.additionalPrice ? <Chip size="small" label={`+${request.additionalPrice}€`} /> : null}
        </Stack>
      </Box>
    );
  };

  return (
    <DashboardWrapper breadcrumb={['Service Client', 'Demandes']}>
      <PageHeader title="Demandes Guests" count={`${filteredRequests.length}`}>
        <ViewToggle
          options={[
            { value: 'table', label: '📋 Table' },
            { value: 'kanban', label: '📊 Kanban' },
          ]}
          value={viewMode}
          onChange={(v: string) => setViewMode(v as 'table' | 'kanban')}
        />
        <Button sx={btnGhostSx}>📊 Stats</Button>
        <Button sx={btnPrimarySx}>+ Nouvelle demande</Button>
      </PageHeader>

      {/* Stats Row */}
      <StatsRow>
        <StatCard
          label="Total demandes"
          value={`${stats.total}`}
          icon="📝"
          trend="Ce mois"
        />
        <StatCard
          label="Nouveau"
          value={`${stats.nouveau}`}
          icon="🆕"
          trend="À traiter"
          color="warning"
        />
        <StatCard
          label="En cours"
          value={`${stats.enCours}`}
          icon="⏳"
          trend="En traitement"
        />
        <StatCard
          label="Urgent"
          value={`${stats.urgent}`}
          icon="🔥"
          trend="Prioritaire"
          color="error"
        />
        <StatCard
          label="Délai moyen"
          value={stats.avgResolutionTime}
          icon="⏱️"
          trend="Résolution"
          trendUp
        />
        <StatCard
          label="Satisfaction"
          value={`${stats.satisfaction}%`}
          icon="😊"
          trend="Taux"
          trendUp
        />
      </StatsRow>

      {/* Filters */}
      <Stack
        direction="row"
        spacing={2}
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          bgcolor: t.bg1,
          borderRadius: '12px',
          border: `1px solid ${t.border}`,
          mb: 2,
        }}
      >
        <TextField
          select
          size="small"
          label="Type"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Object.entries(REQUEST_TYPE_CONFIG).map(([key, config]) => (
            <MenuItem key={key} value={key}>
              {config.icon} {config.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Statut"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
            <MenuItem key={key} value={key}>{config.label}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Priorité"
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="urgent">Urgent</MenuItem>
        </TextField>

        <TextField
          select
          size="small"
          label="Listing"
          value={filters.listing}
          onChange={(e) => setFilters({ ...filters, listing: e.target.value })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="all">Tous</MenuItem>
          {Array.from(new Set(requests.map(r => r.listingName))).map(listing => (
            <MenuItem key={listing} value={listing}>{listing}</MenuItem>
          ))}
        </TextField>

        <TextField
          size="small"
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          sx={{ minWidth: 150 }}
        />

        <TextField
          size="small"
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          sx={{ minWidth: 150 }}
        />
      </Stack>

      {/* Content: Table or Kanban */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          rows={filteredRequests}
        />
      ) : (
        <KanbanBoard>
          {kanbanColumns.map((column) => (
            <KanbanColumn
              key={column.id}
              status={column.id === 'en-cours' ? 'doing' : column.id === 'resolu' ? 'done' : column.id === 'refuse' ? 'review' : 'todo'}
              label={column.title}
              count={column.requests.length}
            >
              {column.requests.map((request) => (
                <RequestKanbanCard key={request.id} request={request} />
              ))}
            </KanbanColumn>
          ))}
        </KanbanBoard>
      )}

      {/* Detail Modal */}
      <Dialog
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack spacing={1}>
            <Typography variant="h6">Détail de la demande</Typography>
            {selectedRequest && (
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography sx={{ fontSize: 18 }}>
                  {REQUEST_TYPE_CONFIG[selectedRequest.type].icon}
                </Typography>
                <Typography sx={{ fontSize: 14, color: t.text2 }}>
                  {REQUEST_TYPE_CONFIG[selectedRequest.type].label}
                </Typography>
                <Badge color={STATUS_CONFIG[selectedRequest.status].color} size="sm">
                  {STATUS_CONFIG[selectedRequest.status].label}
                </Badge>
                {selectedRequest.priority === 'urgent' && (
                  <Badge color="error" size="sm">🔥 Urgent</Badge>
                )}
              </Stack>
            )}
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Stack spacing={2.5} sx={{ pt: 2 }}>
              {/* Guest & Reservation */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 0.5 }}>
                  GUEST & RÉSERVATION
                </Typography>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    {selectedRequest.guestName}
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontFamily: 'Geist Mono', color: t.text2 }}>
                    {selectedRequest.reservationNumber} • {selectedRequest.listingName}
                  </Typography>
                </Stack>
              </Box>

              {/* Description */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 0.5 }}>
                  DESCRIPTION
                </Typography>
                <Typography sx={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  bgcolor: t.bg2,
                  p: 1.5,
                  borderRadius: '8px',
                  borderLeft: `3px solid ${REQUEST_TYPE_CONFIG[selectedRequest.type].color}`,
                }}>
                  {selectedRequest.description}
                </Typography>
              </Box>

              {/* Dates */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 0.5 }}>
                  DATES
                </Typography>
                <Stack spacing={0.5}>
                  <Typography sx={{ fontSize: 13 }}>
                    Demandé: {new Date(selectedRequest.dateRequested).toLocaleString('fr-FR')}
                  </Typography>
                  {selectedRequest.dateDesired && (
                    <Typography sx={{ fontSize: 13 }}>
                      Souhaité: {new Date(selectedRequest.dateDesired).toLocaleString('fr-FR')}
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Assigned */}
              {selectedRequest.assignedTo && (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 0.5 }}>
                    ASSIGNÉ À
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Avatar sx={{ width: 28, height: 28, bgcolor: t.primary }}>
                      {selectedRequest.assignedTo[0]}
                    </Avatar>
                    <Typography sx={{ fontSize: 14 }}>{selectedRequest.assignedTo}</Typography>
                  </Stack>
                </Box>
              )}

              {selectedRequest.additionalPrice ? (
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 0.5 }}>
                    PRIX ADDITIONNEL
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                    +{selectedRequest.additionalPrice}€
                  </Typography>
                </Box>
              ) : null}

              {/* History */}
              <Box>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: t.text3, mb: 1 }}>
                  HISTORIQUE
                </Typography>
                <Stack spacing={1}>
                  {selectedRequest.history.map((h, idx) => (
                    <Stack
                      key={idx}
                      direction="row"
                      spacing={1.5}
                      sx={{
                        borderLeft: `2px solid ${t.border}`,
                        pl: 1.5,
                        py: 0.5,
                      }}
                    >
                      <Typography sx={{ fontSize: 11, fontFamily: 'Geist Mono', color: t.text3, minWidth: 100 }}>
                        {new Date(h.date).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </Typography>
                      <Typography sx={{ fontSize: 13 }}>
                        {h.action} <Typography component="span" sx={{ color: t.text3, fontSize: 12 }}>par {h.by}</Typography>
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailModalOpen(false)} sx={btnGhostSx}>
            Fermer
          </Button>
          {selectedRequest ? (
            <>
              <Button sx={btnPrimarySx} onClick={() => handleApprove(selectedRequest.id)}>✅ Approuver</Button>
              <Button sx={btnGhostSx} onClick={() => handleReject(selectedRequest.id)}>⛔ Rejeter</Button>
              <Button sx={btnGhostSx} onClick={() => handleAssignStaff(selectedRequest.id, 'Sofia')}>👤 Assigner</Button>
              <Button sx={btnGhostSx} onClick={() => handleCreateTask(selectedRequest.id)}>🧩 Créer tâche</Button>
              <Button sx={btnGhostSx} onClick={() => handleAddPricing(selectedRequest.id, 35)}>💶 +35€</Button>
            </>
          ) : null}
        </DialogActions>
      </Dialog>

      {toast ? (
        <Snackbar open autoHideDuration={2500} onClose={() => setToast(null)}>
          <Alert severity={toast.severity} variant="filled" onClose={() => setToast(null)}>
            {toast.message}
          </Alert>
        </Snackbar>
      ) : null}
    </DashboardWrapper>
  );
}
