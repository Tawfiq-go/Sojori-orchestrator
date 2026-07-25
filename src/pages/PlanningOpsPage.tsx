/**
 * Planning ops (Vue ops) — grille résas / tasks / messages.
 * Entrée sidebar dédiée — pas le chrome Inbox Guest (WA / OTA / …).
 */
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { DASHBOARD_PAGE_FILL_SX } from '../constants/dashboardLayout';
import ResasTabV2 from '../components/communications/ResasTabV2';

export default function PlanningOpsPage() {
  return (
    <DashboardWrapper hidePageHeader breadcrumb={['Vue ops', 'Planning']}>
      <Box
        sx={{
          ...DASHBOARD_PAGE_FILL_SX,
          minHeight: { xs: 'calc(100dvh - 96px)', md: 'calc(100dvh - 112px)' },
          maxHeight: { xs: 'calc(100dvh - 96px)', md: 'calc(100dvh - 112px)' },
          mb: { xs: 1.5, md: 2 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <ResasTabV2 />
      </Box>
    </DashboardWrapper>
  );
}
