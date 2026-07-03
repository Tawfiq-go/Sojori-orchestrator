import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingBagOutlined from '@mui/icons-material/ShoppingBagOutlined';
import moment from 'moment';
import 'moment/locale/fr';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { TeamHubListTable } from '../components/team/TeamHubListTable';
import { TeamHubPagination } from '../components/team/TeamHubPagination';
import { TEAM_T } from '../components/team/teamHubTokens';
import { useAuth } from '../hooks/useAuth';
import bookingClientsService, {
  bookingClientAuthMeta,
  bookingClientDisplayName,
  bookingClientEmail,
  bookingClientEnvMeta,
  bookingClientPhone,
} from '../services/bookingClientsService';
import type {
  BookingClientEnvironmentFilter,
  BookingClientRecord,
  BookingClientStatusFilter,
} from '../types/bookingClients.types';

moment.locale('fr');

function statusMeta(row: BookingClientRecord) {
  if (row.banned) return { label: 'Banni', bg: 'rgba(200,30,30,0.10)', color: TEAM_T.error };
  if (row.deleted) return { label: 'Supprimé', bg: 'rgba(20,17,10,0.06)', color: TEAM_T.text3 };
  return { label: 'Actif', bg: 'rgba(10,143,94,0.12)', color: TEAM_T.success };
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function BookingClientsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'SuperAdmin';

  const [rows, setRows] = useState<BookingClientRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<BookingClientStatusFilter>('active');
  const [envFilter, setEnvFilter] = useState<BookingClientEnvironmentFilter>('all');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);
  const [selected, setSelected] = useState<BookingClientRecord | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const deleted = statusFilter === 'deleted';
      const banned = statusFilter === 'banned';
      const activeOnly = statusFilter === 'active';

      const response = await bookingClientsService.getList({
        page,
        limit,
        username: search,
        deleted: statusFilter === 'all' ? false : deleted,
        banned: statusFilter === 'all' ? false : banned,
        clerkEnvironment: envFilter,
      });

      let data = response.data;
      if (activeOnly) {
        data = data.filter((row) => !row.banned && !row.deleted);
      }

      setRows(data);
      setTotal(response.total);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (err as Error)?.message ||
        'Impossible de charger les comptes Sojori Booking';
      setError(message);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, envFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => !r.banned && !r.deleted).length;
    const banned = rows.filter((r) => r.banned).length;
    return { active, banned, pageTotal: rows.length };
  }, [rows]);

  const hubColumns = useMemo(
    () => [
      {
        key: 'guest',
        label: 'Voyageur',
        render: (row: BookingClientRecord) => {
          const name = bookingClientDisplayName(row);
          return (
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ width: 28, height: 28, bgcolor: TEAM_T.primary, fontSize: 11 }}>
                {initialsFromName(name)}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEAM_T.text }}>
                  {name}
                </Typography>
                {row.username ? (
                  <Typography sx={{ fontSize: 11, color: TEAM_T.text3 }}>@{row.username}</Typography>
                ) : null}
              </Box>
            </Stack>
          );
        },
      },
      {
        key: 'email',
        label: 'Email',
        render: (row: BookingClientRecord) => (
          <Typography sx={{ fontSize: 12.5, color: TEAM_T.text2 }}>
            {bookingClientEmail(row) || '—'}
          </Typography>
        ),
      },
      {
        key: 'env',
        label: 'Env',
        render: (row: BookingClientRecord) => {
          const meta = bookingClientEnvMeta(row);
          return (
            <Chip
              label={meta.label}
              size="small"
              sx={{
                bgcolor: meta.bg,
                color: meta.color,
                fontWeight: 700,
                height: 22,
                fontSize: 11,
              }}
            />
          );
        },
      },
      {
        key: 'auth',
        label: 'Connexion',
        render: (row: BookingClientRecord) => {
          const meta = bookingClientAuthMeta(row);
          return (
            <Chip
              label={meta.label}
              size="small"
              sx={{
                bgcolor: meta.bg,
                color: meta.color,
                fontWeight: 700,
                height: 22,
                fontSize: 11,
              }}
            />
          );
        },
      },
      {
        key: 'phone',
        label: 'Mobile',
        render: (row: BookingClientRecord) => {
          const phone = bookingClientPhone(row);
          if (!phone) return '—';
          const cc = row.phoneCountryCode?.trim();
          return cc && !phone.startsWith('+') ? `+${cc} ${phone}` : phone;
        },
      },
      {
        key: 'role',
        label: 'Rôle',
        render: (row: BookingClientRecord) => (
          <Chip
            label={String(row.public_metadata?.role ?? 'guest')}
            size="small"
            sx={{ fontWeight: 600, textTransform: 'capitalize', height: 22, fontSize: 11 }}
          />
        ),
      },
      {
        key: 'clerkId',
        label: 'Clerk ID',
        render: (row: BookingClientRecord) => (
          <Typography sx={{ fontSize: 11, color: TEAM_T.text3, fontFamily: 'monospace' }}>
            {row.clerkId ? `${row.clerkId.slice(0, 18)}…` : '—'}
          </Typography>
        ),
      },
      {
        key: 'createdAt',
        label: 'Inscription',
        render: (row: BookingClientRecord) =>
          row.createdAt ? moment(row.createdAt).format('DD MMM YYYY HH:mm') : '—',
      },
      {
        key: 'status',
        label: 'Statut',
        align: 'center' as const,
        render: (row: BookingClientRecord) => {
          const meta = statusMeta(row);
          return (
            <Chip
              label={meta.label}
              size="small"
              sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, height: 22, fontSize: 11 }}
            />
          );
        },
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'center' as const,
        render: (row: BookingClientRecord) => (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setSelected(row);
            }}
            sx={{
              bgcolor: TEAM_T.primary,
              color: '#fff',
              width: 28,
              height: 28,
              fontSize: 13,
              '&:hover': { bgcolor: TEAM_T.primaryDeep },
            }}
          >
            👁
          </IconButton>
        ),
      },
    ],
    [],
  );

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('active');
    setPage(0);
  };

  return (
    <DashboardWrapper breadcrumb={['Temp', 'Clients Sojori Booking']}>
      <Box sx={{ px: { xs: 1.5, md: 0 }, pb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
          <ShoppingBagOutlined sx={{ fontSize: 22, color: TEAM_T.primary, mt: 0.25 }} />
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16, color: TEAM_T.text }}>
              Comptes Sojori Booking
            </Typography>
            <Typography sx={{ fontSize: 12, color: TEAM_T.text3, mt: 0.25, maxWidth: 720 }}>
              Voyageurs Clerk (sojori-vente). <b>Prod</b> = sojori.com · <b>Dev</b> = localhost:6001.
              Même email peut exister deux fois (clerkId différent).
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75}>
            <Chip
              label={`${total} comptes`}
              size="small"
              sx={{
                bgcolor: TEAM_T.primaryTint,
                color: TEAM_T.primaryDeep,
                fontWeight: 700,
                fontSize: 11,
                height: 24,
              }}
            />
            <Chip
              label={`${stats.active} actifs`}
              size="small"
              sx={{
                bgcolor: 'rgba(10,143,94,0.10)',
                color: TEAM_T.success,
                fontWeight: 700,
                fontSize: 11,
                height: 24,
              }}
            />
          </Stack>
        </Box>

        <Paper
          sx={{
            p: 1.5,
            mb: 1.5,
            border: `1px solid ${TEAM_T.border}`,
            borderRadius: 1.5,
            bgcolor: TEAM_T.bg1,
          }}
        >
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }} useFlexGap>
            <TextField
              size="small"
              placeholder="Rechercher nom, email, username…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: TEAM_T.text3 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ flex: 1, minWidth: 200, maxWidth: 320 }}
            />
            <Select
              size="small"
              value={envFilter}
              onChange={(e) => {
                setEnvFilter(e.target.value as BookingClientEnvironmentFilter);
                setPage(0);
              }}
              sx={{ minWidth: 110, height: 36, fontSize: 12 }}
            >
              <MenuItem value="all">Tous env.</MenuItem>
              <MenuItem value="production">Prod</MenuItem>
              <MenuItem value="development">Dev</MenuItem>
            </Select>
            <Select
              size="small"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as BookingClientStatusFilter);
                setPage(0);
              }}
              sx={{ minWidth: 130, height: 36, fontSize: 12 }}
            >
              <MenuItem value="active">Actifs</MenuItem>
              <MenuItem value="banned">Bannis</MenuItem>
              <MenuItem value="deleted">Supprimés</MenuItem>
              <MenuItem value="all">Tous</MenuItem>
            </Select>
            <Tooltip title="Actualiser">
              <span>
                <IconButton size="small" onClick={fetchRows} sx={{ color: TEAM_T.text3 }}>
                  <RefreshIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Réinitialiser filtres">
              <span>
                <IconButton size="small" onClick={resetFilters} sx={{ color: TEAM_T.text3 }}>
                  ↺
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>

        {error ? (
          <Alert severity="error" sx={{ mb: 1.5 }}>
            {error}
          </Alert>
        ) : null}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: TEAM_T.primary }} />
          </Box>
        ) : (
          <TeamHubListTable
            rows={rows}
            columns={hubColumns}
            rowKey={(row) => String(row._id)}
            onRowClick={(row) => setSelected(row)}
            emptyLabel="Aucun compte Sojori Booking — les inscriptions Clerk apparaîtront ici après sync."
          />
        )}

        {!loading ? (
          <TeamHubPagination
            page={page}
            limit={limit}
            total={total}
            onPageChange={setPage}
            onLimitChange={setLimit}
            itemLabel="comptes"
          />
        ) : null}

        {isAdmin ? (
          <Typography sx={{ fontSize: 11, color: TEAM_T.text4, mt: 1.5 }}>
            API · GET /api/v1/user/user/booking-clients/get-clients
          </Typography>
        ) : null}
      </Box>

      <Drawer anchor="right" open={!!selected} onClose={() => setSelected(null)}>
        {selected ? (
          <Box sx={{ width: { xs: '100vw', sm: 420 }, p: 3 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, mb: 2, color: TEAM_T.text }}>
              {bookingClientDisplayName(selected)}
            </Typography>
            <Stack spacing={1.25}>
              {[
                ['Email', bookingClientEmail(selected) || '—'],
                ['Connexion', bookingClientAuthMeta(selected).label],
                ['Environnement', bookingClientEnvMeta(selected).label],
                [
                  'Mobile',
                  (() => {
                    const phone = bookingClientPhone(selected);
                    if (!phone) return '—';
                    const cc = selected.phoneCountryCode?.trim();
                    return cc && !phone.startsWith('+') ? `+${cc} ${phone}` : phone;
                  })(),
                ],
                ['Username', selected.username || '—'],
                ['Clerk ID', selected.clerkId],
                ['Rôle', String(selected.public_metadata?.role ?? 'guest')],
                [
                  'Inscription',
                  selected.createdAt ? moment(selected.createdAt).format('DD MMM YYYY HH:mm') : '—',
                ],
                ['Owners liés', selected.ownerIds?.length ? `${selected.ownerIds.length} owner(s)` : '—'],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography
                    sx={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: TEAM_T.text3,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography sx={{ fontSize: 13.5, color: TEAM_T.text, wordBreak: 'break-all' }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Drawer>
    </DashboardWrapper>
  );
}

export default BookingClientsPage;
