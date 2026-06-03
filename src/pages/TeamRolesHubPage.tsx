/**
 * Hub Équipe & Rôles — migration sojori-dashboard
 */
import { useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { TEAM_T } from '../components/team/teamHubTokens';
import { teamSectionFromPath, type TeamSection } from '../utils/teamUrlUtils';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import { PropertyManagerTab } from '../components/team/PropertyManagerTab';
import { RolesPermissionsTab } from '../components/team/RolesPermissionsTab';
import { GroupsTab } from '../components/team/GroupsTab';
import { TeamViewProvider, useTeamViewMode } from '../context/TeamViewContext';
import { TeamViewToolbar } from '../components/team/TeamViewToolbar';
import { STAFF_DASHBOARD_LEGACY_TAB, ADMIN_WHATSAPP_LEGACY_TAB } from '../utils/teamUrlUtils';

function TeamViewToolbarSlot({ section }: { section: TeamSection }) {
  const { stats } = useTeamViewMode();
  if (section !== 'groups' && section !== 'property-manager' && section !== 'worker') return null;
  return <TeamViewToolbar stats={stats} />;
}

const SECTIONS: Array<{ id: TeamSection; label: string; icon: string; hint: string }> = [
  {
    id: 'property-manager',
    label: 'Property managers',
    icon: '🏢',
    hint: 'Comptes Owner · gestionnaires de parc (annonces, RU/Channex)',
  },
  {
    id: 'worker',
    label: 'Accès dashboard',
    icon: '🔐',
    hint: 'Workers · utilisateurs invités sur le dashboard (modules / permissions)',
  },
  {
    id: 'groups',
    label: 'Groupes',
    icon: '👨‍👩‍👧‍👦',
    hint: 'Templates de droits pour Workers (featureGrants)',
  },
];

export function TeamRolesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = teamSectionFromPath(pathname, searchParams.get('tab'));
  const legacyStaffTab = searchParams.get('tab') === STAFF_DASHBOARD_LEGACY_TAB;
  const legacyAdminTab = searchParams.get('tab') === ADMIN_WHATSAPP_LEGACY_TAB;

  useEffect(() => {
    if (legacyAdminTab) {
      navigate('/tasks/team?tab=admin', { replace: true });
      return;
    }
    if (legacyStaffTab) {
      navigate('/tasks/team', { replace: true });
      return;
    }
    if (pathname.includes('/admin/equipe/owners') && !searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'list');
      setSearchParams(next, { replace: true });
    } else if (pathname === '/admin/equipe' && !searchParams.get('tab')) {
      navigate('/admin/equipe/owners?tab=list', { replace: true });
    }
  }, [pathname, searchParams, setSearchParams, legacyStaffTab, legacyAdminTab, navigate]);

  if (legacyStaffTab || legacyAdminTab) return null;

  const setSection = (id: TeamSection) => {
    if (id === 'property-manager') {
      navigate('/admin/equipe/owners?tab=list');
      return;
    }
    const next = new URLSearchParams(searchParams);
    const tabMap: Record<TeamSection, string> = {
      'property-manager': 'list',
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
      <TeamViewProvider>
      <div style={{ padding: '22px 28px 50px', maxWidth: 1680, margin: '0 auto', background: TEAM_T.bg0, minHeight: '100%' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0 }}>Équipe & Rôles</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '6px 0 0' }}>
            Owners, accès dashboard et groupes de droits — staff terrain & admin WhatsApp sur{' '}
            <a href="/tasks/team" style={{ color: TEAM_T.primaryDeep, fontWeight: 700 }}>
              /tasks/team
            </a>
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 8,
            flexWrap: 'wrap',
            borderBottom: `2px solid ${T.border}`,
            marginBottom: 12,
          }}
        >
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                title={s.hint}
                onClick={() => setSection(s.id)}
                style={{
                  padding: '12px 18px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? TEAM_T.primary : TEAM_T.text3,
                  background: 'transparent',
                  border: 0,
                  borderBottom: `3px solid ${active ? TEAM_T.primary : 'transparent'}`,
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

        {SECTIONS.find((s) => s.id === section)?.hint ? (
          <p
            style={{
              fontSize: 12,
              color: TEAM_T.text2,
              margin: '0 0 14px',
              padding: '10px 14px',
              background: TEAM_T.bg2,
              borderRadius: 10,
              border: `1px solid ${TEAM_T.border}`,
            }}
          >
            {SECTIONS.find((s) => s.id === section)?.hint}
          </p>
        ) : null}

        <TeamViewToolbarSlot section={section} />

        <div
          style={{
            background: TEAM_T.bg1,
            border: `1px solid ${TEAM_T.border}`,
            borderRadius: 14,
            padding: 16,
            minHeight: 480,
          }}
        >
          {section === 'property-manager' && <PropertyManagerTab />}
          {section === 'worker' && <RolesPermissionsTab />}
          {section === 'groups' && <GroupsTab />}
        </div>
      </div>
      </TeamViewProvider>
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
  if (pathname.includes('/admin/User/team')) {
    const tab = new URLSearchParams(search).get('tab');
    if (tab === STAFF_DASHBOARD_LEGACY_TAB || tab === 'owners') {
      return <Navigate to="/tasks/team" replace />;
    }
    if (tab === ADMIN_WHATSAPP_LEGACY_TAB) {
      return <Navigate to="/tasks/team?tab=admin" replace />;
    }
  }
  return <Navigate to="/admin/equipe/owners?tab=list" replace />;
}

export default TeamRolesHubPage;
