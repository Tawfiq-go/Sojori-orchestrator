import React from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../../../hooks/useAuth';
import { hasAdminAccess } from '../../../utils/rbac.utils';
import { MonitorEmpty, MonitorPageFrame } from './MonitorDesign';

/**
 * Restricts monitoring views to SuperAdmin / Admin only (not Owner, Worker, Landlord).
 */
export function MonitorAdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <MonitorPageFrame>
        <MonitorEmpty message="Vérification des droits…" />
      </MonitorPageFrame>
    );
  }

  if (!hasAdminAccess(user?.role)) {
    return <Navigate to="/forbidden" replace state={{ reason: 'platform_admin_denied' }} />;
  }

  return <>{children}</>;
}

export function MonitorAdminDenied() {
  return (
    <MonitorPageFrame>
      <Box sx={{ py: 4 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, mb: 1 }}>
          Accès réservé aux administrateurs
        </Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
          Cette page est réservée aux comptes SuperAdmin et Admin. Les propriétaires (owners) n'y ont pas accès.
        </Typography>
      </Box>
    </MonitorPageFrame>
  );
}
