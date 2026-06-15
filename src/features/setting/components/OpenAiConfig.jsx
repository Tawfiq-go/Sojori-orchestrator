import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import 'primereact/resources/themes/lara-light-cyan/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import GlobalTable from '../../../components/GlobalTable/GlobalTable';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getOpenAiConfig, removeOpenAiConfig, updateOpenAiConfig } from '../services/serverApi.adminConfig';
import AddOpenAiInitConfigDialog from './AddOpenAIConfig';
import ModifyOpenAiConfigDialog from './ModOpeniaConfigTop.component';
import { AddCircleOutline as AddIcon } from '@mui/icons-material';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Button, CircularProgress, Switch, Box, IconButton, TextField, Select, MenuItem, FormControl } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/material/styles';
import { useSelector } from 'react-redux';
import { hasAdminAccess } from 'utils/rbac.utils';
import { getOwners } from "../../staff/services/serverApi.task";
import GlobalFilter from 'components/GlobalFilter/GlobalFilter';
import GlobalPaginationCompact from 'components/GlobalPaginationCompact/GlobalPaginationCompact';
import ListingGlobalFilter from 'features/listing/components/ListingGlobalFilter';
import AdminFilter from 'features/staff/components/AdminFilter';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    height: '40px',
    borderRadius: '4px 0 0 4px',
    backgroundColor: 'white',
    '& fieldset': {
      border: `1px solid ${SOJORI_COLORS.gray[300]}`,
      borderRight: 'none'
    },
    '&:hover fieldset': {
      borderColor: SOJORI_COLORS.gray[500],
      borderRight: 'none'
    },
    '&.Mui-focused fieldset': {
      borderColor: SOJORI_COLORS.primary,
      borderRight: 'none',
      borderWidth: '2px'
    }
  },
  '& .MuiInputBase-input': {
    padding: '9px 14px',
    height: '22px',
    color: SOJORI_COLORS.gray[700],
    '&::placeholder': {
      color: SOJORI_COLORS.gray[500],
      opacity: 1
    }
  }
});
const SearchButton = styled(IconButton)({
  height: '40px',
  width: '40px',
  borderRadius: '0 4px 4px 0',
  backgroundColor: SOJORI_COLORS.primary,
  border: `1px solid ${SOJORI_COLORS.primary}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  },
  '& .MuiSvgIcon-root': {
    color: 'white'
  }
});
const StyledSelect = styled(Select)({
  height: '40px',
  borderRadius: '4px',
  backgroundColor: 'white',
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: SOJORI_COLORS.gray[300]
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: SOJORI_COLORS.gray[500]
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: SOJORI_COLORS.primary,
    borderWidth: '2px'
  },
  '& .MuiSelect-select': {
    padding: '9px 14px',
    height: '22px',
    color: SOJORI_COLORS.gray[700],
    fontSize: '13px',
    fontWeight: 500
  }
});
const CreateButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});
function OpenAiConfig() {
  const {
    t
  } = useTranslation('common');
  const [openAiConfigItem, setOpenAiConfigItem] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [rowsPerPageOptions] = useState([20, 50, 100]);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDialogM, setOpenDialogM] = useState(false);
  const [dataOpenAi, setDataOpenAi] = useState(null);
  const [openAiIndex, setOpenAiIndex] = useState(null);
  const [totalItems, setTotalItems] = useState(0);

  // New state for the owner filter.
  const [selectedOwner, setSelectedOwner] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const {
    user
  } = useSelector(state => state.auth);
  const isAdmin = user && hasAdminAccess(user.role);
  const [owners, setOwners] = useState([]);

  // Fetch OpenAI config items.
  const openAiConfigItems = async () => {
    try {
      const data = await getOpenAiConfig(page, limit, search);
      setOpenAiConfigItem(data?.data?.openAiConfigs);
      setTotalItems(data?.data?.total || 0);
    } catch (error) {} finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    openAiConfigItems();
  }, [page, limit]);
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

  // Derive filtered AI config items based on the selected owner.
  const filteredOpenAiConfigItem = selectedOwner ? openAiConfigItem.filter(item => item.ownerId === selectedOwner) : openAiConfigItem;
  const handleOpenDialog = () => setOpenDialog(true);
  const handleCloseDialog = () => setOpenDialog(false);
  const handleCloseDialogM = () => {
    setOpenDialogM(false);
  };
  const handleOpenDialogM = (data, index) => {
    setOpenDialogM(true);
    setDataOpenAi(data);
    setOpenAiIndex(index);
  };
  const addAiConfig = newItem => {
    setOpenAiConfigItem([...openAiConfigItem, newItem]);
    handleCloseDialog();
  };
  const handleDelete = async (openAiId, index) => {
    const confirmed = window.confirm(t('Are you sure you want to delete this item?'));
    if (confirmed) {
      removeOpenAiConfig(openAiId).then(response => {
        if (response.status === 200) {
          const updatedData = openAiConfigItem.filter((item, i) => i !== index);
          setOpenAiConfigItem(updatedData);
          toast.success(t('Deleted Successfully'));
        } else {}
      });
    }
  };
  const ownerColumn = {
    header: t('Owner'),
    headerClassName: 'header-test',
    body: rowData => {
      const owner = owners.find(o => o._id === rowData.ownerId);
      return owner ? <span title={owner.email} className="cursor-pointer">
          {owner.email}
        </span> : <span className="text-gray-400">-</span>;
    }
  };
  const columns = [{
    field: 'type',
    header: t('Type'),
    headerClassName: 'header-test',
    body: rowData => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          {rowData?.type}
        </span>
  }, {
    field: 'description_openai',
    header: t('Description'),
    headerClassName: 'header-test',
    body: rowData => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          {rowData?.description_openai}
        </span>
  }, {
    field: 'enable',
    header: t('Enable'),
    headerClassName: 'header-test',
    body: (rowData, options) => <span className="block mx-auto font-bold text-center cursor-pointer text-medium-aquamarine">
          <Switch onChange={e => editSwitch('enable', e.target.checked, options?.rowIndex || 0)} value="checked" checked={rowData?.enable} />
        </span>
  },
  // Only include owner column if admin
  ...(isAdmin ? [ownerColumn] : []), {
    field: 'null',
    header: t('Action'),
    headerClassName: 'header-test',
    body: (rowData, options) => <div className="flex items-center justify-center gap-2">
          <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenDialogM(rowData, options?.rowIndex || 0)}>
            <EditOffIcon className="text-white" />
          </button>
          {rowData.type !== "About Us" && <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDelete(rowData._id, options?.rowIndex || 0)}>
              <DeleteSweepIcon className="text-white" />
            </button>}
        </div>
  }];
  const handleInputChange = event => {
    const searchTerm = event.target.value;
    setSearchInput(searchTerm);
  };
  const handleSearchClick = () => {
    setSearch(searchInput);
    setPage(0);
  };
  const handleReset = () => {
    setSearchInput('');
    setSearch('');
    setSelectedOwner('');
    setPage(0);
  };
  const handleFilterChange = (key, value) => {
    setPage(0);
  };
  useEffect(() => {
    const intervalId = setTimeout(() => {
      openAiConfigItems();
    }, 1000);
    return () => {
      clearTimeout(intervalId);
    };
  }, [search]);
  const editSwitch = (key, value, index) => {
    let data = openAiConfigItem;
    data[index][key] = value;
    setOpenAiConfigItem([...data]);
    const {
      _id,
      ...item
    } = data[index];
    updateOpenAiConfig(_id, item).then(({
      data
    }) => {
      toast.success(t('Enable has been updated'));
    }).catch(error => {});
  };
  const resetEnabled = Boolean(searchInput && searchInput.trim() !== '' || selectedOwner && selectedOwner !== '');
  const ownerOptions = (owners || []).map(o => ({
    id: o._id,
    name: o.email
  }));
  return <>
      <ToastContainer />
      <div className="card px-4 pb-4 !border-none">
        <GlobalFilter filterContent={<ListingGlobalFilter searchFilter={<div className="flex items-center">
                  <StyledTextField placeholder={t('Quick Search')} value={searchInput} onChange={handleInputChange} variant="outlined" size="small" sx={{
          width: '200px'
        }} InputProps={{
          style: {
            paddingRight: 0
          }
        }} />
                  <SearchButton onClick={handleSearchClick} className="!text-white">
                    <SearchIcon className="!text-white" />
                  </SearchButton>
                </div>} countryFilter={isAdmin ? <FormControl sx={{
        width: '130px'
      }}>
                    <StyledSelect value={selectedOwner} onChange={e => {
          setSelectedOwner(e.target.value);
          if (handleFilterChange) handleFilterChange('owner', e.target.value);
        }} displayEmpty size="small">
                      <MenuItem value="">
                        {t('All Owners')}
                      </MenuItem>
                      {ownerOptions.map(owner => <MenuItem key={owner.id} value={owner.id}>
                          {owner.name}
                        </MenuItem>)}
                    </StyledSelect>
                  </FormControl> : <span />} cityFilter={<span />} unitTypeFilter={<span />} rightExtraContent={<CreateButton variant="contained" endIcon={<AddIcon />} onClick={handleOpenDialog}>
                  {t('Add AI Config')}
                </CreateButton>} onReset={handleReset} resetEnabled={resetEnabled} showAddButton={false} />} paginationContent={totalItems > 0 ? <GlobalPaginationCompact currentPage={page} totalItems={totalItems} itemsPerPage={limit} onPageChange={setPage} onItemsPerPageChange={setLimit} itemsPerPageOptions={rowsPerPageOptions} loading={loading} itemType="configs" /> : null} />
        {loading ? <div className="flex items-center justify-center h-64">
            <CircularProgress sx={{
          color: '#00b4b4'
        }} />
          </div> : <GlobalTable data={filteredOpenAiConfigItem} columns={columns} page={page} onPageChange={setPage} isNextDisabled={loading || openAiConfigItem.length < limit} hasPagination={false} limit={limit} onLimitChange={setLimit} rowsPerPageOptions={rowsPerPageOptions} />}
        <AddOpenAiInitConfigDialog open={openDialog} onClose={handleCloseDialog} addAiConfig={addAiConfig} owners={owners} openAiConfigs={openAiConfigItem} />
        <ModifyOpenAiConfigDialog open={openDialogM} onClose={handleCloseDialogM} openAiConfigItem={openAiConfigItem} setOpenAiConfigItem={setOpenAiConfigItem} dataOpenAi={dataOpenAi} openAiIndex={openAiIndex} owners={owners} openAiConfigs={openAiConfigItem} />
      </div>
    </>;
}
export default OpenAiConfig;
