import React, { useCallback, useMemo } from 'react';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import ConfigPanelToolbar from './ConfigPanelToolbar';
import SupportCategoriesEditor from '../support/SupportCategoriesEditor';
import {
  useCreateListingSupportCategories,
  useListingSupportCategories,
  useListingSupportSyncStatus,
  useSyncListingSupportCategories,
  useUpdateListingSupportCategories,
} from '../../hooks/useListingConfigHooks';
import { menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';

export default function ListingSupportConfigPanel({ listingId, listingName }) {
  const { data: config, isLoading, error, isFetching, refetch } = useListingSupportCategories(listingId);
  const isNotFound = Boolean(error?.notFound);
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = useListingSupportSyncStatus(
    listingId,
    { enabled: !isNotFound },
  );
  const createMutation = useCreateListingSupportCategories();
  const syncMutation = useSyncListingSupportCategories();
  const updateMutation = useUpdateListingSupportCategories();

  const initialCategories = useMemo(
    () => config?.categories || [],
    [config?.categories],
  );

  const copyOwner = useCallback(async () => {
    if (!listingId) return;
    try {
      if (isNotFound) await createMutation.mutateAsync({ listingId });
      else await syncMutation.mutateAsync({ listingId });
      await Promise.all([refetch(), refetchSync()]);
      toast.success('Support appliqué depuis le propriétaire.');
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  }, [listingId, isNotFound, createMutation, syncMutation, refetch, refetchSync]);

  const handleSave = async ({ categories }) => {
    await updateMutation.mutateAsync({ listingId, categories });
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
        <Typography sx={{ mb: 2 }}>Aucune catégorie support pour ce listing.</Typography>
        <Button variant="contained" onClick={copyOwner} disabled={createMutation.isPending} sx={menuBtnPrimary}>
          Copier depuis le propriétaire
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <ConfigPanelToolbar
        title={listingName ? `Support · ${listingName}` : 'Support'}
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
      />

      {syncStatus?.needsSync && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0.75 }}>
          Une nouvelle version des catégories est disponible (v{syncStatus.adminVersion}). Utilisez
          « Synchroniser depuis admin » pour l&apos;appliquer.
        </Alert>
      )}

      <SupportCategoriesEditor
        initialCategories={initialCategories}
        onSave={handleSave}
        saving={updateMutation.isPending}
      />
    </Box>
  );
}
