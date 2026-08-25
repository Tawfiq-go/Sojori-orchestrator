import { Typography } from '@mui/material';
import { DashboardWrapper } from '../../components/DashboardWrapper';
import { useFinancesOwnerScope } from '../finances/useFinancesOwnerScope';
import { ExtraCatalogTable } from './ExtraCatalogTable';

export function TasksExtrasListPage() {
  const { ownerId } = useFinancesOwnerScope();

  return (
    <DashboardWrapper breadcrumb={['Task', 'Extra', 'Liste extra']}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
        Stock hôtel → villas : cochez les produits, les villas, puis « Mettre à jour le stock ».
        L’import Mews est sur Configuration Extra.
      </Typography>
      <ExtraCatalogTable ownerId={ownerId} allowApply />
    </DashboardWrapper>
  );
}
