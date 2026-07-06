import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Roles } from '../../../constants/roles';
import { Box, Typography, CircularProgress, Button, Paper, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, TextField, Chip, Alert, Radio, RadioGroup, Grid, alpha, Card, CardHeader, CardContent, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Checkbox, Divider, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import TableChartIcon from '@mui/icons-material/TableChart';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import PsychologyIcon from '@mui/icons-material/Psychology';
import DownloadIcon from '@mui/icons-material/Download';
import { toast } from 'react-toastify';
import { getMailTemplate } from '../services/serverApi.adminConfig';
import { getOrchestratorTaskTemplate, updateOrchestratorTaskTemplate } from '../services/serverApi.orchestratorConfig';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';
import OrchestratorAIWizard from './OrchestratorAIWizard';

// Modern Design System (Slack/Linear inspired)
const DS = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    900: '#212121'
  },
  primary: {
    50: '#F3F0FF',
    100: '#E9E3FF',
    500: '#8B5CF6',
    600: '#7C3AED',
    700: '#6D28D9'
  },
  success: {
    50: '#F0FDF4',
    500: '#10B981',
    600: '#059669'
  },
  error: {
    50: '#FEF2F2',
    500: '#EF4444'
  },
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B'
  },
  info: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB'
  },
  shadow: {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  }
};

// Sojori Colors (legacy - for compatibility)
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryDark: '#E85A2A',
  primaryPale: 'rgba(255, 107, 53, 0.1)',
  gray: {
    300: '#E0E0E0',
    700: '#616161'
  }
};
const CATEGORY_LABELS = {
  registration: '🔐 Enregistrement',
  arrival_choose: '🚪 Arrivée',
  arrival_declare: '📍 Déclarer Arrivée',
  departure_choose: '👋 Départ',
  departure_declare: '🚶 Déclarer Départ',
  cleaning_free: '🧹 Ménage Gratuit',
  cleaning_paid: '💰 Ménage Payant',
  cleaning_sojori: '🧹 Ménage Sojori',
  transport: '🚗 Transport',
  groceries: '🛒 Courses',
  custom_request: '📝 Demande Perso',
  support: '🆘 Support',
  maintenance: '🔧 Maintenance',
  // Customer Journey Messages
  welcome: '👋 Bienvenue',
  weather: '🌤️ Météo',
  local_recommendations: '📍 Recommandations',
  feedback_during_stay: '💬 Feedback Séjour',
  thank_you: '🙏 Remerciement',
  review_request: '⭐ Demande Avis'
};

// Ordre d'affichage des catégories (chronologique du parcours client)
const CATEGORY_ORDER = [
// 1. Avant le séjour
'welcome',
// Message de bienvenue après réservation
'registration',
// Enregistrement
'weather',
// Info météo avant arrivée
'local_recommendations',
// Recommandations locales avant arrivée
'cleaning_free',
// Ménage gratuit (peut être demandé avant arrivée)
'cleaning_paid',
// Ménage payant (peut être demandé avant arrivée)
'transport',
// Transport (peut être demandé avant arrivée)
'groceries',
// Courses (peut être demandé avant arrivée)

// 2. Arrivée
'arrival_choose',
// Choix heure d'arrivée
'arrival_declare',
// Déclaration d'arrivée

// 3. Pendant le séjour
'custom_request',
// Demandes personnalisées
'support',
// Support client
'feedback_during_stay',
// Feedback pendant le séjour

// 4. Départ
'departure_choose',
// Choix heure de départ
'departure_declare',
// Déclaration de départ
'cleaning_sojori',
// Ménage Sojori (après départ)

// 5. Après le séjour
'thank_you',
// Remerciement après séjour
'review_request',
// Demande d'avis

// 6. Autres
'maintenance' // Maintenance
];

// Templates prédéfinis
const PREDEFINED_TEMPLATES = {
  orchestration_ai_complete: {
    name: 'Orchestration AI Complete',
    description: 'Configuration complète avec AI, reschedule intelligent et escalade',
    icon: '🤖',
    color: '#8B5CF6',
    config: {
      enabled: true,
      mode: 'ORCHESTRATION',
      orchestration: {
        createTaskBefore: {
          value: 2,
          unit: 'HOURS'
        },
        assignmentStrategy: 'PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 3,
          retryIntervalHours: 2,
          contactHours: 'TIMESLOT_IF_EXISTS'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'BLOCK_TODAY',
          actionAfterRefusal: 'CONTINUE'
        },
        deadline: {
          type: 'DAYS',
          value: -1,
          action: 'MANUAL'
        },
        escalation: {
          flexible: true,
          toleranceHours: 2,
          toleranceType: 'HOURS',
          notifyClientIfTimeChanged: true
        }
      },
      aiOrchestration: {
        considerListingResponsibility: true,
        considerPlanning: true,
        considerRotation: true,
        minScoreThreshold: 60
      },
      clientReminders: {
        enabled: true,
        maxReminders: 3,
        intervalHours: 24,
        actions: ['SEND_WHATSAPP', 'SEND_EMAIL']
      }
    }
  },
  notification_only: {
    name: 'Notification Seulement',
    description: 'Envoie des notifications sans créer de tâches',
    icon: '📢',
    color: '#F59E0B',
    config: {
      enabled: true,
      mode: 'NOTIFICATION_ONLY',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS'
        },
        assignmentStrategy: 'MANUAL',
        escalation: {
          flexible: false,
          steps: []
        }
      },
      aiOrchestration: {
        considerListingResponsibility: false,
        considerPlanning: false,
        considerRotation: false,
        minScoreThreshold: 60
      },
      clientReminders: {
        enabled: true,
        maxReminders: 2,
        intervalHours: 24,
        actions: ['SEND_WHATSAPP']
      }
    }
  },
  manual_simple: {
    name: 'Mode Manuel',
    description: 'Admin assigne manuellement, pas d\'automatisation',
    icon: '👤',
    color: '#6B7280',
    config: {
      enabled: true,
      mode: 'MANUAL',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS'
        },
        assignmentStrategy: 'MANUAL',
        escalation: {
          flexible: false,
          steps: []
        }
      },
      aiOrchestration: {
        considerListingResponsibility: false,
        considerPlanning: false,
        considerRotation: false,
        minScoreThreshold: 60
      },
      clientReminders: {
        enabled: false,
        maxReminders: 0,
        intervalHours: 24,
        actions: []
      }
    }
  },
  quick_response: {
    name: 'Réponse Rapide',
    description: 'Assignation immédiate avec relances fréquentes',
    icon: '⚡',
    color: '#EF4444',
    config: {
      enabled: true,
      mode: 'ORCHESTRATION',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS'
        },
        assignmentStrategy: 'PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 5,
          retryIntervalHours: 1,
          contactHours: 'NOW'
        },
        enableAutomaticRetryNextDays: false,
        staffRefusalPolicy: {
          blockingStrategy: 'BLOCK_PERMANENTLY',
          actionAfterRefusal: 'CONTINUE'
        },
        deadline: {
          type: 'HOURS',
          value: -2,
          action: 'MANUAL'
        },
        escalation: {
          flexible: false,
          toleranceHours: 0,
          toleranceType: 'HOURS',
          notifyClientIfTimeChanged: false
        }
      },
      aiOrchestration: {
        considerListingResponsibility: true,
        considerPlanning: true,
        considerRotation: false,
        minScoreThreshold: 70
      },
      clientReminders: {
        enabled: true,
        maxReminders: 4,
        intervalHours: 12,
        actions: ['SEND_WHATSAPP', 'SEND_EMAIL', 'SEND_SMS']
      }
    }
  }
};

// Composant réutilisable pour les sections de configuration
const ConfigSection = ({
  title,
  icon,
  helper,
  children
}) => <Box sx={{
  p: 2,
  borderRadius: '6px',
  backgroundColor: DS.neutral[50],
  border: `1px solid ${DS.neutral[200]}`
}}>
    <Box mb={helper ? 1 : 2}>
      <Typography variant="subtitle2" sx={{
      fontSize: 13,
      fontWeight: 600,
      color: DS.neutral[900],
      display: 'flex',
      alignItems: 'center',
      gap: 0.75
    }}>
        {icon && <span>{icon}</span>}
        {title}
      </Typography>
      {helper && <Typography variant="caption" sx={{
      fontSize: 11,
      color: DS.neutral[500],
      display: 'block',
      mt: 0.5
    }}>
          {helper}
        </Typography>}
    </Box>
    {children}
  </Box>;

/** Aligné sur ConfigTaskTemplateView : conversion array → objet clé canonique */
function migrateCategoriesFromOrchestratorPayload(responseData) {
  const rawCategories = responseData?.categories;
  const categoriesEntries = Array.isArray(rawCategories) ? rawCategories.map((cat, idx) => {
    const isNotif = cat?.categoryType === 'NOTIFICATION' || cat?.category === 'message' && cat?.type === 'message';
    const key = isNotif ? `message__${cat?.orchestration?.messageTemplateId || cat?.name || idx}` : [cat.category, cat.categoryType].filter(Boolean).join('__') || cat.name || String(cat.order ?? idx);
    return [key, cat];
  }) : Object.entries(rawCategories || {});
  return categoriesEntries.reduce((acc, [key, config]) => {
    if (!config.orchestration) {
      acc[key] = {
        ...config,
        orchestration: {
          createTaskBefore: {
            value: 0,
            unit: 'HOURS'
          },
          assignmentStrategy: 'MANUAL',
          escalation: {
            flexible: false,
            steps: []
          }
        },
        aiOrchestration: config.aiOrchestration || {
          considerListingResponsibility: true,
          considerPlanning: true,
          considerRotation: false,
          minScoreThreshold: 60
        }
      };
    } else {
      acc[key] = config;
    }
    return acc;
  }, {});
}
const TaskTemplateConfig = ({
  activeTab,
  token,
  managedOwnerId,
  blockLoad
}) => {
  const {
    t
  } = useTranslation('common');
  const authUser = useSelector(state => state.auth.user);
  const resolvedOwnerId = useMemo(() => {
    if (managedOwnerId !== undefined) {
      return managedOwnerId ? String(managedOwnerId).trim() : '';
    }
    if (authUser?.role === Roles.Admin || authUser?.role === Roles.SuperAdmin) {
      return String(ORCHESTRATION_ADMIN_OWNER_ID);
    }
    if (authUser?.role === 'Worker' && authUser?.ownerId) {
      return String(authUser.ownerId);
    }
    return String(authUser?._id || authUser?.id || '');
  }, [managedOwnerId, authUser]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [originalCategories, setOriginalCategories] = useState({}); // Pour dirty check
  const [propagateToListings, setPropagateToListings] = useState(false);
  const [viewMode, setViewMode] = useState('card'); // 'card' ou 'table'
  const [tableViewMode, setTableViewMode] = useState('complete'); // 'simple' ou 'complete'
  const [expandedPanel, setExpandedPanel] = useState(null); // Pour les accordions
  const [showPropagateDialog, setShowPropagateDialog] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState([]); // Message templates from API
  const [aiWizardOpen, setAiWizardOpen] = useState(false); // AI Orchestrator Wizard

  // Template management states
  const [showTemplateManager, setShowTemplateManager] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [customTemplates, setCustomTemplates] = useState({});
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateFormData, setTemplateFormData] = useState({
    name: '',
    description: '',
    icon: '📋',
    color: '#6B7280',
    sourceCategory: null // Catégorie source du template
  });

  // Charger les templates custom depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem('taskTemplates_custom');
    if (stored) {
      try {
        setCustomTemplates(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);
  useEffect(() => {
    if (activeTab !== 'tasks') return;
    if (blockLoad || !resolvedOwnerId) {
      setLoading(false);
      setTemplate(null);
      return;
    }
    fetchTemplate();
    fetchMessageTemplates();
  }, [activeTab, resolvedOwnerId, blockLoad]);
  const fetchMessageTemplates = async () => {
    try {
      const response = await getMailTemplate();
      const templates = response?.data?.data || response?.data || [];
      setMessageTemplates(templates);
    } catch (error) {
      toast.error('Erreur lors du chargement des templates de messages');
    }
  };
  const fetchTemplate = async () => {
    if (blockLoad || !resolvedOwnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getOrchestratorTaskTemplate(resolvedOwnerId);
      if (response?.notFound) {
        toast.info('Aucune configuration orchestrateur enregistrée pour ce compte. Enregistrez pour créer le template.', {
          autoClose: 8000
        });
      }
      if (response?.success && response?.data) {
        const raw = response.data.categories;
        const iterable = Array.isArray(raw) ? raw : Object.values(raw || {});
        iterable.forEach((config, idx) => {
          if (config?.orchestration?.messageTemplateId) {}
        });
        const migratedCategories = migrateCategoriesFromOrchestratorPayload(response.data);
        Object.entries(migratedCategories).forEach(([key, config]) => {
          if (config.orchestration?.messageTemplateId) {}
        });
        setTemplate(response.data);
        setEditedCategories(migratedCategories);
        setOriginalCategories(JSON.parse(JSON.stringify(migratedCategories)));
      }
    } catch (error) {
      toast.error('Impossible de charger la configuration');
    } finally {
      setLoading(false);
    }
  };

  // Check si des changements ont été effectués
  const hasChanges = () => {
    return JSON.stringify(editedCategories) !== JSON.stringify(originalCategories);
  };

  // Template functions
  const handleCategorySelect = categoryKey => {
    setSelectedCategories(prev => prev.includes(categoryKey) ? prev.filter(k => k !== categoryKey) : [...prev, categoryKey]);
  };
  const handleSelectAllCategories = () => {
    if (selectedCategories.length === Object.keys(editedCategories).length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(Object.keys(editedCategories));
    }
  };
  const handleApplyTemplate = templateKey => {
    if (selectedCategories.length === 0) {
      toast.error('Sélectionnez au moins une catégorie');
      return;
    }
    const allTemplates = {
      ...PREDEFINED_TEMPLATES,
      ...customTemplates
    };
    const templateConfig = allTemplates[templateKey].config;
    const updatedCategories = {
      ...editedCategories
    };
    selectedCategories.forEach(categoryKey => {
      updatedCategories[categoryKey] = {
        ...updatedCategories[categoryKey],
        ...templateConfig
      };
    });
    setEditedCategories(updatedCategories);
    toast.success(`Template "${allTemplates[templateKey].name}" appliqué à ${selectedCategories.length} catégorie(s)`);
    setShowTemplateManager(false);
    setSelectedCategories([]);
  };

  // Template CRUD functions
  const handleCreateTemplateFromCategory = categoryKey => {
    const categoryConfig = editedCategories[categoryKey];
    setTemplateFormData({
      name: `Template ${CATEGORY_LABELS[categoryKey]}`,
      description: 'Template créé depuis une catégorie existante',
      icon: CATEGORY_LABELS[categoryKey]?.split(' ')[0] || '📋',
      color: '#6B7280',
      sourceCategory: categoryKey // Stocker la catégorie source
    });
    setEditingTemplate({
      config: categoryConfig,
      isNew: true
    });
    setShowTemplateEditor(true);
  };
  const handleCreateBlankTemplate = () => {
    // Vérifier qu'exactement UNE catégorie est sélectionnée
    if (selectedCategories.length === 0) {
      toast.error('Veuillez sélectionner une catégorie pour créer un template');
      return;
    }
    if (selectedCategories.length > 1) {
      toast.error('Veuillez sélectionner une seule catégorie pour créer un template');
      return;
    }

    // Récupérer la catégorie sélectionnée
    const categoryKey = selectedCategories[0];
    const categoryConfig = editedCategories[categoryKey];
    setTemplateFormData({
      name: `Template ${CATEGORY_LABELS[categoryKey]}`,
      description: 'Template créé depuis une catégorie existante',
      icon: CATEGORY_LABELS[categoryKey]?.split(' ')[0] || '📋',
      color: '#6B7280',
      sourceCategory: categoryKey // Catégorie source sélectionnée
    });
    setEditingTemplate({
      isNew: true,
      config: categoryConfig
    });
    setShowTemplateEditor(true);
  };
  const handleEditTemplate = templateKey => {
    const template = customTemplates[templateKey];
    setTemplateFormData({
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      sourceCategory: template.sourceCategory || null // Récupérer la catégorie source
    });
    setEditingTemplate({
      key: templateKey,
      config: template.config,
      isNew: false
    });
    setShowTemplateEditor(true);
  };
  const handleSaveTemplate = () => {
    if (!templateFormData.name.trim()) {
      toast.error('Le nom du template est obligatoire');
      return;
    }
    const templateKey = editingTemplate.isNew ? `custom_${Date.now()}` : editingTemplate.key;
    const newTemplate = {
      name: templateFormData.name,
      description: templateFormData.description,
      icon: templateFormData.icon,
      color: templateFormData.color,
      sourceCategory: templateFormData.sourceCategory,
      // Sauvegarder la catégorie source
      config: editingTemplate.config
    };
    const updated = {
      ...customTemplates,
      [templateKey]: newTemplate
    };
    setCustomTemplates(updated);
    localStorage.setItem('taskTemplates_custom', JSON.stringify(updated));
    toast.success(editingTemplate.isNew ? 'Template créé avec succès' : 'Template mis à jour');
    setShowTemplateEditor(false);
    setEditingTemplate(null);
  };
  const handleDeleteTemplate = templateKey => {
    if (window.confirm('Supprimer ce template ? Cette action est irréversible.')) {
      const updated = {
        ...customTemplates
      };
      delete updated[templateKey];
      setCustomTemplates(updated);
      localStorage.setItem('taskTemplates_custom', JSON.stringify(updated));
      toast.success('Template supprimé');
    }
  };
  const handleCategoryChange = (categoryKey, field, value) => {
    setEditedCategories(prev => {
      const updated = {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          [field]: value
        }
      };

      // Si on passe en mode NOTIFICATION_ONLY, initialiser orchestration si nécessaire
      if (field === 'mode' && value === 'NOTIFICATION_ONLY') {
        if (!updated[categoryKey].orchestration) {
          updated[categoryKey].orchestration = {
            createTaskBefore: {
              trigger: 'AFTER_RESERVATION',
              value: 1,
              unit: 'DAYS'
            },
            assignmentStrategy: 'MANUAL',
            escalation: {
              flexible: false,
              steps: []
            }
          };
        } else if (!updated[categoryKey].orchestration.createTaskBefore) {
          updated[categoryKey].orchestration.createTaskBefore = {
            trigger: 'AFTER_RESERVATION',
            value: 1,
            unit: 'DAYS'
          };
        }
      }
      return updated;
    });
  };
  const handleOrchestrationChange = (categoryKey, field, value) => {
    setEditedCategories(prev => {
      const updated = {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          orchestration: {
            ...prev[categoryKey]?.orchestration,
            [field]: value
          }
        }
      };
      return updated;
    });
  };
  const handleEscalationChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        orchestration: {
          ...prev[categoryKey]?.orchestration,
          escalation: {
            ...prev[categoryKey]?.orchestration?.escalation,
            [field]: value
          }
        }
      }
    }));
  };
  const handleAIOrchestrationChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        aiOrchestration: {
          ...prev[categoryKey]?.aiOrchestration,
          [field]: value
        }
      }
    }));
  };
  const handleDayJLogicChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        orchestration: {
          ...prev[categoryKey]?.orchestration,
          dayJLogic: {
            ...prev[categoryKey]?.orchestration?.dayJLogic,
            [field]: value
          }
        }
      }
    }));
  };
  const handleStaffRefusalPolicyChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        orchestration: {
          ...prev[categoryKey]?.orchestration,
          staffRefusalPolicy: {
            ...prev[categoryKey]?.orchestration?.staffRefusalPolicy,
            [field]: value
          }
        }
      }
    }));
  };
  const handleDeadlineChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        orchestration: {
          ...prev[categoryKey]?.orchestration,
          deadline: {
            ...prev[categoryKey]?.orchestration?.deadline,
            [field]: value
          }
        }
      }
    }));
  };
  const handleCleaningSojoriChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        cleaningSojori: {
          ...prev[categoryKey]?.cleaningSojori,
          [field]: value
        }
      }
    }));
  };
  const handleClientReminderChange = (categoryKey, field, value) => {
    // Déterminer la condition par défaut selon la catégorie
    const getDefaultCondition = key => {
      if (key === 'registration') return 'INCOMPLETE_REGISTRATION';
      if (['arrival_declare', 'departure_declare'].includes(key)) return 'NOT_DECLARED';
      return 'NO_TIMESLOT'; // Pour arrival_choose, departure_choose, cleaning_paid
    };
    setEditedCategories(prev => {
      const existingReminder = prev[categoryKey]?.orchestration?.clientReminder || {};

      // Valeurs par défaut selon le type de catégorie
      const defaults = ['arrival_declare', 'departure_declare'].includes(categoryKey) ? {
        enabled: false,
        hoursAfterChoice: 2,
        condition: getDefaultCondition(categoryKey),
        maxRemindersPerDay: 3,
        preferredHours: ''
      } : {
        enabled: false,
        daysBeforeDeadline: 3,
        condition: getDefaultCondition(categoryKey),
        maxRemindersPerDay: 3,
        preferredHours: ''
      };
      return {
        ...prev,
        [categoryKey]: {
          ...prev[categoryKey],
          orchestration: {
            ...prev[categoryKey]?.orchestration,
            clientReminder: {
              ...defaults,
              ...existingReminder,
              [field]: value
            }
          }
        }
      };
    });
  };
  const handleNotificationChange = (categoryKey, field, value) => {
    setEditedCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        notifications: {
          ...prev[categoryKey]?.notifications,
          [field]: value
        }
      }
    }));
  };
  const handleSave = async () => {
    setSaving(true);
    try {
      // Log what we're sending

      Object.entries(editedCategories).forEach(([key, config]) => {
        if (config.orchestration?.messageTemplateId) {}
      });
      const response = await updateOrchestratorTaskTemplate(resolvedOwnerId, {
        categories: editedCategories,
        propagateToListings
      });
      toast.success(propagateToListings ? 'Configuration sauvegardée et propagée aux listings !' : 'Configuration sauvegardée !');
      // Mettre à jour originalCategories après sauvegarde réussie
      setOriginalCategories(JSON.parse(JSON.stringify(editedCategories)));
      await fetchTemplate();

      // Log what we got back after refetch

      Object.entries(editedCategories).forEach(([key, config]) => {
        if (config.orchestration?.messageTemplateId) {}
      });
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message;
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };
  const handleReset = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir réinitialiser à la configuration par défaut ?')) {
      return;
    }
    if (!resolvedOwnerId) {
      toast.error('Propriétaire cible manquant');
      return;
    }
    setLoading(true);
    try {
      const adminRes = await getOrchestratorTaskTemplate(String(ORCHESTRATION_ADMIN_OWNER_ID));
      if (!adminRes?.success || !adminRes?.data) {
        throw new Error(adminRes?.error || 'Impossible de charger le template admin');
      }
      const migrated = migrateCategoriesFromOrchestratorPayload(adminRes.data);
      await updateOrchestratorTaskTemplate(resolvedOwnerId, {
        categories: migrated,
        propagateToListings: false
      });
      toast.success('Configuration réinitialisée aux valeurs du template admin');
      await fetchTemplate();
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  // Fonction helper pour trier les catégories selon CATEGORY_ORDER
  const getSortedCategories = categories => {
    return Object.entries(categories).sort(([keyA], [keyB]) => {
      const indexA = CATEGORY_ORDER.indexOf(keyA);
      const indexB = CATEGORY_ORDER.indexOf(keyB);
      // Si une catégorie n'est pas dans l'ordre, la mettre à la fin
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };
  if (blockLoad || !resolvedOwnerId) {
    return null;
  }
  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress sx={{
        color: SOJORI_COLORS.primary
      }} />
      </Box>;
  }
  if (!template) {
    return <Alert severity="error">
        Impossible de charger la configuration. Veuillez réessayer.
      </Alert>;
  }

  // ========== MODE CARTE ==========
  const renderCardMode = () => {
    const handleAccordionChange = categoryKey => (event, isExpanded) => {
      setExpandedPanel(isExpanded ? categoryKey : null);
    };
    return <Box display="flex" flexDirection="column" gap={1.5}>
        {getSortedCategories(editedCategories).map(([categoryKey, categoryConfig]) => <Accordion key={categoryKey} expanded={expandedPanel === categoryKey} onChange={handleAccordionChange(categoryKey)} disableGutters elevation={0} sx={{
        border: `1px solid ${DS.neutral[200]}`,
        borderRadius: '8px !important',
        overflow: 'hidden',
        '&:before': {
          display: 'none'
        },
        '&:hover': {
          borderColor: categoryConfig.enabled ? DS.primary[500] : DS.neutral[300],
          boxShadow: DS.shadow.sm
        },
        '&.Mui-expanded': {
          margin: 0,
          borderColor: DS.primary[500]
        }
      }}>
            {/* ACCORDION SUMMARY (collapsed state) */}
            <AccordionSummary expandIcon={<ExpandMoreIcon sx={{
          color: DS.neutral[600]
        }} />} sx={{
          minHeight: 64,
          px: 2.5,
          py: 1.5,
          backgroundColor: categoryConfig.enabled ? alpha(DS.primary[50], 0.4) : DS.neutral[50],
          borderBottom: expandedPanel === categoryKey ? `1px solid ${DS.neutral[200]}` : 'none',
          '& .MuiAccordionSummary-content': {
            margin: 0,
            alignItems: 'center'
          },
          '&:hover': {
            backgroundColor: categoryConfig.enabled ? alpha(DS.primary[50], 0.6) : DS.neutral[100]
          }
        }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" width="100%" pr={1}>
                {/* Left: Status dot + Title */}
                <Box display="flex" alignItems="center" gap={2}>
                  <CircleIcon sx={{
                fontSize: 10,
                color: categoryConfig.enabled ? DS.success[500] : DS.neutral[300]
              }} />

                  {/* Badge d'origine */}
                  {(() => {
                const templateId = categoryConfig.orchestration?.messageTemplateId;
                const template = messageTemplates.find(t => t._id === templateId);
                const configSource = template?.configurationSource;
                if (configSource === 'AI') {
                  return <Chip label="🤖 AI" size="small" sx={{
                    fontSize: '0.65rem',
                    height: 18,
                    backgroundColor: '#E3F2FD',
                    color: '#1976D2',
                    fontWeight: 600
                  }} />;
                } else if (configSource === 'FROM_TEMPLATE') {
                  return <Chip label="📋 Template" size="small" sx={{
                    fontSize: '0.65rem',
                    height: 18,
                    backgroundColor: '#F3E5F5',
                    color: '#7B1FA2',
                    fontWeight: 600
                  }} />;
                } else if (configSource === 'MANUAL') {
                  return <Chip label="✏️ Manuel" size="small" sx={{
                    fontSize: '0.65rem',
                    height: 18,
                    backgroundColor: '#FFF3E0',
                    color: '#E65100',
                    fontWeight: 600
                  }} />;
                } else if (configSource === 'SEED') {
                  return <Chip label="🌱 Admin" size="small" sx={{
                    fontSize: '0.65rem',
                    height: 18,
                    backgroundColor: '#E8F5E9',
                    color: '#2E7D32',
                    fontWeight: 600
                  }} />;
                }
                return null;
              })()}

                  <Typography variant="h6" sx={{
                fontSize: 15,
                fontWeight: 600,
                color: DS.neutral[900]
              }}>
                    {CATEGORY_LABELS[categoryKey]}
                  </Typography>
                </Box>

                {/* Right: Mode chip + Toggle */}
                <Box display="flex" alignItems="center" gap={1.5} onClick={e => e.stopPropagation()}>
                  {categoryConfig.enabled && <Chip label={categoryConfig.mode === 'ORCHESTRATION' ? 'Auto' : categoryConfig.mode === 'NOTIFICATION_ONLY' ? 'Notif' : 'Manuel'} size="small" sx={{
                height: 24,
                fontSize: 12,
                fontWeight: 500,
                backgroundColor: categoryConfig.mode === 'ORCHESTRATION' ? DS.primary[100] : categoryConfig.mode === 'NOTIFICATION_ONLY' ? DS.warning[50] : DS.neutral[200],
                color: categoryConfig.mode === 'ORCHESTRATION' ? DS.primary[600] : categoryConfig.mode === 'NOTIFICATION_ONLY' ? DS.warning[500] : DS.neutral[700]
              }} />}
                  <Switch checked={categoryConfig.enabled} onChange={e => {
                e.stopPropagation();
                handleCategoryChange(categoryKey, 'enabled', e.target.checked);
              }} size="small" sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: DS.success[500]
                }
              }} />
                </Box>
              </Box>
            </AccordionSummary>

            {/* ACCORDION DETAILS (expanded state) */}
            <AccordionDetails sx={{
          p: 0
        }}>
              <Box p={3} display="flex" flexDirection="column" gap={2.5}>

                {/* SI ENABLED: Planning Mode */}
                {categoryConfig.enabled && <FormControl fullWidth size="small">
                    <InputLabel>Création du plan</InputLabel>
                    <Select value={categoryConfig.planningMode || 'INITIAL'} onChange={e => handleCategoryChange(categoryKey, 'planningMode', e.target.value)} label="Création du plan" sx={{
                borderRadius: '6px',
                backgroundColor: 'white'
              }}>
                      <MenuItem value="INITIAL">📋 Plan initial (à la réservation)</MenuItem>
                      <MenuItem value="ON_DEMAND">🎯 Sur demande client</MenuItem>
                    </Select>
                  </FormControl>}

                {/* SI ENABLED: Mode selection */}
                {categoryConfig.enabled && <FormControl fullWidth size="small">
                    <InputLabel>Mode d&apos;assignation</InputLabel>
                    <Select value={categoryConfig.mode || 'MANUAL'} onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)} label="Mode d&apos;assignation" sx={{
                borderRadius: '6px',
                backgroundColor: 'white'
              }}>
                      <MenuItem value="MANUAL">👤 Manuel</MenuItem>
                      <MenuItem value="ORCHESTRATION">🤖 Orchestration</MenuItem>
                      <MenuItem value="NOTIFICATION_ONLY">📢 Notification uniquement</MenuItem>
                    </Select>
                  </FormControl>}

                {/* SI ORCHESTRATION: Toutes les sections */}
                {categoryConfig.enabled && categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration && <Box display="flex" flexDirection="column" gap={2}>

                    {/* Section 2: Quand créer */}
                    <ConfigSection title="⏱️ Création de la tâche" icon="">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Moment de création</InputLabel>
                            <Select value={categoryConfig.orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration.createTaskBefore,
                        trigger: e.target.value
                      })} label="Moment de création" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="AFTER_RESERVATION">📋 Après réservation</MenuItem>
                              <MenuItem value="IMMEDIATE_CLIENT_REQUEST">🕐 Après timeslot</MenuItem>
                              <MenuItem value="BEFORE_EXECUTION">⏰ Avant exécution</MenuItem>
                              <MenuItem value="AFTER_EXECUTION">✅ Après exécution</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField label="Valeur (0 = immédiat)" type="number" size="small" value={categoryConfig.orchestration.createTaskBefore?.value || 0} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                      ...categoryConfig.orchestration.createTaskBefore,
                      value: parseInt(e.target.value) || 0
                    })} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} slotProps={{
                      htmlInput: {
                        min: 0
                      }
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Unité</InputLabel>
                            <Select value={categoryConfig.orchestration.createTaskBefore?.unit || 'HOURS'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration.createTaskBefore,
                        unit: e.target.value
                      })} label="Unité" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="HOURS">Heures</MenuItem>
                              <MenuItem value="DAYS">Jours</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                      </Grid>
                      <Typography variant="caption" display="block" mt={1.5} sx={{
                  fontSize: 11,
                  color: DS.neutral[500],
                  fontStyle: 'italic'
                }}>
                        💡 <strong>Astuce :</strong> Mettez la valeur à <strong>0</strong> pour créer la tâche <strong>immédiatement</strong> après le moment sélectionné.
                      </Typography>
                    </ConfigSection>

                    {/* Section 3: Type + Stratégie d'assignation */}
                    <ConfigSection title="Stratégie d&apos;assignation" icon="🎯" helper="Comment choisir le staff pour cette tâche">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type d&apos;assignataire</InputLabel>
                            <Select value={categoryConfig.orchestration.assignmentType || 'STAFF'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentType', e.target.value)} label="Type d'assignataire" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="STAFF">👷 Staff (vérification planning)</MenuItem>
                              <MenuItem value="MANAGER">🧑‍💼 Manager (assignation directe, pas de planning)</MenuItem>
                            </Select>
                          </FormControl>
                          {(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' && <Alert severity="warning" sx={{
                      mt: 1,
                      fontSize: 11
                    }}>
                              🧑‍💼 Manager : premier manager actif assigné directement, sans vérification planning. La tâche est auto-acceptée. Les champs JOUR J sont ignorés.
                            </Alert>}
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Stratégie</InputLabel>
                            <Select value={categoryConfig.orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentStrategy', e.target.value)} label="Stratégie" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }} disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                              <MenuItem value="PRIORITY">Priorité (selon priorité configurée du staff)</MenuItem>
                              <MenuItem value="ROTATION">Rotation (tour de rôle équitable)</MenuItem>
                              <MenuItem value="MANUAL">Manuel (admin assigne manuellement)</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="caption" display="block" mt={1} sx={{
                      fontSize: 11,
                      color: DS.neutral[500]
                    }}>
                            PRIORITY: Assigne au staff avec la priorité la plus haute. ROTATION: Distribue équitablement. MANUAL: Aucune assignation automatique.
                          </Typography>
                        </Grid>
                      </Grid>
                    </ConfigSection>

                    {/* Section 4: JOUR J */}
                    <ConfigSection title="Logique JOUR J" icon="📅" helper="Assignation le jour même de la tâche">
                      <Alert severity={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 'warning' : 'info'} sx={{
                  mb: 2,
                  fontSize: 12
                }}>
                        {(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? '🧑‍💼 Mode Manager actif — ces champs sont ignorés par le cron.' : 'AI contacte le staff prioritaire, puis relaie apres X heures. Maximum Y relances par jour avant de passer au staff suivant.'}
                      </Alert>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField label="Max relances/jour" type="number" size="small" value={categoryConfig.orchestration.dayJLogic?.maxRetriesPerDay ?? 3} onChange={e => handleDayJLogicChange(categoryKey, 'maxRetriesPerDay', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Par staff sur J" slotProps={{
                      htmlInput: {
                        min: 1,
                        max: 10
                      }
                    }} disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField label="Intervalle (heures)" type="number" size="small" value={categoryConfig.orchestration.dayJLogic?.retryIntervalHours ?? 1} onChange={e => handleDayJLogicChange(categoryKey, 'retryIntervalHours', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Entre relances" slotProps={{
                      htmlInput: {
                        min: 1,
                        max: 24
                      }
                    }} disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth size="small" disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                            <InputLabel>Heures de contact staff</InputLabel>
                            <Select value={typeof categoryConfig.orchestration.dayJLogic?.contactHours === 'string' ? categoryConfig.orchestration.dayJLogic.contactHours : 'CUSTOM'} onChange={e => {
                        if (e.target.value === 'CUSTOM') {
                          handleDayJLogicChange(categoryKey, 'contactHours', ['9-12', '14-18']);
                        } else {
                          handleDayJLogicChange(categoryKey, 'contactHours', e.target.value);
                        }
                      }} label="Heures de contact staff" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }} disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                              <MenuItem value="TIMESLOT_IF_EXISTS">🎯 Si créneau choisi, utiliser créneau</MenuItem>
                              <MenuItem value="STAFF_PLANNING">📅 Selon planning du staff</MenuItem>
                              <MenuItem value="BUSINESS_HOURS">🕘 Horaires fixes (9h-18h)</MenuItem>
                              <MenuItem value="ANYTIME">🌐 N&apos;importe quand</MenuItem>
                              <MenuItem value="CUSTOM">⏰ Créneaux personnalisés</MenuItem>
                            </Select>
                          </FormControl>
                          {Array.isArray(categoryConfig.orchestration.dayJLogic?.contactHours) && <Box mt={1}>
                              <TextField label="Créneaux (ex: 9-12,14-18)" size="small" fullWidth value={categoryConfig.orchestration.dayJLogic.contactHours.join(',')} onChange={e => {
                        const slots = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                        handleDayJLogicChange(categoryKey, 'contactHours', slots);
                      }} sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Format: 9-12,14-18 (séparer par virgule)" />
                            </Box>}
                        </Grid>
                      </Grid>
                      <Alert severity="info" sx={{
                  mt: 2,
                  borderRadius: '6px'
                }}>
                        <strong>Heures de contact :</strong> Moment où on contacte le staff pour lui proposer la tâche (pas l&apos;heure d&apos;exécution)
                      </Alert>
                    </ConfigSection>

                    {/* Section 4: J+1 */}
                    <ConfigSection title="Logique J+1" icon="🔁">
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" color="text.primary">
                          Retry automatique jours suivants
                        </Typography>
                        <Switch checked={categoryConfig.orchestration.enableAutomaticRetryNextDays !== false} onChange={e => handleOrchestrationChange(categoryKey, 'enableAutomaticRetryNextDays', e.target.checked)} color="primary" />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Si activé, AI réessaye automatiquement J+1, J+2, J+3... jusqu&apos;à la deadline avec la même logique (max relances, intervalle, etc.)
                      </Typography>
                    </ConfigSection>

                    {/* Section 5: Refus */}
                    <ConfigSection title="Politique de refus du staff" icon="🚫">
                      {(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' && <Alert severity="warning" sx={{
                  mb: 2,
                  fontSize: 11
                }}>
                          🧑‍💼 Mode Manager — ces champs sont ignorés par le cron.
                        </Alert>}
                      <Typography variant="caption" display="block" mb={2} sx={{
                  fontSize: 11,
                  color: DS.neutral[500]
                }}>
                        Après avoir atteint le max de relances défini ci-dessus (Section JOUR J)
                      </Typography>
                      <Alert severity="warning" sx={{
                  mb: 2,
                  fontSize: 12
                }}>
                        Exemple: Si BLOCK_TODAY + CONTINUE, apres 3 refus le staff A est bloque aujourdhui, AI contacte le staff B.
                      </Alert>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                            A) Blocage du staff
                          </Typography>
                          <RadioGroup value={categoryConfig.orchestration.staffRefusalPolicy?.blockingStrategy ?? 'BLOCK_TODAY'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'blockingStrategy', e.target.value)} sx={{
                      opacity: (categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 0.4 : 1,
                      pointerEvents: (categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 'none' : 'auto'
                    }}>
                            <FormControlLabel value="BLOCK_TODAY" control={<Radio size="small" />} label="Bloquer CE JOUR seulement (J)" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                            <FormControlLabel value="BLOCK_ALWAYS" control={<Radio size="small" />} label="Bloquer TOUJOURS (admin peut débloquer)" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                            <FormControlLabel value="NO_BLOCK" control={<Radio size="small" />} label="Ne pas bloquer" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                          </RadioGroup>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                            B) Action ensuite
                          </Typography>
                          <RadioGroup value={categoryConfig.orchestration.staffRefusalPolicy?.actionAfterRefusal ?? 'CONTINUE'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'actionAfterRefusal', e.target.value)} sx={{
                      opacity: (categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 0.4 : 1,
                      pointerEvents: (categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 'none' : 'auto'
                    }}>
                            <FormControlLabel value="CONTINUE" control={<Radio size="small" />} label="Continuer (essayer staff suivant)" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                            <FormControlLabel value="STOP" control={<Radio size="small" />} label="Arrêter (attendre J+1)" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                          </RadioGroup>
                        </Grid>
                      </Grid>
                    </ConfigSection>

                    {/* Section 6: Reschedule */}
                    {categoryConfig.orchestration.escalation && <ConfigSection title="Reschedule / Décalage horaire" icon="🔄">
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography variant="body2" color="text.primary">
                            Autoriser le reschedule
                          </Typography>
                          <Switch checked={categoryConfig.orchestration.escalation.flexible || false} onChange={e => handleEscalationChange(categoryKey, 'flexible', e.target.checked)} color="primary" />
                        </Box>
                        <Alert severity="success" sx={{
                  mb: 2,
                  fontSize: 12
                }}>
                          Reschedule intelligent: Si aucun staff disponible a 15h, AI cherche dans [13h-21h]. Le client est notifie du nouveau creneau.
                        </Alert>

                        {categoryConfig.orchestration.escalation.flexible && <Grid container spacing={2}>
                            <Grid item xs={12} sm={4}>
                              <TextField label="Tolérance (±)" type="number" size="small" value={categoryConfig.orchestration.escalation.toleranceHours || 2} onChange={e => handleEscalationChange(categoryKey, 'toleranceHours', parseInt(e.target.value) || 2)} slotProps={{
                      htmlInput: {
                        min: 1,
                        max: 12
                      }
                    }} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Fenêtre de recherche" />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Type tolérance</InputLabel>
                                <Select value={categoryConfig.orchestration.escalation.toleranceType || 'HOURS'} onChange={e => handleEscalationChange(categoryKey, 'toleranceType', e.target.value)} label="Type tolérance" sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }}>
                                  <MenuItem value="HOURS">Heures (±Xh)</MenuItem>
                                  <MenuItem value="SAME_DAY">Jours (±Xj)</MenuItem>
                                </Select>
                              </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={4}>
                              <Box sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 1.5,
                      borderRadius: '6px',
                      backgroundColor: 'white',
                      height: '100%'
                    }}>
                                <Typography variant="body2">Notifier client</Typography>
                                <Switch checked={categoryConfig.orchestration.escalation.notifyClientIfTimeChanged || false} onChange={e => handleEscalationChange(categoryKey, 'notifyClientIfTimeChanged', e.target.checked)} color="primary" />
                              </Box>
                            </Grid>
                          </Grid>}
                      </ConfigSection>}

                    {/* Section 7: Deadline */}
                    <ConfigSection title="Deadline" icon="⏰">
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Type deadline</InputLabel>
                            <Select value={categoryConfig.orchestration.deadline?.type ?? 'DAYS'} onChange={e => handleDeadlineChange(categoryKey, 'type', e.target.value)} label="Type deadline" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="DAYS">Jours</MenuItem>
                              <MenuItem value="HOURS">Heures</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField label="Valeur" type="number" size="small" value={categoryConfig.orchestration.deadline?.value ?? -1} onChange={e => handleDeadlineChange(categoryKey, 'value', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="-1 = 1 jour avant" slotProps={{
                      htmlInput: {
                        min: -30,
                        max: 30
                      }
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField label="Heure (0-23)" type="number" size="small" value={categoryConfig.orchestration.deadline?.hour ?? ''} onChange={e => handleDeadlineChange(categoryKey, 'hour', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} placeholder="8" helperText="Heure exécution deadline" slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 23
                      }
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                            Si deadline atteinte sans solution
                          </Typography>
                          <RadioGroup value={categoryConfig.orchestration.deadline?.action ?? 'MANUAL'} onChange={e => handleDeadlineChange(categoryKey, 'action', e.target.value)} row>
                            <FormControlLabel value="MANUAL" control={<Radio size="small" />} label="Assigner à l'Admin" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                            <FormControlLabel value="CANCEL" control={<Radio size="small" />} label="Annuler la tâche" sx={{
                        '& .MuiFormControlLabel-label': {
                          fontSize: 13,
                          color: DS.neutral[700]
                        }
                      }} />
                          </RadioGroup>
                        </Grid>
                      </Grid>
                    </ConfigSection>

                    {/* Section 8: Rappels automatiques client */}
                    {['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) && <ConfigSection title="Rappels automatiques client" icon="📢">
                        <Typography variant="caption" display="block" mb={2} sx={{
                  fontSize: 11,
                  color: DS.neutral[500]
                }}>
                          Relancer automatiquement le client si une action requise n&apos;est pas complétée
                        </Typography>

                        <Grid container spacing={2} alignItems="center">
                          {/* Activer rappels */}
                          <Grid item xs={12}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Switch checked={categoryConfig.orchestration?.clientReminder?.enabled ?? false} onChange={e => handleClientReminderChange(categoryKey, 'enabled', e.target.checked)} color="primary" size="small" />
                              <Typography variant="body2" sx={{
                        fontSize: 13,
                        color: DS.neutral[700]
                      }}>
                                Activer les rappels automatiques
                              </Typography>
                            </Box>
                          </Grid>

                          {categoryConfig.orchestration?.clientReminder?.enabled && <>
                              {/* Condition de rappel */}
                              <Grid item xs={12} sm={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Condition de rappel</InputLabel>
                                  <Select value={categoryConfig.orchestration.clientReminder?.condition ?? (categoryKey === 'registration' ? 'INCOMPLETE_REGISTRATION' : ['arrival_declare', 'departure_declare'].includes(categoryKey) ? 'NOT_DECLARED' : 'NO_TIMESLOT')} onChange={e => handleClientReminderChange(categoryKey, 'condition', e.target.value)} label="Condition de rappel" sx={{
                          backgroundColor: 'white',
                          borderRadius: '6px'
                        }}>
                                    {categoryKey === 'registration' && <MenuItem value="INCOMPLETE_REGISTRATION">Enregistrement incomplet</MenuItem>}
                                    {['arrival_declare', 'departure_declare'].includes(categoryKey) && <MenuItem value="NOT_DECLARED">Pas encore déclaré</MenuItem>}
                                    {['arrival_choose', 'departure_choose', 'cleaning_paid'].includes(categoryKey) && <MenuItem value="NO_TIMESLOT">Pas de timeslot choisi</MenuItem>}
                                  </Select>
                                </FormControl>
                              </Grid>

                              {/* Jours avant OU Heures après */}
                              <Grid item xs={12} sm={6}>
                                {['arrival_declare', 'departure_declare'].includes(categoryKey) ? <TextField label="X heures après le choix" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.hoursAfterChoice ?? 2} onChange={e => handleClientReminderChange(categoryKey, 'hoursAfterChoice', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Heures après que le client ait choisi l'heure" slotProps={{
                        htmlInput: {
                          min: 0,
                          max: 48
                        }
                      }} /> : <TextField label="Rappeler X jours avant" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.daysBeforeDeadline ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'daysBeforeDeadline', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Jours avant la date de référence (checkin/checkout)" slotProps={{
                        htmlInput: {
                          min: 0,
                          max: 30
                        }
                      }} />}
                              </Grid>

                              {/* Nombre de relances par jour */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="Nombre de relances par jour" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.maxRemindersPerDay ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'maxRemindersPerDay', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Nombre maximum de relances par jour (ex: 3)" slotProps={{
                        htmlInput: {
                          min: 1,
                          max: 10
                        }
                      }} />
                              </Grid>

                              {/* Heures de préférence */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="Heures de préférence" type="text" size="small" value={categoryConfig.orchestration.clientReminder?.preferredHours ?? ''} onChange={e => {
                        handleClientReminderChange(categoryKey, 'preferredHours', e.target.value);
                      }} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Format: heures séparées par des tirets (9-15-19). Laisser vide pour envoyer immédiatement." placeholder="9-15-19" />
                              </Grid>

                              {/* Heures AVANT l'exécution du timeslot */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="X heures avant l'exécution" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.hoursBeforeExecution ?? ''} onChange={e => handleClientReminderChange(categoryKey, 'hoursBeforeExecution', e.target.value ? parseInt(e.target.value, 10) : undefined)} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Rappel anticipé avant le timeslot (ex: 2h avant départ)" slotProps={{
                        htmlInput: {
                          min: 0,
                          max: 48
                        }
                      }} placeholder="Ex: 2" />
                              </Grid>

                              {/* Heures APRÈS l'exécution du timeslot */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="X heures après l'exécution" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.hoursAfterExecution ?? ''} onChange={e => handleClientReminderChange(categoryKey, 'hoursAfterExecution', e.target.value ? parseInt(e.target.value, 10) : undefined)} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Rappel si retard après le timeslot (ex: 2h après départ prévu)" slotProps={{
                        htmlInput: {
                          min: 0,
                          max: 48
                        }
                      }} placeholder="Ex: 2" />
                              </Grid>
                            </>}
                        </Grid>
                      </ConfigSection>}

                    {/* Section 9: Ménage Sojori (si cleaning_sojori) */}
                    {categoryKey === 'cleaning_sojori' && categoryConfig.cleaningSojori && <ConfigSection title="Référence Ménage Sojori" icon="🧹">
                        <Typography variant="caption" display="block" mb={2} sx={{
                  fontSize: 11,
                  color: DS.neutral[500]
                }}>
                          L&apos;orchestrateur utilisera ces préférences pour trouver le meilleur créneau entre le départ et l&apos;arrivée suivante
                        </Typography>

                        <Grid container spacing={2}>
                          {/* Fenêtre APRÈS départ */}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                              📤 Fenêtre APRÈS départ client
                            </Typography>
                            <TextField label="Max jours sans ménage après départ" type="number" size="small" value={categoryConfig.cleaningSojori.daysAfterCheckout ?? 1} onChange={e => handleCleaningSojoriChange(categoryKey, 'daysAfterCheckout', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="0 = immédiat, 1 = max 1j après, 2 = max 2j après..." slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 7
                      }
                    }} />
                          </Grid>

                          {/* Préférence AVANT arrivée */}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                              📥 Préférence AVANT arrivée client
                            </Typography>
                            <TextField label="Jours avant arrivée" type="number" size="small" value={categoryConfig.cleaningSojori.daysBeforeCheckin ?? 1} onChange={e => handleCleaningSojoriChange(categoryKey, 'daysBeforeCheckin', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="0 = même jour, 1 = 1j avant (défaut), 2 = 2j avant..." slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 7
                      }
                    }} />
                          </Grid>

                          {/* Marge de sécurité */}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                              ⏱️ Marge avant checkin
                            </Typography>
                            <TextField label="Marge avant checkin" type="number" size="small" value={categoryConfig.cleaningSojori.securityMarginBeforeCheckin ?? 2} onChange={e => handleCleaningSojoriChange(categoryKey, 'securityMarginBeforeCheckin', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Heures de sécurité" slotProps={{
                      htmlInput: {
                        min: 0,
                        max: 24
                      }
                    }} />
                          </Grid>

                          {/* Action si pas assez de temps */}
                          <Grid item xs={12} sm={6}>
                            <Typography variant="caption" display="block" mb={1} sx={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: DS.neutral[600]
                    }}>
                              🚨 Si pas assez de temps
                            </Typography>
                            <FormControl fullWidth size="small">
                              <InputLabel>Action</InputLabel>
                              <Select value={categoryConfig.cleaningSojori.ifNotEnoughTime ?? 'ALERT_ADMIN'} onChange={e => handleCleaningSojoriChange(categoryKey, 'ifNotEnoughTime', e.target.value)} label="Action" sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }}>
                                <MenuItem value="AUTO_LATEST">Auto (dernier moment possible)</MenuItem>
                                <MenuItem value="ALERT_ADMIN">Alerter l&apos;Admin</MenuItem>
                                <MenuItem value="SKIP">Passer (pas de ménage)</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      </ConfigSection>}

                    {/* Section 10: Notifications */}
                    <ConfigSection title="Notifications" icon="📢">
                      <Typography variant="caption" display="block" mb={2} sx={{
                  fontSize: 11,
                  color: DS.neutral[500]
                }}>
                        Configuration des notifications pour l&apos;admin et le client
                      </Typography>

                      <Grid container spacing={3}>
                        {/* Notifications Admin */}
                        <Grid item xs={12}>
                          <Box sx={{
                      backgroundColor: alpha(DS.primary[50], 0.5),
                      borderRadius: '8px',
                      padding: 2,
                      border: `1px solid ${DS.neutral[200]}`
                    }}>
                            <Typography variant="subtitle2" sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: DS.neutral[900],
                        mb: 2
                      }}>
                              👨‍💼 Notifications Admin
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnTaskStart ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnTaskStart', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Début de tâche</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnTaskComplete ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnTaskComplete', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Fin de tâche</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnStaffChange ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnStaffChange', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Changement de staff</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnReschedule ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnReschedule', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Reschedule de tâche</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnStaffRefusal ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnStaffRefusal', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Refus de staff</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyAdminOnDeadline ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnDeadline', e.target.checked)} color="primary" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Deadline atteinte</Typography>} />
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>

                        {/* Notifications Client */}
                        <Grid item xs={12}>
                          <Box sx={{
                      backgroundColor: alpha(DS.success[50], 0.3),
                      borderRadius: '8px',
                      padding: 2,
                      border: `1px solid ${DS.neutral[200]}`
                    }}>
                            <Typography variant="subtitle2" sx={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: DS.neutral[900],
                        mb: 2
                      }}>
                              👤 Notifications Client
                            </Typography>
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={4}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyClientOnTaskStart ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnTaskStart', e.target.checked)} color="success" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Début de tâche</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyClientOnTaskComplete ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnTaskComplete', e.target.checked)} color="success" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Fin de tâche</Typography>} />
                              </Grid>
                              <Grid item xs={12} sm={4}>
                                <FormControlLabel control={<Switch checked={categoryConfig.notifications?.notifyClientOnReschedule ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnReschedule', e.target.checked)} color="success" size="small" />} label={<Typography sx={{
                            fontSize: 13
                          }}>Reschedule de tâche</Typography>} />
                              </Grid>
                            </Grid>
                          </Box>
                        </Grid>
                      </Grid>
                    </ConfigSection>

                    {/* Section Message Template - pour ORCHESTRATION */}
                    <ConfigSection title="Message à envoyer" icon="📨">
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel shrink>Message</InputLabel>
                            <Select value={categoryConfig.orchestration?.messageTemplateId ?? ''} onChange={e => handleOrchestrationChange(categoryKey, 'messageTemplateId', e.target.value)} label="Message" notched displayEmpty sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="">
                                <em style={{
                            color: '#999'
                          }}>Aucun message</em>
                              </MenuItem>
                              {messageTemplates.map(template => <MenuItem key={template._id} value={template._id}>
                                  {template.messageName || template.description || 'Sans nom'}
                                </MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Priorité canal - affiché seulement si un message est sélectionné */}
                        {categoryConfig.orchestration?.messageTemplateId && (() => {
                    const selectedMessage = messageTemplates.find(t => t._id === categoryConfig.orchestration?.messageTemplateId);
                    const messagePriority = selectedMessage?.channelPriority || 'NO_PRIORITY';
                    return <Grid item xs={12}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Priorité canal (définie dans le message)</InputLabel>
                                <Select value={messagePriority} disabled label="Priorité canal (définie dans le message)" sx={{
                          borderRadius: '6px',
                          backgroundColor: '#f5f5f5'
                        }}>
                                  <MenuItem value="NO_PRIORITY">🔄 Orchestrateur décide</MenuItem>
                                  <MenuItem value="OTA_PRIORITY">📧→ Priorité OTA</MenuItem>
                                  <MenuItem value="WHATSAPP_PRIORITY">💬→ Priorité WhatsApp</MenuItem>
                                  <MenuItem value="WHATSAPP_ONLY">💬 WhatsApp uniquement</MenuItem>
                                  <MenuItem value="OTA_ONLY">📧 OTA uniquement</MenuItem>
                                </Select>
                              </FormControl>
                              <Typography variant="caption" display="block" mt={1} sx={{
                        fontSize: 11,
                        color: DS.neutral[500],
                        fontStyle: 'italic'
                      }}>
                                {messagePriority === 'OTA_PRIORITY' && '📧 Envoi prioritaire par email, fallback WhatsApp si échec'}
                                {messagePriority === 'WHATSAPP_PRIORITY' && '💬 Envoi prioritaire par WhatsApp, fallback email si échec'}
                                {messagePriority === 'WHATSAPP_ONLY' && '💬 Envoi uniquement par WhatsApp'}
                                {messagePriority === 'OTA_ONLY' && '📧 Envoi uniquement par email'}
                                {messagePriority === 'NO_PRIORITY' && '🔄 L&apos;orchestrateur choisit le meilleur canal selon le contexte'}
                                {' '}• Pour modifier, allez dans l&apos;onglet Messages
                              </Typography>
                            </Grid>;
                  })()}
                      </Grid>
                    </ConfigSection>

                  </Box>}

                {/* SI NOTIFICATION_ONLY: Configuration du timing uniquement */}
                {categoryConfig.enabled && categoryConfig.mode === 'NOTIFICATION_ONLY' && <Box display="flex" flexDirection="column" gap={2}>
                    <ConfigSection title="Quand envoyer la notification" icon="⏱️">
                      <Grid container spacing={2}>
                        {/* Condition d'envoi */}
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Condition d&apos;envoi</InputLabel>
                            <Select value={categoryConfig.sendNotificationCondition || 'ALWAYS'} onChange={e => handleCategoryChange(categoryKey, 'sendNotificationCondition', e.target.value)} label="Condition d&apos;envoi" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="ALWAYS">✅ Toujours</MenuItem>
                              <MenuItem value="IF_NOT_DONE">⚠️ Si tâche non effectuée</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="caption" display="block" mt={1} sx={{
                      fontSize: 11,
                      color: DS.neutral[500]
                    }}>
                            {categoryConfig.sendNotificationCondition === 'ALWAYS' ? '💡 La notification sera toujours envoyée (ex: message de bienvenue, météo, recommandations).' : '💡 La notification sera envoyée seulement si la tâche n\'est pas encore effectuée.'}
                          </Typography>
                        </Grid>

                        {/* Moment de création */}
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Moment de création</InputLabel>
                            <Select value={categoryConfig.orchestration?.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration?.createTaskBefore,
                        trigger: e.target.value
                      })} label="Moment de création" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="AFTER_RESERVATION">📋 Après réservation</MenuItem>
                              <MenuItem value="IMMEDIATE_CLIENT_REQUEST">🎯 Après demande client</MenuItem>
                              <MenuItem value="BEFORE_ARRIVAL">🚪 Avant arrivée</MenuItem>
                              <MenuItem value="BEFORE_DEPARTURE">👋 Avant départ</MenuItem>
                              <MenuItem value="BEFORE_EXECUTION">⏰ Avant exécution</MenuItem>
                              <MenuItem value="AFTER_EXECUTION">✅ Après exécution</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Valeur + Unité (affichés pour TOUS les moments) */}
                        <Grid item xs={12} sm={3}>
                          <TextField label="Valeur" type="text" size="small" value={categoryConfig.orchestration?.createTaskBefore?.value ?? ''} onChange={e => {
                      const val = e.target.value;
                      // Accepter n'importe quelle saisie (validation sera faite au save backend)
                      // Permet de taper "1-2" sans blocage intermédiaire
                      // Si vide, garder vide (ne pas forcer à 0)
                      handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration?.createTaskBefore,
                        value: val === '' ? '' : val
                      });
                    }} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="0 = immédiat. Pour relances multiples: 1-2 (valable pour jours et heures)" placeholder="Ex: 0, 2, ou 1-2" />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Unité</InputLabel>
                            <Select value={categoryConfig.orchestration?.createTaskBefore?.unit || 'DAYS'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration?.createTaskBefore,
                        unit: e.target.value
                      })} label="Unité" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="HOURS">Heures</MenuItem>
                              <MenuItem value="DAYS">Jours</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Si unité = DAYS: Heures préférées */}
                        {categoryConfig.orchestration?.createTaskBefore?.unit === 'DAYS' && <Grid item xs={12}>
                            <TextField label="Heures préférées (optionnel)" type="text" size="small" value={categoryConfig.orchestration?.createTaskBefore?.preferredHours || ''} onChange={e => {
                      handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration?.createTaskBefore,
                        preferredHours: e.target.value
                      });
                    }} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} placeholder="9-13-19" helperText="Format: heures séparées par des tirets (9-13-19). Laisser vide pour envoyer immédiatement." />
                          </Grid>}
                      </Grid>
                    </ConfigSection>

                    {/* Section Message Template */}
                    <ConfigSection title="Message à envoyer" icon="📨">
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel shrink>Message</InputLabel>
                            <Select value={categoryConfig.orchestration?.messageTemplateId ?? ''} onChange={e => handleOrchestrationChange(categoryKey, 'messageTemplateId', e.target.value)} label="Message" notched displayEmpty sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="">
                                <em style={{
                            color: '#999'
                          }}>Aucun message</em>
                              </MenuItem>
                              {messageTemplates.map(template => <MenuItem key={template._id} value={template._id}>
                                  {template.messageName || template.description || 'Sans nom'}
                                </MenuItem>)}
                            </Select>
                          </FormControl>
                        </Grid>

                        {/* Priorité canal - affiché seulement si un message est sélectionné */}
                        {categoryConfig.orchestration?.messageTemplateId && (() => {
                    const selectedMessage = messageTemplates.find(t => t._id === categoryConfig.orchestration?.messageTemplateId);
                    const messagePriority = selectedMessage?.channelPriority || 'NO_PRIORITY';
                    return <Grid item xs={12}>
                              <FormControl fullWidth size="small">
                                <InputLabel>Priorité canal (définie dans le message)</InputLabel>
                                <Select value={messagePriority} disabled label="Priorité canal (définie dans le message)" sx={{
                          borderRadius: '6px',
                          backgroundColor: '#f5f5f5'
                        }}>
                                  <MenuItem value="NO_PRIORITY">🔄 Orchestrateur décide</MenuItem>
                                  <MenuItem value="OTA_PRIORITY">📧→ Priorité OTA</MenuItem>
                                  <MenuItem value="WHATSAPP_PRIORITY">💬→ Priorité WhatsApp</MenuItem>
                                  <MenuItem value="WHATSAPP_ONLY">💬 WhatsApp uniquement</MenuItem>
                                  <MenuItem value="OTA_ONLY">📧 OTA uniquement</MenuItem>
                                </Select>
                              </FormControl>
                              <Typography variant="caption" display="block" mt={1} sx={{
                        fontSize: 11,
                        color: DS.neutral[500],
                        fontStyle: 'italic'
                      }}>
                                {messagePriority === 'OTA_PRIORITY' && '📧 Envoi prioritaire par email, fallback WhatsApp si échec'}
                                {messagePriority === 'WHATSAPP_PRIORITY' && '💬 Envoi prioritaire par WhatsApp, fallback email si échec'}
                                {messagePriority === 'WHATSAPP_ONLY' && '💬 Envoi uniquement par WhatsApp'}
                                {messagePriority === 'OTA_ONLY' && '📧 Envoi uniquement par email'}
                                {messagePriority === 'NO_PRIORITY' && '🔄 L&apos;orchestrateur choisit le meilleur canal selon le contexte'}
                                {' '}• Pour modifier, allez dans l&apos;onglet Messages
                              </Typography>
                            </Grid>;
                  })()}
                      </Grid>
                    </ConfigSection>
                  </Box>}

              </Box>
            </AccordionDetails>
          </Accordion>)}
      </Box>;
  };

  // ========== EXPORT CSV ==========
  const handleExportCSV = () => {
    try {
      const csvHeaders = ['Tâche', 'Activé', "Mode d'assignation", 'Création: Moment', 'Création: Valeur', 'Création: Unité', 'Stratégie assignation', 'JOUR J: Max relances/jour', 'JOUR J: Intervalle (h)', 'JOUR J: Heures contact', 'J+1: Retry auto jours suivants', 'Refus: Blocage du staff', 'Refus: Action après refus', 'Deadline: Type', 'Deadline: Valeur', 'Deadline: Heure', 'Deadline: Action si atteinte', 'Reschedule: Autoriser', 'Reschedule: Tolérance (±h)', 'Reschedule: Type', 'Reschedule: Notifier client', 'Rappels: Activé', 'Rappels: Condition', 'Rappels: Délai', 'Rappels: Nb relances/jour', 'Rappels: Heures préférées', 'Rappels: h avant exécution', 'Rappels: h après exécution', 'Message: Template', 'Message: Priorité canal', 'Ménage: Max jours après départ', 'Ménage: Jours avant arrivée', 'Ménage: Marge sécurité (h)', 'Ménage: Action si pas assez temps', 'Notif Admin: Début tâche', 'Notif Admin: Fin tâche', 'Notif Admin: Chgt staff', 'Notif Admin: Reschedule', 'Notif Admin: Refus staff', 'Notif Admin: Deadline', 'Notif Client: Début tâche', 'Notif Client: Fin tâche', 'Notif Client: Reschedule'];
      const csvData = Object.entries(editedCategories).map(([categoryKey, categoryConfig]) => {
        const orch = categoryConfig.orchestration || {};
        const dayJLogic = orch.dayJLogic || {};
        const staffRefusalPolicy = orch.staffRefusalPolicy || {};
        const deadline = orch.deadline || staffRefusalPolicy.deadline || {};
        const createTaskBefore = orch.createTaskBefore || {};
        const clientReminder = orch.clientReminder || {};
        const cleaning = categoryConfig.cleaningSojori || {};
        const notif = categoryConfig.notifications || {};

        // Helper pour les booléens
        const boolToStr = val => val === true ? 'Oui' : val === false ? 'Non' : '-';
        const valOrDash = val => val !== undefined && val !== null && val !== '' ? val : '-';
        const arrayToStr = arr => {
          if (!arr) return '-';
          if (Array.isArray(arr)) return arr.length > 0 ? arr.join(', ') : '-';
          return arr; // Si c'est une string comme "STAFF_PLANNING"
        };

        // Récupérer le nom du template de message
        const messageTemplateName = orch.messageTemplateId ? messageTemplates.find(t => t._id === orch.messageTemplateId)?.messageName || orch.messageTemplateId : '-';

        // Récupérer la priorité canal du template
        const channelPriority = orch.messageTemplateId ? messageTemplates.find(t => t._id === orch.messageTemplateId)?.channelPriority || '-' : '-';
        return [CATEGORY_LABELS[categoryKey] || categoryKey, boolToStr(categoryConfig.enabled), valOrDash(categoryConfig.mode), valOrDash(createTaskBefore.trigger), valOrDash(createTaskBefore.value), valOrDash(createTaskBefore.unit), valOrDash(orch.assignmentStrategy), valOrDash(dayJLogic.maxRetriesPerDay), valOrDash(dayJLogic.retryIntervalHours), arrayToStr(dayJLogic.contactHours), arrayToStr(staffRefusalPolicy.autoRetryNextDays), valOrDash(staffRefusalPolicy.blockingStrategy), valOrDash(staffRefusalPolicy.actionAfterRefusal), valOrDash(orch.deadline?.type ?? deadline.type), valOrDash(orch.deadline?.value ?? deadline.value), valOrDash(orch.deadline?.hour), valOrDash(orch.deadline?.action ?? deadline.actionOnReached), boolToStr(orch.allowReschedule), valOrDash(orch.rescheduleToleranceHours), valOrDash(orch.rescheduleType), boolToStr(orch.notifyClientOnReschedule), boolToStr(clientReminder.enabled), valOrDash(clientReminder.condition), valOrDash(clientReminder.daysBeforeDeadline || clientReminder.hoursAfterChoice), valOrDash(clientReminder.maxRemindersPerDay), arrayToStr(clientReminder.preferredHours), valOrDash(clientReminder.hoursBeforeExecution), valOrDash(clientReminder.hoursAfterExecution), messageTemplateName, channelPriority, valOrDash(cleaning.maxDaysAfterCheckout), valOrDash(cleaning.minDaysBeforeNextCheckin), valOrDash(cleaning.securityMarginBeforeCheckin), valOrDash(cleaning.ifNotEnoughTime), boolToStr(notif.notifyAdminOnTaskStart), boolToStr(notif.notifyAdminOnTaskCompletion), boolToStr(notif.notifyAdminOnStaffChange), boolToStr(notif.notifyAdminOnReschedule), boolToStr(notif.notifyAdminOnStaffRefusal), boolToStr(notif.notifyAdminOnDeadlineReached), boolToStr(notif.notifyClientOnTaskStart), boolToStr(notif.notifyClientOnTaskComplete), boolToStr(notif.notifyClientOnReschedule)];
      });
      const csvContent = [csvHeaders.join(','), ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob(['\ufeff' + csvContent], {
        type: 'text/csv;charset=utf-8;'
      });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `task-templates-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(`✅ ${Object.keys(editedCategories).length} catégories exportées avec succès !`);
    } catch (error) {
      toast.error('❌ Erreur lors de l\'export CSV');
    }
  };

  // ========== MODE TABLEAU ==========
  const renderTableMode = () => <TableContainer component={Paper} sx={{
    maxHeight: 'calc(100vh - 250px)',
    overflowY: 'auto',
    overflowX: 'auto',
    border: `1px solid ${DS.neutral[200]}`,
    borderRadius: '8px',
    boxShadow: DS.shadow.md
  }}>
      <Table size="small" stickyHeader sx={{
      minWidth: 2000
    }}>
        <TableHead>
          <TableRow>
            {/* Sticky first column */}
            <TableCell sx={{
            position: 'sticky',
            left: 0,
            zIndex: 3,
            backgroundColor: DS.neutral[50],
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            borderRight: `2px solid ${DS.neutral[300]}`,
            minWidth: 180
          }}>
              Tâche
            </TableCell>
            {/* 1. Activé */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 80,
            backgroundColor: DS.neutral[50]
          }}>Activé</TableCell>
            {/* 2. Mode */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[50]
          }}>Mode d&apos;assignation</TableCell>
            {/* 2b. Planning Mode */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[50]
          }}>📋 Création du plan</TableCell>
            {/* 3. Création de la tâche */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 200,
            backgroundColor: DS.neutral[50]
          }}>⏱️ Création: Moment</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 100,
            backgroundColor: DS.neutral[50]
          }}>⏱️ Création: Valeur (0=immédiat)</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 100,
            backgroundColor: DS.neutral[50]
          }}>⏱️ Création: Unité</TableCell>
            {/* 4. Type + Stratégie d&apos;assignation */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.neutral[100]
          }}>👤 Type assignataire</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[100]
          }}>Stratégie assignation</TableCell>
            {/* 5. JOUR J */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.primary[50]
          }}>JOUR J: Max relances/jour</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.primary[50]
          }}>JOUR J: Intervalle (h)</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 180,
            backgroundColor: DS.primary[50]
          }}>JOUR J: Heures contact</TableCell>
            {/* 6. J+1 */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.success[50]
          }}>J+1: Retry auto jours suivants</TableCell>
            {/* 7. Refus Staff */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: DS.error[50]
          }}>Refus: Blocage du staff</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: DS.error[50]
          }}>Refus: Action après refus</TableCell>
            {/* 8. Deadline */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.warning[50]
          }}>Deadline: Type</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 100,
            backgroundColor: DS.warning[50]
          }}>Deadline: Valeur</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 70,
            backgroundColor: DS.warning[50]
          }}>Deadline: Heure</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: DS.warning[50]
          }}>Deadline: Action si atteinte</TableCell>
            {/* 9. Reschedule */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[100]
          }}>Reschedule: Autoriser</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.neutral[100]
          }}>Reschedule: Tolérance (±h)</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.neutral[100]
          }}>Reschedule: Type</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[100]
          }}>Reschedule: Notifier client</TableCell>
            {/* 10. Rappels Client */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Activé</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 180,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Condition</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Délai (j avant / h après)</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Nb relances/jour</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Heures préférées</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[100]
          }}>Rappels: h avant exécution</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[100]
          }}>Rappels: h après exécution</TableCell>
            {/* 10.5. Message Template */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 200,
            backgroundColor: DS.info[50]
          }}>Message: Template</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 180,
            backgroundColor: DS.info[50]
          }}>Message: Priorité canal</TableCell>
            {/* 10. Ménage Sojori */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[200]
          }}>Ménage: Max jours après départ</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[200]
          }}>Ménage: Jours avant arrivée</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[200]
          }}>Ménage: Marge sécurité (h)</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 180,
            backgroundColor: DS.neutral[200]
          }}>Ménage: Action si pas assez temps</TableCell>
            {/* 11. Notifications Admin */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Début tâche</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Fin tâche</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Chgt staff</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Reschedule</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Refus staff</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.primary[50]
          }}>Notif Admin: Deadline</TableCell>
            {/* 12. Notifications Client */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 130,
            backgroundColor: DS.success[50]
          }}>Notif Client: Début tâche</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: DS.success[50]
          }}>Notif Client: Fin tâche</TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.success[50]
          }}>Notif Client: Reschedule</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {getSortedCategories(editedCategories).map(([categoryKey, categoryConfig]) => <TableRow key={categoryKey} hover sx={{
          '&:hover': {
            backgroundColor: DS.neutral[50]
          },
          backgroundColor: categoryConfig.enabled ? 'white' : DS.neutral[50]
        }}>
              {/* Sticky first column - Tâche */}
              <TableCell sx={{
            position: 'sticky',
            left: 0,
            zIndex: 2,
            backgroundColor: categoryConfig.enabled ? 'white' : DS.neutral[50],
            fontWeight: 600,
            fontSize: 13,
            color: DS.neutral[900],
            borderRight: `2px solid ${DS.neutral[300]}`,
            '&:hover': {
              backgroundColor: DS.neutral[50]
            }
          }}>
                {CATEGORY_LABELS[categoryKey] || categoryKey}
              </TableCell>

              {/* 1. Activé */}
              <TableCell sx={{
            fontSize: 12
          }}>
                <Switch checked={categoryConfig.enabled} onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)} color="primary" size="small" />
              </TableCell>

              {/* 2. Mode assignation */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.mode || 'MANUAL'} onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)} size="small" sx={{
              minWidth: 140,
              fontSize: 12
            }}>
                    <MenuItem value="MANUAL" sx={{
                fontSize: 12
              }}>👤 Manuel</MenuItem>
                    <MenuItem value="ORCHESTRATION" sx={{
                fontSize: 12
              }}>🤖 Orchestration</MenuItem>
                    <MenuItem value="NOTIFICATION_ONLY" sx={{
                fontSize: 12
              }}>📢 Notification</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 3. Création: Moment */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode !== 'ORCHESTRATION' ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
              ...categoryConfig.orchestration.createTaskBefore,
              trigger: e.target.value
            })} size="small" sx={{
              minWidth: 190,
              fontSize: 12
            }}>
                    <MenuItem value="AFTER_RESERVATION" sx={{
                fontSize: 11
              }}>📋 Après réservation</MenuItem>
                    <MenuItem value="IMMEDIATE_CLIENT_REQUEST" sx={{
                fontSize: 11
              }}>🕐 Après timeslot</MenuItem>
                    <MenuItem value="BEFORE_EXECUTION" sx={{
                fontSize: 11
              }}>⏰ Avant exécution</MenuItem>
                    <MenuItem value="AFTER_EXECUTION" sx={{
                fontSize: 11
              }}>✅ Après exécution</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 4. Création: Valeur */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode !== 'ORCHESTRATION' ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <TextField type="number" size="small" placeholder="0 = immédiat" value={categoryConfig.orchestration.createTaskBefore?.value || 0} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
              ...categoryConfig.orchestration.createTaskBefore,
              value: parseInt(e.target.value) || 0
            })} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 5. Création: Unité */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode !== 'ORCHESTRATION' ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.createTaskBefore?.unit || 'HOURS'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
              ...categoryConfig.orchestration.createTaskBefore,
              unit: e.target.value
            })} size="small" sx={{
              minWidth: 90,
              fontSize: 12
            }}>
                    <MenuItem value="HOURS" sx={{
                fontSize: 11
              }}>Heures</MenuItem>
                    <MenuItem value="DAYS" sx={{
                fontSize: 11
              }}>Jours</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 6a. Type assignataire */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.assignmentType || 'STAFF'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentType', e.target.value)} size="small" sx={{
              minWidth: 120,
              fontSize: 12
            }}>
                    <MenuItem value="STAFF" sx={{
                fontSize: 12
              }}>👷 Staff</MenuItem>
                    <MenuItem value="MANAGER" sx={{
                fontSize: 12
              }}>🧑‍💼 Manager</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 6b. Stratégie assignation */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentStrategy', e.target.value)} size="small" sx={{
              minWidth: 130,
              fontSize: 12
            }} disabled={(categoryConfig.orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                    <MenuItem value="PRIORITY" sx={{
                fontSize: 12
              }}>Priority</MenuItem>
                    <MenuItem value="ROTATION" sx={{
                fontSize: 12
              }}>Rotation</MenuItem>
                    <MenuItem value="MANUAL" sx={{
                fontSize: 12
              }}>Manuel</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 7. JOUR J: Max relances/jour */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                {categoryConfig.enabled ? <TextField type="number" size="small" value={categoryConfig.orchestration?.dayJLogic?.maxRetriesPerDay ?? 3} onChange={e => handleDayJLogicChange(categoryKey, 'maxRetriesPerDay', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 10
              }
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 8. JOUR J: Intervalle (h) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                {categoryConfig.enabled ? <TextField type="number" size="small" value={categoryConfig.orchestration?.dayJLogic?.retryIntervalHours ?? 2} onChange={e => handleDayJLogicChange(categoryKey, 'retryIntervalHours', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 1,
                max: 12
              }
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 9. JOUR J: Heures contact */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                {categoryConfig.enabled ? <Box>
                    <Select value={typeof categoryConfig.orchestration?.dayJLogic?.contactHours === 'string' ? categoryConfig.orchestration.dayJLogic.contactHours : 'CUSTOM'} onChange={e => {
                if (e.target.value === 'CUSTOM') {
                  handleDayJLogicChange(categoryKey, 'contactHours', ['9-12', '14-18']);
                } else {
                  handleDayJLogicChange(categoryKey, 'contactHours', e.target.value);
                }
              }} size="small" sx={{
                minWidth: 180,
                fontSize: 12
              }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                      <MenuItem value="TIMESLOT_IF_EXISTS" sx={{
                  fontSize: 11
                }}>🎯 Si créneau</MenuItem>
                      <MenuItem value="STAFF_PLANNING" sx={{
                  fontSize: 11
                }}>📅 Planning staff</MenuItem>
                      <MenuItem value="BUSINESS_HOURS" sx={{
                  fontSize: 11
                }}>🕘 9h-18h</MenuItem>
                      <MenuItem value="ANYTIME" sx={{
                  fontSize: 11
                }}>🌐 Anytime</MenuItem>
                      <MenuItem value="CUSTOM" sx={{
                  fontSize: 11
                }}>⏰ Personnalisé</MenuItem>
                    </Select>
                    {Array.isArray(categoryConfig.orchestration?.dayJLogic?.contactHours) && <TextField size="small" fullWidth value={categoryConfig.orchestration.dayJLogic.contactHours.join(',')} onChange={e => {
                const slots = e.target.value.split(',').map(s => s.trim()).filter(s => s);
                handleDayJLogicChange(categoryKey, 'contactHours', slots);
              }} sx={{
                mt: 0.5
              }} slotProps={{
                htmlInput: {
                  style: {
                    fontSize: 11
                  }
                }
              }} placeholder="9-12,14-18" disabled={categoryConfig.mode !== 'ORCHESTRATION'} />}
                  </Box> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 10. J+1: Retry auto jours suivants */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.success[50]
          }}>
                {categoryConfig.enabled ? <Switch checked={categoryConfig.orchestration?.enableAutomaticRetryNextDays ?? false} onChange={e => handleOrchestrationChange(categoryKey, 'enableAutomaticRetryNextDays', e.target.checked)} color="primary" size="small" disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 11. Refus: Blocage du staff */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.error[50]
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.orchestration?.staffRefusalPolicy?.blockingStrategy ?? 'BLOCK_TODAY'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'blockingStrategy', e.target.value)} size="small" sx={{
              minWidth: 140,
              fontSize: 12
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                    <MenuItem value="BLOCK_TODAY" sx={{
                fontSize: 11
              }}>Bloquer CE JOUR</MenuItem>
                    <MenuItem value="BLOCK_ALWAYS" sx={{
                fontSize: 11
              }}>Bloquer TOUJOURS</MenuItem>
                    <MenuItem value="NO_BLOCK" sx={{
                fontSize: 11
              }}>Ne pas bloquer</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 12. Refus: Action après refus */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.error[50]
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.orchestration?.staffRefusalPolicy?.actionAfterRefusal ?? 'ASSIGN_ADMIN'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'actionAfterRefusal', e.target.value)} size="small" sx={{
              minWidth: 140,
              fontSize: 12
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                    <MenuItem value="ASSIGN_ADMIN" sx={{
                fontSize: 11
              }}>Admin</MenuItem>
                    <MenuItem value="FIND_ANOTHER" sx={{
                fontSize: 11
              }}>Autre staff</MenuItem>
                    <MenuItem value="CANCEL" sx={{
                fontSize: 11
              }}>Annuler</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 13. Deadline: Type */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.warning[50]
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.orchestration?.deadline?.type ?? 'DAYS'} onChange={e => handleDeadlineChange(categoryKey, 'type', e.target.value)} size="small" sx={{
              minWidth: 110,
              fontSize: 12
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                    <MenuItem value="DAYS" sx={{
                fontSize: 11
              }}>Jours</MenuItem>
                    <MenuItem value="HOURS" sx={{
                fontSize: 11
              }}>Heures</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 14. Deadline: Valeur */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.warning[50]
          }}>
                {categoryConfig.enabled ? <TextField type="number" size="small" value={categoryConfig.orchestration?.deadline?.value ?? 2} onChange={e => handleDeadlineChange(categoryKey, 'value', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 1,
                max: 48
              }
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 14b. Deadline: Heure (0-23) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.warning[50]
          }}>
                {categoryConfig.enabled ? <TextField type="number" size="small" value={categoryConfig.orchestration?.deadline?.hour ?? ''} onChange={e => handleDeadlineChange(categoryKey, 'hour', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} sx={{
              width: 60
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 23
              }
            }} placeholder="8" disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 15. Deadline: Action si atteinte */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.warning[50]
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.orchestration?.deadline?.action ?? 'MANUAL'} onChange={e => handleDeadlineChange(categoryKey, 'action', e.target.value)} size="small" sx={{
              minWidth: 140,
              fontSize: 12
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                    <MenuItem value="MANUAL" sx={{
                fontSize: 11
              }}>Assigner à l&apos;Admin</MenuItem>
                    <MenuItem value="CANCEL" sx={{
                fontSize: 11
              }}>Annuler la tâche</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 16. Reschedule: Autoriser */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled ? <Switch checked={categoryConfig.orchestration?.escalation?.flexible ?? false} onChange={e => handleEscalationChange(categoryKey, 'flexible', e.target.checked)} color="primary" size="small" disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 17. Reschedule: Tolérance (±h) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled ? categoryConfig.orchestration?.escalation?.flexible === true ? <TextField type="number" size="small" value={categoryConfig.orchestration?.escalation?.toleranceHours ?? 2} onChange={e => handleEscalationChange(categoryKey, 'toleranceHours', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 12
              }
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 18. Reschedule: Type */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled ? categoryConfig.orchestration?.escalation?.flexible === true ? <Select value={categoryConfig.orchestration?.escalation?.toleranceType ?? 'HOURS'} onChange={e => handleEscalationChange(categoryKey, 'toleranceType', e.target.value)} size="small" sx={{
              minWidth: 120,
              fontSize: 12
            }} disabled={categoryConfig.mode !== 'ORCHESTRATION'}>
                      <MenuItem value="HOURS" sx={{
                fontSize: 11
              }}>Heures</MenuItem>
                      <MenuItem value="SAME_DAY" sx={{
                fontSize: 11
              }}>Même jour</MenuItem>
                    </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 19. Reschedule: Notifier client */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled ? categoryConfig.orchestration?.escalation?.flexible === true ? <Switch checked={categoryConfig.orchestration?.escalation?.notifyClientIfTimeChanged ?? false} onChange={e => handleEscalationChange(categoryKey, 'notifyClientIfTimeChanged', e.target.checked)} color="primary" size="small" disabled={categoryConfig.mode !== 'ORCHESTRATION'} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 20. Rappels: Activé */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <Switch checked={categoryConfig.orchestration?.clientReminder?.enabled ?? false} onChange={e => handleClientReminderChange(categoryKey, 'enabled', e.target.checked)} color="primary" size="small" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 21. Rappels: Condition */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <Select value={categoryConfig.orchestration?.clientReminder?.condition ?? (categoryKey === 'registration' ? 'INCOMPLETE_REGISTRATION' : ['arrival_declare', 'departure_declare'].includes(categoryKey) ? 'NOT_DECLARED' : 'NO_TIMESLOT')} onChange={e => handleClientReminderChange(categoryKey, 'condition', e.target.value)} size="small" sx={{
              minWidth: 170,
              fontSize: 12
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled}>
                    {categoryKey === 'registration' && <MenuItem value="INCOMPLETE_REGISTRATION" sx={{
                fontSize: 11
              }}>Enregistrement incomplet</MenuItem>}
                    {['arrival_declare', 'departure_declare'].includes(categoryKey) && <MenuItem value="NOT_DECLARED" sx={{
                fontSize: 11
              }}>Non déclaré</MenuItem>}
                    {['arrival_choose', 'departure_choose', 'cleaning_paid'].includes(categoryKey) && <MenuItem value="NO_TIMESLOT" sx={{
                fontSize: 11
              }}>Pas de créneau</MenuItem>}
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 22. Rappels: X jours avant OU X heures après */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? ['arrival_declare', 'departure_declare'].includes(categoryKey) ? <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.hoursAfterChoice ?? 2} onChange={e => handleClientReminderChange(categoryKey, 'hoursAfterChoice', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 48
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="h après" /> : <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.daysBeforeDeadline ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'daysBeforeDeadline', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 1,
                max: 14
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="j avant" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 23. Rappels: Nombre de relances par jour */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.maxRemindersPerDay ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'maxRemindersPerDay', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 1,
                max: 10
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 24. Rappels: Heures préférées */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <TextField type="text" size="small" value={categoryConfig.orchestration?.clientReminder?.preferredHours ?? ''} onChange={e => {
              handleClientReminderChange(categoryKey, 'preferredHours', e.target.value);
            }} sx={{
              width: 120
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                }
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="9-15-19" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 25. Rappels: h avant exécution */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.hoursBeforeExecution ?? ''} onChange={e => handleClientReminderChange(categoryKey, 'hoursBeforeExecution', e.target.value ? parseInt(e.target.value, 10) : undefined)} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 48
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="Ex: 2" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 26. Rappels: h après exécution */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) ? <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.hoursAfterExecution ?? ''} onChange={e => handleClientReminderChange(categoryKey, 'hoursAfterExecution', e.target.value ? parseInt(e.target.value, 10) : undefined)} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 48
              }
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="Ex: 2" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 26.1. Message: Template */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.info[50]
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.orchestration?.messageTemplateId ?? ''} onChange={e => handleOrchestrationChange(categoryKey, 'messageTemplateId', e.target.value)} size="small" displayEmpty sx={{
              minWidth: 190,
              fontSize: 12
            }}>
                    <MenuItem value="" sx={{
                fontSize: 11,
                fontStyle: 'italic'
              }}>Aucun message</MenuItem>
                    {messageTemplates.map(template => <MenuItem key={template._id} value={template._id} sx={{
                fontSize: 11
              }}>
                        {template.description || template.messageName || 'Sans nom'}
                      </MenuItem>)}
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 26.2. Message: Priorité canal */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.info[50]
          }}>
                {categoryConfig.enabled && categoryConfig.orchestration?.messageTemplateId ? <Select value={categoryConfig.orchestration?.channelPriority ?? 'NO_PRIORITY'} onChange={e => handleOrchestrationChange(categoryKey, 'channelPriority', e.target.value)} size="small" sx={{
              minWidth: 170,
              fontSize: 12
            }}>
                    <MenuItem value="NO_PRIORITY" sx={{
                fontSize: 11
              }}>Aucune priorité</MenuItem>
                    <MenuItem value="OTA_PRIORITY" sx={{
                fontSize: 11
              }}>📧 Priorité OTA</MenuItem>
                    <MenuItem value="WHATSAPP_PRIORITY" sx={{
                fontSize: 11
              }}>💬 Priorité WhatsApp</MenuItem>
                    <MenuItem value="WHATSAPP_ONLY" sx={{
                fontSize: 11
              }}>💬 WhatsApp uniquement</MenuItem>
                    <MenuItem value="OTA_ONLY" sx={{
                fontSize: 11
              }}>📧 OTA uniquement</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 27. Ménage: Max jours après départ */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[200]
          }}>
                {categoryKey === 'cleaning_sojori' && categoryConfig.cleaningSojori ? <TextField type="number" size="small" value={categoryConfig.cleaningSojori.daysAfterCheckout ?? 1} onChange={e => handleCleaningSojoriChange(categoryKey, 'daysAfterCheckout', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 7
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 24. Ménage: Jours avant arrivée */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[200]
          }}>
                {categoryKey === 'cleaning_sojori' && categoryConfig.cleaningSojori ? <TextField type="number" size="small" value={categoryConfig.cleaningSojori.daysBeforeCheckin ?? 1} onChange={e => handleCleaningSojoriChange(categoryKey, 'daysBeforeCheckin', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 7
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 25. Ménage: Marge sécurité (h) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[200]
          }}>
                {categoryKey === 'cleaning_sojori' && categoryConfig.cleaningSojori ? <TextField type="number" size="small" value={categoryConfig.cleaningSojori.securityMarginBeforeCheckin ?? 2} onChange={e => handleCleaningSojoriChange(categoryKey, 'securityMarginBeforeCheckin', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} slotProps={{
              htmlInput: {
                style: {
                  fontSize: 12
                },
                min: 0,
                max: 24
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 26. Ménage: Action si pas assez temps */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[200]
          }}>
                {categoryKey === 'cleaning_sojori' && categoryConfig.cleaningSojori ? <Select value={categoryConfig.cleaningSojori.ifNotEnoughTime ?? 'ALERT_ADMIN'} onChange={e => handleCleaningSojoriChange(categoryKey, 'ifNotEnoughTime', e.target.value)} size="small" sx={{
              minWidth: 170,
              fontSize: 12
            }}>
                    <MenuItem value="AUTO_LATEST" sx={{
                fontSize: 11
              }}>Auto (dernier moment)</MenuItem>
                    <MenuItem value="ALERT_ADMIN" sx={{
                fontSize: 11
              }}>Alerter l&apos;Admin</MenuItem>
                    <MenuItem value="SKIP" sx={{
                fontSize: 11
              }}>Passer (pas de ménage)</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 27. Notif Admin: Début tâche */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnTaskStart ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnTaskStart', e.target.checked)} size="small" />
              </TableCell>

              {/* 28. Notif Admin: Fin tâche */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnTaskComplete ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnTaskComplete', e.target.checked)} size="small" />
              </TableCell>

              {/* 29. Notif Admin: Chgt staff */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnStaffChange ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnStaffChange', e.target.checked)} size="small" />
              </TableCell>

              {/* 30. Notif Admin: Reschedule */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnReschedule ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnReschedule', e.target.checked)} size="small" />
              </TableCell>

              {/* 31. Notif Admin: Refus staff */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnStaffRefusal ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnStaffRefusal', e.target.checked)} size="small" />
              </TableCell>

              {/* 32. Notif Admin: Deadline */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.primary[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyAdminOnDeadline ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyAdminOnDeadline', e.target.checked)} size="small" />
              </TableCell>

              {/* 33. Notif Client: Début tâche */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.success[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyClientOnTaskStart ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnTaskStart', e.target.checked)} size="small" />
              </TableCell>

              {/* 34. Notif Client: Fin tâche */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.success[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyClientOnTaskComplete ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnTaskComplete', e.target.checked)} size="small" />
              </TableCell>

              {/* 35. Notif Client: Reschedule */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.success[50]
          }}>
                <Switch checked={categoryConfig.notifications?.notifyClientOnReschedule ?? false} onChange={e => handleNotificationChange(categoryKey, 'notifyClientOnReschedule', e.target.checked)} size="small" />
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>;
  return <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Configuration Orchestration
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<PlaylistAddCheckIcon />} onClick={() => setShowTemplateManager(true)} sx={{
          borderColor: DS.primary[500],
          color: DS.primary[500],
          '&:hover': {
            borderColor: DS.primary[600],
            backgroundColor: DS.primary[50]
          }
        }}>
            Appliquer Template
          </Button>
          <Button variant="outlined" startIcon={<RestoreIcon />} onClick={handleReset} sx={{
          borderColor: SOJORI_COLORS.gray[300],
          color: SOJORI_COLORS.gray[700],
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            backgroundColor: SOJORI_COLORS.primaryPale
          }
        }}>
            Réinitialiser
          </Button>
          <Button variant="contained" startIcon={<PsychologyIcon />} onClick={() => setAiWizardOpen(true)} sx={{
          backgroundColor: SOJORI_COLORS.primary,
          color: 'white',
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            ⚡ Configuration AI
          </Button>
          <FormControlLabel control={<Switch checked={propagateToListings} onChange={e => {
          if (e.target.checked) {
            // Ouvrir dialog de confirmation si on active la propagation
            setShowPropagateDialog(true);
          } else {
            // Désactiver sans confirmation
            setPropagateToListings(false);
          }
        }} color="primary" />} label="Propager aux listings existants" sx={{
          mr: 2
        }} />
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || !hasChanges()} sx={{
          backgroundColor: SOJORI_COLORS.primary,
          color: '#ffffff !important',
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            {saving ? 'Sauvegarde...' : hasChanges() ? 'Sauvegarder' : 'Aucun changement'}
          </Button>
        </Box>
      </Box>

      {/* Tabs pour changer de mode */}
      <Paper elevation={2} sx={{
      mb: 3
    }}>
        <Tabs value={viewMode} onChange={(e, newValue) => setViewMode(newValue)} sx={{
        borderBottom: 1,
        borderColor: 'divider',
        '& .MuiTab-root': {
          minHeight: 48
        },
        '& .Mui-selected': {
          color: SOJORI_COLORS.primary
        }
      }}>
          <Tab icon={<ViewModuleIcon />} iconPosition="start" label="Mode Carte" value="card" />
          <Tab icon={<TableChartIcon />} iconPosition="start" label="Mode Tableau" value="table" />
        </Tabs>
      </Paper>

      {/* Render selon le mode */}
      {viewMode === 'table' && <Box sx={{
      mb: 2,
      display: 'flex',
      justifyContent: 'flex-end'
    }}>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCSV} sx={{
        borderColor: SOJORI_COLORS.primary,
        color: SOJORI_COLORS.primary,
        '&:hover': {
          borderColor: SOJORI_COLORS.primaryDark,
          backgroundColor: alpha(SOJORI_COLORS.primary, 0.1)
        }
      }}>
            {t('Export CSV')} ({Object.keys(editedCategories).length})
          </Button>
        </Box>}
      {viewMode === 'card' ? renderCardMode() : renderTableMode()}

      {/* Dialog Template Manager */}
      <Dialog open={showTemplateManager} onClose={() => {
      setShowTemplateManager(false);
      setSelectedCategories([]);
    }} maxWidth="md" fullWidth>
        <DialogTitle sx={{
        borderBottom: `2px solid ${DS.primary[500]}`
      }}>
          <Box display="flex" alignItems="center" gap={1}>
            <PlaylistAddCheckIcon sx={{
            color: DS.primary[500]
          }} />
            <Typography variant="h6" fontWeight={600}>
              Appliquer un Template
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{
        pt: 3
      }}>
          {/* Étape 1: Sélection des catégories */}
          <Box mb={3}>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              1. Sélectionnez les catégories à modifier
            </Typography>
            <Box sx={{
            border: `1px solid ${DS.neutral[300]}`,
            borderRadius: '8px',
            p: 2,
            backgroundColor: DS.neutral[50]
          }}>
              <Box display="flex" alignItems="center" mb={2}>
                <FormControlLabel control={<Checkbox checked={selectedCategories.length === Object.keys(editedCategories).length} indeterminate={selectedCategories.length > 0 && selectedCategories.length < Object.keys(editedCategories).length} onChange={handleSelectAllCategories} />} label={<Typography fontWeight={600}>
                      Tout sélectionner ({selectedCategories.length}/
                      {Object.keys(editedCategories).length})
                    </Typography>} />
              </Box>
              <Divider sx={{
              mb: 2
            }} />
              <Grid container spacing={1}>
                {Object.keys(editedCategories).map(categoryKey => <Grid item xs={6} sm={4} key={categoryKey}>
                    <FormControlLabel control={<Checkbox size="small" checked={selectedCategories.includes(categoryKey)} onChange={() => handleCategorySelect(categoryKey)} />} label={<Typography fontSize={13}>
                          {CATEGORY_LABELS[categoryKey] || categoryKey}
                        </Typography>} />
                  </Grid>)}
              </Grid>
            </Box>
          </Box>

          {/* Étape 2: Sélection du template */}
          <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                2. Choisissez un template
              </Typography>
              <Button size="small" variant="outlined" startIcon={<ContentCopyIcon />} onClick={handleCreateBlankTemplate} sx={{
              borderColor: DS.primary[500],
              color: DS.primary[500],
              fontSize: 12
            }}>
                Créer un nouveau
              </Button>
            </Box>

            {/* Templates par défaut */}
            <Typography variant="caption" fontWeight={600} color="text.secondary" mb={1} display="block">
              TEMPLATES PAR DÉFAUT (lecture seule)
            </Typography>
            <Grid container spacing={2} mb={3}>
              {Object.entries(PREDEFINED_TEMPLATES).map(([key, template]) => <Grid item xs={12} sm={6} key={key}>
                  <Card sx={{
                cursor: 'pointer',
                border: `2px solid`,
                borderColor: selectedTemplate === key ? template.color : DS.neutral[300],
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: template.color,
                  boxShadow: `0 4px 12px ${alpha(template.color, 0.2)}`,
                  transform: 'translateY(-2px)'
                }
              }} onClick={() => setSelectedTemplate(key)}>
                    <CardContent>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography fontSize={24}>{template.icon}</Typography>
                        <Typography variant="h6" fontSize={15} fontWeight={600} sx={{
                      color: template.color
                    }}>
                          {template.name}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary" fontSize={12}>
                        {template.description}
                      </Typography>
                      {selectedTemplate === key && <Chip label="Sélectionné" size="small" sx={{
                    mt: 1,
                    backgroundColor: template.color,
                    color: 'white',
                    fontWeight: 600
                  }} />}
                    </CardContent>
                  </Card>
                </Grid>)}
            </Grid>

            {/* Templates custom */}
            {Object.keys(customTemplates).length > 0 && <>
                <Typography variant="caption" fontWeight={600} color="text.secondary" mb={1} display="block">
                  MES TEMPLATES (modifiables)
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(customTemplates).map(([key, template]) => <Grid item xs={12} sm={6} key={key}>
                      <Card sx={{
                  cursor: 'pointer',
                  border: `2px solid`,
                  borderColor: selectedTemplate === key ? template.color : DS.neutral[300],
                  transition: 'all 0.2s',
                  position: 'relative',
                  '&:hover': {
                    borderColor: template.color,
                    boxShadow: `0 4px 12px ${alpha(template.color, 0.2)}`,
                    transform: 'translateY(-2px)'
                  }
                }} onClick={() => setSelectedTemplate(key)}>
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <Typography fontSize={24}>{template.icon}</Typography>
                            <Typography variant="h6" fontSize={15} fontWeight={600} sx={{
                        color: template.color,
                        flex: 1
                      }}>
                              {template.name}
                            </Typography>
                            <Box display="flex" gap={0.5}>
                              <Tooltip title="Éditer ce template">
                                <IconButton size="small" onClick={e => {
                            e.stopPropagation();
                            handleEditTemplate(key);
                          }} sx={{
                            p: 0.5,
                            backgroundColor: alpha(DS.primary[500], 0.1),
                            '&:hover': {
                              backgroundColor: alpha(DS.primary[500], 0.2)
                            }
                          }}>
                                  <EditIcon sx={{
                              fontSize: 18,
                              color: DS.primary[600]
                            }} />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Supprimer ce template">
                                <IconButton size="small" onClick={e => {
                            e.stopPropagation();
                            handleDeleteTemplate(key);
                          }} sx={{
                            p: 0.5,
                            backgroundColor: alpha(DS.error[500], 0.1),
                            '&:hover': {
                              backgroundColor: alpha(DS.error[500], 0.2)
                            }
                          }}>
                                  <DeleteIcon sx={{
                              fontSize: 18,
                              color: DS.error[600]
                            }} />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </Box>
                          <Typography variant="body2" color="text.secondary" fontSize={12}>
                            {template.description}
                          </Typography>
                          <Box display="flex" gap={0.5} mt={1} flexWrap="wrap">
                            {template.sourceCategory && <Chip label={`Depuis: ${CATEGORY_LABELS[template.sourceCategory] || template.sourceCategory}`} size="small" sx={{
                        backgroundColor: DS.neutral[100],
                        color: DS.neutral[700],
                        fontSize: 11,
                        height: 22
                      }} />}
                            {selectedTemplate === key && <Chip label="Sélectionné" size="small" sx={{
                        backgroundColor: template.color,
                        color: 'white',
                        fontWeight: 600
                      }} />}
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>)}
                </Grid>
              </>}
          </Box>

          {selectedCategories.length > 0 && selectedTemplate && <Alert severity="info" sx={{
          mt: 3
        }}>
              Le template <strong>{{
              ...PREDEFINED_TEMPLATES,
              ...customTemplates
            }[selectedTemplate]?.name}</strong> sera
              appliqué à <strong>{selectedCategories.length} catégorie(s)</strong>
            </Alert>}
        </DialogContent>
        <DialogActions sx={{
        px: 3,
        pb: 2,
        pt: 2,
        borderTop: `1px solid ${DS.neutral[200]}`
      }}>
          <Button onClick={() => {
          setShowTemplateManager(false);
          setSelectedCategories([]);
          setSelectedTemplate(null);
        }} sx={{
          color: DS.neutral[600]
        }}>
            Annuler
          </Button>
          <Button onClick={() => handleApplyTemplate(selectedTemplate)} disabled={selectedCategories.length === 0 || !selectedTemplate} variant="contained" sx={{
          backgroundColor: DS.primary[500],
          '&:hover': {
            backgroundColor: DS.primary[600]
          }
        }}>
            Appliquer ({selectedCategories.length})
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Template Editor */}
      <Dialog open={showTemplateEditor} onClose={() => {
      setShowTemplateEditor(false);
      setEditingTemplate(null);
    }} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        borderBottom: `2px solid ${DS.primary[500]}`
      }}>
          <Box display="flex" alignItems="center" gap={1}>
            <ContentCopyIcon sx={{
            color: DS.primary[500]
          }} />
            <Typography variant="h6" fontWeight={600}>
              {editingTemplate?.isNew ? 'Créer un template' : 'Modifier le template'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{
        pt: 3
      }}>
          <Grid container spacing={2}>
            {/* Champ Source de la catégorie (obligatoire, en premier) */}
            <Grid item xs={12}>
              <TextField label="Source de la catégorie" fullWidth value={templateFormData.sourceCategory ? CATEGORY_LABELS[templateFormData.sourceCategory] : 'Manuel'} disabled slotProps={{
              input: {
                readOnly: true,
                sx: {
                  backgroundColor: DS.neutral[50],
                  fontWeight: 600,
                  color: templateFormData.sourceCategory ? DS.primary[700] : DS.neutral[700]
                }
              }
            }} helperText={templateFormData.sourceCategory ? `Configuration copiée depuis: ${CATEGORY_LABELS[templateFormData.sourceCategory]}` : 'Aucune catégorie source sélectionnée'} />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Nom du template" fullWidth value={templateFormData.name} onChange={e => setTemplateFormData({
              ...templateFormData,
              name: e.target.value
            })} required placeholder="Ex: Mon template personnalisé" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Description" fullWidth multiline rows={2} value={templateFormData.description} onChange={e => setTemplateFormData({
              ...templateFormData,
              description: e.target.value
            })} placeholder="Décrivez ce template..." />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Icône (emoji)" fullWidth value={templateFormData.icon} onChange={e => setTemplateFormData({
              ...templateFormData,
              icon: e.target.value
            })} placeholder="📋" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Couleur (hex)" fullWidth value={templateFormData.color} onChange={e => setTemplateFormData({
              ...templateFormData,
              color: e.target.value
            })} placeholder="#6B7280" />
            </Grid>
          </Grid>
          <Alert severity="info" sx={{
          mt: 2
        }}>
            {editingTemplate?.isNew ? 'Vous pouvez copier la configuration d\'une catégorie existante ou partir d\'un template vierge.' : 'La configuration existante de ce template sera conservée. Modifiez les champs ci-dessus pour personnaliser l\'apparence.'}
          </Alert>
        </DialogContent>
        <DialogActions sx={{
        px: 3,
        pb: 2,
        pt: 2,
        borderTop: `1px solid ${DS.neutral[200]}`
      }}>
          <Button onClick={() => {
          setShowTemplateEditor(false);
          setEditingTemplate(null);
        }} sx={{
          color: DS.neutral[600]
        }}>
            Annuler
          </Button>
          <Button onClick={handleSaveTemplate} variant="contained" disabled={!templateFormData.name.trim()} sx={{
          backgroundColor: DS.primary[500],
          '&:hover': {
            backgroundColor: DS.primary[600]
          }
        }}>
            {editingTemplate?.isNew ? 'Créer' : 'Sauvegarder'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation pour propagation */}
      <Dialog open={showPropagateDialog} onClose={() => setShowPropagateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        color: SOJORI_COLORS.primary,
        fontWeight: 600
      }}>
          ⚠️ Confirmer la propagation
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{
          mb: 2
        }}>
            <strong>Attention !</strong> Cette action va <strong>écraser toutes les modifications locales</strong> de tous vos listings existants.
          </DialogContentText>
          <DialogContentText sx={{
          mb: 2,
          color: 'text.secondary'
        }}>
            Cette opération appliquera la configuration actuelle à tous vos listings, remplaçant leurs configurations individuelles.
          </DialogContentText>
          <Alert severity="warning" sx={{
          mt: 2
        }}>
            <strong>Cette action est irréversible.</strong> Toutes les configurations personnalisées par listing seront perdues.
          </Alert>
        </DialogContent>
        <DialogActions sx={{
        px: 3,
        pb: 2
      }}>
          <Button onClick={() => {
          setShowPropagateDialog(false);
          setPropagateToListings(false);
        }} sx={{
          color: DS.neutral[600]
        }}>
            Annuler
          </Button>
          <Button onClick={() => {
          setShowPropagateDialog(false);
          setPropagateToListings(true);
        }} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            Confirmer la propagation
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Orchestrator Wizard */}
      <OrchestratorAIWizard open={aiWizardOpen} onClose={() => setAiWizardOpen(false)} ownerId={resolvedOwnerId} onConfigured={() => {
      // Refresh message templates after AI configuration
      fetchMessageTemplates();
      toast.success('Configuration AI terminée avec succès !');
    }} />
    </Box>;
};
export default TaskTemplateConfig;
