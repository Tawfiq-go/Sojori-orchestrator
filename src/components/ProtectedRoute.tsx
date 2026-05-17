import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { AUTH_CONFIG } from '../config/authConfig';
import { logAuth, maskToken } from '../utils/dashboardDebug';
import { getToken } from '../utils/authUtils';
import { CircularProgress, Box, Typography } from '@mui/material';

/**
 * Composant de route protégée (équivalent AuthRoute historique).
 *
 * Affiche le contenu (Outlet) si l'utilisateur est authentifié,
 * sinon redirige vers la page de login
 *
 * 🧪 DEV MODE: Set VITE_DISABLE_AUTH=true to skip authentication (frontend only)
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading, error, user } = useAuth();
  const location = useLocation();

  // 🧪 Garde routes uniquement : n’empêche pas d’envoyer le Bearer sur les APIs
  const DEV_MODE_NO_AUTH = import.meta.env.VITE_DISABLE_AUTH === 'true';

  useEffect(() => {
    logAuth('ProtectedRoute', {
      path: location.pathname,
      loading,
      isAuthenticated,
      userEmail: user?.email ?? null,
      error: error ?? null,
      tokenPreview: maskToken(getToken()),
      devModeNoAuth: DEV_MODE_NO_AUTH,
    });
  }, [location.pathname, loading, isAuthenticated, user?.email, error, DEV_MODE_NO_AUTH]);

  // 🧪 DEV MODE: Bypass auth check (voir aussi apiClient : avertissement unique au chargement du module)
  if (DEV_MODE_NO_AUTH) {
    return <Outlet />;
  }

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
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
          Console navigateur : filtre « Sojori »
        </Typography>
      </Box>
    );
  }

  if (isAuthenticated) {
    return <Outlet />;
  }

  logAuth('ProtectedRoute → /login', { from: location.pathname, error });
  return <Navigate to={AUTH_CONFIG.LOGOUT_REDIRECT} replace state={{ from: location.pathname }} />;
};
