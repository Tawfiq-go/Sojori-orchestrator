/**
 * Hub Équipe & Rôles — migration sojori-dashboard
 */
import { useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { teamSectionFromPath, type TeamSection } from '../utils/teamUrlUtils';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import { PropertyManagerTab } from '../components/team/PropertyManagerTab';
import { StaffDashboardTab } from '../components/team/StaffDashboardTab';
import { AdminWhatsappTab } from '../components/team/AdminWhatsappTab';
import { RolesPermissionsTab } from '../components/team/RolesPermissionsTab';
import { GroupsTab } from '../components/team/GroupsTab';

const SECTIONS: Array<{ id: TeamSection; label: string; icon: string }> = [
  { id: 'property-manager', label: 'Property manager', icon: '🏢' },
  { id: 'staff-dashboard', label: 'Dashboard Staff', icon: '👥' },
  { id: 'admin-whatsapp', label: 'Admin WhatsApp', icon: '📱' },
  { id: 'worker', label: 'Rôles & Permissions', icon: '🔐' },
  { id: 'groups', label: 'Groupes', icon: '👨‍👩‍👧‍👦' },
];

export function TeamRolesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = teamSectionFromPath(pathname, searchParams.get('tab'));

  useEffect(() => {
    if (pathname.includes('/admin/equipe/owners') && !searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'list');
      setSearchParams(next, { replace: true });
    } else if (pathname === '/admin/equipe' && !searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'staff-dashboard');
      setSearchParams(next, { replace: true });
    }
  }, [pathname, searchParams, setSearchParams]);

  const setSection = (id: TeamSection) => {
    if (id === 'property-manager') {
      navigate('/admin/equipe/owners?tab=list');
      return;
    }
    const next = new URLSearchParams(searchParams);
    const tabMap: Record<TeamSection, string> = {
      'property-manager': 'list',
      'staff-dashboard': 'staff-dashboard',
      'admin-whatsapp': 'admin-whatsapp',
      worker: 'worker',
      groups: 'groups',
    };
    next.set('tab', tabMap[id]);
    navigate(`/admin/equipe?${next.toString()}`);
  };

  return (
    <DashboardWrapper breadcrumb={['Équipe & Rôles', SECTIONS.find((s) => s.id === section)?.label || '']}>
      <LegacyReduxProvider>
      <AdminOwnerScopeLayout inlineBar={false} showTopBar={false}>
      <div style={{ padding: '22px 28px 50px', maxWidth: 1680, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0 }}>Équipe & Rôles</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '6px 0 0' }}>
            Property managers, staff, WhatsApp admin, rôles et groupes
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            borderBottom: `2px solid ${T.border}`,
            marginBottom: 24,
          }}
        >
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                style={{
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? T.primary : T.text3,
                  background: 'transparent',
                  border: 0,
                  borderBottom: `3px solid ${active ? T.primary : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: -2,
                }}
              >
                <span>{s.icon}</span>
                {s.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 20,
            minHeight: 480,
          }}
        >
          {section === 'property-manager' && <PropertyManagerTab />}
          {section === 'staff-dashboard' && <StaffDashboardTab />}
          {section === 'admin-whatsapp' && <AdminWhatsappTab />}
          {section === 'worker' && <RolesPermissionsTab />}
          {section === 'groups' && <GroupsTab />}
        </div>
      </div>
      </AdminOwnerScopeLayout>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export function TeamLegacyRedirect() {
  const { pathname, search } = useLocation();
  const q = search || '';
  if (pathname.includes('/admin/User/owner')) {
    return <Navigate to={`/admin/equipe/owners${q || '?tab=list'}`} replace />;
  }
  return <Navigate to={`/admin/equipe${q || '?tab=staff-dashboard'}`} replace />;
}

export default TeamRolesHubPage;
