import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Box, CircularProgress } from '@mui/material';
import { toast } from 'react-toastify';
import listingsService from '../../services/listingsService';
import type { Workflow } from '../taskHub/staff-design/types';
import {
  CAPABILITY_REGISTRY,
  defaultListingRailCapabilityKey,
  getCapabilityDefinition,
  isCapabilityPanelVisibleOnListing,
  isCapabilityVisibleOnListingRail,
} from '../serviceMatrix/capabilityRegistry';
import { applyDependencyRules } from '../serviceMatrix/matrixStateUtils';
import type { CapabilityRowState } from '../serviceMatrix/types';
import V3Header, { type V3ScopeMode } from './V3Header';
import V3Rail from './V3Rail';
import V3ServicePanel from './V3ServicePanel';
import OrchestrationModelSubTabs, {
  type OrchestrationModelSection,
} from './OrchestrationModelSubTabs';
import V3ScheduledMessagesPanel from './V3ScheduledMessagesPanel';
import { V3 } from './theme';
import {
  loadListingOrchestrationMatrix,
  saveListingGestion,
  saveListingOrchestrationRow,
  type ListingOrchestrationDoc,
} from './listingOrchestrationApi';
import {
  loadOwnerOrchestrationMatrix,
  saveOwnerGestion,
  saveOwnerOrchestrationRow,
  type OwnerOrchestrationDoc,
} from './ownerOrchestrationApi';
import { mergeLocalRowsAfterLoad, patchOrchestrationDocExecution, patchOrchestrationDocGestion, patchOrchestrationDocWhatsapp } from './mergeLocalRowsAfterLoad';
import { logV3Orch } from './v3OrchestrationDebugLog';
import {
  buildCapabilitySyncHints,
  type OwnerTemplateSyncMeta,
} from './capabilitySyncHints';
import {
  firstActivatedCapabilityKey,
  isCapabilityActivated,
} from './ownerCapabilityActivation';
import ListingActivationSection from './ListingActivationSection';
import {
  activationStatusFromEffectiveDoc,
  hasAnyEffectiveActiveService,
  isEffectivelyActivated,
  isWorkflowEditorEnabled,
  type ServiceActivationStatusEntry,
} from './listingCapabilityActivation';
import {
  shouldAutoSyncListingsAfterOwnerSave,
  syncAllListingsFromOwnerOrchestration,
} from './ownerOrchestrationListingSync';

type ListingPick = { id: string; name: string };

type Props = {
  ownerKey: string;
  isAdminTemplate: boolean;
  listingId: string | null;
  listings: ListingPick[];
  onListingChange: (id: string) => void;
  listingCount?: number;
  /** Formulaire listing /listings/:id — pas de header ni sélecteur annonce. */
  embedded?: boolean;
  /** Modèle PM complet (owner_orchestrations) — même UI que listing. */
  ownerTemplateMode?: boolean;
  /** Signale au parent si au moins un service est activé (onglet messages). */
  onOwnerActivationMeta?: (meta: { anyActive: boolean }) => void;
};

export default function OrchestrationListingV3View({
  ownerKey,
  isAdminTemplate,
  listingId,
  listings,
  onListingChange,
  listingCount,
  embedded = false,
  ownerTemplateMode = false,
  onOwnerActivationMeta,
}: Props) {
  const [scope, setScope] = useState<V3ScopeMode>(ownerTemplateMode ? 'template' : 'listing');
  const [rows, setRows] = useState<CapabilityRowState[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(CAPABILITY_REGISTRY[0]?.key ?? null);
  const [listingSection, setListingSection] = useState<OrchestrationModelSection>(
    embedded ? 'activation' : 'services',
  );
  const [serviceActivationStatus, setServiceActivationStatus] = useState<
    ServiceActivationStatusEntry[] | undefined
  >(undefined);
  const [activationLoaded, setActivationLoaded] = useState(false);
  const [listingValues, setListingValues] = useState<Record<string, unknown>>({});
  const listingRef = useRef<Record<string, unknown>>({});
  const menuOptionsRef = useRef<unknown[]>([]);
  const workflowsRef = useRef<Workflow[]>([]);
  const [orchestrationDoc, setOrchestrationDoc] = useState<
    ListingOrchestrationDoc | OwnerOrchestrationDoc | null
  >(null);
  const [ownerSyncMeta, setOwnerSyncMeta] = useState<OwnerTemplateSyncMeta | null>(null);

  const isOwnerTemplate = ownerTemplateMode;
  const effectiveListingId = !isOwnerTemplate && scope === 'listing' ? listingId : null;

  const syncListingsAfterOwnerSave = useCallback(async (): Promise<number> => {
    if (!shouldAutoSyncListingsAfterOwnerSave(ownerKey, isAdminTemplate)) return 0;
    return syncAllListingsFromOwnerOrchestration(ownerKey);
  }, [ownerKey, isAdminTemplate]);

  const applyActivationFromDoc = useCallback((doc: unknown, targetListingId: string) => {
    const services = activationStatusFromEffectiveDoc(
      doc as Parameters<typeof activationStatusFromEffectiveDoc>[0],
      targetListingId,
    );
    if (services?.length) {
      setServiceActivationStatus(services);
      setActivationLoaded(true);
      return true;
    }
    setActivationLoaded(true);
    return false;
  }, []);

  const loadListingValues = useCallback(async () => {
    if (isOwnerTemplate) {
      try {
        const res = await listingsService.getListingOwnerConfigTemplate(ownerKey);
        const payload = (res as { data?: { listing?: Record<string, unknown> } })?.data ?? res;
        const vals = ((payload as { listing?: Record<string, unknown> })?.listing ?? {}) as Record<
          string,
          unknown
        >;
        listingRef.current = vals;
        setListingValues(vals);
      } catch {
        listingRef.current = {};
        setListingValues({});
      }
      return;
    }
    if (!effectiveListingId) {
      listingRef.current = {};
      setListingValues({});
      return;
    }
    try {
      const doc = await listingsService.getListingDocument(effectiveListingId);
      const vals = (doc ?? {}) as Record<string, unknown>;
      listingRef.current = vals;
      setListingValues(vals);
    } catch {
      listingRef.current = {};
      setListingValues({});
    }
  }, [effectiveListingId, isOwnerTemplate, ownerKey]);

  const load = useCallback(async (options?: { silent?: boolean; discardLocalKey?: string }) => {
    const silent = options?.silent === true;
    const discardLocalKey = options?.discardLocalKey;
    if (!isOwnerTemplate && scope === 'listing' && !effectiveListingId) {
      setRows([]);
      if (!silent) setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      if (isOwnerTemplate) {
        const loaded = await loadOwnerOrchestrationMatrix(ownerKey);
        setRows(prev => mergeLocalRowsAfterLoad(prev, loaded.rows, discardLocalKey));
        menuOptionsRef.current = loaded.menuOptions;
        workflowsRef.current = loaded.workflows;
        setOrchestrationDoc(loaded.doc);
        logV3Orch('load.owner', { discardLocalKey, rowCount: loaded.rows.length });
      } else if (scope === 'listing' && effectiveListingId) {
        const loaded = await loadListingOrchestrationMatrix(effectiveListingId);
        setRows(prev => mergeLocalRowsAfterLoad(prev, loaded.rows, discardLocalKey));
        menuOptionsRef.current = loaded.menuOptions;
        workflowsRef.current = loaded.workflows;
        setOrchestrationDoc(loaded.doc);
        applyActivationFromDoc(loaded.doc, effectiveListingId);
        logV3Orch('load.listing', { listingId: effectiveListingId, discardLocalKey });
      } else {
        setRows([]);
        setOrchestrationDoc(null);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Chargement impossible';
      if (msg.includes('orchestration') || msg.includes('404')) {
        toast.error(
          'Orchestration listing non migrée — lancer migrate-listing-orchestration.ts sur srv-listing',
        );
      } else {
        toast.error(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [scope, ownerKey, effectiveListingId, isOwnerTemplate, applyActivationFromDoc]);

  const handleActivationSaved = useCallback(
    (status: ServiceActivationStatusEntry[]) => {
      setServiceActivationStatus(status);
      setActivationLoaded(true);
      void load({ silent: true });
    },
    [load],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadListingValues();
  }, [loadListingValues]);

  useEffect(() => {
    if (!isOwnerTemplate || ownerKey === 'global') {
      setOwnerSyncMeta(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await listingsService.getListingOwnerConfigTemplate(ownerKey);
        const payload = (res as { data?: { syncMeta?: OwnerTemplateSyncMeta } })?.data ?? res;
        if (!cancelled) {
          setOwnerSyncMeta((payload as { syncMeta?: OwnerTemplateSyncMeta })?.syncMeta ?? null);
        }
      } catch {
        if (!cancelled) setOwnerSyncMeta(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOwnerTemplate, ownerKey]);

  const syncHints = useMemo(
    () =>
      buildCapabilitySyncHints({
        isAdminTemplate,
        ownerTemplateMode: isOwnerTemplate,
        ownerKey,
        orchestrationDoc,
        syncMeta: ownerSyncMeta,
        listingScope: !isOwnerTemplate && scope === 'listing',
      }),
    [isAdminTemplate, isOwnerTemplate, ownerKey, orchestrationDoc, ownerSyncMeta, scope],
  );

  const anyOwnerServiceActive = useMemo(() => {
    if (!isOwnerTemplate || isAdminTemplate || ownerKey === 'global') return true;
    return rows.some(r => isCapabilityActivated(r));
  }, [isOwnerTemplate, isAdminTemplate, ownerKey, rows]);

  useEffect(() => {
    if (!isOwnerTemplate || !onOwnerActivationMeta) return;
    onOwnerActivationMeta({ anyActive: anyOwnerServiceActive });
  }, [isOwnerTemplate, anyOwnerServiceActive, onOwnerActivationMeta]);

  useEffect(() => {
    if (!isOwnerTemplate || isAdminTemplate || ownerKey === 'global' || !selectedKey) return;
    const row = rows.find(r => r.key === selectedKey);
    if (row && isCapabilityActivated(row)) return;
    const fallback = firstActivatedCapabilityKey(rows);
    if (fallback !== selectedKey) setSelectedKey(fallback);
  }, [isOwnerTemplate, isAdminTemplate, ownerKey, rows, selectedKey]);

  useEffect(() => {
    if (isOwnerTemplate || !effectiveListingId || !selectedKey || !activationLoaded) return;
    if (listingSection === 'activation') return;
    if (selectedKey === 'menu_navigation') return;
    if (!isCapabilityVisibleOnListingRail(selectedKey)) {
      setSelectedKey(defaultListingRailCapabilityKey());
      return;
    }
    if (!isEffectivelyActivated(selectedKey, serviceActivationStatus)) {
      const fallback =
        CAPABILITY_REGISTRY.find(
          c =>
            c.key !== 'menu_navigation' &&
            isCapabilityVisibleOnListingRail(c.key) &&
            isEffectivelyActivated(c.key, serviceActivationStatus),
        )?.key ?? null;
      if (fallback !== selectedKey) setSelectedKey(fallback);
    }
  }, [
    isOwnerTemplate,
    effectiveListingId,
    selectedKey,
    serviceActivationStatus,
    listingSection,
    activationLoaded,
  ]);

  const selectedRow = useMemo(
    () => rows.find(r => r.key === selectedKey) ?? null,
    [rows, selectedKey],
  );
  const selectedDef = selectedKey ? getCapabilityDefinition(selectedKey) ?? null : null;

  const patchRow = (key: string, patch: Partial<CapabilityRowState>) => {
    setRows(prev =>
      prev.map(r => {
        if (r.key !== key) return r;
        const next = applyDependencyRules(r, { ...patch, inherited: false });
        logV3Orch('row.patch', {
          key,
          patch,
          next: {
            managed: next.managed,
            orchestrated: next.orchestrated,
            taskEnabled: next.taskEnabled,
            execution: next.execution,
          },
        });
        return next;
      }),
    );
  };

  const onWhatsappPatch = useCallback(
    (capabilityKey: string, menuCodes: string[], menuOptions: unknown[]) => {
      setOrchestrationDoc(prev =>
        prev ? patchOrchestrationDocWhatsapp(prev, capabilityKey, menuOptions, menuCodes) : prev,
      );
      logV3Orch('whatsapp.saved', { key: capabilityKey, codes: menuCodes });
    },
    [],
  );

  const onGestionPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      if (!orchestrationDoc || !selectedKey) return;
      const existing = orchestrationDoc.capabilities?.[selectedKey]?.gestion ?? {};
      if (isOwnerTemplate) {
        await saveOwnerGestion({
          ownerKey,
          capabilityKey: selectedKey,
          gestion: { ...existing, ...patch },
          doc: orchestrationDoc as OwnerOrchestrationDoc,
        });
        const synced = await syncListingsAfterOwnerSave();
        toast.success(
          synced > 0
            ? `Config gestion enregistrée · ${synced} annonce(s) synchronisée(s)`
            : 'Config gestion enregistrée (modèle PM)',
        );
      } else if (effectiveListingId) {
        await saveListingGestion({
          listingId: effectiveListingId,
          capabilityKey: selectedKey,
          gestion: { ...existing, ...patch },
          doc: orchestrationDoc as ListingOrchestrationDoc,
        });
        toast.success('Config gestion enregistrée (annonce)');
      } else {
        return;
      }
      setOrchestrationDoc(prev =>
        prev ? patchOrchestrationDocGestion(prev, selectedKey, { ...existing, ...patch }) : prev,
      );
      logV3Orch('gestion.saved', { key: selectedKey, patchKeys: Object.keys(patch) });
    },
    [effectiveListingId, orchestrationDoc, selectedKey, isOwnerTemplate, ownerKey, syncListingsAfterOwnerSave],
  );

  const persistRow = async (key: string) => {
    const row = rows.find(r => r.key === key);
    if (!row) return;
    const doc = orchestrationDoc;
    if (!doc) {
      toast.error('Document orchestration non chargé');
      return;
    }
    setSaving(true);
    try {
      if (isOwnerTemplate) {
        await saveOwnerOrchestrationRow({
          ownerKey,
          row,
          allMenuOptions: menuOptionsRef.current,
          allWorkflows: workflowsRef.current,
          doc: doc as OwnerOrchestrationDoc,
        });
        const synced = await syncListingsAfterOwnerSave();
        toast.success(
          synced > 0
            ? `Service enregistré · ${synced} annonce(s) synchronisée(s)`
            : 'Service enregistré (modèle PM)',
        );
        await load({ silent: true, discardLocalKey: key });
      } else if (effectiveListingId) {
        await saveListingOrchestrationRow({
          listingId: effectiveListingId,
          row,
          allMenuOptions: menuOptionsRef.current,
          allWorkflows: workflowsRef.current,
          doc: doc as ListingOrchestrationDoc,
        });
        toast.success('Service enregistré (listing)');
        await load({ silent: true, discardLocalKey: key });
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    if (selectedKey) void persistRow(selectedKey);
  };

  const showRail = Boolean((scope === 'listing' && effectiveListingId) || isOwnerTemplate);
  const listingHasEffectiveServices =
    !isOwnerTemplate && effectiveListingId && activationLoaded
      ? hasAnyEffectiveActiveService(serviceActivationStatus)
      : true;

  const showServicePanelEffective =
    selectedDef &&
    selectedKey &&
    selectedRow &&
    orchestrationDoc &&
    (isOwnerTemplate || (scope === 'listing' && effectiveListingId && activationLoaded)) &&
    (isOwnerTemplate && !isAdminTemplate && ownerKey !== 'global'
      ? isCapabilityActivated(selectedRow)
      : isOwnerTemplate ||
        (isCapabilityPanelVisibleOnListing(selectedKey ?? '') &&
          isEffectivelyActivated(selectedKey ?? '', serviceActivationStatus)));

  const showListingOrchestrationTabs =
    Boolean(effectiveListingId) && (embedded || (scope === 'listing' && !ownerTemplateMode));

  if (loading) {
    return (
      <Box sx={{ py: 8, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress sx={{ color: V3.p }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: V3.bg,
        flex: embedded ? 1 : undefined,
        minHeight: embedded ? 0 : undefined,
        height: embedded ? '100%' : `calc(100vh - 120px)`,
        maxHeight: embedded ? '100%' : undefined,
        mx: embedded ? 0 : -3,
        mt: embedded ? 0 : -1.5,
        borderRadius: embedded ? 2 : 0,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {!embedded && !ownerTemplateMode && (
        <V3Header
          scope={scope}
          onScopeChange={s => {
            setScope(s);
          }}
          listings={listings}
          listingId={listingId}
          onListingChange={onListingChange}
          listingCount={listingCount}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {scope === 'listing' && !effectiveListingId && (
        <Alert severity="info" sx={{ m: 2 }}>
          Sélectionnez une annonce pour configurer l'orchestration par listing.
        </Alert>
      )}

      {showListingOrchestrationTabs ? (
        <Box sx={{ px: embedded ? 1 : 2, pt: 1, flexShrink: 0 }}>
          <OrchestrationModelSubTabs
            value={listingSection}
            onChange={setListingSection}
            showActivation
          />
        </Box>
      ) : null}

      {showListingOrchestrationTabs && listingSection === 'activation' && effectiveListingId ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', px: embedded ? 1 : 2, pb: 2 }}>
          <ListingActivationSection
            listingId={effectiveListingId}
            initialServices={serviceActivationStatus}
            onSaved={handleActivationSaved}
          />
        </Box>
      ) : null}

      {showListingOrchestrationTabs && listingSection === 'messages' && effectiveListingId ? (
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
          <V3ScheduledMessagesPanel
            scope="listing"
            ownerKey={ownerKey}
            listingId={effectiveListingId}
            listingName={listings.find(l => l.id === effectiveListingId)?.name}
          />
        </Box>
      ) : showListingOrchestrationTabs && listingSection !== 'services' ? null : (
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: `${V3.railWidth}px 1fr` },
          overflow: 'hidden',
        }}
      >
        {showRail && (
          <V3Rail
            rows={rows}
            selectedKey={selectedKey}
            ownerTemplateMode={isOwnerTemplate}
            filterInactiveCapabilities={
              isOwnerTemplate && !isAdminTemplate && ownerKey !== 'global'
            }
            filterByEffectiveActivation={!isOwnerTemplate && !!effectiveListingId && activationLoaded}
            serviceActivationStatus={serviceActivationStatus}
            syncHints={syncHints}
            onSelectService={key => {
              setSelectedKey(key);
            }}
          />
        )}

        <Box
          component="main"
          sx={{
            minHeight: 0,
            height: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            width: '100%',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {showServicePanelEffective && (
            <V3ServicePanel
              def={selectedDef!}
              row={selectedRow!}
              ownerKey={ownerKey}
              listingId={effectiveListingId ?? ''}
              orchestrationDoc={orchestrationDoc as ListingOrchestrationDoc}
              listingValues={listingValues}
              ownerTemplateMode={isOwnerTemplate}
              serviceEffectivelyEnabled={
                isOwnerTemplate
                  ? undefined
                  : isWorkflowEditorEnabled(selectedKey ?? '', serviceActivationStatus)
              }
              onGestionPatch={onGestionPatch}
              onRowChange={patch => selectedKey && patchRow(selectedKey, patch)}
              onPersist={() => selectedKey && void persistRow(selectedKey)}
              onReload={(discardKey?: string) =>
                void load({ silent: true, discardLocalKey: discardKey ?? selectedKey ?? undefined })
              }
              onExecutionDocPatch={execution => {
                if (!selectedKey || !orchestrationDoc) return;
                setOrchestrationDoc(prev =>
                  prev ? patchOrchestrationDocExecution(prev, selectedKey, execution) : prev,
                );
              }}
              onWhatsappPatch={onWhatsappPatch}
            />
          )}
          {!isOwnerTemplate &&
          effectiveListingId &&
          activationLoaded &&
          !listingHasEffectiveServices &&
          listingSection === 'services' ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucun service actif pour cette annonce. Activez des services dans l&apos;onglet{' '}
              <strong>Activation des services</strong>.
            </Alert>
          ) : null}
          {isOwnerTemplate && !isAdminTemplate && ownerKey !== 'global' && !anyOwnerServiceActive ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Aucun service activé. Utilisez l&apos;onglet{' '}
              <strong>Activation des services</strong> pour activer les services à configurer.
            </Alert>
          ) : null}
        </Box>
      </Box>
      )}
    </Box>
  );
}
