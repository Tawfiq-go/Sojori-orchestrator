import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Paper, Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Chip, Alert, Radio, RadioGroup, Grid, IconButton, Tooltip, ToggleButtonGroup, ToggleButton, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Save as SaveIcon, Restore as RestoreIcon, ExpandMore as ExpandMoreIcon, CheckCircle, Cancel, Settings as SettingsIcon, ViewModule as CardIcon, TableChart as TableIcon, Search as SearchIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import axios from 'axios';

// Design System Colors (inspiré du design Claude Desktop)
const DS = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    900: '#212121'
  },
  primary: {
    50: '#FFF5F2',
    500: '#FF6B35',
    600: '#E55A2B'
  },
  success: {
    50: '#F0FDF4',
    500: '#10B981'
  },
  error: {
    50: '#FEF2F2',
    500: '#EF4444'
  }
};

// Labels pour les 8 nouvelles collections
const CATEGORY_LABELS = {
  support: '🆘 Support',
  concierge: '🛎️ Conciergerie',
  cleaning: '🏠 Ménage',
  transport: '🚗 Transport',
  grocery: '🛒 Courses',
  'service-client': '💌 Service Client',
  messages: '📜 Messages',
  orchestration: '⚡ Orchestration'
};

const ConfigOrchestrationListingView = ({ listingId, ownerId }) => {
  const [config, setConfig] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  // Fetch les 8 configurations listing-level
  useEffect(() => {
    if (listingId) {
      fetchConfig();
    }
  }, [listingId]);

  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      if (!listingId) {
        toast.error('Listing ID manquant');
        return;
      }

      // Fetch les 8 configs en parallèle
      const [support, concierge, cleaning, transport, grocery, serviceClient, messages, orchestration] = await Promise.all([
        axios.get(`/api/v1/listing/internal/${listingId}/support-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/concierge-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/cleaning-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/transport-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/grocery-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/service-client-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/messages-config`),
        axios.get(`/api/v1/listing/internal/${listingId}/orchestration-config`)
      ]);

      // Adapter au format attendu par le design
      const adaptedConfig = {
        categories: {
          support: {
            enabled: support.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.support,
            categoryDisplayLabel: CATEGORY_LABELS.support,
            data: support.data.data
          },
          concierge: {
            enabled: concierge.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.concierge,
            categoryDisplayLabel: CATEGORY_LABELS.concierge,
            data: concierge.data.data
          },
          cleaning: {
            enabled: cleaning.data.data?.included?.enabled || cleaning.data.data?.paid?.enabled || true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.cleaning,
            categoryDisplayLabel: CATEGORY_LABELS.cleaning,
            data: cleaning.data.data
          },
          transport: {
            enabled: transport.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.transport,
            categoryDisplayLabel: CATEGORY_LABELS.transport,
            data: transport.data.data
          },
          grocery: {
            enabled: grocery.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.grocery,
            categoryDisplayLabel: CATEGORY_LABELS.grocery,
            data: grocery.data.data
          },
          'service-client': {
            enabled: serviceClient.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS['service-client'],
            categoryDisplayLabel: CATEGORY_LABELS['service-client'],
            data: serviceClient.data.data
          },
          messages: {
            enabled: messages.data.data?.enabled ?? true,
            mode: 'MANUAL',
            label: CATEGORY_LABELS.messages,
            categoryDisplayLabel: CATEGORY_LABELS.messages,
            data: messages.data.data
          },
          orchestration: {
            enabled: orchestration.data.data?.enabled ?? true,
            mode: 'AUTO',
            label: CATEGORY_LABELS.orchestration,
            categoryDisplayLabel: CATEGORY_LABELS.orchestration,
            data: orchestration.data.data
          }
        }
      };

      setConfig(adaptedConfig);
      setEditedCategories(adaptedConfig.categories || {});
    } catch (error) {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // Sauvegarder chaque catégorie sur son endpoint
      const savePromises = Object.keys(editedCategories).map(async (categoryKey) => {
        const category = editedCategories[categoryKey];
        const endpoint = `/api/v1/listing/internal/${listingId}/${categoryKey}-config`;

        return axios.post(endpoint, {
          ...category.data,
          enabled: category.enabled,
          ownerId
        });
      });

      await Promise.all(savePromises);

      toast.success('✅ Configuration sauvegardée avec succès!');
      setHasChanges(false);
      await fetchConfig(); // Rafraîchir
    } catch (error) {
      toast.error('❌ Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Annuler tous les changements non sauvegardés?')) {
      setEditedCategories(config?.categories || {});
      setHasChanges(false);
      toast.info('Changements annulés');
    }
  };

  const categories = Object.keys(editedCategories || {});

  // Render Card Mode (Accordions)
  const renderCardMode = () => {
    if (categories.length === 0) {
      return (
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          Aucune catégorie configurée pour ce listing
        </Alert>
      );
    }

    return (
      <Box>
        {categories.map(categoryKey => {
          const category = editedCategories[categoryKey];
          const isEnabled = category?.enabled;
          const mode = category?.mode || 'MANUAL';
          const label = category?.label || category?.categoryDisplayLabel || 'Libellé manquant';

          return (
            <Accordion
              key={categoryKey}
              sx={{
                mb: 2,
                border: `1px solid ${isEnabled ? DS.success[500] : DS.neutral[300]}`,
                borderRadius: '8px !important',
                '&:before': { display: 'none' },
                boxShadow: 'none'
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: isEnabled ? DS.success[50] : DS.neutral[50],
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: isEnabled ? DS.success[50] : DS.neutral[100]
                  }
                }}
              >
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    {isEnabled ? (
                      <CheckCircle sx={{ color: DS.success[500], fontSize: 24 }} />
                    ) : (
                      <Cancel sx={{ color: DS.neutral[500], fontSize: 24 }} />
                    )}
                    <Typography variant="subtitle1" fontWeight={600} color={DS.neutral[900]}>
                      {label}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1} onClick={e => e.stopPropagation()}>
                    <Chip
                      label={mode}
                      size="small"
                      sx={{
                        backgroundColor: DS.primary[500],
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                    <Chip
                      label={isEnabled ? 'Activé' : 'Désactivé'}
                      size="small"
                      sx={{
                        backgroundColor: isEnabled ? DS.success[500] : DS.neutral[500],
                        color: 'white',
                        fontWeight: 500,
                        fontSize: '0.75rem'
                      }}
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ backgroundColor: 'white', p: 3 }}>
                <Grid container spacing={3}>
                  {/* Enable/Disable Switch */}
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={isEnabled}
                          onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': {
                              color: DS.success[500]
                            },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: DS.success[500]
                            }
                          }}
                        />
                      }
                      label={
                        <Typography variant="body1" fontWeight={500}>
                          {isEnabled ? 'Catégorie activée' : 'Catégorie désactivée'}
                        </Typography>
                      }
                    />
                  </Grid>

                  {/* Mode Selection */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        Mode d&apos;orchestration
                      </Typography>
                      <RadioGroup
                        row
                        value={mode}
                        onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)}
                      >
                        <FormControlLabel
                          value="MANUAL"
                          control={<Radio sx={{ color: DS.primary[500] }} />}
                          label="Manuel"
                        />
                        <FormControlLabel
                          value="AUTO"
                          control={<Radio sx={{ color: DS.primary[500] }} />}
                          label="Automatique"
                        />
                        <FormControlLabel
                          value="NOTIFICATION_ONLY"
                          control={<Radio sx={{ color: DS.primary[500] }} />}
                          label="Notification seulement"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {/* Info */}
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{ fontSize: '0.875rem' }}>
                      <strong>Manuel:</strong> Création manuelle de tâches<br />
                      <strong>Auto:</strong> Création automatique selon les règles<br />
                      <strong>Notification:</strong> Envoi de notification uniquement
                    </Alert>
                  </Grid>

                  {/* Détails spécifiques selon la catégorie */}
                  {categoryKey === 'support' && category.data?.categories && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        Catégories de support ({category.data.categories.length})
                      </Typography>
                      {category.data.categories.map((cat, idx) => (
                        <Chip
                          key={idx}
                          label={`${cat.icon} ${cat.label.fr}`}
                          size="small"
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))}
                    </Grid>
                  )}

                  {categoryKey === 'concierge' && category.data?.services && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        Services de conciergerie ({category.data.services.length})
                      </Typography>
                      {category.data.services.map((service, idx) => (
                        <Box key={idx} sx={{ mb: 1 }}>
                          <Chip
                            label={`${service.icon} ${service.label?.fr || 'Service'}`}
                            size="small"
                            color={service.enabled ? 'success' : 'default'}
                          />
                          <Typography variant="caption" color="text.secondary" ml={1}>
                            {service.formulas?.length || 0} formule(s)
                          </Typography>
                        </Box>
                      ))}
                    </Grid>
                  )}

                  {categoryKey === 'cleaning' && category.data && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        Configuration ménage
                      </Typography>
                      <Box display="flex" gap={2}>
                        <Chip
                          label={`Inclus: ${category.data.included?.enabled ? 'Oui' : 'Non'}`}
                          size="small"
                          color={category.data.included?.enabled ? 'success' : 'default'}
                        />
                        <Chip
                          label={`Payant: ${category.data.paid?.enabled ? 'Oui' : 'Non'}`}
                          size="small"
                          color={category.data.paid?.enabled ? 'success' : 'default'}
                        />
                      </Box>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    );
  };

  // Render Table Mode
  const renderTableMode = () => {
    if (categories.length === 0) {
      return (
        <Alert severity="info" sx={{ maxWidth: 600, mx: 'auto' }}>
          Aucune catégorie configurée pour ce listing
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper} elevation={0}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8FAFC', minWidth: 150 }}>
                Catégorie
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 600, backgroundColor: '#F8FAFC', width: 80 }}>
                ✅ Activé
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8FAFC', minWidth: 150 }}>
                Mode
              </TableCell>
              <TableCell sx={{ fontWeight: 600, backgroundColor: '#F8FAFC', minWidth: 200 }}>
                Détails
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(categoryKey => {
              const category = editedCategories[categoryKey];
              const isEnabled = category?.enabled;
              const mode = category?.mode || 'MANUAL';
              const label = category?.label || category?.categoryDisplayLabel || 'Libellé manquant';

              return (
                <TableRow
                  key={categoryKey}
                  hover
                  sx={{ '&:hover': { backgroundColor: '#FFF5F2' } }}
                >
                  <TableCell>
                    <div className="font-semibold text-slate-800">{label}</div>
                  </TableCell>

                  <TableCell align="center">
                    <Switch
                      checked={isEnabled}
                      onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)}
                      size="small"
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': {
                          color: DS.success[500]
                        },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                          backgroundColor: DS.success[500]
                        }
                      }}
                    />
                  </TableCell>

                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={mode}
                        onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)}
                        sx={{
                          backgroundColor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: DS.neutral[300]
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: DS.primary[500]
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                            borderColor: DS.primary[500]
                          }
                        }}
                      >
                        <MenuItem value="MANUAL">
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>✋</span>
                            <span>Manuel</span>
                          </Box>
                        </MenuItem>
                        <MenuItem value="AUTO">
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>⚡</span>
                            <span>Automatique</span>
                          </Box>
                        </MenuItem>
                        <MenuItem value="NOTIFICATION_ONLY">
                          <Box display="flex" alignItems="center" gap={1}>
                            <span>🔔</span>
                            <span>Notification seulement</span>
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>

                  <TableCell>
                    {categoryKey === 'support' && (
                      <Typography variant="caption">
                        {category.data?.categories?.length || 0} catégorie(s)
                      </Typography>
                    )}
                    {categoryKey === 'concierge' && (
                      <Typography variant="caption">
                        {category.data?.services?.length || 0} service(s)
                      </Typography>
                    )}
                    {categoryKey === 'cleaning' && (
                      <Typography variant="caption">
                        Inclus: {category.data?.included?.enabled ? 'Oui' : 'Non'} |
                        Payant: {category.data?.paid?.enabled ? 'Oui' : 'Non'}
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress sx={{ color: DS.primary[500] }} />
      </Box>
    );
  }

  if (!config) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        height="100%"
        bgcolor={DS.neutral[50]}
      >
        <Typography variant="h1" fontSize="4rem" mb={2}>
          ⚙️
        </Typography>
        <Typography variant="h5" fontWeight={600} color={DS.neutral[700]} mb={1}>
          Pas de configuration trouvée
        </Typography>
        <Typography variant="body2" color={DS.neutral[500]} mb={3}>
          Aucune configuration d&apos;orchestration pour ce listing
        </Typography>
      </Box>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header with Actions */}
      <Paper elevation={0} sx={{ p: 3, borderBottom: `1px solid ${DS.neutral[200]}`, bgcolor: 'white' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box>
            <Typography variant="h5" fontWeight={600} color={DS.neutral[900]}>
              Configuration Orchestration
            </Typography>
            <Typography variant="body2" color={DS.neutral[500]} mt={0.5}>
              Listing: {listingId}
            </Typography>
          </Box>
          <Box display="flex" gap={2} alignItems="center">
            {hasChanges && (
              <Chip
                label="Modifications non sauvegardées"
                size="small"
                sx={{
                  backgroundColor: DS.error[50],
                  color: DS.error[500],
                  fontWeight: 500
                }}
              />
            )}
            <Button
              variant="outlined"
              startIcon={<RestoreIcon />}
              onClick={handleReset}
              disabled={!hasChanges}
              sx={{
                textTransform: 'none',
                borderColor: DS.neutral[300],
                color: DS.neutral[700],
                '&:hover': {
                  borderColor: DS.neutral[500],
                  backgroundColor: DS.neutral[50]
                }
              }}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              sx={{
                textTransform: 'none',
                backgroundColor: '#FF6B35',
                '&:hover': {
                  backgroundColor: '#E55A2B'
                }
              }}
            >
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </Box>
        </Box>

        {/* View Mode Toggle */}
        <Box>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(e, newMode) => newMode && setViewMode(newMode)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 500,
                fontSize: '13px',
                padding: '6px 16px'
              },
              '& .MuiToggleButton-root.Mui-selected': {
                backgroundColor: '#FF6B35',
                color: 'white !important',
                '&:hover': {
                  backgroundColor: '#E55A2B',
                  color: 'white !important'
                }
              }
            }}
          >
            <ToggleButton value="card">
              <CardIcon sx={{ fontSize: 18, mr: 1 }} />
              Carte
            </ToggleButton>
            <ToggleButton value="table">
              <TableIcon sx={{ fontSize: 18, mr: 1 }} />
              Tableau
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Paper>

      {/* Content - Accordions or Table */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {viewMode === 'card' ? renderCardMode() : renderTableMode()}
      </Box>
    </div>
  );
};

export default ConfigOrchestrationListingView;
