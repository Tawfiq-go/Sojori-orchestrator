import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import TeamMembersView from './components/TeamMembersView';
import { ToastContainer } from 'react-toastify';

function TeamMembersPage() {
  return (
    <DashboardLayout>
      <ToastContainer position="top-right" autoClose={3000} />
      <TeamMembersView />
    </DashboardLayout>
  );
}

export default TeamMembersPage;
