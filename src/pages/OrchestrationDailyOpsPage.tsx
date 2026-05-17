import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import {
  PageHeader, Panel,
  btnGhostSx, btnPrimarySx,
  tokens as t,
} from '../components/dashboard/DashboardV2.components';
import { Box, Button, Stack, Typography, Tabs, Tab } from '@mui/material';

export function OrchestrationDailyOpsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(3); // Tab 3 = Daily Ops

  const handleTabChange = (_: any, newValue: number) => {
    setTab(newValue);
    if (newValue === 0) navigate('/admin/orchestrator'); // Plans
    if (newValue === 1) navigate('/orchestration'); // Chronologie
    if (newValue === 2) navigate('/orchestration/events'); // Événements
    if (newValue === 4) navigate('/orchestration/config'); // Configuration
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Daily Ops']}>
      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }}>
          <Tab label="Plans" />
          <Tab label="Chronologie" />
          <Tab label="Événement" />
          <Tab label="Daily Ops" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>

      <Box sx={{ px: 3 }}>
      <PageHeader title="✨ Orchestration · Daily Ops" count="Aujourd'hui">
        <Button sx={btnGhostSx}>📥 Exporter</Button>
        <Button sx={btnPrimarySx}>🔍 Filtrer</Button>
      </PageHeader>

      <Stack spacing={2.25}>
        <Panel title="Opérations du jour">
          <Typography sx={{ color: t.text3, fontSize: 14 }}>
            Fonctionnalité Daily Ops à venir...
          </Typography>
        </Panel>
      </Stack>
      </Box>
    </DashboardWrapper>
  );
}

export default OrchestrationDailyOpsPage;
