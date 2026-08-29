// ════════════════════════════════════════════════════════════════════
// MenageRackPage.tsx — /menage/rack
// Rack ménage « la journée » : fenêtres départ→arrivée + blocs de ménage
// (spec Sojori Housekeeping écran 1 — retard géométrique, tri par urgence).
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import RackMenage from '../features/menageRack/RackMenage';

export function MenageRackPage() {
  return (
    <DashboardWrapper breadcrumb={['Vue ops', 'Rack ménage']}>
      <RackMenage />
    </DashboardWrapper>
  );
}

export default MenageRackPage;
