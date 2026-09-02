import CompanyProfileTabs from '../../features/setting/pages/CompanyProfileTabs';
import MfaSecurityCard from '../auth/MfaSecurityCard';

export function HostProfileTab() {
  return (
    <>
      <MfaSecurityCard />
      <CompanyProfileTabs />
    </>
  );
}
