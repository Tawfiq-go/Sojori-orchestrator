import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import CronMonitoringView from '../components/orchestration/CronMonitoringView';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import { Box, Tabs, Tab } from '@mui/material';

export function OrchestrationEventsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(2);

  const handleTabChange = (_: unknown, newValue: number) => {
    setTab(newValue);
    if (newValue === 0) navigate('/orchestration?tab=orchestration');
    if (newValue === 1) navigate('/orchestration');
    if (newValue === 3) navigate('/orchestration/daily-ops');
    if (newValue === 4) navigate('/orchestration/config');
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Événements']}>
      <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }}>
          <Tab label="Plans" />
          <Tab label="Chronologie" />
          <Tab label="Événement" />
          <Tab label="Daily Ops" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>
      <CronMonitoringView />
    </DashboardWrapper>
  );
}
