import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrencies, getLanguages, updateCurrency, deleteCurrency } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import CurrencySidebar from './CurrencySidebar';
import { toast } from 'react-toastify';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { Typography, CircularProgress, Button, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';
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
const StyledButton = styled(Button)({
  height: '42px',
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '14px',
  padding: '8px 24px',
  background: 'linear-gradient(135deg, #E6B022 0%, #B8881A 100%)',
  color: 'white',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: 'linear-gradient(135deg, #B8881A 0%, #E6B022 100%)'
  },
  '&:active': {
    transform: 'translateY(0)'
  }
});
function Currencies() {
  const {
    t
  } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(true);
  const [currencies, setCurrencies] = useState([]);
  const [languages, setLanguages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    fetchCurrencies();
    fetchLanguages();
  }, []);
  const fetchLanguages = async () => {
    try {
      const response = await getLanguages();
      setLanguages(response);
    } catch (error) {}
  };
  const fetchCurrencies = async () => {
    try {
      const response = await getCurrencies();
      setCurrencies(response.data);
    } catch (error) {} finally {
      setIsLoading(false);
    }
  };
  const handleOpenSidebar = (currency = null) => {
    setSelectedCurrency(currency);
    setSidebarOpen(true);
  };
  const handleCloseSidebar = () => {
    setSelectedCurrency(null);
    setSidebarOpen(false);
  };
  const handleSaveCurrency = savedCurrency => {
    if (selectedCurrency) {
      // Update existing currency
      setCurrencies(prevCurrencies => prevCurrencies.map(currency => currency._id === savedCurrency._id ? savedCurrency : currency));
    } else {
      // Add new currency
      setCurrencies(prevCurrencies => [...prevCurrencies, savedCurrency]);
    }
  };
  const handleDeleteCurrency = async currencyId => {
    if (window.confirm(t('Confirm_delete_currency'))) {
      try {
        await deleteCurrency(currencyId);
        setCurrencies(currencies.filter(currency => currency._id !== currencyId));
        toast.success(t('Currency_deleted_successfully'));
      } catch (error) {
        toast.error(t('Failed_to_delete_currency'));
      }
    }
  };
  const handleSwitchChange = async (rowData, field, checked) => {
    try {
      const updatedCurrency = {
        ...rowData,
        [field]: checked
      };
      const response = await updateCurrency(rowData._id, updatedCurrency);
      if (response && response.currency) {
        setCurrencies(prevCurrencies => prevCurrencies.map(currency => currency._id === rowData._id ? response.currency : currency));
        toast.success(response.message || t('Currency_updated_successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      toast.error(`Error updating currency: ${error.message}`);
    }
  };
  const columns = [{
    header: t('Name'),
    body: rowData => <span>{rowData.currencyName}</span>
  }, {
    header: t('Code'),
    body: rowData => <span>{rowData.currencyCode}</span>
  }, {
    header: t('Symbol'),
    body: rowData => <span>{rowData.currencySymbol}</span>
  }, {
    header: t('Min'),
    body: rowData => <span>{rowData.min}</span>
  }, {
    header: t('Max'),
    body: rowData => <span>{rowData.max}</span>
  }, {
    header: 'Taux → MAD',
    body: rowData => <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
      {rowData.madRate != null && rowData.madRate !== '' ? rowData.madRate : '—'}
    </span>
  }, {
    header: t('Languages'),
    body: rowData => <span>
          {Array.isArray(rowData.languageId) && rowData.languageId.length > 0 ? rowData.languageId.map(id => {
        const language = languages.find(lang => lang._id === id);
        return language ? language.name : id;
      }).join(', ') : t('No_languages')}
        </span>
  }, {
    header: t('Translate'),
    body: rowData => <Switch checked={rowData.useInTranslate} onChange={event => handleSwitchChange(rowData, 'useInTranslate', event.target.checked)} />
  }, {
    header: t('Default'),
    body: rowData => <Switch checked={rowData.defaultCurrency} onChange={event => handleSwitchChange(rowData, 'defaultCurrency', event.target.checked)} />
  }, {
    header: t('Action'),
    body: rowData => <div className="flex gap-1">
          <button className="px-2 py-1 bg-medium-aquamarine !rounded-md" onClick={() => handleOpenSidebar(rowData)}>
            <EditOffIcon className="text-white" />
          </button>
          <button className="px-2 py-1 bg-[#df5454] !rounded-md" onClick={() => handleDeleteCurrency(rowData._id)}>
            <DeleteSweepIcon className="text-white" />
          </button>
        </div>
  }];
  if (error) {
    return <div className="flex items-center justify-center w-full h-64 text-red-500">{error}</div>;
  }
  return <div className="card px-4 pb-4 !border-none">
      {/* <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
        {t('Currency_Management')}
       </Typography> */}
      <div className="flex justify-between items-center my-2 gap-2 flex-wrap">
        <Typography sx={{ fontSize: 12, color: '#616161', maxWidth: 640 }}>
          Colonne <b>Taux → MAD</b> : 1 unité de devise = X MAD. Pour <b>EUR</b>, ce taux alimente le push prix RU/Airbnb.
          Aujourd’hui marché ≈ <b>10,67</b>. À ajuster manuellement (automation quotidienne plus tard).
        </Typography>
        <StyledButton onClick={() => handleOpenSidebar()}>
          {t('Create_New_Currency')}
        </StyledButton>
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
            </div> : <GlobalTable data={currencies} columns={columns} hasPagination={false} />}
        </div>
      </div>
      <CurrencySidebar open={sidebarOpen} onClose={handleCloseSidebar} onSave={handleSaveCurrency} existingCurrency={selectedCurrency} languages={languages} canUpdate={true} canCreate={true} />
    </div>;
}
export default Currencies;
