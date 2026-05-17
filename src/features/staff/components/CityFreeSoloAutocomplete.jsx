import React, { useEffect, useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { getCities, normalizeCitiesApiResponse } from '../services/serverApi.task';

function normalizePropCities(raw) {
  return normalizeCitiesApiResponse(raw);
}

/**
 * Ville FillCompany / RU : **texte libre** (nom affiché dans le XML) + suggestions depuis le catalogue Sojori.
 * Si le parent ne fournit pas de liste, recharge via `getCities` (y compris `allCities` côté admin).
 */
export default function CityFreeSoloAutocomplete({
  value,
  onChange,
  cities: citiesProp,
  label,
  error = false,
  helperText,
  disabled = false,
  size = 'small',
}) {
  const { t } = useTranslation('common');
  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);

  const fromParent = useMemo(() => normalizePropCities(citiesProp), [citiesProp]);

  useEffect(() => {
    if (fromParent.length > 0) return;
    let cancelled = false;
    setLoading(true);
    getCities({ limit: 3000, paged: false, search_text: '', allCities: true })
      .then((list) => {
        if (!cancelled) setFetched(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setFetched([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fromParent.length]);

  const merged = fromParent.length > 0 ? fromParent : fetched;
  const options = useMemo(() => {
    const names = merged.map((c) => c?.name).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
  }, [merged]);

  const hint = t('fillCompanyCityRuHint', {
    defaultValue:
      'RU attend le nom de la ville en texte. Vous pouvez saisir librement ou choisir une suggestion Sojori.',
  });

  return (
    <Autocomplete
      freeSolo
      disabled={disabled || loading}
      options={options}
      value={value ?? ''}
      onChange={(_, newValue) => {
        onChange(newValue == null ? '' : String(newValue));
      }}
      onInputChange={(_, newInputValue, reason) => {
        if (reason === 'input' || reason === 'clear') onChange(newInputValue ?? '');
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          error={error}
          helperText={helperText ? helperText : hint}
          size={size}
        />
      )}
    />
  );
}
