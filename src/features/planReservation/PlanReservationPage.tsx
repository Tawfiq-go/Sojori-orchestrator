import React, { useEffect, useState } from 'react';
import ReservationsSidebar from './ReservationsSidebar';
import PlanDetail from './PlanDetail';
import PlansFilterToolbar from './PlansFilterToolbar';
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
  listingOptions?: { id: string; name: string }[];
  listHasMore?: boolean;
  onFiltersChange: (filters: ResaFilterKey[]) => void;
  onSortChange: (sort: ResaSortKey) => void;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: () => void;
  onClearFilters: () => void;
  onListingIdChange?: (listingId: string) => void;
  onPageChange?: (page: number) => void;
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
  listingOptions = [],
  listHasMore = false,
  onFiltersChange,
  onSortChange,
  onSearchInputChange,
  onSearchSubmit,
  onClearFilters,
  onListingIdChange,
  onPageChange,
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
      <div className="plans-shell">
        <PlansFilterToolbar
          filters={listQuery.filters}
          sort={listQuery.sort}
          listingId={listQuery.listingId || ''}
          listingOptions={listingOptions}
          onFiltersChange={onFiltersChange}
          onSortChange={onSortChange}
          onListingIdChange={onListingIdChange}
          onClearFilters={onClearFilters}
        />
        <div className="app">
          <ReservationsSidebar
            reservations={reservations}
            totalCount={totalCount}
            activeId={activeId}
            onSelect={handleSelect}
            listTitle={listTitle}
            searchInput={searchInput}
            appliedSearch={listQuery.search}
            listRefreshing={listRefreshing}
            page={listQuery.page ?? 1}
            pageSize={100}
            hasMore={listHasMore}
            hasActiveQuery={
              listQuery.filters.length > 0 ||
              Boolean(listQuery.search.trim()) ||
              Boolean(listQuery.listingId?.trim())
            }
            onSearchInputChange={onSearchInputChange}
            onSearchSubmit={onSearchSubmit}
            onClearFilters={onClearFilters}
            onPageChange={onPageChange}
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
                    ? showAdminConfigSource
                      ? "Aucun plan pour cette réservation — vérifiez l'URL ou créez le plan via orchestration."
                      : 'Aucun plan pour cette réservation.'
                    : 'Sélectionnez un plan dans la liste.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
