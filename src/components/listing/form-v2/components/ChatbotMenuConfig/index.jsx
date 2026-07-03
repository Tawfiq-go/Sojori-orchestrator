import React, { useCallback } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import {
  useCreateListingChatbotConfig,
  useListingChatbotConfig,
  useListingChatbotSyncStatus,
  useSyncListingChatbotConfig,
  useUpdateListingChatbotOverrides,
} from '../../hooks/useListingChatbotConfig';
import SyncStatusBanner from './SyncStatusBanner';
import EditableOptionsList from './EditableOptionsList';
import { T, menuBtnPrimary, menuBtnOutlined } from './menuTheme';

/**
 * Menu WhatsApp listing — même contenu que le modal legacy (ListingItem).
 * @param embedded — dans l’onglet formulaire V2 (pas de titre H6 dupliqué)
 */
const ChatbotMenuConfig = ({ listingId, listingName, embedded = false }) => {
  const hasListingId = Boolean(listingId);
  const { data: config, isLoading, error, isFetching, refetch: refetchConfig } = useListingChatbotConfig(listingId);
  const isNotFound = Boolean(error?.notFound);
  const { data: syncStatus, isLoading: syncLoading, refetch: refetchSyncStatus } = useListingChatbotSyncStatus(
    listingId,
    { enabled: !isNotFound },
  );
  const createMutation = useCreateListingChatbotConfig();
  const syncMutation = useSyncListingChatbotConfig();
  const updateOverridesMutation = useUpdateListingChatbotOverrides();

  const handleSync = async () => {
    if (!listingId || syncMutation.isPending) return;
    await syncMutation.mutateAsync({ listingId });
    await Promise.all([refetchConfig(), refetchSyncStatus()]);
    toast.success('Menu synchronisé avec le template admin');
  };

  const handleSaveOverrides = async (overrides) => {
    if (!listingId || updateOverridesMutation.isPending) return;
    await updateOverridesMutation.mutateAsync({ listingId, overrides });
    await refetchConfig();
    toast.success('Menu WhatsApp enregistré');
  };

  const handleResetToAdmin = async () => {
    if (
      !window.confirm(
        'Réinitialiser depuis le template admin ? Toutes les modifications locales seront perdues.',
      )
    ) {
      return;
    }
    await updateOverridesMutation.mutateAsync({ listingId, overrides: [] });
    await handleSync();
  };

  const copyOwnerConfigIntoListing = useCallback(async () => {
    if (!listingId) return;
    try {
      if (isNotFound) await createMutation.mutateAsync({ listingId });
      else await syncMutation.mutateAsync({ listingId });
      await Promise.all([refetchConfig(), refetchSyncStatus()]);
      toast.success('Configuration du propriétaire appliquée à ce listing.');
    } catch (e) {
      toast.error(e?.message || 'Erreur');
    }
  }, [listingId, isNotFound, createMutation, syncMutation, refetchConfig, refetchSyncStatus]);

  if (!hasListingId) {
    return <Alert severity="info">Enregistrez le listing avant de configurer le menu WhatsApp.</Alert>;
  }

  if (isLoading && !config) {
    return (
      <Box sx={{ py: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: T.primary }} />
      </Box>
    );
  }

  if (error && !isNotFound) {
    return <Alert severity="error">Erreur menu WhatsApp : {error.message || 'inconnue'}</Alert>;
  }

  const title = listingName ? `Menu WhatsApp · ${listingName}` : 'Menu WhatsApp';

  return (
    <Box>
      <Box
        sx={{
          mb: 1.5,
          py: 1.25,
          px: 1.5,
          borderRadius: 1.25,
          background: embedded
            ? `linear-gradient(135deg, ${T.primaryTint} 0%, ${T.bg2} 55%)`
            : `linear-gradient(135deg, rgba(37,211,102,0.12) 0%, ${T.primaryTint} 40%, ${T.bg2} 100%)`,
          border: `1px solid ${T.border}`,
        }}
      >
        {!embedded && (
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.02em', mb: 0.75 }}>
            {title}
          </Typography>
        )}

        {!isNotFound && (
          <Stack direction="row" sx={{ alignItems: 'center',  flexWrap: 'wrap', gap: 1.25 }}>
            <SyncStatusBanner
              syncStatus={syncStatus}
              loading={syncLoading}
              onSync={handleSync}
              isSyncing={syncMutation.isPending}
            />
            <Box sx={{ flex: 1, minWidth: 8 }} />
            <Button
              variant="contained"
              size="small"
              onClick={copyOwnerConfigIntoListing}
              disabled={createMutation.isPending || syncMutation.isPending}
              sx={menuBtnPrimary}
            >
              {createMutation.isPending || syncMutation.isPending ? '…' : 'Copier depuis le propriétaire'}
            </Button>
            <Button variant="outlined" size="small" onClick={() => refetchConfig()} disabled={isFetching} sx={menuBtnOutlined}>
              {isFetching ? '…' : 'Actualiser'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={handleResetToAdmin}
              disabled={syncMutation.isPending || updateOverridesMutation.isPending}
              sx={{ ...menuBtnOutlined, color: T.error, borderColor: 'rgba(200,30,30,0.35)' }}
            >
              Réinit. admin
            </Button>
          </Stack>
        )}
      </Box>

      <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5, lineHeight: 1.45 }}>
        Numéro WhatsApp Business global (organisation) — ici vous configurez uniquement le menu voyageur et les fenêtres de disponibilité par option.
      </Typography>

      {isNotFound ? (
        <Box sx={{ p: 3, borderRadius: 1.25, border: `1px dashed ${T.borderStrong}`, bgcolor: T.bg1, textAlign: 'center' }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>Aucune configuration listing</Typography>
          <Typography sx={{ fontSize: 13, color: T.text3, mb: 2 }}>
            Copiez la configuration WhatsApp du propriétaire vers ce listing.
          </Typography>
          <Button variant="contained" onClick={copyOwnerConfigIntoListing} disabled={createMutation.isPending} sx={menuBtnPrimary}>
            {createMutation.isPending ? 'Copie…' : 'Copier la configuration du propriétaire'}
          </Button>
        </Box>
      ) : config ? (
        <EditableOptionsList
          menuOptions={config.menuOptions || []}
          inheritedMenuOptions={config.inheritedMenuOptions || []}
          onSave={handleSaveOverrides}
          isSaving={updateOverridesMutation.isPending}
        />
      ) : (
        <Alert severity="info">Chargement…</Alert>
      )}
    </Box>
  );
};

export default ChatbotMenuConfig;
