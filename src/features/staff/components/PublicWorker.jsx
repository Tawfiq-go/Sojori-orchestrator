import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import WorkIcon from '@mui/icons-material/Work';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { hasAdminAccess } from 'utils/rbac.utils';
import { useTranslation } from 'react-i18next';
import { getWorkers } from '../services/serverApi.task';
import { getListingsTa } from 'features/tasks/services/serverApi.task';
import CreateWorkerSidebar from './CreateWorkerDialog';
import UpdateWorkerSidebar from './UpdateWorkerDialog';
import WorkerFilters from './WorkerFilters';
import { can } from '../../../utils/permissions';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { teamRolesContentPaperSx, teamRolesTableHeaderCellSx, teamRolesTableHeaderCellSxCenter } from '../teamRolesLayout';
import { useTeamViewMode } from '../../../context/TeamViewContext';
import { WorkersHubView } from '../../../components/team/WorkersHubView';
import { TEAM_T } from '../../../components/team/teamHubTokens';
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    600: '#757575',
    700: '#616161'
  }
};
const PublicWorker = ({
  workerTypeOwner = false,
  hidePageHeader = false,
  embedded = false,
  onWorkersTotalChange
}) => {
  const {
    t
  } = useTranslation('common');
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [bannedFilter, setBannedFilter] = useState('false');
  const [searchText, setSearchText] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const {
    user
  } = useSelector(state => state.auth);
  const { requestOwnerId: filterOwnerId } = useAdminOwnerFilter();
  const isAdmin = user && hasAdminAccess(user.role);
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  useEffect(() => {
    fetchListings();
  }, [workerTypeOwner]);
  useEffect(() => {
    fetchWorkers();
  }, [page, limit, deletedFilter, bannedFilter, searchText, selectedListings, workerTypeOwner, filterOwnerId]);
  useEffect(() => {
    onWorkersTotalChange?.(totalCount);
  }, [totalCount, onWorkersTotalChange]);
  const { setTeamStats } = useTeamViewMode();
  useEffect(() => {
    if (!embedded) return;
    setTeamStats([
      { icon: '🔐', label: 'Workers', value: String(totalCount), iconColor: TEAM_T.primaryDeep },
    ]);
  }, [embedded, totalCount, setTeamStats]);
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        deleted: deletedFilter === 'true',
        banned: bannedFilter === 'true',
        search_text: searchText,
        workerTypeOwner: workerTypeOwner
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      if (filterOwnerId) {
        params.ownerId = filterOwnerId;
      }
      const response = await getWorkers(params);
      if (response && response.data) {
        setWorkers(response.data);
        const total = response.total || 0;
        setTotalCount(total);
      } else {
        setWorkers([]);
        setTotalCount(0);
      }
    } catch (error) {
      setWorkers([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };
  const fetchListings = async () => {
    try {
      const response = await getListingsTa();
      setListings(response);
    } catch (error) {}
  };
  const onWorkerCreated = async newWorker => {
    toast.success(t('Worker invited successfully'));
    await fetchWorkers();
    setOpenCreateDialog(false);
  };
  const onWorkerUpdated = updatedWorker => {
    setWorkers(prevWorkers => prevWorkers.map(worker => worker._id === updatedWorker._id ? {
      ...worker,
      ...updatedWorker,
      permissions: updatedWorker.permissions
    } : worker));
    toast.success(t('Worker updated successfully'));
  };
  const handleUpdate = worker => {
    if (!canUpdate) return;
    navigate(`/admin/User/edit-user/${worker._id}`);
  };
  const handleFilterChange = (key, value) => {
    setPage(0);
  };
  const handleSearch = () => {
    fetchWorkers();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setPage(0);
  };
  return <Box sx={{
    width: '100%',
    px: embedded ? 0 : { xs: 0, sm: 0.5 },
    pt: hidePageHeader || embedded ? 0 : 1,
    pb: embedded ? 0 : 1
  }}>
      <ToastContainer position="top-right" autoClose={3000} />

      {embedded ? (
        <WorkersHubView
          t={t}
          workers={workers}
          loading={loading}
          totalCount={totalCount}
          page={page}
          limit={limit}
          setPage={setPage}
          setLimit={setLimit}
          searchText={searchText}
          setSearchText={setSearchText}
          listings={listings}
          selectedListings={selectedListings}
          setSelectedListings={setSelectedListings}
          deletedFilter={deletedFilter}
          bannedFilter={bannedFilter}
          onDeletedChange={setDeletedFilter}
          onBannedChange={setBannedFilter}
          onSearch={handleSearch}
          onReset={handleReset}
          onFilterChange={handleFilterChange}
          onCreate={() => setOpenCreateDialog(true)}
          onEdit={handleUpdate}
          canCreate={canCreate}
          canUpdate={canUpdate}
          isAdmin={isAdmin}
        />
      ) : (
      <>
      {!hidePageHeader && <Box sx={{
      mb: 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 1.5
    }}>
          <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
            <WorkIcon sx={{
          fontSize: '24px',
          color: SOJORI_COLORS.primary
        }} />
            <Typography variant="h5" fontWeight="bold" sx={{
          fontSize: '18px'
        }}>
              {workerTypeOwner ? 'Owner Workers' : 'Workers'}
            </Typography>
            <Chip label={`${totalCount} ${totalCount === 1 ? 'worker' : 'workers'}`} size="small" sx={{
          bgcolor: SOJORI_COLORS.primary,
          color: 'white !important',
          fontWeight: 700,
          fontSize: '11px',
          height: '22px'
        }} />
          </Box>
        </Box>}

      {/* Filters */}
      <WorkerFilters compact={hidePageHeader} searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} onSearch={handleSearch} onReset={handleReset} onFilterChange={handleFilterChange} onOpenSidebar={canCreate ? () => setOpenCreateDialog(true) : null} canCreate={canCreate} workerTypeOwner={workerTypeOwner} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 20, 50]} loading={loading} />

      {/* Table — en-têtes alignés sur Admin WhatsApp / GlobalTable dense */}
      <TableContainer component={Paper} elevation={0} sx={hidePageHeader ? {
      mt: 1,
      overflow: 'auto',
      borderRadius: 1,
      border: '1px solid rgba(15,23,42,0.06)',
      boxShadow: '0 1px 0 rgba(15,23,42,0.04)'
    } : {
      ...teamRolesContentPaperSx,
      mt: 2,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
        {loading ? <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 300
      }}>
            <CircularProgress sx={{
          color: SOJORI_COLORS.primary
        }} />
          </Box> : <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={teamRolesTableHeaderCellSx}>{t('First Name').toUpperCase()}</TableCell>
                <TableCell sx={teamRolesTableHeaderCellSx}>{t('Last Name').toUpperCase()}</TableCell>
                <TableCell sx={teamRolesTableHeaderCellSx}>{t('Email').toUpperCase()}</TableCell>
                <TableCell sx={teamRolesTableHeaderCellSx}>{t('Phone').toUpperCase()}</TableCell>
                <TableCell sx={teamRolesTableHeaderCellSx}>WHATSAPP</TableCell>
                {isAdmin && <TableCell sx={teamRolesTableHeaderCellSx}>OWNER</TableCell>}
                <TableCell sx={teamRolesTableHeaderCellSx}>PERMISSIONS</TableCell>
                <TableCell sx={teamRolesTableHeaderCellSxCenter}>{t('Status').toUpperCase()}</TableCell>
                {canUpdate && <TableCell sx={teamRolesTableHeaderCellSxCenter}>{t('Action').toUpperCase()}</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {workers.length === 0 ? <TableRow>
                  <TableCell colSpan={isAdmin ? canUpdate ? 9 : 8 : canUpdate ? 8 : 7} align="center" sx={{
              p: 4
            }}>
                    <Typography sx={{
                color: SOJORI_COLORS.gray[600],
                fontSize: '14px'
              }}>
                      {t('No workers found')}
                    </Typography>
                  </TableCell>
                </TableRow> : workers.map(worker => <TableRow key={worker._id} sx={{
            '&:hover': {
              bgcolor: SOJORI_COLORS.gray[50]
            },
            transition: 'background-color 0.2s'
          }}>
                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>{worker.firstName || '-'}</TableCell>
                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>{worker.lastName || '-'}</TableCell>
                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>{worker.email || '-'}</TableCell>
                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>{worker.phone || '-'}</TableCell>
                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>{worker.whatsapp || '-'}</TableCell>

                    {isAdmin && <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>
                        {worker.owner ? <Box>
                            <Typography sx={{
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                              {worker.owner.firstName} {worker.owner.lastName}
                            </Typography>
                            {worker.owner.email && <Typography sx={{
                  fontSize: '10px',
                  color: SOJORI_COLORS.gray[600]
                }}>
                                {worker.owner.email}
                              </Typography>}
                          </Box> : '-'}
                      </TableCell>}

                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>
                      {worker.permissions && worker.permissions.length > 0 ? <Box sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap'
              }}>
                          {worker.permissions.slice(0, 3).map((perm, idx) => <Chip key={idx} label={perm.module} size="small" sx={{
                  height: '20px',
                  fontSize: '10px',
                  bgcolor: 'rgba(255, 107, 53, 0.1)',
                  color: SOJORI_COLORS.primary,
                  fontWeight: 600
                }} />)}
                          {worker.permissions.length > 3 && <Chip label={`+${worker.permissions.length - 3}`} size="small" sx={{
                  height: '20px',
                  fontSize: '10px',
                  bgcolor: SOJORI_COLORS.gray[200]
                }} />}
                        </Box> : <Typography sx={{
                fontSize: '11px',
                color: SOJORI_COLORS.gray[600]
              }}>-</Typography>}
                    </TableCell>

                    <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>
                      <Box sx={{
                display: 'flex',
                gap: 0.5,
                flexWrap: 'wrap'
              }}>
                        {worker.banned && <Chip label="Banned" size="small" sx={{
                  height: '20px',
                  fontSize: '10px',
                  bgcolor: '#fee',
                  color: '#c00',
                  fontWeight: 600
                }} />}
                        {worker.deleted && <Chip label="Deleted" size="small" sx={{
                  height: '20px',
                  fontSize: '10px',
                  bgcolor: SOJORI_COLORS.gray[200],
                  color: SOJORI_COLORS.gray[700],
                  fontWeight: 600
                }} />}
                        {!worker.banned && !worker.deleted && <Chip label="Active" size="small" sx={{
                  height: '20px',
                  fontSize: '10px',
                  bgcolor: '#e6f7e6',
                  color: '#2d8631',
                  fontWeight: 600
                }} />}
                      </Box>
                    </TableCell>

                    {canUpdate && <TableCell sx={{
              fontSize: '12px',
              p: 1.5
            }}>
                        <Button variant="contained" size="small" onClick={() => handleUpdate(worker)} sx={{
                textTransform: 'none',
                fontSize: '11px',
                bgcolor: SOJORI_COLORS.primary,
                color: 'white !important',
                '&:hover': {
                  bgcolor: SOJORI_COLORS.primaryDark
                },
                minWidth: 'auto',
                px: 1.5,
                py: 0.5
              }} startIcon={<EditIcon sx={{
                fontSize: '14px !important'
              }} />}>
                          {t('Edit')}
                        </Button>
                      </TableCell>}
                  </TableRow>)}
            </TableBody>
          </Table>}
      </TableContainer>
      </>
      )}

      {/* Create Worker Sidebar */}
      <CreateWorkerSidebar open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} onWorkerCreated={onWorkerCreated} />
    </Box>;
};
export default PublicWorker;
