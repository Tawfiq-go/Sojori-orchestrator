import type { ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Roles } from '../../constants/roles';
import AdminOwnerScopeLayout from '../../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import { FinancesOwnerScopeBar } from './components/FinancesOwnerScopeBar';
import './finances.css';

type Props = {
  children: ReactNode;
};

/** Shell design Claude — styles scoped sous .finances-module */
export function FinancesModule({ children }: Props) {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;

  return (
    <AdminOwnerScopeLayout showTopBar={false}>
      <div className="finances-module" data-role={isLandlord ? 'landlord' : 'pm'}>
        <FinancesOwnerScopeBar />
        <div className="main">
          <div className="page on">{children}</div>
        </div>
      </div>
    </AdminOwnerScopeLayout>
  );
}

export function useFinancesAccess() {
  const { user } = useAuth();
  const isLandlord = user?.role === Roles.Landlord;
  const canWrite = !isLandlord && user?.role !== Roles.Worker;
  return { isLandlord, canWrite, user };
}
