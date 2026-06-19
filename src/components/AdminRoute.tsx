import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasAdminAccess } from '../utils/rbac.utils';

/**
 * Routes réservées SuperAdmin / Admin (mapping RU, catalogue OTA technique, etc.).
 * Les PM (Owner) ne doivent pas voir le mapping — seulement le formulaire listing.
 */
export const AdminRoute: React.FC = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();
  const devBypass = import.meta.env.VITE_DISABLE_AUTH === 'true';

  if (devBypass) return <Outlet />;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!hasAdminAccess(user?.role)) {
    return <Navigate to="/listings" replace state={{ adminOnly: true }} />;
  }

  return <Outlet />;
};

export default AdminRoute;
