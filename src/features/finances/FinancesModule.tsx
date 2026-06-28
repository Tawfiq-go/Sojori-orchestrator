import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import './finances.css';

type Props = {
  children: ReactNode;
};

/** Shell design Claude — styles scoped sous .finances-module */
export function FinancesModule({ children }: Props) {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;

  return (
    <div className="finances-module" data-role={isLandlord ? 'landlord' : 'pm'}>
      <div className="main">
        <div className="page on">{children}</div>
      </div>
    </div>
  );
}

export function useFinancesAccess() {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;
  const canWrite = !isLandlord && user?.role !== Roles.Worker;
  return { isLandlord, canWrite, user };
}
