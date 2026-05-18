import React, { useState, useEffect } from 'react';
import { Typography, Card, CardContent, Button, TextField, CircularProgress, Chip, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import { toast } from 'react-toastify';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import RuleIcon from '@mui/icons-material/Rule';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
const RulesAndInfos = ({
  loading,
  rulesAndInfo,
  editMode,
  editData,
  saving,
  onEditClick,
  onCancelEdit,
  onSave,
  onArrayItemChange,
  onRetry,
  t,
  activeTab,
  canUpdate,
  /** Listing modal : le titre est déjà dans l’en-tête du modal — masquer le bloc titre / sous-titre */
  hidePageHeader = false
}) => {
  const [newItem, setNewItem] = useState({
    field: '',
    value: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editErrors, setEditErrors] = useState({
    Rules: [],
    InfoUtils: []
  });
  const [isEditDataValid, setIsEditDataValid] = useState(true);
  const validateInput = value => {
    if (!value.trim()) {
      return t('error_empty_input');
    }
    if (value.trim().length < 3) {
      return t('error_too_short');
    }
    return '';
  };
  const validateEditData = () => {
    const newErrors = {
      Rules: editData.Rules?.map(item => validateInput(item)) || [],
      InfoUtils: editData.InfoUtils?.map(item => validateInput(item)) || []
    };
    setEditErrors(newErrors);
    const isValid = !Object.values(newErrors).flat().some(error => error !== '');
    setIsEditDataValid(isValid);
    return isValid;
  };
  useEffect(() => {
    if (editMode) {
      validateEditData();
    }
  }, [editData, editMode]);
  useEffect(() => {
    setNewItem({
      field: '',
      value: ''
    });
  }, [editMode, activeTab]);
  if (loading) {
    return <div className="flex flex-col items-center justify-center h-64 space-y-6">
        <CircularProgress sx={{
        color: '#FF6B35'
      }} size={36} />
        <Typography variant="body1" sx={{
        color: '#6b7280',
        fontWeight: 500
      }}>
          {t('loading_rules_and_info')}
        </Typography>
      </div>;
  }
  if (!rulesAndInfo) {
    return <div className="flex flex-col items-center justify-center h-64 space-y-6">
        <Typography variant="h6" sx={{
        color: '#6b7280',
        fontWeight: 600
      }}>
          {t('no_rules_and_info_data')}
        </Typography>
        <IconButton onClick={onRetry} sx={{
        color: '#FF6B35',
        '&:hover': {
          backgroundColor: '#FFF3E0'
        },
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
          <RefreshIcon sx={{
          fontSize: 28
        }} />
        </IconButton>
      </div>;
  }
  const infoCards = [{
    title: t('property_rules'),
    field: 'Rules',
    icon: <RuleIcon sx={{
      color: '#f97316',
      fontSize: 28
    }} />,
    description: t('rules_description'),
    borderColor: 'border-gray-300',
    bgColor: 'bg-gray-100',
    color: '#f97316'
  }, {
    title: t('emergency_information'),
    field: 'InfoUtils',
    icon: <InfoIcon sx={{
      color: '#FF6B35',
      fontSize: 28
    }} />,
    description: t('emergency_description'),
    borderColor: 'border-gray-300',
    bgColor: 'bg-gray-100',
    color: '#FF6B35'
  }];
  const handleRetry = () => {
    if (editMode) {
      onCancelEdit();
    }
    onRetry();
  };
  const handleAddItem = field => {
    const error = validateInput(newItem.value);
    if (error) {
      toast.error(error);
      return;
    }
    if (newItem.value.trim()) {
      onArrayItemChange(field, null, newItem.value.trim(), 'add', editMode);
      setNewItem({
        field: '',
        value: ''
      });
    }
  };
  const handleEditItemChange = (field, index, value) => {
    onArrayItemChange(field, index, value, 'update', editMode);
  };
  const handleSave = () => {
    if (validateEditData()) {
      onSave();
    } else {
      toast.error(t('error_invalid_inputs'));
    }
  };
  const handleDeleteItem = (field, index) => {
    setItemToDelete({
      field,
      index
    });
    setDeleteConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (itemToDelete) {
      onArrayItemChange(itemToDelete.field, itemToDelete.index, null, 'delete', editMode);
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };
  return <div className={hidePageHeader ? 'flex flex-col w-full min-h-0' : 'flex flex-col items-center min-h-screen px-6 py-10'}>
      <div className={hidePageHeader ? 'w-full' : 'w-full max-w-7xl'}>
        {!hidePageHeader && <div className="mb-8">
            <Typography variant="h4" sx={{
          color: '#1f2937',
          fontWeight: 700,
          letterSpacing: '-0.025em',
          fontSize: '2rem',
          marginBottom: '12px'
        }}>
              {t('rules_and_information')}
            </Typography>
            <Typography variant="body1" sx={{
          color: '#6b7280',
          fontSize: '1rem',
          lineHeight: 1.6
        }}>
              {t('manage_rules_and_info')}
            </Typography>
          </div>}

        <div className={`flex items-center justify-end gap-4 ${hidePageHeader ? 'my-4' : 'my-8'}`}>
          <Chip label={editMode ? t('editing_mode') : t('view_mode')} color={editMode ? 'warning' : 'success'} variant="outlined" sx={{
          borderColor: editMode ? '#f97316' : '#FF6B35',
          color: editMode ? '#f97316' : '#FF6B35',
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: '8px',
          fontSize: '0.9rem'
        }} />
          <IconButton onClick={handleRetry} sx={{
          color: '#FF6B35',
          '&:hover': {
            backgroundColor: '#FFF3E0'
          },
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
            <RefreshIcon sx={{
            fontSize: 28
          }} />
          </IconButton>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {infoCards.map(card => <Card key={card.field} className={`${card.borderColor} border-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 rounded-xl overflow-hidden min-h-[350px] flex flex-col w-full`} sx={{
          backgroundColor: '#ffffff'
        }}>
              <CardContent className="flex flex-col flex-grow p-6">
                <div className="flex items-start gap-4 mb-6">
                  <div className={`${card.bgColor} p-3 rounded-xl shadow-sm`}>
                    {card.icon}
                  </div>
                  <div className="flex-1">
                    <Typography variant="h5" sx={{
                  color: '#1f2937',
                  fontWeight: 700,
                  fontSize: '1.35rem',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em'
                }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" sx={{
                  color: '#6b7280',
                  fontSize: '0.95rem',
                  lineHeight: 1.5
                }}>
                      {card.description}
                    </Typography>
                  </div>
                  <Chip label={`${editMode ? editData[card.field]?.length || 0 : rulesAndInfo[card.field]?.length || 0} ${t('items')}`} size="medium" variant="outlined" sx={{
                borderColor: card.color,
                color: card.color,
                fontWeight: 600,
                borderRadius: '8px',
                fontSize: '0.85rem',
                padding: '4px 8px'
              }} />
                </div>
                <Divider sx={{
              mb: 4,
              borderColor: '#d1d5db',
              opacity: 0.7
            }} />
                <div className="flex-grow">
                  {editMode ? <div className="flex flex-col gap-6">
                      {editData[card.field]?.map((item, index) => <div key={index} className="flex gap-4 items-center">
                          <div className="flex items-center justify-center flex-shrink-0 mt-1 text-xs font-semibold text-white rounded-full shadow-sm w-7 h-7" style={{
                    background: card.field === 'Rules' ? 'linear-gradient(to right, #f97316, #fdba74)' : 'linear-gradient(to right, #FF6B35, #FFB366)'
                  }}>
                            {index + 1}
                          </div>
                          <TextField fullWidth multiline rows={2} value={item} onChange={e => handleEditItemChange(card.field, index, e.target.value)} placeholder={`${t('enter_item')} ${index + 1}`} variant="outlined" error={!!editErrors[card.field][index]} helperText={editErrors[card.field][index]} sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: '#f9fafb',
                      borderRadius: '8px',
                      '& fieldset': {
                        borderColor: '#d1d5db'
                      },
                      '&:hover fieldset': {
                        borderColor: card.color
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: card.color
                      },
                      '&.Mui-error fieldset': {
                        borderColor: '#ef4444'
                      }
                    },
                    '& .MuiInputBase-input': {
                      fontSize: '0.85rem',
                      color: '#4b5563',
                      lineHeight: 1.5,
                      padding: '8px'
                    },
                    '& .MuiFormHelperText-root': {
                      color: '#ef4444',
                      fontSize: '0.75rem'
                    }
                  }} />
                        </div>)}
                    </div> : <div className={`${card.bgColor} rounded-xl p-4 min-h-[120px]`}>
                      {rulesAndInfo[card.field]?.length > 0 ? <div className="flex flex-col gap-4">
                          {rulesAndInfo[card.field].map((item, index) => <div key={index} className="flex items-start gap-4 p-4 transition-all duration-200 bg-white rounded-xl shadow-sm hover:shadow-md">
                              <div className="flex items-center justify-center flex-shrink-0 mt-1 text-sm font-bold text-white rounded-full shadow-md w-8 h-8" style={{
                      background: card.field === 'Rules' ? 'linear-gradient(to right, #f97316, #fdba74)' : 'linear-gradient(to right, #FF6B35, #FFB366)'
                    }}>
                                {index + 1}
                              </div>
                              <div className="flex-1 pt-1">
                                <Typography variant="body1" sx={{
                        fontWeight: 500,
                        lineHeight: 1.7,
                        color: '#1f2937',
                        fontSize: '0.95rem'
                      }}>
                                  {item}
                                </Typography>
                              </div>
                              {canUpdate && <IconButton onClick={() => handleDeleteItem(card.field, index)} sx={{
                      color: '#ef4444',
                      '&:hover': {
                        backgroundColor: '#fee2e2'
                      },
                      padding: '8px'
                    }}>
                                  <DeleteIcon sx={{
                        fontSize: 20
                      }} />
                                </IconButton>}
                            </div>)}
                        </div> : <div className="flex items-center justify-center h-full">
                          <div className="space-y-2 text-center">
                            <div className={`w-10 h-10 ${card.bgColor} rounded-full flex items-center justify-center mx-auto shadow-sm`}>
                              {card.icon}
                            </div>
                            <Typography variant="body2" sx={{
                      color: '#6b7280',
                      fontStyle: 'italic',
                      fontSize: '0.85rem'
                    }}>
                              {t('no_content_available')}
                            </Typography>
                          </div>
                        </div>}
                      <div className="flex items-center gap-3 mt-6">
                        {canUpdate && <IconButton onClick={() => setNewItem({
                    field: card.field,
                    value: ''
                  })} sx={{
                    color: card.color,
                    '&:hover': {
                      backgroundColor: `${card.color}20`
                    },
                    borderRadius: '10px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    padding: '10px'
                  }}>
                            <AddIcon sx={{
                      fontSize: 26
                    }} />
                          </IconButton>}
                        {newItem.field === card.field && <div className="flex gap-3 w-full items-start">
                            <TextField fullWidth multiline rows={2} value={newItem.value} onChange={e => setNewItem({
                      ...newItem,
                      value: e.target.value
                    })} placeholder={t('enter_new_item')} variant="outlined" sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        '& fieldset': {
                          borderColor: `${card.color}80`
                        },
                        '&:hover fieldset': {
                          borderColor: card.color,
                          boxShadow: '0 3px 7px rgba(0,0,0,0.1)'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: card.color,
                          boxShadow: `0 0 0 3px ${card.color}20`
                        }
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.95rem',
                        color: '#1f2937',
                        padding: '12px'
                      }
                    }} />
                            <Button onClick={() => handleAddItem(card.field)} variant="contained" disabled={!newItem.value.trim()} sx={{
                      backgroundColor: card.color,
                      color: '#ffffff',
                      padding: '10px 20px',
                      borderRadius: '12px',
                      boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      minWidth: '80px',
                      '&:hover': {
                        backgroundColor: `${card.color}cc`,
                        boxShadow: '0 3px 7px rgba(0,0,0,0.15)'
                      },
                      '&:disabled': {
                        backgroundColor: '#d1d5db',
                        color: '#6b7280',
                        boxShadow: 'none'
                      }
                    }}>
                              {t('save')}
                            </Button>
                          </div>}
                      </div>
                    </div>}
                </div>
              </CardContent>
            </Card>)}
        </div>

        <div style={{
        marginTop: hidePageHeader ? 32 : 60
      }} />

        <div className="flex justify-center gap-6">
          {canUpdate && !editMode ? <Button onClick={onEditClick} variant="contained" startIcon={<EditIcon />} sx={{
          backgroundColor: '#FF6B35',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#E55A2B'
          },
          padding: '12px 32px',
          borderRadius: '12px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '1rem',
          boxShadow: '0 4px 8px rgba(255, 107, 53, 0.3)',
          '&:hover': {
            backgroundColor: '#E55A2B',
            boxShadow: '0 6px 12px rgba(255, 107, 53, 0.4)'
          }
        }}>
              {t('edit_rules_and_information')}
            </Button> : canUpdate ? <>
              <Button onClick={handleSave} variant="contained" startIcon={saving ? <CircularProgress size={18} sx={{
            color: '#fff'
          }} /> : <SaveIcon />} disabled={saving || !isEditDataValid} sx={{
            backgroundColor: '#FF6B35',
            color: '#ffffff',
            padding: '12px 32px',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 8px rgba(255, 107, 53, 0.3)',
            '&:hover': {
              backgroundColor: '#E55A2B',
              boxShadow: '0 6px 12px rgba(255, 107, 53, 0.4)'
            },
            '&:disabled': {
              backgroundColor: '#d1d5db',
              color: '#6b7280'
            }
          }}>
                {saving ? t('saving') : t('save_changes')}
              </Button>
              <Button onClick={onCancelEdit} variant="outlined" startIcon={<CancelIcon />} disabled={saving} sx={{
            borderColor: '#f97316',
            color: '#ffffff',
            backgroundColor: '#f97316',
            padding: '12px 32px',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 4px 8px rgba(249, 115, 22, 0.3)',
            '&:hover': {
              borderColor: '#e86a00',
              backgroundColor: '#e86a00',
              boxShadow: '0 6px 12px rgba(249, 115, 22, 0.4)'
            },
            '&:disabled': {
              backgroundColor: '#d1d5db',
              color: '#6b7280',
              borderColor: '#d1d5db'
            }
          }}>
                {t('cancel')}
              </Button>
            </> : ''}
        </div>
      </div>
      <Dialog open={deleteConfirmOpen} onClose={handleCancelDelete} PaperProps={{
      sx: {
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        backgroundColor: '#ffffff',
        animation: 'fadeIn 0.3s ease-in-out',
        '@keyframes fadeIn': {
          '0%': {
            opacity: 0,
            transform: 'scale(0.95)'
          },
          '100%': {
            opacity: 1,
            transform: 'scale(1)'
          }
        },
        minWidth: '300px',
        maxWidth: '400px'
      }
    }}>
        <DialogTitle sx={{
        fontWeight: 700,
        color: '#1f2937',
        fontSize: '1.25rem',
        textAlign: 'center',
        padding: '16px 24px',
        borderBottom: '1px solid #e5e7eb'
      }}>
          {t('confirm_delete')}
        </DialogTitle>
        <DialogContent sx={{
        padding: '24px',
        textAlign: 'center'
      }}>
          <DialogContentText sx={{
          color: '#4b5563',
          fontSize: '1rem',
          lineHeight: 1.5,
          marginBottom: '16px'
        }}>
            {t('delete_confirmation_text')}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{
        padding: '0 24px 24px',
        justifyContent: 'center',
        gap: '16px'
      }}>
          <Button onClick={handleCancelDelete} variant="outlined" sx={{
          color: '#f97316',
          borderColor: '#f97316',
          backgroundColor: 'transparent',
          padding: '8px 20px',
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#f973161a',
            borderColor: '#e86a00',
            transform: 'scale(1.02)'
          }
        }}>
            {t('cancel')}
          </Button>
          <Button onClick={confirmDelete} variant="contained" autoFocus sx={{
          backgroundColor: '#FF6B35',
          color: '#ffffff',
          padding: '8px 20px',
          borderRadius: '8px',
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '0.9rem',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: '#E55A2B',
            boxShadow: '0 2px 8px rgba(255,107,53,0.3)',
            transform: 'scale(1.02)'
          }
        }}>
            {t('delete')}
          </Button>
        </DialogActions>
      </Dialog>
    </div>;
};
export default RulesAndInfos;
