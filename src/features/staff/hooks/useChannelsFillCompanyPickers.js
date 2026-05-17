import { useState, useEffect, useCallback } from 'react';
import { fetchChannelsFillCompanyReferencePickers } from '../../../services/channelsDashboardApi';

const FALLBACK_COUNTRIES = [
  {
    ruCode: '344',
    ruName: 'Morocco',
    sojoriName: 'Morocco',
    label: 'Morocco',
    searchText: 'morocco maroc 344',
  },
  {
    ruCode: '20',
    ruName: 'France',
    sojoriName: 'France',
    label: 'France',
    searchText: 'france 20',
  },
  {
    ruCode: '40',
    ruName: 'Spain',
    sojoriName: 'Spain',
    label: 'Spain',
    searchText: 'spain españa 40',
  },
];

function nationalitiesFromCountries(countries) {
  const seen = new Set();
  const out = [];
  for (const c of countries) {
    const v = String(c.sojoriName || '').trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push({
      value: v,
      label: c.label,
      searchText: `${v} ${c.ruName || ''} ${c.ruCode || ''}`.toLowerCase(),
    });
  }
  out.sort((a, b) => a.value.localeCompare(b.value, 'fr', { sensitivity: 'base' }));
  return out;
}

/**
 * @param {boolean} open — ne charge que lorsque le panneau / dialogue est ouvert.
 */
export function useChannelsFillCompanyPickers(open) {
  const [countries, setCountries] = useState([]);
  const [languagesRu, setLanguagesRu] = useState([]);
  const [nationalities, setNationalities] = useState([]);
  const [interfaceLanguageCodes, setInterfaceLanguageCodes] = useState([]);
  const [currencySortOrder, setCurrencySortOrder] = useState(['MAD', 'EUR', 'USD', 'GBP']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchChannelsFillCompanyReferencePickers();
      const body = res.data;
      const d = body?.data;
      if (body?.success && d && Array.isArray(d.countries) && d.countries.length > 0) {
        setCountries(d.countries);
        setLanguagesRu(Array.isArray(d.languagesRu) ? d.languagesRu : []);
        setNationalities(Array.isArray(d.nationalities) ? d.nationalities : nationalitiesFromCountries(d.countries));
        setInterfaceLanguageCodes(Array.isArray(d.interfaceLanguageCodes) ? d.interfaceLanguageCodes : []);
        setCurrencySortOrder(Array.isArray(d.currencySortOrder) ? d.currencySortOrder : ['MAD', 'EUR', 'USD']);
        setUsedFallback(false);
      } else {
        setCountries(FALLBACK_COUNTRIES);
        setLanguagesRu([]);
        setNationalities(nationalitiesFromCountries(FALLBACK_COUNTRIES));
        setInterfaceLanguageCodes([
          { code: 'fr', label: 'Français (fr)' },
          { code: 'en', label: 'English (en)' },
          { code: 'es', label: 'Español (es)' },
        ]);
        setUsedFallback(true);
        setError(body?.error || null);
      }
    } catch (e) {
      setCountries(FALLBACK_COUNTRIES);
      setLanguagesRu([]);
      setNationalities(nationalitiesFromCountries(FALLBACK_COUNTRIES));
      setInterfaceLanguageCodes([
        { code: 'fr', label: 'Français (fr)' },
        { code: 'en', label: 'English (en)' },
        { code: 'es', label: 'Español (es)' },
      ]);
      setUsedFallback(true);
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return {
    countries,
    languagesRu,
    nationalities,
    interfaceLanguageCodes,
    currencySortOrder,
    loading,
    error,
    usedFallback,
    refresh: load,
  };
}
