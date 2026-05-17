// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Configuration View
// Version simplifiée avec 2 onglets : Modèles & Messages
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab } from '@mui/material';
import ConfigTaskTemplateView from './ConfigTaskTemplateView';
import ConfigMessagesView from './ConfigMessagesView';

/**
 * Vue Configuration avec 2 onglets
 * - Modèles : Templates d'orchestration par catégorie
 * - Messages : Templates de messages (email + WhatsApp)
 */
const ConfigurationView = () => {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    { label: '📋 Modèles', component: <ConfigTaskTemplateView /> },
    { label: '✉️ Messages', component: <ConfigMessagesView /> },
  ];
  return (
    <Box
      className="so-fade-in"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with Tabs */}
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'var(--border)',
          bgcolor: 'var(--bg-paper)',
          px: 3,
          pt: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
          <Typography
            sx={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--text-h)',
            }}
          >
            Configuration
          </Typography>
          <Typography
            sx={{
              fontSize: 12,
              color: 'var(--text-muted)',
              fontFamily: '"Geist Mono", monospace',
            }}
          >
            Templates d'orchestration & messages
          </Typography>
        </Box>

        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: 13.5,
              fontWeight: 600,
              minHeight: 44,
              color: 'var(--text-muted)',
              '&.Mui-selected': {
                color: 'var(--accent)',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: 'var(--accent)',
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {tabs.map((tab, index) => (
            <Tab key={index} label={tab.label} />
          ))}
        </Tabs>
      </Box>

      {/* Tab Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tabs[activeTab].component}
      </Box>
    </Box>
  );
};

export default ConfigurationView;
