import React, { useEffect, useState } from 'react';
import ReservationsSidebar from './ReservationsSidebar';
import PlanDetail from './PlanDetail';
import type { Reservation, ReservationPlan, PlanListQuery, ResaFilterKey, ResaSortKey } from './types';
import './planReservation.css';

interface Props {
  reservations: Reservation[];
  totalCount: number;
  plans: Record<string, ReservationPlan>;
  initialId?: string;
  /** Chargement du plan complet (GET /plans/:id). */
  planLoadingId?: string | null;
  /** Admin plateforme : bandeau si config = template global. */
  showAdminConfigSource?: boolean;
  resolveOwnerDisplayName?: (ownerId?: string) => string;
  onSelect?: (reservationId: string) => void;
  /** Met à jour le plan affiché sans recharger la liste (réponse POST envoi manuel). */
  onPlanUpdated?: (planDoc?: import('./buildPlanViewModel').FulltaskPlanDoc) => void;
  onPlanRefetch?: () => void;
  listTitle?: string;
  listQuery: PlanListQuery;
  searchInput: string;
  listRefreshing?: boolean;
  onFiltersChange: (filters: ResaFilterKey[]) => void;
  onSortChange: (sort: ResaSortKey) => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearFilters: () => void;
}

export default function PlanReservationPage({
  reservations,
  totalCount,
  plans,
  initialId,
  planLoadingId = null,
  onSelect,
  showAdminConfigSource = false,
  resolveOwnerDisplayName,
  onPlanUpdated,
  onPlanRefetch,
  listTitle,
  listQuery,
  searchInput,
  listRefreshing = false,
  onFiltersChange,
  onSortChange,
  onSearchInputChange,
  onSearchSubmit,
  onClearFilters,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(initialId ?? null);

  useEffect(() => {
    if (initialId) setActiveId(initialId);
  }, [initialId]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    onSelect?.(id);
  };

  const activeResa = activeId ? reservations.find((r) => r.id === activeId) : null;
  const activePlan = activeId ? plans[activeId] : null;
  const loadingDetail = Boolean(activeId && planLoadingId === activeId && !activePlan);

  return (
    <div className="so-plan-res">
      <div className="app">
        <ReservationsSidebar
          reservations={reservations}
          totalCount={totalCount}
          activeId={activeId}
          onSelect={handleSelect}
          listTitle={listTitle}
          filters={listQuery.filters}
          sort={listQuery.sort}
          searchInput={searchInput}
          appliedSearch={listQuery.search}
          listRefreshing={listRefreshing}
          onFiltersChange={onFiltersChange}
          onSortChange={onSortChange}
          onSearchInputChange={onSearchInputChange}
          onSearchSubmit={onSearchSubmit}
          onClearFilters={onClearFilters}
        />
        {activeResa && activePlan ? (
          <PlanDetail
            reservation={activeResa}
            plan={activePlan}
            showAdminConfigSource={showAdminConfigSource}
            ownerDisplayName={
              activePlan.ownerId && resolveOwnerDisplayName
                ? resolveOwnerDisplayName(activePlan.ownerId)
                : undefined
            }
            onPlanUpdated={onPlanUpdated}
            onPlanRefetch={onPlanRefetch}
          />
        ) : (
          <div
            className="wrap"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--t3)',
              padding: 24,
              textAlign: 'center',
            }}
          >
            {loadingDetail
              ? 'Chargement du plan…'
              : activeResa && !activePlan
                ? 'Plan introuvable ou erreur de chargement.'
                : initialId && !activeResa
                  ? "Aucun plan pour cette réservation — vérifiez l'URL ou créez le plan via orchestration."
                  : 'Sélectionnez un plan dans la liste.'}
          </div>
        )}
      </div>
    </div>
  );
}
