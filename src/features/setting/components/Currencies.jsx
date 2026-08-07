import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getCurrencies, getLanguages, updateCurrency, deleteCurrency } from '../services/serverApi.adminConfig';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import CurrencySidebar from './CurrencySidebar';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Typography, CircularProgress, Button, Switch } from '@mui/material';
import { styled } from '@mui/material/styles';

const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
};

/** Devises critiques — pas de suppression 1-clic (taux EUR → push prix RU). */
const PROTECTED_CURRENCY_CODES = new Set(['EUR', 'MAD']);

const StyledButton = styled(Button)({
  height: '42px',
  borderRadius: '8px',
  textTransform: 'none',
  fontWeight: 600,
  fontSize: '14px',
  padding: '8px 24px',
  background: `linear-gradient(135deg, ${SOJORI_COLORS.primary} 0%, ${SOJORI_COLORS.primaryDark} 100%)`,
  color: 'white',
  transition: 'all 0.2s ease',
  boxShadow: '0 2px 8px rgba(255, 107, 53, 0.2)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 6px 20px rgba(255, 107, 53, 0.3)',
    background: `linear-gradient(135deg, ${SOJORI_COLORS.primaryDark} 0%, ${SOJORI_COLORS.primary} 100%)`,
  },
});

function Currencies() {
  const { t } = useTranslation('common');
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
    } catch (e) {
      /* ignore */
    }
  };

  const fetchCurrencies = async () => {
    try {
      const response = await getCurrencies();
      setCurrencies(response.data);
    } catch (e) {
      setError(t('Failed_to_load_currencies') || 'Impossible de charger les devises');
    } finally {
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
    if (!savedCurrency?._id) {
      fetchCurrencies();
      return;
    }
    setCurrencies(prev => {
      const exists = prev.some(c => c._id === savedCurrency._id);
      if (exists) {
        return prev.map(c => (c._id === savedCurrency._id ? savedCurrency : c));
      }
      return [...prev, savedCurrency];
    });
  };

  const handleDeleteCurrency = async rowData => {
    const code = String(rowData.currencyCode || '').toUpperCase();
    const name = rowData.currencyName || code;
    if (PROTECTED_CURRENCY_CODES.has(code)) {
      toast.error(
        `Impossible de supprimer ${code}. Modifiez le taux via « Modifier » (crayon).`,
      );
      return;
    }
    const ok = window.confirm(
      `Supprimer définitivement la devise « ${name} » (${code}) ?\n\nCette action est irréversible.`,
    );
    if (!ok) return;
    try {
      await deleteCurrency(rowData._id);
      setCurrencies(prev => prev.filter(c => c._id !== rowData._id));
      toast.success(t('Currency_deleted_successfully'));
    } catch (e) {
      toast.error(t('Failed_to_delete_currency'));
    }
  };

  const handleSwitchChange = async (rowData, field, checked) => {
    try {
      const updatedCurrency = {
        ...rowData,
        [field]: checked,
      };
      const response = await updateCurrency(rowData._id, updatedCurrency);
      if (response && response.currency) {
        setCurrencies(prev =>
          prev.map(c => (c._id === rowData._id ? response.currency : c)),
        );
        toast.success(response.message || t('Currency_updated_successfully'));
      } else {
        throw new Error('Unexpected response structure');
      }
    } catch (error) {
      toast.error(`Error updating currency: ${error.message}`);
    }
  };

  const columns = [
    {
      header: t('Name'),
      body: rowData => <span>{rowData.currencyName}</span>,
    },
    {
      header: t('Code'),
      body: rowData => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{rowData.currencyCode}</span>
      ),
    },
    {
      header: t('Symbol'),
      body: rowData => <span>{rowData.currencySymbol}</span>,
    },
    {
      header: t('Min'),
      body: rowData => <span>{rowData.min}</span>,
    },
    {
      header: t('Max'),
      body: rowData => <span>{rowData.max}</span>,
    },
    {
      header: 'Taux → MAD',
      body: rowData => (
        <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
          {rowData.madRate != null && rowData.madRate !== '' ? rowData.madRate : '—'}
        </span>
      ),
    },
    {
      header: t('Languages'),
      body: rowData => (
        <span>
          {Array.isArray(rowData.languageId) && rowData.languageId.length > 0
            ? rowData.languageId
                .map(id => {
                  const language = languages.find(lang => lang._id === id);
                  return language ? language.name : id;
                })
                .join(', ')
            : t('No_languages')}
        </span>
      ),
    },
    {
      header: t('Translate'),
      body: rowData => (
        <Switch
          checked={rowData.useInTranslate}
          onChange={event => handleSwitchChange(rowData, 'useInTranslate', event.target.checked)}
        />
      ),
    },
    {
      header: t('Default'),
      body: rowData => (
        <Switch
          checked={rowData.defaultCurrency}
          onChange={event => handleSwitchChange(rowData, 'defaultCurrency', event.target.checked)}
        />
      ),
    },
    {
      header: t('Action'),
      body: rowData => {
        const code = String(rowData.currencyCode || '').toUpperCase();
        const protectedRow = PROTECTED_CURRENCY_CODES.has(code);
        return (
          <div className="flex gap-2 items-center">
            <button
              type="button"
              title="Modifier"
              aria-label={`Modifier ${code}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 !rounded-md text-white text-xs font-bold"
              style={{ background: '#0d9488' }}
              onClick={() => handleOpenSidebar(rowData)}
            >
              <EditIcon sx={{ fontSize: 16 }} />
              Modifier
            </button>
            <button
              type="button"
              title={
                protectedRow
                  ? `${code} protégée — impossible de supprimer`
                  : `Supprimer ${code}`
              }
              aria-label={`Supprimer ${code}`}
              disabled={protectedRow}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 !rounded-md text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: protectedRow ? '#9ca3af' : '#df5454' }}
              onClick={() => handleDeleteCurrency(rowData)}
            >
              <DeleteIcon sx={{ fontSize: 16 }} />
              Supprimer
            </button>
          </div>
        );
      },
    },
  ];

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-64 text-red-500">{error}</div>
    );
  }

  const eur = currencies.find(c => String(c.currencyCode).toUpperCase() === 'EUR');

  return (
    <div className="card px-4 pb-4 !border-none">
      <div className="flex justify-between items-center my-2 gap-2 flex-wrap">
        <Typography sx={{ fontSize: 12, color: '#616161', maxWidth: 720 }}>
          Colonne <b>Taux → MAD</b> : 1 unité = X MAD. Pour <b>EUR</b>, cliquez{' '}
          <b>Modifier</b> puis renseignez « Taux → MAD » (alimente le push prix RU).
          Actuel EUR : <b>{eur?.madRate ?? '—'}</b>
          {' · '}
          marché ≈ <b>10,74</b> · fallback code <b>10,6</b> si absent.
        </Typography>
        <StyledButton onClick={() => handleOpenSidebar()}>{t('Create_New_Currency')}</StyledButton>
      </div>
      <div className="w-full">
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 120,
            }}
          >
            <CircularProgress style={{ color: '#00b4b4' }} />
          </div>
        ) : (
          <GlobalTable data={currencies} columns={columns} hasPagination={false} />
        )}
      </div>
      <CurrencySidebar
        open={sidebarOpen}
        onClose={handleCloseSidebar}
        onSave={handleSaveCurrency}
        existingCurrency={selectedCurrency}
        languages={languages}
        canUpdate={true}
        canCreate={true}
      />
    </div>
  );
}

export default Currencies;
