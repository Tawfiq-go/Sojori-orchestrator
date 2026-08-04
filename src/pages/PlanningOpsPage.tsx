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
    <DashboardWrapper compactMain hidePageHeader breadcrumb={['Vue ops', 'Planning']}>
      <Box
        sx={{
          ...DASHBOARD_PAGE_FILL_SX,
          height: '100%',
          minHeight: 0,
          maxHeight: '100%',
          mb: 0,
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
