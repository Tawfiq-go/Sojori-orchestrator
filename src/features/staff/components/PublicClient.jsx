import React, { useState, useEffect } from 'react';
import { CircularProgress, Button, Typography, Box } from '@mui/material';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { getClient } from '../services/serverApi.task';
import { ToastContainer, toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminFilter from './AdminFilter';
import CreateAdminDialog from './CreateAdminDialog';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';
import { getOwners } from '../../staff/services/serverApi.task';
import { Tooltip } from '@mui/material';
import ClientFilters from './ClientFilters';
const PublicClient = () => {
  const {
    t
  } = useTranslation('common');
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');

  // State for owners
  const [owners, setOwners] = useState([]);

  // Retrieve the current user to check for admin rights.
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  useEffect(() => {
    fetchAdmins();
  }, [page, limit, searchText, deletedFilter, bannedFilter]);
  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        username: searchText,
        deleted: deletedFilter === 'all' ? undefined : deletedFilter === 'true',
        banned: bannedFilter === 'all' ? undefined : bannedFilter === 'true'
      };
      const response = await getClient(params);
      if (response && Array.isArray(response.data)) {
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
  const onAdminCreated = newAdmin => {
    // const formattedAdmin = {
    //     ...newAdmin,
    //     email_addresses: newAdmin.email_addresses || [],
    //     public_metadata: newAdmin.public_metadata || {},
    //     banned: newAdmin.banned || false,
    //     deleted: newAdmin.deleted || false
    // };

    // setAdmins(prevAdmins => [formattedAdmin, ...prevAdmins]);
    toast.success(t('Administrator created successfully'));
    fetchAdmins();
  };
  const afterActionCreated = msg => {
    // const formattedAdmin = {
    //     ...newAdmin,
    //     email_addresses: newAdmin.email_addresses || [],
    //     public_metadata: newAdmin.public_metadata || {},
    //     banned: newAdmin.banned || false,
    //     deleted: newAdmin.deleted || false
    // };

    // setAdmins(prevAdmins => [formattedAdmin, ...prevAdmins]);
    toast.success(t(msg));
    fetchAdmins();
  };
  const handleUpdate = (adminMember, action) => {
    setSelectedAdmin(adminMember);
    setOpenModal(true);
    switch (action) {
      case 'deleteAdmin':
        handleOpenDeleteDialog();
        break;
      default:
        break;
    }
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAdmin(null);
  };
  useEffect(() => {
    if (isAdmin) {
      const fetchOwners = async () => {
        try {
          const response = await getOwners({
            limit: 100
          });
          if (response.data) {
            setOwners(response.data);
          }
        } catch (error) {}
      };
      fetchOwners();
    }
  }, [isAdmin]);

  // const handleAdminUpdate = (updatedAdmin) => {
  //     setAdmins(prevAdmins =>
  //         prevAdmins.map(member =>
  //             member._id === updatedAdmin._id ? {
  //                 ...member,
  //                 ...updatedAdmin,
  //             } : member
  //         )
  //     );
  //     toast.success('Administrator updated successfully');
  // };

  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const handleFilterChange = (key, value) => {};
  const handleReset = () => {
    setSearchText('');
    setPage(0);
  };
  const actionBodyTemplate = rowData => {
    return <button className="px-2 py-1 bg-red-500 !rounded-md" onClick={() => handleUpdate(rowData, 'deleteAdmin')} disabled={rowData.deleted}>
        {/* <EditOffIcon className="text-white" /> */}
        <DeleteIcon className="text-white" />
      </button>;
  };
  const ownerColumn = {
    field: 'ownerIds',
    header: t('Owners'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      if (!rowData.ownerIds || rowData.ownerIds.length === 0) {
        return '-';
      }
      const ownerEmails = rowData.ownerIds.map(ownerId => {
        const owner = owners.find(o => o._id === ownerId);
        return owner ? owner.email : ownerId;
      });
      const displayedText = ownerEmails.join(', ');
      return <div style={{
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        maxWidth: '200px'
      }}>
          {displayedText}
        </div>;
    }
  };
  const columns = [{
    field: 'username',
    header: t('Username'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="font-medium">{rowData.username}</div>,
    sortable: false
  }, {
    field: 'email_addresses',
    header: t('Email Address'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      return rowData?.email_addresses?.[0]?.email_address || '-';
    },
    sortable: false
  }, {
    field: 'public_metadata.role',
    header: t('Role'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="capitalize">
          {rowData.public_metadata?.role || 'admin'}
        </div>,
    sortable: false
  }, ...(isAdmin ? [ownerColumn] : []), {
    field: 'status',
    header: t('Status'),
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="flex items-center gap-1">
          {rowData.banned ? <span className="inline-flex items-center gap-1 text-red-500">
              <BlockIcon fontSize="small" />
              {t('Banned')}
            </span> : rowData.deleted ? <span className="inline-flex items-center gap-1 text-gray-500">
              <BlockIcon fontSize="small" />
              {t('Deleted')}
            </span> : <span className="inline-flex items-center gap-1 text-green-500">
              <CheckCircleIcon fontSize="small" />
              {t('Active')}
            </span>}
        </div>,
    sortable: false
  }];
  const handleOpenCreateDialog = () => {
    setOpenCreateDialog(true);
  };
  const handleCloseCreateDialog = () => {
    setOpenCreateDialog(false);
  };
  const handleOpenDeleteDialog = () => {
    setOpenDeleteDialog(true);
  };
  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };
  return <div className="card !px-4">
      <ToastContainer position="top-right" autoClose={3000} />


      <ClientFilters searchText={searchText} setSearchText={setSearchText} deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} onReset={handleReset} onFilterChange={handleFilterChange} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 25, 50]} loading={loading} />

      <div className="bg-white">
        {loading ? <div className="flex items-center justify-center h-64">
            <CircularProgress sx={{
          color: '#00b4b4'
        }} />
          </div> : <GlobalTable data={admins} columns={columns} page={page} hasPagination={false} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 25, 50]} totalCount={totalCount} />}
      </div>

      {/* <CreateAdminDialog
        open={openCreateDialog}
        onClose={handleCloseCreateDialog}
        onAdminCreated={onAdminCreated}
       />
       <DeleteAdminDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onAdminCreated={() =>
          afterActionCreated(t('Administrator deleted successfully'))
        }
        user={selectedAdmin}
        title={t('Delete Admin')}
        message={t('are you sure want to delete {{username}}', { username: selectedAdmin?.username || '' })}
       /> */}
    </div>;
};
export default PublicClient;
