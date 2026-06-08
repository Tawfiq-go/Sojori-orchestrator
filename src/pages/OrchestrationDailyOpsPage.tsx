import { DashboardWrapper } from '../components/DashboardWrapper';
import { OpsDashboard } from '../features/ops/OpsDashboard';

export function OrchestrationDailyOpsPage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Ops · J0/J+1']}>
      <OpsDashboard />
    </DashboardWrapper>
  );
}

export default OrchestrationDailyOpsPage;
