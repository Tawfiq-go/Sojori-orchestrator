import { useState, useEffect, Fragment } from 'react';
import { 
  Box, 
  Typography, 
  Switch, 
  FormControlLabel, 
  Card, 
  CardContent, 
  Divider,
  Chip,
  IconButton,
  Collapse,
  styled
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  WhatsApp as WhatsAppIcon
} from '@mui/icons-material';

const SOJORI_COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  primaryPale: '#FFF3E0',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
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

const StyledCard = styled(Card)(({ theme }) => ({
  borderRadius: '12px',
  border: `1px solid ${SOJORI_COLORS.gray[200]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
  },
}));

const StyledSwitch = styled(Switch)(({ theme }) => ({
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: SOJORI_COLORS.primary,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.primary,
  },
  '& .MuiSwitch-switchBase': {
    '&.Mui-disabled': {
      color: SOJORI_COLORS.gray[400],
    },
  },
  '& .MuiSwitch-track': {
    backgroundColor: SOJORI_COLORS.gray[400],
  },
}));

const CategoryHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  backgroundColor: SOJORI_COLORS.primaryPale,
  borderRadius: '12px 12px 0 0',
  border: `1px solid ${SOJORI_COLORS.primary}`,
  borderBottom: 'none',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.primaryPale,
    transform: 'translateY(-1px)',
  },
}));

const NotificationRow = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: `1px solid ${SOJORI_COLORS.gray[200]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[50],
  },
  '&:last-child': {
    borderBottom: 'none',
    borderRadius: '0 0 12px 12px',
  },
}));

const ChannelToggle = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 12px',
  borderRadius: '8px',
  backgroundColor: SOJORI_COLORS.gray[50],
  border: `1px solid ${SOJORI_COLORS.gray[200]}`,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: SOJORI_COLORS.gray[100],
  },
}));

export default function NotificationSettingsTable({
  preferences,
  onChange,
  t,
}) {
  const [prefs, setPrefs] = useState([]);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    setPrefs(preferences);
    // Initialize all categories as expanded
    const categories = (preferences || []).reduce((acc, pref) => {
      if (!acc[pref.category]) acc[pref.category] = true;
      return acc;
    }, {});
    setExpandedCategories(categories);
  }, [preferences]);

  const toggleChannel = (index, channel) => {
    const updated = [...prefs];
    updated[index].channels[channel] = !updated[index].channels[channel];
    onChange(updated);
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const grouped = (prefs || []).reduce((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = [];
    acc[pref.category].push(pref);
    return acc;
  }, {});

  const getChannelIcon = (channel) => {
    switch (channel.toLowerCase()) {
      case 'dashboard':
        return <DashboardIcon sx={{ fontSize: 18, color: SOJORI_COLORS.info }} />;
      case 'whatsapp':
        return <WhatsAppIcon sx={{ fontSize: 18, color: SOJORI_COLORS.success }} />;
      default:
        return <NotificationsIcon sx={{ fontSize: 18, color: SOJORI_COLORS.primary }} />;
    }
  };

  const getChannelColor = (channel) => {
    switch (channel.toLowerCase()) {
      case 'dashboard':
        return SOJORI_COLORS.info;
      case 'whatsapp':
        return SOJORI_COLORS.success;
      default:
        return SOJORI_COLORS.primary;
    }
  };

  const getChannelLabel = (channel) => {
    switch (channel.toLowerCase()) {
      case 'dashboard':
        return t('Dashboard');
      case 'whatsapp':
        return t('WhatsApp');
      default:
        return t(channel);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      {Object.entries(grouped).map(([category, rows]) => {
        const isExpanded = expandedCategories[category];
        const activeChannels = rows.reduce((acc, row) => {
          Object.entries(row.channels || {}).forEach(([channel, enabled]) => {
            if (enabled) acc[channel] = (acc[channel] || 0) + 1;
          });
          return acc;
        }, {});

        return (
          <StyledCard key={category} sx={{ mb: 3 }}>
            <CategoryHeader onClick={() => toggleCategory(category)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <NotificationsIcon sx={{ color: SOJORI_COLORS.primary, fontSize: 24 }} />
                <Box>
                  <Typography variant="h6" fontWeight="bold" color="text.primary">
                    {t(category.charAt(0).toUpperCase() + category.slice(1))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {rows.length} {t('notification types')}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {Object.entries(activeChannels).map(([channel, count]) => (
                    <Chip
                      key={channel}
                      icon={getChannelIcon(channel)}
                      label={`${count} ${getChannelLabel(channel)}`}
                      size="small"
                      sx={{
                        backgroundColor: getChannelColor(channel) + '20',
                        color: getChannelColor(channel),
                        border: `1px solid ${getChannelColor(channel)}40`,
                      }}
                    />
                  ))}
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </IconButton>
              </Box>
            </CategoryHeader>

            <Collapse in={isExpanded}>
              <Box>
                {rows.map((row, i) => {
                  const index = prefs.findIndex((p) => p.key === row.key);
                  const channels = row.channels || {};
                  
                  return (
                    <NotificationRow key={row.key}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight="medium" color="text.primary">
                          {t(row.name)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                          {t('Configure notification channels for this event')}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        {Object.entries(channels).map(([channel, enabled]) => (
                          <ChannelToggle key={channel}>
                            {getChannelIcon(channel)}
                            <Typography variant="body2" fontWeight="medium" color="text.primary">
                              {getChannelLabel(channel)}
                            </Typography>
                            <StyledSwitch
                              checked={enabled}
                              onChange={() => toggleChannel(index, channel)}
                              size="small"
                            />
                          </ChannelToggle>
                        ))}
                      </Box>
                    </NotificationRow>
                  );
                })}
              </Box>
            </Collapse>
          </StyledCard>
        );
      })}

      {Object.keys(grouped).length === 0 && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}
        >
          <NotificationsIcon sx={{ fontSize: 64, color: SOJORI_COLORS.gray[400] }} />
          <Typography variant="h6" color="text.secondary">
            {t('No notification preferences found')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('Contact your administrator to set up notification preferences')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
