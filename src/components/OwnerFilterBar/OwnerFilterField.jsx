import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Autocomplete, Box, TextField, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';
import {
  useAdminOwnerFilter,
  ADMIN_SCOPE_ALL,
  ADMIN_SCOPE_OWNER,
  ADMIN_SCOPE_UNSET,
} from 'context/AdminOwnerFilterContext';
import { getOwners } from 'services/teamDashboardApi';
import { getOwnerListLabel } from 'utils/ownerDisplay.utils';
import { autocompleteOptionLiProps } from 'utils/autocompleteOptionLiProps';
import {
  ORCHESTRATION_ADMIN_OWNER_ID,
  isOrchestrationAdminOwnerRow,
} from 'constants/orchestrationAdmin';

const ALL_SENTINEL = { __all: true, _id: '' };
const TEMPLATE_ADMIN_SENTINEL = {
  __templateAdmin: true,
  _id: ORCHESTRATION_ADMIN_OWNER_ID,
  label: 'Template Admin',
};

function ownerRowId(o) {
  if (!o || o.__all || o.__templateAdmin) return '';
  return String(o._id ?? o.id ?? '').trim();
}

/**
 * Propriétaire selector for admins (same data as the global bar) — use inline in toolbars.
 * @param {number} [toolbarInputHeight] e.g. 40 to match reservation / listing toolbars
 * @param {boolean} [requireSelection] when true, hide "all owners" — legacy (analytics, etc.)
 * @param {boolean} [explicitScope] tri-state: vide → Tous (plateforme) | un PM (dashboard admin)
 * @param {boolean} [templateAdminFirst] Template Admin en tête (modèle orchestration) — pas « Tous »
 */
export default function OwnerFilterField({
  toolbarInputHeight,
  requireSelection = false,
  explicitScope = false,
  templateAdminFirst = false,
  sx,
  ...rest
}) {
  const { t } = useTranslation('common');
  const {
    showOwnerFilter,
    selectedOwnerId,
    setScopeAll,
    setScopeOwner,
    adminScopeMode,
    owners: contextOwners,
    ownersLoading: contextOwnersLoading,
  } = useAdminOwnerFilter();

  const [searchText, setSearchText] = useState('');
  const [remoteOwners, setRemoteOwners] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');

  const fetchRemoteOwners = useCallback(async (q) => {
    setRemoteLoading(true);
    setRemoteError('');
    try {
      const res = await getOwners({
        page: 0,
        limit: 100,
        deleted: false,
        banned: false,
        search_text: (q || '').trim(),
      });
      const rows = Array.isArray(res?.data) ? res.data : [];
      setRemoteOwners(rows.filter((o) => ownerRowId(o)));
    } catch {
      setRemoteOwners([]);
      setRemoteError('Impossible de charger les PM — vérifiez votre session.');
    } finally {
      setRemoteLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showOwnerFilter || !explicitScope) return;
    const delay = searchText ? 280 : 0;
    const timer = setTimeout(() => void fetchRemoteOwners(searchText), delay);
    return () => clearTimeout(timer);
  }, [showOwnerFilter, explicitScope, searchText, fetchRemoteOwners]);

  if (!showOwnerFilter) return null;

  const ownerSource = explicitScope ? remoteOwners : contextOwners || [];
  const ownerRows = ownerSource.filter((o) => ownerRowId(o));
  const pmRows = templateAdminFirst
    ? ownerRows.filter((o) => !isOrchestrationAdminOwnerRow(o))
    : ownerRows;
  const options = templateAdminFirst
    ? [TEMPLATE_ADMIN_SENTINEL, ...pmRows]
    : requireSelection
      ? ownerRows
      : [ALL_SENTINEL, ...ownerRows];
  const ownersLoading = explicitScope ? remoteLoading : contextOwnersLoading;
  const templateAdminLabel = 'Template Admin';
  const allLabel = t('All (platform)', 'Tous (plateforme)');

  const resolveValue = () => {
    if (templateAdminFirst) {
      const sel = String(selectedOwnerId || '').trim();
      if (
        !sel ||
        sel === ORCHESTRATION_ADMIN_OWNER_ID ||
        adminScopeMode === ADMIN_SCOPE_ALL ||
        adminScopeMode === ADMIN_SCOPE_UNSET
      ) {
        return TEMPLATE_ADMIN_SENTINEL;
      }
      const hit =
        pmRows.find((o) => String(o?._id ?? o?.id) === sel) ||
        contextOwners?.find((o) => String(o?._id ?? o?.id) === sel);
      if (hit && isOrchestrationAdminOwnerRow(hit)) return TEMPLATE_ADMIN_SENTINEL;
      return hit || TEMPLATE_ADMIN_SENTINEL;
    }
    if (explicitScope) {
      if (adminScopeMode === ADMIN_SCOPE_UNSET) return null;
      if (adminScopeMode === ADMIN_SCOPE_ALL) return ALL_SENTINEL;
      if (adminScopeMode === ADMIN_SCOPE_OWNER && selectedOwnerId) {
        return (
          ownerRows.find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) ||
          contextOwners?.find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) ||
          null
        );
      }
      return null;
    }
    if (selectedOwnerId) {
      return (contextOwners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) || null;
    }
    return requireSelection ? null : ALL_SENTINEL;
  };

  const value = resolveValue();
  const compactToolbar = Boolean(toolbarInputHeight);
  const ownerAria = t('Owner', 'Propriétaire');

  const inputSx = toolbarInputHeight
    ? {
        '& .MuiOutlinedInput-root': {
          height: toolbarInputHeight,
          boxSizing: 'border-box',
        },
      }
    : {};

  const handleChange = (_, o) => {
    if (templateAdminFirst) {
      if (!o || o.__templateAdmin) {
        setScopeOwner(ORCHESTRATION_ADMIN_OWNER_ID);
        return;
      }
      setScopeOwner(String(o._id ?? o.id));
      return;
    }
    if (explicitScope) {
      if (!o) return;
      if (o === ALL_SENTINEL || o?.__all) {
        setScopeAll();
        return;
      }
      setScopeOwner(String(o._id ?? o.id));
      return;
    }
    if (!o || o === ALL_SENTINEL || o?.__all) {
      setScopeAll();
      return;
    }
    setScopeOwner(String(o._id ?? o.id));
  };

  const popperSlot = useMemo(
    () => ({
      popper: {
        sx: { zIndex: 1500 },
        placement: 'bottom-start',
      },
      listbox: { style: { maxHeight: 360 } },
    }),
    [],
  );

  return (
    <Box sx={{ minWidth: 200, maxWidth: 340, ...sx }}>
      <Autocomplete
        size="small"
        openOnFocus
        autoHighlight
        disableClearable={templateAdminFirst || (explicitScope && value != null)}
        loading={ownersLoading}
        options={options}
        value={value}
        onChange={handleChange}
        onOpen={() => {
          if (explicitScope && !remoteOwners.length && !remoteLoading) {
            void fetchRemoteOwners(searchText);
          }
        }}
        onInputChange={(_, v, reason) => {
          if (explicitScope && (reason === 'input' || reason === 'clear')) {
            setSearchText(v);
          }
        }}
        filterOptions={(rows, state) => {
          if (explicitScope && !templateAdminFirst) return rows;
          const q = state.inputValue.trim().toLowerCase();
          if (!q) return rows;
          return rows.filter((o) => {
            if (o?.__all || o?.__templateAdmin) return true;
            const label = getOwnerListLabel(o).toLowerCase();
            const email = String(o?.email ?? '').toLowerCase();
            const company = String(o?.fillCompany?.companyName ?? o?.companyName ?? '').toLowerCase();
            return label.includes(q) || email.includes(q) || company.includes(q);
          });
        }}
        isOptionEqualToValue={(a, b) => {
          if (a?.__templateAdmin && b?.__templateAdmin) return true;
          if (a?.__all && b?.__all) return true;
          return String(a?._id ?? a?.id) === String(b?._id ?? b?.id);
        }}
        getOptionLabel={(o) => {
          if (o?.__templateAdmin) return templateAdminLabel;
          if (!o || o?.__all) {
            return explicitScope ? allLabel : t('All owners', 'Tous les propriétaires');
          }
          return getOwnerListLabel(o);
        }}
        getOptionKey={(o) =>
          o?.__templateAdmin
            ? '__templateAdmin__'
            : o?.__all
              ? '__all__'
              : String(o?._id ?? o?.id)
        }
        noOptionsText={
          ownersLoading
            ? t('Loading…', 'Chargement…')
            : remoteError || t('No owners', 'Aucun propriétaire')
        }
        loadingText={t('Loading owners…', 'Chargement des propriétaires…')}
        slotProps={popperSlot}
        sx={{
          minWidth: 200,
          maxWidth: 340,
          overflow: 'visible',
          ...inputSx,
        }}
        renderOption={(props, option) => {
          const { key, liProps } = autocompleteOptionLiProps(props);
          if (option?.__templateAdmin) {
            return (
              <Box component="li" key={key} {...liProps}>
                <Typography variant="body2" fontWeight={700}>
                  {templateAdminLabel}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Référence propagée vers les PM
                </Typography>
              </Box>
            );
          }
          if (option?.__all) {
            return (
              <Box component="li" key={key} {...liProps}>
                <Typography variant="body2" fontWeight={700}>
                  {allLabel}
                </Typography>
              </Box>
            );
          }
          const secondary = [option?.email, option?.fillCompany?.companyName || option?.companyName]
            .filter(Boolean)
            .join(' · ');
          return (
            <Box component="li" key={key} {...liProps}>
              <Typography variant="body2" fontWeight={600}>
                {getOwnerListLabel(option)}
              </Typography>
              {secondary ? (
                <Typography variant="caption" color="text.secondary" display="block">
                  {secondary}
                </Typography>
              ) : null}
            </Box>
          );
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={compactToolbar || explicitScope ? undefined : 'Propriétaire'}
            placeholder={
              templateAdminFirst
                ? templateAdminLabel
                : explicitScope
                  ? t('Tous (plateforme) ou un PM…', 'Tous (plateforme) ou un PM…')
                  : compactToolbar
                    ? ownerAria
                    : requireSelection
                      ? t('Select owner', 'Choisir un propriétaire…')
                      : t('Search owner', 'Rechercher un propriétaire...')
            }
          />
        )}
        {...rest}
      />
      {explicitScope && remoteError ? (
        <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
          {remoteError}
        </Typography>
      ) : null}
    </Box>
  );
}
