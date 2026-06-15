import React, { useState } from 'react';
import { Button, IconButton, TextField, Tooltip, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GlobalFilter from 'components/GlobalFilter/GlobalFilter';
import ListingGlobalFilter from 'features/listing/components/ListingGlobalFilter';
import ChipMultiSelect from 'components/ChipMultiSelect/ChipMultiSelect';
import GlobalPaginationCompact from 'components/GlobalPaginationCompact/GlobalPaginationCompact';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
  },
};

const StyledTextField = styled(TextField)({
  '& .MuiOutlinedInput-root': {
    height: '40px',
    borderRadius: '4px 0 0 4px',
    backgroundColor: 'white',
    '& fieldset': {
      border: `1px solid ${SOJORI_COLORS.gray[300]}`,
      borderRight: 'none',
    },
    '&:hover fieldset': {
      borderColor: SOJORI_COLORS.gray[500],
      borderRight: 'none',
    },
    '&.Mui-focused fieldset': {
      borderColor: SOJORI_COLORS.primary,
      borderRight: 'none',
      borderWidth: '2px',
    },
  },
  '& .MuiInputBase-input': {
    padding: '9px 14px',
    height: '22px',
    color: SOJORI_COLORS.gray[700],
    '&::placeholder': {
      color: SOJORI_COLORS.gray[500],
      opacity: 1,
    },
  },
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
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
  },
  '& .MuiSvgIcon-root': {
    color: 'white',
  },
});

const ClientWhiteListFilters = ({
  searchText,
  setSearchText,
  reservationFilter,
  setReservationFilter,
  communicationFilter,
  setCommunicationFilter,
  activeFilter,
  setActiveFilter,
  onReset,
  showFilters = true,
  onFilterChange,
  page,
  setPage,
  limit,
  setLimit,
  totalItems = 0,
  rowsPerPageOptions = [10, 25, 50],
  loading = false,
}) => {
  const { t } = useTranslation('common');
  const [searchInput, setSearchInput] = useState(searchText || '');

  const handleReservationNumberChange = (newNumber) => {
    setSearchText(newNumber);
    if (onFilterChange) {
      onFilterChange('search', newNumber);
    }
  };

  const handleReservationFilterChange = (event) => {
    const value = event.target.value;
    setReservationFilter(value);
    if (onFilterChange) onFilterChange('reservation', value);
  };

  const handleCommunicationFilterChange = (event) => {
    const value = event.target.value;
    setCommunicationFilter(value);
    if (onFilterChange) onFilterChange('communication', value);
  };

  const handleActiveFilterChange = (event) => {
    const value = event.target.value;
    setActiveFilter(value);
    if (onFilterChange) onFilterChange('active', value);
  };

  const handleResetWithSync = () => {
    onReset();
    if (onFilterChange) onFilterChange('reset', null);
    setSearchInput('');
  };

  if (!showFilters) return null;

  const resetEnabled = Boolean(
    (searchInput && searchInput.trim() !== '') ||
    reservationFilter !== 'all' ||
    communicationFilter !== 'all' ||
    activeFilter !== 'all'
  );

  const reservationOptions = [
    { id: 'all', name: t('All') },
    { id: 'true', name: t('Yes') },
    { id: 'false', name: t('No') },
  ];

  const communicationOptions = [
    { id: 'all', name: t('All') },
    { id: 'true', name: t('Yes') },
    { id: 'false', name: t('No') },
  ];

  const statusOptions = [
    { id: 'all', name: t('All') },
    { id: 'active', name: t('Active') },
    { id: 'blocked', name: t('Blocked') },
  ];

  const handleSearchInputChange = (e) => setSearchInput(e.target.value);
  const handleSearchClick = () => { handleReservationNumberChange(searchInput); };

  return (
    <div className="w-full !mt-5">
      <GlobalFilter
        filterContent={
          <ListingGlobalFilter
            searchFilter={
              <div className="flex items-center">
                <StyledTextField
                  placeholder={t('Search by phone, name, or reservation')}
                  value={searchInput}
                  onChange={handleSearchInputChange}
                  variant="outlined"
                  size="small"
                  sx={{ width: '200px' }}
                  InputProps={{ style: { paddingRight: 0 } }}
                />
                <SearchButton onClick={handleSearchClick} className="!text-white">
                  <SearchIcon className="!text-white" />
                </SearchButton>
                <Tooltip
                  title={<span style={{ whiteSpace: 'pre-line', fontSize: 15 }}>{t('Search by phone, name, or reservation')}</span>}
                  arrow
                  placement="bottom"
                >
                  <IconButton
                    size="small"
                    sx={{
                      marginLeft: '4px', background: '#fff', height: '40px', width: '40px', borderRadius: '4px',
                      transition: 'all 0.2s ease', '&:hover': { backgroundColor: SOJORI_COLORS.primaryPale },
                    }}
                  >
                    <InfoOutlinedIcon sx={{ color: SOJORI_COLORS.primary }} />
                  </IconButton>
                </Tooltip>
              </div>
            }
            countryFilter={
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="reservation-filter-label">{t('Reservation')}</InputLabel>
                <Select
                  labelId="reservation-filter-label"
                  value={reservationFilter}
                  onChange={handleReservationFilterChange}
                  label={t('Reservation')}
                  sx={{ height: 36 }}
                >
                  {reservationOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
            cityFilter={
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="communication-filter-label">{t('Communication')}</InputLabel>
                <Select
                  labelId="communication-filter-label"
                  value={communicationFilter}
                  onChange={handleCommunicationFilterChange}
                  label={t('Communication')}
                  sx={{ height: 36 }}
                >
                  {communicationOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
            unitTypeFilter={
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel id="status-filter-label">{t('Status')}</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={activeFilter}
                  onChange={handleActiveFilterChange}
                  label={t('Status')}
                  sx={{ height: 36 }}
                >
                  {statusOptions.map((option) => (
                    <MenuItem key={option.id} value={option.id}>
                      {option.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
            rightExtraContent={<span />}
            onReset={handleResetWithSync}
            resetEnabled={resetEnabled}
            showAddButton={false}
          />
        }
        paginationContent={
          totalItems > 0 ? (
            <GlobalPaginationCompact
              currentPage={page}
              totalItems={totalItems}
              itemsPerPage={limit}
              onPageChange={setPage}
              onItemsPerPageChange={setLimit}
              itemsPerPageOptions={rowsPerPageOptions}
              loading={loading}
              itemType="clients"
            />
          ) : null
        }
      />
    </div>
  );
};

export default ClientWhiteListFilters;
