import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
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

const GOLD = '#E6B022';

export default function ListingConciergeConfigPanel({ listingId, listingName }) {
  const { data: config, isLoading, error, isFetching, refetch } = useListingConciergeConfig(listingId);
  const isNotFound = Boolean(error?.notFound);
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSync } = useListingConciergeSyncStatus(
    listingId,
    { enabled: !isNotFound },
  );
  const createMutation = useCreateListingConciergeConfig();
  const syncMutation = useSyncListingConciergeConfig();
  const updateMutation = useUpdateListingConciergeServices();
  const [source, setSource] = useState('own');

  useEffect(() => {
    setSource(config?.conciergeSource === 'partner' ? 'partner' : 'own');
  }, [config?.conciergeSource]);

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
      conciergeSource: source,
      conciergePartnerId: null,
    });
    await refetch();
  };

  const setSourceMode = async (next) => {
    const prev = source;
    setSource(next);
    try {
      await updateMutation.mutateAsync({
        listingId,
        conciergeSource: next,
        conciergePartnerId: null,
      });
      await refetch();
      toast.success(
        next === 'partner'
          ? 'Partenaires Sojori activés (activités de la ville du listing)'
          : 'Conciergerie propre au listing',
      );
    } catch (e) {
      setSource(prev);
      toast.error(e?.message || 'Impossible de changer la source');
    }
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

      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Typography sx={{ fontWeight: 700, fontSize: 13.5, mb: 1 }}>
          Source expériences WhatsApp
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={1}>
          <Button
            size="small"
            variant={source === 'own' ? 'contained' : 'outlined'}
            onClick={() => void setSourceMode('own')}
            disabled={updateMutation.isPending}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Ma conciergerie
          </Button>
          <Button
            size="small"
            variant={source === 'partner' ? 'contained' : 'outlined'}
            onClick={() => void setSourceMode('partner')}
            disabled={updateMutation.isPending}
            sx={{
              textTransform: 'none',
              fontWeight: 700,
              ...(source === 'partner'
                ? { bgcolor: GOLD, color: '#2C2005', '&:hover': { bgcolor: '#d4a01e' } }
                : { borderColor: GOLD, color: '#8a6a00' }),
            }}
          >
            Conciergerie Sojori
          </Button>
        </Stack>
        <Typography sx={{ mt: 1, fontSize: 12, color: 'text.secondary', lineHeight: 1.45 }}>
          {source === 'partner'
            ? 'Les services partenaires Sojori seront proposés à votre client (ville du listing).'
            : 'Le guest voit vos services personnalisés ci-dessous.'}
        </Typography>
      </Box>

      {syncStatus?.needsSync && (
        <Alert severity="warning" sx={{ mb: 1.5, py: 0.75 }}>
          Des services ont été mis à jour côté administration. Utilisez « Synchroniser depuis admin » pour les
          appliquer à ce listing.
        </Alert>
      )}

      {initialData && (
        <Box sx={{ opacity: source === 'partner' ? 0.55 : 1, pointerEvents: source === 'partner' ? 'none' : 'auto' }}>
          <ConciergeServicesEditor
            key={listingId}
            initialData={initialData}
            onSave={handleSave}
            saving={updateMutation.isPending}
          />
        </Box>
      )}
    </Box>
  );
}
