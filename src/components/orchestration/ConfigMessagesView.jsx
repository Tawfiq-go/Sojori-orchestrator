import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, CircularProgress, Button, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Switch, Autocomplete, TextField, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Paper, Chip, IconButton, InputAdornment } from '@mui/material';
import { styled } from '@mui/material/styles';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import { Search as SearchIcon, Add as AddIcon, Visibility as VisibilityIcon, Email as EmailIcon, CheckCircle as CheckIcon, Cancel as CancelIcon, Edit as EditIcon, CleaningServices as CleanIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { getOrchestratorMailTemplates, updateOrchestratorMailTemplate, createOrchestratorMailTemplate, deleteOrchestratorMailTemplate, migrateMailTemplates, cleanupDuplicateTemplates, syncTemplateNames } from '../../features/setting/services/serverApi.orchestratorConfig';
import { hasAdminAccess } from '../../utils/rbac.utils';
import { useSelector } from 'react-redux';
import { getOwners } from '../../features/staff/services/serverApi.task';
import { can } from '../../utils/permissions';
import MailTemplateContainer from '../../features/setting/components/MailTemplateContainer';
import TemplateDetailModal from '../../features/setting/components/TemplateDetailModal';
import '../../features/setting/styles/MailTemplates.css';
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
const ConfigMessagesView = () => {
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);
  const [owners, setOwners] = useState([]);
  const [selectedOwner, setSelectedOwner] = useState('');
  const [filterMode, setFilterMode] = useState('admin');
  const [canCreate] = useState(can('create'));
  const [canUpdate] = useState(can('update'));
  const [canDelete] = useState(can('delete'));

  // New states for modernized message tab
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Quick-edit popup states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState('NO_PRIORITY');

  // New filter states
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [channelFilter, setChannelFilter] = useState('all'); // all, email, whatsapp, both

  useEffect(() => {
    fetchTemplates();
    if (isAdmin) {
      fetchOwners();
    }
  }, []);
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
      const response = await getOrchestratorMailTemplates();
      if (response.data.success) {
        const templates = response.data.data;
        setTemplates(templates);
        // Log source des libellés : colonne "Template" = t(messageName) i18n, colonne "description" = displayLabel/description API
        if (templates.length > 0 && import.meta.env.DEV) {
          const sample = templates.find(t => t.messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE') || templates[0];
        }
      } else {
        throw new Error(t('Failed to fetch templates'));
      }
    } catch (error) {
      // Silently handle - empty state is expected before seeding
    } finally {
      setIsLoading(false);
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
      await updateOrchestratorMailTemplate(templateId, updatedTemplateData);
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
      await updateOrchestratorMailTemplate(templateId, updatedTemplateData);
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
      await updateOrchestratorMailTemplate(templateId, updatedTemplateData);
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
        await updateOrchestratorMailTemplate(finalTemplateId, dataToSubmit);
        toast.success(t('Template updated successfully'));
      } else {
        await createOrchestratorMailTemplate(dataToSubmit);
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
      await deleteOrchestratorMailTemplate(templateToDelete);
      setTemplates(prev => prev.filter(t => t._id !== templateToDelete));
      toast.success(t('Template deleted successfully'));
    } catch (error) {
      toast.error(t('Failed to delete template'));
    } finally {
      setDeleteConfirmOpen(false);
      setTemplateToDelete(null);
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
  const handleCleanupDuplicates = async () => {
    if (!window.confirm(t('Are you sure you want to remove duplicate templates? Only the most recent version of each template will be kept.'))) {
      return;
    }
    setIsLoading(true);
    try {
      const result = await cleanupDuplicateTemplates();
      if (result.success) {
        toast.success(`${t('Successfully removed')} ${result.removed} ${t('duplicate templates')}`);
        await fetchTemplates(); // Refresh the list
      } else {
        throw new Error(result.message || t('Cleanup failed'));
      }
    } catch (error) {
      toast.error(t('Failed to cleanup duplicates'));
    } finally {
      setIsLoading(false);
    }
  };
  const handleSyncTemplateNames = async () => {
    setIsLoading(true);
    try {
      const result = await syncTemplateNames();
      if (result.success) {
        const {
          updatedDescriptions = 0,
          addedRappelXToOwners = 0
        } = result.data || {};
        toast.success((updatedDescriptions > 0 ? `${updatedDescriptions} descriptions mises à jour` : '') + (addedRappelXToOwners > 0 ? ` • RAPPEL_X_JOURS ajouté à ${addedRappelXToOwners} owner(s)` : '') || t('Sync terminé'));
        await fetchTemplates();
      } else {
        throw new Error(result.error || t('Sync failed'));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('Failed to sync template names'));
    } finally {
      setIsLoading(false);
    }
  };
  const handleEdit = templateId => {
    setModalOpen(false);
    setShowForm(true);
    setSelectedTemplateId(templateId);
  };

  // Quick-edit handlers
  const handleStatusClick = (e, template) => {
    e.stopPropagation();
    setEditingTemplate(template);
    setStatusDialogOpen(true);
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
      await updateOrchestratorMailTemplate(editingTemplate._id, updatedTemplateData);
      toast.success(t('Canal mis à jour avec succès'));
      setChannelDialogOpen(false);
      await fetchTemplates();
    } catch (error) {
      toast.error(t('Échec de la mise à jour du canal'));
    }
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
      await updateOrchestratorMailTemplate(editingTemplate._id, updatedTemplateData);
      toast.success(t('Status updated successfully'));
      setStatusDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      toast.error(t('Failed to update status'));
    }
  };
  const handleDeleteConfirmFromModal = templateId => {
    setModalOpen(false);
    setTemplateToDelete(templateId);
    setDeleteConfirmOpen(true);
  };
  const adminOwner = owners.find(owner => owner.email === 'admin@gmail.com');
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

  // Apply search filter
  const searchedTemplates = filteredTemplates.filter(template => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = template.messageName?.toLowerCase().includes(search) || template.content?.toLowerCase().includes(search) || template.contentEng?.toLowerCase().includes(search) || template.description?.toLowerCase().includes(search) || template.title?.toLowerCase().includes(search) || template.titleEng?.toLowerCase().includes(search) || template.titleSuggestion?.toLowerCase().includes(search) || template.titleSuggestionEng?.toLowerCase().includes(search) || owners.find(o => o._id === template.ownerId)?.email?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }

    // Status filter
    if (statusFilter === 'active' && !template.enabled) return false;
    if (statusFilter === 'inactive' && template.enabled) return false;

    // Channel filter
    if (channelFilter !== 'all') {
      const hasEmail = template.messageEnabled && template.content;
      const hasWhatsApp = template.whatsappEnabled && template.whatsappContent;
      if (channelFilter === 'email' && !hasEmail) return false;
      if (channelFilter === 'whatsapp' && !hasWhatsApp) return false;
      if (channelFilter === 'both' && (!hasEmail || !hasWhatsApp)) return false;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: searchedTemplates.length,
    active: searchedTemplates.filter(t => t.enabled).length,
    inactive: searchedTemplates.filter(t => !t.enabled).length,
    email: searchedTemplates.filter(t => t.messageEnabled && t.content).length,
    whatsapp: searchedTemplates.filter(t => t.whatsappEnabled && t.whatsappContent).length,
    both: searchedTemplates.filter(t => t.messageEnabled && t.content && t.whatsappEnabled && t.whatsappContent).length
  };

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
  const nonAdminOwners = owners.filter(owner => owner.email !== 'admin@gmail.com');
  if (showForm) {
    return <MailTemplateContainer templateId={selectedTemplateId} onSubmit={handleSubmit} onCancel={handleCloseForm} templates={templates} owners={owners} isAdmin={isAdmin} useOrchestratorApi />;
  }
  const showCreateButton = !showForm;
  return <Box sx={{
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  }}>
      {/* Titre remplacé par onglets Modèles | Messages dans OrchestratorConfigContent (bas gauche) */}

      {/* Statistics Cards - compact */}
      <Box sx={{
      display: 'flex',
      gap: 1.5,
      px: 2,
      py: 1.5,
      bgcolor: '#F5F5F5',
      borderBottom: 1,
      borderColor: 'divider'
    }}>
        <Box sx={{
        flex: 1,
        bgcolor: 'white',
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
          <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: '#E3F2FD',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
            📊
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: '#1976D2'
          }}>
              {stats.total}
            </Typography>
            <Typography variant="caption" sx={{
            color: '#666'
          }}>
              Templates Total
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{
        flex: 1,
        bgcolor: 'white',
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
          <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: '#E8F5E9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
            ✅
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: '#4CAF50'
          }}>
              {stats.active}
            </Typography>
            <Typography variant="caption" sx={{
            color: '#666'
          }}>
              Actifs
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{
        flex: 1,
        bgcolor: 'white',
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
          <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: '#FFF3E0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
            📧
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: '#FF9800'
          }}>
              {stats.email}
            </Typography>
            <Typography variant="caption" sx={{
            color: '#666'
          }}>
              Email
            </Typography>
          </Box>
        </Box>
        
        <Box sx={{
        flex: 1,
        bgcolor: 'white',
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
          <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: '#E8F5E9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
            💬
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: '#4CAF50'
          }}>{stats.whatsapp}</Typography>
            <Typography variant="caption" sx={{
            color: '#666'
          }}>WhatsApp</Typography>
          </Box>
        </Box>
        <Box sx={{
        flex: 1,
        bgcolor: 'white',
        p: 1.5,
        borderRadius: 1.5,
        border: '1px solid #E0E0E0',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
          <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '10px',
          bgcolor: '#F3E5F5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.25rem'
        }}>
            🔄
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{
            fontWeight: 700,
            color: '#9C27B0'
          }}>{stats.both}</Typography>
            <Typography variant="caption" sx={{
            color: '#666'
          }}>Multi-canal</Typography>
          </Box>
        </Box>
      </Box>

      {/* Filter Bar - Enhanced */}
      <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      px: 2,
      py: 1.5,
      bgcolor: 'white',
      borderBottom: 1,
      borderColor: 'divider',
      flexWrap: 'wrap'
    }}>
        <Box sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        flex: 1,
        minWidth: 0,
        flexWrap: 'wrap'
      }}>
          {/* Search - Enhanced */}
          <TextField placeholder={t('Rechercher un template...')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} size="small" sx={{
          width: 280,
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px'
          }
        }} InputProps={{
          startAdornment: <InputAdornment position="start">
                  <SearchIcon sx={{
              color: SOJORI_COLORS.gray[500],
              fontSize: '1.3rem'
            }} />
                </InputAdornment>
        }} />
          
          {/* Status Filter */}
          <Box sx={{
          display: 'flex',
          gap: 0.5,
          alignItems: 'center'
        }}>
            <Typography variant="caption" sx={{
            color: '#666',
            fontWeight: 600,
            mr: 0.5
          }}>
              Statut:
            </Typography>
            <Button size="small" variant={statusFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('all')} sx={{
            minWidth: 70,
            borderRadius: '6px',
            textTransform: 'none',
            ...(statusFilter === 'all' && {
              bgcolor: SOJORI_COLORS.primary,
              '&:hover': {
                bgcolor: SOJORI_COLORS.primaryDark
              }
            })
          }}>
              Tous
            </Button>
            <Button size="small" variant={statusFilter === 'active' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('active')} sx={{
            minWidth: 70,
            borderRadius: '6px',
            textTransform: 'none',
            ...(statusFilter === 'active' && {
              bgcolor: '#4CAF50',
              color: 'white',
              '&:hover': {
                bgcolor: '#45A049'
              }
            })
          }}>
              ✅ Actifs
            </Button>
            <Button size="small" variant={statusFilter === 'inactive' ? 'contained' : 'outlined'} onClick={() => setStatusFilter('inactive')} sx={{
            minWidth: 80,
            borderRadius: '6px',
            textTransform: 'none',
            ...(statusFilter === 'inactive' && {
              bgcolor: '#9E9E9E',
              color: 'white',
              '&:hover': {
                bgcolor: '#757575'
              }
            })
          }}>
              ⏸️ Inactifs
            </Button>
          </Box>
          
          {/* Channel Filter */}
          <Box sx={{
          display: 'flex',
          gap: 0.5,
          alignItems: 'center'
        }}>
            <Typography variant="caption" sx={{
            color: '#666',
            fontWeight: 600,
            mr: 0.5
          }}>
              Canal:
            </Typography>
            <Button size="small" variant={channelFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setChannelFilter('all')} sx={{
            minWidth: 70,
            borderRadius: '6px',
            textTransform: 'none',
            ...(channelFilter === 'all' && {
              bgcolor: SOJORI_COLORS.primary,
              '&:hover': {
                bgcolor: SOJORI_COLORS.primaryDark
              }
            })
          }}>
              Tous
            </Button>
            <Button size="small" variant={channelFilter === 'email' ? 'contained' : 'outlined'} onClick={() => setChannelFilter('email')} sx={{
            minWidth: 70,
            borderRadius: '6px',
            textTransform: 'none',
            ...(channelFilter === 'email' && {
              bgcolor: '#FF9800',
              color: 'white',
              '&:hover': {
                bgcolor: '#F57C00'
              }
            })
          }}>
              📧 Email
            </Button>
            <Button size="small" variant={channelFilter === 'whatsapp' ? 'contained' : 'outlined'} onClick={() => setChannelFilter('whatsapp')} sx={{
            minWidth: 90,
            borderRadius: '6px',
            textTransform: 'none',
            ...(channelFilter === 'whatsapp' && {
              bgcolor: '#25D366',
              color: 'white',
              '&:hover': {
                bgcolor: '#128C7E'
              }
            })
          }}>
              💬 WhatsApp
            </Button>
            <Button size="small" variant={channelFilter === 'both' ? 'contained' : 'outlined'} onClick={() => setChannelFilter('both')} sx={{
            minWidth: 70,
            borderRadius: '6px',
            textTransform: 'none',
            ...(channelFilter === 'both' && {
              bgcolor: '#9C27B0',
              color: 'white',
              '&:hover': {
                bgcolor: '#7B1FA2'
              }
            })
          }}>
              🔄 Les 2
            </Button>
          </Box>

          {/* Orchestrator Filter - Always visible */}
          <Chip label="Orchestrator" onClick={() => {
          setFilterMode('orchestrator');
          setSelectedOwner('');
        }} color={filterMode === 'orchestrator' ? 'primary' : 'default'} icon={<EmailIcon />} sx={{
          backgroundColor: filterMode === 'orchestrator' ? SOJORI_COLORS.primary : 'white',
          color: filterMode === 'orchestrator' ? 'white' : SOJORI_COLORS.gray[700],
          fontWeight: 500,
          '&:hover': {
            backgroundColor: filterMode === 'orchestrator' ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.primaryPale
          }
        }} />

          {/* Admin/Owner Filters */}
          {isAdmin && <>
              <Chip label={`Admin (${adminCount})`} onClick={() => {
            setFilterMode('admin');
            setSelectedOwner('');
          }} color={filterMode === 'admin' ? 'primary' : 'default'} icon={<VerifiedUserIcon />} sx={{
            backgroundColor: filterMode === 'admin' ? SOJORI_COLORS.primary : 'white',
            color: filterMode === 'admin' ? 'white' : SOJORI_COLORS.gray[700],
            fontWeight: 500,
            '&:hover': {
              backgroundColor: filterMode === 'admin' ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.primaryPale
            }
          }} />
              <Chip label={`Owners (${ownersCount})`} onClick={() => {
            setFilterMode('owners');
            setSelectedOwner('');
          }} color={filterMode === 'owners' ? 'primary' : 'default'} icon={<PeopleAltIcon />} sx={{
            backgroundColor: filterMode === 'owners' ? SOJORI_COLORS.primary : 'white',
            color: filterMode === 'owners' ? 'white' : SOJORI_COLORS.gray[700],
            fontWeight: 500,
            '&:hover': {
              backgroundColor: filterMode === 'owners' ? SOJORI_COLORS.primaryDark : SOJORI_COLORS.primaryPale
            }
          }} />
              {filterMode === 'owners' && <Autocomplete options={nonAdminOwners} getOptionLabel={option => option.email} value={nonAdminOwners.find(o => o._id === selectedOwner) || null} onChange={(event, newValue) => {
            setSelectedOwner(newValue ? newValue._id : '');
          }} renderInput={params => <TextField {...params} variant="outlined" placeholder={t('Search by email')} size="small" sx={{
            width: '192px'
          }} />} disableClearable={false} />}
            </>}
        </Box>

        {/* Action Buttons - Compact */}
        <Box sx={{
        display: 'flex',
        gap: 1
      }}>
          {isAdmin && <>
              <Button variant="outlined" size="small" onClick={handleSyncTemplateNames} sx={{
            borderColor: '#2196F3',
            color: '#2196F3',
            '&:hover': {
              borderColor: '#1976D2',
              backgroundColor: '#E3F2FD'
            }
          }}>
                {t('Sync noms & RAPPEL_X')}
              </Button>
              <Button variant="outlined" size="small" startIcon={<CleanIcon />} onClick={handleCleanupDuplicates} sx={{
            borderColor: '#FF9800',
            color: '#FF9800',
            '&:hover': {
              borderColor: '#F57C00',
              backgroundColor: '#FFF3E0'
            }
          }}>
                {t('Cleanup Duplicates')}
              </Button>
            </>}
          {canCreate && showCreateButton && <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleCreate} sx={{
          backgroundColor: SOJORI_COLORS.primary,
          '&:hover': {
            backgroundColor: SOJORI_COLORS.primaryDark
          }
        }}>
              {t('Create')}
            </Button>}
        </Box>
      </Box>

      {/* Table Container - With overflow */}
      {isLoading ? <Box sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1
    }}>
          <CircularProgress sx={{
        color: SOJORI_COLORS.primary
      }} />
        </Box> : <Box sx={{
      flex: 1,
      overflow: 'auto',
      px: 2,
      py: 1
    }}>
          <TableContainer component={Paper} sx={{
        maxHeight: '100%',
        overflow: 'auto',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
      }}>
            <Table stickyHeader size="medium" sx={{
          '& .MuiTableCell-root': {
            py: 0.75,
            px: 1.5,
            fontSize: '0.8125rem'
          }
        }}>
              <TableHead>
                <TableRow sx={{
              '& .MuiTableCell-head': {
                bgcolor: '#F8F9FA',
                borderBottom: '2px solid #E0E0E0',
                fontWeight: 700,
                color: '#424242',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px'
              }
            }}>
                  <TableCell sx={{
                width: 220,
                minWidth: 200
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                      📌
                      {t('Titre')}
                    </Box>
                  </TableCell>
                  <TableCell sx={{
                width: 380,
                minWidth: 380
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                      <EmailIcon sx={{
                    fontSize: '1rem',
                    color: '#666'
                  }} />
                      {t('Template')}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{
                width: 100
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifyContent: 'center'
                }}>
                      <CheckIcon sx={{
                    fontSize: '1rem',
                    color: '#666'
                  }} />
                      {t('Statut')}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{
                width: 80
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifyContent: 'center'
                }}>
                      🌐
                      {t('Langues')}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{
                width: 180
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifyContent: 'center'
                }}>
                      📡
                      {t('Canal de Diffusion')}
                    </Box>
                  </TableCell>
                  <TableCell sx={{
                minWidth: 300
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                      📝
                      {t('Description')}
                    </Box>
                  </TableCell>
                  <TableCell align="center" sx={{
                width: 140
              }}>
                    <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  justifyContent: 'center'
                }}>
                      ⚙️
                      {t('Actions')}
                    </Box>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedTemplates.length === 0 ? <TableRow>
                    <TableCell colSpan={8} align="center" sx={{
                py: 8
              }}>
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        Aucun template trouvé
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{
                  mb: 3
                }}>
                        {filterMode === 'orchestrator' ? "Cliquez sur 'Initialiser les templates' pour créer vos templates personnalisés" : "Créez votre premier template"}
                      </Typography>
                    </TableCell>
                  </TableRow> : paginatedTemplates.map((template, index) => {
              const owner = owners.find(o => o._id === template.ownerId);
              return <TableRow key={template._id} hover onClick={() => handleRowClick(template)} sx={{
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#FFF8F0',
                  transform: 'scale(1.001)',
                  transition: 'all 0.2s ease'
                },
                bgcolor: index % 2 === 0 ? 'white' : '#FAFAFA'
              }}>
                      {/* Titre - Sujet email/OTA */}
                      <TableCell sx={{
                  minWidth: 180
                }}>
                        <Typography variant="body2" sx={{
                    fontSize: '0.875rem',
                    color: '#424242'
                  }}>
                          {template.title || template.titleEng || template.titleSuggestion || '—'}
                        </Typography>
                        {!template.title && !template.titleEng && template.titleSuggestion && <Typography variant="caption" sx={{
                    color: '#999',
                    fontStyle: 'italic'
                  }}>
                            Proposition
                          </Typography>}
                      </TableCell>

                      {/* Name - Enhanced */}
                      <TableCell>
                        <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}>
                          <Box sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '6px',
                      bgcolor: '#E3F2FD',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                            <EmailIcon sx={{
                        fontSize: '1.1rem',
                        color: '#1976D2'
                      }} />
                          </Box>
                          <Box>
                            {/* Template: affichage prioritaire displayLabel (aligné dropdown Config), sinon libellé i18n court */}
                            <Typography variant="body2" sx={{
                        fontWeight: 600,
                        color: '#212121'
                      }}>
                              {template.displayLabel || t(template.messageName)}
                            </Typography>
                            {template.configurationSource === 'AI' && <Chip label="🤖 Généré par IA" size="small" sx={{
                        mt: 0.5,
                        height: 18,
                        fontSize: '0.65rem',
                        bgcolor: '#E8EAF6',
                        color: '#3F51B5',
                        fontWeight: 600
                      }} />}
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Status - Enhanced */}
                      <TableCell align="center">
                        <Chip label={template.enabled ? 'Actif' : 'Inactif'} size="small" icon={template.enabled ? <CheckIcon /> : <CancelIcon />} onClick={e => {
                    e.stopPropagation();
                    handleStatusClick(e, template);
                  }} sx={{
                    cursor: 'pointer',
                    fontWeight: 600,
                    borderRadius: '6px',
                    ...(template.enabled ? {
                      bgcolor: '#E8F5E9',
                      color: '#2E7D32',
                      border: '1px solid #A5D6A7',
                      '&:hover': {
                        bgcolor: '#C8E6C9',
                        boxShadow: '0 2px 4px rgba(46,125,50,0.2)'
                      }
                    } : {
                      bgcolor: '#F5F5F5',
                      color: '#757575',
                      border: '1px solid #E0E0E0',
                      '&:hover': {
                        bgcolor: '#E0E0E0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                      }
                    })
                  }} />
                      </TableCell>

                      {/* Languages - Enhanced */}
                      <TableCell align="center">
                        <Box sx={{
                    display: 'flex',
                    gap: 0.5,
                    justifyContent: 'center'
                  }}>
                          {template.content && <Chip label="🇫🇷" size="small" sx={{
                      width: 32,
                      height: 24,
                      fontSize: '1rem',
                      bgcolor: '#E8EAF6',
                      border: '1px solid #C5CAE9',
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }} />}
                          {template.contentEng && <Chip label="🇬🇧" size="small" sx={{
                      width: 32,
                      height: 24,
                      fontSize: '1rem',
                      bgcolor: '#E3F2FD',
                      border: '1px solid #BBDEFB',
                      '& .MuiChip-label': {
                        px: 0.5
                      }
                    }} />}
                          {!template.content && !template.contentEng && <Typography variant="caption" sx={{
                      color: '#999'
                    }}>
                              Aucune
                            </Typography>}
                        </Box>
                      </TableCell>

                      {/* Canal & Priorité - Enhanced */}
                      <TableCell align="center" onClick={e => {
                  e.stopPropagation();
                  handleChannelClick(e, template);
                }} sx={{
                  cursor: 'pointer'
                }}>
                        {(() => {
                    const hasEmail = template.messageEnabled && template.content;
                    const hasWhatsApp = template.whatsappEnabled && template.whatsappContent;
                    const priority = template.channelPriority || 'NO_PRIORITY';
                    if (!hasEmail && !hasWhatsApp) {
                      return <Chip label="⚠️ Aucun canal" size="small" sx={{
                        bgcolor: '#FFEBEE',
                        color: '#C62828',
                        border: '1px solid #FFCDD2',
                        fontWeight: 600,
                        borderRadius: '6px'
                      }} />;
                    }
                    let bgColor, textColor, borderColor, icon, label;
                    if (hasEmail && hasWhatsApp) {
                      if (priority === 'OTA_PRIORITY') {
                        bgColor = '#FFF3E0';
                        textColor = '#E65100';
                        borderColor = '#FFE0B2';
                        icon = '📧';
                        label = 'Priorité Email';
                      } else if (priority === 'WHATSAPP_PRIORITY') {
                        bgColor = '#E8F5E9';
                        textColor = '#1B5E20';
                        borderColor = '#C8E6C9';
                        icon = '💬';
                        label = 'Priorité WhatsApp';
                      } else if (priority === 'WHATSAPP_ONLY') {
                        bgColor = '#E8F5E9';
                        textColor = '#1B5E20';
                        borderColor = '#A5D6A7';
                        icon = '💬';
                        label = 'WhatsApp Seul';
                      } else if (priority === 'OTA_ONLY') {
                        bgColor = '#FFF3E0';
                        textColor = '#E65100';
                        borderColor = '#FFCC80';
                        icon = '📧';
                        label = 'Email Seul';
                      } else {
                        bgColor = '#F3E5F5';
                        textColor = '#6A1B9A';
                        borderColor = '#E1BEE7';
                        icon = '🔄';
                        label = 'Auto (Orchestrateur)';
                      }
                    } else if (hasEmail) {
                      bgColor = '#FFF3E0';
                      textColor = '#E65100';
                      borderColor = '#FFCC80';
                      icon = '📧';
                      label = 'Email uniquement';
                    } else {
                      bgColor = '#E8F5E9';
                      textColor = '#1B5E20';
                      borderColor = '#A5D6A7';
                      icon = '💬';
                      label = 'WhatsApp uniquement';
                    }
                    return <Chip label={`${icon} ${label}`} size="small" sx={{
                      bgcolor: bgColor,
                      color: textColor,
                      border: `1px solid ${borderColor}`,
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      borderRadius: '6px',
                      '&:hover': {
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transform: 'translateY(-1px)',
                        transition: 'all 0.2s ease'
                      }
                    }} />;
                  })()}
                      </TableCell>

                      {/* Description - Enhanced */}
                      <TableCell>
                        <Tooltip title={template.displayLabel || template.description || 'Aucune description'} placement="top" arrow>
                          <Box>
                            <Typography variant="body2" sx={{
                        fontSize: '0.875rem',
                        color: '#424242',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                              {template.displayLabel || template.description || (() => {
                          const descriptions = {
                            'MESSAGE_BIENVENUE': '👋 Message de bienvenue après réservation confirmée',
                            'RAPPEL_ENREGISTREMENT_MANQUANT': '🔐 Rappel si enregistrement non complété',
                            'RAPPEL_HORAIRE_MANQUANT': '🚪 Rappel pour choisir heure d\'arrivée',
                            'MESSAGE_METEO_AVANT_ARRIVEE': '🌤️ Info météo locale 2-3 jours avant arrivée',
                            'MESSAGE_RECOMMANDATIONS_LOCALES': '📍 Recommandations locales 1-2 jours avant arrivée',
                            'RAPPEL_X_JOURS_AVANT_ARRIVEE': '📍 Rappel complet avant arrivée (bienvenue, enregistrement, horaire, météo)',
                            'MESSAGE_FEEDBACK_SEJOUR': '💬 Demande de feedback pendant le séjour',
                            'RAPPEL_DEPART': '👋 Rappel départ avec instructions checkout',
                            'MESSAGE_INSTRUCTION_DEPART': '📋 Consignes listing (messageCheckout) + taxe séjour + heure checkout',
                            'MESSAGE_DEMANDE_AVIS_OTA': '⭐ Demande avis OTA 2-3 jours après départ',
                            'REMERCIEMENT_REVIEW_POSITIF': '🙏 Remerciement après le départ'
                          };
                          return descriptions[template.messageName] || template.description || 'Template personnalisé';
                        })()}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>

                      {/* Actions - Enhanced */}
                      <TableCell align="center">
                        <Box display="flex" justifyContent="center" gap={0.75}>
                          <Tooltip title="Voir les détails" arrow placement="top">
                            <IconButton size="small" onClick={e => {
                        e.stopPropagation();
                        handleRowClick(template);
                      }} sx={{
                        bgcolor: '#E3F2FD',
                        color: '#1976D2',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: '#BBDEFB',
                          transform: 'scale(1.1)',
                          transition: 'all 0.2s ease'
                        }
                      }}>
                              <VisibilityIcon sx={{
                          fontSize: '1rem'
                        }} />
                            </IconButton>
                          </Tooltip>
                          {canUpdate && <Tooltip title="Modifier le template" arrow placement="top">
                              <IconButton size="small" onClick={e => {
                        e.stopPropagation();
                        handleEdit(template._id);
                      }} sx={{
                        bgcolor: '#FFF3E0',
                        color: SOJORI_COLORS.primary,
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: '#FFE0B2',
                          transform: 'scale(1.1)',
                          transition: 'all 0.2s ease'
                        }
                      }}>
                                <EditIcon sx={{
                          fontSize: '1rem'
                        }} />
                              </IconButton>
                            </Tooltip>}
                          {canDelete && <Tooltip title="Supprimer le template" arrow placement="top">
                              <IconButton size="small" onClick={e => {
                        e.stopPropagation();
                        setTemplateToDelete(template._id);
                        setDeleteConfirmOpen(true);
                      }} sx={{
                        bgcolor: '#FFEBEE',
                        color: '#C62828',
                        width: 32,
                        height: 32,
                        '&:hover': {
                          bgcolor: '#FFCDD2',
                          transform: 'scale(1.1)',
                          transition: 'all 0.2s ease'
                        }
                      }}>
                                <DeleteIcon sx={{
                          fontSize: '1rem'
                        }} />
                              </IconButton>
                            </Tooltip>}
                        </Box>
                      </TableCell>
                    </TableRow>;
            })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination - Compact */}
          <Box sx={{
        mt: 2
      }}>
            <TablePagination component="div" count={searchedTemplates.length} page={page} onPageChange={handleChangePage} rowsPerPage={rowsPerPage} onRowsPerPageChange={handleChangeRowsPerPage} rowsPerPageOptions={[10, 25, 50, 100]} labelRowsPerPage={t('Rows per page')} sx={{
          '.MuiTablePagination-toolbar': {
            minHeight: '48px',
            px: 2
          },
          '.MuiTablePagination-selectLabel, .MuiTablePagination-displayedRows': {
            fontSize: '0.8rem'
          }
        }} />
          </Box>
        </Box>}

      {/* Modal */}
      <TemplateDetailModal open={modalOpen} template={selectedTemplate} owner={selectedOwner} onClose={() => setModalOpen(false)} onEdit={handleEdit} onDelete={handleDeleteConfirmFromModal} onDescriptionUpdated={updated => {
      if (!updated?._id) return;
      setTemplates(prev => prev.map(t => t._id === updated._id ? {
        ...t,
        ...updated,
        displayLabel: updated.description
      } : t));
      setSelectedTemplate(prev => prev && prev._id === updated._id ? {
        ...prev,
        ...updated,
        displayLabel: updated.description
      } : prev);
    }} canUpdate={canUpdate} canDelete={canDelete} />

      {/* Status Dialog */}
      <Dialog open={statusDialogOpen} onClose={() => setStatusDialogOpen(false)}>
        <DialogTitle>
          {editingTemplate?.enabled ? 'Désactiver le template' : 'Activer le template'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous vraiment {editingTemplate?.enabled ? 'désactiver' : 'activer'} ce template?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleStatusSave} variant="contained" color="primary">
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Channel Priority Dialog */}
      <Dialog open={channelDialogOpen} onClose={() => setChannelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Modifier la priorité du canal</DialogTitle>
        <DialogContent>
          <Box sx={{
          pt: 2
        }}>
            <Autocomplete value={selectedChannel} onChange={(e, newValue) => setSelectedChannel(newValue)} options={['NO_PRIORITY', 'WHATSAPP_PRIORITY', 'OTA_PRIORITY', 'WHATSAPP_ONLY', 'OTA_ONLY']} getOptionLabel={option => {
            const labels = {
              'NO_PRIORITY': '🔄 Orchestrateur décide',
              'WHATSAPP_PRIORITY': '💬→ Priorité WhatsApp',
              'OTA_PRIORITY': '📧→ Priorité Email-OTA',
              'WHATSAPP_ONLY': '💬 WhatsApp uniquement',
              'OTA_ONLY': '📧 Email-OTA uniquement'
            };
            return labels[option] || option;
          }} renderInput={params => <TextField {...params} label="Priorité du canal" variant="outlined" fullWidth />} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChannelDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleChannelSave} variant="contained" color="primary">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce template? Cette action est irréversible.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} variant="contained" color="error">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>;
};
export default ConfigMessagesView;
