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

const FALLBACK_RU_LANGUAGES = [
  {
    ruCode: '1',
    ruName: 'English',
    sojoriName: 'English',
    label: 'English (RU 1)',
    searchText: 'english anglais en 1',
  },
  {
    ruCode: '2',
    ruName: 'French',
    sojoriName: 'French',
    label: 'French / Francais (RU 2)',
    searchText: 'french francais français fr 2',
  },
  {
    ruCode: '3',
    ruName: 'Spanish',
    sojoriName: 'Spanish',
    label: 'Spanish / Espanol (RU 3)',
    searchText: 'spanish espanol espagnol es 3',
  },
];

function normalizeRuLanguages(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => {
      const ruCode = String(row?.ruCode ?? row?.languageId ?? row?.id ?? '').trim();
      if (!ruCode) return null;
      const ruName = String(row?.ruName ?? row?.name ?? '').trim();
      const sojoriName = String(row?.sojoriName ?? row?.label ?? ruName).trim();
      return {
        ...row,
        ruCode,
        ruName,
        sojoriName,
        label: row?.label || `${sojoriName || ruName || ruCode} (RU ${ruCode})`,
        searchText: String(row?.searchText || `${sojoriName} ${ruName} ${ruCode}`).toLowerCase(),
      };
    })
    .filter(Boolean);
}

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
        const languageOptions = normalizeRuLanguages(d.languagesRu);
        setCountries(d.countries);
        setLanguagesRu(languageOptions.length > 0 ? languageOptions : FALLBACK_RU_LANGUAGES);
        setNationalities(Array.isArray(d.nationalities) ? d.nationalities : nationalitiesFromCountries(d.countries));
        setInterfaceLanguageCodes(Array.isArray(d.interfaceLanguageCodes) ? d.interfaceLanguageCodes : []);
        setCurrencySortOrder(Array.isArray(d.currencySortOrder) ? d.currencySortOrder : ['MAD', 'EUR', 'USD']);
        setUsedFallback(languageOptions.length === 0);
      } else {
        setCountries(FALLBACK_COUNTRIES);
        setLanguagesRu(FALLBACK_RU_LANGUAGES);
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
      setLanguagesRu(FALLBACK_RU_LANGUAGES);
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
