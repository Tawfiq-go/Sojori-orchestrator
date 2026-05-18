import React, { useCallback, useMemo } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import ConfigPanelToolbar from './ConfigPanelToolbar';
import ConciergeServicesEditor from '../concierge/ConciergeServicesEditor';
import {
  useCreateListingConciergeConfig,
  useListingConciergeConfig,
  useListingConciergeSyncStatus,
  useSyncListingConciergeConfig,
  useUpdateListingConciergeServices,
} from '../../hooks/useListingConfigHooks';
import { menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';

export default function ListingConciergeConfigPanel({ listingId, listingName }) {
  const { data: config, isLoading, error, isFetching, refetch } = useListingConciergeConfig(listingId);
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = useListingConciergeSyncStatus(listingId);
  const createMutation = useCreateListingConciergeConfig();
  const syncMutation = useSyncListingConciergeConfig();
  const updateMutation = useUpdateListingConciergeServices();

  const isNotFound = Boolean(error?.notFound);

  const initialData = useMemo(() => {
    if (!config) return null;
    return {
      transportServices: config.transportServices || [],
      groceryServices: config.groceryServices || [],
      customServices: config.customServices || [],
    };
  }, [config]);

  const copyOwner = useCallback(async () => {
    if (!listingId) return;
    try {
      if (isNotFound) await createMutation.mutateAsync({ listingId });
      else await syncMutation.mutateAsync({ listingId });
      await Promise.all([refetch(), refetchSync()]);
      toast.success('Configuration conciergerie appliquée.');
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  }, [listingId, isNotFound, createMutation, syncMutation, refetch, refetchSync]);

  const handleSave = async ({ transportServices, groceryServices, customServices }) => {
    await updateMutation.mutateAsync({
      listingId,
      transportServices,
      groceryServices,
      customServices,
    });
    await refetch();
  };

  if (!listingId) return <Alert severity="info">Enregistrez le listing d&apos;abord.</Alert>;
  if (isLoading && !config && !isNotFound) {
    return (
      <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }
  if (error && !isNotFound) return <Alert severity="error">{error.message}</Alert>;

  if (isNotFound) {
    return (
      <Box sx={{ textAlign: 'center', py: 3 }}>
        <Typography sx={{ mb: 2 }}>Aucune configuration conciergerie pour ce listing.</Typography>
        <Button variant="contained" onClick={copyOwner} disabled={createMutation.isPending} sx={menuBtnPrimary}>
          Copier depuis le propriétaire
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigPanelToolbar
        title={listingName ? `Conciergerie · ${listingName}` : 'Conciergerie'}
        syncStatus={syncStatus}
        syncLoading={syncLoading}
        onSync={async () => {
          await syncMutation.mutateAsync({ listingId });
          await Promise.all([refetch(), refetchSync()]);
        }}
        isSyncing={syncMutation.isPending}
        onCopyOwner={copyOwner}
        onRefresh={() => refetch()}
        isFetching={isFetching}
        onReset={copyOwner}
        copyLabel="Copier depuis le propriétaire"
      />

      {syncStatus?.needsSync && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0.75 }}>
          Des services ont été mis à jour côté administration. Utilisez « Synchroniser depuis admin » pour les
          appliquer à ce listing.
        </Alert>
      )}

      {initialData && (
        <ConciergeServicesEditor
          key={listingId}
          initialData={initialData}
          onSave={handleSave}
          saving={updateMutation.isPending}
        />
      )}
    </Box>
  );
}
