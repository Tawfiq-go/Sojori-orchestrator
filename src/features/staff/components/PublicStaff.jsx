import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { CircularProgress, Button, Typography, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { getStaff, getOwners, deleteStaff } from '../services/serverApi.task';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import CreateStaffSidebar from './CreateStaffSidebar';
import ModifyStaffSidebar from './ModifyStaffSidebar';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteIcon from '@mui/icons-material/Delete';
import { getcities, getcountries } from '../../setting/services/serverApi.adminConfig';
import { getListingsTa, getTaskConfigs } from '../../tasks/services/serverApi.task';
import ListingPopup from './ListingPopup';
import { toast } from 'react-toastify';
import { getLanguage } from '../services/serverApi.task';
import { hasAdminAccess } from 'utils/rbac.utils';
import { useTranslation } from 'react-i18next';
import StaffFilters from './StaffFilters';
import { can } from '../../../utils/permissions';
const PublicStaff = () => {
  const {
    t
  } = useTranslation('common');
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openCreateSidebar, setOpenCreateSidebar] = useState(false);
  const [openModifySidebar, setOpenModifySidebar] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(10);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [listings, setListings] = useState([]);
  const [taskTypes, setTaskTypes] = useState([]);
  const [staffListing, setStaffListing] = useState(null);
  const [listingPopupOpen, setListingPopupOpen] = useState(false);
  const [selectedListingIds, setSelectedListingIds] = useState([]);
  const [selectedStaffOwnerId, setSelectedStaffOwnerId] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [owners, setOwners] = useState([]);
  const [selectedListings, setSelectedListings] = useState([]);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);

  // Permission checks
  const [canCreate, setCanCreate] = useState(can('create'));
  const [canUpdate, setCanUpdate] = useState(can('update'));
  const [canDelete, setCanDelete] = useState(can('delete'));

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguage();
      if (response.data) {
        setLanguages(response.data);
      }
    } catch (error) {
      toast.error(t('Error loading languages'));
    }
  };
  const fetchCities = async () => {
    try {
      const response = await getcities();
      setCities(response.data.cities);
    } catch (error) {}
  };
  const fetchCountries = async () => {
    try {
      const response = await getcountries();
      setCountries(response.data);
    } catch (error) {}
  };
  const fetchListings = async () => {
    try {
      const response = await getListingsTa();
      setListings(response);
    } catch (error) {}
  };
  const fetchOwners = async () => {
    try {
      const response = await getOwners({
        limit: 100
      });
      if (response && response.data) {
        setOwners(response.data);
      }
    } catch (error) {}
  };
  const fetchTaskTypes = async () => {
    setLoading(true);
    try {
      const response = await getTaskConfigs();
      if (response && Array.isArray(response)) {
        let updatedTaskTypes = response.flatMap(item => {
          if (item.task === 'CONCIERGE' && Array.isArray(item?.subs)) {
            return item.subs.map(sub => ({
              ...sub,
              task: sub.type
            }));
          }
          return item;
        });
        // Admin WhatsApp menu B (Arrivée/Départ) needs this type; API may not return it
        if (!updatedTaskTypes.some(tt => tt.task === 'ArrivalDeparture')) {
          updatedTaskTypes = [...updatedTaskTypes, {
            task: 'ArrivalDeparture',
            _id: 8
          }];
        }
        setTaskTypes(updatedTaskTypes);
      }
    } catch (error) {
      toast.error(t('Error loading task types'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTaskTypes();
    fetchCities();
    fetchCountries();
    fetchListings();
    fetchLanguages();
    fetchOwners();
  }, []);
  useEffect(() => {
    fetchStaff();
  }, [page, limit, searchText, selectedListings, selectedTypes, selectedLanguages]);
  const fetchStaff = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search_text: searchText
      };
      if (selectedListings && selectedListings.length > 0) {
        params.listings = selectedListings;
      }
      if (selectedTypes && selectedTypes.length > 0) {
        params.types = selectedTypes;
      }
      if (selectedLanguages && selectedLanguages.length > 0) {
        params.languages = selectedLanguages;
      }
      const response = await getStaff(params);
      if (response && Array.isArray(response.data)) {
        setStaff(response.data);
        const total = response.total || 0;
        setTotalCount(total);
        setIsNextDisabled(total === 0 || (page + 1) * limit >= total);
      } else {
        setStaff([]);
        setTotalCount(0);
        setIsNextDisabled(true);
      }
    } catch (error) {
      setStaff([]);
      setTotalCount(0);
      setIsNextDisabled(true);
    } finally {
      setLoading(false);
    }
  };
  const handleUpdate = staffMember => {
    setSelectedStaff(staffMember);
    setOpenModifySidebar(true);
  };
  const handleCloseModal = () => {
    setOpenModifySidebar(false);
    setSelectedStaff(null);
  };
  const handleStaffUpdate = updatedStaff => {
    setStaff(prevStaff => prevStaff.map(member => member._id === updatedStaff._id ? {
      ...member,
      ...updatedStaff
    } : member));
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const handleFilterChange = (key, value) => {
    setPage(0);
  };
  const handleSearch = () => {
    setPage(0);
    fetchStaff();
  };
  const handleReset = () => {
    setSearchText('');
    setSelectedListings([]);
    setSelectedTypes([]);
    setSelectedLanguages([]);
    setPage(0);
  };
  const handleDeleteClick = staffMember => {
    setStaffToDelete(staffMember);
    setDeleteDialogOpen(true);
  };
  const handleDeleteConfirm = async () => {
    if (!staffToDelete) return;
    try {
      setLoading(true);
      await deleteStaff(staffToDelete._id);
      toast.success(t('Staff deleted successfully'));

      // Remove from local state
      setStaff(prevStaff => prevStaff.filter(member => member._id !== staffToDelete._id));
      setTotalCount(prevCount => Math.max(0, prevCount - 1));

      // Close dialog
      setDeleteDialogOpen(false);
      setStaffToDelete(null);
    } catch (error) {
      toast.error(t('Error deleting staff'));
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setStaffToDelete(null);
  };
  const actionBodyTemplate = rowData => {
    if (!canUpdate && !canDelete) return null;
    return <div className="flex gap-2">
        {canUpdate && <button className="px-2 py-1 bg-medium-aquamarine !rounded-md hover:opacity-80 transition-opacity" onClick={() => handleUpdate(rowData)} title={t('Edit')}>
            <EditOffIcon className="text-white" />
          </button>}
        {canDelete && <button className="px-2 py-1 bg-red-500 !rounded-md hover:opacity-80 transition-opacity" onClick={() => handleDeleteClick(rowData)} title={t('Delete')}>
            <DeleteIcon className="text-white" />
          </button>}
      </div>;
  };
  const handleOpenCreateDialog = () => {
    setOpenCreateSidebar(true);
  };
  const handleCloseCreateDialog = () => {
    setOpenCreateSidebar(false);
  };
  const onStaffCreated = newStaff => {
    setStaff(prevStaff => {
      const updatedStaff = [newStaff, ...prevStaff];
      if (updatedStaff.length > limit) {
        updatedStaff.pop();
      }
      return updatedStaff;
    });
    setTotalCount(prevCount => prevCount + 1);
    setIsNextDisabled(false);
  };
  const baseColumns = [{
    field: 'username',
    header: t('Username'),
    sortable: false
  }, {
    field: 'email',
    header: t('Email Address'),
    body: rowData => rowData.email || '',
    sortable: false
  }, {
    field: 'subType',
    header: t('Types'),
    body: rowData => {
      const types = Array.isArray(rowData.subType) ? rowData.subType : [];
      return <div title={types.join('\n')} className="max-w-[200px] truncate">
            {types.join(', ')}
          </div>;
    },
    sortable: false
  }, {
    field: 'cityIds',
    header: t('Cities'),
    body: rowData => {
      const cityIds = rowData.cityIds || [];
      if (cityIds.includes('All')) {
        return <div className="max-w-[200px]">{t('All Cities')}</div>;
      }
      const cityNames = cityIds.map(cityId => cities.find(city => city._id === cityId)?.name || '').filter(Boolean);
      return <div title={cityNames.join('\n')} className="max-w-[200px] truncate">
            {cityNames.join(', ') || ''}
          </div>;
    },
    sortable: false
  }, {
    field: 'countryIds',
    header: t('Countries'),
    body: rowData => {
      const countryIds = rowData.countryIds || [];
      if (countryIds.includes('All')) {
        return <div className="max-w-[200px]">{t('All Countries')}</div>;
      }
      const countryNames = countryIds.map(countryId => countries.find(country => country._id === countryId)?.name || '').filter(Boolean);
      return <div title={countryNames.join('\n')} className="max-w-[200px] truncate">
            {countryNames.join(', ') || ''}
          </div>;
    },
    sortable: false
  }, {
    field: 'listingIds',
    header: t('Listings'),
    body: rowData => {
      const listingIds = rowData.listingIds || [];
      const isAllListings = listingIds.includes('All');
      const listingCount = isAllListings ? 'All' : listingIds.length;
      const handleListingClick = () => {
        if (listingCount > 0 || isAllListings) {
          setSelectedListingIds(listingIds);
          setSelectedStaffOwnerId(rowData.ownerId);
          setListingPopupOpen(true);
        }
      };
      return <div className="text-center">
            <button type="button" onClick={handleListingClick} className={`${listingCount > 0 || isAllListings ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 !cursor-default'} px-3 py-1 !rounded-full !text-sm hover:opacity-90 transition-opacity`}>
              {isAllListings ? t('All listings') : `${listingCount} listing${listingCount !== 1 ? 's' : ''}`}
            </button>
          </div>;
    },
    sortable: false
  }, {
    field: 'callPhone',
    header: t('Call Phone'),
    body: rowData => rowData.callPhone || '-',
    sortable: false
  }, {
    field: 'whatsappPhone',
    header: t('WhatsApp Phone'),
    body: rowData => rowData.whatsappPhone || '-',
    sortable: false
  }, {
    field: 'language',
    header: t('Language'),
    body: rowData => rowData.language || '',
    sortable: false
  },
  // Only include action column if user can update or delete
  ...(canUpdate || canDelete ? [{
    field: 'action',
    header: t('Action'),
    body: actionBodyTemplate,
    sortable: false
  }] : [])];
  const ownerColumn = {
    field: 'ownerId',
    header: t('Owner'),
    body: rowData => {
      if (!rowData.ownerId) return <div className="text-gray-400">-</div>;
      const owner = owners.find(o => o._id === rowData.ownerId);
      if (!owner) return <div className="text-gray-400">{rowData.ownerId}</div>;
      return <div className="flex items-center">
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {owner.firstName} {owner.lastName}
            </span>
            {owner.email && <span className="text-xs text-gray-500">
                {owner.email}
              </span>}
          </div>
        </div>;
    },
    sortable: false
  };
  const columns = isAdmin ? [baseColumns[0], baseColumns[1], ownerColumn, ...baseColumns.slice(2)] : baseColumns;
  return <div className="card !px-4">
      <StaffFilters searchText={searchText} setSearchText={setSearchText} listings={listings} selectedListings={selectedListings} setSelectedListings={setSelectedListings} selectedTypes={selectedTypes} setSelectedTypes={setSelectedTypes} selectedLanguages={selectedLanguages} setSelectedLanguages={setSelectedLanguages} types={taskTypes} languages={languages} onSearch={handleSearch} onReset={handleReset} onFilterChange={handleFilterChange} onOpenSidebar={canCreate ? handleOpenCreateDialog : null} canCreate={canCreate} page={page} setPage={setPage} limit={limit} setLimit={setLimit} totalItems={totalCount} rowsPerPageOptions={[5, 10, 25, 50]} loading={loading} />
      <div>
        {loading ? <div className="w-full flex justify-center items-center h-64">
            <CircularProgress sx={{
          color: '#00b4b4'
        }} />
          </div> : <GlobalTable data={staff} columns={columns} page={page} hasPagination={false} onPageChange={handlePageChange} isNextDisabled={isNextDisabled} limit={limit} onLimitChange={handleLimitChange} rowsPerPageOptions={[5, 10, 25, 50]} totalCount={totalCount} />}
      </div>
      <CreateStaffSidebar open={openCreateSidebar} onClose={handleCloseCreateDialog} onStaffCreated={onStaffCreated} cities={cities} countries={countries} listings={listings} taskTypes={taskTypes} languages={languages} owners={owners} />
      <ModifyStaffSidebar open={openModifySidebar} onClose={handleCloseModal} staff={selectedStaff} onStaffUpdate={handleStaffUpdate} cities={cities} countries={countries} listings={listings} taskTypes={taskTypes} languages={languages} owners={owners} />
      <ListingPopup open={listingPopupOpen} onClose={() => {
      setListingPopupOpen(false);
      setSelectedStaffOwnerId(null);
    }} listingIds={selectedListingIds} ownerId={selectedStaffOwnerId} />
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {t('Confirm deletion')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {staffToDelete && <>
                {t('Are you sure you want to delete')} <strong>{staffToDelete.username}</strong>?
                <br />
                {t('This action cannot be undone')}.
              </>}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            {t('Cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>;
};
export default PublicStaff;
