import { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { useAuth } from '../hooks/useAuth';
import listingsService from '../services/listingsService';
import ListingTemplateForm, {
  CONFIG_NEW_TAB_COUNT,
} from '../features/listing/components/ListingTemplateForm';
import { syncAdminTemplateToOwnerSimple } from '../features/listing/utils/syncAdminTemplateToOwner';
import { getOwnersAllPages } from '../features/staff/services/serverApi.task';
import { getOwnerListLabel } from '../utils/ownerDisplay.utils';

function apiErrorMessage(e: unknown): string {
  const err = e as { response?: { status?: number; data?: { error?: string } }; message?: string };
  const status = err.response?.status;
  const body = err.response?.data?.error;
  if (status && body) return `${status} — ${body}`;
  if (status) return `HTTP ${status}`;
  if (body) return body;
  return e instanceof Error ? e.message : String(e);
}

type ListingPick = { id: string; name: string; location?: string };

function isAdminRole(role?: string): boolean {
  const r = (role || '').toLowerCase().replace(/\s+/g, '');
  return r === 'superadmin' || r === 'admin' || r === 'super_admin';
}

function TemplatePageInner() {
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, ownerDisplayName, isAdminTemplate } = ownerScope;
  const [listingsLoading, setListingsLoading] = useState(false);
  const [ownerListings, setOwnerListings] = useState<ListingPick[]>([]);
  const [referenceListingId, setReferenceListingId] = useState<string | null>(null);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const [docLoading, setDocLoading] = useState(false);
  const [templateRefreshKey, setTemplateRefreshKey] = useState(0);

  const ownerIdForTabs = ownerKey === 'global' ? undefined : ownerKey;

  /** Admin : filtre PM + sync owners. Owner PM : filtre annonces + sync listings. */
  const syncMode = isAdmin ? 'owners' : 'listings';
  const adminViewingPm = isAdmin && !isAdminTemplate;

  const loadOwnerListings = useCallback(async () => {
    if (adminViewingPm || (isAdminTemplate && isAdmin)) {
      setOwnerListings([]);
      setReferenceListingId(null);
      setListingValues({});
      setListingsLoading(false);
      return;
    }
    if (isAdminTemplate) {
      setOwnerListings([]);
      setReferenceListingId(null);
      setListingValues({});
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
        (l) => l.ownerId && String(l.ownerId) === String(ownerKey),
      );
      const picks: ListingPick[] = items.map((l) => ({
        id: l.id,
        name: l.name || l.id,
        location: [l.city, l.country].filter(Boolean).join(' · '),
      }));
      setOwnerListings(picks);
      setReferenceListingId((prev) => {
        if (picks.length === 0) return null;
        if (prev && picks.some((p) => p.id === prev)) return prev;
        return picks[0].id;
      });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Impossible de charger les annonces');
      setOwnerListings([]);
      setReferenceListingId(null);
    } finally {
      setListingsLoading(false);
    }
  }, [isAdminTemplate, isAdmin, ownerKey, adminViewingPm]);

  useEffect(() => {
    void loadOwnerListings();
  }, [loadOwnerListings]);

  const loadReferenceDoc = useCallback(async (listingId: string) => {
    setDocLoading(true);
    try {
      const doc = await listingsService.getListingDocument(listingId);
      if (doc) {
        setListingValues({
          ...doc,
          ownerId: doc.ownerId ?? ownerKey,
          name: doc.name ?? doc.SOJORI_ID,
          locationLine: [doc.city, doc.country].filter(Boolean).join(' · '),
        });
      }
    } catch {
      setListingValues({});
    } finally {
      setDocLoading(false);
    }
  }, [ownerKey]);

  useEffect(() => {
    if (!referenceListingId) return;
    void loadReferenceDoc(referenceListingId);
  }, [referenceListingId, loadReferenceDoc]);

  const referenceMeta = useMemo(
    () => ownerListings.find((l) => l.id === referenceListingId) ?? null,
    [ownerListings, referenceListingId],
  );

  /** Admin → PM : GET global + PUT owner (pas de listing, pas de POST sync-owner). */
  const handleSyncToOwner = async (targetOwnerId: string, targetOwnerName: string) => {
    const result = await syncAdminTemplateToOwnerSimple(targetOwnerId);
    if (!result.ok) {
      toast.error(`${targetOwnerName}: ${result.lines[result.lines.length - 1] || 'échec'}`, {
        autoClose: 12000,
      });
      throw new Error(result.lines[result.lines.length - 1] || 'Sync échoué');
    }
    toast.success(`${targetOwnerName} — ${result.lines.join(' · ')}`, { autoClose: 8000 });
    setTemplateRefreshKey((k) => k + 1);
  };

  const handleSyncToAllOwners = async () => {
    const rows = await getOwnersAllPages({ search_text: '' });
    let ok = 0;
    let fail = 0;
    for (const o of rows) {
      const id = String(o?._id ?? o?.id ?? '');
      if (!id) continue;
      const name = getOwnerListLabel(o);
      try {
        const result = await syncAdminTemplateToOwnerSimple(id);
        if (result.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }
    toast.success(`Admin → ${ok} PM(s) OK${fail > 0 ? `, ${fail} échec(s)` : ''}`);
    setTemplateRefreshKey((k) => k + 1);
  };

  const handleSyncAllListings = async () => {
    if (ownerKey === 'global') return;
    try {
      const res = await listingsService.syncOrchestrationTemplateToOwnerListings(ownerKey);
      const body = res as {
        success?: boolean;
        data?: {
          orchestration?: { modified?: number };
          ownerConfig?: { listings?: number; accessApplied?: number };
        };
      };
      const n = body?.data?.orchestration?.modified ?? 0;
      toast.success(`${n} annonce(s) synchronisée(s)`);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
      throw e;
    }
  };

  const handleSyncOneListing = async (listingId: string, listingName: string) => {
    try {
      await Promise.all([
        listingsService.applyListingOrchestrationFromOwner(listingId),
        listingsService.applyListingOwnerConfigFromOwner(listingId),
      ]);
      toast.success(`Template appliqué à ${listingName}`);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
      throw e;
    }
  };

  const formListingName = isAdminTemplate
    ? 'Admin'
    : referenceMeta?.name || ownerDisplayName;
  const formLocation =
    !isAdmin && referenceMeta?.location
      ? referenceMeta.location
      : !isAdmin && ownerListings.length > 0
        ? `${ownerListings.length} annonce${ownerListings.length !== 1 ? 's' : ''}`
        : '';

  return (
    <Box sx={{ px: { xs: 1, sm: 1.5 }, py: 1, maxWidth: 1400 }}>
      <OwnerConfigScopeBarWithSync
        {...ownerScope}
        compact
        syncMode={syncMode}
        onSyncToOwner={isAdmin ? handleSyncToOwner : undefined}
        onSyncToAllOwners={isAdmin ? handleSyncToAllOwners : undefined}
        onSyncAllListings={!isAdmin ? handleSyncAllListings : undefined}
        onSyncOneListing={!isAdmin ? handleSyncOneListing : undefined}
        listingOptions={!isAdmin ? ownerListings : undefined}
        selectedListingId={!isAdmin ? referenceListingId : undefined}
        onListingChange={!isAdmin ? setReferenceListingId : undefined}
        listingsLoading={!isAdmin ? listingsLoading : undefined}
      />

      {docLoading ? (
        <Box sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <ListingTemplateForm
          key={`${ownerKey}-${templateRefreshKey}`}
          templateRefreshKey={templateRefreshKey}
          ownerKey={ownerKey}
          ownerDisplayName={isAdminTemplate ? 'Template Admin' : ownerDisplayName}
          ownerIdForTabs={ownerIdForTabs}
          referenceListingId={referenceListingId}
          referenceListingName={formListingName}
          referenceLocation={formLocation}
          initialValues={listingValues}
          listingCount={isAdmin ? 0 : ownerListings.length}
          isAdminTemplate={isAdminTemplate}
          adminViewingPm={adminViewingPm}
          defaultTab={adminViewingPm ? 'orchestration-config' : undefined}
        />
      )}
    </Box>
  );
}

export default function ListingOrchestrationTemplatePage() {
  return (
    <DashboardWrapper breadcrumb={['Catalogue', 'Template']}>
      <AdminOwnerScopeLayout showTopBar={false}>
        <TemplatePageInner />
      </AdminOwnerScopeLayout>
    </DashboardWrapper>
  );
}
