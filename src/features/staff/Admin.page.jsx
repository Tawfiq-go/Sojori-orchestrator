import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import PublicAdmin from './components/PublicAdmin';

function Staff() {
  return (
    <DashboardLayout>
      
      <div className="Task">
        {/* <div className="main-content"> */}
          {/* <main> */}
            <PublicAdmin />
          {/* </main> */}
        {/* </div> */}
      </div>
    </DashboardLayout>
  );
}

export default Staff;