// ════════════════════════════════════════════════════════════════════
// Sojori · Orchestration — Page principale avec onglets
// ════════════════════════════════════════════════════════════════════
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Tabs, Tab } from '@mui/material';
import OrchestrationView from './OrchestrationView';
import ChronologieView from './ChronologieView';
import ConfigurationView from './ConfigurationView';
import { T } from './orchestrationConfigUi';

/** Aligné legacy : ?tab=configuration | orchestration | event | daily */
const TAB_INDEX_BY_PARAM = {
  orchestration: 0,
  plans: 0,
  chronologie: 1,
  event: 2,
  daily: 3,
  configuration: 4,
};

const TAB_PARAM_BY_INDEX = {
  0: 'orchestration',
  2: 'event',
  3: 'daily',
  4: 'configuration',
};

const OrchestrationViewWithTabs = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') || '';
  const initialTab =
    tabParam && TAB_INDEX_BY_PARAM[tabParam] !== undefined ? TAB_INDEX_BY_PARAM[tabParam] : 1;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    if (tabParam && TAB_INDEX_BY_PARAM[tabParam] !== undefined) {
      setActiveTab(TAB_INDEX_BY_PARAM[tabParam]);
    }
  }, [tabParam]);

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
    const next = new URLSearchParams(searchParams);
    const param = TAB_PARAM_BY_INDEX[newValue];
    if (!param) {
      next.delete('tab');
    } else {
      next.set('tab', param);
    }
    setSearchParams(next, { replace: true });
  };

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
        borderBottom: `2px solid ${T.border}`,
        bgcolor: T.bg1,
        px: 3,
        pt: 2,
        fontFamily: 'Geist, system-ui, sans-serif',
      }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontSize: 13,
              fontWeight: 700,
              minHeight: 44,
              color: T.text3,
              '&.Mui-selected': {
                color: T.primaryDeep,
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: T.primary,
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
