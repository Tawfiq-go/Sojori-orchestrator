import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/authConfig';
import { CircularProgress, Box } from '@mui/material';

/**
 * Composant de route protégée
 * Basé sur /Users/gouacht/sojori-dashboard/src/components/wrappers/AuthRoute.jsx
 *
 * Affiche le contenu (Outlet) si l'utilisateur est authentifié,
 * sinon redirige vers la page de login
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          width: '100vw',
        }}
      >
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Outlet />;
  }

  return <Navigate to={AUTH_CONFIG.LOGOUT_REDIRECT} replace />;
};
