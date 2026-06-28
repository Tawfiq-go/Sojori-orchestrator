/**
 * Workers (accès dashboard) — design aligné /tasks/team
 */
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonAddAlt1OutlinedIcon from '@mui/icons-material/PersonAddAlt1Outlined';
import {
  PageHeader,
  StatCard,
  FilterChip,
  btnPrimarySx,
  btnGhostSx,
  tokens as t,
} from '../dashboard/DashboardV2.components';
import { useTeamViewMode } from '../../context/TeamViewContext';
import { TeamHubPagination } from './TeamHubPagination';
import { WorkerRouteAccessMatrix } from './WorkerRouteAccessMatrix';
import { summarizeWorkerRouteAccess, buildOwnerRouteRows } from '../../utils/ownerRoutePermissions';

const AVAS = {
  TA: 'linear-gradient(135deg,#E6B022,#B8881A)',
  YK: 'linear-gradient(135deg,#5B9BD5,#3b6ea8)',
  HM: 'linear-gradient(135deg,#93C47D,#5a8f42)',
};

function workerName(w) {
  return `${w.firstName || ''} ${w.lastName || ''}`.trim() || w.email || '—';
}

function workerInitials(w) {
  const n = workerName(w);
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function workerStatus(w) {
  if (w.banned) return { key: 'banned', label: 'Banni', color: t.error };
  if (w.deleted) return { key: 'deleted', label: 'Supprimé', color: t.text3 };
  return { key: 'active', label: 'Actif', color: t.success };
}

function WorkerDashboardCard({ worker, onEdit, canUpdate }) {
  const status = workerStatus(worker);
  const initials = workerInitials(worker);
  const summary = useMemo(() => summarizeWorkerRouteAccess(worker), [worker]);

  return (
    <Box
      sx={{
        bgcolor: t.bg1,
        border: `1px solid ${t.border}`,
        borderRadius: '12px',
        p: 2,
        transition: 'all 0.15s',
        '&:hover': {
          boxShadow: '0 8px 20px rgba(26,20,8,0.08)',
          borderColor: t.borderStrong,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Stack direction="row" spacing={1.375} sx={{ mb: 1.5, alignItems: 'center' }}>
        <Box sx={{ position: 'relative' }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: AVAS[initials] || 'linear-gradient(135deg,#D4A574,#B8881A)',
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {initials}
          </Box>
          <Box
            sx={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: status.key === 'active' ? t.success : t.text4,
              border: `2px solid ${t.bg1}`,
            }}
          />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.15 }}>{workerName(worker)}</Typography>
          <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.25 }}>{worker.email || '—'}</Typography>
          <Typography sx={{ fontSize: 11, color: t.text3, mt: 0.25 }}>
            {worker.phone || '—'}
            {worker.whatsapp ? ` · WA ${worker.whatsapp}` : ''}
          </Typography>
        </Box>
        {canUpdate ? (
          <IconButton
            size="small"
            onClick={() => onEdit(worker)}
            sx={{
              bgcolor: t.primaryTint,
              color: t.primaryDeep,
              '&:hover': { bgcolor: t.primary, color: '#fff' },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          py: 1.25,
          mb: 1.25,
          borderTop: `1px dashed ${t.border}`,
          borderBottom: `1px dashed ${t.border}`,
        }}
      >
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Geist Mono', color: t.success }}>
            {summary.readCount}
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: t.text3, textTransform: 'uppercase' }}>Lecture</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Geist Mono', color: t.primaryDeep }}>
            {summary.writeCount}
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: t.text3, textTransform: 'uppercase' }}>Écriture</Typography>
        </Box>
        <Box sx={{ textAlign: 'center' }}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, fontFamily: 'Geist Mono', color: status.color }}>
            {status.label}
          </Typography>
          <Typography sx={{ fontSize: 9.5, color: t.text3, textTransform: 'uppercase' }}>Statut</Typography>
        </Box>
      </Box>

      <WorkerRouteAccessMatrix worker={worker} compact />
    </Box>
  );
}

export function WorkersHubView({
  workers,
  loading,
  totalCount,
  page,
  limit,
  setPage,
  setLimit,
  searchText,
  setSearchText,
  deletedFilter,
  bannedFilter,
  onDeletedChange,
  onBannedChange,
  onSearch,
  onReset,
  onCreate,
  onEdit,
  canCreate,
  canUpdate,
  embedded = false,
}) {
  const { viewMode } = useTeamViewMode();
  const [inputValue, setInputValue] = useState(searchText || '');
  const [statusFilter, setStatusFilter] = useState('active');
  const routes = useMemo(() => buildOwnerRouteRows(), []);

  const stats = useMemo(() => {
    const active = workers.filter((w) => !w.banned && !w.deleted);
    const withRead = workers.filter((w) => summarizeWorkerRouteAccess(w, routes).readCount > 0);
    const fullWrite = workers.filter((w) => {
      const s = summarizeWorkerRouteAccess(w, routes);
      return s.adminAccess || s.writeCount >= s.total;
    });
    return {
      total: totalCount,
      active: active.length,
      withAccess: withRead.length,
      fullWrite: fullWrite.length,
    };
  }, [workers, totalCount, routes]);

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
    } else {
      onDeletedChange('false');
      onBannedChange('false');
    }
  };

  const handleSearch = () => {
    setSearchText(inputValue);
    setPage(0);
    onSearch?.();
  };

  const handleReset = () => {
    setInputValue('');
    setStatusFilter('active');
    onReset?.();
  };

  return (
    <Box>
      {!embedded ? (
        <>
          <PageHeader title="Accès dashboard" count={String(totalCount)}>
            {canCreate ? (
              <Button sx={btnPrimarySx} startIcon={<PersonAddAlt1OutlinedIcon />} onClick={onCreate}>
                Nouveau worker
              </Button>
            ) : null}
          </PageHeader>

          <Typography sx={{ fontSize: 12.5, color: t.text3, mb: 2, maxWidth: 720 }}>
            Collaborateurs invités sur votre espace Sojori. Chaque route du menu Owner est affichée avec
            accès lecture ou écriture. Pour le staff terrain (ménage, arrivées), voir{' '}
            <Box component="a" href="/tasks/team" sx={{ color: t.primaryDeep, fontWeight: 700 }}>
              Équipe terrain
            </Box>
            .
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
              gap: 1.25,
              mb: 2,
            }}
          >
            <StatCard icon="👥" iconBg={t.primaryTint} iconColor={t.primaryDeep} value={String(stats.total)} label="Workers" />
            <StatCard icon="✅" iconBg={t.successTint} iconColor={t.success} value={String(stats.active)} label="Actifs" />
            <StatCard icon="👁" iconBg={t.infoTint} iconColor={t.info} value={String(stats.withAccess)} label="Avec accès" />
            <StatCard icon="✏️" iconBg={t.aiTint} iconColor={t.ai} value={String(stats.fullWrite)} label="Écriture complète" />
          </Box>
        </>
      ) : null}

      <Stack
        direction="row"
        spacing={1}
        sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center', gap: embedded ? 0.75 : 1 }}
        useFlexGap
      >
        <FilterChip label="Actifs" active={statusFilter === 'active'} onClick={() => applyStatusFilter('active')} />
        <FilterChip label="Bannis" active={statusFilter === 'banned'} onClick={() => applyStatusFilter('banned')} />
        <FilterChip label="Supprimés" active={statusFilter === 'deleted'} onClick={() => applyStatusFilter('deleted')} />
        <TextField
          size="small"
          placeholder="Rechercher nom, email, téléphone…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: t.text3 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{
            flex: 1,
            minWidth: embedded ? 180 : 220,
            maxWidth: embedded ? 280 : 360,
            bgcolor: t.bg1,
            ml: embedded ? 0.5 : 0,
          }}
        />
        <Button sx={btnGhostSx} onClick={handleSearch}>
          Rechercher
        </Button>
        <Tooltip title="Réinitialiser">
          <IconButton size="small" onClick={handleReset} sx={{ color: t.text3 }}>
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
        {!embedded && canCreate ? (
          <Button
            sx={{ ...btnPrimarySx, ml: { xs: 0, sm: 'auto' } }}
            startIcon={<PersonAddAlt1OutlinedIcon />}
            onClick={onCreate}
          >
            Nouveau worker
          </Button>
        ) : null}
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: t.primary }} />
        </Box>
      ) : workers.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            border: `1px dashed ${t.border}`,
            borderRadius: 2,
            bgcolor: t.bg1,
          }}
        >
          <Typography sx={{ color: t.text3, mb: 1.5 }}>Aucun worker pour le moment</Typography>
          {!embedded && canCreate ? (
            <Button sx={btnPrimarySx} onClick={onCreate}>
              Nouveau worker
            </Button>
          ) : null}
        </Box>
      ) : viewMode === 'cards' ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 1.75,
          }}
        >
          {workers.map((w) => (
            <WorkerDashboardCard
              key={w._id}
              worker={w}
              onEdit={onEdit}
              canUpdate={canUpdate}
            />
          ))}
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {workers.map((w) => (
            <Box
              key={w._id}
              sx={{
                bgcolor: t.bg1,
                border: `1px solid ${t.border}`,
                borderRadius: 2,
                p: 1.5,
              }}
            >
              <Stack direction="row" sx={{ mb: 0.5, alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{workerName(w)}</Typography>
                  <Typography sx={{ fontSize: 11, color: t.text3 }}>
                    {w.email} · {w.phone || '—'}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={workerStatus(w).label}
                    sx={{
                      height: 22,
                      fontSize: 10,
                      fontWeight: 700,
                      bgcolor: t.bg2,
                    }}
                  />
                  {canUpdate ? (
                    <Button
                      size="small"
                      sx={btnGhostSx}
                      startIcon={<EditOutlinedIcon sx={{ fontSize: 14 }} />}
                      onClick={() => onEdit(w)}
                    >
                      Modifier
                    </Button>
                  ) : null}
                </Stack>
              </Stack>
              <WorkerRouteAccessMatrix worker={w} defaultExpanded />
            </Box>
          ))}
        </Box>
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
