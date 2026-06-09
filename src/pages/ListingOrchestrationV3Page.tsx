import { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import OrchestrationListingV3View from '../features/orchestrationListingV3/OrchestrationListingV3View';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { useAuth } from '../hooks/useAuth';
import listingsService from '../services/listingsService';
import { syncAdminTemplateToOwnerSimple } from '../features/listing/utils/syncAdminTemplateToOwner';
import { getOwnersAllPages } from '../features/staff/services/serverApi.task';

function isAdminRole(role?: string): boolean {
  const r = (role || '').toLowerCase().replace(/\s+/g, '');
  return r === 'superadmin' || r === 'admin' || r === 'super_admin';
}

type ListingPick = { id: string; name: string };

function V3PageInner() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, isAdminTemplate } = ownerScope;
  const [listingsLoading, setListingsLoading] = useState(false);
  const [ownerListings, setOwnerListings] = useState<ListingPick[]>([]);
  const [referenceListingId, setReferenceListingId] = useState<string | null>(null);

  const syncMode = isAdminTemplate ? 'owners' : isAdmin ? 'admin-pm' : 'listings';

  const loadOwnerListings = useCallback(async () => {
    if (isAdminTemplate) {
      setOwnerListings([]);
      setReferenceListingId(null);
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    try {
      const res = await listingsService.getListings({
        page: 0,
        limit: 500,
        useActiveFilter: true,
        active: true,
        forListingsOverview: true,
      });
      const items = (res.data?.items ?? []).filter(
        l => l.ownerId && String(l.ownerId) === String(ownerKey),
      );
      const picks: ListingPick[] = items.map(l => ({
        id: l.id,
        name: l.name || l.id,
      }));
      setOwnerListings(picks);
      setReferenceListingId(prev => {
        if (picks.length === 0) return null;
        if (prev && picks.some(p => p.id === prev)) return prev;
        return picks[0].id;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Impossible de charger les annonces');
      setOwnerListings([]);
      setReferenceListingId(null);
    } finally {
      setListingsLoading(false);
    }
  }, [isAdminTemplate, ownerKey]);

  useEffect(() => {
    void loadOwnerListings();
  }, [loadOwnerListings]);

  const handleSyncToOwner = async (targetOwnerId: string, targetOwnerName: string) => {
    const result = await syncAdminTemplateToOwnerSimple(targetOwnerId);
    if (!result.ok) throw new Error(result.lines[result.lines.length - 1] || 'échec');
    toast.success(`${targetOwnerName} — ${result.lines.join(' · ')}`);
  };

  const handleSyncToAllOwners = async () => {
    const rows = await getOwnersAllPages({ search_text: '' });
    let ok = 0;
    for (const o of rows) {
      const id = String(o?._id ?? o?.id ?? '');
      if (!id) continue;
      try {
        const result = await syncAdminTemplateToOwnerSimple(id);
        if (result.ok) ok += 1;
      } catch {
        /* skip */
      }
    }
    toast.success(`Admin → ${ok} PM(s) OK`);
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 1, width: '100%' }}>
      <CatalogueAnnoncesTabs />
      <OwnerConfigScopeBarWithSync
        {...ownerScope}
        compact
        syncMode={syncMode}
        onSyncToOwner={isAdmin ? handleSyncToOwner : undefined}
        onSyncToAllOwners={isAdmin && isAdminTemplate ? handleSyncToAllOwners : undefined}
        listingOptions={!isAdminTemplate ? ownerListings : undefined}
        selectedListingId={!isAdmin ? referenceListingId : undefined}
        onListingChange={!isAdmin ? setReferenceListingId : undefined}
        listingsLoading={!isAdminTemplate ? listingsLoading : undefined}
      />

      {listingsLoading && !isAdminTemplate ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <OrchestrationListingV3View
          key={`${ownerKey}-${referenceListingId ?? 'tpl'}`}
          ownerKey={ownerKey}
          isAdminTemplate={isAdminTemplate}
          listingId={referenceListingId}
          listings={ownerListings}
          onListingChange={setReferenceListingId}
          listingCount={ownerListings.length}
        />
      )}
    </Box>
  );
}

export default function ListingOrchestrationV3Page() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Orchestration listing v3']}>
      <AdminOwnerScopeLayout showTopBar={false}>
        <V3PageInner />
      </AdminOwnerScopeLayout>
    </DashboardWrapper>
  );
}
