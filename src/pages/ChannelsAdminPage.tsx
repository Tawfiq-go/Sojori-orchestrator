// ChannelsAdminPage — Hub OTA/RU (migration sojori-dashboard /admin/Channels)
import { useEffect } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { tokens as T } from '../components/dashboard/DashboardV2.components';
import { SummaryTab } from '../components/channels/SummaryTab';
import { BusinessTab } from '../components/channels/BusinessTab';
import { DebugTab } from '../components/channels/DebugTab';
import { CronTab } from '../components/channels/CronTab';
import { MappingTab } from '../components/channels/MappingTab';
import { ImportTab } from '../components/channels/ImportTab';
import {
  canonicalSectionTab,
  migrateLegacyChannelsSearchParams,
  type SectionTab,
} from '../utils/channelsUrlUtils';

const TABS: Array<{ id: SectionTab; label: string; icon: string }> = [
  { id: 'Sum', label: 'Résumé', icon: '📊' },
  { id: 'Business', label: 'Business', icon: '💼' },
  { id: 'Debug', label: 'Debug', icon: '🐛' },
  { id: 'Cron', label: 'Cron', icon: '⏰' },
  { id: 'Mapping', label: 'Mapping', icon: '🗺️' },
  { id: 'Import', label: 'Import RU', icon: '📥' },
];

export function ChannelsAdminPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tab = (searchParams.get('tab') || '').toLowerCase();
    if (tab === 'channel-manager' || tab === 'distribution') {
      navigate(`/admin/ChannelManager?tab=${tab}`, { replace: true });
    }
  }, [searchParams, navigate]);

  useEffect(() => {
    const migrated = migrateLegacyChannelsSearchParams(searchParams);
    if (migrated) {
      setSearchParams(migrated, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const sectionTab = canonicalSectionTab(searchParams.get('tab'));

  const handleTabChange = (nextSection: SectionTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', nextSection);
    if (nextSection === 'Business' && !next.get('biz')) {
      next.set('biz', 'api');
      if (!next.get('api')) next.set('api', 'm');
    }
    if (nextSection === 'Mapping' && !next.get('mapSub')) {
      next.set('mapSub', 'fields');
    }
    if (nextSection === 'Debug' && !next.get('type')) {
      next.set('type', 'pull');
    }
    setSearchParams(next);
  };

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Channels']}>
      <div style={{ padding: '22px 28px 50px', maxWidth: 1600, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: T.text, margin: 0, fontFamily: 'inherit' }}>
            Channels
          </h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '6px 0 0', fontFamily: 'inherit' }}>
            KPIs OTA/RU, webhooks, APIs, mappings, imports
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
          {TABS.map((tab) => {
            const active = sectionTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
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
                  marginBottom: -2,
                }}
              >
                <span style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            );
          })}
        </div>

        <div
          style={{
            background: T.bg1,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: 24,
            minHeight: 500,
          }}
        >
          {sectionTab === 'Sum' && <SummaryTab />}
          {sectionTab === 'Business' && <BusinessTab />}
          {sectionTab === 'Debug' && <DebugTab />}
          {sectionTab === 'Cron' && <CronTab />}
          {sectionTab === 'Mapping' && <MappingTab />}
          {sectionTab === 'Import' && <ImportTab />}
        </div>
      </div>
    </DashboardWrapper>
  );
}

export function ChannelsLegacyRedirect() {
  const [searchParams] = useSearchParams();
  const q = searchParams.toString();
  return <Navigate to={q ? `/channels?${q}` : '/channels'} replace />;
}

export default ChannelsAdminPage;
