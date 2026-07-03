/**
 * Hub Channel Manager — aligné legacy sojori-dashboard
 * /admin/ChannelManager?tab=channel-manager | ?tab=distribution
 */
import { useSearchParams } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { LegacyReduxProvider } from '../components/LegacyReduxBridge';
import { ChannelManagerTab } from '../components/channels/ChannelManagerTab';
import { DistributionTab } from '../components/channels/DistributionTab';

export type ChannelManagerTabId = 'channel-manager' | 'distribution';

const TABS: Array<{ id: ChannelManagerTabId; label: string; icon: string }> = [
  { id: 'channel-manager', label: 'Channel Manager', icon: '⚙️' },
  { id: 'distribution', label: 'Distribution', icon: '🌐' },
];

function parseTab(raw: string | null): ChannelManagerTabId {
  const t = (raw || '').toLowerCase();
  if (t === 'distribution') return 'distribution';
  return 'channel-manager';
}

export function ChannelManagerHubPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get('tab'));

  const setTab = (id: ChannelManagerTabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next);
  };

  const tabLabel = TABS.find((t) => t.id === tab)?.label ?? 'Channel Manager';

  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Annonces', 'Channel Manager', tabLabel]}>
      <LegacyReduxProvider>
        <CatalogueAnnoncesTabs />
        <div style={{ padding: '0 0 50px' }}>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0 }}>Channel Manager</h1>
            <p style={{ fontSize: 13, color: T.text3, margin: '6px 0 0' }}>
              Widget Rental United et distribution OTA par propriété
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: 8,
              borderBottom: `2px solid ${T.border}`,
              marginBottom: 24,
              flexWrap: 'wrap',
            }}
          >
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '12px 20px',
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
                  <span style={{ fontSize: 16 }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>

          <div
            style={{
              background: T.bg1,
              border: `1px solid ${T.border}`,
              borderRadius: 14,
              padding: tab === 'channel-manager' ? 16 : 0,
              minHeight: 480,
              overflow: 'hidden',
            }}
          >
            {tab === 'channel-manager' && <ChannelManagerTab />}
            {tab === 'distribution' && <DistributionTab />}
          </div>
        </div>
      </LegacyReduxProvider>
    </DashboardWrapper>
  );
}

export default ChannelManagerHubPage;
