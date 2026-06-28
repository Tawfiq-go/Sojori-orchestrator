/**
 * Property managers (Owners) — vue Atelier · cartes / liste · filtres
 */
import React, { useMemo, useState } from 'react';
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
import ChipMultiSelect from 'components/ChipMultiSelect/ChipMultiSelect';
import {
  PageHeader,
  StatCard,
  FilterBar,
  FilterChip,
  btnPrimarySx,
  btnGhostSx,
  tokens as dashT,
} from '../dashboard/DashboardV2.components';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TeamHubMemberCard, TeamHubCardGrid } from './TeamHubMemberCard';
import { TeamHubListTable } from './TeamHubListTable';
import { TeamHubPagination } from './TeamHubPagination';
import { TEAM_T } from './teamHubTokens';

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
  onCreate,
  onEdit,
  onSync,
  syncLoading,
  canCreate,
  canUpdate,
  listingStatsByOwner,
  portfolioKpis,
}) {
  const { viewMode } = useTeamViewMode();
  const [inputValue, setInputValue] = useState(searchText || '');
  const [statusFilter, setStatusFilter] = useState(() => {
    if (deletedFilter === 'true' || deletedFilter === true) return 'deleted';
    if (bannedFilter === 'true' || bannedFilter === true) return 'banned';
    return 'active';
  });

  const applyStatusFilter = (key) => {
    setStatusFilter(key);
    setPage(0);
    if (key === 'active') {
      onDeletedChange('false');
      onBannedChange('false');
    } else if (key === 'banned') {
      onDeletedChange('false');
      onBannedChange('true');
    } else if (key === 'deleted') {
      onDeletedChange('true');
      onBannedChange('false');
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
              ),
            },
          ]
        : []),
    ],
    [canUpdate, listingStatsByOwner, onEdit, t],
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
      <PageHeader title="Comptes Owner" count={String(totalCount)}>
        {canCreate ? (
          <Button sx={btnPrimarySx} onClick={onCreate}>
            Nouveau PM
          </Button>
        ) : null}
      </PageHeader>

      <Typography sx={{ fontSize: 12.5, color: dashT.text3, mb: 2, maxWidth: 760 }}>
        Gestionnaires de parc Sojori : identité, channel manager RU/Channex, annonces rattachées.
        Réservé aux administrateurs plateforme.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
          gap: 1.25,
          mb: 2,
        }}
      >
        <StatCard icon="🏢" iconBg={dashT.primaryTint} iconColor={dashT.primaryDeep} value={String(totalCount)} label="PM" />
        <StatCard icon="🏠" iconBg={dashT.infoTint} iconColor={dashT.info} value={String(portfolioKpis?.listingsTotal ?? 0)} label="Annonces" />
        <StatCard icon="🔗" iconBg={dashT.successTint} iconColor={dashT.success} value={String(portfolioKpis?.listingsRu ?? 0)} label="RU" />
        <StatCard icon="📡" iconBg={dashT.aiTint} iconColor={dashT.ai} value={String(portfolioKpis?.listingsChannex ?? 0)} label="Channex" />
      </Box>

      <FilterBar>
        <FilterChip label="Actifs" active={statusFilter === 'active'} onClick={() => applyStatusFilter('active')} />
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
      ) : owners.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 6, border: `1px solid ${TEAM_T.border}`, bgcolor: TEAM_T.bg1 }}>
          <Typography sx={{ color: TEAM_T.text3 }}>{t('No owners found')}</Typography>
        </Paper>
      ) : viewMode === 'cards' ? (
        <TeamHubCardGrid>
          {owners.map((row) => {
            const st = listingStatsByOwner[String(row._id)] || { total: 0, ruLinked: 0, channexLinked: 0 };
            const inactive = row.banned || row.deleted;
            return (
              <TeamHubMemberCard
                key={row._id}
                initials={ownerInitials(row)}
                title={ownerName(row)}
                subtitle={row.email || '—'}
                badge={
                  row.channelManager === 'RU'
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
                onEdit={onEdit ? () => onEdit(row) : undefined}
              />
            );
          })}
        </TeamHubCardGrid>
      ) : (
        <TeamHubListTable
          rows={owners}
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
