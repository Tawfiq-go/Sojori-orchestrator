// ════════════════════════════════════════════════════════════════════
// MenageRepartitionPage.tsx — /menage/repartition
// Répartition ménage : colonnes par femme de ménage, jauges de crédits,
// « À assigner » en tête (spec Sojori Housekeeping écran 3 — v1 lecture seule).
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import RepartitionMenage from '../features/menageRack/RepartitionMenage';

export function MenageRepartitionPage() {
  return (
    <DashboardWrapper breadcrumb={['Vue ops', 'Répartition ménage']}>
      <RepartitionMenage />
    </DashboardWrapper>
  );
}

export default MenageRepartitionPage;
