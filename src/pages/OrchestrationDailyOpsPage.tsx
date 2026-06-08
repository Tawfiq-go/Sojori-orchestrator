import { useNavigate } from 'react-router-dom';
import { Box, Tab, Tabs } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as t } from '../components/dashboard/DashboardV2.components';
import { OpsDashboard } from '../features/ops/OpsDashboard';

export function OrchestrationDailyOpsPage() {
  const navigate = useNavigate();
  const tab = 3;

  const handleTabChange = (_: unknown, newValue: number) => {
    if (newValue === 0) navigate('/tasks/plans');
    if (newValue === 1) navigate('/orchestration');
    if (newValue === 2) navigate('/orchestration/events');
    if (newValue === 4) navigate('/orchestration/config');
  };

  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Ops']}>
      <Box sx={{ borderBottom: 1, borderColor: t.border, mb: 0 }}>
        <Tabs value={tab} onChange={handleTabChange} sx={{ px: 3 }}>
          <Tab label="Plans" />
          <Tab label="Chronologie" />
          <Tab label="Événement" />
          <Tab label="Ops" />
          <Tab label="Configuration" />
        </Tabs>
      </Box>
      <OpsDashboard />
    </DashboardWrapper>
  );
}

export default OrchestrationDailyOpsPage;
