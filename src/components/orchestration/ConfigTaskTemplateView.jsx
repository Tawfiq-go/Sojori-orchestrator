import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../hooks/useAuth';
import { resolveLegacyAuthUser } from '../../utils/legacyAuthUser';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../constants/orchestrationAdmin';
import { useTranslation } from 'react-i18next';
import { Box, Typography, CircularProgress, Button, Paper, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails, Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel, TextField, Chip, Alert, Radio, RadioGroup, Grid, alpha, Card, CardHeader, CardContent, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Checkbox, Divider, IconButton, Tooltip } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CircleIcon from '@mui/icons-material/Circle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { toast } from 'react-toastify';
import { getOrchestratorTaskTemplate, updateOrchestratorTaskTemplate, getOrchestratorMailTemplates } from '../../features/setting/services/serverApi.orchestratorConfig';
import CategoryFullEditDialog from './CategoryFullEditDialog';

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
  primary: '#FF6B35',
  primaryDark: '#E85A2A',
  primaryPale: 'rgba(255, 107, 53, 0.1)',
  gray: {
    300: '#E0E0E0',
    700: '#616161'
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
  cleaning_paid: '💰 Ménage Supplémentaire',
  cleaning_sojori: '🧹 Ménage Géré Sojori',
  transport: '🚗 Transport Invité',
  groceries: '🛒 Courses Invité',
  custom_request: '📝 Demande Personnalisée',
  support: '🆘 Aide & Support',
  maintenance: '🔧 Réparations',
  welcome: '👋 Message de Bienvenue',
  weather: '🌤️ Rappel complet avant X jours',
  rappel_x_jours: '🌤️ Rappel complet avant X jours',
  // alias (cleanup-categories renomme weather→rappel_x_jours)
  local_recommendations: '📍 Recommandations Locales',
  feedback_during_stay: '💬 Feedback Séjour',
  thank_you: '🙏 Message Merci',
  review_request: '⭐ Demande Avis'
};

// Ordre d'affichage des catégories (chronologique du parcours client)
const CATEGORY_ORDER = [
// 1. Après réservation
'welcome',
// Bienvenue — AFTER_RESERVATION
'local_recommendations',
// Lieux Conseillés — AFTER_RESERVATION

// 2. Avant arrivée
'registration',
// Vérification Identité — BEFORE_ARRIVAL
'weather',
// Rappel X jours (enregistrement, horaire, etc.)
'rappel_x_jours',
// alias weather (après cleanup-categories)
'arrival_choose',
// Heure Arrivée — BEFORE_EXECUTION (timeslot)
'arrival_declare',
// Confirmation Arrivée — BEFORE_ARRIVAL

// 3. Pendant le séjour
'transport',
// Transport Invité — ON_DEMAND
'groceries',
// Courses Invité — ON_DEMAND
'feedback_during_stay',
// Avis durant Séjour — AFTER_ARRIVAL
'custom_request',
// Demande Personnalisée — ON_DEMAND
'support',
// Aide & Support — ON_DEMAND

// 4. Ménage
'cleaning_free',
// Ménage Inclus — BEFORE_EXECUTION
'cleaning_paid',
// Ménage Supplémentaire — BEFORE_EXECUTION
'cleaning_sojori',
// Ménage Géré Sojori — BEFORE_EXECUTION

// 5. Départ
'departure_choose',
// Heure Départ — BEFORE_EXECUTION (timeslot)
'departure_declare',
// Confirmation Départ — BEFORE_DEPARTURE
'thank_you',
// Message Merci — BEFORE_DEPARTURE

// 6. Après séjour
'review_request',
// Demande Évaluation — après départ

// 7. Autres
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
  // 🎫 Choix arrivée / départ — staff 2j avant 9h, rappels client 3j/1j/8h, PRIORITY, STAFF_PLANNING
  choice_arrival_depart: {
    name: 'Choisir arrivée / départ',
    description: 'Timeslot, rappels client, staff 2j avant à 9h, canal WhatsApp priorité',
    icon: '🎫',
    color: '#059669',
    config: {
      enabled: true,
      type: 'choice',
      categoryType: 'CHOICE_ARRIVAL',
      orchestration: {
        createTaskBefore: {
          value: 3,
          unit: 'DAYS',
          trigger: 'BEFORE_ARRIVAL',
          preferredHours: '11',
          prerequisite: 'TIMESLOT_CONFIRMED',
          deadline: {
            type: 'DAYS',
            value: 2,
            hour: 9
          }
        },
        assignmentStrategy: 'PRIORITY',
        channelPriority: 'WHATSAPP_PRIORITY',
        clientReminder: {
          enabled: true,
          daysBeforeDeadline: 3,
          deadline: 1,
          condition: 'NO_TIMESLOT',
          maxRemindersPerDay: 2,
          preferredHours: '8'
        },
        dayJLogic: {
          maxRetriesPerDay: 2,
          retryIntervalHours: 3,
          contactHours: 'STAFF_PLANNING'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'NO_BLOCK',
          actionAfterRefusal: 'CONTINUE'
        },
        escalation: {
          flexible: false,
          steps: []
        }
      }
    }
  },
  // 🚗 Transport — staff 1j avant à 15h, canal WhatsApp priorité
  client_request_transport: {
    name: 'Transport invité',
    description: 'Déclenchement immédiat, staff 1j avant à 15h, canal WhatsApp priorité',
    icon: '🚗',
    color: '#2563EB',
    config: {
      enabled: true,
      type: 'customer_request',
      category: 'transport',
      categoryType: 'CLIENT_REQUEST_TRANSPORT',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS',
          trigger: 'IMMEDIATE_CLIENT_REQUEST',
          deadline: {
            type: 'DAYS',
            value: 1,
            hour: 15
          }
        },
        assignmentStrategy: 'PRIORITY',
        channelPriority: 'WHATSAPP_PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 2,
          retryIntervalHours: 3,
          contactHours: 'STAFF_PLANNING'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'NO_BLOCK',
          actionAfterRefusal: 'CONTINUE'
        },
        escalation: {
          flexible: false,
          steps: []
        }
      }
    }
  },
  // 🛒 Courses — staff 1j avant à 15h, canal WhatsApp priorité
  client_request_grocery: {
    name: 'Courses invité',
    description: 'Déclenchement immédiat, staff 1j avant à 15h, canal WhatsApp priorité',
    icon: '🛒',
    color: '#7C3AED',
    config: {
      enabled: true,
      type: 'customer_request',
      category: 'groceries',
      categoryType: 'CLIENT_REQUEST_GROCERY',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS',
          trigger: 'IMMEDIATE_CLIENT_REQUEST',
          deadline: {
            type: 'DAYS',
            value: 1,
            hour: 15
          }
        },
        assignmentStrategy: 'PRIORITY',
        channelPriority: 'WHATSAPP_PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 2,
          retryIntervalHours: 3,
          contactHours: 'STAFF_PLANNING'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'NO_BLOCK',
          actionAfterRefusal: 'CONTINUE'
        },
        escalation: {
          flexible: false,
          steps: []
        }
      }
    }
  },
  // 🆘 Support — staff 1j avant à 15h, canal WhatsApp priorité
  client_request_support: {
    name: 'Aide & Support',
    description: 'Déclenchement immédiat, staff 1j avant à 15h, canal WhatsApp priorité',
    icon: '🆘',
    color: '#DC2626',
    config: {
      enabled: true,
      type: 'customer_request',
      category: 'support',
      categoryType: 'CLIENT_REQUEST_SUPPORT',
      orchestration: {
        createTaskBefore: {
          value: 0,
          unit: 'HOURS',
          trigger: 'IMMEDIATE_CLIENT_REQUEST',
          deadline: {
            type: 'DAYS',
            value: 1,
            hour: 15
          }
        },
        assignmentStrategy: 'PRIORITY',
        channelPriority: 'WHATSAPP_PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 2,
          retryIntervalHours: 3,
          contactHours: 'STAFF_PLANNING'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'NO_BLOCK',
          actionAfterRefusal: 'CONTINUE'
        },
        escalation: {
          flexible: false,
          steps: []
        }
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
  },
  // 🧹 Ménage inclus — staff 2j avant 9h (comme Choix), canal WhatsApp priorité
  cleaning_free: {
    name: 'Ménage inclus',
    description: 'Timeslot confirmé, staff 2j avant à 9h, canal WhatsApp priorité',
    icon: '🧹',
    color: '#0D9488',
    config: {
      enabled: true,
      type: 'choice',
      categoryType: 'CLEANING_FREE',
      orchestration: {
        createTaskBefore: {
          value: 3,
          unit: 'DAYS',
          trigger: 'BEFORE_EXECUTION',
          prerequisite: 'TIMESLOT_CONFIRMED',
          deadline: {
            type: 'DAYS',
            value: 2,
            hour: 9
          }
        },
        assignmentStrategy: 'PRIORITY',
        channelPriority: 'WHATSAPP_PRIORITY',
        dayJLogic: {
          maxRetriesPerDay: 2,
          retryIntervalHours: 3,
          contactHours: 'STAFF_PLANNING'
        },
        enableAutomaticRetryNextDays: true,
        staffRefusalPolicy: {
          blockingStrategy: 'NO_BLOCK',
          actionAfterRefusal: 'CONTINUE'
        },
        escalation: {
          flexible: false,
          steps: []
        }
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
const ConfigTaskTemplateView = ({
  targetOwnerId: targetOwnerIdProp
}) => {
  const {
    t
  } = useTranslation('common');
  const reduxUser = useSelector(state => state.auth.user);
  const { user: authUser } = useAuth();
  const user = useMemo(
    () => resolveLegacyAuthUser(authUser, reduxUser),
    [authUser, reduxUser],
  );
  const selfOwnerId = user?._id || user?.id;
  /** When set (incl. empty string), do not fall back to logged-in user — used for admin owner picker */
  const hasExplicitTarget = targetOwnerIdProp !== undefined;
  const ownerId = hasExplicitTarget && String(targetOwnerIdProp || '').trim().length >= 10 ? String(targetOwnerIdProp).trim() : hasExplicitTarget ? null : selfOwnerId;
  /** When admin edits another owner / admin template, isolate localStorage template presets per target */
  const useScopedTaskTemplateStorage = hasExplicitTarget;
  const storageOwnerKey = ownerId || (useScopedTaskTemplateStorage ? '_unset' : '');
  const customTemplatesLsKey = useMemo(() => useScopedTaskTemplateStorage ? `taskTemplates_custom_${storageOwnerKey}` : 'taskTemplates_custom', [useScopedTaskTemplateStorage, storageOwnerKey]);
  const fromConfigLsKey = useMemo(() => useScopedTaskTemplateStorage ? `taskTemplates_from_config_${storageOwnerKey}` : 'taskTemplates_from_config', [useScopedTaskTemplateStorage, storageOwnerKey]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState(null);
  const [editedCategories, setEditedCategories] = useState({});
  const [originalCategories, setOriginalCategories] = useState({}); // Pour dirty check
  const [propagateToListings, setPropagateToListings] = useState(false);
  const [tableViewMode, setTableViewMode] = useState('complete'); // 'simple' ou 'complete'
  const [expandedPanel, setExpandedPanel] = useState(null); // Pour les accordions
  const [showPropagateDialog, setShowPropagateDialog] = useState(false);
  const [messageTemplates, setMessageTemplates] = useState([]); // Message templates from API
  const [configTemplatesOpen, setConfigTemplatesOpen] = useState(false); // Dialog unifié Config & Templates
  const [configTemplatesTab, setConfigTemplatesTab] = useState('add'); // 'add' | 'templates'
  const [addCatType, setAddCatType] = useState(''); // Selected type in dialog
  const [addCatSubType, setAddCatSubType] = useState(''); // Sub-type for declaration/choice
  const [addCatForm, setAddCatForm] = useState({}); // Pre-filled form fields
  const [addCatSaving, setAddCatSaving] = useState(false); // Saving state
  const [configRefreshToken, setConfigRefreshToken] = useState(0); // Triggers ConfigurationView re-fetch
  const [newCatEditOpen, setNewCatEditOpen] = useState(false); // CategoryFullEditDialog for new cat
  const [simplifiedEditOpen, setSimplifiedEditOpen] = useState(false); // Popup édition depuis tableau simplifié
  const [editingCategoryKey, setEditingCategoryKey] = useState(null); // Clé de la catégorie en cours d'édition
  const [savingFromSimplifiedEdit, setSavingFromSimplifiedEdit] = useState(false); // Chargement sauvegarde popup

  // Templates créés depuis "Définir comme template" dans le tableau (1 par catégorie, max)
  const [configTemplatesFromConfig, setConfigTemplatesFromConfig] = useState({});

  // Template management states (intégré au dialog unifié via configTemplatesTab)
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
    const stored = localStorage.getItem(customTemplatesLsKey);
    if (stored) {
      try {
        setCustomTemplates(JSON.parse(stored));
      } catch (e) {}
    }
  }, [customTemplatesLsKey]);

  // Charger les templates créés depuis config (Définir comme template)
  useEffect(() => {
    const stored = localStorage.getItem(fromConfigLsKey);
    if (stored) {
      try {
        setConfigTemplatesFromConfig(JSON.parse(stored));
      } catch (e) {}
    }
  }, [fromConfigLsKey]);
  useEffect(() => {
    if (!ownerId) {
      setMessageTemplates([]);
      return;
    }
    fetchMessageTemplates();
  }, [ownerId]);

  /** Fermer les assistants au changement de propriétaire cible (admin / sélecteur) pour éviter mélange Config & Templates / AI */
  useEffect(() => {
    setConfigTemplatesOpen(false);
    setSelectedCategories([]);
    setSelectedTemplate(null);
    setAddCatType('');
    setAddCatSubType('');
    setAddCatForm({});
  }, [ownerId]);
  useEffect(() => {
    if (!ownerId) {
      setLoading(false);
      return;
    }
    fetchTemplate();
  }, [ownerId]);
  const fetchMessageTemplates = async () => {
    try {
      const response = await getOrchestratorMailTemplates(ownerId ? {
        ownerId,
        limit: 100
      } : {
        limit: 100
      });
      const templates = response?.data?.data || response?.data || [];
      setMessageTemplates(templates);
    } catch (error) {
      toast.error('Erreur lors du chargement des templates de messages');
    }
  };
  const fetchTemplate = async () => {
    const fetchOwnerId =
      ownerId ||
      (import.meta.env.VITE_DISABLE_AUTH === 'true' ? ORCHESTRATION_ADMIN_OWNER_ID : null);
    if (!fetchOwnerId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await getOrchestratorTaskTemplate(fetchOwnerId);
      if (response?.notFound) {
        toast.info('Aucune configuration orchestrateur enregistrée pour ce compte. Ajoutez des catégories puis enregistrez : le template sera créé automatiquement.', {
          autoClose: 8000
        });
      }
      const payload = response?.data ?? (response?.success ? { ownerId: fetchOwnerId, categories: [] } : null);
      if (response?.success && payload) {
        // ✅ FIX: backend retourne un array — convertir en objet keyed par category (clé canonique)
        // IMPORTANT: utiliser category comme clé pour éviter corruption (categoryType = CHOICE_ARRIVAL ≠ arrival_choose)
        const rawCategories = payload.categories;
        const categoriesEntries = Array.isArray(rawCategories) ? rawCategories.map((cat, idx) => {
          // NOTIFICATION: clé unique par message (Bienvenue, Rappel, Demande Avis...) — INSERT pas overwrite
          const isNotif = cat?.categoryType === 'NOTIFICATION' || cat?.category === 'message' && cat?.type === 'message';
          const key = isNotif ? `message__${cat?.orchestration?.messageTemplateId || cat?.name || idx}` : [cat.category, cat.categoryType].filter(Boolean).join('__') || cat.name || String(cat.order ?? idx);
          return [key, cat];
        }) : Object.entries(rawCategories);

        // Migrer les anciennes catégories sans orchestration
        const migratedCategories = categoriesEntries.reduce((acc, [key, config]) => {
          // Si pas d'orchestration, ajouter la structure par défaut
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
        setTemplate(payload);
        setEditedCategories(migratedCategories);
        setOriginalCategories(JSON.parse(JSON.stringify(migratedCategories))); // Deep copy pour dirty check
      } else if (!response?.success) {
        toast.error(response?.error || 'Réponse serveur invalide');
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        toast.error('Session requise — connectez-vous ou vérifiez VITE_DEV_TOKEN (localhost).');
      } else {
        toast.error('Impossible de charger la configuration (réseau ou serveur)');
      }
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

  /** Définir la config de cette catégorie comme template (1 par catégorie max, mise à jour si re-clic) */
  const handleSetAsTemplate = categoryKey => {
    const config = editedCategories[categoryKey];
    if (!config) return;
    const updated = {
      ...configTemplatesFromConfig,
      [categoryKey]: {
        ...config,
        updatedAt: Date.now()
      }
    };
    setConfigTemplatesFromConfig(updated);
    localStorage.setItem(fromConfigLsKey, JSON.stringify(updated));
    const displayName = config?.label || config?.name || config?.categoryDisplayLabel || categoryKey;
    toast.success(`Template "${displayName}" enregistré`);
  };

  /** Depuis la modal d'édition : enregistrer la config courante comme template personnel */
  const handleSaveAsTemplateFromModal = (categoryKey, config) => {
    if (!categoryKey || !config) return;
    const updated = {
      ...configTemplatesFromConfig,
      [categoryKey]: {
        ...config,
        updatedAt: Date.now()
      }
    };
    setConfigTemplatesFromConfig(updated);
    localStorage.setItem(fromConfigLsKey, JSON.stringify(updated));
    const displayName = config?.label || config?.name || config?.categoryDisplayLabel || categoryKey;
    toast.success(`Template "${displayName}" ajouté à vos templates personnels`);
  };
  const handleApplyTemplate = templateKey => {
    if (selectedCategories.length === 0) {
      toast.error('Sélectionnez au moins une catégorie');
      return;
    }
    const allTemplates = {
      ...PREDEFINED_TEMPLATES,
      ...configTemplatesFromConfig
    };
    const templateData = allTemplates[templateKey];
    const templateConfig = typeof templateData === 'object' && !templateData.config ? templateData : templateData?.config ?? templateData;
    const updatedCategories = {
      ...editedCategories
    };

    // Champs à ne JAMAIS écraser (identité de la catégorie)
    const PRESERVE_KEYS = ['category', 'name', 'type', 'categoryType', 'label'];
    selectedCategories.forEach(categoryKey => {
      const existing = updatedCategories[categoryKey] || {};
      const preserved = {};
      PRESERVE_KEYS.forEach(k => {
        if (existing[k] !== undefined) preserved[k] = existing[k];
      });
      updatedCategories[categoryKey] = {
        ...existing,
        ...templateConfig,
        ...preserved // Restaurer l'identité (évite corruption type "Choisir arrivée" → "Déclarer arrivée")
      };
    });
    setEditedCategories(updatedCategories);
    const displayName = templateData?.label || templateData?.name || templateData?.categoryDisplayLabel || templateKey;
    toast.success(`Template "${displayName}" appliqué à ${selectedCategories.length} catégorie(s)`);
    setConfigTemplatesOpen(false);
    setSelectedCategories([]);
  };

  // Template CRUD functions
  const handleCreateTemplateFromCategory = categoryKey => {
    const categoryConfig = editedCategories[categoryKey];
    setTemplateFormData({
      name: `Template ${categoryConfig?.label || categoryConfig?.categoryDisplayLabel || 'Sans nom'}`,
      description: 'Template créé depuis une catégorie existante',
      icon: '📋',
      color: '#6B7280',
      sourceCategory: categoryKey // Stocker la catégorie source (interne)
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
      name: `Template ${categoryConfig?.label || categoryConfig?.categoryDisplayLabel || 'Sans nom'}`,
      description: 'Template créé depuis une catégorie existante',
      icon: '📋',
      color: '#6B7280',
      sourceCategory: categoryKey // Catégorie source (interne)
    });
    setEditingTemplate({
      isNew: true,
      config: categoryConfig
    });
    setShowTemplateEditor(true);
  };
  const handleDuplicatePredefinedTemplate = predefinedKey => {
    const predefined = PREDEFINED_TEMPLATES[predefinedKey];
    if (!predefined?.config) return;
    setTemplateFormData({
      name: `Copie de ${predefined.name}`,
      description: predefined.description || '',
      icon: predefined.icon || '📋',
      color: predefined.color || '#6B7280',
      sourceCategory: null
    });
    setEditingTemplate({
      config: predefined.config,
      isNew: true
    });
    setShowTemplateEditor(true);
    toast.info('Template dupliqué — modifiez et sauvegardez');
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
    localStorage.setItem(customTemplatesLsKey, JSON.stringify(updated));
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
      localStorage.setItem(customTemplatesLsKey, JSON.stringify(updated));
      toast.success('Template supprimé');
    }
  };

  /** Supprimer un template "Mes templates" (configTemplatesFromConfig) */
  const handleDeleteConfigTemplate = (templateKey, e) => {
    e?.stopPropagation?.();
    const displayName = configTemplatesFromConfig[templateKey]?.label || configTemplatesFromConfig[templateKey]?.name || templateKey;
    if (window.confirm(`Supprimer le template "${displayName}" ? Cette action est irréversible.`)) {
      const updated = {
        ...configTemplatesFromConfig
      };
      delete updated[templateKey];
      setConfigTemplatesFromConfig(updated);
      localStorage.setItem(fromConfigLsKey, JSON.stringify(updated));
      if (selectedTemplate === templateKey) setSelectedTemplate(null);
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

  // Full orchestration defaults for task-creating types
  // Transport/Grocery/Support: staff 1j avant à 15h, canal WhatsApp. Cleaning: staff 2j avant à 9h.
  const FULL_TASK_ORCH_DEFAULTS = trigger => {
    const isImmediate = trigger === 'IMMEDIATE_CLIENT_REQUEST';
    return {
      channelPriority: 'WHATSAPP_PRIORITY',
      messageTemplateId: null,
      assignmentStrategy: 'PRIORITY',
      createTaskBefore: {
        trigger,
        value: isImmediate ? 0 : 3,
        unit: isImmediate ? 'HOURS' : 'DAYS',
        prerequisite: isImmediate ? 'NONE' : 'TIMESLOT_CONFIRMED',
        preferredHours: '',
        deadline: {
          type: 'DAYS',
          value: isImmediate ? 1 : 2,
          hour: isImmediate ? 15 : 9
        }
      },
      dayJLogic: {
        maxRetriesPerDay: 2,
        retryIntervalHours: 3,
        contactHours: 'STAFF_PLANNING'
      },
      enableAutomaticRetryNextDays: true,
      staffRefusalPolicy: {
        blockingStrategy: 'NO_BLOCK',
        actionAfterRefusal: 'CONTINUE'
      }
    };
  };

  // Build default config for a given type/subtype
  const buildAddCatDefaults = (type, subType) => {
    const baseOrch = {
      createTaskBefore: {
        value: 0,
        unit: 'HOURS'
      },
      assignmentStrategy: 'MANUAL'
    };
    switch (type) {
      case 'notification':
        return {
          key: `notification_${Date.now()}`,
          label: 'Notification',
          categoryType: 'NOTIFICATION',
          enabled: true,
          orchestration: {
            ...baseOrch,
            channelPriority: 'WHATSAPP_PRIORITY',
            messageTemplateId: null
          }
        };
      case 'declaration':
        {
          const condition = subType === 'registration' ? 'INCOMPLETE_REGISTRATION' : 'NOT_DECLARED';
          return {
            key: subType,
            label: CATEGORY_LABELS[subType] || subType,
            categoryType: 'DECLARATION',
            enabled: true,
            orchestration: {
              ...baseOrch,
              channelPriority: 'WHATSAPP_PRIORITY',
              messageTemplateId: null,
              clientReminder: {
                enabled: false,
                condition,
                maxRemindersPerDay: 3
              }
            }
          };
        }
      case 'choice':
        {
          // ✅ categoryType exact + config alignée Choix Heure Arrivée (staff 2j/9h, rappels 3j/1j/8h)
          const choiceCategoryType = subType === 'arrival_choose' ? 'CHOICE_ARRIVAL' : subType === 'departure_choose' ? 'CHOICE_DEPARTURE' : subType === 'cleaning_free' ? 'CLEANING_FREE' : subType ? subType.startsWith('arrival') ? 'CHOICE_ARRIVAL' : subType.startsWith('departure') ? 'CHOICE_DEPARTURE' : 'CHOICE_ARRIVAL' : 'CHOICE_ARRIVAL';
          const trigger = subType === 'arrival_choose' ? 'BEFORE_ARRIVAL' : subType === 'departure_choose' ? 'BEFORE_DEPARTURE' : 'BEFORE_EXECUTION';
          const hasTimeslot = subType !== 'cleaning_free';
          return {
            key: subType,
            label: CATEGORY_LABELS[subType] || subType,
            categoryType: choiceCategoryType,
            enabled: true,
            orchestration: {
              ...baseOrch,
              assignmentStrategy: 'PRIORITY',
              channelPriority: 'WHATSAPP_PRIORITY',
              messageTemplateId: null,
              createTaskBefore: {
                value: 3,
                unit: 'DAYS',
                trigger,
                preferredHours: hasTimeslot ? '11' : '',
                prerequisite: 'TIMESLOT_CONFIRMED',
                deadline: {
                  type: 'DAYS',
                  value: 2,
                  hour: 9
                }
              },
              clientReminder: hasTimeslot ? {
                enabled: true,
                daysBeforeDeadline: 3,
                deadline: 1,
                condition: 'NO_TIMESLOT',
                maxRemindersPerDay: 2,
                preferredHours: '8'
              } : undefined,
              dayJLogic: {
                maxRetriesPerDay: 2,
                retryIntervalHours: 3,
                contactHours: 'STAFF_PLANNING'
              },
              enableAutomaticRetryNextDays: true,
              staffRefusalPolicy: {
                blockingStrategy: 'NO_BLOCK',
                actionAfterRefusal: 'CONTINUE'
              }
            }
          };
        }
      case 'cleaning_paid':
        return {
          key: 'cleaning_paid',
          label: CATEGORY_LABELS['cleaning_paid'] || 'Ménage Supplémentaire',
          categoryType: 'CLEANING_PAID',
          enabled: true,
          orchestration: FULL_TASK_ORCH_DEFAULTS('TIMESLOT_CONFIRMED')
        };
      case 'cleaning_free':
        return {
          key: 'cleaning_free',
          label: CATEGORY_LABELS['cleaning_free'] || 'Ménage Gratuit',
          categoryType: 'CLEANING_FREE',
          type: 'choice',
          enabled: true,
          orchestration: {
            channelPriority: 'WHATSAPP_PRIORITY',
            messageTemplateId: null,
            assignmentStrategy: 'MANUAL',
            createTaskBefore: {
              trigger: 'AFTER_RESERVATION',
              value: 1,
              unit: 'DAYS',
              prerequisite: 'NONE'
            }
          }
        };
      case 'cleaning_sojori':
        return {
          key: 'cleaning_sojori',
          label: CATEGORY_LABELS['cleaning_sojori'] || 'Ménage Sojori',
          categoryType: 'CLEANING_SOJORI',
          type: 'choice',
          enabled: true,
          orchestration: {
            assignmentStrategy: 'PRIORITY',
            createTaskBefore: {
              trigger: 'AFTER_RESERVATION',
              value: 0,
              unit: 'DAYS',
              anchor: 'CALCULATED',
              prerequisite: 'NONE'
            },
            defaultTaskDateAfterCheckout: 1,
            assignStaffBefore: {
              trigger: 'BEFORE_EXECUTION',
              value: 2,
              unit: 'DAYS',
              preferredHour: 8,
              anchor: 'CALCULATED',
              minimumHour: 8,
              prerequisite: 'TASK_CREATED'
            },
            dayJLogic: {
              enabled: true,
              maxRetriesPerDay: 3,
              retryIntervalHours: 2,
              contactHours: '08:00-18:00',
              thresholdHours: 4,
              action: 'ESCALATE'
            },
            nextDays: {
              enabled: true,
              maxDays: 2,
              maxRetriesPerDay: 5,
              retryIntervalHours: 1
            },
            staffRefusalPolicy: {
              blockingStrategy: 'NO_BLOCK',
              actionAfterRefusal: 'CONTINUE'
            },
            deadline: {
              type: 'SAME_DAY',
              value: 0,
              hour: 18,
              action: 'MANUAL'
            },
            escalation: {
              enabled: true,
              escalationLevels: [{
                level: 1,
                waitMinutes: 120,
                action: 'NOTIFY_ADMIN'
              }],
              finalAction: 'ASSIGN_ADMIN'
            }
          }
        };
      case 'client_transport':
        return {
          key: 'client_request_transport',
          name: 'Transport',
          type: 'customer_request',
          categoryType: 'CLIENT_REQUEST_TRANSPORT',
          enabled: true,
          orchestration: FULL_TASK_ORCH_DEFAULTS('IMMEDIATE_CLIENT_REQUEST')
        };
      case 'client_grocery':
        return {
          key: 'client_request_grocery',
          name: 'Grocery',
          type: 'customer_request',
          categoryType: 'CLIENT_REQUEST_GROCERY',
          enabled: true,
          orchestration: FULL_TASK_ORCH_DEFAULTS('IMMEDIATE_CLIENT_REQUEST')
        };
      case 'client_custom':
        return {
          key: 'client_request_custom',
          name: 'Custom',
          type: 'customer_request',
          categoryType: 'CLIENT_REQUEST_CUSTOM',
          enabled: true,
          orchestration: FULL_TASK_ORCH_DEFAULTS('IMMEDIATE_CLIENT_REQUEST')
        };
      case 'client_support':
        return {
          key: 'client_request_support',
          name: 'Support',
          type: 'customer_request',
          categoryType: 'CLIENT_REQUEST_SUPPORT',
          enabled: true,
          orchestration: FULL_TASK_ORCH_DEFAULTS('IMMEDIATE_CLIENT_REQUEST')
        };
      default:
        return null;
    }
  };

  // Called when user selects a type card in dialog — pre-fill the form
  const handleAddCatTypeSelect = type => {
    setAddCatType(type);
    setAddCatSubType('');
    // Only declaration and choice require sub-type selection; others can pre-fill immediately
    if (!['declaration', 'choice'].includes(type)) {
      const defaults = buildAddCatDefaults(type, '');
      setAddCatForm(defaults || {});
    } else {
      setAddCatForm({});
    }
  };

  // Called when sub-type changes — update pre-filled form
  const handleAddCatSubTypeSelect = subType => {
    setAddCatSubType(subType);
    if (subType) {
      const defaults = buildAddCatDefaults(addCatType, subType);
      setAddCatForm(defaults || {});
    }
  };

  /** Derive lowercase type from categoryType for API/display (backend also derives if missing) */
  const getTypeFromCategoryType = ct => {
    if (!ct) return undefined;
    const map = {
      NOTIFICATION: 'message',
      DECLARATION: 'declaration',
      DECLARATION_REGISTRATION: 'declaration',
      DECLARATION_ARRIVAL: 'declaration',
      DECLARATION_DEPARTURE: 'declaration',
      CHOICE: 'choice',
      CHOICE_ARRIVAL: 'choice',
      CHOICE_DEPARTURE: 'choice',
      CLEANING_FREE: 'choice',
      CLEANING_SOJORI: 'choice',
      CLEANING_PAID: 'customer_request',
      CLIENT_REQUEST_SUPPORT: 'customer_request',
      CLIENT_REQUEST_TRANSPORT: 'customer_request',
      CLIENT_REQUEST_GROCERY: 'customer_request',
      CLIENT_REQUEST_CUSTOM: 'customer_request',
      CLIENT_REQUEST_CLEANING: 'customer_request'
    };
    return map[ct] || (ct?.startsWith?.('DECLARATION') ? 'declaration' : ct?.startsWith?.('CHOICE') ? 'choice' : ct?.startsWith?.('CLIENT_REQUEST') || ct === 'CLEANING_PAID' ? 'customer_request' : ct === 'NOTIFICATION' ? 'message' : undefined);
  };

  // Save the new category to API directly, then refresh ConfigurationView
  const handleAddCategory = async () => {
    const {
      key: categoryKey,
      label,
      categoryType,
      enabled,
      orchestration
    } = addCatForm;
    if (!categoryKey) return;
    if (editedCategories[categoryKey]) {
      toast.warning(`La catégorie "${categoryKey}" existe déjà dans la configuration`);
      return;
    }
    const displayName = addCatForm.label || label;
    const newCategoryConfig = {
      name: displayName,
      categoryType,
      type: getTypeFromCategoryType(categoryType),
      ...(addCatForm.category ? {
        category: addCatForm.category
      } : categoryType === 'NOTIFICATION' ? {
        category: 'message'
      } : {}),
      label: displayName,
      enabled,
      orchestration: addCatForm.orchestration || orchestration
    };
    const updatedCategories = {
      ...editedCategories,
      [categoryKey]: newCategoryConfig
    };
    setAddCatSaving(true);
    try {
      await updateOrchestratorTaskTemplate(ownerId, {
        categories: updatedCategories
      });
      setEditedCategories(updatedCategories);
      setOriginalCategories(JSON.parse(JSON.stringify(updatedCategories)));
      setConfigRefreshToken(t => t + 1); // Triggers ConfigurationView re-fetch
      toast.success(`Catégorie "${categoryKey}" ajoutée et sauvegardée`);
      setConfigTemplatesOpen(false);
      setAddCatType('');
      setAddCatSubType('');
      setAddCatForm({});
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setAddCatSaving(false);
    }
  };

  // Save new category from CategoryFullEditDialog → API
  const handleSaveNewCat = async editedConfig => {
    const categoryKey = addCatForm.key;
    if (!categoryKey) return;
    const categoryType = editedConfig.categoryType || addCatForm.categoryType;
    const displayName = editedConfig.name || editedConfig.label || addCatForm.label;
    const resolvedCategory = editedConfig.clientRequestCategory || editedConfig.category || addCatForm.category;
    const newCategoryConfig = {
      name: displayName,
      // Backend uses name for display (évite "notification_123")
      type: editedConfig.type || getTypeFromCategoryType(categoryType),
      categoryType,
      ...(resolvedCategory ? {
        category: resolvedCategory
      } : {}),
      ...(categoryType === 'NOTIFICATION' && !resolvedCategory ? {
        category: 'message'
      } : {}),
      label: displayName,
      enabled: editedConfig.enabled ?? true,
      orchestration: editedConfig.orchestration || addCatForm.orchestration
    };
    const updatedCategories = {
      ...editedCategories,
      [categoryKey]: newCategoryConfig
    };
    try {
      await updateOrchestratorTaskTemplate(ownerId, {
        categories: updatedCategories
      });
      setEditedCategories(updatedCategories);
      setOriginalCategories(JSON.parse(JSON.stringify(updatedCategories)));
      setConfigRefreshToken(t => t + 1);
      toast.success(`Catégorie "${categoryKey}" ajoutée et sauvegardée`);
      setNewCatEditOpen(false);
      setAddCatType('');
      setAddCatSubType('');
      setAddCatForm({});
    } catch (err) {
      toast.error('Erreur lors de la sauvegarde');
    }
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
        deadline: 1,
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
      const response = await updateOrchestratorTaskTemplate(ownerId, {
        categories: editedCategories,
        propagateToListings
      });
      toast.success(propagateToListings ? 'Configuration sauvegardée et propagée aux listings !' : 'Configuration sauvegardée !');
      // Mettre à jour originalCategories après sauvegarde réussie
      setOriginalCategories(JSON.parse(JSON.stringify(editedCategories)));
      await fetchTemplate();
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message;
      toast.error(`Erreur: ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Fonction helper pour trier les catégories : order explicite d'abord, puis CATEGORY_ORDER
  const getSortedCategories = categories => {
    const result = Object.entries(categories).sort(([keyA, configA], [keyB, configB]) => {
      const baseKeyA = keyA.split('__')[0];
      const baseKeyB = keyB.split('__')[0];

      // Si order explicite, l'utiliser ; sinon fallback CATEGORY_ORDER (index -1 = à la fin)
      const orderA = configA?.order ?? (() => {
        const i = CATEGORY_ORDER.indexOf(baseKeyA);
        return i >= 0 ? i : 9999;
      })();
      const orderB = configB?.order ?? (() => {
        const i = CATEGORY_ORDER.indexOf(baseKeyB);
        return i >= 0 ? i : 9999;
      })();
      if (orderA !== orderB) return orderA - orderB;
      const indexA = CATEGORY_ORDER.indexOf(baseKeyA);
      const indexB = CATEGORY_ORDER.indexOf(baseKeyB);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    return result;
  };

  /** Monte ou descend une catégorie dans l'ordre d'affichage */
  const handleMoveOrder = (categoryKey, direction) => {
    const sorted = getSortedCategories(editedCategories);
    const idx = sorted.findIndex(([k]) => k === categoryKey);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) {
      toast.warning(direction === 'up' ? 'Déjà en haut' : 'Déjà en bas');
      return;
    }

    // Construire le nouvel ordre (échange des 2 éléments)
    const newOrdered = [...sorted];
    [newOrdered[idx], newOrdered[swapIdx]] = [newOrdered[swapIdx], newOrdered[idx]];

    // Normaliser : assigner order 0, 1, 2... à TOUTES les catégories pour éviter les conflits
    // (ex. baseKey non trouvé dans CATEGORY_ORDER → -1 qui perturbait le tri)
    setEditedCategories(prev => {
      const next = {
        ...prev
      };
      newOrdered.forEach(([key, config], i) => {
        next[key] = {
          ...config,
          order: i
        };
      });
      return next;
    });
    toast.success(direction === 'up' ? '⬆️ Ligne remontée' : '⬇️ Ligne descendue');
  };
  const handleSaveFromSimplifiedEdit = async editedConfig => {
    if (!editingCategoryKey || !ownerId) return;
    setSavingFromSimplifiedEdit(true);
    const updatedCategories = {
      ...editedCategories,
      [editingCategoryKey]: editedConfig
    };
    setEditedCategories(updatedCategories);
    try {
      await updateOrchestratorTaskTemplate(ownerId, {
        categories: updatedCategories,
        propagateToListings: false
      });
      setOriginalCategories(JSON.parse(JSON.stringify(updatedCategories)));
      await fetchTemplate();
      setSimplifiedEditOpen(false);
      setEditingCategoryKey(null);
      toast.success('✅ Configuration sauvegardée !');
    } catch (error) {
      const errorMsg = error.response?.data?.errors?.[0]?.message || error.response?.data?.message || error.message;
      toast.error(`Erreur sauvegarde: ${errorMsg}`);
      setEditedCategories(updatedCategories);
    } finally {
      setSavingFromSimplifiedEdit(false);
    }
  };
  const handleDeleteFromSimplifiedEdit = () => {
    if (!editingCategoryKey) return;
    setEditedCategories(prev => {
      const next = {
        ...prev
      };
      delete next[editingCategoryKey];
      return next;
    });
    setSimplifiedEditOpen(false);
    setEditingCategoryKey(null);
    toast.success('🗑️ Catégorie supprimée');
  };
  if (hasExplicitTarget && !ownerId) {
    return <Box sx={{
      p: 3
    }}>
        <Alert severity="info">
          Sélectionnez un propriétaire pour afficher et modifier sa configuration d&apos;orchestration.
        </Alert>
      </Box>;
  }
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress sx={{ color: SOJORI_COLORS.primary }} />
      </Box>
    );
  }
  if (!template) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {import.meta.env.VITE_DISABLE_AUTH === 'true'
          ? 'Configuration non chargée. Vérifiez VITE_DEV_TOKEN dans .env, redémarrez pnpm dev, puis rafraîchissez.'
          : 'Impossible de charger la configuration. Connectez-vous au dashboard puis réessayez.'}
      </Alert>
    );
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

                  <TextField variant="standard" size="small" value={categoryConfig.label || ''} placeholder={categoryConfig?.label || categoryConfig?.categoryDisplayLabel || 'Libellé'} onChange={e => {
                e.stopPropagation();
                handleCategoryChange(categoryKey, 'label', e.target.value);
              }} onClick={e => e.stopPropagation()} onFocus={e => e.stopPropagation()} sx={{
                '& .MuiInputBase-input': {
                  fontSize: 15,
                  fontWeight: 600,
                  color: DS.neutral[900],
                  '&::placeholder': {
                    color: DS.neutral[500],
                    fontWeight: 500
                  }
                },
                '& .MuiInputBase-root::before': {
                  borderBottom: 'none'
                },
                '& .MuiInputBase-root.Mui-focused::after': {
                  borderBottomColor: DS.primary[500]
                },
                minWidth: 120
              }} />
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

            {/* ACCORDION DETAILS (expanded state) — un seul titre (en-tête) = nom de la config */}
            <AccordionDetails sx={{
          p: 0
        }}>
              <Box p={3} display="flex" flexDirection="column" gap={2.5}>

                {/* SI ENABLED: Mode selection + Planning Mode */}
                {categoryConfig.enabled && <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Mode d&apos;assignation</InputLabel>
                        <Select value={categoryConfig.mode || 'MANUAL'} onChange={e => handleCategoryChange(categoryKey, 'mode', e.target.value)} label="Mode d&apos;assignation" sx={{
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}>
                          <MenuItem value="MANUAL">👤 Manuel</MenuItem>
                          <MenuItem value="ORCHESTRATION">🤖 Orchestration</MenuItem>
                          <MenuItem value="NOTIFICATION_ONLY">📢 Notification uniquement</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Création du plan</InputLabel>
                        <Select value={categoryConfig.planningMode || 'INITIAL'} onChange={e => {
                    handleCategoryChange(categoryKey, 'planningMode', e.target.value);
                  }} label="Création du plan" sx={{
                    borderRadius: '6px',
                    backgroundColor: 'white'
                  }}>
                          <MenuItem value="INITIAL">📋 Plan initial</MenuItem>
                          <MenuItem value="ON_DEMAND">🎯 Sur demande</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>}

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
                    }} inputProps={{
                      min: 0
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

                        {/* Pré-requis (only for scheduled triggers) */}
                        {['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(categoryConfig.orchestration.createTaskBefore?.trigger) && <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Pré-requis</InputLabel>
                              <Select value={categoryConfig.orchestration.createTaskBefore?.prerequisite || 'NONE'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration.createTaskBefore,
                        prerequisite: e.target.value
                      })} label="Pré-requis" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                                <MenuItem value="NONE">✅ Aucun (créer automatiquement)</MenuItem>
                                <MenuItem value="TIMESLOT_CONFIRMED">⏰ Attendre confirmation timeslot</MenuItem>
                                <MenuItem value="CLIENT_REGISTERED">👤 Attendre enregistrement client</MenuItem>
                              </Select>
                            </FormControl>
                            <Typography variant="caption" display="block" mt={1} sx={{
                      fontSize: 11,
                      color: DS.neutral[500]
                    }}>
                              {categoryConfig.orchestration.createTaskBefore?.prerequisite === 'NONE' || !categoryConfig.orchestration.createTaskBefore?.prerequisite ? '✅ La tâche sera créée automatiquement au moment prévu.' : categoryConfig.orchestration.createTaskBefore?.prerequisite === 'TIMESLOT_CONFIRMED' ? '⏰ La tâche sera créée SEULEMENT SI le client a confirmé son timeslot. Sinon, elle ne sera pas créée.' : '👤 La tâche sera créée SEULEMENT SI le client a effectué son enregistrement. Sinon, elle ne sera pas créée.'}
                            </Typography>
                          </Grid>}
                      </Grid>
                      <Typography variant="caption" display="block" mt={1.5} sx={{
                  fontSize: 11,
                  color: DS.neutral[500],
                  fontStyle: 'italic'
                }}>
                        💡 <strong>Astuce :</strong> Mettez la valeur à <strong>0</strong> pour créer la tâche <strong>immédiatement</strong> après le moment sélectionné.
                      </Typography>
                    </ConfigSection>

                    {/* Section 3: Stratégie d'assignation */}
                    <ConfigSection title="Stratégie d&apos;assignation" icon="🎯" helper="Comment choisir le staff pour cette tâche">
                      <Grid container spacing={2}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Stratégie</InputLabel>
                            <Select value={categoryConfig.orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentStrategy', e.target.value)} label="Stratégie" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                              <MenuItem value="PRIORITY">Priorité (selon priorité configurée du staff)</MenuItem>
                              <MenuItem value="ROTATION">Rotation (tour de rôle équitable)</MenuItem>
                              <MenuItem value="MANUAL">Manuel (admin assigne manuellement)</MenuItem>
                            </Select>
                          </FormControl>
                          <Typography variant="caption" display="block" mt={1} sx={{
                      fontSize: 11,
                      color: DS.neutral[500]
                    }}>
                            PRIORITY: Assigne au staff avec la priorité la plus haute (priorité 1 = le plus prioritaire). ROTATION: Distribue équitablement entre le staff. MANUAL: Aucune assignation automatique.
                          </Typography>
                        </Grid>
                      </Grid>
                    </ConfigSection>

                    {/* Section 4: JOUR J */}
                    <ConfigSection title="Logique JOUR J" icon="📅" helper="Assignation le jour même de la tâche">
                      <Alert severity="info" sx={{
                  mb: 2,
                  fontSize: 12
                }}>
                        AI contacte le staff prioritaire, puis relaie apres X heures. Maximum Y relances par jour avant de passer au staff suivant.
                      </Alert>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <TextField label="Max relances/jour" type="number" size="small" value={categoryConfig.orchestration.dayJLogic?.maxRetriesPerDay ?? 3} onChange={e => handleDayJLogicChange(categoryKey, 'maxRetriesPerDay', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Par staff sur J" inputProps={{
                      min: 1,
                      max: 10
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <TextField label="Intervalle (heures)" type="number" size="small" value={categoryConfig.orchestration.dayJLogic?.retryIntervalHours ?? 1} onChange={e => handleDayJLogicChange(categoryKey, 'retryIntervalHours', parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} helperText="Entre relances" inputProps={{
                      min: 1,
                      max: 24
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <FormControl fullWidth size="small">
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
                      }}>
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
                          <RadioGroup value={categoryConfig.orchestration.staffRefusalPolicy?.blockingStrategy ?? 'BLOCK_TODAY'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'blockingStrategy', e.target.value)}>
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
                          <RadioGroup value={categoryConfig.orchestration.staffRefusalPolicy?.actionAfterRefusal ?? 'CONTINUE'} onChange={e => handleStaffRefusalPolicyChange(categoryKey, 'actionAfterRefusal', e.target.value)}>
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
                              <TextField label="Tolérance (±)" type="number" size="small" value={categoryConfig.orchestration.escalation.toleranceHours || 2} onChange={e => handleEscalationChange(categoryKey, 'toleranceHours', parseInt(e.target.value) || 2)} inputProps={{
                      min: 1,
                      max: 12
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
                    }} helperText="-1 = 1 jour avant" inputProps={{
                      min: -30,
                      max: 30
                    }} />
                        </Grid>
                        <Grid item xs={12} sm={3}>
                          <TextField label="Heure (0-23)" type="number" size="small" value={categoryConfig.orchestration.deadline?.hour ?? ''} onChange={e => handleDeadlineChange(categoryKey, 'hour', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} fullWidth sx={{
                      backgroundColor: 'white',
                      borderRadius: '6px'
                    }} placeholder="8" helperText="Heure exécution deadline" inputProps={{
                      min: 0,
                      max: 23
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
                      }} helperText="Heures après que le client ait choisi l'heure" inputProps={{
                        min: 0,
                        max: 48
                      }} /> : <TextField label="Rappeler X jours avant" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.daysBeforeDeadline ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'daysBeforeDeadline', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Début rappel (ex. 3 = J-3)" inputProps={{
                        min: 0,
                        max: 30
                      }} />}
                              </Grid>

                              {/* Deadline fin rappel (j avant) — Registration / Declaration */}
                              {['registration', 'arrival_declare', 'departure_declare'].includes(categoryKey) && <Grid item xs={12} sm={6}>
                                  <TextField label="Deadline fin rappel (j avant)" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.deadline ?? categoryConfig.orchestration.clientReminder?.deadlineDaysBefore ?? 1} onChange={e => handleClientReminderChange(categoryKey, 'deadline', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Dernier jour d'envoi (ex. 1 = J-1)" inputProps={{
                        min: 1,
                        max: 30
                      }} />
                                </Grid>}

                              {/* Nombre de relances par jour */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="Nombre de relances par jour" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.maxRemindersPerDay ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'maxRemindersPerDay', parseInt(e.target.value, 10))} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Nombre maximum de relances par jour (ex: 3)" inputProps={{
                        min: 1,
                        max: 10
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
                      }} helperText="Rappel anticipé avant le timeslot (ex: 2h avant départ)" inputProps={{
                        min: 0,
                        max: 48
                      }} placeholder="Ex: 2" />
                              </Grid>

                              {/* Heures APRÈS l'exécution du timeslot */}
                              <Grid item xs={12} sm={6}>
                                <TextField label="X heures après l'exécution" type="number" size="small" value={categoryConfig.orchestration.clientReminder?.hoursAfterExecution ?? ''} onChange={e => handleClientReminderChange(categoryKey, 'hoursAfterExecution', e.target.value ? parseInt(e.target.value, 10) : undefined)} fullWidth sx={{
                        backgroundColor: 'white',
                        borderRadius: '6px'
                      }} helperText="Rappel si retard après le timeslot (ex: 2h après départ prévu)" inputProps={{
                        min: 0,
                        max: 48
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
                    }} helperText="0 = immédiat, 1 = max 1j après, 2 = max 2j après..." inputProps={{
                      min: 0,
                      max: 7
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
                    }} helperText="0 = même jour, 1 = 1j avant (défaut), 2 = 2j avant..." inputProps={{
                      min: 0,
                      max: 7
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
                    }} helperText="Heures de sécurité" inputProps={{
                      min: 0,
                      max: 24
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
                                  {template.displayLabel || template.description || t(template.messageName) || 'Sans nom'}
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
                                  <MenuItem value="OTA_PRIORITY">📧→ Priorité Email-OTA</MenuItem>
                                  <MenuItem value="WHATSAPP_PRIORITY">💬→ Priorité WhatsApp</MenuItem>
                                  <MenuItem value="WHATSAPP_ONLY">💬 WhatsApp uniquement</MenuItem>
                                  <MenuItem value="OTA_ONLY">📧 Email-OTA uniquement</MenuItem>
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
                              <MenuItem value="AFTER_ARRIVAL">✅ Après arrivée</MenuItem>
                              <MenuItem value="BEFORE_DEPARTURE">👋 Avant départ</MenuItem>
                              <MenuItem value="AFTER_DEPARTURE">✅ Après départ</MenuItem>
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

                        {/* ✅ Résumé "Quand : X jours avant/après à Xh" */}
                        {(() => {
                    const trigger = categoryConfig.orchestration?.createTaskBefore?.trigger;
                    const value = categoryConfig.orchestration?.createTaskBefore?.value;
                    const unit = categoryConfig.orchestration?.createTaskBefore?.unit;
                    const preferredHours = categoryConfig.orchestration?.createTaskBefore?.preferredHours;
                    if (!trigger || !value) return null;

                    // Mapping des triggers
                    const triggerLabels = {
                      'BEFORE_ARRIVAL': 'avant arrivée',
                      'BEFORE_DEPARTURE': 'avant départ',
                      'AFTER_ARRIVAL': 'après arrivée',
                      'AFTER_DEPARTURE': 'après départ',
                      'AFTER_RESERVATION': 'après réservation',
                      'BEFORE_EXECUTION': 'avant exécution',
                      'IMMEDIATE_RESERVATION': 'réservation',
                      'IMMEDIATE_CLIENT_REQUEST': 'demande client'
                    };
                    const triggerLabel = triggerLabels[trigger] || trigger.toLowerCase();
                    const unitLabel = unit === 'HOURS' ? 'h' : 'j';

                    // Construire le texte du résumé
                    let summaryText = `${value} ${unitLabel} ${triggerLabel}`;

                    // Ajouter l'heure si présente
                    if (preferredHours && unit === 'DAYS') {
                      summaryText += ` à ${preferredHours}h`;
                    }
                    return <Grid item xs={12}>
                              <Box sx={{
                        padding: 2,
                        backgroundColor: '#F0F9FF',
                        borderLeft: '4px solid #3B82F6',
                        borderRadius: '6px',
                        marginTop: 1
                      }}>
                                <Typography variant="body2" sx={{
                          fontWeight: 600,
                          color: '#1E40AF'
                        }}>
                                  Quand : {summaryText}
                                </Typography>
                              </Box>
                            </Grid>;
                  })()}

                        {/* Pré-requis (only for scheduled triggers) */}
                        {['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(categoryConfig.orchestration?.createTaskBefore?.trigger) && <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>Pré-requis</InputLabel>
                              <Select value={categoryConfig.orchestration?.createTaskBefore?.prerequisite || 'NONE'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                        ...categoryConfig.orchestration?.createTaskBefore,
                        prerequisite: e.target.value
                      })} label="Pré-requis" sx={{
                        borderRadius: '6px',
                        backgroundColor: 'white'
                      }}>
                                <MenuItem value="NONE">✅ Aucun (créer automatiquement)</MenuItem>
                                <MenuItem value="TIMESLOT_CONFIRMED">⏰ Attendre confirmation timeslot</MenuItem>
                                <MenuItem value="CLIENT_REGISTERED">👤 Attendre enregistrement client</MenuItem>
                              </Select>
                            </FormControl>
                            <Typography variant="caption" display="block" mt={1} sx={{
                      fontSize: 11,
                      color: DS.neutral[500]
                    }}>
                              {categoryConfig.orchestration?.createTaskBefore?.prerequisite === 'NONE' || !categoryConfig.orchestration?.createTaskBefore?.prerequisite ? '✅ La tâche sera créée automatiquement au moment prévu.' : categoryConfig.orchestration?.createTaskBefore?.prerequisite === 'TIMESLOT_CONFIRMED' ? '⏰ La tâche sera créée SEULEMENT SI le client a confirmé son timeslot. Sinon, elle ne sera pas créée.' : '👤 La tâche sera créée SEULEMENT SI le client a effectué son enregistrement. Sinon, elle ne sera pas créée.'}
                            </Typography>
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
                                  {template.displayLabel || template.description || t(template.messageName) || 'Sans nom'}
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
                                  <MenuItem value="OTA_PRIORITY">📧→ Priorité Email-OTA</MenuItem>
                                  <MenuItem value="WHATSAPP_PRIORITY">💬→ Priorité WhatsApp</MenuItem>
                                  <MenuItem value="WHATSAPP_ONLY">💬 WhatsApp uniquement</MenuItem>
                                  <MenuItem value="OTA_ONLY">📧 Email-OTA uniquement</MenuItem>
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
      const csvHeaders = ['Tâche', 'Type', 'Category', 'Template Message', 'WhatsApp Only', 'Activé', "Mode d'assignation", 'Création du plan', 'Création: Moment', 'Création: Valeur', 'Création: Unité', 'Pré-requis', 'Stratégie assignation', 'JOUR J: Max relances/jour', 'JOUR J: Intervalle (h)', 'JOUR J: Heures contact', 'J+1: Retry auto jours suivants', 'Refus: Blocage du staff', 'Refus: Action après refus', 'Deadline: Type', 'Deadline: Valeur', 'Deadline: Heure', 'Deadline: Action si atteinte', 'Reschedule: Autoriser', 'Reschedule: Tolérance (±h)', 'Reschedule: Type', 'Reschedule: Notifier client', 'Rappels: Activé', 'Rappels: Condition', 'Rappels: Délai', 'Rappels: Deadline fin (j)', 'Rappels: Nb relances/jour', 'Rappels: Heures préférées', 'Rappels: h avant exécution', 'Rappels: h après exécution', 'Message: Template', 'Message: Priorité canal', 'Ménage: Max jours après départ', 'Ménage: Jours avant arrivée', 'Ménage: Marge sécurité (h)', 'Ménage: Action si pas assez temps', 'Notif Admin: Début tâche', 'Notif Admin: Fin tâche', 'Notif Admin: Chgt staff', 'Notif Admin: Reschedule', 'Notif Admin: Refus staff', 'Notif Admin: Deadline', 'Notif Client: Début tâche', 'Notif Client: Fin tâche', 'Notif Client: Reschedule'];
      const csvData = Object.entries(editedCategories).map(([categoryKey, categoryConfig]) => {
        const orch = categoryConfig.orchestration || {};
        const dayJLogic = orch.dayJLogic || {};
        const staffRefusalPolicy = orch.staffRefusalPolicy || {};
        const deadline = staffRefusalPolicy.deadline || {};
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
        const messageTemplateName = orch.messageTemplateId ? t(messageTemplates.find(t => t._id === orch.messageTemplateId)?.messageName) || orch.messageTemplateId : '-';

        // Récupérer la priorité canal du template
        const channelPriority = orch.messageTemplateId ? messageTemplates.find(t => t._id === orch.messageTemplateId)?.channelPriority || '-' : '-';
        return [categoryConfig?.label || categoryConfig?.categoryDisplayLabel || '—', categoryConfig?.type || '-', categoryConfig?.category || categoryKey, messageTemplateName, boolToStr(orch.whatsappOnly), boolToStr(categoryConfig.enabled), valOrDash(categoryConfig.mode), valOrDash(categoryConfig.planningMode), valOrDash(createTaskBefore.trigger), valOrDash(createTaskBefore.value), valOrDash(createTaskBefore.unit), valOrDash(orch.assignmentStrategy), valOrDash(dayJLogic.maxRetriesPerDay), valOrDash(dayJLogic.retryIntervalHours), arrayToStr(dayJLogic.contactHours), arrayToStr(staffRefusalPolicy.autoRetryNextDays), valOrDash(staffRefusalPolicy.blockingStrategy), valOrDash(staffRefusalPolicy.actionAfterRefusal), valOrDash(deadline.type), valOrDash(deadline.value), valOrDash(deadline.actionOnReached), boolToStr(orch.allowReschedule), valOrDash(orch.rescheduleToleranceHours), valOrDash(orch.rescheduleType), boolToStr(orch.notifyClientOnReschedule), boolToStr(clientReminder.enabled), valOrDash(clientReminder.condition), valOrDash(clientReminder.daysBeforeDeadline || clientReminder.hoursAfterChoice), valOrDash(clientReminder.deadline ?? clientReminder.deadlineDaysBefore), valOrDash(clientReminder.maxRemindersPerDay), arrayToStr(clientReminder.preferredHours), valOrDash(clientReminder.hoursBeforeExecution), valOrDash(clientReminder.hoursAfterExecution), messageTemplateName, channelPriority, valOrDash(cleaning.maxDaysAfterCheckout), valOrDash(cleaning.minDaysBeforeNextCheckin), valOrDash(cleaning.securityMarginBeforeCheckin), valOrDash(cleaning.ifNotEnoughTime), boolToStr(notif.notifyAdminOnTaskStart), boolToStr(notif.notifyAdminOnTaskCompletion), boolToStr(notif.notifyAdminOnStaffChange), boolToStr(notif.notifyAdminOnReschedule), boolToStr(notif.notifyAdminOnStaffRefusal), boolToStr(notif.notifyAdminOnDeadlineReached), boolToStr(notif.notifyClientOnTaskStart), boolToStr(notif.notifyClientOnTaskComplete), boolToStr(notif.notifyClientOnReschedule)];
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

  // ========== TABLEAU SIMPLIFIÉ (~10 colonnes, design orange comme vue réservations) ==========
  const th = (label, opts = {}) => <TableCell sx={{
    fontWeight: 'bold',
    fontSize: '1.05rem',
    color: 'white',
    backgroundColor: SOJORI_COLORS.primary,
    borderRight: '1px solid rgba(255, 255, 255, 0.22)',
    padding: '4px 8px',
    minWidth: opts.width || 90,
    '&:last-of-type': {
      borderRight: 'none'
    },
    ...opts.sx
  }}>
      {label}
    </TableCell>;
  const td = (children, opts = {}) => <TableCell sx={{
    fontSize: 13,
    verticalAlign: 'middle',
    borderRight: '1px solid #e2e8f0',
    '&:last-of-type': {
      borderRight: 'none'
    },
    ...opts.sx
  }}>
      {children}
    </TableCell>;
  const getTemplateName = templateId => {
    const t = messageTemplates.find(m => m._id === templateId);
    return t?.messageName || t?.name || (templateId ? '…' : '—');
  };
  const getTypeLabel = cfg => (cfg?.type || cfg?.categoryType || '—')?.replace(/_/g, ' ');
  const hasTimeslot = cfg => cfg?.orchestration?.createTaskBefore?.prerequisite === 'TIMESLOT_CONFIRMED' || cfg?.categoryType?.startsWith?.('CHOICE') || cfg?.categoryType?.startsWith?.('CLEANING');
  const getNbRappels = cfg => {
    const r = cfg?.orchestration?.clientReminder;
    if (!r?.enabled) return '—';
    return r.maxRemindersPerDay ?? r.deadline ?? r.deadlineDaysBefore ?? '•';
  };
  const getStrategie = cfg => cfg?.orchestration?.assignmentStrategy || '—';
  const getJMaxRelances = cfg => cfg?.orchestration?.dayJLogic?.maxRetriesPerDay ?? '—';
  const getPrerequis = cfg => {
    const p = cfg?.orchestration?.createTaskBefore?.prerequisite;
    if (!p) return '—';
    return p === 'TIMESLOT_CONFIRMED' ? 'Timeslot' : p === 'NONE' ? 'Aucun' : p;
  };
  const renderSimplifiedTableMode = () => <TableContainer component={Paper} className="reservations-table-container shadow-lg" sx={{
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    marginBottom: 2
  }}>
      <Table size="small" stickyHeader sx={{
      minWidth: 1150
    }}>
        <TableHead className="reservations-table-head">
          <TableRow>
            {th('Ordre', {
            width: 56
          })}
            {th('Tâche', {
            minWidth: 140
          })}
            {th('Type', {
            width: 110
          })}
            {th('Category', {
            width: 100
          })}
            {th('Nom', {
            minWidth: 120
          })}
            {th('Template', {
            minWidth: 140
          })}
            {th('Nb rappels', {
            width: 95
          })}
            {th('Timeslot', {
            width: 80
          })}
            {th('Stratégie', {
            width: 85
          })}
            {th('J max rel.', {
            width: 85
          })}
            {th('Pré-requis', {
            width: 90
          })}
            {th('Activé', {
            width: 70
          })}
            {th('Modifier', {
            width: 80,
            sx: {
              textAlign: 'center'
            }
          })}
          </TableRow>
        </TableHead>
        <TableBody>
          {getSortedCategories(editedCategories).map(([categoryKey, categoryConfig]) => <TableRow key={categoryKey} sx={{
          backgroundColor: categoryConfig.enabled ? 'white' : 'rgba(255, 107, 53, 0.05)'
        }}>
              {td(<Box display="flex" flexDirection="column" alignItems="center">
                  <Tooltip title="Remonter">
                    <span>
                      <IconButton size="small" disableRipple onClick={() => handleMoveOrder(categoryKey, 'up')} disabled={getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === 0} sx={{
                  p: 0.25,
                  color: getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === 0 ? DS.neutral[400] : SOJORI_COLORS.primary
                }}>
                        <ArrowUpwardIcon sx={{
                    fontSize: 18
                  }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Descendre">
                    <span>
                      <IconButton size="small" disableRipple onClick={() => handleMoveOrder(categoryKey, 'down')} disabled={getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === getSortedCategories(editedCategories).length - 1} sx={{
                  p: 0.25,
                  color: getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === getSortedCategories(editedCategories).length - 1 ? DS.neutral[400] : SOJORI_COLORS.primary
                }}>
                        <ArrowDownwardIcon sx={{
                    fontSize: 18
                  }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>)}
              {td(<Typography sx={{
            fontWeight: 600,
            fontSize: 13,
            color: DS.neutral[900]
          }}>
                  {categoryConfig.label || categoryConfig.name || categoryConfig.categoryDisplayLabel || categoryKey}
                </Typography>)}
              {td(<Chip label={getTypeLabel(categoryConfig)} size="small" sx={{
            fontSize: 10,
            height: 22,
            maxWidth: 100,
            '& .MuiChip-label': {
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }
          }} />)}
              {td(<Typography sx={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: DS.neutral[700]
          }}>
                  {(categoryConfig.category || categoryKey).toString().slice(0, 20)}
                  {(categoryConfig.category || categoryKey)?.length > 20 ? '…' : ''}
                </Typography>)}
              {td(<Typography sx={{
            fontSize: 12,
            color: DS.neutral[800]
          }}>
                  {(categoryConfig.name || categoryConfig.label || '—').toString().slice(0, 25)}
                  {(categoryConfig.name || categoryConfig.label)?.length > 25 ? '…' : ''}
                </Typography>)}
              {td(<Typography sx={{
            fontSize: 11,
            color: DS.neutral[600]
          }} title={getTemplateName(categoryConfig.orchestration?.messageTemplateId)}>
                  {getTemplateName(categoryConfig.orchestration?.messageTemplateId)?.slice(0, 22)}
                  {getTemplateName(categoryConfig.orchestration?.messageTemplateId)?.length > 22 ? '…' : ''}
                </Typography>)}
              {td(<Typography sx={{
            fontSize: 12
          }}>{getNbRappels(categoryConfig)}</Typography>)}
              {td(<Chip label={hasTimeslot(categoryConfig) ? 'Oui' : '—'} size="small" sx={{
            fontSize: 10,
            height: 20,
            bgcolor: hasTimeslot(categoryConfig) ? DS.success[50] : 'transparent',
            color: hasTimeslot(categoryConfig) ? DS.success[600] : DS.neutral[500]
          }} />)}
              {td(<Typography sx={{
            fontSize: 11,
            color: DS.neutral[700]
          }}>{getStrategie(categoryConfig)}</Typography>)}
              {td(<Typography sx={{
            fontSize: 12
          }}>{getJMaxRelances(categoryConfig)}</Typography>)}
              {td(<Typography sx={{
            fontSize: 11,
            color: DS.neutral[700]
          }}>{getPrerequis(categoryConfig)}</Typography>)}
              {td(<Switch checked={!!categoryConfig.enabled} onChange={e => handleCategoryChange(categoryKey, 'enabled', e.target.checked)} size="small" sx={{
            '& .MuiSwitch-switchBase.Mui-checked': {
              color: SOJORI_COLORS.primary
            },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
              backgroundColor: SOJORI_COLORS.primary
            }
          }} />)}
              {td(<Box display="flex" justifyContent="center">
                  <Tooltip title="Modifier la configuration">
                    <IconButton size="small" onClick={() => {
                setEditingCategoryKey(categoryKey);
                setSimplifiedEditOpen(true);
              }} sx={{
                color: SOJORI_COLORS.primary
              }}>
                      <EditIcon sx={{
                  fontSize: 20
                }} />
                    </IconButton>
                  </Tooltip>
                </Box>)}
            </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>;

  // ========== MODE TABLEAU DÉTAILLÉ (conservé pour référence, non affiché) ==========
  const renderTableMode = () => <TableContainer component={Paper} sx={{
    // No maxHeight or overflowY - use natural page scroll (single scroll like Liste page)
    overflowX: 'auto',
    // Only horizontal scroll for wide table
    border: `1px solid ${DS.neutral[200]}`,
    borderRadius: '8px',
    boxShadow: DS.shadow.md,
    marginBottom: '20px',
    // Space at bottom
    // Custom scrollbar styling for horizontal scroll
    '&::-webkit-scrollbar': {
      height: '10px'
    },
    '&::-webkit-scrollbar-track': {
      background: DS.neutral[100],
      borderRadius: '4px'
    },
    '&::-webkit-scrollbar-thumb': {
      background: DS.neutral[400],
      borderRadius: '4px',
      '&:hover': {
        background: DS.neutral[500]
      }
    }
  }}>
      <Table size="small" stickyHeader sx={{
      minWidth: 2600
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
            {/* NOUVELLES COLONNES - Champs importants */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: SOJORI_COLORS.primaryPale,
            borderLeft: `3px solid ${SOJORI_COLORS.primary}`
          }}>
              🏷️ Type
            </TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: SOJORI_COLORS.primaryPale
          }}>
              🔑 Category
            </TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: SOJORI_COLORS.primaryPale
          }}>
              🗂️ categoryType (BD)
            </TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: SOJORI_COLORS.primaryPale
          }}>
              📛 name (BD)
            </TableCell>
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 160,
            backgroundColor: SOJORI_COLORS.primaryPale
          }}>
              🏷️ label (BD)
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
            {/* 2.5. Création du plan */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 150,
            backgroundColor: DS.neutral[50]
          }}>📅 Création du plan</TableCell>
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
            minWidth: 180,
            backgroundColor: DS.neutral[50]
          }}>📋 Condition</TableCell>
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
            {/* 5.5. Heures préférées */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 140,
            backgroundColor: DS.neutral[50]
          }}>🕐 Heures préférées</TableCell>
            {/* 3.5. Pré-requis */}
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 180,
            backgroundColor: DS.neutral[50]
          }}>🔒 Pré-requis</TableCell>
            {/* 4. Stratégie d&apos;assignation */}
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
            minWidth: 100,
            backgroundColor: DS.neutral[100]
          }}>Rappels: Deadline fin (j)</TableCell>
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
            <TableCell sx={{
            fontWeight: 700,
            fontSize: 12,
            color: DS.neutral[900],
            minWidth: 120,
            backgroundColor: SOJORI_COLORS.primaryPale,
            borderLeft: `3px solid ${SOJORI_COLORS.primary}`
          }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {getSortedCategories(editedCategories).map(([categoryKey, categoryConfig]) => <TableRow key={categoryKey} sx={{
          backgroundColor: categoryConfig.enabled ? 'white' : 'rgba(255, 107, 53, 0.04)'
        }}>
              {/* Sticky first column - Tâche (editable) + Ordre (haut/bas) */}
              <TableCell sx={{
            position: 'sticky',
            left: 0,
            zIndex: 2,
            backgroundColor: categoryConfig.enabled ? 'white' : DS.neutral[50],
            borderRight: `2px solid ${DS.neutral[300]}`,
            minWidth: 200
          }}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <Box display="flex" flexDirection="column">
                    <Tooltip title="Remonter">
                      <IconButton size="small" onClick={() => handleMoveOrder(categoryKey, 'up')} disabled={getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === 0} sx={{
                    p: 0.25,
                    color: DS.neutral[600]
                  }}>
                        <ArrowUpwardIcon sx={{
                      fontSize: 18
                    }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Descendre">
                      <IconButton size="small" onClick={() => handleMoveOrder(categoryKey, 'down')} disabled={getSortedCategories(editedCategories).findIndex(([k]) => k === categoryKey) === getSortedCategories(editedCategories).length - 1} sx={{
                    p: 0.25,
                    color: DS.neutral[600]
                  }}>
                        <ArrowDownwardIcon sx={{
                      fontSize: 18
                    }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  <TextField variant="standard" size="small" value={categoryConfig.label || ''} placeholder={categoryConfig?.label || categoryConfig?.categoryDisplayLabel || 'Libellé'} onChange={e => handleCategoryChange(categoryKey, 'label', e.target.value)} sx={{
                flex: 1,
                minWidth: 80,
                '& .MuiInputBase-input': {
                  fontSize: 13,
                  fontWeight: 600,
                  color: DS.neutral[900],
                  '&::placeholder': {
                    color: DS.neutral[500],
                    fontWeight: 500
                  }
                },
                '& .MuiInputBase-root::before': {
                  borderBottom: 'none'
                },
                '& .MuiInputBase-root.Mui-focused::after': {
                  borderBottomColor: DS.primary[500]
                }
              }} />
                </Box>
              </TableCell>

              {/* NOUVELLES CELLULES - Champs importants */}
              {/* Type */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: SOJORI_COLORS.primaryPale,
            borderLeft: `3px solid ${SOJORI_COLORS.primary}`,
            fontWeight: 600
          }}>
                <Chip label={categoryConfig.type || 'N/A'} size="small" sx={{
              backgroundColor: categoryConfig.type === 'message' || categoryConfig.type === 'NOTIFICATION' ? DS.info[100] : categoryConfig.type === 'choice' || categoryConfig.type?.startsWith('CHOICE') ? DS.warning[100] : categoryConfig.type === 'declaration' || categoryConfig.type?.startsWith('DECLARATION') ? DS.success[100] : categoryConfig.type?.startsWith('CLEANING') ? DS.primary[100] : DS.neutral[100],
              color: DS.neutral[900],
              fontWeight: 600,
              fontSize: 11
            }} />
              </TableCell>

              {/* Category (clé technique) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: SOJORI_COLORS.primaryPale
          }}>
                <Typography variant="caption" sx={{
              fontFamily: 'monospace',
              color: SOJORI_COLORS.primary,
              fontWeight: 600,
              fontSize: 11
            }}>
                  {categoryConfig.categoryType || categoryKey}
                </Typography>
              </TableCell>

              {/* categoryType BD */}
              <TableCell sx={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#E65100',
            backgroundColor: '#FFF8F0'
          }}>
                {String(categoryConfig?.categoryType ?? '—')}
              </TableCell>

              {/* name BD */}
              <TableCell sx={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#E65100',
            backgroundColor: '#FFF8F0'
          }}>
                {String(categoryConfig?.name ?? '—')}
              </TableCell>

              {/* label BD */}
              <TableCell sx={{
            fontSize: 11,
            fontFamily: 'monospace',
            color: '#E65100',
            backgroundColor: '#FFF8F0'
          }}>
                {String(categoryConfig?.label ?? '—')}
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

              {/* 2.5. Création du plan */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.enabled ? <Select value={categoryConfig.planningMode || 'INITIAL'} onChange={e => handleCategoryChange(categoryKey, 'planningMode', e.target.value)} size="small" sx={{
              minWidth: 140,
              fontSize: 12
            }}>
                    <MenuItem value="INITIAL" sx={{
                fontSize: 12
              }}>📋 Plan initial</MenuItem>
                    <MenuItem value="ON_DEMAND" sx={{
                fontSize: 12
              }}>🎯 Sur demande</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 3. Création: Moment */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode === 'MANUAL' || !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {(categoryConfig.mode === 'ORCHESTRATION' || categoryConfig.mode === 'NOTIFICATION_ONLY') && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
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
              }}>🎯 Après demande client</MenuItem>
                    <MenuItem value="BEFORE_ARRIVAL" sx={{
                fontSize: 11
              }}>🚪 Avant arrivée</MenuItem>
                    <MenuItem value="AFTER_ARRIVAL" sx={{
                fontSize: 11
              }}>✅ Après arrivée</MenuItem>
                    <MenuItem value="BEFORE_DEPARTURE" sx={{
                fontSize: 11
              }}>👋 Avant départ</MenuItem>
                    <MenuItem value="AFTER_DEPARTURE" sx={{
                fontSize: 11
              }}>✅ Après départ</MenuItem>
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

              {/* 3.5. Condition */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode !== 'NOTIFICATION_ONLY' ? DS.neutral[100] : 'inherit'
          }}>
                {categoryConfig.mode === 'NOTIFICATION_ONLY' ? <Select value={categoryConfig.sendNotificationCondition || 'ALWAYS'} onChange={e => handleCategoryChange(categoryKey, 'sendNotificationCondition', e.target.value)} size="small" sx={{
              minWidth: 170,
              fontSize: 12
            }}>
                    <MenuItem value="ALWAYS" sx={{
                fontSize: 11
              }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>✅</span>
                        <span>Toujours</span>
                      </Box>
                    </MenuItem>
                    <MenuItem value="IF_NOT_DONE" sx={{
                fontSize: 11
              }}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>⚠️</span>
                        <span>Si tâche non effectuée</span>
                      </Box>
                    </MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 4. Création: Valeur */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode === 'MANUAL' || !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {(categoryConfig.mode === 'ORCHESTRATION' || categoryConfig.mode === 'NOTIFICATION_ONLY') && categoryConfig.orchestration ? <TextField type="text" size="small" placeholder="Ex: 0, 2, ou 1-2" value={categoryConfig.orchestration.createTaskBefore?.value ?? ''} onChange={e => {
              const val = e.target.value;
              handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                ...categoryConfig.orchestration.createTaskBefore,
                value: val === '' ? '' : val
              });
            }} sx={{
              width: 90
            }} inputProps={{
              style: {
                fontSize: 12
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 5. Création: Unité */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode === 'MANUAL' || !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {(categoryConfig.mode === 'ORCHESTRATION' || categoryConfig.mode === 'NOTIFICATION_ONLY') && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.createTaskBefore?.unit || 'HOURS'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
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

              {/* 5.5. Heures préférées (affiché si unité = DAYS) */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: categoryConfig.mode === 'MANUAL' || !categoryConfig.enabled ? DS.neutral[100] : 'inherit'
          }}>
                {(categoryConfig.mode === 'ORCHESTRATION' || categoryConfig.mode === 'NOTIFICATION_ONLY') && categoryConfig.orchestration?.createTaskBefore?.unit === 'DAYS' ? <TextField type="text" size="small" placeholder="9-13-19" value={categoryConfig.orchestration.createTaskBefore?.preferredHours || ''} onChange={e => {
              handleOrchestrationChange(categoryKey, 'createTaskBefore', {
                ...categoryConfig.orchestration.createTaskBefore,
                preferredHours: e.target.value
              });
            }} sx={{
              width: 110
            }} inputProps={{
              style: {
                fontSize: 12
              }
            }} /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 5.6. Pré-requis */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[50]
          }}>
                {(categoryConfig.mode === 'ORCHESTRATION' || categoryConfig.mode === 'NOTIFICATION_ONLY') && categoryConfig.orchestration?.createTaskBefore?.trigger && ['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(categoryConfig.orchestration.createTaskBefore.trigger) ? <Select value={categoryConfig.orchestration.createTaskBefore.prerequisite || 'NONE'} onChange={e => handleOrchestrationChange(categoryKey, 'createTaskBefore', {
              ...categoryConfig.orchestration.createTaskBefore,
              prerequisite: e.target.value
            })} size="small" sx={{
              minWidth: 160,
              fontSize: 12
            }}>
                    <MenuItem value="NONE" sx={{
                fontSize: 11
              }}>✅ Aucun</MenuItem>
                    <MenuItem value="TIMESLOT_CONFIRMED" sx={{
                fontSize: 11
              }}>⏰ Timeslot confirmé</MenuItem>
                    <MenuItem value="CLIENT_REGISTERED" sx={{
                fontSize: 11
              }}>👤 Client enregistré</MenuItem>
                  </Select> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 6. Stratégie assignation */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.mode === 'ORCHESTRATION' && categoryConfig.orchestration ? <Select value={categoryConfig.orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => handleOrchestrationChange(categoryKey, 'assignmentStrategy', e.target.value)} size="small" sx={{
              minWidth: 130,
              fontSize: 12
            }}>
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 10
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 1,
              max: 12
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
              }} inputProps={{
                style: {
                  fontSize: 11
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 1,
              max: 48
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 23
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 12
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 48
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="h après" /> : <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.daysBeforeDeadline ?? 3} onChange={e => handleClientReminderChange(categoryKey, 'daysBeforeDeadline', parseInt(e.target.value, 10))} sx={{
              width: 80
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 1,
              max: 14
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="j avant" /> : <Typography variant="caption" sx={{
              color: DS.neutral[400]
            }}>-</Typography>}
              </TableCell>

              {/* 22.1. Rappels: Deadline fin (j avant) — Registration / Declaration */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: DS.neutral[100]
          }}>
                {categoryConfig.enabled && ['registration', 'arrival_declare', 'departure_declare'].includes(categoryKey) ? <TextField type="number" size="small" value={categoryConfig.orchestration?.clientReminder?.deadline ?? categoryConfig.orchestration?.clientReminder?.deadlineDaysBefore ?? 1} onChange={e => handleClientReminderChange(categoryKey, 'deadline', parseInt(e.target.value, 10))} sx={{
              width: 70
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 1,
              max: 14
            }} disabled={!categoryConfig.orchestration?.clientReminder?.enabled} placeholder="1" /> : <Typography variant="caption" sx={{
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 1,
              max: 10
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
            }} inputProps={{
              style: {
                fontSize: 12
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 48
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 48
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
                        {template.displayLabel || template.description || t(template.messageName) || 'Sans nom'}
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
              }}>📧 Priorité Email-OTA</MenuItem>
                    <MenuItem value="WHATSAPP_PRIORITY" sx={{
                fontSize: 11
              }}>💬 Priorité WhatsApp</MenuItem>
                    <MenuItem value="WHATSAPP_ONLY" sx={{
                fontSize: 11
              }}>💬 WhatsApp uniquement</MenuItem>
                    <MenuItem value="OTA_ONLY" sx={{
                fontSize: 11
              }}>📧 Email-OTA uniquement</MenuItem>
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 7
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 7
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
            }} inputProps={{
              style: {
                fontSize: 12
              },
              min: 0,
              max: 24
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
              {/* Actions */}
              <TableCell sx={{
            fontSize: 12,
            backgroundColor: SOJORI_COLORS.primaryPale,
            borderLeft: `2px solid ${SOJORI_COLORS.primary}`
          }}>
                <Tooltip title={configTemplatesFromConfig[categoryKey] ? 'Mettre à jour le template' : 'Définir comme template'}>
                  <IconButton size="small" onClick={() => handleSetAsTemplate(categoryKey)} sx={{
                p: 0.5,
                color: configTemplatesFromConfig[categoryKey] ? SOJORI_COLORS.primary : DS.neutral[500],
                '&:hover': {
                  backgroundColor: alpha(SOJORI_COLORS.primary, 0.15)
                }
              }}>
                    <BookmarkIcon sx={{
                  fontSize: 20
                }} />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>)}
        </TableBody>
      </Table>
    </TableContainer>;
  const toolbarSlotBefore = <>
      <Button variant="outlined" startIcon={<PlaylistAddCheckIcon />} onClick={() => {
      setConfigTemplatesOpen(true);
      setConfigTemplatesTab('add');
      setAddCatType('');
      setAddCatSubType('');
      setAddCatForm({});
    }} sx={{
      borderColor: SOJORI_COLORS.primary,
      color: SOJORI_COLORS.primary,
      '&:hover': {
        borderColor: SOJORI_COLORS.primaryDark,
        backgroundColor: SOJORI_COLORS.primaryPale
      },
      textTransform: 'none',
      fontWeight: 600
    }}>
        Config & Templates
      </Button>
      <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving || !hasChanges()} sx={{
      backgroundColor: SOJORI_COLORS.primary,
      color: 'white !important',
      '&:hover': {
        backgroundColor: SOJORI_COLORS.primaryDark
      },
      '&:disabled': {
        backgroundColor: DS.neutral[300],
        color: 'white !important'
      },
      textTransform: 'none',
      fontWeight: 600,
      boxShadow: '0 2px 4px rgba(255, 107, 53, 0.2)'
    }}>
        {saving ? 'Sauvegarde...' : hasChanges() ? 'Sauvegarder' : 'Aucun changement'}
      </Button>
    </>;
  return <Box>
      {/* Ligne unique : Config & Templates, Configuration AI, Sauvegarder + Tableau */}
      <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} mb={2}>
        {toolbarSlotBefore}
      </Box>
      {renderSimplifiedTableMode()}

      {/* Dialog unifié Config & Templates (onglets Ajouter catégorie | Appliquer template) */}
      <Dialog open={configTemplatesOpen} onClose={() => {
      setConfigTemplatesOpen(false);
      setSelectedCategories([]);
      setSelectedTemplate(null);
      setAddCatType('');
      setAddCatSubType('');
      setAddCatForm({});
    }} maxWidth={configTemplatesTab === 'templates' ? 'md' : 'sm'} fullWidth>
        <DialogTitle sx={{
        borderBottom: `2px solid ${DS.primary[500]}`,
        pb: 0
      }}>
          <Tabs value={configTemplatesTab} onChange={(e, v) => setConfigTemplatesTab(v)} sx={{
          minHeight: 48,
          '& .Mui-selected': {
            color: DS.primary[600]
          }
        }}>
            <Tab label="Ajouter catégorie" value="add" />
            <Tab label="Appliquer template" value="templates" />
          </Tabs>
        </DialogTitle>
        <DialogContent sx={{
        pt: 3
      }}>
          {configTemplatesTab === 'add' && <Box>
          <Typography variant="body2" color="text.secondary" sx={{
            mb: 2
          }}>
            Choisissez le type de configuration à ajouter
          </Typography>
          <Grid container spacing={1.5} sx={{
            mb: 2
          }}>
            {[{
              key: 'notification',
              label: 'Notification',
              icon: '📢',
              desc: 'Envoi message sans tâche'
            }, {
              key: 'declaration',
              label: 'Déclaration',
              icon: '📋',
              desc: 'Inscription, arrivée ou départ déclaré'
            }, {
              key: 'choice',
              label: 'Choix créneau',
              icon: '🕐',
              desc: 'Choix heure arrivée ou départ'
            }, {
              key: 'cleaning_paid',
              label: 'Ménage Payant',
              icon: '🧹',
              desc: 'Ménage payant avec créneau'
            }, {
              key: 'cleaning_sojori',
              label: 'Ménage Sojori',
              icon: '🧼',
              desc: 'Ménage automatique entre réservations'
            }, {
              key: 'client_transport',
              label: 'Transport',
              icon: '🚗',
              desc: 'Demande client — Transport'
            }, {
              key: 'client_grocery',
              label: 'Grocery',
              icon: '🛒',
              desc: 'Demande client — Courses'
            }, {
              key: 'client_custom',
              label: 'Custom',
              icon: '⭐',
              desc: 'Demande client — Personnalisée'
            }, {
              key: 'client_support',
              label: 'Support',
              icon: '🛠️',
              desc: 'Demande client — Support'
            }].map(({
              key,
              label,
              icon,
              desc
            }) => <Grid item xs={6} key={key}>
                <Card onClick={() => handleAddCatTypeSelect(key)} sx={{
                cursor: 'pointer',
                border: addCatType === key ? `2px solid ${SOJORI_COLORS.primary}` : `2px solid ${DS.neutral[200]}`,
                bgcolor: addCatType === key ? SOJORI_COLORS.primaryPale : DS.neutral[50],
                '&:hover': {
                  borderColor: SOJORI_COLORS.primary
                },
                transition: 'all 0.15s'
              }}>
                  <CardContent sx={{
                  py: 1.5,
                  px: 2,
                  '&:last-child': {
                    pb: 1.5
                  }
                }}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography fontSize={22}>{icon}</Typography>
                      <Box>
                        <Typography fontWeight={600} fontSize={13}>{label}</Typography>
                        <Typography fontSize={11} color="text.secondary">{desc}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>)}
          </Grid>
          {addCatType === 'declaration' && <FormControl fullWidth size="small" sx={{
            mb: 2
          }}>
              <InputLabel>Sous-type déclaration</InputLabel>
              <Select value={addCatSubType} onChange={e => handleAddCatSubTypeSelect(e.target.value)} label="Sous-type déclaration">
                <MenuItem value="registration">🔐 Inscription Voyageurs</MenuItem>
                <MenuItem value="arrival_declare">📍 Arrivée Déclarée</MenuItem>
                <MenuItem value="departure_declare">👋 Départ Déclaré</MenuItem>
              </Select>
            </FormControl>}
          {addCatType === 'choice' && <FormControl fullWidth size="small" sx={{
            mb: 2
          }}>
              <InputLabel>Sous-type choix créneau</InputLabel>
              <Select value={addCatSubType} onChange={e => handleAddCatSubTypeSelect(e.target.value)} label="Sous-type choix créneau">
                <MenuItem value="arrival_choose">🎫 Choix Heure Arrivée</MenuItem>
                <MenuItem value="departure_choose">🚪 Choix Heure Départ</MenuItem>
                <MenuItem value="cleaning_free">🧹 Ménage Inclus</MenuItem>
              </Select>
            </FormControl>}
          {addCatForm.key && <Box sx={{
            mt: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}>
              <Chip label={`${addCatForm.label || addCatForm.key} — ${addCatForm.key}`} size="small" sx={{
              bgcolor: SOJORI_COLORS.primaryPale,
              color: SOJORI_COLORS.primary,
              fontWeight: 600
            }} />
              {editedCategories[addCatForm.key] && <Typography variant="caption" color="warning.main" fontWeight={600}>⚠ existe déjà — sera écrasée</Typography>}
            </Box>}
          </Box>}
          {configTemplatesTab === 'templates' && <Box>
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
                {Object.keys(editedCategories).map(categoryKey => {
                  const config = editedCategories[categoryKey];
                  return <Grid item xs={6} sm={4} key={categoryKey}>
                    <FormControlLabel control={<Checkbox size="small" checked={selectedCategories.includes(categoryKey)} onChange={() => handleCategorySelect(categoryKey)} />} label={<Typography fontSize={13}>
                          {config?.label || config?.name || config?.categoryDisplayLabel || categoryKey}
                        </Typography>} />
                  </Grid>;
                })}
              </Grid>
            </Box>
          </Box>

          {/* Étape 2: Sélection du template (système + personnels) */}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} mb={2}>
              2. Choisissez un template
            </Typography>

            {/* Templates système — défauts alignés Choix Heure Arrivée (staff 2j/9h), Transport/Support (1j/15h) */}
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{
              mb: 1
            }}>
              Templates système
            </Typography>
            <Grid container spacing={2} sx={{
              mb: 3
            }}>
              {Object.entries(PREDEFINED_TEMPLATES).map(([key, tpl]) => {
                const displayName = tpl?.name || tpl?.label || tpl?.categoryDisplayLabel || key;
                return <Grid item xs={12} sm={6} key={key}>
                    <Card sx={{
                    cursor: 'pointer',
                    border: `2px solid`,
                    borderColor: selectedTemplate === key ? SOJORI_COLORS.primary : DS.neutral[300],
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: SOJORI_COLORS.primary,
                      boxShadow: `0 4px 12px ${alpha(SOJORI_COLORS.primary, 0.2)}`,
                      transform: 'translateY(-2px)'
                    }
                  }} onClick={() => setSelectedTemplate(key)}>
                      <CardContent>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography sx={{
                          fontSize: 20
                        }}>{tpl?.icon || '📋'}</Typography>
                          <Typography variant="h6" fontSize={15} fontWeight={600} sx={{
                          color: tpl?.color || SOJORI_COLORS.primary,
                          flex: 1
                        }}>
                            {displayName}
                          </Typography>
                          {selectedTemplate === key && <Chip label="Sélectionné" size="small" sx={{
                          backgroundColor: SOJORI_COLORS.primary,
                          color: 'white',
                          fontWeight: 600
                        }} />}
                        </Box>
                        <Typography variant="body2" color="text.secondary" fontSize={12} sx={{
                        mt: 1
                      }}>
                          {tpl?.description || key}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>;
              })}
            </Grid>

            {/* Mes templates (créés depuis la config) */}
            <Typography variant="body2" fontWeight={600} color="text.secondary" sx={{
              mb: 1
            }}>
              Mes templates
            </Typography>
            {Object.keys(configTemplatesFromConfig).length === 0 ? <Alert severity="info" sx={{
              p: 2
            }}>
                Aucun template personnel. Cliquez sur <strong>Définir comme template</strong> (icône marque-page) dans le tableau, ou sur <strong>Créer comme template</strong> dans la modal de config.
              </Alert> : <Grid container spacing={2}>
                {Object.entries(configTemplatesFromConfig).map(([key, config]) => {
                const displayName = config?.label || config?.name || config?.categoryDisplayLabel || key;
                return <Grid item xs={12} sm={6} key={key}>
                      <Card sx={{
                    cursor: 'pointer',
                    border: `2px solid`,
                    borderColor: selectedTemplate === key ? SOJORI_COLORS.primary : DS.neutral[300],
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: SOJORI_COLORS.primary,
                      boxShadow: `0 4px 12px ${alpha(SOJORI_COLORS.primary, 0.2)}`,
                      transform: 'translateY(-2px)'
                    }
                  }} onClick={() => setSelectedTemplate(key)}>
                        <CardContent>
                          <Box display="flex" alignItems="center" gap={1}>
                            <BookmarkIcon sx={{
                          fontSize: 24,
                          color: SOJORI_COLORS.primary
                        }} />
                            <Typography variant="h6" fontSize={15} fontWeight={600} sx={{
                          color: SOJORI_COLORS.primary,
                          flex: 1
                        }}>
                              {displayName}
                            </Typography>
                            {selectedTemplate === key && <Chip label="Sélectionné" size="small" sx={{
                          backgroundColor: SOJORI_COLORS.primary,
                          color: 'white',
                          fontWeight: 600
                        }} />}
                          </Box>
                          <Typography variant="body2" color="text.secondary" fontSize={12} sx={{
                        mt: 1
                      }}>
                            Depuis la config • {key}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>;
              })}
              </Grid>}
          </Box>

          {selectedCategories.length > 0 && selectedTemplate && (() => {
            const tplData = PREDEFINED_TEMPLATES[selectedTemplate] || configTemplatesFromConfig[selectedTemplate];
            const displayName = tplData?.label || tplData?.name || tplData?.categoryDisplayLabel || selectedTemplate;
            return <Alert severity="info" sx={{
              mt: 3
            }}>
              Le template <strong>{displayName}</strong> sera
              appliqué à <strong>{selectedCategories.length} catégorie(s)</strong>
            </Alert>;
          })()}
          </Box>}
        </DialogContent>
        <DialogActions sx={{
        px: 3,
        pb: 2,
        pt: 2,
        borderTop: `1px solid ${DS.neutral[200]}`
      }}>
          {configTemplatesTab === 'add' && <>
          <Button onClick={() => {
            setConfigTemplatesOpen(false);
            setAddCatType('');
            setAddCatSubType('');
            setAddCatForm({});
          }} sx={{
            color: DS.neutral[600]
          }}>
            Annuler
          </Button>
          <Button variant="contained" onClick={() => {
            setConfigTemplatesOpen(false);
            setNewCatEditOpen(true);
          }} disabled={!addCatForm.key} sx={{
            backgroundColor: SOJORI_COLORS.primary,
            color: 'white !important',
            '&:hover': {
              backgroundColor: SOJORI_COLORS.primaryDark
            },
            '&:disabled': {
              backgroundColor: DS.neutral[300],
              color: 'white !important'
            }
          }}>
            Continuer
          </Button>
          </>}
          {configTemplatesTab === 'templates' && <>
          <Button onClick={() => {
            setConfigTemplatesOpen(false);
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
          </>}
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
              <TextField label="Source de la catégorie" fullWidth value={templateFormData.sourceCategory ? editedCategories[templateFormData.sourceCategory]?.label || editedCategories[templateFormData.sourceCategory]?.categoryDisplayLabel || 'Manuel' : 'Manuel'} disabled InputProps={{
              readOnly: true,
              sx: {
                backgroundColor: DS.neutral[50],
                fontWeight: 600,
                color: templateFormData.sourceCategory ? DS.primary[700] : DS.neutral[700]
              }
            }} helperText={templateFormData.sourceCategory ? `Configuration copiée depuis: ${editedCategories[templateFormData.sourceCategory]?.label || editedCategories[templateFormData.sourceCategory]?.categoryDisplayLabel || '—'}` : 'Aucune catégorie source sélectionnée'} />
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

      {/* CategoryFullEditDialog — édition depuis tableau simplifié (Modifier → popup) */}
      <CategoryFullEditDialog open={simplifiedEditOpen} onClose={() => {
      setSimplifiedEditOpen(false);
      setEditingCategoryKey(null);
    }} categoryKey={editingCategoryKey} category={editingCategoryKey ? editedCategories[editingCategoryKey] : null} messageTemplates={messageTemplates} onSave={handleSaveFromSimplifiedEdit} isSaving={savingFromSimplifiedEdit} onDelete={() => {
      if (editingCategoryKey && window.confirm('Supprimer cette catégorie ?')) {
        setEditedCategories(prev => {
          const next = {
            ...prev
          };
          delete next[editingCategoryKey];
          return next;
        });
        setSimplifiedEditOpen(false);
        setEditingCategoryKey(null);
        toast.success('Catégorie supprimée');
      }
    }} onSaveAsTemplate={handleSaveAsTemplateFromModal} ownerId={ownerId} />

      {/* CategoryFullEditDialog — used to configure the newly added category */}
      <CategoryFullEditDialog open={newCatEditOpen} onClose={() => {
      setNewCatEditOpen(false);
      setAddCatType('');
      setAddCatSubType('');
      setAddCatForm({});
    }} categoryKey={addCatForm.key} messageTemplates={messageTemplates} category={{
      // For CLIENT_REQUEST types, use lowercase category as the select key (maps to CATEGORY_OPTIONS)
      category: addCatForm.categoryType === 'CLIENT_REQUEST' ? addCatForm.category ? addCatForm.category.toLowerCase() : addCatForm.key : addCatForm.key,
      clientRequestCategory: addCatForm.category,
      name: addCatForm.label,
      categoryType: addCatForm.categoryType,
      enabled: true,
      orchestration: addCatForm.orchestration
    }} onSave={handleSaveNewCat} onSaveAsTemplate={handleSaveAsTemplateFromModal} ownerId={ownerId} />

    </Box>;
};
export default ConfigTaskTemplateView;
