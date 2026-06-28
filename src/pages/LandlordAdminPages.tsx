import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import LandlordForm from '../features/finances/components/LandlordForm';

function LandlordFormShell({
  breadcrumb,
  children,
}: {
  breadcrumb: string[];
  children: ReactNode;
}) {
  return (
    <DashboardWrapper breadcrumb={breadcrumb}>
      <LegacyReduxProvider>
        <AdminOwnerScopeLayout inlineBar={false} showTopBar={false}>
          <Box sx={{ bgcolor: '#f6f5f1', minHeight: '100%' }}>{children}</Box>
        </AdminOwnerScopeLayout>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export function LandlordCreatePage() {
  return (
    <LandlordFormShell breadcrumb={['Finances', 'Propriétaires', 'Ajouter']}>
      <LandlordForm />
    </LandlordFormShell>
  );
}

export function LandlordEditPage() {
  return (
    <LandlordFormShell breadcrumb={['Finances', 'Propriétaires', 'Modifier']}>
      <LandlordForm />
    </LandlordFormShell>
  );
}
