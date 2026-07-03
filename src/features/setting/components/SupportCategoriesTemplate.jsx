import React, { useState, useEffect, useCallback } from 'react';
import { Box, Card, CardContent, Button, Typography, CircularProgress, Alert, Chip, Stack, Switch, FormControlLabel, Accordion, AccordionSummary, AccordionDetails, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Select, MenuItem, FormControl, InputLabel, Grid } from '@mui/material';
import { styled } from '@mui/material/styles';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { getOwnerSupportCategories, updateOwnerSupportCategories, resetOwnerSupportCategories } from '../services/serverApi.adminConfig';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161'
  }
};
const ActionButton = styled(Button)(({
  variant
}) => ({
  textTransform: 'none',
  fontWeight: 600,
  borderRadius: '8px',
  padding: '8px 20px',
  ...(variant === 'contained' && {
    backgroundColor: SOJORI_COLORS.primary,
    color: 'white',
    '&:hover': {
      backgroundColor: SOJORI_COLORS.primaryDark
    },
    '&:disabled': {
      backgroundColor: SOJORI_COLORS.gray[300],
      color: SOJORI_COLORS.gray[500]
    }
  }),
  ...(variant === 'outlined' && {
    borderColor: SOJORI_COLORS.primary,
    color: SOJORI_COLORS.primary,
    '&:hover': {
      borderColor: SOJORI_COLORS.primaryDark,
      backgroundColor: SOJORI_COLORS.primaryPale
    }
  })
}));
const CategoryCard = styled(Card)({
  marginBottom: '12px',
  borderLeft: `4px solid ${SOJORI_COLORS.primary}`,
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
  }
});
const SupportCategoriesTemplate = ({
  isAdmin = true,
  t,
  isListing = false,
  onSaveListingConfig = null,
  initialCategories = null,
  readOnly = false,
  /** Admin (MailTemplates) : cible un owner précis ; sinon JWT côté API */
  ownerId: scopedOwnerId,
  blockLoad = false
}) => {
  const token = useSelector(state => state.auth?.token);
  const currentUser = useSelector(state => state.auth?.user);
  const [loading, setLoading] = useState(!isListing);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState(initialCategories || []);
  const [hasChanges, setHasChanges] = useState(false);
  const [version, setVersion] = useState(1);

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    enabled: true,
    category: 'technical',
    name: {
      fr: '',
      en: '',
      ar: ''
    },
    description: {
      fr: '',
      en: '',
      ar: ''
    },
    icon: '🔧',
    displayOrder: 1,
    priority: 'normal',
    requiresPhoto: false,
    requiresPMValidation: false,
    alertPM: false,
    estimatedResponseTime: {
      fr: '2 heures',
      en: '2 hours',
      ar: 'ساعتان'
    }
  });
  const fetchSupportCategories = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOwnerSupportCategories(token, scopedOwnerId != null && String(scopedOwnerId).trim() !== '' ? String(scopedOwnerId).trim() : undefined);
      if (response?.data) {
        setCategories(response.data.categories || []);
        setVersion(response.data.version || 1);
      } else {}
    } catch (error) {
      toast.error(`Erreur: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  }, [token, scopedOwnerId]);
  useEffect(() => {
    if (isListing && initialCategories) {
      setCategories(initialCategories);
      setLoading(false);
      return;
    }
    if (isListing) return;
    if (blockLoad) {
      setLoading(false);
      return;
    }
    fetchSupportCategories();
  }, [isListing, initialCategories, blockLoad, fetchSupportCategories]);

  // Update categories when initialCategories changes (e.g., after sync)
  useEffect(() => {
    if (isListing && initialCategories) {
      setCategories(initialCategories);
      setHasChanges(false);
    }
  }, [isListing, initialCategories]);
  const handleToggleCategory = categoryId => {
    setCategories(prev => prev.map(cat => cat.id === categoryId ? {
      ...cat,
      enabled: !cat.enabled
    } : cat));
    setHasChanges(true);
  };
  const cleanEmptyStrings = obj => {
    if (!obj || typeof obj !== 'object') return obj;
    const cleaned = {};
    for (const key in obj) {
      // Garde tous les champs sauf les strings vides
      if (obj[key] !== '') {
        cleaned[key] = obj[key];
      }
    }
    return cleaned;
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      // Nettoyer seulement les strings vides, garder la structure
      const cleanedCategories = categories.map(cat => ({
        ...cat,
        name: cleanEmptyStrings(cat.name),
        description: cleanEmptyStrings(cat.description),
        estimatedResponseTime: cleanEmptyStrings(cat.estimatedResponseTime),
        autoResponse: cat.autoResponse ? cleanEmptyStrings(cat.autoResponse) : undefined
      }));
      if (isListing && onSaveListingConfig) {
        // Mode listing: call the provided callback

        await onSaveListingConfig({
          categories: cleanedCategories
        });
        toast.success('Catégories de support du listing mises à jour avec succès !');
      } else {
        // Mode admin: call the admin API

        const response = await updateOwnerSupportCategories(token, {
          categories: cleanedCategories
        }, scopedOwnerId != null && String(scopedOwnerId).trim() !== '' ? String(scopedOwnerId).trim() : undefined);
        toast.success('Catégories de support mises à jour avec succès !');
        // Refresh to get new version from backend
        await fetchSupportCategories();
      }
      setHasChanges(false);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };
  const handleReset = async () => {
    if (!window.confirm('Voulez-vous vraiment réinitialiser aux 22 catégories par défaut ?')) {
      return;
    }
    setSaving(true);
    try {
      await resetOwnerSupportCategories(token, scopedOwnerId != null && String(scopedOwnerId).trim() !== '' ? String(scopedOwnerId).trim() : undefined);
      toast.success('Catégories réinitialisées avec succès !');
      setHasChanges(false);
      fetchSupportCategories();
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setSaving(false);
    }
  };
  const handleAdd = () => {
    setDialogMode('add');
    setEditingCategory(null);
    setFormData({
      id: `custom_${Date.now()}`,
      enabled: true,
      category: 'other',
      name: {
        fr: '',
        en: '',
        ar: ''
      },
      description: {
        fr: '',
        en: '',
        ar: ''
      },
      icon: '💬',
      displayOrder: categories.length + 1,
      priority: 'normal',
      requiresPhoto: false,
      requiresPMValidation: false,
      alertPM: false,
      estimatedResponseTime: {
        fr: '2 heures',
        en: '2 hours',
        ar: 'ساعتان'
      },
      autoResponse: {
        fr: '',
        en: '',
        ar: ''
      },
      troubleshootingSteps: {},
      fields: {
        description: {
          type: 'textarea',
          required: true,
          label: {
            fr: 'Description',
            en: 'Description',
            ar: 'الوصف'
          },
          placeholder: {
            fr: 'Décrivez votre demande',
            en: 'Describe your request',
            ar: 'صف طلبك'
          }
        }
      },
      relatedToAmenities: false
    });
    setDialogOpen(true);
  };
  const handleEdit = category => {
    setDialogMode('edit');
    setEditingCategory(category);
    setFormData({
      ...category
    });
    setDialogOpen(true);
  };
  const handleDelete = categoryId => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette catégorie ?')) {
      return;
    }
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
    setHasChanges(true);
    toast.success('Catégorie supprimée (pensez à sauvegarder)');
  };
  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingCategory(null);
  };
  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSaveCategory = () => {
    // Validation
    if (!formData.name.fr.trim()) {
      toast.error('Le nom en français est requis');
      return;
    }
    if (dialogMode === 'add') {
      setCategories(prev => [...prev, formData]);
      toast.success('Catégorie ajoutée (pensez à sauvegarder)');
    } else {
      setCategories(prev => prev.map(cat => cat.id === formData.id ? formData : cat));
      toast.success('Catégorie modifiée (pensez à sauvegarder)');
    }
    setHasChanges(true);
    handleDialogClose();
  };
  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.category]) {
      acc[cat.category] = [];
    }
    acc[cat.category].push(cat);
    return acc;
  }, {});
  const categoryGroupLabels = {
    technical: '🔧 Technique',
    access: '🔑 Accès & Sécurité',
    equipment: '📦 Équipements',
    lost_found: '🔎 Objets Trouvés/Perdus',
    nuisance: '🔊 Nuisances',
    information: '❓ Informations',
    emergency: '🚨 Urgences',
    other: '💬 Autres'
  };
  const priorityColors = {
    urgent: '#D32F2F',
    high: '#F57C00',
    normal: '#388E3C'
  };
  if (!isListing && blockLoad) {
    return null;
  }
  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{
        color: SOJORI_COLORS.primary
      }} />
      </Box>;
  }
  return <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color={SOJORI_COLORS.gray[700]}>
            🆘 Catégories de Support
          </Typography>
          <Typography variant="body2" color={SOJORI_COLORS.gray[500]} mt={0.5}>
            {categories.length} catégories • Version {version}
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <ActionButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd} disabled={saving || blockLoad} sx={{
          backgroundColor: '#4CAF50',
          '&:hover': {
            backgroundColor: '#45a049'
          }
        }}>
            Ajouter
          </ActionButton>
          {!isListing && <ActionButton variant="outlined" startIcon={<RefreshIcon />} onClick={fetchSupportCategories} disabled={saving || blockLoad}>
              Actualiser
            </ActionButton>}
          {!isListing && <ActionButton variant="outlined" startIcon={<RestoreIcon />} onClick={handleReset} disabled={saving || blockLoad}>
              Réinitialiser
            </ActionButton>}
          <ActionButton variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!hasChanges || saving || blockLoad}>
            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
          </ActionButton>
        </Stack>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{
      mb: 3
    }}>
        Les catégories activées seront disponibles dans le menu Support WhatsApp pour vos clients.
      </Alert>

      {/* Categories by Group */}
      {Object.entries(groupedCategories).map(([groupKey, groupCategories]) => <Accordion key={groupKey} defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>
              {categoryGroupLabels[groupKey]} ({groupCategories.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box>
              {groupCategories.sort((a, b) => a.displayOrder - b.displayOrder).map(category => <CategoryCard key={category.id}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography variant="h6" fontSize="1.1rem">
                              {category.icon} {category.name.fr}
                            </Typography>
                            <Chip label={category.priority.toUpperCase()} size="small" sx={{
                      backgroundColor: priorityColors[category.priority],
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '0.7rem'
                    }} />
                          </Box>
                          <Typography variant="body2" color="text.secondary" mb={1}>
                            ⏰ Délai de réponse : {category.estimatedResponseTime.fr}
                          </Typography>
                          {category.alertPM && <Chip label="🔔 Notifie le PM" size="small" color="warning" sx={{
                    mr: 1
                  }} />}
                          {category.requiresPhoto && <Chip label="📸 Photo requise" size="small" color="info" sx={{
                    mr: 1
                  }} />}
                          {category.requiresPMValidation && <Chip label="✅ Validation PM requise" size="small" color="default" />}
                        </Box>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <Tooltip title="Modifier">
                            <IconButton size="small" onClick={() => handleEdit(category)} sx={{
                      color: SOJORI_COLORS.primary,
                      '&:hover': {
                        backgroundColor: SOJORI_COLORS.primaryPale
                      }
                    }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => handleDelete(category.id)} sx={{
                      color: '#D32F2F',
                      '&:hover': {
                        backgroundColor: '#FFEBEE'
                      }
                    }}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <FormControlLabel control={<Switch checked={category.enabled} onChange={() => handleToggleCategory(category.id)} sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: SOJORI_COLORS.primary
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: SOJORI_COLORS.primary
                    }
                  }} />} label={category.enabled ? 'Activé' : 'Désactivé'} />
                        </Stack>
                      </Box>
                    </CardContent>
                  </CategoryCard>)}
            </Box>
          </AccordionDetails>
        </Accordion>)}

      {/* Save reminder */}
      {hasChanges && <Alert severity="warning" sx={{
      mt: 3
    }}>
          ⚠️ Vous avez des modifications non sauvegardées. N&apos;oubliez pas de cliquer sur &quot;Sauvegarder&quot; !
        </Alert>}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleDialogClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {dialogMode === 'add' ? '➕ Ajouter une catégorie' : '✏️ Modifier la catégorie'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{
          mt: 1
        }}>
            {/* Nom (FR) */}
            <Grid item xs={12} sm={6}>
              <TextField label="Nom (Français) *" fullWidth value={formData.name.fr} onChange={e => handleFormChange('name', {
              ...formData.name,
              fr: e.target.value
            })} />
            </Grid>

            {/* Icône */}
            <Grid item xs={12} sm={6}>
              <TextField label="Icône (emoji)" fullWidth value={formData.icon} onChange={e => handleFormChange('icon', e.target.value)} placeholder="🔧" />
            </Grid>

            {/* Groupe */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Groupe</InputLabel>
                <Select value={formData.category} onChange={e => handleFormChange('category', e.target.value)} label="Groupe">
                  <MenuItem value="technical">🔧 Technique</MenuItem>
                  <MenuItem value="access">🔑 Accès & Sécurité</MenuItem>
                  <MenuItem value="equipment">📦 Équipements</MenuItem>
                  <MenuItem value="lost_found">🔎 Objets Trouvés/Perdus</MenuItem>
                  <MenuItem value="nuisance">🔊 Nuisances</MenuItem>
                  <MenuItem value="information">❓ Informations</MenuItem>
                  <MenuItem value="emergency">🚨 Urgences</MenuItem>
                  <MenuItem value="other">💬 Autres</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Priorité */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priorité</InputLabel>
                <Select value={formData.priority} onChange={e => handleFormChange('priority', e.target.value)} label="Priorité">
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Délai de réponse (FR) */}
            <Grid item xs={12}>
              <TextField label="Délai de réponse estimé (Français)" fullWidth value={formData.estimatedResponseTime.fr} onChange={e => handleFormChange('estimatedResponseTime', {
              ...formData.estimatedResponseTime,
              fr: e.target.value
            })} placeholder="2 heures" />
            </Grid>

            {/* Description (FR) */}
            <Grid item xs={12}>
              <TextField label="Description (Français)" fullWidth multiline rows={2} value={formData.description?.fr || ''} onChange={e => handleFormChange('description', {
              ...formData.description,
              fr: e.target.value
            })} />
            </Grid>

            {/* Options */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel control={<Switch checked={formData.requiresPhoto} onChange={e => handleFormChange('requiresPhoto', e.target.checked)} />} label="📸 Photo requise" />
                <FormControlLabel control={<Switch checked={formData.alertPM} onChange={e => handleFormChange('alertPM', e.target.checked)} />} label="🔔 Notifier PM" />
                <FormControlLabel control={<Switch checked={formData.requiresPMValidation} onChange={e => handleFormChange('requiresPMValidation', e.target.checked)} />} label="✅ Validation PM" />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Annuler</Button>
          <Button onClick={handleSaveCategory} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary
        }}>
            {dialogMode === 'add' ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};
export default SupportCategoriesTemplate;
