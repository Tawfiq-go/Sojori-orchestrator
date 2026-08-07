import { DashboardWrapper } from '../components/DashboardWrapper';
import { MaJourneeDashboard } from '../features/maJournee/MaJourneeDashboard';

export function MaJourneePage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Ma journée']}>
      <MaJourneeDashboard />
    </DashboardWrapper>
  );
}

export default MaJourneePage;
