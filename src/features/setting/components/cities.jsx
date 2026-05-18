import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getcities, removeCity, updateCity, getLanguages, getcountries } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AddCityDialog from './AddCity.component';
import ModifyCityDialog from './ModifyCity.component';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Typography, CircularProgress, Button, Switch, Tooltip, FormControl, InputLabel, Select, MenuItem, Chip, OutlinedInput, Box, TextField, InputAdornment } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { debounce } from 'lodash';
const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250
    }
  }
};
function CitiesTable() {
  const {
    t
  } = useTranslation('common');
  const [cities, setCities] = useState([]);
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCityIndex, setSelectedCityIndex] = useState(null);
  const [error, setError] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [totalCount, setTotalCount] = useState(0);
  const [isNextDisabled, setIsNextDisabled] = useState(false);
  const rowsPerPageOptions = [5, 10, 20, 50, 100];
  const debouncedSearch = useCallback(debounce(text => {
    setSearchText(text);
    setPage(0);
  }, 500), []);
  useEffect(() => {
    fetchCountries();
    fetchLanguages();
  }, []);
  useEffect(() => {
    fetchCities();
  }, [selectedCountries, page, limit, searchText]);
  const fetchCountries = async () => {
    try {
      const response = await getcountries();
      setCountries(response.data);
    } catch (error) {
      toast.error(t('Failed to fetch countries'));
    }
  };
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {
      toast.error(t('Failed to fetch languages'));
    }
  };
  const fetchCities = async () => {
    setIsLoading(true);
    try {
      const countryIds = selectedCountries.map(country => country._id);
      const response = await getcities(page, limit, true, countryIds, searchText, true);
      if (response.data.cities && Array.isArray(response.data.cities)) {
        setCities(response.data.cities);
        setTotalCount(response.data.total || 0);
        setIsNextDisabled((page + 1) * limit >= response.data.total);
      } else if (response.data.message === "No Cities Found") {
        setCities([]);
        setTotalCount(0);
        toast.info(t('No cities found for the selected filters'));
      } else if (Array.isArray(response.data)) {
        setCities(response.data);
        setTotalCount(response.data.length);
        setIsNextDisabled(true);
      } else {
        setCities([]);
        setTotalCount(0);
      }
      setError(null);
    } catch (error) {
      // setError(t('Failed to fetch cities. Please try again later.'));
      setCities([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSearchChange = event => {
    debouncedSearch(event.target.value);
  };
  const handlePageChange = newPage => {
    setPage(newPage);
  };
  const handleLimitChange = newLimit => {
    setLimit(newLimit);
    setPage(0);
  };
  const handleCountryChange = event => {
    const selectedIds = event.target.value;
    const selectedCountryObjects = countries.filter(country => selectedIds.includes(country._id));
    setSelectedCountries(selectedCountryObjects);
    setPage(0);
  };
  const handleOpenAddDialog = () => setOpenAddDialog(true);
  const handleCloseAddDialog = () => setOpenAddDialog(false);
  const handleOpenModifyDialog = (city, index) => {
    setSelectedCity(city);
    setSelectedCityIndex(index);
    setOpenModifyDialog(true);
  };
  const handleCloseModifyDialog = () => {
    setSelectedCity(null);
    setSelectedCityIndex(null);
    setOpenModifyDialog(false);
  };
  const handleDeleteCity = async cityId => {
    if (window.confirm(t('Are you sure you want to delete this city?'))) {
      try {
        await removeCity(cityId);
        fetchCities();
        toast.success(t('City deleted successfully'));
      } catch (error) {
        toast.error(t('Failed to delete city'));
      }
    }
  };
  const addCity = newCity => {
    fetchCities();
    handleCloseAddDialog();
    toast.success(t('City added successfully'));
  };
  const handleUpdateCity = updatedCity => {
    fetchCities();
    toast.success(t('City updated successfully'));
  };
  const editSwitch = (key, value, cityId) => {
    const updatedCities = cities.map(city => {
      if (city._id === cityId) {
        return {
          ...city,
          [key]: value
        };
      }
      return city;
    });
    setCities(updatedCities);
    const cityToUpdate = updatedCities.find(city => city._id === cityId);
    if (cityToUpdate) {
      const {
        _id,
        ...itemToUpdate
      } = cityToUpdate;
      updateCity(_id, itemToUpdate).then(({
        data
      }) => {
        toast.success(t(`${key} has been updated`));
      }).catch(error => {
        toast.error(t(`Failed to update ${key}`));
      });
    }
  };
  const renderMultiLanguageContent = content => {
    if (typeof content !== 'object') {
      return <span>{content}</span>;
    }
    return <div>
        {Object.entries(content).map(([langId, text]) => {
        const language = languages.find(lang => lang._id === langId);
        return <Tooltip key={langId} title={text} arrow placement="top">
              <div>
                <strong>{language ? language.name : t('Unknown')}:</strong>{' '}
                {text.length > 100 ? `${text.substring(0, 100)}...` : text}
              </div>
            </Tooltip>;
      })}
      </div>;
  };
  const columns = [{
    header: t('Name'),
    body: rowData => <span>{rowData.name}</span>
  }, {
    header: t('Description'),
    body: rowData => renderMultiLanguageContent(rowData.description)
  }, {
    header: t('Country'),
    body: rowData => {
      if (rowData.country && rowData.country.length > 0) {
        return <span>{rowData.country[0].name}</span>;
      }
      const country = countries.find(c => c._id === rowData.countryId);
      return <span>{country ? country.name : t('Unknown')}</span>;
    }
  }, {
    header: t('GPS Position'),
    body: rowData => <div className="flex items-center">
          <LocationOnIcon className="mr-2 text-medium-aquamarine" />
          {rowData.gpsPosition ? <Tooltip title="Click to copy coordinates" arrow>
              <button className="p-1 text-left rounded hover:bg-gray-100" onClick={() => {
          const coords = `${rowData.gpsPosition.lat}, ${rowData.gpsPosition.lng}`;
          navigator.clipboard.writeText(coords);
          toast.info(t('Coordinates copied to clipboard'));
        }}>
                <div>Lat: {rowData.gpsPosition.lat}</div>
                <div>Lng: {rowData.gpsPosition.lng}</div>
              </button>
            </Tooltip> : <span className="text-gray-400">{t('No coordinates')}</span>}
        </div>
  }, {
    header: t('Image'),
    body: rowData => <img src={rowData.imageUrl} alt="City" style={{
      width: '100px',
      height: 'auto'
    }} />
  }, {
    header: t('Screen'),
    body: rowData => <Switch checked={rowData.toDisplayedInMainScreen} onChange={e => editSwitch('toDisplayedInMainScreen', e.target.checked, rowData._id)} />
  }, {
    header: t('Active'),
    body: rowData => <Switch checked={rowData.usedInSojoriSysytem} onChange={e => editSwitch('usedInSojoriSysytem', e.target.checked, rowData._id)} />
  }, {
    header: t('Action'),
    body: (rowData, rowIndex) => <div className="flex gap-1">
          <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenModifyDialog(rowData, rowIndex)}>
            <EditOffIcon className="text-white" />
          </button>
          <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDeleteCity(rowData._id)}>
            <DeleteSweepIcon className="text-white" />
          </button>
        </div>
  }];
  return <div className="card p-4 !border-none">
      <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
        {t('Cities Management')}
      </Typography>
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <FormControl className="w-full md:w-64">
          <InputLabel id="country-filter-label">{t('Filter by Country')}</InputLabel>
          <Select labelId="country-filter-label" id="country-filter" multiple value={selectedCountries.map(country => country._id)} onChange={handleCountryChange} input={<OutlinedInput id="select-multiple-chip" label={t('Filter by Country')} />} renderValue={selected => <Box sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5
        }}>
                {selected.map(value => {
            const country = countries.find(c => c._id === value);
            return <Chip key={value} label={country ? country.name : t('Unknown')} />;
          })}
              </Box>} MenuProps={MenuProps}>
            {countries.map(country => <MenuItem key={country._id} value={country._id}>
                {country.name}
              </MenuItem>)}
          </Select>
        </FormControl>

        <TextField className="w-full md:w-64" label={t('Search by city name')} variant="outlined" onChange={handleSearchChange} InputProps={{
        startAdornment: <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
      }} />

        <Button startIcon={<AddIcon />} onClick={handleOpenAddDialog} className="!bg-medium-aquamarine text-white">
          {t('Add City')}
        </Button>
      </div>
      <div>
        <div className="w-full">
          {isLoading ? <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%'
        }}>
              <CircularProgress style={{
            color: '#00b4b4'
          }} />
            </div> : cities.length > 0 ? <GlobalTable data={cities} columns={columns} hasPagination={true} page={page} limit={limit} totalCount={totalCount} onPageChange={handlePageChange} onLimitChange={handleLimitChange} rowsPerPageOptions={rowsPerPageOptions} isNextDisabled={isNextDisabled} /> : <div className="py-8 text-center text-gray-500">
              {searchText ? t('No cities found matching', {
            searchText
          }) : selectedCountries.length > 0 ? t('No cities found for the selected', {
            count: selectedCountries.length
          }) : t('No cities found. Please select a country to filter or add a new city.')}
            </div>}
        </div>
      </div>
      <AddCityDialog open={openAddDialog} onClose={handleCloseAddDialog} addCity={addCity} />
      <ModifyCityDialog open={openModifyDialog} onClose={handleCloseModifyDialog} onUpdateCity={handleUpdateCity} dataCity={selectedCity} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>;
}
export default CitiesTable;
