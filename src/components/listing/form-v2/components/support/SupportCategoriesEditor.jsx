import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { toast } from 'react-toastify';
import { T, menuBtnPrimary } from '../ChatbotMenuConfig/menuTheme';
import {
  CATEGORY_GROUP_LABELS,
  PRIORITY_COLORS,
  cleanCategoriesForSave,
  emptyCategoryForm,
} from './supportConstants';

function groupCategories(categories) {
  return categories.reduce((acc, cat) => {
    const key = cat.category || 'other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {});
}

export default function SupportCategoriesEditor({
  initialCategories = [],
  onSave,
  saving = false,
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [hasChanges, setHasChanges] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [formData, setFormData] = useState(emptyCategoryForm());
  const lastInitialRef = useRef(null);

  useEffect(() => {
    const key = JSON.stringify(initialCategories);
    if (lastInitialRef.current === key) return;
    lastInitialRef.current = key;
    setCategories(initialCategories || []);
    setHasChanges(false);
  }, [initialCategories]);

  const grouped = useMemo(() => groupCategories(categories), [categories]);

  const handleToggle = (categoryId) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.id === categoryId ? { ...cat, enabled: !cat.enabled } : cat)),
    );
    setHasChanges(true);
  };

  const handleAdd = () => {
    setDialogMode('add');
    setFormData(emptyCategoryForm(categories.length + 1));
    setDialogOpen(true);
  };

  const handleEdit = (category) => {
    setDialogMode('edit');
    setFormData({
      ...category,
      name: { fr: '', en: '', ar: '', ...category.name },
      description: { fr: '', en: '', ar: '', ...(category.description || {}) },
      estimatedResponseTime: {
        fr: '2 heures',
        en: '2 hours',
        ar: 'ساعتان',
        ...(category.estimatedResponseTime || {}),
      },
    });
    setDialogOpen(true);
  };

  const handleDelete = (categoryId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette catégorie ?')) return;
    setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
    setHasChanges(true);
    toast.success('Catégorie supprimée (pensez à enregistrer)');
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveCategory = () => {
    if (!formData.name?.fr?.trim()) {
      toast.error('Le nom en français est requis');
      return;
    }
    if (dialogMode === 'add') {
      setCategories((prev) => [...prev, formData]);
      toast.success('Catégorie ajoutée (pensez à enregistrer)');
    } else {
      setCategories((prev) => prev.map((cat) => (cat.id === formData.id ? formData : cat)));
      toast.success('Catégorie modifiée (pensez à enregistrer)');
    }
    setHasChanges(true);
    setDialogOpen(false);
  };

  const handleSaveAll = async () => {
    if (!onSave || !hasChanges) return;
    try {
      await onSave({ categories: cleanCategoriesForSave(categories) });
      toast.success('Support enregistré');
      setHasChanges(false);
      lastInitialRef.current = JSON.stringify(categories);
    } catch (e) {
      toast.error(e?.message || 'Échec de la sauvegarde');
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        sx={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}
      >
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: T.text }}>
            Catégories de support
          </Typography>
          <Typography sx={{ fontSize: 12, color: T.text3 }}>
            {categories.length} catégorie{categories.length !== 1 ? 's' : ''}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleAdd}
            disabled={saving}
            sx={{ ...menuBtnPrimary, bgcolor: T.success, '&:hover': { bgcolor: '#2d7a4a' } }}
          >
            Ajouter
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            disabled={!hasChanges || saving}
            onClick={handleSaveAll}
            sx={menuBtnPrimary}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" sx={{ mb: 2, fontSize: 12 }}>
        Les catégories activées apparaissent dans le menu Support WhatsApp. Utilisez l&apos;icône
        crayon pour modifier une catégorie.
      </Alert>

      {Object.entries(grouped).map(([groupKey, groupCategories]) => (
        <Accordion
          key={groupKey}
          defaultExpanded
          sx={{
            mb: 1,
            border: `1px solid ${T.border}`,
            borderRadius: '8px !important',
            '&:before': { display: 'none' },
            boxShadow: 'none',
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: T.primary }} />}>
            <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
              {CATEGORY_GROUP_LABELS[groupKey] || groupKey} ({groupCategories.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {groupCategories
              .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
              .map((category) => (
                <Card
                  key={category.id}
                  sx={{
                    mb: 1.25,
                    border: `1px solid ${T.border}`,
                    borderLeft: `4px solid ${T.primary}`,
                    borderRadius: 1.25,
                    boxShadow: 'none',
                    bgcolor: T.bg1,
                  }}
                >
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Stack
                      direction="row"
                      alignItems="flex-start"
                      sx={{ justifyContent: 'space-between', gap: 1 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack direction="row" gap={1} sx={{ alignItems: 'center',  mb: 0.75, flexWrap: 'wrap' }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                            {category.icon} {category.name?.fr || category.id}
                          </Typography>
                          <Chip
                            label={(category.priority || 'normal').toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: PRIORITY_COLORS[category.priority] || PRIORITY_COLORS.normal,
                              color: '#fff',
                              fontWeight: 600,
                              fontSize: '0.65rem',
                              height: 20,
                            }}
                          />
                        </Stack>
                        <Typography sx={{ fontSize: 12, color: T.text3, mb: 0.75 }}>
                          ⏰ Délai : {category.estimatedResponseTime?.fr || '—'}
                        </Typography>
                        {category.description?.fr && (
                          <Typography sx={{ fontSize: 12, color: T.text2, mb: 0.75 }}>
                            {category.description.fr}
                          </Typography>
                        )}
                        <Stack direction="row" gap={0.5} sx={{ flexWrap: 'wrap' }}>
                          {category.alertPM && (
                            <Chip label="🔔 Notifie le PM" size="small" color="warning" variant="outlined" />
                          )}
                          {category.requiresPhoto && (
                            <Chip label="📸 Photo requise" size="small" color="info" variant="outlined" />
                          )}
                          {category.requiresPMValidation && (
                            <Chip label="✅ Validation PM" size="small" variant="outlined" />
                          )}
                        </Stack>
                      </Box>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center',  flexShrink: 0 }}>
                        <Tooltip title="Modifier">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(category)}
                            sx={{
                              color: T.primary,
                              '&:hover': { bgcolor: T.primaryTint },
                            }}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(category.id)}
                            sx={{ color: T.error, '&:hover': { bgcolor: 'rgba(200,30,30,0.08)' } }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <FormControlLabel
                          control={
                            <Switch
                              size="small"
                              checked={category.enabled !== false}
                              onChange={() => handleToggle(category.id)}
                              sx={{
                                '& .MuiSwitch-switchBase.Mui-checked': { color: T.primary },
                                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                  bgcolor: T.primary,
                                },
                              }}
                            />
                          }
                          label={
                            <Typography sx={{ fontSize: 11 }}>
                              {category.enabled !== false ? 'Activé' : 'Désactivé'}
                            </Typography>
                          }
                          sx={{ ml: 0.5, mr: 0 }}
                        />
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
          </AccordionDetails>
        </Accordion>
      ))}

      {hasChanges && (
        <Alert severity="warning" sx={{ mt: 2, fontSize: 12 }}>
          Modifications non enregistrées — cliquez sur « Enregistrer ».
        </Alert>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {dialogMode === 'add' ? '➕ Ajouter une catégorie' : '✏️ Modifier la catégorie'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom (français) *"
                fullWidth
                size="small"
                value={formData.name?.fr || ''}
                onChange={(e) =>
                  handleFormChange('name', { ...formData.name, fr: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Icône (emoji)"
                fullWidth
                size="small"
                value={formData.icon || ''}
                onChange={(e) => handleFormChange('icon', e.target.value)}
                placeholder="🔧"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Groupe</InputLabel>
                <Select
                  value={formData.category || 'other'}
                  label="Groupe"
                  onChange={(e) => handleFormChange('category', e.target.value)}
                >
                  {Object.entries(CATEGORY_GROUP_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Priorité</InputLabel>
                <Select
                  value={formData.priority || 'normal'}
                  label="Priorité"
                  onChange={(e) => handleFormChange('priority', e.target.value)}
                >
                  <MenuItem value="normal">Normal</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="urgent">Urgent</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Ordre d'affichage"
                type="number"
                fullWidth
                size="small"
                value={formData.displayOrder ?? 1}
                onChange={(e) =>
                  handleFormChange('displayOrder', parseInt(e.target.value, 10) || 1)
                }
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Délai de réponse estimé (français)"
                fullWidth
                size="small"
                value={formData.estimatedResponseTime?.fr || ''}
                onChange={(e) =>
                  handleFormChange('estimatedResponseTime', {
                    ...formData.estimatedResponseTime,
                    fr: e.target.value,
                  })
                }
                placeholder="2 heures"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Description (français)"
                fullWidth
                size="small"
                multiline
                rows={2}
                value={formData.description?.fr || ''}
                onChange={(e) =>
                  handleFormChange('description', {
                    ...formData.description,
                    fr: e.target.value,
                  })
                }
              />
            </Grid>
            <Grid item xs={12}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.requiresPhoto)}
                      onChange={(e) => handleFormChange('requiresPhoto', e.target.checked)}
                    />
                  }
                  label="📸 Photo requise"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.alertPM)}
                      onChange={(e) => handleFormChange('alertPM', e.target.checked)}
                    />
                  }
                  label="🔔 Notifier PM"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={Boolean(formData.requiresPMValidation)}
                      onChange={(e) =>
                        handleFormChange('requiresPMValidation', e.target.checked)
                      }
                    />
                  }
                  label="✅ Validation PM"
                />
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleSaveCategory} sx={menuBtnPrimary}>
            {dialogMode === 'add' ? 'Ajouter' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
