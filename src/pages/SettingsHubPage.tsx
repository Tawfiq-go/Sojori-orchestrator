/**
 * Hub Paramètres — migration partielle sojori-dashboard
 * Onglets : template, host-profile, admin-config (pays/villes), currency
 */
import { useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { settingsSectionFromPath, type SettingsSection } from '../utils/settingsUrlUtils';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import { TemplateTab } from '../components/settings/TemplateTab';
import { HostProfileTab } from '../components/settings/HostProfileTab';
import { AdminConfigTab } from '../components/settings/AdminConfigTab';
import { CurrencyTab } from '../components/settings/CurrencyTab';
import { PmSimulationPanel } from '../components/simulation/PmSimulationPanel';

const HUB_SECTIONS: Array<{ id: SettingsSection; label: string; icon: string }> = [
  { id: 'template', label: 'Templates', icon: '📧' },
  { id: 'host-profile', label: 'Profil hôte', icon: '🏠' },
  { id: 'admin-config', label: 'Pays & Villes', icon: '🌍' },
  { id: 'pm-simulation', label: 'Simulation PM', icon: '🎭' },
  { id: 'currency', label: 'Devises', icon: '💱' },
];

export function SettingsHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const section = settingsSectionFromPath(pathname, searchParams.get('tab'));

  useEffect(() => {
    if (pathname.toLowerCase().includes('currency')) return;
    if (searchParams.get('tab') === 'notifications') {
      navigate('/admin/equipe/notifications', { replace: true });
      return;
    }
    if (
      (pathname === '/admin/settings' || pathname === '/admin/Settings') &&
      !searchParams.get('tab')
    ) {
      const next = new URLSearchParams(searchParams);
      next.set('tab', 'template');
      setSearchParams(next, { replace: true });
    }
  }, [pathname, searchParams, setSearchParams, navigate]);

  const setSection = (id: SettingsSection) => {
    if (id === 'currency') {
      navigate('/admin/setting/currency');
      return;
    }
    navigate(`/admin/settings?tab=${id}`);
  };

  const sectionLabel =
    HUB_SECTIONS.find((s) => s.id === section)?.label || 'Paramètres';

  return (
    <DashboardWrapper breadcrumb={['Paramètres', sectionLabel]}>
      <LegacyReduxProvider>
        <div style={{ padding: '22px 0 50px' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0 }}>Paramètres</h1>
            <p style={{ fontSize: 13, color: T.text3, margin: '6px 0 0' }}>
              Templates, profil hôte, référentiels géographiques et devises
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
            {HUB_SECTIONS.map((s) => {
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
            {section === 'template' && <TemplateTab />}
            {section === 'host-profile' && <HostProfileTab />}
            {section === 'admin-config' && <AdminConfigTab />}
            {section === 'pm-simulation' && <PmSimulationPanel />}
            {section === 'currency' && <CurrencyTab />}
          </div>
        </div>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export function SettingsLegacyRedirect() {
  const { pathname, search } = useLocation();
  const q = search || '';
  const lower = pathname.toLowerCase();
  if (lower.includes('currency')) {
    return <Navigate to={`/admin/setting/currency${q}`} replace />;
  }
  if (lower === '/admin/settings' || lower === '/admin/setting') {
    return <Navigate to={`/admin/settings${q || '?tab=template'}`} replace />;
  }
  if (lower.startsWith('/admin/settings')) {
    return <Navigate to={`/admin/settings${q}`} replace />;
  }
  return <Navigate to="/admin/settings?tab=template" replace />;
}

export default SettingsHubPage;
