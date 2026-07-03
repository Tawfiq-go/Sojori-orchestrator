// ════════════════════════════════════════════════════════════════════
// CRMPage — Hub CRM avec 4 onglets
// Migration depuis sojori-dashboard → sojori-orchestrator
// ════════════════════════════════════════════════════════════════════
import { useSearchParams, Navigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { useAuth } from '../hooks/useAuth';
import { hasAdminAccess } from '../utils/rbac.utils';
import { RequestsTab } from '../components/crm/RequestsTab';
import { HostsTab } from '../components/crm/HostsTab';
import { LeadsTab } from '../components/crm/LeadsTab';
import { SupportTab } from '../components/crm/SupportTab';
import { OnboardingTab } from '../components/crm/OnboardingTab';

type TabId = 'requests' | 'hosts' | 'leads' | 'support' | 'onboarding';

const TABS: Array<{ id: TabId; label: string; icon: string; count?: number }> = [
  { id: 'requests', label: 'Demandes PMS', icon: '📥' },
  { id: 'hosts', label: 'Demandes Host', icon: '🏠' },
  { id: 'leads', label: 'Leads & fiches', icon: '🧲' },
  { id: 'support', label: 'Rendez-vous', icon: '📅' },
  { id: 'onboarding', label: 'Onboarding', icon: '🎯' },
];

const TAB_ALIASES: Record<string, TabId> = {
  demandes: 'requests',
  staff: 'support',
  rendezvous: 'support',
  'rendez-vous': 'support',
};

export function CRMPage() {
  const { user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!loading && user?.role && !hasAdminAccess(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  const rawTab = searchParams.get('tab');
  if (!rawTab) {
    return <Navigate to="/crm?tab=requests" replace />;
  }
  const normalized = String(rawTab).toLowerCase();
  const activeTab = (TAB_ALIASES[normalized] || normalized) as TabId;
  if (!TABS.some((t) => t.id === activeTab)) {
    return <Navigate to="/crm?tab=requests" replace />;
  }
  if (normalized !== activeTab) {
    return <Navigate to={`/crm?tab=${activeTab}`} replace />;
  }

  const handleTabChange = (tabId: TabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <DashboardWrapper breadcrumb={['CRM', 'Sojori CRM']}>
      <div style={{ padding: '22px 28px 50px', maxWidth: 1500, margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{
              fontSize: 28,
              fontWeight: 800,
              color: T.text,
              margin: 0,
              fontFamily: 'inherit',
            }}>
              Sojori CRM
            </h1>
            <p style={{
              fontSize: 13,
              color: T.text3,
              margin: '6px 0 0',
              fontFamily: 'inherit',
            }}>
              Gestion des demandes, leads et équipe support
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          borderBottom: `2px solid ${T.border}`,
          marginBottom: 24,
          paddingBottom: 0,
        }}>
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  padding: '12px 20px',
                  fontSize: 13,
                  fontWeight: 700,
                  color: active ? T.primary : T.text3,
                  background: 'transparent',
                  border: 0,
                  borderBottom: `3px solid ${active ? T.primary : 'transparent'}`,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'all 0.2s',
                  marginBottom: -2,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = T.text2;
                    e.currentTarget.style.borderBottomColor = T.border;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.color = T.text3;
                    e.currentTarget.style.borderBottomColor = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    background: active ? T.primaryTint : T.bg3,
                    color: active ? T.primaryDeep : T.text3,
                    padding: '2px 8px',
                    borderRadius: 99,
                    fontWeight: 700,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div style={{
          background: T.bg1,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          padding: 24,
          minHeight: 500,
        }}>
          {activeTab === 'requests' && <RequestsTab />}
          {activeTab === 'hosts' && <HostsTab />}
          {activeTab === 'leads' && <LeadsTab />}
          {activeTab === 'support' && <SupportTab />}
          {activeTab === 'onboarding' && <OnboardingTab />}
        </div>
      </div>
    </DashboardWrapper>
  );
}


export default CRMPage;
