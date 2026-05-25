// Panneau WhatsApp — option L Service client (même UI que Support K)
import React, { useEffect, useState, useCallback } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import MenuOptionCard from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/MenuOptionCard';
import {
  DEFAULT_SERVICE_CLIENT_MENU_OPTION,
  ensureMenuOptionsComplete,
} from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import { T, menuBtnPrimary, menuBtnOutlined } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import {
  useListingChatbotConfig,
  useUpdateListingChatbotOverrides,
} from '../../../../components/listing/form-v2/hooks/useListingChatbotConfig';

interface Props {
  listingId: string;
  ownerId?: string;
  enabled?: boolean;
  onEnabledChange?: (on: boolean) => void;
}

export default function ServiceClientWhatsAppMenuPanel({
  listingId,
  ownerId,
  enabled: enabledProp,
  onEnabledChange,
}: Props) {
  const { data: config, isLoading, error, isFetching, refetch } = useListingChatbotConfig(
    listingId,
    ownerId,
  );
  const updateMutation = useUpdateListingChatbotOverrides();
  const [localOption, setLocalOption] = useState(DEFAULT_SERVICE_CLIENT_MENU_OPTION);
  const [baseOption, setBaseOption] = useState(DEFAULT_SERVICE_CLIENT_MENU_OPTION);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    const merged = ensureMenuOptionsComplete(config?.menuOptions || []);
    const opt = merged.find((o: { code: string }) => o.code === 'L') || DEFAULT_SERVICE_CLIENT_MENU_OPTION;
    setLocalOption(opt);
    const inherited = ensureMenuOptionsComplete(config?.inheritedMenuOptions || []);
    const base = inherited.find((o: { code: string }) => o.code === 'L') || DEFAULT_SERVICE_CLIENT_MENU_OPTION;
    setBaseOption(base);
    setDirty(false);
  }, [config]);

  useEffect(() => {
    if (enabledProp === undefined) return;
    setLocalOption(prev => (prev.enabled === enabledProp ? prev : { ...prev, enabled: enabledProp }));
  }, [enabledProp]);

  const handleChange = (updated: typeof localOption) => {
    setLocalOption(updated);
    if (onEnabledChange && updated.enabled !== localOption.enabled) {
      onEnabledChange(updated.enabled);
    }
    setDirty(true);
  };

  const handleSave = useCallback(async () => {
    const override: Record<string, unknown> = { code: 'L' };
    if (localOption.enabled !== baseOption.enabled) override.enabled = localOption.enabled;
    if (JSON.stringify(localOption.availability) !== JSON.stringify(baseOption.availability)) {
      override.availability = localOption.availability;
    }
    if (Object.keys(override).length === 1) {
      setDirty(false);
      return;
    }
    await updateMutation.mutateAsync({ listingId, overrides: [override] });
    setDirty(false);
    await refetch();
  }, [localOption, baseOption, listingId, updateMutation, refetch]);

  if (isLoading && !config) {
    return (
      <Box sx={{ py: 2, textAlign: 'center' }}>
        <CircularProgress size={24} sx={{ color: T.primary }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="warning" sx={{ fontSize: 12.5 }}>
        Menu WhatsApp indisponible ({error.message}). Configurez le menu dans l’onglet{' '}
        <b>Menu WhatsApp</b> ou copiez la config propriétaire.
      </Alert>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}
      >
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: T.text2 }}>
          WhatsApp · bouton Service client (L)
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={() => refetch()} disabled={isFetching} sx={menuBtnOutlined}>
            {isFetching ? '…' : 'Actualiser'}
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleSave}
            disabled={!dirty || updateMutation.isPending}
            sx={menuBtnPrimary}
          >
            {updateMutation.isPending ? '…' : 'Enregistrer'}
          </Button>
        </Stack>
      </Stack>

      <MenuOptionCard option={localOption} onChange={handleChange} />

      <Typography
        sx={{
          mt: 1,
          fontSize: 10.5,
          fontFamily: '"Geist Mono", monospace',
          color: T.text3,
        }}
      >
        {localOption.action || 'contact_service_client'}
      </Typography>
    </Box>
  );
}
