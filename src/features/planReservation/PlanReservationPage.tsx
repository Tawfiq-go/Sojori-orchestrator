import React, { useEffect, useMemo, useState } from 'react';
import ReservationsSidebar from './ReservationsSidebar';
import PlanDetail from './PlanDetail';
import type { Reservation, ReservationPlan } from './types';
import './planReservation.css';

interface Props {
  reservations: Reservation[];
  plans: Record<string, ReservationPlan>;
  initialId?: string;
  onSelect?: (reservationId: string) => void;
  onPlanRefetch?: () => void;
  onPlanArchived?: (reservationId: string) => void;
  listTitle?: string;
}

export default function PlanReservationPage({
  reservations,
  plans,
  initialId,
  onSelect,
  onPlanRefetch,
  onPlanArchived,
  listTitle,
}: Props) {
  const defaultId = useMemo(() => {
    if (initialId && plans[initialId]) return initialId;
    const blocked = reservations.find((r) => r.status === 'blocked');
    if (blocked) return blocked.id;
    const now = reservations.find((r) => r.status === 'now');
    if (now) return now.id;
    return reservations[0]?.id || null;
  }, [reservations, plans, initialId]);

  const [activeId, setActiveId] = useState<string | null>(defaultId);

  useEffect(() => {
    if (initialId && plans[initialId]) {
      setActiveId(initialId);
    }
  }, [initialId, plans]);

  const handleSelect = (id: string) => {
    setActiveId(id);
    onSelect?.(id);
  };

  const activeResa = activeId ? reservations.find((r) => r.id === activeId) : null;
  const activePlan = activeId ? plans[activeId] : null;

  return (
    <div className="so-plan-res">
      <div className="app">
        <ReservationsSidebar
          reservations={reservations}
          activeId={activeId}
          onSelect={handleSelect}
          listTitle={listTitle}
        />
        {activeResa && activePlan ? (
          <PlanDetail
            reservation={activeResa}
            plan={activePlan}
            onPlanRefetch={onPlanRefetch}
            onPlanArchived={onPlanArchived}
          />
        ) : (
          <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t3)' }}>
            {initialId && !plans[initialId]
              ? "Aucun plan pour cette réservation — vérifiez l'URL ou créez le plan via orchestration."
              : 'Sélectionnez un plan dans la liste.'}
          </div>
        )}
      </div>
    </div>
  );
}
