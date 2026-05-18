// ChannelsAdminPage — parité legacy sojori-dashboard /admin/Channels (nav en haut, pas de sidebar)
import { useEffect } from 'react';
import { useSearchParams, Navigate, useNavigate } from 'react-router-dom';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { ChannelsHubToolbar } from '../components/channels/ChannelsHubToolbar';
import { ChannelsTopNav } from '../components/channels/ChannelsTopNav';
import { SummaryTab } from '../components/channels/SummaryTab';
import { BusinessTab } from '../components/channels/BusinessTab';
import { DebugTab } from '../components/channels/DebugTab';
import { CronTab } from '../components/channels/CronTab';
import { MappingTab } from '../components/channels/MappingTab';
import { ImportTab } from '../components/channels/ImportTab';
import {
  canonicalSectionTab,
  migrateLegacyChannelsSearchParams,
} from '../utils/channelsUrlUtils';
import '../styles/channels-hub.css';

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

  return (
    <DashboardWrapper breadcrumb={['Admin', 'Channels']}>
      <div className="channels-hub-page min-h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 pb-8 px-2 py-3 md:px-3 md:py-4">
        <div className="w-full max-w-none space-y-2">
          <ChannelsHubToolbar />
          <ChannelsTopNav />

          <div className="channels-hub-content min-h-[500px]">
            {sectionTab === 'Sum' && <SummaryTab />}
            {sectionTab === 'Business' && <BusinessTab />}
            {sectionTab === 'Debug' && <DebugTab />}
            {sectionTab === 'Cron' && <CronTab />}
            {sectionTab === 'Mapping' && <MappingTab />}
            {sectionTab === 'Import' && <ImportTab />}
          </div>
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
