// ════════════════════════════════════════════════════════════════════
// AiCockpitPage.tsx — /orchestration/cockpit
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import AiCockpit from '../features/aiCockpit/AiCockpit';

export function AiCockpitPage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration', 'Cockpit IA']}>
      <AiCockpit />
    </DashboardWrapper>
  );
}

export default AiCockpitPage;
