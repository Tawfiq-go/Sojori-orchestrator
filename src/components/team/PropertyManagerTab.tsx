/** Property manager — admin plateforme uniquement */
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { hasAdminAccess } from '../../utils/rbac.utils';
import PublicOwner from '../../features/staff/components/PublicOwner';

export function PropertyManagerTab() {
  const { user } = useAuth();
  if (!hasAdminAccess(user?.role)) {
    return <Navigate to="/admin/equipe?tab=worker" replace />;
  }
  return <PublicOwner insidePageShell />;
}

export default PropertyManagerTab;
