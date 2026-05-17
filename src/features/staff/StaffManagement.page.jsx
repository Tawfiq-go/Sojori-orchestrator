import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import StaffManagementView from './components/StaffManagementView';
import { ToastContainer } from 'react-toastify';

function StaffManagementPage() {
  return (
    <DashboardLayout>
      <ToastContainer position="top-right" autoClose={3000} />
      <StaffManagementView />
    </DashboardLayout>
  );
}

export default StaffManagementPage;
