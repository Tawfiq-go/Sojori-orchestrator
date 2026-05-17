import React, { useState, useEffect } from 'react';
import { CircularProgress, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import EditOffIcon from '@mui/icons-material/EditOff';
import { toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import WorkIcon from '@mui/icons-material/Work';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CreateWorkerSidebar from './CreateWorkerDialog';
import UpdateWorkerSidebar from './UpdateWorkerDialog';
import TableLoading from 'components/TableLoading/TableLoadign';
import axios from 'axios';
import { getWorkers } from '../services/serverApi.task';
import { getListingsTa } from 'features/tasks/services/serverApi.task';
import { Chip, Stack, IconButton, Popover, Tooltip, Avatar, Box } from '@mui/material';
import { RemoveRedEye } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { ToastContainer } from 'react-toastify';
import RoleBasedRenderer from 'components/wrappers/RoleBasedRenderer';
import { useSelector } from 'react-redux';
import { hasAdminAccess, ROLES } from 'utils/rbac.utils';
import { useTranslation } from 'react-i18next';
import GlobalPagination from 'components/GlobalPagination/GlobalPagination';
import WorkerFilters from './WorkerFilters';
import { can } from '../../../utils/permissions';
const ALL_MODULES = {
  PMS: {
    label: 'PMS',
    price: 100
  },
  WhGuest: {
    label: 'WhatsApp Guest',
    price: 100
  },
  WhStaff: {
    label: 'WhatsApp Staff',
    price: 100
  },
  WhPMS: {
    label: 'WhatsApp PMS',
    price: 100
  },
  RMS: {
    label: 'Dynamic Pricing',
    price: 100
  },
  MessageAndReview: {
    label: 'Message & Review',
    price: 100
  }
};
const PublicWorker = () => {
  const {
    t
  } = useTranslation('common');
  const navigate = useNavigate();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState('false');
  const [bannedFilter, setBannedFilter] = useState('false');
  const [statusAnchorEl, setStatusAnchorEl] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [permissionsAnchorEl, setPermissionsAnchorEl] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [listings, setListings] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);

  // Permission checks
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  useEffect(() => {
    fetchWorkers();
    fetchListings();
  }, [page, limit, deletedFilter, bannedFilter, searchText, selectedListings]);
  const fetchWorkers = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        deleted: deletedFilter === 'true',
        banned: bannedFilter === 'true',
        search_text: searchText,
        workerTypeOwner: true
      };

      // Add listing filter if provided
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      const response = await getWorkers(params);
      if (response && response.data) {
        setWorkers(response.data);
        const total = response.total || 0;
        setTotalCount(total);
        setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
      } else {
        setWorkers([]);
        setTotalCount(0);
        setIsNextDisabled(true);
      }
    } catch (error) {
      setWorkers([]);
      setTotalCount(0);
      setIsNextDisabled(true);
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
      subscriptionModules: updatedWorker.subscriptionModules,
      permissions: updatedWorker.permissions
    } : worker));
    toast.success(t('Worker updated successfully'));
    // Removed setSelectedWorker(null) and setOpenUpdateDialog(false) as onClose handles it
  };
  const handleUpdate = worker => {
    if (!canUpdate) return;
    navigate(`/admin/User/edit-user/${worker._id}`);
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const handleStatusClick = (event, rowData) => {
    setStatusAnchorEl(event.currentTarget);
    setSelectedStatus(rowData);
  };
  const handleStatusClose = () => {
    setStatusAnchorEl(null);
    setSelectedStatus(null);
  };
  const handlePermissionsClick = (event, rowData) => {
    setPermissionsAnchorEl(event.currentTarget);
    setSelectedPermissions(rowData);
  };
  const handlePermissionsClose = () => {
    setPermissionsAnchorEl(null);
    setSelectedPermissions(null);
  };
  const handleFilterChange = (key, value) => {
    setPage(0); // Reset to first page when filters change
  };
  const handleSearch = () => {
    // Implement search logic using the filter states
    fetchWorkers();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setPage(0);
  };
  const baseColumns = [{
    field: 'firstName',
    header: t('First Name'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="font-medium">{rowData.firstName}</div>,
    sortable: false
  }, {
    field: 'lastName',
    header: t('Last Name'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div>{rowData.lastName}</div>,
    sortable: false
  }, {
    field: 'email',
    header: t('Email'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div>{rowData.email}</div>,
    sortable: false
  }, {
    field: 'phone',
    header: t('Phone'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div>{rowData.phone}</div>,
    sortable: false
  }, {
    field: 'whatsapp',
    header: t('WhatsApp'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div>{rowData.whatsapp || '-'}</div>,
    sortable: false
  }];
  const ownerColumn = {
    field: 'owner',
    header: t('Owner'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      if (!rowData.owner) return <div className="text-gray-400">-</div>;
      return <div className="flex items-center">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {rowData.owner?.firstName} {rowData.owner?.lastName}
            </span>
            {rowData.owner?.email && <span className="text-xs text-gray-500">
                {rowData.owner.email}
              </span>}
          </div>
        </div>;
    },
    sortable: false
  };
  const remainingColumns = [
  // {
  //   field: 'permissions',
  //   header: t('Permissions'),
  //   body: (rowData) => (
  //     <div className="flex items-center">
  //       {rowData.permissions?.length > 0 ? (
  //         <div className="flex flex-wrap gap-1 items-center">
  //           <div className="flex -space-x-1">
  //             {rowData.permissions.slice(0, 2).map((perm, index) => (
  //               <Avatar
  //                 key={perm._id || index}
  //                 sx={{
  //                   width: 24,
  //                   height: 24,
  //                   fontSize: '0.75rem',
  //                   bgcolor: 'rgba(0, 180, 180, 0.1)',
  //                   color: '#00b4b4',
  //                   fontWeight: 600,
  //                   border: '1px solid rgba(0, 180, 180, 0.2)',
  //                 }}
  //               >
  //                 {perm.module?.charAt(0)}
  //               </Avatar>
  //             ))}
  //           </div>

  //           {rowData.permissions.length > 2 && (
  //             <Typography
  //               variant="caption"
  //               className="text-gray-500 font-medium ml-1"
  //             >
  //               +{rowData.permissions.length - 2} more
  //             </Typography>
  //           )}

  //           <IconButton
  //             size="small"
  //             onClick={(e) => handlePermissionsClick(e, rowData)}
  //             className="!text-medium-aquamarine ml-1"
  //           >
  //             <RemoveRedEye fontSize="small" />
  //           </IconButton>
  //         </div>
  //       ) : (
  //         <span className="text-gray-400 text-sm">{t('No permissions')}</span>
  //       )}
  //     </div>
  //   ),
  //   sortable: false,
  // },
  {
    field: 'status',
    header: t('Status'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="flex items-center">
          <IconButton size="small" onClick={e => handleStatusClick(e, rowData)} className="!text-medium-aquamarine">
            <RemoveRedEye fontSize="small" />
          </IconButton>
        </div>,
    sortable: false
  }, ...(canUpdate ? [{
    field: 'action',
    header: t('Action'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleUpdate(rowData)}>
                <EditOffIcon className="text-white" />
              </button>,
    sortable: false
  }] : [])];
  const columns = isAdmin ? [...baseColumns, ownerColumn, ...remainingColumns] : [...baseColumns, ...remainingColumns];
  return <div className="card p-4">
      <ToastContainer position="top-right" autoClose={3000} />

      <WorkerFilters searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} onSearch={handleSearch} onReset={handleReset} onFilterChange={handleFilterChange} onOpenSidebar={canCreate ? () => setOpenCreateDialog(true) : null} canCreate={canCreate} />

      {totalCount > 0 && <GlobalPagination currentPage={page} totalItems={totalCount} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={setLimit} itemsPerPageOptions={[5, 10, 20, 50]} showItemsPerPage={true} showTotalInfo={true} itemType="staff" />}

      <div className="bg-white">
        {loading ? <div className="flex items-center justify-center h-64">
            <CircularProgress sx={{
          color: '#00b4b4'
        }} />
          </div> : <GlobalTable data={workers} columns={columns} page={page} hasPagination={false} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 20, 50]} totalCount={totalCount} />}
      </div>

      <CreateWorkerSidebar open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} onWorkerCreated={onWorkerCreated} />

      {selectedWorker && <UpdateWorkerSidebar key={selectedWorker?._id} open={openUpdateDialog} onClose={() => {
      setOpenUpdateDialog(false);
      setSelectedWorker(null);
    }} worker={selectedWorker} onWorkerUpdated={onWorkerUpdated} />}

      <Popover open={Boolean(statusAnchorEl)} anchorEl={statusAnchorEl} onClose={handleStatusClose} anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'left'
    }} transformOrigin={{
      vertical: 'top',
      horizontal: 'left'
    }}>
        {selectedStatus && <div className="p-4 space-y-2 !bg-white">
            <Stack direction="column" spacing={1}>
              <Chip size="small" label={selectedStatus.status} color={selectedStatus.status === 'active' ? 'success' : 'default'} variant="outlined" />
              <Chip size="small" label={selectedStatus.banned ? t('Banned') : t('Not Banned')} color={selectedStatus.banned ? 'error' : 'success'} variant="outlined" />
              <Chip size="small" label={selectedStatus.deleted ? t('Deleted') : t('Not Deleted')} color={selectedStatus.deleted ? 'default' : 'success'} variant="outlined" />
            </Stack>
          </div>}
      </Popover>

      <Popover open={Boolean(permissionsAnchorEl)} anchorEl={permissionsAnchorEl} onClose={handlePermissionsClose} anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'left'
    }} transformOrigin={{
      vertical: 'top',
      horizontal: 'left'
    }} PaperProps={{
      sx: {
        p: 2,
        minWidth: 250,
        maxWidth: 320,
        boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        borderRadius: '8px',
        background: 'white'
      }
    }}>
        {selectedPermissions && <div>
            <Typography variant="subtitle2" className="!text-gray-700 !font-semibold !mb-2">
              {selectedPermissions.firstName} {t('Permissions')}
            </Typography>

            {selectedPermissions.permissions?.length > 0 ? <Stack direction="row" spacing={1} sx={{
          flexWrap: 'wrap',
          gap: '8px !important',
          mt: 1
        }}>
                {selectedPermissions.permissions.map(perm => <Box key={perm._id} sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: 'white',
            borderRadius: '8px',
            py: 0.75,
            px: 1.5,
            transition: 'all 0.2s ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
            border: '1px solid rgba(0, 180, 180, 0.15)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 8px rgba(0,180,180,0.1)'
            }
          }}>
                    <Avatar sx={{
              width: 20,
              height: 20,
              fontSize: '0.75rem',
              bgcolor: 'rgba(0, 180, 180, 0.1)',
              color: '#00b4b4',
              fontWeight: 600
            }}>
                      {perm.module?.charAt(0)}
                    </Avatar>
                    <Typography sx={{
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#2d3748',
              textTransform: 'capitalize'
            }}>
                      {perm.module}
                    </Typography>

                    {perm.actions?.length > 0 && <Box sx={{
              position: 'absolute',
              width: 3,
              height: 3,
              borderRadius: '50%',
              backgroundColor: '#00b4b4',
              right: 6,
              top: 6
            }} />}
                  </Box>)}
              </Stack> : <Typography className="text-sm text-gray-500">
                {t('No permissions assigned')}
              </Typography>}

            {selectedPermissions.permissions?.length > 0 && <div className="mt-3">
                <Typography variant="caption" className="text-gray-500 italic">
                  {t('Click on a permission to see its details')}
                </Typography>
              </div>}
          </div>}
      </Popover>
    </div>;
};
export default PublicWorker;
