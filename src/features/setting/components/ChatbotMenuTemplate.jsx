import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Autocomplete, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import ChatbotMenuOptionCard from './chatbotMenu/MenuOptionCard';
import { getOwnerChatbotSettings, propagateChatbotConfigToAllListings, resetOwnerChatbotSettings, updateOwnerChatbotSettings } from '../services/serverApi.adminConfig';
const formatDate = value => value ? new Date(value).toLocaleString('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short'
}) : '—';

/** Ordre strict : A, B, C, D, D1, D2, D3, D4, E, F, G, H, I, J, J1, J2, J3, K */
const MENU_DISPLAY_ORDER = ['A', 'B', 'C', 'D', 'D1', 'D2', 'D3', 'D4', 'E', 'F', 'G', 'H', 'I', 'J', 'J1', 'J2', 'J3', 'K'];
const MENU_SECTIONS_FALLBACK = [{
  id: 'D',
  title: '🕐 Gestion Arrivée & Départ',
  codes: ['D', 'D1', 'D2', 'D3', 'D4']
}, {
  id: 'J',
  title: '🎯 Services Conciergerie',
  codes: ['J', 'J1', 'J2', 'J3']
}, {
  id: 'general',
  title: '📋 Options Générales',
  codes: ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'K']
}];
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const ChatbotMenuTemplate = ({
  isAdmin,
  owners = [],
  t,
  managedOwnerId,
  blockLoad
}) => {
  const translate = (key, fallback) => t(key, {
    defaultValue: fallback
  });
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuOptions, setMenuOptions] = useState([]);
  const [originalMenuOptions, setOriginalMenuOptions] = useState([]);
  const [metadata, setMetadata] = useState({
    version: null,
    lastModified: null
  });
  const [menuSections, setMenuSections] = useState(MENU_SECTIONS_FALLBACK);
  const [error, setError] = useState(null);
  const [propagating, setPropagating] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const ownerOptions = owners || [];
  /** Parent (MailTemplates) fournit l’owner pour les admins ; sinon sélection interne */
  const useManagedOwner = managedOwnerId !== undefined;
  const requiresInternalOwnerPicker = isAdmin && !useManagedOwner;
  const ownerIdForApi = useManagedOwner ? managedOwnerId || undefined : requiresInternalOwnerPicker ? selectedOwnerId || undefined : undefined;
  const canLoad = !blockLoad && (useManagedOwner ? Boolean(managedOwnerId) : !requiresInternalOwnerPicker || Boolean(selectedOwnerId));
  const token = useSelector(state => state.auth?.token);
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOwnerChatbotSettings({
        ownerId: ownerIdForApi,
        token
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to load chatbot settings');
      }
      const payload = response.data;
      setMenuOptions(payload.menuOptions || []);
      setOriginalMenuOptions(payload.menuOptions || []);
      setMenuSections(payload.menuSections || MENU_SECTIONS_FALLBACK);
      setMetadata({
        version: payload.version ?? null,
        lastModified: payload.lastModified ?? null
      });
    } catch (err) {
      setError(err.message || 'Impossible de charger la configuration');
      toast.error(err.message || 'Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }, [ownerIdForApi, token, blockLoad]);
  useEffect(() => {
    if (!canLoad) {
      setMenuOptions([]);
      setOriginalMenuOptions([]);
      setMetadata({
        version: null,
        lastModified: null
      });
      setError(null);
      return;
    }
    loadSettings();
  }, [canLoad, loadSettings]);
  const isDirty = useMemo(() => {
    return JSON.stringify(menuOptions) !== JSON.stringify(originalMenuOptions);
  }, [menuOptions, originalMenuOptions]);
  const handleOptionChange = (code, updatedOption) => {
    setMenuOptions(prev => prev.map(option => option.code === code ? updatedOption : option));
  };
  const handleAddOption = () => {
    const code = (addCode || '').trim().toUpperCase().slice(0, 4);
    const label = (addLabel || '').trim() || 'Nouvelle option';
    if (!code) {
      toast.error(translate('menu_whatsapp_add_code_required', 'Code requis (ex. Z1)'));
      return;
    }
    if (menuOptions.some(o => o.code === code)) {
      toast.error(translate('menu_whatsapp_add_code_exists', 'Ce code existe déjà'));
      return;
    }
    setMenuOptions(prev => [...prev, {
      code,
      label,
      enabled: true,
      availability: {
        type: 'always'
      },
      action: 'custom',
      createsTask: false
    }]);
    setAddOpen(false);
    setAddCode('');
    setAddLabel('');
    toast.success(translate('menu_whatsapp_added', 'Option ajoutée — enregistrez pour persister'));
  };
  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await updateOwnerChatbotSettings({
        ownerId: ownerIdForApi,
        menuOptions,
        token
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to save configuration');
      }
      setOriginalMenuOptions(menuOptions);
      setMetadata({
        version: response.data?.version ?? metadata.version,
        lastModified: response.data?.lastModified ?? new Date().toISOString()
      });
      toast.success(translate('menu_whatsapp_saved', 'Configuration enregistrée'));
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };
  const handlePropagate = async () => {
    try {
      setPropagating(true);
      const response = await propagateChatbotConfigToAllListings({
        ownerId: ownerIdForApi,
        token
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Erreur lors de la propagation');
      }
      const {
        synced,
        skipped,
        total
      } = response.data || {};
      toast.success(translate('menu_whatsapp_propagate_success', `Config propagée : ${synced ?? 0} listing(s) mis à jour, ${skipped ?? 0} déjà à jour. (${total ?? 0} au total)`));
    } catch (err) {
      toast.error(err.message || err.response?.data?.error || 'Erreur lors de la propagation');
    } finally {
      setPropagating(false);
    }
  };
  const handleReset = async () => {
    if (!window.confirm(translate('menu_whatsapp_reset_confirm', 'Réinitialiser la configuration à son état par défaut ?'))) {
      return;
    }
    try {
      setSaving(true);
      const response = await resetOwnerChatbotSettings({
        ownerId: ownerIdForApi,
        token
      });
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to reset configuration');
      }
      const payload = response.data;
      setMenuOptions(payload.menuOptions || []);
      setOriginalMenuOptions(payload.menuOptions || []);
      setMenuSections(payload.menuSections || MENU_SECTIONS_FALLBACK);
      setMetadata({
        version: payload.version ?? null,
        lastModified: payload.lastModified ?? null
      });
      toast.success(translate('menu_whatsapp_reset_success', 'Configuration réinitialisée'));
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la réinitialisation');
    } finally {
      setSaving(false);
    }
  };
  const renderOwnerSelector = () => {
    if (!requiresInternalOwnerPicker) {
      return null;
    }
    return <Box sx={{
      p: 2,
      borderRadius: 2,
      border: '1px solid #e5e7eb',
      backgroundColor: '#fff',
      mb: 3
    }}>
        <Typography variant="subtitle1" sx={{
        mb: 1,
        fontWeight: 600
      }}>
          {translate('select_owner_template', 'Sélectionnez un propriétaire')}
        </Typography>
        <Autocomplete options={ownerOptions} getOptionLabel={option => option?.name ? `${option.name} (${option.email})` : option?.email || ''} value={ownerOptions.find(owner => owner._id === selectedOwnerId) || null} onChange={(_event, newValue) => {
        setSelectedOwnerId(newValue?._id || '');
      }} renderInput={params => <TextField {...params} placeholder={translate('search_owner_placeholder', 'Rechercher par email')} size="small" />} disableClearable />
        {!selectedOwnerId && <Alert sx={{
        mt: 2
      }} severity="info">
            {translate('select_owner_hint', 'Choisissez un propriétaire pour charger sa configuration.')}
          </Alert>}
      </Box>;
  };
  const renderContent = () => {
    if (!canLoad) {
      return null;
    }
    if (loading) {
      return <Box sx={{
        py: 8,
        display: 'flex',
        justifyContent: 'center'
      }}>
          <CircularProgress />
        </Box>;
    }
    if (error) {
      return <Alert severity="error" sx={{
        mb: 3
      }}>
          {error}
        </Alert>;
    }
    if (!menuOptions.length) {
      return <Alert severity="info" sx={{
        mb: 3
      }}>
          {translate('menu_whatsapp_empty', 'Aucune option disponible pour le moment.')}
        </Alert>;
    }
    return <>
        <Stack direction={{
        xs: 'column',
        sm: 'row'
      }} alignItems={{
        xs: 'flex-start',
        sm: 'center'
      }} justifyContent="space-between" spacing={2} sx={{
        mb: 3
      }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip label={metadata.version ? t('menu_whatsapp_version', {
            defaultValue: 'Version v{{version}}',
            version: metadata.version
          }) : translate('menu_whatsapp_version_unknown', 'Version inconnue')} color="primary" variant="outlined" />
            <Typography variant="body2" color="text.secondary">
              {translate('menu_whatsapp_last_updated', 'Dernière mise à jour')} :{' '}
              {formatDate(metadata.lastModified)}
            </Typography>
          </Stack>
          <Stack direction={{
          xs: 'column',
          sm: 'row'
        }} spacing={1}>
            <Button disabled={saving} onClick={loadSettings} sx={{
            height: '40px',
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '8px 16px',
            transition: 'all 0.2s ease',
            backgroundColor: 'white',
            color: SOJORI_COLORS.gray[700],
            border: `1px solid ${SOJORI_COLORS.gray[300]}`,
            '&:hover': {
              backgroundColor: SOJORI_COLORS.primaryPale,
              color: 'black',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
            }
          }}>
              {translate('refresh', 'Actualiser')}
            </Button>
            <Button disabled={saving} onClick={handleReset} sx={{
            height: '40px',
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '8px 16px',
            transition: 'all 0.2s ease',
            backgroundColor: 'white',
            color: '#dc3545',
            border: '1px solid #dc3545',
            '&:hover': {
              backgroundColor: '#fff5f5',
              color: '#c82333',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
            }
          }}>
              {translate('reset_to_default', 'Réinitialiser')}
            </Button>
            <Button disabled={propagating} onClick={handlePropagate} sx={{
            height: '40px',
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '8px 16px',
            transition: 'all 0.2s ease',
            backgroundColor: 'white',
            color: '#059669',
            border: '1px solid #059669',
            '&:hover': {
              backgroundColor: '#ecfdf5',
              color: '#047857',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
            }
          }}>
              {propagating ? translate('propagating', 'Propagation…') : translate('menu_whatsapp_propagate', 'Propager vers tous les listings')}
            </Button>
            <Button onClick={() => setAddOpen(true)} sx={{
            height: '40px',
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '8px 16px',
            backgroundColor: '#f0f9ff',
            color: '#0369a1',
            border: '1px solid #0369a1',
            '&:hover': {
              backgroundColor: '#e0f2fe'
            }
          }}>
              ADD
            </Button>
            <Button onClick={handleSave} disabled={!isDirty || saving} sx={{
            height: '40px',
            borderRadius: '4px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.9rem',
            padding: '8px 16px',
            transition: 'all 0.2s ease',
            backgroundColor: !isDirty || saving ? SOJORI_COLORS.gray[300] : SOJORI_COLORS.primary,
            color: !isDirty || saving ? SOJORI_COLORS.gray[500] : 'white',
            border: !isDirty || saving ? `1px solid ${SOJORI_COLORS.gray[300]}` : `1px solid ${SOJORI_COLORS.primary}`,
            '&:hover:not(:disabled)': {
              backgroundColor: SOJORI_COLORS.primaryDark,
              color: 'white',
              transform: 'translateY(-1px)',
              boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
            }
          }}>
              {saving ? translate('saving', 'Enregistrement…') : translate('save_changes', 'Enregistrer les modifications')}
            </Button>
          </Stack>
        </Stack>

        <Box sx={{
        maxHeight: 'min(65vh, 560px)',
        overflowY: 'auto',
        overflowX: 'hidden',
        pr: 1,
        mr: -0.5,
        border: '1px solid #e5e7eb',
        borderRadius: 1.5,
        p: 1.5,
        bgcolor: '#fafafa'
      }}>
          <Stack spacing={2}>
            {(() => {
            const byCode = menuOptions.reduce((acc, o) => {
              acc[o.code] = o;
              return acc;
            }, {});
            const optionsInOrder = MENU_DISPLAY_ORDER.map(code => byCode[code]).filter(Boolean);
            const extra = menuOptions.filter(o => !MENU_DISPLAY_ORDER.includes(o.code));
            return <>
                  {optionsInOrder.map(option => <ChatbotMenuOptionCard key={option.code} option={option} onChange={updatedOption => handleOptionChange(option.code, updatedOption)} />)}
                  {extra.map(option => <ChatbotMenuOptionCard key={option.code} option={option} onChange={updatedOption => handleOptionChange(option.code, updatedOption)} />)}
                </>;
          })()}
          </Stack>
        </Box>

        <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>{translate('menu_whatsapp_add_title', 'Ajouter une option')}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{
            mt: 1
          }}>
              <TextField label="Code (max 4 car.)" value={addCode} onChange={e => setAddCode(e.target.value.toUpperCase())} placeholder="Z1" size="small" inputProps={{
              maxLength: 4
            }} />
              <TextField label="Libellé" value={addLabel} onChange={e => setAddLabel(e.target.value)} placeholder="Libellé affiché dans le menu" size="small" fullWidth />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAddOpen(false)}>{translate('cancel', 'Annuler')}</Button>
            <Button variant="contained" onClick={handleAddOption}>
              {translate('add', 'Ajouter')}
            </Button>
          </DialogActions>
        </Dialog>
      </>;
  };
  return <Box className="card" sx={{
    p: 3
  }}>
      <Typography variant="h4" sx={{
      mb: 2,
      fontWeight: 700
    }}>
        {translate('menu_whatsapp', 'Menu WhatsApp')}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{
      mb: 3
    }}>
        {translate('menu_whatsapp_description', 'Configurez les options visibles par vos voyageurs dans le menu WhatsApp. Chaque propriétaire dispose de son propre template.')}
      </Typography>
      {renderOwnerSelector()}
      {renderContent()}
    </Box>;
};
export default ChatbotMenuTemplate;
