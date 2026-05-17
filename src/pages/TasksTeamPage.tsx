import { Box, Button, Stack } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { PageHeader, btnGhostSx } from '../components/dashboard/DashboardV2.components';
import { StaffTeamPlanningView } from '../components/tasks/StaffTeamPlanningView';

/**
 * Aligné admin `/admin/Tasks?tab=equipe` (StaffViewPage) : grille staff × jours,
 * barre du jour, filtres — design Dashboard V2.
 */
export function TasksTeamPage() {
  return (
    <DashboardWrapper breadcrumb={['Tâches & Opérations', 'Équipe & planning']}>
      <PageHeader title="Équipe & planning" count="Vue grille">
        <Button component={RouterLink} to="/tasks" sx={btnGhostSx}>
          Liste des tâches
        </Button>
        <Button component={RouterLink} to="/tasks/planning" sx={btnGhostSx}>
          Vue séjour
        </Button>
      </PageHeader>

      <Box sx={{ px: { xs: 2, md: 3 }, pb: 4 }}>
        <Stack spacing={2}>
          <StaffTeamPlanningView />
        </Stack>
      </Box>
    </DashboardWrapper>
  );
}
