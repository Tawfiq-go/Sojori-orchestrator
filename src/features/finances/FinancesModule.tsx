import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import { FinancesOwnerScopeBar } from './components/FinancesOwnerScopeBar';
import './finances.css';

type Props = {
  children: ReactNode;
};

/**
 * Shell Finances — même AdminOwnerFilter que le top bar (pas de provider imbriqué).
 * Un 2e AdminOwnerFilterProvider désynchro Shell Moncef vs barre Amine → totaux à 0 / rapports « sans filtre ».
 */
export function FinancesModule({ children }: Props) {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;

  return (
    <div className="finances-module" data-role={isLandlord ? 'landlord' : 'pm'}>
      <FinancesOwnerScopeBar />
      <div className="main">
        <div className="page on">{children}</div>
      </div>
    </div>
  );
}

export function useFinancesAccess() {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;
  // Aligné writeAccess : Landlord + Worker sans écriture finances
  const canWrite = !isLandlord && user?.role !== Roles.Worker;
  return { isLandlord, canWrite, user };
}
