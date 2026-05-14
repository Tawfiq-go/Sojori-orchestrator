import { useLocation, useNavigate } from 'react-router-dom';
import { ViewToggle } from './dashboard/DashboardV2.components';

type CommunicationsTab = 'guests' | 'staff' | 'ota';

const TAB_TO_ROUTE: Record<CommunicationsTab, string> = {
  guests: '/communications/whatsapp',
  staff: '/communications/staff',
  ota: '/communications/ota',
};

const OPTIONS = [
  { value: 'guests', label: 'WhatsApp Guests' },
  { value: 'staff', label: 'WhatsApp Staff' },
  { value: 'ota', label: 'Messages OTA' },
];

function getActiveTab(pathname: string): CommunicationsTab {
  if (pathname.startsWith(TAB_TO_ROUTE.staff)) return 'staff';
  if (pathname.startsWith(TAB_TO_ROUTE.ota)) return 'ota';
  return 'guests';
}

export function CommunicationsSectionToggle() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ViewToggle
      options={OPTIONS}
      value={getActiveTab(location.pathname)}
      onChange={(nextTab: string) => navigate(TAB_TO_ROUTE[nextTab as CommunicationsTab])}
    />
  );
}
