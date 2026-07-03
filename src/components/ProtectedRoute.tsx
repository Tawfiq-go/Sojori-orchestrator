import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/authConfig';
import { logAuth, maskToken } from '../utils/dashboardDebug';
import { getToken } from '../utils/authUtils';
import { canAccessProtectedRoutes, hasActiveSession } from '../utils/devApiAccess';
import { CircularProgress, Box, Typography } from '@mui/material';

/**
 * Route protégée : redirige vers /login si pas de session (JWT ou VITE_DEV_TOKEN en dev).
 * VITE_DISABLE_AUTH ne contourne plus le garde sans jeton — évite l’écran « fantôme » sans sidebar.
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading, error, user } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.VITE_DASHBOARD_DEBUG !== 'true') return;
    logAuth('ProtectedRoute', {
      path: location.pathname,
      loading,
      isAuthenticated,
      hasActiveSession: hasActiveSession(),
      userEmail: user?.email ?? null,
      error: error ?? null,
      tokenPreview: maskToken(getToken()),
    });
  }, [location.pathname, loading, isAuthenticated, user?.email, error]);

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 2,
          height: '100vh',
          width: '100vw',
          bgcolor: '#fbfaf6',
        }}
      >
        <CircularProgress size={60} />
        <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
          Vérification de la session…
        </Typography>
      </Box>
    );
  }

  if (!canAccessProtectedRoutes(isAuthenticated)) {
    logAuth('ProtectedRoute → /login', {
      from: location.pathname,
      error,
      hasActiveSession: hasActiveSession(),
      isAuthenticated,
    });
    return (
      <Navigate to={AUTH_CONFIG.LOGOUT_REDIRECT} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
};
