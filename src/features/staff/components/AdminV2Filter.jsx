import React, { useState } from 'react';
import { Button, IconButton, TextField, Tooltip } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import SearchIcon from '@mui/icons-material/Search';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GlobalFilter from 'components/GlobalFilter/GlobalFilter';
import ListingGlobalFilter from 'features/listing/components/ListingGlobalFilter';
import GlobalPaginationCompact from 'components/GlobalPaginationCompact/GlobalPaginationCompact';
import AdminFilter from './AdminFilter';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
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

const AdminV2Filter = ({
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
  showFilters = true,
  onOpenSidebar,
  onFilterChange,
  canCreate = true,
  page,
  setPage,
  limit,
  setLimit,
  totalItems = 0,
  rowsPerPageOptions = [5, 10, 20, 50],
  loading = false,
}) => {
  const { t } = useTranslation('common');
  const [searchInput, setSearchInput] = useState(searchText || '');

  const handleListingsChange = (newListings) => {
    setSelectedListings(newListings);
    if (onFilterChange) {
      onFilterChange('listings', newListings);
    }
  };

  const handleReservationNumberChange = (newNumber) => {
    setSearchText(newNumber);
    if (onFilterChange) {
      onFilterChange('search', newNumber);
    }
  };

  const handleResetWithSync = () => {
    onReset();
    if (onFilterChange) onFilterChange('reset', null);
    setSearchInput('');
  };

  if (!showFilters) return null;

  const resetEnabled = Boolean(
    (searchInput && searchInput.trim() !== '') ||
    (selectedListings && selectedListings.length > 0) ||
    deletedFilter !== undefined || bannedFilter !== undefined
  );

  const listingOptions = (listings || []).map((l) => ({ id: l.id || l._id || l.name, name: l.name }));

  const handleSearchInputChange = (e) => setSearchInput(e.target.value);
  const handleSearchClick = () => { handleReservationNumberChange(searchInput); if (onSearch) onSearch(); };

  return (
    <div className="w-full !mt-5">
      <GlobalFilter
        filterContent={
          <ListingGlobalFilter
            searchFilter={
              <div className="flex items-center">
                <StyledTextField
                  placeholder={t('Quick Search')}
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
                  title={<span style={{ whiteSpace: 'pre-line', fontSize: 15 }}>{t('Search by name or email')}</span>}
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
              <span />
            }
            cityFilter={<span />}
            unitTypeFilter={<span />}
            rightExtraContent={
              <AdminFilter
                deletedFilter={deletedFilter}
                bannedFilter={bannedFilter}
                onDeletedChange={onDeletedChange}
                onBannedChange={onBannedChange}
              />
            }
            onReset={handleResetWithSync}
            resetEnabled={resetEnabled}
            showAddButton={Boolean(canCreate && onOpenSidebar)}
            onAddClick={onOpenSidebar}
            canCreate={canCreate}
            addButtonLabel={t('Create Admin')}
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
              itemType="staff"
            />
          ) : null
        }
      />
    </div>
  );
};

export default AdminV2Filter;
