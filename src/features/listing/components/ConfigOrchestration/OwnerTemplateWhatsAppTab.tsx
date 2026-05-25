import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import EditableOptionsList from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/EditableOptionsList';
import { T } from '../../../../components/listing/form-v2/components/ChatbotMenuConfig/menuTheme';
import { ConfigIntroBar } from './SHARED';
import listingsService from '../../../../services/listingsService';

type Props = {
  templateOwnerKey: string;
};

export default function OwnerTemplateWhatsAppTab({ templateOwnerKey }: Props) {
  const [menuOptions, setMenuOptions] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listingsService.getListingOwnerConfigTemplate(templateOwnerKey);
      const payload = (res as { data?: { chatbot?: { menuOptions?: unknown[] } } })?.data ?? res;
      setMenuOptions((payload as { chatbot?: { menuOptions?: unknown[] } })?.chatbot?.menuOptions || []);
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

  const handleSave = async (overrides: unknown[]) => {
    setSaving(true);
    try {
      await listingsService.putListingOwnerConfigTemplateSection(templateOwnerKey, 'chatbot', {
        menuOptions: overrides,
        overrides: [],
      });
      setMenuOptions(overrides);
      toast.success('Menu WhatsApp template enregistré');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
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
      <ConfigIntroBar saveState={saving ? 'saving' : 'idle'}>
        Menu WhatsApp · template owner (listing_owner_config_templates)
      </ConfigIntroBar>
      {!menuOptions.length ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Menu vide — lancez le one-shot Harcay ou configurez manuellement.
        </Alert>
      ) : null}
      <Typography sx={{ fontSize: 11, color: T.text3, mb: 1.5 }}>
        Numéro WhatsApp Business global — options du menu voyageur pour le template Admin / PM.
      </Typography>
      <EditableOptionsList
        menuOptions={menuOptions}
        inheritedMenuOptions={[]}
        onSave={handleSave}
        isSaving={saving}
      />
    </Box>
  );
}
