import React from 'react';
import DashboardLayout from 'components/LayoutContainers/DashboardLayout';
import AdminOwnerScopeLayout from 'components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import PublicClient from './components/PublicClient';

function Client() {
  return (
    <DashboardLayout>
      <AdminOwnerScopeLayout inlineBar>
        <div className="Task">
          <PublicClient />
        </div>
      </AdminOwnerScopeLayout>
    </DashboardLayout>
  );
}

export default Client;
