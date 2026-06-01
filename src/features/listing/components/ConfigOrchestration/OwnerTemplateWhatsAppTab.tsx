import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import EditableOptionsList from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/EditableOptionsList';
import { cloneSojoriDefaultMenuOptions } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/defaultChatbotMenuSeed';
import { ensureMenuOptionsComplete } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuDefaults';
import { normalizeMenuOptionsList } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuAvailabilityNormalize';
import { T, menuBtnOutlined } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import { ConfigIntroBar } from './SHARED';
import listingsService from '../../../../services/listingsService';

type Props = {
  templateOwnerKey: string;
};

export default function OwnerTemplateWhatsAppTab({ templateOwnerKey }: Props) {
  const isGlobalAdmin = templateOwnerKey === 'global';
  const [menuOptions, setMenuOptions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
      const payload = (res as { data?: { chatbot?: { menuOptions?: unknown[] } } })?.data ?? res;
      const raw = (payload as { chatbot?: { menuOptions?: unknown[] } })?.chatbot?.menuOptions || [];
      setMenuOptions(normalizeMenuOptionsList(ensureMenuOptionsComplete(raw)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Chargement menu WhatsApp impossible');
      setMenuOptions([]);
    } finally {
      setLoading(false);
    }
  }, [templateOwnerKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const persistMenuOptions = async (
    nextOptions: unknown[],
    opts?: { silent?: boolean },
  ) => {
    setSaving(true);
    setSaveState('saving');
    try {
      const normalized = normalizeMenuOptionsList(nextOptions as Record<string, unknown>[]);
      const res = await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'chatbot', {
        menuOptions: normalized,
        overrides: [],
      });
      if ((res as { success?: boolean })?.success === false) {
        throw new Error((res as { error?: string })?.error || 'Réponse API invalide');
      }
      setMenuOptions(normalizeMenuOptionsList(ensureMenuOptionsComplete(normalized)));
      setSaveState('saved');
      if (!opts?.silent) {
        toast.success(
          isGlobalAdmin
            ? 'Template Admin — menu WhatsApp enregistré'
            : 'Template PM — menu WhatsApp enregistré',
        );
      }
      window.setTimeout(() => setSaveState('idle'), 2500);
    } catch (e: unknown) {
      setSaveState('error');
      const msg = e instanceof Error ? e.message : 'Erreur enregistrement';
      toast.error(msg);
      throw e;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (fullOptions: unknown[], meta?: { silent?: boolean }) => {
    await persistMenuOptions(fullOptions, meta);
  };

  const handleLoadDefaults = async () => {
    const defaults = cloneSojoriDefaultMenuOptions();
    await persistMenuOptions(defaults);
  };

  if (loading) {
    return (
      <Box sx={{ py: 6, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} sx={{ color: T.primary }} />
      </Box>
    );
  }

  return (
    <Box>
      <ConfigIntroBar saveState={saveState === 'error' ? 'idle' : saveState}>
        Menu WhatsApp ·{' '}
        {isGlobalAdmin
          ? 'template Admin global (listing_owner_config_templates · ownerId=null)'
          : 'template propriétaire (listing_owner_config_templates)'}
      </ConfigIntroBar>

      <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
        {isGlobalAdmin ? (
          <>
            <strong>1.</strong> Configurez ici le menu (ex. option F — conditions multiples E + D1).
            <br />
            <strong>2.</strong> Barre du haut → synchroniser vers un PM.
            <br />
            <strong>3.</strong> Côté PM → propager vers les annonces → RabbitMQ → srv-fullchatbot.
          </>
        ) : (
          <>
            Menu hérité du template Admin après sync. Modifiez puis propagez vers vos annonces (barre du
            haut).
          </>
        )}
      </Alert>

      {!menuOptions.length ? (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Alert severity="warning">
            Menu vide — chargez les défauts Sojori ou copiez depuis le template Admin.
          </Alert>
          <Button
            variant="outlined"
            size="small"
            onClick={() => void handleLoadDefaults()}
            disabled={saving}
            sx={menuBtnOutlined}
          >
            Charger menu par défaut Sojori
          </Button>
        </Stack>
      ) : null}

      <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5 }}>
        Option F : « Conditionnelle + temps » — cochez plusieurs conditions (E, D1, …). Stockage{' '}
        <code>requires=E_completed,D1_completed</code>.
      </Typography>

      <EditableOptionsList
        menuOptions={menuOptions}
        inheritedMenuOptions={[]}
        onSave={handleSave}
        isSaving={saving}
        persistMode="full"
        onSaveStateChange={(s) => {
          if (s === 'saved') setSaveState('saved');
          if (s === 'error') setSaveState('error');
          if (s === 'dirty') setSaveState('idle');
        }}
      />
    </Box>
  );
}
