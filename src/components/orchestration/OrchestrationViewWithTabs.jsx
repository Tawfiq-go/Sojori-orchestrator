// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Page principale avec onglets
// ════════════════════════════════════════════════════════════════════
import React, { useState } from 'react';
import { Box, Tabs, Tab } from '@mui/material';
import OrchestrationView from './OrchestrationView';
import ChronologieView from './ChronologieView';
import ConfigurationView from './ConfigurationView';

const OrchestrationViewWithTabs = () => {
  // ✅ Chronologie (tab index 1) est maintenant l'onglet par défaut
  const [activeTab, setActiveTab] = useState(1);

  const tabs = [
    { label: 'Plans', component: <OrchestrationView /> },
    { label: 'Chronologie', component: <ChronologieView /> },
    { label: 'Événement', component: <Box sx={{ p: 3 }}>Événement - À venir</Box> },
    { label: 'Daily Ops', component: <Box sx={{ p: 3 }}>Daily Ops - À venir</Box> },
    { label: 'Configuration', component: <ConfigurationView /> },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Onglets en haut */}
      <Box sx={{
        borderBottom: 1,
        borderColor: 'var(--border)',
        bgcolor: 'var(--bg-paper)',
        px: 3,
        pt: 2,
      }}>
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

      {/* Contenu de l'onglet actif */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {tabs[activeTab].component}
      </Box>
    </Box>
  );
};

export default OrchestrationViewWithTabs;
