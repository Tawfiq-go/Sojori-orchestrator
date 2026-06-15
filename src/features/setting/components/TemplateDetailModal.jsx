import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography, Paper, Grid, Chip, Switch, IconButton, Divider, ToggleButton, ToggleButtonGroup, TextField, Collapse, CircularProgress } from '@mui/material';
import { Close as CloseIcon, ContentCopy as ContentCopyIcon, Edit as EditIcon, Delete as DeleteIcon, Email as EmailIcon, CheckCircle as CheckIcon, Cancel as CancelIcon, Refresh as RefreshIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, SmartToy as AiIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useTranslation } from 'react-i18next';
import { previewMessageTemplate, updateMessageTemplateDescription } from '../services/serverApi.orchestratorConfig';
import { fetchEnrichedSampleReservation } from '../utils/orchestratorTemplatePreview';
const SOJORI_COLORS = {
  primary: '#E6B022',
  primaryLight: '#FF8F6B',
  primaryDark: '#B8881A',
  primaryPale: '#FFF3E0',
  gray: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121'
  }
};
const TemplateDetailModal = ({
  open,
  template,
  owner,
  onClose,
  onEdit,
  onDelete,
  onDescriptionUpdated,
  canUpdate,
  canDelete
}) => {
  const {
    t
  } = useTranslation('common');
  const [aiMode, setAiMode] = useState(false);
  const [previewCity, setPreviewCity] = useState('Casablanca');
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewPromptOpen, setPreviewPromptOpen] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [savingDescription, setSavingDescription] = useState(false);
  const templateId = template?.messageName || template?._id;
  const previewMode = aiMode ? 'ai' : 'normal';
  const hasWeatherVars = template?.messageName === 'RAPPEL_X_JOURS_AVANT_ARRIVEE' || template?.messageName === 'MESSAGE_METEO_AVANT_ARRIVEE' || template?.content?.includes('{weatherTemp}') || template?.content?.includes('{weatherConditions}') || template?.content?.includes('{weatherRecommendations}') || template?.whatsappContent?.includes('{weatherTemp}') || template?.whatsappContent?.includes('{weatherRecommendations}');
  useEffect(() => {
    if (open && templateId) {
      fetchPreview();
    }
  }, [open, templateId, aiMode]);
  useEffect(() => {
    if (template) {
      setEditDescription(template.description ?? template.displayLabel ?? '');
    }
  }, [template?._id, template?.description, template?.displayLabel]);
  const fetchPreview = async () => {
    if (!templateId) return;
    setPreviewLoading(true);
    const useAi = hasWeatherVars && aiMode;
    try {
      const reservation = await fetchEnrichedSampleReservation();
      const res = await previewMessageTemplate({
        templateId,
        mode: useAi ? 'ai' : 'normal',
        city: useAi ? previewCity : undefined,
        reservation: reservation || undefined
      });
      if (res.success && res.data) setPreviewData(res.data);
    } catch (err) {
      toast.error(t('Failed to load preview'));
    } finally {
      setPreviewLoading(false);
    }
  };
  if (!template) return null;
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(t(`${label} copied to clipboard`));
  };
  const handleSaveDescription = async () => {
    const id = template._id;
    if (!id || !editDescription.trim()) return;
    setSavingDescription(true);
    try {
      const res = await updateMessageTemplateDescription(id, editDescription.trim());
      if (res.data?.success && res.data?.data) {
        toast.success(t('Name updated') || 'Nom enregistré');
        onDescriptionUpdated?.(res.data.data);
      } else {
        toast.error(res.data?.error || t('Failed to update'));
      }
    } catch (err) {
      toast.error(err.response?.data?.error || t('Failed to update'));
    } finally {
      setSavingDescription(false);
    }
  };
  const aiProviderLabel = previewData?.aiProvider === 'gemini' ? 'Gemini' : previewData?.aiProvider === 'claude' ? 'Claude' : previewData?.aiProvider === 'standard' ? 'Standard' : previewData?.aiProvider === 'static' ? 'Fallback statique' : null;
  return <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{
    sx: {
      borderRadius: '12px',
      maxHeight: '85vh'
    }
  }}>
      {/* Header */}
      <DialogTitle sx={{
      backgroundColor: SOJORI_COLORS.primary,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      py: 2
    }}>
        <Box display="flex" alignItems="center" gap={1}>
          <EmailIcon />
          <Typography variant="h6" component="div">
            {(template.description || template.displayLabel || t(template.messageName) || '').trim() || t('Template Details') || 'Détails du message'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{
        color: 'white'
      }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent sx={{
      p: 3
    }}>
        {/* Nom du message (éditable) */}
        <Box mb={3}>
          <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
            {t('Template name') || 'Nom du message'}
          </Typography>
          <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
            <TextField size="small" fullWidth value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder={t('Template name') || 'Nom du message'} sx={{
            flex: 1,
            minWidth: 200
          }} />
            <Button variant="contained" size="small" onClick={handleSaveDescription} disabled={savingDescription || !editDescription.trim()} sx={{
            bgcolor: SOJORI_COLORS.primary,
            '&:hover': {
              bgcolor: SOJORI_COLORS.primaryDark
            }
          }}>
              {savingDescription ? t('Saving') || 'Enregistrement…' : t('Save name') || 'Enregistrer le nom'}
            </Button>
          </Box>
        </Box>

        <Divider sx={{
        my: 2
      }} />

        {/* Metadata Section */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{
          fontWeight: 'bold',
          letterSpacing: '0.5px'
        }}>
            MÉTADONNÉES
          </Typography>
          <Paper variant="outlined" sx={{
          p: 2,
          backgroundColor: SOJORI_COLORS.gray[50],
          borderColor: SOJORI_COLORS.gray[300]
        }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Owner
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {owner?.email || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="text.secondary">
                  Type
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {template.type || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Status
                </Typography>
                <Chip label={template.enabled ? t('Active') : t('Inactive')} size="small" color={template.enabled ? 'success' : 'default'} icon={template.enabled ? <CheckIcon /> : <CancelIcon />} />
              </Grid>
              {hasWeatherVars && <Grid item xs={3}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                    AI
                  </Typography>
                  <ToggleButtonGroup value={aiMode} exclusive onChange={(_, v) => v !== null && setAiMode(v)} size="small" sx={{
                mt: -0.5
              }}>
                    <ToggleButton value={false}>Non</ToggleButton>
                    <ToggleButton value={true}>Oui</ToggleButton>
                  </ToggleButtonGroup>
                </Grid>}
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Messages
                </Typography>
                <Switch checked={template.messageEnabled} disabled size="small" />
              </Grid>
              <Grid item xs={3}>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  WhatsApp
                </Typography>
                <Switch checked={!!template.whatsappType} disabled size="small" />
              </Grid>
            </Grid>
          </Paper>
        </Box>

        <Divider sx={{
        my: 3
      }} />

        {/* Preview Section */}
        <Box mb={3}>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          mb: 2
        }}>
            {t('Message_preview') || 'APERÇU DU MESSAGE'}
          </Typography>
          <Paper variant="outlined" sx={{
          p: 2,
          borderColor: SOJORI_COLORS.gray[300]
        }}>
            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={2}>
              {hasWeatherVars && <Chip size="small" label={aiMode ? `🤖 ${aiProviderLabel || previewData?.aiProvider || 'AI'}` : 'Standard'} color={aiMode ? 'primary' : 'default'} variant="outlined" icon={aiMode ? <AiIcon /> : null} />}
              {hasWeatherVars && aiMode && <TextField size="small" label={t('City') || 'Ville'} value={previewCity} onChange={e => setPreviewCity(e.target.value)} onBlur={fetchPreview} sx={{
              width: 160
            }} />}
              <IconButton size="small" onClick={fetchPreview} disabled={previewLoading} title={t('Refresh') || 'Actualiser'}>
                <RefreshIcon />
              </IconButton>
            </Box>
            {previewLoading ? <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} />
              </Box> : previewData?.content ? <>
                <Typography variant="body2" sx={{
              whiteSpace: 'pre-wrap',
              backgroundColor: 'white',
              p: 2,
              borderRadius: '8px',
              border: `1px solid ${SOJORI_COLORS.gray[200]}`,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              lineHeight: 1.6
            }}>
                  {previewData.content}
                </Typography>
                {previewData.promptContext && <Box mt={2}>
                    <Button size="small" startIcon={previewPromptOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />} onClick={() => setPreviewPromptOpen(!previewPromptOpen)}>
                      {t('Données envoyées') || 'Données envoyées'} {previewMode === 'ai' ? 'à l\'IA' : ''}
                    </Button>
                    <Collapse in={previewPromptOpen}>
                      <Typography variant="caption" component="pre" sx={{
                  display: 'block',
                  mt: 1,
                  p: 1.5,
                  bgcolor: SOJORI_COLORS.gray[50],
                  borderRadius: 1,
                  overflow: 'auto',
                  maxHeight: 120,
                  fontSize: '0.7rem'
                }}>
                        {`{ ${previewData.promptContext} }`}
                      </Typography>
                    </Collapse>
                  </Box>}
              </> : <Typography variant="body2" color="text.secondary">
                {t('Select a template to see preview...') || 'Chargement...'}
              </Typography>}
          </Paper>
        </Box>

        <Divider sx={{
        my: 3
      }} />

        {/* Messages Section */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          mb: 2
        }}>
            MESSAGES OTA
          </Typography>

          {/* French OTA Message */}
          {template.content && <Paper variant="outlined" sx={{
          p: 2,
          mb: 2,
          borderColor: SOJORI_COLORS.gray[300],
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            boxShadow: `0 0 0 1px ${SOJORI_COLORS.primary}`
          }
        }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="body2" fontWeight="bold" color={SOJORI_COLORS.gray[800]}>
                  🇫🇷 Français (OTA)
                </Typography>
                <IconButton size="small" onClick={() => handleCopy(template.content, 'French OTA message')} sx={{
              color: SOJORI_COLORS.primary,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale
              }
            }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'white',
            p: 2,
            borderRadius: '8px',
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: SOJORI_COLORS.gray[800]
          }}>
                {template.content}
              </Typography>
            </Paper>}

          {/* English OTA Message */}
          {template.contentEng && <Paper variant="outlined" sx={{
          p: 2,
          mb: 2,
          borderColor: SOJORI_COLORS.gray[300],
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            boxShadow: `0 0 0 1px ${SOJORI_COLORS.primary}`
          }
        }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="body2" fontWeight="bold" color={SOJORI_COLORS.gray[800]}>
                  🇬🇧 English (OTA)
                </Typography>
                <IconButton size="small" onClick={() => handleCopy(template.contentEng, 'English OTA message')} sx={{
              color: SOJORI_COLORS.primary,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale
              }
            }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'white',
            p: 2,
            borderRadius: '8px',
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: SOJORI_COLORS.gray[800]
          }}>
                {template.contentEng}
              </Typography>
            </Paper>}
        </Box>

        <Divider sx={{
        my: 3
      }} />

        {/* WhatsApp Section */}
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{
          fontWeight: 'bold',
          letterSpacing: '0.5px',
          mb: 2
        }}>
            MESSAGES WHATSAPP
          </Typography>

          {/* French WhatsApp Message */}
          {template.whatsappContent && <Paper variant="outlined" sx={{
          p: 2,
          mb: 2,
          borderColor: SOJORI_COLORS.gray[300],
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            boxShadow: `0 0 0 1px ${SOJORI_COLORS.primary}`
          }
        }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="body2" fontWeight="bold" color={SOJORI_COLORS.gray[800]}>
                  📱 🇫🇷 Français (WhatsApp)
                </Typography>
                <IconButton size="small" onClick={() => handleCopy(template.whatsappContent, 'French WhatsApp message')} sx={{
              color: SOJORI_COLORS.primary,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale
              }
            }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'white',
            p: 2,
            borderRadius: '8px',
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: SOJORI_COLORS.gray[800]
          }}>
                {template.whatsappContent}
              </Typography>
            </Paper>}

          {/* English WhatsApp Message */}
          {template.whatsappContentEng && <Paper variant="outlined" sx={{
          p: 2,
          mb: 2,
          borderColor: SOJORI_COLORS.gray[300],
          '&:hover': {
            borderColor: SOJORI_COLORS.primary,
            boxShadow: `0 0 0 1px ${SOJORI_COLORS.primary}`
          }
        }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="body2" fontWeight="bold" color={SOJORI_COLORS.gray[800]}>
                  📱 🇬🇧 English (WhatsApp)
                </Typography>
                <IconButton size="small" onClick={() => handleCopy(template.whatsappContentEng, 'English WhatsApp message')} sx={{
              color: SOJORI_COLORS.primary,
              '&:hover': {
                backgroundColor: SOJORI_COLORS.primaryPale
              }
            }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
              <Typography variant="body2" sx={{
            whiteSpace: 'pre-wrap',
            backgroundColor: 'white',
            p: 2,
            borderRadius: '8px',
            border: `1px solid ${SOJORI_COLORS.gray[200]}`,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            color: SOJORI_COLORS.gray[800]
          }}>
                {template.whatsappContentEng}
              </Typography>
            </Paper>}

          {/* WhatsApp Type Info */}
          {template.whatsappType && <Paper variant="outlined" sx={{
          p: 2,
          borderColor: SOJORI_COLORS.gray[300],
          backgroundColor: SOJORI_COLORS.gray[50]
        }}>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                WhatsApp Type
              </Typography>
              <Typography variant="body2" sx={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            color: SOJORI_COLORS.gray[700]
          }}>
                {template.whatsappType}
              </Typography>
            </Paper>}

          {/* No WhatsApp messages */}
          {!template.whatsappContent && !template.whatsappContentEng && <Paper variant="outlined" sx={{
          p: 3,
          textAlign: 'center',
          borderColor: SOJORI_COLORS.gray[300],
          backgroundColor: SOJORI_COLORS.gray[50]
        }}>
              <Typography variant="body2" color="text.secondary">
                {t('No WhatsApp messages configured for this template')}
              </Typography>
            </Paper>}
        </Box>
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{
      p: 2,
      gap: 1,
      backgroundColor: SOJORI_COLORS.gray[50],
      borderTop: `1px solid ${SOJORI_COLORS.gray[300]}`
    }}>
        {canDelete && <Button variant="outlined" startIcon={<DeleteIcon />} onClick={() => onDelete(template._id)} sx={{
        color: '#F44336',
        borderColor: '#F44336',
        '&:hover': {
          backgroundColor: '#ffebee',
          borderColor: '#F44336'
        }
      }}>
            {t('Delete')}
          </Button>}
        {canUpdate && <Button variant="contained" startIcon={<EditIcon />} onClick={() => onEdit(template._id)} sx={{
        backgroundColor: SOJORI_COLORS.primary,
        color: 'white',
        '&:hover': {
          backgroundColor: SOJORI_COLORS.primaryDark
        }
      }}>
            {t('Edit')}
          </Button>}
      </DialogActions>
    </Dialog>;
};
export default TemplateDetailModal;
