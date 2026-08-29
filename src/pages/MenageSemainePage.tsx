// ════════════════════════════════════════════════════════════════════
// MenageSemainePage.tsx — /menage/semaine
// Semaine ménage : villas × 7 jours, crédits par jour vs capacité —
// « quel jour va déborder ? » (spec desktop mobile whatsapp, écran 1).
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import SemaineMenage from '../features/menageRack/SemaineMenage';

export function MenageSemainePage() {
  return (
    <DashboardWrapper breadcrumb={['Vue ops', 'Semaine ménage']}>
      <SemaineMenage />
    </DashboardWrapper>
  );
}

export default MenageSemainePage;
