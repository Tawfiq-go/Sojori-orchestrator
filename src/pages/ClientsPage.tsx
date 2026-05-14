import { useState } from 'react';
import { Box, Button, Typography, Stack, TextField, InputAdornment } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader,
  StatsRow,
  StatCard,
  DataTable,
  Badge,
  FilterBar,
  FilterChip,
  Pagination,
  btnPrimarySx,
  btnGhostSx,
  btnSmSx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';

// ─── Mock Data ─────────────────────────────────────────────────────────
// Structure matches: GET /api/clients (from srv-user or srv-crm)
const CLIENTS_DATA = {
  // Client list (travelers/guests)
  clients: [
    {
      id: 'CL-001',
      name: 'Ahmed Benali',
      email: 'ahmed.benali@example.com',
      phone: '+212 6 12 34 56 78',
      country: 'MA',
      countryFlag: '🇲🇦',
      totalBookings: 8,
      totalRevenue: 4250,
      avgRevenuePerStay: 531,
      lastVisit: '2026-05-10T14:00:00Z',
      avgRating: 4.9,
      vipStatus: true,
      tags: ['Fidèle', 'VIP'],
      firstBooking: '2024-08-15T10:00:00Z',
      preferredListing: 'Dar Sojori',
    },
    {
      id: 'CL-002',
      name: 'Sophie Martin',
      email: 'sophie.martin@example.fr',
      phone: '+33 6 45 78 90 12',
      country: 'FR',
      countryFlag: '🇫🇷',
      totalBookings: 5,
      totalRevenue: 2450,
      avgRevenuePerStay: 490,
      lastVisit: '2026-04-22T14:00:00Z',
      avgRating: 4.8,
      vipStatus: false,
      tags: ['Fidèle'],
      firstBooking: '2025-01-10T10:00:00Z',
      preferredListing: 'Villa Belvédère',
    },
    {
      id: 'CL-003',
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+1 555 123 4567',
      country: 'US',
      countryFlag: '🇺🇸',
      totalBookings: 3,
      totalRevenue: 1890,
      avgRevenuePerStay: 630,
      lastVisit: '2026-03-15T14:00:00Z',
      avgRating: 4.7,
      vipStatus: false,
      tags: [],
      firstBooking: '2025-06-20T10:00:00Z',
      preferredListing: 'Villa Atlas',
    },
    {
      id: 'CL-004',
      name: 'Maria Garcia',
      email: 'maria.garcia@example.es',
      phone: '+34 612 345 678',
      country: 'ES',
      countryFlag: '🇪🇸',
      totalBookings: 12,
      totalRevenue: 6840,
      avgRevenuePerStay: 570,
      lastVisit: '2026-05-12T14:00:00Z',
      avgRating: 5.0,
      vipStatus: true,
      tags: ['VIP', 'Fidèle'],
      firstBooking: '2023-11-05T10:00:00Z',
      preferredListing: 'Médina House',
    },
    {
      id: 'CL-005',
      name: 'Hans Mueller',
      email: 'hans.mueller@example.de',
      phone: '+49 170 123 4567',
      country: 'DE',
      countryFlag: '🇩🇪',
      totalBookings: 2,
      totalRevenue: 980,
      avgRevenuePerStay: 490,
      lastVisit: '2026-02-18T14:00:00Z',
      avgRating: 4.5,
      vipStatus: false,
      tags: [],
      firstBooking: '2025-09-12T10:00:00Z',
      preferredListing: 'Atlas Loft',
    },
    {
      id: 'CL-006',
      name: 'Fatima Zahra',
      email: 'fatima.zahra@example.com',
      phone: '+212 6 98 76 54 32',
      country: 'MA',
      countryFlag: '🇲🇦',
      totalBookings: 6,
      totalRevenue: 3420,
      avgRevenuePerStay: 570,
      lastVisit: '2026-04-30T14:00:00Z',
      avgRating: 4.9,
      vipStatus: true,
      tags: ['VIP', 'Fidèle'],
      firstBooking: '2024-06-10T10:00:00Z',
      preferredListing: 'Dar Sojori',
    },
    {
      id: 'CL-007',
      name: 'Emma Wilson',
      email: 'emma.wilson@example.co.uk',
      phone: '+44 7700 900123',
      country: 'UK',
      countryFlag: '🇬🇧',
      totalBookings: 4,
      totalRevenue: 2140,
      avgRevenuePerStay: 535,
      lastVisit: '2026-05-05T14:00:00Z',
      avgRating: 4.8,
      vipStatus: false,
      tags: ['Fidèle'],
      firstBooking: '2025-03-15T10:00:00Z',
      preferredListing: 'Villa Belvédère',
    },
    {
      id: 'CL-008',
      name: 'Luca Rossi',
      email: 'luca.rossi@example.it',
      phone: '+39 333 123 4567',
      country: 'IT',
      countryFlag: '🇮🇹',
      totalBookings: 1,
      totalRevenue: 450,
      avgRevenuePerStay: 450,
      lastVisit: '2026-01-20T14:00:00Z',
      avgRating: 4.6,
      vipStatus: false,
      tags: ['Nouveau'],
      firstBooking: '2026-01-20T10:00:00Z',
      preferredListing: 'Atlas Loft',
    },
    {
      id: 'CL-009',
      name: 'Amina Khatib',
      email: 'amina.khatib@example.com',
      phone: '+971 50 123 4567',
      country: 'AE',
      countryFlag: '🇦🇪',
      totalBookings: 7,
      totalRevenue: 4900,
      avgRevenuePerStay: 700,
      lastVisit: '2026-05-08T14:00:00Z',
      avgRating: 5.0,
      vipStatus: true,
      tags: ['VIP', 'Fidèle'],
      firstBooking: '2024-09-01T10:00:00Z',
      preferredListing: 'Villa Atlas',
    },
    {
      id: 'CL-010',
      name: 'Pierre Dubois',
      email: 'pierre.dubois@example.fr',
      phone: '+33 6 98 76 54 32',
      country: 'FR',
      countryFlag: '🇫🇷',
      totalBookings: 9,
      totalRevenue: 5400,
      avgRevenuePerStay: 600,
      lastVisit: '2026-05-13T14:00:00Z',
      avgRating: 4.9,
      vipStatus: true,
      tags: ['VIP', 'Fidèle'],
      firstBooking: '2024-03-20T10:00:00Z',
      preferredListing: 'Villa Belvédère',
    },
    {
      id: 'CL-011',
      name: 'Yuki Tanaka',
      email: 'yuki.tanaka@example.jp',
      phone: '+81 90 1234 5678',
      country: 'JP',
      countryFlag: '🇯🇵',
      totalBookings: 2,
      totalRevenue: 1200,
      avgRevenuePerStay: 600,
      lastVisit: '2026-03-10T14:00:00Z',
      avgRating: 4.7,
      vipStatus: false,
      tags: [],
      firstBooking: '2025-11-15T10:00:00Z',
      preferredListing: 'Médina House',
    },
    {
      id: 'CL-012',
      name: 'Omar Hassan',
      email: 'omar.hassan@example.com',
      phone: '+212 6 11 22 33 44',
      country: 'MA',
      countryFlag: '🇲🇦',
      totalBookings: 1,
      totalRevenue: 380,
      avgRevenuePerStay: 380,
      lastVisit: '2025-12-20T14:00:00Z',
      avgRating: 3.8,
      vipStatus: false,
      tags: ['Problématique'],
      firstBooking: '2025-12-20T10:00:00Z',
      preferredListing: 'Dar Sojori',
    },
  ],

  // Available filter options
  tags: ['VIP', 'Fidèle', 'Nouveau', 'Problématique'],
  countries: [
    { code: 'MA', name: 'Maroc', flag: '🇲🇦' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'US', name: 'États-Unis', flag: '🇺🇸' },
    { code: 'ES', name: 'Espagne', flag: '🇪🇸' },
    { code: 'DE', name: 'Allemagne', flag: '🇩🇪' },
    { code: 'UK', name: 'Royaume-Uni', flag: '🇬🇧' },
    { code: 'IT', name: 'Italie', flag: '🇮🇹' },
    { code: 'AE', name: 'Émirats', flag: '🇦🇪' },
    { code: 'JP', name: 'Japon', flag: '🇯🇵' },
  ],

  // Stats
  stats: {
    totalClients: 142,
    vipClients: 28,
    newClientsThisMonth: 8,
    avgRevenue: 850,
    totalRevenue: 120700,
    avgRating: 4.75,
  },
};

// ─── Helper Functions ──────────────────────────────────────────────────
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('fr-FR')}€`;
}

function renderStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? '½' : '';
  return '⭐'.repeat(fullStars) + (halfStar ? '⭐' : '');
}

// ─── Main Component ────────────────────────────────────────────────────
export function ClientsPage() {
  const [searchText, setSearchText] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [selectedBookings, setSelectedBookings] = useState<string>('all');
  const [selectedVip, setSelectedVip] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    email: true,
    country: true,
    bookings: true,
    revenue: true,
    lastVisit: true,
    rating: true,
    vip: true,
    tags: true,
    avgPerStay: false,
    phone: false,
    firstBooking: false,
    preferred: false,
  });

  const itemsPerPage = 10;

  // Filter clients
  const filteredClients = CLIENTS_DATA.clients.filter((client) => {
    // Search filter
    if (searchText && !client.name.toLowerCase().includes(searchText.toLowerCase()) &&
        !client.email.toLowerCase().includes(searchText.toLowerCase())) {
      return false;
    }

    // Country filter
    if (selectedCountry !== 'all' && client.country !== selectedCountry) {
      return false;
    }

    // Bookings filter
    if (selectedBookings === '1' && client.totalBookings !== 1) return false;
    if (selectedBookings === '2-5' && (client.totalBookings < 2 || client.totalBookings > 5)) return false;
    if (selectedBookings === '6+' && client.totalBookings < 6) return false;

    // VIP filter
    if (selectedVip === 'vip' && !client.vipStatus) return false;
    if (selectedVip === 'standard' && client.vipStatus) return false;

    // Tag filter
    if (selectedTag !== 'all' && !client.tags.includes(selectedTag)) return false;

    return true;
  });

  // Paginate
  const paginatedClients = filteredClients.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);

  // Define columns
  const allColumns = [
    {
      key: 'name',
      label: 'Client',
      visible: visibleColumns.name,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Stack>
          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{row.name}</Typography>
          {visibleColumns.email && (
            <Typography sx={{ fontSize: 11.5, color: t.text3 }}>{row.email}</Typography>
          )}
        </Stack>
      ),
    },
    {
      key: 'country',
      label: 'Pays',
      visible: visibleColumns.country,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box sx={{ fontSize: 16 }}>{row.countryFlag}</Box>
          <Typography sx={{ fontSize: 12.5 }}>{row.country}</Typography>
        </Stack>
      ),
    },
    {
      key: 'bookings',
      label: 'Nb séjours',
      align: 'center',
      visible: visibleColumns.bookings,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.totalBookings}</Typography>
      ),
    },
    {
      key: 'revenue',
      label: 'Revenu total',
      align: 'right',
      visible: visibleColumns.revenue,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: t.success }}>
          {formatCurrency(row.totalRevenue)}
        </Typography>
      ),
    },
    {
      key: 'avgPerStay',
      label: 'Moy/séjour',
      align: 'right',
      visible: visibleColumns.avgPerStay,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          {formatCurrency(row.avgRevenuePerStay)}
        </Typography>
      ),
    },
    {
      key: 'lastVisit',
      label: 'Dernière visite',
      visible: visibleColumns.lastVisit,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          {formatDate(row.lastVisit)}
        </Typography>
      ),
    },
    {
      key: 'rating',
      label: 'Note moyenne',
      align: 'center',
      visible: visibleColumns.rating,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 11 }}>{renderStars(row.avgRating).slice(0, 1)}</Typography>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{row.avgRating.toFixed(1)}</Typography>
        </Stack>
      ),
    },
    {
      key: 'vip',
      label: 'VIP',
      align: 'center',
      visible: visibleColumns.vip,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        row.vipStatus ? <Badge variant="gold">VIP</Badge> : null
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      visible: visibleColumns.tags,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
          {row.tags.map((tag) => (
            <Badge
              key={tag}
              variant={
                tag === 'VIP' ? 'gold' :
                tag === 'Fidèle' ? 'success' :
                tag === 'Nouveau' ? 'info' :
                tag === 'Problématique' ? 'error' :
                'neutral'
              }
            >
              {tag}
            </Badge>
          ))}
        </Stack>
      ),
    },
    {
      key: 'phone',
      label: 'Téléphone',
      visible: visibleColumns.phone,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12, color: t.text3, fontFamily: 'Geist Mono' }}>
          {row.phone}
        </Typography>
      ),
    },
    {
      key: 'firstBooking',
      label: '1ère résa',
      visible: visibleColumns.firstBooking,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          {formatDate(row.firstBooking)}
        </Typography>
      ),
    },
    {
      key: 'preferred',
      label: 'Listing préféré',
      visible: visibleColumns.preferred,
      render: (row: typeof CLIENTS_DATA.clients[0]) => (
        <Typography sx={{ fontSize: 12, color: t.text3 }}>
          {row.preferredListing}
        </Typography>
      ),
    },
  ];

  const visibleColumnsList = allColumns.filter((col) => col.visible);

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Clients']}>
      <PageHeader title="Base clients CRM" count={`${CLIENTS_DATA.stats.totalClients} clients`}>
        <Button sx={{ ...btnGhostSx, ...btnSmSx }}>📊 Export CSV</Button>
        <Button
          sx={{ ...btnGhostSx, ...btnSmSx }}
          onClick={() => {
            // Toggle all columns visibility
            const allVisible = Object.values(visibleColumns).every(v => v);
            setVisibleColumns({
              name: true,
              email: true,
              country: true,
              bookings: true,
              revenue: true,
              lastVisit: true,
              rating: true,
              vip: true,
              tags: true,
              avgPerStay: !allVisible,
              phone: !allVisible,
              firstBooking: !allVisible,
              preferred: !allVisible,
            });
          }}
        >
          🔧 Colonnes
        </Button>
        <Button sx={btnPrimarySx}>+ Ajouter client</Button>
      </PageHeader>

      {/* Stats */}
      <StatsRow>
        <StatCard
          icon="👥"
          iconBg={t.primaryTint}
          iconColor={t.primary}
          value={CLIENTS_DATA.stats.totalClients.toString()}
          label="Total clients"
          trend="+8 ce mois"
          trendUp
        />
        <StatCard
          icon="⭐"
          iconBg={t.successTint}
          iconColor={t.success}
          value={CLIENTS_DATA.stats.vipClients.toString()}
          label="Clients VIP"
          trend="+3"
          trendUp
        />
        <StatCard
          icon="💰"
          iconBg={t.infoTint}
          iconColor={t.info}
          value={formatCurrency(CLIENTS_DATA.stats.avgRevenue)}
          label="Revenu moyen"
          trend="+12%"
          trendUp
        />
        <StatCard
          icon="⭐"
          iconBg={t.aiTint}
          iconColor={t.ai}
          value={CLIENTS_DATA.stats.avgRating.toFixed(2)}
          label="Note moyenne"
        />
      </StatsRow>

      {/* Search */}
      <Box sx={{ mb: 2 }}>
        <TextField
          placeholder="Rechercher par nom ou email..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Box sx={{ fontSize: 16 }}>🔍</Box>
              </InputAdornment>
            ),
          }}
          sx={{
            width: { xs: '100%', md: 400 },
            '& .MuiOutlinedInput-root': {
              fontSize: 13,
              bgcolor: t.bg1,
              borderRadius: '8px',
              '& fieldset': { borderColor: t.border },
              '&:hover fieldset': { borderColor: t.borderStrong },
            },
          }}
        />
      </Box>

      {/* Filters */}
      <FilterBar>
        {/* Country filter */}
        <FilterChip
          label="Tous pays"
          active={selectedCountry === 'all'}
          onClick={() => setSelectedCountry('all')}
          dropdown
        />
        {CLIENTS_DATA.countries.slice(0, 5).map((country) => (
          <FilterChip
            key={country.code}
            label={`${country.flag} ${country.name}`}
            active={selectedCountry === country.code}
            onClick={() => setSelectedCountry(country.code)}
          />
        ))}

        <Box sx={{ width: 1, height: 20, bgcolor: t.border, mx: 0.5 }} />

        {/* Bookings filter */}
        <FilterChip
          label="Tous séjours"
          active={selectedBookings === 'all'}
          onClick={() => setSelectedBookings('all')}
        />
        <FilterChip label="1 séjour" active={selectedBookings === '1'} onClick={() => setSelectedBookings('1')} />
        <FilterChip label="2-5 séjours" active={selectedBookings === '2-5'} onClick={() => setSelectedBookings('2-5')} />
        <FilterChip label="6+ séjours" active={selectedBookings === '6+'} onClick={() => setSelectedBookings('6+')} />

        <Box sx={{ width: 1, height: 20, bgcolor: t.border, mx: 0.5 }} />

        {/* VIP filter */}
        <FilterChip
          label="Tous statuts"
          active={selectedVip === 'all'}
          onClick={() => setSelectedVip('all')}
        />
        <FilterChip label="VIP" active={selectedVip === 'vip'} onClick={() => setSelectedVip('vip')} />
        <FilterChip label="Standard" active={selectedVip === 'standard'} onClick={() => setSelectedVip('standard')} />

        <Box sx={{ width: 1, height: 20, bgcolor: t.border, mx: 0.5 }} />

        {/* Tag filter */}
        <FilterChip
          label="Tous tags"
          active={selectedTag === 'all'}
          onClick={() => setSelectedTag('all')}
        />
        {CLIENTS_DATA.tags.map((tag) => (
          <FilterChip
            key={tag}
            label={tag}
            active={selectedTag === tag}
            onClick={() => setSelectedTag(tag)}
          />
        ))}
      </FilterBar>

      {/* Data Table */}
      <DataTable
        columns={visibleColumnsList}
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

      {/* Column selector help */}
      <Box sx={{ mt: 2, p: 2, bgcolor: t.bg2, borderRadius: '8px', border: `1px solid ${t.border}` }}>
        <Typography sx={{ fontSize: 12, color: t.text3, mb: 1 }}>
          💡 <strong>Astuce :</strong> Utilisez le bouton "Colonnes" pour afficher/masquer les colonnes suivantes :
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: t.text4 }}>
          • Moyenne/séjour • Téléphone • 1ère résa • Listing préféré
        </Typography>
      </Box>
    </DashboardWrapper>
  );
}
