/**
 * Workers (accès dashboard) — vue Atelier
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
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkIcon from '@mui/icons-material/Work';
import ChipMultiSelect from 'components/ChipMultiSelect/ChipMultiSelect';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TeamHubMemberCard, TeamHubCardGrid } from './TeamHubMemberCard';
import { TeamHubListTable } from './TeamHubListTable';
import { TeamHubPagination } from './TeamHubPagination';
import { TEAM_T } from './teamHubTokens';

function workerName(w) {
  return `${w.firstName || ''} ${w.lastName || ''}`.trim() || w.email || '—';
}

export function WorkersHubView({
  t,
  workers,
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
  canCreate,
  canUpdate,
  isAdmin,
}) {
  const { viewMode } = useTeamViewMode();
  const [inputValue, setInputValue] = useState(searchText || '');

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
        label: t('Name'),
        render: (row) => (
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: TEAM_T.text }}>
            {workerName(row)}
          </Typography>
        ),
      },
      { key: 'email', label: t('Email'), render: (row) => row.email || '—' },
      { key: 'phone', label: t('Phone'), render: (row) => row.phone || '—' },
      { key: 'wa', label: 'WhatsApp', render: (row) => row.whatsapp || '—' },
      ...(isAdmin
        ? [
            {
              key: 'owner',
              label: 'Owner',
              render: (row) =>
                row.owner
                  ? `${row.owner.firstName || ''} ${row.owner.lastName || ''}`.trim()
                  : '—',
            },
          ]
        : []),
      {
        key: 'perms',
        label: t('Permissions'),
        render: (row) =>
          row.permissions?.length
            ? row.permissions
                .slice(0, 3)
                .map((p) => p.module)
                .join(', ')
            : '—',
      },
      {
        key: 'status',
        label: t('Status'),
        align: 'center',
        render: (row) =>
          row.banned ? 'Banni' : row.deleted ? 'Supprimé' : 'Actif',
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
    [canUpdate, isAdmin, onEdit, t],
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
        <WorkIcon sx={{ fontSize: 22, color: TEAM_T.primary, mt: 0.25 }} />
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontWeight: 800, fontSize: 16, color: TEAM_T.text }}>
            Accès dashboard · Workers
          </Typography>
          <Typography sx={{ fontSize: 12, color: TEAM_T.text3, mt: 0.25, maxWidth: 720 }}>
            Comptes <b>Worker</b> invités sur le dashboard Sojori (modules réservations, tâches, etc.).
            Ce n&apos;est <b>pas</b> le staff terrain ménage/arrivée →{' '}
            <a href="/tasks/team" style={{ color: TEAM_T.primaryDeep, fontWeight: 700 }}>
              /tasks/team
            </a>
          </Typography>
        </Box>
        <Chip
          label={`${totalCount} workers`}
          size="small"
          sx={{
            bgcolor: TEAM_T.primaryTint,
            color: TEAM_T.primaryDeep,
            fontWeight: 700,
            fontSize: 11,
            height: 24,
          }}
        />
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
        <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
          <TextField
            size="small"
            placeholder={t('Search...')}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearchText(inputValue);
                setPage(0);
                onSearch?.();
              }
            }}
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
          <Select
            size="small"
            value={deletedFilter}
            onChange={(e) => {
              onDeletedChange(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 110, height: 36, fontSize: 12 }}
          >
            <MenuItem value="false">{t('Active')}</MenuItem>
            <MenuItem value="true">{t('Deleted')}</MenuItem>
          </Select>
          <Select
            size="small"
            value={bannedFilter}
            onChange={(e) => {
              onBannedChange(e.target.value);
              setPage(0);
            }}
            sx={{ minWidth: 110, height: 36, fontSize: 12 }}
          >
            <MenuItem value="false">{t('Not banned')}</MenuItem>
            <MenuItem value="true">{t('Banned')}</MenuItem>
          </Select>
          {canCreate ? (
            <Button
              variant="contained"
              size="small"
              onClick={onCreate}
              sx={{
                bgcolor: TEAM_T.primary,
                color: '#fff !important',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': { bgcolor: TEAM_T.primaryDeep },
              }}
            >
              {t('Invite Worker')}
            </Button>
          ) : null}
          <Tooltip title="Réinitialiser">
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  setInputValue('');
                  onReset?.();
                }}
                sx={{ color: TEAM_T.text3 }}
              >
                <RefreshIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: TEAM_T.primary }} />
        </Box>
      ) : workers.length === 0 ? (
        <Paper sx={{ textAlign: 'center', py: 6, border: `1px solid ${TEAM_T.border}`, bgcolor: TEAM_T.bg1 }}>
          <Typography sx={{ color: TEAM_T.text3 }}>{t('No workers found')}</Typography>
        </Paper>
      ) : viewMode === 'cards' ? (
        <TeamHubCardGrid>
          {workers.map((w) => (
            <TeamHubMemberCard
              key={w._id}
              initials={workerName(w).slice(0, 2).toUpperCase()}
              title={workerName(w)}
              subtitle={w.email || '—'}
              chips={(w.permissions || []).slice(0, 4).map((p) => p.module)}
              metaLines={[{ label: 'WA', value: w.whatsapp || '—' }]}
              inactive={w.banned || w.deleted}
              onEdit={canUpdate ? () => onEdit(w) : undefined}
            />
          ))}
        </TeamHubCardGrid>
      ) : (
        <TeamHubListTable
          rows={workers}
          columns={hubColumns}
          rowKey={(row) => String(row._id)}
          emptyLabel={t('No workers found')}
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
        itemLabel="workers"
      />
    </Box>
  );
}

export default WorkersHubView;
