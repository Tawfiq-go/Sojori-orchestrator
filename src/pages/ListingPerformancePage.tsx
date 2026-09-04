import { Suspense } from 'react';
import { Alert, Box, CircularProgress, Typography } from '@mui/material';
import { lazyWithReload } from '../utils/lazyWithReload';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';

const ListingPerformanceTab = lazyWithReload(() =>
  import('../features/listingPerformance/ListingPerformanceTab').then((m) => ({ default: m.default })),
);

export function ListingPerformancePage() {
  const { requestOwnerId, ownerScopeUnset } = useAdminOwnerFilter();

  return (
    <DashboardWrapper hidePageHeader disableScopeGate>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 1.5 }}>
        Performance par bien
      </Typography>

      {ownerScopeUnset ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Choisissez <strong>Tous (plateforme)</strong> pour agréger tout le parc, ou sélectionnez un property
          manager pour son portefeuille.
        </Alert>
      ) : (
        <Suspense
          fallback={
            <Box sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={48} />
              <Typography variant="body2" color="text.secondary">
                Chargement…
              </Typography>
            </Box>
          }
        >
          <ListingPerformanceTab ownerId={requestOwnerId || undefined} />
        </Suspense>
      )}
    </DashboardWrapper>
  );
}

export default ListingPerformancePage;
