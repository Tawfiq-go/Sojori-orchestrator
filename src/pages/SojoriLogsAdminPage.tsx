import React from 'react';
import { DashboardWrapper } from '../components/DashboardWrapper';
import { SojoriLogsHubContent } from '../components/sojoriLogs/SojoriLogsHubContent';
import '../styles/channels-hub.css';

/**
 * Admin → Logs Sojori → AirROI.
 *
 * The hub delegates endpoint/date filtering and pagination to srv-channels. Keeping the
 * canonical implementation here prevents the old page from filtering only the current page
 * and then mistaking that page length for the server-side total.
 */
export function SojoriLogsAdminPage() {
  return (
    <DashboardWrapper breadcrumb={['Logs API', 'AirROI']}>
      <div className="min-h-full w-full bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-[1600px] mx-auto">
          <SojoriLogsHubContent hideSourceNav />
        </div>
      </div>
    </DashboardWrapper>
  );
}

export default SojoriLogsAdminPage;
