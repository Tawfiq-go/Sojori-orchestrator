import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from 'components/Navbars/DashboardNavbar';
import PublicStaffPlanning from './components/PublicStaffPlanning';

function StaffPlanning() {
  return (
    <DashboardLayout>
      
      <div className="Task">
        <PublicStaffPlanning />
      </div>
    </DashboardLayout>
  );
}

export default StaffPlanning;
