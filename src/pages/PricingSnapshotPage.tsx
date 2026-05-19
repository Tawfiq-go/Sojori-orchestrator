import { Box, Typography } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';

export function PricingSnapshotPage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Pricing']}>
      <Box sx={{ p: 3 }}>
        <Typography variant="h5">Pricing snapshot</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Page en cours d&apos;intégration.
        </Typography>
      </Box>
    </DashboardWrapper>
  );
}
