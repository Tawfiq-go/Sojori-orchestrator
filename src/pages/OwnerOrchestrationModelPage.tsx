import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import OrchestrationListingV3View from '../features/orchestrationListingV3/OrchestrationListingV3View';
import OrchestrationModelSubTabs, {
  type OrchestrationModelSection,
} from '../features/orchestrationListingV3/OrchestrationModelSubTabs';
import V3ScheduledMessagesPanel from '../features/orchestrationListingV3/V3ScheduledMessagesPanel';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { useAuth } from '../hooks/useAuth';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';
import listingsService from '../services/listingsService';
import { syncAdminTemplateToOwnerSimple } from '../features/listing/utils/syncAdminTemplateToOwner';
import { getOwnersAllPages } from '../features/staff/services/serverApi.task';

function isAdminRole(role?: string): boolean {
  const r = (role || '').toLowerCase().replace(/\s+/g, '');
  return r === 'superadmin' || r === 'admin' || r === 'super_admin';
}

function apiErrorMessage(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
  const status = err.response?.status;
  const body = err.response?.data?.error;
  if (status && body) return `${status} — ${body}`;
  if (status) return `HTTP ${status}`;
  if (body) return body;
  return e instanceof Error ? e.message : String(e);
}

type ListingPick = { id: string; name: string };

function parseModelSection(raw: string | null): OrchestrationModelSection {
  return raw === 'messages' ? 'messages' : 'services';
}

function OwnerModelPageInner() {
  const [searchParams, setSearchParams] = useSearchParams();
  const section = useMemo(
    () => parseModelSection(searchParams.get('section')),
    [searchParams],
  );
  const setSection = useCallback(
    (next: OrchestrationModelSection) => {
      const params = new URLSearchParams(searchParams);
      if (next === 'services') params.delete('section');
      else params.set('section', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { selectedOwnerId, setSelectedOwnerId } = useAdminOwnerFilter();
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, isAdminTemplate } = ownerScope;
  const [listingsLoading, setListingsLoading] = useState(false);
  const [ownerListings, setOwnerListings] = useState<ListingPick[]>([]);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  const syncMode = isAdminTemplate ? 'owners' : isAdmin ? 'admin-pm' : 'listings';
  const adminViewingPm = isAdmin && !isAdminTemplate;

  useEffect(() => {
    if (!isAdmin) return;
    const sel = selectedOwnerId?.trim();
    if (!sel) {
      setSelectedOwnerId(ORCHESTRATION_ADMIN_OWNER_ID);
    }
  }, [isAdmin, selectedOwnerId, setSelectedOwnerId]);

  const loadOwnerListings = useCallback(async () => {
    if (isAdminTemplate) {
      setOwnerListings([]);
      setSelectedListingIds([]);
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
      setOwnerListings(
        items.map(l => ({
          id: l.id,
          name: l.name || l.id,
        })),
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Impossible de charger les annonces');
      setOwnerListings([]);
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
    try {
      const res = await listingsService.syncOwnerOrchestrationFromAdminToAllOwners();
      const body = res as { data?: { synced?: number; failed?: number; total?: number } };
      const synced = body?.data?.synced ?? 0;
      const failed = body?.data?.failed ?? 0;
      toast.success(`Admin → ${synced} PM(s) OK${failed > 0 ? ` · ${failed} échec(s)` : ''}`);
    } catch {
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
    }
  };

  const handleSyncAllListings = async () => {
    if (ownerKey === 'global') return;
    setApplying(true);
    try {
      const res = await listingsService.applyOwnerOrchestrationToAllListings(ownerKey);
      const body = res as { data?: { modified?: number; total?: number } };
      const n = body?.data?.modified ?? body?.data?.total ?? 0;
      toast.success(`Modèle appliqué à ${n} annonce(s)`);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
    } finally {
      setApplying(false);
    }
  };

  const handleSyncSelectedListings = async (listingIds: string[]) => {
    if (ownerKey === 'global' || listingIds.length === 0) return;
    const allowed = new Set(ownerListings.map(l => l.id));
    const targets = listingIds.filter(id => allowed.has(id));
    if (targets.length === 0) {
      toast.error('Aucune annonce valide sélectionnée pour ce PM');
      return;
    }
    setApplying(true);
    let ok = 0;
    let fail = 0;
    let firstError = '';
    for (const listingId of targets) {
      try {
        await listingsService.applyListingOrchestrationFromOwner(listingId);
        ok += 1;
      } catch (e: unknown) {
        fail += 1;
        if (!firstError) firstError = apiErrorMessage(e);
      }
    }
    if (ok > 0) {
      toast.success(
        `${ok} annonce(s) synchronisée(s)${fail > 0 ? ` · ${fail} échec(s)` : ''}`,
      );
      if (fail > 0 && firstError) {
        toast.error(firstError, { autoClose: 12000 });
      }
    } else {
      toast.error(firstError || `Échec sync annonces (${fail})`, { autoClose: 12000 });
    }
    setApplying(false);
  };

  const handleSyncOneListing = async (listingId: string, listingName: string) => {
    try {
      await listingsService.applyListingOrchestrationFromOwner(listingId);
      toast.success(`Modèle appliqué à ${listingName}`);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
      throw e;
    }
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 1, width: '100%' }}>
      <CatalogueAnnoncesTabs />
      <OrchestrationModelSubTabs value={section} onChange={setSection} />

      {section === 'services' && isAdmin && isAdminTemplate && (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 13 }}>
          <strong>Étape 1 — Template Admin.</strong> Configurez tous les services ici, puis cliquez{' '}
          <strong>Sync tous les PMs</strong> pour pousser le modèle vers chaque property manager.
          Ensuite, chaque PM applique le modèle à ses annonces.
        </Alert>
      )}

      {section === 'services' && isAdmin && adminViewingPm && (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 13 }}>
          <strong>Étape 2 — PM sélectionné.</strong> Vérifiez ou ajustez le modèle, puis cochez les
          annonces et synchronisez — ou utilisez « Appliquer le modèle à toutes les annonces ».
        </Alert>
      )}

      <OwnerConfigScopeBarWithSync
        {...ownerScope}
        compact
        syncMode={syncMode}
        onSyncToOwner={isAdmin ? handleSyncToOwner : undefined}
        onSyncToAllOwners={isAdmin && isAdminTemplate ? handleSyncToAllOwners : undefined}
        onSyncAllListings={!isAdminTemplate ? handleSyncAllListings : undefined}
        onSyncSelectedListings={adminViewingPm ? handleSyncSelectedListings : undefined}
        onSyncOneListing={!isAdmin ? handleSyncOneListing : undefined}
        listingOptions={!isAdminTemplate ? ownerListings : undefined}
        selectedListingIds={adminViewingPm ? selectedListingIds : undefined}
        onListingSelectionChange={adminViewingPm ? setSelectedListingIds : undefined}
        listingsLoading={!isAdminTemplate ? listingsLoading : undefined}
      />

      {section === 'services' && (
        <>
      {listingsLoading && !isAdminTemplate ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <OrchestrationListingV3View
          key={ownerKey}
          ownerKey={ownerKey}
          isAdminTemplate={isAdminTemplate}
          listingId={null}
          listings={ownerListings}
          onListingChange={() => {}}
          listingCount={ownerListings.length}
          ownerTemplateMode
        />
      )}
        </>
      )}

      {section === 'messages' && (
        <V3ScheduledMessagesPanel
          scope="owner"
          ownerKey={ownerKey}
          isAdminTemplate={isAdminTemplate}
        />
      )}
    </Box>
  );
}

export default function OwnerOrchestrationModelPage() {
  return (
    <DashboardWrapper breadcrumb={['Listings', 'Modèle orchestration']}>
      <AdminOwnerScopeLayout showTopBar={false}>
        <OwnerModelPageInner />
      </AdminOwnerScopeLayout>
    </DashboardWrapper>
  );
}
