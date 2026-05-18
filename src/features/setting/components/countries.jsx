import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getcountries, removeCountry } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import AddCountryDialog from '../components/AddCountry.component';
import ModifyCountryManDialog from '../components/ModifyCountries.component';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Typography, CircularProgress, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
function CountriesTable() {
  const {
    t
  } = useTranslation('common');
  const [countries, setCountries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openModifyDialog, setOpenModifyDialog] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCountryIndex, setSelectedCountryIndex] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchCountries();
  }, []);
  const fetchCountries = async () => {
    setIsLoading(true);
    try {
      const response = await getcountries();
      setCountries(response.data);
      setError(null);
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  const handleOpenAddDialog = () => setOpenAddDialog(true);
  const handleCloseAddDialog = () => setOpenAddDialog(false);
  const handleOpenModifyDialog = (country, index) => {
    setSelectedCountry(country);
    setSelectedCountryIndex(index);
    setOpenModifyDialog(true);
  };
  const handleCloseModifyDialog = () => {
    setSelectedCountry(null);
    setSelectedCountryIndex(null);
    setOpenModifyDialog(false);
  };
  const handleDeleteCountry = async countryId => {
    if (window.confirm(t('Are you sure you want to delete this country?'))) {
      try {
        await removeCountry(countryId);
        setCountries(countries.filter(country => country._id !== countryId));
        toast.success(t('Country deleted successfully'));
      } catch (error) {
        toast.error(t('Failed to delete country'));
      }
    }
  };
  const addCountry = newCountry => {
    setCountries([...countries, newCountry.data?.country]);
    handleCloseAddDialog();
  };
  const handleUpdateCountry = updatedCountry => {
    const updatedCountries = [...countries];
    updatedCountries[selectedCountryIndex] = updatedCountry;
    setCountries(updatedCountries);
  };
  const columns = [{
    header: t('Name'),
    body: rowData => <span>{rowData.name}</span>
  }, {
    header: t('Currency'),
    body: rowData => <span>{rowData.currency}</span>
  }, {
    header: t('Country Code'),
    body: rowData => <span>{rowData.countryCode}</span>
  }, {
    header: t('Rental Country ID'),
    body: rowData => <span>{rowData.rentalCountryId || '-'}</span>
  }, {
    header: t('Action'),
    body: (rowData, rowIndex) => <div className="flex gap-1">
          <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenModifyDialog(rowData, rowIndex)}>
            <EditOffIcon className="text-white" />
          </button>
          <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDeleteCountry(rowData._id)}>
            <DeleteSweepIcon className="text-white" />
          </button>
        </div>
  }];

  // if (error) {
  //   return <div className="flex items-center justify-center w-full h-64 text-red-500">{t('Failed to fetch countries. Please try again later.')}</div>;
  // }

  return <div className="card p-4 !border-none">
      <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
        {t('Countries Management')}
      </Typography>
      <div className="mb-4">
        <Button startIcon={<AddIcon />} onClick={handleOpenAddDialog} className="float-right !bg-medium-aquamarine text-white">
          {t('Add Country')}
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
            </div> : <GlobalTable data={countries} columns={columns} hasPagination={false} />}
        </div>
      </div>
      <AddCountryDialog open={openAddDialog} onClose={handleCloseAddDialog} addCountry={addCountry} />
      <ModifyCountryManDialog open={openModifyDialog} onClose={handleCloseModifyDialog} onUpdateCountry={handleUpdateCountry} dataCountry={selectedCountry} />
      <ToastContainer position="top-right" autoClose={3000} />
    </div>;
}
export default CountriesTable;
