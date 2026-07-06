import React, { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button, Paper, Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, Chip, Alert, Radio, RadioGroup, Grid, IconButton, Tooltip, ToggleButtonGroup, ToggleButton, TextField, InputAdornment, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Save as SaveIcon, Restore as RestoreIcon, ExpandMore as ExpandMoreIcon, CheckCircle, Cancel, Settings as SettingsIcon, ViewModule as CardIcon, TableChart as TableIcon, Search as SearchIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';
import { getOrchestratorTaskTemplate, updateOrchestratorTaskTemplate } from '../../../setting/services/serverApi.orchestratorConfig';
import axios from 'axios';
import { API_BASE_URL as API_URL } from '../../../config/backendServer.config';
import ReservationCard from './ReservationCard';

// Design System Colors (inspired by TaskTemplateConfig)
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
    500: '#E6B022',
    600: '#B8881A'
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

// Noms alignés avec l'onglet Messages (templates) = noms des catégories
const CATEGORY_LABELS = {
  registration: '🔐 Enregistrement Voyageurs',
  arrival_choose: '🎫 Choix Heure Arrivée',
  arrival_declare: '📍 Déclaration Arrivée',
  departure_choose: '🚪 Choix Heure Départ',
  departure_declare: '👋 Déclaration Départ',
  cleaning_free: '🧹 Ménage Inclus',
  cleaning_paid: '💰 Ménage Payant',
  cleaning_sojori: '🧹 Ménage Sojori',
  transport: '🚗 Transport',
  groceries: '🛒 Courses',
  custom_request: '📝 Demande Perso',
  support: '🆘 Support',
  maintenance: '🔧 Maintenance',
  welcome: '👋 Message de Bienvenue',
  weather: '🌤️ Rappel complet avant X jours',
  local_recommendations: '📍 Recommandations Locales',
  feedback_during_stay: '💬 Feedback Séjour',
  thank_you: '🙏 Message Merci',
  review_request: '⭐ Demande Avis'
};
const ConfigOrchestrationView = () => {
  const user = useSelector(state => state.auth.user);
  const ownerId = user?._id || user?.id;
  const [config, setConfig] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'

  // Reservations states
  const [searchQuery, setSearchQuery] = useState('');
  const [reservations, setReservations] = useState([]);
  const [isLoadingReservations, setIsLoadingReservations] = useState(true);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Fetch orchestration config
  useEffect(() => {
    if (ownerId) {
      fetchConfig();
    }
  }, [ownerId]);

  // Fetch reservations
  useEffect(() => {
    fetchReservations();
  }, []);
  const fetchReservations = async () => {
    try {
      setIsLoadingReservations(true);
      const response = await axios.get(`${API_URL}/api/v1/orchestrator/reservations?limit=100`);
      if (response.data.success) {
        setReservations(response.data.data);
      }
    } catch (error) {} finally {
      setIsLoadingReservations(false);
    }
  };
  const fetchConfig = async () => {
    try {
      setIsLoading(true);
      if (!ownerId) {
        toast.error('Utilisateur non authentifié');
        return;
      }
      const response = await getOrchestratorTaskTemplate(ownerId);
      if (response.success && response.data) {
        setConfig(response.data);
        setEditedCategories(response.data.categories || {});
      }
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
      const updatedConfig = {
        ...config,
        categories: editedCategories,
        lastModified: new Date().toISOString()
      };
      if (!ownerId) {
        toast.error('Utilisateur non authentifié');
        return;
      }
      const response = await updateOrchestratorTaskTemplate(ownerId, updatedConfig);
      if (response.success) {
        toast.success('Configuration sauvegardée avec succès!');
        setConfig(response.data);
        setHasChanges(false);
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
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
  const filteredReservations = reservations.filter(r => r.reservationNumber.toLowerCase().includes(searchQuery.toLowerCase()));
  const categories = Object.keys(editedCategories || {});

  // Render Card Mode (Accordions)
  const renderCardMode = () => {
    if (categories.length === 0) {
      return <Alert severity="info" sx={{
        maxWidth: 600,
        mx: 'auto'
      }}>
          Aucune catégorie configurée pour cet owner
        </Alert>;
    }
    return <Box>
        {categories.map(categoryKey => {
        const category = editedCategories[categoryKey];
        const isEnabled = category?.enabled;
        const mode = category?.mode || 'MANUAL';
        const label = category?.label || category?.categoryDisplayLabel || 'Libellé manquant';
        return <Accordion key={categoryKey} sx={{
          mb: 2,
          border: `1px solid ${isEnabled ? DS.success[500] : DS.neutral[300]}`,
          borderRadius: '8px !important',
          '&:before': {
            display: 'none'
          },
          boxShadow: 'none'
        }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{
            backgroundColor: isEnabled ? DS.success[50] : DS.neutral[50],
            borderRadius: '8px',
            '&:hover': {
              backgroundColor: isEnabled ? DS.success[50] : DS.neutral[100]
            }
          }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                  <Box display="flex" alignItems="center" gap={2}>
                    {isEnabled ? <CheckCircle sx={{
                  color: DS.success[500],
                  fontSize: 24
                }} /> : <Cancel sx={{
                  color: DS.neutral[500],
                  fontSize: 24
                }} />}
                    <Typography variant="subtitle1" fontWeight={600} color={DS.neutral[900]}>
                      {label}
                    </Typography>
                  </Box>
                  <Box display="flex" gap={1} onClick={e => e.stopPropagation()}>
                    <Chip label={mode} size="small" sx={{
                  backgroundColor: DS.primary[500],
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }} />
                    <Chip label={isEnabled ? 'Activé' : 'Désactivé'} size="small" sx={{
                  backgroundColor: isEnabled ? DS.success[500] : DS.neutral[500],
                  color: 'white',
                  fontWeight: 500,
                  fontSize: '0.75rem'
                }} />
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{
            backgroundColor: 'white',
            p: 3
          }}>
                <Grid container spacing={3}>
                  {/* Enable/Disable Switch */}
                  <Grid item xs={12}>
                    <FormControlLabel control={<Switch checked={isEnabled} onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)} sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: DS.success[500]
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: DS.success[500]
                  }
                }} />} label={<Typography variant="body1" fontWeight={500}>
                          {isEnabled ? 'Catégorie activée' : 'Catégorie désactivée'}
                        </Typography>} />
                  </Grid>

                  {/* Mode Selection */}
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <Typography variant="subtitle2" fontWeight={600} mb={1}>
                        Mode d&apos;orchestration
                      </Typography>
                      <RadioGroup row value={mode} onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)}>
                        <FormControlLabel value="MANUAL" control={<Radio sx={{
                      color: DS.primary[500]
                    }} />} label="Manuel" />
                        <FormControlLabel value="AUTO" control={<Radio sx={{
                      color: DS.primary[500]
                    }} />} label="Automatique" />
                        <FormControlLabel value="NOTIFICATION_ONLY" control={<Radio sx={{
                      color: DS.primary[500]
                    }} />} label="Notification seulement" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>

                  {/* Info */}
                  <Grid item xs={12}>
                    <Alert severity="info" sx={{
                  fontSize: '0.875rem'
                }}>
                      <strong>Manuel:</strong> Création manuelle de tâches<br />
                      <strong>Auto:</strong> Création automatique selon les règles<br />
                      <strong>Notification:</strong> Envoi de notification uniquement
                    </Alert>
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>;
      })}
      </Box>;
  };

  // Render Table Mode
  const renderTableMode = () => {
    if (categories.length === 0) {
      return <Alert severity="info" sx={{
        maxWidth: 600,
        mx: 'auto'
      }}>
          Aucune catégorie configurée pour cet owner
        </Alert>;
    }
    return <TableContainer component={Paper} elevation={0}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 150
            }}>
                Catégorie
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#FFF3E0',
              minWidth: 160,
              fontSize: 11
            }}>
                🗄️ category (BD)
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#FFF3E0',
              minWidth: 140,
              fontSize: 11
            }}>
                🗄️ categoryType (BD)
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#FFF3E0',
              minWidth: 140,
              fontSize: 11
            }}>
                🗄️ name (BD)
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#FFF3E0',
              minWidth: 120,
              fontSize: 11
            }}>
                🗄️ type (BD)
              </TableCell>
              <TableCell align="center" sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              width: 80
            }}>
                ✅ Activé
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 150
            }}>
                Mode
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 150
            }}>
                📅 Création du plan
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 200
            }}>
                ⏱️ Création: Moment
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 180
            }}>
                📋 Condition
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 100
            }}>
                ⏱️ Valeur
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 100
            }}>
                ⏱️ Unité
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 180
            }}>
                🔒 Pré-requis
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 130
            }}>
                👤 Type assignataire
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 150
            }}>
                🎯 Stratégie assignation
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 120
            }}>
                📞 JOUR J: Max relances
              </TableCell>
              <TableCell sx={{
              fontWeight: 600,
              backgroundColor: '#F8FAFC',
              minWidth: 120
            }}>
                ⏰ JOUR J: Intervalle (min)
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map(categoryKey => {
            const category = editedCategories[categoryKey];
            const isEnabled = category?.enabled;
            const mode = category?.mode || 'MANUAL';
            const label = category?.label || category?.categoryDisplayLabel || 'Libellé manquant';
            return <TableRow key={categoryKey} hover sx={{
              '&:hover': {
                backgroundColor: '#FFF5F2'
              }
            }}>
                  {/* Catégorie */}
                  <TableCell>
                    <div className="font-semibold text-slate-800">
                      {label}
                    </div>
                  </TableCell>

                  {/* DEBUG: valeurs brutes BD */}
                  <TableCell sx={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#E65100',
                backgroundColor: '#FFF8F0'
              }}>
                    {String(category?.category ?? '—')}
                  </TableCell>
                  <TableCell sx={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#E65100',
                backgroundColor: '#FFF8F0'
              }}>
                    {String(category?.categoryType ?? '—')}
                  </TableCell>
                  <TableCell sx={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#E65100',
                backgroundColor: '#FFF8F0'
              }}>
                    {String(category?.name ?? '—')}
                  </TableCell>
                  <TableCell sx={{
                fontSize: 11,
                fontFamily: 'monospace',
                color: '#E65100',
                backgroundColor: '#FFF8F0'
              }}>
                    {String(category?.type ?? '—')}
                  </TableCell>

                  {/* ✅ Activé (Switch) */}
                  <TableCell align="center">
                    <Switch checked={isEnabled} onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)} size="small" sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: DS.success[500]
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: DS.success[500]
                  }
                }} />
                  </TableCell>

                  {/* Mode */}
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select value={mode} onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)} sx={{
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
                  }}>
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

                  {/* 📅 Création du plan */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <FormControl size="small" fullWidth>
                        <Select value={category.planningMode || 'INITIAL'} onChange={e => {
                    handleCategoryChange(categoryKey, 'planningMode', e.target.value);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="INITIAL">📋 Dès réservation</MenuItem>
                          <MenuItem value="ON_DEMAND">🕐 À la demande</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* ⏱️ Création: Moment */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <FormControl size="small" fullWidth>
                        <Select value={category.orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => {
                    const newOrchestration = {
                      ...category.orchestration,
                      createTaskBefore: {
                        ...category.orchestration.createTaskBefore,
                        trigger: e.target.value
                      }
                    };
                    handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="AFTER_RESERVATION">📋 Après réservation</MenuItem>
                          <MenuItem value="IMMEDIATE_CLIENT_REQUEST">🕐 Après timeslot</MenuItem>
                          <MenuItem value="BEFORE_EXECUTION">⏰ Avant exécution</MenuItem>
                          <MenuItem value="AFTER_EXECUTION">✅ Après exécution</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* 📋 Condition */}
                  <TableCell>
                    {mode === 'NOTIFICATION_ONLY' ? <FormControl size="small" fullWidth>
                        <Select value={category.sendNotificationCondition || 'ALWAYS'} onChange={e => {
                    handleCategoryChange(categoryKey, 'sendNotificationCondition', e.target.value);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="ALWAYS">
                            <Box display="flex" alignItems="center" gap={1}>
                              <span>✅</span>
                              <span>Toujours</span>
                            </Box>
                          </MenuItem>
                          <MenuItem value="IF_NOT_DONE">
                            <Box display="flex" alignItems="center" gap={1}>
                              <span>⚠️</span>
                              <span>Si tâche non effectuée</span>
                            </Box>
                          </MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* Valeur */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <TextField type="number" size="small" value={category.orchestration.createTaskBefore?.value || 0} onChange={e => {
                  const newOrchestration = {
                    ...category.orchestration,
                    createTaskBefore: {
                      ...category.orchestration.createTaskBefore,
                      value: parseInt(e.target.value) || 0
                    }
                  };
                  handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                }} sx={{
                  backgroundColor: 'white',
                  '& input': {
                    fontSize: '0.875rem'
                  }
                }} slotProps={{
                  htmlInput: {
                    min: 0
                  }
                }} /> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* Unité */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <FormControl size="small" fullWidth>
                        <Select value={category.orchestration.createTaskBefore?.unit || 'HOURS'} onChange={e => {
                    const newOrchestration = {
                      ...category.orchestration,
                      createTaskBefore: {
                        ...category.orchestration.createTaskBefore,
                        unit: e.target.value
                      }
                    };
                    handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="HOURS">Heures</MenuItem>
                          <MenuItem value="DAYS">Jours</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* Pré-requis */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration && ['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(category.orchestration.createTaskBefore?.trigger) ? <FormControl size="small" fullWidth>
                        <Select value={category.orchestration.createTaskBefore?.prerequisite || 'NONE'} onChange={e => {
                    const newOrchestration = {
                      ...category.orchestration,
                      createTaskBefore: {
                        ...category.orchestration.createTaskBefore,
                        prerequisite: e.target.value
                      }
                    };
                    handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="NONE">✅ Aucun</MenuItem>
                          <MenuItem value="TIMESLOT_CONFIRMED">⏰ Timeslot confirmé</MenuItem>
                          <MenuItem value="CLIENT_REGISTERED">👤 Client enregistré</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* 👤 Type assignataire */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <FormControl size="small" fullWidth>
                        <Select value={category.orchestration.assignmentType || 'STAFF'} onChange={e => {
                    const newOrchestration = {
                      ...category.orchestration,
                      assignmentType: e.target.value
                    };
                    handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                  }} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="STAFF" sx={{
                      fontSize: '0.875rem'
                    }}>👷 Staff</MenuItem>
                          <MenuItem value="MANAGER" sx={{
                      fontSize: '0.875rem'
                    }}>🧑‍💼 Manager</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* 🎯 Stratégie assignation */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration ? <FormControl size="small" fullWidth>
                        <Select value={category.orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => {
                    const newOrchestration = {
                      ...category.orchestration,
                      assignmentStrategy: e.target.value
                    };
                    handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                  }} disabled={(category.orchestration.assignmentType || 'STAFF') === 'MANAGER'} sx={{
                    fontSize: '0.875rem',
                    backgroundColor: 'white',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: DS.neutral[300]
                    }
                  }}>
                          <MenuItem value="PRIORITY">⭐ Priorité</MenuItem>
                          <MenuItem value="ROTATION">🔄 Rotation</MenuItem>
                          <MenuItem value="IMMEDIATE">⚡ Immédiat</MenuItem>
                          <MenuItem value="MANUAL">✋ Manuel</MenuItem>
                        </Select>
                      </FormControl> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* 📞 JOUR J: Max relances */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration?.dayJLogic ? <TextField type="number" size="small" value={category.orchestration.dayJLogic.thresholdHours || 0} onChange={e => {
                  const newOrchestration = {
                    ...category.orchestration,
                    dayJLogic: {
                      ...category.orchestration.dayJLogic,
                      thresholdHours: parseInt(e.target.value) || 0
                    }
                  };
                  handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                }} sx={{
                  backgroundColor: 'white',
                  '& input': {
                    fontSize: '0.875rem'
                  }
                }} slotProps={{
                  htmlInput: {
                    min: 0
                  }
                }} /> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>

                  {/* ⏰ JOUR J: Intervalle (min) */}
                  <TableCell>
                    {mode === 'ORCHESTRATION' && category?.orchestration?.clientReminder ? <TextField type="number" size="small" value={category.orchestration.clientReminder.maxReminders || 0} onChange={e => {
                  const newOrchestration = {
                    ...category.orchestration,
                    clientReminder: {
                      ...category.orchestration.clientReminder,
                      maxReminders: parseInt(e.target.value) || 0
                    }
                  };
                  handleCategoryChange(categoryKey, 'orchestration', newOrchestration);
                }} sx={{
                  backgroundColor: 'white',
                  '& input': {
                    fontSize: '0.875rem'
                  }
                }} slotProps={{
                  htmlInput: {
                    min: 0
                  }
                }} /> : <span className="text-gray-400 text-sm">N/A</span>}
                  </TableCell>
                </TableRow>;
          })}
          </TableBody>
        </Table>
      </TableContainer>;
  };
  if (isLoading) {
    return <Box display="flex" justifyContent="center" alignItems="center" height="100%">
        <CircularProgress sx={{
        color: DS.primary[500]
      }} />
      </Box>;
  }
  if (!config) {
    return <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" bgcolor={DS.neutral[50]}>
        <Typography variant="h1" fontSize="4rem" mb={2}>
          ⚙️
        </Typography>
        <Typography variant="h5" fontWeight={600} color={DS.neutral[700]} mb={1}>
          Pas de configuration trouvée
        </Typography>
        <Typography variant="body2" color={DS.neutral[500]} mb={3}>
          Aucune configuration d&apos;orchestration pour cet owner
        </Typography>
        <Button variant="contained" startIcon={<SettingsIcon />} sx={{
        backgroundColor: DS.primary[500],
        textTransform: 'none',
        '&:hover': {
          backgroundColor: DS.primary[600]
        }
      }}>
          Créer une configuration
        </Button>
      </Box>;
  }
  return <div className="flex h-full gap-4 p-4">
      {/* Liste des réservations - Gauche */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Search header */}
        <div className="sticky top-0 bg-white z-10 p-4 border-b border-slate-200">
          <TextField placeholder="Rechercher SJ-XXX..." fullWidth size="small" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} slotProps={{
          input: {
            startAdornment: <InputAdornment position="start">
                  <SearchIcon className="text-gray-400" />
                </InputAdornment>
          }
        }} />
          <div className="mt-2 text-xs text-gray-500">
            {filteredReservations.length} réservation{filteredReservations.length > 1 ? 's' : ''}
          </div>
        </div>

        {/* Reservations list */}
        <div className="flex-1 overflow-y-auto">
          {isLoadingReservations ? <div className="flex justify-center items-center h-64">
              <CircularProgress sx={{
            color: '#E6B022'
          }} />
            </div> : filteredReservations.length === 0 ? <div className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">📋</div>
                <div className="text-xl font-semibold mb-2">Aucune réservation trouvée</div>
                <div className="text-sm">
                  {searchQuery ? 'Essayez un autre terme de recherche' : 'Pas de réservations disponibles'}
                </div>
              </div>
            </div> : filteredReservations.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} selected={selectedReservation?.id === reservation.id} onClick={() => setSelectedReservation(reservation)} />)}
        </div>
      </div>

      {/* Configuration - Droite */}
      <div className="w-2/3 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        {/* Header with Actions */}
        <Paper elevation={0} sx={{
        p: 3,
        borderBottom: `1px solid ${DS.neutral[200]}`,
        bgcolor: 'white'
      }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box>
              <Typography variant="h5" fontWeight={600} color={DS.neutral[900]}>
                Configuration Orchestration
              </Typography>
              <Typography variant="body2" color={DS.neutral[500]} mt={0.5}>
                {selectedReservation ? `Réservation: ${selectedReservation.reservationNumber}` : 'Configuration globale'}
              </Typography>
            </Box>
            <Box display="flex" gap={2} alignItems="center">
              {hasChanges && <Chip label="Modifications non sauvegardées" size="small" sx={{
              backgroundColor: DS.error[50],
              color: DS.error[500],
              fontWeight: 500
            }} />}
              <Button variant="outlined" startIcon={<RestoreIcon />} onClick={handleReset} disabled={!hasChanges} sx={{
              textTransform: 'none',
              borderColor: DS.neutral[300],
              color: DS.neutral[700],
              '&:hover': {
                borderColor: DS.neutral[500],
                backgroundColor: DS.neutral[50]
              }
            }}>
                Annuler
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={!hasChanges || isSaving} sx={{
              textTransform: 'none',
              backgroundColor: '#E6B022',
              '&:hover': {
                backgroundColor: '#B8881A'
              }
            }}>
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </Box>
          </Box>

          {/* View Mode Toggle */}
          <Box>
            <ToggleButtonGroup value={viewMode} exclusive onChange={(e, newMode) => newMode && setViewMode(newMode)} size="small" sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '13px',
              padding: '6px 16px'
            },
            '& .MuiToggleButton-root.Mui-selected': {
              backgroundColor: '#E6B022',
              color: 'white !important',
              '&:hover': {
                backgroundColor: '#B8881A',
                color: 'white !important'
              }
            }
          }}>
              <ToggleButton value="card">
                <CardIcon sx={{
                fontSize: 18,
                mr: 1
              }} />
                Carte
              </ToggleButton>
              <ToggleButton value="table">
                <TableIcon sx={{
                fontSize: 18,
                mr: 1
              }} />
                Tableau
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Paper>

        {/* Content - Accordions or Table */}
        <Box sx={{
        flex: 1,
        overflow: 'auto',
        p: 3
      }}>
          {viewMode === 'card' ? renderCardMode() : renderTableMode()}
        </Box>
      </div>
    </div>;
};
export default ConfigOrchestrationView;
