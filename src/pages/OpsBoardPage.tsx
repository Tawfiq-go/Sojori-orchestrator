// ════════════════════════════════════════════════════════════════════
// OpsBoardPage.tsx — /ops-board
// Suivi unités Nommos (design Claude Ops Board) — maquette navigable.
// ════════════════════════════════════════════════════════════════════
import { DashboardWrapper } from '../components/DashboardWrapper';
import OpsBoard from '../features/opsBoard/OpsBoard';

export function OpsBoardPage() {
  return (
    <DashboardWrapper breadcrumb={['Vue ops', 'Ops Board']}>
      <OpsBoard />
    </DashboardWrapper>
  );
}

export default OpsBoardPage;
