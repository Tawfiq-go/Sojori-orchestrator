import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import PublicStaff from './components/PublicStaff';

function Staff() {
  return (
    <DashboardLayout>
      <div className="Task">
        <PublicStaff />
      </div>
    </DashboardLayout>
  );
}

export default Staff;