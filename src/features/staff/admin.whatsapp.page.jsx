import React from 'react';
import TeamRolesPageShell from './teamRolesLayout';
import PublicAdminWhatsapp from './components/PublicAdminWhatsapp';

function AdminWhatsapp() {
  return (
    <TeamRolesPageShell>
      <PublicAdminWhatsapp />
    </TeamRolesPageShell>
  );
}

export default AdminWhatsapp;
