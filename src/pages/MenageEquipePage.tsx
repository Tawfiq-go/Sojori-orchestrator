// ════════════════════════════════════════════════════════════════════
// MenageEquipePage.tsx — /menage/equipe
// Équipe ménage : qui travaille quand, capacité, plafonds de crédits —
// (spec écrans web complémentaires, écran 8 — ni note, ni score).
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import EquipeMenage from '../features/menageRack/EquipeMenage';

export function MenageEquipePage() {
  return (
    <DashboardWrapper breadcrumb={['Vue ops', 'Équipe ménage']}>
      <EquipeMenage />
    </DashboardWrapper>
  );
}

export default MenageEquipePage;
