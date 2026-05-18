import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // Added for translations
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createRoomComposite, updateRoomComposite } from '../services/serverApi.adminConfig';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { CircularProgress, Box, Typography, TextField, Paper, Divider, Switch, FormControlLabel, Grid } from '@mui/material';
function ModifyRoomComposite({
  open,
  onClose,
  selectedComposite,
  allComposites,
  isCreating,
  onSuccess
}) {
  const {
    t
  } = useTranslation('common'); // Added for translations
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    rentalId: '',
    roomName: '',
    RoomNameSojori: {
      en: '',
      fr: '',
      es: ''
    },
    order: 1,
    enable: true,
    useBed: true
  });
  useEffect(() => {
    if (selectedComposite) {
      setFormData({
        rentalId: selectedComposite.rentalId || '',
        roomName: selectedComposite.roomName || '',
        RoomNameSojori: {
          en: selectedComposite.RoomNameSojori?.en || '',
          fr: selectedComposite.RoomNameSojori?.fr || '',
          es: selectedComposite.RoomNameSojori?.es || ''
        },
        order: selectedComposite.order || 1,
        enable: selectedComposite.enable ?? true,
        useBed: selectedComposite.useBed ?? true
      });
    } else {
      setFormData({
        rentalId: '',
        roomName: '',
        RoomNameSojori: {
          en: '',
          fr: '',
          es: ''
        },
        order: 1,
        enable: true,
        useBed: true
      });
    }
  }, [selectedComposite]);
  const handleSubmit = async () => {
    if (!formData.rentalId || !formData.roomName) {
      toast.error(t('Rental ID and Room Name are required'));
      return;
    }
    setLoading(true);
    try {
      if (isCreating) {
        await createRoomComposite(formData);
        toast.success(t('Room composite created successfully'));
      } else {
        const updatedComposites = allComposites.map(item => item.rentalId === formData.rentalId ? {
          rentalId: formData.rentalId,
          roomName: formData.roomName,
          RoomNameSojori: {
            en: formData.RoomNameSojori.en,
            fr: formData.RoomNameSojori.fr,
            es: formData.RoomNameSojori.es
          },
          order: formData.order,
          enable: formData.enable,
          useBed: formData.useBed
        } : item);
        await updateRoomComposite({
          rooms: updatedComposites
        });
        toast.success(t('Room composite updated successfully'));
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || t('Error saving room composite'));
    } finally {
      setLoading(false);
    }
  };
  return <Dialog open={open} onClose={loading ? null : onClose} fullWidth maxWidth="md" PaperProps={{
    sx: {
      borderRadius: '12px',
      overflow: 'hidden'
    }
  }}>
      <DialogTitle sx={{
      p: 3,
      backgroundColor: '#fafafa',
      borderBottom: '1px solid #f0f0f0',
      '& .MuiTypography-root': {
        fontWeight: 600
      }
    }}>
        {isCreating ? t('Create New Room Composite') : t('Edit Room Composite')}
        <IconButton aria-label="close" onClick={onClose} disabled={loading} sx={{
        position: 'absolute',
        right: 16,
        top: 16,
        color: theme => theme.palette.grey[500]
      }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <DialogContent sx={{
      p: 3
    }}>
        <Box sx={{
        mt: 2
      }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField label={t('Rental ID')} value={formData.rentalId} onChange={e => setFormData({
              ...formData,
              rentalId: e.target.value
            })} fullWidth required error={!formData.rentalId} helperText={!formData.rentalId ? t('Rental ID is required') : ''} disabled={!isCreating} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField label={t('Rental Name')} value={formData.roomName} onChange={e => setFormData({
              ...formData,
              roomName: e.target.value
            })} fullWidth required error={!formData.roomName} helperText={!formData.roomName ? t('Rental Name is required') : ''} disabled={!isCreating} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={t('English Sojori Name')} value={formData.RoomNameSojori.en} onChange={e => setFormData({
              ...formData,
              RoomNameSojori: {
                ...formData.RoomNameSojori,
                en: e.target.value
              }
            })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={t('French Sojori Name')} value={formData.RoomNameSojori.fr} onChange={e => setFormData({
              ...formData,
              RoomNameSojori: {
                ...formData.RoomNameSojori,
                fr: e.target.value
              }
            })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label={t('Spanish Sojori Name')} value={formData.RoomNameSojori.es} onChange={e => setFormData({
              ...formData,
              RoomNameSojori: {
                ...formData.RoomNameSojori,
                es: e.target.value
              }
            })} fullWidth />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formData.enable} onChange={e => setFormData({
              ...formData,
              enable: e.target.checked
            })} sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#00b4b4',
                '& + .MuiSwitch-track': {
                  backgroundColor: '#00b4b4'
                }
              }
            }} />} label={t('Enable')} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel control={<Switch checked={formData.useBed} onChange={e => setFormData({
              ...formData,
              useBed: e.target.checked
            })} sx={{
              '& .MuiSwitch-switchBase.Mui-checked': {
                color: '#00b4b4',
                '& + .MuiSwitch-track': {
                  backgroundColor: '#00b4b4'
                }
              }
            }} />} label={t('Use Bed')} />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{
      p: 2,
      px: 3,
      borderTop: '1px solid #f0f0f0'
    }}>
        <Button onClick={onClose} disabled={loading} variant="outlined" sx={{
        borderColor: 'gray',
        color: 'gray'
      }}>
          {t('Cancel')}
        </Button>
        <Button onClick={handleSubmit} disabled={loading || !formData.rentalId || !formData.roomName} variant="contained" color="primary" startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null} sx={{
        backgroundColor: '#00b4b4',
        '&:hover': {
          backgroundColor: '#009999'
        }
      }} className="!text-white">
          {loading ? t('Saving...') : isCreating ? t('Create') : t('Save Changes')}
        </Button>
      </DialogActions>
    </Dialog>;
}
export default ModifyRoomComposite;
