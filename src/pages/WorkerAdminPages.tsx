/**
 * Pages création / édition Workers (accès dashboard) — wrappers orchestrator.
 */
import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import CreateWorkerForm from '../features/staff/components/createWorker';
import CreateOwnerWorkerForm from '../features/staff/components/createOwnerWorker';
import EditWorkerForm from '../features/staff/components/editWorker';

function WorkerFormShell({
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

export function WorkerCreatePage() {
  return (
    <WorkerFormShell breadcrumb={['Équipe & Rôles', 'Accès dashboard', 'Inviter']}>
      <CreateWorkerForm />
    </WorkerFormShell>
  );
}

export function WorkerCreateOwnerPage() {
  return (
    <WorkerFormShell breadcrumb={['Équipe & Rôles', 'Owner workers', 'Créer']}>
      <CreateOwnerWorkerForm />
    </WorkerFormShell>
  );
}

export function WorkerEditPage() {
  return (
    <WorkerFormShell breadcrumb={['Équipe & Rôles', 'Accès dashboard', 'Modifier']}>
      <EditWorkerForm />
    </WorkerFormShell>
  );
}
