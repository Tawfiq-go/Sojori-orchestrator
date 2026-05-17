import React, { useState, useEffect } from 'react';
import { CircularProgress, Button } from '@mui/material';
import EditOffIcon from '@mui/icons-material/EditOff';
import { toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminFilter from './AdminFilter';
import CreateAdminV2Sidebar from './CreateAdminV2Sidebar';
import UpdateAdminV2Sidebar from './UpdateAdminV2Sidebar';
import TableLoading from 'components/TableLoading/TableLoadign';
import { getAdminsV2 } from '../services/serverApi.task';
import { getListingsTa } from 'features/tasks/services/serverApi.task';
import { Chip, Stack, IconButton, Popover } from '@mui/material';
import { RemoveRedEye } from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import { ToastContainer } from 'react-toastify';
import { useTranslation } from 'react-i18next';
// pagination displayed via GlobalPaginationCompact in AdminV2Filter
import AdminV2Filter from './AdminV2Filter';
import { can } from '../../../utils/permissions';
const PublicAdminV2 = () => {
  const {
    t
  } = useTranslation('common');
  const [admins, setAdmins] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [selectedListings, setSelectedListings] = useState([]);
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
  const [searchText, setSearchText] = useState('');

  // Permission checks
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  useEffect(() => {
    fetchAdmins();
    fetchListings(); // Add this to fetch listings on component mount
  }, [page, limit, deletedFilter, bannedFilter, searchText]);
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const response = await getAdminsV2({
        page,
        limit,
        deleted: deletedFilter === 'true',
        banned: bannedFilter === 'true',
        search_text: searchText
      });
      if (response && response.data) {
        setAdmins(response.data);
        const total = response.total || 0;
        setTotalCount(total);
        setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
      } else {
        setAdmins([]);
        setTotalCount(0);
        setIsNextDisabled(true);
      }
    } catch (error) {
      setAdmins([]);
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
  const onAdminCreated = async newAdmin => {
    toast.success(t('Admin created successfully'));
    await fetchAdmins();
  };
  const onAdminUpdated = updatedAdmin => {
    setAdmins(prevAdmins => prevAdmins.map(admin => admin._id === updatedAdmin._id ? {
      ...updatedAdmin,
      settings: updatedAdmin.settings,
      status: updatedAdmin.status,
      deleted: updatedAdmin.deleted,
      banned: updatedAdmin.banned,
      role: updatedAdmin.role,
      ownerCode: updatedAdmin.ownerCode,
      permissions: updatedAdmin.permissions,
      subscriptionModules: updatedAdmin.subscriptionModules,
      whatsapp: updatedAdmin.whatsapp
    } : admin));
    toast.success(t('Admin updated successfully'));
  };
  const handleUpdate = admin => {
    if (!canUpdate) return;
    setSelectedAdmin(admin);
    setOpenUpdateDialog(true);
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
  const handleFilterChange = (key, value) => {};
  const handleSearch = () => {
    fetchAdmins();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setPage(0);
  };
  const columns = [{
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
    field: 'settings',
    header: t('Settings'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="flex flex-col gap-1">
                    <Chip size="small" label={`${t('Lang')}: ${rowData.settings?.language || t('N/A')}`} className="!text-xs" variant="outlined" />
                    <Chip size="small" label={`${t('Currency')}: ${rowData.settings?.currency || t('N/A')}`} className="!text-xs" variant="outlined" />
                </div>,
    sortable: false
  }, {
    field: 'whatsapp',
    header: t('WhatsApp'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div>{rowData.whatsapp || '-'}</div>,
    sortable: false
  }, {
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
  return <div className="card !px-4">
            <ToastContainer position="top-right" autoClose={3000} />
            <AdminV2Filter searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} onSearch={handleSearch} onReset={handleReset} onFilterChange={handleFilterChange} onOpenSidebar={canCreate ? () => setOpenCreateDialog(true) : null} canCreate={canCreate} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 20, 50]} loading={loading} />
            <div className="bg-white">
                {loading ? <div className="flex items-center justify-center h-64">
                        <CircularProgress sx={{
          color: '#00b4b4'
        }} />
                    </div> : <GlobalTable data={admins} columns={columns} page={page} hasPagination={false} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 20, 50]} totalCount={totalCount} />}
            </div>

            <CreateAdminV2Sidebar open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} onAdminCreated={onAdminCreated} />

            <UpdateAdminV2Sidebar open={openUpdateDialog} onClose={() => setOpenUpdateDialog(false)} admin={selectedAdmin} onAdminUpdated={onAdminUpdated} />

            <Popover open={Boolean(statusAnchorEl)} anchorEl={statusAnchorEl} onClose={handleStatusClose} anchorOrigin={{
      vertical: 'bottom',
      horizontal: 'left'
    }} transformOrigin={{
      vertical: 'top',
      horizontal: 'left'
    }}>
                {selectedStatus && <div className="p-4 space-y-2 !bg-white">
                        <Stack direction="column" spacing={1}>
                            <Chip size="small" label={selectedStatus.banned ? t('Banned') : t('Not Banned')} color={selectedStatus.banned ? 'error' : 'success'} variant="outlined" />
                            <Chip size="small" label={selectedStatus.deleted ? t('Deleted') : t('Not Deleted')} color={selectedStatus.deleted ? 'default' : 'success'} variant="outlined" />
                        </Stack>
                    </div>}
            </Popover>
        </div>;
};
export default PublicAdminV2;
