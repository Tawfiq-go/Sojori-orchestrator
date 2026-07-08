import { DashboardWrapper } from '../components/DashboardWrapper';
import { DayPlanDashboard } from '../features/dayPlan/DayPlanDashboard';

export function OrchestrationDayPlanPage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Plan de journée']}>
      <DayPlanDashboard />
    </DashboardWrapper>
  );
}

export default OrchestrationDayPlanPage;
