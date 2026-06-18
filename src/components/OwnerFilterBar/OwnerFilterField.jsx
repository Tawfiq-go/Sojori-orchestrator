import React from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useAdminOwnerFilter } from 'context/AdminOwnerFilterContext';
import { getOwnerListLabel } from 'utils/ownerDisplay.utils';

const ALL_SENTINEL = { __all: true, _id: '' };

/**
 * Propriétaire selector for admins (same data as the global bar) — use inline in toolbars.
 * @param {number} [toolbarInputHeight] e.g. 40 to match reservation / listing toolbars
 * @param {boolean} [requireSelection] when true, hide "all owners" — dashboard admin must pick one owner
 */
export default function OwnerFilterField({ toolbarInputHeight, requireSelection = false, sx, ...rest }) {
  const { t } = useTranslation('common');
  const { showOwnerFilter, selectedOwnerId, setSelectedOwnerId, owners, ownersLoading } = useAdminOwnerFilter();
  if (!showOwnerFilter) return null;
  const ownerRows = (owners || []).filter((o) => o?._id != null || o?.id != null);
  const options = requireSelection ? ownerRows : [ALL_SENTINEL, ...ownerRows];
  const value = selectedOwnerId
    ? (owners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) || null
    : requireSelection
      ? null
      : ALL_SENTINEL;

  /** Floating labels sit above the field and get clipped by toolbar overflow:hidden / alignItems:center */
  const compactToolbar = Boolean(toolbarInputHeight);

  const inputSx = toolbarInputHeight
    ? {
        '& .MuiOutlinedInput-root': {
          height: toolbarInputHeight,
          boxSizing: 'border-box',
        },
      }
    : {};

  const ownerAria = t('Owner', 'Propriétaire');

  return (
    <Autocomplete
      size="small"
      loading={ownersLoading}
      options={options}
      value={value}
      onChange={(_, o) => {
        if (!o || o === ALL_SENTINEL || o?.__all) {
          setSelectedOwnerId('');
          return;
        }
        setSelectedOwnerId(String(o._id ?? o.id));
      }}
      isOptionEqualToValue={(a, b) => {
        if (a?.__all && b?.__all) return true;
        return String(a?._id ?? a?.id) === String(b?._id ?? b?.id);
      }}
      getOptionLabel={(o) => {
        if (!o || o?.__all) return t('All owners', 'Tous les propriétaires');
        return getOwnerListLabel(o);
      }}
      noOptionsText={requireSelection ? t('No owners', 'Aucun propriétaire') : undefined}
      ListboxProps={{ style: { maxHeight: 360 } }}
      sx={{
        minWidth: 200,
        maxWidth: 300,
        overflow: 'visible',
        ...inputSx,
        ...sx,
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          hiddenLabel={compactToolbar}
          label={compactToolbar ? undefined : 'Propriétaire'}
          placeholder={
            compactToolbar
              ? undefined
              : requireSelection
                ? t('Select owner', 'Choisir un propriétaire…')
                : t('Search owner', 'Rechercher un propriétaire...')
          }
          inputProps={{
            ...params.inputProps,
            ...(compactToolbar ? { 'aria-label': ownerAria } : {}),
          }}
        />
      )}
      {...rest}
    />
  );
}
