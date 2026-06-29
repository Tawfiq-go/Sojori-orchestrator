import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { canAccessProtectedRoutes } from '../utils/devApiAccess';
import { resolveRouteAccess } from '../utils/resolveRouteAccess';

const devBypass = import.meta.env.VITE_DISABLE_AUTH === 'true';

/**
 * Garde centralisée : vérifie zone admin vs PM vs worker/landlord sur chaque navigation.
 * Les admins gardent l'accès aux routes infra même en mode simulation PM.
 */
export function RouteAccessGuard() {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (devBypass) return <Outlet />;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!canAccessProtectedRoutes(isAuthenticated)) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (location.pathname === '/forbidden') {
    return <Outlet />;
  }

  const access = resolveRouteAccess({
    pathname: location.pathname,
    search: location.search,
    role: user?.role,
    featureGrants: user?.featureGrants,
    ownerAccess: user?.ownerAccess,
  });

  if (!access.allowed) {
    return (
      <Navigate
        to="/forbidden"
        replace
        state={{
          from: location.pathname,
          reason: access.reason,
          navId: access.navId,
          zone: access.zone,
        }}
      />
    );
  }

  return <Outlet />;
}

export default RouteAccessGuard;
