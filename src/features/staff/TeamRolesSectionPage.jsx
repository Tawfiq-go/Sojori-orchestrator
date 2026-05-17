import React, { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Box } from '@mui/material';
import TabSectionPage from 'components/TabSectionPage';
import AdminOwnerScopeLayout from 'components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import StaffDashboard from './StaffDashboard.page';
import AdminWhatsapp from './admin.whatsapp.page';
import WorkerPage from './Worker.page';
import GroupsPage from './GroupsPage';
import TeamRolesFooterNav from './TeamRolesFooterNav';

const tabComponents = {
  'staff-dashboard': StaffDashboard,
  'admin-whatsapp': AdminWhatsapp,
  worker: WorkerPage,
  groups: GroupsPage,
};

const VALID_TEAM_TABS = new Set(Object.keys(tabComponents));

export default function TeamRolesSectionPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    if (tabParam === 'owners') return;
    if (!tabParam || !VALID_TEAM_TABS.has(tabParam)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'staff-dashboard');
          return next;
        },
        { replace: true },
      );
    }
  }, [tabParam, setSearchParams]);

  /** Ancien onglet « Propriétaires » = même écran que Property manager (/admin/User/owner). */
  if (searchParams.get('tab') === 'owners') {
    return <Navigate to="/admin/User/owner?tab=list" replace />;
  }

  return (
    <AdminOwnerScopeLayout inlineBar={false}>
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <TabSectionPage tabComponents={tabComponents} defaultTab="staff-dashboard" />
      </Box>
      <Box
        sx={{
          flexShrink: 0,
          position: 'sticky',
          bottom: 0,
          zIndex: 2,
          borderTop: '1px solid rgba(255, 107, 53, 0.22)',
          py: 0.5,
          px: { xs: 0.5, sm: 1 },
          bgcolor: 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 -4px 20px rgba(15, 23, 42, 0.06)',
        }}
      >
        <TeamRolesFooterNav />
      </Box>
    </Box>
    </AdminOwnerScopeLayout>
  );
}
