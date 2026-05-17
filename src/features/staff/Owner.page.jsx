import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicOwner from './components/PublicOwner';
import TeamRolesPageShell from './teamRolesLayout';
import AdminOwnerScopeLayout from 'components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';

/** Onglets URL Property manager — étendre ici si sous-vues (ex. stats). */
const VALID_OWNER_TABS = new Set(['list']);

function Staff() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeOwnerTab = useMemo(
    () => (tabParam && VALID_OWNER_TABS.has(tabParam) ? tabParam : 'list'),
    [tabParam],
  );

  useEffect(() => {
    if (!tabParam || !VALID_OWNER_TABS.has(tabParam)) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', 'list');
          return next;
        },
        { replace: true },
      );
    }
  }, [tabParam, setSearchParams]);

  return (
    <AdminOwnerScopeLayout inlineBar={false}>
    <TeamRolesPageShell>
      <PublicOwner insidePageShell ownerTab={activeOwnerTab} />
    </TeamRolesPageShell>
    </AdminOwnerScopeLayout>
  );
}

export default Staff;
