import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { DashboardWrapper } from '../components/DashboardWrapper';
import AdminOwnerScopeLayout from '../components/AdminOwnerScopeLayout/AdminOwnerScopeLayout';
import CatalogueAnnoncesTabs from '../components/catalogue/CatalogueAnnoncesTabs';
import OwnerConfigScopeBarWithSync from '../features/taskHub/components/OwnerConfigScopeBarWithSync';
import OrchestrationListingV3View from '../features/orchestrationListingV3/OrchestrationListingV3View';
import OrchestrationOverviewPanel from '../features/orchestrationListingV3/OrchestrationOverviewPanel';
import ApplyOwnerModelToListingsDialog from '../features/orchestrationListingV3/ApplyOwnerModelToListingsDialog';
import OrchestrationModelSubTabs, {
  normalizeOrchestrationSection,
  type OrchestrationModelSection,
} from '../features/orchestrationListingV3/OrchestrationModelSubTabs';
import { useFulltaskConfigOwner } from '../hooks/useFulltaskConfigOwner';
import { useAuth } from '../hooks/useAuth';
import { useAdminOwnerFilter } from '../context/AdminOwnerFilterContext';
import { ORCHESTRATION_ADMIN_OWNER_ID } from '../constants/orchestrationAdmin';
import listingsService from '../services/listingsService';
import { syncAdminTemplateToOwnerSimple, syncAdminTemplateToAllOwners } from '../features/listing/utils/syncAdminTemplateToOwner';

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

type ListingPick = { id: string; name: string; active: boolean; ownerId: string };

function parseExplicitSection(raw: string | null): OrchestrationModelSection | null {
  if (raw == null || raw === '') return null;
  // activation / messages → apercu ; services reste services
  if (raw === 'services') return 'services';
  if (raw === 'apercu' || raw === 'activation' || raw === 'messages') return 'apercu';
  return normalizeOrchestrationSection(raw);
}

function OwnerModelPageInner() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const { selectedOwnerId, setSelectedOwnerId } = useAdminOwnerFilter();
  const ownerScope = useFulltaskConfigOwner();
  const { ownerKey, isAdminTemplate } = ownerScope;
  const [listingsLoading, setListingsLoading] = useState(false);
  const [ownerListings, setOwnerListings] = useState<ListingPick[]>([]);
  const [selectedListingIds, setSelectedListingIds] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);

  const syncMode = isAdminTemplate ? 'owners' : isAdmin ? 'admin-pm' : 'listings';
  const adminViewingPm = isAdmin && !isAdminTemplate;
  /** Owner connecté (ou admin sur un PM) : peut pousser le modèle vers listings. */
  const canApplyToListings = !isAdminTemplate;

  useEffect(() => {
    if (!isAdmin) return;
    const sel = selectedOwnerId?.trim();
    if (!sel) {
      setSelectedOwnerId(ORCHESTRATION_ADMIN_OWNER_ID);
    }
  }, [isAdmin, selectedOwnerId, setSelectedOwnerId]);

  const loadOwnerListings = useCallback(async () => {
    if (isAdminTemplate || !ownerKey || ownerKey === 'global' || ownerKey === 'unknown') {
      setOwnerListings([]);
      setSelectedListingIds([]);
      setListingsLoading(false);
      return;
    }
    setListingsLoading(true);
    try {
      // Toujours scoper au PM : filtre API (admin) + filtre client (défense en profondeur).
      const res = await listingsService.getListings({
        page: 0,
        limit: 500,
        forListingsOverview: true,
        filterOwnerId: ownerKey,
        ownerId: ownerKey,
      });
      const raw = res.data?.items ?? [];
      const items = raw.filter((l) => l.ownerId && String(l.ownerId) === String(ownerKey));
      setOwnerListings(
        items.map((l) => ({
          id: l.id,
          name: l.name || l.id,
          active: l.active !== false,
          ownerId: String(l.ownerId),
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

  const section = useMemo(() => {
    const parsed = parseExplicitSection(searchParams.get('section'));
    return parsed ?? 'apercu';
  }, [searchParams]);

  const setSection = useCallback(
    (next: OrchestrationModelSection) => {
      const params = new URLSearchParams(searchParams);
      if (next === 'apercu') params.delete('section');
      else params.set('section', next);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSyncToOwner = async (targetOwnerId: string, targetOwnerName: string) => {
    const result = await syncAdminTemplateToOwnerSimple(targetOwnerId);
    if (!result.ok) throw new Error(result.lines[result.lines.length - 1] || 'échec');
    toast.success(`${targetOwnerName} — ${result.lines.join(' · ')}`);
  };

  const handleSyncToAllOwners = async () => {
    const result = await syncAdminTemplateToAllOwners();
    if (result.ok) {
      toast.success(
        `Admin → ${result.synced} PM(s) OK${result.failed > 0 ? ` · ${result.failed} échec(s)` : ''}`,
      );
    } else {
      toast.error(result.lines.join(' · ') || 'Sync PMs échouée');
    }
  };

  const handleSyncAllListings = async () => {
    if (!ownerKey || ownerKey === 'global' || ownerKey === 'unknown') return;
    setApplying(true);
    try {
      const res = await listingsService.applyOwnerOrchestrationToAllListings(ownerKey);
      const body = res as { data?: { modified?: number; total?: number } };
      const n = body?.data?.modified ?? body?.data?.total ?? 0;
      toast.success(`Modèle appliqué à ${n} annonce(s) de ce PM`);
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e));
      throw e;
    } finally {
      setApplying(false);
    }
  };

  const handleSyncSelectedListings = async (listingIds: string[]) => {
    if (!ownerKey || ownerKey === 'global' || ownerKey === 'unknown' || listingIds.length === 0) {
      return;
    }
    // ⚠️ Isolation PM : uniquement les listings de ce ownerKey.
    const allowed = new Map(
      ownerListings
        .filter((l) => String(l.ownerId) === String(ownerKey))
        .map((l) => [l.id, l] as const),
    );
    const targets = listingIds.filter((id) => allowed.has(id));
    const rejected = listingIds.length - targets.length;
    if (rejected > 0) {
      console.error('[orchestration] blocked foreign listings', {
        ownerKey,
        rejected,
        requested: listingIds.length,
      });
    }
    if (targets.length === 0) {
      toast.error('Aucune annonce de ce PM sélectionnée — aucune mise à jour');
      throw new Error('Aucune annonce valide pour ce PM');
    }
    setApplying(true);
    let ok = 0;
    let fail = 0;
    let firstError = '';
    try {
      for (const listingId of targets) {
        try {
          await listingsService.applyListingOrchestrationFromOwner(listingId, ownerKey);
          ok += 1;
        } catch (e: unknown) {
          fail += 1;
          if (!firstError) firstError = apiErrorMessage(e);
        }
      }
      if (ok > 0) {
        toast.success(
          `${ok} annonce(s) de ce PM synchronisée(s)${fail > 0 ? ` · ${fail} échec(s)` : ''}`,
        );
        if (fail > 0 && firstError) {
          toast.error(firstError, { autoClose: 12000 });
        }
      } else {
        toast.error(firstError || `Échec sync annonces (${fail})`, { autoClose: 12000 });
        throw new Error(firstError || 'Échec sync annonces');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleApplyFromDialog = async (listingIds: string[]) => {
    await handleSyncSelectedListings(listingIds);
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 1, width: '100%' }}>
      <CatalogueAnnoncesTabs />
      <OrchestrationModelSubTabs value={section} onChange={setSection} />

      {section === 'apercu' && isAdmin && (
        <OwnerConfigScopeBarWithSync
          {...ownerScope}
          compact
          hideListingPicker
          syncMode={syncMode}
          onSyncToOwner={handleSyncToOwner}
          onSyncToAllOwners={isAdminTemplate ? handleSyncToAllOwners : undefined}
        />
      )}

      {section === 'apercu' && canApplyToListings && (
        <Box
          sx={{
            mb: 1,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: 1,
            minHeight: 36,
          }}
        >
          <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1, minWidth: 0 }}>
            Appliquer le modèle → <strong>toutes</strong> ou <strong>sélection</strong> d’annonces
          </Typography>
          <Button
            size="small"
            variant="contained"
            onClick={() => setApplyDialogOpen(true)}
            disabled={listingsLoading || applying || ownerListings.length === 0}
            sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0, py: 0.5 }}
          >
            Appliquer aux listings…
          </Button>
        </Box>
      )}

      {section === 'apercu' && <OrchestrationOverviewPanel ownerKey={ownerKey} />}

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
          annonces et synchronisez — ou utilisez « Appliquer aux listings… ».
        </Alert>
      )}

      {section === 'services' && !isAdmin && (
        <Alert severity="info" sx={{ mb: 1.5, fontSize: 13 }}>
          Configurez votre modèle, puis cliquez <strong>Appliquer aux listings…</strong> pour
          pousser vers toutes vos annonces ou une sélection.
        </Alert>
      )}

      {section === 'services' && (
        <>
          {isAdmin ? (
            <Box sx={{ mb: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 1 }}>
              <Box sx={{ flex: '1 1 280px', minWidth: 0 }}>
                <OwnerConfigScopeBarWithSync
                  {...ownerScope}
                  compact
                  hideListingPicker={false}
                  syncMode={syncMode}
                  onSyncToOwner={handleSyncToOwner}
                  onSyncToAllOwners={isAdminTemplate ? handleSyncToAllOwners : undefined}
                  onSyncAllListings={adminViewingPm ? handleSyncAllListings : undefined}
                  onSyncSelectedListings={adminViewingPm ? handleSyncSelectedListings : undefined}
                  listingOptions={adminViewingPm ? ownerListings : undefined}
                  selectedListingIds={adminViewingPm ? selectedListingIds : undefined}
                  onListingSelectionChange={adminViewingPm ? setSelectedListingIds : undefined}
                  listingsLoading={adminViewingPm ? listingsLoading : undefined}
                />
              </Box>
              {adminViewingPm && (
                <Button
                  variant="outlined"
                  onClick={() => setApplyDialogOpen(true)}
                  disabled={listingsLoading || applying || ownerListings.length === 0}
                  sx={{ textTransform: 'none', fontWeight: 700, flexShrink: 0 }}
                >
                  Appliquer aux listings…
                </Button>
              )}
            </Box>
          ) : (
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={() => setApplyDialogOpen(true)}
                disabled={listingsLoading || applying || ownerListings.length === 0}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Appliquer aux listings…
              </Button>
            </Box>
          )}

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

      {canApplyToListings && (
        <ApplyOwnerModelToListingsDialog
          open={applyDialogOpen}
          listings={ownerListings}
          loading={listingsLoading}
          applying={applying}
          onClose={() => setApplyDialogOpen(false)}
          onApply={handleApplyFromDialog}
        />
      )}
    </Box>
  );
}

export default function OwnerOrchestrationModelPage() {
  return (
    <DashboardWrapper breadcrumb={['Annonces', 'Modèle orchestration']}>
      <AdminOwnerScopeLayout showTopBar={false}>
        <OwnerModelPageInner />
      </AdminOwnerScopeLayout>
    </DashboardWrapper>
  );
}
