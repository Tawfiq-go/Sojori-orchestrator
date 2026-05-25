import { Box, Chip, Stack, Typography, Autocomplete, TextField } from '@mui/material';
import { toast } from 'react-toastify';
import SojoriPrimButton from '../../../components/ui/SojoriPrimButton';
import { useState, useEffect } from 'react';
import { useAdminOwnerFilter } from '../../../context/AdminOwnerFilterContext';
import { getOwnerListLabel } from '../../../utils/ownerDisplay.utils';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';
import type { FulltaskConfigOwnerScope } from '../../../hooks/useFulltaskConfigOwner';
import { getOwnersAllPages } from '../../staff/services/serverApi.task';

export type ListingSyncOption = { id: string; name: string };

type Props = FulltaskConfigOwnerScope & {
  compact?: boolean;
  /**
   * owners = Admin template → copie vers template PM (pas les listings).
   * listings = template PM → copie vers annonces (toutes ou une).
   */
  syncMode?: 'owners' | 'listings';
  /** Admin : global → un PM (template owner uniquement). */
  onSyncToOwner?: (targetOwnerId: string, targetOwnerName: string) => Promise<void>;
  /** Admin : global → tous les PMs. */
  onSyncToAllOwners?: () => Promise<void>;
  /** PM : template owner → toutes les annonces. */
  onSyncAllListings?: () => Promise<void>;
  /** PM : template owner → une annonce. */
  onSyncOneListing?: (listingId: string, listingName: string) => Promise<void>;
  listingOptions?: ListingSyncOption[];
  selectedListingId?: string | null;
  onListingChange?: (listingId: string | null) => void;
  listingsLoading?: boolean;
};

const ADMIN_SENTINEL = { __admin: true, _id: ORCHESTRATION_ADMIN_OWNER_ID, label: 'Admin' };

export default function OwnerConfigScopeBarWithSync({
  ownerDisplayName,
  ownerKeyDetail,
  showOwnerPicker,
  isAdminTemplate,
  compact = false,
  syncMode: syncModeProp,
  onSyncToOwner,
  onSyncToAllOwners,
  onSyncAllListings,
  onSyncOneListing,
  listingOptions = [],
  selectedListingId = null,
  onListingChange,
  listingsLoading = false,
}: Props) {
  const syncMode =
    syncModeProp ?? (onSyncAllListings || onSyncOneListing ? 'listings' : 'owners');

  const contextValue = useAdminOwnerFilter();
  const { selectedOwnerId, setSelectedOwnerId, owners: contextOwners, ownersLoading: contextLoading } = contextValue;
  const [syncing, setSyncing] = useState(false);
  const [localOwners, setLocalOwners] = useState<any[]>([]);
  const [localLoading, setLocalLoading] = useState(false);

  const shouldShowFilter = showOwnerPicker || isAdminTemplate;
  const showListingPicker = syncMode === 'listings' && listingOptions.length > 0;

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (syncMode === 'listings') {
        if (selectedListingId && onSyncOneListing) {
          await onSyncOneListing(
            selectedListingId,
            selectedListing?.name ?? selectedListingId,
          );
        } else if (onSyncAllListings) {
          await onSyncAllListings();
        }
        return;
      }

      if (!selectedOwnerId || selectedOwnerId === ORCHESTRATION_ADMIN_OWNER_ID) {
        if (onSyncToAllOwners) await onSyncToAllOwners();
      } else if (onSyncToOwner) {
        const owner = (owners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId));
        const ownerName = owner ? getOwnerListLabel(owner) : selectedOwnerId;
        await onSyncToOwner(selectedOwnerId, ownerName);
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
      const msg = err.response?.data?.error || err.message || String(e);
      console.error('[OwnerConfigScopeBarWithSync] sync failed', e);
      toast.error(msg, { autoClose: 12000 });
      throw e;
    } finally {
      setSyncing(false);
    }
  };

  const isAdminSelected =
    syncMode === 'owners' &&
    (!selectedOwnerId || selectedOwnerId === ORCHESTRATION_ADMIN_OWNER_ID);

  const selectedOwner =
    syncMode === 'owners' && !isAdminSelected
      ? (owners || []).find((o) => String(o?._id ?? o?.id) === String(selectedOwnerId))
      : null;

  const syncButtonText = (() => {
    if (syncing) return 'Sync…';
    if (syncMode === 'listings') {
      if (selectedListing) {
        return compact ? `Sync ${selectedListing.name}` : `Synchroniser ${selectedListing.name}`;
      }
      return compact ? 'Sync toutes les annonces' : 'Synchroniser toutes les annonces';
    }
    if (isAdminSelected) {
      return compact ? 'Sync tous les PMs' : 'Synchroniser tous les PMs';
    }
    const pmLabel = selectedOwner ? getOwnerListLabel(selectedOwner) : 'PM';
    return compact ? `Sync PM ${pmLabel}` : `Synchroniser PM ${pmLabel}`;
  })();

  const syncDisabled =
    syncing ||
    (syncMode === 'listings' && listingOptions.length === 0) ||
    (syncMode === 'owners' && !isAdminSelected && !selectedOwnerId);

  const listingAutocomplete = showListingPicker ? (
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
      renderInput={(params) => (
        <TextField
          {...params}
          label="Annonce"
          placeholder="Toutes ou une annonce…"
          inputProps={{ ...params.inputProps, 'aria-label': 'Annonce' }}
        />
      )}
    />
  ) : null;

  const syncButton = (
    <SojoriPrimButton
      type="button"
      compact={compact}
      loading={syncing}
      disabled={syncDisabled}
      onClick={() => void handleSync()}
    >
      {syncButtonText}
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

  const syncButtonWrap = (
    <Box sx={{ flexShrink: 0, ml: { xs: 0, sm: 'auto' }, width: { xs: '100%', sm: 'auto' } }}>
      {syncButton}
    </Box>
  );

  if (!shouldShowFilter) {
    return (
      <Box sx={barSx}>
        {syncMode === 'listings' ? (
          <>
            <Box sx={filtersSx}>{listingAutocomplete}</Box>
            {syncButtonWrap}
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
            {syncButtonWrap}
          </>
        )}
      </Box>
    );
  }

  const options = [ADMIN_SENTINEL, ...(owners || []).filter((o) => o?._id != null || o?.id != null)];

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
          ListboxProps={{ style: { maxHeight: 320 } }}
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
          renderInput={(params) => (
            <TextField
              {...params}
              label="Propriétaire"
              placeholder="Admin ou PM…"
              inputProps={{ ...params.inputProps, 'aria-label': 'Propriétaire' }}
            />
          )}
        />
      )}

      {listingAutocomplete}
      </Box>
      {syncButtonWrap}
    </Box>
  );
}
