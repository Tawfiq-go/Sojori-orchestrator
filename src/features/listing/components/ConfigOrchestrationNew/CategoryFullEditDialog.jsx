import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, TextField, Select, MenuItem, FormControl, InputLabel, Grid, Switch, FormControlLabel, Divider, Alert, Stack, Radio, RadioGroup, Checkbox, Accordion, AccordionSummary, AccordionDetails, CircularProgress, Chip } from '@mui/material';
import { Save as SaveIcon, ExpandMore as ExpandMoreIcon, Bookmark as BookmarkIcon } from '@mui/icons-material';
import { getOrchestratorMailTemplates } from '../../../setting/services/serverApi.orchestratorConfig';
const theme = {
  colors: {
    primary: {
      main: '#6366F1',
      bg: '#EEF2FF'
    },
    success: {
      main: '#10B981',
      bg: '#D1FAE5'
    },
    warning: {
      main: '#F59E0B',
      bg: '#FEF3C7'
    },
    error: {
      main: '#EF4444',
      bg: '#FEE2E2'
    },
    gray: {
      50: '#F9FAFB',
      200: '#E5E7EB',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      900: '#111827'
    }
  }
};

/**
 * Category = valeur de mapping (orchestrator, listing). Toutes les options proposées, toute combinaison Type + Category possible.
 * Type en haut décide quels champs afficher ; Category à côté pour le mapping.
 *
 * ✅ FIX 2026-02-11: Utiliser CategoryType complet et spécifique (DECLARATION_REGISTRATION, CHOICE_ARRIVAL, etc.)
 * au lieu des types génériques (DECLARATION, CHOICE, CLEANING)
 */
const CATEGORY_OPTIONS = [{
  value: 'message',
  label: 'Message',
  type: 'NOTIFICATION'
}, {
  value: 'registration',
  label: 'Registration',
  type: 'DECLARATION_REGISTRATION'
}, {
  value: 'arrival_declare',
  label: 'Declare arrival',
  type: 'DECLARATION_ARRIVAL'
}, {
  value: 'departure_declare',
  label: 'Declare departure',
  type: 'DECLARATION_DEPARTURE'
}, {
  value: 'arrival_choose',
  label: 'Choice arrival',
  type: 'CHOICE_ARRIVAL'
}, {
  value: 'departure_choose',
  label: 'Choice departure',
  type: 'CHOICE_DEPARTURE'
}, {
  value: 'cleaning_free',
  label: 'Cleaning included',
  type: 'CLEANING_FREE'
}, {
  value: 'cleaning_paid',
  label: 'Cleaning paid',
  type: 'CLEANING_PAID'
}, {
  value: 'cleaning_sojori',
  label: 'Cleaning Sojori',
  type: 'CLEANING_SOJORI'
}, {
  value: 'transport',
  label: 'Transport',
  type: 'CUSTOMER_REQUEST'
}, {
  value: 'groceries',
  label: 'Grocery',
  type: 'CUSTOMER_REQUEST'
}, {
  value: 'custom',
  label: 'Custom',
  type: 'CUSTOMER_REQUEST'
}, {
  value: 'support',
  label: 'Support',
  type: 'CUSTOMER_REQUEST'
}, {
  value: 'concierge',
  label: 'Concierge',
  type: 'CUSTOMER_REQUEST'
}];

/** Inférer le type catégorie à partir de la clé (affichage quand l’API ne renvoie pas categoryType) */
const CATEGORY_KEY_TO_TYPE = Object.fromEntries(CATEGORY_OPTIONS.map(o => [o.value, o.type]));

/** Catégorie → libellé du flag listing (création au plan initial si le listing a ce flag activé) */
const LISTING_FLAG_LABEL_BY_CATEGORY = {
  arrival_choose: 'Choisir heure arrivée (listing)',
  departure_choose: 'Choisir heure départ (listing)',
  arrival_declare: 'Déclarer arrivée (listing)',
  departure_declare: 'Déclarer départ (listing)',
  cleaning_free: 'Ménage inclus (listing)',
  cleaning_paid: 'Ménage payant (listing)',
  cleaning_sojori: 'Ménage Sojori (listing)',
  registration: null,
  message: null
};

// DECLARATION : affichage simplifié (configuration notification uniquement)
const CONDITION_ENVOI_DECLARATION = {
  registration: 'Enregistrement non complet',
  arrival_declare: 'Arrivée non déclarée',
  departure_declare: 'Départ non déclaré'
};
const MOMENT_LABELS = {
  BEFORE_ARRIVAL: 'Avant arrivée',
  BEFORE_DEPARTURE: 'Avant départ',
  AFTER_RESERVATION: 'Après réservation',
  IMMEDIATE_RESERVATION: 'Immédiat réservation',
  BEFORE_EXECUTION: 'Avant exécution',
  AFTER_EXECUTION: 'Après exécution'
};
/** Libellé condition rappel : pour DECLARATION on affiche les 4 options (Toujours, Non enregistré, Arrivée non déclarée, Départ non déclaré) */
function getConditionRappelLabel(value) {
  const labels = {
    ALWAYS: 'Toujours',
    IF_REGISTRATION_INCOMPLETE: 'Non enregistré',
    IF_ARRIVAL_NOT_DECLARED: 'Arrivée non déclarée',
    IF_DEPARTURE_NOT_DECLARED: 'Départ non déclaré',
    IF_NOT_DONE: 'Si non fait',
    NEVER: 'Ne pas envoyer rappel'
  };
  return labels[value] || value || '—';
}
function getMomentSuffix(trigger) {
  if (!trigger) return '';
  const t = String(trigger).toUpperCase();
  if (t === 'BEFORE_ARRIVAL') return 'avant arrivée';
  if (t === 'AFTER_ARRIVAL') return 'après arrivée';
  if (t === 'BEFORE_DEPARTURE') return 'avant départ';
  if (t === 'AFTER_DEPARTURE') return 'après départ';
  if (t === 'AFTER_RESERVATION') return 'après réservation';
  if (t === 'BEFORE_EXECUTION') return 'avant exécution';
  if (t === 'AFTER_EXECUTION') return 'après exécution';
  return '';
}
function formatTimingInterpretation(createTaskBefore) {
  if (!createTaskBefore) return '—';
  const value = createTaskBefore.value;
  const unit = (createTaskBefore.unit || '').toLowerCase().replace('s', '');
  const trigger = createTaskBefore.trigger;
  const suffix = getMomentSuffix(trigger);
  if (value == null || value === '' || !suffix) return '—';
  const valueStr = String(value).trim();
  const isRange = valueStr.includes('-');
  const v = isRange ? null : Number(value);
  if (unit === 'hour') {
    if (isRange) return `${valueStr} heures ${suffix}`;
    return `${v} heure${v > 1 ? 's' : ''} ${suffix}`;
  }
  if (unit === 'day') {
    const preferredHours = createTaskBefore.preferredHours;
    const hourPart = preferredHours != null && String(preferredHours).trim() !== '' ? String(preferredHours).split('-').map(h => `${h.trim()}h`).join(', ') : '—';
    if (isRange) return `${valueStr} jours ${suffix} à ${hourPart}`;
    return `${v} jour${v > 1 ? 's' : ''} ${suffix} à ${hourPart}`;
  }
  return '—';
}
const ConfigSection = ({
  title,
  icon,
  children,
  color = theme.colors.primary.main
}) => <Box sx={{
  mb: 4,
  p: 3,
  bgcolor: theme.colors.gray[50],
  borderRadius: 2,
  border: `2px solid ${theme.colors.gray[200]}`
}}>
    <Box sx={{
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    mb: 3,
    pb: 2,
    borderBottom: `2px solid ${color}`
  }}>
      <Box sx={{
      fontSize: 24
    }}>{icon}</Box>
      <Typography sx={{
      fontWeight: 700,
      fontSize: 16,
      color: theme.colors.gray[900]
    }}>
        {title}
      </Typography>
    </Box>
    {children}
  </Box>;
const AccordionSection = ({
  title,
  defaultExpanded = false,
  children
}) => <Accordion defaultExpanded={defaultExpanded} sx={{
  border: `1px solid ${theme.colors.gray[200]}`,
  borderRadius: '8px !important',
  '&:before': {
    display: 'none'
  },
  mb: 1.5,
  boxShadow: 'none'
}}>
    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{
    fontSize: 24,
    color: theme.colors.gray[500]
  }} />} sx={{
    minHeight: 52,
    bgcolor: theme.colors.gray[50],
    '&:hover': {
      bgcolor: theme.colors.gray[100]
    },
    borderRadius: '8px',
    px: 2.5
  }}>
      <Typography sx={{
      fontWeight: 600,
      fontSize: 14,
      color: theme.colors.gray[800]
    }}>
        {title}
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{
    p: 2.5,
    bgcolor: 'white'
  }}>{children}</AccordionDetails>
  </Accordion>;
const VALID_CATEGORY_VALUES = CATEGORY_OPTIONS.map(o => o.value);
const CONDITION_DECLARATION_VALUES = ['IF_REGISTRATION_INCOMPLETE', 'IF_ARRIVAL_NOT_DECLARED', 'IF_DEPARTURE_NOT_DECLARED'];
const CategoryFullEditDialog = ({
  open,
  onClose,
  categoryKey,
  category,
  categoryMeta,
  onSave,
  onDelete,
  onSaveAsTemplate,
  ownerId,
  messageTemplates: messageTemplatesProp,
  isSaving = false
}) => {
  const effectiveCategoryKey = categoryKey ?? category?._categoryKey;
  const [edited, setEdited] = useState(category || {});
  /** Valeur du select Catégorie : doit être dans CATEGORY_OPTIONS, jamais l’index "0" */
  const declCategorySelectValue = (() => {
    const v = edited?.category ?? edited?._categoryKey ?? effectiveCategoryKey ?? categoryKey;
    return VALID_CATEGORY_VALUES.includes(v) ? v : '';
  })();
  const [selectedCategoryKey, setSelectedCategoryKey] = useState(declCategorySelectValue || '');
  const [messageTemplates, setMessageTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  useEffect(() => {
    if (category) {
      const isMessage = category?.type === 'message' || category?.type === 'notification' || category?.categoryType === 'NOTIFICATION';
      const key = isMessage ? 'message' : category?.category ?? category?._categoryKey ?? effectiveCategoryKey ?? categoryKey;
      let catType = category?.categoryType ?? (key ? CATEGORY_KEY_TO_TYPE[key] : null);
      // Migrate generic CHOICE → exact type (CHOICE_ARRIVAL, CHOICE_DEPARTURE) when category known
      if (catType === 'CHOICE' && key && CATEGORY_KEY_TO_TYPE[key]) {
        catType = CATEGORY_KEY_TO_TYPE[key];
      }
      setEdited({
        ...category,
        category: key || category.category,
        name: category.name ?? (key === 'message' ? '' : key),
        categoryType: catType || category.categoryType
      });
    }
  }, [category, effectiveCategoryKey, categoryKey]);
  useEffect(() => {
    if (open && category) {
      const isMessage = category?.type === 'message' || category?.type === 'notification' || category?.categoryType === 'NOTIFICATION';
      const v = isMessage ? 'message' : category?.category ?? category?._categoryKey ?? effectiveCategoryKey ?? categoryKey;
      const valid = v === 'message' || CATEGORY_OPTIONS.some(o => o.value === v);
      setSelectedCategoryKey(valid ? v : typeof v === 'string' && v ? v : '');
    }
  }, [open, category, effectiveCategoryKey, categoryKey]);

  // ✅ FIX: Utiliser les templates passés en props (rapide) ou charger si non fournis (fallback)
  useEffect(() => {
    if (open) {
      if (messageTemplatesProp && messageTemplatesProp.length > 0) {
        // Props fournies → utiliser directement (instantané)
        setMessageTemplates(messageTemplatesProp);
        setLoadingTemplates(false);
      } else {
        // Pas de props → charger depuis l'API (fallback)
        loadMessageTemplates();
      }
    }
  }, [open, messageTemplatesProp, ownerId]);
  const loadMessageTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await getOrchestratorMailTemplates(ownerId ? {
        ownerId,
        limit: 100
      } : {
        limit: 100
      });
      const raw = response?.data?.data || response?.data || [];
      const templates = [...raw].sort((a, b) => {
        const orderA = a.displayOrder ?? 999;
        const orderB = b.displayOrder ?? 999;
        if (orderA !== orderB) return orderA - orderB;
        return (a.messageName || '').localeCompare(b.messageName || '');
      });
      setMessageTemplates(templates);
    } catch (error) {
      setMessageTemplates([]);
    } finally {
      setLoadingTemplates(false);
    }
  };

  /** Même libellé que l'onglet Messages (colonnes Template + description) */
  const getTemplateDisplayLabel = template => template.displayLabel || template.description || template.messageName || template.name || 'Sans nom';

  /** Helper function to check category type (supports both old uppercase and new lowercase formats) */
  const isTypeOf = (typeOrCategoryType, expectedType) => {
    if (!typeOrCategoryType) return false;
    const normalized = typeOrCategoryType.toLowerCase();
    const expected = expectedType.toLowerCase();
    return normalized === expected || normalized.startsWith(expected);
  };
  const mode = edited?.mode || 'NOTIFICATION_ONLY';
  const isOrchestration = mode === 'ORCHESTRATION';
  const orchestration = edited?.orchestration || {};

  /** Libellé du template actuellement sélectionné (affiché en tête de popup sans clic) */
  const selectedMessageLabel = !orchestration.messageTemplateId ? null : messageTemplates.length > 0 ? getTemplateDisplayLabel(messageTemplates.find(t => t._id === orchestration.messageTemplateId) || {}) : 'Chargement…';

  // Handlers
  const handleChange = (field, value) => {
    setEdited(prev => {
      const next = {
        ...prev,
        [field]: value
      };

      // ✅ Réinitialiser sendNotificationCondition quand on change categoryType
      if (field === 'categoryType') {
        const oldType = prev.categoryType;
        const newType = value;

        // Si on passe de DECLARATION → NOTIFICATION ou inversement
        if (oldType !== newType) {
          const oldCondition = prev.sendNotificationCondition;

          // Si l'ancienne condition n'est pas valide pour le nouveau type, réinitialiser
          if (newType === 'NOTIFICATION' && oldCondition && !['ALWAYS', 'IF_NOT_DONE'].includes(oldCondition)) {
            next.sendNotificationCondition = 'ALWAYS';
          } else if (newType === 'DECLARATION' && oldCondition === 'IF_NOT_DONE') {
            next.sendNotificationCondition = 'ALWAYS';
          }
        }
      }
      return next;
    });
  };
  const handleOrchChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        [field]: value
      }
    }));
  };
  const handleDayJChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        dayJLogic: {
          ...prev.orchestration?.dayJLogic,
          [field]: value
        }
      }
    }));
  };
  const handleStaffRefusalChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        staffRefusalPolicy: {
          ...prev.orchestration?.staffRefusalPolicy,
          [field]: value
        }
      }
    }));
  };
  const handleEscalationChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        escalation: {
          ...prev.orchestration?.escalation,
          [field]: value
        }
      }
    }));
  };
  const handleDeadlineChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        deadline: {
          ...prev.orchestration?.deadline,
          [field]: value
        }
      }
    }));
  };
  const handleClientReminderChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        clientReminder: {
          ...prev.orchestration?.clientReminder,
          [field]: value
        }
      }
    }));
  };
  const handleTaskReminderChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        taskReminder: {
          ...prev.orchestration?.taskReminder,
          [field]: value
        }
      }
    }));
  };
  const handleAssignmentTimingChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      orchestration: {
        ...prev.orchestration,
        assignmentTiming: {
          ...prev.orchestration?.assignmentTiming,
          [field]: value
        }
      }
    }));
  };
  const handleNotificationChange = (field, value) => {
    setEdited(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [field]: value
      }
    }));
  };
  const buildToSave = () => {
    const {
      _categoryKey,
      ...toSave
    } = edited;
    if (isTypeOf(toSave.type, 'message') || toSave.type === 'notification') {
      toSave.category = 'message';
    }
    if (isTypeOf(toSave.type, 'choice') || isTypeOf(toSave.categoryType, 'choice') || isTypeOf(toSave.type, 'cleaning') || isTypeOf(toSave.categoryType, 'cleaning')) {
      const currentTrigger = toSave.orchestration?.createTaskBefore?.trigger;
      toSave.orchestration = {
        ...toSave.orchestration,
        createTaskBefore: {
          ...toSave.orchestration?.createTaskBefore,
          trigger: currentTrigger || 'BEFORE_EXECUTION'
        }
      };
    }
    return toSave;
  };
  const handleSave = () => {
    onSave(buildToSave());
  };
  const handleSaveAsTemplate = () => {
    if (!onSaveAsTemplate || !effectiveCategoryKey) return;
    const toSave = buildToSave();
    onSaveAsTemplate(effectiveCategoryKey, toSave);
  };
  if (!category) return null;
  return <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth PaperProps={{
    sx: {
      borderRadius: 3,
      maxHeight: '90vh'
    }
  }}>
      <DialogTitle sx={{
      background: categoryMeta?.gradient || theme.colors.primary.main,
      color: 'white',
      py: 2.5,
      px: 3
    }}>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2
      }}>
          <Box sx={{
          fontSize: 40,
          width: 60,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.2)',
          borderRadius: 2
        }}>
            {categoryMeta?.icon}
          </Box>
          <Box sx={{
          flex: 1
        }}>
            <Typography variant="h5" sx={{
            fontWeight: 700,
            mb: 0.25
          }}>
              {(() => {
              const n = (edited?.name ?? '').toString().trim();
              if (n && /^\d+$/.test(n)) return edited?.categoryDisplayLabel || selectedMessageLabel || CATEGORY_OPTIONS.find(o => o.value === (edited?.category ?? ''))?.label || 'Configuration';
              return n || edited?.categoryDisplayLabel || selectedMessageLabel || CATEGORY_OPTIONS.find(o => o.value === (edited?.category ?? ''))?.label || 'Configuration';
            })()}
            </Typography>
            <Typography sx={{
            fontSize: 13,
            opacity: 0.9
          }}>
              Configuration orchestration
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{
      px: 3,
      pt: 3,
      pb: 2,
      ...(mode === 'NOTIFICATION_ONLY' || isTypeOf(edited.type, 'declaration') || isTypeOf(edited.categoryType, 'declaration') || isTypeOf(edited.type, 'message') || isTypeOf(edited.categoryType, 'message') || isTypeOf(edited.categoryType, 'notification') || isTypeOf(edited.type, 'choice') || isTypeOf(edited.categoryType, 'choice') || isTypeOf(edited.type, 'cleaning') || isTypeOf(edited.categoryType, 'cleaning') ? {
        maxHeight: '75vh',
        overflowY: 'auto'
      } : {})
    }}>
        {/* En haut : Nom → Type → Catégorie (ordre unique) */}
        <Box sx={{
        mb: 3,
        p: 2,
        bgcolor: theme.colors.primary.bg,
        borderRadius: 2,
        border: `2px solid ${theme.colors.primary.main}`
      }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField fullWidth size="medium" label="Nom" value={edited.name ?? ''} onChange={e => handleChange('name', e.target.value)} placeholder="ex. Message bienvenue, Choisir arrivée" sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                fontSize: 14
              },
              '& .MuiInputLabel-root': {
                fontSize: 14
              }
            }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="medium" sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                fontSize: 14
              },
              '& .MuiInputLabel-root': {
                fontSize: 14
              }
            }}>
                <InputLabel>Type</InputLabel>
                <Select value={(edited.type === 'notification' ? 'message' : edited.type) || (edited.categoryType ? edited.categoryType.startsWith('DECLARATION') || edited.categoryType.startsWith('declaration') ? 'declaration' : edited.categoryType.startsWith('CHOICE') || edited.categoryType.startsWith('choice') ? 'choice' : edited.categoryType.startsWith('CLEANING') || edited.categoryType.startsWith('cleaning') ? 'cleaning' : edited.categoryType === 'customer_request' || edited.categoryType === 'CUSTOMER_REQUEST' || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'client_request' || edited.categoryType.startsWith('CLIENT_REQUEST') || edited.categoryType.startsWith('client_request') ? 'customer_request' : 'message' : '') || ''} onChange={e => {
                const fam = e.target.value;
                if (fam === 'message') {
                  setEdited(prev => ({
                    ...prev,
                    type: 'message',
                    categoryType: 'NOTIFICATION',
                    category: 'message',
                    name: prev.name || ''
                  }));
                  setSelectedCategoryKey('message');
                  return;
                }
                const defaultKey = fam === 'declaration' ? 'registration' : fam === 'choice' ? 'arrival_choose' : fam === 'cleaning' ? 'cleaning_free' : fam === 'customer_request' ? 'support' : 'message';
                const catType = CATEGORY_KEY_TO_TYPE[defaultKey] || '';
                const prevCat = edited.category || selectedCategoryKey;
                const prevType = prevCat ? CATEGORY_KEY_TO_TYPE[prevCat] : null;
                const keep = prevType && (prevType === 'DECLARATION' && fam === 'declaration' || prevType === 'CHOICE' && (fam === 'choice' || fam === 'cleaning') || (prevType === 'CLEANING_FREE' || prevType === 'CLEANING') && fam === 'cleaning' || prevType === 'CUSTOMER_REQUEST' && fam === 'customer_request');
                const key = keep ? prevCat : defaultKey;
                const finalType = keep ? prevType : catType;
                // ✅ Ménage inclus (cleaning_free) : type doit être 'choice', categoryType CLEANING_FREE (pas type 'cleaning')
                const resolvedType = fam === 'cleaning' ? 'choice' : fam;
                setEdited(prev => ({
                  ...prev,
                  type: resolvedType,
                  categoryType: finalType,
                  category: key,
                  name: prev.name || key
                }));
                setSelectedCategoryKey(key);
              }} label="Type" sx={{
                fontWeight: 600
              }}>
                  <MenuItem value="declaration">Declaration</MenuItem>
                  <MenuItem value="choice">Choice</MenuItem>
                  <MenuItem value="message">Notification</MenuItem>
                  <MenuItem value="cleaning">Ménage Inclus (Cleaning Free)</MenuItem>
                  <MenuItem value="customer_request">Customer Request</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="medium" sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                fontSize: 14,
                fontFamily: 'monospace'
              },
              '& .MuiInputLabel-root': {
                fontSize: 14
              }
            }}>
                <InputLabel>categoryType (BD exact)</InputLabel>
                <Select label="categoryType (BD exact)" value={edited.categoryType || ''} onChange={e => handleChange('categoryType', e.target.value)}>
                  <MenuItem value="">— (non défini)</MenuItem>
                  <MenuItem value="NOTIFICATION"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>NOTIFICATION</em>&nbsp;— Notification</MenuItem>
                  <MenuItem value="CHOICE_ARRIVAL"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CHOICE_ARRIVAL</em>&nbsp;— Choisir arrivée</MenuItem>
                  <MenuItem value="CHOICE_DEPARTURE"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CHOICE_DEPARTURE</em>&nbsp;— Choisir départ</MenuItem>
                  <MenuItem value="DECLARATION_REGISTRATION"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>DECLARATION_REGISTRATION</em>&nbsp;— Registration</MenuItem>
                  <MenuItem value="DECLARATION_ARRIVAL"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>DECLARATION_ARRIVAL</em>&nbsp;— Déclarer arrivée</MenuItem>
                  <MenuItem value="DECLARATION_DEPARTURE"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>DECLARATION_DEPARTURE</em>&nbsp;— Déclarer départ</MenuItem>
                  <MenuItem value="CLEANING_FREE"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLEANING_FREE</em>&nbsp;— Ménage inclus (cleaning free)</MenuItem>
                  <MenuItem value="CLEANING_SOJORI"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLEANING_SOJORI</em>&nbsp;— Ménage Sojori (automatique)</MenuItem>
                  <MenuItem value="CLEANING_PAID"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLEANING_PAID</em>&nbsp;— Cleaning Paid</MenuItem>
                  <MenuItem value="CLIENT_REQUEST_SUPPORT"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLIENT_REQUEST_SUPPORT</em>&nbsp;— Support (immédiat)</MenuItem>
                  <MenuItem value="CLIENT_REQUEST_TRANSPORT"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLIENT_REQUEST_TRANSPORT</em>&nbsp;— Transport</MenuItem>
                  <MenuItem value="CLIENT_REQUEST_GROCERY"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLIENT_REQUEST_GROCERY</em>&nbsp;— Grocery / Courses</MenuItem>
                  <MenuItem value="CLIENT_REQUEST_CUSTOM"><em style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#888'
                  }}>CLIENT_REQUEST_CUSTOM</em>&nbsp;— Custom / Autre</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {/* ❌ REMOVED 2026-02-11: planningMode field - Backend deletes this field (not used) */}
          </Grid>
        </Box>

        {isTypeOf(edited.type, 'declaration') || isTypeOf(edited.categoryType, 'declaration') ? <Stack spacing={2}>
          <Box sx={{
          p: 2,
          bgcolor: theme.colors.gray[50],
          borderRadius: 2,
          border: `1px solid ${theme.colors.gray[200]}`
        }}>
            <Typography sx={{
            fontWeight: 700,
            fontSize: 12,
            mb: 1.5,
            color: theme.colors.gray[800]
          }}>Declaration — Canal, template, moment</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                {loadingTemplates ? <Box sx={{
                display: 'flex',
                alignItems: 'center',
                height: 40
              }}><CircularProgress size={24} /></Box> : <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel shrink>Template message</InputLabel>
                    <Select value={orchestration.messageTemplateId || ''} onChange={e => handleOrchChange('messageTemplateId', e.target.value)} label="Template message" displayEmpty notched>
                      <MenuItem value=""><em style={{
                      color: '#999',
                      fontSize: 12
                    }}>Aucun</em></MenuItem>
                      {messageTemplates.map(t => <MenuItem key={t._id} value={t._id} sx={{
                    fontSize: 12
                  }}>{getTemplateDisplayLabel(t)}</MenuItem>)}
                      {orchestration.messageTemplateId && !messageTemplates.some(t => t._id === orchestration.messageTemplateId) && <MenuItem value={orchestration.messageTemplateId} sx={{
                    fontSize: 12
                  }}>Template sélectionné</MenuItem>}
                    </Select>
                  </FormControl>}
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Canal</InputLabel>
                  <Select value={orchestration.channelPriority || 'WHATSAPP_PRIORITY'} onChange={e => handleOrchChange('channelPriority', e.target.value)} label="Canal">
                    <MenuItem value="WHATSAPP_PRIORITY" sx={{
                    fontSize: 12
                  }}>WhatsApp priorité</MenuItem>
                    <MenuItem value="WHATSAPP_ONLY" sx={{
                    fontSize: 12
                  }}>WhatsApp seul</MenuItem>
                    <MenuItem value="OTA_PRIORITY" sx={{
                    fontSize: 12
                  }}>Email-OTA priorité</MenuItem>
                    <MenuItem value="OTA_ONLY" sx={{
                    fontSize: 12
                  }}>Email-OTA seul</MenuItem>
                    <MenuItem value="NO_PRIORITY" sx={{
                    fontSize: 12
                  }}>— Aucune</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Condition rappel</InputLabel>
                  <Select value={['ALWAYS', ...CONDITION_DECLARATION_VALUES].includes(edited.sendNotificationCondition) ? edited.sendNotificationCondition : 'ALWAYS'} onChange={e => handleChange('sendNotificationCondition', e.target.value)} label="Condition rappel">
                    <MenuItem value="ALWAYS" sx={{
                    fontSize: 12
                  }}>Toujours</MenuItem>
                    <MenuItem value="IF_REGISTRATION_INCOMPLETE" sx={{
                    fontSize: 12
                  }}>Non enregistré</MenuItem>
                    <MenuItem value="IF_ARRIVAL_NOT_DECLARED" sx={{
                    fontSize: 12
                  }}>Arrivée non déclarée</MenuItem>
                    <MenuItem value="IF_DEPARTURE_NOT_DECLARED" sx={{
                    fontSize: 12
                  }}>Départ non déclaré</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Moment</InputLabel>
                  <Select value={orchestration.createTaskBefore?.trigger || 'BEFORE_ARRIVAL'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  trigger: e.target.value
                })} label="Moment">
                    <MenuItem value="AFTER_RESERVATION" sx={{
                    fontSize: 12
                  }}>Après résa</MenuItem>
                    <MenuItem value="IMMEDIATE_CLIENT_REQUEST" sx={{
                    fontSize: 12
                  }}>Demande client</MenuItem>
                    <MenuItem value="BEFORE_ARRIVAL" sx={{
                    fontSize: 12
                  }}>Avant arrivée</MenuItem>
                    <MenuItem value="AFTER_ARRIVAL" sx={{
                    fontSize: 12
                  }}>Après arrivée</MenuItem>
                    <MenuItem value="BEFORE_DEPARTURE" sx={{
                    fontSize: 12
                  }}>Avant départ</MenuItem>
                    <MenuItem value="AFTER_EXECUTION" sx={{
                    fontSize: 12
                  }}>Après exécution</MenuItem>
                    <MenuItem value="BEFORE_EXECUTION" sx={{
                    fontSize: 12
                  }}>Avant exécution</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControlLabel control={<Switch size="small" checked={orchestration.clientReminder?.enabled || false} onChange={e => handleClientReminderChange('enabled', e.target.checked)} />} label={<Typography sx={{
                fontSize: 12
              }}>Rappels activés</Typography>} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" type="number" label="Début rappel (j avant)" value={orchestration.clientReminder?.daysBeforeDeadline ?? orchestration.clientReminder?.startDaysBefore ?? 2} onChange={e => handleClientReminderChange('daysBeforeDeadline', parseInt(e.target.value) || 0)} inputProps={{
                min: 0
              }} sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField fullWidth size="small" type="number" label="Deadline fin rappel (j avant)" value={orchestration.clientReminder?.deadline ?? orchestration.clientReminder?.deadlineDaysBefore ?? 1} onChange={e => handleClientReminderChange('deadline', parseInt(e.target.value) || 0)} inputProps={{
                min: 0
              }} sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
              <Grid item xs={12} sm={2}>
                {/* ✅ DECLARATION types: Use clientReminder.preferredHours (createTaskBefore.preferredHours is obsolete) */}
                <TextField fullWidth size="small" label="Heure (ex. 11-15)" value={orchestration.clientReminder?.preferredHours || ''} onChange={e => handleClientReminderChange('preferredHours', e.target.value)} placeholder="11-15" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
            </Grid>
          </Box>
        </Stack> : isTypeOf(edited.type, 'message') || isTypeOf(edited.categoryType, 'message') || isTypeOf(edited.categoryType, 'notification') ? <Stack spacing={2}>
          <Box sx={{
          p: 2,
          bgcolor: theme.colors.gray[50],
          borderRadius: 2,
          border: `1px solid ${theme.colors.gray[200]}`
        }}>
            <Typography sx={{
            fontWeight: 700,
            fontSize: 12,
            mb: 1.5,
            color: theme.colors.gray[800]
          }}>Notification — Canal, template, moment</Typography>
            <Grid container spacing={1.5}>
              <Grid item xs={12} sm={4}>
                {loadingTemplates ? <Box sx={{
                display: 'flex',
                alignItems: 'center',
                height: 40
              }}><CircularProgress size={24} /></Box> : <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel shrink>Template message</InputLabel>
                    <Select value={orchestration.messageTemplateId || ''} onChange={e => handleOrchChange('messageTemplateId', e.target.value)} label="Template message" displayEmpty notched>
                      <MenuItem value=""><em style={{
                      color: '#999',
                      fontSize: 12
                    }}>Aucun</em></MenuItem>
                      {messageTemplates.map(t => <MenuItem key={t._id} value={t._id} sx={{
                    fontSize: 12
                  }}>{getTemplateDisplayLabel(t)}</MenuItem>)}
                      {orchestration.messageTemplateId && !messageTemplates.some(t => t._id === orchestration.messageTemplateId) && <MenuItem value={orchestration.messageTemplateId} sx={{
                    fontSize: 12
                  }}>Template sélectionné</MenuItem>}
                    </Select>
                  </FormControl>}
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Canal</InputLabel>
                  <Select value={orchestration.channelPriority || 'WHATSAPP_PRIORITY'} onChange={e => handleOrchChange('channelPriority', e.target.value)} label="Canal">
                    <MenuItem value="WHATSAPP_PRIORITY" sx={{
                    fontSize: 12
                  }}>WhatsApp priorité</MenuItem>
                    <MenuItem value="WHATSAPP_ONLY" sx={{
                    fontSize: 12
                  }}>WhatsApp seul</MenuItem>
                    <MenuItem value="OTA_PRIORITY" sx={{
                    fontSize: 12
                  }}>Email-OTA priorité</MenuItem>
                    <MenuItem value="OTA_ONLY" sx={{
                    fontSize: 12
                  }}>Email-OTA seul</MenuItem>
                    <MenuItem value="NO_PRIORITY" sx={{
                    fontSize: 12
                  }}>— Aucune</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Moment</InputLabel>
                  <Select value={orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  trigger: e.target.value
                })} label="Moment">
                    <MenuItem value="AFTER_RESERVATION" sx={{
                    fontSize: 12
                  }}>Après réservation</MenuItem>
                    <MenuItem value="BEFORE_ARRIVAL" sx={{
                    fontSize: 12
                  }}>Avant arrivée</MenuItem>
                    <MenuItem value="AFTER_ARRIVAL" sx={{
                    fontSize: 12
                  }}>Après arrivée</MenuItem>
                    <MenuItem value="BEFORE_DEPARTURE" sx={{
                    fontSize: 12
                  }}>Avant départ</MenuItem>
                    <MenuItem value="AFTER_DEPARTURE" sx={{
                    fontSize: 12
                  }}>Après départ</MenuItem>
                    <MenuItem value="BEFORE_EXECUTION" sx={{
                    fontSize: 12
                  }}>Avant exécution</MenuItem>
                    <MenuItem value="AFTER_EXECUTION" sx={{
                    fontSize: 12
                  }}>Après exécution</MenuItem>
                    <MenuItem value="IMMEDIATE_CLIENT_REQUEST" sx={{
                    fontSize: 12
                  }}>Demande client</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth size="small" label="Valeur" value={orchestration.createTaskBefore?.value ?? ''} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                value: e.target.value
              })} placeholder="1" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
              <Grid item xs={4} sm={2}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Unité</InputLabel>
                  <Select value={orchestration.createTaskBefore?.unit || 'DAYS'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  unit: e.target.value
                })} label="Unité">
                    <MenuItem value="HOURS" sx={{
                    fontSize: 12
                  }}>Heures</MenuItem>
                    <MenuItem value="DAYS" sx={{
                    fontSize: 12
                  }}>Jours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4} sm={2}>
                <TextField fullWidth size="small" label="Heure (ex. 15)" value={orchestration.createTaskBefore?.preferredHours || ''} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                preferredHours: e.target.value
              })} placeholder="15" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} helperText={orchestration.createTaskBefore?.unit === 'DAYS' ? 'À afficher pour "X jours … à X h"' : 'Optionnel (heures)'} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" sx={{
                fontSize: 12,
                color: theme.colors.gray[600],
                mt: 0.5
              }}>
                  Quand : {formatTimingInterpretation(orchestration.createTaskBefore)}
                </Typography>
                <Typography variant="caption" sx={{
                display: 'block',
                fontSize: 11,
                color: theme.colors.gray[500],
                mt: 0.25
              }}>
                  {orchestration.createTaskBefore?.unit === 'HOURS' ? 'X heure(s) avant/après …' : 'X jours avant/après à X heure (ex. 15)'}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Stack> : isTypeOf(edited.type, 'choice') || isTypeOf(edited.categoryType, 'choice') || isTypeOf(edited.type, 'cleaning') || isTypeOf(edited.categoryType, 'cleaning') || edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'CUSTOMER_REQUEST' || isTypeOf(edited.categoryType, 'client_request') || isTypeOf(edited.categoryType, 'customer_request') ? <Stack spacing={2}>
          <Box sx={{
          p: 2,
          bgcolor: theme.colors.gray[50],
          borderRadius: 2,
          border: `1px solid ${theme.colors.gray[200]}`
        }}>
            <Typography sx={{
            fontWeight: 700,
            fontSize: 12,
            mb: 1.5,
            color: theme.colors.gray[800]
          }}>
              {edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'CUSTOMER_REQUEST' || isTypeOf(edited.categoryType, 'client_request') || isTypeOf(edited.categoryType, 'customer_request') ? 'Demande client' : isTypeOf(edited.type, 'cleaning') || isTypeOf(edited.categoryType, 'cleaning') ? 'Cleaning' : 'Choice'} —
              {!(edited.categoryType === 'CLEANING_PAID' || edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_paid' || edited.type === 'cleaning_sojori' || edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'CUSTOMER_REQUEST' || isTypeOf(edited.categoryType, 'client_request') || isTypeOf(edited.categoryType, 'customer_request')) ? ' canal, template, timeslot,' : ''} task, deadline, staff
            </Typography>
            <Grid container spacing={1.5}>
              {/* Canal & Template — hidden for cleaning_paid, cleaning_sojori and CLIENT_REQUEST/CUSTOMER_REQUEST (no WhatsApp notification for task types) */}
              {!(edited.categoryType === 'CLEANING_PAID' || edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_paid' || edited.type === 'cleaning_sojori' || edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'CUSTOMER_REQUEST' || isTypeOf(edited.categoryType, 'client_request') || isTypeOf(edited.categoryType, 'customer_request')) && <>
                  <Grid item xs={12} sm={4}>
                    {loadingTemplates ? <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  height: 40
                }}><CircularProgress size={24} /></Box> : <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }}>
                        <InputLabel shrink>Template message</InputLabel>
                        <Select value={orchestration.messageTemplateId || ''} onChange={e => handleOrchChange('messageTemplateId', e.target.value)} label="Template message" displayEmpty notched>
                          <MenuItem value=""><em style={{
                        color: '#999',
                        fontSize: 12
                      }}>Aucun</em></MenuItem>
                          {messageTemplates.map(t => <MenuItem key={t._id} value={t._id} sx={{
                      fontSize: 12
                    }}>{getTemplateDisplayLabel(t)}</MenuItem>)}
                          {orchestration.messageTemplateId && !messageTemplates.some(t => t._id === orchestration.messageTemplateId) && <MenuItem value={orchestration.messageTemplateId} sx={{
                      fontSize: 12
                    }}>Template sélectionné</MenuItem>}
                        </Select>
                      </FormControl>}
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }}>
                      <InputLabel>Canal</InputLabel>
                      <Select value={orchestration.channelPriority || 'WHATSAPP_PRIORITY'} onChange={e => handleOrchChange('channelPriority', e.target.value)} label="Canal">
                        <MenuItem value="WHATSAPP_PRIORITY" sx={{
                      fontSize: 12
                    }}>WhatsApp priorité</MenuItem>
                        <MenuItem value="WHATSAPP_ONLY" sx={{
                      fontSize: 12
                    }}>WhatsApp seul</MenuItem>
                        <MenuItem value="OTA_PRIORITY" sx={{
                      fontSize: 12
                    }}>Email-OTA priorité</MenuItem>
                        <MenuItem value="OTA_ONLY" sx={{
                      fontSize: 12
                    }}>Email-OTA seul</MenuItem>
                        <MenuItem value="NO_PRIORITY" sx={{
                      fontSize: 12
                    }}>— Aucune</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>}
              {/* Timeslot reminders — hidden for cleaning_paid, cleaning_sojori and CLIENT_REQUEST (no WhatsApp reminder for timeslot selection) */}
              {!(edited.categoryType === 'CLEANING_PAID' || edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_paid' || edited.type === 'cleaning_sojori' || edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || isTypeOf(edited.categoryType, 'client_request')) && <>
                  <Grid item xs={12}>
                    <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 1,
                  mb: 0.5
                }}>Timeslot — Relances client avant date du créneau</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControlLabel control={<Switch size="small" checked={orchestration.clientReminder?.enabled || false} onChange={e => handleClientReminderChange('enabled', e.target.checked)} />} label={<Typography sx={{
                  fontSize: 12
                }}>Rappels activés</Typography>} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Début rappels (j avant)" value={orchestration.clientReminder?.daysBeforeDeadline ?? orchestration.clientReminder?.startDaysBefore ?? 2} onChange={e => handleClientReminderChange('daysBeforeDeadline', parseInt(e.target.value) || 0)} inputProps={{
                  min: 0
                }} sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Deadline réponse (j avant)" value={orchestration.clientReminder?.deadline ?? orchestration.clientReminder?.deadlineDaysBefore ?? 1} onChange={e => handleClientReminderChange('deadline', parseInt(e.target.value) || 0)} inputProps={{
                  min: 0
                }} sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" label="Heures envoi (ex. 11-15)" value={orchestration.clientReminder?.preferredHours || ''} onChange={e => handleClientReminderChange('preferredHours', e.target.value)} placeholder="11-15" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }} />
                  </Grid>
                </>}
              {/* Timeslot calculé — uniquement pour CLEANING_SOJORI */}
              {(edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_sojori') && <>
                  <Grid item xs={12}>
                    <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 2,
                  mb: 0.5
                }}>Timeslot calculé</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Date tâche par défaut (J+x)" value={orchestration.defaultTaskDateAfterCheckout ?? 1} onChange={e => handleOrchChange('defaultTaskDateAfterCheckout', parseInt(e.target.value) || 1)} inputProps={{
                  min: 0,
                  max: 3
                }} placeholder="1" helperText="Jours après checkout" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }} />
                  </Grid>
                  <Grid item xs={12} sm={9}>
                    <Typography sx={{
                  fontSize: 11,
                  color: theme.colors.gray[600],
                  fontStyle: 'italic'
                }}>
                      La date sera recalculée selon les règles du listing. Cette valeur est utilisée par défaut si pas de prochaine réservation.
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 2,
                  mb: 0.5
                }}>Staff — Assignation avant date du créneau</Typography>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Assigner staff (valeur)" value={orchestration.assignStaffBefore?.value ?? ''} onChange={e => handleOrchChange('assignStaffBefore', {
                  ...orchestration.assignStaffBefore,
                  value: e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                })} placeholder="N/A si pas en BD" inputProps={{
                  'data-slug': 'assign-staff-value'
                }} sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }}>
                      <InputLabel>Unité</InputLabel>
                      <Select inputProps={{
                    'data-slug': 'assign-staff-unit'
                  }} value={orchestration.assignStaffBefore?.unit ?? ''} onChange={e => handleOrchChange('assignStaffBefore', {
                    ...orchestration.assignStaffBefore,
                    unit: e.target.value || undefined
                  })} label="Unité">
                        <MenuItem value="" sx={{
                      fontSize: 12
                    }}>— N/A</MenuItem>
                        <MenuItem value="HOURS" sx={{
                      fontSize: 12
                    }}>Heures</MenuItem>
                        <MenuItem value="DAYS" sx={{
                      fontSize: 12
                    }}>Jours</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </>}
              {/* ═══════════════════════════════════════════════════════
                  Staff — Assignation (restructurée)
                  1. Type d'assignataire EN PREMIER
                  2. Assigner immédiatement (toggle)
                  3. Assigner X jours/heures avant (toggle + champs)
                  ═══════════════════════════════════════════════════════ */}
              {!(edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_sojori') && <>
                {/* — 1. Type d'assignataire — */}
                <Grid item xs={12}>
                  <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 1,
                  mb: 0.5
                }}>
                    👤 Type d&apos;assignataire
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{
                  '& .MuiOutlinedInput-root': {
                    bgcolor: 'white',
                    fontSize: 12
                  },
                  '& .MuiInputLabel-root': {
                    fontSize: 12
                  }
                }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={orchestration.assignmentType || 'STAFF'} onChange={e => handleOrchChange('assignmentType', e.target.value)} label="Type">
                      <MenuItem value="STAFF" sx={{
                      fontSize: 12
                    }}>👷 Staff (vérification planning)</MenuItem>
                      <MenuItem value="MANAGER" sx={{
                      fontSize: 12
                    }}>🧑‍💼 Manager (assignation directe, pas de planning)</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {(orchestration.assignmentType || 'STAFF') === 'MANAGER' && <Grid item xs={12}>
                    <Typography sx={{
                  fontSize: 11,
                  color: '#d97706',
                  bgcolor: '#fffbeb',
                  border: '1px solid #fde68a',
                  borderRadius: 1,
                  p: 1
                }}>
                      🧑‍💼 Mode Manager : le premier manager actif du listing sera assigné directement, sans vérification de planning. La tâche sera auto-acceptée.
                    </Typography>
                  </Grid>}

                {/* — 2. Timing d'assignation — */}
                <Grid item xs={12}>
                  <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 2,
                  mb: 0.5
                }}>
                    Timing d&apos;assignation
                  </Typography>
                </Grid>

                {/* Toggle A : Assigner immédiatement */}
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch size="small" checked={orchestration.assignmentTiming?.immediateEnabled ?? false} onChange={e => handleAssignmentTimingChange('immediateEnabled', e.target.checked)} />} label={<Box>
                        <Typography sx={{
                    fontSize: 12,
                    fontWeight: 500
                  }}>⚡ Assigner immédiatement</Typography>
                        <Typography sx={{
                    fontSize: 11,
                    color: theme.colors.gray[500]
                  }}>Dès la création de la tâche (ex. Manager, Support, demande urgente)</Typography>
                      </Box>} />
                </Grid>

                {/* Toggle B : Assigner X jours/heures avant */}
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch size="small" checked={orchestration.assignmentTiming?.scheduledEnabled ?? true} onChange={e => handleAssignmentTimingChange('scheduledEnabled', e.target.checked)} />} label={<Box>
                        <Typography sx={{
                    fontSize: 12,
                    fontWeight: 500
                  }}>🗓️ Assigner X jours/heures avant la date de la tâche</Typography>
                        <Typography sx={{
                    fontSize: 11,
                    color: theme.colors.gray[500]
                  }}>Planifié à une date précise (ex. Ménage J-2, Transport J-1)</Typography>
                      </Box>} />
                </Grid>

                {/* Champs conditionnels si scheduledEnabled */}
                {(orchestration.assignmentTiming?.scheduledEnabled ?? true) && <>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Valeur" value={orchestration.assignmentTiming?.scheduledValue ?? orchestration.createTaskBefore?.value ?? 2} onChange={e => handleAssignmentTimingChange('scheduledValue', parseInt(e.target.value) || 1)} inputProps={{
                    min: 0
                  }} placeholder="2" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }} />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <FormControl fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }}>
                      <InputLabel>Unité</InputLabel>
                      <Select value={orchestration.assignmentTiming?.scheduledUnit ?? orchestration.createTaskBefore?.unit ?? 'DAYS'} onChange={e => handleAssignmentTimingChange('scheduledUnit', e.target.value)} label="Unité">
                        <MenuItem value="HOURS" sx={{
                        fontSize: 12
                      }}>Heures</MenuItem>
                        <MenuItem value="DAYS" sx={{
                        fontSize: 12
                      }}>Jours</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField fullWidth size="small" type="number" label="Heure (0–23)" value={orchestration.assignmentTiming?.scheduledHour ?? orchestration.assignStaffBefore?.preferredHour ?? ''} onChange={e => {
                    const v = e.target.value;
                    handleAssignmentTimingChange('scheduledHour', v === '' ? undefined : Math.min(23, Math.max(0, parseInt(v, 10) || 0)));
                  }} inputProps={{
                    min: 0,
                    max: 23
                  }} placeholder="9" helperText="Heure locale préférée" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }} />
                  </Grid>
                  {/* Prérequis — non applicable pour CLIENT_REQUEST / CLEANING_PAID */}
                  {!(edited.categoryType === 'CLEANING_PAID' || edited.type === 'cleaning_paid' || edited.type === 'customer_request' || edited.categoryType === 'CLIENT_REQUEST' || isTypeOf(edited.categoryType, 'client_request')) && <Grid item xs={12} sm={3}>
                      <FormControl fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }}>
                        <InputLabel>Prérequis</InputLabel>
                        <Select value={orchestration.createTaskBefore?.prerequisite || 'NONE'} onChange={e => handleOrchChange('createTaskBefore', {
                      ...orchestration.createTaskBefore,
                      prerequisite: e.target.value
                    })} label="Prérequis">
                          <MenuItem value="NONE" sx={{
                        fontSize: 12
                      }}>Aucun</MenuItem>
                          <MenuItem value="TIMESLOT_CONFIRMED" sx={{
                        fontSize: 12
                      }}>Timeslot confirmé</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>}
                </>}
              </>}
              <Grid item xs={12}>
                <Typography sx={{
                fontWeight: 600,
                fontSize: 11,
                color: theme.colors.gray[700],
                mt: 2,
                mb: 0.5
              }}>Stratégie & Jour J</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                  <InputLabel>Stratégie</InputLabel>
                  <Select value={orchestration.assignmentStrategy || 'PRIORITY'} onChange={e => handleOrchChange('assignmentStrategy', e.target.value)} label="Stratégie" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                    <MenuItem value="PRIORITY" sx={{
                    fontSize: 12
                  }}>Priorité</MenuItem>
                    <MenuItem value="ROTATION" sx={{
                    fontSize: 12
                  }}>Rotation</MenuItem>
                    <MenuItem value="MANUAL" sx={{
                    fontSize: 12
                  }}>Manuel</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" label="Max relances/jour (J)" value={orchestration.dayJLogic?.maxRetriesPerDay ?? 2} onChange={e => handleDayJChange('maxRetriesPerDay', parseInt(e.target.value) || 0)} inputProps={{
                min: 1,
                max: 10
              }} sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" label="Intervalle (h)" value={orchestration.dayJLogic?.retryIntervalHours ?? 2} onChange={e => handleDayJChange('retryIntervalHours', parseInt(e.target.value) || 0)} inputProps={{
                min: 1,
                max: 24
              }} sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                  <InputLabel>Heures contact</InputLabel>
                  <Select value={typeof orchestration.dayJLogic?.contactHours === 'string' ? orchestration.dayJLogic.contactHours : 'ANYTIME'} onChange={e => handleDayJChange('contactHours', e.target.value)} label="Heures contact" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                    <MenuItem value="ANYTIME" sx={{
                    fontSize: 12
                  }}>N&apos;importe quand</MenuItem>
                    <MenuItem value="BUSINESS_HOURS" sx={{
                    fontSize: 12
                  }}>9h-18h</MenuItem>
                    <MenuItem value="STAFF_PLANNING" sx={{
                    fontSize: 12
                  }}>Planning staff</MenuItem>
                    <MenuItem value="TIMESLOT_IF_EXISTS" sx={{
                    fontSize: 12
                  }}>Timeslot si existe</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel control={<Switch size="small" checked={(orchestration.assignmentType || 'STAFF') !== 'MANAGER' && orchestration.enableAutomaticRetryNextDays !== false} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'} onChange={e => handleOrchChange('enableAutomaticRetryNextDays', e.target.checked)} />} label={<Typography sx={{
                fontSize: 12,
                color: (orchestration.assignmentType || 'STAFF') === 'MANAGER' ? 'text.disabled' : 'inherit'
              }}>Retry J+1 (jours suivants)</Typography>} />
              </Grid>
              <Grid item xs={12}>
                <Typography sx={{
                fontWeight: 600,
                fontSize: 11,
                color: (orchestration.assignmentType || 'STAFF') === 'MANAGER' ? theme.colors.gray[400] : theme.colors.gray[700],
                mt: 2,
                mb: 0.5
              }}>Gestion Refus</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                  <InputLabel>Blocage staff (refus)</InputLabel>
                  <Select value={orchestration.staffRefusalPolicy?.blockingStrategy || 'BLOCK_TODAY'} onChange={e => handleStaffRefusalChange('blockingStrategy', e.target.value)} label="Blocage staff (refus)" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                    <MenuItem value="BLOCK_TODAY" sx={{
                    fontSize: 12
                  }}>Ce jour uniquement</MenuItem>
                    <MenuItem value="BLOCK_ALWAYS" sx={{
                    fontSize: 12
                  }}>Toujours (déblocage admin)</MenuItem>
                    <MenuItem value="NO_BLOCK" sx={{
                    fontSize: 12
                  }}>Ne pas bloquer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                  <InputLabel>Action après refus</InputLabel>
                  <Select value={orchestration.staffRefusalPolicy?.actionAfterRefusal || 'CONTINUE'} onChange={e => handleStaffRefusalChange('actionAfterRefusal', e.target.value)} label="Action après refus" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                    <MenuItem value="CONTINUE" sx={{
                    fontSize: 12
                  }}>Continuer (staff suivant)</MenuItem>
                    <MenuItem value="STOP" sx={{
                    fontSize: 12
                  }}>Arrêter (attendre J+1)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* ── Rappel tâche staff (toutes catégories avec staff : CHOICE, CLEANING, CLIENT_REQUEST) ── */}
              {!(edited.categoryType === 'CLEANING_SOJORI' || edited.type === 'cleaning_sojori') && <>
                <Grid item xs={12}>
                  <Typography sx={{
                  fontWeight: 600,
                  fontSize: 11,
                  color: theme.colors.gray[700],
                  mt: 2,
                  mb: 0.5
                }}>📣 Rappel tâche (staff)</Typography>
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel control={<Switch size="small" checked={orchestration.taskReminder?.enabled || false} onChange={e => handleTaskReminderChange('enabled', e.target.checked)} />} label={<Typography sx={{
                  fontSize: 12
                }}>Activer rappel</Typography>} />
                </Grid>
                {orchestration.taskReminder?.enabled && <>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }} type="number" label="Jours avant la tâche" value={orchestration.taskReminder?.daysBefore ?? 1} onChange={e => handleTaskReminderChange('daysBefore', parseInt(e.target.value) || 1)} inputProps={{
                    min: 1,
                    max: 30
                  }} helperText="Ex. 1 = veille de la tâche" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth size="small" sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'white',
                      fontSize: 12
                    },
                    '& .MuiInputLabel-root': {
                      fontSize: 12
                    }
                  }} type="number" label="Heure envoi (0–23)" value={orchestration.taskReminder?.preferredHour ?? 9} onChange={e => handleTaskReminderChange('preferredHour', parseInt(e.target.value) || 9)} inputProps={{
                    min: 0,
                    max: 23
                  }} helperText="Heure locale" />
                  </Grid>
                </>}
              </>}

              <Grid item xs={12}>
                <Typography sx={{
                fontWeight: 600,
                fontSize: 11,
                color: theme.colors.gray[700],
                mt: 2,
                mb: 0.5
              }}>Deadline</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Deadline (type)</InputLabel>
                  <Select value={orchestration.createTaskBefore?.deadline?.type || 'DAYS'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  deadline: {
                    ...(orchestration.createTaskBefore?.deadline || {}),
                    type: e.target.value,
                    value: orchestration.createTaskBefore?.deadline?.value ?? 1
                  }
                })} label="Deadline (type)">
                    <MenuItem value="HOURS" sx={{
                    fontSize: 12
                  }}>Heures</MenuItem>
                    <MenuItem value="DAYS" sx={{
                    fontSize: 12
                  }}>Jours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" label="Valeur deadline" value={orchestration.createTaskBefore?.deadline?.value ?? 1} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                deadline: {
                  ...(orchestration.createTaskBefore?.deadline || {}),
                  type: orchestration.createTaskBefore?.deadline?.type || 'DAYS',
                  value: parseInt(e.target.value) || 1
                }
              })} inputProps={{
                min: 1
              }} sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField fullWidth size="small" type="number" label="Heure deadline (0–23)" value={orchestration.createTaskBefore?.deadline?.hour ?? ''} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                deadline: {
                  ...(orchestration.createTaskBefore?.deadline || {}),
                  hour: e.target.value === '' ? undefined : parseInt(e.target.value, 10)
                }
              })} inputProps={{
                min: 0,
                max: 23
              }} placeholder="8" helperText="Ex. 8h" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
              </Grid>
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                  <InputLabel>Si atteinte</InputLabel>
                  <Select value={orchestration.createTaskBefore?.deadline?.action || 'MANUAL'} onChange={e => {
                  const dl = {
                    ...(orchestration.createTaskBefore?.deadline || {}),
                    action: e.target.value
                  };
                  handleOrchChange('createTaskBefore', {
                    ...orchestration.createTaskBefore,
                    deadline: dl
                  });
                }} label="Si atteinte">
                    <MenuItem value="MANUAL" sx={{
                    fontSize: 12
                  }}>Assigner à l&apos;Admin</MenuItem>
                    <MenuItem value="CANCEL" sx={{
                    fontSize: 12
                  }}>Annuler la tâche</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </Stack> : <Stack spacing={mode === 'NOTIFICATION_ONLY' ? 2 : 3}>
          {/* Type de catégorie - premier champ, modifiable */}
          <FormControl fullWidth size="small">
            <InputLabel>categoryType (BD exact)</InputLabel>
            <Select label="categoryType (BD exact)" value={edited.categoryType || ''} onChange={e => handleChange('categoryType', e.target.value)}>
              <MenuItem value="">— (non défini)</MenuItem>
              <MenuItem value="NOTIFICATION"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>NOTIFICATION</em>&nbsp;— Notification</MenuItem>
              <MenuItem value="CHOICE_ARRIVAL"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CHOICE_ARRIVAL</em>&nbsp;— Choisir arrivée</MenuItem>
              <MenuItem value="CHOICE_DEPARTURE"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CHOICE_DEPARTURE</em>&nbsp;— Choisir départ</MenuItem>
              <MenuItem value="DECLARATION_REGISTRATION"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>DECLARATION_REGISTRATION</em>&nbsp;— Registration</MenuItem>
              <MenuItem value="DECLARATION_ARRIVAL"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>DECLARATION_ARRIVAL</em>&nbsp;— Déclarer arrivée</MenuItem>
              <MenuItem value="DECLARATION_DEPARTURE"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>DECLARATION_DEPARTURE</em>&nbsp;— Déclarer départ</MenuItem>
              <MenuItem value="CLEANING_FREE"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLEANING_FREE</em>&nbsp;— Ménage inclus (cleaning free)</MenuItem>
              <MenuItem value="CLEANING_PAID"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLEANING_PAID</em>&nbsp;— Cleaning Paid</MenuItem>
              <MenuItem value="CLIENT_REQUEST_SUPPORT"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLIENT_REQUEST_SUPPORT</em>&nbsp;— Support (immédiat)</MenuItem>
              <MenuItem value="CLIENT_REQUEST_TRANSPORT"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLIENT_REQUEST_TRANSPORT</em>&nbsp;— Transport</MenuItem>
              <MenuItem value="CLIENT_REQUEST_GROCERY"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLIENT_REQUEST_GROCERY</em>&nbsp;— Grocery / Courses</MenuItem>
              <MenuItem value="CLIENT_REQUEST_CUSTOM"><em style={{
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#888'
              }}>CLIENT_REQUEST_CUSTOM</em>&nbsp;— Custom / Autre</MenuItem>
            </Select>
          </FormControl>

          {/* Message à envoyer - visible sans clic */}
          {(isOrchestration || mode === 'NOTIFICATION_ONLY') && <Box sx={{
          py: 1.5,
          px: 2,
          borderRadius: 1.5,
          bgcolor: theme.colors.success.bg,
          border: `1px solid ${theme.colors.success.light}`
        }}>
              <Typography sx={{
            fontSize: 11,
            fontWeight: 600,
            color: theme.colors.gray[600],
            mb: 0.5
          }}>
                📨 Message à envoyer
              </Typography>
              <Typography sx={{
            fontSize: 14,
            fontWeight: 600,
            color: theme.colors.gray[900]
          }}>
                {selectedMessageLabel && selectedMessageLabel !== 'Sans nom' ? selectedMessageLabel : 'Aucun message'}
              </Typography>
            </Box>}

          {/* Configuration de base - masqué en NOTIFICATION_ONLY (intégré dans le bloc compact ci-dessous) */}
          {mode !== 'NOTIFICATION_ONLY' && <Box sx={{
          p: 2.5,
          bgcolor: theme.colors.primary.bg,
          borderRadius: 2,
          border: `1px solid ${theme.colors.primary.main}`
        }}>
            <Typography sx={{
            fontWeight: 600,
            fontSize: 13,
            mb: 2,
            color: theme.colors.gray[800]
          }}>
              ⚙️ Configuration de base
            </Typography>
            <Stack spacing={2}>
              <TextField fullWidth size="small" label="Nom affiché (facultatif)" value={edited.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="ex. Message bienvenue" helperText="Nom sur les cartes et dans le plan" sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                fontSize: 13
              },
              '& .MuiInputLabel-root': {
                fontSize: 13
              },
              '& .MuiFormHelperText-root': {
                fontSize: 11
              }
            }} />

              {/* ❌ REMOVED 2026-02-11: planningMode field and explanation - Backend deletes this field (not used) */}
            </Stack>
          </Box>}

          {/* MODE ORCHESTRATION */}
          {isOrchestration && <Box>
              <AccordionSection title="⏱️ Création de la tâche" defaultExpanded>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                        <InputLabel>Moment de création</InputLabel>
                        <Select value={orchestration.createTaskBefore?.trigger || 'AFTER_RESERVATION'} onChange={e => handleOrchChange('createTaskBefore', {
                    ...orchestration.createTaskBefore,
                    trigger: e.target.value
                  })} label="Moment de création">
                          <MenuItem value="AFTER_RESERVATION" sx={{
                      fontSize: 13,
                      py: 1
                    }}>📋 Après réservation</MenuItem>
                          <MenuItem value="IMMEDIATE_CLIENT_REQUEST" sx={{
                      fontSize: 13,
                      py: 1
                    }}>🕐 Après timeslot</MenuItem>
                          <MenuItem value="BEFORE_EXECUTION" sx={{
                      fontSize: 13,
                      py: 1
                    }}>⏰ Avant exécution</MenuItem>
                          <MenuItem value="AFTER_EXECUTION" sx={{
                      fontSize: 13,
                      py: 1
                    }}>✅ Après exécution</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Valeur" value={orchestration.createTaskBefore?.value || 0} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  value: parseInt(e.target.value) || 0
                })} inputProps={{
                  min: 0
                }} />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                        <InputLabel>Unité</InputLabel>
                        <Select value={orchestration.createTaskBefore?.unit || 'HOURS'} onChange={e => handleOrchChange('createTaskBefore', {
                    ...orchestration.createTaskBefore,
                    unit: e.target.value
                  })} label="Unité">
                          <MenuItem value="HOURS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Heures</MenuItem>
                          <MenuItem value="DAYS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Jours</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {/* Pré-requis */}
                    {['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(orchestration.createTaskBefore?.trigger) && <Grid item xs={12}>
                        <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                          <InputLabel>Pré-requis</InputLabel>
                          <Select value={orchestration.createTaskBefore?.prerequisite || 'NONE'} onChange={e => handleOrchChange('createTaskBefore', {
                    ...orchestration.createTaskBefore,
                    prerequisite: e.target.value
                  })} label="Pré-requis">
                            <MenuItem value="NONE" sx={{
                      fontSize: 13,
                      py: 1
                    }}>✅ Aucun (créer automatiquement)</MenuItem>
                            <MenuItem value="TIMESLOT_CONFIRMED" sx={{
                      fontSize: 13,
                      py: 1
                    }}>⏰ Attendre confirmation timeslot</MenuItem>
                            <MenuItem value="CLIENT_REGISTERED" sx={{
                      fontSize: 13,
                      py: 1
                    }}>👤 Attendre enregistrement client</MenuItem>
                          </Select>
                        </FormControl>
                        <Typography variant="caption" sx={{
                  mt: 0.5,
                  display: 'block',
                  fontSize: 11,
                  color: theme.colors.gray[500]
                }}>
                          {orchestration.createTaskBefore?.prerequisite === 'TIMESLOT_CONFIRMED' ? '⏰ Créée si timeslot OK' : orchestration.createTaskBefore?.prerequisite === 'CLIENT_REGISTERED' ? '👤 Créée si client enregistré' : '✅ Créée automatiquement'}
                        </Typography>
                      </Grid>}
                  </Grid>
                </AccordionSection>

              {/* ✅ CLEANED: Type d'assignataire + Timing d'assignation déplacés en haut de la section Staff (inline) */}

              {/* ✅ Logique JOUR J: Only for CHOICE/CLEANING/CLIENT_REQUEST types (not NOTIFICATION/DECLARATION) */}
              {(isTypeOf(edited.type, 'choice') || isTypeOf(edited.categoryType, 'choice') || isTypeOf(edited.type, 'cleaning') || isTypeOf(edited.categoryType, 'cleaning') || edited.categoryType === 'CLIENT_REQUEST' || edited.categoryType === 'CUSTOMER_REQUEST' || isTypeOf(edited.categoryType, 'client_request') || isTypeOf(edited.categoryType, 'customer_request')) && <AccordionSection title="📅 Logique JOUR J">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Max relances/jour" value={orchestration.dayJLogic?.maxRetriesPerDay || 3} onChange={e => handleDayJChange('maxRetriesPerDay', parseInt(e.target.value) || 0)} inputProps={{
                  min: 1,
                  max: 10
                }} helperText="Par staff/J" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Intervalle (heures)" value={orchestration.dayJLogic?.retryIntervalHours || 1} onChange={e => handleDayJChange('retryIntervalHours', parseInt(e.target.value) || 0)} inputProps={{
                  min: 1,
                  max: 24
                }} helperText="Entre relances" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'} />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                        <InputLabel>Contact staff</InputLabel>
                        <Select value={typeof orchestration.dayJLogic?.contactHours === 'string' ? orchestration.dayJLogic.contactHours : 'ANYTIME'} onChange={e => handleDayJChange('contactHours', e.target.value)} label="Contact staff" disabled={(orchestration.assignmentType || 'STAFF') === 'MANAGER'}>
                          <MenuItem value="TIMESLOT_IF_EXISTS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>🎯 Utiliser timeslot si existe</MenuItem>
                          <MenuItem value="STAFF_PLANNING" sx={{
                      fontSize: 13,
                      py: 1
                    }}>📅 Planning staff</MenuItem>
                          <MenuItem value="BUSINESS_HOURS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>🕘 Horaires 9h-18h</MenuItem>
                          <MenuItem value="ANYTIME" sx={{
                      fontSize: 13,
                      py: 1
                    }}>🌐 N&apos;importe quand</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Alert severity="info" sx={{
              mt: 1.5,
              fontSize: 11,
              py: 0.5
            }}>
                    {(orchestration.assignmentType || 'STAFF') === 'MANAGER' ? '🧑‍💼 Mode Manager actif — ces champs sont ignorés.' : 'Heures de contact = moment où on contacte le staff (pas l\'heure d\'exécution)'}
                  </Alert>
                </AccordionSection>}

              {/* ✅ CLEANED 2026-02-11: Removed "🔁 Logique J+1" accordion - never used */}

              {/* ✅ CLEANED 2026-02-11: Removed "🚫 Politique de refus du staff" accordion - never used */}

              {/* ✅ CLEANED 2026-02-11: Removed "🔄 Reschedule / Décalage horaire" accordion - never used */}

              {/* ── Rappel tâche déplacé dans le bloc inline CHOICE/CLIENT_REQUEST ci-dessus ── */}

              <AccordionSection title="⏰ Deadline">
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                        <InputLabel>Type</InputLabel>
                        <Select value={orchestration.deadline?.type || 'DAYS'} onChange={e => handleDeadlineChange('type', e.target.value)} label="Type">
                          <MenuItem value="DAYS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Jours</MenuItem>
                          <MenuItem value="HOURS" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Heures</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Valeur" value={orchestration.deadline?.value || -1} onChange={e => handleDeadlineChange('value', parseInt(e.target.value) || 0)} inputProps={{
                  min: -30,
                  max: 30
                }} helperText="-1=1j avant" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Heure (0–23)" value={orchestration.deadline?.hour ?? ''} onChange={e => handleDeadlineChange('hour', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} inputProps={{
                  min: 0,
                  max: 23
                }} placeholder="8" helperText="Ex. 8h" />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                        <InputLabel>Si atteinte</InputLabel>
                        <Select value={orchestration.deadline?.action || 'MANUAL'} onChange={e => handleDeadlineChange('action', e.target.value)} label="Si atteinte">
                          <MenuItem value="MANUAL" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Assigner à l&apos;Admin</MenuItem>
                          <MenuItem value="CANCEL" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Annuler la tâche</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </AccordionSection>

              {/* ✅ Rappels client (DECLARATION/CHOICE/CLEANING uniquement - PAS pour NOTIFICATION 'message') */}
              {['registration', 'arrival_choose', 'arrival_declare', 'departure_choose', 'departure_declare', 'cleaning_paid'].includes(categoryKey) && <AccordionSection title="📢 Rappels automatiques client">
                    <FormControlLabel control={<Switch size="small" checked={orchestration.clientReminder?.enabled || false} onChange={e => handleClientReminderChange('enabled', e.target.checked)} />} label={<Typography sx={{
              fontSize: 13
            }}>Activer les rappels</Typography>} />

                    {orchestration.clientReminder?.enabled && <Grid container spacing={2} sx={{
              mt: 1
            }}>
                        <Grid item xs={12} sm={6}>
                          <FormControl fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }}>
                            <InputLabel>Condition</InputLabel>
                            <Select value={orchestration.clientReminder?.condition || (categoryKey === 'registration' ? 'INCOMPLETE_REGISTRATION' : ['arrival_declare', 'departure_declare'].includes(categoryKey) ? 'NOT_DECLARED' : 'NO_TIMESLOT')} onChange={e => handleClientReminderChange('condition', e.target.value)} label="Condition">
                              {categoryKey === 'registration' && <MenuItem value="INCOMPLETE_REGISTRATION" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Enregistrement incomplet</MenuItem>}
                              {['arrival_declare', 'departure_declare'].includes(categoryKey) && <MenuItem value="NOT_DECLARED" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Pas encore déclaré</MenuItem>}
                              {['arrival_choose', 'departure_choose', 'cleaning_paid'].includes(categoryKey) && <MenuItem value="NO_TIMESLOT" sx={{
                      fontSize: 13,
                      py: 1
                    }}>Pas de timeslot choisi</MenuItem>}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <TextField fullWidth size="small" sx={{
                  "& .MuiOutlinedInput-root": {
                    fontSize: 15
                  },
                  "& .MuiInputLabel-root": {
                    fontSize: 14
                  }
                }} type="number" label="Jours avant événement" value={orchestration.clientReminder?.daysBeforeEvent || 1} onChange={e => handleClientReminderChange('daysBeforeEvent', parseInt(e.target.value) || 0)} inputProps={{
                  min: 0
                }} />
                        </Grid>
                      </Grid>}
                  </AccordionSection>}

              <AccordionSection title="📢 Notifications">
                  <Box sx={{
              p: 1.5,
              bgcolor: theme.colors.warning.bg,
              borderRadius: 1.5,
              mb: 1.5
            }}>
                    <Typography sx={{
                fontWeight: 600,
                mb: 1,
                fontSize: 12
              }}>🔔 Admin</Typography>
                    <Grid container spacing={0.5}>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnTaskStart || false} onChange={e => handleNotificationChange('notifyAdminOnTaskStart', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Début</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnTaskComplete || false} onChange={e => handleNotificationChange('notifyAdminOnTaskComplete', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Fin</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnStaffChange || false} onChange={e => handleNotificationChange('notifyAdminOnStaffChange', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Chgt staff</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnReschedule || false} onChange={e => handleNotificationChange('notifyAdminOnReschedule', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Reschedule</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnStaffRefusal || false} onChange={e => handleNotificationChange('notifyAdminOnStaffRefusal', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Refus</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyAdminOnDeadline || false} onChange={e => handleNotificationChange('notifyAdminOnDeadline', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Deadline atteinte</Typography>} />
                      </Grid>
                    </Grid>
                  </Box>

                  <Box sx={{
              p: 1.5,
              bgcolor: theme.colors.success.bg,
              borderRadius: 1.5
            }}>
                    <Typography sx={{
                fontWeight: 600,
                mb: 1,
                fontSize: 12
              }}>👤 Client</Typography>
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyClientOnTaskStart || false} onChange={e => handleNotificationChange('notifyClientOnTaskStart', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Début</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyClientOnTaskComplete || false} onChange={e => handleNotificationChange('notifyClientOnTaskComplete', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Fin</Typography>} />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <FormControlLabel control={<Checkbox size="small" checked={edited.notifications?.notifyClientOnReschedule || false} onChange={e => handleNotificationChange('notifyClientOnReschedule', e.target.checked)} />} label={<Typography sx={{
                    fontSize: 11
                  }}>Reschedule</Typography>} />
                      </Grid>
                    </Grid>
                  </Box>
                </AccordionSection>

              <AccordionSection title="📨 Message à envoyer" defaultExpanded>
                  {loadingTemplates ? <Box sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 3
            }}>
                      <CircularProgress size={32} />
                    </Box> : <FormControl fullWidth>
                      <InputLabel shrink>Template de message</InputLabel>
                      <Select value={orchestration.messageTemplateId || ''} onChange={e => handleOrchChange('messageTemplateId', e.target.value)} label="Template de message" notched displayEmpty sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: 15
                },
                '& .MuiInputLabel-root': {
                  fontSize: 14
                }
              }}>
                        <MenuItem value="">
                          <em style={{
                    color: '#999'
                  }}>Aucun message</em>
                        </MenuItem>
                        {messageTemplates.map(template => <MenuItem key={template._id} value={template._id} sx={{
                  fontSize: 13,
                  py: 1
                }}>
                            {getTemplateDisplayLabel(template)}
                          </MenuItem>)}
                      </Select>
                      <Typography variant="caption" sx={{
                mt: 0.5,
                fontSize: 11,
                color: theme.colors.gray[500]
              }}>
                        Template de l&apos;onglet Messages
                      </Typography>
                    </FormControl>}
                </AccordionSection>
            </Box>}

          {/* MODE NOTIFICATION_ONLY — vue compacte type tableau (tout modifier sans scroller) */}
          {mode === 'NOTIFICATION_ONLY' && <Box sx={{
          p: 2,
          bgcolor: theme.colors.gray[50],
          borderRadius: 2,
          border: `1px solid ${theme.colors.gray[200]}`
        }}>
              <Typography sx={{
            fontWeight: 700,
            fontSize: 12,
            mb: 1.5,
            color: theme.colors.gray[800]
          }}>
                ⚙️ Configuration · {edited.type === 'message' || edited.categoryType === 'NOTIFICATION' ? 'Notification' : edited.type === 'declaration' ? 'Declaration' : edited.type === 'choice' ? 'Choice' : edited.type === 'cleaning' ? 'Cleaning' : 'Catégorie'}
              </Typography>
              <Grid container spacing={1.5}>
                {/* Ligne 1: Nom affiché | Création plan */}
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth size="small" label="Nom affiché" value={edited.name || ''} onChange={e => handleChange('name', e.target.value)} placeholder="ex. Message bienvenue" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
                </Grid>
                {/* ❌ REMOVED 2026-02-11: planningMode field and explanation - Backend deletes this field (not used) */}
                {/* Ligne 2: Template | Canal | Condition */}
                <Grid item xs={12} sm={4}>
                  {loadingTemplates ? <Box sx={{
                display: 'flex',
                alignItems: 'center',
                height: 40
              }}><CircularProgress size={24} /></Box> : <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                      <InputLabel shrink>Template message</InputLabel>
                      <Select value={orchestration.messageTemplateId || ''} onChange={e => handleOrchChange('messageTemplateId', e.target.value)} label="Template message" displayEmpty notched>
                        <MenuItem value=""><em style={{
                      color: '#999',
                      fontSize: 12
                    }}>Aucun</em></MenuItem>
                        {messageTemplates.map(t => <MenuItem key={t._id} value={t._id} sx={{
                    fontSize: 12
                  }}>{getTemplateDisplayLabel(t)}</MenuItem>)}
                        {orchestration.messageTemplateId && !messageTemplates.some(t => t._id === orchestration.messageTemplateId) && <MenuItem value={orchestration.messageTemplateId} sx={{
                    fontSize: 12
                  }}>Template sélectionné</MenuItem>}
                      </Select>
                    </FormControl>}
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel>Canal</InputLabel>
                    <Select value={orchestration.channelPriority || 'WHATSAPP_PRIORITY'} onChange={e => handleOrchChange('channelPriority', e.target.value)} label="Canal">
                      <MenuItem value="WHATSAPP_PRIORITY" sx={{
                    fontSize: 12
                  }}>💬 WhatsApp priorité</MenuItem>
                      <MenuItem value="WHATSAPP_ONLY" sx={{
                    fontSize: 12
                  }}>💬 WhatsApp seul</MenuItem>
                      <MenuItem value="OTA_PRIORITY" sx={{
                    fontSize: 12
                  }}>📧 Email-OTA priorité</MenuItem>
                      <MenuItem value="OTA_ONLY" sx={{
                    fontSize: 12
                  }}>📧 Email-OTA seul</MenuItem>
                      <MenuItem value="NO_PRIORITY" sx={{
                    fontSize: 12
                  }}>— Aucune</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel>Condition rappel</InputLabel>
                    <Select value={(() => {
                  const showDecl = isTypeOf(edited.type, 'declaration') || isTypeOf(edited.categoryType, 'declaration') || CONDITION_DECLARATION_VALUES.includes(edited.sendNotificationCondition);
                  const valid = ['ALWAYS', ...(showDecl ? CONDITION_DECLARATION_VALUES : []), 'IF_NOT_DONE'];
                  return valid.includes(edited.sendNotificationCondition) ? edited.sendNotificationCondition : 'ALWAYS';
                })()} onChange={e => handleChange('sendNotificationCondition', e.target.value)} label="Condition rappel">
                      <MenuItem value="ALWAYS" sx={{
                    fontSize: 12
                  }}>✅ Toujours</MenuItem>
                      {isTypeOf(edited.type, 'declaration') || isTypeOf(edited.categoryType, 'declaration') || CONDITION_DECLARATION_VALUES.includes(edited.sendNotificationCondition) ? <>
                          <MenuItem value="IF_REGISTRATION_INCOMPLETE" sx={{
                      fontSize: 12
                    }}>⚠️ Non enregistré</MenuItem>
                          <MenuItem value="IF_ARRIVAL_NOT_DECLARED" sx={{
                      fontSize: 12
                    }}>⚠️ Arrivée non déclarée</MenuItem>
                          <MenuItem value="IF_DEPARTURE_NOT_DECLARED" sx={{
                      fontSize: 12
                    }}>⚠️ Départ non déclaré</MenuItem>
                        </> : null}
                      <MenuItem value="IF_NOT_DONE" sx={{
                    fontSize: 12
                  }}>⚠️ Si non fait</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* Ligne 3: Moment | Valeur | Unité | Heures préf. */}
                <Grid item xs={12} sm={3}>
                  <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel>Moment</InputLabel>
                    <Select value={orchestration.createTaskBefore?.trigger || 'BEFORE_ARRIVAL'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  trigger: e.target.value
                })} label="Moment">
                      <MenuItem value="AFTER_RESERVATION" sx={{
                    fontSize: 12
                  }}>📋 Après résa</MenuItem>
                      <MenuItem value="IMMEDIATE_CLIENT_REQUEST" sx={{
                    fontSize: 12
                  }}>🎯 Demande client</MenuItem>
                      <MenuItem value="BEFORE_ARRIVAL" sx={{
                    fontSize: 12
                  }}>🚪 Avant arrivée</MenuItem>
                      <MenuItem value="AFTER_ARRIVAL" sx={{
                    fontSize: 12
                  }}>✅ Après arrivée</MenuItem>
                      <MenuItem value="BEFORE_DEPARTURE" sx={{
                    fontSize: 12
                  }}>👋 Avant départ</MenuItem>
                      <MenuItem value="AFTER_EXECUTION" sx={{
                    fontSize: 12
                  }}>✅ Après exécution</MenuItem>
                      <MenuItem value="BEFORE_EXECUTION" sx={{
                    fontSize: 12
                  }}>⏰ Avant exécution</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField fullWidth size="small" label="Valeur" value={orchestration.createTaskBefore?.value ?? ''} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                value: e.target.value
              })} placeholder="1-2" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
                </Grid>
                <Grid item xs={4} sm={2}>
                  <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel>Unité</InputLabel>
                    <Select value={orchestration.createTaskBefore?.unit || 'DAYS'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  unit: e.target.value
                })} label="Unité">
                      <MenuItem value="HOURS" sx={{
                    fontSize: 12
                  }}>Heures</MenuItem>
                      <MenuItem value="DAYS" sx={{
                    fontSize: 12
                  }}>Jours</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={4} sm={2}>
                  <TextField fullWidth size="small" label="Heures (opt.)" value={orchestration.createTaskBefore?.preferredHours || ''} onChange={e => handleOrchChange('createTaskBefore', {
                ...orchestration.createTaskBefore,
                preferredHours: e.target.value
              })} placeholder="9-13-19" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }} />
                </Grid>
                {/* Ligne 4: Rappels client (aligné tableau) */}
                <Grid item xs={12} sm={6}>
                  <FormControlLabel control={<Switch size="small" checked={orchestration.clientReminder?.enabled || false} onChange={e => handleClientReminderChange('enabled', e.target.checked)} sx={{
                '& .MuiSwitch-switchBase.Mui-checked': {
                  color: theme.colors.success.main
                }
              }} />} label={<Typography sx={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.colors.gray[700]
              }}>Rappels: Activé</Typography>} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                    <InputLabel>Rappels: Condition</InputLabel>
                    <Select value={orchestration.clientReminder?.condition ?? (categoryKey === 'registration' ? 'INCOMPLETE_REGISTRATION' : ['arrival_declare', 'departure_declare'].includes(categoryKey) ? 'NOT_DECLARED' : 'NO_TIMESLOT')} onChange={e => handleClientReminderChange('condition', e.target.value)} label="Rappels: Condition" disabled={!orchestration.clientReminder?.enabled}>
                      <MenuItem value="INCOMPLETE_REGISTRATION" sx={{
                    fontSize: 12
                  }}>👤 Enregistrement incomplet</MenuItem>
                      <MenuItem value="NOT_DECLARED" sx={{
                    fontSize: 12
                  }}>📍 Pas encore déclaré (arrivée/départ)</MenuItem>
                      <MenuItem value="NO_TIMESLOT" sx={{
                    fontSize: 12
                  }}>⏰ Pas de créneau choisi</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                {/* Pré-requis si trigger avant arrivée/départ/exécution */}
                {['BEFORE_EXECUTION', 'BEFORE_ARRIVAL', 'BEFORE_DEPARTURE'].includes(orchestration.createTaskBefore?.trigger) && <Grid item xs={12} sm={4}>
                    <FormControl fullWidth size="small" sx={{
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: 12
                },
                '& .MuiInputLabel-root': {
                  fontSize: 12
                }
              }}>
                      <InputLabel>Pré-requis</InputLabel>
                      <Select value={orchestration.createTaskBefore?.prerequisite || 'NONE'} onChange={e => handleOrchChange('createTaskBefore', {
                  ...orchestration.createTaskBefore,
                  prerequisite: e.target.value
                })} label="Pré-requis">
                        <MenuItem value="NONE" sx={{
                    fontSize: 12
                  }}>✅ Aucun</MenuItem>
                        <MenuItem value="TIMESLOT_CONFIRMED" sx={{
                    fontSize: 12
                  }}>⏰ Timeslot OK</MenuItem>
                        <MenuItem value="CLIENT_REGISTERED" sx={{
                    fontSize: 12
                  }}>👤 Client enregistré</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>}
              </Grid>
            </Box>}
        </Stack>}
      </DialogContent>

      <DialogActions sx={{
      position: 'sticky',
      bottom: 0,
      p: 2.5,
      borderTop: `2px solid ${theme.colors.gray[200]}`,
      bgcolor: theme.colors.gray[50],
      gap: 1.5,
      display: 'flex',
      justifyContent: 'space-between',
      zIndex: 10,
      flexShrink: 0
    }}>
        <Button onClick={() => onDelete && onDelete()} variant="outlined" sx={{
        textTransform: 'none',
        px: 3,
        py: 1,
        fontSize: 13,
        fontWeight: 600,
        borderColor: theme.colors.error.main,
        color: theme.colors.error.main,
        '&:hover': {
          borderColor: '#DC2626',
          bgcolor: theme.colors.error.bg
        }
      }}>
          Supprimer
        </Button>
        <Box sx={{
        display: 'flex',
        gap: 1.5
      }}>
          <Button onClick={onClose} variant="outlined" sx={{
          textTransform: 'none',
          px: 3,
          py: 1,
          fontSize: 13,
          fontWeight: 600,
          borderColor: theme.colors.gray[300],
          color: theme.colors.gray[700],
          '&:hover': {
            borderColor: theme.colors.gray[400],
            bgcolor: theme.colors.gray[100]
          }
        }}>
            Annuler
          </Button>
          {onSaveAsTemplate && effectiveCategoryKey && <Button variant="outlined" onClick={handleSaveAsTemplate} startIcon={<BookmarkIcon sx={{
          fontSize: 18
        }} />} sx={{
          textTransform: 'none',
          px: 3,
          py: 1,
          fontSize: 13,
          fontWeight: 600,
          borderColor: theme.colors.primary.main,
          color: theme.colors.primary.main,
          '&:hover': {
            borderColor: theme.colors.primary.main,
            bgcolor: theme.colors.primary.bg
          }
        }}>
              Créer comme template
            </Button>}
          <Button variant="contained" onClick={handleSave} disabled={isSaving} startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon sx={{
          fontSize: 18
        }} />} sx={{
          background: categoryMeta?.gradient || theme.colors.primary.main,
          textTransform: 'none',
          px: 3,
          py: 1,
          fontSize: 13,
          fontWeight: 700,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: 140,
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          },
          '&:disabled': {
            background: theme.colors.gray[400]
          }
        }}>
            {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>;
};
export default CategoryFullEditDialog;
