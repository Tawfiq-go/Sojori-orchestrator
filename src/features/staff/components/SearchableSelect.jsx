import React from 'react';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

const defaultFilterOptions = createFilterOptions({
  matchFrom: 'any',
  stringify: (option) =>
    option.searchText || option.label || String(option.value ?? option.ruCode ?? ''),
});

/**
 * Sélecteur searchable (MUI Autocomplete) pour listes longues (pays RU, langues, etc.).
 */
export default function SearchableSelect({
  label,
  options = [],
  optionValueKey,
  getOptionLabel,
  value,
  onChange,
  error = false,
  helperText,
  disabled = false,
  size = 'small',
  placeholder,
  filterOptions = defaultFilterOptions,
  noOptionsText,
  listboxProps,
}) {
  const selected = options.find((o) => String(o[optionValueKey]) === String(value ?? '')) ?? null;
  return (
    <Autocomplete
      disabled={disabled}
      options={options}
      loading={false}
      value={selected}
      onChange={(_, opt) => onChange(opt ? String(opt[optionValueKey]) : '')}
      getOptionLabel={(o) => (o ? getOptionLabel(o) : '')}
      isOptionEqualToValue={(a, b) => String(a?.[optionValueKey]) === String(b?.[optionValueKey])}
      filterOptions={filterOptions}
      noOptionsText={noOptionsText}
      slotProps={{
        listbox: { style: { maxHeight: 280 }, ...listboxProps },
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          size={size}
        />
      )}
    />
  );
}
