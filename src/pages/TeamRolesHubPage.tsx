/**
 * Hub Équipe & Rôles — migration sojori-dashboard
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { TEAM_T } from '../components/team/teamHubTokens';
import { teamSectionFromPath, type TeamSection } from '../utils/teamUrlUtils';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout.jsx';
import { PropertyManagerTab } from '../components/team/PropertyManagerTab';
import { AccessMarketplacesTab } from '../components/team/AccessMarketplacesTab';
import { RolesPermissionsTab } from '../components/team/RolesPermissionsTab';
import { GroupsTab } from '../components/team/GroupsTab';
import { TeamViewProvider, useTeamViewMode } from '../context/TeamViewContext';
import { TeamViewToolbar } from '../components/team/TeamViewToolbar';
import { STAFF_DASHBOARD_LEGACY_TAB, ADMIN_WHATSAPP_LEGACY_TAB, ONBOARDING_LEGACY_TAB } from '../utils/teamUrlUtils';
import { readPersistedAdminScope } from '../utils/adminOwnerFilter.utils';
import { applyOwnerIdToSearchParams } from '../features/onboarding/onboardingOwnerUrl';
import { PmOnboardingWizard } from '../features/onboarding/PmOnboardingWizard';
import { canAccessPmOnboarding } from '../features/onboarding/resolveOwnerId';
import { useAuth } from '../hooks/useAuth';
import { hasAdminAccess } from '../utils/rbac.utils';
import { canAccessProtectedRoutes } from '../utils/devApiAccess';
import { usePmSimulation } from '../context/PmSimulationContext';

function TeamViewToolbarSlot({ section }: { section: TeamSection }) {
  const { stats } = useTeamViewMode();
  if (section !== 'groups' && section !== 'property-manager' && section !== 'worker') return null;
  return <TeamViewToolbar stats={stats} />;
}

const ALL_SECTIONS: Array<{ id: TeamSection; label: string; icon: string; hint: string; adminOnly?: boolean; onboardingOnly?: boolean }> = [
  {
    id: 'property-manager',
    label: 'Property managers',
    icon: '🏢',
    hint: 'Comptes Owner · gestionnaires de parc (annonces, RU/Channex)',
    adminOnly: true,
  },
  {
    id: 'worker',
    label: 'Accès dashboard',
    icon: '🔐',
    hint: 'Workers invités — droits lecture / écriture par route du menu Owner',
  },
  {
    id: 'groups',
    label: 'Groupes',
    icon: '👨‍👩‍👧‍👦',
    hint: 'Templates de droits pour Workers (featureGrants)',
  },
  {
    id: 'onboarding',
    label: 'On-boarding',
    icon: '🚀',
    hint: 'Configuration initiale PM — équipe, orchestration, import Airbnb',
    onboardingOnly: true,
  },
  {
    id: 'access-marketplaces',
    label: 'Access Marketplaces',
    icon: '🛒',
    hint: 'Autorisations canal par PM — Sojori, direct booking, WhatsApp, inter-PMs',
    adminOnly: true,
  },
];

export function TeamRolesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { isActive: simulationActive } = usePmSimulation();
  // En simulation PM, l'admin doit voir EXACTEMENT ce que voit un vrai owner :
  // pas d'onglet « Property managers », pas de barre de scope admin, redirection
  // vers la vue worker owner. On neutralise donc l'accès admin (même règle que la sidebar).
  const isPlatformAdmin = hasAdminAccess(user?.role) && !simulationActive;
  const sections = useMemo(
    () =>
      ALL_SECTIONS.filter((s) => {
        if (s.adminOnly && !isPlatformAdmin) return false;
        if (s.onboardingOnly && !canAccessPmOnboarding(user)) return false;
        return true;
      }),
    [isPlatformAdmin, user],
  );
  const section = teamSectionFromPath(pathname, searchParams.get('tab'));
  const legacyStaffTab = searchParams.get('tab') === STAFF_DASHBOARD_LEGACY_TAB;
  const legacyAdminTab = searchParams.get('tab') === ADMIN_WHATSAPP_LEGACY_TAB;
  const legacyOnboardingTab = searchParams.get('tab') === ONBOARDING_LEGACY_TAB;

  useEffect(() => {
    if (legacyOnboardingTab) {
      navigate('/admin/equipe?tab=onboarding', { replace: true });
      return;
    }
    if (legacyAdminTab) {
      navigate('/tasks/team?tab=admin', { replace: true });
      return;
    }
    if (legacyStaffTab) {
      navigate('/tasks/team', { replace: true });
      return;
    }
    if (!isPlatformAdmin && (pathname.includes('/admin/equipe/owners') || section === 'property-manager')) {
      navigate('/admin/equipe?tab=worker', { replace: true });
      return;
    }
    if (pathname.includes('/admin/equipe/owners') && !searchParams.get('tab')) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'list');
      setSearchParams(next, { replace: true });
    } else if (pathname === '/admin/equipe' && !searchParams.get('tab')) {
      navigate(
        isPlatformAdmin ? '/admin/equipe/owners?tab=list' : '/admin/equipe?tab=worker',
        { replace: true },
      );
    }
  }, [pathname, searchParams, setSearchParams, legacyStaffTab, legacyAdminTab, legacyOnboardingTab, navigate, isPlatformAdmin, section]);

  if (legacyStaffTab || legacyAdminTab || legacyOnboardingTab) return null;

  if (!authLoading && !canAccessProtectedRoutes(isAuthenticated)) {
    return <Navigate to="/login" replace state={{ from: pathname }} />;
  }

  const setSection = (id: TeamSection) => {
    if (id === 'property-manager') {
      if (!isPlatformAdmin) return;
      navigate('/admin/equipe/owners?tab=list');
      return;
    }
    const next = new URLSearchParams(searchParams);
    const tabMap: Record<TeamSection, string> = {
      'property-manager': 'list',
      worker: 'worker',
      groups: 'groups',
      onboarding: 'onboarding',
      'access-marketplaces': 'marketplaces',
    };
    next.set('tab', tabMap[id]);
    if (id === 'onboarding') {
      const fromUrl = searchParams.get('ownerId')?.trim();
      const persisted = readPersistedAdminScope();
      const ownerId = fromUrl || (persisted.mode === 'owner' ? persisted.ownerId : '');
      if (ownerId) {
        next.set('ownerId', ownerId);
      }
    }
    navigate(`/admin/equipe?${next.toString()}`);
  };

  return (
    <DashboardWrapper breadcrumb={['Équipe & Rôles', sections.find((s) => s.id === section)?.label || '']}>
      <LegacyReduxProvider>
      <AdminOwnerScopeLayout inlineBar showTopBar={isPlatformAdmin}>
      <TeamViewProvider>
      <div style={{ padding: '22px 0 50px', background: TEAM_T.bg0, minHeight: '100%' }}>
        <div style={{ marginBottom: 14 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, margin: 0 }}>Équipe & Rôles</h1>
          <p style={{ fontSize: 12.5, color: T.text3, margin: '4px 0 0' }}>
            Accès dashboard, groupes de droits et on-boarding PM · Staff terrain →{' '}
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
            marginBottom: 10,
          }}
        >
          {sections.map((s) => {
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

        <TeamViewToolbarSlot section={section} />

        <div
          style={{
            background: TEAM_T.bg1,
            border: `1px solid ${TEAM_T.border}`,
            borderRadius: 14,
            padding: section === 'worker' || section === 'onboarding' ? 12 : 16,
            minHeight: 480,
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
            overflow: 'hidden',
          }}
        >
          {section === 'property-manager' && isPlatformAdmin ? <PropertyManagerTab /> : null}
          {section === 'worker' && <RolesPermissionsTab />}
          {section === 'groups' && <GroupsTab />}
          {section === 'onboarding' && canAccessPmOnboarding(user) ? (
            <PmOnboardingWizard embedded />
          ) : null}
          {section === 'access-marketplaces' && isPlatformAdmin ? <AccessMarketplacesTab /> : null}
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
    if (tab === ONBOARDING_LEGACY_TAB || tab === 'onboarding') {
      return <Navigate to="/admin/equipe?tab=onboarding" replace />;
    }
    if (tab === STAFF_DASHBOARD_LEGACY_TAB || tab === 'owners') {
      return <Navigate to="/tasks/team" replace />;
    }
    if (tab === ADMIN_WHATSAPP_LEGACY_TAB) {
      return <Navigate to="/tasks/team?tab=admin" replace />;
    }
  }
  return <Navigate to="/admin/equipe?tab=worker" replace />;
}

export default TeamRolesHubPage;
