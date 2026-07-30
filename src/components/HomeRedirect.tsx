import { Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { hasAdminAccess } from '../utils/rbac.utils';
import { usePmSimulation } from '../context/PmSimulationContext';

/**
 * Landing `/` :
 * - SuperAdmin / Admin → Monitor owners (`/admin/owner-monitor`)
 * - Owner / Worker / Landlord → Tableau de bord
 * - Simulation PM active → dashboard (vue owner)
 */
export function HomeRedirect() {
  const { user, loading } = useAuth();
  const { simulationActive } = usePmSimulation();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh' }}>
        <CircularProgress size={36} />
      </Box>
    );
  }

  if (hasAdminAccess(user?.role) && !simulationActive) {
    return <Navigate to="/admin/owner-monitor" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

export default HomeRedirect;
