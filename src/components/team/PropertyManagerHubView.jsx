/**
 * Property managers (Owners) — vue Atelier · cartes / liste · filtres
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import { Milestone } from 'lucide-react';
import ChipMultiSelect from 'components/ChipMultiSelect/ChipMultiSelect';
import {
  FilterBar,
  FilterChip,
  btnGhostSx,
} from '../dashboard/DashboardV2.components';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TeamHubMemberCard, TeamHubCardGrid } from './TeamHubMemberCard';
import { TeamHubListTable } from './TeamHubListTable';
import { TeamHubPagination } from './TeamHubPagination';
import { TEAM_T } from './teamHubTokens';
import { filterOwnersForPmTab } from '../../utils/ownerListFilters';

function ownerName(row) {
  const n = `${row.firstName || ''} ${row.lastName || ''}`.trim();
  return n || row.email || '—';
}

function ownerInitials(row) {
  const n = ownerName(row);
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

export function PropertyManagerHubView({
  t,
  owners,
  loading,
  totalCount,
  page,
  limit,
  setPage,
  setLimit,
  searchText,
  setSearchText,
  listings,
  selectedListings,
  setSelectedListings,
  deletedFilter,
  bannedFilter,
  onDeletedChange,
  onBannedChange,
  onSearch,
  onReset,
  onFilterChange,
  onEdit,
  onLifecycle,
  onSync,
  syncLoading,
  canUpdate,
  listingStatsByOwner,
  accountStatusFilter = 'live',
  onAccountStatusChange,
}) {
  const { viewMode } = useTeamViewMode();
  const [inputValue, setInputValue] = useState(searchText || '');
  const [statusFilter, setStatusFilter] = useState(() => {
    if (accountStatusFilter === 'inactive') return 'draft';
    if (deletedFilter === 'true' || deletedFilter === true) return 'deleted';
    if (bannedFilter === 'true' || bannedFilter === true) return 'banned';
    return 'active';
  });

  useEffect(() => {
    if (accountStatusFilter === 'inactive') {
      setStatusFilter('draft');
    } else if (deletedFilter === 'true' || deletedFilter === true) {
      setStatusFilter('deleted');
    } else if (bannedFilter === 'true' || bannedFilter === true) {
      setStatusFilter('banned');
    } else if (accountStatusFilter === 'live') {
      setStatusFilter('active');
    }
  }, [accountStatusFilter, deletedFilter, bannedFilter]);

  const applyStatusFilter = (key) => {
    console.log('[PM-list] tab click', {
      key,
      accountStatusFilter,
      ownersCount: owners?.length ?? 0,
    });
    setStatusFilter(key);
    setPage(0);
    if (key === 'active') {
      onDeletedChange('false');
      onBannedChange('false');
      onAccountStatusChange?.('live');
    } else if (key === 'draft') {
      onDeletedChange('false');
      onBannedChange('false');
      onAccountStatusChange?.('inactive');
    } else if (key === 'banned') {
      onDeletedChange('false');
      onBannedChange('true');
      onAccountStatusChange?.('live');
    } else if (key === 'deleted') {
      onDeletedChange('true');
      onBannedChange('false');
      onAccountStatusChange?.('live');
    }
  };

  const listingOptions = useMemo(
    () =>
      (listings || []).map((l) => ({
        id: String(l.id || l._id || l.name),
        name: l.name || '—',
      })),
    [listings],
  );

  /** Garde-fou si l’API ignore accountStatus ou duplique via fillCompany. */
  const displayOwners = useMemo(
    () =>
      filterOwnersForPmTab(owners, {
        accountStatus: accountStatusFilter,
        deleted: deletedFilter,
        banned: bannedFilter,
      }),
    [owners, accountStatusFilter, deletedFilter, bannedFilter],
  );

  const hubColumns = useMemo(
    () => [
      {
        key: 'name',
        label: t('Owner'),
        render: (row) => (
          <Box>
            <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEAM_T.text }}>
              {ownerName(row)}
            </Typography>
            <Typography sx={{ fontSize: 11, color: TEAM_T.text3 }} noWrap>
              {row.email || '—'}
            </Typography>
          </Box>
        ),
      },
      {
        key: 'phone',
        label: t('Phone'),
        render: (row) => row.phone || '—',
      },
      {
        key: 'status',
        label: t('Status'),
        render: (row) =>
          row.status === 'inactive' ? (
            <Chip label="Brouillon" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#f59e0b', color: '#fff' }} />
          ) : row.status === 'pending' ? (
            <Chip label="Invitation" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#6366f1', color: '#fff' }} />
          ) : (
            <Chip label="Actif" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#16a34a', color: '#fff' }} />
          ),
      },
      {
        key: 'channel',
        label: t('Channel'),
        render: (row) =>
          row.channelManager === 'Channex' ? (
            <Chip label="CX" size="small" sx={{ height: 20, fontSize: 10, bgcolor: '#2563eb', color: '#fff' }} />
          ) : row.channelManager === 'RU' ? (
            <Chip label="RU" size="small" sx={{ height: 20, fontSize: 10, bgcolor: TEAM_T.primary, color: '#fff' }} />
          ) : (
            '—'
          ),
      },
      {
        key: 'code',
        label: t('Code'),
        render: (row) => row.ownerCode || '—',
      },
      {
        key: 'listings',
        label: t('Listings'),
        render: (row) => {
          const st = listingStatsByOwner[String(row._id)] || { total: 0, ruLinked: 0, channexLinked: 0 };
          return `T ${st.total} · RU ${st.ruLinked} · CX ${st.channexLinked}`;
        },
      },
      ...(canUpdate
        ? [
            {
              key: 'actions',
              label: t('Action'),
              align: 'center',
              render: (row) => (
                <Stack direction="row" spacing={0.5} justifyContent="center">
                  {onLifecycle ? (
                    <Tooltip title="Suivi onboarding">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          onLifecycle(row);
                        }}
                        sx={{
                          width: 28,
                          height: 28,
                          border: '1px solid #E6B022',
                          color: '#B8881A',
                          '&:hover': { bgcolor: 'rgba(230,176,34,0.12)' },
                        }}
                      >
                        <Milestone size={14} />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(row);
                    }}
                    sx={{
                      bgcolor: TEAM_T.primary,
                      color: '#fff',
                      width: 28,
                      height: 28,
                      '&:hover': { bgcolor: TEAM_T.primaryDeep },
                    }}
                  >
                    ✏
                  </IconButton>
                </Stack>
              ),
            },
          ]
        : []),
    ],
    [canUpdate, listingStatsByOwner, onEdit, onLifecycle, t],
  );

  const handleSearchSubmit = () => {
    setSearchText(inputValue);
    setPage(0);
    onSearch?.();
  };

  const handleClear = () => {
    setInputValue('');
    onReset?.();
  };

  return (
    <Box>
      <FilterBar>
        <FilterChip label="Actifs" active={statusFilter === 'active'} onClick={() => applyStatusFilter('active')} />
        <FilterChip label="Brouillon" active={statusFilter === 'draft'} onClick={() => applyStatusFilter('draft')} />
        <FilterChip label="Bannis" active={statusFilter === 'banned'} onClick={() => applyStatusFilter('banned')} />
        <FilterChip label="Supprimés" active={statusFilter === 'deleted'} onClick={() => applyStatusFilter('deleted')} />
      </FilterBar>

      <Paper
        sx={{
          p: 1.5,
          mb: 1.5,
          mt: 1.5,
          border: `1px solid ${TEAM_T.border}`,
          borderRadius: 1.5,
          bgcolor: TEAM_T.bg1,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center', gap: 1 }} useFlexGap>
          <TextField
            size="small"
            placeholder={t('Search by name or email')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: TEAM_T.text3 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ flex: 1, minWidth: 180, maxWidth: 280 }}
          />
          <ChipMultiSelect
            options={listingOptions}
            selected={selectedListings}
            onChange={(ids) => {
              setSelectedListings(ids);
              onFilterChange?.('listings', ids);
              setPage(0);
            }}
            placeholder={t('Select Listings')}
            width="140px"
            t={t}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={syncLoading ? <CircularProgress size={14} /> : <SyncIcon />}
            disabled={syncLoading}
            onClick={onSync}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              borderColor: TEAM_T.primary,
              color: TEAM_T.primaryDeep,
            }}
          >
            Sync RU
          </Button>
          <Tooltip title="Réinitialiser les filtres">
            <span>
              <IconButton
                size="small"
                disabled={!inputValue?.trim() && !selectedListings?.length}
                onClick={handleClear}
                sx={{ color: TEAM_T.text3 }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Button size="small" onClick={handleSearchSubmit} sx={btnGhostSx}>
            {t('Search')}
          </Button>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: TEAM_T.primary }} />
        </Box>
      ) : displayOwners.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 6, border: `1px solid ${TEAM_T.border}`, bgcolor: TEAM_T.bg1 }}>
          <Typography sx={{ color: TEAM_T.text3 }}>
            {statusFilter === 'draft'
              ? 'Aucun brouillon — remplissez un PM et cliquez Enregistrer'
              : t('No owners found')}
          </Typography>
        </Paper>
      ) : viewMode === 'cards' ? (
        <TeamHubCardGrid>
          {displayOwners.map((row) => {
            const st = listingStatsByOwner[String(row._id)] || { total: 0, ruLinked: 0, channexLinked: 0 };
            const inactive = row.banned || row.deleted;
            return (
              <TeamHubMemberCard
                key={row._id}
                initials={ownerInitials(row)}
                title={ownerName(row)}
                subtitle={row.email || '—'}
                badge={
                  row.status === 'inactive'
                    ? 'Brouillon'
                    : row.status === 'pending'
                    ? 'Invitation'
                    : row.channelManager === 'RU'
                    ? 'RU'
                    : row.channelManager === 'Channex'
                      ? 'CX'
                      : row.ownerCode || undefined
                }
                chips={[
                  row.settings?.language?.toUpperCase() || '—',
                  row.settings?.currency || '—',
                ].filter(Boolean)}
                metaLines={[
                  { label: 'Tel', value: row.phone || '—' },
                  {
                    label: 'Annonces',
                    value: `T ${st.total} · RU ${st.ruLinked} · CX ${st.channexLinked}`,
                  },
                ]}
                inactive={inactive}
                onLifecycle={onLifecycle ? () => onLifecycle(row) : undefined}
                onEdit={onEdit ? () => onEdit(row) : undefined}
              />
            );
          })}
        </TeamHubCardGrid>
      ) : (
        <TeamHubListTable
          rows={displayOwners}
          columns={hubColumns}
          rowKey={(row) => String(row._id)}
          emptyLabel={t('No owners found')}
        />
      )}

      <TeamHubPagination
        page={page}
        limit={limit}
        total={totalCount}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n);
          setPage(0);
        }}
        limitOptions={[5, 10, 20, 50]}
        itemLabel="property managers"
      />
    </Box>
  );
}

export default PropertyManagerHubView;
