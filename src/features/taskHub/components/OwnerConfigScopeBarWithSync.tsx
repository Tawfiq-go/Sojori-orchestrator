import type { AutocompleteRenderInputParams } from '@mui/material/Autocomplete';
import { Box, Chip, Stack, Typography, Autocomplete, TextField, Checkbox } from '@mui/material';
import type { ReactNode } from 'react';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { toast } from 'react-toastify';
import SojoriPrimButton from '../../../components/ui/SojoriPrimButton';
import { useState, useEffect } from 'react';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import { ORCHESTRATION_ADMIN_OWNER_ID, ORCHESTRATION_ADMIN_EMAIL } from '../../../constants/orchestrationAdmin';
import type { FulltaskConfigOwnerScope } from '../../../hooks/useFulltaskConfigOwner';
import { getOwnersAllPages } from '../../staff/services/serverApi.task';

export type ListingSyncOption = { id: string; name: string; location?: string };

type Props = FulltaskConfigOwnerScope & {
  compact?: boolean;
  /**
   * owners = Admin global → copie vers template PM.
   * admin-pm = Admin sur un PM → sync PM + sync annonces (toutes ou cochées).
   * listings = PM connecté → copie vers annonces (toutes ou une).
   */
  syncMode?: 'owners' | 'admin-pm' | 'listings';
  /** Admin : global → un PM (template owner uniquement). */
  onSyncToOwner?: (targetOwnerId: string, targetOwnerName: string) => Promise<void>;
  /** Admin : global → tous les PMs. */
  onSyncToAllOwners?: () => Promise<void>;
  /** Template PM → toutes les annonces du PM connecté (bulk API). Admin-pm : ne pas utiliser. */
  onSyncAllListings?: () => Promise<void>;
  /** Annonces cochées uniquement (admin-pm obligatoire, PM optionnel). */
  onSyncSelectedListings?: (listingIds: string[]) => Promise<void>;
  /** PM : template owner → une annonce. */
  onSyncOneListing?: (listingId: string, listingName: string) => Promise<void>;
  listingOptions?: ListingSyncOption[];
  /** PM : une annonce dans l’autocomplete simple. */
  selectedListingId?: string | null;
  onListingChange?: (listingId: string | null) => void;
  /** Admin-pm : multi-sélection annonces. */
  selectedListingIds?: string[];
  onListingSelectionChange?: (listingIds: string[]) => void;
  listingsLoading?: boolean;
  /** Orchestration admin tabs: sync cible l’onglet actif plutôt que le filtre principal. */
  syncContextOwnerId?: string | null;
};

const ADMIN_SENTINEL = {
  __admin: true,
  _id: ORCHESTRATION_ADMIN_OWNER_ID,
  label: 'Admin (template global)',
};

function isAdminOwnerRow(owner: { _id?: string; id?: string; email?: string }): boolean {
  const id = String(owner?._id ?? owner?.id ?? '');
  if (id === ORCHESTRATION_ADMIN_OWNER_ID) return true;
  return (owner.email || '').toLowerCase().trim() === ORCHESTRATION_ADMIN_EMAIL;
}
const checkboxIcon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkboxCheckedIcon = <CheckBoxIcon fontSize="small" />;

function renderAutocompleteField(
  params: AutocompleteRenderInputParams,
  label: string,
  placeholder?: string,
  ariaLabel?: string,
) {
  return (
    <TextField
      label={label}
      placeholder={placeholder}
      {...params}
      slotProps={{
        ...params.slotProps,
        htmlInput: {
          ...params.slotProps.htmlInput,
          ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        },
      }}
    />
  );
}

export default function OwnerConfigScopeBarWithSync({
  ownerDisplayName,
  showOwnerPicker,
  isAdminTemplate,
  compact = false,
  syncMode: syncModeProp,
  onSyncToOwner,
  onSyncToAllOwners,
  onSyncAllListings,
  onSyncSelectedListings,
  onSyncOneListing,
  listingOptions = [],
  selectedListingId = null,
  onListingChange,
  selectedListingIds = [],
  onListingSelectionChange,
  listingsLoading = false,
  syncContextOwnerId,
}: Props) {
  const syncMode =
    syncModeProp ??
    (onSyncSelectedListings || onSyncAllListings ? 'listings' : 'owners');

  const contextValue = useAdminOwnerFilter();
  const { selectedOwnerId, setSelectedOwnerId, owners: contextOwners, ownersLoading: contextLoading } =
    contextValue;
  const [syncingPm, setSyncingPm] = useState(false);
  const [syncingListings, setSyncingListings] = useState(false);
  const [localOwners, setLocalOwners] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const syncing = syncingPm || syncingListings;
  const shouldShowFilter = showOwnerPicker || isAdminTemplate;
  const showListingSinglePicker = syncMode === 'listings' && listingOptions.length > 0;
  const showListingMultiPicker = syncMode === 'admin-pm';

  useEffect(() => {
    if (!shouldShowFilter) return;
    if (contextOwners && contextOwners.length > 0) {
      setLocalOwners(contextOwners);
      return;
    }

    let cancelled = false;
    setLocalLoading(true);
    getOwnersAllPages({ search_text: '' })
      .then((rows) => {
        if (!cancelled) setLocalOwners(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('[OwnerConfigScopeBarWithSync] Failed to load owners', err);
          setLocalOwners([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLocalLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldShowFilter, contextOwners]);

  const owners = contextOwners && contextOwners.length > 0 ? contextOwners : localOwners;
  const ownersLoading = contextLoading || localLoading;

  const selectedListing = listingOptions.find((l) => l.id === selectedListingId) ?? null;
  const selectedListingsMulti = listingOptions.filter((l) => selectedListingIds.includes(l.id));

  const syncOwnerId =
    syncContextOwnerId !== undefined && syncContextOwnerId !== null
      ? String(syncContextOwnerId)
      : selectedOwnerId;

  const isAdminSelected =
    syncMode !== 'listings' &&
    (!syncOwnerId || syncOwnerId === ORCHESTRATION_ADMIN_OWNER_ID);

  const selectedOwner =
    syncMode !== 'listings' && !isAdminSelected
      ? (owners || []).find((o) => String(o?._id ?? o?.id) === String(syncOwnerId))
      : null;

  const handleSyncPm = async () => {
    setSyncingPm(true);
    try {
      if (!syncOwnerId || syncOwnerId === ORCHESTRATION_ADMIN_OWNER_ID) {
        if (onSyncToAllOwners) await onSyncToAllOwners();
      } else if (onSyncToOwner) {
        const owner = (owners || []).find((o) => String(o?._id ?? o?.id) === String(syncOwnerId));
        const ownerName = owner ? getOwnerListLabel(owner) : syncOwnerId;
        await onSyncToOwner(syncOwnerId, ownerName);
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || String(e);
      console.error('[OwnerConfigScopeBarWithSync] sync PM failed', e);
      toast.error(msg, { autoClose: 12000 });
      throw e;
    } finally {
      setSyncingPm(false);
    }
  };

  const handleSyncListings = async () => {
    setSyncingListings(true);
    try {
      if (syncMode === 'admin-pm') {
        if (selectedListingIds.length === 0) {
          toast.warn('Cochez au moins une annonce de ce PM — la sync ne touche jamais tout le parc automatiquement.', {
            autoClose: 8000,
          });
          return;
        }
        if (onSyncSelectedListings) {
          await onSyncSelectedListings(selectedListingIds);
        }
        return;
      }

      if (selectedListingId && onSyncOneListing) {
        await onSyncOneListing(selectedListingId, selectedListing?.name ?? selectedListingId);
      } else if (onSyncAllListings) {
        await onSyncAllListings();
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || String(e);
      console.error('[OwnerConfigScopeBarWithSync] sync listings failed', e);
      toast.error(msg, { autoClose: 12000 });
    } finally {
      setSyncingListings(false);
    }
  };

  const pmButtonText = (() => {
    if (syncingPm) return 'Sync PM…';
    if (isAdminSelected) {
      return compact ? 'Sync tous les PMs' : 'Synchroniser tous les PMs';
    }
    const pmLabel = selectedOwner ? getOwnerListLabel(selectedOwner) : 'PM';
    return compact ? `Sync PM ${pmLabel}` : `Synchroniser PM ${pmLabel}`;
  })();

  const listingsButtonText = (() => {
    if (syncingListings) return 'Sync annonces…';
    if (syncMode === 'admin-pm') {
      if (selectedListingIds.length === 0) {
        return compact ? 'Sync (choisir annonces)' : 'Synchroniser les annonces cochées';
      }
      return compact
        ? `Sync ${selectedListingIds.length} annonce(s)`
        : `Synchroniser ${selectedListingIds.length} annonce(s) cochée(s)`;
    }
    if (selectedListing) {
      return compact ? `Sync ${selectedListing.name}` : `Synchroniser ${selectedListing.name}`;
    }
    return compact ? 'Sync toutes les annonces' : 'Synchroniser toutes les annonces';
  })();

  const pmSyncDisabled =
    syncing || (syncMode !== 'listings' && !isAdminSelected && !syncOwnerId);

  const listingsSyncDisabled =
    syncing ||
    listingOptions.length === 0 ||
    (syncMode === 'admin-pm' && selectedListingIds.length === 0) ||
    (syncMode === 'admin-pm' && !onSyncSelectedListings) ||
    (syncMode === 'listings' && !onSyncAllListings && !onSyncOneListing);

  const listingSingleAutocomplete = showListingSinglePicker ? (
    <Autocomplete
      size="small"
      loading={listingsLoading}
      options={listingOptions}
      value={selectedListing}
      onChange={(_, v) => onListingChange?.(v?.id ?? null)}
      disabled={syncing}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      sx={{
        minWidth: compact ? 180 : 200,
        maxWidth: compact ? 260 : 320,
        flex: '1 1 180px',
        '& .MuiOutlinedInput-root': {
          height: compact ? 34 : 36,
          boxSizing: 'border-box',
          fontSize: compact ? 13 : 14,
        },
        '& .MuiInputLabel-root': { fontSize: compact ? 12 : 13 },
      }}
      renderInput={(params) =>
        renderAutocompleteField(params, 'Annonce', 'Toutes ou une annonce…', 'Annonce')
      }
    />
  ) : null;

  const listingMultiAutocomplete = showListingMultiPicker ? (
    <Autocomplete
      multiple
      disableCloseOnSelect
      size="small"
      loading={listingsLoading}
      options={listingOptions}
      value={selectedListingsMulti}
      onChange={(_, values) => onListingSelectionChange?.(values.map((v) => v.id))}
      disabled={syncing}
      getOptionLabel={(o) => (o.location ? `${o.name} · ${o.location}` : o.name)}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox
              icon={checkboxIcon}
              checkedIcon={checkboxCheckedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column' }}>
              <Typography component="span" sx={{ fontSize: 13 }}>
                {option.name}
              </Typography>
              {option.location ? (
                <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {option.location}
                </Typography>
              ) : null}
            </Box>
          </li>
        );
      }}
      sx={{
        minWidth: compact ? 220 : 260,
        maxWidth: compact ? 360 : 420,
        flex: '1 1 220px',
        '& .MuiOutlinedInput-root': {
          minHeight: compact ? 34 : 36,
          boxSizing: 'border-box',
          fontSize: compact ? 13 : 14,
        },
        '& .MuiInputLabel-root': { fontSize: compact ? 12 : 13 },
      }}
      renderInput={(params) =>
        renderAutocompleteField(
          params,
          'Annonces à synchroniser',
          listingOptions.length === 0
            ? 'Aucune annonce pour ce PM'
            : 'Cochez les annonces (obligatoire)',
          'Annonces à synchroniser',
        )
      }
    />
  ) : null;

  const pmSyncButton = (
    <SojoriPrimButton
      type="button"
      compact={compact}
      loading={syncingPm}
      disabled={pmSyncDisabled}
      onClick={() => void handleSyncPm()}
    >
      {pmButtonText}
    </SojoriPrimButton>
  );

  const listingsSyncButton = (
    <SojoriPrimButton
      type="button"
      compact={compact}
      loading={syncingListings}
      disabled={listingsSyncDisabled}
      onClick={() => void handleSyncListings()}
      className="sojori-prim-btn--secondary"
    >
      {listingsButtonText}
    </SojoriPrimButton>
  );

  const barSx = {
    mb: compact ? 1 : 1.5,
    width: '100%',
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: compact ? 1 : 1.5,
    rowGap: compact ? 0.75 : 1,
  };

  const filtersSx = {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: compact ? 1 : 1.5,
    flex: '1 1 auto',
    minWidth: 0,
  };

  const syncButtonsWrap = (buttons: ReactNode) => (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        flexShrink: 0,
        ml: { xs: 0, sm: 'auto' },
        width: { xs: '100%', sm: 'auto' },
        flexWrap: 'wrap',
      }}
    >
      {buttons}
    </Stack>
  );

  if (!shouldShowFilter) {
    return (
      <Box sx={barSx}>
        {syncMode === 'listings' || syncMode === 'admin-pm' ? (
          <>
            <Box sx={filtersSx}>
              {syncMode === 'admin-pm' ? listingMultiAutocomplete : listingSingleAutocomplete}
            </Box>
            {syncButtonsWrap(listingsSyncButton)}
          </>
        ) : (
          <>
            <Box
              sx={{
                ...filtersSx,
                px: compact ? 0 : 2,
                py: compact ? 0.5 : 1,
                borderRadius: 2,
                bgcolor: 'rgba(6,115,179,0.06)',
                border: '1px solid rgba(6,115,179,0.18)',
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#0673b3', letterSpacing: '0.04em' }}>
                  PROPRIÉTAIRE
                </Typography>
                <Chip
                  label={ownerDisplayName}
                  size="small"
                  sx={{
                    fontWeight: 700,
                    bgcolor: '#0673b3',
                    color: '#fff',
                    maxWidth: '100%',
                    '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                  }}
                />
              </Stack>
            </Box>
            {syncButtonsWrap(listingsSyncButton)}
          </>
        )}
      </Box>
    );
  }

  const options = [
    ADMIN_SENTINEL,
    ...(owners || []).filter((o) => {
      const id = o?._id ?? o?.id;
      if (id == null) return false;
      return !isAdminOwnerRow(o);
    }),
  ];

  let currentValue;
  if (!selectedOwnerId || selectedOwnerId === ORCHESTRATION_ADMIN_OWNER_ID) {
    currentValue = ADMIN_SENTINEL;
  } else {
    currentValue =
      (owners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId)) || ADMIN_SENTINEL;
  }

  const handleChange = (_: unknown, option: unknown) => {
    if (!option) {
      setSelectedOwnerId(ORCHESTRATION_ADMIN_OWNER_ID);
      return;
    }
    const o = option as typeof ADMIN_SENTINEL | { _id?: string; id?: string };
    if ('__admin' in o && o.__admin) {
      setSelectedOwnerId(ORCHESTRATION_ADMIN_OWNER_ID);
    } else {
      setSelectedOwnerId(String(o._id ?? o.id));
    }
  };

  return (
    <Box sx={barSx}>
      <Box sx={filtersSx}>
        {shouldShowFilter && (
          <Autocomplete
            size="small"
            loading={ownersLoading}
            options={options}
            value={currentValue}
            onChange={handleChange}
            disabled={syncing}
            isOptionEqualToValue={(a, b) => {
              if ('__admin' in a && '__admin' in b) return true;
              if ('_id' in a && '_id' in b) {
                return String(a._id ?? (a as any).id) === String(b._id ?? (b as any).id);
              }
              return false;
            }}
            getOptionLabel={(o) => {
              if ('__admin' in o && o.__admin) return o.label;
              return getOwnerListLabel(o as any);
            }}
            slotProps={{ listbox: { style: { maxHeight: 320 } } }}
            sx={{
              minWidth: compact ? 200 : 240,
              maxWidth: compact ? 280 : 360,
              flex: '1 1 200px',
              '& .MuiOutlinedInput-root': {
                height: compact ? 34 : 36,
                boxSizing: 'border-box',
                fontSize: compact ? 13 : 14,
              },
              '& .MuiInputLabel-root': { fontSize: compact ? 12 : 13 },
            }}
            renderInput={(params) =>
              renderAutocompleteField(
                params,
                'Propriétaire',
                'Admin ou un PM (focus)…',
                'Propriétaire',
              )
            }
          />
        )}

        {syncMode === 'admin-pm' ? listingMultiAutocomplete : listingSingleAutocomplete}

        {syncMode === 'admin-pm' && listingOptions.length > 0 && onListingSelectionChange ? (
          <Chip
            label={
              selectedListingIds.length === listingOptions.length
                ? 'Tout désélectionner'
                : `Tout sélectionner (${listingOptions.length})`
            }
            size="small"
            variant="outlined"
            clickable
            disabled={syncing}
            onClick={() => {
              if (selectedListingIds.length === listingOptions.length) {
                onListingSelectionChange([]);
              } else {
                onListingSelectionChange(listingOptions.map((l) => l.id));
              }
            }}
            sx={{ fontSize: 11, height: 28 }}
          />
        ) : null}
      </Box>

      {syncButtonsWrap(
        syncMode === 'admin-pm' ? (
          <>
            {pmSyncButton}
            {listingsSyncButton}
          </>
        ) : syncMode === 'listings' ? (
          listingsSyncButton
        ) : (
          pmSyncButton
        ),
      )}
    </Box>
  );
}
