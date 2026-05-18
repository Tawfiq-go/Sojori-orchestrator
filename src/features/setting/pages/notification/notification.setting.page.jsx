import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import { Typography, Box, Card, CardContent, CardHeader, Chip, Alert, CircularProgress, IconButton, Switch, styled } from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import NotificationSettingComponent from 'features/setting/components/Notification.setting.component';
import { getNotificationPreferences, updateNotificationPreferences } from 'features/setting/services/serverApi.notification';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { can } from '../../../../utils/permissions';

// SOJORI Brand Colors
const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  gray: {
    400: '#BDBDBD'
  }
};
const StyledCard = styled(Card)(({
  theme
}) => ({
  borderRadius: '0px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  border: '1px solid #EEEEEE',
  transition: 'all 0.3s ease',
  '&:hover': {
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
    transform: 'translateY(-2px)'
  }
}));
const StyledSwitch = styled(Switch)(({
  theme
}) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: SOJORI_COLORS.primary
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.primary
  },
  '& .MuiSwitch-switchBase': {
    '&.Mui-disabled': {
      color: SOJORI_COLORS.gray[400]
    }
  },
  '& .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.gray[400]
  }
}));
function NotificationSettingPage() {
  const {
    t
  } = useTranslation('common');
  const [prefs, setPrefs] = useState([]);
  const [canUpdate] = useState(can('update'));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotificationPreferences();
      setPrefs(data.preferences || []);
    } catch (error) {
      setError(t('Failed to load notification preferences'));
      toast.error(t('Failed to load notification preferences'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchData();
  }, []);
  const handleUpdate = async updated => {
    if (!canUpdate) {
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const payload = updated.map(item => ({
        key: item.key,
        channels: item.channels || []
      }));
      const data = await updateNotificationPreferences({
        preferences: payload
      });
      setPrefs(data.preferences || []);
      setHasChanges(false);
    } catch (error) {
      setError(t('Failed to update notification preferences'));
      toast.error(t('Failed to update notification preferences'));
    } finally {
      setSaving(false);
    }
  };
  if (loading) {
    return <DashboardLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh" flexDirection="column" gap={2}>
          <CircularProgress sx={{
          color: SOJORI_COLORS.primary
        }} size={48} />
          <Typography variant="h6" color="text.secondary">
            {t('Loading notification preferences...')}
          </Typography>
        </Box>
      </DashboardLayout>;
  }
  return <DashboardLayout>
      <ToastContainer position="top-right" autoClose={3000} />
      <Box>

        {/* Error Alert */}
        {error && <Alert severity="error" sx={{
        mb: 3,
        borderRadius: '12px'
      }} action={<IconButton color="inherit" size="small" onClick={() => setError(null)}>
                <InfoIcon />
              </IconButton>}>
            {error}
          </Alert>}

        {/* Notification Settings */}
        <StyledCard>
          <CardHeader action={<Box sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}>
                {hasChanges && <Chip label={t('Unsaved Changes')} color="warning" size="small" icon={<InfoIcon />} />}
                {saving && <CircularProgress size={20} sx={{
            color: SOJORI_COLORS.primary
          }} />}
              </Box>} />
          <CardContent>
            <NotificationSettingComponent preferences={prefs} onChange={updated => {
            setHasChanges(true);
            handleUpdate(updated);
          }} t={t} />
          </CardContent>
        </StyledCard>
      </Box>
    </DashboardLayout>;
}
export default NotificationSettingPage;
