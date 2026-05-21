import { DashboardWrapper } from '../components/DashboardWrapper';
import { SojoriLogsHubContent } from '../components/sojoriLogs/SojoriLogsHubContent';
import '../styles/channels-hub.css';

export function SojoriLogsAdminPage() {
  return (
    <DashboardWrapper breadcrumb={['Admin', 'Logs API marché']}>
      <div className="channels-hub-page min-h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 pb-8 px-2 py-3 md:px-3 md:py-4">
        <div className="w-full max-w-none">
          <SojoriLogsHubContent />
        </div>
      </div>
    </DashboardWrapper>
  );
}

export default SojoriLogsAdminPage;
