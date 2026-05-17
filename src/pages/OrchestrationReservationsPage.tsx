import React from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import OrchestrationViewWithTabs from '../components/orchestration/OrchestrationViewWithTabs';

/**
 * Vue principale orchestration V2 avec onglets.
 * Onglets: Plans | Chronologie | Événement | Daily Ops | Configuration
 * L'onglet "Plans" contient les cartes scroll + Timeline 3 niveaux (Claude Design).
 */
export function OrchestrationReservationsPage() {
  return (
    <DashboardWrapper breadcrumb={['Pilotage', 'Orchestration']}>
      <OrchestrationViewWithTabs />
    </DashboardWrapper>
  );
}

export default OrchestrationReservationsPage;
