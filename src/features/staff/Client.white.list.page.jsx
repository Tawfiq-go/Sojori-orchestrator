import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';
import PublicClientWhiteListGrouped from './components/PublicClientWhiteListGrouped';

function ClientWhiteList() {
  return (
    <DashboardLayout>

      <div className="Task">
        <PublicClientWhiteListGrouped />
      </div>
    </DashboardLayout>
  );
}

export default ClientWhiteList;
