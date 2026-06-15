import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip, Switch, Autocomplete, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Chip, Alert, IconButton, Avatar, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import EditOffIcon from '@mui/icons-material/EditOff';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { Search as SearchIcon, Add as AddIcon, Visibility as VisibilityIcon, Email as EmailIcon, CheckCircle as CheckIcon, Cancel as CancelIcon, Edit as EditIcon, Autorenew as AutorenewIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import GlobalTable from 'components/GlobalTable/GlobalTable';
import MailTemplateContainer from './MailTemplateContainer';
import MailTemplateButtons from './MailTemplateButtons';
import Description from './Description';
import RulesAndInfos from './RulesAndInfos';
import ChatbotMenuTemplate from './ChatbotMenuTemplate';
import ConciergeServicesTemplate from './ConciergeServicesTemplate';
import SupportCategoriesTemplate from './SupportCategoriesTemplate';
import TaskTemplateConfig from './TaskTemplateConfig';
import TemplateDetailModal from './TemplateDetailModal';
import '../styles/MailTemplates.css';
import '../styles/MailTemplates.improved.css';
import { SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB } from 'features/setting/config/mailTemplateUi.config';
import { getMailTemplate, createMailTemplate, updateMailTemplate, deleteMailTemplate, getOwnerRulesAndInfo, updateOwnerRulesAndInfo, initializeOwnerTemplates, initializeSingleTemplate } from '../services/serverApi.adminConfig';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { useSelector } from 'react-redux';
import { getOwners } from '../../staff/services/serverApi.task';
import { can } from '../../../utils/permissions';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../../../constants/orchestrationAdmin';
import ApplyAdminTemplateToOwnerButton from './ApplyAdminTemplateToOwnerButton';
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
const FilterButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)',
    '& .MuiSvgIcon-root': {
      color: 'black !important'
    }
  }
});
const CreateButton = styled(Button)({
  height: '40px',
  borderRadius: '4px',
  textTransform: 'none',
  fontWeight: 500,
  fontSize: '0.875rem',
  padding: '8px 16px',
  backgroundColor: SOJORI_COLORS.primary,
  color: 'white',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryDark,
    transform: 'translateY(-1px)',
    boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)'
  }
});
const MailTemplates = () => {
  const {
    t
  } = useTranslation('common');
  const {
    user
  } = useSelector(state => state.auth);
  const token = useSelector(state => state.auth.token);
  const isAdmin = hasAdminAccess(user?.role);
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [error, setError] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [filterMode, setFilterMode] = useState('admin');

  /** Pour les onglets Descriptions / Règles / Menu WSP / Conciergerie / Support / Tâches : admin = template par défaut, owner = compte choisi */
  const [settingsScope, setSettingsScope] = useState('admin');
  const [settingsOwnerId, setSettingsOwnerId] = useState('');
  /** Bumped after « Copy admin template » so scoped tabs reload from API */
  const [settingsRefetchNonce, setSettingsRefetchNonce] = useState(0);
  const [descLoading, setDescLoading] = useState(true);
  const [descriptions, setDescriptions] = useState(null);
  const [descEditMode, setDescEditMode] = useState(false);
  const [descEditData, setDescEditData] = useState({
    interaction: '',
    houseRules: '',
    ownerListingStory: ''
  });
  const [descSaving, setDescSaving] = useState(false);
  const [descTemplateId, setDescTemplateId] = useState(null);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesAndInfo, setRulesAndInfo] = useState(null);
  const [rulesEditMode, setRulesEditMode] = useState(false);
  const [rulesEditData, setRulesEditData] = useState({
    Rules: [],
    InfoUtils: []
  });
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rulesTemplateId, setRulesTemplateId] = useState(null);
  const [activeTab, setActiveTab] = useState('rules');
  const [canCreate] = useState(can('create'));
  const [canUpdate] = useState(can('update'));
  const [canDelete] = useState(can('delete'));

  // New states for modernized message tab
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Quick-edit popup states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('NO_PRIORITY');
  const adminOwner = useMemo(() => owners.find(owner => owner.email === 'admin@gmail.com'), [owners]);

  /** Admin “default template” must use the same ownerId as orchestration / clone (not admin@gmail.com’s account id, which can differ). */
  const settingsTargetOwnerId = useMemo(() => {
    if (!isAdmin) return undefined;
    if (settingsScope === 'admin') {
      return String(ORCHESTRATION_ADMIN_OWNER_ID);
    }
    return settingsOwnerId || '';
  }, [isAdmin, settingsScope, settingsOwnerId]);
  const settingsNeedOwnerPick = isAdmin && settingsScope === 'owner' && !settingsOwnerId;
  useEffect(() => {
    fetchTemplates();
    if (isAdmin) {
      fetchOwners();
    }
  }, []);
  useEffect(() => {
    if (settingsNeedOwnerPick) return;
    if (SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB) {
      fetchDescriptions();
    }
    fetchRulesAndInfo();
  }, [settingsTargetOwnerId, settingsNeedOwnerPick, settingsRefetchNonce]);
  useEffect(() => {
    if (!SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB && activeTab === 'description') {
      setActiveTab('rules');
    }
  }, [activeTab]);

  // Fetch owners quand isAdmin change
  useEffect(() => {
    if (isAdmin) {
      fetchOwners();
    }
  }, [isAdmin]);
  const fetchOwners = async () => {
    setIsLoading(true);
    try {
      const response = await getOwners({
        limit: 100
      });
      if (response?.data) {
        setOwners(response.data);
      }
    } catch (error) {
      toast.error(t('Failed to fetch owners'));
    } finally {
      setIsLoading(false);
    }
  };
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await getMailTemplate();
      if (response.data.success) {
        const templates = response.data.data;
        setTemplates(templates);
      } else {
        throw new Error(t('Failed to fetch templates'));
      }
    } catch (error) {
      // Silently handle - empty state is expected before seeding
    } finally {
      setIsLoading(false);
    }
  };

  /** Same source as Rules tab: GET /admin/rules-and-info (srv-admin DB). Not via srv-listing — avoids ADMIN_API_URL / wrong cluster. */
  const fetchDescriptions = async () => {
    setDescLoading(true);
    try {
      if (!token) throw new Error(t('Token not found'));
      const ownerParam = isAdmin ? settingsTargetOwnerId : undefined;
      if (isAdmin && !ownerParam) return;
      const response = await getOwnerRulesAndInfo(token, ownerParam);
      if (response.success && response.data) {
        const doc = response.data;
        const desc = doc.listingDescription || {
          interaction: '',
          houseRules: '',
          ownerListingStory: ''
        };
        setDescriptions(desc);
        setDescEditData(desc);
        setDescTemplateId(doc._id);
      } else {
        throw new Error(t('No data found in API response'));
      }
    } catch (error) {
      toast.error(t('Failed to load descriptions') + ': ' + error.message);
      const empty = {
        interaction: '',
        houseRules: '',
        ownerListingStory: ''
      };
      setDescriptions(empty);
      setDescEditData(empty);
    } finally {
      setDescLoading(false);
    }
  };
  const updateDescriptions = async () => {
    setDescSaving(true);
    try {
      if (!token) throw new Error(t('Token not found'));
      const ownerParam = isAdmin ? settingsTargetOwnerId : undefined;
      if (!ownerParam && isAdmin) {
        throw new Error(t('Template ID not found'));
      }
      // Always send rulesAndInfo with listingDescription: older API versions require
      // rulesAndInfo; merge from server so we never overwrite rules with empty state.
      const existing = await getOwnerRulesAndInfo(token, ownerParam);
      if (!existing?.success || !existing?.data) {
        throw new Error(t('Failed to load current settings before save'));
      }
      const rulesPayload = existing.data.rulesAndInfo || {
        Rules: [],
        InfoUtils: []
      };
      const response = await updateOwnerRulesAndInfo(token, {
        rulesAndInfo: rulesPayload,
        listingDescription: descEditData
      }, ownerParam);
      if (response.success) {
        toast.success(t('Descriptions updated successfully'));
        setDescriptions(descEditData);
        setDescEditMode(false);
        await fetchDescriptions();
      } else {
        throw new Error(response.message || t('Failed to update descriptions'));
      }
    } catch (error) {
      const apiErr = error.response?.data;
      const validationMsg = Array.isArray(apiErr?.errors) && apiErr.errors[0]?.message ? apiErr.errors[0].message : null;
      toast.error(t('Failed to update descriptions') + ': ' + (validationMsg || apiErr?.message || error.message));
    } finally {
      setDescSaving(false);
    }
  };
  const fetchRulesAndInfo = async () => {
    setRulesLoading(true);
    try {
      if (!token) throw new Error(t('Token not found'));
      const ownerParam = isAdmin ? settingsTargetOwnerId : undefined;
      if (isAdmin && !ownerParam) return;
      const response = await getOwnerRulesAndInfo(token, ownerParam);
      if (response.success && response.data) {
        const rulesInfo = response.data.rulesAndInfo || {
          Rules: [],
          InfoUtils: []
        };
        setRulesAndInfo(rulesInfo);
        setRulesEditData(rulesInfo);
        setRulesTemplateId(response.data._id);
      } else {
        throw new Error(t('No data found in API response'));
      }
    } catch (error) {
      toast.error(t('Failed to load rules and info') + ': ' + error.message);
      const empty = {
        Rules: [],
        InfoUtils: []
      };
      setRulesAndInfo(empty);
      setRulesEditData(empty);
    } finally {
      setRulesLoading(false);
    }
  };
  const updateRulesAndInfo = async (data, action = 'update') => {
    setRulesSaving(true);
    try {
      if (!token) throw new Error(t('Token not found'));
      const ownerParam = isAdmin ? settingsTargetOwnerId : undefined;
      const response = await updateOwnerRulesAndInfo(token, {
        rulesAndInfo: data
      }, ownerParam);
      if (response.success) {
        const successMessage = action === 'add' ? t('rules_and_info_added_successfully') : action === 'delete' ? t('rules_and_info_deleted_successfully') : t('rules_and_info_updated_successfully');
        toast.success(successMessage);
        setRulesAndInfo(data);
        setRulesEditData(data);
        setRulesEditMode(false);
      } else {
        throw new Error(response.message || t('Failed to update rules and info'));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || t('Failed to update rules and info');
      toast.error(t('Failed to update rules and info') + ': ' + errorMessage);
      throw error;
    } finally {
      setRulesSaving(false);
    }
  };
  const handleToggleEnabled = async (templateId, currentEnabled) => {
    try {
      const currentTemplate = templates.find(t => t._id === templateId);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        enabled: !currentEnabled,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(templateId, updatedTemplateData);
      setTemplates(prev => prev.map(t => t._id === templateId ? {
        ...t,
        enabled: !t.enabled
      } : t));
      toast.success(t(`Template ${!currentEnabled ? 'enabled' : 'disabled'} successfully`));
    } catch (error) {
      toast.error(t('Failed to update template status'));
    }
  };
  const handleToggleMessageEnabled = async (templateId, currentEnabled) => {
    try {
      const currentTemplate = templates.find(t => t._id === templateId);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        messageEnabled: !currentEnabled,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(templateId, updatedTemplateData);
      setTemplates(prev => prev.map(t => t._id === templateId ? {
        ...t,
        messageEnabled: !t.messageEnabled
      } : t));
      toast.success(t(`Template ${!currentEnabled ? 'enabled' : 'disabled'} Messages successfully`));
    } catch (error) {
      toast.error(t('Failed to update template status'));
    }
  };
  const handleToggleWspEnabled = async (templateId, currentEnabled) => {
    try {
      const currentTemplate = templates.find(t => t._id === templateId);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        whatsappEnabled: !currentEnabled,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(templateId, updatedTemplateData);
      setTemplates(prev => prev.map(t => t._id === templateId ? {
        ...t,
        whatsappEnabled: !t.whatsappEnabled
      } : t));
      toast.success(t(`Template ${!currentEnabled ? 'enabled' : 'disabled'} Whatsapp successfully`));
    } catch (error) {
      toast.error(t('Failed to update template status'));
    }
  };
  const handleOpenForm = (templateId = null) => {
    setSelectedTemplateId(templateId);
    setShowForm(true);
  };
  const handleCloseForm = () => {
    setSelectedTemplateId(null);
    setShowForm(false);
  };
  const handleSubmit = async (formData, finalTemplateId = null) => {
    try {
      const dataToSubmit = {
        ...formData,
        enabled: formData.enabled !== undefined ? formData.enabled : true
      };
      if (finalTemplateId) {
        await updateMailTemplate(finalTemplateId, dataToSubmit);
        toast.success(t('Template updated successfully'));
      } else {
        await createMailTemplate(dataToSubmit);
        toast.success(t('Template created successfully'));
      }
      handleCloseForm();
      await fetchTemplates();
    } catch (error) {
      const errorMessage = error.response?.data?.errors?.[0]?.message || t('Failed to save template');
      toast.error(errorMessage);
    }
  };
  const handleDeleteClick = templateId => {
    setTemplateToDelete(templateId);
    setDeleteConfirmOpen(true);
  };
  const handleDeleteCancel = () => {
    setTemplateToDelete(null);
    setDeleteConfirmOpen(false);
  };
  const handleDeleteConfirm = async () => {
    try {
      await deleteMailTemplate(templateToDelete);
      setTemplates(prev => prev.filter(t => t._id !== templateToDelete));
      toast.success(t('Template deleted successfully'));
    } catch (error) {
      toast.error(t('Failed to delete template'));
    } finally {
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
    }
  };
  const handleDescEditClick = () => setDescEditMode(true);
  const handleDescCancelEdit = () => {
    setDescEditData(descriptions);
    setDescEditMode(false);
  };
  const handleDescSave = () => updateDescriptions();
  const handleDescInputChange = (field, value) => {
    setDescEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleRulesEditClick = () => setRulesEditMode(true);
  const handleRulesCancelEdit = () => {
    setRulesEditData(rulesAndInfo);
    setRulesEditMode(false);
  };
  const handleRulesSave = async () => {
    try {
      await updateRulesAndInfo(rulesEditData, 'update');
      await fetchRulesAndInfo();
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || t('Failed to update rules and info');
      toast.error(t('Failed to update rules and info') + ': ' + errorMessage);
    }
  };
  const handleRulesArrayItemChange = async (field, index, value, action, editModeParam) => {
    try {
      setRulesEditData(prev => {
        const newData = {
          ...prev
        };
        if (action === 'update') {
          newData[field] = [...newData[field]];
          newData[field][index] = value;
        } else if (action === 'add') {
          newData[field] = [...(newData[field] || []), value];
        } else if (action === 'delete') {
          newData[field] = newData[field].filter((_, i) => i !== index);
        }
        return newData;
      });
    } catch (error) {
      toast.error(t('Failed to update rules'));
    }
  };

  // New handlers for modernized message tab
  const handleRowClick = template => {
    const owner = owners.find(o => o._id === template.ownerId);
    // Map content fields to message fields for the modal
    const templateForModal = {
      ...template,
      message_fr: template.content,
      message_en: template.contentEng
    };
    setSelectedTemplate(templateForModal);
    setSelectedOwner(owner);
    setModalOpen(true);
  };
  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };
  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  const handleCreate = () => {
    setShowForm(true);
    setSelectedTemplateId(null);
  };
  const handleEdit = templateId => {
    setModalOpen(false);
    setShowForm(true);
    setSelectedTemplateId(templateId);
  };
  const handleInitializeTemplates = async () => {
    try {
      setIsLoading(true);
      const response = await initializeOwnerTemplates();
      if (response?.data?.success) {
        toast.success(`✅ ${response.data.data.templatesCreated} templates initialisés avec succès !`, {
          position: 'top-right',
          autoClose: 3000
        });
        // Refresh templates list
        await fetchTemplates();
      } else {
        toast.error('❌ Échec de l\'initialisation des templates', {
          position: 'top-right',
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || '❌ Erreur lors de l\'initialisation des templates', {
        position: 'top-right',
        autoClose: 3000
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleInitializeSingleTemplate = async (messageName, event) => {
    // Stop propagation pour éviter l'ouverture du modal
    if (event) {
      event.stopPropagation();
    }
    try {
      const response = await initializeSingleTemplate(messageName);
      if (response?.data?.success) {
        toast.success(`✅ Template "${messageName}" initialisé avec succès !`, {
          position: 'top-right',
          autoClose: 3000
        });
        // Refresh templates list
        await fetchTemplates();
      } else {
        toast.error(`❌ Échec de l'initialisation du template "${messageName}"`, {
          position: 'top-right',
          autoClose: 3000
        });
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || `❌ Erreur lors de l'initialisation du template "${messageName}"`, {
        position: 'top-right',
        autoClose: 3000
      });
    }
  };

  // Quick-edit handlers
  const handleStatusClick = (e, template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setStatusDialogOpen(true);
  };
  const handleWhatsappClick = (e, template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setWhatsappDialogOpen(true);
  };
  const handleChannelClick = (e, template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setSelectedChannel(template.channelPriority || 'NO_PRIORITY');
    setChannelDialogOpen(true);
  };
  const handleChannelSave = async () => {
    try {
      const currentTemplate = templates.find(t => t._id === editingTemplate._id);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        channelPriority: selectedChannel,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(editingTemplate._id, updatedTemplateData);
      toast.success(t('Canal mis à jour avec succès'));
      setChannelDialogOpen(false);
      await fetchTemplates();
    } catch (error) {
      toast.error(t('Échec de la mise à jour du canal'));
    }
  };
  const handleConditionClick = (e, template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setConditionDialogOpen(true);
  };
  const handleStatusSave = async () => {
    try {
      const currentTemplate = templates.find(t => t._id === editingTemplate._id);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        enabled: !editingTemplate.enabled,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(editingTemplate._id, updatedTemplateData);
      toast.success(t('Status updated successfully'));
      setStatusDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error(t('Failed to update status'));
    }
  };
  const handleWhatsappSave = async () => {
    try {
      const currentTemplate = templates.find(t => t._id === editingTemplate._id);
      if (!currentTemplate) throw new Error(t('Template not found'));
      const updatedTemplateData = {
        ...currentTemplate,
        whatsappEnabled: !editingTemplate.whatsappEnabled,
        whatsappType: currentTemplate.whatsappType || ""
      };
      delete updatedTemplateData._id;
      await updateMailTemplate(editingTemplate._id, updatedTemplateData);
      toast.success(t('WhatsApp setting updated successfully'));
      setWhatsappDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error(t('Failed to update WhatsApp setting'));
    }
  };
  const handleDeleteConfirmFromModal = templateId => {
    setModalOpen(false);
    setTemplateToDelete(templateId);
    setDeleteConfirmOpen(true);
  };
  const handleFilterChange = (key, value) => {
    // Filter changed
  };
  const filteredTemplates = filterMode === 'admin' && adminOwner ? (() => {
    const adminTemplates = templates.filter(t => t.ownerId === adminOwner._id);
    if (adminTemplates.length === 0) {
      return templates;
    }
    return adminTemplates;
  })() : (() => {
    const nonAdminTemplates = adminOwner ? templates.filter(t => t.ownerId !== adminOwner._id) : templates;
    if (selectedOwner) {
      const filtered = nonAdminTemplates.filter(t => t.ownerId === selectedOwner);
      return filtered;
    }
    return nonAdminTemplates;
  })();

  // Chronological order for templates (guest journey)
  const chronologicalOrder = ['BIENVENUE_APRES_RESERVATION',
  // 1. Welcome - Right after booking
  'RAPPEL_ENREGISTREMENT',
  // 2. Registration reminder - Before arrival
  'CONFIRMATION_ARRIVEE',
  // 3. Arrival instructions - Few days before arrival
  'MESSAGE_BIENVENUE_ARRIVEE',
  // 4. Welcome message - On arrival day
  'RAPPEL_DEPART',
  // 5. Departure reminder - Day before checkout
  'REMERCIEMENT_APRES_SEJOUR',
  // 6. Thank you - After checkout
  'DEMANDE_AVIS' // 7. Review request - Few days after checkout
  ];

  // Apply search filter
  const searchedTemplates = filteredTemplates.filter(template => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return template.messageName?.toLowerCase().includes(search) || template.content?.toLowerCase().includes(search) || template.contentEng?.toLowerCase().includes(search) || template.description?.toLowerCase().includes(search) || owners.find(o => o._id === template.ownerId)?.email?.toLowerCase().includes(search);
  });

  // Sort by displayOrder (customer journey order)
  const sortedTemplates = [...searchedTemplates].sort((a, b) => {
    // Sort by displayOrder first (templates with displayOrder come first)
    const orderA = a.displayOrder ?? 999;
    const orderB = b.displayOrder ?? 999;
    if (orderA !== orderB) return orderA - orderB;

    // If same displayOrder, sort alphabetically by messageName
    return a.messageName?.localeCompare(b.messageName || '') || 0;
  });
  const paginatedTemplates = sortedTemplates.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const adminCount = templates.filter(t => t.ownerId === adminOwner?._id).length;
  const ownersCount = templates.filter(t => t.ownerId !== adminOwner?._id).length;
  const LangPill = ({
    label,
    text,
    empty
  }) => <Tooltip arrow placement="top-start" title={<div style={{
    whiteSpace: 'pre-wrap',
    overflowWrap: 'anywhere'
  }}>
          {text || <span className="font-bold text-red-500">{empty}</span>}
        </div>} slotProps={{
    tooltip: {
      sx: {
        minWidth: 480,
        maxWidth: 840,
        p: 2,
        fontSize: '0.95rem',
        lineHeight: 1.5
      }
    }
  }}>
      <span className={`cursor-pointer select-none px-2 py-0.5 text-xs rounded
          ${text ? 'bg-gray-100 hover:bg-gray-200 text-gray-800' : 'bg-red-100 hover:bg-red-200 text-red-600 font-bold'}`}>
        {label}
      </span>
    </Tooltip>;
  const ownerColumn = {
    header: t('Owner'),
    body: rowData => {
      const owner = owners.find(o => o._id === rowData.ownerId);
      return owner ? <div className="w-full flex justify-center items-center">
          <Tooltip title={t('Owner name', {
          firstName: owner.firstName,
          lastName: owner.lastName
        })}>
            <span className="cursor-pointer">{owner.email}</span>
          </Tooltip>
        </div> : <span className="text-gray-400">{t('No owner')}</span>;
    },
    headerStyle: {
      textAlign: 'center'
    },
    bodyStyle: {
      textAlign: 'center'
    }
  };
  const noWhatsappTemplates = ['CONFIRMATION_RESERVATION_STANDARD', 'CONFIRMATION_RESERVATION_AVEC_LIEN', 'RAPPEL_7_JOURS_AVANT_ARRIVEE', 'RAPPEL_X_JOURS_AVANT_ARRIVEE'];
  const baseColumns = [{
    header: t('Name'),
    body: rowData => {
      // Mapping pour des noms lisibles en français
      const nameMapping = {
        'CONFIRMATION_RESERVATION_AVEC_LIEN': 'Confirmation Réservation',
        'RAPPEL_X_JOURS_AVANT_ARRIVEE': 'Rappel X jours avant arrivée',
        'RAPPEL_ENREGISTREMENT_MANQUANT': 'Rappel Enregistrement',
        'RAPPEL_COMPLET_CLIENT': 'Rappel Complet Client',
        'RAPPEL_HORAIRE_MANQUANT': 'Rappel Horaire Manquant',
        'RAPPEL_DEPART': 'Rappel Départ',
        'RAPPEL_SERVICES_PENDANT_SEJOUR': 'Services Pendant Séjour',
        'RAPPEL_ACTIONS_MANQUANTES': 'Actions Manquantes',
        'SOLLICITATION_NOTE_ABSENTE': 'Demande Avis'
      };
      const displayName = nameMapping[rowData.messageName] || rowData.messageName;
      return <Tooltip title={displayName}>
            <span className="cursor-pointer">{displayName}</span>
          </Tooltip>;
    },
    width: '22ch'
  }, {
    header: t('Status'),
    body: rowData => <div className="w-full flex justify-center items-center">
          <Tooltip title={rowData.enabled ? t('Disable Template') : t('Enable Template')}>
            <Switch disabled={!canUpdate} checked={rowData.enabled} onChange={() => handleToggleEnabled(rowData._id, rowData.enabled)} color="primary" sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} />
          </Tooltip>
        </div>,
    width: 100
  }
  // {
  //   header: t('Type'),
  //   body: (rowData) => (
  //     <Tooltip title={rowData.type || t('No Type')}>
  //       <span className="cursor-pointer">{rowData.type || t('No Type')}</span>
  //     </Tooltip>
  //   ),
  // },
  // {
  //   header: t('Description'),
  //   body: (rowData) => (
  //     <Tooltip title={rowData.description || t('No Description')}>
  //       <span className="cursor-pointer">{rowData.description || t('No Description')}</span>
  //     </Tooltip>
  //   ),
  // },
  ];
  const remainingColumns = [{
    header: t('Messages'),
    body: rowData => <div className="w-full flex justify-center items-center">
          <Tooltip title={rowData.messageEnabled ? t('Disable Messages') : t('Enable Messages')}>
            <Switch disabled={!canUpdate} checked={rowData.messageEnabled} onChange={() => handleToggleMessageEnabled(rowData._id, rowData.messageEnabled)} color="primary" sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} />
          </Tooltip>
        </div>,
    width: 100
  }, {
    header: t('Whatsapp'),
    body: rowData => <div className="w-full flex justify-center items-center">
          <Tooltip title={rowData.whatsappEnabled ? t('Disable Whatsapp') : t('Enable Whatsapp')}>
            {!noWhatsappTemplates.includes(rowData.messageName) && <Switch disabled={!canUpdate} checked={rowData.whatsappEnabled} onChange={() => handleToggleWspEnabled(rowData._id, rowData.whatsappEnabled)} color="primary" sx={{
          '& .MuiSwitch-switchBase.Mui-checked': {
            color: '#00b4b4',
            '&:hover': {
              backgroundColor: 'rgba(0, 180, 180, 0.08)'
            }
          },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#00b4b4'
          }
        }} />}
          </Tooltip>
        </div>,
    width: 100
  }, {
    header: <div className="!mx-auto !w-fit !whitespace-nowrap !text-center">
          {t('Language')}
        </div>,
    body: rowData => {
      const content = rowData.content?.trim();
      const contentEng = rowData.contentEng?.trim();
      const langCount = (content ? 1 : 0) + (contentEng ? 1 : 0);
      return <div className="!mx-auto !w-fit">
            <Tooltip title={t('Languages count', {
          count: langCount
        })}>
              <span className="cursor-pointer">{langCount}</span>
            </Tooltip>
          </div>;
    },
    width: 80
  },
  // {
  //   header: t('Content (French)'),
  //   body: (rowData) => (
  //     <Tooltip title={rowData.content?.trim() || t('No French Content')}>
  //       <div className="max-w-md truncate cursor-pointer">
  //         {rowData.content?.trim() ? (
  //           rowData.content
  //         ) : (
  //           <span className="font-bold text-red-500">{t('No French Content')}</span>
  //         )}
  //       </div>
  //     </Tooltip>
  //   ),
  // },
  // {
  //   header: t('Content (English)'),
  //   body: (rowData) => (
  //     <Tooltip title={rowData.contentEng?.trim() || t('No English Content')}>
  //       <div className="max-w-md truncate cursor-pointer">
  //         {rowData.contentEng?.trim() ? (
  //           rowData.contentEng
  //         ) : (
  //           <span className="font-bold text-red-500">{t('No English Content')}</span>
  //         )}
  //       </div>
  //     </Tooltip>
  //   ),
  // },
  {
    header: <div className="!mx-auto !w-fit !whitespace-nowrap !text-center">
          {t('Content')}
        </div>,
    body: rowData => {
      const fr = rowData.content?.trim();
      const en = rowData.contentEng?.trim();
      return <div className="flex items-center gap-1 !mx-auto !w-fit ">
            <LangPill label="FR" text={fr} empty={t('No French Content')} />
            <span>,</span>
            <LangPill label="ENG" text={en} empty={t('No English Content')} />
          </div>;
    },
    width: 100
  }, {
    header: t('Action'),
    body: rowData => <div className="flex gap-1 items-center !mx-auto !w-fit !text-center">
          {canUpdate && <Tooltip title={t('Edit Template')}>
              <button className="px-2 py-1 rounded-md cursor-pointer" style={{
          backgroundColor: SOJORI_COLORS.primary
        }} onClick={() => handleOpenForm(rowData._id)}>
                <EditOffIcon className="text-white" />
              </button>
            </Tooltip>}
          {canDelete && <Tooltip title={t('Delete Template')}>
              <button className="px-2 py-1 rounded-md cursor-pointer" style={{
          backgroundColor: '#dc3545'
        }} onClick={() => handleDeleteClick(rowData._id)}>
                <DeleteSweepIcon className="text-white" />
              </button>
            </Tooltip>}
        </div>,
    width: 100,
    remove: !canUpdate && !canDelete
  }];
  const columns = isAdmin ? [...baseColumns, ownerColumn, ...remainingColumns] : [...baseColumns, ...remainingColumns];
  const nonAdminOwners = owners.filter(owner => owner.email !== 'admin@gmail.com');
  const SETTINGS_SCOPED_TABS = [...(SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB ? ['description'] : []), 'rules', 'chatbot', 'concierge', 'support', 'tasks'];
  const showSettingsScopeBar = isAdmin && SETTINGS_SCOPED_TABS.includes(activeTab);
  const renderContent = () => {
    if (showSettingsScopeBar && settingsNeedOwnerPick) {
      return <Alert severity="info" sx={{
        mt: 2
      }}>
          {t('Select an owner account to load and edit that owner’s templates (Owner scope).')}
        </Alert>;
    }
    if (error) {
      return <div className="flex items-center justify-center w-full h-64 text-red-500">
          {t(error)}
        </div>;
    }
    if (showForm) {
      return <MailTemplateContainer templateId={selectedTemplateId} onSubmit={handleSubmit} onCancel={handleCloseForm} templates={templates} owners={owners} isAdmin={isAdmin} />;
    }
    switch (activeTab) {
      case 'description':
        if (!SHOW_MAIL_TEMPLATE_DESCRIPTION_TAB) {
          return null;
        }
        return <>
            <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
              {t('Descriptions')}
            </Typography>
            <Description loading={descLoading} descriptions={descriptions} editMode={descEditMode} editData={descEditData} saving={descSaving} onEditClick={handleDescEditClick} onCancelEdit={handleDescCancelEdit} onSave={handleDescSave} onInputChange={handleDescInputChange} onRetry={fetchDescriptions} t={t} canUpdate={canUpdate} />
          </>;
      case 'rules':
        return <>
            <Typography variant="h4" component="h1" className="mb-4" gutterBottom>
              {t('Rules and Info')}
            </Typography>
            <RulesAndInfos loading={rulesLoading} rulesAndInfo={rulesAndInfo} editMode={rulesEditMode} editData={rulesEditData} saving={rulesSaving} onEditClick={handleRulesEditClick} onCancelEdit={handleRulesCancelEdit} onSave={handleRulesSave} onArrayItemChange={handleRulesArrayItemChange} onRetry={fetchRulesAndInfo} t={t} activeTab={activeTab} canUpdate={canUpdate} />
          </>;
      case 'chatbot':
        return <ChatbotMenuTemplate key={`chatbot-${settingsTargetOwnerId}-${settingsRefetchNonce}`} isAdmin={isAdmin} owners={nonAdminOwners} managedOwnerId={isAdmin ? settingsTargetOwnerId : undefined} blockLoad={settingsNeedOwnerPick} t={t} />;
      case 'concierge':
        return <ConciergeServicesTemplate key={`concierge-${settingsTargetOwnerId}-${settingsRefetchNonce}`} isAdmin={isAdmin} owners={nonAdminOwners} managedOwnerId={isAdmin ? settingsTargetOwnerId : undefined} blockLoad={settingsNeedOwnerPick} t={t} />;
      case 'support':
        return <SupportCategoriesTemplate key={`support-${settingsTargetOwnerId}-${settingsRefetchNonce}`} isAdmin={isAdmin} ownerId={isAdmin ? settingsTargetOwnerId : undefined} blockLoad={settingsNeedOwnerPick} t={t} />;
      case 'tasks':
        return <TaskTemplateConfig key={`tasks-${settingsTargetOwnerId}-${settingsRefetchNonce}`} activeTab={activeTab} token={token} managedOwnerId={isAdmin ? settingsTargetOwnerId : undefined} blockLoad={settingsNeedOwnerPick} />;
      default:
        return null;
    }
  };
  return <div className="p-4 card">
      <MailTemplateButtons activeTab={activeTab} setActiveTab={setActiveTab} t={t} showForm={showForm} />
      {showSettingsScopeBar && <Box sx={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 1,
      py: 1.5,
      mt: 1,
      borderBottom: '1px solid rgba(255, 107, 53, 0.15)'
    }}>
          <Chip label={t('Admin template', {
        defaultValue: 'Admin (default template)'
      })} icon={<VerifiedUserIcon />} onClick={() => {
        setSettingsScope('admin');
        setSettingsOwnerId('');
      }} color={settingsScope === 'admin' ? 'primary' : 'default'} sx={{
        fontWeight: 600,
        backgroundColor: settingsScope === 'admin' ? SOJORI_COLORS.primary : 'white',
        color: settingsScope === 'admin' ? 'white' : SOJORI_COLORS.gray[700]
      }} />
          <Chip label={t('Owner account', {
        defaultValue: 'Owner'
      })} icon={<PeopleAltIcon />} onClick={() => setSettingsScope('owner')} color={settingsScope === 'owner' ? 'primary' : 'default'} sx={{
        fontWeight: 600,
        backgroundColor: settingsScope === 'owner' ? SOJORI_COLORS.primary : 'white',
        color: settingsScope === 'owner' ? 'white' : SOJORI_COLORS.gray[700]
      }} />
          {settingsScope === 'owner' && <Autocomplete options={nonAdminOwners} getOptionLabel={option => option.email || ''} value={nonAdminOwners.find(o => o._id === settingsOwnerId) || null} onChange={(e, newValue) => setSettingsOwnerId(newValue ? newValue._id : '')} renderInput={params => <TextField {...params} size="small" placeholder={t('Search by email')} sx={{
        minWidth: 260
      }} />} disableClearable={false} />}
          {settingsScope === 'owner' && settingsOwnerId && isAdmin && <ApplyAdminTemplateToOwnerButton targetOwnerId={settingsOwnerId} onApplied={() => setSettingsRefetchNonce(n => n + 1)} />}
        </Box>}
      {renderContent()}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel} aria-labelledby="alert-dialog-title" aria-describedby="alert-dialog-description">
        <DialogTitle id="alert-dialog-title">
          {t('Delete Template')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {t('Are you sure you want to delete this template? This action cannot be undone.')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} sx={{
          color: SOJORI_COLORS.gray[500],
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryPale
          }
        }}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleDeleteConfirm} autoFocus sx={{
          backgroundColor: '#dc3545',
          color: 'white',
          borderRadius: '4px',
          '&:hover': {
            backgroundColor: '#c82333'
          }
        }}>
            {t('Delete')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-Edit Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        color: SOJORI_COLORS.primary,
        fontWeight: 600
      }}>
          {t('Toggle Status')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editingTemplate?.enabled ? t('Are you sure you want to deactivate this template?') : t('Are you sure you want to activate this template?')}
          </DialogContentText>
          <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: '#FFF3E0',
          borderRadius: 1
        }}>
            <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
              {t(editingTemplate?.messageName)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Current status')}: {editingTemplate?.enabled ? t('Active') : t('Inactive')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleStatusSave} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            {editingTemplate?.enabled ? t('Deactivate') : t('Activate')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-Edit WhatsApp Dialog */}
      <Dialog open={whatsappDialogOpen} onClose={() => setWhatsappDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        color: SOJORI_COLORS.primary,
        fontWeight: 600
      }}>
          {t('Toggle WhatsApp')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {editingTemplate?.whatsappEnabled ? t('Are you sure you want to disable WhatsApp for this template?') : t('Are you sure you want to enable WhatsApp for this template?')}
          </DialogContentText>
          <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: '#FFF3E0',
          borderRadius: 1
        }}>
            <Typography variant="body2" sx={{
            fontWeight: 600
          }}>
              {t(editingTemplate?.messageName)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Current WhatsApp status')}: {editingTemplate?.whatsappEnabled ? t('Enabled') : t('Disabled')}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWhatsappDialogOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleWhatsappSave} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            {editingTemplate?.whatsappEnabled ? t('Disable') : t('Enable')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-Edit Channel Priority Dialog */}
      <Dialog open={channelDialogOpen} onClose={() => setChannelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        color: SOJORI_COLORS.primary,
        fontWeight: 600
      }}>
          📬 {t('Choisir le canal d\'envoi')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{
          mt: 2,
          mb: 3,
          p: 2,
          bgcolor: '#FFF3E0',
          borderRadius: 2
        }}>
            <Typography variant="body2" sx={{
            fontWeight: 600,
            mb: 0.5
          }}>
              {editingTemplate?.description || t(editingTemplate?.messageName)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('Message actuel')}
            </Typography>
          </Box>

          <Typography variant="body2" sx={{
          mb: 2,
          color: 'text.secondary'
        }}>
            {t('Sélectionnez comment ce message doit être envoyé aux clients :')}
          </Typography>

          <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5
        }}>
            <Box onClick={() => setSelectedChannel('NO_PRIORITY')} sx={{
            p: 2,
            border: 2,
            borderColor: selectedChannel === 'NO_PRIORITY' ? SOJORI_COLORS.primary : '#e0e0e0',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: selectedChannel === 'NO_PRIORITY' ? '#FFF3E0' : 'white',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: SOJORI_COLORS.primary,
              bgcolor: '#FFF3E0'
            }
          }}>
              <Typography variant="body1" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                🔄 {t('Orchestrateur décide')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Laisse l\'orchestrateur choisir selon le contexte (recommandé pour messages pendant le séjour)')}
              </Typography>
            </Box>

            <Box onClick={() => setSelectedChannel('OTA_ONLY')} sx={{
            p: 2,
            border: 2,
            borderColor: selectedChannel === 'OTA_ONLY' ? SOJORI_COLORS.primary : '#e0e0e0',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: selectedChannel === 'OTA_ONLY' ? '#FFF3E0' : 'white',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: SOJORI_COLORS.primary,
              bgcolor: '#FFF3E0'
            }
          }}>
              <Typography variant="body1" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                📧 {t('OTA uniquement (email)')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Envoyer uniquement par email OTA (ex: Welcome, Review)')}
              </Typography>
            </Box>

            <Box onClick={() => setSelectedChannel('WHATSAPP_ONLY')} sx={{
            p: 2,
            border: 2,
            borderColor: selectedChannel === 'WHATSAPP_ONLY' ? SOJORI_COLORS.primary : '#e0e0e0',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: selectedChannel === 'WHATSAPP_ONLY' ? '#FFF3E0' : 'white',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: SOJORI_COLORS.primary,
              bgcolor: '#FFF3E0'
            }
          }}>
              <Typography variant="body1" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                💬 {t('WhatsApp uniquement')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Envoyer uniquement via WhatsApp')}
              </Typography>
            </Box>

            <Box onClick={() => setSelectedChannel('OTA_PRIORITY')} sx={{
            p: 2,
            border: 2,
            borderColor: selectedChannel === 'OTA_PRIORITY' ? SOJORI_COLORS.primary : '#e0e0e0',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: selectedChannel === 'OTA_PRIORITY' ? '#FFF3E0' : 'white',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: SOJORI_COLORS.primary,
              bgcolor: '#FFF3E0'
            }
          }}>
              <Typography variant="body1" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                📧→ {t('Priorité OTA')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Essayer OTA d\'abord, puis WhatsApp si échec')}
              </Typography>
            </Box>

            <Box onClick={() => setSelectedChannel('WHATSAPP_PRIORITY')} sx={{
            p: 2,
            border: 2,
            borderColor: selectedChannel === 'WHATSAPP_PRIORITY' ? SOJORI_COLORS.primary : '#e0e0e0',
            borderRadius: 2,
            cursor: 'pointer',
            bgcolor: selectedChannel === 'WHATSAPP_PRIORITY' ? '#FFF3E0' : 'white',
            transition: 'all 0.2s',
            '&:hover': {
              borderColor: SOJORI_COLORS.primary,
              bgcolor: '#FFF3E0'
            }
          }}>
              <Typography variant="body1" sx={{
              fontWeight: 600,
              mb: 0.5
            }}>
                💬→ {t('Priorité WhatsApp')}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('Essayer WhatsApp d\'abord, puis OTA si échec')}
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{
        px: 3,
        pb: 3
      }}>
          <Button onClick={() => setChannelDialogOpen(false)} sx={{
          color: 'text.secondary'
        }}>
            {t('Annuler')}
          </Button>
          <Button onClick={handleChannelSave} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          },
          px: 3
        }}>
            {t('Enregistrer')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Quick-Edit Condition Dialog - Opens Full Edit Page */}
      <Dialog open={conditionDialogOpen} onClose={() => setConditionDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
        color: SOJORI_COLORS.primary,
        fontWeight: 600
      }}>
          {t('Edit Condition')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('To edit the sending conditions, you will be redirected to the full edit page where you can configure timing settings.')}
          </DialogContentText>
          <Box sx={{
          mt: 2,
          p: 2,
          bgcolor: '#FFF3E0',
          borderRadius: 1
        }}>
            <Typography variant="body2" sx={{
            fontWeight: 600,
            mb: 1
          }}>
              {t(editingTemplate?.messageName)}
            </Typography>
            <Typography variant="caption" sx={{
            whiteSpace: 'pre-line'
          }}>
              {(() => {
              if (!editingTemplate) return '';
              const template = editingTemplate;
              const conditions = [];
              if (template.reservation?.immediately?.enabled) {
                conditions.push(t('Immediately after booking'));
              }
              if (template.reservation?.after?.enabled) {
                const {
                  day,
                  hours,
                  minutes
                } = template.reservation.after;
                conditions.push(`${day || 0}j ${hours || 0}h ${minutes || 0}m ${t('after booking')}`);
              }
              if (template.arrivalDate?.before?.enabled) {
                const {
                  day,
                  hours,
                  minutes
                } = template.arrivalDate.before;
                conditions.push(`${day || 0}j ${hours || 0}h ${minutes || 0}m ${t('before arrival')}`);
              }
              if (template.arrivalDate?.after?.enabled) {
                const {
                  day,
                  hours,
                  minutes
                } = template.arrivalDate.after;
                conditions.push(`${day || 0}j ${hours || 0}h ${minutes || 0}m ${t('after arrival')}`);
              }
              if (template.departureDate?.before?.enabled) {
                const {
                  day,
                  hours,
                  minutes
                } = template.departureDate.before;
                conditions.push(`${day || 0}j ${hours || 0}h ${minutes || 0}m ${t('before departure')}`);
              }
              if (template.departureDate?.after?.enabled) {
                const {
                  day,
                  hours,
                  minutes
                } = template.departureDate.after;
                conditions.push(`${day || 0}j ${hours || 0}h ${minutes || 0}m ${t('after departure')}`);
              }
              return conditions.length > 0 ? conditions.join('\n') : t('No condition');
            })()}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConditionDialogOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={() => {
          setConditionDialogOpen(false);
          handleEdit(editingTemplate._id);
        }} variant="contained" sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
            {t('Edit Conditions')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>;
};
export default MailTemplates;
