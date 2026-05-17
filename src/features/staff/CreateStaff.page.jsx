import React from 'react';

import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import DashboardNavbar from "components/Navbars/DashboardNavbar";
import CreateStaff from './components/CreStaff';
import CreStaff from './components/CreStaff';



function CreateStaffPage() {

    return (
        <DashboardLayout>
            
            <div className="Task">
                <div className="main-content">
                    <main>
                        <CreStaff />
                    </main>
                </div>
            </div>
        </DashboardLayout>
    );
}

export default CreateStaffPage;