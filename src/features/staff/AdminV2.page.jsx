import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import PublicAdminV2 from './components/PublicAdminV2';

function AdminV2() {
  return (
    <DashboardLayout>
      
      <div className="Task">
        <PublicAdminV2 />
      </div>
    </DashboardLayout>
  );
}

export default AdminV2;