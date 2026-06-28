import type { ReactNode } from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import { FinancesModule } from '../features/finances/FinancesModule';
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
        <FinancesModule>{children}</FinancesModule>
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
