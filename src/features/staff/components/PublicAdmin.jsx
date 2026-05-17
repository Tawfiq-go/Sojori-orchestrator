import React, { useState, useEffect } from 'react';
import { CircularProgress, Button, Typography, Box } from '@mui/material';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAdmins } from '../services/serverApi.task';
import { ToastContainer, toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AdminFilter from './AdminFilter';
import CreateAdminDialog from './CreateAdminDialog';
// import DeleteAdminDialog from './DeleteAdminDialog';
import UpdateAdminDialog from './UpdateAdminDialog';
import TableLoading from 'components/TableLoading/TableLoadign';
const PublicAdmin = () => {
  const [admins, setAdmins] = useState([]);
  const [taskTypes, setTaskTypes] = useState([
  // { task: 'Admin', _id: 1 },
  {
    task: 'Reservation',
    _id: 1
  }, {
    task: 'Task',
    _id: 2
  }, {
    task: 'Listing',
    _id: 3
  }, {
    task: 'Calendrier',
    _id: 4
  }, {
    task: 'DynamicPrice',
    _id: 5
  }, {
    task: 'Message',
    _id: 6
  }, {
    task: 'Reviews',
    _id: 7
  }, {
    task: 'ArrivalDeparture',
    _id: 8
  }]);
  const [isLoading, setIsLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false);
  const [deletedFilter, setDeletedFilter] = useState('all');
  const [bannedFilter, setBannedFilter] = useState('all');
  useEffect(() => {
    fetchAdmins();
  }, [page, limit, searchText, deletedFilter, bannedFilter]);
  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit,
        username: searchText,
        deleted: deletedFilter === 'all' ? undefined : deletedFilter === 'true',
        banned: bannedFilter === 'all' ? undefined : bannedFilter === 'true'
      };
      const response = await getAdmins(params);
      if (response && Array.isArray(response.data)) {
        setAdmins(response.data);
        setTotalCount(response.total || 0);
        setIsNextDisabled((page + 1) * limit >= response.total);
      } else {
        setAdmins([]);
        setTotalCount(0);
      }
    } catch (error) {
      setAdmins([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
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
    toast.success('Administrator created successfully');
    setTimeout(() => {
      fetchAdmins();
    }, 5000);
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
    toast.success(msg);
    setTimeout(() => {
      fetchAdmins();
    }, 5000);
  };
  const handleUpdate = (adminMember, action) => {
    setSelectedAdmin(adminMember);
    setOpenModal(true);
    switch (action) {
      case 'deleteAdmin':
        handleOpenDeleteDialog();
        break;
      case 'updateAdmin':
        handleOpenUpdateDialog();
        break;
      default:
        break;
    }
  };
  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedAdmin(null);
  };

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
  const handleSearch = event => {
    setSearchText(event.target.value);
    setPage(0);
  };
  const actionBodyTemplate = rowData => {
    return <>
        <button className="px-2 py-1 bg-red-500 !rounded-md mr-2" onClick={() => handleUpdate(rowData, 'deleteAdmin')} disabled={rowData.deleted}>
          {/* <EditOffIcon className="text-white" /> */}
          <DeleteIcon className="text-white" />
        </button>
        <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleUpdate(rowData, 'updateAdmin')}>
          <EditOffIcon className="text-white" />
        </button>
      </>;
  };
  const columns = [{
    field: 'username',
    header: 'Username',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="font-medium">{rowData.username}</div>
  }, {
    field: 'email_addresses',
    header: 'Email Address',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      return rowData?.email_addresses?.[0]?.email_address || '-';
    }
  }, {
    field: 'public_metadata.role',
    header: 'Role',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="capitalize">
          {rowData.public_metadata?.role || 'admin'}
        </div>
  }, {
    field: 'public_metadata.subType',
    header: 'Sub Type',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => {
      const types = rowData.public_metadata?.subType || [];
      return <div title={types.join('\n')} className="max-w-[200px] truncate">
            {types.join(', ')}
          </div>;
    }
  }, {
    field: 'status',
    header: 'Status',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: rowData => <div className="flex items-center gap-1">
          {rowData.banned ? <span className="inline-flex items-center gap-1 text-red-500">
              <BlockIcon fontSize="small" />
              Banned
            </span> : rowData.deleted ? <span className="inline-flex items-center gap-1 text-gray-500">
              <BlockIcon fontSize="small" />
              Deleted
            </span> : <span className="inline-flex items-center gap-1 text-green-500">
              <CheckCircleIcon fontSize="small" />
              Active
            </span>}
        </div>
  },
  // {
  //     field: 'createdAt',
  //     header: 'Created At',
  //     body: (rowData) => new Date(rowData.createdAt).toLocaleDateString()
  // },
  // {
  //     field: 'updatedAt',
  //     header: 'Last Updated',
  //     body: (rowData) => new Date(rowData.updatedAt).toLocaleDateString()
  // },
  {
    field: 'action',
    header: 'Action',
    headerStyle: {
      justifyContent: 'flex-start'
    },
    body: actionBodyTemplate
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
  const handleOpenUpdateDialog = () => {
    setOpenUpdateDialog(true);
  };
  const handleCloseUpdateDialog = () => {
    setOpenUpdateDialog(false);
  };
  return <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <Typography variant="h4" component="h1" className="!flex !items-center !gap-1 !md:text-2xl !text-lg">
          <AdminPanelSettingsIcon className="!md:text-3xl !text-xl" />{' '}
          Administrator Management
        </Typography>
        <AdminFilter deletedFilter={deletedFilter} bannedFilter={bannedFilter} onDeletedChange={setDeletedFilter} onBannedChange={setBannedFilter} />
      </div>

      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex flex-col md:flex-row justify-between items-center gap-2">
        <div className="w-full md:flex-grow md:mr-4">
          <div className="flex w-full bg-white border rounded-md h-8 md:h-10">
            <input type="text" value={searchText} onChange={handleSearch} placeholder="Search by username..." className="p-2 text-xs md:text-xs outline-none rounded-md w-full" />
            <div className="px-2">
              <SearchIcon className="!w-3 !h-3 md:!w-4 md:!h-4" />
            </div>
          </div>
        </div>

        <Button variant="contained" onClick={handleOpenCreateDialog} className="w-full md:w-auto px-2 md:px-2.5 py-1 md:py-1.5 !text-xs !bg-medium-aquamarine text-white !rounded-md">
          Create Administrator
        </Button>
      </div>

      <div className="bg-white">
        {isLoading ? <TableLoading /> : admins.length > 0 ? <GlobalTable data={admins} columns={columns} page={page} hasPagination={true} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 25, 50]} totalCount={totalCount} /> : <div className="flex justify-center items-center h-64">
            <CircularProgress sx={{
          color: '#00b4b4'
        }} />
          </div>}
      </div>

      <CreateAdminDialog open={openCreateDialog} onClose={handleCloseCreateDialog} onAdminCreated={onAdminCreated} />
      {/* <DeleteAdminDialog
        open={openDeleteDialog}
        onClose={handleCloseDeleteDialog}
        onAdminCreated={() =>
          afterActionCreated('Administrator deleted successfully')
        }
        user={selectedAdmin}
        title={'Delete Admin'}
        message={`are you sure want to delete ${selectedAdmin?.username || ''}`}
       /> */}
      <UpdateAdminDialog open={openUpdateDialog} onClose={handleCloseUpdateDialog} handleClose={handleCloseUpdateDialog} onStaffUpdate={() => afterActionCreated('Administrator updated successfully')} staff={selectedAdmin} title={'Admin Admin'} message={`are you sure want to delete ${selectedAdmin?.username || ''}`} taskTypes={taskTypes} />
    </div>;
};
export default PublicAdmin;
